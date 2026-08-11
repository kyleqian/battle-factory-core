/**
 * `B_SCR_OP_SETFORESIGHT` / `Cmd_setforesight`
 * (`battle_script_commands.c:8502-8506`).
 *
 * This operand-free command unconditionally marks the selected target. The
 * effect script's accuracy, PP, animation, and identification message are
 * owned by the already-shared commands surrounding it. Emerald has no
 * duplicate-failure pointer: repeating Foresight is a successful idempotent
 * OR followed by the same one-byte advance.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_FORESIGHT } from "./battleScriptSourceConstants.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

const setforesightHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rules = context.state.rulesContext;
  const target = requireBattlerRole(rules, "target");
  const targetBattler = rules.battlers[target];
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: withBattler(rules, target, {
        status2: (targetBattler.status2 | BATTLE_SCRIPT_STATUS2_FORESIGHT) >>> 0,
      }),
    },
  );
};

export function createBattleScriptSetforesightOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETFORESIGHT",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_SETFORESIGHT requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xb1
    || instruction!.dispatcher !== "Cmd_setforesight"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETFORESIGHT shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: setforesightHandler,
  });
}
