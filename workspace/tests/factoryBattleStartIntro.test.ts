import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import interactiveGeneratedIntroTrace from "../tools/compare/traces/interactive-generated-intro-off.json" with { type: "json" };
import battle1IntroTrace from "../tools/compare/traces-groundtruth/battle1-intro.json" with { type: "json" };
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { frontierTransitionPresentationForTableIndex } from "../src/engine/battleTransition.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { createFactoryBattleStartPresentationCommand } from "../src/engine/factoryBattleStartPresentation.ts";
import { getLevel50InitialRentalFixedIv } from "../src/engine/factoryRentalGeneration.ts";
import {
  battleIntroSceneAssemblyDisplayLag,
  selectFrontierTransition,
} from "../src/engine/battleTransition.ts";
import {
  advanceFactoryBattleStartIntro,
  createFactoryBattleStartIntro,
  factoryBattleStartIntroPhase,
  factoryBattleStartPostAcknowledgementComplete,
  factoryBattleStartStatusSummaryMessageComplete,
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
  generatedBattleStartAcknowledgementVisibleStarted,
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
  it("renders two frozen trainer/index/party-status identities purely through the reusable scene-assembly owner", () => {
    const firstRound = orchestrator();
    const firstCommand = factoryBattleStartPresentationForState(firstRound)!;
    const secondRound = createFactoryRoundBattleOrchestrator({
      id: "second-scene-assembly-identity",
      rngValue: 42,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords: [record(110), record(130), record(150)],
        savedRentalRecords: [
          record(110), record(130), record(150),
          record(115), record(135), record(145),
        ],
      },
    });
    const generatedSecond = factoryBattleStartPresentationForState(secondRound)!;
    const secondPlayerParty = Object.freeze([
      Object.freeze({
        ...generatedSecond.parties.player[0],
        status1: 0x40,
      }),
      Object.freeze({
        ...generatedSecond.parties.player[1],
        hp: 0,
      }),
      generatedSecond.parties.player[2],
    ]) as typeof generatedSecond.parties.player;
    const secondCommand = createFactoryBattleStartPresentationCommand({
      commandId: 99,
      battleIndex: 5,
      opponentTrainer: generatedSecond.opponentTrainer,
      playerParty: secondPlayerParty,
      opponentParty: generatedSecond.parties.opponent,
    });

    expect(firstCommand.opponentTrainer.trainerId)
      .not.toBe(secondCommand.opponentTrainer.trainerId);
    expect(firstCommand.battleIndex).toBe(0);
    expect(secondCommand.battleIndex).toBe(5);
    expect(secondCommand.partySummaries.player)
      .toEqual(["status", "fainted", "healthy", "empty", "empty", "empty"]);

    const transitionReceipts = [
      selectFrontierTransition(0).presentation,
      selectFrontierTransition(4).presentation,
    ] as const;
    expect(transitionReceipts.map((receipt) => receipt.tableIndex)).toEqual([0, 5]);
    const roundsBefore = [structuredClone(firstRound), structuredClone(secondRound)];
    const receiptsBefore = structuredClone(transitionReceipts);
    const frames = [firstCommand, secondCommand].map((command, index) => {
      const receipt = transitionReceipts[index]!;
      let state = createFactoryBattleStartIntro(
        command,
        false,
        battleIntroSceneAssemblyDisplayLag(receipt),
      );
      const boundaryFrames: Uint8Array[] = [];
      for (const sourceTick of [1228, 1274, 1291, 1292]) {
        while (generatedBattleIntroSourceClock(
          state.elapsed,
          state.sceneAssemblyDisplayLag,
        ) < sourceTick) {
          state = advanceFactoryBattleStartIntro(state);
        }
        const before = structuredClone(state);
        const frameA = new Uint8Array(240 * 160 * 4);
        const frameB = new Uint8Array(240 * 160 * 4);
        renderGeneratedBattleStartPreSendOut(frameA, state);
        renderGeneratedBattleStartPreSendOut(frameB, state);
        expect(frameB).toEqual(frameA);
        expect(state).toEqual(before);
        expect(state.command).toBe(command);
        boundaryFrames.push(frameA);
      }
      expect(factoryBattleStartStatusSummaryMessageComplete(state)).toBe(true);

      // The acknowledgement-relative lifecycle must not inherit a huge
      // absolute clock from the unbounded PAUSE_UNTIL_PRESS hold.
      for (let hold = 0; hold < 1_500; hold += 1) {
        state = advanceFactoryBattleStartIntro(state);
      }
      // The prompt takes A or B (TextPrinterWaitWithDownArrow's JOY_NEW(A_BUTTON | B_BUTTON); ROM: docs/parity-mac/noland-room-scenes.md).
      // A held button is not a new press.
      state = advanceFactoryBattleStartIntro(state, new Set(["START"]));
      expect(state.acknowledgedElapsed).toBeNull();
      const acceptedAt = state.elapsed;
      state = advanceFactoryBattleStartIntro(state, new Set([index === 0 ? "A" : "B"]));
      expect(state.acknowledgedElapsed).toBe(acceptedAt);
      expect(generatedBattleStartAcknowledgementVisibleStarted(state)).toBe(false);
      const frozenAcknowledgement = state.acknowledgedElapsed;
      state = advanceFactoryBattleStartIntro(state, new Set(["A"]));
      expect(state.acknowledgedElapsed).toBe(frozenAcknowledgement);

      while (!generatedBattleStartAcknowledgementVisibleStarted(state)) {
        state = advanceFactoryBattleStartIntro(state);
      }
      const visibleBefore = structuredClone(state);
      const visibleA = new Uint8Array(240 * 160 * 4);
      const visibleB = new Uint8Array(240 * 160 * 4);
      renderGeneratedBattleStartPreSendOut(visibleA, state);
      renderGeneratedBattleStartPreSendOut(visibleB, state);
      expect(visibleB).toEqual(visibleA);
      expect(state).toEqual(visibleBefore);

      while (!generatedBattleStartOpponentReleaseStarted(state)) {
        state = advanceFactoryBattleStartIntro(state);
      }
      const handoffTick = generatedBattleIntroSourceClock(
        state.elapsed,
        state.sceneAssemblyDisplayLag,
      );
      let beforeComplete = state;
      while (!factoryBattleStartPostAcknowledgementComplete(state)) {
        beforeComplete = state;
        state = advanceFactoryBattleStartIntro(state);
      }
      expect(factoryBattleStartPostAcknowledgementComplete(beforeComplete)).toBe(false);
      expect(generatedBattleIntroSourceClock(
        state.elapsed,
        state.sceneAssemblyDisplayLag,
      ) - handoffTick).toBe(32);
      const completeBefore = structuredClone(state);
      const completeA = new Uint8Array(240 * 160 * 4);
      const completeB = new Uint8Array(240 * 160 * 4);
      renderGeneratedBattleStartPreSendOut(completeA, state);
      renderGeneratedBattleStartPreSendOut(completeB, state);
      expect(completeB).toEqual(completeA);
      expect(state).toEqual(completeBefore);
      expect(state.command).toBe(command);

      return {
        assembly: boundaryFrames.at(-1)!,
        visible: visibleA,
        complete: completeA,
      };
    });

    expect(frames[0]!.assembly).not.toEqual(frames[1]!.assembly);
    expect(frames[0]!.visible).not.toEqual(frames[1]!.visible);
    expect(frames[0]!.complete).not.toEqual(frames[1]!.complete);
    expect(firstRound).toEqual(roundsBefore[0]);
    expect(secondRound).toEqual(roundsBefore[1]);
    expect(transitionReceipts).toEqual(receiptsBefore);
    expect(firstRound.round.rules.phase).toBe("presentingBattleStart");
    expect(secondRound.round.rules.phase).toBe("presentingBattleStart");
  });

  it("ends the complete concurrent status-summary/message assembly at the final source sprite-settle frame", () => {
    let state = createFactoryBattleStartIntro(
      factoryBattleStartPresentationForState(orchestrator())!,
      false,
      1,
    );
    while (generatedBattleIntroSourceClock(
      state.elapsed,
      state.sceneAssemblyDisplayLag,
    ) < 1291) {
      state = advanceFactoryBattleStartIntro(state);
    }
    expect(factoryBattleStartIntroPhase(state)).toBe("awaiting-acknowledgement");
    expect(factoryBattleStartStatusSummaryMessageComplete(state)).toBe(false);
    state = advanceFactoryBattleStartIntro(state);
    expect(generatedBattleIntroSourceClock(
      state.elapsed,
      state.sceneAssemblyDisplayLag,
    )).toBe(1292);
    expect(factoryBattleStartStatusSummaryMessageComplete(state)).toBe(true);
  });

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
      // tri1 (docs/tri1-transition-intro-handoff.md "Open"): the recording drew CIRCLES_MEET (table index 4); for these inputs the engine's
      // room draws CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ, and the intro now starts on the drawn transition's frame: carry the recording's.
      const drawn = state.battleRoom?.transitionPresentation;
      if (drawn !== undefined && drawn.tableIndex !== 4) {
        state = { ...state, battleRoom: { ...state.battleRoom!, transitionPresentation: frontierTransitionPresentationForTableIndex(4, drawn.rngAfterDraw) } };
      }
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
