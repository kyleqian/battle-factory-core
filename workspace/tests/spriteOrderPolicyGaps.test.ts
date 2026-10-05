import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { run } from "../tools/integration/spriteOrderPolicyGapsReplay.ts";
import { beginLiveSpriteOrderTurn, seedLiveSpriteOrderHostFromBattleStart, liveSpriteOrderHostOrder } from "../src/engine/liveSpriteOrderHost.ts";
import { knownEntryPrePromptSpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
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

  it("Q2 production seed API: seedLiveSpriteOrderHostFromBattleStart + prompt cycle is 12/12 at the Intimidate edge and 12/12 at the first move edge", () => {
    const rows = read("events/intimidate.json") as { intimidateEdge: { obsF: number[] }; firstMoveEdge: { obsF: number[] }; statArg: number }[];
    const ev = (kind: string, extra: object = {}) => ({ sequence: 0, payload: { kind, ...extra }, provenance: undefined }) as any;
    let atIntimidate = 0, atMove = 0;
    for (const row of rows) {
      const events = [ev("stat-stage-change"), ev("animation", { animationId: "STATS_CHANGE", battler: 1, target: 0, arguments: [String(row.statArg)] }), ev("message")];
      const host = seedLiveSpriteOrderHostFromBattleStart(events);
      // the Intimidate edge is observed at the animation's activation: the pre-prompt state the seed starts from
      const pre = knownEntryPrePromptSpriteOrderState("ordinary-factory");
      if (pre.known && JSON.stringify(pre.free) === JSON.stringify(row.intimidateEdge.obsF) && liveSpriteOrderHostOrder(host).known) atIntimidate += 1;
      const after = liveSpriteOrderHostOrder(beginLiveSpriteOrderTurn(host, 1, true));
      if (after.known && JSON.stringify(after.free) === JSON.stringify(row.firstMoveEdge.obsF)) atMove += 1;
    }
    expect([rows.length, atIntimidate, atMove]).toEqual([12, 12, 12]);
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
