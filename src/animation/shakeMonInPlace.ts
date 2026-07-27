export interface ShakeMonInPlaceOffset {
  readonly x2: number;
  readonly y2: number;
}

/**
 * 1:1 state-machine port of `AnimTask_ShakeMonInPlace`.
 *
 * Tick 0 includes the initializer's offset addition and its synchronous first
 * call to `AnimTask_ShakeMonInPlace_Step`. The returned offsets are relative
 * to the battler's values immediately before task creation.
 */
export function shakeMonInPlaceSequence(
  xOffset: number,
  yOffset: number,
  numShakes: number,
  frameDelay: number,
): readonly ShakeMonInPlaceOffset[] {
  if (numShakes <= 0) return [];
  const sequence: ShakeMonInPlaceOffset[] = [];
  let x2 = xOffset;
  let y2 = yOffset;
  let shakeIndex = 0;
  let delayCounter = 0;

  for (;;) {
    if (delayCounter === 0) {
      const sign = shakeIndex & 1 ? 1 : -1;
      x2 += sign * xOffset * 2;
      y2 += sign * yOffset * 2;
      delayCounter = frameDelay;
      shakeIndex += 1;
      if (shakeIndex >= numShakes) {
        const restoreSign = shakeIndex & 1 ? 1 : -1;
        x2 += restoreSign * xOffset;
        y2 += restoreSign * yOffset;
        sequence.push({ x2, y2 });
        break;
      }
    } else {
      delayCounter -= 1;
    }
    sequence.push({ x2, y2 });
  }
  return sequence;
}

export function shakeMonInPlaceOffsetAtTick(
  xOffset: number,
  yOffset: number,
  numShakes: number,
  frameDelay: number,
  ticksSinceCreation: number,
): ShakeMonInPlaceOffset {
  if (ticksSinceCreation < 0) return { x2: 0, y2: 0 };
  return shakeMonInPlaceSequence(
    xOffset,
    yOffset,
    numShakes,
    frameDelay,
  )[ticksSinceCreation] ?? { x2: 0, y2: 0 };
}
