/**
 * Haze's `B_SCR_OP_NORMALISEBUFFS` / `Cmd_normalisebuffs`
 * (`battle_script_commands.c:7108-7120`).
 *
 * The source loops over every present battler and all NUM_BATTLE_STATS stage
 * slots, assigning DEFAULT_STAT_STAGE (6). It does not touch status1/status2/
 * status3 or any DisableStruct field.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_NUM_BATTLE_STATS,
  type BattleScriptStatStages,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

const DEFAULT_STAT_STAGE = 6;

export function createBattleScriptNormalisebuffsOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_NORMALISEBUFFS",
  );
  if (instructions.length !== 1) {
    throw new Error(`B_SCR_OP_NORMALISEBUFFS requires exactly 1 concrete start, got ${instructions.length}`);
  }
  const [instruction] = instructions;
  if (instruction!.dispatcher !== "Cmd_normalisebuffs" || instruction!.operands.length !== 0) {
    throw new Error(`invalid B_SCR_OP_NORMALISEBUFFS shape at program counter ${instruction!.programCounter}`);
  }

  return Object.freeze({
    [instruction!.opcodeId]: (context) => {
      const neutralStages = Object.freeze(
        new Array<number>(BATTLE_SCRIPT_NUM_BATTLE_STATS).fill(DEFAULT_STAT_STAGE),
      ) as BattleScriptStatStages;
      const battlers = context.state.rulesContext.battlers.map((battler) =>
        Object.freeze({
          ...battler,
          statStages: neutralStages,
        })
      ) as unknown as BattleScriptRulesContext["battlers"];
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...context.state.rulesContext,
            battlers: Object.freeze(battlers),
          }),
        },
      );
    },
  });
}
