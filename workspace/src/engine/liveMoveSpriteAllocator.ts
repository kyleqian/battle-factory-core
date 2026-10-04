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

interface LiveMoveSpriteAllocatorPlan {
  readonly identity: string;
  /** Sparkle spawn ages (relative to wall creation) and lifetimes. */
  readonly sparkles: readonly (readonly [spawnAge: number, lifetime: number])[];
}

/**
 * Audited source plans. Each wall/shield takes the first free slot from the
 * known-entry baseline; sparkles reuse slots as earlier ones expire.
 */
const PLANS: Readonly<Record<number, LiveMoveSpriteAllocatorPlan>> = Object.freeze({
  112: { identity: "BARRIER", sparkles: [] },
  113: {
    identity: "LIGHT_SCREEN",
    sparkles: [[12, 20], [20, 20], [27, 20], [36, 20], [44, 20], [52, 20]],
  },
  115: { identity: "REFLECT", sparkles: [[22, 15], [31, 15], [40, 15]] },
  182: { identity: "PROTECT", sparkles: [] },
  243: {
    identity: "MIRROR_COAT",
    sparkles: [[12, 20], [20, 20], [27, 20], [36, 20], [44, 22], [52, 22]],
  },
  277: { identity: "MAGIC_COAT", sparkles: [] },
});

/**
 * Applies the source `createsprite`/callback destruction order for an audited
 * wall-family move. Computes allocation slots and the complete-boundary host;
 * it is not a full per-frame allocator clock. Every other move invalidates the
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
  const plan = PLANS[request.moveId];
  if (!host.historyKnown || !plan) {
    return Object.freeze({ next: invalidateLiveSpriteAllocatorHost(host) });
  }

  const wallOwner = moveOwner(`${plan.identity}:wall`, 0);
  let allocated = allocateFirstLiveSprite(host, wallOwner);
  const wall = allocated.slot;
  let next = allocated.host;
  const sparkles: number[] = [];
  const live: Array<{ owner: LiveSpriteOwner; expiresAt: number }> = [];
  for (let index = 0; index < plan.sparkles.length; index += 1) {
    const [spawnAge, lifetime] = plan.sparkles[index]!;
    for (let liveIndex = live.length - 1; liveIndex >= 0; liveIndex -= 1) {
      if (live[liveIndex]!.expiresAt <= spawnAge) {
        next = destroyLiveSprite(next, live[liveIndex]!.owner);
        live.splice(liveIndex, 1);
      }
    }
    const owner = moveOwner(`${plan.identity}:sparkle`, index);
    allocated = allocateFirstLiveSprite(next, owner);
    next = allocated.host;
    sparkles.push(allocated.slot);
    live.push({ owner, expiresAt: spawnAge + lifetime });
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
