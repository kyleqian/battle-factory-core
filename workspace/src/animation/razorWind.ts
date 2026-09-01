/**
 * Source-relative reducer for Move_RAZOR_WIND's two visual bodies.
 *
 * The battle engine supplies geometry and the live allocator profile.  This
 * module only reduces the source callbacks: no damage, RNG, turn, or
 * facility state crosses this seam.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  type SpriteOrderState,
} from "./spriteOrder.ts";

export type RazorWindSide = "player" | "opponent";
export type RazorWindBody = "setup" | "unleash";

export const RAZOR_WIND_SETUP_LAST_AGE = 45;
export const RAZOR_WIND_UNLEASH_LAST_AGE = 72;

export interface RazorWindAnimationProfile {
  /** The slots and matrices selected by the live source allocator. */
  readonly tornadoSpriteSlots: readonly [number, number, number];
  readonly tornadoMatrixIds: readonly [number, number, number];
  readonly crescentSpriteSlots: readonly [number, number, number];
  readonly crescentMatrixIds: readonly [number, number, number];
  /** Persistent source order immediately before this move's allocations. */
  readonly spriteOrderSeed: readonly number[];
  readonly effectPriority?: number;
  readonly effectSubpriority?: number;
}

export interface RazorWindGeometry {
  readonly attackerPositionCenter: Readonly<{ x: number; y: number }>;
  readonly attackerPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
}

export interface RazorWindSprite {
  readonly kind: "tornado" | "crescent";
  readonly index: 0 | 1 | 2;
  readonly slot: number;
  readonly matrixId: number;
  readonly sourceCreationOrder: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: readonly [number, number, number, number];
  readonly frame: 0 | 1 | 2 | 3;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
  readonly subpriority: number;
  readonly callback: "TranslateSpriteInCircle" | "StartAnimLinearTranslation" | "DestroyAnimSprite";
}

export interface RazorWindEffect {
  readonly body: RazorWindBody;
  readonly age: number;
  readonly active: boolean;
  readonly attackerSide: RazorWindSide;
  readonly sprites: readonly RazorWindSprite[];
  /** Source BuildOamBuffer painter order for the move-owned slots. */
  readonly painterOrder: readonly number[];
  readonly resources: Readonly<{
    gust: boolean;
    airWave2: boolean;
    impact: boolean;
    freed: boolean;
  }>;
  readonly registers: Readonly<{
    monbg: boolean;
    alpha: readonly [12, 8] | null;
  }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly shakeTask: Readonly<{
    active: boolean;
    target: "ANIM_TARGET";
    localAge: number;
    callback: "AnimTask_ShakeMon2_Step";
  }> | null;
  readonly cleanup: Readonly<{
    clearmonbg: boolean;
    blendoff: boolean;
    firstInactive: boolean;
  }>;
}

function assertPoint(point: Readonly<{ x: number; y: number }>, label: string): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`${label} must contain integer coordinates`);
  }
}

function assertProfile(profile: Readonly<RazorWindAnimationProfile>): void {
  const slots = [
    ...profile.tornadoSpriteSlots,
    ...profile.crescentSpriteSlots,
    ...profile.spriteOrderSeed,
  ];
  const matrices = [...profile.tornadoMatrixIds, ...profile.crescentMatrixIds];
  if (slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || new Set(profile.spriteOrderSeed).size !== profile.spriteOrderSeed.length
    || matrices.some((matrix) => !Number.isInteger(matrix) || matrix < 0 || matrix >= 32)
    || new Set(profile.tornadoMatrixIds).size !== 3
    || new Set(profile.crescentMatrixIds).size !== 3) {
    throw new Error("invalid Razor Wind live allocation profile");
  }
  const ownedSlots = new Set([...profile.tornadoSpriteSlots, ...profile.crescentSpriteSlots]);
  if ([...ownedSlots].some((slot) => !profile.spriteOrderSeed.includes(slot))) {
    throw new Error("Razor Wind sprite order seed must contain move-owned slots");
  }
}

function signedSine(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function emptyOrder(profile: Readonly<RazorWindAnimationProfile>): SpriteOrderState {
  return createSpriteOrderState(profile.spriteOrderSeed, profile.spriteOrderSeed);
}

function addToOrder(
  state: SpriteOrderState,
  sprite: RazorWindSprite,
  owner: number,
  profile: Readonly<RazorWindAnimationProfile>,
): SpriteOrderState {
  return createOrderedSprite(state, owner, {
    priority: profile.effectPriority ?? 1,
    subpriority: sprite.subpriority,
    oamY: sprite.y + sprite.y2,
    affineMode: sprite.kind === "tornado" ? "normal" : "off",
    oamSize: sprite.kind === "tornado" ? 2 : 0,
    oamShape: sprite.kind === "tornado" ? "vertical" : "square",
  });
}

function tornadoAtAge(
  age: number,
  side: RazorWindSide,
  geometry: Readonly<RazorWindGeometry>,
  profile: Readonly<RazorWindAnimationProfile>,
): RazorWindSprite[] {
  if (age < 4 || age > 43) return [];
  const local = age - 4;
  const sign = side === "player" ? 1 : -1;
  const baseX = geometry.attackerPositionCenter.x + sign * 32;
  const baseY = geometry.attackerPositionCenter.y + (side === "player" ? 16 : 0);
  const sprites: RazorWindSprite[] = [];
  for (let index = 0 as 0 | 1 | 2; index < 3; index = (index + 1) as 0 | 1 | 2) {
    const initialAngle = index * 85;
    const phase = initialAngle + 7 * (local + 1);
    const scale = Math.floor(65536 / (16 + 4 * (local + 1)));
    sprites.push({
      kind: "tornado", index, slot: profile.tornadoSpriteSlots[index],
      matrixId: profile.tornadoMatrixIds[index], sourceCreationOrder: index,
      x: baseX, y: baseY,
      x2: signedSine(phase, 16), y2: signedSine(phase + 64, 16),
      matrix: [scale, 0, 0, 256], frame: 0, hFlip: false, vFlip: false,
      subpriority: profile.effectSubpriority ?? (side === "player" ? 28 : 38),
      callback: "TranslateSpriteInCircle",
    });
  }
  return sprites;
}

const CRESCENT_ARGS = [
  { x: 8, y: 0, seek: 2 },
  { x: -8, y: 16, seek: 1 },
  { x: 12, y: -16, seek: 0 },
] as const;

function crescentAtAge(
  age: number,
  side: RazorWindSide,
  geometry: Readonly<RazorWindGeometry>,
  profile: Readonly<RazorWindAnimationProfile>,
): RazorWindSprite[] {
  const sign = side === "player" ? 1 : -1;
  const sprites: RazorWindSprite[] = [];
  for (let index = 0 as 0 | 1 | 2; index < 3; index = (index + 1) as 0 | 1 | 2) {
    const spawnAge = 10 + index * 4;
    const local = age - spawnAge;
    if (local < 0 || local > 23) continue;
    const args = CRESCENT_ARGS[index];
    const startX = geometry.attackerPictureCenter.x + sign * 14;
    const startY = geometry.attackerPictureCenter.y + sign * 8;
    const targetX = geometry.targetPictureCenter.x + sign * args.x;
    const targetY = geometry.targetPictureCenter.y + sign * args.y;
    const callbacks = Math.min(local + 1, 22);
    const frame = ((args.seek + Math.floor((local + 1) / 3)) & 3) as 0 | 1 | 2 | 3;
    sprites.push({
      kind: "crescent", index, slot: profile.crescentSpriteSlots[index],
      matrixId: profile.crescentMatrixIds[index], sourceCreationOrder: index,
      x: startX, y: startY,
      x2: linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(targetX - startX, 22), callbacks, 22,
      ),
      y2: linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(targetY - startY, 22), callbacks, 22,
      ),
      matrix: [256, 0, 0, 256], frame,
      hFlip: frame === 1 || frame === 3, vFlip: frame === 2 || frame === 3,
      subpriority: profile.effectSubpriority ?? (side === "player" ? 28 : 38),
      callback: local === 23 ? "DestroyAnimSprite" : "StartAnimLinearTranslation",
    });
  }
  return sprites;
}

function orderedSprites(
  sprites: readonly RazorWindSprite[],
  profile: Readonly<RazorWindAnimationProfile>,
): readonly number[] {
  let order = emptyOrder(profile);
  sprites.forEach((sprite, index) => {
    order = addToOrder(order, sprite, index + 1, profile);
  });
  order = sortSpriteOrder(order);
  return spriteOwnersBackToFront(order)
    .map((owner) => sprites.find((_, index) => index + 1 === owner)?.slot)
    .filter((slot): slot is number => slot !== undefined);
}

function commonState(
  age: number,
  body: RazorWindBody,
  side: RazorWindSide,
  sprites: readonly RazorWindSprite[],
  profile: Readonly<RazorWindAnimationProfile>,
): RazorWindEffect {
  const lastAge = body === "setup"
    ? RAZOR_WIND_SETUP_LAST_AGE : RAZOR_WIND_UNLEASH_LAST_AGE;
  const firstInactive = age > lastAge;
  const taskActive = body === "unleash" && age >= 37 && age <= 54;
  return {
    body, age, active: age >= 0 && age <= lastAge, attackerSide: side,
    sprites, painterOrder: orderedSprites(sprites, profile),
    resources: {
      gust: body === "setup" && age >= 0 && age <= 44,
      airWave2: body === "unleash" && age >= 0 && age <= 59,
      impact: body === "unleash" && age >= 0 && age <= 59,
      freed: body === "unleash" ? age >= 60 : age >= 45,
    },
    registers: {
      monbg: body === "unleash" && age >= 7 && age <= 58,
      alpha: body === "unleash" && age >= 10 && age <= 55 ? [12, 8] : null,
    },
    targetOffset: taskActive
      ? shakeMon2OffsetAtTick(2, 0, 10, 1, age - 37)
      : { x2: 0, y2: 0 },
    shakeTask: taskActive ? {
      active: true, target: "ANIM_TARGET", localAge: age - 37,
      callback: "AnimTask_ShakeMon2_Step",
    } : null,
    cleanup: {
      clearmonbg: body === "unleash" && age >= 59,
      blendoff: body === "unleash" && age >= 59,
      firstInactive,
    },
  };
}

export function razorWindAtAge(
  age: number,
  body: RazorWindBody,
  attackerSide: RazorWindSide,
  geometry: Readonly<RazorWindGeometry>,
  profile: Readonly<RazorWindAnimationProfile>,
): RazorWindEffect {
  assertPoint(geometry.attackerPositionCenter, "attackerPositionCenter");
  assertPoint(geometry.attackerPictureCenter, "attackerPictureCenter");
  assertPoint(geometry.targetPictureCenter, "targetPictureCenter");
  assertProfile(profile);
  const sprites = body === "setup"
    ? tornadoAtAge(age, attackerSide, geometry, profile)
    : crescentAtAge(age, attackerSide, geometry, profile);
  return commonState(age, body, attackerSide, sprites, profile);
}
