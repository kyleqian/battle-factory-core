import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderProductionBodyPlan,
  spriteOrderStatAnimationPlan, spriteOrderStatusAnimationName, spriteOrderTrackerLend, type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS } from "../src/engine/spriteOrderProductionPlans.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";
import { encodeSpriteOrderPlan, renderSpriteOrderProductionTableFromFixtures } from "../tools/integration/spriteOrderProductionTable.ts";
import { REAL_ROUTE_TRACES, replayCrossBodyTrace } from "../tools/integration/spriteOrderCrossBodyReplay.ts";
import { replayCrossBodyCorpus } from "../tools/integration/spriteOrderCrossBodyCorpusReplay.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/${name}`, import.meta.url), "utf8"));
const known = () => createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
const run = (events: readonly SpriteOrderPresentationEvent[]) =>
  events.reduce((tracker, event) => applySpriteOrderPresentationEvent(tracker, event), known());

describe("production sprite-order plan table (generated, pinned)", () => {
  it("regenerates byte-identically from the evidence JSON", () => {
    const committed = readFileSync(new URL("../src/engine/spriteOrderProductionPlans.ts", import.meta.url), "utf8");
    expect(renderSpriteOrderProductionTableFromFixtures()).toBe(committed);
    expect(Object.keys(SPRITE_ORDER_PRODUCTION_BODIES)).toHaveLength(381);
    expect(SPRITE_ORDER_PRODUCTION_PLANS).toHaveLength(133);
  });

  it("decodes every EXACT-PLAN (move, side) body of the ext table to the fixture plan", () => {
    const bodies = fixture("sprite-order-body-plans-ext.json").bodies as Record<string, { verdict: string; plan: unknown }>;
    let exact = 0;
    for (const [key, row] of Object.entries(bodies)) {
      const [move, side] = key.split(":");
      if (side !== "player" && side !== "opponent") continue;
      const plan = spriteOrderProductionBodyPlan(Number(move), side);
      if (row.verdict !== "EXACT-PLAN" || move === "144" || move === "164") {
        expect(plan, key).toBeNull();
        continue;
      }
      exact += 1;
      expect(plan, key).toEqual(row.plan);
      expect(decodeSpriteOrderPlan(encodeSpriteOrderPlan(row.plan as never))).toEqual(row.plan);
    }
    expect(exact).toBe(379);
  });

  it("stat classes equal every observed per-argument plan; unobserved multiple +-2 refuses", () => {
    const anims = fixture("sprite-order-gap-causes.json").midBattleAnimations.anims as Record<string, { verdict: string; plan: unknown; args: string[] }>;
    for (const [key, row] of Object.entries(anims)) {
      if (!key.startsWith("General:B_ANIM_STATS_CHANGE[")) continue;
      for (const arg of row.args) expect(spriteOrderStatAnimationPlan(Number(arg)), key).toEqual(row.plan);
    }
    expect(spriteOrderStatAnimationPlan(56)).toBeNull();
    expect(spriteOrderStatAnimationPlan(58)).toBeNull();
    expect(spriteOrderStatAnimationPlan(0)).toBeNull();
  });
});

describe("sprite-order presentation-event transform", () => {
  it("prompt cycle is the bounce pair: idempotent at the known entry, move menu is a no-op", () => {
    const after = run([{ kind: "action-prompt" }, { kind: "move-menu" }, { kind: "action-prompt" }, { kind: "actions-committed" }]);
    expect(after.cursor.order.free).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    expect(spriteOrderTrackerLend(after)).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    const open = run([{ kind: "action-prompt" }]);
    expect(open.promptPair).toEqual([3, 4]);
    expect(spriteOrderTrackerLend(open)).toBeNull();
    expect(run([{ kind: "actions-committed" }]).cursor.order.known).toBe(false);
  });

  it("blip and +-1 stat move the lowest free slot to the head; +-2 carries its destroy", () => {
    const head = [3, ...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER.filter(slot => slot !== 3)];
    expect(run([{ kind: "hit-animation", targetVisible: true }]).cursor.order.free).toEqual(head);
    expect(run([{ kind: "stat-animation", argument: 22 }]).cursor.order.free).toEqual(head);
    const plus2 = run([{ kind: "stat-animation", argument: 39 }]);
    expect(plus2.cursor.order.free).toEqual(head);
    expect(plus2.cursor.occupied).toEqual(known().cursor.occupied);
  });

  it("refuses everything the evidence does not model", () => {
    for (const event of [
      { kind: "hit-animation", targetVisible: false },
      { kind: "move-animation", moveId: 283, attackerSide: "opponent" },
      { kind: "move-animation", moveId: 288, attackerSide: "player" },
      { kind: "move-animation", moveId: 164, attackerSide: "player" },
      { kind: "status-animation", status: "CONFUSION" },
      { kind: "status-animation", status: "BRN" },
      { kind: "general-animation", animation: "HAIL_CONTINUES" },
      { kind: "general-animation", animation: "STATUS_SLP" },
      { kind: "invalidate", reason: "faint" },
    ] as const) {
      const after = run([event]);
      expect(after.cursor.order.known, JSON.stringify(event)).toBe(false);
      expect(spriteOrderTrackerLend(after)).toBeNull();
      expect(applySpriteOrderPresentationEvent(after, { kind: "action-prompt" }).cursor.order.known).toBe(false);
    }
  });

  it("applies EXACT bodies exactly like the plan applier and keeps the known-entry occupancy", () => {
    const tracker = run([{ kind: "move-animation", moveId: 104, attackerSide: "opponent" }]);
    const direct = applySpriteOrderUnitPlan(createSpriteOrderPlanCursor(knownEntrySpriteOrderState("ordinary-factory")),
      spriteOrderProductionBodyPlan(104, "opponent"));
    expect(tracker.cursor.order.free).toEqual(direct.order.free);
    expect(spriteOrderTrackerLend(tracker)).toEqual(direct.order.free);
  });

  it("maps status animations as InitAndLaunchChosenStatusAnimation does", () => {
    expect(spriteOrderStatusAnimationName(false, 0x8)).toBe("PSN");
    expect(spriteOrderStatusAnimationName(false, 0x80 | 0x100)).toBe("PSN");
    expect(spriteOrderStatusAnimationName(false, 0x3)).toBe("SLP");
    expect(spriteOrderStatusAnimationName(false, 0x40)).toBe("PRZ");
    expect(spriteOrderStatusAnimationName(false, 0x10)).toBe("BRN");
    expect(spriteOrderStatusAnimationName(true, 0x00010000)).toBe("INFATUATION");
    expect(spriteOrderStatusAnimationName(true, 0x2)).toBe("CONFUSION");
    expect(spriteOrderStatusAnimationName(false, 0)).toBeNull();
  });
});

describe("strict real-route replay (docs/sprite-order-real-route.md events; no resync)", () => {
  it("knows more than the first edge in every trace and never mismatches", () => {
    const counts: Record<string, unknown> = {};
    for (const trace of REAL_ROUTE_TRACES) {
      const strict = replayCrossBodyTrace(trace, "strict");
      counts[trace] = [strict.moveEdges.known, strict.moveEdges.exact, strict.moveEdges.mismatched];
      expect(strict.moveEdges.mismatched).toBe(0);
      expect(strict.moveEdges.occupiedMismatch).toBe(0);
      expect(strict.animEdges.mismatched).toBe(0);
      for (const edge of strict.edges.filter(row => row.known)) expect(edge.exact && edge.occupiedMatch && edge.lent).toBe(true);
      expect(strict.firstInvalidation).toEqual({ frame: 2992, reason: "no EXACT plan: body 283:opponent" });
    }
    expect(counts).toEqual(Object.fromEntries(REAL_ROUTE_TRACES.map(trace => [trace, [3, 3, 0]])));
  });

  it("resync mode (rules in isolation): every tested edge exact, 91 move edges", () => {
    let tested = 0;
    for (const trace of REAL_ROUTE_TRACES) {
      const resync = replayCrossBodyTrace(trace, "resync");
      expect(resync.moveEdges.mismatched + resync.animEdges.mismatched).toBe(0);
      expect(resync.moveEdges.occupiedMismatch + resync.animEdges.occupiedMismatch).toBe(0);
      tested += resync.moveEdges.tested;
      expect(resync.moveEdges.exact).toBe(resync.moveEdges.tested);
    }
    expect(tested).toBe(91);
  });

  it("occupied prefix (Rock Throw's 64-entry seed) is the known-entry order at every body edge with the known occupants", () => {
    let matched = 0;
    for (const trace of REAL_ROUTE_TRACES) {
      const raw = fixture(`sprite-order-real-route/raw/${trace}-0.json`) as { rows: [number, number, string, string][] };
      const events = fixture(`sprite-order-real-route/events/${trace}.json`).events as { n: number; k: string }[];
      for (const body of events.filter(event => event.k === "body")) {
        const row = raw.rows.filter(candidate => candidate[0] <= body.n).at(-1)!;
        const order = Array.from({ length: 64 }, (_, index) => parseInt(row[2].slice(index * 2, index * 2 + 2), 16));
        const mask = BigInt(`0x${row[3]}`);
        const occupied = order.filter(slot => (mask >> BigInt(slot)) & 1n);
        if ([...occupied].sort((a, b) => a - b).join() !== [...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER].sort((a, b) => a - b).join()) continue;
        expect(occupied, `${trace} ${body.n}`).toEqual(KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
        matched += 1;
      }
    }
    expect(matched).toBe(44);
  });

  it("BattleLab corpus (committed + ext event tables): every edge the transform knows is exact", () => {
    const corpus = replayCrossBodyCorpus();
    expect({ scenarios: corpus.scenarios, skipped: corpus.skipped, edges: corpus.edges, mismatched: corpus.mismatched })
      .toEqual({ scenarios: 573, skipped: 19, edges: 1366, mismatched: 0 });
    expect(corpus.exact).toBe(corpus.known);
    expect(corpus.known).toBe(1044);
    expect(corpus.laterKnown).toBe(490);
  });
});
