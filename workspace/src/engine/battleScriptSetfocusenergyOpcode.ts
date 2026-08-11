/**
 * `B_SCR_OP_SETFOCUSENERGY` / `Cmd_setfocusenergy`
 * (`battle_script_commands.c:7749-7762`).
 *
 * The command is operand-free and always advances one byte. The ordinary
 * move script guards duplicates before this command; the failure branch here
 * is nevertheless retained exactly as the source's defensive dispatch.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
} from "./battleScriptSourceConstants.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

/** battle_string_ids.h:500-501; indices into gFocusEnergyUsedStringIds. */
export const BATTLE_SCRIPT_B_MSG_GETTING_PUMPED = 0;
export const BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED = 1;

const setfocusenergyHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const attackerState = rules.battlers[attacker];
  const alreadyFocused =
    (attackerState.status2 & BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY) !== 0;
  const nextRules = alreadyFocused
    ? Object.freeze({
      ...rules,
      moveResultFlags:
        (rules.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_FAILED) >>> 0,
      multistringChooser: BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED,
    })
    : Object.freeze({
      ...withBattler(rules, attacker, {
        status2:
          (attackerState.status2 | BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY) >>> 0,
      }),
      multistringChooser: BATTLE_SCRIPT_B_MSG_GETTING_PUMPED,
    });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRules },
  );
};

export function createBattleScriptSetfocusenergyOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETFOCUSENERGY",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_SETFOCUSENERGY requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0x9a
    || instruction!.dispatcher !== "Cmd_setfocusenergy"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETFOCUSENERGY shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({ [instruction!.opcodeId]: setfocusenergyHandler });
}
