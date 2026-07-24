import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import trainersData from "../src/data/gen/battle-frontier-trainers.json" with { type: "json" };
import monsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };

type SpeechWord = { source: string; text: string | null };
type Trainer = {
  id: number;
  sourceId: string;
  facilityClass: { source: string; id: number };
  name: string;
  speeches: Record<"speechBefore" | "speechWin" | "speechLose", SpeechWord[]>;
  monSet: { eligibleMonSetIds: number[]; eligibleMonSetLabels: string[]; level50EligibleIds: number[] };
  aiFlags: string[];
};

const corpus = trainersData as { count: number; level50: { maximumEligibleMonSetId: number; eligibleMonSetCount: number }; sourceStruct: { aiFields: string[] }; entries: Trainer[] };
const mons = monsData as { count: number; entries: Array<{ index: number; label: string }> };

describe("Battle Frontier trainer corpus extraction", () => {
  it("reproduces the committed artifact byte-for-byte", () => {
    const before = readFileSync("src/data/gen/battle-frontier-trainers.json", "utf8");
    execFileSync("node", ["--experimental-strip-types", "tools/extract/extract-battle-frontier-trainers.ts"], { stdio: "pipe" });
    expect(readFileSync("src/data/gen/battle-frontier-trainers.json", "utf8")).toBe(before);
  });

  it("enumerates every ordinary source trainer in numeric index order", () => {
    expect(corpus.count).toBe(300);
    expect(corpus.entries).toHaveLength(300);
    for (const [id, trainer] of corpus.entries.entries()) {
      expect(trainer.id).toBe(id);
      expect(trainer.sourceId).toMatch(/^FRONTIER_TRAINER_[A-Z0-9_]+$/);
      expect(trainer.facilityClass.source).toMatch(/^FACILITY_CLASS_[A-Z0-9_]+$/);
      expect(trainer.facilityClass.id).toBeGreaterThanOrEqual(0);
      expect(trainer.name).toMatch(/^[A-Z]+$/);
      expect(trainer.aiFlags).toEqual([]);
      for (const speech of Object.values(trainer.speeches)) {
        expect(speech).toHaveLength(6);
        for (const word of speech) {
          expect(word.source).toMatch(/^EC_(?:WORD_[A-Z0-9_]+|MOVE2?\([A-Z0-9_]+\)|POKEMON(?:_NATIONAL)?\([A-Z0-9_]+\)|EMPTY_WORD)$/);
          if (word.source !== "EC_EMPTY_WORD") expect(word.text).toEqual(expect.any(String));
        }
      }
    }
    expect(corpus.sourceStruct.aiFields).toEqual([]);
  });

  it("only references extracted Frontier mon sets and preserves the Level-50 boundary", () => {
    expect(mons.count).toBe(882);
    expect(corpus.level50).toEqual({ maximumEligibleMonSetId: 849, eligibleMonSetCount: 850, source: "FRONTIER_MONS_HIGH_TIER" });
    const known = new Map(mons.entries.map((mon) => [mon.index, mon.label]));
    for (const trainer of corpus.entries) {
      expect(trainer.monSet.eligibleMonSetIds).not.toHaveLength(0);
      expect(trainer.monSet.eligibleMonSetIds).toHaveLength(trainer.monSet.eligibleMonSetLabels.length);
      expect(trainer.monSet.level50EligibleIds).toEqual(trainer.monSet.eligibleMonSetIds.filter((id) => id <= 849));
      for (const [i, id] of trainer.monSet.eligibleMonSetIds.entries()) {
        expect(known.get(id)).toBe(trainer.monSet.eligibleMonSetLabels[i]);
        expect(id).toBeGreaterThanOrEqual(0);
        expect(id).toBeLessThan(mons.count);
      }
    }
  });
});
