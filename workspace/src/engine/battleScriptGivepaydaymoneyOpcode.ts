/**
 * `B_SCR_OP_GIVEPAYDAYMONEY` / `Cmd_givepaydaymoney`
 * (`battle_script_commands.c:7450-7466`).
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

const BATTLE_TYPE_LINK = 1 << 1;
const BATTLE_TYPE_RECORDED_LINK = 1 << 25;
const MAX_MONEY = 999_999;

function requireInstruction(instruction: BattleScriptInstruction): void {
  if (
    instruction.opcodeId !== 0x91
    || instruction.dispatcher !== "Cmd_givepaydaymoney"
    || instruction.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_GIVEPAYDAYMONEY shape at program counter ${instruction.programCounter}`,
    );
  }
}

function createHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  const payout = resolveBattleScriptLabel(program, "BattleScript_PrintPayDayMoneyString");
  if (!payout) throw new Error("givepaydaymoney: missing payout message script");
  return (context) => {
    requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    if (
      (rules.battleTopology.battleTypeFlags & (BATTLE_TYPE_LINK | BATTLE_TYPE_RECORDED_LINK)) !== 0
      || rules.paydayMoney === 0
    ) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const bonusMoney = (rules.paydayMoney * rules.moneyMultiplier) >>> 0;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "call", programCounter: payout.programCounter }),
      {
        rulesContext: Object.freeze({
          ...rules,
          playerMoney: Math.min(MAX_MONEY, rules.playerMoney + bonusMoney),
          battleTextBuff1PaydayMoney: bonusMoney,
        }),
      },
    );
  };
}

export function createBattleScriptGivepaydaymoneyOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_GIVEPAYDAYMONEY",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_GIVEPAYDAYMONEY requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: createHandler(program) });
}
