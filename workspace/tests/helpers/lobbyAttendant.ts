import { tick, type EngineState } from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";

export interface AttendantDrive {
  readonly state: EngineState;
  /** The state on the tick before the one that handed off to the draft. */
  readonly beforeHandoff: EngineState;
  readonly frames: number;
}

/** Tap A (2 held, `gap` released) through the attendant conversation until the Lobby hands off to the new draft. */
export function driveAttendantConversation(start: EngineState, gap = 6, limit = 4000): AttendantDrive {
  let state = start;
  let beforeHandoff = start;
  let frames = 0;
  const A = new Set<GbaButton>(["A"]);
  const idle = new Set<GbaButton>();
  while (state.lobbyFreeRoam !== null && frames < limit) {
    for (const keys of [A, A, ...Array.from({ length: gap }, () => idle)]) {
      beforeHandoff = state;
      state = tick(state, keys);
      frames += 1;
      if (state.lobbyFreeRoam === null) return { state, beforeHandoff, frames };
    }
  }
  if (state.lobbyFreeRoam !== null) throw new Error(`attendant conversation did not finish in ${limit} frames`);
  return { state, beforeHandoff, frames };
}
