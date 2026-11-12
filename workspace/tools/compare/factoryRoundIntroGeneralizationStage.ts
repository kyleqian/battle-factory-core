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
  frontierTransitionPresentationForTableIndex,
  selectFrontierTransition,
  type FrontierTransitionPresentation,
} from "../../src/engine/battleTransition.ts";
import {
  battleRoomStateForOpponent,
  GOLD_FIRST_ENCOUNTER_SPEECH_BOXES,
  SILVER_FIRST_ENCOUNTER_SPEECH_BOXES,
} from "../../src/engine/battleRoom.ts";
import {
  factoryTrainerPresentationForOpponent,
  type FactoryTrainerPresentation,
} from "../../src/engine/factoryTrainerPresentation.ts";
import {
  CALL_SCENE_HEAD_MENU_READY_DELAY,
  CALL_SCENE_TRAILING_DELAY,
  createPostwinState,
  POSTWIN_COUNTER_ROOM_FIRST_AGE,
  POSTWIN_NEXT_BOX_CLEAR_DELAY,
} from "../../src/engine/postwin.ts";

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
 * prebattleRoom -> battleRoom chained-round handoff, wired in c4e963f0) --
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

/** Shared round setup for the speech-window stages below - the same seed-70/challenge-2 Battle-7 (Noland, silver) round every other stage in this module reaches. */
function nolandRoundReadyState(state: EngineState): {
  readonly state: EngineState;
  readonly orchestrator: FactoryRoundBattleOrchestratorState;
  readonly trainerPresentation: FactoryTrainerPresentation | undefined;
  readonly transitionPresentation: FrontierTransitionPresentation | undefined;
} {
  const playerRentalRecords = [record(267), record(268), record(269)] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "factory-round-battle7-noland-silver-speech-off",
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
    state: {
      ...state,
      factoryRoundBattleOrchestrator: orchestrator,
      postwin: {
        ...createPostwinState(),
        elapsed: ROOM_ENTRANCE_INERT_POSTWIN_ELAPSED,
        rightThisWayDismissElapsed: ROOM_ENTRANCE_INERT_POSTWIN_RIGHT_THIS_WAY_ELAPSED,
      },
      prebattleRoom: null,
      rngMode: "vblank",
    },
    orchestrator,
    trainerPresentation,
    // NOT `currentOpponent.frontierBrain?.transitionPresentation`: this
    // helper's own pinned dev seed (rngValue 70/streak 14, chosen to match
    // tests/factoryBrainRoundShape.test.ts's shape) does not reproduce the
    // real oracle battle-lab fixture's seed (305419896) -- no app-side
    // seed-mapping function exists yet (docs/brain-transition-wiring-
    // design.md §2's own open gap) -- so the live orchestrator's own draw
    // here lands on table index 9 (CIRCLES_CROSS_IN_SEQ), the WRONG family
    // for every real silver walk-up fixture this ready-state feeds. Table
    // index 5 (CIRCLES_CROSS, id 35) is the oracle-proven real family
    // instead (§S0's RAM-verified `gRngValue` cross-check) -- hand-derived
    // from that evidence the same way `speechAcceptedFast` is, not replayed
    // from this mismatched seed.
    transitionPresentation: frontierTransitionPresentationForTableIndex(5),
  };
}

/**
 * Walk-up build step A dense calibration: parks `postwin` at the brain
 * route's call-scene start -- `elapsed: POSTWIN_COUNTER_ROOM_FIRST_AGE`, the
 * first tick of the shared (already oracle-pinned, docs/postwin-notes.md)
 * counter-room fade-in, with `frontierBrain: true` and every call-scene/
 * AskReadyForHead/AskSwapBeforeHead field at its pre-heal-dismiss rest value.
 * This is the same "park directly in a real, reachable state" idiom as the
 * room-entrance stage above, not a simulated walk-up: the round itself has
 * genuinely resolved 6 wins (factoryWinStreak 14->20) landing
 * `currentOpponent` on Noland/silver, matching "battle-20 win resolved,
 * about to face the brain" -- only the postwin *presentation* clock is
 * hand-set rather than ticked there from `elapsed: 0`, exactly as the room-
 * entrance stage hand-sets `battleRoom` rather than ticking through
 * `prebattleRoom`.
 *
 * Anchor: docs/walkup-call-scene-ground-truth.md's own boundary note -- two
 * staging-artifact fades precede the genuine call scene; only pre-checkpoint
 * frame 490 onward ("fade-in to PreBattleRoom, attendant already present, no
 * box yet") is acceptance-grade. `POSTWIN_COUNTER_ROOM_FIRST_AGE` (115) is
 * `renderPostwinState`'s own first tick of that exact fade
 * (`fadeLocal = age - POSTWIN_COUNTER_ROOM_FIRST_AGE` -> 0, `FADE_IN`'s
 * darkest step) -- confirmed by the shared fade's own settle boundary:
 * `POSTWIN_COUNTER_ROOM_SETTLED_AGE` (130) is exactly `FADE_IN_TICKS` (15)
 * after 115, and `POSTWIN_HEAL_TEXT_FIRST_AGE` (140) lands 25 ticks after
 * 115 -- within one frame of the oracle's own measured 24-tick fade-to-
 * first-glyph span (490 -> 514), i.e. app elapsed 115 = oracle frame 490
 * agrees with the ALREADY-PINNED shared fade constants to within the
 * fixture's own frame-indexing convention, not a new fit.
 */
export function generatedRoundBattle7NolandPostwinCallSceneStartStage(
  state: EngineState,
): EngineState {
  const ready = nolandRoundReadyState(state);
  return {
    ...ready.state,
    postwin: {
      ...createPostwinState(),
      elapsed: POSTWIN_COUNTER_ROOM_FIRST_AGE,
      frontierBrain: true,
    },
    rngValue: ready.orchestrator.round.rules.rngValue,
  };
}

/**
 * Walk-up build step A dense calibration: parks `postwin` directly in the
 * `AskReadyForHead` menu's own held state (frame 0 of
 * docs/walkup-call-scene-ground-truth.md's post-checkpoint numbering --
 * "the checkpoint IS the open ask-ready menu, cursor on GO ON", confirmed
 * live sha-identical to the pre-checkpoint route's own frame 1570). Reached
 * by hand-setting the call scene's own terminal fields
 * (`callScenePage: 5`, `callSceneDismissElapsed: 0`) rather than replaying
 * the call scene's own five boxes -- the same "park past a not-yet-exercised
 * upstream window" sidestep the B2 speech-box stages already use, since
 * windows 2/3 (this stage's own compare targets) start fresh at the
 * checkpoint regardless of how window 1's own call scene got there.
 * `elapsed` is set generously past `CALL_SCENE_HEAD_MENU_READY_DELAY` so the
 * menu is already fully held/settled at frame 0 -- the oracle's own window 2
 * shows this exact content held unchanged for 121 frames, so any
 * sufficiently-elapsed value renders identically.
 */
export function generatedRoundBattle7NolandPostwinAskReadyMenuOpenStage(
  state: EngineState,
): EngineState {
  const ready = nolandRoundReadyState(state);
  const callSceneDismissElapsed = 0;
  return {
    ...ready.state,
    postwin: {
      ...createPostwinState(),
      // Past every render gate on the path to the menu: the shared
      // beforeContinuation heal-box gate (healDismiss + POSTWIN_NEXT_BOX_
      // CLEAR_DELAY) as well as the brain-specific menu-ready delay -- both
      // relative to elapsed 0 here since healDismissElapsed/
      // callSceneDismissElapsed are both pinned to 0.
      elapsed:
        POSTWIN_NEXT_BOX_CLEAR_DELAY
        + CALL_SCENE_TRAILING_DELAY + CALL_SCENE_HEAD_MENU_READY_DELAY + 50,
      frontierBrain: true,
      healDismissElapsed: callSceneDismissElapsed,
      callScenePage: 5,
      callSceneDismissElapsed,
      continuationCursorPos: 0,
      continuationCursorDisplayPos: 0,
    },
    rngValue: ready.orchestrator.round.rules.rngValue,
  };
}

/**
 * Walk-up build step B2: parks `battleRoom` directly in a fully-printed
 * `brainSpeechIdle` box (`speechStep`, 0-indexed into
 * `SILVER_FIRST_ENCOUNTER_SPEECH_BOXES`) rather than simulating
 * `brainEntering`/`brainMoving`/`brainSettled` up to it — B1b's own
 * `brainMoving` walk/pan cadence residual (battleRoom.ts's module doc,
 * PROGRESS 1278) is not yet closed, so replaying it here would taint a
 * speech-window compare with an already-known-open mismatch upstream of
 * this step's own job. This sidesteps that the same way the inert-postwin
 * shape above sidesteps prebattleRoom's own not-yet-derived dialogue: an
 * app-only shortcut into a real, reachable engine state (not a synthetic
 * one the app could never otherwise produce), anchored to each box's own
 * PNG-verified "held" (fully printed) onset frame from
 * docs/noland-silver-walkup-presentation-map.md §3 via the paired trace's
 * own `preCheckpointFrameOffset`. Per-box PRINT/TRANSITION timing (the
 * ticks leading up to each box, not the held frame itself) is therefore
 * NOT exercised by this stage — a named, out-of-scope-adjacent residual,
 * same disclosure discipline as the brainMoving one above.
 */
export function generatedRoundBattle7NolandSilverSpeechBoxHeldStage(
  state: EngineState,
  speechStep: number,
): EngineState {
  const ready = nolandRoundReadyState(state);
  return {
    ...ready.state,
    battleRoom: {
      phase: "brainSpeechIdle",
      elapsed: 0,
      frontierBrainWalkup: true,
      brainSpeechFirstEncounter: true,
      speechStep,
      trainerPresentation: ready.trainerPresentation,
      transitionPresentation: ready.transitionPresentation,
    },
    rngValue: ready.orchestrator.round.rules.rngValue,
  };
}

/**
 * Side lane, dense box-2 evidence step: sibling of
 * `generatedRoundBattle7NolandSilverSpeechBoxHeldStage` above, but parked one
 * state earlier — `phase: "brainSpeech"` (the printing phase itself, `elapsed:
 * 0`) rather than the already-fully-printed `brainSpeechIdle` the held-box
 * stages jump straight to. `battleRoomAcceptedState`'s own reducer
 * (battleRoom.ts) produces exactly this state, verbatim, the instant a
 * personality-speech page with more pages queued is accepted (`{...state,
 * phase: "brainSpeech", elapsed: 0, speechStep: nextStep}` — no intervening
 * close phase), so this is the same "park directly in a real, reachable
 * engine state" idiom the held-box stages already use, just one step upstream
 * — it exists so a dense trace can capture the turn edge and the typewriter
 * print itself (both skipped by every existing held-box fixture, per their
 * own "PRINT/TRANSITION timing... NOT exercised" disclosure above), not only
 * the settled hold.
 */
export function generatedRoundBattle7NolandSilverSpeechBoxOpeningStage(
  state: EngineState,
  speechStep: number,
): EngineState {
  const ready = nolandRoundReadyState(state);
  return {
    ...ready.state,
    battleRoom: {
      phase: "brainSpeech",
      elapsed: 0,
      frontierBrainWalkup: true,
      brainSpeechFirstEncounter: true,
      speechStep,
      // Mirrors `battleRoomAcceptedState`'s own derivation (battleRoom.ts,
      // `speechAcceptedFast`'s doc): this park point represents having just
      // left box `speechStep - 1` via a direct `\p`/`\l` continuation, so it
      // is the window's first accept-driven transition (slow, cleared-tick
      // model) only when that prior box was box 0 itself.
      speechAcceptedFast: speechStep - 1 >= 1,
      trainerPresentation: ready.trainerPresentation,
      transitionPresentation: ready.transitionPresentation,
    },
    rngValue: ready.orchestrator.round.rules.rngValue,
  };
}

// Zero-arg wrapper, same convention as the box0/cry/page8/close-pause
// wrappers below — appTrace.ts's APP_STAGES registry only calls stages with a
// single `state` argument. Box 2 (`SILVER_FIRST_ENCOUNTER_SPEECH_BOXES[2]`,
// "I had a look at your Battle Swap data.") is docs/noland-brain-intro-gold-
// ground-truth.md §9″'s own named tier-generality target for the single-line
// wait-cursor placement fix (`drawBrainSpeechCursor`/`drawOpponentMsgbox`,
// battleRoomRender.ts) — see docs/silver-speech-box2-evidence.md for the
// dense fixture this wrapper feeds and its compare verdict.
export function generatedRoundBattle7NolandSilverSpeechBox2OpeningStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandSilverSpeechBoxOpeningStage(state, 2);
}

/**
 * Walk-up build step B2: parks `battleRoom` in "brainSpeechSettled" (the
 * battle-cry box already closed, empty-arena pause) — the target of
 * `BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED`'s own compare below. Same sidestep
 * rationale as the held-box stage above.
 */
export function generatedRoundBattle7NolandSilverSpeechSettledStage(
  state: EngineState,
  speechBoxCount: number,
): EngineState {
  const ready = nolandRoundReadyState(state);
  return {
    ...ready.state,
    battleRoom: {
      phase: "brainSpeechSettled",
      elapsed: 0,
      frontierBrainWalkup: true,
      brainSpeechFirstEncounter: true,
      speechStep: speechBoxCount,
      trainerPresentation: ready.trainerPresentation,
      transitionPresentation: ready.transitionPresentation,
    },
    rngValue: ready.orchestrator.round.rules.rngValue,
  };
}

// Named, zero-arg wrappers for the specific boxes this step's own dense
// spot-check traces target (docs/noland-silver-walkup-presentation-map.md
// §3's own PNG-verified "held" onset frames) - appTrace.ts's APP_STAGES
// registry only calls stages with a single `state` argument.
export function generatedRoundBattle7NolandSilverSpeechBox0HeldStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandSilverSpeechBoxHeldStage(state, 0);
}
export function generatedRoundBattle7NolandSilverSpeechCryHeldStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandSilverSpeechBoxHeldStage(
    state,
    SILVER_FIRST_ENCOUNTER_SPEECH_BOXES.length - 1,
  );
}
export function generatedRoundBattle7NolandSilverSpeechPage8HeldStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandSilverSpeechBoxHeldStage(
    state,
    SILVER_FIRST_ENCOUNTER_SPEECH_BOXES.length - 2,
  );
}
export function generatedRoundBattle7NolandSilverSpeechClosePauseStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandSilverSpeechSettledStage(
    state,
    SILVER_FIRST_ENCOUNTER_SPEECH_BOXES.length,
  );
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

/**
 * Walk-up build step B3: gold sibling of `nolandRoundReadyState` - the same
 * "park past a not-yet-exercised upstream window" idiom, seeded with the
 * gold round shape (`generatedGoldRoundRevealProofStage`'s own recipe:
 * seed 2, factoryWinStreak 35, factorySymbolsCount 1, player set IDs
 * 564/565/566 - the already-oracle-verified legal gold triple, not the
 * silver stage's 267/268/269) so `currentOpponent.frontierBrain.status`
 * resolves to `"gold"` at battleIndex 6, landing `battleRoomStateForOpponent`
 * on the gold speech content (`brainSpeechTier: "gold"`).
 */
function goldNolandRoundReadyState(state: EngineState): {
  readonly state: EngineState;
  readonly orchestrator: FactoryRoundBattleOrchestratorState;
  readonly trainerPresentation: FactoryTrainerPresentation | undefined;
  readonly transitionPresentation: FrontierTransitionPresentation | undefined;
} {
  const playerRentalRecords = [
    record(564, CHALLENGE5_FIXED_IV),
    record(565, CHALLENGE5_FIXED_IV),
    record(566, CHALLENGE5_FIXED_IV),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "factory-round-battle7-noland-gold-speech-off",
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
  for (let battleIndex = 0; battleIndex < 6; battleIndex += 1) {
    orchestrator = advanceProofWin(orchestrator);
  }
  const currentOpponent = orchestrator.round.rules.currentOpponent;
  const trainerPresentation = factoryTrainerPresentationForOpponent(currentOpponent) ?? undefined;
  return {
    state: {
      ...state,
      factoryRoundBattleOrchestrator: orchestrator,
      postwin: {
        ...createPostwinState(),
        elapsed: ROOM_ENTRANCE_INERT_POSTWIN_ELAPSED,
        rightThisWayDismissElapsed: ROOM_ENTRANCE_INERT_POSTWIN_RIGHT_THIS_WAY_ELAPSED,
      },
      prebattleRoom: null,
      rngMode: "vblank",
    },
    orchestrator,
    trainerPresentation,
    // NOT `currentOpponent.frontierBrain?.transitionPresentation`: this
    // helper's own pinned dev seed (rngValue 2/streak 35, chosen to match
    // this file's own "gold round" recipe, see `generatedGoldRoundReveal
    // ProofStage`'s doc) does not reproduce the real oracle battle-lab
    // fixture's seed (305419896) -- no app-side seed-mapping function
    // exists yet (docs/brain-transition-wiring-design.md §2's own open
    // gap) -- so the live orchestrator's own draw here lands on table
    // index 0 (LOGO_WIGGLE), the WRONG family for every real gold walk-up
    // fixture this ready-state feeds. Table index 8 (CIRCLES_MEET_IN_SEQ,
    // id 38) is the oracle-proven real family instead (§S0's RAM-verified
    // `gRngValue` cross-check) -- hand-derived from that evidence the same
    // way `speechAcceptedFast` is, not replayed from this mismatched seed.
    transitionPresentation: frontierTransitionPresentationForTableIndex(8),
  };
}

/**
 * Walk-up build step B3 dense calibration: parks `battleRoom` directly in
 * gold's escort box ("Hey, hey! Get a move on!" - the SAME entrance box
 * silver shows, `battleRoomEntrance` is not tier-gated), already fully
 * printed and idle-held - sidesteps the entrance's own print-timing cadence
 * (the not-yet-closed B1c mid-ramp residual, same rationale as B2's own
 * speech-box-held stages) so the compare trace below can drive the box's
 * REAL dismiss -> brainMoving -> brainSettled -> brainSpeech handoff for
 * real via scripted segments, rather than re-simulating the approach to it.
 */
export function generatedRoundBattle7NolandGoldSpeechOpenStage(
  state: EngineState,
): EngineState {
  const ready = goldNolandRoundReadyState(state);
  return {
    ...ready.state,
    battleRoom: {
      phase: "brainMsgboxIdle",
      elapsed: 0,
      frontierBrainWalkup: true,
      brainSpeechFirstEncounter: true,
      brainSpeechTier: "gold",
      trainerPresentation: ready.trainerPresentation,
      transitionPresentation: ready.transitionPresentation,
    },
    rngValue: ready.orchestrator.round.rules.rngValue,
  };
}

/**
 * Walk-up build step B3: gold sibling of
 * `generatedRoundBattle7NolandSilverSpeechBoxHeldStage` - parks `battleRoom`
 * directly in a fully-printed `brainSpeechIdle` box (`speechStep`, 0-indexed
 * into `GOLD_FIRST_ENCOUNTER_SPEECH_BOXES`), same sidestep rationale.
 * `elapsed` defaults to a true onset (0) but callers may park mid-hold
 * instead - see `generatedRoundBattle7NolandGoldSpeechBox0HeldStage`'s own
 * doc for why the pages fixture needs that.
 */
export function generatedRoundBattle7NolandGoldSpeechBoxHeldStage(
  state: EngineState,
  speechStep: number,
  elapsed = 0,
): EngineState {
  const ready = goldNolandRoundReadyState(state);
  return {
    ...ready.state,
    battleRoom: {
      phase: "brainSpeechIdle",
      elapsed,
      frontierBrainWalkup: true,
      brainSpeechFirstEncounter: true,
      brainSpeechTier: "gold",
      speechStep,
      trainerPresentation: ready.trainerPresentation,
      transitionPresentation: ready.transitionPresentation,
    },
    rngValue: ready.orchestrator.round.rules.rngValue,
  };
}

/** Gold sibling of `generatedRoundBattle7NolandSilverSpeechSettledStage`. */
export function generatedRoundBattle7NolandGoldSpeechSettledStage(
  state: EngineState,
  speechBoxCount: number,
): EngineState {
  const ready = goldNolandRoundReadyState(state);
  return {
    ...ready.state,
    battleRoom: {
      phase: "brainSpeechSettled",
      elapsed: 0,
      frontierBrainWalkup: true,
      brainSpeechFirstEncounter: true,
      brainSpeechTier: "gold",
      speechStep: speechBoxCount,
      trainerPresentation: ready.trainerPresentation,
      transitionPresentation: ready.transitionPresentation,
    },
    rngValue: ready.orchestrator.round.rules.rngValue,
  };
}

// Named, zero-arg wrappers - same convention as the silver box0/cry/page8/
// close-pause wrappers above (appTrace.ts's APP_STAGES registry only calls
// stages with a single `state` argument).
//
// `factory-brain-gold-walkup-speech-pages-off.json` (the only trace that
// uses this wrapper) parks at `preCheckpointFrameOffset` 1535, which is
// deep in page 1's hold tail (docs/noland-brain-intro-gold-ground-truth.md
// §7'/§9'), not the hold's true onset - unlike the silver Box0Held stage's
// own guard fixture, which parks exactly at onset. Page 1's `elapsed` clock
// only drives `brainSpeechCursorVisible`/`brainSpeechCursorYOffset`
// (battleRoom.ts) since every phase transition after it resets `elapsed`
// fresh, so parking at 0 here rendered the cursor as if the box had just
// appeared instead of already having bobbed for a while - MEASURED this
// step by instrumenting the already-verified (254/256)
// `factory-brain-gold-walkup-speech-open-off.json` trace
// (`createInitialState`/`tick` stepped through its own segments): that
// trace's own `battleRoom.phase` first reaches `brainSpeechIdle` (`elapsed`
// 0, `speechStep` 0) at its own local tick 167, i.e. oracle absolute frame
// 950 (its own `preCheckpointFrameOffset`) + 167 = 1117 - the same
// derivation this doc's own `speech-box0-held` guard-fixture fix used
// (`other-trace's-confirmed-local-tick + its-own-offset`). The pages
// fixture's local frame 0 is therefore `elapsed` 1535 - 1117 = 418 ticks
// into that same hold, not 0.
const GOLD_SPEECH_PAGES_PAGE1_HOLD_ELAPSED = 418;
export function generatedRoundBattle7NolandGoldSpeechBox0HeldStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandGoldSpeechBoxHeldStage(
    state,
    0,
    GOLD_SPEECH_PAGES_PAGE1_HOLD_ELAPSED,
  );
}
export function generatedRoundBattle7NolandGoldSpeechPage4HeldStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandGoldSpeechBoxHeldStage(
    state,
    GOLD_FIRST_ENCOUNTER_SPEECH_BOXES.length - 2,
  );
}
export function generatedRoundBattle7NolandGoldSpeechCloseHeldStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandGoldSpeechBoxHeldStage(
    state,
    GOLD_FIRST_ENCOUNTER_SPEECH_BOXES.length - 1,
  );
}
export function generatedRoundBattle7NolandGoldSpeechClosePauseStage(
  state: EngineState,
): EngineState {
  return generatedRoundBattle7NolandGoldSpeechSettledStage(
    state,
    GOLD_FIRST_ENCOUNTER_SPEECH_BOXES.length,
  );
}
