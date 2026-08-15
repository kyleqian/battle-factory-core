import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { getLevel50InitialRentalFixedIv } from "../../src/engine/factoryRentalGeneration.ts";
import type { EngineState } from "../../src/engine/core.ts";
import {
  advanceFactoryRoundPresentation,
  beginFactoryRoundBattleStartIntro,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  preGenerateFactoryRoundNextOpponent,
  type FactoryRoundBattleOrchestratorState,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  resolveRoundBattle,
} from "../../src/engine/roundController.ts";
import {
  battleIntroSceneAssemblyDisplayLag,
  selectFrontierTransition,
} from "../../src/engine/battleTransition.ts";
import { battleRoomStateForOpponent } from "../../src/engine/battleRoom.ts";
import { factoryTrainerPresentationForOpponent } from "../../src/engine/factoryTrainerPresentation.ts";
import { createPostwinState } from "../../src/engine/postwin.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const CHALLENGE2_FIXED_IV = getLevel50InitialRentalFixedIv(2, false);
const natureByName = new Map(
  naturesData.natures.map((row) => [row.name, row.index]),
);

function record(setId: number, fixedIv = CHALLENGE2_FIXED_IV): FactoryRentalRecord {
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

/**
 * Dev-time acceleration through one generated win. Rules, pre-generation,
 * swap decline, and next-battle publication all use the public controller
 * interfaces; only the battle outcome itself is supplied by the proof stage.
 */
function advanceProofWin(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const start = state.round.presentation?.command;
  if (start?.type !== "battleStart") {
    throw new Error("round proof requires a pending battle-start command");
  }
  let round = advanceRoundController(
    completeBattlePresentation(state.round, { commandId: start.commandId }),
  );
  round = resolveRoundBattle(round, {
    outcome: "win",
    playerParty: round.rules.playerParty,
    opponentParty: round.rules.currentOpponent.party,
    rngValue: round.rules.rngValue,
  });
  let next: FactoryRoundBattleOrchestratorState = {
    ...state,
    round,
    battle: null,
    battleCommandPresentation: null,
    battleResolutionPresentation: null,
    activeBattleCallStart: null,
  };
  next = preGenerateFactoryRoundNextOpponent(next);
  const won = next.round.presentation?.command;
  if (won?.type !== "battleWon") throw new Error("round proof requires battleWon");
  next = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(next, { commandId: won.commandId }),
  );
  const offer = next.round.presentation?.command;
  if (offer?.type !== "swapOffer") throw new Error("round proof requires swapOffer");
  next = chooseFactoryRoundSwap(
    completeFactoryRoundPresentation(next, { commandId: offer.commandId }),
    { type: "decline" },
  );
  const resolved = next.round.presentation?.command;
  if (resolved?.type !== "swapResolved") {
    throw new Error("round proof requires swapResolved");
  }
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(next, { commandId: resolved.commandId }),
  );
}

/**
 * Stages seed 70's challenge-2 intro at any generated battle index 0..6.
 * Index 6 is the Frontier Brain (Noland): entering factoryWinStreak 14, six
 * ordinary wins (index 0..5) land `getFactoryFrontierBrainStatus`'s input at
 * 20, `+1` modifier makes 21 -- exactly the silver threshold with the
 * default `factorySymbolsCount` 0 this config leaves unset -- so index 6 is
 * always the silver Brain here, not an ordinary opponent.
 */
export function generatedRoundRevealProofStage(
  state: EngineState,
  targetBattleIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6,
): EngineState {
  const playerRentalRecords = [record(267), record(268), record(269)] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: `factory-round-battle${targetBattleIndex + 1}-reveal-off`,
    rngValue: 70,
    factoryWinStreak: 14,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 14,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        record(270),
        record(271),
        record(272),
      ],
    },
  });
  for (let battleIndex = 0; battleIndex < targetBattleIndex; battleIndex += 1) {
    orchestrator = advanceProofWin(orchestrator);
  }
  const transition = selectFrontierTransition(orchestrator.round.rules.rngValue);
  orchestrator = beginFactoryRoundBattleStartIntro(
    orchestrator,
    battleIntroSceneAssemblyDisplayLag(transition.presentation),
  );
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: transition.rngValue,
  };
}

// Challenge 2, battle index 5 (Battle 6): LUKAS with set ids 270/341/284.
// Its next transition draw is table index 3, distinct from LILIANA's index 1.
export function generatedRoundBattle6LukasRevealStage(state: EngineState): EngineState {
  return generatedRoundRevealProofStage(state, 5);
}

// The summary/message trace owns the next source-relative phase from the same
// immutable Battle-6 receipt. Keep its stage name explicit while reusing the
// exact ordinary-controller construction above; no phase-specific data or
// absolute trace clock enters production state.
export function generatedRoundBattle6LukasStatusSummaryMessageStage(
  state: EngineState,
): EngineState {
  return generatedRoundRevealProofStage(state, 5);
}

// Challenge 2, battle index 6 (Battle 7): the Frontier Brain, NOLAND.
// Entering factoryWinStreak 14, six ordinary wins land the silver threshold
// (docs/noland-brain-intro-ground-truth.md) -- same seed-70 chain as the
// Lukas stage above, one battle further. Every mechanism this reaches
// (transition selection, command construction) is the same generalized path;
// only the resolved trainer identity/party differ, per rung B (PROGRESS 1259).
export function generatedRoundBattle7NolandRevealStage(state: EngineState): EngineState {
  return generatedRoundRevealProofStage(state, 6);
}

/**
 * A postwin `elapsed` this far past `POSTWIN_COUNTER_ROOM_FIRST_AGE` (115)
 * is permanently in `postwinPhase`'s terminal "counterRoom" bucket, and every
 * one of `postwinRngSteps`'s special-cased equality checks (43/45/46/105/106,
 * `continuationConfirmElapsed+1`, `rightThisWayDismissElapsed+109/110`) is
 * already behind it -- so `advancePostwin`/`postwinRngSteps` just increment
 * forever, never throwing or branching. Room-entrance placeholder only: once
 * `battleRoom` is set, `core.ts`'s `if (postwin) { if (prebattleRoom) {}
 * else if (battleRoom) {} else if (...postwin dialogue...) {} }` chain never
 * re-enters the dialogue branches (an `else if` sibling of `battleRoom`,
 * unreachable once it's set) -- this object exists only to satisfy
 * `renderPostwinState`'s own precedence check (`rightThisWayDismissElapsed
 * !== null` -> defer to `state.battleRoom`, core.ts:2512-2514) and `render`'s
 * outer `postwinPhase(...) !== "counterRoom"` gate, not to model a real
 * dialogue traversal.
 */
const ROOM_ENTRANCE_INERT_POSTWIN_ELAPSED = 10_000;
const ROOM_ENTRANCE_INERT_POSTWIN_RIGHT_THIS_WAY_ELAPSED = 0;

/**
 * Walk-up build step B1b: stages the SAME seed-70/challenge-2 Battle-7
 * (Noland, silver) round `generatedRoundRevealProofStage` reaches, but stops
 * at the real `battleRoom` construction seam (`core.ts`'s postwin ->
 * prebattleRoom -> battleRoom chained-round handoff, wired in d60ca1b3) --
 * `battleRoomStateForOpponent`, the SAME call core.ts itself makes -- rather
 * than jumping straight past the room into `beginFactoryRoundBattleStartIntro`
 * the way the reveal stage above does. `prebattleRoom: null` and a
 * `battleRoom` already at `elapsed: 0` matches app frame 0 to the entrance's
 * own "first visible room frame" (battleRoom.ts's own `elapsed` convention,
 * shared with the ordinary path's `WARP_FADE_TO_ROOM_ELAPSED` handoff).
 */
export function generatedRoundBattle7NolandRoomEntranceStage(
  state: EngineState,
): EngineState {
  const playerRentalRecords = [record(267), record(268), record(269)] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "factory-round-battle7-noland-room-entrance-off",
    rngValue: 70,
    factoryWinStreak: 14,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 14,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        record(270),
        record(271),
        record(272),
      ],
    },
  });
  for (let battleIndex = 0; battleIndex < 6; battleIndex += 1) {
    orchestrator = advanceProofWin(orchestrator);
  }
  const currentOpponent = orchestrator.round.rules.currentOpponent;
  const trainerPresentation = factoryTrainerPresentationForOpponent(currentOpponent) ?? undefined;
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    postwin: {
      ...createPostwinState(),
      elapsed: ROOM_ENTRANCE_INERT_POSTWIN_ELAPSED,
      rightThisWayDismissElapsed: ROOM_ENTRANCE_INERT_POSTWIN_RIGHT_THIS_WAY_ELAPSED,
    },
    prebattleRoom: null,
    battleRoom: battleRoomStateForOpponent(currentOpponent, trainerPresentation),
    rngMode: "vblank",
    rngValue: orchestrator.round.rules.rngValue,
  };
}

const CHALLENGE5_FIXED_IV = getLevel50InitialRentalFixedIv(5, false);

/**
 * Gold sibling of `generatedRoundRevealProofStage`: seed 2 / entering
 * factoryWinStreak 35 (challenge index 5) / factorySymbolsCount 1 -- the
 * known-good gold round shape pinned by
 * `tests/factoryBrainRoundShape.test.ts`'s "gold round" case
 * (`GOLD_SEED`/`GOLD_STREAK`). Player set IDs 564/565/566 (not that test's
 * 664/678/527) -- the test's pure app-only `currentRecords` construction
 * skips the source rental-range legality check, but the oracle's own
 * `factoryBrain` request validates `playerSetIds` against the real
 * challenge-5/rank-0 range regardless of `overrides.parties`, and 664/678/
 * 527 fail that check; 564/565/566 are the already-oracle-verified legal
 * gold triple `factory-brain-gold-turn1-off.json` uses. Six ordinary wins
 * (index 0..5) land `getFactoryFrontierBrainStatus`'s input at 41, `+1` modifier
 * makes 42 -- the gold threshold -- so index 6 is always the gold Brain
 * here, not an ordinary opponent. A separate function (not a parameter on
 * `generatedRoundRevealProofStage`) because every field here differs from
 * the silver recipe (seed, streak, symbols, player set IDs, rental fixed
 * IV); only the shared win-advancement/transition-selection machinery is
 * reused.
 */
export function generatedGoldRoundRevealProofStage(
  state: EngineState,
  targetBattleIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6,
): EngineState {
  const playerRentalRecords = [
    record(564, CHALLENGE5_FIXED_IV),
    record(565, CHALLENGE5_FIXED_IV),
    record(566, CHALLENGE5_FIXED_IV),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: `factory-round-battle${targetBattleIndex + 1}-gold-reveal-off`,
    rngValue: 2,
    factoryWinStreak: 35,
    factorySymbolsCount: 1,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        record(1, CHALLENGE5_FIXED_IV),
        record(2, CHALLENGE5_FIXED_IV),
        record(3, CHALLENGE5_FIXED_IV),
      ],
    },
  });
  for (let battleIndex = 0; battleIndex < targetBattleIndex; battleIndex += 1) {
    orchestrator = advanceProofWin(orchestrator);
  }
  const transition = selectFrontierTransition(orchestrator.round.rules.rngValue);
  orchestrator = beginFactoryRoundBattleStartIntro(
    orchestrator,
    battleIntroSceneAssemblyDisplayLag(transition.presentation),
  );
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: transition.rngValue,
  };
}

// Challenge 5, battle index 6 (Battle 7): the Frontier Brain, NOLAND, gold.
// Same generalized mechanism as the silver stage above; only the resolved
// trainer party/gold status and the underlying round-shape config differ.
export function generatedRoundBattle7NolandGoldRevealStage(state: EngineState): EngineState {
  return generatedGoldRoundRevealProofStage(state, 6);
}
