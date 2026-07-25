/**
 * Executable-frontier census (2026-07-25): `B_SCR_OP_JUMPIFSTATUS3CONDITION`
 * / `Cmd_jumpifstatus3condition` (`battle_script_commands.c:3218-3240`).
 * `BattleScript_EffectHit`'s Surf guard, the second of the census's
 * three-opcode chokepoint set: `jumpifnostatus3 BS_TARGET,
 * STATUS3_UNDERWATER, BattleScript_HitFromAtkCanceler`
 * (`data/battle_scripts_1.s:238`) only evaluates once the first instruction
 * (`jumpifhalfword`) has already confirmed the current move is Surf.
 *
 * Source semantics -- both jump-if-set and jump-if-clear forms, selected by
 * the literal TRUE/FALSE byte the two convenience macros supply:
 *
 *   if (condition)                       // jumpifnostatus3: condition=TRUE
 *     shouldJump = (status3 & mask) === 0;   // jump if the bit is CLEAR
 *   else                                  // jumpifstatus3: condition=FALSE
 *     shouldJump = (status3 & mask) !== 0;   // jump if the bit is SET
 *
 * Unlike jumpifhalfword/jumpifbyte/jumpifword, this opcode's entire concrete
 * call-site set in the committed program (all 7 occurrences) uses the same
 * battler selector (BS_TARGET) and one of only 5 named STATUS3_* bits, so
 * this registration validates every concrete instance at registration time
 * (the same pattern `battleScriptSetByte.ts` uses for `Cmd_setbyte`) and
 * needs no runtime `unsupported-branch` barrier at all -- (a), source-complete.
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
  BATTLE_SCRIPT_STATUS3_MINIMIZED,
  BATTLE_SCRIPT_STATUS3_ON_AIR,
  BATTLE_SCRIPT_STATUS3_ROOTED,
  BATTLE_SCRIPT_STATUS3_UNDERGROUND,
  BATTLE_SCRIPT_STATUS3_UNDERWATER,
} from "./battleScriptSourceConstants.ts";
import {
  resolveRulesBattlerForBattleScript,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:163-175 -- every STATUS3_* bit a concrete call site in the committed program names. */
const JUMPIFSTATUS3CONDITION_VALUES: ReadonlyMap<string, number> = new Map([
  ["STATUS3_ON_AIR", BATTLE_SCRIPT_STATUS3_ON_AIR],
  ["STATUS3_UNDERGROUND", BATTLE_SCRIPT_STATUS3_UNDERGROUND],
  ["STATUS3_MINIMIZED", BATTLE_SCRIPT_STATUS3_MINIMIZED],
  ["STATUS3_ROOTED", BATTLE_SCRIPT_STATUS3_ROOTED],
  ["STATUS3_UNDERWATER", BATTLE_SCRIPT_STATUS3_UNDERWATER],
]);

/** The literal TRUE/FALSE byte jumpifstatus3/jumpifnostatus3 always supply. */
const CONDITION_VALUES: ReadonlyMap<string, boolean> = new Map([
  ["TRUE", true],
  ["FALSE", false],
]);

function createJumpifstatus3conditionOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [battlerOperand, statusOperand, conditionOperand, ptrOperand] = context.instruction.operands;
    const condition = CONDITION_VALUES.get(conditionOperand!.expression);
    const mask = JUMPIFSTATUS3CONDITION_VALUES.get(statusOperand!.expression);
    const battler = resolveRulesBattlerForBattleScript(context, battlerOperand!);
    if (condition === undefined || mask === undefined || battler === null) {
      throw new Error(
        `validated B_SCR_OP_JUMPIFSTATUS3CONDITION became undecodable at ${context.state.programCounter}`,
      );
    }

    const status3 = context.state.rulesContext.battlers[battler].status3;
    const bitSet = (status3 & mask) !== 0;
    const shouldJump = condition ? !bitSet : bitSet;

    if (!shouldJump) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!target) {
      throw new Error(`Cmd_jumpifstatus3condition: unresolved jump target ${ptrOperand!.expression}`);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

/**
 * Source-complete Cmd_jumpifstatus3condition for the committed program.
 * Registry creation validates every concrete opcode start (all 7) before the
 * opcode becomes executable, matching Cmd_setbyte's own eager-validation
 * pattern for a fully-covered opcode.
 */
export function createBattleScriptJumpifstatus3conditionOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFSTATUS3CONDITION",
  );
  if (starts.length !== 7) {
    throw new Error(`B_SCR_OP_JUMPIFSTATUS3CONDITION requires all 7 concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    const [battlerOperand, statusOperand, conditionOperand, ptrOperand] = instruction.operands;
    if (
      instruction.operands.length !== 4
      || battlerOperand?.widthBytes !== 1
      || statusOperand?.widthBytes !== 4
      || conditionOperand?.widthBytes !== 1
      || ptrOperand?.widthBytes !== 4
    ) {
      throw new Error(`invalid B_SCR_OP_JUMPIFSTATUS3CONDITION shape at program counter ${instruction.programCounter}`);
    }
    if (battlerOperand.expression !== "BS_TARGET") {
      throw new Error(`unknown B_SCR_OP_JUMPIFSTATUS3CONDITION battler selector ${battlerOperand.expression}`);
    }
    if (!CONDITION_VALUES.has(conditionOperand.expression)) {
      throw new Error(`unknown B_SCR_OP_JUMPIFSTATUS3CONDITION condition ${conditionOperand.expression}`);
    }
    if (!JUMPIFSTATUS3CONDITION_VALUES.has(statusOperand.expression)) {
      throw new Error(`unknown B_SCR_OP_JUMPIFSTATUS3CONDITION status3 value ${statusOperand.expression}`);
    }
  }
  return Object.freeze({ [starts[0]!.opcodeId]: createJumpifstatus3conditionOpcodeHandler() });
}
