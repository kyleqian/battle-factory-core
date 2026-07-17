// Hermetic Tier-1 tests for the ball-open/close mon-pic sub-state machine
// (S2, ISSUES.md #2): open growth steps, blend-active (window) flag, sprite/
// menu-popup visibility timing, and the two oracle-measured timing variants.
// No oracle, no pixels - see tools/compare/traces/draft-menu.json for the
// pixel-level parity check this pins the logic behind.

import { describe, expect, it } from "vitest";
import {
  advanceMonPic,
  closeMonPic,
  getMonPicVisual,
  INITIAL_MON_PIC_STATE,
  isMonPicInputReady,
  openMonPic,
  type MonPicState,
} from "../src/engine/monPic.ts";

function run(initial: MonPicState, ticks: number): MonPicState {
  let state = initial;
  for (let i = 0; i < ticks; i += 1) state = advanceMonPic(state);
  return state;
}

describe("monPic: closed/open steady states", () => {
  it("starts closed with nothing visible", () => {
    expect(INITIAL_MON_PIC_STATE.phase).toBe("closed");
    const visual = getMonPicVisual(INITIAL_MON_PIC_STATE);
    expect(visual.flashWidth).toBe(0);
    expect(visual.window).toBeNull();
    expect(visual.spriteVisible).toBe(false);
    expect(visual.menuTextVisible).toBe(false);
    expect(visual.menuHighlightVisible).toBe(false);
  });

  it("closed/open steady states never change on their own", () => {
    expect(advanceMonPic(INITIAL_MON_PIC_STATE)).toEqual(INITIAL_MON_PIC_STATE);
    const open: MonPicState = { phase: "open", elapsed: 0, variant: "A", blended: false };
    expect(advanceMonPic(open)).toEqual(open);
  });

  it("isMonPicInputReady is true only once fully open", () => {
    expect(isMonPicInputReady(INITIAL_MON_PIC_STATE)).toBe(false);
    expect(isMonPicInputReady(openMonPic(false, false))).toBe(false);
    expect(isMonPicInputReady({ phase: "open", elapsed: 0, variant: "A", blended: false })).toBe(true);
    expect(isMonPicInputReady({ phase: "closing", elapsed: 0, variant: "A", blended: false })).toBe(false);
  });
});

describe("monPic: opening (variant A - fresh from idle, oracle-measured anomaly)", () => {
  it("shows nothing for the first 3 ticks, then the flash bar grows 1,4,8,16,32,64 (each held 2 ticks)", () => {
    let state = openMonPic(false, false);
    const widths: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      widths.push(getMonPicVisual(state).flashWidth);
      state = advanceMonPic(state);
    }
    expect(widths).toEqual([0, 0, 0, 1, 1, 4, 4, 8, 8, 16, 16, 32, 32, 64, 64]);
  });

  it("the flash bar is unblended (flat native color) for the screen's first-ever open", () => {
    const state = run(openMonPic(false, false), 3);
    expect(getMonPicVisual(state).flashBlended).toBe(false);
  });

  it("the window then grows top/bottom by 4px/tick, with one duplicate-hold and one doubled step", () => {
    let state = run(openMonPic(false, false), 15);
    const windows: Array<{ top: number; bottom: number } | null> = [];
    for (let i = 0; i < 8; i += 1) {
      windows.push(getMonPicVisual(state).window);
      state = advanceMonPic(state);
    }
    expect(windows).toEqual([
      { top: 60, bottom: 69 },
      { top: 56, bottom: 73 },
      { top: 52, bottom: 77 },
      { top: 48, bottom: 81 },
      { top: 44, bottom: 85 },
      { top: 44, bottom: 85 }, // duplicate hold
      { top: 36, bottom: 93 }, // doubled step (top=40/bottom=89 never renders)
      { top: 32, bottom: 96 }, // fully open
    ]);
  });

  it("the front sprite and popup text appear 3 ticks after the window fully opens, the highlight bar 1 tick after that", () => {
    let state = run(openMonPic(false, false), 22); // window just reached {32,96}
    expect(getMonPicVisual(state).spriteVisible).toBe(false);
    state = advanceMonPic(state);
    state = advanceMonPic(state);
    state = advanceMonPic(state);
    let visual = getMonPicVisual(state);
    expect(visual.spriteVisible).toBe(true);
    expect(visual.menuTextVisible).toBe(true);
    expect(visual.menuHighlightVisible).toBe(false);
    state = advanceMonPic(state);
    visual = getMonPicVisual(state);
    expect(visual.menuHighlightVisible).toBe(true);
  });

  it("settles into phase 'open' once the sequence finishes, and stays there", () => {
    const state = run(openMonPic(false, false), 27);
    expect(state.phase).toBe("open");
    expect(getMonPicVisual(state)).toEqual(getMonPicVisual(run(state, 50)));
  });
});

describe("monPic: opening (variant B - after LEFT/RIGHT/UP/DOWN already used, not the first-ever open, clean cadence)", () => {
  it("holds the full-width flash bar for 3 ticks (one more than variant A) before the window starts growing", () => {
    let state = run(openMonPic(true, true), 13);
    expect(getMonPicVisual(state).flashWidth).toBe(64);
    state = advanceMonPic(state);
    expect(getMonPicVisual(state).flashWidth).toBe(64);
    state = advanceMonPic(state);
    expect(getMonPicVisual(state).flashWidth).toBe(64);
    state = advanceMonPic(state);
    expect(getMonPicVisual(state).window).toEqual({ top: 60, bottom: 69 });
  });

  it("the flash bar is alpha-blended (not the flat native color) once BLDCNT is already configured", () => {
    const state = run(openMonPic(true, true), 3);
    expect(getMonPicVisual(state).flashBlended).toBe(true);
  });

  it("the window grows in a clean 8-step, one-step-per-tick sequence with no duplicate/doubled step", () => {
    let state = run(openMonPic(true, true), 16);
    const windows: Array<{ top: number; bottom: number } | null> = [];
    for (let i = 0; i < 8; i += 1) {
      windows.push(getMonPicVisual(state).window);
      state = advanceMonPic(state);
    }
    expect(windows).toEqual([
      { top: 60, bottom: 69 },
      { top: 56, bottom: 73 },
      { top: 52, bottom: 77 },
      { top: 48, bottom: 81 },
      { top: 44, bottom: 85 },
      { top: 40, bottom: 89 },
      { top: 36, bottom: 93 },
      { top: 32, bottom: 96 },
    ]);
  });
});

describe("monPic: opening (variant C - after LEFT/RIGHT/UP/DOWN already used, but still the session's first-ever open, oracle-measured from draft-menu-slot6.json)", () => {
  it("has variant A's flash-phase shape (12 ticks, only two held at 64) despite hasActed=true", () => {
    let state = openMonPic(true, false);
    const widths: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      widths.push(getMonPicVisual(state).flashWidth);
      state = advanceMonPic(state);
    }
    expect(widths).toEqual([0, 0, 0, 1, 1, 4, 4, 8, 8, 16, 16, 32, 32, 64, 64]);
    expect(getMonPicVisual(state).window).toEqual({ top: 60, bottom: 69 });
  });

  it("stays unblended (flat native color): blend tracks 'ever opened before', not hasActed", () => {
    const state = run(openMonPic(true, false), 3);
    expect(getMonPicVisual(state).flashBlended).toBe(false);
  });

  it("the window grows with the hold at the very start and the skip right after (unlike A's mid-sequence hold or B's clean cadence)", () => {
    let state = run(openMonPic(true, false), 15);
    const windows: Array<{ top: number; bottom: number } | null> = [];
    for (let i = 0; i < 8; i += 1) {
      windows.push(getMonPicVisual(state).window);
      state = advanceMonPic(state);
    }
    expect(windows).toEqual([
      { top: 60, bottom: 69 },
      { top: 60, bottom: 69 }, // duplicate hold
      { top: 52, bottom: 77 }, // skip (top=56 never renders)
      { top: 48, bottom: 81 },
      { top: 44, bottom: 85 },
      { top: 40, bottom: 89 },
      { top: 36, bottom: 93 },
      { top: 36, bottom: 93 }, // duplicate hold
    ]);
  });

  it("settles into phase 'open' once the sequence finishes", () => {
    const state = run(openMonPic(true, false), 27);
    expect(state.phase).toBe("open");
  });
});

describe("monPic: closing (variant B - the common case, e.g. after menu navigation)", () => {
  it("keeps showing the sprite/popup for one tick after B, then hides both and starts shrinking the window", () => {
    let state = closeMonPic(true);
    let visual = getMonPicVisual(state);
    expect(visual.spriteVisible).toBe(true);
    expect(visual.menuTextVisible).toBe(true);
    expect(visual.window).toEqual({ top: 32, bottom: 96 });

    state = advanceMonPic(state);
    visual = getMonPicVisual(state);
    expect(visual.spriteVisible).toBe(false);
    expect(visual.menuTextVisible).toBe(false);
    expect(visual.menuHighlightVisible).toBe(false);
    expect(visual.window).toEqual({ top: 36, bottom: 92 });
  });

  it("shrinks the window by 4px/tick down to a 1px sliver, then a blank gap tick, then the flash bar shrinks 32,16,8,4,1 (each held 2 ticks)", () => {
    let state = run(closeMonPic(true), 1);
    const windows: Array<{ top: number; bottom: number } | null> = [];
    for (let i = 0; i < 8; i += 1) {
      windows.push(getMonPicVisual(state).window);
      state = advanceMonPic(state);
    }
    expect(windows).toEqual([
      { top: 36, bottom: 92 },
      { top: 40, bottom: 88 },
      { top: 44, bottom: 84 },
      { top: 48, bottom: 80 },
      { top: 52, bottom: 76 },
      { top: 56, bottom: 72 },
      { top: 60, bottom: 68 },
      { top: 64, bottom: 65 },
    ]);
    // idx9: blank gap tick (WIN0 disabled, flash not yet visible).
    expect(getMonPicVisual(state)).toEqual(getMonPicVisual({ phase: "closed", elapsed: 0, variant: "A", blended: false }));
    state = advanceMonPic(state);
    const widths: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      widths.push(getMonPicVisual(state).flashWidth);
      state = advanceMonPic(state);
    }
    expect(widths).toEqual([32, 32, 16, 16, 8, 8, 4, 4, 1, 1]);
  });

  it("returns to phase 'closed' (nothing visible) once the sequence finishes", () => {
    const state = run(closeMonPic(true), 20);
    expect(state.phase).toBe("closed");
    expect(getMonPicVisual(state)).toEqual(getMonPicVisual(INITIAL_MON_PIC_STATE));
  });

  it("variant A (closing fresh from idle) has a doubled window step and a duplicate-hold instead of the clean cadence", () => {
    let state = run(closeMonPic(false), 1);
    const windows: Array<{ top: number; bottom: number } | null> = [];
    for (let i = 0; i < 8; i += 1) {
      windows.push(getMonPicVisual(state).window);
      state = advanceMonPic(state);
    }
    expect(windows).toEqual([
      { top: 36, bottom: 92 },
      { top: 40, bottom: 88 },
      { top: 44, bottom: 84 },
      { top: 52, bottom: 76 }, // doubled step (top=48/bottom=80 never renders)
      { top: 56, bottom: 72 },
      { top: 56, bottom: 72 }, // duplicate hold
      { top: 60, bottom: 68 },
      { top: 64, bottom: 65 },
    ]);
  });
});
