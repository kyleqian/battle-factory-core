import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import policy from "../src/data/gen/factory-round-policy.json" with { type: "json" };

describe("factory round-policy extraction", () => {
  it("pins the seven-battle policy constants and source range boundaries", () => {
    expect(policy.schema).toBe("factory-round-policy/v1");
    expect(policy.constants).toMatchObject({ stagesPerChallenge: 7, partySize: 3, selectableMons: 6, maxStreak: 9999 });
    expect(policy.constants.trainerHistory).toEqual({ capacity: 20, writeBattleIndexes: [0, 1, 2, 3, 4, 5], omitFinalBattleIndex: 6 });
    expect(policy.trainerSelection.normalRanges[0]).toMatchObject({ start: 0, end: 99 });
    expect(policy.trainerSelection.hardRanges[0]).toMatchObject({ start: 100, end: 119 });
    expect(policy.rentalSelection).toMatchObject({ highTierLastIndex: 849, monCount: 882, betterRangeOffset: 1, maximumRentalRank: 5 });
    expect(policy.rentalSelection.rentalRankThresholds).toEqual([15, 22, 29, 36, 43]);
    expect(policy.rentalSelection.fixedIvs).toEqual([
      { regular: 3, lastBattle: 6 }, { regular: 6, lastBattle: 9 }, { regular: 9, lastBattle: 12 }, { regular: 12, lastBattle: 15 },
      { regular: 15, lastBattle: 18 }, { regular: 21, lastBattle: 31 }, { regular: 31, lastBattle: 31 }, { regular: 31, lastBattle: 31 },
    ]);
  });

  it("reproduces the committed policy artifact byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-round-policy-"));
    const output = join(directory, "policy.json");
    try {
      execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-factory-round-policy.ts", "--out", output], { stdio: "pipe" });
      expect(readFileSync(output)).toEqual(readFileSync("src/data/gen/factory-round-policy.json"));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
