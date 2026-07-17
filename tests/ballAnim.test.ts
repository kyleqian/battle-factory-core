// Hermetic Tier-1 tests for SpriteCB_Pokeball's RNG-consuming idle/rocking
// animation (S5): pins the engine's combined per-VBlank + ball-roll RNG
// stream against dev-time RAM-dumped gRngValue checkpoints (dossier method
// 2 - see docs/rent-flow-notes.md Risk 1-2 and ROADMAP.md's RNG domain
// note). No oracle, no pixels here - tools/compare/traces/rent-slot1.json is
// the pixel-level parity check.
//
// Checkpoints below are from a single dense RAM probe (dev-time recipe, see
// tools/extract/inspect-anchor.py's docstring; scratch script not committed
// per instructions) replaying this exact button script from the anchor: A
// held frames 1-2 (open ball 1's popup), idle 3-30, DOWN held 31-32 (menu
// cursor to RENT), idle 33-36, A held 37-38 (RENT confirm), idle thereafter.
// `tick()` calls below are 1-indexed to match the probe's `oracle.advance()`
// call count, i.e. `state.frame === k` after the k-th tick() call.

import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { ANCHOR_RNG_VALUE } from "../src/engine/rng.ts";
import type { GbaButton } from "../src/input.ts";

const RENT_SLOT1_SEGMENTS: [number, GbaButton | null][] = [
  [2, "A"],
  [28, null],
  [2, "DOWN"],
  [4, null],
  [2, "A"],
];

function replayTo(targetFrame: number) {
  let state = createInitialState();
  const buttonsAtFrame: (GbaButton | null)[] = [];
  for (const [count, button] of RENT_SLOT1_SEGMENTS) {
    for (let i = 0; i < count; i += 1) buttonsAtFrame.push(button);
  }
  while (buttonsAtFrame.length < targetFrame) buttonsAtFrame.push(null);
  for (let i = 0; i < targetFrame; i += 1) {
    const button = buttonsAtFrame[i];
    state = tick(state, button ? new Set([button]) : new Set());
  }
  return state;
}

describe("SpriteCB_Pokeball RNG stream (RAM-dumped checkpoints)", () => {
  it("anchor gRngValue at frame 0 matches the RAM-verified constant", () => {
    expect(createInitialState().rngValue >>> 0).toBe(ANCHOR_RNG_VALUE);
  });

  it("advances by exactly 1 LCG step/frame before any ball is rented", () => {
    const state = replayTo(36);
    // RAM: gRngValue at frame 36 is 0xeff4a54c (36 steps from the anchor).
    expect(state.rngValue >>> 0).toBe(0xeff4a54c);
  });

  it("RENT confirm (frame 37) swaps the ball palette same-tick, still 1 step/frame", () => {
    const state = replayTo(37);
    expect(state.draftScreen.selectedIds[0]).toBe(1);
    expect(state.rngValue >>> 0).toBe(0xda4fe9cf);
  });

  it("the ball's first roll (frame 39) consumes a SECOND LCG step - a SUCCESS (data0 -> 32, rest queued)", () => {
    const state = replayTo(39);
    // RAM: gRngValue at frame 39 is 0x06b88bf0 - two LCG steps from frame 38
    // (0xb25dff96), not one, and the roll (the second step's upper 16 bits)
    // is 0 mod 5.
    expect(state.rngValue >>> 0).toBe(0x06b88bf0);
    const anim = state.draftScreen.ballAnims[0];
    expect(anim).not.toBeNull();
    expect(anim!.phase).toBe("moving");
    expect(anim!.pendingRest).toBe(32);
  });

  it("a later roll (frame 201) is a FAILURE (pendingRest 0, straight back into moving)", () => {
    const state = replayTo(201);
    // RAM: gRngValue at frame 201 is 0x22891065 - the second roll this ball
    // makes (first succeeded at 39, its 32-tick rest ends here), and this
    // one fails (data0 stays 0) - both a SUCCESS and a FAILURE roll are
    // pinned so the % 5 == 0 branch itself is exercised, not just the
    // advance cadence.
    expect(state.rngValue >>> 0).toBe(0x22891065);
    const anim = state.draftScreen.ballAnims[0];
    expect(anim!.phase).toBe("moving");
    expect(anim!.pendingRest).toBe(0);
  });
});
