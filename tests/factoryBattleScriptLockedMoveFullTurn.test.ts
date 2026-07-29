import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type {
  BattleDecisionTransitionResult,
  BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import type { FactoryFullTurnDecisionRules } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

const FLY = 19;
const THRASH = 37;
const HYPER_BEAM = 63;
const BIDE = 117;
const METRONOME = 118;
const SPLASH = 150;
const ASSIST = 274;
const CALLER_SLOT = 2;
type DecisionRequiredResult = Extract<
  BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  Readonly<{ kind: "decision-required" }>
>;

function config(
  move: number,
  rngSeed = 0,
  benchMove = 0,
): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 113,
      moveId: move,
      moves: [0, 0, move, 0],
      pp: [0, 0, 20, 0],
      attack: 80,
      defense: 500,
      spAttack: 80,
      spDefense: 500,
      speed: 50,
      hp: 5_000,
      maxHp: 5_000,
    },
    trainer: {
      species: 129,
      moveId: SPLASH,
      moves: [SPLASH, 0, 0, 0],
      pp: [40, 0, 0, 0],
      attack: 20,
      defense: 500,
      spAttack: 20,
      spDefense: 500,
      speed: 100,
      hp: 5_000,
      maxHp: 5_000,
    },
    ...(benchMove === 0 ? {} : {
      playerBenchHp: [100, 0] as const,
      playerBenchOverride: [{
        species: 161,
        level: 50,
        hp: 100,
        maxHP: 100,
        moves: [benchMove, 0, 0, 0],
        pp: [10, 0, 0, 0],
      }, undefined] as const,
    }),
  };
}

function runFirstTurn(
  source: FactoryFullTurnConfig,
): BattleState<FactoryFullTurnDecisionRules> {
  const initial = createFactoryFullTurnBattleState(source);
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: {
      kind: "use-move",
      moveSlot: CALLER_SLOT,
      targetBattler: source.player.moveId === BIDE ? 0 : 1,
    },
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected trainer command after player selection");
  }
  const firstTurn = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: {
      kind: "use-move",
      moveSlot: 0,
      targetBattler: 1,
    },
  });
  if (firstTurn.kind !== "decision-required") {
    throw new Error("expected a continuation-turn command");
  }
  return firstTurn.state;
}

function runLockedContinuation(
  source: FactoryFullTurnConfig,
): DecisionRequiredResult {
  const firstTurn = runFirstTurn(source);
  expect(firstTurn.boundary).toMatchObject({
    kind: "decision-required",
    request: {
      requestId: 3,
      side: "trainer",
      battler: 1,
    },
  });
  const continuation = submitFactoryFullTurnDecision(firstTurn, {
    requestId: 3,
    side: "trainer",
    decision: {
      kind: "use-move",
      moveSlot: 0,
      targetBattler: 1,
    },
  });
  if (continuation.kind !== "decision-required") {
    throw new Error("expected the battle to continue after the locked action");
  }
  return continuation;
}

function expectFinishedLockedActionAttribution(
  state: BattleState<FactoryFullTurnDecisionRules>,
  executedMove: number,
  expectedPp: number,
): void {
  const rules = state.rules.rulesContext;
  // HandleAction_ActionFinished source-clears gCurrentMove after admission
  // and execution; gChosenMove and both position owners survive that reset.
  expect(rules.currentMove).toBe(0);
  expect(rules.chosenMove).toBe(executedMove);
  expect(rules.currentMovePosition).toBe(CALLER_SLOT);
  expect(rules.chosenMovePositions[0]).toBe(CALLER_SLOT);
  expect(rules.battlers[0]!.pp).toEqual([0, 0, expectedPp, 0]);
  expect(rules.party.player[0]!.pp).toEqual([0, 0, expectedPp, 0]);
}

describe("factory full-turn locked move attribution", () => {
  it("Assist-called Fly resumes from gLockedMoves while Assist's slot remains the sole PP owner", () => {
    const firstTurn = runFirstTurn(config(ASSIST, 0, FLY));
    expect(firstTurn.rules.rulesContext.lockedMoves[0]).toBe(FLY);
    expect(firstTurn.rules.rulesContext.battlers[0]!.moves[CALLER_SLOT]).toBe(ASSIST);
    expect(firstTurn.rules.rulesContext.battlers[0]!.pp[CALLER_SLOT]).toBe(19);

    const continuation = runLockedContinuation(config(ASSIST, 0, FLY));
    expectFinishedLockedActionAttribution(continuation.state, FLY, 19);
    expect(continuation.state.rules.rulesContext.battlers[0]!.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS).toBe(0);
  });

  it("plain Fly follows the same continuation path and still spends PP only on turn one", () => {
    const continuation = runLockedContinuation(config(FLY));
    expectFinishedLockedActionAttribution(continuation.state, FLY, 19);
    expect(continuation.state.rules.rulesContext.battlers[0]!.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS).toBe(0);
  });

  it("Metronome-called Thrash resumes from gLockedMoves while Metronome's slot owns PP", () => {
    // First Metronome candidate from seed 26 is MOVE_THRASH.
    const firstTurn = runFirstTurn(config(METRONOME, 26));
    expect(firstTurn.rules.rulesContext.lockedMoves[0]).toBe(THRASH);
    expect(firstTurn.rules.rulesContext.battlers[0]!.moves[CALLER_SLOT]).toBe(METRONOME);
    expect(firstTurn.rules.rulesContext.battlers[0]!.pp[CALLER_SLOT]).toBe(19);

    const continuation = runLockedContinuation(config(METRONOME, 26));
    expectFinishedLockedActionAttribution(continuation.state, THRASH, 19);
  });

  it("plain Thrash resumes identically without spending a second PP", () => {
    const continuation = runLockedContinuation(config(THRASH));
    expectFinishedLockedActionAttribution(continuation.state, THRASH, 19);
  });

  it("Assist-called Bide resumes from gLockedMoves while Assist's slot owns PP", () => {
    const firstTurn = runFirstTurn(config(ASSIST, 0, BIDE));
    expect(firstTurn.rules.rulesContext.lockedMoves[0]).toBe(BIDE);
    expect(firstTurn.rules.rulesContext.battlers[0]!.moves[CALLER_SLOT]).toBe(ASSIST);
    expect(firstTurn.rules.rulesContext.battlers[0]!.pp[CALLER_SLOT]).toBe(19);

    const continuation = runLockedContinuation(config(ASSIST, 0, BIDE));
    expectFinishedLockedActionAttribution(continuation.state, BIDE, 19);
    expect(continuation.state.rules.rulesContext.battlers[0]!.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS)
      .toBe(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS);
  });

  it("plain Bide resumes identically without spending a second PP", () => {
    const continuation = runLockedContinuation(config(BIDE));
    expectFinishedLockedActionAttribution(continuation.state, BIDE, 19);
    expect(continuation.state.rules.rulesContext.battlers[0]!.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS)
      .toBe(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS);
  });

  it("Metronome-called Hyper Beam restores current/chosen through the recharge canceler", () => {
    // First Metronome candidate from seed 700 is MOVE_HYPER_BEAM.
    const continuation = runLockedContinuation(config(METRONOME, 700));
    expectFinishedLockedActionAttribution(continuation.state, HYPER_BEAM, 19);
    expect(continuation.state.rules.rulesContext.battlers[0]!.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE).toBe(0);
    expect(continuation.events).toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_PKMNMUSTRECHARGE",
      }),
    }));
    expect(continuation.state.rules.rulesContext.moveHistory.lastPrintedMoves[0]).toBe(METRONOME);
    expect(continuation.state.rules.rulesContext.moveHistory.lastMoves[0]).toBe(0xffff);
    expect(continuation.state.rules.rulesContext.moveHistory.lastResultingMoves[0]).toBe(0xffff);
  });

  it("plain Hyper Beam restores current/chosen through the same recharge path", () => {
    const continuation = runLockedContinuation(config(HYPER_BEAM, 0));
    expectFinishedLockedActionAttribution(continuation.state, HYPER_BEAM, 19);
    expect(continuation.state.rules.rulesContext.battlers[0]!.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE).toBe(0);
    expect(continuation.events).toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_PKMNMUSTRECHARGE",
      }),
    }));
  });
});
