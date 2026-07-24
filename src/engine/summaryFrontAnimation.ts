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

export type SummaryFrontMotionType =
  | "ANIM_RAPID_H_HOPS"
  | "ANIM_V_SQUISH_AND_BOUNCE"
  | "ANIM_H_JUMPS"
  | "ANIM_V_SLIDE";

export interface SummaryFrontSpritePresentation {
  readonly sourceAnimationType: SummaryFrontMotionType;
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
    readonly type: SummaryFrontMotionType;
  };
  readonly spriteFrameProgram: ReadonlyArray<{
    readonly frame: number;
    readonly duration: number;
  }> | null;
}

const sourceAnimations = new Map(
  (summaryFrontAnimationData.species as SourceAnimation[]).map((entry) => [
    entry.species.replace("SPECIES_", ""),
    entry,
  ]),
);

export const SUMMARY_INITIAL_MON_ANIMATION_START = 5;
export const SUMMARY_REPLACEMENT_MON_ANIMATION_START = 1;

export function summaryFrontAnimationForSpecies(species: string): SourceAnimation {
  const animation = sourceAnimations.get(species);
  if (!animation) throw new Error(`missing summary front animation for ${species}`);
  return animation;
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

function rapidHorizontalHops(elapsed: number): Pick<SummaryFrontSpritePresentation, "x2" | "y2" | "motionFinished"> {
  const data = elapsed < 1 ? 0 : Math.min(2064, (elapsed - 1) * 24);
  if (data > 2048) return { x2: 0, y2: 0, motionFinished: true };
  const phase = Math.floor(data / 512) % 4;
  const within = data % 512;
  let x2 = 0;
  if (phase === 0) x2 = Math.trunc((-within * 16) / 512);
  else if (phase === 1) x2 = Math.trunc(within / 32) - 16;
  else if (phase === 2) x2 = Math.trunc(within / 32);
  else x2 = Math.trunc((-within * 16) / 512) + 16;
  // Summary front sprites are flipped, so TryFlipX negates the source x2.
  return { x2: -x2, y2: -sin(within % 128, 4), motionFinished: false };
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

function horizontalJumps(elapsed: number): Pick<SummaryFrontSpritePresentation, "x2" | "y2" | "motionFinished"> {
  const counter = elapsed < 1 ? 0 : Math.min(516, (elapsed - 1) * 12);
  if (counter > 512) return { x2: 0, y2: 0, motionFinished: true };
  const phase = Math.floor(counter / 128);
  const within = counter % 128;
  let x2 = 0;
  if (phase === 0) x2 = Math.trunc((-within * 8) / 128);
  else if (phase === 1) x2 = Math.trunc(within / 16) - 8;
  else if (phase === 2) x2 = Math.trunc(within / 16);
  else x2 = Math.trunc((-within * 8) / 128) + 8;
  return { x2: -x2, y2: -sin(within, 8), motionFinished: false };
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
  const base = {
    sourceAnimationType: animation.motion.type,
    // AnimateSprites advances the command interpreter after the current OAM
    // tile number has been scanned out; each command boundary is visible on
    // the following render.
    frame: frameAt(animation.spriteFrameProgram, elapsed - 1),
    animationStarted: elapsed >= 0,
  } as const;
  if (elapsed < 0) {
    return { ...base, x2: 0, y2: 0, affine: null, motionFinished: false };
  }
  switch (animation.motion.type) {
    case "ANIM_RAPID_H_HOPS":
      return { ...base, ...rapidHorizontalHops(elapsed), affine: null };
    case "ANIM_V_SQUISH_AND_BOUNCE":
      return { ...base, ...verticalSquishBounce(elapsed) };
    case "ANIM_H_JUMPS":
      return { ...base, ...horizontalJumps(elapsed), affine: null };
    case "ANIM_V_SLIDE":
      return { ...base, ...verticalSlide(elapsed), affine: null };
  }
}
