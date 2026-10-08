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

/**
 * BattleLab ordinary-singles entry as sort windows `[created, destroyedInArrayOrder]`, from reset to the cursor
 * pair destroy. Derived from the first raw corpus scenario's per-frame occupied-mask diffs (sSpriteOrder rows
 * 1168..2041 of `101-mechanic-night-shade-opponent-ariados-player-onix-0.json`; each non-empty frame diff is one sort window) and identical, as a
 * slot stream, in all 44 raw files (frame spacing varies, the stream does not). Mirrors the call sequence of
 * `createKnownEntrySpriteAllocatorProvider`; the last window is the cursor pair destroyed as [4, 3].
 */
export const BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS: readonly (readonly [readonly number[], readonly number[]])[] =
  Object.freeze([
  [[0, 62, 63], []],
  [[1, 60, 61], []],
  [[2], []],
  [[3, 4], []],
  [[5, 54, 55, 56, 57, 58, 59], []],
  [[6, 48, 49, 50, 51, 52, 53], []],
  [[7, 8], []],
  [[9], []],
  [[10], []],
  [[11], []],
  [[12], []],
  [[13], []],
  [[14], []],
  [[15], []],
  [[16], []],
  [[17], []],
  [[18], []],
  [[19], []],
  [[20], []],
  [[21], []],
  [[22], []],
  [[], [48, 49, 50, 51, 52, 53]],
  [[23], []],
  [[], [4]],
  [[], [10]],
  [[], [11]],
  [[], [12]],
  [[], [13]],
  [[], [14]],
  [[], [15]],
  [[], [16]],
  [[], [17]],
  [[], [18]],
  [[], [19]],
  [[], [20]],
  [[], [21]],
  [[], [22]],
  [[], [9]],
  [[], [6]],
  [[], [23]],
  [[], [7]],
  [[4, 6], []],
  [[], [54, 55, 56, 57, 58, 59]],
  [[], [3]],
  [[3], []],
  [[7], []],
  [[9], []],
  [[10], []],
  [[11], []],
  [[12], []],
  [[13], []],
  [[14], []],
  [[15], []],
  [[16], []],
  [[17], []],
  [[18], []],
  [[19], []],
  [[20], []],
  [[21], []],
  [[], [3]],
  [[], [7]],
  [[], [9]],
  [[], [10]],
  [[], [11]],
  [[], [12]],
  [[], [13]],
  [[], [14]],
  [[], [15]],
  [[], [16]],
  [[], [17]],
  [[], [18]],
  [[], [19]],
  [[], [5]],
  [[], [20]],
  [[], [21]],
  [[], [4]],
  [[3, 4], []],
  [[], [4, 3]],
  ].map(([created, destroyed]) => Object.freeze([Object.freeze(created!), Object.freeze(destroyed!)] as const)));

/**
 * Free order after the known entry stream (== KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER). Both routes run the same stock
 * CB2_InitBattle singles entry from ResetSpriteData: BattleLab (22 scenarios x 2) and the ordinary Factory draft ->
 * battle 1 route (Scene ON, tools/integration/fixtures/sprite-order-factory-raw, docs/sprite-order-factory-entry.md)
 * produce the identical window stream. Any other route is unknown history and returns an invalid state.
 */
export function knownEntrySpriteOrderState(route: "ordinary-factory" | "battle-lab-ordinary-singles"): SpriteOrderState {
  return knownEntryStateThrough(route, 0);
}

/**
 * The same entry stream without its last two windows (the action-prompt bounce pair create/destroy): the order a
 * battle-start script animation (Intimidate's STATS_CHANGE, docs/sprite-order-policy-gaps.md §2) sees. Applying the
 * ordinary prompt cycle to it yields `knownEntrySpriteOrderState`.
 */
export function knownEntryPrePromptSpriteOrderState(route: "ordinary-factory" | "battle-lab-ordinary-singles"): SpriteOrderState {
  return knownEntryStateThrough(route, 2);
}

function knownEntryStateThrough(route: "ordinary-factory" | "battle-lab-ordinary-singles", dropLast: number): SpriteOrderState {
  if (route !== "battle-lab-ordinary-singles" && route !== "ordinary-factory") {
    return invalidateSpriteOrderState(initSpriteOrderState());
  }
  // Entry windows only destroy groups whose array order is stored in the table; the array itself is not needed.
  const identity = Array.from({ length: SPRITE_ORDER_SLOT_COUNT }, (_, slot) => slot);
  let state = initSpriteOrderState();
  for (const [created, destroyed] of BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS.slice(0, BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS.length - dropLast)) {
    // `previousArrayOrder` ordering is already baked into `destroyed`; pass it as the array prefix.
    state = applySpriteOrderWindow(state, created, destroyed, [...destroyed, ...identity.filter(s => !destroyed.includes(s))]);
  }
  return state;
}

/**
 * Relative tie order of a move's allocation slots: `F.filter(slot in slots)`. A consumer allocates its sprites in
 * the lowest-free slots (3,4,5,7,9,10,...), and sprites created in one sort window inherit the free order of exactly
 * those slots (docs/order-consumer-prep.md §0 "correction"; `spriteOrderForFirstAllocation` = `F.slice(0, n)` is not
 * this and must not feed consumers). Null when history is unknown, a slot repeats, or a slot is not free.
 */
export function spriteOrderForSlots(state: SpriteOrderState, slots: readonly number[]): readonly number[] | null {
  if (!state.known || new Set(slots).size !== slots.length) return null;
  for (const slot of slots) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SPRITE_ORDER_SLOT_COUNT || !state.free.includes(slot)) return null;
  }
  return Object.freeze(state.free.filter(slot => slots.includes(slot)));
}

/**
 * `sSpriteOrder` prefix of the nine known-entry occupants (battlers, healthboxes, shadow, ...) at the first move
 * allocation, ordered by their sort keys. Equal to the accepted literal and to the observed order in all 12
 * raw-backed 64-entry rows (Rock Throw, Mud Slap, Sand Attack, Dive, Magnitude: docs/order-consumer-prep.md §1 and
 * §7 item 0, tools/integration/fixtures/order-consumer-seeds.json). Its slot set is the complement of
 * `KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER`. Only valid while those occupants are unchanged (first body after the entry).
 */
export const KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER: readonly number[] = Object.freeze([62, 60, 0, 63, 1, 61, 6, 8, 2]);

/**
 * Full 64-entry order for consumers that read the whole `sSpriteOrder`: `[...occupiedPrefix, ...F]`. Null when
 * unknown or when the prefix is not exactly the occupied (non-free) slot set.
 */
export function spriteOrderWithOccupiedPrefix(
  state: SpriteOrderState, occupiedPrefix: readonly number[],
): readonly number[] | null {
  if (!state.known) return null;
  const full = [...occupiedPrefix, ...state.free];
  if (full.length !== SPRITE_ORDER_SLOT_COUNT || new Set(full).size !== SPRITE_ORDER_SLOT_COUNT) return null;
  return Object.freeze(full);
}

/** Plan tokens (docs/sprite-order-body-plans.md §2): `n` = k-th sprite of this unit, `c` = survivor r of the unit
 * `ago` units earlier, `o` = an occupant older than every unit (concrete slot). */
export type SpriteOrderPlanToken = readonly ["n", number] | readonly ["c", number, number] | readonly ["o", number];
/** One sort window: creates (`f` = CreateSprite lowest free, `e` = CreateSpriteAtEnd highest free) and one destroy
 * group in array order. `pw` marks an FDERIVED group: order = (priority word, creation window, F index at creation),
 * computed here; a group without `pw` is SINGLE/STATIC and its stored order is applied as is. */
export interface SpriteOrderPlanWindow {
  readonly C?: readonly (readonly ["n", number, "f" | "e"])[];
  readonly D?: readonly SpriteOrderPlanToken[];
  readonly pw?: readonly number[];
}
export type SpriteOrderPlan = readonly SpriteOrderPlanWindow[];

/** EXACT-PLAN bodies (`"<moveId>:<side>"`) and gaps (`"<prevBody|entry>><nextBody>"`, plus the previous-body-only
 * key where every observed gap after that body has one shape). NEEDS-KEYS / NOT-OBSERVED keys are absent. */
export interface SpriteOrderPlanTable {
  readonly bodies: ReadonlyMap<string, SpriteOrderPlan>;
  readonly gaps: ReadonlyMap<string, SpriteOrderPlan>;
  readonly gapAfterBody: ReadonlyMap<string, SpriteOrderPlan>;
}

interface SpriteOrderPlanFixture {
  readonly bodies: Readonly<Record<string, { readonly verdict: string; readonly plan: SpriteOrderPlan }>>;
  readonly gaps: Readonly<Record<string, { readonly verdict: string; readonly plan: SpriteOrderPlan }>>;
  readonly gapShapesAfterBody: Readonly<Record<string, readonly string[]>>;
}

/** Load the EXACT-PLAN rows of `tools/integration/fixtures/sprite-order-body-plans.json` (caller supplies the JSON). */
export function spriteOrderPlanTableFromFixture(fixture: SpriteOrderPlanFixture): SpriteOrderPlanTable {
  const exact = (rows: SpriteOrderPlanFixture["bodies"]) => new Map(
    Object.entries(rows).filter(([, row]) => row.verdict === "EXACT-PLAN").map(([key, row]) => [key, row.plan] as const));
  const gaps = exact(fixture.gaps);
  const exactShapes = new Set([...gaps.values()].map(plan => JSON.stringify(plan)));
  const gapAfterBody = new Map<string, SpriteOrderPlan>();
  for (const [body, shapes] of Object.entries(fixture.gapShapesAfterBody)) {
    if (shapes.length !== 1 || !exactShapes.has(JSON.stringify(JSON.parse(shapes[0]!)))) continue;
    gapAfterBody.set(body, JSON.parse(shapes[0]!) as SpriteOrderPlan);
  }
  return Object.freeze({ bodies: exact(fixture.bodies), gaps, gapAfterBody });
}

/**
 * Order state plus what plan tokens need: allocator occupancy (the complement of `F` in this model), the survivors
 * of every applied unit (creation order) and `(window seq, F index at creation)` per live created slot.
 */
export interface SpriteOrderPlanCursor {
  readonly order: SpriteOrderState;
  readonly occupied: readonly number[];
  readonly units: number;
  readonly windowSeq: number;
  readonly survivors: readonly (readonly number[])[];
  readonly creation: Readonly<Record<number, readonly [number, number]>>;
}

function invalidCursor(cursor: SpriteOrderPlanCursor): SpriteOrderPlanCursor {
  return Object.freeze({ ...cursor, order: invalidateSpriteOrderState(cursor.order), units: cursor.units + 1 });
}

/**
 * Start applying plans at `order` (e.g. `knownEntrySpriteOrderState`). If allocator occupancy is supplied it must
 * equal the non-free slot set, otherwise the cursor starts invalid.
 */
export function createSpriteOrderPlanCursor(
  order: SpriteOrderState, allocatorOccupied?: readonly number[],
): SpriteOrderPlanCursor {
  const occupied = order.known
    ? Array.from({ length: SPRITE_ORDER_SLOT_COUNT }, (_, slot) => slot).filter(slot => !order.free.includes(slot))
    : [];
  const consistent = !order.known || allocatorOccupied === undefined
    || (allocatorOccupied.length === occupied.length && occupied.every(slot => allocatorOccupied.includes(slot)));
  return Object.freeze({
    order: consistent ? order : invalidateSpriteOrderState(order),
    occupied: Object.freeze(occupied), units: 0, windowSeq: 0, survivors: Object.freeze([]), creation: Object.freeze({}),
  });
}

/**
 * Apply one unit's (body or gap) plan exactly as docs/sprite-order-body-plans.md §2/§5 (mirrors
 * `spriteOrderBodyPlans.Sim.apply_unit`). A missing plan (key absent, NEEDS-KEYS, NOT-OBSERVED) or any token that
 * does not resolve invalidates the order; an invalid cursor stays invalid. Never guesses.
 */
export function applySpriteOrderUnitPlan(
  cursor: SpriteOrderPlanCursor, plan: SpriteOrderPlan | null | undefined,
): SpriteOrderPlanCursor {
  if (!cursor.order.known || !plan) return invalidCursor(cursor);
  const unit = cursor.units;
  const occupied = new Set(cursor.occupied);
  const creation: Record<number, readonly [number, number]> = { ...cursor.creation };
  const made: number[] = [];
  let free = [...cursor.order.free];
  let seq = cursor.windowSeq;
  for (const window of plan) {
    seq += 1;
    if (window.C) {
      const created: number[] = [];
      for (const [, k, mode] of window.C) {
        const open = Array.from({ length: SPRITE_ORDER_SLOT_COUNT }, (_, slot) => slot).filter(slot => !occupied.has(slot));
        const slot = mode === "e" ? open[open.length - 1] : open[0];
        if (slot === undefined || k !== made.length || !free.includes(slot)) return invalidCursor(cursor);
        creation[slot] = Object.freeze([seq, free.indexOf(slot)] as const);
        occupied.add(slot);
        made.push(slot);
        created.push(slot);
      }
      free = free.filter(slot => !created.includes(slot));
    }
    if (window.D) {
      const slots: number[] = [];
      for (const token of window.D) {
        const slot = token[0] === "n" ? made[token[1]]
          : token[0] === "c" ? cursor.survivors[unit - token[1]]?.[token[2]]
            : token[1];
        if (slot === undefined || !occupied.has(slot) || slots.includes(slot)) return invalidCursor(cursor);
        slots.push(slot);
      }
      if (window.pw) {
        if (window.pw.length !== slots.length || slots.some(slot => creation[slot] === undefined)) return invalidCursor(cursor);
        const word = new Map(slots.map((slot, index) => [slot, window.pw![index]!] as const));
        slots.sort((left, right) => word.get(left)! - word.get(right)!
          || creation[left]![0] - creation[right]![0] || creation[left]![1] - creation[right]![1]);
      }
      for (const slot of slots) {
        occupied.delete(slot);
        delete creation[slot];
      }
      free = [...slots, ...free.filter(slot => !slots.includes(slot))];
    }
  }
  const survivors = [...cursor.survivors];
  // A slot freed and re-taken inside the unit appears once per creation in `made`: only its last creation can be alive.
  survivors[unit] = Object.freeze(made.filter((slot, index) => occupied.has(slot) && made.lastIndexOf(slot) === index));
  return Object.freeze({
    order: make(true, free, cursor.order.pendingDestroyed),
    occupied: Object.freeze([...occupied].sort((left, right) => left - right)),
    units: unit + 1,
    windowSeq: seq,
    survivors: Object.freeze(survivors),
    creation: Object.freeze(creation),
  });
}
