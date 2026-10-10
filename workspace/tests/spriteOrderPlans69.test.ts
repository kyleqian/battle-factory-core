import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderProductionBodyPlan,
} from "../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, type LiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";

// fold71 (docs/fold71-plans69-speed-boost.md): the plans69 ROM-proved sprite-order plans (docs/next-adapters-plans69.md; receipts in
// fixtures/plans69/check.json) folded into the production table, and Magnitude's gAnimMovePower > 99 branch keyed as 20222.
const check = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/plans69/check.json", import.meta.url), "utf8")) as {
  notIdenticalAB: number; plans: Record<string, string>; results: Record<string, { instances: number; matched: number; matchedCreateMerged: number; sides: string[] }>;
};
const sides = ["player", "opponent"] as const;
const start = () => createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
const ev = (sequence: number, kind: string, extra: object = {}) =>
  Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
const after = (events: readonly BattleKernelSemanticEvent[]) => {
  const host: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 });
  return advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: [{ events }] }, Number.POSITIVE_INFINITY).tracker;
};
const magnitude = (battler: 0 | 1, power: number) => ev(10, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler,
  arguments: ["222", "0", String(power), "30", "70", "0"] });

describe("plans69 receipts and production plans", () => {
  it("every job is identical across fresh runs and every instance matched", () => {
    expect(check.notIdenticalAB).toBe(0);
    for (const [label, r] of Object.entries(check.results)) expect(r.matchedCreateMerged, label).toBe(r.instances); // Needle Arm 302: 4 / 6 plain, 6 / 6 with the create-merged burst
  });

  it("Conversion 2 176 and Needle Arm 302:opponent decode to the ROM plans on both sides", () => {
    for (const side of sides) expect(spriteOrderProductionBodyPlan(176, side)).toEqual(decodeSpriteOrderPlan(check.plans["body 176"]!));
    // cf78 (fixtures/cf78/plan-overrides.json): production's 302 is this ROM plan with its final destroy group FDERIVED (the n17 / n19
    // SortSprites tie keeps the start order); from the probes' entry-like starts both give the same order (tests/cf78NeedleArmTie.test.ts).
    const rom302 = decodeSpriteOrderPlan(check.plans["body 302"]!);
    for (const side of sides) {
      const plan = spriteOrderProductionBodyPlan(302, side)!;
      expect(plan.map(({ pw: _pw, ...window }) => window)).toEqual(rom302);
      expect(plan[plan.length - 1]!.pw).toEqual([1, 2, 3, 3, 4, 5, 6, 7, 8]);
    }
  });

  it("Magnitude: 222 is the empty plan, 20222 is Cf;D0;Cf;D1", () => {
    for (const side of sides) {
      expect(spriteOrderProductionBodyPlan(222, side)).toEqual(decodeSpriteOrderPlan(check.plans["body 222 power<=99"]!));
      expect(spriteOrderProductionBodyPlan(20222, side)).toEqual(decodeSpriteOrderPlan("Cf;D0;Cf;D1"));
      expect(spriteOrderProductionBodyPlan(20222, side)).toEqual(decodeSpriteOrderPlan(check.plans["body 222 power>99"]!));
    }
  });

  it("CASTFORM_CHANGE is the exact empty plan", () => {
    const tracker = applySpriteOrderPresentationEvent(start(), { kind: "general-animation", animation: "CASTFORM_CHANGE" } as never);
    expect(tracker.cursor.order.known).toBe(true);
    expect(tracker.cursor.order.free).toEqual(start().cursor.order.free);
    expect(tracker.invalidReason ?? null).toBeNull();
  });

  it("the host keys 20222 exactly when power > 99", () => {
    for (const battler of [0, 1] as const) {
      const attackerSide = battler === 0 ? "player" as const : "opponent" as const;
      const want = (moveId: number) => applySpriteOrderPresentationEvent(start(), { kind: "move-animation", moveId, attackerSide }).cursor.order.free;
      const intense = want(20222);
      const normal = want(222);
      expect(intense).not.toEqual(normal);
      for (const power of [10, 60, 99]) expect(after([magnitude(battler, power)]).cursor.order.free, `${battler}/${power}`).toEqual(normal);
      for (const power of [100, 110, 150]) expect(after([magnitude(battler, power)]).cursor.order.free, `${battler}/${power}`).toEqual(intense);
      expect(after([magnitude(battler, 100)]).cursor.order.known).toBe(true);
    }
  });
});
