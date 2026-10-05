/**
 * Pure free-slot `sSpriteOrder` tie-order provider.
 *
 * `SortSprites` (src/sprite.c:372-460) is a full stable insertion sort of the previous `sSpriteOrder[64]` array
 * every frame (strictly-greater neighbours only, so equal keys never swap). `DestroySprite` (:618) ->
 * `ResetSprite` (:682) makes the slot the dummy sprite, which carries the maximal key, so every free slot shares
 * one key and the free slots always form the tail block of the array. Therefore the order `F` of the free slots
 * only changes at events and is a pure function of them:
 *
 *   reset (ResetSpriteData :294 / ResetAllSprites :848)  F = [0..63]
 *   CreateSprite (:502) / CreateSpriteAtEnd (:513) slot s  F loses s
 *   DestroySprite slot s                                   s moves to the HEAD of F
 *   several slots destroyed inside one sort window         enter F ahead of the old F in previous ARRAY order
 *
 * Neither CreateSprite nor DestroySprite writes `sSpriteOrder`; only the reset does. A slot created and destroyed
 * (or destroyed and recreated) inside one window never sorts as free/occupied differently, so it is a no-op.
 * Exact on 40,185/40,185 corpus frames: docs/sprite-order-provider-design.md,
 * tools/integration/fixtures/sprite-order-event-model.json.
 *
 * This module never guesses: once history is unknown every query returns null and the adapter must refuse.
 */

export const SPRITE_ORDER_SLOT_COUNT = 64;

export interface SpriteOrderState {
  /** Same bit as `LiveSpriteAllocatorHost.historyKnown`. */
  readonly known: boolean;
  /** Free slots in tie order (`sSpriteOrder` filtered to free slots). Empty when unknown. */
  readonly free: readonly number[];
  /** Slots of the most recent destroy group, in array order (diagnostic only). */
  readonly pendingDestroyed: readonly number[];
}

/**
 * Free order at the first move allocation after the ordinary BattleLab singles entry (cursor pair {3,4} already
 * destroyed as [4,3]); identical in all 22 corpus scenarios.
 */
export const KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER: readonly number[] = Object.freeze([
  4, 3, 21, 20, 5, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 7,
  54, 55, 56, 57, 58, 59, 23, 22, 48, 49, 50, 51, 52, 53,
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
]);

function make(known: boolean, free: readonly number[], pendingDestroyed: readonly number[]): SpriteOrderState {
  return Object.freeze({ known, free: Object.freeze([...free]), pendingDestroyed: Object.freeze([...pendingDestroyed]) });
}

function assertSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SPRITE_ORDER_SLOT_COUNT) {
    throw new Error(`sprite slot ${slot} is outside [0, 63]`);
  }
}

/** ResetSpriteData-equivalent: every slot free in identity order. */
export function initSpriteOrderState(): SpriteOrderState {
  return make(true, Array.from({ length: SPRITE_ORDER_SLOT_COUNT }, (_, slot) => slot), []);
}

/** History is no longer modelled; all queries return null until a fresh `initSpriteOrderState`. */
export function invalidateSpriteOrderState(state: SpriteOrderState): SpriteOrderState {
  return state.known ? make(false, [], []) : state;
}

/** CreateSprite / CreateSpriteAtEnd took `slot`: it leaves the free tail block, the rest keep their order. */
export function onSpriteOrderCreate(state: SpriteOrderState, slot: number): SpriteOrderState {
  if (!state.known) return state;
  assertSlot(slot);
  if (!state.free.includes(slot)) throw new Error(`sprite slot ${slot} is not free`);
  return make(true, state.free.filter(candidate => candidate !== slot), state.pendingDestroyed);
}

/**
 * One SortSprites window's net destroys, already in previous-array order: they enter the head of the free order.
 */
export function onSpriteOrderDestroyGroup(
  state: SpriteOrderState, slotsInArrayOrder: readonly number[],
): SpriteOrderState {
  if (!state.known) return state;
  const seen = new Set<number>();
  for (const slot of slotsInArrayOrder) {
    assertSlot(slot);
    if (seen.has(slot)) throw new Error(`sprite slot ${slot} destroyed twice in one group`);
    if (state.free.includes(slot)) throw new Error(`sprite slot ${slot} is already free`);
    seen.add(slot);
  }
  return make(true, [...slotsInArrayOrder, ...state.free], slotsInArrayOrder);
}

/**
 * Apply one sort window. `created`/`destroyed` are the raw per-window sets; a slot in both is a no-op
 * (create+destroy of a free slot, or destroy+recreate of an occupied one). Destroyed slots are ordered by their
 * position in `previousArrayOrder` (the full 64-entry `sSpriteOrder` before the window's sort).
 */
export function applySpriteOrderWindow(
  state: SpriteOrderState,
  created: readonly number[],
  destroyed: readonly number[],
  previousArrayOrder: readonly number[],
): SpriteOrderState {
  if (!state.known) return state;
  const both = new Set(created.filter(slot => destroyed.includes(slot)));
  const netDestroyed = destroyed.filter(slot => !both.has(slot));
  const position = new Map(previousArrayOrder.map((slot, index) => [slot, index] as const));
  for (const slot of netDestroyed) {
    if (!position.has(slot)) throw new Error(`sprite slot ${slot} missing from the previous array order`);
  }
  const ordered = [...netDestroyed].sort((left, right) => position.get(left)! - position.get(right)!);
  let next = state;
  for (const slot of created) if (!both.has(slot)) next = onSpriteOrderCreate(next, slot);
  // Creates are removed before the destroyed group is prepended; they are disjoint (same-slot pairs removed above).
  return ordered.length === 0 ? next : onSpriteOrderDestroyGroup(next, ordered);
}

/** The tie order the first `n` newly allocated effect sprites inherit; null when unknown or fewer than `n` free. */
export function spriteOrderForFirstAllocation(state: SpriteOrderState, n: number): readonly number[] | null {
  if (!state.known || !Number.isInteger(n) || n < 0 || n > state.free.length) return null;
  return Object.freeze(state.free.slice(0, n));
}
