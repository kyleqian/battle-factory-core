/**
 * Source-callback reducers for MOVE_HELPING_HAND's success-only presentation.
 *
 * These functions intentionally use callback age rather than an asserted
 * battle-frame age.  Battle Factory's current mechanicLab contract is singles
 * only, where Cmd_trysethelpinghand branches before attackanimation.  The
 * source bodies remain useful and independently testable, but wiring them to
 * the Scene-ON compositor requires a future legal doubles receipt.
 */
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type HelpingHandSide = "player" | "opponent";
export type HelpingHandHand = "left" | "right";

/** Includes the terminal `DestroyAnimSprite` callback; it leaves no live row. */
export const HELPING_HAND_CLAP_CALLBACKS = 60;
export const HELPING_HAND_MOVEMENT_CALLBACKS = 61;
export const HELPING_HAND_BLEND_CALLBACKS = 24;

export interface HelpingHandClapState {
  readonly alive: boolean;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly tileOffset: 0 | 16;
  readonly hFlip: boolean;
}

/** One `AnimHelpingHandClap_Step` callback at a time, including teardown. */
export function helpingHandClapAtTick(
  hand: HelpingHandHand,
  tick: number,
): HelpingHandClapState | null {
  // The last source callback (tick 59) calls DestroyAnimSprite after its
  // final x write, so the post-callback sprite table has no live hand row.
  if (tick < 0 || tick >= HELPING_HAND_CLAP_CALLBACKS - 1) return null;
  const direction = hand === "left" ? 1 : -1;
  let x = hand === "left" ? 100 : 140;
  let y = 56;
  let x2 = 0;
  let phase = 0;
  let timer = 0;
  let tileOffset: 0 | 16 = 0;

  for (let callback = 0; callback <= tick; callback += 1) {
    switch (phase) {
      case 0:
        y -= direction * 2;
        if (timer & 1) x -= direction * 2;
        timer += 1;
        if (timer === 9) { timer = 0; phase += 1; }
        break;
      case 1:
        timer += 1;
        if (timer === 4) { timer = 0; phase += 1; }
        break;
      case 2:
        timer += 1;
        y += direction * 3;
        x2 = direction * (sine(timer * 10) >> 3);
        if (timer === 12) { timer = 0; phase += 1; }
        break;
      case 3:
        timer += 1;
        if (timer === 2) { timer = 0; phase += 1; }
        break;
      case 4:
        timer += 1;
        y -= direction * 3;
        x2 = direction * (sine(timer * 10) >> 3);
        if (timer === 12) phase += 1;
        break;
      case 5:
        timer += 1;
        y += direction * 3;
        x2 = direction * (sine(timer * 10) >> 3);
        if (timer === 15) tileOffset = 16;
        if (timer === 18) { timer = 0; phase += 1; }
        break;
      case 6:
        x += direction * 6;
        timer += 1;
        if (timer === 9) { timer = 0; phase += 1; }
        break;
      case 7:
        x += direction * 2;
        timer += 1;
        if (timer === 1) { timer = 0; phase += 1; }
        break;
      case 8:
        x -= direction * 3;
        timer += 1;
        break;
    }
  }
  return { alive: true, x, y, x2, tileOffset, hFlip: hand === "left" };
}

/** Source `AnimTask_HelpingHandAttackerMovement_Step` x2 after each callback. */
export function helpingHandAttackerX2AtTick(
  side: HelpingHandSide,
  tick: number,
): number {
  if (tick < 0 || tick >= HELPING_HAND_MOVEMENT_CALLBACKS) return 0;
  const direction = side === "player" ? -1 : 1;
  let phase = 0;
  let timer = 0;
  let repeats = 0;
  let x2 = 0;
  for (let callback = 0; callback <= tick; callback += 1) {
    switch (phase) {
      case 0:
        timer += 1;
        if (timer === 13) { timer = 0; phase += 1; }
        break;
      case 1:
        x2 -= direction * 3;
        timer += 1;
        if (timer === 6) { timer = 0; phase += 1; }
        break;
      case 2:
        x2 += direction * 3;
        timer += 1;
        if (timer === 6) { timer = 0; phase += 1; }
        break;
      case 3:
        timer += 1;
        if (timer === 2) {
          timer = 0;
          if (repeats === 0) { repeats += 1; phase = 1; }
          else phase += 1;
        }
        break;
      case 4:
        x2 += direction;
        timer += 1;
        if (timer === 3) { timer = 0; phase += 1; }
        break;
      case 5:
        timer += 1;
        if (timer === 6) { timer = 0; phase += 1; }
        break;
      case 6:
        x2 -= direction * 4;
        timer += 1;
        if (timer === 5) { timer = 0; phase += 1; }
        break;
      case 7:
        x2 += direction * 4;
        timer += 1;
        if (timer === 5) { timer = 0; phase += 1; }
        break;
      case 8:
        x2 = 0;
        break;
    }
  }
  return x2;
}

/** `AnimTask_BlendMonInAndOut(…, RGB_YELLOW, 12, 1, 1)` callback coefficient. */
export function helpingHandPartnerBlendAtTick(tick: number): number {
  if (tick < 0 || tick >= HELPING_HAND_BLEND_CALLBACKS) return 0;
  return tick < 12 ? tick + 1 : 23 - tick;
}

/** The three literal partner-shake schedules in Move_HELPING_HAND. */
export function helpingHandPartnerShakeAtTick(
  pulse: 0 | 1 | 2,
  tick: number,
): number {
  const [xOffset, count] = pulse === 2 ? [3, 10] : [2, 5];
  return shakeMon2OffsetAtTick(xOffset, 0, count, 1, tick).x2;
}

function sine(index: number): number {
  // `gSineTable[index]` is Q8.8 `sin(index * PI / 128)` truncated toward
  // zero (`trig.c`). The callback only uses the table values themselves;
  // this is a source-derived LUT reconstruction, not coordinate fitting.
  return Math.trunc(Math.sin(((index & 0xff) * Math.PI) / 128) * 256);
}
