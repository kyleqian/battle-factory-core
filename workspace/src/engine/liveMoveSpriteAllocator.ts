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
 * twice fresh. Five receipts, all under tools/integration/fixtures/:
 *  - allocator-net-zero-audit.json (original) plus allocator-net-zero-audit-ext.json
 *    (extension; combined.netZeroIds): the first 110 live ids, including Fury
 *    Swipes 154 on the opponent side and the anchor/anchor2 ids;
 *  - prep44/net-zero-audit.json (summary["NET-ZERO"], 51 ids): 50 further ids
 *    (19, 24, 28, ... 352). Future Sight (248) was kept out of that
 *    receipt's fold (only its setup body was measured); prep52 closes it;
 *  - prep52/net-zero-audit.json (move-id keys, verdict NET-ZERO): 40 further ids incl. Future Sight 248 (setup body by
 *    move id; its delayed hit is the general animation General_FutureSightHit, audited by script label in the same
 *    receipt). Gust 16 and Transform 144 are net-zero there but not live adapters, so they are not listed;
 *  - hist73/net-zero-audit.json (move-id keys, verdict NET-ZERO, folded by land75): 37 live bodies no earlier receipt covered
 *    (Fury Cutter counters 1..4, Curse stat + Ghost branches, Magnitude regular + intense, Focus Energy 116, Bulk Up 339, ...).
 * Moves added to the live set afterwards are NOT audited
 * and must not be added here until they are. Occupancy-net-zero does not preserve the free-slot sSpriteOrder,
 * but the six allocator consumers never share a sort key with another visible
 * sprite (tools/integration/fixtures/allocator-consumer-tie-audit.json,
 * docs/allocator-consumer-tie-audit.md), so their pixels are key-determined.
 * That license covers ONLY the six PLANS consumers; any new allocator consumer
 * needs its own tie audit or the sprite-order provider. Changes to this list
 * are pinned by tests/liveSpriteAllocator.test.ts.
 */
export const LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS: readonly number[] = Object.freeze([
  2, 5, 9, 11, 12, 14, 19, 21, 23, 24, 25, 27, 28, 29, 34, 35, 36, 38, 39, 41, 42, 43, 44, 47,
  48, 49, 50, 51, 52, 53, 55, 56, 57, 58, 59, 60, 61, 65, 66, 67, 68, 73, 74, 75, 78, 79, 80,
  83, 85, 86, 89, 91, 92, 93, 94, 95, 97, 98, 101, 103, 104, 105, 106, 108, 109, 112, 113, 114,
  115, 122, 124, 129, 131, 133, 136, 142, 147, 148, 151, 154, 156, 157, 158, 162, 163, 172,
  173, 178, 180, 182, 184, 185, 186, 188, 189, 196, 197, 201, 202, 203, 204, 208, 211, 212,
  213, 219, 223, 225, 226, 227, 231, 232, 235, 236, 238, 240, 242, 243, 246, 247, 250, 257,
  258, 259, 263, 264, 266, 272, 273, 277, 280, 281, 282, 287, 290, 291, 294, 302, 305, 306,
  313, 315, 317, 319, 320, 321, 322, 325, 332, 334, 335, 336, 337, 340, 341, 342, 343, 345,
  347, 352,
  // prep52/net-zero-audit.json (move-id keys; Future Sight 248 = setup body + General_FutureSightHit hit).
  3, 7, 8, 13, 20, 62, 69, 71, 72, 76, 87, 107, 111, 118, 126, 138, 183, 193, 195, 200, 205, 207, 209, 218, 224, 228,
  229, 241, 245, 248, 252, 254, 256, 261, 269, 275, 278, 301, 348, 351,
  // hist73/net-zero-audit.json (move-id keys, every unit NET-ZERO; Fury Cutter counters 1..4, Curse stat + Ghost, Magnitude both).
  37, 116, 135, 137, 146, 149, 152, 161, 164, 174, 190, 194, 210, 214, 215, 216, 222, 230, 260, 271, 279, 283, 285, 288, 297,
  298, 309, 310, 318, 323, 324, 326, 327, 330, 339, 349, 350,
]);
const NET_ZERO_MOVES: ReadonlySet<number> = new Set(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS);
/**
 * flat77: planless net-zero consumers whose adapter claims the known-entry tile / palette allocation at a LATER body (Flatter 260: spotlight
 * tile slot 6 [305, 64] / palette 7, confetti tile slot 7 [433, 12] / palette 8). With a known host they receive a history-only input
 * (no wall: wall -1, no sparkles); with an unknown host none, as every other move. docs/next-adapters-flat77.md.
 */
export const LIVE_SPRITE_ALLOCATOR_HISTORY_CLAIM_MOVE_IDS: ReadonlySet<number> = new Set([260]);
/**
 * Status animations (spriteOrderStatusAnimationName) audited net-zero for the sprite allocator: every complete script body
 * (keyed on the status script, both sides, >= 2 afflicted species, two fresh direct-mGBA runs) has baseline == end == the
 * known entry and created == destroyed (tools/integration/fixtures/prep50/status-net-zero-audit.json; FRZ, INFATUATION, CURSED,
 * NIGHTMARE: tools/integration/fixtures/prep52/net-zero-audit.json). WRAPPED has no script and stays unaudited.
 */
export const LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS: ReadonlySet<string> = new Set([
  "SLP", "CONFUSION", "PSN", "PRZ", "BRN", "FRZ", "INFATUATION", "CURSED", "NIGHTMARE",
]);

/**
 * General / hit / stat animation units (kernel `animation` events other than MOVE_ANIMATION, named as liveSpriteOrderHost.ts names
 * them) audited net-zero for the sprite allocator (ISSUES #156): every complete script body (keyed on the script label with
 * sAnimMoveIndex 0; HIT_ANIMATION on the SpriteCB_HitAnimHealthoxEffect sprite, released after 20 frames and before the next
 * animation script) has baseline == end == the known entry, created == destroyed, no unowned late change and the same tile /
 * palette-tag / matrix allocation (tools/integration/fixtures/aud56-net-zero-audit.json, verdict NET-ZERO; 87 jobs, two fresh
 * direct-mGBA runs each, all A == B). Weather continuing (HAIL / SANDSTORM / RAIN) is keyed on the unit alone: the ROM plays it on
 * the first non-absent battler (DoFieldEndTurnEffects), which in Factory singles is always battler 0 whatever the event's battler
 * says (the receipt's sourceBattlerRule). SUBSTITUTE_FADE: General_SubstituteFade NET-ZERO on both sides, Scene ON and OFF
 * (tools/integration/fixtures/prep64/netzero.json; 11 instances, two fresh runs each). Every other id (SNATCH_MOVE,
 * DOOM_DESIRE_HIT, Clamp's TURN_TRAP, other WEATHER_VAR arguments, SCENE_OFF_ATTACK_PAUSE, anything new) is unaudited and
 * invalidates the allocator host. Membership is pinned to the receipt by tests/aud56GeneralAnimationAllocator.test.ts.
 */
export const LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS: ReadonlySet<string> = new Set([
  "HIT_ANIMATION", "STATS_CHANGE", "HELD_ITEM_EFFECT", "SUN_CONTINUES", "LEECH_SEED_DRAIN", "WISH_HEAL", "INGRAIN_HEAL",
  "TURN_TRAP_WHIRLPOOL", "TURN_TRAP_FIRE_SPIN", "TURN_TRAP_SAND_TOMB", "TURN_TRAP_BIND", "ITEM_KNOCKOFF", "FOCUS_BAND", "ITEM_STEAL",
  "FUTURE_SIGHT_HIT", "CASTFORM_CHANGE", "FOCUS_PUNCH_SETUP", "HAIL_CONTINUES", "SANDSTORM_CONTINUES", "RAIN_CONTINUES",
  "SUBSTITUTE_FADE",
]);

/** A kernel `animation` event payload (battleScriptEvents.ts). */
export interface LiveSpriteAllocatorAnimationEvent {
  readonly animationId: string;
  readonly battler: number | null;
  readonly arguments: readonly string[];
}

/** The general / hit / stat unit name of an `animation` event (liveSpriteOrderHost.ts's naming); null for a move body. */
export function liveSpriteAllocatorAnimationUnit(event: LiveSpriteAllocatorAnimationEvent): string | null {
  switch (event.animationId) {
    case "MOVE_ANIMATION": return null;
    case "TURN_TRAP": {
      // General_TurnTrap -> AnimTask_GetTrappedMoveAnimId: the trapped battler's wrapped move picks the branch.
      const move = Number(event.arguments[0]);
      return move === 83 ? "TURN_TRAP_FIRE_SPIN" : move === 250 ? "TURN_TRAP_WHIRLPOOL" : move === 328 ? "TURN_TRAP_SAND_TOMB"
        : move === 20 || move === 35 ? "TURN_TRAP_BIND" : "TURN_TRAP";
    }
    case "WEATHER_VAR": {
      // BattleScript_DamagingWeatherContinues' playanimation_var: B_ANIM_SANDSTORM_CONTINUES 12 / B_ANIM_HAIL_CONTINUES 13.
      const argument = event.arguments[0];
      return argument === "12" ? "SANDSTORM_CONTINUES" : argument === "13" ? "HAIL_CONTINUES" : "WEATHER_VAR";
    }
    default: return event.animationId;
  }
}

/** True only for an `animation` event whose unit is audited allocator net-zero (MOVE_ANIMATION: the move-body seam decides). */
export function liveSpriteAllocatorAnimationNetZero(event: LiveSpriteAllocatorAnimationEvent): boolean {
  const unit = liveSpriteAllocatorAnimationUnit(event);
  return unit === null || LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS.has(unit);
}

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
    return Object.freeze(LIVE_SPRITE_ALLOCATOR_HISTORY_CLAIM_MOVE_IDS.has(request.moveId)
      ? { next: host, input: Object.freeze({ historyKnown: true as const, wall: -1, sparkles: Object.freeze([]) }) } : { next: host });
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
