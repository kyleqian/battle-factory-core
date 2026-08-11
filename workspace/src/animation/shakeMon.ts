/**
 * 1:1 port of `AnimTask_ShakeMon` / `AnimTask_ShakeMon_Step`
 * (`reference/pokeemerald/src/battle_anim_mon_movement.c:87-141`).
 *
 * The source task sets `x2`/`y2` to the given offsets immediately at
 * creation, then calls its own step function once synchronously (that
 * combined event is this port's tick 0 — the "creation/display latch").
 * Every later tick toggles the offsets between zero and the given values
 * every `frameDelay` ticks, `numTimes` times, then restores zero and
 * self-destroys. This does NOT cover `AnimTask_ShakeMon2`, a different
 * source task (positive/negative alternation, not on/off toggling).
 */
export interface ShakeMonOffset {
  readonly x2: number;
  readonly y2: number;
}

/** The full `x2`/`y2` timeline from creation (tick 0) to self-destroy. */
export function shakeMonSequence(
  xOffset: number,
  yOffset: number,
  numTimes: number,
  frameDelay: number,
): readonly ShakeMonOffset[] {
  const sequence: ShakeMonOffset[] = [];
  let x2 = xOffset;
  let y2 = yOffset;
  let remaining = numTimes;
  let delayCounter = frameDelay;
  for (;;) {
    if (delayCounter === 0) {
      x2 = x2 === 0 ? xOffset : 0;
      y2 = y2 === 0 ? yOffset : 0;
      delayCounter = frameDelay;
      remaining -= 1;
      if (remaining === 0) {
        sequence.push({ x2: 0, y2: 0 });
        break;
      }
    } else {
      delayCounter -= 1;
    }
    sequence.push({ x2, y2 });
  }
  return sequence;
}

/** `offset` at `tick` ticks after creation; zero once the task has self-destroyed or before creation. */
export function shakeMonOffsetAtTick(
  xOffset: number,
  yOffset: number,
  numTimes: number,
  frameDelay: number,
  tick: number,
): ShakeMonOffset {
  if (tick < 0) return { x2: 0, y2: 0 };
  const sequence = shakeMonSequence(xOffset, yOffset, numTimes, frameDelay);
  return sequence[tick] ?? { x2: 0, y2: 0 };
}
