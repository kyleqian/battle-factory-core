import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Tag = "construction" | "ambient";
type Half = "low" | "high";
type Event = [Tag, number, string, number, number, number | null, number | null, Half | null];
type FrameCount = [number, number, number, number];

interface MonBoundary {
  monIndex: number;
  setId: number;
  targetNature: number;
  attempts: number;
  constructionDraws: number;
  acceptedPersonality: number;
  firstSequenceIndex: number;
  lastSequenceIndex: number;
  firstFrame: number;
  lastFrame: number;
  startCursor: number;
  endCursor: number;
}

interface ConstructionCase {
  case: string;
  sourceFunction: string;
  sourceSetIds: number[];
  epoch: {
    startFrame: number;
    endFrame: number;
    startCursor: number;
    endCursor: number;
  };
  sequence: Event[];
  frameCounts: FrameCount[];
  monBoundaries: MonBoundary[];
  totals: { construction: number; ambient: number; total: number };
  repeatability: {
    runs: number;
    byteIdentical: boolean;
    rawProbeSha256: string[];
  };
}

const receipt = JSON.parse(
  readFileSync("tests/fixtures/factory-construction-rng-schedule-evidence.json", "utf8"),
) as {
  schema: string;
  oracleProfile: string;
  cases: ConstructionCase[];
  designVerdict: {
    smallestGenericContract: string;
    productionBoundary: string;
  };
};

function advanceRng(value: number): number {
  return (Math.imul(value, 1_103_515_245) + 24_691) >>> 0;
}

function personalityFromPair(low: Event, high: Event): number {
  return ((high[4] >>> 16) * 65_536 + (low[4] >>> 16)) >>> 0;
}

describe("Factory construction RNG schedule receipt (ISSUES #55)", () => {
  it("is an OFF-profile, twice-fresh, three-case evidence packet", () => {
    expect(receipt.schema).toBe("factory-construction-rng-schedule-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.cases.map((entry) => entry.case)).toEqual([
      "anchor",
      "liliana",
      "factory-varied",
    ]);
    for (const entry of receipt.cases) {
      expect(entry.repeatability.runs).toBe(2);
      expect(entry.repeatability.byteIdentical).toBe(true);
      expect(entry.repeatability.rawProbeSha256).toHaveLength(2);
      expect(entry.repeatability.rawProbeSha256[0]).toBe(entry.repeatability.rawProbeSha256[1]);
    }
  });

  for (const entry of receipt.cases) {
    describe(entry.case, () => {
      it("replays every tagged LCG edge from the exact entry cursor to return cursor", () => {
        const { sequence, epoch } = entry;
        expect(sequence.length).toBe(entry.totals.total);
        expect(sequence[0]![3]).toBe(epoch.startCursor);
        expect(sequence.at(-1)![4]).toBe(epoch.endCursor);
        for (let index = 0; index < sequence.length; index += 1) {
          const event = sequence[index]!;
          expect(event[0] === "construction" || event[0] === "ambient").toBe(true);
          expect(event[4]).toBe(advanceRng(event[3]));
          expect(event[2]).toContain(event[0] === "construction"
            ? "CreateMonWithEVSpreadNatureOTID"
            : "VBlankIntr");
          if (index > 0) expect(event[3]).toBe(sequence[index - 1]![4]);
        }
      });

      it("regenerates per-frame totals and preserves every empty/intervening frame", () => {
        const expectedFrames = entry.epoch.endFrame - entry.epoch.startFrame + 1;
        expect(entry.frameCounts).toHaveLength(expectedFrames);
        const derived = new Map<number, [number, number]>();
        for (const event of entry.sequence) {
          const counts = derived.get(event[1]) ?? [0, 0];
          counts[event[0] === "construction" ? 0 : 1] += 1;
          derived.set(event[1], counts);
        }
        entry.frameCounts.forEach(([frame, construction, ambient, total], index) => {
          expect(frame).toBe(entry.epoch.startFrame + index);
          const [derivedConstruction, derivedAmbient] = derived.get(frame) ?? [0, 0];
          expect([construction, ambient, total]).toEqual([
            derivedConstruction,
            derivedAmbient,
            derivedConstruction + derivedAmbient,
          ]);
        });
      });

      it("regenerates every nature-rejection mon boundary from construction pairs", () => {
        const construction = entry.sequence.filter((event) => event[0] === "construction");
        expect(construction).toHaveLength(entry.totals.construction);
        expect(construction.length % 2).toBe(0);
        for (const boundary of entry.monBoundaries) {
          const first = entry.sequence[boundary.firstSequenceIndex]!;
          const last = entry.sequence[boundary.lastSequenceIndex]!;
          expect(first[0]).toBe("construction");
          expect(last[0]).toBe("construction");
          expect(first[5]).toBe(boundary.monIndex);
          expect(last[5]).toBe(boundary.monIndex);
          expect(first[1]).toBe(boundary.firstFrame);
          expect(last[1]).toBe(boundary.lastFrame);
          expect(first[3]).toBe(boundary.startCursor);
          expect(last[4]).toBe(boundary.endCursor);
          expect(boundary.constructionDraws).toBe(boundary.attempts * 2);

          const span = entry.sequence.slice(
            boundary.firstSequenceIndex,
            boundary.lastSequenceIndex + 1,
          );
          expect(span.every((event) => event[0] === "construction")).toBe(true);
          expect(span).toHaveLength(boundary.constructionDraws);
          for (let offset = 0; offset < span.length; offset += 2) {
            const low = span[offset]!;
            const high = span[offset + 1]!;
            expect(low[6]).toBe(offset / 2);
            expect(high[6]).toBe(offset / 2);
            expect(low[7]).toBe("low");
            expect(high[7]).toBe("high");
            const personality = personalityFromPair(low, high);
            if (offset + 2 === span.length) {
              expect(personality).toBe(boundary.acceptedPersonality);
              expect(personality % 25).toBe(boundary.targetNature);
            } else {
              expect(personality % 25).not.toBe(boundary.targetNature);
            }
          }
        }
        expect(entry.monBoundaries.reduce((sum, boundary) => sum + boundary.constructionDraws, 0))
          .toBe(entry.totals.construction);
      });
    });
  }

  it("pins the materially different rejection profile and the cycle-clock verdict", () => {
    expect(receipt.cases.map((entry) => entry.monBoundaries.map((boundary) => boundary.attempts))).toEqual([
      [23, 25, 51, 16, 2, 4],
      [13, 7, 36],
      [59, 12, 30],
    ]);
    expect(receipt.designVerdict.smallestGenericContract).toContain("construction clock");
    expect(receipt.designVerdict.smallestGenericContract).toContain("VBlank");
    expect(receipt.designVerdict.smallestGenericContract).toContain("per-mon cursors");
    expect(receipt.designVerdict.productionBoundary).toContain("test-only");
  });
});
