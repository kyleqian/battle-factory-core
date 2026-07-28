/**
 * Forced-switch ground truth §4 slices 1/2/3 tail: the opcodes between
 * `openpartyscreen`'s AI pick (already registered) and `cancelallactions`
 * (`data/battle_scripts_1.s:2843-2897`, walked in full in
 * `docs/forced-switch-ground-truth.md` §1a). Per §5c, `SWITCHHANDLEORDER`'s
 * `SwitchPartyOrder` permutation table is proven presentation-only (RAM +
 * source), so it is NOT modeled here -- this file's `monToSwitchIntoId`
 * remains a raw party-array index throughout, exactly as this engine's
 * `party.opponent[i]`/`party.player[i]` already index.
 *
 * `getswitchedmondata`/`switchindataupdate` are the first "rebuild an active
 * battler from a bench record" registration (§4 slice 4): species/hp/status1
 * come from the party record at the newly-decided raw index; types resolve
 * from the species table; stat stages/status2/status3/the modeled
 * DisableStruct-shaped fields reset to `SwitchInClearSetData`'s neutral
 * values (`battle_main.c:3152-3258`). `ability`/`item`/`moves`/`pp` are real
 * source rebuilds (`GetAbilityBySpecies`, the knocked-off-item check, the
 * full `BattlePokemon` byte copy) this engine does not model at all (no
 * species-ability table, no party moves/pp carried per battler) -- they stay
 * whatever the battler slot's previous occupant left, untracked and
 * documented, not silently faked.
 */
import {
  drawBattleScriptRng,
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptCommandTransition,
  type BattleScriptHaltReason,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptControllerIdlePort } from "./battleScriptSourceCommands.ts";
import {
  resolveRulesBattlerForBattleScript,
  BATTLE_SCRIPT_BATTLE_TYPE_ARENA,
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  BATTLE_SCRIPT_EFFECT_BATON_PASS,
  BATTLE_SCRIPT_PARTY_SIZE,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
  type BattleScriptStatStages,
} from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_WRAPPED_MASK } from "./battleScriptSourceConstants.ts";
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };

/** include/constants/battle.h:60. */
const BATTLE_TYPE_LINK = 1 << 1;
/** include/constants/battle.h:190,199,205. */
const HITMARKER_PLAYER_FAINTED = 1 << 22;
const DEFAULT_STAT_STAGE = 6;
const DEFAULT_STAT_STAGES = Object.freeze([
  DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE,
  DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE,
]) as unknown as BattleScriptStatStages;
/** include/constants/battle.h:213/217. */
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_SPIKES_DAMAGED = 1 << 9;
const STATUS2_DESTINY_BOND = 1 << 25;
const HITMARKER_DESTINYBOND = 1 << 6;
const ABILITY_LEVITATE = 26;
/** include/constants/battle.h:150/160 -- cross-battler identity (battlerPreventingEscape/battlerWithSureHit) this engine does not model. */
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const STATUS3_ALWAYS_HITS = (1 << 3) | (1 << 4);
/** battle_main.c:3175-3176 -- the exact volatile masks SwitchInClearSetData carries through Baton Pass. */
const BATON_PASS_STATUS2 =
  ((1 << 0) | (1 << 1) | (1 << 2) | (1 << 20) | (1 << 24)
    | STATUS2_ESCAPE_PREVENTION | (1 << 28)) >>> 0;
const BATON_PASS_STATUS3 =
  ((1 << 0) | (1 << 1) | (1 << 2) | STATUS3_ALWAYS_HITS | (1 << 5)
    | (1 << 10) | (1 << 16) | (1 << 17)) >>> 0;
/** include/constants/battle.h:161 -- reset when Baton Pass changes a sure-hit target. */
const STATUS3_ALWAYS_HITS_TURN_2 = (2 << 3) & STATUS3_ALWAYS_HITS;
/** include/constants/abilities.h -- battle_util.c:2488-2599's ABILITYEFFECT_ON_SWITCHIN switch cases. */
const ABILITY_DRIZZLE = 2;
const ABILITY_CLOUD_NINE = 13;
const ABILITY_INTIMIDATE = 22;
const ABILITY_TRACE = 36;
const ABILITY_SAND_STREAM = 45;
const ABILITY_FORECAST = 59;
const ABILITY_TRUANT = 54;
const ABILITY_DROUGHT = 70;
const ABILITY_AIR_LOCK = 77;
const SWITCH_IN_ABILITY_EFFECTS = new Set([
  ABILITY_DRIZZLE, ABILITY_CLOUD_NINE, ABILITY_INTIMIDATE, ABILITY_TRACE,
  ABILITY_SAND_STREAM, ABILITY_FORECAST, ABILITY_DROUGHT, ABILITY_AIR_LOCK,
]);

type SpeciesTypesRow = Readonly<{ name: string; types: readonly [string, string] }>;
const SPECIES_TYPES_ROWS = speciesTypesData.species as unknown as readonly SpeciesTypesRow[];

/** gSpeciesInfo[species].types -- species-types.json is indexed by (speciesId - 1). */
function resolveSpeciesTypes(species: number): readonly [string, string] | null {
  const row = SPECIES_TYPES_ROWS[species - 1];
  return row ? row.types : null;
}

function statusInfatuatedWithBit(battler: number): number {
  return (1 << (16 + battler)) >>> 0;
}

function haltTransition<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  reason: BattleScriptHaltReason,
): BattleScriptCommandTransition<RulesContext> {
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "halt", reason }));
}

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceLine: number,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return haltTransition(context, Object.freeze({
    kind: "unsupported-branch",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    sourceConstruct,
    sourceFile: "battle_script_commands.c",
    sourceLine,
  }));
}

function controllerBusyBlock(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const reason: BattleScriptBlockReason = Object.freeze({
    kind: "controller-busy",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
}

/**
 * include/constants/battle_script_commands.h -- the three `various` ids this
 * file resolves; every other case name stays unrecognized (barriers).
 * VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT (23, battle_script_commands.c:
 * 6480-6482) widens this existing barrier's modeled operand set --
 * BattleScript_RestIsAlreadyAsleep's own `setalreadystatusedmoveattempt
 * BS_ATTACKER` (a `various` macro expansion) reaches it. The write
 * (`gBattleStruct->alreadyStatusedMoveAttempt |= gBitTable[gActiveBattler]`)
 * is only ever read by Battle Arena (battle_arena.c:594), unmodeled here --
 * tracked purely so this reachable script doesn't halt on an avoidable
 * barrier.
 */
const VARIOUS_RESET_PLAYER_FAINTED = 7;
const VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT = 23;
const VARIOUS_GET_MOVE_TARGET = 3;
const VARIOUS_SET_MAGIC_COAT_TARGET = 1;
const NAMED_BYTE_CONSTANTS = new Map<string, number>([
  ["VARIOUS_SET_MAGIC_COAT_TARGET", VARIOUS_SET_MAGIC_COAT_TARGET],
  ["VARIOUS_GET_MOVE_TARGET", VARIOUS_GET_MOVE_TARGET],
  ["VARIOUS_RESET_PLAYER_FAINTED", VARIOUS_RESET_PLAYER_FAINTED],
  ["VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT", VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT],
]);

function resolveByteLiteral(expression: string): number | null {
  const named = NAMED_BYTE_CONSTANTS.get(expression);
  if (named !== undefined) return named;
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/.test(expression)) return null;
  const value = Number(expression);
  return Number.isSafeInteger(value) ? value : null;
}

function resolveSwitchBattler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): number | null {
  const selector = context.instruction.operands[0];
  if (!selector || selector.widthBytes !== 1) return null;
  return resolveRulesBattlerForBattleScript(context, selector);
}

/**
 * `Cmd_switchhandleorder` (`battle_script_commands.c:5152-5217`), cases 2/3
 * only (the reachable script always emits `switchhandleorder BS_FAINTED, 2`,
 * which falls through into case 3's body; case 3 alone is the same body
 * minus the untracked `RecordedBattle`/`field_93` bookkeeping, so both are
 * handled identically). Cases 0 (multi-battler collection loop) and 1
 * (`SwitchPartyOrder` with no assignment) are named barriers -- unreached by
 * this script. Per §5c, `SwitchPartyOrder` itself is proven presentation-only
 * and is not modeled: the only mechanically-relevant effect is the
 * `gBattleCommunication[0] = monToSwitchIntoId[battler]` transcription.
 */
function createSwitchhandleorderOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const [selectorOperand, caseOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 2
      || selectorOperand?.widthBytes !== 1
      || caseOperand?.widthBytes !== 1
    ) {
      throw new Error(
        `invalid B_SCR_OP_SWITCHHANDLEORDER shape at program counter ${context.state.programCounter}`,
      );
    }
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_switchhandleorder: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const caseValue = resolveByteLiteral(caseOperand.expression);
    if (caseValue !== 2 && caseValue !== 3) {
      return unsupportedBranch(
        context,
        `Cmd_switchhandleorder case ${caseOperand.expression} (multi-battler collection/order-only) is not modeled`,
        5162,
      );
    }
    const rules = context.state.rulesContext;
    const decided = rules.monToSwitchIntoId[battler];
    if (decided === BATTLE_SCRIPT_PARTY_SIZE) {
      throw new Error(
        `Cmd_switchhandleorder: battler ${battler} has no decided monToSwitchIntoId `
          + "-- openpartyscreen must run first",
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, battleCommunication0: decided }) },
    );
  };
}

/**
 * `Cmd_getswitchedmondata` (`battle_script_commands.c:4606-4619`): commits
 * `gBattlerPartyIndexes[battler] = monToSwitchIntoId[battler]` (this
 * engine's `battlers[battler].partyIndex`) and issues the controller round
 * trip `switchindataupdate` waits on.
 */
function createGetswitchedmondataOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_getswitchedmondata: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    const decided = rules.monToSwitchIntoId[battler];
    if (decided === BATTLE_SCRIPT_PARTY_SIZE) {
      throw new Error(
        `Cmd_getswitchedmondata: battler ${battler} has no decided monToSwitchIntoId `
          + "-- openpartyscreen must run first",
      );
    }
    const fromPartyIndex = rules.battlers[battler as 0 | 1 | 2 | 3].partyIndex;
    const battlers = rules.battlers.map((candidate, index) =>
      index === battler ? Object.freeze({ ...candidate, partyIndex: decided }) : candidate
    ) as unknown as BattleScriptRulesBattlers;
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler as 0 | 1 | 2 | 3);
    const events = fromPartyIndex === decided
      ? Object.freeze([])
      : Object.freeze([Object.freeze({
        kind: "switch" as const,
        side: rules.battlers[battler as 0 | 1 | 2 | 3].side === 0
          ? "player" as const
          : "opponent" as const,
        fromPartyIndex,
        toPartyIndex: decided,
      })]);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({ ...rules, battlers: Object.freeze(battlers) }),
        scheduler,
        events,
      },
    );
  };
}

/**
 * `Cmd_switchindataupdate` (`battle_script_commands.c:4621-4671`) plus
 * `SwitchInClearSetData` (`battle_main.c:3152-3258`). The ordinary switch
 * branch resets stages/status2/status3; Baton Pass instead preserves stages,
 * masks status2/status3 to the source's transferable bits, and retains the
 * carried Substitute HP.
 * Rebuilds species/hp/status1/types from the party record at the
 * already-updated `partyIndex`; resets stat stages/status2/status3/the
 * modeled DisableStruct-shaped fields to their neutral values (while the
 * existing Baton Pass branch carries both Perish Song timer fields); clears the
 * `STATUS2_INFATUATED_WITH(battler)` bit on every other battler exactly like
 * `cleareffectsonfaint`'s own precedent (`battleScriptHitChainOpcode.ts`).
 * `STATUS2_ESCAPE_PREVENTION`/`STATUS3_ALWAYS_HITS` cross-battler clears need
 * `battlerPreventingEscape`/`battlerWithSureHit` identity this engine does
 * not model -- named barriers, gated on the bit actually being set on some
 * other battler (never true for a plain KO switch-in, so unreached here).
 * `ability`/`item`/`moves`/`pp` stay untouched (see file header).
 */
function createSwitchindataupdateOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_switchindataupdate: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    const active = rules.battlers[battler as 0 | 1 | 2 | 3];
    const { battlersCount } = rules.battleTopology;
    const isBatonPass =
      rules.currentMoveEffect === BATTLE_SCRIPT_EFFECT_BATON_PASS;

    if (!isBatonPass) {
      for (let i = 0; i < battlersCount; i += 1) {
        if (i === battler) continue;
        const otherStatus2 = rules.battlers[i as 0 | 1 | 2 | 3].status2;
        const otherStatus3 = rules.battlers[i as 0 | 1 | 2 | 3].status3;
        if ((otherStatus2 & STATUS2_ESCAPE_PREVENTION) !== 0) {
          return unsupportedBranch(
            context,
            `SwitchInClearSetData's STATUS2_ESCAPE_PREVENTION cross-battler clear (battler ${i}) needs `
              + "gDisableStructs[battler].battlerPreventingEscape identity, not modeled here",
            3164,
          );
        }
        if ((otherStatus3 & STATUS3_ALWAYS_HITS) !== 0) {
          return unsupportedBranch(
            context,
            `SwitchInClearSetData's STATUS3_ALWAYS_HITS cross-battler clear (battler ${i}) needs `
              + "gDisableStructs[battler].battlerWithSureHit identity, not modeled here",
            3166,
          );
        }
      }
    }
    for (let i = 0; i < battlersCount; i += 1) {
      if (i === battler) continue;
      const other = rules.battlers[i as 0 | 1 | 2 | 3];
      if (
        battlersCount !== 2
        && (other.status2 & BATTLE_SCRIPT_STATUS2_WRAPPED_MASK) !== 0
      ) {
        return unsupportedBranch(
          context,
          `SwitchInClearSetData's STATUS2_WRAPPED cross-battler clear (battler ${i}) needs `
            + "gBattleStruct->wrappedBy identity outside singles",
          3199,
        );
      }
      if (
        isBatonPass
        && battlersCount !== 2
        && other.side !== active.side
        && (other.status3 & STATUS3_ALWAYS_HITS) !== 0
      ) {
        return unsupportedBranch(
          context,
          `SwitchInClearSetData's Baton Pass STATUS3_ALWAYS_HITS refresh (battler ${i}) needs `
            + "gDisableStructs[battler].battlerWithSureHit identity outside singles",
          3180,
        );
      }
    }

    const side = active.side === 0 ? "player" : "opponent";
    const partyMember = rules.party[side][active.partyIndex];
    const types = resolveSpeciesTypes(partyMember.species);
    if (!types) {
      throw new Error(
        `Cmd_switchindataupdate: species ${partyMember.species} has no gSpeciesInfo types row`,
      );
    }

    const infatuationBit = statusInfatuatedWithBit(battler);
    const battlers = rules.battlers.map((candidate, index) => {
      if (index === battler) {
        return Object.freeze({
          ...candidate,
          species: partyMember.species,
          hp: partyMember.hp,
          status1: partyMember.status1,
          moves: partyMember.moves,
          pp: partyMember.pp,
          types,
          statStages: isBatonPass ? candidate.statStages : DEFAULT_STAT_STAGES,
          status2: isBatonPass ? (candidate.status2 & BATON_PASS_STATUS2) >>> 0 : 0,
          status3: isBatonPass ? (candidate.status3 & BATON_PASS_STATUS3) >>> 0 : 0,
          substituteHP: isBatonPass ? candidate.substituteHP : 0,
          rolloutTimer: 0,
          furyCutterCounter: 0,
          mimickedMoves: 0,
          truantCounter: 0 as const,
          rechargeTimer: 0,
          disabledMove: 0,
          disableTimer: 0,
          disableTimerStartValue: 0,
          encoredMove: 0,
          encoredMovePos: 0,
          encoreTimer: 0,
          encoreTimerStartValue: 0,
          perishSongTimer: isBatonPass ? candidate.perishSongTimer : 0,
          perishSongTimerStartValue: isBatonPass ? candidate.perishSongTimerStartValue : 0,
          usedDisabledMove: 0 as const,
          tauntTimer: 0,
          usedTauntedMove: 0 as const,
          usedImprisonedMove: 0 as const,
        });
      }
      const clearsWrapped =
        battlersCount === 2
        && (candidate.status2 & BATTLE_SCRIPT_STATUS2_WRAPPED_MASK) !== 0;
      const status2 = (
        candidate.status2
        & ~infatuationBit
        & (clearsWrapped ? ~BATTLE_SCRIPT_STATUS2_WRAPPED_MASK : ~0)
      ) >>> 0;
      const refreshesSureHit =
        isBatonPass
        && battlersCount === 2
        && candidate.side !== active.side
        && (candidate.status3 & STATUS3_ALWAYS_HITS) !== 0;
      const status3 = refreshesSureHit
        ? (
          (candidate.status3 & ~STATUS3_ALWAYS_HITS)
          | STATUS3_ALWAYS_HITS_TURN_2
        ) >>> 0
        : candidate.status3;
      return status2 === candidate.status2 && status3 === candidate.status3
        ? candidate
        : Object.freeze({ ...candidate, status2, status3 });
    }) as unknown as BattleScriptRulesBattlers;

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, battlers: Object.freeze(battlers) }) },
    );
  };
}

/**
 * `Cmd_switchinanim` (`battle_script_commands.c:4674-4698`). The Pokédex-seen
 * branch is always skipped for Factory (`BATTLE_TYPE_FRONTIER`, `:4681-4686`);
 * `BATTLE_TYPE_ARENA`'s point-init call is a named barrier (never set for
 * Factory). Clears the switched-in battler's `gAbsentBattlerFlags` bit and
 * issues the controller round trip the script's own `waitstate` absorbs.
 */
function createSwitchinanimOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const operands = context.instruction.operands;
    if (
      operands.length !== 2
      || operands[0]?.widthBytes !== 1
      || operands[1]?.widthBytes !== 1
    ) {
      throw new Error(
        `invalid B_SCR_OP_SWITCHINANIM shape at program counter ${context.state.programCounter}`,
      );
    }
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_switchinanim: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    if ((rules.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_ARENA) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_switchinanim's BATTLE_TYPE_ARENA BattleArena_InitPoints call is not modeled",
        4696,
      );
    }
    const absentBattlerFlags = (rules.absentBattlerFlags & ~(1 << battler)) >>> 0;
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler as 0 | 1 | 2 | 3);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, absentBattlerFlags }), scheduler },
    );
  };
}

/** `Cmd_hpthresholds` (`battle_script_commands.c:6258-6283`): writes only the untracked `gBattleStruct->hpScale`, so this is a pure no-op advance on every reachable path (singles or doubles alike). */
function hpthresholdsOpcodeHandler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const operand = context.instruction.operands[0];
  if (context.instruction.operands.length !== 1 || operand?.widthBytes !== 1) {
    throw new Error(`invalid B_SCR_OP_HPTHRESHOLDS shape at program counter ${context.state.programCounter}`);
  }
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
}

/** `Cmd_cancelallactions` (`battle_script_commands.c:5850-5858`): writes only the untracked `gActionsByTurnOrder`, no reader anywhere in this engine's modeled scope. */
function cancelallactionsOpcodeHandler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  if (context.instruction.operands.length !== 0) {
    throw new Error(`invalid B_SCR_OP_CANCELALLACTIONS shape at program counter ${context.state.programCounter}`);
  }
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
}

/**
 * `Cmd_various` cases `VARIOUS_GET_MOVE_TARGET` (3),
 * `VARIOUS_RESET_PLAYER_FAINTED` (7), and
 * `VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT` (23). GET_MOVE_TARGET's
 * `MOVE_TARGET_SELECTED` branch is source-complete for singles: it repeats
 * `Random() % gBattlersCount` until it finds a present opposing battler.
 * Doubles still use the handler's existing generic barrier because Follow
 * Me and Lightning Rod target redirection require state this context does
 * not own. Every other `id` is that same named barrier.
 */
function createVariousOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [selectorOperand, idOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 2
      || selectorOperand?.widthBytes !== 1
      || idOperand?.widthBytes !== 1
    ) {
      throw new Error(`invalid B_SCR_OP_VARIOUS shape at program counter ${context.state.programCounter}`);
    }
    const id = resolveByteLiteral(idOperand.expression);
    const rules = context.state.rulesContext;
    const getMoveTargetSupported = id === VARIOUS_GET_MOVE_TARGET
      && rules.battleTopology.battlersCount === 2;
    if (
      id !== VARIOUS_SET_MAGIC_COAT_TARGET
      &&
      id !== VARIOUS_RESET_PLAYER_FAINTED
      && id !== VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT
      && !getMoveTargetSupported
    ) {
      return unsupportedBranch(
        context,
        `Cmd_various case ${idOperand.expression} is not modeled`,
        6326,
      );
    }
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_various: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    if (id === VARIOUS_GET_MOVE_TARGET) {
      const attackerState = rules.battlers[battler];
      let rng = context.state.rng;
      let target: 0 | 1 | 2 | 3;
      do {
        const draw = drawBattleScriptRng(rng, context.instruction, "GetMoveTarget(MOVE_TARGET_SELECTED)");
        rng = draw.rng;
        target = (draw.randomValue % rules.battleTopology.battlersCount) as 0 | 1 | 2 | 3;
      } while (
        target === battler
        || rules.battlers[target].side === attackerState.side
        || (rules.absentBattlerFlags & (1 << target)) !== 0
      );
      const nextRules = Object.freeze({
        ...rules,
        selectorRoles: Object.freeze({ ...rules.selectorRoles, target }),
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: nextRules, rng },
      );
    }

    if (id === VARIOUS_SET_MAGIC_COAT_TARGET) {
      const currentTarget = rules.selectorRoles.target;
      if (currentTarget === null) {
        throw new Error("Cmd_various VARIOUS_SET_MAGIC_COAT_TARGET requires a target role");
      }
      const attacker = currentTarget;
      const oppositeSide = rules.battlers[attacker].side === 0 ? 1 : 0;
      const sideTimer = rules.sideTimers[oppositeSide];
      const target: BattleScriptBattlerId = sideTimer.followmeTimer !== 0
        && rules.battlers[sideTimer.followmeTarget].hp !== 0
        ? sideTimer.followmeTarget
        : battler as BattleScriptBattlerId;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...rules,
            selectorRoles: Object.freeze({
              ...rules.selectorRoles,
              attacker,
              target,
            }),
          }),
        },
      );
    }

    if (id === VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT) {
      const alreadyStatusedMoveAttempt = (rules.alreadyStatusedMoveAttempt | (1 << battler)) >>> 0;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: Object.freeze({ ...rules, alreadyStatusedMoveAttempt }) },
      );
    }
    const { battleTypeFlags, battlersCount } = rules.battleTopology;
    const bothAlive = battlersCount > 1
      && rules.battlers[0].hp !== 0
      && rules.battlers[1].hp !== 0;
    const resets = (battleTypeFlags & (BATTLE_TYPE_LINK | BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE)) === 0
      && (battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_TRAINER) !== 0
      && bothAlive;
    if (!resets) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const hitMarker = (rules.hitMarker & ~HITMARKER_PLAYER_FAINTED) >>> 0;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, hitMarker }) },
    );
  };
}

/**
 * `Cmd_switchineffects` (`battle_script_commands.c:5219-5299`). Spikes runs
 * through the source's shared BattleScript_SpikesOn* scripts. The transient
 * SPIKES_DAMAGED bit makes the pushed-cursor re-entry a no-damage pass that
 * clears the guard before normal switch-in hooks. The Truant switch-in hack and
 * `AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN)` are named barriers gated
 * on the switched-in battler's real `ability` value (a small, closed set of
 * trigger abilities, `battle_util.c:2485-2599`); `ItemBattleEffects
 * (ITEMEFFECT_ON_SWITCH_IN)` needs no barrier at all -- its only two cases
 * are `HOLD_EFFECT_RESTORE_STATS` (unreachable: stat stages are always reset
 * to the neutral default by `switchindataupdate` just before this opcode
 * runs) and `HOLD_EFFECT_DOUBLE_PRIZE` (writes the untracked, unread
 * `gBattleStruct->moneyMultiplier`).
 */
function createSwitchineffectsOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const operand = context.instruction.operands[0];
    if (context.instruction.operands.length !== 1 || operand?.widthBytes !== 1) {
      throw new Error(`invalid B_SCR_OP_SWITCHINEFFECTS shape at program counter ${context.state.programCounter}`);
    }
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_switchineffects: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    const active = rules.battlers[battler as 0 | 1 | 2 | 3];
    const side = active.side;
    const faintedMask = (1 << (28 + battler)) >>> 0;
    const hitMarkerWithoutFainted = (rules.hitMarker & ~faintedMask) >>> 0;
    const isFlying = active.types.includes("TYPE_FLYING");
    const shouldDamage = (rules.sideStatuses[side] & SIDE_STATUS_SPIKES_DAMAGED) === 0
      && (rules.sideStatuses[side] & SIDE_STATUS_SPIKES) !== 0
      && !isFlying
      && active.ability !== ABILITY_LEVITATE;
    if (shouldDamage) {
      const layers = rules.sideTimers[side].spikesAmount;
      if (layers < 1 || layers > 3) {
        throw new Error(`Cmd_switchineffects requires a source-valid Spikes layer count 1..3, got ${layers}`);
      }
      const scriptName = operand.expression === "BS_TARGET"
        ? "BattleScript_SpikesOnTarget"
        : operand.expression === "BS_ATTACKER"
        ? "BattleScript_SpikesOnAttacker"
        : "BattleScript_SpikesOnFaintedBattler";
      const script = resolveBattleScriptLabel(context.program, scriptName);
      if (!script) throw new Error(`committed Battle Script program has no ${scriptName}`);
      const sideStatuses = [...rules.sideStatuses] as [number, number];
      sideStatuses[side] = (sideStatuses[side] | SIDE_STATUS_SPIKES_DAMAGED) >>> 0;
      const battlers = rules.battlers.map((candidate, index) =>
        index === battler
          ? Object.freeze({ ...candidate, status2: (candidate.status2 & ~STATUS2_DESTINY_BOND) >>> 0 })
          : candidate
      ) as unknown as BattleScriptRulesBattlers;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call-current", programCounter: script.programCounter }),
        {
          rulesContext: Object.freeze({
            ...rules,
            battlers: Object.freeze(battlers),
            scriptingBattler: battler as BattleScriptBattlerId,
            battleMoveDamage: Math.max(1, Math.trunc(active.maxHP / ((5 - layers) * 2))),
            hitMarker: (hitMarkerWithoutFainted & ~HITMARKER_DESTINYBOND) >>> 0,
            sideStatuses: Object.freeze(sideStatuses),
          }),
        },
      );
    }
    if (active.ability === ABILITY_TRUANT) {
      return unsupportedBranch(
        context,
        "Cmd_switchineffects's Truant switch-in-hack counter set is not modeled",
        5260,
      );
    }
    if (SWITCH_IN_ABILITY_EFFECTS.has(active.ability)) {
      return unsupportedBranch(
        context,
        `AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN) for ability ${active.ability} is not modeled`,
        2485,
      );
    }
    const sideStatuses = [...rules.sideStatuses] as [number, number];
    sideStatuses[side] = (sideStatuses[side] & ~SIDE_STATUS_SPIKES_DAMAGED) >>> 0;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          hitMarker: hitMarkerWithoutFainted,
          sideStatuses: Object.freeze(sideStatuses),
        }),
      },
    );
  };
}

export type BattleScriptSwitchinPorts = Readonly<{
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>;
}>;

export function createBattleScriptSwitchinOpcodeHandlers(
  program: BattleScriptProgram,
  ports: BattleScriptSwitchinPorts,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> = Object.create(null) as Record<
    number,
    BattleScriptOpcodeHandler<BattleScriptRulesContext>
  >;
  const install = (opcodeName: string, handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>) => {
    const instruction = program.instructions.find((candidate) => candidate.opcodeName === opcodeName);
    if (!instruction) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    handlers[instruction.opcodeId] = handler;
  };
  install("B_SCR_OP_SWITCHHANDLEORDER", createSwitchhandleorderOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_GETSWITCHEDMONDATA", createGetswitchedmondataOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_SWITCHINDATAUPDATE", createSwitchindataupdateOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_SWITCHINANIM", createSwitchinanimOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_HPTHRESHOLDS", hpthresholdsOpcodeHandler);
  install("B_SCR_OP_CANCELALLACTIONS", cancelallactionsOpcodeHandler);
  install("B_SCR_OP_VARIOUS", createVariousOpcodeHandler());
  install("B_SCR_OP_SWITCHINEFFECTS", createSwitchineffectsOpcodeHandler());
  return Object.freeze(handlers);
}
