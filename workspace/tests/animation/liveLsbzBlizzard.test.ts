import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_MOVE_TIMING_POLICY } from "../../src/engine/liveMoveTimingPolicy.ts";
import { blizzardImpactStartAge } from "../../src/animation/blizzard.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// S10A lsbz (B) (ISSUES #152 "Blizzard (59) opponent pairs whose impact-start age is not 197"): the live window is
// blizzardImpactStartAge(side, geometry) + 164 rows (liveMoveAnimation.ts liveBlizzardDuration). Grid + predictions
// tools/integration/fixtures/lsbz/blizzard-grid-predictions.json (committed before any probe); fresh counters
// tools/integration/fixtures/lsbz/blizzard-counters.json (d4tailsCounters.sh, r0 == r1); dense windows
// tools/integration/fixtures/lsbz/windows/blizzard-*; receipt tools/integration/fixtures/lsbz-live-receipt.json.
const root = join(import.meta.dirname, "../..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
type Prediction = { counterBodyRowsWithLag: number; counterBodyRowsWithoutLag: number; lagAgesWithLag: number[]; lagAgesWithoutLag: number[]; liveWindowRows: number };
const grid = read("tools/integration/fixtures/lsbz/blizzard-grid-predictions.json") as {
  impactDistribution: Record<"player" | "opponent", Record<string, number>>;
  grid: { attacker: string; target: string; geometry: { attackerCenter: { x: number; y: number }; targetCenter: { x: number; y: number } }; impactStartAge: number; prediction: Prediction }[];
};
const counters = read("tools/integration/fixtures/lsbz/blizzard-counters.json") as { scenario: string; r0EqualsR1: boolean;
  bodies: { move: string; activation: number; bodyRows: number; lagAges: number[] }[] }[];
const receipt = read("tools/integration/fixtures/lsbz-live-receipt.json");
const status = read("docs/animation-integration-live-status.json");
const caseOf = (g: { attacker: string; target: string }) => `blizzard-opponent-${g.attacker.toLowerCase()}-${g.target.toLowerCase()}`;
const ages = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
type Window = { fixture: string; move: string; side: string; measuredPhase: string; selectedPhase: boolean; rows: number; expectedDuration: number;
  px: number[]; affectedAges: number[]; digestsIdentical: boolean; violations: string[] };
const windows = (receipt.windows as Window[]).filter((w) => w.move === "BLIZZARD");

describe("lsbz: Blizzard (59) live window = geometry-derived impact start + 164", () => {
  it("covers impact 194..206 on the opponent side; every player geometry is impact 208 (372 rows unchanged)", () => {
    expect(Object.keys(grid.impactDistribution.player)).toEqual(["208"]);
    expect(Object.keys(grid.impactDistribution.opponent).map(Number)).toEqual(ages(194, 206));
    expect([...new Set(grid.grid.map((g) => g.impactStartAge))]).toEqual(ages(194, 206));
    for (const g of grid.grid) expect(blizzardImpactStartAge("opponent", g.geometry), caseOf(g)).toBe(g.impactStartAge);
  });

  it("the production duration from the displayed field equals impact + 164 = the prediction on every staged grid pair", () => {
    let staged = 0;
    for (const g of grid.grid) {
      let f: Fixture;
      try { f = read(`tools/integration/fixtures/lsbz/blizzard/${caseOf(g)}.json`) as Fixture; } catch { continue; }
      staged++;
      const view = liveView(f, 0);
      const request = (view.effect as unknown as { request: BattleMoveAnimationRequest }).request;
      expect([liveMoveAnimationDuration(request, view.field), g.prediction.liveWindowRows], caseOf(g)).toEqual([g.impactStartAge + 164, g.impactStartAge + 164]);
      expect(liveMoveAnimationPresentation(request, view.field, 0), caseOf(g)).not.toBeNull();
    }
    expect(staged).toBe(24); // BALTOY -> HUNTAIL: the activation probe crashed (exit 139), not staged
  });

  it("fresh counters (twice, identical) match the predicted shape on all 24 pairs: lag 16, none 8", () => {
    let lag = 0, none = 0;
    for (const c of counters) {
      const g = grid.grid.find((x) => c.scenario.endsWith(`/${caseOf(x)}.json`))!;
      const [b] = c.bodies;
      expect([c.r0EqualsR1, c.bodies.length], c.scenario).toEqual([true, 1]);
      if (b!.lagAges.length === 3) { lag++; expect([b!.bodyRows, b!.lagAges], c.scenario).toEqual([g.prediction.counterBodyRowsWithLag, g.prediction.lagAgesWithLag]); }
      else { none++; expect([b!.bodyRows, b!.lagAges], c.scenario).toEqual([g.prediction.counterBodyRowsWithoutLag, g.prediction.lagAgesWithoutLag]); }
    }
    expect([counters.length, lag, none]).toEqual([24, 16, 8]);
    expect(LIVE_MOVE_TIMING_POLICY[59]!.parameters[1]).toMatchObject({ side: "opponent", chosen: "event",
      alternatives: [{ phase: "event", measured: 21 }, { phase: "no-event", measured: 9 }] });
  });

  it("dense windows twice fresh: 17 lag windows 0 px at impact + 164 rows, 8 no-lag windows only on impact + 141 .. + 156", () => {
    expect(windows).toHaveLength(25);
    const documented = status.faithfulTimingAdapters.find((x: { id: number }) => x.id === 59).alternatePhaseResidual.windows as Record<string, { ages: number[] }>;
    for (const w of windows) {
      const fx = read(w.fixture) as { impactStartAge: number };
      const tag = w.fixture.split("/").pop()!.replace(/\.json$/, "");
      expect([w.side, w.digestsIdentical, w.violations, w.px.length], w.fixture).toEqual(["opponent", true, [], 4]);
      expect(w.selectedPhase, w.fixture).toBe(w.measuredPhase === "event");
      if (w.selectedPhase) expect([w.px, w.rows, w.expectedDuration], w.fixture).toEqual([[0, 0, 0, 0], fx.impactStartAge + 164, fx.impactStartAge + 164]);
      else {
        expect([w.rows, w.expectedDuration], w.fixture).toEqual([fx.impactStartAge + 163, fx.impactStartAge + 164]);
        expect(w.affectedAges, w.fixture).toEqual(ages(fx.impactStartAge + 141, fx.impactStartAge + 156));
        expect(documented[tag]!.ages, w.fixture).toEqual(w.affectedAges);
      }
    }
    expect([windows.filter((w) => w.selectedPhase).length, windows.filter((w) => !w.selectedPhase).length]).toEqual([17, 8]);
    // The impact-197 grid pairs keep the accepted 361-row window.
    expect(windows.filter((w) => w.rows === 361).map((w) => w.fixture.split("/").pop()).sort()).toEqual([
      "blizzard-opponent-absol-ariados.json", "blizzard-opponent-aggron-aron.json"]);
  });
});
