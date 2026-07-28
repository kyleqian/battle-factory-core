/**
 * `B_SCR_OP_INCREMENTGAMESTAT` / `Cmd_incrementgamestat`
 * (`battle_script_commands.c:5689-5695`).
 *
 * This two-byte command reads one raw-u8 stat index, emits a typed save/meta
 * observation only for a player-side attacker, and always advances. It owns
 * no battle mutation, controller command, message, or RNG work. Decoded
 * counter validity/saturation belongs to battleGameStatMeta.ts.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type {
  BattleScriptInstruction,
  BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import {
  BATTLE_GAME_STAT_USED_SPLASH,
  BATTLE_GAME_STAT_USED_STRUGGLE,
} from "./battleGameStatMeta.ts";
import type { BattleScriptGameStat } from "./battleScriptEvents.ts";

const GAME_STAT_BY_SOURCE_EXPRESSION: Readonly<
  Record<string, BattleScriptGameStat>
> = Object.freeze({
  GAME_STAT_USED_SPLASH: BATTLE_GAME_STAT_USED_SPLASH,
  GAME_STAT_USED_STRUGGLE: BATTLE_GAME_STAT_USED_STRUGGLE,
});

function requireInstruction(
  instruction: BattleScriptInstruction,
): BattleScriptGameStat {
  const [operand] = instruction.operands;
  if (
    instruction.opcodeId !== 0x60
    || instruction.dispatcher !== "Cmd_incrementgamestat"
    || instruction.operands.length !== 1
    || operand?.widthBytes !== 1
  ) {
    throw new Error(
      `invalid B_SCR_OP_INCREMENTGAMESTAT shape at program counter ${instruction.programCounter}`,
    );
  }
  const gameStat = GAME_STAT_BY_SOURCE_EXPRESSION[operand.expression];
  if (!gameStat) {
    throw new Error(
      `unresolved B_SCR_OP_INCREMENTGAMESTAT raw-u8 operand ${operand.expression}`,
    );
  }
  return gameStat;
}

const incrementGameStatHandler: BattleScriptOpcodeHandler<
  BattleScriptRulesContext
> = (context) => {
  const gameStat = requireInstruction(context.instruction);
  const attacker = requireBattlerRole(
    context.state.rulesContext,
    "attacker",
  );
  if (context.state.rulesContext.battlers[attacker].side !== 0) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
    );
  }
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      events: Object.freeze([
        Object.freeze({
          kind: "game-stat-increment" as const,
          gameStat,
        }),
      ]),
    },
  );
};

export function createBattleScriptIncrementGameStatOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_INCREMENTGAMESTAT",
  );
  if (instructions.length !== 2) {
    throw new Error(
      `B_SCR_OP_INCREMENTGAMESTAT requires exactly 2 concrete starts, got ${instructions.length}`,
    );
  }
  for (const instruction of instructions) requireInstruction(instruction);
  if (new Set(instructions.map((instruction) => instruction.opcodeId)).size !== 1) {
    throw new Error("B_SCR_OP_INCREMENTGAMESTAT concrete starts disagree on opcode id");
  }
  return Object.freeze({
    [instructions[0]!.opcodeId]: incrementGameStatHandler,
  });
}
