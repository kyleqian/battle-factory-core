// Hermetic Tier-1 test for the post-RENT-confirm cursor-input gate (ISSUES
// #7's "worker update" bug): real hardware's Select_Task_HandleChooseMons
// (reference/pokeemerald/src/battle_factory_screen.c:1671-1673) early-returns
// - dropping LEFT/RIGHT/A-open alike - for as long as
// sFactorySelectScreen->monPicAnimating is TRUE, which stays TRUE for the
// entire CloseMonPic animation (window shrink + flash shrink), not just its
// first tick. Direct-RAM-verified (dev-time EmeraldOracle probe, scratch
// script not committed, method: tools/extract/inspect-anchor.py's read_u8
// pattern against sFactorySelectScreen->monPicAnimating and ->cursorPos)
// replaying the exact RENT_SLOT1 button script pinned in
// tests/ballAnimMultiBall.test.ts (confirm A lands at press-tick 37): a
// RIGHT sent at tick 56 is silently dropped (cursorPos stays 0, matching
// real hardware's own drop the prior session found at a 10-tick dwell); a
// RIGHT sent at tick 57 (the tick monPicAnimating first reads FALSE) is
// accepted (cursorPos becomes 1) - see monPic.ts's isCursorInputReady doc.
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";

type Segment = [number, GbaButton | null];

function replay(segments: Segment[]) {
  let state = createInitialState();
  for (const [count, button] of segments) {
    for (let i = 0; i < count; i += 1) {
      state = tick(state, button ? new Set([button]) : new Set());
    }
  }
  return state;
}

// RENT_SLOT1 (RAM-pinned baseline, ballAnim.test.ts/ballAnimMultiBall.test.ts):
// open A frames 1-2, idle to 30, DOWN 31-32, idle to 36, RENT-confirm A 37-38.
const RENT_SLOT1: Segment[] = [
  [2, "A"],
  [28, null],
  [2, "DOWN"],
  [4, null],
  [2, "A"],
];

function rightAtTick(tick_: number): Segment[] {
  // idle from tick 39 (end of RENT_SLOT1) up to tick_-1, then a single-frame
  // RIGHT landing exactly on tick_ (JOY_NEW, matching how the RAM probe read
  // state immediately after that one tick's advance() - a 2-frame hold would
  // fold the boundary tick's outcome into the held frame's, since real
  // hardware's key-repeat only re-evaluates JOY_NEW on the press's first
  // frame).
  const idleBefore = tick_ - 1 - 38;
  return [...RENT_SLOT1, [idleBefore, null], [1, "RIGHT"]];
}

describe("cursor-mode input gate: dropped too soon after a RENT-confirm's popup close", () => {
  it("monPic is still 'closing' at tick 56 - a RIGHT there is dropped (cursorPos stays 0)", () => {
    const state = replay(rightAtTick(56));
    expect(state.draftScreen.monPic.phase).toBe("closing");
    expect(state.draftScreen.cursorPos).toBe(0);
  });

  it("monPic flips to 'closed' at tick 57 - a RIGHT there is accepted (cursorPos becomes 1)", () => {
    const state = replay(rightAtTick(57));
    expect(state.draftScreen.monPic.phase).toBe("closed");
    expect(state.draftScreen.cursorPos).toBe(1);
  });
});
