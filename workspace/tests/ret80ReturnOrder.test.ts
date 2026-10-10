import { describe, expect, it } from "vitest";
import { applySpriteOrderPresentationEvent, createSpriteOrderTracker } from "../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import {
  advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, returnPowerLevel, type LiveSpriteOrderHost,
} from "../src/engine/liveSpriteOrderHost.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";

// ret80 (docs/ret80-return-order.md): Move_RETURN branches on gAnimFriendship (AnimTask_GetReturnPowerLevel,
// battle_anim_effects_3.c:5060-5073). Plan 117 ("216:*") is ReturnMedium's; audit 20 (docs/live-audit-20.md §1.3) measured the
// Factory's friendship-255 Strongest body creating 31 sprites, so production's 117 lend was wrong after every Return.
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

  it("only a Medium Return (61..91, plan 117's branch) lends plan 117; every other power level invalidates", () => {
    for (const battler of [0, 1] as const) {
      const attackerSide = battler === 0 ? "player" as const : "opponent" as const;
      const medium = applySpriteOrderPresentationEvent(start(), { kind: "move-animation", moveId: 216, attackerSide }).cursor.order;
      expect(medium.known).toBe(true);
      for (const friendship of [61, 70, 91]) {
        const tracker = after([ret(battler, friendship)]);
        expect(tracker.cursor.order.known, `${battler}/${friendship}`).toBe(true);
        expect(tracker.cursor.order.free, `${battler}/${friendship}`).toEqual(medium.free);
      }
      for (const friendship of [0, 60, 92, 200, 201, 255]) {
        const tracker = after([ret(battler, friendship)]);
        expect(tracker.cursor.order.known, `${battler}/${friendship}`).toBe(false);
        expect(tracker.invalidReason, `${battler}/${friendship}`).toBe(`Return power level ${returnPowerLevel(friendship)} body`);
      }
    }
  });
});
