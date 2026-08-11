/**
 * `B_SCR_OP_TRYSETGRUDGE` / `Cmd_trysetgrudge`
 * (`battle_script_commands.c:9454-9466`).
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
import { BATTLE_SCRIPT_STATUS3_GRUDGE } from "./battleScriptSourceConstants.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xdc
    || instruction.dispatcher !== "Cmd_trysetgrudge"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      `invalid B_SCR_OP_TRYSETGRUDGE shape at program counter ${instruction.programCounter}`,
    );
  }
  return failure.expression;
}

function handler(program: BattleScriptProgram): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const battler = rules.battlers[attacker];
    if ((battler.status3 & BATTLE_SCRIPT_STATUS3_GRUDGE) !== 0) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) throw new Error(`Cmd_trysetgrudge unresolved failure target ${failureExpression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: withBattler(rules, attacker, {
          status3: (battler.status3 | BATTLE_SCRIPT_STATUS3_GRUDGE) >>> 0,
        }),
      },
    );
  };
}

export function createBattleScriptTrysetgrudgeOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_TRYSETGRUDGE",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_TRYSETGRUDGE requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: handler(program) });
}
