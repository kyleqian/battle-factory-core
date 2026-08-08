/**
 * Source-shaped reducer for MOVE_FACADE.
 *
 * `data/battle_anim_scripts.s:Move_FACADE` is
 *   loadspritegfx ANIM_TAG_SWEAT_DROP
 *   createvisualtask AnimTask_SquishAndSweatDroplets, 2, ANIM_ATTACKER, 3
 *   createvisualtask AnimTask_FacadeColorBlend, 2, ANIM_ATTACKER, 72
 *   loopsewithpan SE_M_SWAGGER, SOUND_PAN_ATTACKER, 24, 3
 *   end
 *
 * Three components (all in `battle_anim_effects_3.c`):
 *   1. `AnimTask_SquishAndSweatDroplets` squishes the attacker three times
 *      via `gFacadeSquishAffineAnimCmds` = FRAME(-16,+16,0,6),
 *      FRAME(+16,-16,0,12), FRAME(-16,+16,0,6) and spawns 6 batches of 4
 *      sweat-drop sprites at `tTimer==6` (xOffset 30 / yOffset +20) and
 *      `tTimer==18` (xOffset 18 / yOffset -20).
 *   2. `AnimTask_FacadeColorBlend` blends the attacker's 16-entry OBJ palette
 *      bank toward `gFacadeBlendColors[i]` at FIXED coefficient 8 for 72
 *      frames, i advancing per frame and wrapping 23->0, then a
 *      coefficient-0 restore to `RGB_BLACK` and destroy.
 *
 * Ages are move-relative (age 0 = the move script's first captured frame,
 * frame 212 in the fixture windows). The squish task is present ages 4-78,
 * the blend task ages 4-75 (the restore lands on age 76). The droplets spawn
 * at ages 9, 21, 34, 46, 59, 71 and live 7 RAM ticks each.
 */

export const FACADE_FIRST_TASK_AGE = 4;
export const FACADE_SQUISH_LAST_AGE = 78;
export const FACADE_BLEND_LAST_AGE = 75;
export const FACADE_BLEND_COLOR_INDEX_COUNT = 24;
export const FACADE_BLEND_DURATION = 72;
export const FACADE_BLEND_COEFFICIENT = 8;

export interface FacadeMatrix {
  /** Software `a` matrix element (256 = identity x scale). */
  readonly a: number;
  /** Software `d` matrix element (256 = identity y scale). */
  readonly d: number;
}

export interface FacadeDroplet {
  /** Spawn index within the batch (0-3); i<2 travels left at -2, else +2. */
  readonly index: number;
  /** RAM tick age (`sTimer` data[0]) since this droplet spawned, 0-6. */
  readonly tick: number;
  readonly x: number;
  readonly y: number;
}

export interface FacadeState {
  readonly age: number;
  readonly visualTaskCount: number;
  /** Squish software matrix at this age, or identity when not squishing. */
  readonly matrix: FacadeMatrix;
  /** Attacker sprite `y2` from `SetBattlerSpriteYOffsetFromYScale`. */
  readonly y2: number;
  /** RAM sweat-drop sprites alive at this age. */
  readonly droplets: readonly FacadeDroplet[];
  /** `gFacadeBlendColors` index blended at this age's RAM write, or null
   *  before the blend task starts / after the restore. */
  readonly blendColorIndex: number | null;
}

/** `gFacadeBlendColors` (`battle_anim_effects_3.c:902`), as RGB5. */
export const FACADE_BLEND_COLORS: readonly (readonly [number, number, number])[] = Object.freeze([
  [28, 25, 1],
  [28, 21, 5],
  [27, 18, 8],
  [27, 14, 11],
  [26, 10, 15],
  [26, 7, 18],
  [25, 3, 21],
  [25, 0, 25],
  [25, 0, 23],
  [25, 0, 20],
  [25, 0, 16],
  [25, 0, 13],
  [26, 0, 10],
  [26, 0, 6],
  [26, 0, 3],
  [27, 0, 0],
  [27, 1, 0],
  [27, 5, 0],
  [27, 9, 0],
  [27, 12, 0],
  [28, 16, 0],
  [28, 19, 0],
  [28, 23, 0],
  [29, 27, 0],
]);

/** Droplet batch geometry at `tTimer==6` (lower) and `tTimer==18` (upper). */
export const FACADE_DROPLET_BATCH_OFFSETS: readonly { xOffset: number; yOffset: number }[] = Object.freeze([
  { xOffset: 30, yOffset: 20 },
  { xOffset: 18, yOffset: -20 },
]);

export const FACADE_DROPLET_SPAWN_TICKS = Object.freeze([6, 18] as const);

/** The squish task's per-squish tTimer that each droplet batch spawns at. */
export function facadeSquishSpawnAge(squishIndex: 0 | 1 | 2): number {
  return FACADE_FIRST_TASK_AGE + squishIndex * 25 - 1 + 6;
}

/** The squish matrix from the affine anim at move-relative `age`. */
export function facadeSquishMatrixAtAge(age: number): FacadeMatrix {
  if (age < FACADE_FIRST_TASK_AGE || age > FACADE_SQUISH_LAST_AGE) {
    return { a: 256, d: 256 };
  }
  const resetAges = [28, 53];
  if (resetAges.includes(age)) return { a: 256, d: 256 };
  let squishStart = FACADE_FIRST_TASK_AGE;
  let nextReset = 28;
  while (age >= nextReset) {
    squishStart = nextReset + 1;
    nextReset += 25;
  }
  const t = age - squishStart + 1;
  if (t <= 6) {
    return { a: 256 - 16 * t, d: 256 + 16 * t };
  }
  if (t <= 18) {
    return { a: 160 + 16 * (t - 6), d: 352 - 16 * (t - 6) };
  }
  return { a: 352 - 16 * (t - 18), d: 160 + 16 * (t - 18) };
}

/** `SetBattlerSpriteYOffsetFromYScale`'s y2 from the software `d` matrix. */
export function facadeSquishY2(age: number, battlerHeight: number): number {
  const matrix = facadeSquishMatrixAtAge(age);
  const scaledHeight = Math.trunc((battlerHeight << 8) / matrix.d);
  return Math.trunc((battlerHeight - scaledHeight) / 2);
}

export function facadeDropletBatchSpawnAges(): readonly number[] {
  const ages: number[] = [];
  for (let squish = 0; squish < 3; squish += 1) {
    for (const tick of FACADE_DROPLET_SPAWN_TICKS) {
      ages.push(FACADE_FIRST_TASK_AGE + squish * 25 - 1 + tick);
    }
  }
  return ages;
}

/** RAM droplets alive at `age`: 6 batches of 4 sprites, each alive 7 ticks. */
export function facadeDropletsAtAge(
  age: number,
  base: Readonly<{ x: number; y: number }>,
): readonly FacadeDroplet[] {
  const out: FacadeDroplet[] = [];
  const spawnAges = facadeDropletBatchSpawnAges();
  for (let batch = 0; batch < spawnAges.length; batch += 1) {
    const spawnAge = spawnAges[batch]!;
    const offset = FACADE_DROPLET_BATCH_OFFSETS[batch % 2]!;
    const tick = age - spawnAge;
    if (tick < 0 || tick > 6) continue;
    for (let index = 0; index < 4; index += 1) {
      const xSign = index < 2 ? -1 : 1;
      const dxExtra = index % 2 === 0 ? 0 : 4;
      const x = base.x + xSign * (offset.xOffset + dxExtra) + tick * (xSign * 2);
      const row = index % 2;
      const y = base.y + offset.yOffset + row * 6 - tick;
      out.push({ index, tick, x, y });
    }
  }
  return out;
}

export function facadeBlendColorIndexAtAge(age: number): number | null {
  if (age < FACADE_FIRST_TASK_AGE || age > FACADE_BLEND_LAST_AGE) return null;
  return (age - FACADE_FIRST_TASK_AGE) % FACADE_BLEND_COLOR_INDEX_COUNT;
}

export function facadeAtAge(
  age: number,
  base: Readonly<{ x: number; y: number }>,
  battlerHeight: number,
): FacadeState {
  const blendColorIndex = facadeBlendColorIndexAtAge(age);
  const taskCount = age >= FACADE_FIRST_TASK_AGE && age <= FACADE_SQUISH_LAST_AGE
    ? (blendColorIndex !== null ? 2 : 1)
    : 0;
  return {
    age,
    visualTaskCount: taskCount,
    matrix: facadeSquishMatrixAtAge(age),
    y2: facadeSquishY2(age, battlerHeight),
    droplets: facadeDropletsAtAge(age, base),
    blendColorIndex,
  };
}
