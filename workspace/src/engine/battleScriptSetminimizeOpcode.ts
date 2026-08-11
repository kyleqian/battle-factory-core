/**
 * `B_SCR_OP_SETMINIMIZE` / `Cmd_setminimize`
 * (`battle_script_commands.c:9671-9679`).
 *
 * This operandless command owns only Minimize's attacker status3 marker.
 * The following shared stat-up script owns evasion and failure messaging;
 * Stomp's existing script consumes the marker through shared jump/setbyte
 * opcodes.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_HITMARKER_OBEYS,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS3_MINIMIZED } from "./battleScriptSourceConstants.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

const setminimizeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rules = context.state.rulesContext;
  if ((rules.hitMarker & BATTLE_SCRIPT_HITMARKER_OBEYS) === 0) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }
  const attacker = requireBattlerRole(rules, "attacker");
  const battler = rules.battlers[attacker];
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: withBattler(rules, attacker, {
        status3: (battler.status3 | BATTLE_SCRIPT_STATUS3_MINIMIZED) >>> 0,
      }),
    },
  );
};

export function createBattleScriptSetminimizeOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETMINIMIZE",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_SETMINIMIZE requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xc7
    || instruction!.dispatcher !== "Cmd_setminimize"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETMINIMIZE shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: setminimizeHandler,
  });
}
