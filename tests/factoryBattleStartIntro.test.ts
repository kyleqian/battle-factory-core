import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  advanceFactoryBattleStartIntro,
  createFactoryBattleStartIntro,
  factoryBattleStartIntroPhase,
} from "../src/engine/factoryBattleStartIntro.ts";
import {
  createFactoryRoundBattleOrchestrator,
  factoryBattleStartPresentationForState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  generatedBattleIntroSourceClock,
  renderGeneratedBattleStartPreSendOut,
} from "../src/engine/battleScene.ts";

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

function intro() {
  const playerRentalRecords = [record(274), record(354), record(338)] as const;
  const state = createFactoryRoundBattleOrchestrator({
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
  return createFactoryBattleStartIntro(
    factoryBattleStartPresentationForState(state)!,
  );
}

describe("generated Factory pre-send-out intro lifecycle", () => {
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
    expect(factoryBattleStartIntroPhase(accepted)).toBe("acknowledged");
    expect(advanceFactoryBattleStartIntro(accepted)).toBe(accepted);
  });

  it("renders every lifecycle phase from the frozen generated command", () => {
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
  });
});
