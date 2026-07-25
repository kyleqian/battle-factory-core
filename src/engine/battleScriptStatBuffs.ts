/**
 * ChangeStatBuffs (battle_script_commands.c:6937-7098), the single guard-
 * ladder core shared by both docs/stat-change-confusion-ground-truth.md's
 * secondary-effect route (SetMoveEffect's ATK/DEF/SPD/SP_ATK/SP_DEF/ACC/EVS
 * +-1/+-2 cases, `flags` always 0/MOVE_EFFECT_AFFECTS_USER, `BS_ptr` always
 * NULL) and docs/primary-stat-ground-truth.md's primary-effect route
 * (Cmd_statbuffchange, `flags` a real script-authored byte, `BS_ptr` a real
 * jump target). Zero `Random()` calls anywhere in this function (confirmed
 * by both docs' full 162-line source read).
 *
 * Guard-ladder order, exactly as source: Mist -> Protect -> Clear Body/White
 * Smoke -> Keen Eye -> Hyper Cutter -> Shield Dust -> apply + clamp. Every
 * ability/Mist branch's message-vs-silent behavior is gated on
 * `flags == STAT_CHANGE_ALLOW_PTR` after AFFECTS_USER/CERTAIN/
 * NOT_PROTECT_AFFECTED are masked off -- always false on the secondary route
 * (silent block, no message, Shield Dust structurally reachable), always true
 * on the primary route (real BattleScriptPush + ability-reveal message,
 * Shield Dust structurally UNREACHABLE since ALLOW_PTR's bit is never one of
 * the three stripped bits).
 *
 * Two source nuances intentionally not modeled, both narrowed by this
 * registration's own scope (single-stat-change moves only; multi-stat chains
 * like Superpower/Close Combat stay deferred to Cmd_playstatchangeanimation,
 * per both docs' Slice C):
 * - `gSpecialStatuses[gActiveBattler].statLowered`: only matters when a
 *   second ChangeStatBuffs call targets the same battler later in the same
 *   move's script (skips the message on the second call). Every move this
 *   registration drives calls ChangeStatBuffs at most once, so statLowered
 *   is always freshly reset (FALSE) at entry -- the push+jump sub-branch
 *   (not the direct-jump-without-push sub-branch) always applies.
 * - `JumpIfMoveAffectedByProtect`'s internal `gLastLandedMoves`/
 *   `gLastHitByType` clear: real, but only observable by move-end states 14
 *   and 15 mirroring Cmd_accuracycheck's own equivalent clear
 *   (withClearedLandedMove) -- reused here directly rather than duplicated.
 *
 * The `B_MSG_STAT_WONT_INCREASE`/`B_MSG_STAT_WONT_DECREASE` clamp-tail check
 * (battle_script_commands.c:7091-7096) compares raw MULTISTRING_CHOOSER
 * values, and both constants equal 2 (battle_string_ids.h:397,405) -- the
 * check is direction-INDEPENDENT: an already-MIN decrease and an already-MAX
 * increase are handled identically (same MOVE_RESULT_MISSED-when-allowPtr,
 * same DIDNT_WORK-when-!allowPtr). docs/stat-change-confusion-ground-truth.md
 * S1.1's claim that the decrease branch is asymmetric (never early-returns)
 * does not hold against this source read and was never live-verified by that
 * probe either (its own text flags the -6 case as "not staged live"); this
 * port follows the literal, unconditional C comparison.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptSemanticEventPayload } from "./battleScriptEvents.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandlerContext,
} from "./battleScriptMachine.ts";
import {
  isDefenderProtected,
  withBattler,
  withClearedLandedMove,
} from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/pokemon.h:76-84. STAT_HP(0) is never a ChangeStatBuffs target. */
export const STAT_ATK = 1;
export const STAT_DEF = 2;
export const STAT_SPEED = 3;
export const STAT_SPATK = 4;
export const STAT_SPDEF = 5;
export const STAT_ACC = 6;
export const STAT_EVASION = 7;

const STAT_NAME_BY_ID: Readonly<Record<number, BattleScriptStatName>> = Object.freeze({
  [STAT_ATK]: "attack",
  [STAT_DEF]: "defense",
  [STAT_SPEED]: "speed",
  [STAT_SPATK]: "special-attack",
  [STAT_SPDEF]: "special-defense",
  [STAT_ACC]: "accuracy",
  [STAT_EVASION]: "evasion",
});

type BattleScriptStatName =
  | "attack"
  | "defense"
  | "speed"
  | "special-attack"
  | "special-defense"
  | "accuracy"
  | "evasion";

/** include/battle.h:309-310. */
export const MOVE_EFFECT_AFFECTS_USER = 1 << 6;
export const MOVE_EFFECT_CERTAIN = 1 << 7;
/** include/constants/battle_script_commands.h:371-372. */
export const STAT_CHANGE_ALLOW_PTR = 1 << 0;
export const STAT_CHANGE_NOT_PROTECT_AFFECTED = 1 << 5;
/** include/constants/moves.h:178. */
const MOVE_CURSE = 174;
/** include/abilities.h. */
const ABILITY_CLEAR_BODY = 29;
const ABILITY_WHITE_SMOKE = 73;
const ABILITY_KEEN_EYE = 51;
const ABILITY_HYPER_CUTTER = 52;
const ABILITY_SHIELD_DUST = 19;
/** include/constants/pokemon.h:89,91. */
const MIN_STAT_STAGE = 0;
const MAX_STAT_STAGE = 12;
/**
 * battle_string_ids.h:395-397,403-405. B_MSG_STAT_WONT_INCREASE and
 * B_MSG_STAT_WONT_DECREASE are both literally 2 -- one shared constant here,
 * matching the direction-independent C comparison (see file header).
 */
const B_MSG_STAT_WONT_CHANGE = 2;
/** include/constants/battle.h:220. */
const MOVE_RESULT_MISSED = 1 << 0;

export type BattleScriptChangeStatBuffsInput = Readonly<{
  attacker: BattleScriptBattlerId;
  /** Always the literal gBattlerTarget role -- both the Protect check and the multistring-chooser direction test use this regardless of AFFECTS_USER. */
  target: BattleScriptBattlerId;
  currentMove: number;
  statId: number;
  direction: "increase" | "decrease";
  magnitude: 1 | 2;
  /** Raw byte: MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN | STAT_CHANGE_NOT_PROTECT_AFFECTED | STAT_CHANGE_ALLOW_PTR bits, exactly as the two call sites pass it. */
  flags: number;
  /**
   * BS_ptr, already resolved to a program counter by the caller. Only read
   * when flags == STAT_CHANGE_ALLOW_PTR after masking (never true on the
   * secondary route, since its flags is always 0/AFFECTS_USER).
   */
  jumpProgramCounter: number | null;
}>;

export type BattleScriptChangeStatBuffsOutcome =
  | Readonly<{
    kind: "worked";
    rulesContext: BattleScriptRulesContext;
    events: readonly BattleScriptSemanticEventPayload[];
  }>
  | Readonly<{ kind: "blocked-silent"; rulesContext: BattleScriptRulesContext }>
  | Readonly<{ kind: "resolved"; transition: BattleScriptCommandTransition<BattleScriptRulesContext> }>;

function resolveRequiredLabel(program: BattleScriptProgram, label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`ChangeStatBuffs: committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

function withStatStage(
  rulesContext: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  statId: number,
  value: number,
): BattleScriptRulesContext {
  const battlerState = rulesContext.battlers[battler];
  const statStages = battlerState.statStages.map((stage, index) => (index === statId ? value : stage));
  return withBattler(rulesContext, battler, {
    statStages: Object.freeze(statStages) as unknown as BattleScriptRulesContext["battlers"][number]["statStages"],
  });
}

function withMoveResultMissed(rulesContext: BattleScriptRulesContext): BattleScriptRulesContext {
  return Object.freeze({
    ...rulesContext,
    moveResultFlags: (rulesContext.moveResultFlags | MOVE_RESULT_MISSED) >>> 0,
  });
}

/**
 * ChangeStatBuffs(s8 statValue, u8 statId, u8 flags, const u8 *BS_ptr).
 * `context` is only used for program-label resolution (the guard-ladder's
 * message/jump targets) -- this function never inspects the calling opcode's
 * own instruction/operands.
 */
export function changeStatBuffs(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  input: BattleScriptChangeStatBuffsInput,
): BattleScriptChangeStatBuffsOutcome {
  const rulesContext = context.state.rulesContext;
  const { attacker, target, currentMove, statId, direction, magnitude } = input;

  let flags = input.flags;
  const activeBattler: BattleScriptBattlerId = (flags & MOVE_EFFECT_AFFECTS_USER) !== 0 ? attacker : target;
  flags &= ~MOVE_EFFECT_AFFECTS_USER;
  const certain = (flags & MOVE_EFFECT_CERTAIN) !== 0;
  flags &= ~MOVE_EFFECT_CERTAIN;
  const notProtectAffected = (flags & STAT_CHANGE_NOT_PROTECT_AFFECTED) !== 0;
  flags &= ~STAT_CHANGE_NOT_PROTECT_AFFECTED;
  const allowPtr = flags === STAT_CHANGE_ALLOW_PTR;

  const activeBattlerState = rulesContext.battlers[activeBattler];
  const targetBattlerState = rulesContext.battlers[target];

  function blockedSilent(): BattleScriptChangeStatBuffsOutcome {
    return Object.freeze({ kind: "blocked-silent" as const, rulesContext });
  }

  function blockedMessage(targetLabel: string): BattleScriptChangeStatBuffsOutcome {
    if (input.jumpProgramCounter === null) {
      throw new Error(`ChangeStatBuffs: ${targetLabel} block requires a resolved jumpProgramCounter`);
    }
    const programCounter = resolveRequiredLabel(context.program, targetLabel);
    return Object.freeze({
      kind: "resolved" as const,
      transition: transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "call-explicit" as const,
          programCounter,
          returnProgramCounter: input.jumpProgramCounter,
        }),
        {
          rulesContext: Object.freeze({
            ...rulesContext,
            scriptingBattler: activeBattler,
            lastUsedAbility: activeBattlerState.ability,
          }),
        },
      ),
    });
  }

  function blockedProtect(): BattleScriptChangeStatBuffsOutcome {
    const nextRulesContext = withMoveResultMissed(
      Object.freeze({
        ...rulesContext,
        moveHistory: withClearedLandedMove(rulesContext.moveHistory, target),
      }),
    );
    const programCounter = resolveRequiredLabel(context.program, "BattleScript_ButItFailed");
    return Object.freeze({
      kind: "resolved" as const,
      transition: transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump" as const, programCounter }),
        { rulesContext: nextRulesContext },
      ),
    });
  }

  if (direction === "decrease") {
    const side = activeBattlerState.side;
    if (rulesContext.mistTimers[side] !== 0 && !certain && currentMove !== MOVE_CURSE) {
      return allowPtr ? blockedMessage("BattleScript_MistProtected") : blockedSilent();
    }
    if (
      currentMove !== MOVE_CURSE
      && !notProtectAffected
      && isDefenderProtected(targetBattlerState, currentMove)
    ) {
      return blockedProtect();
    }
    if (
      (activeBattlerState.ability === ABILITY_CLEAR_BODY || activeBattlerState.ability === ABILITY_WHITE_SMOKE)
      && !certain
      && currentMove !== MOVE_CURSE
    ) {
      return allowPtr ? blockedMessage("BattleScript_AbilityNoStatLoss") : blockedSilent();
    }
    if (activeBattlerState.ability === ABILITY_KEEN_EYE && !certain && statId === STAT_ACC) {
      return allowPtr ? blockedMessage("BattleScript_AbilityNoSpecificStatLoss") : blockedSilent();
    }
    if (activeBattlerState.ability === ABILITY_HYPER_CUTTER && !certain && statId === STAT_ATK) {
      return allowPtr ? blockedMessage("BattleScript_AbilityNoSpecificStatLoss") : blockedSilent();
    }
    if (activeBattlerState.ability === ABILITY_SHIELD_DUST && flags === 0) {
      return blockedSilent();
    }
  }

  const before = activeBattlerState.statStages[statId]!;
  const delta = direction === "decrease" ? -magnitude : magnitude;
  const isAttackerActive = target === activeBattler ? 1 : 0;
  const multistringChooser = direction === "decrease"
    ? (before === MIN_STAT_STAGE ? B_MSG_STAT_WONT_CHANGE : isAttackerActive)
    : (before === MAX_STAT_STAGE ? B_MSG_STAT_WONT_CHANGE : isAttackerActive);

  let after = before + delta;
  if (after < MIN_STAT_STAGE) after = MIN_STAT_STAGE;
  if (after > MAX_STAT_STAGE) after = MAX_STAT_STAGE;

  let nextRulesContext = withStatStage(rulesContext, activeBattler, statId, after);
  nextRulesContext = Object.freeze({ ...nextRulesContext, multistringChooser });

  const atBound = multistringChooser === B_MSG_STAT_WONT_CHANGE;
  if (atBound && allowPtr) {
    nextRulesContext = withMoveResultMissed(nextRulesContext);
  }
  if (atBound && !allowPtr) {
    return Object.freeze({ kind: "blocked-silent" as const, rulesContext: nextRulesContext });
  }

  const event = Object.freeze({
    kind: "stat-stage-change" as const,
    battler: activeBattler,
    stat: STAT_NAME_BY_ID[statId]!,
    from: before,
    to: after,
  });
  return Object.freeze({ kind: "worked" as const, rulesContext: nextRulesContext, events: Object.freeze([event]) });
}
