import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  checkBattleScriptMoveLimitations,
  describeIllegalMoveSelection,
} from "../src/engine/battleScriptActionAdmission.ts";
import { BATTLE_SCRIPT_MOVE_STRUGGLE } from "../src/engine/battleScriptSourceConstants.ts";

/**
 * ISSUES #123 triage pin. The soak's fight fallback logged 456 selections of
 * one slot holding DOUBLE TEAM in a single battle, which reads like a missing
 * PP rule. It is not: the first 15 of those selections are the move's real
 * `gBattleMoves[MOVE_DOUBLE_TEAM].pp` (`src/data/battle_moves.h:1355-1366`)
 * and every later one is forced Struggle, published on the same slot index
 * because source itself reuses `gBattleStruct->chosenMovePositions` for the
 * Struggle action (`src/battle_util.c:97-106`).
 *
 * This file pins the three engine rules that make that true, so a regression
 * in any of them turns back into the endless-battle report:
 *   1. `Cmd_ppreduce` spends exactly one PP per use
 *      (`src/battle_script_commands.c:1204-1247`).
 *   2. `CheckMoveLimitations`' MOVE_LIMITATION_PP bit removes a 0-PP slot
 *      from the published legal surface, and
 *      `TrySetCantSelectMoveBattleScript` names it STRINGID_NOPPLEFT
 *      (`src/battle_util.c:1066-1073` / `:1111-1114`).
 *   3. With all four slots masked, `AreAllMovesUnusable`
 *      (`src/battle_util.c:1125-1140`) drives `HandleAction_UseMove`'s
 *      `noValidMoves` branch, which replaces the chosen move with
 *      MOVE_STRUGGLE and sets HITMARKER_NO_PPDEDUCT (`src/battle_util.c:99-106`).
 */

const DOUBLE_TEAM = 104;
const SPLASH = 150;
/** gBattleMoves[MOVE_DOUBLE_TEAM].pp (src/data/battle_moves.h:1361). */
const DOUBLE_TEAM_PP = 15;

const PLAYER_DOUBLE_TEAM = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 0 as const,
});
const PLAYER_SPLASH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 1 as const,
  targetBattler: 0 as const,
});
/**
 * The forced-Struggle action source publishes: the *slot* is the banked
 * `chosenMovePositions` entry (still DOUBLE TEAM's slot 0), but the target is
 * re-derived from MOVE_STRUGGLE's own MOVE_TARGET_SELECTED
 * (`GetMoveTarget(MOVE_STRUGGLE, NO_TARGET_OVERRIDE)`, `src/battle_util.c:104`),
 * not from the exhausted move's MOVE_TARGET_USER.
 */
const PLAYER_FORCED_STRUGGLE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const TRAINER_SPLASH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});

function config(
  playerMoves: readonly [number, number, number, number],
  playerPp: readonly [number, number, number, number],
): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 3,
    player: {
      species: 169,
      moveId: playerMoves[0],
      moves: [...playerMoves] as unknown as readonly number[],
      pp: [...playerPp] as unknown as readonly number[],
      attack: 60,
      defense: 500,
      spAttack: 60,
      spDefense: 500,
      speed: 100,
      hp: 1000,
    },
    trainer: {
      species: 242,
      moveId: SPLASH,
      moves: [SPLASH, 0, 0, 0],
      pp: [40, 0, 0, 0],
      attack: 10,
      defense: 500,
      spAttack: 10,
      spDefense: 500,
      speed: 50,
      hp: 1000,
    },
  } as FactoryFullTurnConfig;
}

type FullTurnState = ReturnType<typeof createFactoryFullTurnBattleState>;

/** One whole player+trainer turn: the player's decision, then the trainer's Splash. */
function playTurn(
  state: FullTurnState,
  requestId: number,
  decision: { kind: "use-move"; moveSlot: 0 | 1 | 2 | 3; targetBattler: 0 | 1 },
): { state: FullTurnState; legalPlayerDecisions: readonly unknown[] } {
  const afterPlayer = submitFactoryFullTurnDecision(state, {
    requestId,
    side: "player",
    decision,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected a trainer command request after the player's move");
  }
  const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: requestId + 1,
    side: "trainer",
    decision: TRAINER_SPLASH,
  });
  if (afterTrainer.kind !== "decision-required") {
    throw new Error("expected a fresh player command request after the turn");
  }
  if (afterTrainer.nextRequest.kind !== "command") {
    throw new Error("expected a command request");
  }
  return {
    state: afterTrainer.state,
    legalPlayerDecisions: afterTrainer.nextRequest.legalDecisions,
  };
}

describe("Factory full-turn 0-PP admission and forced Struggle (ISSUES #123)", () => {
  it("spends one PP per DOUBLE TEAM use and drops the slot from the legal surface at 0 PP", () => {
    let state = createFactoryFullTurnBattleState(
      config([DOUBLE_TEAM, SPLASH, 0, 0], [DOUBLE_TEAM_PP, 40, 0, 0]),
    );
    let requestId = 1;
    let legalPlayerDecisions: readonly unknown[] = [];

    for (let use = 1; use <= DOUBLE_TEAM_PP; use += 1) {
      // The slot is offered right up to (and including) its last PP.
      const before = state.rules.rulesContext.battlers[0].pp[0];
      expect(before).toBe(DOUBLE_TEAM_PP - (use - 1));
      const turn = playTurn(state, requestId, PLAYER_DOUBLE_TEAM);
      state = turn.state;
      legalPlayerDecisions = turn.legalPlayerDecisions;
      requestId += 2;
      // Cmd_ppreduce: exactly one PP per use, no Pressure on the target.
      expect(state.rules.rulesContext.battlers[0].pp[0]).toBe(DOUBLE_TEAM_PP - use);
    }

    // Selection 16 of the same slot is impossible: CheckMoveLimitations' PP
    // bit removes it from the published surface, while the still-stocked
    // Splash slot survives.
    expect(state.rules.rulesContext.battlers[0].pp).toEqual([0, 40, 0, 0]);
    expect(legalPlayerDecisions).toContainEqual(PLAYER_SPLASH);
    expect(legalPlayerDecisions).not.toContainEqual(PLAYER_DOUBLE_TEAM);
    expect(checkBattleScriptMoveLimitations(state.rules.rulesContext, 0) & 0x0f).toBe(0b1101);

    // ...and TrySetCantSelectMoveBattleScript names the cause.
    expect(describeIllegalMoveSelection(state.rules.rulesContext, 0, 0)).toMatchObject({
      cause: "no-pp",
      stringId: "STRINGID_NOPPLEFT",
      battler: 0,
      moveSlot: 0,
      move: DOUBLE_TEAM,
    });

    // The boundary refuses the exhausted slot outright rather than replaying it.
    expect(() =>
      submitFactoryFullTurnDecision(state, {
        requestId,
        side: "player",
        decision: PLAYER_DOUBLE_TEAM,
      })
    ).toThrow();
  });

  it("uses Struggle, not the exhausted slot, once every slot is at 0 PP", () => {
    // One 1-PP move and three empty slots: after the single use, the
    // MOVE_LIMITATION_PP and MOVE_LIMITATION_ZEROMOVE bits together mask all
    // four slots, which is AreAllMovesUnusable's ALL_MOVES_MASK.
    let state = createFactoryFullTurnBattleState(
      config([DOUBLE_TEAM, 0, 0, 0], [1, 0, 0, 0]),
    );
    const first = playTurn(state, 1, PLAYER_DOUBLE_TEAM);
    state = first.state;
    expect(state.rules.rulesContext.battlers[0].pp).toEqual([0, 0, 0, 0]);
    expect(state.rules.rulesContext.moveHistory.lastMoves[0]).toBe(DOUBLE_TEAM);
    expect(checkBattleScriptMoveLimitations(state.rules.rulesContext, 0) & 0x0f).toBe(0x0f);

    // Source keeps publishing exactly one action here -- the Struggle action
    // riding gBattleStruct->chosenMovePositions -- so the surface is a single
    // slot, and that slot index is the last-chosen one, not a fresh move.
    expect(first.legalPlayerDecisions).toEqual([PLAYER_FORCED_STRUGGLE]);

    const struggleTurn = playTurn(state, 3, PLAYER_FORCED_STRUGGLE);
    state = struggleTurn.state;
    // HandleAction_UseMove's noValidMoves branch: the move that actually ran
    // is Struggle, and HITMARKER_NO_PPDEDUCT keeps PP pinned at 0 (it cannot
    // go negative and no slot is refilled).
    expect(state.rules.rulesContext.moveHistory.lastMoves[0]).toBe(BATTLE_SCRIPT_MOVE_STRUGGLE);
    expect(state.rules.rulesContext.battlers[0].pp).toEqual([0, 0, 0, 0]);
    // Struggle is a 50-power physical hit plus recoil on the user, so the
    // stalemate the soak saw is a real exchange, not a no-op loop.
    expect(state.rules.rulesContext.battlers[1].hp).toBeLessThan(1000);
    expect(state.rules.rulesContext.battlers[0].hp).toBeLessThan(1000);
  });
});
