/**
 * `B_SCR_OP_SETTORMENT` / `Cmd_settorment`
 * (`battle_script_commands.c:9135-9146`).
 *
 * The five-byte command owns only the target's STATUS2_TORMENT bit. PP
 * deduction and accuracy are earlier commands in BattleScript_EffectTorment.
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
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xce
    || instruction.dispatcher !== "Cmd_settorment"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETTORMENT shape at program counter ${instruction.programCounter}`,
    );
  }
  return failure.expression;
}

function createSettormentHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const target = requireBattlerRole(rules, "target");
    if (
      (rules.battlers[target].status2
        & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT) !== 0
    ) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) {
        throw new Error(
          `Cmd_settorment: unresolved failure target ${failureExpression}`,
        );
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: failure.programCounter,
        }),
      );
    }

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: withBattler(rules, target, {
          status2: (
            rules.battlers[target].status2
            | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT
          ) >>> 0,
        }),
      },
    );
  };
}

export function createBattleScriptSettormentOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETTORMENT",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_SETTORMENT requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({
    [instructions[0]!.opcodeId]: createSettormentHandler(program),
  });
}
