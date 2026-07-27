/**
 * 1:1 port of `AnimTask_ShakeMon2` / `AnimTask_ShakeMon2_Step`
 * (`reference/pokeemerald/src/battle_anim_mon_movement.c:155-238`).
 *
 * A DIFFERENT source task from `AnimTask_ShakeMon` (`shakeMon.ts`): the
 * offsets set at creation (tick 0) are held, then every later toggle event
 * flips `x2`/`y2` between `+offset` and `-offset` (never returning to zero
 * mid-sequence) until the final toggle forces zero and self-destroys. Only
 * the general shape - a parametric, tick-driven task state machine - is
 * shared with `shakeMon.ts`, per `ANIMATION_PROGRESS.md`'s "MIST_BALL
 * remainder, rungs 1-2" warning; no code carries over.
 */
export interface ShakeMon2Offset {
  readonly x2: number;
  readonly y2: number;
}

/** The full `x2`/`y2` timeline from creation (tick 0) to self-destroy. */
export function shakeMon2Sequence(
  xOffset: number,
  yOffset: number,
  numTimes: number,
  frameDelay: number,
): readonly ShakeMon2Offset[] {
  const sequence: ShakeMon2Offset[] = [];
  let x2 = xOffset;
  let y2 = yOffset;
  let remaining = numTimes;
  let delayCounter = frameDelay;
  for (;;) {
    if (delayCounter === 0) {
      // `0 - offset` rather than `-offset`: avoids emitting `-0` when
      // `offset` is 0 (both call sites' `yOffset`), which would otherwise
      // fail strict equality against a plain `0` despite being numerically
      // identical.
      x2 = x2 === xOffset ? 0 - xOffset : xOffset;
      y2 = y2 === yOffset ? 0 - yOffset : yOffset;
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
export function shakeMon2OffsetAtTick(
  xOffset: number,
  yOffset: number,
  numTimes: number,
  frameDelay: number,
  tick: number,
): ShakeMon2Offset {
  if (tick < 0) return { x2: 0, y2: 0 };
  const sequence = shakeMon2Sequence(xOffset, yOffset, numTimes, frameDelay);
  return sequence[tick] ?? { x2: 0, y2: 0 };
}
