/**
 * Forced-switch ground truth §4 slice 1: `B_SCR_OP_JUMPIFWORD` /
 * `Cmd_jumpifword` (`battle_script_commands.c:3733-3762`). A pure 4-byte
 * word compare + conditional jump -- structurally identical to
 * `Cmd_jumpifbyte` (`battleScriptJumpifbyteOpcode.ts`) except both the
 * memory word and the immediate comparison value are 4 bytes wide instead of
 * 1. This is the opcode `jumpifbattletype`/`jumpifnotbattletype` expand to
 * (`asm/macros/battle_script.inc:1433-1440`): every call site in the
 * committed program is one of those two macros, always comparing
 * `gBattleTypeFlags` or `gHitMarker` against a named bitmask.
 *
 * Registering this opcode is what turns
 * `jumpifbattletype BATTLE_TYPE_TRAINER, BattleScript_FaintedMonTryChoose`
 * inside `BattleScript_HandleFaintedMon` from a halted barrier into a taken
 * jump for Factory (always `BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER`),
 * per `docs/forced-switch-ground-truth.md` §1/§4 step 1.
 */
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

const CMP_EQUAL = 0;
const CMP_NOT_EQUAL = 1;
const CMP_GREATER_THAN = 2;
const CMP_LESS_THAN = 3;
const CMP_COMMON_BITS = 4;
const CMP_NO_COMMON_BITS = 5;

/** include/constants/battle_script_commands.h:326-331 -- same 6 comparators as jumpifbyte. */
const JUMPIFWORD_COMPARATORS: ReadonlyMap<string, number> = new Map([
  ["CMP_EQUAL", CMP_EQUAL],
  ["CMP_NOT_EQUAL", CMP_NOT_EQUAL],
  ["CMP_GREATER_THAN", CMP_GREATER_THAN],
  ["CMP_LESS_THAN", CMP_LESS_THAN],
  ["CMP_COMMON_BITS", CMP_COMMON_BITS],
  ["CMP_NO_COMMON_BITS", CMP_NO_COMMON_BITS],
]);

/**
 * include/constants/battle.h -- every named word this rung's call sites
 * compare against. Defined locally (not imported from
 * battleScriptRulesContext.ts, which imports this module's own handler
 * factory) to avoid a circular-import TDZ hazard: values used inside an
 * eagerly-evaluated module-level Map must not depend on the still-loading
 * other side of the cycle.
 */
const BATTLE_TYPE_DOUBLE = 1 << 0;
const BATTLE_TYPE_LINK = 1 << 1;
const BATTLE_TYPE_TRAINER = 1 << 3;
/** include/constants/battle.h:74. */
const BATTLE_TYPE_TWO_OPPONENTS = 1 << 15;
const BATTLE_TYPE_RECORDED_LINK = 1 << 25;
const BATTLE_TYPE_BATTLE_TOWER = 1 << 8;
const BATTLE_TYPE_DOME = 1 << 16;
const BATTLE_TYPE_PALACE = 1 << 17;
const BATTLE_TYPE_ARENA = 1 << 18;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_PIKE = 1 << 20;
const BATTLE_TYPE_PYRAMID = 1 << 21;
const BATTLE_TYPE_FRONTIER =
  BATTLE_TYPE_BATTLE_TOWER | BATTLE_TYPE_DOME | BATTLE_TYPE_PALACE | BATTLE_TYPE_ARENA
  | BATTLE_TYPE_FACTORY | BATTLE_TYPE_PIKE | BATTLE_TYPE_PYRAMID;
/** include/constants/battle.h:199. Distinct global (`gHitMarker`) from the BATTLE_TYPE_* bits above. */
const HITMARKER_PLAYER_FAINTED = 1 << 22;
/**
 * include/constants/battle.h:186. Semi-invulnerable registration rung 1
 * (docs/semi-invulnerable-registration-scout.md §5 rung 1). Every one of the
 * five two-turn-charge effects' own entry script runs `jumpifword
 * CMP_COMMON_BITS, gHitMarker, HITMARKER_NO_ATTACKSTRING, <SecondTurnLabel>`
 * as its second instruction, unconditionally -- shared by
 * EFFECT_SEMI_INVULNERABLE/RAZOR_WIND/SKY_ATTACK/SKULL_BASH/SOLAR_BEAM alike.
 */
const HITMARKER_NO_ATTACKSTRING = 1 << 9;

const JUMPIFWORD_VALUES: ReadonlyMap<string, number> = new Map([
  ["BATTLE_TYPE_DOUBLE", BATTLE_TYPE_DOUBLE],
  ["BATTLE_TYPE_LINK", BATTLE_TYPE_LINK],
  ["BATTLE_TYPE_TRAINER", BATTLE_TYPE_TRAINER],
  ["BATTLE_TYPE_RECORDED_LINK", BATTLE_TYPE_RECORDED_LINK],
  ["BATTLE_TYPE_FRONTIER", BATTLE_TYPE_FRONTIER],
  ["HITMARKER_PLAYER_FAINTED", HITMARKER_PLAYER_FAINTED],
  ["HITMARKER_NO_ATTACKSTRING", HITMARKER_NO_ATTACKSTRING],
  /**
   * `BattleScript_EffectRoar`'s own `jumpifbattletype BATTLE_TYPE_ARENA,
   * BattleScript_ButItFailed` (`data/battle_scripts_1.s:601`). Real dossier
   * slip found live running Roar's committed script (docs/roar-multihit-
   * registration-scout.md §1a's own table wrongly claimed this was "already
   * in JUMPIFWORD_VALUES" -- `BATTLE_TYPE_ARENA` was only ever a local
   * building block for `BATTLE_TYPE_FRONTIER`'s OR-combination above, never
   * exposed as its own standalone comparand). Level-50 Factory singles are
   * never Battle Arena (`BATTLE_TYPE_ARENA` is Frontier-facility-exclusive,
   * mutually distinct from `BATTLE_TYPE_FACTORY`), so this comparison is
   * always false for Factory -- registering the value (not special-casing
   * the branch) lets the real always-false compare run instead of barriering.
   */
  ["BATTLE_TYPE_ARENA", BATTLE_TYPE_ARENA],
  /**
   * The two comparands the post-battle WIN script reaches
   * (`BattleScript_FrontierTrainerBattleWon`'s own
   * `jumpifbattletype BATTLE_TYPE_TWO_OPPONENTS` and
   * `BattleScript_TryPickUpItems`' `jumpifnotbattletype BATTLE_TYPE_PYRAMID`,
   * `data/battle_scripts_1.s:3029/3045`), registered for the terminal-seam
   * increment (i) — `docs/terminal-seam-round-flow-scout.md` §3.
   *
   * The scout's §3 table read this path at *opcode* granularity and concluded
   * "all already registered"; JUMPIFWORD is indeed registered, but its
   * per-operand value map is a second, independent barrier — the same class
   * the `BATTLE_TYPE_ARENA` note above records. Both are always-false for
   * Level-50 Factory singles (`BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY`
   * carries neither bit: TWO_OPPONENTS is doubles-only, and PYRAMID is a
   * sibling facility inside the FRONTIER OR-combination above), so — exactly
   * as with ARENA — this registers the value and lets the real always-false
   * compare run rather than special-casing the branch.
   */
  ["BATTLE_TYPE_TWO_OPPONENTS", BATTLE_TYPE_TWO_OPPONENTS],
  ["BATTLE_TYPE_PYRAMID", BATTLE_TYPE_PYRAMID],
]);

/**
 * The memWord pointer universe this engine can resolve today: both globals
 * every `jumpifbattletype`/`jumpifnotbattletype`/plain `jumpifword` call site
 * in the committed program reads.
 */
function readJumpifwordMemWord(
  rules: BattleScriptRulesContext,
  expression: string,
): number | null {
  switch (expression) {
    case "gBattleTypeFlags": return rules.battleTopology.battleTypeFlags;
    case "gHitMarker": return rules.hitMarker;
    /** Screens/weather registration slice 5 -- BattleScript_DamagingWeatherLoop's own `jumpifword CMP_EQUAL, gBattleMoveDamage, 0, ...` (docs/screens-weather-ground-truth.md §1c). */
    case "gBattleMoveDamage": return rules.battleMoveDamage;
    default: return null;
  }
}

function resolveJumpifwordValue(expression: string): number | null {
  if (expression === "0") return 0;
  return JUMPIFWORD_VALUES.get(expression) ?? null;
}

function evaluateJumpifwordComparison(caseId: number, memWord: number, value: number): boolean {
  switch (caseId) {
    case CMP_EQUAL: return memWord === value;
    case CMP_NOT_EQUAL: return memWord !== value;
    case CMP_GREATER_THAN: return memWord > value;
    case CMP_LESS_THAN: return memWord < value;
    case CMP_COMMON_BITS: return (memWord & value) !== 0;
    case CMP_NO_COMMON_BITS: return (memWord & value) === 0;
    default:
      throw new Error(`Cmd_jumpifword: caseID ${caseId} is outside the committed program's 0..5 domain`);
  }
}

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceLine: number,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "unsupported-branch",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        sourceConstruct,
        sourceFile: "data/battle_scripts_1.s",
        sourceLine,
      }),
    }),
  );
}

function createJumpifwordOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [ifflagOperand, memWordOperand, wordOperand, ptrOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 4
      || ifflagOperand?.widthBytes !== 1
      || memWordOperand?.widthBytes !== 4
      || wordOperand?.widthBytes !== 4
      || ptrOperand?.widthBytes !== 4
    ) {
      throw new Error(
        `invalid B_SCR_OP_JUMPIFWORD shape at program counter ${context.state.programCounter}`,
      );
    }
    const caseId = JUMPIFWORD_COMPARATORS.get(ifflagOperand.expression);
    if (caseId === undefined) {
      throw new Error(`Cmd_jumpifword: unknown comparator ${ifflagOperand.expression}`);
    }

    const rules = context.state.rulesContext;
    const memWord = readJumpifwordMemWord(rules, memWordOperand.expression);
    const value = resolveJumpifwordValue(wordOperand.expression);
    if (memWord === null || value === null) {
      return unsupportedBranch(
        context,
        `Cmd_jumpifword's operand (${memWord === null ? memWordOperand.expression : wordOperand.expression}) `
          + "is not modeled",
        context.instruction.source.statementLine,
      );
    }

    if (!evaluateJumpifwordComparison(caseId, memWord, value)) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand.expression);
    if (!target) {
      throw new Error(`Cmd_jumpifword: unresolved jump target ${ptrOperand.expression}`);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

export function createBattleScriptJumpifwordOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_JUMPIFWORD",
  );
  if (!instruction) throw new Error("committed Battle Script program does not emit B_SCR_OP_JUMPIFWORD");
  return Object.freeze({ [instruction.opcodeId]: createJumpifwordOpcodeHandler() });
}
