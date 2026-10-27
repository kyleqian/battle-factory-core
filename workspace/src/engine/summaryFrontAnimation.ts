/**
 * Source-driven summary front-sprite animation presentation.
 *
 * The clock is local to the currently installed mon sprite. Initial summary
 * construction dispatches PokemonSummaryDoMonAnimation at clock 6; a
 * replacement dispatches it at clock 1. The source frame program begins at
 * dispatch, while motion first reaches visible OAM one or two renders later
 * depending on whether it uses ordinary offsets or an affine matrix.
 */

import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import summaryFrontAnimationData from "../data/gen/summary-front-animation.json" with { type: "json" };

/** Source motion types whose callbacks are transcribed below. */
export const SUMMARY_FRONT_IMPLEMENTED_MOTIONS = [
  "ANIM_RAPID_H_HOPS",
  "ANIM_V_SQUISH_AND_BOUNCE",
  "ANIM_H_JUMPS",
  "ANIM_V_SLIDE",
  // sfa214, by Battle Frontier species count:
  "ANIM_V_STRETCH",
  "ANIM_V_SHAKE",
  "ANIM_H_SHAKE",
  "ANIM_V_SQUISH_AND_BOUNCE_SLOW",
  "ANIM_GROW_VIBRATE",
  "ANIM_V_JUMPS_SMALL",
  "ANIM_H_STRETCH",
  "ANIM_H_VIBRATE",
  "ANIM_H_SLIDE_SLOW",
  "ANIM_CIRCULAR_STRETCH_TWICE",
  "ANIM_SHRINK_GROW",
  "ANIM_V_SLIDE_SLOW",
  "ANIM_V_JUMPS_H_JUMPS",
  "ANIM_V_JUMPS_BIG",
  "ANIM_H_SLIDE",
  "ANIM_H_SHAKE_SLOW",
] as const;

export type SummaryFrontMotionType = (typeof SUMMARY_FRONT_IMPLEMENTED_MOTIONS)[number];

export interface SummaryFrontSpritePresentation {
  /** Extracted source type; may name a motion with no transcription yet. */
  readonly sourceAnimationType: string;
  /**
   * "source" runs the transcribed callback. "approximate-static" is the
   * explicit fallback for a motion not transcribed yet: the source frame
   * program still runs, the sprite does not move (never a throw).
   */
  readonly motionClaim: "source" | "approximate-static";
  readonly frame: 0 | 1;
  readonly x2: number;
  readonly y2: number;
  readonly affine:
    | {
        readonly xScale: number;
        readonly yScale: number;
      }
    | null;
  readonly animationStarted: boolean;
  readonly motionFinished: boolean;
}

interface SourceAnimation {
  readonly species: string;
  readonly delay: number;
  readonly motion: {
    readonly type: string;
  };
  readonly spriteFrameProgram: ReadonlyArray<{
    readonly frame: number;
    readonly duration: number;
  }> | null;
  /** species_info.h .noFlip: IsMonSpriteNotFlipped, the summary's sDontFlip. */
  readonly noFlip?: boolean;
}

const sourceAnimations = new Map(
  (summaryFrontAnimationData.species as SourceAnimation[]).map((entry) => [
    entry.species.replace("SPECIES_", ""),
    entry,
  ]),
);

export const SUMMARY_INITIAL_MON_ANIMATION_START = 5;
export const SUMMARY_REPLACEMENT_MON_ANIMATION_START = 0;

export function summaryFrontAnimationForSpecies(species: string): SourceAnimation {
  const animation = sourceAnimations.get(species);
  if (!animation) throw new Error(`missing summary front animation for ${species}`);
  return animation;
}

/** IsMonSpriteNotFlipped: noFlip species keep hFlip FALSE and sDontFlip TRUE. */
export function summaryFrontSpriteIsFlipped(species: string): boolean {
  return sourceAnimations.get(species)?.noFlip !== true;
}

function frameAt(
  program: SourceAnimation["spriteFrameProgram"],
  elapsed: number,
): 0 | 1 {
  if (!program || elapsed < 0) return 0;
  let remaining = elapsed;
  for (const command of program) {
    if (remaining < command.duration) return command.frame === 1 ? 1 : 0;
    remaining -= command.duration;
  }
  return 0;
}

function sin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function rapidHorizontalHops(elapsed: number, flipX: boolean): Pick<SummaryFrontSpritePresentation, "x2" | "y2" | "motionFinished"> {
  const rawData = elapsed < 2 ? 0 : (elapsed - 2) * 24;
  // WaitAnimEnd does not restore x2/y2 for this source callback; it parks
  // the final 2040 transform after detecting the following >2048 step.
  const data = Math.min(2040, rawData);
  const phase = Math.floor(data / 512) % 4;
  const within = data % 512;
  let x2 = 0;
  if (phase === 0) x2 = Math.trunc((-within * 16) / 512);
  else if (phase === 1) x2 = Math.trunc(within / 32) - 16;
  else if (phase === 2) x2 = Math.trunc(within / 32);
  else x2 = Math.trunc((-within * 16) / 512) + 16;
  // Flipped summary front sprites (!sDontFlip): TryFlipX negates the source x2.
  return {
    x2: flipX ? -x2 : x2,
    y2: -sin(within % 128, 4),
    motionFinished: rawData > 2048,
  };
}

function verticalSquishBounce(
  elapsed: number,
): Pick<SummaryFrontSpritePresentation, "x2" | "y2" | "affine" | "motionFinished"> {
  // RunTasks mutates the affine state before AnimateSprites/BuildOamBuffer;
  // the new matrix first owns visible pixels two renders after dispatch.
  if (elapsed < 2) return { x2: 0, y2: 0, affine: null, motionFinished: false };
  if (elapsed > 50) return { x2: 0, y2: 0, affine: null, motionFinished: true };
  const n = Math.min(49, elapsed - 2);
  const scalePhase = (n * 8) & 0xff;
  const bouncePhase = Math.max(0, Math.min(15, n - 16)) * 8;
  const yScale = sin(scalePhase, 32) + 256;
  const xScale = 256 - sin(scalePhase, 32);
  const posY = yScale > 256 ? Math.trunc((256 - yScale) / 8) : 0;
  return {
    x2: 0,
    y2: -sin(bouncePhase, 10) - posY,
    affine: { xScale, yScale },
    motionFinished: false,
  };
}

function horizontalJumps(elapsed: number, flipX: boolean): Pick<SummaryFrontSpritePresentation, "x2" | "y2" | "motionFinished"> {
  const counter = elapsed < 1 ? 0 : Math.min(516, (elapsed - 1) * 12);
  if (counter > 512) return { x2: 0, y2: 0, motionFinished: true };
  const phase = Math.floor(counter / 128);
  const within = counter % 128;
  let x2 = 0;
  if (phase === 0) x2 = Math.trunc((-within * 8) / 128);
  else if (phase === 1) x2 = Math.trunc(within / 16) - 8;
  else if (phase === 2) x2 = Math.trunc(within / 16);
  else x2 = Math.trunc((-within * 8) / 128) + 8;
  return { x2: flipX ? -x2 : x2, y2: -sin(within, 8), motionFinished: false };
}

function verticalSlide(elapsed: number): Pick<SummaryFrontSpritePresentation, "x2" | "y2" | "motionFinished"> {
  const counter = elapsed < 1 ? 0 : elapsed - 1;
  if (counter > 40) return { x2: 0, y2: 0, motionFinished: true };
  return {
    x2: 0,
    y2: -sin(Math.trunc((counter * 384) / 40) % 256, 6),
    motionFinished: false,
  };
}

// ---------------------------------------------------------------------------
// sfa214: further pokemon_animation.c callbacks, transcribed as per-call
// state machines over the sprite fields they touch. Call k (0-based) is the
// k-th SpriteCallback run after dispatch. Following the four closed forms
// above, ordinary x2/y2 motion from call k is visible at elapsed k + 1 and
// affine motion (HandleStartAffineAnim) at elapsed k + 2.

interface SimSprite {
  x2: number;
  y2: number;
  /** sprite->data[0..7], s16. */
  readonly data: number[];
  /** Unflipped (xScale, yScale) of the last SetAffineData, or null. */
  affine: { xScale: number; yScale: number } | null;
  done: boolean;
  readonly dontFlip: boolean;
}

type SimCallback = (sprite: SimSprite) => void;

function s16(value: number): number {
  return ((value + 0x8000) & 0xffff) - 0x8000;
}

const div = (a: number, b: number) => Math.trunc(a / b);

/** trig.c Sin/Cos: gSineTable is 256 + 64 entries, indexed directly. */
function Sin(index: number, amplitude: number): number {
  return (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
}
function Cos(index: number, amplitude: number): number {
  return (amplitude * GBA_SINE_TABLE_256[(index + 64) & 0xff]!) >> 8;
}

function tryFlipX(sprite: SimSprite): void {
  if (!sprite.dontFlip) sprite.x2 = -sprite.x2;
}

/** HandleSetAffineData's flip is applied by the renderer from noFlip. */
function setAffine(sprite: SimSprite, xScale: number, yScale: number): void {
  sprite.affine = { xScale, yScale };
}

/** HandleSetAffineData(256, 256) + ResetSpriteAfterAnim + WaitAnimEnd. */
function endAffine(sprite: SimSprite): void {
  sprite.affine = null;
  sprite.done = true;
}

// pokemon_animation.c VerticalSlide / Anim_VerticalSlide_Slow (data[0] = 80).
function verticalSlideCallback(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2]! > d[0]!) {
    sprite.done = true;
    sprite.y2 = 0;
  } else {
    sprite.y2 = -Sin(div(d[2]! * 384, d[0]!) % 256, 6);
  }
  d[2] = s16(d[2]! + 1);
  tryFlipX(sprite);
}

// HorizontalSlide: Anim_HorizontalSlide (40) / _Slow (80).
function horizontalSlideCallback(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2]! > d[0]!) {
    sprite.done = true;
    sprite.x2 = 0;
  } else {
    sprite.x2 = Sin(div(d[2]! * 384, d[0]!) % 256, 6);
  }
  d[2] = s16(d[2]! + 1);
  tryFlipX(sprite);
}

// HorizontalShake: Anim_HorizontalShake (60, 3) / _Slow (30, 3). No TryFlipX.
function horizontalShakeCallback(sprite: SimSprite): void {
  const d = sprite.data;
  const counter = d[2]!;
  if (counter > 2304) {
    sprite.done = true;
    sprite.x2 = 0;
  } else {
    sprite.x2 = Sin(counter % 256, d[7]!);
  }
  d[2] = s16(d[2]! + d[0]!);
}

// VerticalShake: Anim_VerticalShake (60).
function verticalShakeCallback(sprite: SimSprite): void {
  const d = sprite.data;
  const counter = d[2]!;
  if (counter > 2304) {
    sprite.done = true;
    sprite.y2 = 0;
  } else {
    sprite.y2 = Sin(counter % 256, 3);
  }
  d[2] = s16(d[2]! + d[0]!);
}

// VerticalJumps: Anim_VerticalJumps_Big (data[0] = 4) / _Small (3).
function verticalJumpsCallback(sprite: SimSprite): void {
  const d = sprite.data;
  let counter = d[2]!;
  if (counter > 384) {
    sprite.done = true;
    sprite.x2 = 0;
    sprite.y2 = 0;
  } else {
    switch (div(counter, 128)) {
      case 0:
      case 1:
        sprite.y2 = -Sin(counter % 128, d[0]! * 2);
        break;
      case 2:
      case 3:
        counter -= 256;
        sprite.y2 = -Sin(counter, d[0]! * 3);
        break;
    }
  }
  d[2] = s16(d[2]! + 12);
}

// Anim_VerticalJumpsHorizontalJumps. No TryFlipX.
function verticalJumpsHorizontalJumpsCallback(sprite: SimSprite): void {
  const d = sprite.data;
  let counter = d[2]!;
  if (counter > 768) {
    sprite.done = true;
    sprite.x2 = 0;
    sprite.y2 = 0;
  } else {
    switch (div(counter, 128)) {
      case 0:
      case 1:
        sprite.x2 = 0;
        break;
      case 2:
        counter = 0;
        break;
      case 3:
        sprite.x2 = div(-((counter % 128) * 8), 128);
        break;
      case 4:
        sprite.x2 = div(counter % 128, 8) - 8;
        break;
      case 5:
        sprite.x2 = div(-((counter % 128) * 8), 128) + 8;
        break;
    }
    sprite.y2 = -Sin(counter % 128, 8);
  }
  d[2] = s16(d[2]! + 12);
}

// Anim_HorizontalVibrate. No TryFlipX.
function horizontalVibrateCallback(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2]! > 40) {
    sprite.done = true;
    sprite.x2 = 0;
  } else {
    const sign = (d[2]! & 1) === 0 ? 1 : -1;
    sprite.x2 = Sin(div(d[2]! * 128, 40) % 256, 6) * sign;
  }
  d[2] = s16(d[2]! + 1);
}

// VerticalSquishBounce: Anim_VerticalSquishBounce_Slow (data[0] = 32).
function verticalSquishBounceCallback(sprite: SimSprite): void {
  const d = sprite.data;
  let posY = 0;
  if (d[2] === 0) d[3] = 0;
  tryFlipX(sprite);
  if (d[2]! > d[0]! * 3) {
    sprite.y2 = 0;
    endAffine(sprite);
  } else {
    const yScale = Sin(d[4]!, 32) + 256;
    if (d[2]! > d[0]! && d[2]! < d[0]! * 2) d[3] = s16(d[3]! + div(128, d[0]!));
    if (yScale > 256) posY = div(256 - yScale, 8);
    sprite.y2 = -Sin(d[3]!, 10) - posY;
    setAffine(sprite, 256 - Sin(d[4]!, 32), yScale);
    d[2] = s16(d[2]! + 1);
    d[4] = (d[4]! + div(128, d[0]!)) & 0xff;
  }
  tryFlipX(sprite);
}

// Anim_VerticalStretch. SetAffineData's xScale sign is the flip; unflipped here.
function verticalStretchCallback(sprite: SimSprite): void {
  const d = sprite.data;
  let posY = 0;
  let index1 = 0;
  if (d[2]! > 40) {
    sprite.y2 = posY;
    endAffine(sprite);
  } else {
    const index2 = div(d[2]! * 128, 40);
    if (d[2]! >= 10 && d[2]! <= 29) {
      d[7] = s16(d[7]! + 51);
      index1 = 0xff & d[7]!;
    }
    d[4] = Sin(index2, 16) + 256;
    d[5] = s16(256 - Sin(index2, 40) - Sin(index1, 8));
    if (d[5] !== 256) posY = div(256 - d[5]!, 8);
    sprite.y2 = -posY;
    setAffine(sprite, d[4]!, d[5]!);
  }
  d[2] = s16(d[2]! + 1);
}

// Anim_HorizontalStretch. Both flip branches give this unflipped xScale.
function horizontalStretchCallback(sprite: SimSprite): void {
  const d = sprite.data;
  let index1 = 0;
  if (d[2]! > 40) {
    endAffine(sprite);
  } else {
    const index2 = div(d[2]! * 128, 40);
    if (d[2]! >= 10 && d[2]! <= 29) {
      d[7] = s16(d[7]! + 51);
      index1 = 0xff & d[7]!;
    }
    d[4] = s16(256 - Sin(index2, 40) - Sin(index1, 16));
    d[5] = Sin(index2, 16) + 256;
    setAffine(sprite, d[4]!, d[5]!);
  }
  d[2] = s16(d[2]! + 1);
}

// Anim_GrowVibrate.
function growVibrateCallback(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2]! > 40) {
    endAffine(sprite);
  } else {
    const index = div(d[2]! * 256, 40) % 256;
    const amplitude = d[2]! % 2 === 0 ? 32 : 8;
    d[4] = Sin(index, amplitude) + 256;
    d[5] = Sin(index, amplitude) + 256;
    setAffine(sprite, d[4]!, d[5]!);
  }
  d[2] = s16(d[2]! + 1);
}

// Anim_CircularStretchTwice.
function circularStretchTwiceCallback(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2]! > 40) {
    endAffine(sprite);
  } else {
    const index = div(d[2]! * 512, 40) % 256;
    d[4] = Sin(index, 32) + 256;
    d[5] = Cos(index, 32) + 256;
    setAffine(sprite, d[4]!, d[5]!);
  }
  d[2] = s16(d[2]! + 1);
}

// Anim_ShrinkGrow -> ShrinkGrow (data[7] = 3, data[6] = 8).
function shrinkGrowCallback(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) {
    d[7] = 3;
    d[6] = 8;
  }
  let posY = 0;
  if (d[2]! > div(128, d[6]!) * d[7]!) {
    sprite.y2 = 0;
    endAffine(sprite);
  } else {
    const yScale = Sin(d[4]!, 32) + 256;
    if (yScale > 256) posY = div(256 - yScale, 8);
    sprite.y2 = -posY;
    setAffine(sprite, Sin(d[4]!, 48) + 256, yScale);
    d[2] = s16(d[2]! + 1);
    d[4] = (d[4]! + d[6]!) & 0xff;
  }
}

/** Anim_* entry setup (data presets) + steady callback + affine flag. */
const SIMULATED_MOTIONS: Readonly<
  Record<string, { readonly preset: Readonly<Record<number, number>>; readonly callback: SimCallback; readonly affine: boolean }>
> = {
  ANIM_V_STRETCH: { preset: {}, callback: verticalStretchCallback, affine: true },
  ANIM_V_SHAKE: { preset: { 0: 60 }, callback: verticalShakeCallback, affine: false },
  ANIM_H_SHAKE: { preset: { 0: 60, 7: 3 }, callback: horizontalShakeCallback, affine: false },
  ANIM_H_SHAKE_SLOW: { preset: { 0: 30, 7: 3 }, callback: horizontalShakeCallback, affine: false },
  ANIM_V_SQUISH_AND_BOUNCE_SLOW: { preset: { 0: 32 }, callback: verticalSquishBounceCallback, affine: true },
  ANIM_GROW_VIBRATE: { preset: {}, callback: growVibrateCallback, affine: true },
  ANIM_V_JUMPS_SMALL: { preset: { 0: 3 }, callback: verticalJumpsCallback, affine: false },
  ANIM_V_JUMPS_BIG: { preset: { 0: 4 }, callback: verticalJumpsCallback, affine: false },
  ANIM_H_STRETCH: { preset: {}, callback: horizontalStretchCallback, affine: true },
  ANIM_H_VIBRATE: { preset: {}, callback: horizontalVibrateCallback, affine: false },
  ANIM_H_SLIDE: { preset: { 0: 40 }, callback: horizontalSlideCallback, affine: false },
  ANIM_H_SLIDE_SLOW: { preset: { 0: 80 }, callback: horizontalSlideCallback, affine: false },
  ANIM_V_SLIDE_SLOW: { preset: { 0: 80 }, callback: verticalSlideCallback, affine: false },
  ANIM_CIRCULAR_STRETCH_TWICE: { preset: {}, callback: circularStretchTwiceCallback, affine: true },
  ANIM_SHRINK_GROW: { preset: {}, callback: shrinkGrowCallback, affine: true },
  ANIM_V_JUMPS_H_JUMPS: { preset: {}, callback: verticalJumpsHorizontalJumpsCallback, affine: false },
};

interface SimFrame {
  readonly x2: number;
  readonly y2: number;
  readonly affine: { readonly xScale: number; readonly yScale: number } | null;
  readonly done: boolean;
}

const simulatedTimelines = new Map<string, readonly SimFrame[]>();

/** Snapshots after each callback call until (and including) the finishing call. */
function simulatedTimeline(type: string, dontFlip: boolean): readonly SimFrame[] {
  const key = `${type}:${dontFlip}`;
  const cached = simulatedTimelines.get(key);
  if (cached) return cached;
  const motion = SIMULATED_MOTIONS[type]!;
  const sprite: SimSprite = { x2: 0, y2: 0, data: [0, 0, 0, 0, 0, 0, 0, 0], affine: null, done: false, dontFlip };
  for (const [index, value] of Object.entries(motion.preset)) sprite.data[Number(index)] = value;
  const frames: SimFrame[] = [];
  for (let call = 0; call < 4096 && !sprite.done; call += 1) {
    motion.callback(sprite);
    // `+ 0` folds the -0 that negated zero offsets produce.
    frames.push({ x2: sprite.x2 + 0, y2: sprite.y2 + 0, affine: sprite.affine && { ...sprite.affine }, done: sprite.done });
  }
  if (!sprite.done) throw new Error(`summary front motion ${type} did not finish`);
  simulatedTimelines.set(key, frames);
  return frames;
}

function simulatedMotion(
  type: string,
  dontFlip: boolean,
  elapsed: number,
): Pick<SummaryFrontSpritePresentation, "x2" | "y2" | "affine" | "motionFinished"> {
  const timeline = simulatedTimeline(type, dontFlip);
  const call = elapsed - (SIMULATED_MOTIONS[type]!.affine ? 2 : 1);
  if (call < 0) return { x2: 0, y2: 0, affine: null, motionFinished: false };
  const frame = timeline[Math.min(call, timeline.length - 1)]!;
  return { x2: frame.x2, y2: frame.y2, affine: frame.affine, motionFinished: frame.done };
}

/** Motion types with no transcription yet: frame program only (approximate). */
export function summaryFrontMotionIsApproximate(type: string): boolean {
  return !(SUMMARY_FRONT_IMPLEMENTED_MOTIONS as readonly string[]).includes(type);
}

export function summaryFrontSpritePresentation(
  species: string,
  monAnimClock: number,
  replacement: boolean,
): SummaryFrontSpritePresentation {
  const animation = sourceAnimations.get(species);
  // The named S4/S9 extraction intentionally covers the six accepted
  // animation anchors. Other already-renderable species remain static until
  // their source row is added; this is presentation fallback, not a mapping.
  if (!animation) {
    return {
      sourceAnimationType: "ANIM_V_SLIDE",
      motionClaim: "approximate-static",
      frame: 0,
      x2: 0,
      y2: 0,
      affine: null,
      animationStarted: false,
      motionFinished: true,
    };
  }
  const start =
    (replacement
      ? SUMMARY_REPLACEMENT_MON_ANIMATION_START
      : SUMMARY_INITIAL_MON_ANIMATION_START) + animation.delay;
  const elapsed = monAnimClock - start;
  const type = animation.motion.type;
  const flipX = animation.noFlip !== true;
  const base = {
    sourceAnimationType: type,
    motionClaim: summaryFrontMotionIsApproximate(type) ? "approximate-static" : "source",
    // AnimateSprites advances the command interpreter after the current OAM
    // tile number has been scanned out; each command boundary is visible on
    // the following render.
    frame: frameAt(animation.spriteFrameProgram, elapsed - 1),
    animationStarted: elapsed >= 0,
  } as const;
  if (elapsed < 0) {
    return { ...base, x2: 0, y2: 0, affine: null, motionFinished: false };
  }
  switch (type) {
    case "ANIM_RAPID_H_HOPS":
      return { ...base, ...rapidHorizontalHops(elapsed, flipX), affine: null };
    case "ANIM_V_SQUISH_AND_BOUNCE":
      return { ...base, ...verticalSquishBounce(elapsed) };
    case "ANIM_H_JUMPS":
      return { ...base, ...horizontalJumps(elapsed, flipX), affine: null };
    case "ANIM_V_SLIDE":
      return { ...base, ...verticalSlide(elapsed), affine: null };
  }
  if (SIMULATED_MOTIONS[type]) return { ...base, ...simulatedMotion(type, !flipX, elapsed) };
  // Approximate fallback (sfa214): the source frame program runs, the sprite
  // holds still until this callback is transcribed. Never a throw.
  return { ...base, x2: 0, y2: 0, affine: null, motionFinished: true };
}
