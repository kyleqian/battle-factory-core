/**
 * Pure, reduced model of pokeemerald's persistent `sSpriteOrder` scheduler.
 *
 * `CreateSprite` takes the lowest free `gSprites[]` slot. `DestroySprite`
 * resets that slot to `sDummySprite`, but does not reset `sSpriteOrder`.
 * Every `BuildOamBuffer` then performs one stable insertion-sort pass using
 * packed `(oam.priority << 8) | subpriority`, followed by wrapped OAM y.
 *
 * Source `SortSprites` has one additional y-wrap rule for double-affine
 * size-3 square/vertical sprites. The optional OAM geometry below models that
 * rule; ordinary sprites use the source defaults.
 *
 * A presentation reducer only needs the slots its component can allocate:
 * restricting a stable sort to those slots preserves their relative order.
 * The seed therefore comes from the live scene immediately before allocation,
 * while unrelated scene sprites remain outside this reduced state.
 *
 * Pinned source: reference/pokeemerald/src/sprite.c
 * (`CreateSprite`, `DestroySprite`/`ResetSprite`, `BuildSpritePriorities`,
 * `SortSprites`, and `AddSpritesToOamBuffer`).
 */

export interface SpriteOrderKey {
  /** Source `sprite->oam.priority`. */
  readonly priority: number;
  /** Source `sprite->subpriority`. */
  readonly subpriority: number;
  /** Source `sprite->oam.y`, before `SortSprites`' 160..255 wrap. */
  readonly oamY: number;
  readonly affineMode?: "off" | "normal" | "double";
  readonly oamSize?: 0 | 1 | 2 | 3;
  readonly oamShape?: "square" | "horizontal" | "vertical";
}

export interface SpriteOrderOccupant extends SpriteOrderKey {
  readonly owner: number;
  readonly slot: number;
}

export interface SpriteOrderState {
  /** Front-to-back, matching low-to-high OAM index. */
  readonly order: readonly number[];
  /** Slots available to source `CreateSprite`, kept in numeric slot order. */
  readonly slots: readonly number[];
  readonly occupants: readonly SpriteOrderOccupant[];
}

const DUMMY_PRIORITY = 3;
const DUMMY_SUBPRIORITY = 0xff;
const DUMMY_OAM_Y = 160;
const DISPLAY_HEIGHT = 160;

function assertSlots(label: string, slots: readonly number[]): void {
  if (slots.length === 0) throw new Error(`${label} must not be empty`);
  if (new Set(slots).size !== slots.length) {
    throw new Error(`${label} must contain unique slots`);
  }
  if (slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error(`${label} slots must be integers in [0, 63]`);
  }
}

export function createSpriteOrderState(
  slots: readonly number[],
  orderSeed: readonly number[],
): SpriteOrderState {
  assertSlots("sprite allocation pool", slots);
  assertSlots("sprite order seed", orderSeed);
  if (
    slots.length !== orderSeed.length
    || slots.some((slot) => !orderSeed.includes(slot))
  ) {
    throw new Error("sprite order seed must be a permutation of the allocation pool");
  }
  return {
    slots: [...slots].sort((a, b) => a - b),
    order: orderSeed.slice(),
    occupants: [],
  };
}

export function createOrderedSprite(
  state: Readonly<SpriteOrderState>,
  owner: number,
  key: Readonly<SpriteOrderKey>,
): SpriteOrderState {
  if (state.occupants.some((occupant) => occupant.owner === owner)) {
    throw new Error(`sprite owner ${owner} is already allocated`);
  }
  const occupied = new Set(state.occupants.map((occupant) => occupant.slot));
  const slot = state.slots.find((candidate) => !occupied.has(candidate));
  if (slot === undefined) throw new Error("sprite allocation pool is full");
  return {
    ...state,
    occupants: [...state.occupants, { owner, slot, ...key }],
  };
}

export function updateOrderedSprite(
  state: Readonly<SpriteOrderState>,
  owner: number,
  key: Readonly<SpriteOrderKey>,
): SpriteOrderState {
  let found = false;
  const occupants = state.occupants.map((occupant) => {
    if (occupant.owner !== owner) return occupant;
    found = true;
    return { owner, slot: occupant.slot, ...key };
  });
  if (!found) throw new Error(`sprite owner ${owner} is not allocated`);
  return { ...state, occupants };
}

export function destroyOrderedSprite(
  state: Readonly<SpriteOrderState>,
  owner: number,
): SpriteOrderState {
  const occupants = state.occupants.filter((occupant) => occupant.owner !== owner);
  if (occupants.length === state.occupants.length) {
    throw new Error(`sprite owner ${owner} is not allocated`);
  }
  return { ...state, occupants };
}

function wrappedY(key: Readonly<SpriteOrderKey>): number {
  const byteY = key.oamY & 0xff;
  let y = byteY >= DISPLAY_HEIGHT ? byteY - 256 : byteY;
  if (
    key.affineMode === "double"
    && key.oamSize === 3
    && (key.oamShape === "square" || key.oamShape === "vertical")
    && y > 128
  ) {
    y -= 256;
  }
  return y;
}

function packedPriority(key: Readonly<SpriteOrderKey>): number {
  return (key.priority << 8) | key.subpriority;
}

/**
 * One complete source `SortSprites` insertion pass. Exact ties do not swap,
 * preserving the scene-wide order inherited by these slots.
 */
export function sortSpriteOrder(
  state: Readonly<SpriteOrderState>,
): SpriteOrderState {
  const occupants = new Map(
    state.occupants.map((occupant) => [occupant.slot, occupant]),
  );
  const dummy: SpriteOrderKey = {
    priority: DUMMY_PRIORITY,
    subpriority: DUMMY_SUBPRIORITY,
    oamY: DUMMY_OAM_Y,
  };
  const keyFor = (slot: number): Readonly<SpriteOrderKey> =>
    occupants.get(slot) ?? dummy;
  const order = state.order.slice();
  for (let index = 1; index < order.length; index += 1) {
    let cursor = index;
    while (cursor > 0) {
      const prior = keyFor(order[cursor - 1]!);
      const next = keyFor(order[cursor]!);
      if (
        packedPriority(prior) > packedPriority(next)
        || (
          packedPriority(prior) === packedPriority(next)
          && wrappedY(prior) < wrappedY(next)
        )
      ) {
        const temp = order[cursor]!;
        order[cursor] = order[cursor - 1]!;
        order[cursor - 1] = temp;
        cursor -= 1;
      } else {
        break;
      }
    }
  }
  return { ...state, order };
}

/** Painter order: source backmost/highest OAM index first, frontmost last. */
export function spriteOwnersBackToFront(
  state: Readonly<SpriteOrderState>,
): readonly number[] {
  const ownerBySlot = new Map(
    state.occupants.map((occupant) => [occupant.slot, occupant.owner]),
  );
  return state.order
    .slice()
    .reverse()
    .map((slot) => ownerBySlot.get(slot))
    .filter((owner): owner is number => owner !== undefined);
}

export function spriteSlotForOwner(
  state: Readonly<SpriteOrderState>,
  owner: number,
): number | null {
  return state.occupants.find((occupant) => occupant.owner === owner)?.slot ?? null;
}
