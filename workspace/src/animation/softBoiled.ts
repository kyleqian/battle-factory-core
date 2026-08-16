/**
 * Source-relative presentation reducer for `Move_SOFT_BOILED`.
 *
 * This is deliberately a presentation-only port.  The source cursor, sprite
 * callbacks, visual tasks, allocator tags, audio, and register latches are
 * all relative to the first frame of the retained move body; no battle tick,
 * damage result, RNG value, or framebuffer is an input to this module.
 */

export type SoftBoiledSide = "player" | "opponent";

export interface SoftBoiledPoint {
  readonly x: number;
  readonly y: number;
}

export interface SoftBoiledGeometry {
  readonly attackerCenter: Readonly<SoftBoiledPoint>;
  readonly targetCenter: Readonly<SoftBoiledPoint>;
  readonly battlePositionCenter: Readonly<SoftBoiledPoint>;
}

export const SOFT_BOILED_FRAME_COUNT = 272;
export const SOFT_BOILED_FIRST_INACTIVE_AGE = 271;
export const SOFT_BOILED_EGG_START_AGE = 13;
export const SOFT_BOILED_EGG_LAST_AGE = 216;
export const SOFT_BOILED_RING_STARTS = [144, 154] as const;
export const SOFT_BOILED_RING_LAST_AGE = 184;
export const SOFT_BOILED_STAR_STARTS = [218, 229, 238, 247] as const;
export const SOFT_BOILED_STAR_SLOTS = [3, 4, 5, 3] as const;

const EGG_Y2 = [
  -3, -6, -9, -12, -15, -17, -19, -21, -23, -25, -27, -29, -31,
  -32, -33, -34, -35, -36, -37, -38, -39, -39, -39, -39, -39, -39,
  -39, -39, -39, -38, -37, -36, -35, -34, -33, -32, -31, -29, -27,
  -25, -23, -21, -19, -17, -15, -12, -9, -6, -3, 0,
] as const;

type Matrix = readonly [number, number, number, number];
const IDENTITY: Matrix = [256, 0, 0, 256];

// `gSoftBoiledEggAffineAnimCmds1`: FRAME(0,0,-8,2), FRAME(...,+8,4),
// FRAME(...,-8,2), LOOP(0).  The eight visible matrices are the GBA affine
// table values for that source command sequence, including its initial frame.
const EGG_BREAK_MATRICES: readonly Matrix[] = [
  [236, 97, -97, 236], [251, 49, -49, 251], [256, 0, 0, 256],
  [251, -49, 49, 251], [236, -97, 97, 236], [251, -49, 49, 251],
  [256, 0, 0, 256], [251, 49, -49, 251],
];

// `gSoftBoiledEggAffineAnimCmds3`: the source's initial expanding frame,
// two looped oscillation legs, and the settle frames.  This table is a
// source-derived affine command trace, not a pixel or screenshot lookup.
const EGG_BREAK_AFFINE3: readonly Matrix[] = [
  [264, 0, 0, 252], [273, 0, 0, 248], [282, 0, 0, 244],
  [292, 0, 0, 240], [303, 0, 0, 237], [315, 0, 0, 234],
  [327, 0, 0, 230], [341, 0, 0, 227], [315, 0, 0, 234],
  [292, 0, 0, 240], [273, 0, 0, 248], [256, 0, 0, 256],
  [240, 0, 0, 264], [227, 0, 0, 273], [215, 0, 0, 282],
  [204, 0, 0, 292], [215, 0, 0, 282], [227, 0, 0, 273],
  [240, 0, 0, 264], [256, 0, 0, 256], [273, 0, 0, 248],
  [292, 0, 0, 240], [315, 0, 0, 234], [341, 0, 0, 227],
  [315, 0, 0, 234], [292, 0, 0, 240], [273, 0, 0, 248],
  [256, 0, 0, 256], [240, 0, 0, 264], [227, 0, 0, 273],
  [215, 0, 0, 282], [204, 0, 0, 292], [215, 0, 0, 282],
  [227, 0, 0, 273], [240, 0, 0, 264], [256, 0, 0, 256],
  [273, 0, 0, 248], [292, 0, 0, 240], [315, 0, 0, 234],
  [341, 0, 0, 227],
];

const BLUE_STAR_OFFSETS = [
  { x: 0, y: -5 }, { x: -15, y: 10 },
  { x: -15, y: -15 }, { x: 10, y: -5 },
] as const;
const BLUE_STAR_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const BLUE_STAR_DURATIONS = [1, 2, 2, 3, 5, 3, 2, 3] as const;

export type SoftBoiledEggCallback =
  | "AnimSoftBoiledEgg_Step1"
  | "AnimSoftBoiledEgg_Step2"
  | "AnimSoftBoiledEgg_Step3"
  | "AnimSoftBoiledEgg_Step3_Callback1"
  | "AnimSoftBoiledEgg_Step3_Callback2"
  | "AnimSoftBoiledEgg_Step4"
  | "AnimSoftBoiledEgg_Step4_Callback"
  | "DestroyAnimSprite";

export interface SoftBoiledEggSprite {
  readonly kind: "egg";
  readonly slot: 3 | 4;
  readonly callback: SoftBoiledEggCallback;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly tileIndex: number;
  readonly animationFrame: 0;
  readonly animationDelayCounter: 0;
  readonly matrix: Matrix;
  readonly data: readonly number[];
  readonly invisible: boolean;
  readonly subpriority: number;
}

export interface SoftBoiledRingSprite {
  readonly kind: "ring";
  readonly slot: 7 | 9;
  readonly callback: "AnimSpriteOnMonPos";
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly tileIndex: 537;
  readonly animationFrame: 0;
  readonly animationDelayCounter: 0;
  readonly matrix: Matrix;
  readonly data: readonly number[];
  readonly invisible: false;
  readonly subpriority: number;
}

export interface SoftBoiledStarSprite {
  readonly kind: "star";
  readonly slot: 3 | 4 | 5;
  readonly spawnIndex: number;
  readonly callback: "AnimSpriteOnMonPos";
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly tileIndex: number;
  readonly animationFrame: number;
  readonly animationDelayCounter: number;
  readonly matrix: Matrix;
  readonly data: readonly number[];
  readonly invisible: false;
  readonly subpriority: number;
}

export type SoftBoiledSprite =
  | SoftBoiledEggSprite
  | SoftBoiledRingSprite
  | SoftBoiledStarSprite;

export type SoftBoiledTaskFunction =
  | "AnimTask_ShakeMon_Step"
  | "Task_UpdateMonBg"
  | "Task_ClearMonBg";

export interface SoftBoiledTask {
  readonly slot: number;
  readonly priority: number;
  readonly function: SoftBoiledTaskFunction;
  readonly data: readonly number[];
}

export interface SoftBoiledSourceCursor {
  readonly owner: "Move_SOFT_BOILED" | "HealingEffect2";
  readonly offset: number;
  readonly wait: number;
}

export interface SoftBoiledAudioEvent {
  readonly age: number;
  readonly channel: "SE1" | "SE2";
  readonly sound: "se_m_tail_whip" | "se_m_horn_attack" | "se_m_absorb_2";
  readonly panX: readonly number[];
}

export interface SoftBoiledAudioChannel {
  readonly sound: SoftBoiledAudioEvent["sound"] | null;
  readonly panX: readonly number[];
}

export interface SoftBoiledState {
  readonly age: number;
  readonly active: boolean;
  readonly source: SoftBoiledSourceCursor;
  readonly sprites: readonly SoftBoiledSprite[];
  /** Owned slots in the source's OAM order, excluding unrelated chrome. */
  readonly sourceOrder: readonly number[];
  readonly tasks: readonly SoftBoiledTask[];
  readonly registers: Readonly<{
    readonly bg1hofs: number;
    readonly bg1vofs: number;
    readonly bg2hofs: number;
    readonly bg2vofs: number;
    readonly bldcnt: number;
    readonly bldalpha: number;
    readonly bldy: 0;
  }>;
  readonly battleBg: Readonly<{
    readonly gBattle_BG1_X: number;
    readonly gBattle_BG1_Y: number;
    readonly gBattle_BG2_X: number;
    readonly gBattle_BG2_Y: number;
  }>;
  readonly bgVram: Readonly<{
    readonly generation: 0 | 1 | 2 | 3;
    readonly transition: "none" | "monbg-load" | "clear-task" | "monbg-restore";
  }>;
  readonly palette: Readonly<{
    readonly color: Readonly<{ readonly r: 12; readonly g: 24; readonly b: 30 }>;
    readonly bldcnt: number;
    readonly eva: number;
    readonly evb: number;
    readonly transfer: "none" | "mixed-bg-current-obj-preceding";
    readonly hardwareLatch:
      | "initial"
      | "preceding-faded"
      | "mixed-bg-current-obj-preceding";
  }>;
  readonly audio: Readonly<{
    readonly events: readonly SoftBoiledAudioEvent[];
    readonly se1: SoftBoiledAudioChannel;
    readonly se2: SoftBoiledAudioChannel;
  }>;
  readonly resources: Readonly<{
    readonly paletteTags: readonly number[];
    readonly tileTags: readonly number[];
    readonly loaded: Readonly<{
      readonly breakingEgg: boolean;
      readonly thinRing: boolean;
      readonly blueStar: boolean;
    }>;
  }>;
  readonly rng: Readonly<{
    readonly gameplayStable: true;
    readonly animationAdvances: boolean;
    readonly animationHeldByAudioWorkload: boolean;
  }>;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly ownedSprites: number;
    readonly ownedTasks: number;
    readonly moveTags: readonly number[];
  }>;
}

function sideSign(side: SoftBoiledSide): 1 | -1 {
  return side === "player" ? 1 : -1;
}

function sourceOffsetAtAge(age: number): number {
  if (age <= 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 9) return 9;
  if (age <= 12) return 11;
  if (age <= 134) return 60;
  if (age <= 143) return 62;
  if (age <= 153) return 100;
  if (age <= 215) return 117;
  if (age <= 217) return 121;
  if (age <= 228) return 21;
  if (age <= 237) return 38;
  if (age <= 246) return 55;
  if (age <= 255) return 72;
  return 129;
}

function sourceWaitAtAge(age: number): number {
  if (age === 1 || age === 4 || age === 7 || age === 10) return 1;
  if (age <= 12) return 0;
  if (age <= 134) return Math.max(0, 133 - age);
  if (age <= 143) return Math.max(0, 142 - age);
  if (age <= 153) return Math.max(0, 152 - age);
  if (age <= 215) return Math.max(0, 214 - age);
  if (age <= 217) return 1;
  if (age === 218) return 7;
  if (age <= 221) return 6;
  if (age <= 228) return Math.max(0, 227 - age);
  if (age <= 237) return Math.max(0, 236 - age);
  if (age <= 246) return Math.max(0, 245 - age);
  if (age <= 255) return Math.max(0, 254 - age);
  return 1;
}

function sourceAtAge(age: number): SoftBoiledSourceCursor {
  return {
    owner: age >= 218 && age <= 255 ? "HealingEffect2" : "Move_SOFT_BOILED",
    offset: sourceOffsetAtAge(age),
    wait: sourceWaitAtAge(age),
  };
}

function eggAtAge(
  age: number,
  slot: 3 | 4,
  side: SoftBoiledSide,
  center: Readonly<SoftBoiledPoint>,
): SoftBoiledEggSprite | null {
  if (age < SOFT_BOILED_EGG_START_AGE || age > SOFT_BOILED_EGG_LAST_AGE) return null;
  const local = age - SOFT_BOILED_EGG_START_AGE;
  const sign = sideSign(side);
  const arg = slot === 3 ? 0 : 1;
  let callback: SoftBoiledEggCallback;
  let x = center.x;
  let y = center.y;
  let x2 = 0;
  let y2 = 0;
  let data0 = 0;
  let data1 = sign * 8320;
  let matrix: Matrix = IDENTITY;
  let tileIndex = 305;
  let invisible = false;

  if (local <= 49) {
    callback = "AnimSoftBoiledEgg_Step1";
    // The creation callback runs once before the first retained row, so the
    // source's 0x380 initializer is already one -32 step down in RAM.
    data0 = 864 - local * 32;
    data1 = sign * (320 + local * 160);
    x2 = Math.floor((data1 - sign * 160) / 256);
    y2 = EGG_Y2[local]!;
    matrix = EGG_BREAK_MATRICES[local % EGG_BREAK_MATRICES.length]!;
  } else {
    x = center.x + (side === "player" ? 31 : -32);
    y = center.y + 3;
    if (local <= 70) {
      callback = "AnimSoftBoiledEgg_Step2";
      data0 = local - 50;
    } else if (local <= 127) {
      callback = "AnimSoftBoiledEgg_Step3";
      data0 = 21;
      const affine = EGG_BREAK_AFFINE3[age - 84];
      matrix = affine ?? IDENTITY;
    } else if (slot === 3 && local <= 136) {
      callback = "AnimSoftBoiledEgg_Step3_Callback1";
      data0 = age - 141;
      y2 = -2 * data0;
      tileIndex = 321;
    } else if (slot === 3 && local <= 182) {
      callback = "AnimSoftBoiledEgg_Step3_Callback2";
      data0 = 16 - Math.ceil((age - 150) / 3);
      data1 = age === 150 ? 0 : age - 150;
      y2 = -18;
      tileIndex = 321;
    } else {
      callback = "AnimSoftBoiledEgg_Step4";
      data0 = 0;
      data1 = slot === 3 ? 46 : sign * 8320;
      y2 = slot === 3 ? -18 : 0;
      tileIndex = slot === 3 ? 321 : 337;
    }
    if (age === 216) {
      callback = slot === 3
        ? "AnimSoftBoiledEgg_Step4_Callback"
        : "DestroyAnimSprite";
      invisible = true;
    }
  }

  return {
    kind: "egg", slot, callback, x, y, x2, y2, tileIndex,
    animationFrame: 0, animationDelayCounter: 0, matrix,
    data: [data0, data1, 0, 0, 0, 0, 0, arg], invisible,
    subpriority: side === "player" ? 26 : 36,
  };
}

function ringAtAge(
  age: number,
  startAge: 144 | 154,
  slot: 7 | 9,
  side: SoftBoiledSide,
  center: Readonly<SoftBoiledPoint>,
): SoftBoiledRingSprite | null {
  const localAge = age - startAge;
  if (localAge < 0 || localAge > 30) return null;
  const scale = 32 + Math.min(localAge, 29) * 16;
  const matrixValue = Math.trunc(0x10000 / scale);
  return {
    kind: "ring", slot, callback: "AnimSpriteOnMonPos", localAge,
    x: center.x + (side === "player" ? 31 : -31), y: center.y,
    x2: 0, y2: 0, tileIndex: 537, animationFrame: 0,
    animationDelayCounter: 0, matrix: [matrixValue, 0, 0, matrixValue],
    data: [1, 0, 0, 0, 0, 0, 0, 0], invisible: false,
    subpriority: side === "player" ? 27 : 37,
  };
}

function blueStarAnimationAtLocalAge(
  localAge: number,
  delayedFirstStar: boolean,
): Readonly<{ frame: number; delay: number }> | null {
  if (localAge < 0) return null;
  // The first HealingEffect2 child is held by the two-tick audio workload at
  // ages 220..221.  Its source animation clock consequently repeats frame 1.
  const sourceAge = delayedFirstStar && localAge >= 2
    ? Math.max(1, localAge - 2)
    : localAge;
  let end = 0;
  for (let index = 0; index < BLUE_STAR_DURATIONS.length; index += 1) {
    end += BLUE_STAR_DURATIONS[index]!;
    if (sourceAge < end) {
      return {
        frame: BLUE_STAR_FRAMES[index]!,
        delay: index === 0 && sourceAge === 0
          ? 0
          : index === BLUE_STAR_DURATIONS.length - 1
            ? Math.max(0, 1 - (sourceAge - (end - BLUE_STAR_DURATIONS[index]!)))
            : end - 1 - sourceAge,
      };
    }
  }
  return null;
}

function starAtAge(
  age: number,
  index: number,
  side: SoftBoiledSide,
  center: Readonly<SoftBoiledPoint>,
): SoftBoiledStarSprite | null {
  const startAge = SOFT_BOILED_STAR_STARTS[index]!;
  const localAge = age - startAge;
  const delayedFirstStar = index === 0;
  const lastLocalAge = delayedFirstStar ? 22 : 20;
  if (localAge < 0 || localAge > lastLocalAge) return null;
  const animation = blueStarAnimationAtLocalAge(localAge, delayedFirstStar);
  if (!animation) return null;
  const offset = BLUE_STAR_OFFSETS[index]!;
  return {
    kind: "star",
    slot: SOFT_BOILED_STAR_SLOTS[index]!,
    spawnIndex: index,
    callback: "AnimSpriteOnMonPos",
    localAge,
    x: center.x + (side === "player" ? offset.x : -offset.x),
    y: center.y + offset.y,
    x2: 0, y2: 0,
    tileIndex: animation.frame === 7 ? 601 : 601 + animation.frame * 16,
    animationFrame: animation.frame,
    animationDelayCounter: animation.delay,
    matrix: IDENTITY,
    data: [1, 0, 0, 0, 0, 0, 0, 0],
    invisible: false,
    subpriority: side === "player" ? 28 : 38,
  };
}

function ownedSourceOrder(age: number): readonly number[] {
  if (age >= 13 && age <= 141) return [3, 4];
  if (age >= 142 && age <= 143) return [4, 3];
  if (age >= 144 && age <= 153) return [4, 3, 7];
  if (age >= 154 && age <= 174) return [4, 3, 7, 9];
  if (age >= 175 && age <= 184) return [4, 3, 9];
  if (age >= 185 && age <= 216) return [4, 3];
  if (age >= 218 && age <= 228) return [3];
  if (age >= 229 && age <= 237) return [4, 3];
  if (age >= 238 && age <= 240) return [4, 3, 5];
  if (age >= 241 && age <= 246) return [4, 5];
  if (age >= 247 && age <= 249) return [4, 3, 5];
  if (age >= 250 && age <= 258) return [3, 5];
  if (age >= 259 && age <= 267) return [3];
  return [];
}

function taskData(...values: number[]): readonly number[] {
  return [...values, ...Array(16 - values.length).fill(0)];
}

function tasksAtAge(
  age: number,
  side: SoftBoiledSide,
  position: Readonly<SoftBoiledPoint>,
): readonly SoftBoiledTask[] {
  const battlerId = side === "player" ? 0 : 1;
  const spriteId = side === "player" ? 6 : 8;
  const bgX = side === "player" ? -40 : -144;
  const bgY = side === "player" ? -59 : -17;
  const updatePriority = age >= 13 && age <= 22 || age >= 218 && age <= 220
    ? 0 : 254;
  const tasks: SoftBoiledTask[] = [];
  if (age >= 13 && age <= 22) {
    const local = age - 13;
    tasks.push({
      slot: 0, priority: 254, function: "AnimTask_ShakeMon_Step",
      data: taskData(spriteId, 5 - Math.floor(local / 2), 1,
        local % 2 === 0 ? 1 : 0, 0, 2),
    });
  }
  if (age >= 218 && age <= 220) {
    tasks.push({
      slot: 0, priority: 254, function: "Task_ClearMonBg",
      data: taskData(0, age === 218 ? 1 : 2, battlerId),
    });
  }
  if (age >= 10 && age <= 220) {
    tasks.push({
      slot: 1, priority: updatePriority, function: "Task_UpdateMonBg",
      data: taskData(spriteId, position.x, position.y, bgX, bgY,
        side === "player" ? 1 : 0, battlerId),
    });
  }
  return tasks;
}

function bldalphaAtAge(age: number): Readonly<{ eva: number; evb: number; value: number }> {
  if (age < 150 || age > 216) return { eva: 0, evb: 0, value: 0 };
  if (age === 150) return { eva: 16, evb: 0, value: 16 };
  if (age >= 196) return { eva: 0, evb: 16, value: 4096 };
  const step = Math.ceil((age - 150) / 3);
  return { eva: 16 - step, evb: step, value: 16 - step + (step << 8) };
}

function bgVramAtAge(age: number): SoftBoiledState["bgVram"] {
  return {
    generation: age < 11 ? 0 : age < 220 ? 1 : age < 222 ? 2 : 3,
    transition: age === 11 ? "monbg-load"
      : age === 220 ? "clear-task"
        : age === 222 ? "monbg-restore" : "none",
  };
}

function audioAtAge(age: number, side: SoftBoiledSide): SoftBoiledState["audio"] {
  const pan = side === "player" ? -64 : 63;
  const tailWhip: SoftBoiledAudioEvent = {
    age: 13, channel: "SE2", sound: "se_m_tail_whip", panX: [pan, 0, 0, 0],
  };
  const horn: SoftBoiledAudioEvent = {
    age: 144, channel: "SE1", sound: "se_m_horn_attack", panX: [pan, pan, 0, pan],
  };
  const absorb: SoftBoiledAudioEvent = {
    age: 218, channel: "SE1", sound: "se_m_absorb_2", panX: [pan, pan, 0, pan],
  };
  const events = [
    ...(age === 13 ? [tailWhip] : []),
    ...(age === 144 ? [horn] : []),
    ...(age === 218 ? [absorb] : []),
  ];
  return {
    events,
    se1: age < 144 ? { sound: null, panX: [] }
      : age < 218 ? { sound: horn.sound, panX: horn.panX }
        : { sound: absorb.sound, panX: absorb.panX },
    se2: age < 13 ? { sound: null, panX: [] }
      : { sound: tailWhip.sound, panX: tailWhip.panX },
  };
}

function resourcesAtAge(age: number): SoftBoiledState["resources"] {
  const breakingEgg = age >= 1 && age <= 270;
  const thinRing = age >= 4 && age <= 270;
  const blueStar = age >= 7 && age <= 270;
  const tags = [
    ...(breakingEgg ? [10202] : []),
    ...(thinRing ? [10203] : []),
    ...(blueStar ? [10031] : []),
  ];
  return {
    paletteTags: tags,
    tileTags: tags,
    loaded: { breakingEgg, thinRing, blueStar },
  };
}

function visualTaskCountAtAge(age: number): number {
  if (age <= 12) return 0;
  if (age <= 22) return 3;
  if (age <= 143) return 2;
  if (age <= 153) return 4;
  if (age <= 174) return 5;
  if (age <= 184) return 3;
  if (age <= 216) return 2;
  if (age === 217) return 0;
  if (age <= 228) return 1;
  if (age <= 237) return 2;
  if (age <= 240) return 3;
  if (age <= 246) return 2;
  if (age <= 249) return 3;
  if (age <= 258) return 2;
  if (age <= 267) return 1;
  return 0;
}

/** Reduce one retained Scene-ON row of MOVE_SOFT_BOILED. */
export function softBoiledAtAge(
  age: number,
  side: SoftBoiledSide,
  geometry: Readonly<SoftBoiledGeometry>,
): SoftBoiledState {
  const sprites: SoftBoiledSprite[] = [];
  for (const slot of [3, 4] as const) {
    const sprite = eggAtAge(age, slot, side, geometry.attackerCenter);
    if (sprite) sprites.push(sprite);
  }
  for (const [start, slot] of [[144, 7], [154, 9]] as const) {
    const sprite = ringAtAge(age, start, slot, side, geometry.attackerCenter);
    if (sprite) sprites.push(sprite);
  }
  for (let index = 0; index < SOFT_BOILED_STAR_STARTS.length; index += 1) {
    const sprite = starAtAge(age, index, side, geometry.targetCenter);
    if (sprite) sprites.push(sprite);
  }

  const bgX = side === "player" ? -40 : -144;
  const bgY = side === "player" ? -59 : -17;
  const shaken = age >= 15 && age <= 20 && (age - 15) % 4 < 2;
  const shakeY = shaken ? bgY - 2 : bgY;
  const bgActive = age >= 10 && age <= 220;
  const bgXValue = bgActive ? bgX : 0;
  const bgYValue = bgActive ? shakeY : 0;
  const hofs = age >= 11 && age <= 221 ? (512 + bgX) & 0x1ff : 0;
  const registerShaken = age >= 16 && age <= 21 && (age - 16) % 4 < 2;
  const vofs = age >= 11 && age <= 221
    ? (512 + (registerShaken ? bgY - 2 : bgY)) & 0x1ff
    : 0;
  const alpha = bldalphaAtAge(age);
  const layer = side === "player" ? 2 : 1;
  const registers = {
    bg1hofs: layer === 1 ? hofs : 0,
    bg1vofs: layer === 1 ? vofs : 0,
    bg2hofs: layer === 2 ? hofs : 0,
    bg2vofs: layer === 2 ? vofs : 0,
    bldcnt: age >= 150 && age <= 216 ? 16192 : 0,
    bldalpha: alpha.value,
    bldy: 0 as const,
  };
  const battleBg = {
    gBattle_BG1_X: layer === 1 ? bgXValue : 0,
    gBattle_BG1_Y: layer === 1 ? bgYValue : 0,
    gBattle_BG2_X: layer === 2 ? bgXValue : 0,
    gBattle_BG2_Y: layer === 2 ? bgYValue : 0,
  };
  const resources = resourcesAtAge(age);
  const active = age < SOFT_BOILED_FIRST_INACTIVE_AGE;
  return {
    age,
    active,
    source: sourceAtAge(age),
    sprites,
    sourceOrder: ownedSourceOrder(age),
    tasks: tasksAtAge(age, side, geometry.battlePositionCenter),
    registers,
    battleBg,
    bgVram: bgVramAtAge(age),
    palette: {
      color: { r: 12, g: 24, b: 30 },
      bldcnt: registers.bldcnt,
      eva: alpha.eva,
      evb: alpha.evb,
      transfer: age === 144 ? "mixed-bg-current-obj-preceding" : "none",
      hardwareLatch: age === 0 ? "initial"
        : age === 144 ? "mixed-bg-current-obj-preceding" : "preceding-faded",
    },
    audio: audioAtAge(age, side),
    resources,
    rng: {
      gameplayStable: true,
      animationAdvances: age > 0 && age !== 220 && age !== 221,
      animationHeldByAudioWorkload: age === 220 || age === 221,
    },
    visualTaskCount: visualTaskCountAtAge(age),
    soundTaskCount: 0,
    cleanup: {
      firstInactive: age === SOFT_BOILED_FIRST_INACTIVE_AGE,
      ownedSprites: sprites.length,
      ownedTasks: age === SOFT_BOILED_FIRST_INACTIVE_AGE ? 0 : 0,
      moveTags: age === SOFT_BOILED_FIRST_INACTIVE_AGE ? [] : resources.tileTags,
    },
  };
}
