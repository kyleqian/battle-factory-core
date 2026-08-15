import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { healingBlueStarsAtAge } from "./recover.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
} from "./spriteOrder.ts";

export interface MegaDrainOrbArgs {
  readonly x: number;
  readonly y: number;
  readonly waveAmplitude: number;
  readonly wavePeriod: number;
}

/**
 * `MegaDrainAbsorbEffect` creates two absorption-orb sprites before each
 * literal `delay 4`.  Keep the pair structure: its restart cadence is part of
 * the source script, rather than Absorb's one-orb sequence.
 */
export const MEGA_DRAIN_ORB_PAIRS = Object.freeze([
  Object.freeze([
    Object.freeze({ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }),
    Object.freeze({ x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 }),
  ]),
  Object.freeze([
    Object.freeze({ x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }),
    Object.freeze({ x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 }),
  ]),
  Object.freeze([
    Object.freeze({ x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 }),
    Object.freeze({ x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }),
  ]),
  Object.freeze([
    Object.freeze({ x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 }),
    Object.freeze({ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }),
  ]),
  Object.freeze([
    Object.freeze({ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }),
    Object.freeze({ x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 }),
  ]),
  Object.freeze([
    Object.freeze({ x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }),
    Object.freeze({ x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 }),
  ]),
  Object.freeze([
    Object.freeze({ x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 }),
    Object.freeze({ x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }),
  ]),
  Object.freeze([
    Object.freeze({ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }),
    Object.freeze({ x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 }),
  ]),
] as const satisfies readonly (readonly [MegaDrainOrbArgs, MegaDrainOrbArgs])[]);

export const MEGA_DRAIN_ORB_FIRST_AGE = 50;
// The two creations plus source `delay 4` advance six scheduler passes.
export const MEGA_DRAIN_ORB_PAIR_SPAWN_PERIOD = 6;
export const MEGA_DRAIN_HEALING_FIRST_AGE = 145;
export const MEGA_DRAIN_BODY_LAST_AGE = 216;

export type MegaDrainSound = "SE_M_ABSORB" | "SE_M_BUBBLE3" | "SE_M_ABSORB_2";

export interface MegaDrainSprite {
  readonly kind: "hitsplat" | "orb" | "star";
  /** Creation order in the source script, not an allocator or OAM slot. */
  readonly spawnIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
}

/** Source allocator and persistent `sSpriteOrder` facts for one staged scene. */
export interface MegaDrainAllocatorProfile {
  readonly hitsplat: number;
  readonly orbs: readonly number[];
  readonly stars: readonly number[];
  readonly paletteController: number;
  /** Relative `sSpriteOrder` immediately before Move_MEGA_DRAIN starts. */
  readonly orderSeed: readonly number[];
}

export interface MegaDrainState {
  readonly sprites: readonly MegaDrainSprite[];
  readonly targetX2: number;
  readonly targetY2: number;
  readonly targetOnMonBg: boolean;
  readonly splitBgPriorityFoes: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly bgPaletteBlendY: number;
  readonly bgPaletteBlendColor: 0x33ed;
  readonly paletteControllerActive: boolean;
  readonly soundRestart: MegaDrainSound | null;
  readonly active: boolean;
}

function gbaSin(index: number, amplitude: number): number {
  return Math.floor(GBA_SINE_TABLE_256[index & 0xff]! * amplitude / 256);
}

function bgPaletteBlendYAtAge(age: number): number {
  // `simple_palette_blend` owns the software-faded BG rows: 0 -> 8 -> 0,
  // one coefficient every three scheduler passes.
  if (age < 15 || age >= 205) return 0;
  if (age < 18) return 2;
  if (age < 21) return 4;
  if (age < 24) return 6;
  if (age < 196) return 8;
  if (age < 199) return 6;
  if (age < 202) return 4;
  return 2;
}

function orbArgsAt(index: number): MegaDrainOrbArgs {
  const pair = MEGA_DRAIN_ORB_PAIRS[Math.floor(index / 2)]!;
  return pair[index % 2]!;
}

function absorptionOrbAtAge(
  age: number,
  index: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
): MegaDrainSprite | null {
  const args = orbArgsAt(index);
  const pairIndex = Math.floor(index / 2);
  const local = age - MEGA_DRAIN_ORB_FIRST_AGE
    - pairIndex * MEGA_DRAIN_ORB_PAIR_SPAWN_PERIOD;
  if (local < 0 || local >= args.wavePeriod) return null;

  // `AnimAbsorptionOrb` runs its InitAnimArcTranslation callback on creation;
  // the first visible position is one animation callback later.
  const callbacks = local + 1;
  const startX = targetCenter.x + (attackerSide === "player" ? args.x : -args.x);
  const startY = targetCenter.y + args.y;
  const x2 = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(attackerCenter.x - startX, args.wavePeriod),
    callbacks,
    args.wavePeriod,
  );
  const linearY = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(attackerCenter.y - startY, args.wavePeriod),
    callbacks,
    args.wavePeriod,
  );
  const angle = (Math.trunc(0x8000 / args.wavePeriod) * callbacks) >> 8;
  const affineScale = 256 - 5 * (callbacks + 1);
  const matrix = Math.trunc(0x10000 / affineScale);
  return {
    kind: "orb",
    spawnIndex: index,
    x: startX,
    y: startY,
    x2,
    y2: linearY + gbaSin(angle, args.waveAmplitude),
    frame: 8,
    xScale: matrix,
    yScale: matrix,
  };
}

/** Complete source-owned `Move_MEGA_DRAIN` visual body, relative to `monbg`. */
export function megaDrainAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }> = attackerCenter,
): MegaDrainState {
  const sprites: MegaDrainSprite[] = [];
  if (age >= 32 && age <= 41) {
    // Impact affine animation 1 begins at 0xD8 (256 - 40), unlike Absorb's
    // animation 2 beginning at 0xB0.  Its inverse affine matrix is 303.
    sprites.push({
      kind: "hitsplat", spawnIndex: 0,
      x: targetCenter.x, y: targetCenter.y, x2: 0, y2: 0,
      frame: 1, xScale: 303, yScale: 303,
    });
  }
  for (let index = 0; index < MEGA_DRAIN_ORB_PAIRS.length * 2; index++) {
    const orb = absorptionOrbAtAge(
      age, index, targetCenter, attackerCenter, attackerSide,
    );
    if (orb) sprites.push(orb);
  }
  sprites.push(...healingBlueStarsAtAge(
    age - MEGA_DRAIN_HEALING_FIRST_AGE,
    attackerSide,
    healingCenter,
  ).map((sprite): MegaDrainSprite => ({
    kind: "star", spawnIndex: sprite.spawnIndex,
    x: sprite.x, y: sprite.y, x2: 0, y2: 0, frame: sprite.frame,
    xScale: sprite.xScale, yScale: sprite.yScale,
  })));

  // AnimTask_ShakeMon is source-created after `delay 2`; its five toggles
  // become the two complete visible +5 intervals below in this script.
  const shakeY = (age >= 38 && age <= 39) || (age >= 42 && age <= 43)
    ? 5 : 0;
  const orbRestart = age >= MEGA_DRAIN_ORB_FIRST_AGE
    && age < MEGA_DRAIN_ORB_FIRST_AGE
      + MEGA_DRAIN_ORB_PAIRS.length * MEGA_DRAIN_ORB_PAIR_SPAWN_PERIOD
    && (age - MEGA_DRAIN_ORB_FIRST_AGE) % MEGA_DRAIN_ORB_PAIR_SPAWN_PERIOD === 0;
  return {
    sprites,
    targetX2: 0,
    targetY2: shakeY,
    // `monbg`/splitbgprio set once before the blend and clear after its
    // terminal wait; their task is still resident through source age 215.
    targetOnMonBg: age >= 10 && age < 216,
    splitBgPriorityFoes: age >= 10 && age < 216,
    alpha: age >= 13 && age < 213 ? { eva: 12, evb: 8 } : null,
    bgPaletteBlendY: bgPaletteBlendYAtAge(age),
    bgPaletteBlendColor: 0x33ed,
    paletteControllerActive:
      (age >= 13 && age < 31) || (age >= 194 && age < 212),
    soundRestart: age === 32 ? "SE_M_ABSORB"
      : orbRestart ? "SE_M_BUBBLE3"
      : age === MEGA_DRAIN_HEALING_FIRST_AGE ? "SE_M_ABSORB_2" : null,
    active: age >= 0 && age <= MEGA_DRAIN_BODY_LAST_AGE,
  };
}

function spriteOwner(sprite: MegaDrainSprite): number {
  return sprite.kind === "hitsplat" ? 100
    : sprite.kind === "orb" ? 200 + sprite.spawnIndex
    : 300 + sprite.spawnIndex;
}

function spriteOrderKey(sprite: MegaDrainSprite) {
  // All three Mega Drain templates inherit the target's priority/subpriority
  // in this staged singles topology. `SortSprites` sees affine ORBS as a
  // 16x16 corner cell eight pixels above their center coordinate.
  return {
    priority: 2,
    subpriority: 27,
    oamY: sprite.kind === "orb"
      ? sprite.y + sprite.y2 - 8
      : sprite.kind === "hitsplat"
        ? sprite.y + sprite.y2 - 32
        : sprite.y + sprite.y2 - 16,
  } as const;
}

/**
 * Source `BuildOamBuffer` painter order for Mega Drain's active visual
 * sprites. The reducer remains geometry-only; the typed presentation seam
 * supplies the occupied-slot topology and persistent order seed.
 */
export function megaDrainSpritesBackToFrontAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }>,
  allocator: Readonly<MegaDrainAllocatorProfile>,
): readonly MegaDrainSprite[] {
  const slots = [...new Set([
    allocator.hitsplat,
    ...allocator.orbs,
    ...allocator.stars,
  ])].sort((left, right) => left - right);
  let order = createSpriteOrderState(slots, allocator.orderSeed);
  let current: readonly MegaDrainSprite[] = [];
  for (let tickAge = 0; tickAge <= age; tickAge += 1) {
    current = megaDrainAtAge(
      tickAge, targetCenter, attackerCenter, attackerSide, healingCenter,
    ).sprites;
    const byOwner = new Map(current.map((sprite) => [spriteOwner(sprite), sprite]));
    for (const occupant of order.occupants) {
      if (!byOwner.has(occupant.owner)) {
        order = destroyOrderedSprite(order, occupant.owner);
      }
    }
    for (const sprite of current) {
      const owner = spriteOwner(sprite);
      const key = spriteOrderKey(sprite);
      order = order.occupants.some((occupant) => occupant.owner === owner)
        ? updateOrderedSprite(order, owner, key)
        : createOrderedSprite(order, owner, key);
    }
    order = sortSpriteOrder(order);
  }
  const byOwner = new Map(current.map((sprite) => [spriteOwner(sprite), sprite]));
  return spriteOwnersBackToFront(order)
    .map((owner) => byOwner.get(owner))
    .filter((sprite): sprite is MegaDrainSprite => sprite !== undefined);
}
