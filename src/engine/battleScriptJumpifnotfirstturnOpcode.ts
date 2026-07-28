/**
 * `B_SCR_OP_JUMPIFNOTFIRSTTURN` / `Cmd_jumpifnotfirstturn`
 * (`battle_script_commands.c:6785-6792`) -- Fake Out's own first-turn gate:
 *
 * ```c
 * static void Cmd_jumpifnotfirstturn(void)
 * {
 *     const u8 *failJump = T1_READ_PTR(gBattlescriptCurrInstr + 1);
 *     if (gDisableStructs[gBattlerAttacker].isFirstTurn)
 *         gBattlescriptCurrInstr += 5;
 *     else
 *         gBattlescriptCurrInstr = failJump;
 * }
 * ```
 *
 * `gDisableStructs[].isFirstTurn` is already a durable `BattleScriptRulesContext`
 * field (`battleScriptRulesContext.ts`'s `isFirstTurn`, set to 2 at
 * switch-in/battle-init source-side, defaulting to 0 -- "not first turn" --
 * for legacy fixtures that never exercised this read). Single concrete call
 * site in the committed program (`BattleScript_EffectFakeOut`,
 * `data/battle_scripts_1.s:2050`), a single ptr operand, zero barriers, zero
 * `Random(` calls.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

function createJumpifnotfirstturnHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = requireBattlerRole(rulesContext, "attacker");
    if (rulesContext.battlers[attacker].isFirstTurn !== 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const [failOperand] = context.instruction.operands;
    const target = resolveBattleScriptLabel(context.program, failOperand!.expression);
    if (!target) {
      throw new Error(`Cmd_jumpifnotfirstturn: unresolved jump target ${failOperand!.expression}`);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

export function createBattleScriptJumpifnotfirstturnOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_JUMPIFNOTFIRSTTURN",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_JUMPIFNOTFIRSTTURN");
  }
  if (instruction.operands.length !== 1 || instruction.operands[0]?.widthBytes !== 4) {
    throw new Error(`invalid B_SCR_OP_JUMPIFNOTFIRSTTURN shape at program counter ${instruction.programCounter}`);
  }
  return Object.freeze({ [instruction.opcodeId]: createJumpifnotfirstturnHandler() });
}
