import {
  thunderPunchLightningFrameAtLocalAge,
} from "./thunderPunch.ts";

export type ThunderSide = "player" | "opponent";

export const THUNDER_SOURCE_FRAME_COUNT = 262;
export const THUNDER_ACTIVE_FRAME_COUNT = 261;
export const THUNDER_CLEANUP_AGE = 261;

/** Source-relative script pointer offsets, including the first inactive cleanup. */
export const THUNDER_SOURCE_OFFSET_RANGES = [
  [0, 0, 0],
  [1, 3, 3],
  [4, 22, 5],
  [23, 41, 21],
  [42, 59, 41],
  [60, 62, 60],
  [63, 65, 73],
  [66, 68, 86],
  [69, 90, 99],
  [91, 93, 116],
  [94, 96, 129],
  [97, 103, 146],
  [104, 106, 161],
  [107, 109, 174],
  [110, 112, 187],
  [113, 144, 200],
  [145, 151, 215],
  [152, 154, 230],
  [155, 157, 247],
  [158, 160, 260],
  [161, 172, 273],
  [173, 175, 288],
  [176, 179, 305],
  [180, 182, 320],
  [183, 221, 337],
  [222, 240, 339],
  [241, 260, 344],
  [261, 261, 345],
] as const;

/** The twelve createsprite commands in Move_THUNDER source order. */
export const THUNDER_LIGHTNING_CREATION_AGES = [
  63, 66, 69,
  91, 94, 97,
  107, 110, 113,
  155, 158, 161,
] as const;
export const THUNDER_LIGHTNING_SLOTS = [
  4, 5, 7,
  3, 4, 5,
  7, 9, 10,
  3, 4, 5,
] as const;
export const THUNDER_LIGHTNING_X_OFFSETS = [
  16, 16, 16,
  -16, -16, -16,
  24, 24, 24,
  0, 0, 0,
] as const;
export const THUNDER_LIGHTNING_Y_OFFSETS = [
  -36, -20, 12,
  -32, -16, 16,
  -32, -16, 16,
  -32, -16, 16,
] as const;
export const THUNDER_LIGHTNING_SOURCE_SUBPRIORITY_OFFSETS = [
  2, 2, 2,
  6, 6, 6,
  2, 2, 2,
  2, 2, 2,
] as const;

const THUNDER_LIGHTNING_DISPLAY_TICKS = 28;
const THUNDER_SHAKE_PATTERN_0 = [-1, -1, 0, 1, 1, 0, 0, -1, -1, 1] as const;

export type ThunderTaskFunction =
  | "Task_FadeToBg"
  | "AnimTask_UpdateSlidingBg"
  | "AnimTask_ShakeTargetInPattern";

export interface ThunderTask {
  readonly slot: 0 | 2;
  readonly function: ThunderTaskFunction;
  readonly data: readonly number[];
}

export interface ThunderFadeState {
  readonly cycle: "enter" | "restore";
  readonly phase: 1 | 2 | 3;
  /** The source Task_FadeToBg display value mirrored by REG_BLDY. */
  readonly blendY: number;
}

export interface ThunderSlidingBgState {
  readonly direction: -1 | 1;
  readonly taskActive: boolean;
  readonly softwareX: number;
  /** Hardware BG3HOFS is one display behind the source software accumulator. */
  readonly hardwareX: number;
  readonly softwareY: 0;
  readonly taskData: readonly [-1 | 1, -256 | 256, 0, -1];
}

export interface ThunderLightningSprite {
  readonly kind: "lightning";
  readonly sourceOrder: number;
  readonly slot: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  /** The `createsprite` source subpriority offset, not hardware OAM priority. */
  readonly sourceSubpriorityOffset: 2 | 6;
  readonly subpriority: number;
  readonly tileFrame: 0 | 1 | 2 | 3 | 4;
  readonly tileOffset: 0 | 16 | 32 | 48 | 64;
  readonly attr2: number;
  /** Hardware sprite allocation order for this display. */
  readonly drawOrder: number;
}

export interface ThunderShakeState {
  readonly slot: 0;
  readonly counter: number;
  readonly sourceArgs: readonly [30, 3, true, 0];
  /** The source task rereads gBattleAnimArgs[1], which changes during cleanup. */
  readonly runtimeOffset: 3 | 257 | 2;
  readonly targetOffset: Readonly<{ x2: 0; y2: number }>;
}

export interface ThunderState {
  readonly active: boolean;
  readonly clean: boolean;
  readonly sourceOffset: number;
  readonly framesToWait: number;
  readonly assets: Readonly<{
    readonly lightning: boolean;
    readonly background: boolean;
  }>;
  readonly background: null | Readonly<{
    readonly image: "gBattleAnimBgImage_Thunder";
    readonly palette: "gBattleAnimBgPalette_Thunder";
    readonly tilemap: "gBattleAnimBgTilemap_Thunder";
    readonly fade: ThunderFadeState | null;
    readonly restored: boolean;
    readonly sliding: ThunderSlidingBgState | null;
  }>;
  readonly palette: Readonly<{
    readonly blend: "toBlack" | "fromBlack" | null;
    readonly blendY: number;
    readonly invertPhase: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    readonly inverted: boolean;
  }>;
  readonly tasks: readonly ThunderTask[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly sprites: readonly ThunderLightningSprite[];
  readonly targetOffset: Readonly<{ x2: 0; y2: number }>;
  readonly shakeTask: ThunderShakeState | null;
  readonly soundRestart: "SE_M_THUNDER_WAVE" | "SE_M_TRI_ATTACK2" | null;
  readonly soundPan: -63 | 63 | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function thunderSourceOffsetAtAge(age: number): number {
  if (age < 0) return 0;
  for (const [start, end, offset] of THUNDER_SOURCE_OFFSET_RANGES) {
    if (age >= start && age <= end) return offset;
  }
  return THUNDER_SOURCE_OFFSET_RANGES.at(-1)![2];
}

/** Source display wait, including the one-display handoff at every command. */
export function thunderFramesToWaitAtAge(age: number): number {
  if (age < 0 || age > THUNDER_CLEANUP_AGE) return 0;
  if (age === 0) return 0;
  if (age === 1) return 1;
  if (age <= 3) return 0;
  if (age <= 41) return 1;
  if (age <= 59) return Math.max(0, 16 - (age - 42));
  if (age === 60) return 1;
  if (age <= 62) return 0;
  if (age === 63) return 1;
  if (age <= 65) return 0;
  if (age === 66) return 1;
  if (age <= 68) return 0;
  if (age <= 90) return Math.max(0, 20 - (age - 69));
  if (age === 91) return 1;
  if (age <= 93) return 0;
  if (age === 94) return 1;
  if (age <= 96) return 0;
  if (age <= 101) return 5 - (age - 97);
  if (age <= 103) return 0;
  if (age === 104 || age === 107 || age === 110) return 1;
  if (age <= 106 || age <= 109 || age <= 112) return 0;
  if (age <= 142) return 30 - (age - 113);
  if (age <= 144) return 0;
  if (age <= 149) return 5 - (age - 145);
  if (age <= 151) return 0;
  if (age === 152 || age === 155 || age === 158) return 1;
  if (age <= 154 || age <= 157 || age <= 160) return 0;
  if (age <= 170) return 10 - (age - 161);
  if (age <= 172) return 0;
  if (age === 173 || age === 176 || age === 180) return age === 176 ? 2 : 1;
  if (age <= 175 || age <= 179 || age <= 182) return age === 177 ? 1 : 0;
  if (age <= 260) return 1;
  return 0;
}

function fadeAtAge(age: number): ThunderFadeState | null {
  if (age >= 4 && age <= 21) {
    return { cycle: "enter", phase: 1, blendY: clamp(age - 5, 0, 16) };
  }
  if (age === 22) {
    return { cycle: "enter", phase: 2, blendY: 16 };
  }
  if (age >= 23 && age <= 40) {
    return { cycle: "enter", phase: 3, blendY: clamp(17 - (age - 23), 0, 16) };
  }
  if (age >= 222 && age <= 239) {
    return { cycle: "restore", phase: 1, blendY: clamp(age - 223, 0, 16) };
  }
  if (age >= 240 && age <= 241) {
    return { cycle: "restore", phase: 2, blendY: 16 };
  }
  if (age >= 242 && age <= 243) {
    return { cycle: "restore", phase: 3, blendY: 16 };
  }
  if (age >= 244 && age <= 259) {
    return { cycle: "restore", phase: 3, blendY: 259 - age };
  }
  return null;
}

function invertPhaseAtAge(age: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  if (age < 60) return 0;
  if (age < 104) return 1;
  if (age < 145) return 2;
  if (age < 152) return 3;
  if (age < 173) return 4;
  if (age < 180) return 5;
  return 6;
}

function paletteAtAge(age: number): ThunderState["palette"] {
  const blend = age >= 42 && age <= 79 ? "toBlack"
    : age >= 183 && age <= 220 ? "fromBlack" : null;
  const blendY = blend === "toBlack"
    ? Math.min(16, Math.floor((age - 41) / 4) * 2)
    : blend === "fromBlack"
      ? Math.max(0, 16 - Math.floor((age - 180) / 4) * 2)
      : 0;
  const invertPhase = invertPhaseAtAge(age);
  return {
    blend,
    blendY,
    invertPhase,
    inverted: invertPhase % 2 === 1,
  };
}

function slidingAtAge(
  age: number,
  targetSide: ThunderSide,
): ThunderSlidingBgState | null {
  if (age < 23 || age > 241) return null;
  const direction: -1 | 1 = targetSide === "opponent" ? -1 : 1;
  const taskDirection: -256 | 256 = direction === -1 ? -256 : 256;
  const taskActive = age <= 240;
  const softwareX = taskActive ? direction * (age - 22) : 0;
  const hardwareSourceX = direction * (age - 22);
  const hardwareX = (hardwareSourceX + (direction === -1 ? 1 : -1) + 512) % 512;
  return {
    direction,
    taskActive,
    softwareX,
    hardwareX,
    softwareY: 0,
    taskData: [1, taskDirection, 0, -1],
  };
}

function taskAtAge(
  age: number,
  targetSide: ThunderSide,
  fade: ThunderFadeState | null,
): ThunderTask[] {
  const tasks: ThunderTask[] = [];
  if (fade !== null) {
    const data = Array<number>(16).fill(0);
    data[0] = fade.cycle === "enter" ? 11 : -1;
    data[10] = fade.phase;
    tasks.push({ slot: 0, function: "Task_FadeToBg", data });
  }
  if (age >= 176 && age <= 203) {
    const data = Array<number>(16).fill(0);
    data[0] = age - 174;
    data[1] = 30;
    data[2] = 3;
    data[3] = 1;
    data[4] = 0;
    tasks.push({
      slot: 0,
      function: "AnimTask_ShakeTargetInPattern",
      data,
    });
  }
  const sliding = slidingAtAge(age, targetSide);
  if (sliding !== null && sliding.taskActive) {
    const data = Array<number>(16).fill(0);
    data[0] = sliding.taskData[0];
    data[1] = sliding.taskData[1];
    data[2] = sliding.taskData[2];
    data[3] = sliding.taskData[3];
    tasks.push({
      slot: 2,
      function: "AnimTask_UpdateSlidingBg",
      data,
    });
  }
  return tasks;
}

function shakeAtAge(age: number): ThunderShakeState | null {
  if (age < 176 || age > 203) return null;
  const counter = age - 174;
  const runtimeOffset: 3 | 257 | 2 = counter <= 6 ? 3
    : counter <= 8 ? 257 : 2;
  const direction = THUNDER_SHAKE_PATTERN_0[counter % 10]!;
  return {
    slot: 0,
    counter,
    sourceArgs: [30, 3, true, 0],
    runtimeOffset,
    targetOffset: { x2: 0, y2: Math.abs(runtimeOffset * direction) },
  };
}

function lightningAtAge(
  age: number,
  targetSide: ThunderSide,
  targetEffectCenter: Readonly<{ x: number; y: number }>,
): readonly ThunderLightningSprite[] {
  const mirror = targetSide === "player" ? -1 : 1;
  const sprites = THUNDER_LIGHTNING_CREATION_AGES.flatMap((creationAge, sourceOrder) => {
    const localAge = age - creationAge;
    if (localAge < 0 || localAge >= THUNDER_LIGHTNING_DISPLAY_TICKS) return [];
    const tileFrame = thunderPunchLightningFrameAtLocalAge(localAge);
    const groupTwo = sourceOrder >= 3 && sourceOrder <= 5;
    const subpriority = targetSide === "player"
      ? groupTwo ? 24 : 28
      : groupTwo ? 34 : 38;
    return [{
      kind: "lightning" as const,
      sourceOrder,
      slot: THUNDER_LIGHTNING_SLOTS[sourceOrder]!,
      localAge,
      x: targetEffectCenter.x + mirror * THUNDER_LIGHTNING_X_OFFSETS[sourceOrder]!,
      y: targetEffectCenter.y + THUNDER_LIGHTNING_Y_OFFSETS[sourceOrder]!,
      x2: 0 as const,
      y2: 0 as const,
      sourceSubpriorityOffset:
        THUNDER_LIGHTNING_SOURCE_SUBPRIORITY_OFFSETS[sourceOrder]!,
      subpriority,
      tileFrame,
      tileOffset: (tileFrame * 16) as 0 | 16 | 32 | 48 | 64,
      attr2: 31257 + tileFrame * 16,
      drawOrder: 0,
    }];
  });
  return [...sprites]
    .sort((left, right) => left.slot - right.slot)
    .map((sprite, drawOrder) => ({ ...sprite, drawOrder }));
}

function soundAtAge(
  age: number,
  targetSide: ThunderSide,
): Pick<ThunderState, "soundRestart" | "soundPan"> {
  const soundRestart = age === 60 || age === 91 || age === 97
    ? "SE_M_THUNDER_WAVE"
    : age === 155 ? "SE_M_TRI_ATTACK2" : null;
  return {
    soundRestart,
    soundPan: soundRestart === null ? null : targetSide === "opponent" ? 63 : -63,
  };
}

/**
 * Pure source-relative reducer for the complete staged Move_THUNDER body.
 *
 * Age zero is the first display in the bounded source window. The player-back
 * and opponent-front captures begin four emulator frames apart, but their
 * source-relative state is identical after target-side geometry is supplied.
 */
export function thunderAtAge(
  age: number,
  targetSide: ThunderSide,
  targetEffectCenter: Readonly<{ x: number; y: number }>,
): ThunderState {
  const active = age >= 0 && age < THUNDER_CLEANUP_AGE;
  const clean = age >= THUNDER_CLEANUP_AGE;
  const fade = fadeAtAge(age);
  const sliding = slidingAtAge(age, targetSide);
  const shakeTask = shakeAtAge(age);
  const sprites = lightningAtAge(age, targetSide, targetEffectCenter);
  const tasks = taskAtAge(age, targetSide, fade);
  const palette = paletteAtAge(age);
  const targetOffset = shakeTask?.targetOffset ?? { x2: 0, y2: 0 };
  const sound = soundAtAge(age, targetSide);
  return {
    active,
    clean,
    sourceOffset: thunderSourceOffsetAtAge(age),
    framesToWait: thunderFramesToWaitAtAge(age),
    assets: {
      lightning: age >= 0 && age < THUNDER_CLEANUP_AGE,
      background: age >= 0 && age < THUNDER_CLEANUP_AGE,
    },
    background: age < 0 || clean ? null : {
      image: "gBattleAnimBgImage_Thunder",
      palette: "gBattleAnimBgPalette_Thunder",
      tilemap: "gBattleAnimBgTilemap_Thunder",
      fade,
      restored: age >= 242,
      sliding,
    },
    palette,
    tasks,
    visualTaskCount: sprites.length
      + Number(palette.blend !== null)
      + Number(shakeTask !== null),
    soundTaskCount: 0,
    sprites,
    targetOffset,
    shakeTask,
    ...sound,
  };
}
