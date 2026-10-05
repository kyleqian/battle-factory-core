import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { prepareLiveMoveSpriteOrder } from "../src/engine/liveMoveSpriteAllocator.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, invalidateSpriteOrderState, knownEntrySpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";

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

describe("live sprite-order seam (presentation-only, first body only)", () => {
  it("lends a known order once and invalidates it", () => {
    const request = battleMoveAnimationRequest(0, 1, ["288", "0", "0", "0", "0", "0"]);
    const known = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request);
    expect(known.input).toEqual({ known: true, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER });
    expect(known.next.known).toBe(false);
    const unknown = prepareLiveMoveSpriteOrder(known.next, request);
    expect(unknown.input).toBeUndefined();
    expect(prepareLiveMoveSpriteOrder(invalidateSpriteOrderState(known.next), request).input).toBeUndefined();
  });

  it("supplies the known-entry order to the battle's first body only; scene OFF carries none; rules/RNG equal", () => {
    const on = generatedCommandAnimationReplay(16, "on", [0, 0]);
    const off = generatedCommandAnimationReplay(16, "off", [0, 0]);
    expectRulesEqual(on, off);
    const moves = bodies(on);
    expect(moves.length).toBeGreaterThanOrEqual(2);
    const firstGraphics = on.commands.findIndex(row => row.type !== "message");
    expect(on.commands[firstGraphics]!.type).toBe("move-animation");
    expect(moves[0]!.spriteOrderInput).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    expect(moves.slice(1).every(row => row.spriteOrderInput === undefined)).toBe(true);
    expect(moves.slice(1).every(row => row.retainedSpriteOrderKnown === false)).toBe(true);
    expect(off.commands.every(row => row.spriteOrderInput === undefined && row.retainedSpriteOrderKnown === undefined))
      .toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);

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
