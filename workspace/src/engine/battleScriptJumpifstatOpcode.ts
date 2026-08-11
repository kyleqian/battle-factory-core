/**
 * `B_SCR_OP_JUMPIFSTAT` / `Cmd_jumpifstat` (battle_script_commands.c:3178-
 * 3216). A pure stat-stage read + conditional jump: compare
 * `gBattleMons[battler].statStages[stat]` against the byte immediate under
 * one of the six named `CMP_*` comparators, then jump (reading the 4-byte
 * pointer at operand offset 5) or fall through 9 bytes. No RNG, no writes.
 *
 * Eagerly validated at registration like the other zero-barrier opcodes
 * (`B_SCR_OP_STATBUFFCHANGE`/`SETBYTE`/`ORBYTE`): all **18** concrete
 * committed call sites use only a named `STAT_*` id and `MIN_STAT_STAGE`(0)/
 * `MAX_STAT_STAGE`(12) as the comparand (verified against
 * `loadBattleScriptProgram()`'s own parsed operands), and only four of the
 * six comparators (`CMP_GREATER_THAN`/`CMP_NOT_EQUAL`/`CMP_EQUAL`/
 * `CMP_LESS_THAN`) ever appear -- but the switch itself is implemented
 * source-completely for all six, since the registration policy asks for the
 * full comparison-operator set, not just the exercised subset, and a 7th
 * `CMP_*` enum value never exists to fall through to.
 */
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  transitionBattleScriptCommand,
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
import type { BattleScriptBattlerSelectorResolverPort } from "./battleScriptSourceCommands.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle_script_commands.h:326-331 -- shared with jumpifbyte/jumpifword/jumpifhalfword's own identical 6-comparator family. */
const CMP_EQUAL = 0;
const CMP_NOT_EQUAL = 1;
const CMP_GREATER_THAN = 2;
const CMP_LESS_THAN = 3;
const CMP_COMMON_BITS = 4;
const CMP_NO_COMMON_BITS = 5;

const JUMPIFSTAT_COMPARATORS: ReadonlyMap<string, number> = new Map([
  ["CMP_EQUAL", CMP_EQUAL],
  ["CMP_NOT_EQUAL", CMP_NOT_EQUAL],
  ["CMP_GREATER_THAN", CMP_GREATER_THAN],
  ["CMP_LESS_THAN", CMP_LESS_THAN],
  ["CMP_COMMON_BITS", CMP_COMMON_BITS],
  ["CMP_NO_COMMON_BITS", CMP_NO_COMMON_BITS],
]);

/** include/constants/pokemon.h:76-84. STAT_HP(0) is never a jumpifstat operand. */
const JUMPIFSTAT_STATS: ReadonlyMap<string, number> = new Map([
  ["STAT_ATK", STAT_ATK],
  ["STAT_DEF", STAT_DEF],
  ["STAT_SPEED", STAT_SPEED],
  ["STAT_SPATK", STAT_SPATK],
  ["STAT_SPDEF", STAT_SPDEF],
  ["STAT_ACC", STAT_ACC],
  ["STAT_EVASION", STAT_EVASION],
]);

/** include/constants/pokemon.h:89,91 -- the only two concrete jumpifstat comparand operands in the committed program. */
const JUMPIFSTAT_VALUES: ReadonlyMap<string, number> = new Map([
  ["MIN_STAT_STAGE", 0],
  ["MAX_STAT_STAGE", 12],
]);

function evaluateJumpifstatComparison(caseId: number, value: number, comparand: number): boolean {
  switch (caseId) {
    case CMP_EQUAL: return value === comparand;
    case CMP_NOT_EQUAL: return value !== comparand;
    case CMP_GREATER_THAN: return value > comparand;
    case CMP_LESS_THAN: return value < comparand;
    case CMP_COMMON_BITS: return (value & comparand) !== 0;
    case CMP_NO_COMMON_BITS: return (value & comparand) === 0;
    default:
      throw new Error(`Cmd_jumpifstat: caseID ${caseId} is outside the committed program's 0..5 domain`);
  }
}

function createJumpifstatOpcodeHandler(
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [battlerOperand, ifflagOperand, statOperand, valueOperand, ptrOperand] = context.instruction.operands;
    const caseId = JUMPIFSTAT_COMPARATORS.get(ifflagOperand!.expression);
    const statId = JUMPIFSTAT_STATS.get(statOperand!.expression);
    const comparand = JUMPIFSTAT_VALUES.get(valueOperand!.expression);
    if (caseId === undefined || statId === undefined || comparand === undefined) {
      throw new Error(
        `validated B_SCR_OP_JUMPIFSTAT became undecodable at ${context.state.programCounter}`,
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

    const value = context.state.rulesContext.battlers[battler].statStages[statId]!;
    if (!evaluateJumpifstatComparison(caseId, value, comparand)) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!target) throw new Error(`Cmd_jumpifstat: unresolved jump target ${ptrOperand!.expression}`);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

export function createBattleScriptJumpifstatOpcodeHandlers(
  program: BattleScriptProgram,
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFSTAT",
  );
  if (starts.length !== 18) {
    throw new Error(`B_SCR_OP_JUMPIFSTAT requires all 18 concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    const [battlerOperand, ifflagOperand, statOperand, valueOperand, ptrOperand] = instruction.operands;
    if (
      instruction.operands.length !== 5
      || battlerOperand?.widthBytes !== 1
      || ifflagOperand?.widthBytes !== 1
      || statOperand?.widthBytes !== 1
      || valueOperand?.widthBytes !== 1
      || ptrOperand?.widthBytes !== 4
    ) {
      throw new Error(`invalid B_SCR_OP_JUMPIFSTAT shape at program counter ${instruction.programCounter}`);
    }
    if (!JUMPIFSTAT_COMPARATORS.has(ifflagOperand.expression)) {
      throw new Error(`unknown B_SCR_OP_JUMPIFSTAT comparator ${ifflagOperand.expression}`);
    }
    if (!JUMPIFSTAT_STATS.has(statOperand.expression)) {
      throw new Error(`unknown B_SCR_OP_JUMPIFSTAT stat ${statOperand.expression}`);
    }
    if (!JUMPIFSTAT_VALUES.has(valueOperand.expression)) {
      throw new Error(`unknown B_SCR_OP_JUMPIFSTAT value ${valueOperand.expression}`);
    }
    if (!resolveBattleScriptLabel(program, ptrOperand.expression)) {
      throw new Error(`unresolved B_SCR_OP_JUMPIFSTAT jump target ${ptrOperand.expression}`);
    }
  }

  return Object.freeze({
    [starts[0]!.opcodeId]: createJumpifstatOpcodeHandler(resolveBattlerForBattleScript),
  });
}
