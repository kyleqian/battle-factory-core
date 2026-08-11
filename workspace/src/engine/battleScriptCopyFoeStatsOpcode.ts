/**
 * `B_SCR_OP_COPYFOESTATS` / `Cmd_copyfoestats`
 * (`battle_script_commands.c:8809-8820`), the unique command in
 * `BattleScript_EffectPsychUp`.
 *
 * The command copies all eight source `statStages` bytes from target to
 * attacker, ignores its encoded failure pointer, and advances
 * unconditionally. Neutral arrays are therefore a successful copy, not a
 * failure branch. HP, status, and animation-argument fields are deliberately
 * outside the copied slice.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type {
  BattleScriptRulesContext,
  BattleScriptStatStages,
} from "./battleScriptRulesContext.ts";

const copyFoeStatsHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rules = context.state.rulesContext;
  const attacker = rules.selectorRoles.attacker;
  const target = rules.selectorRoles.target;
  if (attacker === null) {
    throw new Error("B_SCR_OP_COPYFOESTATS requires an attacker role");
  }
  if (target === null) {
    throw new Error("B_SCR_OP_COPYFOESTATS requires a target role");
  }
  const statStages = Object.freeze([
    ...rules.battlers[target].statStages,
  ]) as BattleScriptStatStages;
  const battlers = rules.battlers.map((battler, index) =>
    index === attacker ? Object.freeze({ ...battler, statStages }) : battler
  ) as unknown as typeof rules.battlers;
  const copiedRules = Object.freeze({
    ...rules,
    battlers: Object.freeze(battlers),
  });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: copiedRules },
  );
};

export function createBattleScriptCopyFoeStatsOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (candidate) => candidate.opcodeName === "B_SCR_OP_COPYFOESTATS",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_COPYFOESTATS requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  const [unusedFailurePointer] = instruction!.operands;
  if (
    instruction!.dispatcher !== "Cmd_copyfoestats"
    || instruction!.source.label !== "BattleScript_EffectPsychUp"
    || instruction!.operands.length !== 1
    || unusedFailurePointer?.widthBytes !== 4
    || unusedFailurePointer.expression !== "BattleScript_ButItFailed"
  ) {
    throw new Error(
      `invalid B_SCR_OP_COPYFOESTATS shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({ [instruction!.opcodeId]: copyFoeStatsHandler });
}
