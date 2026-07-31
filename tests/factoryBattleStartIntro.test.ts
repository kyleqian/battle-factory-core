import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
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
  opponentSummaryExitElapsed,
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
