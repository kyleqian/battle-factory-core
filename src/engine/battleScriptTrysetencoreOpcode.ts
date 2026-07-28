/**
 * `B_SCR_OP_TRYSETENCORE` / `Cmd_trysetencore`
 * (`battle_script_commands.c:8017-8046`).
 */
import {
  drawBattleScriptRng,
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

const MOVE_STRUGGLE = 165;
const MOVE_ENCORE = 227;
const MOVE_MIRROR_MOVE = 119;

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xa4
    || instruction.dispatcher !== "Cmd_trysetencore"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(`invalid B_SCR_OP_TRYSETENCORE shape at program counter ${instruction.programCounter}`);
  }
  return failure.expression;
}

function handler(program: BattleScriptProgram): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const target = requireBattlerRole(rules, "target");
    const battler = rules.battlers[target];
    const lastMove = rules.moveHistory.lastMoves[target]!;
    const slot = battler.moves.findIndex((move) => move === lastMove);
    const eligible = battler.encoredMove === 0
      && slot !== -1
      && battler.pp[slot] !== 0
      && lastMove !== MOVE_STRUGGLE
      && lastMove !== MOVE_ENCORE
      && lastMove !== MOVE_MIRROR_MOVE;
    if (!eligible) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) throw new Error(`Cmd_trysetencore unresolved failure target ${failureExpression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }
    const drawn = drawBattleScriptRng(
      context.state.rng,
      context.instruction,
      "Encore duration ((Random() & 3) + 3)",
    );
    const duration = (drawn.randomValue & 3) + 3;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: withBattler(rules, target, {
          encoredMove: battler.moves[slot]!,
          encoredMovePos: slot,
          encoreTimer: duration,
          encoreTimerStartValue: duration,
        }),
        rng: drawn.rng,
      },
    );
  };
}

export function createBattleScriptTrysetencoreOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_TRYSETENCORE",
  );
  if (instructions.length !== 1) {
    throw new Error(`B_SCR_OP_TRYSETENCORE requires exactly 1 concrete start, got ${instructions.length}`);
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: handler(program) });
}
