import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { GbaButton } from "../src/input.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { BattleSubmittedDecision } from "../src/engine/battleDecisionBoundary.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import {
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  advanceFactoryRoundPresentation,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  advanceFactoryCarry,
  createInitialFactoryCarry,
  generateFactoryChallengeDraft,
  type FactoryCarry,
} from "../src/engine/factoryRoundChaining.ts";
import { getFactoryRentalRank } from "../src/engine/factoryRentalGeneration.ts";
import { TRAINER_FRONTIER_BRAIN } from "../src/engine/factoryAiMaskSelection.ts";
import { getFactoryFrontierBrainStatus } from "../src/engine/frontierBrainStatus.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

// ---------------------------------------------------------------------------
// Orchestrator-level round driver (mirrors factoryRoundBattleOrchestrator.
// test.ts's own carrier helper): drives a real generated round to
// roundComplete/roundLost through the orchestrator's public battle API,
// bypassing the draft/battleRoom UI entirely - the seams this file's
// scenario tests exercise are the terminal decline -> next-draft chain, not
// the already-proven in-round battle mechanics. The player rents the same
// three known-strong sets factoryRoundBattleOrchestrator.test.ts's own
// carrier helper uses (664/678/527), so win/loss outcomes come from a
// deliberately scripted battle plan (or a scripted swap-accept for the loss
// case below), not from the live rental generator's arbitrary slot 0/1/2
// pull - this file is pinning the chaining/carry wiring, not party strength.
// ---------------------------------------------------------------------------

function record(setId: number, fixedIv = 31): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function acknowledgeAndAdvance(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
}

function choosePlayerDecision(
  state: FactoryRoundBattleOrchestratorState,
): BattleSubmittedDecision {
  const boundary = state.battle?.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.side !== "player") {
    throw new Error("expected a player decision");
  }
  if (boundary.request.kind === "forced-switch") {
    return { kind: "switch", partyIndex: boundary.request.legalPartyIndexes[0]! };
  }
  const active = state.battle!.rules.rulesContext.battlers[0]!;
  const preferredSlot = active.partyIndex === 1 && active.isFirstTurn === 2 ? 3 : 0;
  return boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move" && decision.moveSlot === preferredSlot,
  ) ?? boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move",
  )!;
}

/**
 * Drives a fresh `generateInitial` round to completion via the orchestrator's
 * public API only (no tick()/UI). `seed` is the round's starting
 * `rngValue`; `chooseSwap` lets a caller script an AskSwapMon accept (used
 * below to reach a scripted `roundLost`, matching
 * factoryRoundBattleOrchestrator.test.ts's own "lostAfterSwap" recipe).
 */
function driveGeneratedRoundToCompletion(
  carry: FactoryCarry,
  seed: number,
  chooseSwap: (
    state: FactoryRoundBattleOrchestratorState,
  ) => Parameters<typeof chooseFactoryRoundSwap>[1] = () => ({ type: "decline" }),
  // "strong" (the known-reliable 664/678/527 trio) drives a win; "weak"
  // rents whatever the live generator pulls into slots 0/1/2 - unlike the
  // curated trio, arbitrary generated rentals are not tuned to win and are
  // used below to reach a scripted roundLost regardless of carried streak.
  partyStrength: "strong" | "weak" = "strong",
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
  let state = createFactoryRoundBattleOrchestrator({
    id: `factory-round-chaining-carrier-${seed}`,
    rngValue: seed,
    factoryWinStreak: carry.factoryWinStreak,
    playerTrainerId: carry.playerTrainerId,
    battleTowerLevel50WinStreak: 0,
    factorySymbolsCount: carry.factorySymbolsCount,
    facilityState: { rentsCount: carry.rentsCount },
    rentals: partyStrength === "strong"
      ? {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      }
      : { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  });
  for (
    let budget = 0;
    budget < 1_000
      && state.round.rules.phase !== "roundComplete"
      && state.round.rules.phase !== "roundLost";
    budget += 1
  ) {
    if (state.battle !== null) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
      continue;
    }
    if (
      state.round.rules.phase === "presentingBattleStart"
      || state.round.rules.phase === "presentingBattleWin"
      || state.round.rules.phase === "presentingSwapResult"
    ) {
      state = acknowledgeAndAdvance(state);
      continue;
    }
    if (state.round.rules.phase === "awaitingSwapDecision") {
      const commandId = state.round.presentation?.command.commandId;
      if (commandId === undefined) throw new Error("expected swap-offer presentation command");
      state = completeFactoryRoundPresentation(state, { commandId });
      state = chooseFactoryRoundSwap(state, chooseSwap(state));
      continue;
    }
    throw new Error(`unexpected carrier phase ${state.round.rules.phase}`);
  }
  return state;
}

/**
 * tick()s an EngineState already parked at a decided round's terminal
 * (factoryRoundBattleOrchestrator set, factoryTerminal null) forward by
 * holding A every other frame (JOY_NEW is edge-triggered - see keyRepeat.ts)
 * without ever touching UP/DOWN, so the record menu's cursor stays at its
 * default (NO). Stops the instant this file's new terminal-decline ->
 * next-draft transition fires (pendingGeneratedRound becomes non-null).
 */
function driveTerminalToNextDraft(state: EngineState, maxTicks = 3_000): EngineState {
  let s = state;
  const A: ReadonlySet<GbaButton> = new Set(["A"]);
  const NONE: ReadonlySet<GbaButton> = new Set();
  for (let i = 0; i < maxTicks; i += 1) {
    if (s.pendingGeneratedRound !== null) return s;
    s = tick(s, i % 2 === 0 ? A : NONE);
  }
  throw new Error(`terminal did not chain into the next draft within ${maxTicks} ticks`);
}

function stateAtDecidedRound(
  round: FactoryRoundBattleOrchestratorState,
  carry: FactoryCarry,
): EngineState {
  return {
    ...createInitialState(),
    factoryCarry: carry,
    factoryRoundBattleOrchestrator: round,
  };
}

describe("factoryRoundChaining (pure carry + generation)", () => {
  it("advances the streak by a full challenge and carries symbols/BP/rents on a win", () => {
    const carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const next = advanceFactoryCarry(
      carry,
      true,
      { battlePointsAwarded: 5, symbolGranted: false, newSymbolsCount: 0 },
      3,
    );
    expect(next).toEqual({
      factoryWinStreak: 7,
      factorySymbolsCount: 0,
      battlePoints: 5,
      rentsCount: 3,
      playerTrainerId: PLAYER_TRAINER_ID,
    });
  });

  it("resets the streak to zero and zeroes rentsCount on a loss (source InitFactoryChallenge:208-212), but keeps symbols/BP", () => {
    const carry: FactoryCarry = {
      factoryWinStreak: 21,
      factorySymbolsCount: 1,
      battlePoints: 42,
      rentsCount: 9,
      playerTrainerId: PLAYER_TRAINER_ID,
    };
    const next = advanceFactoryCarry(
      carry,
      false,
      { battlePointsAwarded: 0, symbolGranted: false, newSymbolsCount: 1 },
      9,
    );
    expect(next).toEqual({
      factoryWinStreak: 0,
      factorySymbolsCount: 1,
      battlePoints: 42,
      rentsCount: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
    });
  });

  it("generates the challenge draft with the rank derived from the carried rents count", () => {
    const carry: FactoryCarry = {
      factoryWinStreak: 7,
      factorySymbolsCount: 0,
      battlePoints: 3,
      rentsCount: 15,
      playerTrainerId: PLAYER_TRAINER_ID,
    };
    const { generation, draftScreen } = generateFactoryChallengeDraft(carry, 42);
    expect(generation.challengeNum).toBe(1);
    expect(generation.rentalRank).toBe(getFactoryRentalRank(15));
    expect(draftScreen.rentals).toHaveLength(6);
    expect(draftScreen.rentals.map((r) => r.source.setId)).toEqual(
      generation.rentals.map((r) => r.setId),
    );
  });

  it("is deterministic: identical carry + rngValue produce identical generated drafts", () => {
    const carry: FactoryCarry = {
      factoryWinStreak: 14,
      factorySymbolsCount: 1,
      battlePoints: 20,
      rentsCount: 22,
      playerTrainerId: PLAYER_TRAINER_ID,
    };
    const a = generateFactoryChallengeDraft(carry, 999_999);
    const b = generateFactoryChallengeDraft(carry, 999_999);
    expect(a.generation).toEqual(b.generation);
    expect(a.draftScreen).toEqual(b.draftScreen);
  });
});

describe("factory round chaining (tick() scenario)", () => {
  it("(a) a completed round's terminal chains into a generated draft with the correct rank/streak inputs", () => {
    const carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry, 17);
    expect(round1.round.rules.phase).toBe("roundComplete");
    expect(round1.roundOutcome).not.toBeNull();

    const chained = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry));

    expect(chained.pendingGeneratedRound).not.toBeNull();
    expect(chained.factoryTerminal).toBeNull();
    expect(chained.factoryRoundBattleOrchestrator).toBeNull();
    expect(chained.factoryCarry.factoryWinStreak).toBe(7);
    expect(chained.factoryCarry.rentsCount).toBe(round1.facilityState.rentsCount);
    expect(chained.pendingGeneratedRound!.rngValueBefore).toBe(round1.round.rules.rngValue);

    const expected = generateFactoryChallengeDraft(
      chained.factoryCarry,
      chained.pendingGeneratedRound!.rngValueBefore,
    );
    expect(chained.draftScreen).toEqual(expected.draftScreen);
    expect(expected.generation.rentalRank).toBe(getFactoryRentalRank(chained.factoryCarry.rentsCount));
  });

  it("(b) streak/symbols/BP/rents carry across four consecutive completed rounds, reaching the silver Frontier Brain at hop 3", () => {
    // seed 3 is a curated starting rngValue: unlike this file's other cases
    // (seed 17), it happens to string together four real wins in a row with
    // the 664/678/527 scripted-win recipe, including against the silver
    // Frontier Brain's generated party at hop 3 - found by scanning starting
    // seeds for one whose *natural* battle outcomes (not scripted swap
    // decisions) chain that deep. The streak values below (7/14/21/28) are
    // pure carry arithmetic and hold for ANY winning seed; only reaching
    // hop 3/4 at all depends on this specific seed's battle outcomes.
    // Re-scanned from 0 to 3 for ISSUES #128: recording battle-start
    // Intimidate/Trace onto aiObservedAbilityIds[0] removes the AI's
    // `get_ability` draws against two-ability player mons, so every
    // trajectory that rides the shared RNG cursor shifts. Nothing about the
    // carry arithmetic below changed.
    // Re-scanned again 3 -> 6 (2026-08-25) for the four end-turn source fixes
    // (ISSUES #130 isFirstTurn/rechargeTimer decay, #131 ENDTURN_ORDER re-sort
    // + tie draw, #132 case-major field loop, #133 end-turn STATUS2_FLINCHED
    // clear): Fake Out now fails from turn 2 and a shadowed flinch no longer
    // costs a second turn, so seed 3's hop-3 round loses. Scanned 0..60 for a
    // seed whose natural outcomes still chain four wins deep and took the
    // first, 6. The carry arithmetic below is unchanged, as before.
    //
    // ISSUES #140 (GetMoveTarget's MOVE_TARGET_SELECTED draw loop on
    // HandleAction_UseMove's four re-target branches) moved every trajectory
    // again and seed 6's hop-3 round now loses, so the same rule re-applies:
    // 6 -> 0, again the first seed in 0..60 that chains four wins deep. The
    // carry arithmetic below is unchanged. ROM receipt:
    // tools/probe/receipts/issue140-getmovetarget-off.json.
    // aip262 (the live AI view fills usablePartyMons, so Roar / Baton Pass / Explosion / Memento score on the real bench counts) moved every trajectory
    // again and seed 0's hop-4 round now loses: 0 -> 1, again the first seed in 0..60 that chains four wins deep. The carry arithmetic below is unchanged.
    // fix274 (#209 effect byte / #210 chosen position) moved every trajectory again and seed 1's hop-3 round now loses: 1 -> 5,
    // the first seed in 0..60 that chains four wins deep (0, 2, 3, 4 lose). The carry arithmetic below is unchanged.
    const carry0 = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry0, 5);
    expect(round1.round.rules.phase).toBe("roundComplete");
    const chained1 = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry0));
    const carry1 = chained1.factoryCarry;
    const seed2 = chained1.pendingGeneratedRound!.rngValueBefore;
    expect(carry1.factoryWinStreak).toBe(7);
    expect(generateFactoryChallengeDraft(carry1, seed2).generation.challengeNum)
      .toBe(Math.floor(carry1.factoryWinStreak / 7));

    const round2 = driveGeneratedRoundToCompletion(carry1, seed2);
    expect(round2.round.rules.phase).toBe("roundComplete");
    const chained2 = driveTerminalToNextDraft(stateAtDecidedRound(round2, carry1));
    const carry2 = chained2.factoryCarry;
    const seed3 = chained2.pendingGeneratedRound!.rngValueBefore;
    expect(carry2.factoryWinStreak).toBe(14);
    expect(carry2.battlePoints).toBeGreaterThan(carry1.battlePoints);
    expect(carry2.rentsCount).toBe(round2.facilityState.rentsCount);
    expect(carry2.factorySymbolsCount).toBe(round2.roundOutcome!.newSymbolsCount);
    expect(generateFactoryChallengeDraft(carry2, seed3).generation.challengeNum)
      .toBe(Math.floor(carry2.factoryWinStreak / 7));

    // hop 3: entering streak 14 + battleIndex 6 + the source's +1 modifier
    // (getFactoryFrontierBrainStatus) = 21, the silver threshold - this
    // round's seventh battle is a genuine Frontier Brain encounter reached
    // via real carried streak, not a synthetic starting-streak override.
    const round3 = driveGeneratedRoundToCompletion(carry2, seed3);
    expect(round3.round.rules.phase).toBe("roundComplete");
    expect(round3.round.rules.battleIndex).toBe(6);
    expect(round3.round.rules.currentOpponent.id).toBe(`factory-trainer-${TRAINER_FRONTIER_BRAIN}`);
    expect(round3.round.rules.currentOpponent.frontierBrain).toMatchObject({ status: "silver" });
    expect(getFactoryFrontierBrainStatus({
      battleMode: "singles",
      winStreak: carry2.factoryWinStreak + round3.round.rules.battleIndex,
      symbolsCount: carry2.factorySymbolsCount,
    })).toBe("silver");
    const chained3 = driveTerminalToNextDraft(stateAtDecidedRound(round3, carry2));
    const carry3 = chained3.factoryCarry;
    const seed4 = chained3.pendingGeneratedRound!.rngValueBefore;
    expect(carry3.factoryWinStreak).toBe(21);
    expect(carry3.battlePoints).toBeGreaterThan(carry2.battlePoints);
    expect(carry3.rentsCount).toBe(round3.facilityState.rentsCount);
    expect(carry3.factorySymbolsCount).toBe(round3.roundOutcome!.newSymbolsCount);
    expect(generateFactoryChallengeDraft(carry3, seed4).generation.challengeNum)
      .toBe(Math.floor(carry3.factoryWinStreak / 7));

    const round4 = driveGeneratedRoundToCompletion(carry3, seed4);
    expect(round4.round.rules.phase).toBe("roundComplete");
    const chained4 = driveTerminalToNextDraft(stateAtDecidedRound(round4, carry3));
    const carry4 = chained4.factoryCarry;
    expect(carry4.factoryWinStreak).toBe(28);
    expect(carry4.battlePoints).toBeGreaterThan(carry3.battlePoints);
    expect(carry4.rentsCount).toBe(round4.facilityState.rentsCount);
    expect(carry4.factorySymbolsCount).toBe(round4.roundOutcome!.newSymbolsCount);
    expect(generateFactoryChallengeDraft(
      carry4,
      chained4.pendingGeneratedRound!.rngValueBefore,
    ).generation.challengeNum).toBe(Math.floor(carry4.factoryWinStreak / 7));
  });

  it("(c) a loss resets the streak but keeps symbols/BP, and still re-enters a draft", () => {
    const carry0 = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry0, 17);
    const chained1 = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry0));
    const carry1 = chained1.factoryCarry;
    expect(carry1.battlePoints).toBeGreaterThan(0);

    const round2Lost = driveGeneratedRoundToCompletion(
      carry1,
      17,
      undefined,
      "weak",
    );
    expect(round2Lost.round.rules.phase).toBe("roundLost");

    const chained2 = driveTerminalToNextDraft(stateAtDecidedRound(round2Lost, carry1));
    const carry2 = chained2.factoryCarry;

    expect(carry2.factoryWinStreak).toBe(0);
    expect(carry2.rentsCount).toBe(0);
    expect(carry2.battlePoints).toBe(carry1.battlePoints);
    expect(carry2.factorySymbolsCount).toBe(carry1.factorySymbolsCount);
    expect(chained2.pendingGeneratedRound).not.toBeNull();
    expect(chained2.draftScreen.rentals).toHaveLength(6);
    expect(chained2.lobbyFreeRoam).toBeNull();
  });

  it("(d) determinism: replaying the identical decided-round state chains into an identical draft", () => {
    const carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    const round1 = driveGeneratedRoundToCompletion(carry, 17);

    const chainedA = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry));
    const chainedB = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry));

    expect(chainedA.draftScreen).toEqual(chainedB.draftScreen);
    expect(chainedA.factoryCarry).toEqual(chainedB.factoryCarry);
    expect(chainedA.pendingGeneratedRound).toEqual(chainedB.pendingGeneratedRound);
  });
});
