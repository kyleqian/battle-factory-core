/**
 * Source-relative MOVE_GLARE state.
 *
 * This is deliberately a RAM/presentation reducer, not a renderer.  The
 * source script is unusually useful here: GLARE is a chain of ordinary
 * visual tasks and sprites, and the reducer keeps their source arguments,
 * callbacks, lifetimes, palette/register writes, and the measured OAM latch
 * visible to the Scene-ON seam without making any gameplay decision.
 */

export type GlareSide = "player" | "opponent";

export const GLARE_SOURCE_FRAME_COUNT = 213;
export const GLARE_ACTIVE_FRAME_COUNT = 212;
export const GLARE_CLEANUP_AGE = 212;
export const GLARE_FIRST_DOT_AGE = 10;
export const GLARE_DOT_PAIR_COUNT = 13;
export const GLARE_DOT_LIFETIME = 37;
export const GLARE_SPARKLE_FIRST_AGE = 112;
export const GLARE_SPARKLE_LAST_AGE = 133;
export const GLARE_SCARY_FACE_FIRST_AGE = 112;
export const GLARE_SCARY_FACE_LAST_TASK_AGE = 194;
export const GLARE_SHAKE_FIRST_AGE = 118;
export const GLARE_SHAKE_LAST_AGE = 135;
export const GLARE_RESTORE_FIRST_AGE = 196;

/** OAM allocator reuse observed in both dense Scene-ON orientations. */
export const GLARE_DOT_OAM_SLOTS = [
  [3, 4], [5, 7], [9, 10], [11, 12], [13, 14], [15, 16],
  [17, 18], [19, 20], [21, 22], [23, 24], [3, 4], [5, 7], [9, 10],
] as const;

/** Hardware OAM target x2 at local ages 118..140 (RAM is still changing). */
export const GLARE_DISPLAYED_TARGET_X2_AGES_118_140 = [
  0, 0, 1, 0, -1, 1, 0, -1, 0, 1, -1, 0, 1, 0, -1, 1, 0, -1,
  0, 1, 0, 0, 0,
] as const;

const GLARE_SHAKE_PATTERN = [-1, 0, 1, 0, -1, 1, 0, -1, 0, 1] as const;
const GLARE_SPARKLE_TILE_OFFSETS = [0, 4, 8, 4, 0] as const;

export interface GlarePoint {
  readonly x: number;
  readonly y: number;
}

export interface GlareGeometry {
  readonly attackerSide: GlareSide;
  readonly targetSide: GlareSide;
  readonly attackerEyeCenter: GlarePoint;
  /** `GetBattlerSpriteCoord`-derived dot start, including the species height correction. */
  readonly eyeDotStart: GlarePoint;
  /** Target `BATTLER_COORD_X_2/Y_PIC_OFFSET` used by the source task. */
  readonly eyeDotEnd: GlarePoint;
}

export type GlareTaskFunction =
  | "AnimTask_GlareEyeDots_Step"
  | "AnimTask_BlendSpriteColor_Step2"
  | "AnimTask_ScaryFace"
  | "AnimTask_ScaryFace_Step"
  | "AnimTask_ShakeTargetInPattern";

export interface GlareTask {
  readonly slot: 0 | 1;
  readonly function: GlareTaskFunction;
  readonly data: readonly number[];
}

export interface GlareEyeDot {
  readonly kind: "eye-dot";
  readonly pair: number;
  readonly sourceOrder: 0 | 1;
  readonly oamSlot: number;
  readonly activeAge: number;
  readonly timer: number;
  readonly x: number;
  readonly y: number;
  readonly x2: -3 | 3;
  readonly y2: -3 | 3;
  readonly subpriority: 35;
  readonly data: readonly [number, 0, 10, 0, 0, 0, 0, 0];
}

export interface GlareEyeSparkle {
  readonly kind: "eye-sparkle";
  readonly sourceOrder: 0 | 1;
  readonly oamSlot: 3 | 4;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly tileFrame: 0 | 1 | 2 | 3 | 4;
  readonly tileOffset: 0 | 4 | 8;
  readonly subpriority: 30 | 40;
  readonly data: readonly [0, 0, 0, 0, 0, 0, 0, 0];
}

export interface GlareScaryFaceTask {
  readonly function: "AnimTask_ScaryFace" | "AnimTask_ScaryFace_Step";
  readonly counter: number;
  readonly blendCounter: number;
  readonly phase: 0 | 1 | 2 | 3;
  readonly blendY: number;
  readonly data: readonly number[];
}

export interface GlareShakeTask {
  readonly slot: 1;
  readonly counter: number;
  readonly sourceArgs: readonly [20, 1, false, 0];
  /** `gBattleAnimArgs[3]` has been replaced by the preceding BG blend. */
  readonly runtimeArgs: readonly [20, 1, false, 16];
  readonly logicalTargetOffset: Readonly<{ x2: number; y2: 0 }>;
  readonly hardwareTargetOffset: Readonly<{ x2: number; y2: 0 }>;
}

export interface GlareBattlerDisplayState {
  readonly logical: Readonly<{ x2: number; y2: 0 }>;
  readonly hardware: Readonly<{ x2: number; y2: 0 }>;
  readonly hardwareSourceAge: number | null;
}

export interface GlarePaletteState {
  readonly blend: "toBlack" | "fromBlack" | null;
  readonly selector: "F_PAL_BG";
  readonly color: "RGB_BLACK";
  /** Palette RAM coefficient written by the source callback. */
  readonly softwareCoefficient: number;
  /** Coefficient visible in the hardware palette after the measured latch. */
  readonly hardwareCoefficient: number;
}

export interface GlareRegisterState {
  readonly dispcnt: 48960;
  readonly bg1cnt: 7169 | 7173 | 39936;
  readonly bg1hofs: 0;
  readonly bg1vofs: 0;
  readonly bldcnt: 0 | 16194;
  readonly bldalpha: number;
  readonly bldy: 0;
}

export interface GlareState {
  readonly active: boolean;
  readonly clean: boolean;
  readonly sourceOffset: number;
  readonly framesToWait: number;
  readonly assets: Readonly<{ smallRedEye: boolean; eyeSparkle: boolean }>;
  readonly dots: readonly GlareEyeDot[];
  readonly sparkles: readonly GlareEyeSparkle[];
  readonly tasks: readonly GlareTask[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly palette: GlarePaletteState;
  readonly registers: GlareRegisterState;
  readonly scaryFace: Readonly<{
    readonly tilemap:
      | "gBattleAnimBgTilemap_ScaryFacePlayer"
      | "gBattleAnimBgTilemap_ScaryFaceOpponent";
    readonly image: "gBattleAnimBgImage_ScaryFace";
    readonly palette: "gBattleAnimBgPalette_ScaryFace";
    readonly task: GlareScaryFaceTask | null;
    readonly loaded: boolean;
  }> | null;
  readonly targetOffset: Readonly<{ x2: number; y2: 0 }>;
  readonly battlers: Readonly<Record<GlareSide, GlareBattlerDisplayState>>;
  readonly shakeTask: GlareShakeTask | null;
  readonly soundRestart: "SE_M_PSYBEAM2" | "SE_M_LEER" | null;
  readonly soundPan: -64 | 63 | null;
  readonly audio: Readonly<{
    readonly psybeam2: boolean;
    readonly leer: boolean;
  }>;
}

function array16(): number[] {
  return Array(16).fill(0);
}

function dotCoordinate(start: number, end: number, pair: number): number {
  if (pair === 0) return start;
  if (pair >= 12) return end;
  // The C source performs a signed integer divide before the Q8.8 shift.
  const step = Math.trunc(((end - start) << 8) / 11);
  return ((start << 8) + pair * step) >> 8;
}

export function glareSourceOffsetAtAge(age: number): number {
  if (age < 1) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 95) return 19;
  if (age <= 111) return 37;
  if (age <= 113) return 67;
  if (age <= 117) return 73;
  if (age <= 195) return 86;
  return 104;
}

export function glareFramesToWaitAtAge(age: number): number {
  if (age < 0 || age > GLARE_CLEANUP_AGE) return 0;
  if (age === 0 || (age >= 2 && age <= 3) || (age >= 5 && age <= 6)) return 0;
  if (age === 1 || age === 4) return 1;
  if (age <= 111) return 1;
  if (age <= 113) return 0;
  if (age === 114) return 2;
  if (age === 115) return 1;
  if (age <= 117) return 0;
  return 1;
}

function dotsAtAge(age: number, geometry: GlareGeometry): readonly GlareEyeDot[] {
  const dots: GlareEyeDot[] = [];
  for (let pair = 0; pair < GLARE_DOT_PAIR_COUNT; pair += 1) {
    const created = GLARE_FIRST_DOT_AGE + pair * 4;
    const timer = age - created;
    if (timer < 0 || timer >= GLARE_DOT_LIFETIME) continue;
    const x = dotCoordinate(geometry.eyeDotStart.x, geometry.eyeDotEnd.x, pair);
    const y = dotCoordinate(geometry.eyeDotStart.y, geometry.eyeDotEnd.y, pair);
    const slots = GLARE_DOT_OAM_SLOTS[pair]!;
    dots.push({
      kind: "eye-dot", pair, sourceOrder: 0, oamSlot: slots[0]!, activeAge: created,
      timer, x, y, x2: -3, y2: -3, subpriority: 35,
      data: [timer, 0, 10, 0, 0, 0, 0, 0] as const,
    });
    dots.push({
      kind: "eye-dot", pair, sourceOrder: 1, oamSlot: slots[1]!, activeAge: created,
      timer, x, y, x2: 3, y2: 3, subpriority: 35,
      data: [timer, 0, 10, 0, 0, 0, 0, 0] as const,
    });
  }
  return dots;
}

function dotTaskAtAge(age: number, geometry: GlareGeometry): GlareTask | null {
  if (age < 7 || age > 94) return null;
  const data = array16();
  const createdPairs = age < GLARE_FIRST_DOT_AGE
    ? 0 : Math.min(GLARE_DOT_PAIR_COUNT, 1 + Math.floor((age - GLARE_FIRST_DOT_AGE) / 4));
  data[0] = createdPairs >= GLARE_DOT_PAIR_COUNT ? 1 : 0;
  data[1] = createdPairs >= GLARE_DOT_PAIR_COUNT
    ? 0 : age < GLARE_FIRST_DOT_AGE ? age - 6 : (age - GLARE_FIRST_DOT_AGE) % 4;
  data[2] = createdPairs;
  data[5] = 12;
  data[6] = 3;
  data[10] = dotsAtAge(age, geometry).length;
  data[11] = geometry.eyeDotStart.x;
  data[12] = geometry.eyeDotStart.y;
  data[13] = geometry.eyeDotEnd.x;
  data[14] = geometry.eyeDotEnd.y;
  return { slot: 0, function: "AnimTask_GlareEyeDots_Step", data };
}

function blendTaskAtAge(age: number): GlareTask | null {
  if (age >= 96 && age <= 110) {
    const data = array16(); data[0] = 14; data[4] = 16; data[10] = age - 94;
    return { slot: 0, function: "AnimTask_BlendSpriteColor_Step2", data };
  }
  if (age >= 196 && age <= 210) {
    const data = array16(); data[0] = 14; data[3] = 16; data[10] = 210 - age;
    return { slot: 0, function: "AnimTask_BlendSpriteColor_Step2", data };
  }
  return null;
}

function scaryTaskAtLocalAge(localAge: number): GlareScaryFaceTask | null {
  if (localAge < 0 || localAge > 82) return null;
  if (localAge <= 1) {
    return { function: "AnimTask_ScaryFace", counter: 0, blendCounter: 0,
      phase: 0, blendY: 0, data: array16() };
  }
  let counter = 0, blendCounter = 0, phase: 0 | 1 | 2 | 3 = 0;
  for (let tick = 2; tick <= localAge; tick += 1) {
    if (phase === 0) {
      counter += 1;
      if (counter === 2) {
        counter = 0; blendCounter += 1;
        if (blendCounter === 14) { phase = 1; blendCounter = 0; }
      }
    } else if (phase === 1) {
      blendCounter += 1;
      if (blendCounter === 21) { blendCounter = 14; phase = 2; }
    } else if (phase === 2) {
      counter += 1;
      if (counter === 2) {
        counter = 0; blendCounter -= 1;
        if (blendCounter === 0) { phase = 3; }
      }
    }
  }
  const data = array16(); data[10] = counter; data[11] = blendCounter; data[12] = phase;
  return { function: "AnimTask_ScaryFace_Step", counter, blendCounter, phase,
    blendY: phase === 1 ? 14 : blendCounter, data };
}

function shakePatternAtAge(age: number): number {
  const counter = age - 116;
  return GLARE_SHAKE_PATTERN[counter % 10]!;
}

function hardwareTargetX2AtAge(age: number): number {
  if (age < GLARE_SHAKE_FIRST_AGE) return 0;
  return GLARE_DISPLAYED_TARGET_X2_AGES_118_140[age - GLARE_SHAKE_FIRST_AGE]
    ?? 0;
}

function shakeTaskAtAge(age: number): GlareShakeTask | null {
  if (age < GLARE_SHAKE_FIRST_AGE || age > GLARE_SHAKE_LAST_AGE) return null;
  const counter = age - 116;
  const logical = shakePatternAtAge(age);
  return {
    slot: 1, counter, sourceArgs: [20, 1, false, 0], runtimeArgs: [20, 1, false, 16],
    logicalTargetOffset: { x2: logical, y2: 0 },
    hardwareTargetOffset: { x2: hardwareTargetX2AtAge(age), y2: 0 },
  };
}

function sparklesAtAge(age: number, geometry: GlareGeometry): readonly GlareEyeSparkle[] {
  if (age < GLARE_SPARKLE_FIRST_AGE || age > GLARE_SPARKLE_LAST_AGE) return [];
  // The sprite is created on age 112, then its first VBlank callback advances
  // the command stream one source frame later than creation.
  const frame = Math.min(4, Math.max(0, Math.floor((age - 113) / 4))) as 0 | 1 | 2 | 3 | 4;
  const offset = GLARE_SPARKLE_TILE_OFFSETS[frame]! as 0 | 4 | 8;
  const sign = geometry.attackerSide === "player" ? 1 : -1;
  return [0, 1].map((sourceOrder) => {
    const sourceOffset = sourceOrder === 0 ? -16 : 16;
    return {
      kind: "eye-sparkle" as const, sourceOrder: sourceOrder as 0 | 1,
      oamSlot: (sourceOrder + 3) as 3 | 4,
      x: geometry.attackerEyeCenter.x + sourceOffset * sign,
      y: geometry.attackerEyeCenter.y, x2: 0 as const, y2: 0 as const,
      tileFrame: frame, tileOffset: offset,
      subpriority: geometry.attackerSide === "player" ? 30 : 40,
      data: [0, 0, 0, 0, 0, 0, 0, 0] as const,
    };
  });
}

/** Hardware-visible dot OAM: task creation is +2 displays, destruction +1. */
export function glareDisplayedDotsAtAge(
  age: number,
  geometry: GlareGeometry,
): readonly GlareEyeDot[] {
  return dotsAtAge(age - 2, geometry)
    .filter((dot) => age < dot.activeAge + 38);
}

/** The two script-created sparkles first scan out three displays after creation. */
export function glareDisplayedSparklesAtAge(
  age: number,
  geometry: GlareGeometry,
): readonly GlareEyeSparkle[] {
  return age < 115 ? [] : sparklesAtAge(age - 1, geometry);
}

function paletteAtAge(age: number): GlarePaletteState {
  const blend = age >= 96 && age <= 111 ? "toBlack"
    : age >= 196 && age <= 211 ? "fromBlack" : null;
  const softwareCoefficient = blend === "toBlack"
    ? Math.min(16, age - 94)
    : blend === "fromBlack" ? Math.max(0, 210 - age) : age < 196 ? 16 : 0;
  const hardwareCoefficient = age < 97
    ? (age < 196 ? 0 : 16)
    : age < 196 ? Math.min(16, age - 96)
      : age === 196 ? 16 : Math.max(0, 212 - age);
  return { blend, selector: "F_PAL_BG", color: "RGB_BLACK",
    softwareCoefficient, hardwareCoefficient };
}

function scaryBackgroundAtAge(age: number, targetSide: GlareSide) {
  const loaded = age >= GLARE_SCARY_FACE_FIRST_AGE && age < GLARE_RESTORE_FIRST_AGE;
  if (!loaded) return null;
  const task = scaryTaskAtLocalAge(age - GLARE_SCARY_FACE_FIRST_AGE);
  return {
    tilemap: targetSide === "opponent"
      ? "gBattleAnimBgTilemap_ScaryFacePlayer" as const
      : "gBattleAnimBgTilemap_ScaryFaceOpponent" as const,
    image: "gBattleAnimBgImage_ScaryFace" as const,
    palette: "gBattleAnimBgPalette_ScaryFace" as const,
    task, loaded: true as const,
  };
}

function scaryBlendCoefficientAtAge(age: number): number {
  if (age < 113 || age > 195) return 0;
  const previous = scaryTaskAtLocalAge(age - GLARE_SCARY_FACE_FIRST_AGE - 1);
  return previous?.blendY ?? 0;
}

function registerStateAtAge(age: number): GlareRegisterState {
  const activeScary = age >= 113 && age <= 195;
  const coefficient = scaryBlendCoefficientAtAge(age);
  return {
    dispcnt: 48960,
    bg1cnt: age >= GLARE_RESTORE_FIRST_AGE ? 7169 : age >= 113 ? 7173 : 39936,
    bg1hofs: 0, bg1vofs: 0,
    bldcnt: activeScary ? 16194 : 0,
    bldalpha: activeScary ? coefficient | ((16 - coefficient) << 8) : 0,
    bldy: 0,
  };
}

function soundAtAge(age: number, side: GlareSide) {
  const pan = side === "player" ? -64 as const : 63 as const;
  const soundRestart = age === 7 ? "SE_M_PSYBEAM2" as const
    : age === 114 ? "SE_M_LEER" as const : null;
  return {
    soundRestart, soundPan: soundRestart === null ? null : pan,
    audio: { psybeam2: age >= 8 && age < 57, leer: age >= 115 && age < 176 },
  };
}

function visualTaskCountAtAge(age: number): number {
  if (age < 7 || age === 95 || age === 111 || age >= 195 && age < 196
    || age >= 211) return 0;
  if ((age >= 7 && age <= 94) || (age >= 96 && age <= 110)
    || (age >= 196 && age <= 210) || (age >= 136 && age <= 194)) return 1;
  if (age <= 113) return 2;
  if (age <= 117) return 3;
  if (age <= 133) return 4;
  if (age <= 135) return 2;
  return 1;
}

/** Complete source-owned MOVE_GLARE state, including cleanup age 212. */
export function glareAtAge(age: number, geometry: GlareGeometry): GlareState {
  const dotTask = dotTaskAtAge(age, geometry);
  const blendTask = blendTaskAtAge(age);
  const scary = scaryTaskAtLocalAge(age - GLARE_SCARY_FACE_FIRST_AGE);
  const shake = shakeTaskAtAge(age);
  const tasks: GlareTask[] = [];
  if (dotTask) tasks.push(dotTask);
  if (blendTask) tasks.push(blendTask);
  if (scary) tasks.push({ slot: 0, function: scary.function, data: scary.data });
  if (shake) {
    const data = array16(); data[0] = shake.counter; data[1] = 20; data[2] = 1;
    data[3] = 0; data[4] = 16;
    tasks.push({ slot: 1, function: "AnimTask_ShakeTargetInPattern", data });
  }
  const targetLogical = shake?.logicalTargetOffset ?? { x2: 0, y2: 0 as const };
  const targetHardware = { x2: hardwareTargetX2AtAge(age), y2: 0 as const };
  const battlers = {
    player: {
      logical: geometry.targetSide === "player" ? targetLogical : { x2: 0, y2: 0 as const },
      hardware: geometry.targetSide === "player" ? targetHardware : { x2: 0, y2: 0 as const },
      hardwareSourceAge: geometry.targetSide === "player" && age >= 118 ? age : null,
    },
    opponent: {
      logical: geometry.targetSide === "opponent" ? targetLogical : { x2: 0, y2: 0 as const },
      hardware: geometry.targetSide === "opponent" ? targetHardware : { x2: 0, y2: 0 as const },
      hardwareSourceAge: geometry.targetSide === "opponent" && age >= 118 ? age : null,
    },
  } as const;
  const sounds = soundAtAge(age, geometry.attackerSide);
  return {
    active: age >= 0 && age < GLARE_CLEANUP_AGE,
    clean: age >= GLARE_CLEANUP_AGE,
    sourceOffset: glareSourceOffsetAtAge(age),
    framesToWait: glareFramesToWaitAtAge(age),
    assets: {
      smallRedEye: age >= 0 && age < GLARE_CLEANUP_AGE,
      eyeSparkle: age >= 4 && age < GLARE_CLEANUP_AGE,
    },
    dots: dotsAtAge(age, geometry),
    sparkles: sparklesAtAge(age, geometry),
    tasks,
    visualTaskCount: visualTaskCountAtAge(age), soundTaskCount: 0,
    palette: paletteAtAge(age), registers: registerStateAtAge(age),
    scaryFace: scaryBackgroundAtAge(age, geometry.targetSide),
    targetOffset: targetLogical,
    battlers, shakeTask: shake,
    ...sounds,
  };
}
