// Hermetic Tier-1 tests for ISSUES #7's sixth-update fix: a LEFT/RIGHT
// cursor move only stalls every other currently-active ball's own
// SpriteCB_Pokeball advance when the ENTERING slot's species is NOT in
// CURSOR_MOVE_STALL_SAFE_SPECIES (factoryDraftScreen.ts) - RAM-derived
// (12/12 data points across all counts/directions/origins tried, zero
// exceptions): {BAYLEEF, HAUNTER} never stall; {MAGBY, BUTTERFREE, ONIX,
// QUILAVA} always stall. RENT/DESELECT confirms are unaffected by this set
// (always stall every other active ball, unchanged - see
// ballAnimMultiBall.test.ts). Checkpoints below are exactly the RAM-dumped
// facts quoted in ISSUES #7's "sixth worker update" (dev-time EmeraldOracle
// probes, scratch scripts under /tmp/issues7probe/, not committed) -
// `tick()` calls are 1-indexed to match the probes' own `oracle.advance()`
// call count, i.e. `state.frame === k` after the k-th tick() call.
//
// draft pool order (draft-pool-header.json): slot0 ONIX, 1 MAGBY, 2 BAYLEEF,
// 3 BUTTERFREE, 4 HAUNTER, 5 QUILAVA.
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
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

// RAM-pinned rent shape (ballAnim.test.ts/ballAnimMultiBall.test.ts): open A
// frames 1-2, idle to 30, DOWN 31-32 (menu cursor to RENT), idle to 36,
// RENT-confirm A 37-38. Reused verbatim for each subsequent rent (menu
// always reopens at menuCursorPos 0, needing the same DOWN to reach RENT).
const RENT_SLOT: Segment[] = [
  [2, "A"],
  [28, null],
  [2, "DOWN"],
  [4, null],
  [2, "A"],
];
const DWELL_40: Segment = [40, null];
const RIGHT_2F: Segment = [2, "RIGHT"];

describe("ISSUES #7 sixth update - LEFT/RIGHT stall is keyed by the entering species", () => {
  describe("Probe A shape: rent slot0, 40-tick dwells, RIGHT x4 (slots 0->1->2->3->4)", () => {
    // R1..R4 enter MAGBY/BAYLEEF/BUTTERFREE/HAUNTER respectively.
    // RAM-verified action ticks: R1=79, R2=121, R3=163, R4(decisive)=205.
    const segments: Segment[] = [
      ...RENT_SLOT,
      DWELL_40,
      RIGHT_2F, // R1: 0->1 MAGBY (stalls), action tick 79
      DWELL_40,
      RIGHT_2F, // R2: 1->2 BAYLEEF (no stall), action tick 121
      DWELL_40,
      RIGHT_2F, // R3: 2->3 BUTTERFREE (stalls), action tick 163
      DWELL_40,
      RIGHT_2F, // R4 (decisive): 3->4 HAUNTER (no stall), action tick 205
    ];

    it("reproduces the documented action ticks (cursorPos lands where RAM says it does)", () => {
      expect(replayTo(segments, 79).draftScreen.cursorPos).toBe(1);
      expect(replayTo(segments, 121).draftScreen.cursorPos).toBe(2);
      expect(replayTo(segments, 163).draftScreen.cursorPos).toBe(3);
      expect(replayTo(segments, 205).draftScreen.cursorPos).toBe(4);
    });

    it("ball0's reroll lands at tick 203, two ticks behind the unstalled baseline's tick 201 (ballAnim.test.ts) - R1(MAGBY)+R3(BUTTERFREE) each cost a tick, R2(BAYLEEF) costs nothing", () => {
      const anim = replayTo(segments, 203).draftScreen.ballAnims[0];
      expect(anim!.phase).toBe("moving");
      expect(anim!.cmdIndex).toBe(0);
    });

    it("R4 (HAUNTER) adds no further stall - ball0's next cadence transition lands exactly 4 ticks later at 207, not 208 (ISSUES #7 sixth update, decisive checkpoint)", () => {
      const anim = replayTo(segments, 207).draftScreen.ballAnims[0];
      expect(anim!.phase).toBe("moving");
      expect(anim!.cmdIndex).toBe(1);
    });
  });

  describe("Probe C shape: rent slot0, R1/R2/R3 (as above), rent slot3, RIGHT into HAUNTER at count=2", () => {
    const segments: Segment[] = [
      ...RENT_SLOT,
      DWELL_40,
      RIGHT_2F, // R1: 0->1 MAGBY (stalls)
      DWELL_40,
      RIGHT_2F, // R2: 1->2 BAYLEEF (no stall)
      DWELL_40,
      RIGHT_2F, // R3: 2->3 BUTTERFREE (stalls)
      DWELL_40,
      ...RENT_SLOT, // rent slot3 (currently-cursored BUTTERFREE) - RENT-confirm always stalls ball0, species-independent
      DWELL_40,
      RIGHT_2F, // final RIGHT: 3->4 HAUNTER, active {0,3}, action tick 283
    ];

    it("reproduces the documented action tick and active-ball set (both slot0 and slot3 rented, cursor lands on slot4)", () => {
      const state = replayTo(segments, 283);
      expect(state.draftScreen.cursorPos).toBe(4);
      expect(state.draftScreen.selectedIds[0]).toBe(1);
      expect(state.draftScreen.selectedIds[3]).toBe(2);
      expect(state.draftScreen.ballAnims[0]).not.toBeNull();
      expect(state.draftScreen.ballAnims[3]).not.toBeNull();
    });

    it("ball0's cadence gap spanning the HAUNTER move is clean: 276 -> 284, gap 8, not 285", () => {
      expect(replayTo(segments, 276).draftScreen.ballAnims[0]!.cmdIndex).toBe(10);
      expect(replayTo(segments, 284).draftScreen.ballAnims[0]!.cmdIndex).toBe(11);
    });

    it("ball3's (freshly rented at slot3) cadence gap spanning the HAUNTER move is clean: 275 -> 307, gap 32, not 308", () => {
      expect(replayTo(segments, 275).draftScreen.ballAnims[3]!.cmdIndex).toBe(8);
      expect(replayTo(segments, 307).draftScreen.ballAnims[3]!.cmdIndex).toBe(9);
    });
  });
});
