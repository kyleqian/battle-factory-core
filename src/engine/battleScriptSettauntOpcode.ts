/**
 * `B_SCR_OP_SETTAUNT` / `Cmd_settaunt`
 * (`battle_script_commands.c:9156-9169`).
 *
 * The five-byte command owns the target DisableStruct timer only. PP
 * deduction and accuracy are earlier commands in BattleScript_EffectTaunt.
 *
 * Emerald also writes the adjacent four-bit `tauntTimer2 = 2`, but the full
 * pinned source tree has no read or decrement of that field: action
 * admission, CheckMoveLimitations, the attack canceler, AI checks, and
 * ENDTURN_TAUNT all consult only `tauntTimer`. The rules context therefore
 * represents the sole functional timer instead of inventing a second
 * lifetime whose behavior the game never defines.
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
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xd0
    || instruction.dispatcher !== "Cmd_settaunt"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      `invalid B_SCR_OP_SETTAUNT shape at program counter ${instruction.programCounter}`,
    );
  }
  return failure.expression;
}

function createSettauntHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const target = requireBattlerRole(rules, "target");
    if (rules.battlers[target].tauntTimer !== 0) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) {
        throw new Error(
          `Cmd_settaunt: unresolved failure target ${failureExpression}`,
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

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: withBattler(rules, target, { tauntTimer: 2 }),
      },
    );
  };
}

export function createBattleScriptSettauntOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETTAUNT",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_SETTAUNT requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({
    [instructions[0]!.opcodeId]: createSettauntHandler(program),
  });
}
