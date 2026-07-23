// Pure FIRE_PUNCH reducers. Ages are relative to the first animation-owned
// FIRE_PUNCH render (docs/turn16-notes.md §6.5), never absolute battle ticks.

import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";

export const FIRE_PUNCH_SPIRAL_FIRST_AGE = 41;
export const FIRE_PUNCH_SPIRAL_TICKS = 30;
export const FIRE_PUNCH_IMPACT_FIRST_AGE = 72;
export const FIRE_PUNCH_SPREAD_TICKS = 40;
export const FIRE_PUNCH_MONBG_FIRST_AGE = 37;
export const FIRE_PUNCH_MONBG_LAST_AGE = 122;
export const FIRE_PUNCH_HIT_WOBBLE_FIRST_AGE = 133;
export const FIRE_PUNCH_HIT_WOBBLE_TICKS = 20;
export const FIRE_PUNCH_HIT_BLINK_FIRST_AGE = 134;
export const FIRE_PUNCH_HP_DRAIN_FIRST_AGE = 168;
export const FIRE_PUNCH_HP_COMMIT_AGE = 236;
export const FIRE_PUNCH_SECONDARY_ROLL_AGE = 241;
export const FIRE_PUNCH_BURN_FLAME_FIRST_AGE = 247;
export const FIRE_PUNCH_TEXT_CLEAR_AGE = 283;
export const FIRE_PUNCH_BURN_MESSAGE_AGE = 283;
export const FIRE_PUNCH_BURN_BADGE_AGE = 372;
export const FIRE_PUNCH_CURRENT_MOVE_RESET_AGE = 383;
export const FIRE_PUNCH_BURN_MESSAGE_CLEAR_AGE = 387;

const SPIRAL_PHASES = [0, 64, 128, 196] as const;
const SPREAD_VELOCITIES = [
  [192, 176],
  [-192, 240],
  [192, -160],
  [-192, -112],
  [160, 48],
  [-224, -32],
  [112, -128],
] as const;

function sin(index: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * value) / 256);
}

/** Target palette coefficient for the delay-2 0→9 and delay-0 9→0 tasks. */
export function firePunchTargetBlendCoeff(age: number): number {
  if (age < 46) return 0;
  if (age <= 114) return Math.min(9, 1 + Math.floor((age - 46) / 3));
  if (age <= 122) return 9 - (age - 114);
  return 0;
}

export interface FirePunchParticle {
  x: number;
  y: number;
  frame: 1 | 2 | 3;
  hFlip: boolean;
  vFlip: boolean;
}

/** Four source-phase `TranslateSpriteInGrowingCircle` embers. */
export function firePunchSpiralParticles(age: number): FirePunchParticle[] {
  const n = age - FIRE_PUNCH_SPIRAL_FIRST_AGE;
  if (n < 0 || n >= FIRE_PUNCH_SPIRAL_TICKS) return [];
  // The callback has already run twice by the RAM state displayed on the
  // first VBlank. The destroy callback leaves the final pose displayed once.
  const step = Math.min(n + 1, 29);
  const radius = 60 - step * 2;
  const frame = (1 + (Math.floor((n + 1) / 4) % 3)) as 1 | 2 | 3;
  return SPIRAL_PHASES.map((phase) => {
    const angle = phase + step * 9;
    return {
      x: 176 + sin(angle, radius),
      y: 51 + sin(angle + 64, radius),
      frame,
      hFlip: false,
      vFlip: false,
    };
  });
}

/** Seven fixed-point `TranslateSpriteLinearFixedPoint` spread embers. */
export function firePunchSpreadParticles(age: number): FirePunchParticle[] {
  const n = age - FIRE_PUNCH_IMPACT_FIRST_AGE;
  if (n < 0 || n > FIRE_PUNCH_SPREAD_TICKS) return [];
  const step = Math.min(n + 1, FIRE_PUNCH_SPREAD_TICKS);
  const frame = (1 + (Math.floor((n + 1) / 4) % 3)) as 1 | 2 | 3;
  return SPREAD_VELOCITIES.map(([vx, vy]) => ({
    x: 176 + ((vx * step) >> 8),
    y: 61 + ((vy * step) >> 8),
    frame,
    hFlip: false,
    vFlip: false,
  }));
}

function stableOamOrder(
  firstAge: number,
  age: number,
  seed: number[],
  particlesAt: (taskAge: number) => FirePunchParticle[],
): number[] {
  const order = [...seed];
  for (let taskAge = firstAge; taskAge <= age; taskAge += 1) {
    const particles = particlesAt(taskAge);
    order.sort((a, b) => particles[b]!.y - particles[a]!.y);
  }
  return order;
}

/**
 * Inverse OAM order for software compositing. `SortSprites` is stable on Y
 * ties. The spread seed is the allocator's inherited `sSpriteOrder` at this
 * script step (RAM: slots 8,7,13,12,11,10,9), not a per-frame pixel table.
 */
export function firePunchParticlesInDrawOrder(age: number): FirePunchParticle[] {
  const spiral = firePunchSpiralParticles(age);
  if (spiral.length) {
    const oam = stableOamOrder(
      FIRE_PUNCH_SPIRAL_FIRST_AGE,
      age,
      [0, 1, 2, 3],
      firePunchSpiralParticles,
    );
    return oam.reverse().map((index) => spiral[index]!);
  }
  const spread = firePunchSpreadParticles(age);
  if (spread.length) {
    const oam = stableOamOrder(
      FIRE_PUNCH_IMPACT_FIRST_AGE,
      age,
      [1, 0, 6, 5, 4, 3, 2],
      firePunchSpreadParticles,
    );
    return oam.reverse().map((index) => spread[index]!);
  }
  return [];
}

export function firePunchFistVisible(age: number): boolean {
  return age >= FIRE_PUNCH_IMPACT_FIRST_AGE && age < FIRE_PUNCH_IMPACT_FIRST_AGE + 9;
}

export function firePunchHitsplatVisible(age: number): boolean {
  return age >= FIRE_PUNCH_IMPACT_FIRST_AGE && age < FIRE_PUNCH_IMPACT_FIRST_AGE + 10;
}

export interface FirePunchResolutionState {
  targetInvisible: boolean;
  healthboxY2: number;
  displayedHp: number;
  battleHp: number;
  secondaryRollConsumed: boolean;
  secondaryRollSucceeded: boolean;
  status: "none" | "burn";
  healthboxStatus: "none" | "burn";
  currentMove: "FIRE_PUNCH" | null;
  message: "FIRE_PUNCH" | "BURNED" | "BURN_RESIDUAL";
}

/** Generic hit blink/wobble followed by the 142→75 display drain. */
export function firePunchResolutionState(age: number): FirePunchResolutionState {
  const wobble = age - FIRE_PUNCH_HIT_WOBBLE_FIRST_AGE;
  const blink = age - FIRE_PUNCH_HIT_BLINK_FIRST_AGE;
  const burned = age >= FIRE_PUNCH_SECONDARY_ROLL_AGE;
  const message: FirePunchResolutionState["message"] =
    age < FIRE_PUNCH_TEXT_CLEAR_AGE
      ? "FIRE_PUNCH"
      : age < FIRE_PUNCH_BURN_MESSAGE_CLEAR_AGE
          ? "BURNED"
          : "BURN_RESIDUAL";
  return {
    healthboxY2: wobble >= 0 && wobble < FIRE_PUNCH_HIT_WOBBLE_TICKS
      ? (wobble % 2 === 0 ? 1 : -1)
      : 0,
    targetInvisible: blink >= 0 && blink < 32 && blink % 8 < 4,
    displayedHp: age < FIRE_PUNCH_HP_DRAIN_FIRST_AGE
      ? 142
      : Math.max(75, 142 - (age - FIRE_PUNCH_HP_DRAIN_FIRST_AGE + 1)),
    battleHp: age >= FIRE_PUNCH_HP_COMMIT_AGE ? 75 : 142,
    secondaryRollConsumed: burned,
    secondaryRollSucceeded: burned,
    status: burned ? "burn" : "none",
    healthboxStatus: age >= FIRE_PUNCH_BURN_BADGE_AGE ? "burn" : "none",
    currentMove: age >= FIRE_PUNCH_CURRENT_MOVE_RESET_AGE ? null : "FIRE_PUNCH",
    message,
  };
}

export interface BurnFlameParticle {
  x: number;
  y: number;
  frame: 0 | 1 | 2 | 3 | 4;
}

const BURN_FLAME_START_AGES = [
  FIRE_PUNCH_BURN_FLAME_FIRST_AGE,
  FIRE_PUNCH_BURN_FLAME_FIRST_AGE + 6,
  FIRE_PUNCH_BURN_FLAME_FIRST_AGE + 12,
] as const;
const BURN_FLAME_VISIBLE_TICKS = 22;
// StartAnimLinearTranslation stores an 8.8 delta:
// ((200 - 152) << 8) / 20 = 614 after integer truncation.
const BURN_FLAME_X_DELTA_FIXED8 = 614;

/**
 * Status_Burn's three `gBurnFlameSpriteTemplate` sprites. The source script
 * calls BurnFlame three times; its four-tick script delays become six
 * displayed VBlanks apart. Returned in back-to-front software draw order:
 * later sprite slots lose equal-subpriority OAM ties to the first flame.
 */
export function firePunchBurnFlames(age: number): BurnFlameParticle[] {
  const particles: BurnFlameParticle[] = [];
  for (let i = BURN_FLAME_START_AGES.length - 1; i >= 0; i -= 1) {
    const n = age - BURN_FLAME_START_AGES[i]!;
    if (n < 0 || n >= BURN_FLAME_VISIBLE_TICKS) continue;
    particles.push({
      x: 152 + ((BURN_FLAME_X_DELTA_FIXED8 * Math.min(n, 20)) >> 8),
      y: 64,
      frame: (Math.floor((n + 1) / 4) % 5) as 0 | 1 | 2 | 3 | 4,
    });
  }
  return particles;
}
