import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, liveMoveTimingBodyRows,
} from "../../src/engine/liveMoveTimingPolicy.ts";

// d4w (S10A, docs/next-adapters-prep41.md s1 / s2): Pursuit later bodies and Hidden Power (Unown) reclassified to faithful timing.
const root = join(import.meta.dirname, "../..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const status = read("docs/animation-integration-live-status.json");
const receipt = read("tools/integration/fixtures/d4w-live-receipt.json") as {
  sections: Record<string, { ok: boolean; windows: number; policyPhaseWindows: number; policyPhaseZeroPx: number;
    table: { fixture: string; measuredPhase: string; selectedPhase: boolean; rows: number; duration: number; px: number[];
      affectedAges: string; digestsIdentical: boolean; violations: string[] }[] }>;
};
const request = (moveId: number, turn = 0) => ({ moveId, attacker: 0, target: 1, turn } as unknown as BattleMoveAnimationRequest);

describe("d4w: Pursuit (228) optional lag at 82", () => {
  it("is a faithful-timing entry with the measured 24 : 9 counts and the lag phase (103 rows)", () => {
    const [p] = LIVE_MOVE_TIMING_POLICY[228]!.parameters;
    expect(p).toMatchObject({ kind: "optional-lag-age", age: 82, fixedLagAges: [60, 61], iterations: 100, chosen: "event", tieRuleUsed: false });
    expect(p!.alternatives).toEqual([{ phase: "event", bodyRows: 103, measured: 24 }, { phase: "no-event", bodyRows: 102, measured: 9 }]);
    expect(liveMoveTimingBodyRows(228)).toBe(103);
    expect(liveMoveAnimationDuration(request(228))).toBe(103);
    expect(liveMoveAnimationDuration(request(228, 1))).toBeNull();
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(228);
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(228);
  });

  it("proves first, later and own-Pursuit-predecessor (turn-2) bodies through the production renderer, twice fresh", () => {
    const s = receipt.sections.pursuit!;
    expect(s.ok).toBe(true);
    expect([s.windows, s.policyPhaseWindows, s.policyPhaseZeroPx]).toEqual([33, 24, 24]);
    for (const w of s.table) {
      expect(w.digestsIdentical && w.violations.length === 0, w.fixture).toBe(true);
      if (w.selectedPhase) expect([w.px, w.rows, w.duration], w.fixture).toEqual([[0, 0, 0, 0], 103, 103]);
      else expect([w.measuredPhase, w.rows, w.affectedAges], w.fixture).toEqual(["no-event", 102, "84..99 (16)"]);
    }
    // The second Pursuit body after the attacker's own earlier Pursuit (lb26 turn 2): 9 lag (0 px) : 3 no lag (ages 84..99 only).
    const body2 = s.table.filter((w) => w.fixture.includes("pursuit-lb26b2-"));
    expect(body2).toHaveLength(12);
    expect(body2.filter((w) => w.selectedPhase && w.px.every((px) => px === 0))).toHaveLength(9);
    for (const w of body2) {
      const fx = read(w.fixture);
      expect(fx.precedingBodies.filter((u: { moveId: number }) => u.moveId === 228)).toHaveLength(1);
    }
  });

  it("documents the other-phase residual rows in the live status", () => {
    const e = status.faithfulTimingAdapters.find((x: { id: number }) => x.id === 228);
    expect(e.alternatePhaseResidual.ages).toEqual(Array.from({ length: 16 }, (_, i) => 84 + i));
    expect(e.alternatePhaseResidual.maxPixelsPerRow).toBe(18116);
    expect(status.implementedAdapters.some((x: { id: number }) => x.id === 228)).toBe(false);
  });
});

describe("d4w: Hidden Power (237, Unown) optional lag at 64", () => {
  it("is a faithful-timing entry with the measured 1 : 9 counts and the no-lag phase (180 rows)", () => {
    const [p] = LIVE_MOVE_TIMING_POLICY[237]!.parameters;
    expect(p).toMatchObject({ kind: "optional-lag-age", age: 64, fixedLagAges: [118], iterations: 179, chosen: "no-event", tieRuleUsed: false });
    expect(p!.alternatives).toEqual([{ phase: "event", bodyRows: 181, measured: 1 }, { phase: "no-event", bodyRows: 180, measured: 9 }]);
    expect(liveMoveAnimationDuration(request(237))).toBe(180);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(237);
    expect(LIVE_MOVE_ANIMATION_IDS).not.toContain(237);
  });

  it("proves the Unown windows twice fresh: 9 policy-phase 0 px, the GOLBAT lag window on ages 65..179 only", () => {
    const s = receipt.sections["hidden-power"]!;
    expect(s.ok).toBe(true);
    expect([s.windows, s.policyPhaseWindows, s.policyPhaseZeroPx]).toEqual([10, 9, 9]);
    const other = s.table.filter((w) => !w.selectedPhase);
    expect(other.map((w) => [w.fixture.split("/").pop(), w.rows, w.px, w.affectedAges])).toEqual([
      ["hp-golbat-hidden-power-player-unown-opponent-onix.json", 181, [72040, 72040, 72040, 72040], "65..179 (84)"]]);
    const e = status.faithfulTimingAdapters.find((x: { id: number }) => x.id === 237);
    expect(e.alternatePhaseResidual.ages).toEqual(Array.from({ length: 115 }, (_, i) => 65 + i));
  });
});

describe("d4w: ISSUES #152 quick wins (species audit 12) through the production renderer", () => {
  type Dense = { fixture: string; rows: number; residualPixels: number; identical: boolean; badRows: [number, number, number, number, number][] };
  const dense = (stem: string) => read(`tools/integration/fixtures/d4w-152/${stem}.json`) as Dense;
  const stems = readFileSync(join(root, "tools/integration/fixtures/d4w-152/summary.txt"), "utf8").trim().split("\n").map((l) => l.split(" ")[0]!);
  it("Flatter: every window (elevated FLYGON / GOLBAT / SHEDINJA / WEEZING either role, accepted, alternates) 219/219 rows 0 px, 2 fresh runs identical", () => {
    const flatter = stems.filter((s) => s.includes("flatter"));
    expect(flatter).toHaveLength(26);
    for (const s of flatter) expect([s, dense(s).rows, dense(s).residualPixels, dense(s).identical]).toEqual([s, 219, 0, true]);
  });
  it("Skill Swap: ONIX / RATTATA idle-rest windows engage; policy phase 0 px, no-lag windows only on 177..192 with the documented max 18,778 px/row", () => {
    const swap = stems.filter((s) => s.includes("skill-swap"));
    expect(swap).toHaveLength(15);
    const residual = status.faithfulTimingAdapters.find((x: { id: number }) => x.id === 285).alternatePhaseResidual;
    let max = 0;
    for (const s of swap) {
      const d = dense(s);
      expect(d.identical).toBe(true);
      if (d.rows === 196) expect([s, d.residualPixels]).toEqual([s, 0]);
      else for (const [age, , px] of d.badRows) { expect(residual.ages).toContain(age); max = Math.max(max, px); }
    }
    expect([max, residual.maxPixelsPerRow]).toEqual([18778, 18778]);
  });
});
