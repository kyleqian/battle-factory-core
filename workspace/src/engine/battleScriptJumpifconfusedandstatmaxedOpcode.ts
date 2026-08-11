/**
 * `B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED` / `Cmd_jumpifconfusedandstatmaxed`
 * (battle_script_commands.c:8571-8578):
 *
 * ```c
 * if (gBattleMons[gBattlerTarget].status2 & STATUS2_CONFUSION
 *     && gBattleMons[gBattlerTarget].statStages[gBattlescriptCurrInstr[1]] == MAX_STAT_STAGE)
 *     gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2);
 * else
 *     gBattlescriptCurrInstr += 6;
 * ```
 *
 * Always reads `gBattlerTarget` directly (the `stat` operand is the only
 * decoded field -- there is no battler selector byte in the macro at all,
 * `asm/macros/battle_script.inc:941-945`), so this opcode's own `BS_TARGET`
 * role is exactly `selectorRoles.target`, not a resolved selector operand.
 * Zero barriers: both conjuncts are plain reads of already-modeled state
 * (`status2` bit 0-2, `statStages[stat]`), and the `stat` byte is never a
 * source switch/case -- it is a raw array index, so (per
 * `battleScriptJumpifstatOpcode.ts`'s identical precedent) this is decoded
 * against the two concrete call sites' own named `STAT_*` operands rather
 * than accepted as an arbitrary index.
 */
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";
import { STAT_ATK, STAT_SPATK } from "./battleScriptStatBuffs.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/pokemon.h:91 -- Swagger's STAT_ATK and Flatter's STAT_SPATK, the only two concrete call sites. */
const JUMPIFCONFUSEDANDSTATMAXED_STATS: ReadonlyMap<string, number> = new Map([
  ["STAT_ATK", STAT_ATK],
  ["STAT_SPATK", STAT_SPATK],
]);

/** include/constants/pokemon.h:91. */
const MAX_STAT_STAGE = 12;

function createJumpifconfusedandstatmaxedOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [statOperand, ptrOperand] = context.instruction.operands;
    const statId = JUMPIFCONFUSEDANDSTATMAXED_STATS.get(statOperand!.expression);
    if (statId === undefined) {
      throw new Error(
        `validated B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED became undecodable at ${context.state.programCounter}`,
      );
    }

    const rulesContext = context.state.rulesContext;
    const target = rulesContext.selectorRoles.target;
    if (target === null) throw new Error("Cmd_jumpifconfusedandstatmaxed requires a target role");

    const targetState = rulesContext.battlers[target];
    const isConfused = (targetState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION) !== 0;
    const isStatMaxed = targetState.statStages[statId] === MAX_STAT_STAGE;
    if (!(isConfused && isStatMaxed)) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const jumpTarget = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!jumpTarget) {
      throw new Error(
        `Cmd_jumpifconfusedandstatmaxed: unresolved jump target ${ptrOperand!.expression}`,
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: jumpTarget.programCounter }),
    );
  };
}

export function createBattleScriptJumpifconfusedandstatmaxedOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED",
  );
  if (starts.length !== 2) {
    throw new Error(`B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED requires both concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    const [statOperand, ptrOperand] = instruction.operands;
    if (
      instruction.operands.length !== 2
      || statOperand?.widthBytes !== 1
      || ptrOperand?.widthBytes !== 4
    ) {
      throw new Error(`invalid B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED shape at program counter ${instruction.programCounter}`);
    }
    if (!JUMPIFCONFUSEDANDSTATMAXED_STATS.has(statOperand.expression)) {
      throw new Error(`unknown B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED stat ${statOperand.expression}`);
    }
    if (!resolveBattleScriptLabel(program, ptrOperand.expression)) {
      throw new Error(`unresolved B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED jump target ${ptrOperand.expression}`);
    }
  }

  return Object.freeze({
    [starts[0]!.opcodeId]: createJumpifconfusedandstatmaxedOpcodeHandler(),
  });
}
