import { describe, expect, it } from "vitest";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  spriteSlotForOwner,
  updateOrderedSprite,
} from "../src/engine/spriteOrder.ts";

const key = (oamY: number) => ({ priority: 2, subpriority: 27, oamY });

describe("persistent source sprite creation/order lifetime seam", () => {
  it("allocates the lowest free source slot and reuses it after destruction", () => {
    let state = createSpriteOrderState([7, 3, 5], [5, 3, 7]);
    state = createOrderedSprite(state, 100, key(40));
    state = createOrderedSprite(state, 101, key(50));
    expect(spriteSlotForOwner(state, 100)).toBe(3);
    expect(spriteSlotForOwner(state, 101)).toBe(5);

    state = destroyOrderedSprite(state, 100);
    state = createOrderedSprite(state, 102, key(60));
    expect(spriteSlotForOwner(state, 102)).toBe(3);
    expect(spriteSlotForOwner(state, 101)).toBe(5);
  });

  it("sorts larger y in front while exact ties preserve inherited order", () => {
    let state = createSpriteOrderState([3, 4, 5], [5, 3, 4]);
    state = createOrderedSprite(state, 30, key(50)); // slot 3
    state = createOrderedSprite(state, 40, key(50)); // slot 4
    state = createOrderedSprite(state, 50, key(70)); // slot 5
    state = sortSpriteOrder(state);

    // Source order is front-to-back. Slot 5 moves in front by y; tied slots
    // 3 and 4 keep their inherited 3-before-4 order.
    expect(state.order).toEqual([5, 3, 4]);
    expect(spriteOwnersBackToFront(state)).toEqual([40, 30, 50]);
  });

  it("a destroyed slot takes the source dummy key without resetting order", () => {
    let state = createSpriteOrderState([3, 4], [4, 3]);
    state = createOrderedSprite(state, 30, key(80));
    state = createOrderedSprite(state, 40, key(70));
    state = sortSpriteOrder(state);
    expect(state.order).toEqual([3, 4]);

    state = destroyOrderedSprite(state, 30);
    state = sortSpriteOrder(state);
    expect(state.order).toEqual([4, 3]);

    state = createOrderedSprite(state, 31, key(70));
    state = updateOrderedSprite(state, 31, key(70));
    state = sortSpriteOrder(state);
    // Both live sprites are now exact ties; their post-destruction inherited
    // 4-before-3 order remains, rather than reverting to slot/creation order.
    expect(state.order).toEqual([4, 3]);
    expect(spriteOwnersBackToFront(state)).toEqual([31, 40]);
  });

  it("uses the source 8-bit y wrap before comparing equal priorities", () => {
    let state = createSpriteOrderState([3, 4], [3, 4]);
    state = createOrderedSprite(state, 30, key(170)); // wrapped to -86
    state = createOrderedSprite(state, 40, key(20));
    state = sortSpriteOrder(state);
    expect(state.order).toEqual([4, 3]);
  });
});
