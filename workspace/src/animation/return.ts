/**
 * Source-relative Scene-ON reducer for MOVE_RETURN.
 *
 * Return's animation is selected solely by the source friendship task:
 * weak (0..60), medium (61..91), strong (92..200), and strongest (201..255).
 * The caller owns the live battler art, allocations, palette/buffer state,
 * presentation RNG, and all gameplay state.  This module only interprets
 * Move_RETURN's source command schedule relative to its own age.
 */

import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";

export type ReturnSide = "player" | "opponent";
export type ReturnBranch = "weak" | "medium" | "strong" | "strongest";
export type ReturnMatrix = readonly [number, number, number, number];
export type ReturnOam = readonly [number, number, number];

export interface ReturnPoint {
  readonly x: number;
  readonly y: number;
}

/** Current battler OAM/art identity supplied by the presentation scene. */
export interface ReturnBattlerArt {
  readonly displaySpecies: string;
  readonly slot: number;
  readonly attr: ReturnOam;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: ReturnMatrix;
}

/** A live allocation made for one source `create_basic_hitsplat_sprite`. */
export interface ReturnImpactAllocation {
  readonly slot: number;
  readonly matrixNum: number;
  readonly attr: ReturnOam;
  readonly subpriority: number;
  readonly sourceCreationOrder: number;
}

/** A live clone slot selected by `AnimTask_TraceMonBlended`. */
export interface ReturnTraceAllocation {
  readonly slot: number;
  readonly sourceCreationOrder: number;
}

export interface ReturnTaskSlots {
  readonly monbg: number;
  readonly clearMonbg: number;
  /** Allocator-selected slots, in source hit order. */
  readonly shake: readonly number[];
  /** Allocator-selected slots, in source trace-task order. */
  readonly trace: readonly number[];
}

export interface ReturnMotionSlots {
  /** `gVerticalDipSpriteTemplate` allocator history, in source creation order. */
  readonly verticalDip: readonly number[];
  /** The medium branch's `gHorizontalLungeSpriteTemplate` slot. */
  readonly horizontalLunge: number;
}

/**
 * Typed live facts carried through the narrow Scene-ON seam.  None of these
 * values is battle resolution input: friendship has already been selected for
 * the animation, while gameplay state and gameplay RNG are opaque values.
 */
export interface ReturnLiveInputs {
  readonly attackerSide: ReturnSide;
  readonly targetSide: ReturnSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Source `gAnimFriendship`; this is the only Return branch selector. */
  readonly friendship: number;
  readonly attackerCenter: Readonly<ReturnPoint>;
  readonly targetCenter: Readonly<ReturnPoint>;
  readonly attackerInitialOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetInitialOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerArt: Readonly<ReturnBattlerArt>;
  readonly targetArt: Readonly<ReturnBattlerArt>;
  readonly taskSlots: Readonly<ReturnTaskSlots>;
  readonly motionSlots: Readonly<ReturnMotionSlots>;
  readonly impactAllocations: readonly ReturnImpactAllocation[];
  readonly traceAllocations: readonly ReturnTraceAllocation[];
  /** Persistent `SortSprites` order from the live sprite system. */
  readonly spriteOrder: readonly number[];
  /** Current generic Scene-ON transfer buffers. */
  readonly buffers: Readonly<{
    readonly softwareOam: readonly unknown[];
    readonly hardwareOam: readonly unknown[];
    readonly softwareMatrices: readonly ReturnMatrix[];
    readonly hardwareMatrices: readonly ReturnMatrix[];
  }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly background: Readonly<{
    readonly current: unknown;
    readonly battle: unknown;
    readonly sourceScroll: Readonly<ReturnPoint>;
    readonly layer: "bg1" | "bg2";
    readonly monbgTaskData: readonly number[];
    readonly clearTaskData: readonly number[];
  }>;
  readonly resources: Readonly<{
    readonly impactTag: number;
    readonly tileSlot: number | null;
    readonly paletteSlot: number | null;
    readonly paletteBank: number | null;
    readonly tileRange: readonly [number, number] | null;
    readonly allocator: unknown;
  }>;
  readonly audio: Readonly<{
    readonly current: unknown;
    readonly attackerPan: number;
    readonly targetPan: number;
  }>;
  readonly liveCounts: Readonly<{
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly matrixBitmap: number;
  }>;
  /** Presentation-only RNG is observed, never advanced by this reducer. */
  readonly animationRng: number;
  readonly gameplayRng: unknown;
  readonly gameplayState: unknown;
}

export interface ReturnSourceCursor {
  readonly owner: "Move_RETURN";
  readonly branch: ReturnBranch;
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly active: boolean;
  readonly wait: number;
}

export interface ReturnTask {
  readonly slot: number;
  readonly callback:
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg"
    | "AnimTask_ShakeMon_Step"
    | "AnimTask_TraceMonBlended_Step";
  readonly role: "monbg" | "clear-monbg" | "target-shake" | "attacker-trace";
  readonly sourceCreationOrder: number;
  readonly data: readonly number[];
}

export interface ReturnVerticalDip {
  readonly sourceCreationOrder: number;
  readonly slot: number;
  readonly template: "gVerticalDipSpriteTemplate";
  readonly callback:
    | "TranslateSpriteLinearById"
    | "ReverseVerticalDipDirection"
    | "DestroyAnimSprite";
  readonly start: number;
  readonly duration: number;
  readonly deltaY: number;
  readonly localAge: number;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
}

export interface ReturnHorizontalLunge {
  readonly slot: number;
  readonly template: "gHorizontalLungeSpriteTemplate";
  readonly callback:
    | "TranslateSpriteLinearById"
    | "ReverseHorizontalLungeDirection"
    | "DestroyAnimSprite";
  readonly start: number;
  readonly duration: number;
  readonly deltaX: number;
  readonly localAge: number;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
}

export interface ReturnImpact {
  readonly sourceCreationOrder: number;
  readonly slot: number;
  readonly matrixNum: number;
  readonly attr: ReturnOam;
  readonly subpriority: number;
  readonly template: "gBasicHitSplatSpriteTemplate";
  readonly callback: "RunStoredCallbackWhenAffineAnimEnds" | "DestroyAnimSprite";
  readonly start: number;
  readonly x: number;
  readonly y: number;
  readonly animation: 0 | 2;
}

export interface ReturnTrace {
  readonly sourceCreationOrder: number;
  readonly taskSlot: number;
  readonly cloneSlot: number;
  readonly callback: "AnimTask_TraceMonBlended_Step";
  readonly cloneCallback: "AnimMonTrace";
  readonly start: number;
  readonly interval: 4;
  readonly lifetime: 5;
}

export interface ReturnAudioEvent {
  readonly channel: "SE1" | "SE2";
  readonly sound:
    | "SE_M_TAIL_WHIP"
    | "SE_M_COMET_PUNCH"
    | "SE_M_MEGA_KICK2"
    | "SE_M_VITAL_THROW2";
  readonly pan: number;
}

export interface ReturnState {
  readonly age: number;
  readonly active: boolean;
  readonly source: ReturnSourceCursor;
  readonly selector: Readonly<{
    readonly friendship: number;
    readonly powerLevel: 0 | 1 | 2 | 3;
    readonly branch: ReturnBranch;
  }>;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{
      readonly side: ReturnSide;
      readonly species: string;
      readonly center: ReturnPoint;
      readonly art: ReturnBattlerArt;
      readonly offset: Readonly<{ x2: number; y2: number }>;
    }>;
    readonly target: Readonly<{
      readonly side: ReturnSide;
      readonly species: string;
      readonly center: ReturnPoint;
      readonly art: ReturnBattlerArt;
      readonly offset: Readonly<{ x2: number; y2: number }>;
    }>;
  }>;
  readonly tasks: readonly ReturnTask[];
  readonly verticalDips: readonly ReturnVerticalDip[];
  readonly horizontalLunge: ReturnHorizontalLunge | null;
  readonly impacts: readonly ReturnImpact[];
  readonly traces: readonly ReturnTrace[];
  readonly lifecycle: Readonly<{
    readonly verticalDipStarts: readonly number[];
    readonly horizontalLungeStarts: readonly number[];
    readonly hitsplatStarts: readonly number[];
    readonly shakeStarts: readonly number[];
    readonly traceStarts: readonly number[];
    readonly simplePaletteBlendStarts: readonly number[];
    readonly firstInactive: number;
  }>;
  readonly monbg: Readonly<{
    readonly active: boolean;
    readonly clear: boolean;
    readonly layer: "bg1" | "bg2";
    readonly sourceScroll: ReturnPoint;
  }>;
  readonly paletteBlend: Readonly<{
    readonly phase: "none" | "to-black" | "to-battle";
    readonly bgOnly: boolean;
  }>;
  readonly resources: Readonly<{
    readonly loaded: boolean;
    readonly tag: number | null;
    readonly tileSlot: number | null;
    readonly paletteSlot: number | null;
    readonly paletteBank: number | null;
    readonly tileRange: readonly [number, number] | null;
    readonly matrixBitmap: number;
    readonly allocator: unknown;
  }>;
  readonly painterOrder: readonly number[];
  readonly buffers: ReturnLiveInputs["buffers"];
  readonly palette: ReturnLiveInputs["palette"];
  readonly registers: ReturnLiveInputs["registers"];
  readonly background: Readonly<{
    readonly phase: "battle" | "monbg" | "restoring-battle";
    readonly current: unknown;
    readonly battle: unknown;
  }>;
  readonly audio: Readonly<{
    readonly live: unknown;
    readonly events: readonly ReturnAudioEvent[];
  }>;
  readonly rng: Readonly<{
    readonly animation: number;
    readonly gameplay: unknown;
    readonly gameplayUnchanged: true;
  }>;
  readonly gameplay: unknown;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    readonly palette: "initial" | "same-row-monbg" | "preceding-faded";
    readonly registers: "current-source";
    readonly monbgScroll: "initial" | "preceding-source";
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly ownedTasks: number;
    readonly ownedSprites: number;
    readonly resourcesReleased: boolean;
  }>;
}

export const RETURN_SOURCE_START = 0x082d_5ace;
export const RETURN_IMPACT_TAG = 10135;

interface VerticalSpec {
  readonly start: number;
  readonly duration: number;
  readonly deltaY: number;
}

interface ImpactSpec {
  readonly start: number;
  readonly x: number;
  readonly y: number;
  readonly animation: 0 | 2;
  readonly sound: ReturnAudioEvent["sound"];
}

interface ShakeSpec {
  readonly start: number;
  readonly x: number;
  readonly y: number;
  readonly repetitions: number;
  readonly delay: number;
}

interface CursorSegment {
  readonly start: number;
  readonly end: number;
  readonly pointerOffset: number;
  readonly wait: number | Readonly<{ readonly countdownEnd: number }>;
}

interface ReturnProgram {
  readonly branch: ReturnBranch;
  readonly firstInactive: number;
  /** Source `clearmonbg 3` begins here; medium deliberately clears early. */
  readonly monbgClearStart: number;
  readonly cursor: readonly CursorSegment[];
  readonly vertical: readonly VerticalSpec[];
  readonly horizontal: Readonly<{ readonly start: number; readonly duration: number; readonly deltaX: number }> | null;
  readonly impacts: readonly ImpactSpec[];
  readonly shakes: readonly ShakeSpec[];
  readonly traces: readonly number[];
  readonly simplePalette: readonly number[];
}

const WAIT = (value: number): number => value;
const COUNTDOWN_TO = (countdownEnd: number): Readonly<{ readonly countdownEnd: number }> => ({ countdownEnd });

const PROGRAMS: Readonly<Record<ReturnBranch, ReturnProgram>> = {
  weak: {
    branch: "weak", firstInactive: 87, monbgClearStart: 83,
    cursor: [
      { start: 11, end: 46, pointerOffset: 78, wait: WAIT(1) },
      { start: 47, end: 53, pointerOffset: 105, wait: COUNTDOWN_TO(52) },
      { start: 54, end: 82, pointerOffset: 49, wait: WAIT(1) },
      { start: 83, end: Infinity, pointerOffset: 53, wait: WAIT(1) },
    ],
    vertical: [{ start: 11, duration: 16, deltaY: 1 }, { start: 47, duration: 16, deltaY: 1 }],
    horizontal: null,
    impacts: [{ start: 54, x: -10, y: -8, animation: 2, sound: "SE_M_COMET_PUNCH" }],
    shakes: [], traces: [], simplePalette: [],
  },
  medium: {
    branch: "medium", firstInactive: 99, monbgClearStart: 75,
    cursor: [
      { start: 11, end: 26, pointerOffset: 160, wait: WAIT(1) },
      { start: 27, end: 42, pointerOffset: 185, wait: WAIT(1) },
      { start: 43, end: 55, pointerOffset: 188, wait: COUNTDOWN_TO(54) },
      { start: 56, end: 63, pointerOffset: 201, wait: COUNTDOWN_TO(62) },
      { start: 64, end: 74, pointerOffset: 49, wait: WAIT(1) },
      { start: 75, end: Infinity, pointerOffset: 53, wait: WAIT(1) },
    ],
    vertical: [{ start: 11, duration: 6, deltaY: 1 }, { start: 27, duration: 6, deltaY: 1 }],
    horizontal: { start: 56, duration: 5, deltaX: 4 },
    impacts: [{ start: 64, x: 0, y: 0, animation: 2, sound: "SE_M_MEGA_KICK2" }],
    shakes: [], traces: [], simplePalette: [],
  },
  strong: {
    branch: "strong", firstInactive: 124, monbgClearStart: 120,
    cursor: [
      { start: 11, end: 26, pointerOffset: 256, wait: WAIT(1) },
      { start: 27, end: 42, pointerOffset: 281, wait: WAIT(1) },
      { start: 43, end: 58, pointerOffset: 306, wait: WAIT(1) },
      { start: 59, end: 74, pointerOffset: 331, wait: WAIT(1) },
      { start: 75, end: 84, pointerOffset: 377, wait: COUNTDOWN_TO(83) },
      { start: 85, end: 94, pointerOffset: 422, wait: COUNTDOWN_TO(93) },
      { start: 95, end: 104, pointerOffset: 467, wait: COUNTDOWN_TO(103) },
      { start: 105, end: 119, pointerOffset: 49, wait: WAIT(1) },
      { start: 120, end: Infinity, pointerOffset: 53, wait: WAIT(1) },
    ],
    vertical: [
      { start: 11, duration: 6, deltaY: 1 }, { start: 27, duration: 6, deltaY: 1 },
      { start: 43, duration: 6, deltaY: 1 }, { start: 59, duration: 6, deltaY: 1 },
    ],
    horizontal: null,
    impacts: [
      { start: 75, x: -10, y: -8, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 85, x: 10, y: 10, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 95, x: 3, y: -5, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 105, x: -5, y: 3, animation: 2, sound: "SE_M_VITAL_THROW2" },
    ],
    shakes: [
      { start: 75, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 85, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 95, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 105, x: 6, y: 0, repetitions: 8, delay: 1 },
    ],
    traces: [], simplePalette: [],
  },
  strongest: {
    branch: "strongest", firstInactive: 281, monbgClearStart: 277,
    cursor: [
      { start: 11, end: 23, pointerOffset: 532, wait: WAIT(1) },
      { start: 24, end: 33, pointerOffset: 559, wait: COUNTDOWN_TO(32) },
      { start: 34, end: 59, pointerOffset: 585, wait: WAIT(1) },
      { start: 60, end: 66, pointerOffset: 612, wait: COUNTDOWN_TO(65) },
      { start: 67, end: 87, pointerOffset: 655, wait: WAIT(1) },
      { start: 88, end: 93, pointerOffset: 658, wait: COUNTDOWN_TO(92) },
      { start: 94, end: 100, pointerOffset: 684, wait: COUNTDOWN_TO(99) },
      { start: 101, end: 115, pointerOffset: 727, wait: WAIT(1) },
      { start: 116, end: 119, pointerOffset: 730, wait: COUNTDOWN_TO(118) },
      { start: 120, end: 134, pointerOffset: 827, wait: WAIT(1) },
      { start: 135, end: 141, pointerOffset: 854, wait: COUNTDOWN_TO(140) },
      { start: 142, end: 156, pointerOffset: 912, wait: WAIT(1) },
      { start: 157, end: 216, pointerOffset: 1165, wait: WAIT(1) },
      { start: 217, end: 224, pointerOffset: 978, wait: COUNTDOWN_TO(223) },
      { start: 225, end: 232, pointerOffset: 1006, wait: COUNTDOWN_TO(231) },
      { start: 233, end: 240, pointerOffset: 1034, wait: COUNTDOWN_TO(239) },
      { start: 241, end: 263, pointerOffset: 1060, wait: WAIT(1) },
      { start: 264, end: 276, pointerOffset: 49, wait: WAIT(1) },
      { start: 277, end: Infinity, pointerOffset: 53, wait: WAIT(1) },
    ],
    vertical: [
      { start: 24, duration: 16, deltaY: 1 }, { start: 60, duration: 12, deltaY: 1 },
      { start: 94, duration: 8, deltaY: 1 }, { start: 120, duration: 4, deltaY: 1 },
      { start: 135, duration: 4, deltaY: 2 }, { start: 157, duration: 4, deltaY: 3 },
      { start: 172, duration: 4, deltaY: 3 }, { start: 187, duration: 4, deltaY: 3 },
      { start: 202, duration: 4, deltaY: 3 },
    ],
    horizontal: null,
    impacts: [
      { start: 34, x: 3, y: -5, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 67, x: -10, y: -8, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 101, x: -10, y: -8, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 120, x: -10, y: -8, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 142, x: -10, y: -8, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 157, x: 0, y: 0, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 172, x: 0, y: 0, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 187, x: 0, y: 0, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 202, x: 0, y: 0, animation: 2, sound: "SE_M_VITAL_THROW2" },
      { start: 217, x: -10, y: -8, animation: 0, sound: "SE_M_MEGA_KICK2" },
      { start: 225, x: 10, y: 10, animation: 0, sound: "SE_M_MEGA_KICK2" },
      { start: 233, x: 3, y: -5, animation: 0, sound: "SE_M_MEGA_KICK2" },
      { start: 241, x: -5, y: 3, animation: 0, sound: "SE_M_MEGA_KICK2" },
    ],
    shakes: [
      { start: 67, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 101, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 120, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 142, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 157, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 172, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 187, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 202, x: 6, y: 0, repetitions: 8, delay: 1 },
      { start: 217, x: 8, y: 0, repetitions: 24, delay: 1 },
    ],
    traces: [120, 120, 142, 157, 172, 187, 202],
    simplePalette: [11, 264],
  },
};

function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) {
    throw new Error(`invalid Return ${label}`);
  }
}

function assertPoint(point: Readonly<ReturnPoint>, label: string): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`invalid Return ${label}`);
  }
}

function assertArt(art: Readonly<ReturnBattlerArt>, label: string): void {
  assertSlot(art.slot, `${label} sprite slot`, 64);
  assertSlot(art.matrixNum, `${label} matrix slot`, 32);
  if (!art.displaySpecies || art.attr.length !== 3 || art.matrix.length !== 4) {
    throw new Error(`invalid Return ${label} art`);
  }
}

function assertInputs(input: Readonly<ReturnLiveInputs>, program: Readonly<ReturnProgram>): void {
  if (input.attackerSide === input.targetSide || !input.attackerSpecies || !input.targetSpecies) {
    throw new Error("Return requires opposing named battlers");
  }
  if (!Number.isInteger(input.friendship) || input.friendship < 0 || input.friendship > 255) {
    throw new Error("Return friendship must be an unsigned byte");
  }
  assertPoint(input.attackerCenter, "attacker center");
  assertPoint(input.targetCenter, "target center");
  assertArt(input.attackerArt, "attacker");
  assertArt(input.targetArt, "target");
  assertSlot(input.taskSlots.monbg, "monbg task slot", 16);
  assertSlot(input.taskSlots.clearMonbg, "clear-monbg task slot", 16);
  assertSlot(input.motionSlots.horizontalLunge, "horizontal-lunge sprite slot", 64);
  if (input.motionSlots.verticalDip.length < program.vertical.length
    || input.impactAllocations.length < program.impacts.length
    || input.taskSlots.shake.length < program.shakes.length
    || input.taskSlots.trace.length < program.traces.length
    || input.traceAllocations.length < program.traces.length) {
    throw new Error(`Return ${program.branch} lacks live presentation allocations`);
  }
}

/** Exact source selector from `AnimTask_GetReturnPowerLevel`. */
export function returnPowerLevelForFriendship(friendship: number): 0 | 1 | 2 | 3 {
  if (!Number.isInteger(friendship) || friendship < 0 || friendship > 255) {
    throw new Error("Return friendship must be an unsigned byte");
  }
  if (friendship > 200) return 3;
  if (friendship > 91) return 2;
  if (friendship > 60) return 1;
  return 0;
}

export function returnBranchForFriendship(friendship: number): ReturnBranch {
  return (["weak", "medium", "strong", "strongest"] as const)[returnPowerLevelForFriendship(friendship)]!;
}

export function returnFirstInactiveAge(friendship: number): number {
  return PROGRAMS[returnBranchForFriendship(friendship)].firstInactive;
}

function cursorWait(segment: Readonly<CursorSegment>, age: number): number {
  return typeof segment.wait === "number"
    ? segment.wait
    : Math.max(0, segment.wait.countdownEnd - age);
}

function sourceAtAge(age: number, program: Readonly<ReturnProgram>): ReturnSourceCursor {
  const active = age >= 0 && age < program.firstInactive;
  if (age <= 0) {
    return { owner: "Move_RETURN", branch: program.branch, pointer: RETURN_SOURCE_START,
      pointerOffset: 0, active, wait: 0 };
  }
  if (age <= 3) {
    return { owner: "Move_RETURN", branch: program.branch, pointer: RETURN_SOURCE_START + 3,
      pointerOffset: 3, active, wait: Math.max(0, 2 - age) };
  }
  if (age <= 6) {
    return { owner: "Move_RETURN", branch: program.branch, pointer: RETURN_SOURCE_START + 5,
      pointerOffset: 5, active, wait: Math.max(0, 5 - age) };
  }
  if (age <= 10) {
    return { owner: "Move_RETURN", branch: program.branch, pointer: RETURN_SOURCE_START + 17,
      pointerOffset: 17, active, wait: Math.max(0, 9 - age) };
  }
  const segment = program.cursor.find((entry) => age >= entry.start && age <= entry.end)!;
  return { owner: "Move_RETURN", branch: program.branch,
    pointer: RETURN_SOURCE_START + segment.pointerOffset,
    pointerOffset: segment.pointerOffset, active, wait: cursorWait(segment, age) };
}

/** Exposed for source-cursor tests; no battle/turn tick participates. */
export function returnSourceAtAge(age: number, friendship: number): ReturnSourceCursor {
  return sourceAtAge(age, PROGRAMS[returnBranchForFriendship(friendship)]);
}

function argsAtAge(age: number, power: 0 | 1 | 2 | 3): ReturnState["animArgs"] {
  if (age < 7) return [0, 0, 0, 0, 0, 0, 0, 0];
  if (power === 0) {
    return age < 54 ? [167, -64, 0, 0, 0, 0, 0, 0] : [139, 63, 1, 2, 0, 0, 0, 0];
  }
  if (power === 1) {
    if (age < 11) return [0, 0, 0, 0, 0, 0, 0, 1];
    if (age < 56) return [167, -64, 0, 0, 0, 0, 0, 1];
    if (age < 64) return [5, 4, 0, 0, 0, 0, 0, 1];
    return [141, 63, 1, 2, 0, 0, 0, 1];
  }
  if (power === 2) {
    if (age < 11) return [0, 0, 0, 0, 0, 0, 0, 2];
    if (age < 75) return [167, -64, 0, 0, 0, 0, 0, 2];
    return [1, 6, 0, 8, 1, 0, 0, 2];
  }
  if (age < 11) return [0, 0, 0, 0, 0, 0, 0, 3];
  if (age < 24) return [1, 0, 0, 6, 0, 0, 0, 3];
  if (age < 34) return [167, -64, 0, 6, 0, 0, 0, 3];
  if (age < 60) return [123, 63, 1, 2, 0, 0, 0, 3];
  if (age < 67) return [167, -64, 0, 2, 0, 0, 0, 3];
  if (age < 94) return [1, 6, 0, 8, 1, 0, 0, 3];
  if (age < 101) return [167, -64, 0, 8, 1, 0, 0, 3];
  if (age < 120) return [1, 6, 0, 8, 1, 0, 0, 3];
  if (age < 135) return [0, 4, 5, 1, 1, 0, 0, 3];
  if (age < 142) return [167, -64, 0, 1, 1, 0, 0, 3];
  if (age < 217) return [0, 4, 5, 1, 1, 0, 0, 3];
  if (age < 225) return [1, 8, 0, 24, 1, 0, 0, 3];
  if (age < 264) return [141, 63, 1, 0, 1, 0, 0, 3];
  return [1, 0, 6, 0, 0, 0, 0, 3];
}

function verticalDipOffset(duration: number, deltaY: number, localAge: number): number {
  if (localAge < 0 || localAge > duration * 2 + 2) return 0;
  if (localAge < duration) return (localAge + 1) * deltaY;
  if (localAge <= duration + 1) return duration * deltaY;
  return Math.max(0, duration * 2 + 1 - localAge) * deltaY;
}

function liveVerticalDips(
  age: number,
  program: Readonly<ReturnProgram>,
  input: Readonly<ReturnLiveInputs>,
): readonly ReturnVerticalDip[] {
  return program.vertical.flatMap((spec, sourceCreationOrder) => {
    const localAge = age - spec.start;
    if (localAge < 0 || localAge > spec.duration * 2 + 2) return [];
    const callback = localAge === spec.duration
      ? "ReverseVerticalDipDirection" as const
      : localAge === spec.duration * 2 + 2
        ? "DestroyAnimSprite" as const
        : "TranslateSpriteLinearById" as const;
    return [{ sourceCreationOrder, slot: input.motionSlots.verticalDip[sourceCreationOrder]!,
      template: "gVerticalDipSpriteTemplate", callback, start: spec.start,
      duration: spec.duration, deltaY: spec.deltaY, localAge,
      attackerOffset: { x2: input.attackerInitialOffset.x2,
        y2: input.attackerInitialOffset.y2 + verticalDipOffset(spec.duration, spec.deltaY, localAge) } }];
  });
}

function liveHorizontalLunge(
  age: number,
  program: Readonly<ReturnProgram>,
  input: Readonly<ReturnLiveInputs>,
): ReturnHorizontalLunge | null {
  const spec = program.horizontal;
  if (!spec) return null;
  const localAge = age - spec.start;
  if (localAge < 0 || localAge > spec.duration * 2 + 2) return null;
  return {
    slot: input.motionSlots.horizontalLunge, template: "gHorizontalLungeSpriteTemplate",
    callback: localAge === spec.duration ? "ReverseHorizontalLungeDirection"
      : localAge === spec.duration * 2 + 2 ? "DestroyAnimSprite" : "TranslateSpriteLinearById",
    start: spec.start, duration: spec.duration, deltaX: spec.deltaX, localAge,
    attackerOffset: {
      x2: input.attackerInitialOffset.x2 + horizontalLungeX2AtTick(
        // The helper applies its first translation on its creation callback.
        spec.duration, spec.deltaX, input.attackerSide, localAge + 1,
      ),
      y2: input.attackerInitialOffset.y2,
    },
  };
}

function liveImpacts(
  age: number,
  program: Readonly<ReturnProgram>,
  input: Readonly<ReturnLiveInputs>,
): readonly ReturnImpact[] {
  return program.impacts.flatMap((spec, sourceCreationOrder) => {
    const localAge = age - spec.start;
    // Basic Hit Splat affine animation 0 reaches its stored destroy callback
    // one source age before Return's animation 2 body.
    const destroyAge = spec.animation === 0 ? 8 : 9;
    if (localAge < 0 || localAge > destroyAge) return [];
    const allocation = input.impactAllocations[sourceCreationOrder]!;
    const xSign = input.attackerSide === "player" ? 1 : -1;
    return [{ sourceCreationOrder, slot: allocation.slot, matrixNum: allocation.matrixNum,
      attr: allocation.attr, subpriority: allocation.subpriority,
      template: "gBasicHitSplatSpriteTemplate",
      callback: localAge === destroyAge ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
      start: spec.start, x: input.targetCenter.x + spec.x * xSign,
      y: input.targetCenter.y + spec.y, animation: spec.animation }];
  });
}

function liveTraces(
  age: number,
  program: Readonly<ReturnProgram>,
  input: Readonly<ReturnLiveInputs>,
): readonly ReturnTrace[] {
  return program.traces.flatMap((start, sourceCreationOrder) => {
    if (age < start || age > start + 5) return [];
    return [{ sourceCreationOrder, taskSlot: input.taskSlots.trace[sourceCreationOrder]!,
      cloneSlot: input.traceAllocations[sourceCreationOrder]!.slot,
      callback: "AnimTask_TraceMonBlended_Step", cloneCallback: "AnimMonTrace",
      start, interval: 4, lifetime: 5 }];
  });
}

interface ReturnShakeRuntime {
  readonly spec: Readonly<ShakeSpec>;
  readonly sourceCreationOrder: number;
  remaining: number;
  delayCounter: number;
}

interface ReturnShakeTimeline {
  readonly tasks: readonly ReturnTask[];
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
}

/**
 * `AnimTask_ShakeMon` writes directly to the target sprite's shared x2/y2
 * fields.  Return can overlap those tasks, so reducing each task separately
 * loses the source's slot-ordered mutation.  This is the C task's init-step
 * followed by the ordinary task loop for each source-relative age.
 */
function shakeTimelineAtAge(
  age: number,
  program: Readonly<ReturnProgram>,
  input: Readonly<ReturnLiveInputs>,
): ReturnShakeTimeline {
  let targetOffset = { ...input.targetInitialOffset };
  const active: ReturnShakeRuntime[] = [];

  const step = (runtime: ReturnShakeRuntime): boolean => {
    if (runtime.delayCounter === 0) {
      targetOffset = {
        x2: targetOffset.x2 === 0 ? runtime.spec.x : 0,
        y2: targetOffset.y2 === 0 ? runtime.spec.y : 0,
      };
      runtime.delayCounter = runtime.spec.delay;
      runtime.remaining -= 1;
      if (runtime.remaining === 0) {
        targetOffset = { x2: 0, y2: 0 };
        return false;
      }
    } else {
      runtime.delayCounter -= 1;
    }
    return true;
  };

  const firstStart = program.shakes[0]?.start;
  if (firstStart === undefined || age < firstStart) {
    return { tasks: [], targetOffset };
  }
  for (let sourceAge = firstStart; sourceAge <= age; sourceAge += 1) {
    for (const [sourceCreationOrder, spec] of program.shakes.entries()) {
      if (spec.start !== sourceAge) continue;
      targetOffset = { x2: spec.x, y2: spec.y };
      const runtime: ReturnShakeRuntime = {
        spec, sourceCreationOrder, remaining: spec.repetitions, delayCounter: spec.delay,
      };
      // AnimTask_ShakeMon invokes its Step callback synchronously at creation.
      if (step(runtime)) active.push(runtime);
    }
    for (let index = 0; index < active.length;) {
      if (step(active[index]!)) index += 1;
      else active.splice(index, 1);
    }
  }
  return {
    tasks: active.map((runtime) => ({
      slot: input.taskSlots.shake[runtime.sourceCreationOrder]!,
      callback: "AnimTask_ShakeMon_Step" as const,
      role: "target-shake" as const,
      sourceCreationOrder: runtime.sourceCreationOrder,
      data: [input.targetArt.slot, runtime.remaining, runtime.spec.delay,
        runtime.delayCounter, runtime.spec.x, runtime.spec.y],
    })),
    targetOffset,
  };
}

function liveTasks(
  age: number,
  program: Readonly<ReturnProgram>,
  input: Readonly<ReturnLiveInputs>,
  shakeTasks: readonly ReturnTask[],
): readonly ReturnTask[] {
  const tasks: ReturnTask[] = [];
  if (age >= 4 && age <= program.monbgClearStart + 2) {
    tasks.push({ slot: input.taskSlots.monbg, callback: "Task_UpdateMonBg", role: "monbg",
      sourceCreationOrder: 0, data: input.background.monbgTaskData });
  }
  if (age >= program.monbgClearStart && age <= program.monbgClearStart + 2) {
    const data = [...input.background.clearTaskData];
    if (data.length > 1) data[1] = age === program.monbgClearStart ? 1 : 2;
    tasks.push({ slot: input.taskSlots.clearMonbg, callback: "Task_ClearMonBg", role: "clear-monbg",
      sourceCreationOrder: 0, data });
  }
  tasks.push(...shakeTasks);
  for (const [sourceCreationOrder, start] of program.traces.entries()) {
    if (age < start || age > start + 5) continue;
    tasks.push({ slot: input.taskSlots.trace[sourceCreationOrder]!,
      callback: "AnimTask_TraceMonBlended_Step", role: "attacker-trace", sourceCreationOrder,
      data: [0, 4, 4, 5, 0, 1] });
  }
  return tasks.sort((left, right) => left.slot - right.slot || left.sourceCreationOrder - right.sourceCreationOrder);
}

function audioAtAge(
  age: number,
  program: Readonly<ReturnProgram>,
  input: Readonly<ReturnLiveInputs>,
): readonly ReturnAudioEvent[] {
  const events: ReturnAudioEvent[] = [];
  for (const spec of program.vertical) if (age === spec.start) {
    events.push({ channel: "SE2", sound: "SE_M_TAIL_WHIP", pan: input.audio.attackerPan });
  }
  for (const spec of program.impacts) if (age === spec.start) {
    events.push({ channel: "SE1", sound: spec.sound, pan: input.audio.targetPan });
  }
  return events;
}

/**
 * Reduces one source-relative Return age.  Age may be any integer; after the
 * branch's first inactive cleanup the final source cursor remains observable
 * but Return owns no resources, tasks, or sprites.
 */
export function returnAtAge(age: number, input: Readonly<ReturnLiveInputs>): ReturnState {
  if (!Number.isInteger(age)) throw new Error("Return age must be an integer");
  const powerLevel = returnPowerLevelForFriendship(input.friendship);
  const branch = returnBranchForFriendship(input.friendship);
  const program = PROGRAMS[branch];
  assertInputs(input, program);
  const source = sourceAtAge(age, program);
  const active = source.active;
  const verticalDips = active ? liveVerticalDips(age, program, input) : [];
  const horizontalLunge = active ? liveHorizontalLunge(age, program, input) : null;
  const impacts = active ? liveImpacts(age, program, input) : [];
  const traces = active ? liveTraces(age, program, input) : [];
  const shake = shakeTimelineAtAge(age, program, input);
  const tasks = active ? liveTasks(age, program, input, shake.tasks) : [];
  const latestVertical = verticalDips.at(-1);
  const attackerOffset = horizontalLunge?.attackerOffset
    ?? latestVertical?.attackerOffset
    ?? input.attackerInitialOffset;
  const firstInactive = age === program.firstInactive;
  const monbgActive = active && age >= 4 && age <= program.monbgClearStart + 2;
  const clear = active && age >= program.monbgClearStart && age <= program.monbgClearStart + 2;
  const phase = !monbgActive ? "battle" : clear ? "restoring-battle" : "monbg";
  const paletteBlend = branch !== "strongest" ? { phase: "none" as const, bgOnly: false }
    : age >= 264 && age < program.firstInactive ? { phase: "to-battle" as const, bgOnly: true }
      : age >= 11 && age < 264 ? { phase: "to-black" as const, bgOnly: true }
        : { phase: "none" as const, bgOnly: false };
  const loaded = active && age >= 1;
  return {
    age, active, source,
    selector: { friendship: input.friendship, powerLevel, branch },
    animArgs: argsAtAge(age, powerLevel),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies,
        center: { ...input.attackerCenter }, art: input.attackerArt, offset: attackerOffset },
      target: { side: input.targetSide, species: input.targetSpecies,
        center: { ...input.targetCenter }, art: input.targetArt,
        offset: shake.targetOffset },
    },
    tasks, verticalDips, horizontalLunge, impacts, traces,
    lifecycle: {
      verticalDipStarts: program.vertical.map((entry) => entry.start),
      horizontalLungeStarts: program.horizontal ? [program.horizontal.start] : [],
      hitsplatStarts: program.impacts.map((entry) => entry.start),
      shakeStarts: program.shakes.map((entry) => entry.start),
      traceStarts: program.traces,
      simplePaletteBlendStarts: program.simplePalette,
      firstInactive: program.firstInactive,
    },
    monbg: { active: monbgActive, clear, layer: input.background.layer,
      sourceScroll: monbgActive ? { ...input.background.sourceScroll } : { x: 0, y: 0 } },
    paletteBlend,
    resources: {
      loaded, tag: loaded ? input.resources.impactTag : null,
      tileSlot: loaded ? input.resources.tileSlot : null,
      paletteSlot: loaded ? input.resources.paletteSlot : null,
      paletteBank: loaded ? input.resources.paletteBank : null,
      tileRange: loaded ? input.resources.tileRange : null,
      matrixBitmap: input.liveCounts.matrixBitmap, allocator: input.resources.allocator,
    },
    painterOrder: input.spriteOrder, buffers: input.buffers, palette: input.palette,
    registers: input.registers,
    background: { phase, current: phase === "battle" ? input.background.battle : input.background.current,
      battle: input.background.battle },
    audio: { live: input.audio.current, events: active ? audioAtAge(age, program, input) : [] },
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    displayTransfer: {
      oam: age <= 0 ? "initial" : "preceding-software",
      matrices: age <= 0 ? "initial" : "preceding-software",
      palette: age <= 0 ? "initial" : age === 4 ? "same-row-monbg" : "preceding-faded",
      registers: "current-source",
      monbgScroll: age <= 4 ? "initial" : "preceding-source",
    },
    cleanup: {
      firstInactive, visualTasks: firstInactive ? 0 : input.liveCounts.visualTasks,
      soundTasks: firstInactive ? 0 : input.liveCounts.soundTasks,
      ownedTasks: tasks.length,
      ownedSprites: verticalDips.length + (horizontalLunge ? 1 : 0) + impacts.length + traces.length,
      resourcesReleased: firstInactive,
    },
  };
}
