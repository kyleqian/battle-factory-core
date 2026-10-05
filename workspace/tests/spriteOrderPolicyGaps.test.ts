import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { run } from "../tools/integration/spriteOrderPolicyGapsReplay.ts";
import { prep7Replay } from "../tools/integration/prep7Replay.ts";

// docs/sprite-order-policy-gaps.md: ROM event streams (two-run-identical direct-mGBA probes, fixtures/sprite-order-policy-gaps/events) replayed through the PURE transform.
const receipt = run() as any;
const read = (rel: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/sprite-order-policy-gaps/${rel}`, import.meta.url), "utf8"));

describe("sprite-order policy gaps (S10A)", () => {
  it("Q1: stat-stage-change is no transform; the STATS_CHANGE animation after the move body is the stat plan (0 mismatches)", () => {
    const q1 = receipt.q1;
    expect(q1["proposed (production table)"].total).toMatchObject({ edges: 29, known: 29, exact: 29, mismatch: 0 }); // was 20/20 before the 283/313 rows entered the production table
    expect(q1["proposed + Fake Tears relative-y plan"].total).toMatchObject({ edges: 29, known: 29, exact: 29, mismatch: 0 });
    // controls: the leading stat command invalidating the order loses it; applying the stat plan before the body is wrong
    expect(q1["control: stat command invalidates"].total.known).toBeLessThan(5);
    expect(q1["control: stat plan applied before the body"].total.mismatch).toBeGreaterThanOrEqual(10);
  });

  it("Q2: battle-start Intimidate = pre-prompt entry state + stat plan + the ordinary prompt cycle, 12/12 corpus scenarios", () => {
    const q2 = receipt.q2;
    expect(q2.scenarios).toBe(12);
    expect(q2.preEqualsObservedAtIntimidateEdge).toBe(true);
    expect(q2.promptOnPreEqualsKnownEntryConstant).toBe(true);
    expect(q2.proposed).toEqual({ edges: 24, exact: 24, mismatch: 0 });
    expect(q2.controlConstantSeed.mismatch).toBe(12);
  });

  it("Q3: the Endeavor plan keeps the lab order exact and extends the strict real-route replay with 0 mismatches", () => {
    expect(receipt.q3Lab["with Endeavor plan"]).toMatchObject({ edges: 10, known: 10, exact: 10, mismatch: 0 });
    for (const row of receipt.q3RealRoute) {
      expect(row.copyMatchesOriginal).toBe(true);
      expect(row.withEndeavor.mismatch).toBe(0);
      // 283:opponent is in the production table now: the no-override baseline already knows what the override adds.
      expect(row.withEndeavor.known).toBeGreaterThanOrEqual(row.copyNoOverride.known);
      expect(row.firstInvalidationBaseline.key).toMatch(/^uncovered: (RunTurnActionsFunctions|HandleTurnActionSelectionState)$/);
    }
    expect(receipt.q3RealRoute.map((row: any) => row.withEndeavor.known)).toEqual([12, 12, 5, 12, 12]);
  });

  it("source census: statbuffchange precedes attackanimation in both generic stat scripts", () => {
    const stat = read("stat-moves.json");
    expect(stat.counts).toEqual({ statUp: 15, statDown: 16 });
    expect(stat.coverage.MOVE_DOUBLE_TEAM.productionBody).toEqual({ player: true, opponent: true });
    expect(stat.coverage.MOVE_FAKE_TEARS.productionBody).toEqual({ player: false, opponent: false });
  });

  it("engine HEAD keeps the order known through the leading `stat` command of a first-body Double Team / Fake Tears", () => {
    for (const [seed, moveId] of [[329, 104], [28, 313]] as const) {
      const rep: any = prep7Replay(seed, "on", [0], 0, true);
      const request = rep.requests.find((r: any) => r.attacker === 1 && r.moveId === moveId);
      expect(request.orderInput?.known).toBe(true);
      const kinds = rep.semanticEvents.slice(0, 5).map((s: any) => s.event.payload.kind);
      expect(kinds.indexOf("stat-stage-change")).toBeLessThan(kinds.indexOf("animation"));
    }
  }, 120000);
});
