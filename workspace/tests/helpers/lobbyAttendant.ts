import { tick, type EngineState } from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";

export interface AttendantDrive {
  readonly state: EngineState;
  /** The state on the tick before the one that handed off to the draft. */
  readonly beforeHandoff: EngineState;
  readonly frames: number;
}

/** Tap A (2 held, `gap` released) through the attendant conversation until the Lobby hands off (to the PreBattleRoom entry, lbr-e). */
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

export interface BriefingDrive {
  readonly state: EngineState;
  /** The state on the tick before the deal tick (the cursor the generator ran from). */
  readonly beforeDeal: EngineState;
  /** The deal tick's result. */
  readonly dealt: EngineState;
  readonly frames: number;
}

/** lbr-e: tap A (2 held, `gap` released) through the PreBattleRoom entry until the draft is open and idle. */
export function driveBriefing(start: EngineState, gap = 6, limit = 6000): BriefingDrive {
  if (start.prebattleEntry === null) throw new Error("driveBriefing needs a state inside the PreBattleRoom entry");
  let state = start;
  let beforeDeal = start;
  let dealt: EngineState | null = null;
  let frames = 0;
  const A = new Set<GbaButton>(["A"]);
  const idle = new Set<GbaButton>();
  while (state.prebattleEntry !== null && frames < limit) {
    for (const keys of [A, A, ...Array.from({ length: gap }, () => idle)]) {
      const prev = state;
      state = tick(state, keys);
      frames += 1;
      if (dealt === null && state.pendingGeneratedRound !== null && prev.pendingGeneratedRound === null) {
        beforeDeal = prev;
        dealt = state;
      }
      if (state.prebattleEntry === null) break;
    }
  }
  if (state.prebattleEntry !== null || dealt === null) throw new Error(`briefing did not finish in ${limit} frames`);
  return { state, beforeDeal, dealt, frames };
}
