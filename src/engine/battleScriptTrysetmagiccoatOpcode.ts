/**
 * `B_SCR_OP_TRYSETMAGICCOAT` / `Cmd_trysetmagiccoat`
 * (`battle_script_commands.c:9540-9550`).
 *
 * This five-byte command always targets the attacker and marks its PP as
 * Pressure-exempt. Acting last takes the encoded failure pointer; otherwise
 * it arms the attacker's existing ProtectStruct bounce bit. Source has no
 * duplicate-arm guard, RNG call, message, or controller operation here.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type {
  BattleScriptRulesBattlers,
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";

const trysetmagiccoatHandler:
BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rules = context.state.rulesContext;
  const attacker = requireBattlerRole(rules, "attacker");
  const attackerState = rules.battlers[attacker];
  const battlers = rules.battlers.map((battler, index) =>
    index === attacker
      ? Object.freeze({
        ...attackerState,
        ppNotAffectedByPressure: 1 as const,
        ...(rules.currentTurnActionNumber === rules.battleTopology.battlersCount - 1
          ? {}
          : { bounceMove: 1 as const }),
      })
      : battler
  ) as unknown as BattleScriptRulesBattlers;
  Object.freeze(battlers);
  const nextRules = Object.freeze({
    ...rules,
    battlers,
    selectorRoles: Object.freeze({
      ...rules.selectorRoles,
      target: attacker,
    }),
  });

  if (rules.currentTurnActionNumber === rules.battleTopology.battlersCount - 1) {
    const [failureOperand] = context.instruction.operands;
    const failure = failureOperand?.widthBytes === 4
      ? resolveBattleScriptLabel(context.program, failureOperand.expression)
      : undefined;
    if (!failure || context.instruction.operands.length !== 1) {
      throw new Error(
        `Cmd_trysetmagiccoat has an invalid failure pointer at ${context.state.programCounter}`,
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      { rulesContext: nextRules },
    );
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRules },
  );
};

export function createBattleScriptTrysetmagiccoatOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSETMAGICCOAT",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_TRYSETMAGICCOAT requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xdf
    || instruction!.dispatcher !== "Cmd_trysetmagiccoat"
    || instruction!.operands.length !== 1
    || instruction!.operands[0]!.widthBytes !== 4
  ) {
    throw new Error(
      `invalid B_SCR_OP_TRYSETMAGICCOAT shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({ [instruction!.opcodeId]: trysetmagiccoatHandler });
}
