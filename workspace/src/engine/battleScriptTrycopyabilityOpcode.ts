/**
 * Role Play's `B_SCR_OP_TRYCOPYABILITY` / `Cmd_trycopyability`
 * (`battle_script_commands.c:9277-9290`).
 *
 * Source excludes exactly ABILITY_NONE and ABILITY_WONDER_GUARD. Success
 * writes the active attacker's ability and gLastUsedAbility; party ability
 * slots and all other state remain unchanged.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

export const ROLE_PLAY_ABILITY_NONE = 0;
export const ROLE_PLAY_ABILITY_WONDER_GUARD = 25;

function createTrycopyabilityHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [failureOperand] = context.instruction.operands;
    if (
      context.instruction.opcodeId !== 0xd3
      || context.instruction.dispatcher !== "Cmd_trycopyability"
      || context.instruction.operands.length !== 1
      || failureOperand?.widthBytes !== 4
    ) {
      throw new Error(`invalid B_SCR_OP_TRYCOPYABILITY shape at program counter ${context.state.programCounter}`);
    }
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    const ability = rules.battlers[target].ability;
    if (ability === ROLE_PLAY_ABILITY_NONE || ability === ROLE_PLAY_ABILITY_WONDER_GUARD) {
      const failure = resolveBattleScriptLabel(context.program, failureOperand.expression);
      if (!failure) throw new Error(`Cmd_trycopyability: unresolved failure target ${failureOperand.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...withBattler(rules, attacker, { ability }),
          lastUsedAbility: ability,
        }),
      },
    );
  };
}

export function createBattleScriptTrycopyabilityOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYCOPYABILITY",
  );
  if (instructions.length !== 1) {
    throw new Error(`B_SCR_OP_TRYCOPYABILITY requires exactly 1 concrete start, got ${instructions.length}`);
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xd3
    || instruction!.dispatcher !== "Cmd_trycopyability"
    || instruction!.operands.length !== 1
    || instruction!.operands[0]?.widthBytes !== 4
  ) {
    throw new Error(`invalid B_SCR_OP_TRYCOPYABILITY shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: createTrycopyabilityHandler() });
}
