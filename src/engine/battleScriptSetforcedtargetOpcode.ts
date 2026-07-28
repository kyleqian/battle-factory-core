/**
 * `B_SCR_OP_SETFORCEDTARGET` / `Cmd_setforcedtarget`
 * (`battle_script_commands.c:9776-9782`).
 *
 * Follow Me's operandless command unconditionally replaces the acting
 * battler's side-local redirect timer/target. Target selection consumes the
 * fields elsewhere; this command owns no targeting, HP, failure, message,
 * RNG, stat, or multi-turn-lock behavior.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type {
  BattleScriptRulesContext,
  BattleScriptSideTimerState,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";

const setforcedtargetHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const side = rules.battlers[attacker].side;
  const sideTimers = [...rules.sideTimers] as [
    BattleScriptSideTimerState,
    BattleScriptSideTimerState,
  ];
  sideTimers[side] = Object.freeze({
    ...sideTimers[side],
    followmeTimer: 1,
    followmeTarget: attacker,
  });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...rules,
        sideTimers: Object.freeze(sideTimers) as readonly [
          BattleScriptSideTimerState,
          BattleScriptSideTimerState,
        ],
      }),
    },
  );
};

export function createBattleScriptSetforcedtargetOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETFORCEDTARGET",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_SETFORCEDTARGET requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xca
    || instruction!.dispatcher !== "Cmd_setforcedtarget"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETFORCEDTARGET shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: setforcedtargetHandler,
  });
}
