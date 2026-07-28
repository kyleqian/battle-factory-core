/**
 * Charge and the two field-sport setters.
 *
 * This module starts with Charge's source-complete setter; Mud/Water Sport's
 * shared opcode is registered beside it because all three effects share the
 * same status3/damage-lifetime ownership.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:166. */
export const BATTLE_SCRIPT_STATUS3_CHARGED_UP = 1 << 9;

export function createBattleScriptChargeSportOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const charge = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETCHARGE",
  );
  if (
    charge.length !== 1
    || charge[0]!.opcodeId !== 0xcb
    || charge[0]!.dispatcher !== "Cmd_setcharge"
    || charge[0]!.operands.length !== 0
  ) {
    throw new Error(`invalid B_SCR_OP_SETCHARGE committed shape (${charge.length})`);
  }

  return Object.freeze({
    [charge[0]!.opcodeId]: (context) => {
      const rules = context.state.rulesContext;
      const attacker = requireBattlerRole(rules, "attacker");
      const battler = rules.battlers[attacker];
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: withBattler(rules, attacker, {
            status3: (battler.status3 | BATTLE_SCRIPT_STATUS3_CHARGED_UP) >>> 0,
            chargeTimer: 2,
            chargeTimerStartValue: 2,
          }),
        },
      );
    },
  });
}
