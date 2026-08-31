/**
 * Source-relative MOVE_TRICK presentation reducer.
 *
 * This is a port of the visual body only: Move_TRICK's two circular Item Bag
 * sprites and its paired Stretch/Shake tasks.  Item exchange, damage, status,
 * battle RNG, controller state, and turn progression remain outside this
 * module.  The source cursor is relative to Move_TRICK, not an app tick.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type TrickOrientation = "player-back" | "opponent-front";
export type TrickBattler = "attacker" | "target";

export const TRICK_SOURCE_START = 0x082d_486e;
export const TRICK_SOURCE_END_EXCLUSIVE = 0x082d_48ec;
export const TRICK_FIRST_BAG_AGE = 7;
export const TRICK_FIRST_INACTIVE_AGE = 224;
export const TRICK_ITEM_BAG_TAG = 10224;
export const TRICK_SPEED_DUST_TAG = 10207;

const TRICK_BAG_WAVES = [80, 208] as const;
const TRICK_BAG_COORDINATES = [
  [5, 24, 1], [0, 4, 0], [8, 16, -1], [0, 2, 0], [8, 16, 1],
  [0, 2, 0], [8, 16, 1], [0, 2, 0], [8, 16, 1], [0, 16, 0],
  [0, 0, 127],
] as const;

// gTrickBagAffineAnimCmds2 after StartSpriteAffineAnim(sprite, 1).  These
// source-RAM values are derived from the seven literal 3-frame scale commands,
// including the two identity terminal callbacks before Step2 takes ownership.
const TRICK_BAG_SQUEEZE_Y_SCALES = [
  266, 277, 289, 297, 306, 315, 318, 321, 324, 324, 324,
  324, 321, 318, 315, 306, 297, 289, 277, 266, 256, 256,
] as const;

interface ScriptPhase {
  readonly start: number;
  readonly end: number;
  readonly offset: number;
  readonly wait: (age: number) => number;
  readonly command: TrickSourceCursor["command"];
}

const delay = (start: number, count: number) => (age: number): number =>
  Math.max(0, count - (age - start));

const SCRIPT_PHASES: readonly ScriptPhase[] = [
  { start: 0, end: 0, offset: 0, wait: () => 0, command: "load_item_bag" },
  { start: 1, end: 3, offset: 3, wait: (age) => age === 1 ? 1 : 0, command: "load_speed_dust" },
  { start: 4, end: 6, offset: 6, wait: (age) => age === 4 ? 1 : 0, command: "create_trick_bags" },
  { start: 7, end: 24, offset: 30, wait: delay(7, 16), command: "delay" },
  { start: 25, end: 56, offset: 50, wait: delay(25, 30), command: "stretch_and_sketch" },
  { start: 57, end: 82, offset: 56, wait: delay(57, 24), command: "double_team" },
  { start: 83, end: 100, offset: 62, wait: delay(83, 16), command: "double_team" },
  { start: 101, end: 118, offset: 68, wait: delay(101, 16), command: "double_team" },
  { start: 119, end: 136, offset: 74, wait: delay(119, 16), command: "double_team" },
  { start: 137, end: 154, offset: 80, wait: delay(137, 16), command: "double_team" },
  { start: 155, end: 172, offset: 86, wait: delay(155, 16), command: "double_team" },
  { start: 173, end: 199, offset: 124, wait: () => 1, command: "attract_and_shake" },
  { start: 200, end: TRICK_FIRST_INACTIVE_AGE, offset: 125, wait: () => 1, command: "end" },
] as const;

export interface TrickAnimationProfile {
  /** Live allocator results, never a carrier/species selector. */
  readonly bagSlots: readonly [number, number];
  readonly attacker: Readonly<{
    readonly spriteSlot: number;
    readonly stretchTaskSlot: number;
    readonly shakeTaskSlot: number;
  }>;
  readonly target: Readonly<{
    readonly spriteSlot: number;
    readonly stretchTaskSlot: number;
    readonly shakeTaskSlot: number;
  }>;
  readonly orientation: TrickOrientation;
  /** Caller-owned battle state is retained, never used to branch the body. */
  readonly gameplayRng: number;
  readonly immutableGameplayState?: unknown;
}

export interface TrickSourceCursor {
  readonly active: boolean;
  readonly offset: number | null;
  readonly pointer: number | null;
  readonly pointerParity: 0 | 1 | null;
  readonly wait: number;
  readonly command:
    | "load_item_bag"
    | "load_speed_dust"
    | "create_trick_bags"
    | "delay"
    | "stretch_and_sketch"
    | "double_team"
    | "attract_and_shake"
    | "end"
    | null;
}

export interface TrickBagSprite {
  readonly kind: "bag";
  readonly index: 0 | 1;
  readonly slot: number;
  readonly template: "gTrickBagSpriteTemplate";
  readonly callback: "AnimTrickBag_Step1" | "AnimTrickBag_Step2" | "AnimTrickBag_Step3";
  readonly phase: "rise" | "squeeze" | "orbit" | "blink";
  readonly x: 120;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: 29 | 31;
  readonly invisible: boolean;
  readonly affine: Readonly<{
    readonly stage: 0 | 1;
    readonly matrix: readonly [number, number, number, number];
  }>;
  /** Exact C data[0..7] after this row's sprite callback. */
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface TrickStretchTask {
  readonly kind: "stretch";
  readonly battler: TrickBattler;
  readonly slot: number;
  readonly spriteSlot: number;
  readonly callback: "AnimTask_StretchTargetUp" | "AnimTask_StretchAttackerUp";
  readonly localAge: number;
  readonly x2: -4 | 4;
  readonly sourceMatrix: readonly [number, number, number, number];
  /** The fresh live-battler affine matrix is independently observed at RAM+2. */
  readonly matrixDisplayLag: 2;
}

export interface TrickShakeTask {
  readonly kind: "shake";
  readonly battler: TrickBattler;
  readonly slot: number;
  readonly spriteSlot: number;
  readonly callback: "AnimTask_ShakeMon_Step";
  readonly localAge: number;
  readonly x2: 0 | 5;
  /** Exact source task data[0..5]; the remaining task words are zero. */
  readonly data: readonly [number, number, 2, number, 5, 0];
  /** This own literal is measured independently at the ordinary RAM+1 handoff. */
  readonly displayLag: 1;
}

export type TrickTask = TrickStretchTask | TrickShakeTask;

export interface TrickAudioEvent {
  readonly age: number;
  readonly channel: "SE1";
  readonly song: "se_m_sketch" | "se_m_double_team" | "se_m_attract";
  readonly pan: 0;
}

export interface TrickFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: TrickSourceCursor;
  readonly sprites: readonly TrickBagSprite[];
  readonly tasks: readonly TrickTask[];
  readonly audio: readonly TrickAudioEvent[];
  readonly visualTaskCount: number;
  readonly resources: Readonly<{
    readonly itemBag: Readonly<{ readonly tag: 10224; readonly loaded: boolean; readonly usedByBags: boolean }>;
    /** Trick loads this resource but has no gSpeedDustSpriteTemplate user. */
    readonly speedDust: Readonly<{ readonly tag: 10207; readonly loaded: boolean; readonly used: false }>;
  }>;
  readonly gameplay: Readonly<{
    readonly rng: number;
    readonly immutableState: unknown;
    readonly changed: false;
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly bags: number;
    readonly tasks: number;
    readonly resourcesFreed: boolean;
  }>;
}

function assertProfile(profile: Readonly<TrickAnimationProfile>): void {
  const values = [
    ...profile.bagSlots,
    profile.attacker.spriteSlot,
    profile.target.spriteSlot,
    profile.attacker.stretchTaskSlot,
    profile.target.stretchTaskSlot,
    profile.attacker.shakeTaskSlot,
    profile.target.shakeTaskSlot,
  ];
  if (profile.orientation !== "player-back" && profile.orientation !== "opponent-front"
    || profile.bagSlots[0] === profile.bagSlots[1]
    || values.some((value) => !Number.isInteger(value) || value < 0 || value >= 64)) {
    throw new Error("invalid Trick animation profile");
  }
}

function sine(angle: number, amplitude: number): number {
  return Math.floor((GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) / 256);
}

function cosine(angle: number, amplitude: number): number {
  return sine(angle + 64, amplitude);
}

function sourceAtAge(age: number): TrickSourceCursor {
  const phase = SCRIPT_PHASES.find((entry) => age >= entry.start && age <= entry.end);
  if (!phase) {
    return { active: false, offset: null, pointer: null, pointerParity: null, wait: 0, command: null };
  }
  const pointer = TRICK_SOURCE_START + phase.offset;
  return {
    active: age < TRICK_FIRST_INACTIVE_AGE,
    offset: phase.offset,
    pointer,
    pointerParity: (pointer & 1) as 0 | 1,
    wait: phase.wait(age),
    command: phase.command,
  };
}

function subpriorityForAngle(angle: number): 29 | 31 {
  return angle > 0 && angle < 192 ? 31 : 29;
}

function bagAtAge(
  age: number,
  index: 0 | 1,
  slot: number,
): TrickBagSprite | null {
  if (age < TRICK_FIRST_BAG_AGE || age > 198) return null;
  const initialAngle = TRICK_BAG_WAVES[index];
  let data0 = 0;
  let angle: number = initialAngle;
  let data2 = -40;
  let data3 = 0;
  let data4 = 20;
  let x2 = cosine(angle, 60);
  let y2 = sine(angle, 20);
  let subpriority = subpriorityForAngle(angle);
  let y = -40;
  let phase: TrickBagSprite["phase"] = "rise";
  let callback: TrickBagSprite["callback"] = "AnimTrickBag_Step1";
  let invisible = false;
  let affineStage: 0 | 1 = 0;
  let affineY = 256;

  // AnimTrickBag_Step1: the setup callback itself happens before the first
  // retained sprite row, so source age 7 is the first rising callback.
  for (let callbackAge = TRICK_FIRST_BAG_AGE; callbackAge <= Math.min(age, 30); callbackAge += 1) {
    data2 += Math.floor(data4 / 10);
    data4 += 3;
    y = data2;
  }
  if (age >= 31) {
    phase = "squeeze";
    data3 = 1;
    data2 = 80;
    data4 = 92;
    y = 80;
    affineStage = 1;
    affineY = TRICK_BAG_SQUEEZE_Y_SCALES[Math.min(age - 31, TRICK_BAG_SQUEEZE_Y_SCALES.length - 1)]!;
  }
  if (age >= 53) {
    // The final affine-complete callback switches to Step2 but does not run
    // Step2 until the following source row.
    phase = "orbit";
    callback = "AnimTrickBag_Step2";
    affineStage = 0;
    affineY = 256;
    data0 = 0;
    data2 = 0;
    for (let callbackAge = 54; callbackAge <= Math.min(age, 178); callbackAge += 1) {
      const [angleStep, duration, direction] = TRICK_BAG_COORDINATES[data0]!;
      if (data2 === duration) {
        if (direction === 127) {
          data0 = 0;
          phase = "blink";
          callback = "AnimTrickBag_Step3";
        }
        data2 = 0;
        data0 += 1;
      } else {
        data2 += 1;
        angle = (angle + angleStep * direction) & 0xff;
        x2 = cosine(angle, 60);
        y2 = sine(angle, 20);
        subpriority = subpriorityForAngle(angle);
      }
    }
  }
  if (age >= 179) {
    phase = "blink";
    callback = "AnimTrickBag_Step3";
    // At age 178 Step2 transitions into Step3 with data[0] == 1.  The blink
    // callback then writes invisible=data[0] % 2 and increments it each row.
    data0 = age - 177;
    invisible = (age - 178) % 2 === 1;
  }
  return {
    kind: "bag", index, slot, template: "gTrickBagSpriteTemplate", callback, phase,
    x: 120, y, x2, y2, subpriority, invisible,
    affine: { stage: affineStage, matrix: [256, 0, 0, affineY] },
    data: [data0, angle, data2, data3, data4, 0, 0, 0],
  };
}

function stretchAtAge(
  age: number,
  battler: TrickBattler,
  profile: Readonly<TrickAnimationProfile>,
): TrickStretchTask | null {
  if (age < 25 || age > 44) return null;
  const localAge = age - 25;
  const config = profile[battler];
  const firstLeg = localAge <= 9;
  const firstLegStep = localAge;
  const secondLegStep = localAge - 9;
  const xScale = firstLeg ? 266 + 10 * firstLegStep : 356 - 10 * secondLegStep;
  const yScale = firstLeg ? 243 - 13 * firstLegStep : 126 + 13 * secondLegStep;
  return {
    kind: "stretch", battler, slot: config.stretchTaskSlot, spriteSlot: config.spriteSlot,
    callback: battler === "target" ? "AnimTask_StretchTargetUp" : "AnimTask_StretchAttackerUp",
    localAge, x2: localAge % 2 === 0 ? -4 : 4,
    sourceMatrix: [xScale, 0, 0, yScale], matrixDisplayLag: 2,
  };
}

function shakeAtAge(
  age: number,
  battler: TrickBattler,
  profile: Readonly<TrickAnimationProfile>,
): TrickShakeTask | null {
  if (age < 173 || age > 191) return null;
  const localAge = age - 173;
  const config = profile[battler];
  if (localAge === 0) {
    return {
      kind: "shake", battler, slot: config.shakeTaskSlot, spriteSlot: config.spriteSlot,
      callback: "AnimTask_ShakeMon_Step", localAge, x2: 5,
      data: [config.spriteSlot, 7, 2, 0, 5, 0], displayLag: 1,
    };
  }
  const phase = Math.floor((localAge - 1) / 3);
  const delay = 2 - ((localAge - 1) % 3);
  return {
    kind: "shake", battler, slot: config.shakeTaskSlot, spriteSlot: config.spriteSlot,
    callback: "AnimTask_ShakeMon_Step", localAge, x2: phase % 2 === 0 ? 0 : 5,
    data: [config.spriteSlot, 6 - phase, 2, delay, 5, 0], displayLag: 1,
  };
}

function audioAtAge(age: number): readonly TrickAudioEvent[] {
  if (age === 25) return [{ age, channel: "SE1", song: "se_m_sketch", pan: 0 }];
  if ([57, 83, 101, 119, 137, 155].includes(age)) {
    return [{ age, channel: "SE1", song: "se_m_double_team", pan: 0 }];
  }
  if (age === 173) return [{ age, channel: "SE1", song: "se_m_attract", pan: 0 }];
  return [];
}

/**
 * Pure port of Move_TRICK. `age=0` is its pointer-owned loadspritegfx row,
 * and age 224 is the retained first-inactive cleanup row.
 */
export function trickAtAge(age: number, profile: Readonly<TrickAnimationProfile>): TrickFrame {
  assertProfile(profile);
  const source = sourceAtAge(age);
  const sprites = ([0, 1] as const).flatMap((index) => {
    const bag = bagAtAge(age, index, profile.bagSlots[index]);
    return bag ? [bag] : [];
  });
  const stretches = (["target", "attacker"] as const).flatMap((battler) => {
    const task = stretchAtAge(age, battler, profile);
    return task ? [task] : [];
  });
  const shakes = (["attacker", "target"] as const).flatMap((battler) => {
    const task = shakeAtAge(age, battler, profile);
    return task ? [task] : [];
  });
  const tasks = [...stretches, ...shakes];
  const itemBagLoaded = age >= 1 && age < TRICK_FIRST_INACTIVE_AGE;
  const speedDustLoaded = age >= 4 && age < TRICK_FIRST_INACTIVE_AGE;
  return {
    age,
    active: age >= 0 && age <= TRICK_FIRST_INACTIVE_AGE,
    source,
    sprites,
    tasks,
    audio: audioAtAge(age),
    visualTaskCount: sprites.length + stretches.length + shakes.length,
    resources: {
      itemBag: { tag: TRICK_ITEM_BAG_TAG, loaded: itemBagLoaded, usedByBags: sprites.length > 0 },
      speedDust: { tag: TRICK_SPEED_DUST_TAG, loaded: speedDustLoaded, used: false },
    },
    gameplay: { rng: profile.gameplayRng, immutableState: profile.immutableGameplayState, changed: false },
    cleanup: {
      firstInactive: age === TRICK_FIRST_INACTIVE_AGE,
      bags: sprites.length,
      tasks: tasks.length,
      resourcesFreed: age >= TRICK_FIRST_INACTIVE_AGE,
    },
  };
}
