import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteSlotForOwner,
  updateOrderedSprite,
  type SpriteOrderKey,
  type SpriteOrderState,
} from "./spriteOrder.ts";

export type BlizzardAttackerSide = "player" | "opponent";

/** The generated graph for the exclusive Move_BLIZZARD script body. */
export const BLIZZARD_COMPONENTS = [
  "asset:ANIM_TAG_ICE_CRYSTALS",
  "sprite:gBlizzardIceCrystalSpriteTemplate",
  "sprite:gIceCrystalHitLargeSpriteTemplate",
  "sprite:gIceCrystalHitSmallSpriteTemplate",
  "sprite:gSwirlingSnowballSpriteTemplate",
  "subroutine:BlizzardAgainstPlayer",
  "subroutine:BlizzardContinue",
  "subroutine:BlizzardIceCrystals",
  "subroutine:IceCrystalEffectLong",
  "task:AnimTask_GetAttackerSide",
  "task:AnimTask_StartSlidingBg",
  "visualCommand:clearmonbg",
  "visualCommand:fadetobg",
  "visualCommand:monbg",
  "visualCommand:panse",
  "visualCommand:restorebg",
  "visualCommand:setarg",
  "visualCommand:waitbgfadein",
  "visualCommand:waitbgfadeout",
] as const;

/** Numeric identity of the lowest Level-50 Factory carrier audited for this move. */
export const BLIZZARD_SOURCE_SET_ID = 318;
export const BLIZZARD_SOURCE_SPECIES_ID = 310;
export const BLIZZARD_MOVE_ID = 59;

export interface BlizzardSnowballCall {
  readonly burst: 0 | 1;
  readonly index: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly sourceAge: number;
  readonly initialX: 0;
  readonly initialY: number;
  readonly targetX: 0;
  readonly targetY: number;
  readonly speed: 72;
  readonly multipleTargets: true;
}

/**
 * The two textual BlizzardIceCrystals calls are retained independently. The
 * source inserts three delay callbacks between each pair; these are source
 * ages relative to the first displayed Move_BLIZZARD script row, never engine
 * ticks or presentation paint ages.
 */
export const BLIZZARD_SNOWBALL_CALLS: readonly BlizzardSnowballCall[] = [
  { burst: 0, index: 0, sourceAge: 45, initialX: 0, initialY: -10, targetX: 0, targetY: -10, speed: 72, multipleTargets: true },
  { burst: 0, index: 1, sourceAge: 50, initialX: 0, initialY: -15, targetX: 0, targetY: -15, speed: 72, multipleTargets: true },
  { burst: 0, index: 2, sourceAge: 55, initialX: 0, initialY: -5, targetX: 0, targetY: -5, speed: 72, multipleTargets: true },
  { burst: 0, index: 3, sourceAge: 60, initialX: 0, initialY: -10, targetX: 0, targetY: -10, speed: 72, multipleTargets: true },
  { burst: 0, index: 4, sourceAge: 65, initialX: 0, initialY: -20, targetX: 0, targetY: -20, speed: 72, multipleTargets: true },
  { burst: 0, index: 5, sourceAge: 70, initialX: 0, initialY: -15, targetX: 0, targetY: -15, speed: 72, multipleTargets: true },
  { burst: 0, index: 6, sourceAge: 75, initialX: 0, initialY: -25, targetX: 0, targetY: -25, speed: 72, multipleTargets: true },
  { burst: 1, index: 0, sourceAge: 80, initialX: 0, initialY: -10, targetX: 0, targetY: -10, speed: 72, multipleTargets: true },
  { burst: 1, index: 1, sourceAge: 85, initialX: 0, initialY: -15, targetX: 0, targetY: -15, speed: 72, multipleTargets: true },
  { burst: 1, index: 2, sourceAge: 90, initialX: 0, initialY: -5, targetX: 0, targetY: -5, speed: 72, multipleTargets: true },
  { burst: 1, index: 3, sourceAge: 95, initialX: 0, initialY: -10, targetX: 0, targetY: -10, speed: 72, multipleTargets: true },
  { burst: 1, index: 4, sourceAge: 100, initialX: 0, initialY: -20, targetX: 0, targetY: -20, speed: 72, multipleTargets: true },
  { burst: 1, index: 5, sourceAge: 105, initialX: 0, initialY: -15, targetX: 0, targetY: -15, speed: 72, multipleTargets: true },
  { burst: 1, index: 6, sourceAge: 110, initialX: 0, initialY: -25, targetX: 0, targetY: -25, speed: 72, multipleTargets: true },
] as const;

export interface BlizzardSnowballStep1Input {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface BlizzardSnowballSwirlState {
  readonly side: BlizzardAttackerSide;
  readonly callback: "AnimSwirlingSnowball_Step2";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface BlizzardGeometry {
  /** `InitSpritePosToAnimAttacker(TRUE)` result before the call offsets. */
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  /** `SetAverageBattlerPositions(target, TRUE)` result. */
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export type BlizzardSnowballCallback =
  | "AnimFastTranslateLinearWaitEnd"
  | "AnimSwirlingSnowball_Step1"
  | "AnimSwirlingSnowball_Step2"
  | "AnimSwirlingSnowball_End";

export interface BlizzardSnowballState {
  readonly callIndex: number;
  readonly oamSlot: number;
  readonly callback: BlizzardSnowballCallback;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface BlizzardLargeCrystalState {
  readonly callIndex: number;
  readonly oamSlot: number;
  readonly callback: "AnimWiggleParticleTowardsTarget";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface BlizzardImpactCrystalState {
  readonly callIndex: number;
  readonly oamSlot: number;
  readonly kind: "large" | "small";
  readonly callback: "RunStoredCallbackWhenAffineAnimEnds" | "AnimFlickerIceEffectParticle";
  readonly x: number;
  readonly y: number;
  readonly invisible: boolean;
  readonly timer: number;
  readonly matrix: readonly [number, 0, 0, number];
}

export interface BlizzardState {
  readonly age: number;
  readonly active: boolean;
  readonly phase: "setup" | "background-in" | "snow" | "impact" | "delay" | "background-out" | "cleanup" | "inactive";
  readonly scriptOffset: number | null;
  readonly snowballs: readonly BlizzardSnowballState[];
  readonly largeCrystals: readonly BlizzardLargeCrystalState[];
  readonly impactCrystals: readonly BlizzardImpactCrystalState[];
  readonly impactStartAge: number;
  readonly visualTaskCount: number;
  readonly soundTaskActive: boolean;
  readonly backgroundFadeTaskActive: boolean;
  readonly backgroundScrollTaskActive: boolean;
  readonly audioStart: "SE_M_BLIZZARD" | "SE_M_BLIZZARD2" | "SE_M_ICY_WIND" | null;
  readonly currentAudio: "pre-move" | "SE_M_BLIZZARD" | "SE_M_BLIZZARD2" | "SE_M_ICY_WIND";
  readonly resourcesLoaded: boolean;
  readonly monBgTaskActive: boolean;
  readonly monBgClearTaskActive: boolean;
  readonly monBgDisplayed: boolean;
  readonly background: "field" | "highspeed-player" | "highspeed-opponent";
  readonly backgroundScrollX: number;
  readonly displayedBackgroundScrollX: number;
  readonly blendCnt: 0 | 232;
  readonly blendY: number;
  readonly paletteTransfer: "same-row-monbg" | "previous-row" | "initial";
}

export function gbaSignedSin(angle: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((angle % 256) + 256) % 256]!;
  // pokeemerald's Sin/Cos use a signed C `>> 8`. JavaScript's bitwise shift
  // has the same arithmetic-floor behavior for these small signed products.
  return (value * amplitude) >> 8;
}

/**
 * Replays only the 32 Step2 writes that are determined by a captured Step1
 * row. Linear translation, the Step1 row itself, and End translation depend
 * on state not reconstructed here and are intentionally outside this reducer.
 */
export function blizzardSnowballSwirlState(
  initial: BlizzardSnowballStep1Input,
  step: number,
  side: BlizzardAttackerSide,
): BlizzardSnowballSwirlState {
  if (!Number.isInteger(step) || step < 0 || step > 31) {
    throw new RangeError(`Blizzard swirl step must be an integer in 0..31, got ${step}`);
  }
  const tempVar = side === "opponent" ? 20 : -20;
  const baseX = gbaSignedSin(128, tempVar);
  const baseY = gbaSignedSin(128 + 64, 15);
  const angleBeforeWrite = (128 + step * 16) & 0xff;
  const angleAfterWrite = (angleBeforeWrite + 16) & 0xff;
  return {
    side,
    callback: "AnimSwirlingSnowball_Step2",
    x: initial.x + initial.x2,
    y: initial.y + initial.y2,
    x2: gbaSignedSin(angleBeforeWrite, tempVar) - baseX,
    y2: gbaSignedSin(angleBeforeWrite + 64, 15) - baseY,
    data: [
      angleAfterWrite,
      initial.data[1],
      initial.data[2],
      baseX,
      baseY,
      step + 1,
      initial.data[6],
      initial.data[7],
    ],
  };
}

interface MutableFastParticle {
  callback: BlizzardSnowballCallback | "AnimWiggleParticleTowardsTarget";
  x: number;
  y: number;
  x2: number;
  y2: number;
  data: number[];
  destroyed: boolean;
}

/** Port of `InitAnimFastLinearTranslationWithSpeed`. */
function initFastTranslation(sprite: MutableFastParticle): void {
  const xDiff = sprite.data[2]! - sprite.data[1]!;
  const yDiff = sprite.data[4]! - sprite.data[3]!;
  const duration = Math.trunc((Math.abs(xDiff) << 4) / sprite.data[0]!);
  let dx = Math.trunc((Math.abs(xDiff) << 4) / duration);
  let dy = Math.trunc((Math.abs(yDiff) << 4) / duration);
  dx = xDiff < 0 ? (dx | 1) : (dx & ~1);
  dy = yDiff < 0 ? (dy | 1) : (dy & ~1);
  sprite.data[0] = duration;
  sprite.data[1] = dx;
  sprite.data[2] = dy;
  sprite.data[3] = 0;
  sprite.data[4] = 0;
}

/** Port of `AnimFastTranslateLinear`; returns the pre-decrement zero case. */
function fastTranslate(sprite: MutableFastParticle): boolean {
  if (sprite.data[0] === 0) return true;
  sprite.data[3] = (sprite.data[3]! + sprite.data[1]!) & 0xffff;
  sprite.data[4] = (sprite.data[4]! + sprite.data[2]!) & 0xffff;
  sprite.x2 = (sprite.data[1]! & 1) !== 0 ? -(sprite.data[3]! >>> 4) : sprite.data[3]! >>> 4;
  sprite.y2 = (sprite.data[2]! & 1) !== 0 ? -(sprite.data[4]! >>> 4) : sprite.data[4]! >>> 4;
  sprite.data[0] = sprite.data[0]! - 1;
  return false;
}

function createSnowball(callIndex: number, geometry: BlizzardGeometry): MutableFastParticle {
  const call = BLIZZARD_SNOWBALL_CALLS[callIndex]!;
  const saved = [
    call.speed,
    geometry.attackerCenter.x,
    geometry.targetCenter.x,
    geometry.attackerCenter.y + call.initialY,
    geometry.targetCenter.y,
    0,
    // `StoreSpriteCallbackInData6(DestroyAnimSprite)` pointer halves in the
    // pinned source build; callback behavior remains modeled symbolically.
    -17567, 2064,
  ];
  const sprite: MutableFastParticle = {
    callback: "AnimFastTranslateLinearWaitEnd",
    x: saved[1]!, y: saved[3]!, x2: 0, y2: 0, data: [...saved], destroyed: false,
  };
  initFastTranslation(sprite);
  sprite.data[1] = sprite.data[1]! ^ 1;
  sprite.data[2] = sprite.data[2]! ^ 1;
  while (true) {
    sprite.data[0] = 1;
    fastTranslate(sprite);
    if (sprite.x + sprite.x2 > 256 || sprite.x + sprite.x2 < -16
      || sprite.y + sprite.y2 > 160 || sprite.y + sprite.y2 < -16) break;
  }
  sprite.x += sprite.x2;
  sprite.y += sprite.y2;
  sprite.x2 = 0;
  sprite.y2 = 0;
  sprite.data = [...saved];
  sprite.data[1] = sprite.x;
  sprite.data[3] = sprite.y;
  initFastTranslation(sprite);
  // `InitAnimFastLinearTranslationWithSpeedAndPos` runs on the creation
  // callback pass and leaves the first translated state in the retained row.
  fastTranslate(sprite);
  return sprite;
}

function advanceSnowball(sprite: MutableFastParticle, side: BlizzardAttackerSide): void {
  switch (sprite.callback) {
    case "AnimFastTranslateLinearWaitEnd":
      if (fastTranslate(sprite)) sprite.callback = "AnimSwirlingSnowball_Step1";
      return;
    case "AnimSwirlingSnowball_Step1": {
      sprite.x += sprite.x2;
      sprite.y += sprite.y2;
      sprite.x2 = 0;
      sprite.y2 = 0;
      const amplitude = side === "opponent" ? 20 : -20;
      sprite.data[0] = 128;
      sprite.data[3] = gbaSignedSin(128, amplitude);
      sprite.data[4] = gbaSignedSin(192, 15);
      sprite.data[5] = 0;
      sprite.callback = "AnimSwirlingSnowball_Step2";
      advanceSnowball(sprite, side);
      return;
    }
    case "AnimSwirlingSnowball_Step2":
      if (sprite.data[5]! <= 31) {
        const amplitude = side === "opponent" ? 20 : -20;
        sprite.x2 = gbaSignedSin(sprite.data[0]!, amplitude) - sprite.data[3]!;
        sprite.y2 = gbaSignedSin(sprite.data[0]! + 64, 15) - sprite.data[4]!;
        sprite.data[0] = (sprite.data[0]! + 16) & 0xff;
        sprite.data[5] = sprite.data[5]! + 1;
      } else {
        sprite.x += sprite.x2;
        sprite.y += sprite.y2;
        sprite.x2 = 0;
        sprite.y2 = 0;
        sprite.data[3] = 0;
        sprite.data[4] = 0;
        sprite.callback = "AnimSwirlingSnowball_End";
      }
      return;
    case "AnimSwirlingSnowball_End":
      sprite.data[0] = 1;
      fastTranslate(sprite);
      sprite.destroyed = sprite.x + sprite.x2 > 256 || sprite.x + sprite.x2 < -16
        || sprite.y + sprite.y2 > 256 || sprite.y + sprite.y2 < -16;
      return;
    case "AnimWiggleParticleTowardsTarget":
      throw new Error("large Blizzard crystal passed to snowball callback");
  }
}

const BLIZZARD_SNOWBALL_OAM_SLOTS = [3, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 4, 7, 10] as const;
const BLIZZARD_LARGE_CRYSTAL_Y = [0, -10, 10, -20, 15, -20, 20, 0, -10, 10, -20, 15, -20, 20] as const;
const BLIZZARD_LARGE_CRYSTAL_OAM_SLOTS = {
  player: [4, 7, 10, 12, 14, 16, 18, 20, 22, 24, 26, 27, 28, 29],
  opponent: [4, 7, 10, 12, 14, 16, 18, 20, 22, 24, 26, 27, 28, 12],
} as const;

function snowballAtAge(
  callIndex: number,
  age: number,
  side: BlizzardAttackerSide,
  geometry: BlizzardGeometry,
): BlizzardSnowballState | null {
  const localAge = age - BLIZZARD_SNOWBALL_CALLS[callIndex]!.sourceAge;
  if (localAge < 0) return null;
  const sprite = createSnowball(callIndex, geometry);
  for (let tick = 0; tick < localAge && !sprite.destroyed; tick += 1) advanceSnowball(sprite, side);
  if (sprite.destroyed) return null;
  return {
    callIndex,
    oamSlot: BLIZZARD_SNOWBALL_OAM_SLOTS[callIndex]!,
    callback: sprite.callback as BlizzardSnowballCallback,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    data: sprite.data as unknown as BlizzardSnowballState["data"],
  };
}

function createLargeCrystal(callIndex: number, geometry: BlizzardGeometry): MutableFastParticle {
  const initialY = BLIZZARD_LARGE_CRYSTAL_Y[callIndex]!;
  const saved = [
    80,
    geometry.attackerCenter.x,
    geometry.targetCenter.x,
    geometry.attackerCenter.y + initialY,
    geometry.targetCenter.y + initialY,
    0, 0, 0,
  ];
  const sprite: MutableFastParticle = {
    callback: "AnimWiggleParticleTowardsTarget",
    x: saved[1]!, y: saved[3]!, x2: 0, y2: 0, data: [...saved], destroyed: false,
  };
  initFastTranslation(sprite);
  const translated = [...sprite.data];
  sprite.data[1] = sprite.data[1]! ^ 1;
  sprite.data[2] = sprite.data[2]! ^ 1;
  while (true) {
    sprite.data[0] = 1;
    fastTranslate(sprite);
    if (sprite.x + sprite.x2 > 256 || sprite.x + sprite.x2 < -16
      || sprite.y + sprite.y2 > 160 || sprite.y + sprite.y2 < -16) break;
  }
  sprite.x += sprite.x2;
  sprite.y += sprite.y2;
  sprite.x2 = 0;
  sprite.y2 = 0;
  sprite.data = translated;
  sprite.data[5] = 0;
  sprite.data[6] = 0;
  advanceLargeCrystal(sprite);
  return sprite;
}

function advanceLargeCrystal(sprite: MutableFastParticle): void {
  fastTranslate(sprite);
  if (sprite.data[0] === 0) sprite.data[0] = 1;
  sprite.y2 += gbaSignedSin(sprite.data[7]!, sprite.data[5]!);
  sprite.data[7] = (sprite.data[7]! + sprite.data[6]!) & 0xff;
  if (sprite.data[0] === 1) {
    sprite.destroyed = sprite.x + sprite.x2 > 256 || sprite.x + sprite.x2 < -16
      || sprite.y + sprite.y2 > 160 || sprite.y + sprite.y2 < -16;
  }
}

function largeCrystalAtAge(
  callIndex: number,
  age: number,
  side: BlizzardAttackerSide,
  geometry: BlizzardGeometry,
): BlizzardLargeCrystalState | null {
  const localAge = age - BLIZZARD_SNOWBALL_CALLS[callIndex]!.sourceAge;
  if (localAge < 0) return null;
  const sprite = createLargeCrystal(callIndex, geometry);
  for (let tick = 0; tick < localAge && !sprite.destroyed; tick += 1) advanceLargeCrystal(sprite);
  if (sprite.destroyed) return null;
  return {
    callIndex,
    oamSlot: BLIZZARD_LARGE_CRYSTAL_OAM_SLOTS[side][callIndex]!,
    callback: "AnimWiggleParticleTowardsTarget",
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    data: sprite.data as unknown as BlizzardLargeCrystalState["data"],
  };
}

export interface BlizzardImpactCrystalCall {
  readonly index: number;
  readonly kind: "large" | "small";
  readonly x: number;
  readonly y: number;
  readonly targetMode: 1;
  readonly sourceDelayAfter: 4;
}

/** Exact IceCrystalEffectLong call order; no sibling Icy Wind calls are mixed in. */
export const BLIZZARD_IMPACT_CRYSTALS: readonly BlizzardImpactCrystalCall[] = [
  { index: 0, kind: "large", x: -10, y: -10, targetMode: 1, sourceDelayAfter: 4 },
  { index: 1, kind: "small", x: 10, y: 20, targetMode: 1, sourceDelayAfter: 4 },
  { index: 2, kind: "large", x: -29, y: 0, targetMode: 1, sourceDelayAfter: 4 },
  { index: 3, kind: "small", x: 29, y: -20, targetMode: 1, sourceDelayAfter: 4 },
  { index: 4, kind: "large", x: -5, y: 10, targetMode: 1, sourceDelayAfter: 4 },
  { index: 5, kind: "small", x: 17, y: -12, targetMode: 1, sourceDelayAfter: 4 },
  { index: 6, kind: "large", x: -20, y: 0, targetMode: 1, sourceDelayAfter: 4 },
  { index: 7, kind: "small", x: -15, y: 15, targetMode: 1, sourceDelayAfter: 4 },
  { index: 8, kind: "small", x: 26, y: -5, targetMode: 1, sourceDelayAfter: 4 },
  { index: 9, kind: "small", x: 0, y: 0, targetMode: 1, sourceDelayAfter: 4 },
  { index: 10, kind: "large", x: 20, y: 2, targetMode: 1, sourceDelayAfter: 4 },
] as const;

const BLIZZARD_IMPACT_CREATE_OFFSETS = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60] as const;
const BLIZZARD_IMPACT_OAM_SLOTS = [3, 4, 5, 7, 9, 10, 11, 3, 4, 5, 7] as const;

/** The move-owned projection of the live pre-Blizzard `sSpriteOrder`. */
export const BLIZZARD_EFFECT_SPRITE_ORDER_SEED = [
  3, 4, 21, 20, 5, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 7,
  23, 22, 24, 25, 26, 27, 28, 29,
] as const;

export interface BlizzardEffectOamEntry {
  readonly kind: "snowball" | "traveling" | "impact";
  readonly callIndex: number;
  readonly oamSlot: number;
}

function blizzardEffectOwner(
  kind: BlizzardEffectOamEntry["kind"],
  callIndex: number,
): number {
  if (kind === "snowball") return callIndex * 2;
  if (kind === "traveling") return callIndex * 2 + 1;
  return 100 + callIndex;
}

function blizzardEffectEntries(
  frame: Readonly<BlizzardState>,
): readonly BlizzardEffectOamEntry[] {
  return [
    ...frame.snowballs.map(({ callIndex, oamSlot }) => ({
      kind: "snowball" as const, callIndex, oamSlot,
    })),
    ...frame.largeCrystals.map(({ callIndex, oamSlot }) => ({
      kind: "traveling" as const, callIndex, oamSlot,
    })),
    ...frame.impactCrystals.map(({ callIndex, oamSlot }) => ({
      kind: "impact" as const, callIndex, oamSlot,
    })),
  ].sort((left, right) =>
    blizzardEffectOwner(left.kind, left.callIndex)
      - blizzardEffectOwner(right.kind, right.callIndex));
}

function blizzardEffectOrderKey(
  entry: Readonly<BlizzardEffectOamEntry>,
  frame: Readonly<BlizzardState>,
): SpriteOrderKey {
  if (entry.kind === "snowball") {
    const sprite = frame.snowballs.find(({ callIndex }) => callIndex === entry.callIndex)!;
    return { priority: 2, subpriority: 0, oamY: sprite.y + sprite.y2 - 4 };
  }
  if (entry.kind === "traveling") {
    const sprite = frame.largeCrystals.find(({ callIndex }) => callIndex === entry.callIndex)!;
    return { priority: 2, subpriority: 0, oamY: sprite.y + sprite.y2 - 8 };
  }
  const sprite = frame.impactCrystals.find(({ callIndex }) => callIndex === entry.callIndex)!;
  return {
    priority: 2,
    subpriority: 0,
    oamY: sprite.y - (sprite.kind === "large" ? 8 : 4),
    affineMode: "normal",
    oamSize: 0,
    oamShape: sprite.kind === "large" ? "vertical" : "square",
  };
}

/**
 * Replays Blizzard's source CreateSprite/DestroySprite lifecycle and the
 * stable `SortSprites` pass. This is a source-relative OAM order, not an
 * age-indexed painter table.
 */
export function blizzardEffectOamOrderAtAge(
  age: number,
  side: BlizzardAttackerSide,
  geometry: BlizzardGeometry,
): readonly BlizzardEffectOamEntry[] {
  if (!Number.isInteger(age)) throw new RangeError(`Blizzard age must be an integer, got ${age}`);
  if (age < 0) return [];
  const cacheKey = `${side}:${geometry.attackerCenter.x},${geometry.attackerCenter.y}`
    + `:${geometry.targetCenter.x},${geometry.targetCenter.y}`;
  let cache = blizzardOamOrderCache.get(cacheKey);
  if (!cache) {
    cache = {
      scheduler: createSpriteOrderState(
        BLIZZARD_EFFECT_SPRITE_ORDER_SEED,
        BLIZZARD_EFFECT_SPRITE_ORDER_SEED,
      ),
      nextAge: 0,
      orders: new Map(),
    };
    blizzardOamOrderCache.set(cacheKey, cache);
  }
  const cached = cache.orders.get(age);
  if (cached) return cached;
  for (let tick = cache.nextAge; tick <= age; tick += 1) {
    const frame = blizzardAtAge(tick, side, geometry);
    const desired = blizzardEffectEntries(frame);
    const desiredOwners = new Set(desired.map((entry) =>
      blizzardEffectOwner(entry.kind, entry.callIndex)));
    for (const entry of desired) {
      const owner = blizzardEffectOwner(entry.kind, entry.callIndex);
      const key = blizzardEffectOrderKey(entry, frame);
      if (spriteSlotForOwner(cache.scheduler, owner) === null) {
        cache.scheduler = createOrderedSprite(cache.scheduler, owner, key);
        const allocated = spriteSlotForOwner(cache.scheduler, owner);
        if (allocated !== entry.oamSlot) {
          throw new Error(
            `Blizzard ${entry.kind} ${entry.callIndex} allocated slot ${allocated}, expected ${entry.oamSlot}`,
          );
        }
      } else {
        cache.scheduler = updateOrderedSprite(cache.scheduler, owner, key);
      }
    }
    for (const occupant of [...cache.scheduler.occupants]) {
      if (!desiredOwners.has(occupant.owner)) {
        cache.scheduler = destroyOrderedSprite(cache.scheduler, occupant.owner);
      }
    }
    cache.scheduler = sortSpriteOrder(cache.scheduler);
    const entryByOwner = new Map(desired.map((entry) => [
      blizzardEffectOwner(entry.kind, entry.callIndex), entry,
    ]));
    const ownerBySlot = new Map(
      cache.scheduler.occupants.map(({ owner, slot }) => [slot, owner]),
    );
    const order = cache.scheduler.order.flatMap((slot) => {
      const owner = ownerBySlot.get(slot);
      const entry = owner === undefined ? undefined : entryByOwner.get(owner);
      return entry ? [entry] : [];
    });
    cache.orders.set(tick, order);
    cache.nextAge = tick + 1;
  }
  return cache.orders.get(age)!;
}

interface BlizzardOamOrderCache {
  scheduler: SpriteOrderState;
  nextAge: number;
  readonly orders: Map<number, readonly BlizzardEffectOamEntry[]>;
}

const blizzardOamOrderCache = new Map<string, BlizzardOamOrderCache>();

function impactCrystalAtAge(
  callIndex: number,
  age: number,
  side: BlizzardAttackerSide,
  geometry: BlizzardGeometry,
  impactStartAge: number,
): BlizzardImpactCrystalState | null {
  const localAge = age - impactStartAge - BLIZZARD_IMPACT_CREATE_OFFSETS[callIndex]!;
  if (localAge < 0 || localAge >= 37) return null;
  const call = BLIZZARD_IMPACT_CRYSTALS[callIndex]!;
  const xOffset = side === "opponent" ? -call.x : call.x;
  const scale = localAge < 10 ? 211 + localAge * 5 : 256;
  const matrixScale = Math.trunc(65536 / scale);
  const flickerAge = localAge - 17;
  return {
    callIndex,
    oamSlot: BLIZZARD_IMPACT_OAM_SLOTS[callIndex]!,
    kind: call.kind,
    callback: localAge <= 16
      ? "RunStoredCallbackWhenAffineAnimEnds"
      : "AnimFlickerIceEffectParticle",
    x: geometry.targetCenter.x + xOffset,
    y: geometry.targetCenter.y + call.y,
    invisible: flickerAge > 0 && (flickerAge & 1) === 1,
    timer: Math.max(0, flickerAge),
    matrix: [matrixScale, 0, 0, matrixScale],
  };
}

/**
 * `waitforvisualfinish` releases when the final source-driven traveling
 * particle has destroyed itself. The 11-row bilateral difference therefore
 * falls out of the same callback simulation instead of an orientation age
 * table.
 */
export function blizzardImpactStartAge(
  side: BlizzardAttackerSide,
  geometry: BlizzardGeometry,
): number {
  for (let age = 115; age < 400; age += 1) {
    const snowballs = BLIZZARD_SNOWBALL_CALLS.some((_, index) =>
      snowballAtAge(index, age, side, geometry) !== null);
    const largeCrystals = BLIZZARD_SNOWBALL_CALLS.some((_, index) =>
      largeCrystalAtAge(index, age, side, geometry) !== null);
    if (!snowballs && !largeCrystals) return age + 1;
  }
  throw new Error("Blizzard traveling particles did not clean up");
}

function backgroundBlendY(age: number, impactStartAge: number): number {
  if (age >= 9 && age <= 24) return age - 8;
  if (age >= 25 && age <= 27) return 16;
  if (age >= 28 && age <= 43) return 43 - age;
  const restore = age - impactStartAge;
  if (restore >= 122 && restore <= 137) return restore - 121;
  if (restore >= 138 && restore <= 141) return 16;
  if (restore >= 142 && restore <= 157) return 157 - restore;
  return 0;
}

function backgroundBlendCnt(age: number, impactStartAge: number): 0 | 232 {
  if (age >= 8 && age <= 43) return 232;
  const restore = age - impactStartAge;
  return restore >= 121 && restore <= 157 ? 232 : 0;
}

function scriptOffsetAtAge(age: number, impactStartAge: number): number | null {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 5;
  if (age <= 25) return 22;
  if (age <= 44) return 38;
  if (age <= 49) return 124;
  if (age <= 54) return 168;
  if (age <= 59) return 212;
  if (age <= 64) return 256;
  if (age <= 69) return 300;
  if (age <= 74) return 344;
  if (age <= 79) return 388;
  if (age <= 84) return 124;
  if (age <= 89) return 168;
  if (age <= 94) return 212;
  if (age <= 99) return 256;
  if (age <= 104) return 300;
  if (age <= 109) return 344;
  if (age <= 114) return 388;
  if (age < impactStartAge) return 61;
  const local = age - impactStartAge;
  if (local <= 59) return null;
  if (local <= 97) return 67;
  if (local <= 119) return 70;
  if (local <= 138) return 71;
  if (local <= 158) return 76;
  return 79;
}

/** Complete source-relative Move_BLIZZARD reducer. */
export function blizzardAtAge(
  age: number,
  side: BlizzardAttackerSide,
  geometry: BlizzardGeometry,
): BlizzardState {
  if (!Number.isInteger(age)) throw new RangeError(`Blizzard age must be an integer, got ${age}`);
  const impactStartAge = blizzardImpactStartAge(side, geometry);
  const cleanupAge = impactStartAge + 163;
  const snowballs = age < 0 ? [] : BLIZZARD_SNOWBALL_CALLS.flatMap((_, callIndex) => {
    const state = snowballAtAge(callIndex, age, side, geometry);
    return state ? [state] : [];
  });
  const largeCrystals = age < 0 ? [] : BLIZZARD_SNOWBALL_CALLS.flatMap((_, callIndex) => {
    const state = largeCrystalAtAge(callIndex, age, side, geometry);
    return state ? [state] : [];
  });
  const impactCrystals = age < impactStartAge ? [] : BLIZZARD_IMPACT_CRYSTALS.flatMap((_, callIndex) => {
    const state = impactCrystalAtAge(callIndex, age, side, geometry, impactStartAge);
    return state ? [state] : [];
  });
  const impactLocal = age - impactStartAge;
  const active = age >= 0 && age < cleanupAge;
  const phase: BlizzardState["phase"] = !active ? "inactive"
    : age < 7 ? "setup"
      : age < 45 ? "background-in"
        : age < impactStartAge ? "snow"
          : impactLocal <= 97 ? "impact"
            : impactLocal <= 119 ? "delay"
              : impactLocal <= 158 ? "background-out"
                : "cleanup";
  const scrollTaskActive = age >= 26 && impactLocal <= 138;
  const backgroundScrollX = scrollTaskActive
    ? (side === "player" ? -1 : 1) * 9 * (age - 25)
    : 0;
  const displayedBackgroundScrollX = age >= 27 && impactLocal <= 139
    ? (side === "player" ? -1 : 1) * 9 * (age - 26)
    : 0;
  const audioStart = age === 45 ? "SE_M_BLIZZARD"
    : age === 115 ? "SE_M_BLIZZARD2"
      : impactCrystals.some(({ callIndex }) => age === impactStartAge + BLIZZARD_IMPACT_CREATE_OFFSETS[callIndex]!)
        ? "SE_M_ICY_WIND" : null;
  return {
    age,
    active,
    phase,
    scriptOffset: age < 0 ? null : scriptOffsetAtAge(age, impactStartAge),
    snowballs,
    largeCrystals,
    impactCrystals,
    impactStartAge,
    visualTaskCount: snowballs.length + largeCrystals.length + impactCrystals.length,
    soundTaskActive: age >= 45 && age < (side === "player" ? 108 : 107),
    backgroundFadeTaskActive: (age >= 7 && age <= 43)
      || (impactLocal >= 120 && impactLocal <= 157),
    backgroundScrollTaskActive: scrollTaskActive,
    audioStart,
    currentAudio: age < 45 ? "pre-move"
      : age < 115 ? "SE_M_BLIZZARD"
        : age < impactStartAge ? "SE_M_BLIZZARD2" : "SE_M_ICY_WIND",
    resourcesLoaded: age >= 1 && age < cleanupAge,
    monBgTaskActive: age >= 4 && age < impactStartAge + 162,
    monBgClearTaskActive: impactLocal >= 159 && impactLocal <= 161,
    monBgDisplayed: age >= 5 && age < cleanupAge,
    background: age >= 26 && impactLocal <= 139
      ? (side === "player" ? "highspeed-player" : "highspeed-opponent")
      : "field",
    backgroundScrollX,
    displayedBackgroundScrollX,
    blendCnt: backgroundBlendCnt(age, impactStartAge),
    blendY: backgroundBlendY(age, impactStartAge),
    paletteTransfer: age === 0 ? "initial" : age === 4 ? "same-row-monbg" : "previous-row",
  };
}

export const BLIZZARD_SOURCE_AUDIO = [
  "SE_M_BLIZZARD",
  "SE_M_BLIZZARD2",
  ...BLIZZARD_IMPACT_CRYSTALS.map(() => "SE_M_ICY_WIND"),
] as const;

export const BLIZZARD_CLEANUP = [
  "restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein",
  "clearmonbg ANIM_DEF_PARTNER", "end",
] as const;

export function blizzardSnowballCallsAtSourceAge(age: number): readonly BlizzardSnowballCall[] {
  return BLIZZARD_SNOWBALL_CALLS.filter((call) => call.sourceAge === age);
}
