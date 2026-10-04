import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import {
  allocateFirstLiveSprite, destroyLiveSprite, invalidateLiveSpriteAllocatorHost,
  type LiveSpriteAllocatorHost, type LiveSpriteOwner,
} from "./liveSpriteAllocator.ts";

export interface LiveMoveSpriteAllocatorInput {
  readonly historyKnown: true;
  readonly wall: number;
  readonly sparkles: readonly number[];
}

const moveOwner = (identity: string, index: number): LiveSpriteOwner => ({
  kind: "move", identity, index,
});

/**
 * Applies the source `createsprite`/callback destruction order for a move.
 * Computes Light Screen allocation slots and the complete-boundary host; it
 * is not a full per-frame allocator clock. Every other move invalidates the
 * host, and an unknown host stays unknown, so no guessed allocator topology
 * is ever lent to an exact adapter.
 */
export function prepareLiveMoveSpriteAllocator(
  host: LiveSpriteAllocatorHost,
  request: BattleMoveAnimationRequest,
): Readonly<{
  next: LiveSpriteAllocatorHost;
  input?: LiveMoveSpriteAllocatorInput;
}> {
  if (!host.historyKnown || request.moveId !== 113) {
    return Object.freeze({ next: invalidateLiveSpriteAllocatorHost(host) });
  }

  const wallOwner = moveOwner("LIGHT_SCREEN:wall", 0);
  let allocated = allocateFirstLiveSprite(host, wallOwner);
  const wall = allocated.slot;
  let next = allocated.host;
  const sparkles: number[] = [];
  const live: Array<{ owner: LiveSpriteOwner; expiresAt: number }> = [];
  const spawnAges = [12, 20, 27, 36, 44, 52] as const;
  for (let index = 0; index < spawnAges.length; index += 1) {
    const spawnAge = spawnAges[index]!;
    for (let liveIndex = live.length - 1; liveIndex >= 0; liveIndex -= 1) {
      if (live[liveIndex]!.expiresAt <= spawnAge) {
        next = destroyLiveSprite(next, live[liveIndex]!.owner);
        live.splice(liveIndex, 1);
      }
    }
    const owner = moveOwner("LIGHT_SCREEN:sparkle", index);
    allocated = allocateFirstLiveSprite(next, owner);
    next = allocated.host;
    sparkles.push(allocated.slot);
    live.push({ owner, expiresAt: spawnAge + 20 });
  }
  for (const sprite of live) next = destroyLiveSprite(next, sprite.owner);
  next = destroyLiveSprite(next, wallOwner);
  return Object.freeze({
    next,
    input: Object.freeze({
      historyKnown: true,
      wall,
      sparkles: Object.freeze(sparkles),
    }),
  });
}
