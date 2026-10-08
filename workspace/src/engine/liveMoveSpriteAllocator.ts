import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import {
  allocateFirstLiveSprite, destroyLiveSprite, invalidateLiveSpriteAllocatorHost,
  type LiveSpriteAllocatorHost, type LiveSpriteOwner,
} from "./liveSpriteAllocator.ts";
import { invalidateSpriteOrderState, type SpriteOrderState } from "./spriteOrderProvider.ts";
import type { SpriteOrderDeferredLend } from "./spriteOrderEventTransform.ts";

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
 * Live move ids whose scripts are audited OBJ-net-zero in both orientations,
 * twice fresh (tools/integration/fixtures/allocator-net-zero-audit.json plus
 * allocator-net-zero-audit-ext.json, combined.netZeroIds: all 110 live ids at
 * the time of the audit, including Fury Swipes 154 on the opponent side and the
 * anchor/anchor2 ids). Moves added to the live set afterwards are NOT audited
 * and must not be added here until they are. Occupancy-net-zero does not preserve the free-slot sSpriteOrder,
 * but the six allocator consumers never share a sort key with another visible
 * sprite (tools/integration/fixtures/allocator-consumer-tie-audit.json,
 * docs/allocator-consumer-tie-audit.md), so their pixels are key-determined.
 * That license covers ONLY the six PLANS consumers; any new allocator consumer
 * needs its own tie audit or the sprite-order provider. Changes to this list
 * are pinned by tests/liveSpriteAllocator.test.ts.
 */
export const LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS: readonly number[] = Object.freeze([
  2, 5, 9, 11, 12, 14, 21, 23, 25, 27, 29, 34, 36, 38, 39, 41, 42, 43, 44, 47, 48, 49, 50,
  51, 55, 56, 61, 65, 66, 67, 68, 74, 75, 78, 79, 83, 92, 93, 94, 95, 97, 101, 103, 105,
  106, 108, 109, 112, 113, 114, 115, 122, 124, 131, 136, 147, 148, 151, 154, 156, 158, 162,
  163, 172, 178, 180, 182, 186, 188, 197, 201, 204, 208, 211, 213, 223, 227, 231, 232, 235,
  238, 242, 243, 246, 247, 257, 259, 264, 272, 277, 280, 281, 287, 290, 294, 302, 305, 306,
  319, 320, 321, 325, 334, 335, 336, 337, 341, 342, 343, 347,
]);
const NET_ZERO_MOVES: ReadonlySet<number> = new Set(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS);

/**
 * Applies the source `createsprite`/callback destruction order for an audited
 * wall-family move. Computes allocation slots and the complete-boundary host;
 * it is not a full per-frame allocator clock. An audited net-zero move without
 * a plan leaves a known host unchanged (no input); every other move invalidates the
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
  if (host.historyKnown && !plan && NET_ZERO_MOVES.has(request.moveId)) {
    return Object.freeze({ next: host });
  }
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

/**
 * Free-slot `sSpriteOrder` tie order (`SpriteOrderState.free`) at the activation edge of the move body it is
 * supplied to. Consumers derive their allocation-slot order with `spriteOrderForSlots`; absent = unknown order,
 * and an order consumer must then return null (scene-off fallback), never a guessed order.
 */
export interface LiveMoveSpriteOrderInput {
  readonly known: true;
  readonly free: readonly number[];
  /**
   * ISSUES prep16 s0.3: no animation body, stat/status/general animation, faint, switch or party-menu unit has run since the
   * battle began (the order host's body counter is 0). Only then is the BG-register/scroll/matrix state the measured
   * constant S0; the BG-snapshot adapters (Overheat, Silver Wind) require it.
   */
  readonly firstBody?: true;
  /**
   * prep18 s1.1: the previous unit was a Dig setup body and nothing (but its own attacker hide) has run since, so the Dig
   * unleash's order and BG/scanline history are the measured post-setup state (liveSpriteOrderHost `digSetupUnits`).
   */
  readonly afterDigSetup?: true;
  /** prep29: the previous unit was the battle's first body, a Bonemerang hit 1 (nothing since): hit 2's BG registers are hit 1's split values. */
  readonly afterBonemerangHit1?: true;
  /**
   * Deferred lend (liveSpriteOrderHost markLiveSpriteOrderDeferredBody; docs/s10a-random2-order-lend-blocker.md design 1): the order is the
   * earlier body's words-dependent end state, resolved only at the render seam (resolveSpriteOrderDeferredLend); `free` is then empty.
   */
  readonly deferred?: SpriteOrderDeferredLend;
}

/**
 * Single-body sprite-order seam (lend once, then invalidate). Production no longer uses it: the orchestrator tracks
 * the order across bodies with liveSpriteOrderHost.ts (event transform of docs/sprite-order-gap-causes.md §2) and
 * lends via `lendLiveSpriteOrder`. Kept as the conservative fallback seam pinned by tests/liveSpriteOrderHost.test.ts.
 */
export function prepareLiveMoveSpriteOrder(
  order: SpriteOrderState,
  _request: BattleMoveAnimationRequest,
): Readonly<{ next: SpriteOrderState; input?: LiveMoveSpriteOrderInput }> {
  if (!order.known) return Object.freeze({ next: order });
  return Object.freeze({
    next: invalidateSpriteOrderState(order),
    input: Object.freeze({ known: true, free: order.free }),
  });
}
