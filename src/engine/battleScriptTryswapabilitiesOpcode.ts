/**
 * `B_SCR_OP_TRYSWAPABILITIES` / `Cmd_tryswapabilities`
 * (`battle_script_commands.c:9392-9410`).
 *
 * Skill Swap exchanges only the two active `gBattleMons[].ability` bytes.
 * The party records, RNG, messages, entry hooks, and every other battle field
 * remain owned by their existing source commands.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";

export const BATTLE_SCRIPT_ABILITY_NONE = 0;
export const BATTLE_SCRIPT_ABILITY_WONDER_GUARD = 25;

function requireInstruction(
  instruction: BattleScriptInstruction,
): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xda
    || instruction.dispatcher !== "Cmd_tryswapabilities"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      "invalid B_SCR_OP_TRYSWAPABILITIES shape at program counter "
        + instruction.programCounter,
    );
  }
  return failure.expression;
}

function createTryswapabilitiesHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    const attackerAbility = rules.battlers[attacker].ability;
    const targetAbility = rules.battlers[target].ability;
    const fails = (
      (
        attackerAbility === BATTLE_SCRIPT_ABILITY_NONE
        && targetAbility === BATTLE_SCRIPT_ABILITY_NONE
      )
      || attackerAbility === BATTLE_SCRIPT_ABILITY_WONDER_GUARD
      || targetAbility === BATTLE_SCRIPT_ABILITY_WONDER_GUARD
      || (
        rules.moveResultFlags
        & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT
      ) !== 0
    );
    if (fails) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) {
        throw new Error(
          `Cmd_tryswapabilities: unresolved failure target ${failureExpression}`,
        );
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: failure.programCounter,
        }),
      );
    }

    const battlers = rules.battlers.map((battler, index) => {
      if (index === attacker) {
        return Object.freeze({ ...battler, ability: targetAbility });
      }
      if (index === target) {
        return Object.freeze({ ...battler, ability: attackerAbility });
      }
      return battler;
    }) as unknown as BattleScriptRulesBattlers;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          battlers: Object.freeze(battlers),
        }),
      },
    );
  };
}

export function createBattleScriptTryswapabilitiesOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_TRYSWAPABILITIES",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_TRYSWAPABILITIES requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({
    [instructions[0]!.opcodeId]: createTryswapabilitiesHandler(program),
  });
}
