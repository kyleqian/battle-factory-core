/**
 * `B_SCR_OP_SETDEFENSECURLBIT` / `Cmd_setdefensecurlbit`
 * (`battle_script_commands.c:8848-8852`).
 *
 * This one-byte, operand-free instruction unconditionally ORs
 * `STATUS2_DEFENSE_CURL` into the attacking battler's own status2, then
 * advances. The effect script deliberately executes it before attempting
 * the separate +1 Defense change, so a maxed/failed stat change does not
 * roll this bit back.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";

const setDefenseCurlBitHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const sourceAttacker = rulesContext.battlers[attacker];
  const battlers = Object.freeze(
    rulesContext.battlers.map((battler, index) =>
      index === attacker
        ? Object.freeze({
            ...sourceAttacker,
            status2: (
              sourceAttacker.status2
              | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL
            ) >>> 0,
          })
        : battler
    ),
  ) as BattleScriptRulesContext["battlers"];

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...rulesContext,
        battlers,
      }),
    },
  );
};

export function createBattleScriptSetDefenseCurlBitOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_SETDEFENSECURLBIT",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_SETDEFENSECURLBIT requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xbf
    || instruction!.dispatcher !== "Cmd_setdefensecurlbit"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETDEFENSECURLBIT shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: setDefenseCurlBitHandler,
  });
}
