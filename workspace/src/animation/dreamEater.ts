import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { absorptionBodySpriteOrderPlanText } from "./absorptionOrbSpriteOrderPlan.ts";
import { scaleMonAndRestoreAtAge } from "./bind.ts";
import { GIGA_DRAIN_ORB_GROUPS } from "./gigaDrain.ts";
import {
  psychicBgPaletteRowAtAge,
  psychicBgRotationCountAtAge,
} from "./psychicBackground.ts";
import { healingBlueStarsAtAge } from "./recover.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
} from "./spriteOrder.ts";
import type { RgbColor } from "../engine/bg.ts";

/** DreamEaterAbsorb is byte-identical to Giga Drain's eight literal triples. */
export const DREAM_EATER_ORB_GROUPS = GIGA_DRAIN_ORB_GROUPS;
export const DREAM_EATER_ORB_FIRST_AGE = 78;
export const DREAM_EATER_ORB_GROUP_SPAWN_PERIOD = 6;
export const DREAM_EATER_HEALING_FIRST_AGE = 173;
export const DREAM_EATER_PSYCHIC_BG_FIRST_AGE = 29;
export const DREAM_EATER_PSYCHIC_BG_LAST_AGE = 245;

export interface DreamEaterSprite {
  readonly kind: "orb" | "star";
  readonly spawnIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
}

export interface DreamEaterAllocatorProfile {
  readonly orbs: readonly number[];
  readonly stars: readonly number[];
  readonly orderSeed: readonly number[];
}

export type DreamEaterSound =
  | "SE_M_PSYBEAM"
  | "SE_M_MINIMIZE"
  | "SE_M_SWAGGER"
  | "SE_M_ABSORB_2";

export interface DreamEaterState {
  readonly sprites: readonly DreamEaterSprite[];
  readonly targetX2: number;
  readonly targetY2: number;
  readonly targetScale: Readonly<{
    readonly active: boolean;
    readonly xScale: number;
    readonly yScale: number;
  }>;
  readonly targetOnMonBg: boolean;
  readonly splitBgPriorityFoes: boolean;
  readonly alpha: Readonly<{ readonly eva: 8 | 12; readonly evb: 8 }> | null;
  readonly bgBldy: number;
  readonly bgIsPsychic: boolean;
  readonly soundRestart: DreamEaterSound | null;
  readonly active: boolean;
}

function gbaSin(index: number, amplitude: number): number {
  return Math.floor(GBA_SINE_TABLE_256[index & 0xff]! * amplitude / 256);
}

function absorptionOrbAtAge(
  age: number,
  index: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
): DreamEaterSprite | null {
  const args = DREAM_EATER_ORB_GROUPS[Math.floor(index / 3)]![index % 3]!;
  const group = Math.floor(index / 3);
  const local = age - DREAM_EATER_ORB_FIRST_AGE
    - group * DREAM_EATER_ORB_GROUP_SPAWN_PERIOD;
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

/** Hardware `REG_BLDY` for the two source `fadetobg`/`restorebg` tasks. */
export function dreamEaterBgBldyAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): number {
  if (age >= 12 && age <= 26) return age - 11;
  if (age >= 27 && age <= 30) return 16;
  if (age >= 31 && age <= 45) return 46 - age;
  if (age >= 229 && age <= 243) return age - 228;
  const holdLast = attackerSide === "player" ? 247 : 248;
  if (age >= 244 && age <= holdLast) return 16;
  const zeroAge = attackerSide === "player" ? 263 : 264;
  if (age > holdLast && age < zeroAge) return zeroAge - age;
  return 0;
}

/** Software-faded BG palette 2 ring, before the established RAM+1 transfer. */
export function dreamEaterPsychicBgPaletteRowAtAge(
  basePalette: readonly Readonly<RgbColor>[],
  age: number,
): Readonly<RgbColor>[] {
  // The task's first rotation is age 32 and normally repeats every four
  // passes. The blendoff/clear gap delays the age-224 step to age 226.
  return psychicBgPaletteRowAtAge(
    basePalette,
    psychicBgRotationCountAtAge(age - 11, 213, 2),
  );
}

/**
 * Target position captured by source software OAM for this age.
 *
 * Both ShakeMon tasks run before the OAM build while the later mon-BG update
 * observes the post-callback sprite state exposed by `dreamEaterAtAge`.
 * Consequently the live OBJ uses callback `local`, while the BG duplicate
 * uses callback `local + 1`. Hardware presents this software-OAM position on
 * the following row; the compositor applies that outer RAM+1 latch.
 */
export function dreamEaterTargetOamOffsetAtSourceAge(
  age: number,
  targetRestOffset: Readonly<{ x2: number; y2: number }> = { x2: 0, y2: 0 },
): Readonly<{ x2: number; y2: number }> {
  const firstShake = shakeMonOffsetAtTick(5, 0, 15, 1, age - 48);
  const absorbShake = shakeMonOffsetAtTick(0, 2, 25, 1, age - 78);
  return {
    x2: age < 48 ? targetRestOffset.x2
      : age <= 76 ? firstShake.x2 : 0,
    y2: age < 48 ? targetRestOffset.y2
      : age >= 78 && age <= 126 ? absorbShake.y2 : 0,
  };
}

/**
 * The body's sprite-order plan at the live geometry (absorptionOrbSpriteOrderPlan.ts, this module's timeline): DreamEaterAbsorb's
 * orbs and HealingEffect's stars; no hitsplat and no simple_palette_blend controller sprite (the psychic background is a BG fade).
 */
export function dreamEaterSpriteOrderPlanText(
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }> = attackerCenter,
): string {
  return absorptionBodySpriteOrderPlanText(DREAM_EATER_PSYCHIC_BG_LAST_AGE, age => ({
    sprites: dreamEaterAtAge(age, targetCenter, attackerCenter, attackerSide, healingCenter).sprites, paletteControllerActive: false }));
}

/** Complete source-owned Move_DREAM_EATER body at a source-relative age. */
export function dreamEaterAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }> = attackerCenter,
  targetRestOffset: Readonly<{ x2: number; y2: number }> = { x2: 0, y2: 0 },
): DreamEaterState {
  const sprites: DreamEaterSprite[] = [];
  for (let index = 0; index < DREAM_EATER_ORB_GROUPS.flat().length; index += 1) {
    const orb = absorptionOrbAtAge(age, index, targetCenter, attackerCenter, attackerSide);
    if (orb) sprites.push(orb);
  }
  sprites.push(...healingBlueStarsAtAge(
    age - DREAM_EATER_HEALING_FIRST_AGE,
    attackerSide,
    healingCenter,
  ).map((sprite): DreamEaterSprite => ({
    kind: "star",
    spawnIndex: sprite.spawnIndex,
    x: sprite.x,
    y: sprite.y,
    x2: 0,
    y2: 0,
    frame: sprite.frame,
    xScale: sprite.xScale,
    yScale: sprite.yScale,
  })));

  const scaleLocal = age - 48;
  const firstShake = shakeMonOffsetAtTick(5, 0, 15, 1, scaleLocal + 1);
  const absorbShake = shakeMonOffsetAtTick(0, 2, 25, 1, age - 78 + 1);
  const orbRestart = age >= DREAM_EATER_ORB_FIRST_AGE
    && age < DREAM_EATER_ORB_FIRST_AGE
      + DREAM_EATER_ORB_GROUPS.length * DREAM_EATER_ORB_GROUP_SPAWN_PERIOD
    && (age - DREAM_EATER_ORB_FIRST_AGE) % DREAM_EATER_ORB_GROUP_SPAWN_PERIOD === 0;
  const lastActiveAge = attackerSide === "player" ? 264 : 265;
  return {
    sprites,
    targetX2: age < 48 ? targetRestOffset.x2
      : age <= 75 ? firstShake.x2 : 0,
    targetY2: age < 48 ? targetRestOffset.y2
      : age >= 78 && age <= 125 ? absorbShake.y2 : 0,
    targetScale: scaleMonAndRestoreAtAge(scaleLocal, {
      xDelta: -6,
      yDelta: -6,
      duration: 15,
    }),
    targetOnMonBg: age >= 7 && age <= 224,
    splitBgPriorityFoes: age >= 7 && age <= 224,
    alpha: age >= 48 && age <= 77 ? { eva: 8, evb: 8 }
      : age >= 78 && age <= 221 ? { eva: 12, evb: 8 }
      : null,
    bgBldy: dreamEaterBgBldyAtAge(age, attackerSide),
    bgIsPsychic: age >= DREAM_EATER_PSYCHIC_BG_FIRST_AGE
      && age <= DREAM_EATER_PSYCHIC_BG_LAST_AGE,
    soundRestart: age === 10 ? "SE_M_PSYBEAM"
      : age === 48 ? "SE_M_MINIMIZE"
      : orbRestart ? "SE_M_SWAGGER"
      : age === DREAM_EATER_HEALING_FIRST_AGE ? "SE_M_ABSORB_2"
      : null,
    active: age >= 0 && age <= lastActiveAge,
  };
}

function spriteOwner(sprite: DreamEaterSprite): number {
  return sprite.kind === "orb" ? 200 + sprite.spawnIndex : 300 + sprite.spawnIndex;
}

function spriteOrderKey(sprite: DreamEaterSprite) {
  return {
    priority: 2,
    subpriority: sprite.kind === "orb" ? 27 : 28,
    oamY: sprite.kind === "orb"
      ? sprite.y + sprite.y2 - 8
      : sprite.y + sprite.y2 - 16,
  } as const;
}

/** Persistent source `SortSprites` painter order for ORBS and BLUE_STAR. */
export function dreamEaterSpritesBackToFrontAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerSide: "player" | "opponent",
  healingCenter: Readonly<{ x: number; y: number }>,
  allocator: Readonly<DreamEaterAllocatorProfile>,
): readonly DreamEaterSprite[] {
  const slots = [...new Set([...allocator.orbs, ...allocator.stars])]
    .sort((left, right) => left - right);
  let order = createSpriteOrderState(slots, allocator.orderSeed);
  let current: readonly DreamEaterSprite[] = [];
  for (let tickAge = 0; tickAge <= age; tickAge += 1) {
    current = dreamEaterAtAge(
      tickAge,
      targetCenter,
      attackerCenter,
      attackerSide,
      healingCenter,
    ).sprites;
    const byOwner = new Map(current.map((sprite) => [spriteOwner(sprite), sprite]));
    for (const occupant of order.occupants) {
      if (!byOwner.has(occupant.owner)) order = destroyOrderedSprite(order, occupant.owner);
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
    .filter((sprite): sprite is DreamEaterSprite => sprite !== undefined);
}
