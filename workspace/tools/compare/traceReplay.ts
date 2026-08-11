import {
  normalizeButtons,
  type ButtonState,
} from "../../src/input.ts";

interface TraceSegmentLike {
  readonly frames: number;
  readonly buttons?: readonly string[];
}

export interface TraceAdvance {
  /** Frame number after this input-bearing advance completes. */
  readonly frame: number;
  /** Buttons held during the advance from frame - 1 to frame. */
  readonly buttons: ButtonState;
}

/**
 * Expands segment input into the post-advance frame numbers used by both
 * appTrace and the HTTP oracle.
 */
export function* traceAdvances(
  segments: readonly TraceSegmentLike[],
): Generator<TraceAdvance> {
  let frame = 0;
  for (const segment of segments) {
    const buttons = new Set(normalizeButtons(segment.buttons ?? []));
    for (let offset = 0; offset < segment.frames; offset += 1) {
      frame += 1;
      yield { frame, buttons };
    }
  }
}
