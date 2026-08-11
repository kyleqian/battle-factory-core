/** Lock On / Mind Reader's operand-free packed-counter and owner setter. */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS3_ALWAYS_HITS } from "./battleScriptSourceConstants.ts";

export const BATTLE_SCRIPT_STATUS3_ALWAYS_HITS_TURN_2 = 2 << 3;

export function createBattleScriptSetalwayshitflagOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETALWAYSHITFLAG",
  );
  if (
    instructions.length !== 1
    || instructions[0]!.opcodeId !== 0xa7
    || instructions[0]!.dispatcher !== "Cmd_setalwayshitflag"
    || instructions[0]!.operands.length !== 0
  ) {
    throw new Error(`invalid B_SCR_OP_SETALWAYSHITFLAG committed shape (${instructions.length})`);
  }
  return Object.freeze({
    [instructions[0]!.opcodeId]: (context) => {
      const rules = context.state.rulesContext;
      const attacker = requireBattlerRole(rules, "attacker");
      const target = requireBattlerRole(rules, "target");
      const targetState = rules.battlers[target];
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: withBattler(rules, target, {
            status3: (
              (targetState.status3 & ~BATTLE_SCRIPT_STATUS3_ALWAYS_HITS)
              | BATTLE_SCRIPT_STATUS3_ALWAYS_HITS_TURN_2
            ) >>> 0,
            battlerWithSureHit: attacker,
          }),
        },
      );
    },
  });
}
