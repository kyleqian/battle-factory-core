/**
 * `B_SCR_OP_PAINSPLITDMGCALC` / `Cmd_painsplitdmgcalc`
 * (`battle_script_commands.c:8049-8071`).
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_SUBSTITUTE } from "./battleScriptRulesContext.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

/** include/constants/battle.h:300. */
export const BATTLE_SCRIPT_IGNORE_SHELL_BELL = 0xffff;

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xa5
    || instruction.dispatcher !== "Cmd_painsplitdmgcalc"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      `invalid B_SCR_OP_PAINSPLITDMGCALC shape at program counter ${instruction.programCounter}`,
    );
  }
  return failure.expression;
}

function handler(program: BattleScriptProgram): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    const targetState = rules.battlers[target];
    if ((targetState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) {
        throw new Error(`Cmd_painsplitdmgcalc unresolved failure target ${failureExpression}`);
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }

    const average = Math.trunc(
      (rules.battlers[attacker].hp + targetState.hp) / 2,
    );
    const painSplitHp = targetState.hp - average;
    const nextRules = withBattler(rules, target, {
      specialStatus: Object.freeze({
        ...targetState.specialStatus,
        shellBellDmg: BATTLE_SCRIPT_IGNORE_SHELL_BELL,
      }),
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...nextRules,
          painSplitHp,
          battleMoveDamage: rules.battlers[attacker].hp - average,
        }),
      },
    );
  };
}

export function createBattleScriptPainSplitOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_PAINSPLITDMGCALC",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_PAINSPLITDMGCALC requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: handler(program) });
}
