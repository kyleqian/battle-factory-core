import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { prepareLiveMoveSpriteOrder } from "../src/engine/liveMoveSpriteAllocator.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, invalidateSpriteOrderState, knownEntrySpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { ORDER_CONSUMER_MOVES, predictLentOrders, scanRoute } from "../tools/integration/orderCrossBodyRouteScan.ts";

type Replay = ReturnType<typeof generatedCommandAnimationReplay>;
const bodies = (run: Replay) => run.commands.filter(row => row.type === "move-animation");

function expectRulesEqual(on: Replay, off: Replay): void {
  expect(on.boundaries).toHaveLength(off.boundaries.length);
  for (let index = 0; index < on.boundaries.length; index += 1) {
    const a = on.boundaries[index]!, b = off.boundaries[index]!;
    expect(a.rng).toEqual(b.rng);
    const { hitMarker: am, ...ar } = a.rules.rulesContext;
    const { hitMarker: bm, ...br } = b.rules.rulesContext;
    expect(ar).toEqual(br);
    expect(am ^ bm).toBe(0x80);
    expect(a.boundary).toEqual(b.boundary);
  }
}

describe("live sprite-order seam (presentation-only, tracked across modelled bodies)", () => {
  it("lends a known order once and invalidates it", () => {
    const request = battleMoveAnimationRequest(0, 1, ["288", "0", "0", "0", "0", "0"]);
    const known = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request);
    expect(known.input).toEqual({ known: true, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER });
    expect(known.next.known).toBe(false);
    const unknown = prepareLiveMoveSpriteOrder(known.next, request);
    expect(unknown.input).toBeUndefined();
    expect(prepareLiveMoveSpriteOrder(invalidateSpriteOrderState(known.next), request).input).toBeUndefined();
  });

  it("supplies the known-entry order to the battle's first body; later bodies get the pure transform's prediction; scene OFF none; rules/RNG equal", () => {
    const on = generatedCommandAnimationReplay(16, "on", [0, 0]);
    const off = generatedCommandAnimationReplay(16, "off", [0, 0]);
    expectRulesEqual(on, off);
    const moves = bodies(on);
    expect(moves.length).toBeGreaterThanOrEqual(2);
    const firstGraphics = on.commands.findIndex(row => row.type !== "message");
    expect(on.commands[firstGraphics]!.type).toBe("move-animation");
    expect(moves[0]!.spriteOrderInput).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    const predicted = predictLentOrders(on, true);
    for (const row of moves) {
      const sequence = (row.command as { eventSequence: number }).eventSequence;
      expect(predicted.has(sequence)).toBe(true);
      expect(row.spriteOrderInput ?? null).toEqual(predicted.get(sequence));
    }
    expect(off.commands.every(row => row.spriteOrderInput === undefined && row.retainedSpriteOrderKnown === undefined))
      .toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);

  it("tracks the order across bodies on 20 generated battles exactly as the pure transform predicts", () => {
    let later = 0, laterKnown = 0, laterUnknownAfterKnown = 0, invalidatedBattles = 0;
    for (let seed = 0; seed < 20; seed += 1) {
      const route = scanRoute(seed, [0, 0, 0]);
      for (const body of route.bodies) expect(body.agrees, `seed ${seed} body ${body.index}`).toBe(true);
      later += route.bodies.filter(body => body.index > 0).length;
      laterKnown += route.bodies.filter(body => body.index > 0 && body.known).length;
      // Faint / switch / send-out / trainer slide invalidate for the rest of the battle.
      const invalidating = route.on.semanticEvents.map(row => row.event as { sequence: number; payload: { kind: string } })
        .find(event => ["faint-animation", "switch", "switch-in-animation", "trainer-slide-in"].includes(event.payload.kind));
      if (invalidating) {
        invalidatedBattles += 1;
        expect(route.bodies.filter(body => body.sequence > invalidating.sequence).every(body => !body.known)).toBe(true);
      }
      // Once unknown, never known again in the same battle (no resync).
      const firstUnknown = route.bodies.findIndex(body => !body.known);
      if (firstUnknown >= 0) {
        expect(route.bodies.slice(firstUnknown).every(body => !body.known)).toBe(true);
        if (firstUnknown > 0) laterUnknownAfterKnown += 1;
      }
    }
    expect({ later, laterKnown }).toEqual({ later: 80, laterKnown: 25 });
    expect(laterUnknownAfterKnown).toBeGreaterThan(0);
    expect(invalidatedBattles).toBeGreaterThan(0);
  }, 120000);

  it("a consumer as a LATER body renders with the tracked order; after an unmodelled body it declines", () => {
    // Later bodies after modelled bodies only (tools/integration/fixtures/order-cross-body-live-receipt.json routes):
    // Heal Bell player (seed 12, 2nd body) / opponent (seed 186, 5th body), Grudge player (seed 16, 3rd body),
    // Rock Throw opponent (seed 112, 4th body).
    for (const [seed, slots, moveId, index] of [
      [12, [1, 3], 215, 1], [186, [0, 0, 0], 215, 4], [16, [2, 3], 288, 2], [112, [3, 3], 88, 3],
    ] as const) {
      const route = scanRoute(seed, slots);
      const body = route.bodies.find(row => row.moveId === moveId)!;
      expect(body.index).toBe(index);
      expect(route.bodies.every(row => row.index > index || (row.known && !row.mismatch))).toBe(true);
      expect(body.known && body.agrees).toBe(true);
      const anim = route.consumers.find(row => row.moveId === moveId)!;
      expect(anim.activeEveryAge && anim.ages > 0).toBe(true);
      expect(route.phase).toBe("action-menu");
      expectRulesEqual(route.on, generatedCommandAnimationReplay(seed, "off", slots));
    }
    // Seed 16 [slot 1, Grudge]: an earlier body has no EXACT plan -> Grudge declines (scene-off fallback).
    const declined = scanRoute(16, [1, 3]);
    const grudge = declined.bodies.find(row => row.moveId === 288)!;
    expect(grudge.index).toBeGreaterThan(0);
    expect(grudge.known).toBe(false);
    expect(declined.consumers.find(row => row.moveId === 288)!.activeAny).toBe(false);
    expect(ORDER_CONSUMER_MOVES[288]).toBe("GRUDGE");
  }, 120000);

  it("refuses the order after a preceding switch or party menu", () => {
    for (const slots of [[{ switch: 1 }, 0], ["cancel-party", 0]] as const) {
      const on = generatedCommandAnimationReplay(16, "on", slots);
      const off = generatedCommandAnimationReplay(16, "off", slots);
      expectRulesEqual(on, off);
      expect(bodies(on).length).toBeGreaterThan(0);
      expect(bodies(on).every(row => row.spriteOrderInput === undefined)).toBe(true);
    }
  }, 60000);

  it("refuses the order at battle start when the entry ran battle-start script events (Intimidate-class)", () => {
    let withEvents = 0, without = 0;
    for (let seed = 0; seed < 60 && (withEvents === 0 || without === 0); seed += 1) {
      const run = generatedCommandAnimationReplay(seed, "on", []);
      const host = run.state.liveMoveSpriteAllocatorHost!;
      expect(host.host.historyKnown).toBe(true);
      if (run.state.battle!.nextEventSequence > 0) {
        withEvents += 1;
        expect(host.order.known).toBe(false);
      } else {
        without += 1;
        expect(host.order.free).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
      }
    }
    expect(withEvents).toBeGreaterThan(0);
    expect(without).toBeGreaterThan(0);
  }, 60000);
});
