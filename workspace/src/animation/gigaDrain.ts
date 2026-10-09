import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { absorptionBodySpriteOrderPlanText } from "./absorptionOrbSpriteOrderPlan.ts";
import { healingBlueStarsAtAge } from "./recover.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
} from "./spriteOrder.ts";

export interface GigaDrainOrbArgs {
  readonly x: number;
  readonly y: number;
  readonly waveAmplitude: number;
  readonly wavePeriod: number;
}

/** The literal 24 orb commands in `GigaDrainAbsorbEffect`. */
export const GIGA_DRAIN_ORB_GROUPS = Object.freeze([
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 5, y: -18, waveAmplitude: -40, wavePeriod: 35 },
    { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 },
  ],
  [
    { x: 0, y: 5, waveAmplitude: 28, wavePeriod: 26 },
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
    { x: -10, y: 20, waveAmplitude: 40, wavePeriod: 39 },
  ],
  [
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
    { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
    { x: 10, y: -5, waveAmplitude: -32, wavePeriod: 26 },
  ],
  [
    { x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 },
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
  ],
  [
    { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
    { x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 },
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
  ],
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
    { x: 10, y: -5, waveAmplitude: -40, wavePeriod: 26 },
  ],
  [
    { x: -5, y: 15, waveAmplitude: 36, wavePeriod: 33 },
    { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
    { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 },
  ],
  [
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
    { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 },
  ],
] as const satisfies readonly (readonly GigaDrainOrbArgs[])[]);

export const GIGA_DRAIN_ORB_FIRST_AGE = 56;
export const GIGA_DRAIN_ORB_GROUP_SPAWN_PERIOD = 6;
export const GIGA_DRAIN_HEALING_FIRST_AGE = 151;
export const GIGA_DRAIN_BODY_LAST_AGE = 228;

export type GigaDrainSound = "SE_M_ABSORB" | "SE_M_GIGA_DRAIN" | "SE_M_ABSORB_2";

export interface GigaDrainSprite {
  readonly kind: "hitsplat" | "orb" | "star";
  readonly spawnIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
}

export interface GigaDrainAllocatorProfile {
  readonly hitsplat: number;
  readonly orbs: readonly number[];
  readonly stars: readonly number[];
  readonly paletteController: number;
  readonly orderSeed: readonly number[];
}

export interface GigaDrainState {
  readonly sprites: readonly GigaDrainSprite[];
  readonly targetX2: number;
  readonly targetY2: number;
  readonly targetOnMonBg: boolean;
  readonly splitBgPriorityFoes: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly bgPaletteBlendY: number;
  readonly bgPaletteBlendColor: 0x33ed;
  readonly paletteControllerActive: boolean;
  readonly soundRestart: GigaDrainSound | null;
  readonly active: boolean;
}

function gbaSin(index: number, amplitude: number): number {
  return Math.floor(GBA_SINE_TABLE_256[index & 0xff]! * amplitude / 256);
}

function bgPaletteBlendYAtAge(age: number): number {
  // AnimSimplePaletteBlend steps by two toward the source literal 12, with
  // one step every three scheduler passes.
  if (age < 15 || age >= 217) return 0;
  if (age < 18) return 2;
  if (age < 21) return 4;
  if (age < 24) return 6;
  if (age < 27) return 8;
  if (age < 30) return 10;
  if (age < 202) return 12;
  if (age < 205) return 10;
  if (age < 208) return 8;
  if (age < 211) return 6;
  if (age < 214) return 4;
  if (age < 217) return 2;
  return 0;
}

function orbArgsAt(index: number): GigaDrainOrbArgs {
  return GIGA_DRAIN_ORB_GROUPS[Math.floor(index / 3)]![index % 3]!;
}

function absorptionOrbAtAge(
  age: number,
  index: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
): GigaDrainSprite | null {
  const args = orbArgsAt(index);
  const groupIndex = Math.floor(index / 3);
  const local = age - GIGA_DRAIN_ORB_FIRST_AGE
    - groupIndex * GIGA_DRAIN_ORB_GROUP_SPAWN_PERIOD;
  if (local < 0 || local >= args.wavePeriod) return null;
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

export function gigaDrainAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }> = attackerCenter,
): GigaDrainState {
  const sprites: GigaDrainSprite[] = [];
  if (age >= 38 && age <= 46) {
    sprites.push({
      kind: "hitsplat", spawnIndex: 0,
      x: targetCenter.x, y: targetCenter.y, x2: 0, y2: 0,
      frame: 0, xScale: 256, yScale: 256,
    });
  }
  for (let index = 0; index < GIGA_DRAIN_ORB_GROUPS.length * 3; index += 1) {
    const orb = absorptionOrbAtAge(
      age, index, targetCenter, attackerCenter, attackerSide,
    );
    if (orb) sprites.push(orb);
  }
  sprites.push(...healingBlueStarsAtAge(
    age - GIGA_DRAIN_HEALING_FIRST_AGE,
    attackerSide,
    healingCenter,
  ).map((sprite): GigaDrainSprite => ({
    kind: "star", spawnIndex: sprite.spawnIndex,
    x: sprite.x, y: sprite.y, x2: 0, y2: 0, frame: sprite.frame,
    xScale: sprite.xScale, yScale: sprite.yScale,
  })));
  const orbRestart = age >= GIGA_DRAIN_ORB_FIRST_AGE
    && age < GIGA_DRAIN_ORB_FIRST_AGE
      + GIGA_DRAIN_ORB_GROUPS.length * GIGA_DRAIN_ORB_GROUP_SPAWN_PERIOD
    && (age - GIGA_DRAIN_ORB_FIRST_AGE) % GIGA_DRAIN_ORB_GROUP_SPAWN_PERIOD === 0;
  const shakeY = (age >= 44 && age <= 45) || (age >= 48 && age <= 49)
    ? 5 : 0;
  return {
    sprites,
    targetX2: 0,
    targetY2: shakeY,
    targetOnMonBg: age >= 10 && age < 228,
    splitBgPriorityFoes: age >= 10 && age < 228,
    alpha: age >= 13 && age < 225 ? { eva: 12, evb: 8 } : null,
    bgPaletteBlendY: bgPaletteBlendYAtAge(age),
    bgPaletteBlendColor: 0x33ed,
    paletteControllerActive:
      (age >= 13 && age < 37) || (age >= 200 && age < 224),
    soundRestart: age === 38 ? "SE_M_ABSORB"
      : orbRestart ? "SE_M_GIGA_DRAIN"
      : age === GIGA_DRAIN_HEALING_FIRST_AGE ? "SE_M_ABSORB_2" : null,
    active: age >= 0 && age <= GIGA_DRAIN_BODY_LAST_AGE,
  };
}

function spriteOwner(sprite: GigaDrainSprite): number {
  return sprite.kind === "hitsplat" ? 100
    : sprite.kind === "orb" ? 200 + sprite.spawnIndex
    : 300 + sprite.spawnIndex;
}

function spriteOrderKey(sprite: GigaDrainSprite) {
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

export function gigaDrainSpritesBackToFrontAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }>,
  allocator: Readonly<GigaDrainAllocatorProfile>,
): readonly GigaDrainSprite[] {
  const slots = [...new Set([
    allocator.hitsplat,
    ...allocator.orbs,
    ...allocator.stars,
  ])].sort((left, right) => left - right);
  let order = createSpriteOrderState(slots, allocator.orderSeed);
  let current: readonly GigaDrainSprite[] = [];
  for (let tickAge = 0; tickAge <= age; tickAge += 1) {
    current = gigaDrainAtAge(
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
    .filter((sprite): sprite is GigaDrainSprite => sprite !== undefined);
}

/** The body's sprite-order plan at the live geometry (absorptionOrbSpriteOrderPlan.ts, this module's timeline). */
export function gigaDrainSpriteOrderPlanText(
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }> = attackerCenter,
): string {
  return absorptionBodySpriteOrderPlanText(GIGA_DRAIN_BODY_LAST_AGE,
    age => gigaDrainAtAge(age, targetCenter, attackerCenter, attackerSide, healingCenter));
}
