import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

const ROLLOUT = 205;
const DEFENSE_CURL = 111;
const SLEEP_TALK = 214;
const REST = 156;
const DEFENSE_CURL_STATUS = 1 << 30;
const LOCKED_STATUS = DEFENSE_CURL_STATUS
  | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS;
const PLAYER_ROLLOUT = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const PLAYER_DEFENSE_CURL = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 1 as const,
  targetBattler: 0 as const,
});
const TRAINER_SLEEP_TALK = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 0 as const,
});

/**
 * Complete active-mon state derived from the merged Battle Scene OFF
 * mechanicLab evidence's legal Shuckle 1 / Blissey matchup. The Rollout-only
 * tests use the exact state after the evidence's real Defense Curl turn.
 *
 * Seed 325391 is a controlled full-turn seed whose ordinary Emerald LCG draws,
 * including BattleTurnPassed's draw between continuing turns,
 * select a deterministic four-hit route after the newly modeled boundary
 * draws: 35, 78, 158, then a KO from 91 HP. Unlike the oracle capture
 * frames, these assertions are all post-turn boundaries; the awake trainer's
 * harmless failed Sleep Talk consumes no RNG.
 */
function rolloutConfig(rngSeed = 325391): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 213,
      moveId: ROLLOUT,
      moves: [ROLLOUT, DEFENSE_CURL, SLEEP_TALK, REST],
      pp: [20, 39, 10, 10],
      attack: 30,
      defense: 282,
      spAttack: 33,
      spDefense: 282,
      speed: 22,
      hp: 95,
      status2: DEFENSE_CURL_STATUS,
      statStages: [6, 6, 7, 6, 6, 6, 6, 6],
      types: ["TYPE_BUG", "TYPE_ROCK"],
    },
    trainer: {
      species: 242,
      moveId: SLEEP_TALK,
      moves: [SLEEP_TALK, 0, 0, 0],
      pp: [10, 0, 0, 0],
      attack: 30,
      defense: 30,
      spAttack: 104,
      spDefense: 155,
      speed: 54,
      hp: 362,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    },
  };
}

/** Same evidence matchup before either selected move has executed. */
function defenseCurlRolloutConfig(rngSeed = 325391): FactoryFullTurnConfig {
  const config = rolloutConfig(rngSeed);
  return {
    ...config,
    player: {
      ...config.player,
      pp: [20, 40, 10, 10],
      status2: 0,
      statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    },
  };
}

function submitTrainerSleepTalk(
  state: ReturnType<typeof createFactoryFullTurnBattleState>,
  requestId: number,
) {
  return submitFactoryFullTurnDecision(state, {
    requestId,
    side: "trainer",
    decision: TRAINER_SLEEP_TALK,
  });
}

describe("factory full-turn Defense Curl / Rollout continuation", () => {
  it(
    "selects Defense Curl then Rollout, preserves ownership/PP/stat state, locks "
      + "continuations, and reaches the evidence HP/terminal route",
    () => {
      const initial = createFactoryFullTurnBattleState(defenseCurlRolloutConfig());
      expect(initial.boundary).toEqual({
        kind: "decision-required",
        request: {
          kind: "command",
          requestId: 1,
          side: "player",
          battler: 0,
          legalDecisions: [
            { kind: "use-move", moveSlot: 0, targetBattler: 1 },
            { kind: "use-move", moveSlot: 1, targetBattler: 0 },
            { kind: "use-move", moveSlot: 2, targetBattler: 1 },
            { kind: "use-move", moveSlot: 3, targetBattler: 0 },
          ],
        },
      });

      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1,
        side: "player",
        decision: PLAYER_DEFENSE_CURL,
      });
      if (afterPlayer.kind !== "decision-required") {
        throw new Error("expected the trainer command after Defense Curl selection");
      }

      const afterDefenseCurl = submitTrainerSleepTalk(afterPlayer.state, 2);
      if (afterDefenseCurl.kind !== "decision-required") {
        throw new Error("expected a fresh player command after Defense Curl");
      }
      expect(afterDefenseCurl.nextRequest).toMatchObject({
        requestId: 3,
        side: "player",
        battler: 0,
      });
      const defenseCurlRules = afterDefenseCurl.state.rules.rulesContext;
      expect(defenseCurlRules.battlers[0]!.pp).toEqual([20, 39, 10, 10]);
      expect(defenseCurlRules.battlers[0]!.statStages[2]).toBe(7);
      expect(defenseCurlRules.battlers[0]!.status2).toBe(DEFENSE_CURL_STATUS);
      expect(defenseCurlRules.battlers[1]!.hp).toBe(362);
      expect(afterDefenseCurl.state.rng.calls).toBe(1);

      const afterRolloutSelection = submitFactoryFullTurnDecision(
        afterDefenseCurl.state,
        {
          requestId: 3,
          side: "player",
          decision: PLAYER_ROLLOUT,
        },
      );
      if (afterRolloutSelection.kind !== "decision-required") {
        throw new Error("expected the trainer command after Rollout selection");
      }

      let state = afterRolloutSelection.state;
      const observedHp: number[] = [];
      for (const [hitIndex, requestId] of [4, 5, 6].entries()) {
        const result = submitTrainerSleepTalk(state, requestId);
        if (result.kind !== "decision-required") {
          throw new Error(`expected locked trainer command after request ${requestId}`);
        }
        // The source selection state auto-confirms the locked player's action:
        // only the opposing command is requested on continuation turns.
        expect(result.nextRequest).toEqual({
          kind: "command",
          requestId: requestId + 1,
          side: "trainer",
          battler: 1,
          legalDecisions: [
            { kind: "use-move", moveSlot: 0, targetBattler: 0 },
          ],
        });

        const rules = result.state.rules.rulesContext;
        observedHp.push(rules.battlers[1]!.hp);
        expect(rules.battlers[0]!.pp).toEqual([19, 39, 10, 10]);
        expect(rules.battlers[0]!.status2).toBe(LOCKED_STATUS);
        expect(rules.lockedMoves[0]).toBe(ROLLOUT);
        expect(rules.chosenMovePositions[0]).toBe(0);
        expect(rules.rolloutTimerStartValues[0]).toBe(5);
        expect(rules.battlers[0]!.rolloutTimer).toBe(4 - hitIndex);
        // One Defense Curl boundary precedes Rollout; each continuing hit
        // adds its four hit-chain draws plus one BattleTurnPassed draw.
        expect(result.state.rng.calls).toBe(1 + ((hitIndex + 1) * 5));
        state = result.state;
      }

      expect(observedHp).toEqual([327, 249, 91]);
      const terminal = submitTrainerSleepTalk(state, 7);
      expect(terminal.kind).toBe("terminal");
      if (terminal.kind !== "terminal") throw new Error("expected Rollout KO");
      expect(terminal.outcome).toBe("player-win");
      expect(terminal.state.boundary).toEqual({
        kind: "terminal",
        outcome: "player-win",
      });
      const rules = terminal.state.rules.rulesContext;
      expect(rules.battlers[1]!.hp).toBe(0);
      expect(rules.battlers[0]!.pp).toEqual([19, 39, 10, 10]);
      expect(rules.battlers[0]!.status2).toBe(LOCKED_STATUS);
      expect(rules.battlers[0]!.rolloutTimer).toBe(1);
      expect(rules.rolloutTimerStartValues[0]).toBe(5);
      expect(rules.lockedMoves[0]).toBe(ROLLOUT);
      expect(rules.battleOutcome).toBe(1);
      expect(terminal.state.rng.calls).toBe(20);
    },
  );

  it("a continuation miss cancels the timer and unlocks the next player decision without another PP spend", () => {
    // Seed 8: the first accuracy roll is 34 (hit), then, after the stored
    // turn-random boundary draw, the next Rollout accuracy roll is 99 (miss).
    // Failed Sleep Talk consumes no draws between them.
    const initial = createFactoryFullTurnBattleState(rolloutConfig(8));
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ROLLOUT,
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected the initial trainer command");
    }
    const firstHit = submitTrainerSleepTalk(afterPlayer.state, 2);
    if (firstHit.kind !== "decision-required") {
      throw new Error("expected the locked trainer command");
    }
    expect(firstHit.state.rules.rulesContext.battlers[0]!.rolloutTimer).toBe(4);

    const miss = submitTrainerSleepTalk(firstHit.state, 3);
    if (miss.kind !== "decision-required") {
      throw new Error("expected an unlocked player command after the miss");
    }
    expect(miss.nextRequest).toEqual({
      kind: "command",
      requestId: 4,
      side: "player",
      battler: 0,
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 1 },
        { kind: "use-move", moveSlot: 1, targetBattler: 0 },
        { kind: "use-move", moveSlot: 2, targetBattler: 1 },
        { kind: "use-move", moveSlot: 3, targetBattler: 0 },
      ],
    });

    const rules = miss.state.rules.rulesContext;
    expect(rules.battlers[0]!.pp).toEqual([19, 39, 10, 10]);
    expect(rules.battlers[0]!.status2).toBe(DEFENSE_CURL_STATUS);
    expect(rules.battlers[0]!.rolloutTimer).toBe(0);
    // Source CancelMultiTurnMoves deliberately leaves these diagnostic fields.
    expect(rules.rolloutTimerStartValues[0]).toBe(5);
    expect(rules.lockedMoves[0]).toBe(ROLLOUT);
    expect(miss.state.rng.calls).toBe(7);
  });

  it("auto-confirms a trainer-owned Rollout lock after the player supplies the only open command", () => {
    const config = rolloutConfig();
    const initial = createFactoryFullTurnBattleState({
      ...config,
      player: {
        ...config.trainer,
        moveId: SLEEP_TALK,
        moves: [SLEEP_TALK, 0, 0, 0],
        pp: [10, 0, 0, 0],
        hp: 1_000,
        maxHp: 1_000,
      },
      trainer: {
        ...config.player,
        moveId: ROLLOUT,
        moves: [ROLLOUT, DEFENSE_CURL, SLEEP_TALK, REST],
        pp: [20, 39, 10, 10],
      },
    });
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: {
        kind: "use-move",
        moveSlot: 0,
        targetBattler: 1,
      },
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected the trainer's initial Rollout command");
    }
    const firstHit = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: {
        kind: "use-move",
        moveSlot: 0,
        targetBattler: 0,
      },
    });
    if (firstHit.kind !== "decision-required") {
      throw new Error("expected the only unlocked player command");
    }
    expect(firstHit.nextRequest).toMatchObject({
      requestId: 3,
      side: "player",
      battler: 0,
    });
    expect(firstHit.state.rules.rulesContext.battlers[1]!.rolloutTimer).toBe(4);

    // This one external player submission resolves both actions: the
    // trainer's gLockedMoves entry supplies its command without a redundant
    // trainer decision boundary.
    const secondHit = submitFactoryFullTurnDecision(firstHit.state, {
      requestId: 3,
      side: "player",
      decision: {
        kind: "use-move",
        moveSlot: 0,
        targetBattler: 1,
      },
    });
    if (secondHit.kind !== "decision-required") {
      throw new Error("expected the next unlocked player command");
    }
    expect(secondHit.nextRequest).toMatchObject({
      requestId: 4,
      side: "player",
      battler: 0,
    });
    const rules = secondHit.state.rules.rulesContext;
    expect(rules.battlers[0]!.hp).toBe(887);
    expect(rules.battlers[1]!.pp[0]).toBe(19);
    expect(rules.battlers[1]!.rolloutTimer).toBe(3);
    expect(rules.lockedMoves[1]).toBe(ROLLOUT);
    expect(secondHit.state.rng.calls).toBe(10);
  });

  it("auto-resolves simultaneous locks until both five-hit Rollout sequences release", () => {
    const base = rolloutConfig(0).player;
    const initial = createFactoryFullTurnBattleState({
      requestId: 1,
      rngSeed: 0,
      player: {
        ...base,
        hp: 5_000,
        maxHp: 5_000,
        speed: 22,
      },
      trainer: {
        ...base,
        hp: 5_000,
        maxHp: 5_000,
        speed: 22,
      },
    });
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ROLLOUT,
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected the trainer's initial Rollout command");
    }
    const completed = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: {
        kind: "use-move",
        moveSlot: 0,
        targetBattler: 0,
      },
    });
    if (completed.kind !== "decision-required") {
      throw new Error("expected both completed locks to return to player selection");
    }
    expect(completed.nextRequest).toMatchObject({
      requestId: 3,
      side: "player",
      battler: 0,
    });
    const rules = completed.state.rules.rulesContext;
    expect(rules.battlers[0]!.pp[0]).toBe(19);
    expect(rules.battlers[1]!.pp[0]).toBe(19);
    expect(rules.battlers[0]!.rolloutTimer).toBe(0);
    expect(rules.battlers[1]!.rolloutTimer).toBe(0);
    expect(rules.battlers[0]!.status2).toBe(DEFENSE_CURL_STATUS);
    expect(rules.battlers[1]!.status2).toBe(DEFENSE_CURL_STATUS);
    // Five speed ties plus ten Rollout hit chains plus five continuing-turn
    // BattleTurnPassed draws: 5 + (10 * 4) + 5.
    expect(completed.state.rng.calls).toBe(50);
  });
});
