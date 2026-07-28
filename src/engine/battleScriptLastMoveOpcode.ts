/**
 * Consumers of the source move-end history cells:
 * - Mimic / Cmd_mimicattackcopy (battle_script_commands.c:7835-7883)
 *
 * Mirror Move and Sketch join this module in their own independently-tested
 * commits because all three consume the packed history owners in
 * BattleScriptRulesContext.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import {
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_TRANSFORMED } from "./battleScriptSourceConstants.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };

type MoveRow = Readonly<{ id: number; move: string; pp: number }>;
const MOVE_BY_NAME = new Map(
  (movesData.moves as readonly MoveRow[]).map(({ move, id }) => [move, id]),
);
const BASE_PP_BY_MOVE = new Map(
  (movesData.moves as readonly MoveRow[]).map(({ id, pp }) => [id, pp]),
);
const MOVE_NONE = 0;
const MOVE_STRUGGLE = 165;
const MOVE_UNAVAILABLE = 0xffff;

function requireMove(name: string): number {
  const move = MOVE_BY_NAME.get(name);
  if (move === undefined) throw new Error(`missing generated ${name}`);
  return move;
}

const MIMIC_FORBIDDEN = new Set([
  requireMove("MOVE_METRONOME"),
  MOVE_STRUGGLE,
  requireMove("MOVE_SKETCH"),
  requireMove("MOVE_MIMIC"),
]);

function jumpToFailure(
  context: Parameters<BattleScriptOpcodeHandler<BattleScriptRulesContext>>[0],
) {
  const [operand] = context.instruction.operands;
  const target = operand ? resolveBattleScriptLabel(context.program, operand.expression) : undefined;
  if (!target) throw new Error(`unresolved last-move failure target ${operand?.expression}`);
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "jump", programCounter: target.programCounter }),
  );
}

function createMimicHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    const copiedMove = rules.moveHistory.lastMoves[target]!;
    const attackerState = rules.battlers[attacker];
    const invalid = MIMIC_FORBIDDEN.has(copiedMove)
      || copiedMove === MOVE_NONE
      || copiedMove === MOVE_UNAVAILABLE
      || (attackerState.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) !== 0
      || attackerState.moves.includes(copiedMove);
    const chosenRules = Object.freeze({
      ...rules,
      chosenMove: MOVE_UNAVAILABLE,
    });
    if (invalid) {
      return jumpToFailure(Object.freeze({
        ...context,
        state: Object.freeze({ ...context.state, rulesContext: chosenRules }),
      }));
    }

    const slot = rules.currentMovePosition;
    const moves = attackerState.moves.map((move, index) =>
      index === slot ? copiedMove : move
    ) as unknown as BattleScriptRulesContext["battlers"][number]["moves"];
    const pp = attackerState.pp.map((value, index) =>
      index === slot ? Math.min(BASE_PP_BY_MOVE.get(copiedMove) ?? 0, 5) : value
    ) as unknown as BattleScriptRulesContext["battlers"][number]["pp"];
    const next = withBattler(chosenRules, attacker, {
      moves: Object.freeze(moves),
      pp: Object.freeze(pp),
      mimickedMoves: (attackerState.mimickedMoves | (1 << slot)) & 0xf,
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...next,
          battleTextBuff1Move: copiedMove,
        }),
      },
    );
  };
}

export function createBattleScriptLastMoveOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const mimic = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_MIMICATTACKCOPY",
  );
  if (
    mimic.length !== 1
    || mimic[0]!.opcodeId !== 0x9d
    || mimic[0]!.dispatcher !== "Cmd_mimicattackcopy"
    || mimic[0]!.operands.length !== 1
    || mimic[0]!.operands[0]?.widthBytes !== 4
  ) {
    throw new Error(`invalid B_SCR_OP_MIMICATTACKCOPY committed shape (${mimic.length})`);
  }
  return Object.freeze({
    [mimic[0]!.opcodeId]: createMimicHandler(),
  });
}
