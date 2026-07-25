/**
 * Source-relative presentation facts for `Move_BLAZE_KICK`.
 *
 * Age zero is the first displayed `monbg ANIM_TARGET` frame. The seven
 * `gFireSpreadSpriteTemplate` instances are the shared `FireSpreadEffect`
 * source component also used by FIRE PUNCH. Damage, burn, and controller
 * progression are intentionally outside this reducer.
 */

import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  spriteSlotForOwner,
  updateOrderedSprite,
  type SpriteOrderKey,
  type SpriteOrderState,
} from "./spriteOrder.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export interface BlazeKickFireSpreadSprite {
  readonly index: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly sheetFrame: 1 | 2 | 3;
}

export interface BlazeKickGeometry {
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly targetSubpriority: 30 | 40;
  readonly attackerSide: "player" | "opponent";
  /** Foot, hitsplat, invisible palette sprite, and seven FireSpread slots. */
  readonly spriteSlots: readonly number[];
  /** Live relative `sSpriteOrder` immediately before foot allocation. */
  readonly spriteOrderSeed: readonly number[];
}

export interface BlazeKickAffineMatrix {
  readonly pa: number;
  readonly pb: number;
  readonly pc: number;
  readonly pd: number;
}

export type BlazeKickOrderedSprite =
  | Readonly<{
      kind: "foot";
      slot: number;
      centerX: number;
      centerY: number;
      matrix: BlazeKickAffineMatrix;
    }>
  | Readonly<{
      kind: "hitsplat";
      slot: number;
      centerX: number;
      centerY: number;
    }>
  | Readonly<{
      kind: "fireSpread";
      slot: number;
      sprite: BlazeKickFireSpreadSprite;
    }>;

type BlazeKickPendingSprite =
  BlazeKickOrderedSprite extends infer T
    ? T extends BlazeKickOrderedSprite
      ? Omit<T, "slot">
      : never
    : never;

export interface BlazeKickPaletteState {
  readonly targetTint: Readonly<{
    color: "white" | "black";
    coeff: number;
  }> | null;
  readonly attackerBlackCoeff: number;
  readonly backgroundBlackCoeff: number;
}

export interface BlazeKickAnimationState {
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetX2: number;
  readonly hitsplatVisible: boolean;
  readonly spinningFootVisible: boolean;
  readonly fireSpread: readonly BlazeKickFireSpreadSprite[];
}

export const BLAZE_KICK_MOVE_BODY_FIRST_AGE = 0;
export const BLAZE_KICK_MOVE_BODY_LAST_AGE = 77;
export const BLAZE_KICK_FIRE_SPREAD_FIRST_AGE = 35;
export const BLAZE_KICK_FIRE_SPREAD_LAST_AGE = 75;

const FOOT_OWNER = 100;
const HITSPLAT_OWNER = 101;
const PALETTE_SPRITE_OWNER = 102;
const FIRE_OWNER_BASE = 200;

const FIRE_SPREAD_VELOCITIES = [
  [192, 176],
  [-192, 240],
  [192, -160],
  [-192, -112],
  [160, 48],
  [-224, -32],
  [112, -128],
] as const;

export function blazeKickFireSpreadAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly BlazeKickFireSpreadSprite[] {
  const callbackAge = age - BLAZE_KICK_FIRE_SPREAD_FIRST_AGE;
  if (callbackAge < 0 || callbackAge > 40) return [];
  // The final captured sprite is the callback's 40th state held for the
  // destruction pass; it does not execute a 41st translation.
  const translationSteps = Math.min(callbackAge + 1, 40);
  return FIRE_SPREAD_VELOCITIES.map(([velocityX, velocityY], index) => ({
    index,
    centerX: targetCenter.x + ((velocityX * translationSteps) >> 8),
    centerY: targetCenter.y + 10 + ((velocityY * translationSteps) >> 8),
    sheetFrame: (1 + (Math.floor((callbackAge + 1) / 4) % 3)) as 1 | 2 | 3,
  }));
}

export function blazeKickAnimationAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): BlazeKickAnimationState {
  return {
    targetOnMonBg: age >= 0 && age < 77,
    alpha: age >= 3 && age < 77 ? { eva: 12, evb: 8 } : null,
    // `AnimTask_ShakeMon2` (`shakeMon2.ts`), driven by the script's own args
    // (`createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 3, 0, 14, 1`,
    // `battle_anim_scripts.s:8498`). Its creation coincides (zero delay
    // between them) with `call FireSpreadEffect`'s own first tick, so it
    // anchors on the same `BLAZE_KICK_FIRE_SPREAD_FIRST_AGE` constant, with
    // the same +1 creation-anchor idiom `dragonBreath.ts`/fly.ts's
    // `AnimTask_ShakeMon`/`AnimTask_ShakeMon2` call sites use (the port's
    // own tick 0 is never independently displayed here either).
    targetX2: age < BLAZE_KICK_FIRE_SPREAD_FIRST_AGE
      ? 0
      : shakeMon2OffsetAtTick(
          3, 0, 14, 1,
          age - BLAZE_KICK_FIRE_SPREAD_FIRST_AGE + 1,
        ).x2,
    hitsplatVisible: age >= 35 && age <= 43,
    spinningFootVisible: age >= 3 && age <= 55,
    fireSpread: blazeKickFireSpreadAtAge(age, targetCenter),
  };
}

/**
 * `RunAffineAnimFrame` plus the HLE-BIOS `ObjAffineSet` used by the selected
 * oracle. The source scale accumulator shrinks by 8 and rotates by 20/256 of
 * a circle per display. mGBA computes the BIOS transform with real trig
 * before truncating the signed matrix words; quantizing through the game's
 * separate sine table diverges at the final small scales.
 */
export function blazeKickSpinningFootMatrixAtAge(
  age: number,
): BlazeKickAffineMatrix | null {
  if (age < 3 || age > 55) return null;
  if (age >= 34) return { pa: 256, pb: 0, pc: 0, pd: 256 };
  const step = age - 2;
  const scaleAccumulator = 256 - step * 8;
  const inverseScale = Math.trunc(0x10000 / scaleAccumulator);
  const radians = ((step * 20) & 0xff) * 2 * Math.PI / 256;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    pa: Math.trunc(inverseScale * cosine),
    pb: Math.trunc(-inverseScale * sine),
    pc: Math.trunc(inverseScale * sine),
    pd: Math.trunc(inverseScale * cosine),
  };
}

export function blazeKickPaletteAtAge(age: number): BlazeKickPaletteState {
  const whiteCoeff =
    age >= 7 && age <= 9 ? 1
    : age >= 10 && age <= 12 ? 2
    : age >= 13 && age <= 15 ? 3
    : age >= 16 && age <= 18 ? 4
    : age >= 19 && age <= 21 ? 5
    : age >= 22 && age <= 24 ? 6
    : age >= 25 && age <= 34 ? 7
    : 0;
  return {
    targetTint:
      age === 35
        ? { color: "black", coeff: 8 }
        : whiteCoeff > 0
          ? { color: "white", coeff: whiteCoeff }
          : null,
    attackerBlackCoeff: age >= 35 && age <= 37 ? 8 : 0,
    backgroundBlackCoeff: age >= 35 && age <= 37 ? 8 : 0,
  };
}

function createOrUpdate(
  scheduler: SpriteOrderState,
  owner: number,
  key: Readonly<SpriteOrderKey>,
): SpriteOrderState {
  return spriteSlotForOwner(scheduler, owner) === null
    ? createOrderedSprite(scheduler, owner, key)
    : updateOrderedSprite(scheduler, owner, key);
}

/**
 * Persistent source allocation/order lifetime for the visible foot,
 * hitsplat, and seven FireSpread sprites. The invisible complex-palette
 * sprite is included because it owns source slot 5 and participates in the
 * persistent sort even though it never paints a pixel.
 */
export function blazeKickSpritesAtAge(
  age: number,
  geometry: Readonly<BlazeKickGeometry>,
): readonly BlazeKickOrderedSprite[] {
  let scheduler = createSpriteOrderState(
    geometry.spriteSlots,
    geometry.spriteOrderSeed,
  );
  let visibleByOwner = new Map<number, BlazeKickOrderedSprite>();
  for (let tickAge = 0; tickAge <= age; tickAge += 1) {
    const current = new Map<number, BlazeKickPendingSprite>();
    const footMatrix = blazeKickSpinningFootMatrixAtAge(tickAge);
    if (footMatrix) {
      current.set(FOOT_OWNER, {
        kind: "foot",
        centerX: geometry.targetCenter.x,
        centerY: geometry.targetCenter.y,
        matrix: footMatrix,
      });
      scheduler = createOrUpdate(scheduler, FOOT_OWNER, {
        priority: 2,
        subpriority: geometry.targetSubpriority - 3,
        oamY: geometry.targetCenter.y - 32,
        affineMode: "double",
        oamSize: 2,
        oamShape: "square",
      });
    } else if (spriteSlotForOwner(scheduler, FOOT_OWNER) !== null) {
      scheduler = destroyOrderedSprite(scheduler, FOOT_OWNER);
    }

    if (tickAge >= 35 && tickAge <= 43) {
      current.set(HITSPLAT_OWNER, {
        kind: "hitsplat",
        centerX: geometry.targetCenter.x,
        centerY: geometry.targetCenter.y,
      });
      scheduler = createOrUpdate(scheduler, HITSPLAT_OWNER, {
        priority: 2,
        subpriority: geometry.targetSubpriority - 2,
        oamY: geometry.targetCenter.y - 16,
        affineMode: "normal",
        oamSize: 2,
        oamShape: "square",
      });
    } else if (spriteSlotForOwner(scheduler, HITSPLAT_OWNER) !== null) {
      scheduler = destroyOrderedSprite(scheduler, HITSPLAT_OWNER);
    }

    if (tickAge >= 35 && tickAge <= 43) {
      scheduler = createOrUpdate(scheduler, PALETTE_SPRITE_OWNER, {
        priority: 3,
        subpriority: geometry.attackerSide === "player" ? 28 : 38,
        oamY: 160,
      });
    } else if (spriteSlotForOwner(scheduler, PALETTE_SPRITE_OWNER) !== null) {
      scheduler = destroyOrderedSprite(scheduler, PALETTE_SPRITE_OWNER);
    }

    const spreads = blazeKickFireSpreadAtAge(tickAge, geometry.targetCenter);
    const spreadOwners = new Set(
      spreads.map((sprite) => FIRE_OWNER_BASE + sprite.index),
    );
    for (let index = 0; index < FIRE_SPREAD_VELOCITIES.length; index += 1) {
      const owner = FIRE_OWNER_BASE + index;
      if (
        !spreadOwners.has(owner)
        && spriteSlotForOwner(scheduler, owner) !== null
      ) {
        scheduler = destroyOrderedSprite(scheduler, owner);
      }
    }
    for (const sprite of spreads) {
      const owner = FIRE_OWNER_BASE + sprite.index;
      current.set(owner, { kind: "fireSpread", sprite });
      scheduler = createOrUpdate(scheduler, owner, {
        priority: 2,
        subpriority: geometry.targetSubpriority - 1,
        oamY: sprite.centerY - 16,
      });
    }
    scheduler = sortSpriteOrder(scheduler);
    if (tickAge === age) {
      visibleByOwner = new Map(
        [...current].map(([owner, sprite]) => [
          owner,
          {
            ...sprite,
            slot: spriteSlotForOwner(scheduler, owner)!,
          } as BlazeKickOrderedSprite,
        ]),
      );
    }
  }
  return spriteOwnersBackToFront(scheduler)
    .map((owner) => visibleByOwner.get(owner))
    .filter((sprite): sprite is BlazeKickOrderedSprite => sprite !== undefined);
}
