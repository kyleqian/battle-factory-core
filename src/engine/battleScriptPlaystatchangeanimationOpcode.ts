/**
 * `B_SCR_OP_PLAYSTATCHANGEANIMATION` / `Cmd_playstatchangeanimation`
 * (battle_script_commands.c:4111-4208). Under Battle Scene OFF this command's
 * visible output (the actual stat-animation graphic) is out of scope, but its
 * effect on battle STATE is real and this port models it exactly: it decides,
 * from the CURRENT stat stages (never mutates any -- the later
 * `setstatchanger`+`statbuffchange` pair does the real write), whether a
 * `B_ANIM_STATS_CHANGE` controller animation is queued at all, and flips
 * `gBattleScripting.statAnimPlayed` (`sSTAT_ANIM_PLAYED`, already modeled)
 * so a multi-stat move's second/third call in the same script doesn't queue
 * a second animation for the same move use.
 *
 * Source shape, ported exactly:
 * - Walks the `stats` bitmask (`BIT_ATK`.. `BIT_EVASION`, one bit per
 *   `STAT_*` id starting at STAT_HP=0, which no concrete mask ever sets).
 * - `STAT_CHANGE_NEGATIVE` selects the "goes down" family, which only counts
 *   a stat as changeable if it isn't already at `MIN_STAT_STAGE`, AND (unless
 *   `STAT_CHANGE_CANT_PREVENT` is set) only if it isn't animation-blocked by
 *   Mist / Clear Body / White Smoke / Keen Eye+ACC / Hyper Cutter+ATK -- the
 *   same guard-ladder predicates `changeStatBuffs` (battleScriptStatBuffs.ts)
 *   applies to the real write, duplicated here rather than shared because
 *   this call reads pre-write stat stages for animation-eligibility only and
 *   never performs Protect/Shield Dust/certain-flag masking (source has none
 *   of those here). Otherwise (no `STAT_CHANGE_NEGATIVE`) the "goes up"
 *   family counts a stat as changeable only if it isn't already at
 *   `MAX_STAT_STAGE` -- no ability/Mist gate exists on this branch at all.
 * - `STAT_CHANGE_BY_TWO` only changes which decorative `STAT_ANIM_*` id would
 *   be queued (PLUS/MINUS 1 vs 2) -- inert for this non-presentation engine
 *   beyond being carried as the emitted event's decorative argument.
 * - `changeableStatsCount > 1` recolors the decorative anim id to the
 *   MULTIPLE_* variant; `STAT_CHANGE_MULTIPLE_STATS && count < 2` skips
 *   entirely (+4, no emit, no statAnimPlayed write); otherwise, if
 *   `count != 0 && !statAnimPlayed`, the animation queues (controller mark +
 *   event) and `statAnimPlayed` is set only when
 *   `STAT_CHANGE_MULTIPLE_STATS && count > 1`.
 *
 * Eagerly validated at registration like `B_SCR_OP_STATBUFFCHANGE`/
 * `SETBYTE`/`ORBYTE`: all **15** concrete committed call sites (verified
 * against `loadBattleScriptProgram()`'s own parsed operands) resolve to a
 * known stats mask and a known flags combination (including the bare literal
 * `0` five call sites use for a pure "goes up, by one" combination) -- no
 * `unsupported-branch` barrier exists in this registration, matching the
 * source function's own total absence of an unhandled branch.
 */
import {
  transitionBattleScriptCommand,
  markBattleScriptControllerPending,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  STAT_ACC,
  STAT_ATK,
  STAT_DEF,
  STAT_EVASION,
  STAT_SPATK,
  STAT_SPDEF,
  STAT_SPEED,
} from "./battleScriptStatBuffs.ts";
import type {
  BattleScriptBattlerSelectorResolverPort,
  BattleScriptControllerIdlePort,
} from "./battleScriptSourceCommands.ts";
import type { BattleScriptRulesContext, BattleScriptRulesBattler } from "./battleScriptRulesContext.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";

/** include/constants/battle_script_commands.h:382-388. */
const BIT_STAT_TERMS: ReadonlyMap<string, number> = new Map([
  ["BIT_ATK", 1 << STAT_ATK],
  ["BIT_DEF", 1 << STAT_DEF],
  ["BIT_SPEED", 1 << STAT_SPEED],
  ["BIT_SPATK", 1 << STAT_SPATK],
  ["BIT_SPDEF", 1 << STAT_SPDEF],
  ["BIT_ACC", 1 << STAT_ACC],
  ["BIT_EVASION", 1 << STAT_EVASION],
]);

function resolveStatsMask(expression: string): number | null {
  let mask = 0;
  for (const term of expression.split("|")) {
    const bit = BIT_STAT_TERMS.get(term.trim());
    if (bit === undefined) return null;
    mask |= bit;
  }
  return mask >>> 0;
}

/** include/constants/battle_script_commands.h:375-378. */
const STAT_CHANGE_NEGATIVE = 1 << 0;
const STAT_CHANGE_BY_TWO = 1 << 1;
const STAT_CHANGE_MULTIPLE_STATS = 1 << 2;
const STAT_CHANGE_CANT_PREVENT = 1 << 3;

const PLAYSTATCHANGEANIMATION_FLAG_TERMS: ReadonlyMap<string, number> = new Map([
  ["STAT_CHANGE_NEGATIVE", STAT_CHANGE_NEGATIVE],
  ["STAT_CHANGE_BY_TWO", STAT_CHANGE_BY_TWO],
  ["STAT_CHANGE_MULTIPLE_STATS", STAT_CHANGE_MULTIPLE_STATS],
  ["STAT_CHANGE_CANT_PREVENT", STAT_CHANGE_CANT_PREVENT],
]);

function resolveChangeFlags(expression: string): number | null {
  if (expression.trim() === "0") return 0;
  let flags = 0;
  for (const term of expression.split("|")) {
    const bit = PLAYSTATCHANGEANIMATION_FLAG_TERMS.get(term.trim());
    if (bit === undefined) return null;
    flags |= bit;
  }
  return flags >>> 0;
}

/** include/constants/pokemon.h:89,91. */
const MIN_STAT_STAGE = 0;
const MAX_STAT_STAGE = 12;

/** include/abilities.h -- matches battleScriptStatBuffs.ts's own (unexported) constants, redeclared locally to avoid an import cycle. */
const ABILITY_CLEAR_BODY = 29;
const ABILITY_WHITE_SMOKE = 73;
const ABILITY_KEEN_EYE = 51;
const ABILITY_HYPER_CUTTER = 52;

/** battle_anim.h:195-202. */
const STAT_ANIM_PLUS1 = 14;
const STAT_ANIM_PLUS2 = 38;
const STAT_ANIM_MINUS1 = 21;
const STAT_ANIM_MINUS2 = 45;
const STAT_ANIM_MULTIPLE_PLUS1 = 55;
const STAT_ANIM_MULTIPLE_PLUS2 = 56;
const STAT_ANIM_MULTIPLE_MINUS1 = 57;
const STAT_ANIM_MULTIPLE_MINUS2 = 58;

type PlaystatchangeanimationOutcome = Readonly<{
  statAnimId: number;
  changeableStatsCount: number;
}>;

function computePlaystatchangeanimation(
  battlerState: BattleScriptRulesBattler,
  mistTimer: number,
  statsToCheckMask: number,
  flags: number,
): PlaystatchangeanimationOutcome {
  const byTwo = (flags & STAT_CHANGE_BY_TWO) !== 0;
  let statsToCheck = statsToCheckMask;
  let currStat = 0;
  let statAnimId = 0;
  let changeableStatsCount = 0;

  if ((flags & STAT_CHANGE_NEGATIVE) !== 0) {
    const startingStatAnimId = byTwo ? STAT_ANIM_MINUS2 : STAT_ANIM_MINUS1;
    while (statsToCheck !== 0) {
      if (statsToCheck & 1) {
        const stage = battlerState.statStages[currStat]!;
        if ((flags & STAT_CHANGE_CANT_PREVENT) !== 0) {
          if (stage > MIN_STAT_STAGE) {
            statAnimId = startingStatAnimId + currStat;
            changeableStatsCount++;
          }
        } else if (
          mistTimer === 0
          && battlerState.ability !== ABILITY_CLEAR_BODY
          && battlerState.ability !== ABILITY_WHITE_SMOKE
          && !(battlerState.ability === ABILITY_KEEN_EYE && currStat === STAT_ACC)
          && !(battlerState.ability === ABILITY_HYPER_CUTTER && currStat === STAT_ATK)
        ) {
          if (stage > MIN_STAT_STAGE) {
            statAnimId = startingStatAnimId + currStat;
            changeableStatsCount++;
          }
        }
      }
      statsToCheck >>>= 1;
      currStat++;
    }
    if (changeableStatsCount > 1) {
      statAnimId = byTwo ? STAT_ANIM_MULTIPLE_MINUS2 : STAT_ANIM_MULTIPLE_MINUS1;
    }
  } else {
    const startingStatAnimId = byTwo ? STAT_ANIM_PLUS2 : STAT_ANIM_PLUS1;
    while (statsToCheck !== 0) {
      if ((statsToCheck & 1) && battlerState.statStages[currStat]! < MAX_STAT_STAGE) {
        statAnimId = startingStatAnimId + currStat;
        changeableStatsCount++;
      }
      statsToCheck >>>= 1;
      currStat++;
    }
    if (changeableStatsCount > 1) {
      statAnimId = byTwo ? STAT_ANIM_MULTIPLE_PLUS2 : STAT_ANIM_MULTIPLE_PLUS1;
    }
  }

  return Object.freeze({ statAnimId, changeableStatsCount });
}

function createPlaystatchangeanimationOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "controller-busy",
            programCounter: context.state.programCounter,
            opcodeId: context.instruction.opcodeId,
            opcodeName: context.instruction.opcodeName,
          }),
        }),
      );
    }

    const [battlerOperand, statsOperand, changeOperand] = context.instruction.operands;
    const statsMask = resolveStatsMask(statsOperand!.expression);
    const flags = resolveChangeFlags(changeOperand!.expression);
    if (statsMask === null || flags === null) {
      throw new Error(
        `validated B_SCR_OP_PLAYSTATCHANGEANIMATION became undecodable at ${context.state.programCounter}`,
      );
    }

    const battler = resolveBattlerForBattleScript(context, battlerOperand!);
    if (battler === null) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "source-context-unavailable",
            programCounter: context.state.programCounter,
            opcodeId: context.instruction.opcodeId,
            opcodeName: context.instruction.opcodeName,
            port: "resolve-battler-for-battle-script",
            operandExpression: battlerOperand!.expression,
          }),
        }),
      );
    }

    const rulesContext = context.state.rulesContext;
    const battlerState = rulesContext.battlers[battler];
    const mistTimer = rulesContext.mistTimers[battlerState.side];
    const { statAnimId, changeableStatsCount } = computePlaystatchangeanimation(
      battlerState,
      mistTimer,
      statsMask,
      flags,
    );

    if ((flags & STAT_CHANGE_MULTIPLE_STATS) !== 0 && changeableStatsCount < 2) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    if (changeableStatsCount !== 0 && rulesContext.statAnimPlayed === 0) {
      const statAnimPlayed = (flags & STAT_CHANGE_MULTIPLE_STATS) !== 0 && changeableStatsCount > 1 ? 1 : 0;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          scheduler: markBattleScriptControllerPending(context.state.scheduler, battler),
          rulesContext: statAnimPlayed
            ? Object.freeze({ ...rulesContext, statAnimPlayed })
            : rulesContext,
          events: Object.freeze([
            Object.freeze({
              kind: "animation" as const,
              animationId: "STATS_CHANGE",
              battler,
              arguments: Object.freeze([String(statAnimId)]),
            }),
          ]),
        },
      );
    }
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  };
}

export function createBattleScriptPlaystatchangeanimationOpcodeHandlers(
  program: BattleScriptProgram,
  ports: Readonly<{
    isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>;
    resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>;
  }>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_PLAYSTATCHANGEANIMATION",
  );
  if (starts.length !== 15) {
    throw new Error(`B_SCR_OP_PLAYSTATCHANGEANIMATION requires all 15 concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    const [battlerOperand, statsOperand, changeOperand] = instruction.operands;
    if (
      instruction.operands.length !== 3
      || battlerOperand?.widthBytes !== 1
      || statsOperand?.widthBytes !== 1
      || changeOperand?.widthBytes !== 1
    ) {
      throw new Error(
        `invalid B_SCR_OP_PLAYSTATCHANGEANIMATION shape at program counter ${instruction.programCounter}`,
      );
    }
    if (resolveStatsMask(statsOperand.expression) === null) {
      throw new Error(`unknown B_SCR_OP_PLAYSTATCHANGEANIMATION stats mask ${statsOperand.expression}`);
    }
    if (resolveChangeFlags(changeOperand.expression) === null) {
      throw new Error(`unknown B_SCR_OP_PLAYSTATCHANGEANIMATION flags ${changeOperand.expression}`);
    }
  }

  return Object.freeze({
    [starts[0]!.opcodeId]: createPlaystatchangeanimationOpcodeHandler(
      ports.isControllerIdle,
      ports.resolveBattlerForBattleScript,
    ),
  });
}
