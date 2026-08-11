/**
 * Complete source-relative `Move_CRUNCH` visual body.
 *
 * Ages are RAM truth relative to the move-owned window (frame 74 player-back /
 * 78 opponent-front, so both orientations share the same ages and differ only
 * in the battler geometry and the hitsplat's mirrored x offset). Every visible
 * event displays exactly ONE frame after the RAM state that causes it (the
 * change map confirms a uniform one-age latch — no TAKE_DOWN windup-style
 * two-frame case), so the draw case applies the shared one-display latch and
 * this reducer stays calibrated to the probe's RAM readings.
 *
 * The whole window is static except for the settled event list
 * (`tools/compare/evidence/crunch-changemap-*.txt`):
 * - `monbg ANIM_TARGET` moves the target to BG1 (sprite invisible) from RAM
 *   age 7, restored by `clearmonbg` at age 97.
 * - `fadetobg BG_DARK` runs `Task_FadeToBg` + a hardware palette fade 0->16
 *   over ages 10-26, loads the dark BG at age 28, and fades back 16->0 over
 *   ages 29-45 (dark on screen from display age 12 through 46). `restorebg`
 *   repeats the same fade ages 102-139.
 * - `setalpha 12, 8` (BLDCNT 0x3f40 / BLDALPHA 0x080c) at age 48, cleared by
 *   `blendoff` at age 97 (RAM-truth only; no blend-only pixel step).
 * - each round: `playsewithpan SE_M_BITE` + a `create_sharp_teeth_sprite`
 *   pair created at the TARGET center +/- the script x/y offset and converging
 *   to the target center at +-819/10 fixed-point velocity (x2 = data[4]>>8:
 *   3..31 over ages 48-57, retract 28..3 over 58-66, destroyed 67 / round 2
 *   ages 74-93). The script `animation` arg selects the `gAffineAnims_Bite`
 *   rotation matrix.
 * - a basic hitsplat is created at the target center + (x=-8 round 1 / +8
 *   round 2, mirrored for a player-side target) at ages 60 / 86, alive 10
 *   ages, destroyed 70 / 96; static frame anim (cmdIndex 0), matrix scale 303.
 * - `AnimTask_ShakeMon (0, y, num, 2)` toggles the target y2 (7 round 1 num 5,
 *   8 round 2 num 4) on the 1-frame initial block then 3-frame blocks every
 *   3 ages, destroying with a final net-zero toggle.
 */
export type CrunchTargetSide = "player" | "opponent";

export interface CrunchTeethSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animation: 1 | 5 | 7 | 3;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

export interface CrunchHitsplat {
  readonly x: number;
  readonly y: number;
  readonly animation: 1;
}

export interface CrunchSoundEvent {
  readonly age: number;
  readonly song: "SE_M_BITE";
  readonly pan: number;
}

export interface CrunchState {
  readonly teeth: readonly CrunchTeethSprite[];
  readonly hitsplats: readonly CrunchHitsplat[];
  readonly targetY2: number;
  /** `gPaletteFade.y` blend coefficient (0..16), or -1 while the fade task is between phases. */
  readonly fadeY: number;
  readonly monbg: boolean;
  readonly blendOn: boolean;
  readonly soundEvents: readonly CrunchSoundEvent[];
}

export interface CrunchGeometry {
  readonly attackerSide: "player" | "opponent";
  readonly targetSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

/** RAM age of `monbg ANIM_TARGET` (target sprite moved to BG1, invisible). */
export const MONBG_AGE = 7;
/** RAM age of `fadetobg BG_DARK` (Task_FadeToBg + palette fade out). */
export const FADE_IN_AGE = 10;
/** RAM age of the palette fade-in back to 0 after the dark BG loads. */
export const FADE_IN_BACK_AGE = 29;
/** RAM age of `setalpha 12, 8`. */
export const SETALPHA_AGE = 48;
/** RAM age of the first sharp-teeth pair / SE_M_BITE. */
export const TEETH_1_SPAWN_AGE = 48;
/** RAM age the first sharp-teeth pair is destroyed. */
export const TEETH_1_DESTROY_AGE = 67;
/** RAM age of the first basic hitsplat. */
export const HITSPLAT_1_AGE = 60;
/** RAM age of the first `AnimTask_ShakeMon (0, 7, 5, 2)`. */
export const SHAKE_1_AGE = 60;
/** RAM age of the second sharp-teeth pair / SE_M_BITE. */
export const TEETH_2_SPAWN_AGE = 74;
/** RAM age the second sharp-teeth pair is destroyed. */
export const TEETH_2_DESTROY_AGE = 93;
/** RAM age of the second basic hitsplat. */
export const HITSPLAT_2_AGE = 86;
/** RAM age of the second `AnimTask_ShakeMon (0, 8, 4, 2)`. */
export const SHAKE_2_AGE = 86;
/** RAM age of `clearmonbg` / `blendoff`. */
export const CLEAR_AGE = 97;
/** RAM age of `restorebg` (FadeToBg bgId=-1). */
export const RESTORE_FADE_AGE = 102;
/** RAM age the restore fade finishes. */
export const RESTORE_FADE_END_AGE = 139;

const TEETH_HALF_DURATION = 10;
const TEETH_VELOCITY = 819;

const TEETH_ROUNDS = [
  [
    { x: -32, y: -32, velocityX: TEETH_VELOCITY, velocityY: TEETH_VELOCITY, animation: 1 },
    { x: 32, y: 32, velocityX: -TEETH_VELOCITY, velocityY: -TEETH_VELOCITY, animation: 5 },
  ],
  [
    { x: 32, y: -32, velocityX: -TEETH_VELOCITY, velocityY: TEETH_VELOCITY, animation: 7 },
    { x: -32, y: 32, velocityX: TEETH_VELOCITY, velocityY: -TEETH_VELOCITY, animation: 3 },
  ],
] as const;

const TEETH_MATRICES = {
  1: { a: 181, b: -181, c: 181, d: 181 },
  5: { a: -181, b: 181, c: -181, d: -181 },
  7: { a: 181, b: 181, c: -181, d: 181 },
  3: { a: -181, b: -181, c: 181, d: -181 },
} as const;

/**
 * `AnimTask_ShakeMon (0, y, num, 2)` on the target sprite: y2 is set to `y`
 * at the creation frame, then toggles between `y` and 0 every 3 ages starting
 * one age after creation, ending with the destroying toggle at
 * `1 + (num - 1) * 3` (net-zero for an even `num`). Verified against the
 * probe: round 1 y2 = 7 at ages {60, 64-66, 70-72}, round 2 y2 = 8 at ages
 * {86, 90-92}.
 */
function crunchShakeY2(yOffset: number, numTimes: number, tick: number): number {
  if (tick < 0 || tick > 1 + (numTimes - 1) * 3) return 0;
  if (tick === 0) return yOffset;
  const flip = Math.floor((tick - 1) / 3);
  if (flip >= numTimes) return 0;
  if (tick === 1 + flip * 3 && flip === numTimes - 1) return 0;
  return flip % 2 === 1 ? yOffset : 0;
}

function teethAtAge(
  age: number,
  spawnAge: number,
  destroyAge: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly CrunchTeethSprite[] {
  const local = age - spawnAge;
  if (local < 0 || local >= destroyAge - spawnAge) return [];
  const step = local < TEETH_HALF_DURATION
    ? local + 1
    : 2 * TEETH_HALF_DURATION - local - 1;
  const round = age >= TEETH_2_SPAWN_AGE ? TEETH_ROUNDS[1] : TEETH_ROUNDS[0];
  return round.map((spec) => ({
    x: targetCenter.x + spec.x,
    y: targetCenter.y + spec.y,
    x2: (spec.velocityX * step) >> 8,
    y2: (spec.velocityY * step) >> 8,
    animation: spec.animation,
    matrix: TEETH_MATRICES[spec.animation],
  }));
}

function hitsplatsAtAge(
  age: number,
  targetSide: CrunchTargetSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly CrunchHitsplat[] {
  return [
    { spawnAge: HITSPLAT_1_AGE, xOffset: -8 },
    { spawnAge: HITSPLAT_2_AGE, xOffset: 8 },
  ].flatMap((hit) => {
    if (age < hit.spawnAge || age >= hit.spawnAge + 10) return [];
    return [{
      x: targetCenter.x + (targetSide === "player" ? -hit.xOffset : hit.xOffset),
      y: targetCenter.y,
      animation: 1 as const,
    }];
  });
}

/** `gPaletteFade.y` at `age` (-1 while the Task_FadeToBg task is mid-load). */
function paletteFadeYAtAge(age: number): number {
  if (age >= FADE_IN_AGE && age <= FADE_IN_AGE + 16) return age - FADE_IN_AGE;
  if (age === FADE_IN_AGE + 17) return 16;
  if (age === FADE_IN_AGE + 18) return -1;
  if (age >= FADE_IN_BACK_AGE && age <= FADE_IN_BACK_AGE + 16) {
    return FADE_IN_BACK_AGE + 16 - age;
  }
  if (age >= RESTORE_FADE_AGE && age <= RESTORE_FADE_AGE + 16) {
    return age - RESTORE_FADE_AGE;
  }
  if (age === RESTORE_FADE_AGE + 17) return 16;
  if (age === RESTORE_FADE_AGE + 18) return -1;
  if (age >= RESTORE_FADE_AGE + 20 && age <= RESTORE_FADE_END_AGE) {
    return RESTORE_FADE_END_AGE - age;
  }
  return 0;
}

export function crunchAtAge(age: number, geometry: CrunchGeometry): CrunchState {
  const { targetSide, targetCenter } = geometry;
  const shake1 = crunchShakeY2(7, 5, age - SHAKE_1_AGE);
  const shake2 = crunchShakeY2(8, 4, age - SHAKE_2_AGE);
  return {
    teeth: [
      ...teethAtAge(age, TEETH_1_SPAWN_AGE, TEETH_1_DESTROY_AGE, targetCenter),
      ...teethAtAge(age, TEETH_2_SPAWN_AGE, TEETH_2_DESTROY_AGE, targetCenter),
    ],
    hitsplats: hitsplatsAtAge(age, targetSide, targetCenter),
    targetY2: age >= SHAKE_2_AGE ? shake2 : (age >= SHAKE_1_AGE ? shake1 : 0),
    fadeY: paletteFadeYAtAge(age),
    monbg: age >= MONBG_AGE && age < CLEAR_AGE,
    blendOn: age >= SETALPHA_AGE && age < CLEAR_AGE,
    soundEvents: [TEETH_1_SPAWN_AGE, TEETH_2_SPAWN_AGE].includes(age)
      ? [{
          age,
          song: "SE_M_BITE",
          pan: targetSide === "player" ? -63 : 63,
        }]
      : [],
  };
}
