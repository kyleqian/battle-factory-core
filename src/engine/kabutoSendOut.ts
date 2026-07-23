import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";

export const KABUTO_FRONT_ANIM_START_OFFSET = 35;
export const KABUTO_FRONT_ANIM_END_OFFSET = KABUTO_FRONT_ANIM_START_OFFSET + 101;
export const KABUTO_BALL_BOUNDARIES = {
  closedStart: 2,
  openStart: 18,
  finalStart: 23,
  hiddenStart: 29,
  materializeStart: 19,
} as const;

export function kabutoBallPhase(elapsed: number): "hidden" | "closed" | "open" | "final" {
  if (elapsed < KABUTO_BALL_BOUNDARIES.closedStart || elapsed >= KABUTO_BALL_BOUNDARIES.hiddenStart) return "hidden";
  if (elapsed < KABUTO_BALL_BOUNDARIES.openStart) return "closed";
  if (elapsed < KABUTO_BALL_BOUNDARIES.finalStart) return "open";
  return "final";
}

const KABUTO_FRAME_STEPS = [
  { frame: 1 as const, duration: 8 },
  { frame: 0 as const, duration: 8 },
  { frame: 1 as const, duration: 8 },
  { frame: 0 as const, duration: 20 },
  { frame: 1 as const, duration: 8 },
  { frame: 0 as const, duration: 8 },
  { frame: 1 as const, duration: 8 },
  { frame: 0 as const, duration: 8 },
] as const;

function gbaSin(index: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((value * amplitude) / 256);
}

export interface KabutoHSlideWobble {
  readonly active: boolean;
  readonly callback: number;
  readonly frame: 0 | 1;
  readonly x2: number;
  /** GBA affine rotation, in the ObjAffineSet 0..65535 turn domain. */
  readonly rotation: number;
}

function kabutoFrame(callback: number): 0 | 1 {
  let consumed = 0;
  for (const step of KABUTO_FRAME_STEPS) {
    if (callback < consumed + step.duration) return step.frame;
    consumed += step.duration;
  }
  return KABUTO_FRAME_STEPS[KABUTO_FRAME_STEPS.length - 1]!.frame;
}

/**
 * Source-faithful reducer for `Anim_HorizontalSlideWobble`.
 *
 * `elapsed` is relative to the opponent send-out visual handoff. Callback
 * data[2] runs 0..100 inclusive; callback 101 resets the sprite. The front
 * frame animation is concurrent and begins on the same callback.
 */
export function kabutoHSlideWobble(elapsed: number): KabutoHSlideWobble {
  const visibleAge = elapsed - KABUTO_FRONT_ANIM_START_OFFSET;
  if (visibleAge < 0 || visibleAge > 101) {
    return { active: false, callback: visibleAge - 1, frame: 0, x2: 0, rotation: 0 };
  }
  // The callback's OAM writes latch on the following display frame. The
  // entrance boundary itself therefore shows callback 0's neutral pose,
  // and the next display frame still carries that same callback-0 result.
  const callback = Math.max(0, visibleAge - 1);
  if (callback > 100) {
    return { active: false, callback, frame: 0, x2: 0, rotation: 0 };
  }
  const xIndex = Math.trunc((callback * 256) / 100);
  const rotationIndex = Math.trunc((callback * 512) / 100) & 0xff;
  return {
    active: true,
    callback,
    // Sprite ANIMCMD playback is latched independently of the mon-animation
    // callback's OAM writes, so its visible command age is `visibleAge`.
    frame: kabutoFrame(visibleAge),
    x2: gbaSin(xIndex, 8),
    rotation: gbaSin(rotationIndex, 3276) & 0xffff,
  };
}
