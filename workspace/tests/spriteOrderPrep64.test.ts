import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, type LiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import { LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS, liveSpriteAllocatorAnimationNetZero } from "../src/engine/liveMoveSpriteAllocator.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_PLANS } from "../src/engine/spriteOrderProductionPlans.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { renderSpriteOrderProductionTableFromFixtures } from "../tools/integration/spriteOrderProductionTable.ts";

// S10A land68 (docs/land68-dive-substitute-fade.md; evidence docs/next-adapters-prep64.md): General_SubstituteFade has no createsprite and
// no allocation window, so SUBSTITUTE_FADE takes the existing empty plan (index 9) and joins the allocator's NET-ZERO general animations.
// Receipts: tools/integration/fixtures/prep64/ (prep64Probe.py, 10 jobs, Scene ON and OFF, both holder sides, two fresh direct-mGBA runs
// each with an explicit lab seed, A == B).
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/${name}`, import.meta.url), "utf8"));
const check = fixture("prep64/check.json") as {
  jobs: number; notIdenticalAB: number; plans: Record<string, string>;
  result: { instances: number; matched: number; handoffsExact: number; sides: string[] }; nextConsumerResult: { bodies: number; exact: number };
  instances: { job: string; profile: string; holder: string; matched: boolean; problems: unknown[]; nextAllocatingUnit: { handoffExact: boolean } }[];
};
const netzero = fixture("prep64/netzero.json") as {
  allIdenticalAB: boolean; knownEntry: number[]; verdicts: Record<string, { unit: string; key: string; verdict: string; createdPerInstance: number[] }>;
};

describe("land68 (prep64): SUBSTITUTE_FADE is the empty plan and allocator NET-ZERO", () => {
  it("check.json: 11 / 11 fades exact with exact hand-offs, both holder sides x both scenes, every job A == B; next consumers 6 / 6", () => {
    expect([check.jobs, check.notIdenticalAB]).toEqual([10, 0]);
    expect(check.plans).toEqual({ "general SUBSTITUTE_FADE": "" });
    expect(check.result).toEqual({ instances: 11, matched: 11, handoffsExact: 11,
      sides: ["battle-scene-off:opponent", "battle-scene-off:player", "battle-scene-on:opponent", "battle-scene-on:player"] });
    expect(check.instances).toHaveLength(11);
    expect(check.instances.every((i) => i.matched && i.problems.length === 0 && i.nextAllocatingUnit.handoffExact)).toBe(true);
    expect(new Set(check.instances.map((i) => `${i.profile}:${i.holder}`)).size).toBe(4);
    expect(check.nextConsumerResult).toEqual({ bodies: 6, exact: 6 });
  });

  it("plan-rows.json is prep64PlanRows.py's row from check.json, and the production table regenerates byte-for-byte with it", () => {
    const r = check.result;
    const rows = { schema: "sprite-order-body-plans/rows-v1",
      note: "prep64 EXACT plan (docs/next-adapters-prep64.md; receipts units.json / check.json / netzero.json in this directory).",
      bodies: {},
      anims: { "General:B_ANIM_SUBSTITUTE_FADE": {
        verdict: "EXACT-PLAN",
        rule: "General_SubstituteFade: monbg + AnimTask_SubstituteFadeToInvisible + AnimTask_BlendBattleAnimPal x2 + "
          + "AnimTask_SwapMonSpriteToFromSubstitute; no createsprite, no allocation window (empty plan), Scene ON and OFF",
        tier: "confirmed",
        evidence: `${r.matched}/${r.instances} instances exact per frame, hand-offs exact ${r.handoffsExact}, ${r.sides.join(" ")} `
          + "(prep64 check.json \"general SUBSTITUTE_FADE\")",
        plan: [] } } };
    expect(readFileSync(new URL("../tools/integration/fixtures/prep64/plan-rows.json", import.meta.url), "utf8")).toBe(`${JSON.stringify(rows)}\n`);
    const committed = readFileSync(new URL("../src/engine/spriteOrderProductionPlans.ts", import.meta.url), "utf8");
    expect(renderSpriteOrderProductionTableFromFixtures()).toBe(committed);
  });

  it("SPRITE_ORDER_PRODUCTION_ANIMS.SUBSTITUTE_FADE is the existing empty plan (index 9, shared with FUTURE_SIGHT_HIT / STATUS_PSN)", () => {
    expect(SPRITE_ORDER_PRODUCTION_ANIMS.SUBSTITUTE_FADE).toBe(9);
    expect(SPRITE_ORDER_PRODUCTION_ANIMS.FUTURE_SIGHT_HIT).toBe(9);
    expect(SPRITE_ORDER_PRODUCTION_ANIMS.STATUS_PSN).toBe(9);
    expect(SPRITE_ORDER_PRODUCTION_PLANS[9]).toBe("");
    expect(decodeSpriteOrderPlan(SPRITE_ORDER_PRODUCTION_PLANS[9]!)).toEqual([]);
  });

  it("the order tracker and the order host keep the free order through the fade (no invalidation, nothing allocated)", () => {
    const start = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    const fade = applySpriteOrderPresentationEvent(start, { kind: "general-animation", animation: "SUBSTITUTE_FADE" } as SpriteOrderPresentationEvent);
    expect(fade.cursor.order.known).toBe(true);
    expect(fade.cursor.order.free).toEqual(start.cursor.order.free);
    expect(fade.cursor.occupied).toEqual(start.cursor.occupied);
    const ev = (sequence: number, extra: object) =>
      Object.freeze({ sequence, payload: { kind: "animation", ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
    const host0: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 });
    const advance = (events: readonly BattleKernelSemanticEvent[]) =>
      advanceLiveSpriteOrderHost(host0, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: [{ events }] }, Number.POSITIVE_INFINITY);
    for (const battler of [0, 1] as const) {
      // Tackle 33 breaks the doll, the fade plays on the holder, then the next consumer body (prep64's next-consumer shape)
      const tackle = ev(10, { animationId: "MOVE_ANIMATION", battler: 1 - battler, target: battler, arguments: ["33", "0", "35", "20", "70", "0"] });
      const before = advance([tackle]);
      const after = advance([tackle, ev(20, { animationId: "SUBSTITUTE_FADE", battler, arguments: [] })]);
      expect(before.tracker.cursor.order.known, `${battler}`).toBe(true);
      expect(after.tracker.cursor.order.known, `${battler}`).toBe(true);
      expect(after.tracker.cursor.order.free).toEqual(before.tracker.cursor.order.free);
      expect(after.tracker.cursor.occupied).toEqual(before.tracker.cursor.occupied);
    }
  });

  it("the allocator's NET-ZERO membership is pinned to netzero.json (both scene profiles NET-ZERO, nothing created)", () => {
    expect(netzero.allIdenticalAB).toBe(true);
    expect(netzero.knownEntry).toEqual([0, 1, 2, 6, 8, 60, 61, 62, 63]);
    expect(Object.keys(netzero.verdicts).sort()).toEqual(["battle-scene-off", "battle-scene-on"]);
    for (const v of Object.values(netzero.verdicts)) {
      expect({ unit: v.unit, key: v.key, verdict: v.verdict, created: v.createdPerInstance })
        .toEqual({ unit: "SUBSTITUTE_FADE", key: "General_SubstituteFade", verdict: "NET-ZERO", created: [0] });
    }
    expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS.has("SUBSTITUTE_FADE")).toBe(true);
    for (const battler of [0, 1]) expect(liveSpriteAllocatorAnimationNetZero({ animationId: "SUBSTITUTE_FADE", battler, arguments: [] })).toBe(true);
  });
});
