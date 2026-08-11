import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const FURY_CUTTER = 210;
const DOUBLE_TEAM = 104;
const SLEEP_TALK = 214;
const PLAYER_FURY_CUTTER = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const PLAYER_DOUBLE_TEAM = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 1 as const,
  targetBattler: 0 as const,
});
const TRAINER_SLEEP_TALK = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 0 as const,
});

function config(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 2,
    player: {
      species: 278,
      moveId: FURY_CUTTER,
      moves: [FURY_CUTTER, DOUBLE_TEAM, 0, 0],
      pp: [20, 15, 0, 0],
      attack: 50,
      defense: 500,
      spAttack: 50,
      spDefense: 500,
      speed: 100,
      hp: 1000,
      types: ["TYPE_GRASS", "TYPE_GRASS"],
    },
    trainer: {
      species: 242,
      moveId: SLEEP_TALK,
      moves: [SLEEP_TALK, 0, 0, 0],
      pp: [10, 0, 0, 0],
      attack: 50,
      defense: 500,
      spAttack: 50,
      spDefense: 500,
      speed: 50,
      hp: 1000,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    },
  };
}

describe("factory full-turn Fury Cutter shared executable frontier", () => {
  it("requires every choice, spends PP each time, preserves an intervening move, holds the normal sequence at five, and never locks", () => {
    let state = createFactoryFullTurnBattleState(config());
    const choices = [
      PLAYER_FURY_CUTTER,
      PLAYER_FURY_CUTTER,
      PLAYER_DOUBLE_TEAM,
      PLAYER_FURY_CUTTER,
      PLAYER_FURY_CUTTER,
      PLAYER_FURY_CUTTER,
      PLAYER_FURY_CUTTER,
    ] as const;
    const expectedCounters = [1, 2, 2, 3, 4, 5, 5];
    const expectedPp = [
      [19, 15, 0, 0],
      [18, 15, 0, 0],
      [18, 14, 0, 0],
      [17, 14, 0, 0],
      [16, 14, 0, 0],
      [15, 14, 0, 0],
      [14, 14, 0, 0],
    ];

    for (const [turn, choice] of choices.entries()) {
      const playerRequestId = 1 + turn * 2;
      const afterPlayer = submitFactoryFullTurnDecision(state, {
        requestId: playerRequestId,
        side: "player",
        decision: choice,
      });
      if (afterPlayer.kind !== "decision-required") {
        throw new Error(`expected trainer command on turn ${turn + 1}`);
      }
      const afterTurn = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: playerRequestId + 1,
        side: "trainer",
        decision: TRAINER_SLEEP_TALK,
      });
      if (afterTurn.kind !== "decision-required") {
        throw new Error(`expected fresh player command after turn ${turn + 1}`);
      }

      const rules = afterTurn.state.rules.rulesContext;
      expect(rules.battlers[0].furyCutterCounter).toBe(expectedCounters[turn]);
      expect(rules.battlers[0].pp).toEqual(expectedPp[turn]);
      expect(rules.battlers[0].status2).toBe(0);
      expect(rules.battlers[0].rolloutTimer).toBe(0);
      expect(rules.lockedMoves[0]).toBe(0);
      expect(afterTurn.nextRequest).toMatchObject({
        requestId: playerRequestId + 2,
        side: "player",
        battler: 0,
      });
      expect(afterTurn.nextRequest).toHaveProperty("legalDecisions", [
        PLAYER_FURY_CUTTER,
        PLAYER_DOUBLE_TEAM,
      ]);
      state = afterTurn.state;
    }
  });
});
