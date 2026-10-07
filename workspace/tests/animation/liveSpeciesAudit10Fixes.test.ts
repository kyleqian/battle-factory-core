import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Species audit 10 (docs/live-species-audit-10.md) fixes. Receipts: d4aTimingCheck.ts (production live view vs 2 fresh direct-mGBA runs per window).
const DIR = "tools/integration/fixtures/s10a-p0";
type Receipt = { fixture: string; selectedPhase: boolean; window: number; expectedDuration: number; violations: string[];
  runs: { residualPixels: number; digest: string; affectedAges: number[] }[] };
const receipts = (sub: string): Record<string, Receipt> => Object.fromEntries(readdirSync(`${DIR}/${sub}`).filter((n) => n.endsWith(".json"))
  .map((n) => [n.replace(/\.json$/, ""), (JSON.parse(readFileSync(`${DIR}/${sub}/${n}`, "utf8")) as Receipt[])[0]!]));

describe("Extrasensory (326): the clone carries the attacker's idle rest (CloneBattlerSpriteWithBlend copies x2 / y2)", () => {
  const r = receipts("extrasensory-clone-rest");
  it("RATTATA opponent attacker (audit 10 SPECIES-DEFECT, 8,009 px before) is exact twice fresh", () => {
    const x = r["rattataA-extrasensory-opponent-nuzleaf-player-shuckle"]!;
    expect([x.selectedPhase, x.violations, x.runs.map((run) => run.residualPixels), x.window, x.expectedDuration]).toEqual([true, [], [0, 0], 161, 161]);
    expect(x.runs[1]!.digest).toBe(x.runs[0]!.digest);
  });
  it("ONIX opponent attacker (lag-event window) is left with the documented other-phase ages 143..158 only", () => {
    const x = r["onixA-extrasensory-opponent-nuzleaf-player-shuckle"]!;
    expect([x.selectedPhase, x.violations, x.runs.map((run) => run.residualPixels)]).toEqual([false, [], [293216, 293216]]);
    expect(x.runs[0]!.affectedAges).toEqual(Array.from({ length: 16 }, (_, i) => 143 + i));
  });
  it("no regression on the six d4a-live windows (policy phase 0 px; other phase = the d4c receipt)", () => {
    const d4c = (JSON.parse(readFileSync("tools/integration/fixtures/d4c-live-receipt.json", "utf8")).windows as Receipt[])
      .filter((w) => w.fixture.includes("/extrasensory-"));
    expect(d4c).toHaveLength(6);
    for (const old of d4c) {
      const now = r[old.fixture.split("/").pop()!.replace(/\.json$/, "")]!;
      expect(now.violations).toEqual([]);
      expect(now.runs.map((run) => run.residualPixels)).toEqual(old.runs.map((run) => run.residualPixels));
      expect(now.runs[0]!.affectedAges).toEqual(old.runs[0]!.affectedAges);
    }
  });
});

describe("Spit Up (255): the idle-rest gate is the target rest only (species audit 10 gate lift)", () => {
  const r = receipts("spit-up-attacker-rest");
  it("ONIX / RATTATA opponent attackers (counters 1 and 3; 168,172 / 60,826 px fallback before) are exact twice fresh, as are the player-side rows", () => {
    for (const stem of ["onixA-spit-up-opponent-1", "onixA-spit-up-opponent-3", "rattataA-spit-up-opponent-1", "rattataA-spit-up-opponent-3",
      "onixA-spit-up-player-1", "rattataA-spit-up-player-1", "rattata-spit-up-opponent-1", "rattata-spit-up-opponent-3"]) {
      const x = r[stem]!;
      expect([stem, x.violations, x.runs.map((run) => run.residualPixels), x.window === x.expectedDuration]).toEqual([stem, [], [0, 0], true]);
      expect(x.runs[1]!.digest).toBe(x.runs[0]!.digest);
    }
  });
  it("the s10a-live accepted / alternate windows (12) stay exact", () => {
    const live = Object.keys(r).filter((k) => k.startsWith("spit-up-"));
    expect(live).toHaveLength(12);
    for (const k of live) expect(r[k]!.runs.map((run) => run.residualPixels)).toEqual([0, 0]);
  });
  it("an opponent-side RATTATA target still declines (fallback residual = the audit's 164,894 / 168,357 px)", () => {
    expect(r["rattata-spit-up-player-1"]!.runs.map((run) => run.residualPixels)).toEqual([164894, 164894]);
    expect(r["rattata-spit-up-player-3"]!.runs.map((run) => run.residualPixels)).toEqual([168357, 168357]);
  });
});
