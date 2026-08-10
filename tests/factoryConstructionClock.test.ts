import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  factoryMonConstructionInputFromSet,
  GBA_VBLANK_CYCLES,
  REQUIRED_FACTORY_CONSTRUCTION_CLOCK_EVIDENCE,
  scheduleFactoryConstruction,
  scheduleFactoryConstructionCleanStream,
  vblankRandom,
  type FactoryConstructionOperation,
} from "../src/engine/factoryConstructionClock.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import { natureFromPersonality, randomU32, rollPersonalityForNature } from "../src/engine/opponentGen.ts";

type ReceiptEvent = [
  "construction" | "ambient",
  number,
  string,
  number,
  number,
  number | null,
  number | null,
  "low" | "high" | null,
];

interface ReceiptCase {
  case: string;
  sourceFunction: "CreateFrontierFactorySelectableMons" | "FillFactoryFrontierTrainerParty";
  sourceSetIds: number[];
  epoch: {
    startFrame: number;
    endFrame: number;
    startCursor: number;
    endCursor: number;
  };
  sequence: ReceiptEvent[];
  monBoundaries: Array<{
    monIndex: number;
    setId: number;
    targetNature: number;
    attempts: number;
    acceptedPersonality: number;
    startCursor: number;
  }>;
}

const receipt = JSON.parse(
  readFileSync("tests/fixtures/factory-construction-rng-schedule-evidence.json", "utf8"),
) as { cases: ReceiptCase[] };

function mon(
  nature: number,
  sourceFunction: "CreateFrontierFactorySelectableMons" | "FillFactoryFrontierTrainerParty",
) {
  return {
    speciesId: 1,
    speciesName: "SPECIES_BULBASAUR",
    nature,
    evSpread: 1,
    evStatCount: 1,
    sourceFunction,
  } as const;
}

describe("Factory construction source-operation clock", () => {
  it("inserts gapless ambient LCG draws at crossed VBlank periods and exposes per-mon cursors", () => {
    const sourceFunction = "FillFactoryFrontierTrainerParty" as const;
    const startCursor = 0x1234_5678;
    const first = randomU32(startCursor);
    const afterFirstAmbient = advanceRngValue(first.rngValue);
    const second = randomU32(afterFirstAmbient);
    const mons = [
      mon(natureFromPersonality(first.value), sourceFunction),
      mon(natureFromPersonality(second.value), sourceFunction),
    ];
    const ambientCursors: number[] = [];
    const cycleCost = (operation: FactoryConstructionOperation): number => {
      switch (operation.kind) {
        case "create-mon": return 7;
        case "factory-post-mon": return 4;
        default: return 0;
      }
    };

    const schedule = scheduleFactoryConstruction({
      sourceFunction,
      mons,
      clock: {
        start: { frame: 100, cycle: 2, rngValue: startCursor },
        frameCycles: 10,
        cycleCost,
        ambientRandom: (rngValue, frame) => {
          expect(frame).toBeGreaterThan(100);
          const next = vblankRandom(rngValue, frame);
          ambientCursors.push(next);
          return next;
        },
      },
    });

    expect(schedule.events.map((event) => event.tag)).toEqual([
      "construction",
      "construction",
      "ambient",
      "construction",
      "construction",
      "ambient",
    ]);
    expect(schedule.events.map((event) => event.frame)).toEqual([100, 100, 101, 101, 101, 102]);
    expect(schedule.frameCounts).toEqual([
      [100, 2, 0, 2],
      [101, 2, 1, 3],
      [102, 0, 1, 1],
    ]);
    expect(schedule.mons.map((entry) => ({
      entryFrame: entry.entryFrame,
      entryRngValue: entry.entryRngValue,
      attempts: entry.attempts,
      personality: entry.personality,
    }))).toEqual([
      { entryFrame: 100, entryRngValue: startCursor, attempts: 1, personality: first.value },
      { entryFrame: 101, entryRngValue: afterFirstAmbient, attempts: 1, personality: second.value },
    ]);
    expect(ambientCursors).toEqual([
      afterFirstAmbient,
      advanceRngValue(second.rngValue),
    ]);
    expect(schedule.end.rngValue).toBe(advanceRngValue(second.rngValue));
    expect(schedule.end.frame).toBe(102);
    expect(schedule.events.every((event, index) => (
      index === 0 || event.preCursor === schedule.events[index - 1]!.postCursor
    ))).toBe(true);
  });

  it("keeps the old clean-stream construction result separately expressible", () => {
    for (const entry of receipt.cases) {
      const mons = entry.sourceSetIds.map((setId) => (
        factoryMonConstructionInputFromSet(setId, entry.sourceFunction)
      ));
      const clean = scheduleFactoryConstructionCleanStream({
        sourceFunction: entry.sourceFunction,
        mons,
        clock: {
          start: { frame: 0, cycle: 0, rngValue: entry.epoch.startCursor },
          cycleCost: () => 0,
        },
      });
      expect(clean.ambientEnabled).toBe(false);
      expect(clean.events.every((event) => event.tag === "construction")).toBe(true);
      expect(clean.events).toHaveLength(clean.mons.reduce(
        (sum, result) => sum + result.constructionDraws,
        0,
      ));

      let directCursor = entry.epoch.startCursor;
      for (const [index, input] of mons.entries()) {
        const expectedEntryCursor = directCursor;
        const direct = rollPersonalityForNature(directCursor, input.nature);
        directCursor = direct.rngValue;
        expect(clean.mons[index]!.entryRngValue).toBe(expectedEntryCursor);
        expect(clean.mons[index]!.personality).toBe(direct.personality);
      }
      expect(clean.end.rngValue).toBe(directCursor);

      // The first mon has no preceding VBlank interrupt, so the clean stream
      // and the receipt share its exact entry cursor/personality. Later
      // receipt mons intentionally need the missing clock phase/budget.
      expect(clean.mons[0]!.entryRngValue).toBe(entry.monBoundaries[0]!.startCursor);
      expect(clean.mons[0]!.personality).toBe(entry.monBoundaries[0]!.acceptedPersonality);
    }
  });

  it("does not pretend the v1 receipts identify a live source-general clock", () => {
    expect(REQUIRED_FACTORY_CONSTRUCTION_CLOCK_EVIDENCE).toEqual([
      "initial master-cycle phase at the first construction Random() call",
      "source-operation cycle budget for each CreateMonWithEVSpreadNatureOTID phase",
      "VBlank/ambient callback cycle cost and ordering at a crossed period",
    ]);
    for (const entry of receipt.cases) {
      expect(entry.epoch).not.toHaveProperty("cyclePhase");
      expect(entry.sequence.every((event) => event.length === 8)).toBe(true);
      expect(entry.sequence.some((event) => event.some((value) => value === "globalCycles"))).toBe(false);
    }
    expect(GBA_VBLANK_CYCLES).toBe(280_896);
  });
});
