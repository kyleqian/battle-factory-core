// Hermetic Tier-1 tests for ISSUES #7's remainder (second-active-ball
// display-tile lag): pins `ballAnimTile`'s corrected per-slot display delay
// against dev-time RAM checkpoints (scratch EmeraldOracle probes, not
// committed - see PROGRESS entry 30/ISSUES #7 history for the recipe: direct
// `struct Sprite` reads of `animCmdIndex`/OAM `tileNum` (attr2 bits 0-9)
// cross-correlated tick-by-tick against raw framebuffer diffs, ~80
// transitions across both balls of a 2-rent dwell).
//
// RAM finding: real hardware's own OAM-buffer display lag from *its own*
// animCmdIndex is a uniform 1 tick for every ball, always (confirmed at ~40
// transitions per ball). Slot 0 alone needs a 2-tick `ballAnimTile` delay
// because this engine's own settling-phase internal cmdIndex model runs
// exactly 1 tick EARLY vs real hardware's animCmdIndex for slot 0
// specifically (RAM-confirmed: this engine's ball 0 hits cmdIndex 9 at tick
// 104 in the two-ball scenario below, one tick before RAM's tick 105);
// slot 1's internal cmdIndex matches RAM exactly (no offset), so it only
// needs the real 1-tick lag. See ballAnim.ts's BallAnimState.displayTile doc.
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { ballAnimTile } from "../src/engine/ballAnim.ts";
import type { GbaButton } from "../src/input.ts";

type Segment = [number, GbaButton | null];

function replayTo(segments: Segment[], targetFrame: number) {
  let state = createInitialState();
  const buttonsAtFrame: (GbaButton | null)[] = [];
  for (const [count, button] of segments) for (let i = 0; i < count; i += 1) buttonsAtFrame.push(button);
  while (buttonsAtFrame.length < targetFrame) buttonsAtFrame.push(null);
  for (let i = 0; i < targetFrame; i += 1) {
    const button = buttonsAtFrame[i];
    state = tick(state, button ? new Set([button]) : new Set());
  }
  return state;
}

// RAM-pinned rent shape (ballAnim.test.ts): open A frames 1-2, idle to 30,
// DOWN 31-32, idle to 36, RENT-confirm A 37-38.
const RENT_SLOT: Segment[] = [
  [2, "A"],
  [28, null],
  [2, "DOWN"],
  [4, null],
  [2, "A"],
];
const DWELL_36: Segment = [36, null];
const RIGHT_2F: Segment = [2, "RIGHT"];

// ISSUES #7 remainder's own minimal repro: rent slot0 (confirm@37), RIGHT
// into slot1/MAGBY (action tick 75, stalls per the species rule), rent
// slot1 (confirm@113) - the exact prefix of rent-3picks.json's 3-pick shape.
const TWO_BALL_SEGMENTS: Segment[] = [...RENT_SLOT, DWELL_36, RIGHT_2F, ...RENT_SLOT];

describe("ISSUES #7 remainder - per-slot displayTile lag (slot 0: 2 ticks, others: 1 tick)", () => {
  it("slot 0's cmdIndex8->9 transition (own settling-phase-offset quirk): internal transition at engine tick 104, displayTile updates at tick 106 (RAM: oracle pixel changes at tick 106, 2 ticks after RAM's own tick-105 cmdIndex read)", () => {
    const at104 = replayTo(TWO_BALL_SEGMENTS, 104).draftScreen.ballAnims[0]!;
    expect(at104.cmdIndex).toBe(9);
    expect(ballAnimTile(at104)).toBe(0); // still showing the old (cmdIndex 8) tile
    const at105 = replayTo(TWO_BALL_SEGMENTS, 105).draftScreen.ballAnims[0]!;
    expect(ballAnimTile(at105)).toBe(0);
    const at106 = replayTo(TWO_BALL_SEGMENTS, 106).draftScreen.ballAnims[0]!;
    expect(ballAnimTile(at106)).toBe(16); // new (cmdIndex 9) tile, now visible
  });

  it("slot 1's cmdIndex8->9 transition (no internal offset - matches RAM exactly): internal transition at engine tick 179, displayTile updates at tick 180 (RAM: oracle pixel changes at tick 180, 1 tick after tick-179 cmdIndex read - ISSUES #7's originally-reported bad frame)", () => {
    const at179 = replayTo(TWO_BALL_SEGMENTS, 179).draftScreen.ballAnims[1]!;
    expect(at179.cmdIndex).toBe(9);
    expect(ballAnimTile(at179)).toBe(0); // still showing the old (cmdIndex 8) tile
    const at180 = replayTo(TWO_BALL_SEGMENTS, 180).draftScreen.ballAnims[1]!;
    expect(ballAnimTile(at180)).toBe(16); // new (cmdIndex 9) tile, now visible - was wrongly 0 pre-fix
  });

  it("slot 1's cmdIndex9->10 transition: internal transition at engine tick 187, displayTile updates at tick 188 (RAM: oracle pixel changes at tick 188 - ISSUES #7's other originally-reported bad frame)", () => {
    const at187 = replayTo(TWO_BALL_SEGMENTS, 187).draftScreen.ballAnims[1]!;
    expect(at187.cmdIndex).toBe(10);
    expect(ballAnimTile(at187)).toBe(16); // still showing the old (cmdIndex 9) tile
    const at188 = replayTo(TWO_BALL_SEGMENTS, 188).draftScreen.ballAnims[1]!;
    expect(ballAnimTile(at188)).toBe(0); // new (cmdIndex 10) tile, now visible - was wrongly 16 pre-fix
  });
});
