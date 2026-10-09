import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { advanceLiveSpriteOrderHost, createLiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderRecallPlanText,
  type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";

// prep47 (C) (docs/next-adapters-prep47.md): the Factory AI's voluntary switch (BattleScript_DoSwitchOut: returnatktoball
// battler 1, drawpartystatussummary, hidepartystatussummary, switchinanim) recalls the opponent battler with the player's
// voluntary-recall plan (spriteOrderRecallPlanText, slot 8 at the known entry). ROM receipts (3 Perish Song jobs, each twice
// fresh): the event chain switch-out {opponent} -> party-summary-next -> party-summary-hide -> next-mon-send-out reaches the
// next body's first-frame free order exactly.
interface Job { identicalAB: boolean; F0: number[]; nextBodyF0: number[]; windows: unknown[] }
const jobs = (JSON.parse(readFileSync(new URL("../tools/integration/fixtures/prep47/ai-switch-units.json", import.meta.url), "utf8")) as {
  jobs: Record<string, Job> }).jobs;
const AI_SWITCH: SpriteOrderPresentationEvent[] = [
  { kind: "switch-out", side: "opponent" }, { kind: "party-summary-next" }, { kind: "party-summary-hide" }, { kind: "next-mon-send-out" },
];

describe("opponent voluntary switch-out (prep47 (C))", () => {
  it("switch-out {side: opponent} recalls the opponent battler slot with the recall plan; the player's default is unchanged", () => {
    const tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    expect(tracker.battlerSlots).toEqual({ player: expect.any(Number), opponent: 8 });
    const recalled = applySpriteOrderPresentationEvent(tracker, { kind: "switch-out", side: "opponent" });
    const expected = applySpriteOrderUnitPlan(createSpriteOrderPlanCursor(tracker.cursor.order), decodeSpriteOrderPlan(spriteOrderRecallPlanText(8)));
    expect(recalled.cursor.order.known).toBe(true);
    expect(recalled.cursor.order.free).toEqual(expected.order.free);
    expect(recalled.battlerSlots).toEqual({ player: tracker.battlerSlots.player, opponent: null });
    const player = applySpriteOrderPresentationEvent(tracker, { kind: "switch-out" });
    expect(player.battlerSlots).toEqual({ player: null, opponent: 8 });
    expect(player.cursor.order.free).toEqual(applySpriteOrderUnitPlan(createSpriteOrderPlanCursor(tracker.cursor.order),
      decodeSpriteOrderPlan(spriteOrderRecallPlanText(tracker.battlerSlots.player!))).order.free);
    // A second opponent recall has no battler slot: unknown.
    expect(applySpriteOrderPresentationEvent(recalled, { kind: "switch-out", side: "opponent" }).cursor.order.known).toBe(false);
  });

  it("the AI-switch event chain reaches the ROM's next-body free order (3/3 receipts)", () => {
    const ids = Object.keys(jobs).sort();
    expect(ids).toEqual(["aisw-electrode-misdreavus", "aisw-voltorb-lapras", "aisw-voltorb-misdreavus"]);
    for (const id of ids) {
      const job = jobs[id]!;
      expect(job.identicalAB).toBe(true);
      const tracker = AI_SWITCH.reduce(applySpriteOrderPresentationEvent,
        createSpriteOrderTracker({ known: true, free: job.F0, pendingDestroyed: [] }));
      expect(tracker.cursor.order.known, id).toBe(true);
      expect(tracker.cursor.order.free, id).toEqual(job.nextBodyF0);
    }
  });

  it("the host maps BattleScript_DoSwitchOut (RETURNATKTOBALL hide of battler 1 before any body) to the opponent recall", () => {
    const job = jobs["aisw-voltorb-lapras"]!;
    const event = (sequence: number, payload: object, opcodeName?: string) =>
      ({ sequence, payload, ...(opcodeName ? { provenance: { opcodeName } } : {}) }) as unknown as BattleKernelSemanticEvent;
    const events = [
      event(0, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }, "B_SCR_OP_RETURNATKTOBALL"),
      event(1, { kind: "draw-party-status-summary", battler: 1 }),
      event(2, { kind: "hide-party-status-summary", battler: 1 }),
      event(3, { kind: "switch-in-animation", battler: 1 }),
    ];
    const host = { ...createLiveSpriteOrderHost({ known: true, free: job.F0, pendingDestroyed: [] }), promptRequestId: 1 };
    const advanced = advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events }] }, 3);
    expect(advanced.tracker.cursor.order.known).toBe(true);
    expect(advanced.tracker.cursor.order.free).toEqual(job.nextBodyF0);
    // After a move body of the segment the same hide is not a voluntary switch (unprobed): it keeps invalidating.
    const afterBody = [
      event(0, { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0, target: 1, arguments: ["33", "0", "40", "10", "70", "0"] }),
      event(1, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }, "B_SCR_OP_RETURNATKTOBALL"),
    ];
    const late = advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events: afterBody }] }, 1);
    expect(late.tracker.cursor.order.known).toBe(false);
    expect(late.tracker.invalidReason).toBe("return to ball");
  });
});
