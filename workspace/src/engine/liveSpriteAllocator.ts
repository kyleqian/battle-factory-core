/**
 * Pure host for pokeemerald's 64-entry `gSprites` allocator.
 *
 * `CreateSprite` scans from slot 0, `CreateSpriteAtEnd` scans from slot 63,
 * and `DestroySprite` immediately makes its exact slot reusable. Ownership is
 * semantic so mutable templates such as `gMultiuseSpriteTemplate` never stand
 * in for the trainer/battler/controller that owns a live sprite.
 *
 * Pinned source: `src/sprite.c` (`CreateSprite`, `CreateSpriteAtEnd`,
 * `CreateSpriteAt`, `DestroySprite`). This host owns presentation allocation
 * only; it cannot affect battle rules or RNG.
 */

export const LIVE_SPRITE_SLOT_COUNT = 64;

export type BattleSide = "player" | "opponent";

export type LiveSpriteOwner =
  | Readonly<{ kind: "healthbox-main" | "healthbox-other" | "healthbar"; side: BattleSide }>
  | Readonly<{ kind: "enemy-shadow"; side: "opponent" }>
  | Readonly<{ kind: "trainer" | "controller" | "battler" | "sendout-ball"; side: BattleSide }>
  | Readonly<{ kind: "party-summary-bar"; side: BattleSide }>
  | Readonly<{ kind: "party-summary-ball" | "ball-particle"; side: BattleSide; index: number }>
  | Readonly<{ kind: "command-cursor"; index: 0 | 1 }>
  | Readonly<{ kind: "move"; identity: string; index: number }>;

export interface LiveSpriteOccupant {
  readonly slot: number;
  readonly owner: LiveSpriteOwner;
}

export interface LiveSpriteAllocatorHost {
  readonly historyKnown: boolean;
  readonly occupants: readonly LiveSpriteOccupant[];
}

function ownerKey(owner: LiveSpriteOwner): string {
  return owner.kind === "command-cursor"
    ? `${owner.kind}:${owner.index}`
    : owner.kind === "move"
      ? `${owner.kind}:${owner.identity}:${owner.index}`
      : "index" in owner
        ? `${owner.kind}:${owner.side}:${owner.index}`
        : `${owner.kind}:${owner.side}`;
}

function assertKnown(host: LiveSpriteAllocatorHost): void {
  if (!host.historyKnown) throw new Error("sprite allocation history is unknown");
}

function assertOwnerFree(host: LiveSpriteAllocatorHost, owner: LiveSpriteOwner): void {
  const key = ownerKey(owner);
  if (host.occupants.some(occupant => ownerKey(occupant.owner) === key)) {
    throw new Error(`sprite owner ${key} is already allocated`);
  }
}

function allocateAt(
  host: LiveSpriteAllocatorHost, owner: LiveSpriteOwner, slot: number,
): Readonly<{ host: LiveSpriteAllocatorHost; slot: number }> {
  assertKnown(host);
  assertOwnerFree(host, owner);
  if (!Number.isInteger(slot) || slot < 0 || slot >= LIVE_SPRITE_SLOT_COUNT) {
    throw new Error(`sprite slot ${slot} is outside [0, 63]`);
  }
  if (host.occupants.some(occupant => occupant.slot === slot)) {
    throw new Error(`sprite slot ${slot} is occupied`);
  }
  const occupants = [...host.occupants, Object.freeze({ slot, owner: Object.freeze({ ...owner }) })]
    .sort((left, right) => left.slot - right.slot);
  return Object.freeze({
    host: Object.freeze({ historyKnown: true, occupants: Object.freeze(occupants) }),
    slot,
  });
}

export function createLiveSpriteAllocatorHost(): LiveSpriteAllocatorHost {
  return Object.freeze({ historyKnown: true, occupants: Object.freeze([]) });
}

export function invalidateLiveSpriteAllocatorHost(
  host: LiveSpriteAllocatorHost,
): LiveSpriteAllocatorHost {
  return host.historyKnown
    ? Object.freeze({ historyKnown: false, occupants: host.occupants })
    : host;
}

export function allocateFirstLiveSprite(
  host: LiveSpriteAllocatorHost, owner: LiveSpriteOwner,
): Readonly<{ host: LiveSpriteAllocatorHost; slot: number }> {
  assertKnown(host);
  const occupied = new Set(host.occupants.map(occupant => occupant.slot));
  for (let slot = 0; slot < LIVE_SPRITE_SLOT_COUNT; slot += 1) {
    if (!occupied.has(slot)) return allocateAt(host, owner, slot);
  }
  throw new Error("sprite allocator is full");
}

export function allocateEndLiveSprite(
  host: LiveSpriteAllocatorHost, owner: LiveSpriteOwner,
): Readonly<{ host: LiveSpriteAllocatorHost; slot: number }> {
  assertKnown(host);
  const occupied = new Set(host.occupants.map(occupant => occupant.slot));
  for (let slot = LIVE_SPRITE_SLOT_COUNT - 1; slot >= 0; slot -= 1) {
    if (!occupied.has(slot)) return allocateAt(host, owner, slot);
  }
  throw new Error("sprite allocator is full");
}

export function destroyLiveSprite(
  host: LiveSpriteAllocatorHost, owner: LiveSpriteOwner,
): LiveSpriteAllocatorHost {
  assertKnown(host);
  const key = ownerKey(owner);
  const occupants = host.occupants.filter(occupant => ownerKey(occupant.owner) !== key);
  if (occupants.length === host.occupants.length) {
    throw new Error(`sprite owner ${key} is not allocated`);
  }
  return Object.freeze({ historyKnown: true, occupants: Object.freeze(occupants) });
}

export function liveSpriteSlotForOwner(
  host: LiveSpriteAllocatorHost, owner: LiveSpriteOwner,
): number | undefined {
  const key = ownerKey(owner);
  return host.occupants.find(occupant => ownerKey(occupant.owner) === key)?.slot;
}

