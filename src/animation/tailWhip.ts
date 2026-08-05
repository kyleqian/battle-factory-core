import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type TailWhipSide = "player" | "opponent";

export interface TailWhipState {
  readonly active: boolean;
  readonly ellipseLoaded: boolean;
  readonly attackerX2: number;
  readonly attackerY2: number;
  readonly scriptOffset: 0 | 23 | 24;
}

/**
 * Dense Scene-ON window for `Move_TAIL_WHIP`: first active source frame
 * (scriptOffset 0, `loopsewithpan`) through the first inactive cleanup
 * frame. Measured 77 frames for both the player-back Ponyta and
 * opponent-front Ponyta orientations.
 */
export const TAIL_WHIP_FRAME_COUNT = 77;
/** First displayed `AnimTask_TranslateMonEllipticalRespectSide` step. */
export const TAIL_WHIP_FIRST_OFFSET_AGE = 1;
/** Last displayed ellipse offset (θ=240); the terminal θ=248 wrap resets. */
export const TAIL_WHIP_LAST_OFFSET_AGE = 62;
/** Elliptical task exists from its creation frame through its last step. */
export const TAIL_WHIP_LAST_TASK_AGE = 62;

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

/**
 * `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER, 12, 4, 2, 3)`.
 *
 * Speed 3 -> wavePeriod 8, two loops. The reducer age is the dense-window
 * index: the creation frame (age 1) already shows the first scheduled step
 * (θ=8), so the displayed angle is `8 * age`. The loop-1 wrap lands on age 32
 * where θ wraps to 0 and renders the origin; the final θ=248 wrap on age 62 is
 * the last displayed offset before the task destroys itself (age 63), so the
 * active range is ages 1..62. The width is negated for the opponent side
 * (`RespectSide`), mirroring the source's `GetBattlerSide` branch.
 */
export function tailWhipAttackerOffset(
  age: number,
  attackerSide: TailWhipSide,
): Readonly<{ x2: number; y2: number }> {
  if (age < TAIL_WHIP_FIRST_OFFSET_AGE || age > TAIL_WHIP_LAST_OFFSET_AGE) {
    return { x2: 0, y2: 0 };
  }
  const angle = 8 * age;
  const width = attackerSide === "player" ? 12 : -12;
  return {
    x2: gbaSin(angle, width),
    y2: -gbaSin(angle + 64, 4) + 4,
  };
}

/**
 * Pure source-relative port of the complete `Move_TAIL_WHIP` presentation
 * body. `loopsewithpan` and the single elliptical visual task are the only
 * script commands; the reducer never reads a battle clock and never mutates
 * stat stages or RNG (the target's Defense drop is an immutable field input).
 */
export function tailWhipAtAge(
  age: number,
  attackerSide: TailWhipSide,
): TailWhipState {
  const offset = tailWhipAttackerOffset(age, attackerSide);
  return {
    active: age >= 0 && age < TAIL_WHIP_FRAME_COUNT - 1,
    ellipseLoaded: age >= 1 && age <= TAIL_WHIP_LAST_TASK_AGE,
    attackerX2: offset.x2,
    attackerY2: offset.y2,
    scriptOffset: age === 0 ? 0 : age < 64 ? 23 : 24,
  };
}
