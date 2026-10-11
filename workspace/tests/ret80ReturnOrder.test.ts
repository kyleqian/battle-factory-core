import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderProductionBodyPlan,
} from "../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import {
  advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, returnPowerLevel, type LiveSpriteOrderHost,
} from "../src/engine/liveSpriteOrderHost.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";

// ret80 (docs/ret80-return-order.md): Move_RETURN branches on gAnimFriendship (AnimTask_GetReturnPowerLevel,
// battle_anim_effects_3.c:5060-5073). Plan 117 ("216:*") is ReturnMedium's; audit 20 (docs/live-audit-20.md §1.3) measured the
// Factory's friendship-255 Strongest body creating 31 sprites, so production's 117 lend was wrong after every Return. Rung 1 fails
// closed on every branch but Medium; rung 2 keys ReturnStrongest as 30216 (fixtures/ret80: ret80Probe.py -> units.json -> check.json).
const check = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/ret80/check.json", import.meta.url), "utf8")) as {
  notIdenticalAB: number; plans: Record<string, string>; results: Record<string, { instances: number; matched: number; sides: string[] }>;
};
const start = () => createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
const ev = (sequence: number, kind: string, extra: object = {}) =>
  Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
const after = (events: readonly BattleKernelSemanticEvent[]) => {
  const host: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 });
  return advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: [{ events }] }, Number.POSITIVE_INFINITY).tracker;
};
const ret = (battler: 0 | 1, friendship: number) => ev(10, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler,
  arguments: ["216", "0", "102", "40", String(friendship), "0"] });

describe("ret80: Return 216 keys its sprite-order plan on the power level", () => {
  it("returnPowerLevel follows AnimTask_GetReturnPowerLevel's ranges (60 matches none and keeps 0)", () => {
    const want: readonly (readonly [number, number])[] = [[0, 0], [59, 0], [60, 0], [61, 1], [70, 1], [91, 1], [92, 2], [200, 2], [201, 3], [255, 3]];
    for (const [friendship, level] of want) expect(returnPowerLevel(friendship), String(friendship)).toBe(level);
  });

  it("ROM receipts: both plans exact per frame on both sides, every job identical across two fresh runs", () => {
    expect(check.notIdenticalAB).toBe(0);
    expect(check.results["body 216 medium"]).toMatchObject({ instances: 2, matched: 2 });
    expect(check.results["body 216 strongest"]).toMatchObject({ instances: 12, matched: 12 });
    for (const r of Object.values(check.results)) expect([...r.sides].sort()).toEqual(["opponent", "player"]);
    for (const side of ["player", "opponent"] as const) {
      expect(spriteOrderProductionBodyPlan(216, side)).toEqual(decodeSpriteOrderPlan(check.plans["body 216 medium"]!));
      expect(spriteOrderProductionBodyPlan(30216, side)).toEqual(decodeSpriteOrderPlan(check.plans["body 216 strongest"]!));
    }
  });

  it("ReturnStrongest from the entry state ends at the ROM's free order (audit 20 return216-rom-order.txt)", () => {
    const tracker = applySpriteOrderPresentationEvent(start(), { kind: "move-animation", moveId: 30216, attackerSide: "opponent" });
    expect(start().cursor.order.free.slice(0, 7)).toEqual([4, 3, 21, 20, 5, 19, 18]);
    expect(tracker.cursor.order.free.slice(0, 8)).toEqual([3, 4, 5, 7, 21, 20, 19, 18]);
  });

  it("the host lends 117 for Medium, 30216 for Strongest (> 200) and invalidates Strong", () => {
    for (const battler of [0, 1] as const) {
      const attackerSide = battler === 0 ? "player" as const : "opponent" as const;
      const want = (moveId: number) => applySpriteOrderPresentationEvent(start(), { kind: "move-animation", moveId, attackerSide }).cursor.order;
      const medium = want(216), strongest = want(30216);
      expect(medium.known && strongest.known).toBe(true);
      expect(strongest.free).not.toEqual(medium.free);
      for (const friendship of [61, 70, 91]) {
        const tracker = after([ret(battler, friendship)]);
        expect(tracker.cursor.order.known, `${battler}/${friendship}`).toBe(true);
        expect(tracker.cursor.order.free, `${battler}/${friendship}`).toEqual(medium.free);
      }
      for (const friendship of [201, 255]) {
        const tracker = after([ret(battler, friendship)]);
        expect(tracker.cursor.order.known, `${battler}/${friendship}`).toBe(true);
        expect(tracker.cursor.order.free, `${battler}/${friendship}`).toEqual(strongest.free);
      }
      // ret88 (tests/ret88ReturnWeak.test.ts): Weak (0, 60) lends 40216; Strong still invalidates.
      for (const friendship of [92, 200]) {
        const tracker = after([ret(battler, friendship)]);
        expect(tracker.cursor.order.known, `${battler}/${friendship}`).toBe(false);
        expect(tracker.invalidReason, `${battler}/${friendship}`).toBe(`Return power level ${returnPowerLevel(friendship)} body`);
      }
    }
  });
});
