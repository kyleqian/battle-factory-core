// Hermetic Tier-1 tests for the decline path (S5 slice 4,
// docs/confirm-flow-notes.md §2/§3): the YES/NO cursor's UP/DOWN toggle
// (JOY_REPEAT-gated), B/A-on-NO decline's same-tick state transitions, the
// 20-tick un-reveal's phase boundaries, and the 3rd pick's ball leaving the
// rented set on both decline paths.
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { isMonsConfirmed } from "../src/engine/factoryDraftScreen.ts";
import { getConfirmRevealVisual } from "../src/engine/confirmReveal.ts";
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

// rent-3picks.json's exact committed button prefix: 3 picks, confirms land
// at press-ticks 37/113/189 (RAM-pinned, ballAnimMultiBall.test.ts).
const PICK = (): Segment[] => [
  [2, "A"],
  [28, null],
  [2, "DOWN"],
  [4, null],
  [2, "A"],
];
const RENT_3PICKS: Segment[] = [...PICK(), [36, null], [2, "RIGHT"], ...PICK(), [36, null], [2, "RIGHT"], ...PICK()];

// The 3rd confirm's own popup close finishes at +19, the reveal itself
// settles into "shown" with the cursor visible 26 ticks later (see
// confirmReveal.test.ts) - +45 lands comfortably past that settle.
const SHOWN_SETTLED = 45;

function shownState(extraTicks = 0): Segment[] {
  return [...RENT_3PICKS, [SHOWN_SETTLED + extraTicks, null]];
}

describe("YES/NO cursor: UP/DOWN toggle, JOY_REPEAT-gated", () => {
  it("defaults to YES (0) once the popup settles", () => {
    const state = replay(shownState());
    expect(state.draftScreen.confirmReveal?.phase).toBe("shown");
    expect(state.draftScreen.yesNoCursorPos).toBe(0);
  });

  it("a single DOWN tap moves the cursor to NO (1); a further tap wraps back to YES", () => {
    const afterDown = replay([...shownState(), [2, "DOWN"]]);
    expect(afterDown.draftScreen.yesNoCursorPos).toBe(1);
    const afterDownUp = replay([...shownState(), [2, "DOWN"], [2, "UP"]]);
    expect(afterDownUp.draftScreen.yesNoCursorPos).toBe(0);
  });

  it("holding DOWN repeats at tick 41, then every 5 ticks (main.c key-repeat timing, same rule as every other cursor)", () => {
    let state = replay(shownState());
    const positions: number[] = [];
    for (let i = 0; i < 46; i += 1) {
      state = tick(state, new Set(["DOWN"]));
      positions.push(state.draftScreen.yesNoCursorPos);
    }
    expect(positions[0]).toBe(1); // JOY_NEW: YES->NO
    expect(positions[39]).toBe(1); // tick 40: still NO (wrap, no-op)
    expect(positions[40]).toBe(0); // tick 41: first repeat, NO->YES
    expect(positions[44]).toBe(0);
    expect(positions[45]).toBe(1); // tick 46: second repeat (continue delay 5), YES->NO
  });
});

describe("decline: B anywhere in YES/NO", () => {
  it("same tick: selectingMonsState 4->3, the 3rd pick's selectedId clears, cursorPos unchanged, un-reveal starts", () => {
    const before = replay(shownState());
    expect(before.draftScreen.selectingMonsState).toBe(4);
    expect(before.draftScreen.selectedIds).toEqual([1, 2, 3, 0, 0, 0]);
    expect(before.draftScreen.cursorPos).toBe(2);

    const declined = replay([...shownState(), [1, "B"]]);
    expect(declined.draftScreen.selectingMonsState).toBe(3);
    expect(declined.draftScreen.selectedIds).toEqual([1, 2, 0, 0, 0, 0]);
    expect(declined.draftScreen.cursorPos).toBe(2);
    expect(isMonsConfirmed(declined.draftScreen.selectingMonsState)).toBe(false);
    expect(declined.draftScreen.confirmReveal?.phase).toBe("closing");
    expect(declined.draftScreen.confirmReveal?.elapsed).toBe(0);
  });

  it("picks 1/2 (slots 0/1) are untouched", () => {
    const declined = replay([...shownState(), [1, "B"]]);
    expect(declined.draftScreen.selectedIds[0]).toBe(1);
    expect(declined.draftScreen.selectedIds[1]).toBe(2);
  });

  it("the 3rd pick's ball leaves the rented set (ballAnims[2] becomes null) the same tick", () => {
    const before = replay(shownState());
    expect(before.draftScreen.ballAnims[2]).not.toBeNull();
    const declined = replay([...shownState(), [1, "B"]]);
    expect(declined.draftScreen.ballAnims[2]).toBeNull();
  });

  it("ISSUES #12: the declined slot's pre-decline ballAnim is snapshotted onto confirmReveal, exposed through elapsed 0-2, and gone by elapsed 3 (oracle-pixel-verified: the window's ball-grid layer keeps rendering it selected/frozen for exactly that hold)", () => {
    const before = replay(shownState());
    const preDeclineAnim = before.draftScreen.ballAnims[2];
    expect(preDeclineAnim).not.toBeNull();

    const at0 = replay([...shownState(), [1, "B"]]);
    expect(at0.draftScreen.confirmReveal?.decliningBallAnim).toEqual(preDeclineAnim);
    expect(getConfirmRevealVisual(at0.draftScreen.confirmReveal).decliningBallAnim).toEqual(preDeclineAnim);

    const at1 = replay([...shownState(), [1, "B"], [1, null]]);
    expect(getConfirmRevealVisual(at1.draftScreen.confirmReveal).decliningBallAnim).toEqual(preDeclineAnim);

    const at2 = replay([...shownState(), [1, "B"], [2, null]]);
    expect(getConfirmRevealVisual(at2.draftScreen.confirmReveal).decliningBallAnim).toEqual(preDeclineAnim);

    const at3 = replay([...shownState(), [1, "B"], [3, null]]);
    expect(getConfirmRevealVisual(at3.draftScreen.confirmReveal).decliningBallAnim).toBeNull();
  });

  it("info text reverts to 'Select the third POKéMON.' (after the redraw lag settles)", () => {
    const declined = replay([...shownState(), [1, "B"], [3, null]]);
    expect(declined.draftScreen.message).toBe("Select the third POKéMON.");
  });

  it("ISSUES #12 root cause #2: YES/NO text erases at elapsed 1 (one tick before the old elapsed===2 cutoff), the cursor highlight lags a further tick behind and only erases at elapsed 3 (oracle-pixel-verified: confirm-decline.json frames 253-256, WIN_OPTIONS glyph clusters + highlight red pixels)", () => {
    const at0 = getConfirmRevealVisual(replay([...shownState(), [1, "B"]]).draftScreen.confirmReveal);
    expect(at0.yesNoVisible).toBe(true);
    expect(at0.cursorVisible).toBe(true);

    const at1 = getConfirmRevealVisual(replay([...shownState(), [1, "B"], [1, null]]).draftScreen.confirmReveal);
    expect(at1.yesNoVisible).toBe(false);
    expect(at1.cursorVisible).toBe(true);

    const at2 = getConfirmRevealVisual(replay([...shownState(), [1, "B"], [2, null]]).draftScreen.confirmReveal);
    expect(at2.yesNoVisible).toBe(false);
    expect(at2.cursorVisible).toBe(true);

    const at3 = getConfirmRevealVisual(replay([...shownState(), [1, "B"], [3, null]]).draftScreen.confirmReveal);
    expect(at3.yesNoVisible).toBe(false);
    expect(at3.cursorVisible).toBe(false);
  });
});

describe("decline: A while the cursor is on NO - source-identical to B", () => {
  it("produces the exact same same-tick transitions as a B decline", () => {
    const viaB = replay([...shownState(), [2, "DOWN"], [4, null], [1, "B"]]);
    const viaA = replay([...shownState(), [2, "DOWN"], [4, null], [1, "A"]]);
    expect(viaA.draftScreen.selectingMonsState).toBe(viaB.draftScreen.selectingMonsState);
    expect(viaA.draftScreen.selectedIds).toEqual(viaB.draftScreen.selectedIds);
    expect(viaA.draftScreen.cursorPos).toBe(viaB.draftScreen.cursorPos);
    expect(viaA.draftScreen.confirmReveal?.phase).toBe(viaB.draftScreen.confirmReveal?.phase);
    expect(viaA.draftScreen.ballAnims[2]).toBeNull();
  });
});

describe("A while the cursor is on YES: accept path (S5 final slice, see prebattleRoom.ts)", () => {
  it("starts the same 20-tick closing/un-reveal as decline, but with accepting:true and no deselection", () => {
    const state = replay([...shownState(), [1, "A"]]);
    expect(state.draftScreen.confirmReveal?.phase).toBe("closing");
    expect(state.draftScreen.confirmReveal?.elapsed).toBe(0);
    expect((state.draftScreen.confirmReveal as { accepting?: boolean })?.accepting).toBe(true);
    // Unlike decline: nothing about the 3 picks changes.
    expect(state.draftScreen.selectingMonsState).toBe(4);
    expect(state.draftScreen.selectedIds).toEqual([1, 2, 3, 0, 0, 0]);
  });

  it("hands off to prebattleRoom (fadingOut) the same tick the closing animation completes, without re-opening confirmReveal", () => {
    const at19 = replay([...shownState(), [1, "A"], [19, null]]);
    expect(at19.prebattleRoom).toBeNull();
    expect(at19.draftScreen.confirmReveal?.phase).toBe("closing");

    const at20 = replay([...shownState(), [1, "A"], [20, null]]);
    expect(at20.prebattleRoom).toEqual({ phase: "fadingOut", elapsed: 0 });
    expect(at20.draftScreen.confirmReveal).toBeNull();

    const at21 = replay([...shownState(), [1, "A"], [21, null]]);
    expect(at21.prebattleRoom).toEqual({ phase: "fadingOut", elapsed: 1 });
  });
});

describe("un-reveal: 20-tick phase boundary, then immediate re-pickability", () => {
  it("confirmReveal stays 'closing' through elapsed 19, then goes null at tick+20", () => {
    const at19 = replay([...shownState(), [1, "B"], [19, null]]);
    expect(at19.draftScreen.confirmReveal?.phase).toBe("closing");
    expect(at19.draftScreen.confirmReveal?.elapsed).toBe(19);

    const at20 = replay([...shownState(), [1, "B"], [20, null]]);
    expect(at20.draftScreen.confirmReveal).toBeNull();
  });

  it("cursor-mode input (RIGHT) is dropped while closing, but works again the same tick confirmReveal clears", () => {
    const cursorBefore = replay([...shownState(), [1, "B"], [18, null]]).draftScreen.cursorPos;
    const stillClosing = replay([...shownState(), [1, "B"], [18, null], [2, "RIGHT"]]);
    expect(stillClosing.draftScreen.cursorPos).toBe(cursorBefore); // dropped

    const justCleared = replay([...shownState(), [1, "B"], [20, null], [2, "RIGHT"]]);
    expect(justCleared.draftScreen.cursorPos).not.toBe(cursorBefore); // accepted
  });

  it("A on the (now-gray, re-pickable) 3rd ball re-opens its popup after the un-reveal settles", () => {
    const state = replay([...shownState(), [1, "B"], [20, null], [20, null], [2, "A"]]);
    expect(state.draftScreen.mode).toBe("menu");
    expect(state.draftScreen.monPic.phase).toBe("opening");
  });
});

describe("balls 1-2 keep rocking/rolling through the decline dwell and the un-reveal (notes §4)", () => {
  it("ballAnims[0]/[1] stay non-null and keep advancing across the whole closing window", () => {
    const before = replay(shownState());
    const mid = replay([...shownState(), [1, "B"], [10, null]]);
    const after = replay([...shownState(), [1, "B"], [20, null]]);
    expect(before.draftScreen.ballAnims[0]).not.toBeNull();
    expect(before.draftScreen.ballAnims[1]).not.toBeNull();
    expect(mid.draftScreen.ballAnims[0]).not.toBeNull();
    expect(mid.draftScreen.ballAnims[1]).not.toBeNull();
    expect(after.draftScreen.ballAnims[0]).not.toBeNull();
    expect(after.draftScreen.ballAnims[1]).not.toBeNull();
  });
});

describe("ISSUES #13: Select_Task_CloseChosenMonPics's own per-frame creation cost stalls the still-active balls' own internal cmdIndex advance by exactly 1 more tick (RAM/pixel-verified: confirm-decline.json's grid-slot ball icons ran 1 tick early on every subsequent MOVING_CMDS transition, a permanent downstream shift, until this stall landed)", () => {
  it("ballAnimStall lists every still-active slot (0/1, not the already-null declined slot 2) on BOTH the decline tick itself (Select_PrintSelectMonString's own knock-on cost, ISSUES #6) AND the very next tick (this session's new stall), then goes empty again", () => {
    const at0 = replay([...shownState(), [1, "B"]]);
    expect(at0.draftScreen.ballAnimStall).toEqual([0, 1]);

    const at1 = replay([...shownState(), [1, "B"], [1, null]]);
    expect(at1.draftScreen.ballAnimStall).toEqual([0, 1]);

    const at2 = replay([...shownState(), [1, "B"], [2, null]]);
    expect(at2.draftScreen.ballAnimStall).toEqual([]);
  });

  it("the stalled slots' own advanceBallAnim call is skipped entirely for both stalled ticks (cmdIndex/timer/displayTile all frozen through elapsed 2, resuming only at elapsed 3)", () => {
    const at0 = replay([...shownState(), [1, "B"]]).draftScreen.ballAnims[0];
    const at1 = replay([...shownState(), [1, "B"], [1, null]]).draftScreen.ballAnims[0];
    const at2 = replay([...shownState(), [1, "B"], [2, null]]).draftScreen.ballAnims[0];
    const at3 = replay([...shownState(), [1, "B"], [3, null]]).draftScreen.ballAnims[0];
    expect(at1).toEqual(at0);
    expect(at2).toEqual(at0);
    expect(at3).not.toEqual(at0);
  });
});

describe("ISSUES #13 residual: the closing zoom-out's own final width-1 flash pixel outlives confirmReveal by exactly 1 tick (oracle-pixel-verified: confirm-decline.json frame 273)", () => {
  it("closingFlashResidual is true for exactly the tick confirmReveal goes null at the end of the 20-tick un-reveal, then false again", () => {
    const at19 = replay([...shownState(), [1, "B"], [19, null]]);
    expect(at19.draftScreen.confirmReveal?.elapsed).toBe(19);
    expect(at19.draftScreen.closingFlashResidual).toBe(false);

    const at20 = replay([...shownState(), [1, "B"], [20, null]]);
    expect(at20.draftScreen.confirmReveal).toBeNull();
    expect(at20.draftScreen.closingFlashResidual).toBe(true);

    const at21 = replay([...shownState(), [1, "B"], [21, null]]);
    expect(at21.draftScreen.confirmReveal).toBeNull();
    expect(at21.draftScreen.closingFlashResidual).toBe(false);
  });
});
