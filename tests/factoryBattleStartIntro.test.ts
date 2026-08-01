import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import interactiveGeneratedIntroTrace from "../tools/compare/traces/interactive-generated-intro-off.json" with { type: "json" };
import battle1IntroTrace from "../tools/compare/traces-groundtruth/battle1-intro.json" with { type: "json" };
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { getLevel50InitialRentalFixedIv } from "../src/engine/factoryRentalGeneration.ts";
import {
  advanceFactoryBattleStartIntro,
  createFactoryBattleStartIntro,
  factoryBattleStartIntroPhase,
  settleFactoryBattleStartCommand,
} from "../src/engine/factoryBattleStartIntro.ts";
import {
  advanceFactoryRoundPresentation,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  factoryBattleStartPresentationForState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { advanceBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  generatedBattleStartOpponentReleaseStarted,
  generatedBattleStartCommandReady,
  generatedBattleStartPlayerReleaseStarted,
  generatedBattleIntroSourceClock,
  generatedPlayerVisualTAtOpponentHandoff,
  opponentSummaryExitElapsed,
  renderGeneratedBattleStartOpponentRelease,
  renderGeneratedBattleStartPreSendOut,
} from "../src/engine/battleScene.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = setId === 274
    ? 3695979440
    : natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 9,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function orchestrator() {
  const playerRentalRecords = [record(274), record(354), record(338)] as const;
  return createFactoryRoundBattleOrchestrator({
    id: "trainer-pic-shizuka-pre-send-out",
    rngValue: 13,
    factoryWinStreak: 14,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        record(268),
        record(269),
        record(270),
      ],
    },
  });
}

function intro() {
  const generated = factoryBattleStartPresentationForState(orchestrator())!;
  return createFactoryBattleStartIntro(generated, false);
}

describe("generated Factory pre-send-out intro lifecycle", () => {
  it("pins the interactive generated-intro summary destroy receipt to its semantic handoff clock (ISSUES #56 item 2)", () => {
    // The Battle Scene OFF RAM probe records the real bar+icon destroy at
    // absolute frame 1492. Replay the exact interactive input route through
    // the hermetic engine so that physical receipt has an explicit typed
    // handoff/rawElapsed counterpart rather than an inferred trainer-slide
    // clock. Recording imports stay test-only; production imports none.
    const segments = [
      ...battle1IntroTrace.segments.slice(0, interactiveGeneratedIntroTrace.sourceSegmentCount),
      ...interactiveGeneratedIntroTrace.appendSegments,
    ];
    let state = createInitialState({ appRoute: "generated-orchestrator" });
    let handoff: { frame: number; elapsed: number; t: number } | null = null;
    let destroy: { elapsed: number; t: number } | null = null;
    for (const advance of traceAdvances(segments)) {
      state = tick(state, advance.buttons);
      const introState = state.factoryRoundBattleOrchestrator?.battleStartIntro;
      if (introState !== undefined && introState !== null) {
        const t = generatedBattleIntroSourceClock(introState.elapsed);
        if (handoff === null && generatedBattleStartOpponentReleaseStarted(introState)) {
          handoff = { frame: advance.frame, elapsed: introState.elapsed, t };
        }
        if (advance.frame === 1492) destroy = { elapsed: introState.elapsed, t };
      }
      if (advance.frame >= 1492) break;
    }
    expect(handoff).toEqual({ frame: 1460, elapsed: 411, t: 1459 });
    expect(destroy).toEqual({ elapsed: 443, t: 1491 });
    expect(destroy!.t - handoff!.t - 1).toBe(31);
  });

  it("advances only the typed initial summary tail past DESTIN's recorded stall", () => {
    expect(opponentSummaryExitElapsed(
      31,
      "destin",
      "generated-initial-release",
    )).toBe(31);
    expect(opponentSummaryExitElapsed(
      31,
      "destin",
      "canonical-recorded",
    )).toBe(30);
    expect(opponentSummaryExitElapsed(
      32,
      "destin",
      "generated-initial-release",
    )).toBe(31);
    expect(opponentSummaryExitElapsed(
      31,
      "jenson",
      "canonical-recorded",
    )).toBe(31);
  });

  it("keeps the player summary bar/icon fade anchored on the player's own throw-visible clock during the opponent-release phase, not the raw opponent-handoff clock (ISSUES #56 item 2 frame 536: RAM proved zero movement on the player status-bar/icons through app-relative 542, while a raw-clock-anchored fade would already have started at 536)", () => {
    // Mirrors tools/probe/analyze-issue56-frames-444-536-app-series.ts's own
    // YOSHI stage construction (COMBUSKEN opponent, GRIMER player lead) -
    // the one already-verified fixture whose dispatch delay (125, cry-
    // duration-derived) pushes the render-dispatch switch to the player-
    // release compositor late enough (raw t=1576) that the raw opponent-
    // handoff clock crosses the old flat PLAYER_SUMMARY_FADE_START_TICK
    // (1574) one tick BEFORE that switch - the exact window this bug lived
    // in.
    const natureByName2 = new Map(naturesData.natures.map((row) => [row.name, row.index]));
    function generatedCommandRecord(setId: number, exactPersonality?: number): FactoryRentalRecord {
      const set = frontierMonsData.entries[setId]!;
      const personality = exactPersonality ?? natureByName2.get(set.nature)!;
      const input = {
        setId,
        personality,
        fixedIv: getLevel50InitialRentalFixedIv(0, false),
        abilitySlot: (personality & 1) as 0 | 1,
        otId: PLAYER_TRAINER_ID,
      };
      return Object.freeze({
        ...input,
        abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
      });
    }
    const playerRentalRecords = [
      generatedCommandRecord(110, 2737562574),
      generatedCommandRecord(130, 3230415900),
      generatedCommandRecord(150, 391062422),
    ] as const;
    let orchestrator = createFactoryRoundBattleOrchestrator({
      id: "factory-arbitrary-intro-yoshi-off-pin",
      rngValue: 42,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords,
        savedRentalRecords: [
          ...playerRentalRecords,
          generatedCommandRecord(115),
          generatedCommandRecord(135),
          generatedCommandRecord(145),
        ],
      },
    });
    const generated = factoryBattleStartPresentationForState(orchestrator)!;
    let state = createFactoryBattleStartIntro(generated, false);
    while (state.elapsed < 370) state = advanceFactoryBattleStartIntro(state);
    state = advanceFactoryBattleStartIntro(state, new Set(["A"]));
    while (!generatedBattleStartOpponentReleaseStarted(state)) {
      state = advanceFactoryBattleStartIntro(state);
    }
    function render(): Uint8Array {
      const frame = new Uint8Array(240 * 160 * 4);
      renderGeneratedBattleStartOpponentRelease(frame, state);
      return frame;
    }
    let sawRawClockPastThreshold = false;
    let previousFrame: Uint8Array | null = null;
    while (!generatedBattleStartPlayerReleaseStarted(state)) {
      const t = generatedBattleIntroSourceClock(state.elapsed);
      const playerVisualT = generatedPlayerVisualTAtOpponentHandoff(state, t)!;
      if (t >= 1574) {
        // The exact regression window: the raw clock has crossed the old
        // flat threshold, but the player's own throw-visible clock has not,
        // and this fixture's own materialize/ball-open animations have
        // already settled by here - so the WHOLE frame (not just the
        // player-icon row, empirically the first-diverging region under the
        // pre-fix raw-clock bug) must render byte-identically tick to tick.
        expect(playerVisualT).toBeLessThan(1574);
        const frame = render();
        if (previousFrame !== null) {
          sawRawClockPastThreshold = true;
          expect(Array.from(frame)).toEqual(Array.from(previousFrame));
        }
        previousFrame = frame;
      }
      state = advanceFactoryBattleStartIntro(state);
    }
    expect(sawRawClockPastThreshold).toBe(true);
  });

  it("uses one BeginBattleIntro-relative clock through slide, printer, and A gate", () => {
    let state = intro();
    expect(factoryBattleStartIntroPhase(state)).toBe("handoff");
    for (let i = 0; i < 27; i += 1) {
      state = advanceFactoryBattleStartIntro(state);
    }
    expect(generatedBattleIntroSourceClock(state.elapsed)).toBe(1075);
    expect(factoryBattleStartIntroPhase(state)).toBe("trainer-slide");

    while (factoryBattleStartIntroPhase(state) === "trainer-slide") {
      state = advanceFactoryBattleStartIntro(state);
    }
    expect(generatedBattleIntroSourceClock(state.elapsed)).toBe(1227);
    expect(factoryBattleStartIntroPhase(state)).toBe("trainer-message");
    const early = advanceFactoryBattleStartIntro(state, new Set(["A"]));
    expect(early.acknowledgedElapsed).toBeNull();

    while (factoryBattleStartIntroPhase(state) !== "awaiting-acknowledgement") {
      state = advanceFactoryBattleStartIntro(state);
    }
    const accepted = advanceFactoryBattleStartIntro(state, new Set(["A"]));
    expect(accepted.acknowledgedElapsed).toBe(state.elapsed);
    expect(factoryBattleStartIntroPhase(accepted)).toBe("opponent-message");

    let release = accepted;
    while (!generatedBattleStartOpponentReleaseStarted(release)) {
      release = advanceFactoryBattleStartIntro(release);
    }
    expect(factoryBattleStartIntroPhase(release)).toBe("opponent-release");
    expect(release.elapsed - release.acknowledgedElapsed!).toBe(
      release.command.text.opponentSendOut[0].length
        + release.command.text.opponentSendOut[1].length
        + 5
        + 3
        - 2,
    );
  });

  it("renders every lifecycle phase through opponent healthbox settle from the frozen generated command", () => {
    let state = intro();
    for (const elapsed of [0, 27, 59, 178, 185, 225, 370]) {
      while (state.elapsed < elapsed) state = advanceFactoryBattleStartIntro(state);
      const frame = new Uint8Array(240 * 160 * 4);
      renderGeneratedBattleStartPreSendOut(frame, state);
      expect(frame).toHaveLength(240 * 160 * 4);
      if (elapsed < 27) {
        expect(frame.every((value) => value === 0)).toBe(true);
      } else {
        expect(frame.some((value) => value !== 0)).toBe(true);
      }
    }
    state = advanceFactoryBattleStartIntro(state, new Set(["A"]));
    for (const elapsed of [374, 411, 430, 443, 466, 521, 522, 536, 615, 629, 651, 710, 714]) {
      while (state.elapsed < elapsed) state = advanceFactoryBattleStartIntro(state);
      const frame = new Uint8Array(240 * 160 * 4);
      renderGeneratedBattleStartPreSendOut(frame, state);
      expect(frame.some((value) => value !== 0)).toBe(true);
    }
    expect(generatedBattleStartPlayerReleaseStarted(state)).toBe(true);
    expect(generatedBattleStartCommandReady(state)).toBe(true);
    expect(factoryBattleStartIntroPhase(state)).toBe("command-ready");
  });

  it("hands player-ready to the same settled typed command checkpoint", () => {
    let state = intro();
    while (state.elapsed < 370) state = advanceFactoryBattleStartIntro(state);
    state = advanceFactoryBattleStartIntro(state, new Set(["A"]));
    while (!generatedBattleStartCommandReady(state)) {
      state = advanceFactoryBattleStartIntro(state);
    }

    let round = orchestrator();
    const commandId = round.round.presentation!.command.commandId;
    round = advanceFactoryRoundPresentation(
      completeFactoryRoundPresentation(round, { commandId }),
    );
    const initial = round.battleCommandPresentation!;
    let expected = initial;
    for (let frame = 0; frame < 6; frame += 1) {
      expected = advanceBattleCommandPresentation(expected, new Set());
    }

    const settled = settleFactoryBattleStartCommand(state, initial);
    expect(settled).toEqual(expected);
    expect(settled.lifecycle).toEqual({
      phase: "action-menu",
      phaseElapsed: 0,
    });
    expect(settled.idleBounceElapsed).toBe(0);
    expect(settled.field).toEqual(initial.field);
  });
});
