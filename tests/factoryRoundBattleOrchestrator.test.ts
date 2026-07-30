import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { BattleSubmittedDecision } from "../src/engine/battleDecisionBoundary.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const RNG_SEED = 4;
const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
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

function createStartedGeneratedBattle(
  seed: number,
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const state = createFactoryRoundBattleOrchestrator({
    id: `generated-command-seam-${seed}`,
    rngValue: seed,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords: [...playerRecords, record(1), record(2), record(3)],
    },
  });
  return acknowledgeAndAdvance(state);
}

function advanceCommandToPhase(
  state: FactoryRoundBattleOrchestratorState,
  phase: NonNullable<
    FactoryRoundBattleOrchestratorState["battleCommandPresentation"]
  >["lifecycle"]["phase"],
): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (
    let budget = 0;
    budget < 32 && next.battleCommandPresentation?.lifecycle.phase !== phase;
    budget += 1
  ) {
    next = advanceFactoryRoundBattleCommand(next, new Set());
  }
  expect(next.battleCommandPresentation?.lifecycle.phase).toBe(phase);
  return next;
}

function advanceResolutionToNextCommand(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (
    let budget = 0;
    budget < 2_000 && next.battleResolutionPresentation !== null;
    budget += 1
  ) {
    next = advanceFactoryRoundBattleResolution(next);
  }
  expect(next.battleResolutionPresentation).toBeNull();
  expect(next.battleCommandPresentation).not.toBeNull();
  return next;
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
  const active = state.battle!.rules.rulesContext.battlers[0];
  const preferredSlot = active.partyIndex === 1 && active.isFirstTurn === 2 ? 3 : 0;
  return boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move" && decision.moveSlot === preferredSlot,
  ) ?? boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move",
  )!;
}

function driveGeneratedRoundToCompletion(
  seed: number,
  onDecisionSubmitted?: (state: FactoryRoundBattleOrchestratorState) => void,
  chooseSwap: (
    state: FactoryRoundBattleOrchestratorState,
  ) => Parameters<typeof chooseFactoryRoundSwap>[1] = () => ({ type: "decline" }),
  rentsCount = 0,
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
  let state = createFactoryRoundBattleOrchestrator({
    id: `generated-round-carrier-seed-${seed}`,
    rngValue: seed,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords,
    },
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
      onDecisionSubmitted?.(state);
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

describe("generated Factory round battle orchestrator (Gate-5 rung 11)", () => {
  it("cancels POKéMON back to the same action request and cursor", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    state = advanceCommandToPhase(state, "action-menu");
    const requestId = state.battleCommandPresentation!.request.requestId;
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    expect(state.battleCommandPresentation?.actionCursor).toBe(2);
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    expect(state.battleCommandPresentation?.lifecycle.phase).toBe("party-handoff");
    expect(state.battlePartySelect).not.toBeNull();
    state = advanceFactoryRoundBattleCommand(state, new Set(["B"]));
    expect(state.battlePartySelect).toBeNull();
    expect(state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(state.battleCommandPresentation?.actionCursor).toBe(2);
    expect(state.battleCommandPresentation?.request.requestId).toBe(requestId);
  });

  it("returns the exact legal voluntary row to the ordinary switch submission", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
    expect(state.battlePartySelect?.cursor).toBe(2);
    expect(state.battlePartySelect?.rows[2].legal).toBe(true);
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
    expect(state.battle?.rules.rulesContext.battlers[0].partyIndex).toBe(2);
    expect(state.battlePartySelect).toBeNull();
  });

  it("routes a live request through FIGHT slot 3 and seeds the next request from the controller-owned cursor", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    const firstBoundary = state.battle?.boundary;
    if (
      firstBoundary?.kind !== "decision-required"
      || firstBoundary.request.kind !== "command"
    ) {
      throw new Error("expected a live player command boundary");
    }
    expect(state.battleCommandPresentation?.request).toEqual(firstBoundary.request);
    expect(state.battleCommandPresentation?.field.player.moveIds)
      .toEqual(state.battle?.rules.rulesContext.battlers[0].moves);

    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"] as const));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["RIGHT"] as const));
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"] as const));
    expect(state.battleCommandPresentation?.fightCursor).toBe(3);

    state = advanceFactoryRoundBattleCommand(state, new Set(["A"] as const));
    const resolution = state.battleResolutionPresentation;
    expect(state.battleCommandPresentation).toBeNull();
    expect(resolution?.resolutionId.requestId).toBe(firstBoundary.request.requestId);
    expect(resolution?.sourceDecision).toEqual({
      kind: "use-move",
      moveSlot: 3,
      targetBattler: 1,
    });
    expect(resolution?.pendingBoundary).toBe(resolution?.pendingBattle.boundary);
    const eventSequences = resolution?.segments[0]?.events.map(({ sequence }) => sequence) ?? [];
    expect(eventSequences).toEqual(eventSequences.map(
      (_, index) => eventSequences[0]! + index,
    ));
    expect(resolution?.segments[0]?.events.filter(
      ({ payload }) =>
        payload.kind === "message" && payload.messageId === "STRINGID_USEDMOVE",
    )).toHaveLength(2);
    expect(state.moveSelectionCursors[0]).toBe(3);
    expect(state.battlePresentationBoundaries?.[0].moveCursor).toBe(3);
    expect(state.battlePresentationBoundaries?.[0].displayedHp)
      .toBe(resolution?.field.player.hp);
    expect(state.battlePresentationBoundaries?.[1].displayedHp)
      .toBe(resolution?.field.opponent.hp);
    expect(state.battlePresentationBoundaries?.map(({ field }) => field.currentPP))
      .toEqual(state.battle?.rules.rulesContext.battlers.slice(0, 2).map(
        ({ pp }) => pp,
      ));
    const engine = {
      ...createInitialState(),
      factoryRoundBattleOrchestrator: state,
    };
    expect(render(engine)).toHaveLength(240 * 160 * 4);
    expect(
      tick(engine, new Set()).factoryRoundBattleOrchestrator
        ?.battleResolutionPresentation?.lifecycle.phaseElapsed,
    ).toBe(1);

    const retainedBoundary = state.battlePresentationBoundaries;
    state = advanceResolutionToNextCommand(state);
    expect(state.battleCommandPresentation?.request)
      .toEqual(resolution?.pendingBattle.boundary.kind === "decision-required"
        ? resolution.pendingBattle.boundary.request
        : undefined);
    expect(state.battleCommandPresentation?.request.requestId)
      .not.toBe(firstBoundary.request.requestId);
    expect(state.battleCommandPresentation?.lifecycle).toEqual({
      phase: "action-menu",
      phaseElapsed: 0,
    });
    expect(state.battleCommandPresentation?.fightCursor).toBe(3);
    expect(state.battleCommandPresentation?.fightDisplayCursor).toBe(3);
    expect(state.battlePresentationBoundaries?.[0].idleEpoch)
      .toBe(retainedBoundary?.[0].idleEpoch);
    expect(state.battlePresentationBoundaries?.map((boundary) => ({
      partyIndex: boundary.partyIndex,
      displayedHp: boundary.displayedHp,
    }))).toEqual(state.battle?.rules.rulesContext.battlers.slice(0, 2).map(
      (battler) => ({
        partyIndex: battler.partyIndex,
        displayedHp: battler.hp,
      }),
    ));
  });

  it("resets the persistent cursor when a live player switch-in changes the active party slot", () => {
    let state = createStartedGeneratedBattle(RNG_SEED);
    state = advanceCommandToPhase(state, "action-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"] as const));
    state = advanceCommandToPhase(state, "fight-menu");
    state = advanceFactoryRoundBattleCommand(state, new Set(["RIGHT"] as const));
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"] as const));
    state = advanceFactoryRoundBattleCommand(state, new Set(["A"] as const));
    state = advanceResolutionToNextCommand(state);
    expect(state.battleCommandPresentation?.fightCursor).toBe(3);

    const beforePartyIndex = state.battle?.rules.rulesContext.battlers[0].partyIndex;
    const switchDecision = state.battleCommandPresentation?.request.legalDecisions.find(
      (decision) => decision.kind === "switch",
    );
    if (switchDecision?.kind !== "switch") throw new Error("expected a legal switch");
    const trainerBoundaryBeforeSwitch = state.battlePresentationBoundaries?.[1];
    state = submitFactoryRoundPlayerDecision(state, switchDecision);

    expect(state.battle?.rules.rulesContext.battlers[0].partyIndex).not.toBe(beforePartyIndex);
    expect(state.moveSelectionCursors[0]).toBe(0);
    expect(state.battleCommandPresentation?.fightCursor).toBe(0);
    expect(state.battleCommandPresentation?.fightDisplayCursor).toBe(0);
    expect(state.battlePresentationBoundaries?.[0]).toMatchObject({
      partyIndex: state.battle?.rules.rulesContext.battlers[0].partyIndex,
      idleEpoch: 0,
      moveCursor: 0,
      spriteVisible: true,
    });
    expect({
      partyIndex: state.battlePresentationBoundaries?.[1].partyIndex,
      idleEpoch: state.battlePresentationBoundaries?.[1].idleEpoch,
      moveCursor: state.battlePresentationBoundaries?.[1].moveCursor,
      spriteVisible: state.battlePresentationBoundaries?.[1].spriteVisible,
    }).toEqual({
      partyIndex: trainerBoundaryBeforeSwitch?.partyIndex,
      idleEpoch: trainerBoundaryBeforeSwitch?.idleEpoch,
      moveCursor: trainerBoundaryBeforeSwitch?.moveCursor,
      spriteVisible: trainerBoundaryBeforeSwitch?.spriteVisible,
    });
  });

  it("persists any accepted swaps once into the next challenge's rental rank", () => {
    const accepted = driveGeneratedRoundToCompletion(
      17,
      undefined,
      (state) => state.round.rules.battleIndex < 2
        ? { type: "accept", playerPartyIndex: 2, opponentPartyIndex: 0 }
        : { type: "decline" },
      14,
    );
    expect(accepted.round.rules.phase).toBe("roundComplete");
    expect(accepted.facilityState.rentsCount).toBe(15);
    expect(accepted.performedRentalSwap).toBe(false);

    const declined = driveGeneratedRoundToCompletion(17, undefined, undefined, 14);
    expect(declined.round.rules.phase).toBe("roundComplete");
    expect(declined.facilityState.rentsCount).toBe(14);

    const createNextChallenge = (
      previous: FactoryRoundBattleOrchestratorState,
      id: string,
    ) => createFactoryRoundBattleOrchestrator({
      id,
      rngValue: 0x1234_5678,
      factoryWinStreak: 7,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: previous.facilityState,
      rentals: {
        type: "generateInitial",
        selectedRentalIndexes: [0, 1, 2],
      },
    });
    const acceptedNext = createNextChallenge(accepted, "accepted-next-challenge");
    const declinedNext = createNextChallenge(declined, "declined-next-challenge");

    // GetNumPastRentalsRank's first band is <15. Crossing 14 -> 15 makes
    // exactly rental slot 0 use the next-better source range.
    expect(acceptedNext.initialRentalGeneration?.rentalRank).toBe(1);
    expect(declinedNext.initialRentalGeneration?.rentalRank).toBe(0);
    expect(acceptedNext.initialRentalGeneration?.rentals[0]?.setId).not.toBe(
      declinedNext.initialRentalGeneration?.rentals[0]?.setId,
    );
  });

  it("starts challenge 2 generation from challenge 1's uninterrupted orchestrator cursor", () => {
    const completed = driveGeneratedRoundToCompletion(
      17,
      undefined,
      (state) => state.round.rules.battleIndex < 2
        ? { type: "accept", playerPartyIndex: 2, opponentPartyIndex: 0 }
        : { type: "decline" },
      14,
    );
    const next = createFactoryRoundBattleOrchestrator({
      id: "continuous-cursor-next-challenge",
      rngValue: completed.round.rules.rngValue,
      factoryWinStreak: 7,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: completed.facilityState,
      rentals: {
        type: "generateInitial",
        selectedRentalIndexes: [0, 1, 2],
      },
    });

    // The ROM's Random() cursor is one continuous global. This orchestrator
    // does not model inter-challenge frame advances, so these are exact
    // orchestrator-contract cursors, not a claim about a frame-exact ROM
    // cursor between the two challenges.
    expect(completed.round.rules.rngValue).toBe(514721516);
    expect(next.initialRentalGeneration?.rentalRank).toBe(1);
    expect(next.rngSegments).toEqual([
      {
        kind: "initial-rentals",
        battleIndex: 0,
        callStart: 0,
        callEnd: 204,
        rngBefore: 514721516,
        rngAfter: 2855210072,
      },
      {
        kind: "opponent-generation",
        battleIndex: 0,
        callStart: 204,
        callEnd: 487,
        rngBefore: 2855210072,
        rngAfter: 782337733,
      },
    ]);
    expect(next.initialRentalGeneration?.rentals.map((rental) => rental.setId))
      .toEqual([278, 213, 206, 205, 212, 246]);
    expect(next.opponentGenerations[0]).toMatchObject({
      trainerId: 99,
      opponents: [
        { setId: 224 },
        { setId: 243 },
        { setId: 236 },
      ],
    });
    expect(next.facilityRngCalls).toBe(487);
    expect(next.round.rules.rngValue).toBe(782337733);
  });

  it("owns battle 0 win through decline and battle 1's fresh command on one RNG cursor", () => {
    // This is the rung-11 "current full rental records" entry path. The three
    // selected Level-50 records are intentionally strong against challenge-0
    // generated opponents; the other records reproduce rentalMons[3..5] for
    // GenerateOpponentMons' six-species exclusion.
    const playerRecords = [record(664), record(678), record(527)] as const;
    const savedRentalRecords = [
      ...playerRecords,
      record(1),
      record(2),
      record(3),
    ] as const;
    let state = createFactoryRoundBattleOrchestrator({
      id: "generated-round-rung-11",
      rngValue: RNG_SEED,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      },
    });

    expect(state.round.opponentSelection.type).toBe("factoryGenerated");
    expect(state.round.rules.phase).toBe("presentingBattleStart");
    expect(state.battle).toBeNull();
    expect(state.opponentGenerations).toHaveLength(1);
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("battleActive");
    expect(state.battle?.boundary.kind).toBe("decision-required");
    expect(state.battle?.boundary.kind === "decision-required"
      && state.battle.boundary.request.side).toBe("player");

    for (let budget = 0; budget < 60 && state.battle !== null; budget += 1) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
    }

    expect(state.battle).toBeNull();
    expect(state.round.rules.phase).toBe("presentingBattleWin");
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.round.rules.lastBattle?.opponentParty.map((member) => member.hp))
      .toEqual([0, 0, 0]);

    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const swapOfferId = state.round.presentation?.command.commandId;
    if (swapOfferId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: swapOfferId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);

    expect(state.round.rules.battleIndex).toBe(1);
    expect(state.round.rules.phase).toBe("presentingBattleStart");
    expect(state.battle).toBeNull();
    expect(state.opponentGenerations).toHaveLength(2);
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("battleActive");
    expect(state.battle?.boundary.kind).toBe("decision-required");
    expect(state.battle?.boundary.kind === "decision-required"
      && state.battle.boundary.request.side).toBe("player");

    // Generator ledgers retain their exact Random() receipts, and the
    // orchestrator's segments pin the uninterrupted cursor/order across
    // generation -> draw A/B -> battle -> next generation -> draw A/B.
    expect(state.rngSegments.map((segment) => ({
      kind: segment.kind,
      battleIndex: segment.battleIndex,
      callStart: segment.callStart,
      callEnd: segment.callEnd,
      rngBefore: segment.rngBefore,
      rngAfter: segment.rngAfter,
    }))).toEqual([
      {
        kind: "opponent-generation",
        battleIndex: 0,
        callStart: 0,
        callEnd: 152,
        rngBefore: 4,
        rngAfter: 2423399196,
      },
      {
        kind: "battle",
        battleIndex: 0,
        callStart: 152,
        callEnd: 311,
        rngBefore: 2423399196,
        rngAfter: 4032903885,
      },
      {
        kind: "opponent-generation",
        battleIndex: 1,
        callStart: 311,
        callEnd: 525,
        rngBefore: 4032903885,
        rngAfter: 3788765155,
      },
    ]);
    expect(state.opponentGenerations.map((generation) => ({
      trainerId: generation.trainerId,
      setIds: generation.opponents.map((opponent) => opponent.setId),
      draws: generation.drawLedger.length,
    }))).toEqual([
      { trainerId: 17, setIds: [122, 118, 110], draws: 152 },
      { trainerId: 90, setIds: [132, 187, 127], draws: 214 },
    ]);
    for (let index = 1; index < state.rngSegments.length; index += 1) {
      expect(state.rngSegments[index]!.callStart).toBe(state.rngSegments[index - 1]!.callEnd);
      expect(state.rngSegments[index]!.rngBefore).toBe(state.rngSegments[index - 1]!.rngAfter);
    }
    for (const generation of state.opponentGenerations) {
      generation.drawLedger.forEach((draw, index) => {
        expect(draw.position).toBe(index);
        expect(draw.rngAfter).toBe(advanceRngValue(draw.rngBefore));
        if (index > 0) expect(draw.rngBefore).toBe(generation.drawLedger[index - 1]!.rngAfter);
      });
    }
    expect(state.battle!.rng).toEqual({ calls: 2, value: 4029920645 });
    expect(state.facilityRngCalls).toBe(527);
  });

  it("seed 17 completes seven generated wins with multi-candidate trainer replacements on one cursor", () => {
    const playerRecords = [record(664), record(678), record(527)] as const;
    const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
    let state = createFactoryRoundBattleOrchestrator({
      id: "generated-round-rung-12-seed-17",
      rngValue: 17,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      },
    });
    let firstReplacement: {
      callsBefore: number;
      callsAfter: number;
      rngBefore: number;
      rngAfter: number;
      nextSide: string;
    } | null = null;

    for (let budget = 0; budget < 1_000 && state.round.rules.phase !== "roundComplete"; budget += 1) {
      if (state.battle !== null) {
        const partyIndexBefore = state.battle.rules.rulesContext.battlers[1].partyIndex;
        const callsBefore = state.battle.rng.calls;
        const rngBefore = state.battle.rng.value;
        state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
        if (
          firstReplacement === null
          && state.battle !== null
          && state.battle.rules.rulesContext.battlers[1].partyIndex !== partyIndexBefore
        ) {
          firstReplacement = {
            callsBefore,
            callsAfter: state.battle.rng.calls,
            rngBefore,
            rngAfter: state.battle.rng.value,
            nextSide: state.battle.boundary.kind === "decision-required"
              ? state.battle.boundary.request.side
              : state.battle.boundary.kind,
          };
        }
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
        state = chooseFactoryRoundSwap(state, { type: "decline" });
        continue;
      }
      throw new Error(`unexpected rung-12 phase ${state.round.rules.phase}`);
    }

    expect(state.round.rules.phase).toBe("roundComplete");
    expect(state.round.rules.battleIndex).toBe(6);
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.opponentGenerations).toHaveLength(7);
    expect(state.rngSegments.filter((segment) => segment.kind === "battle")).toHaveLength(7);
    // ShouldSwitch's new draws shift later battle/generation streams:
    // entry-685 cursor 1787 + 226 = 2013.
    expect(state.facilityRngCalls).toBe(2013);
    expect(firstReplacement).toEqual({
      callsBefore: 2,
      callsAfter: 16,
      rngBefore: 312997333,
      rngAfter: 713294723,
      nextSide: "player",
    });
    let cursor = firstReplacement!.rngBefore;
    for (let call = firstReplacement!.callsBefore; call < firstReplacement!.callsAfter; call += 1) {
      cursor = advanceRngValue(cursor);
    }
    expect(cursor).toBe(firstReplacement!.rngAfter);
    for (let index = 1; index < state.rngSegments.length; index += 1) {
      expect(state.rngSegments[index]!.callStart).toBe(state.rngSegments[index - 1]!.callEnd);
      expect(state.rngSegments[index]!.rngBefore).toBe(state.rngSegments[index - 1]!.rngAfter);
    }
  });

  it("seed 21's ordinary generated Sandstorm turn reaches forced replacement and completes seven wins", () => {
    let sandstormForcedSwitch: FactoryRoundBattleOrchestratorState | null = null;
    const state = driveGeneratedRoundToCompletion(21, (next) => {
      const boundary = next.battle?.boundary;
      const player = next.battle?.rules.rulesContext.battlers[0];
      const opponent = next.battle?.rules.rulesContext.battlers[1];
      if (
        sandstormForcedSwitch === null
        && next.round.rules.battleIndex === 0
        && boundary?.kind === "decision-required"
        && boundary.request.side === "player"
        && boundary.request.kind === "forced-switch"
        && player?.species === 210
        && opponent?.species === 98
      ) {
        sandstormForcedSwitch = next;
      }
    });

    expect(sandstormForcedSwitch).not.toBeNull();
    expect(sandstormForcedSwitch!.battle!.rules.rulesContext.battlers[0].hp).toBe(0);
    expect(sandstormForcedSwitch!.battle!.rules.rulesContext.battlers[1].hp).toBe(116);
    expect(state.round.rules.phase).toBe("roundComplete");
    expect(state.round.rules.battleIndex).toBe(6);
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.rngSegments.filter((segment) => segment.kind === "battle")).toHaveLength(7);
    expect(state.facilityRngCalls).toBe(1911);
  });

  it.each([
    // Each comment is the entry-685 cursor plus its complete downstream
    // ShouldSwitch-induced trajectory delta, not merely the direct precheck
    // draw count: later generation, move, damage, and turn lengths may change.
    [4, 2415, "roundComplete", 6, "win"], // 1517 + 898
    [5, 2156, "roundComplete", 6, "win"], // 1688 + 468
    [6, 791, "roundLost", 1, "loss"],
    [7, 1337, "roundComplete", 6, "win"], // 1827 - 490
    [8, 1922, "roundComplete", 6, "win"], // 2089 - 167
    [11, 2012, "roundComplete", 6, "win"], // 1970 + 42
    [13, 2415, "roundComplete", 6, "win"], // 2224 + 191
    [14, 1946, "roundComplete", 6, "win"], // 2325 - 379
    [15, 1602, "roundComplete", 6, "win"], // 2036 - 434
    [16, 1878, "roundComplete", 6, "win"], // 1660 + 218
    [18, 2143, "roundComplete", 6, "win"], // 2478 - 335
    [19, 1691, "roundComplete", 6, "win"], // 1842 - 151
    [20, 2326, "roundComplete", 6, "win"], // 2140 + 186
    [21, 1911, "roundComplete", 6, "win"], // unchanged after divergence reconverges
    [22, 1389, "roundComplete", 6, "win"], // 1377 + 12
    [23, 2114, "roundComplete", 6, "win"], // 1436 + 678
    [24, 1751, "roundComplete", 6, "win"], // 1690 + 61
    [26, 1680, "roundComplete", 6, "win"], // 1556 + 124
    [29, 1869, "roundComplete", 6, "win"], // 1543 + 326
    [30, 1825, "roundComplete", 6, "win"], // 1558 + 267
  ])("seed %i pins the post-ShouldSwitch round census", (
    seed,
    calls,
    phase,
    battleIndex,
    outcome,
  ) => {
    const state = driveGeneratedRoundToCompletion(seed);
    expect({
      phase: state.round.rules.phase,
      battleIndex: state.round.rules.battleIndex,
      outcome: state.round.rules.lastBattle?.outcome,
      battles: state.rngSegments.filter((segment) => segment.kind === "battle").length,
      calls: state.facilityRngCalls,
      playerHp: state.round.rules.lastBattle?.playerParty.map((member) => member.hp),
      opponentHp: state.round.rules.lastBattle?.opponentParty.map((member) => member.hp),
    }).toEqual({
      phase,
      battleIndex,
      outcome,
      battles: battleIndex + 1,
      calls,
      playerHp: seed === 6 ? [0, 0, 0] : expect.any(Array),
      opponentHp: seed === 6 ? [0, 0, 126] : expect.any(Array),
    });
  });
});
