// Hermetic Tier-1 tests for the draft screen's state machine (S2): cursor
// index transitions/wrap/key-repeat, menu open/close, menu cursor index.
// No oracle, no pixels - see tools/compare/traces/draft-cursor.json and
// draft-menu.json for the pixel-level parity checks.

import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  advanceCursorRedraw,
  advanceMenuHighlightRedraw,
  moveCursor,
  moveMenuCursor,
} from "../src/engine/factoryDraftScreen.ts";
import type { GbaButton } from "../src/input.ts";

function tap(state: ReturnType<typeof createInitialState>, button: GbaButton, holdFrames = 2) {
  for (let i = 0; i < holdFrames; i += 1) state = tick(state, new Set([button]));
  state = tick(state, new Set());
  return state;
}

describe("draft screen cursor mode", () => {
  it("moveCursor wraps at both ends of the 6 slots", () => {
    expect(moveCursor(0, -1)).toBe(5);
    expect(moveCursor(5, 1)).toBe(0);
    expect(moveCursor(2, 1)).toBe(3);
    expect(moveCursor(2, -1)).toBe(1);
  });

  it("JOY_NEW(RIGHT) moves the cursor immediately on the press frame", () => {
    let state = createInitialState();
    expect(state.draftScreen.cursorPos).toBe(0);
    state = tick(state, new Set(["RIGHT"]));
    expect(state.draftScreen.cursorPos).toBe(1);
  });

  it("a full RIGHT sweep wraps back to slot 0 after 6 taps", () => {
    let state = createInitialState();
    for (let i = 0; i < 6; i += 1) state = tap(state, "RIGHT");
    expect(state.draftScreen.cursorPos).toBe(0);
  });

  it("a full LEFT sweep from slot 0 wraps to slot 5 then back to 0", () => {
    let state = createInitialState();
    state = tap(state, "LEFT");
    expect(state.draftScreen.cursorPos).toBe(5);
    for (let i = 0; i < 5; i += 1) state = tap(state, "LEFT");
    expect(state.draftScreen.cursorPos).toBe(0);
  });

  it("holding RIGHT repeats at tick 41, then every 5 ticks (main.c key-repeat timing)", () => {
    let state = createInitialState();
    const positions: number[] = [];
    for (let i = 0; i < 46; i += 1) {
      state = tick(state, new Set(["RIGHT"]));
      positions.push(state.draftScreen.cursorPos);
    }
    // tick1: 0->1 (JOY_NEW). No further movement until the repeat fires at tick41: 1->2.
    expect(positions[0]).toBe(1);
    expect(positions[39]).toBe(1); // tick 40
    expect(positions[40]).toBe(2); // tick 41: first repeat
    expect(positions[44]).toBe(2); // tick 45
    expect(positions[45]).toBe(3); // tick 46: second repeat (continue delay = 5)
  });

  it("A opens the menu on the press frame, resetting the menu cursor to 0", () => {
    let state = createInitialState();
    state = tap(state, "RIGHT"); // move off slot 0 first
    state = tick(state, new Set(["A"]));
    expect(state.draftScreen.mode).toBe("menu");
    expect(state.draftScreen.menuCursorPos).toBe(0);
    expect(state.draftScreen.cursorPos).toBe(1); // slot selection is preserved
  });
});

// Select_Task_HandleChooseMons applies a LEFT/RIGHT move (cursorPos, both
// text windows) atomically on the input tick, but CB2_SelectScreen runs
// BuildOamBuffer()/RunTextPrinters() *before* RunTasks() each frame, so the
// visible redraw lands piecemeal over the next 3 ticks - oracle-measured
// (dense single-purpose LEFT-only trace from the anchor): category text
// catches up 1 tick after the move, species text 2 ticks after, the arrow
// sprite (OAM, gated behind the window copies) 3 ticks after. See
// factoryDraftScreen.ts's CursorRedrawState doc and
// tools/compare/traces/draft-menu-slot6.json's former f1-f3 cluster.
describe("draft screen cursor-move redraw scheduling", () => {
  it("advanceCursorRedraw passes null through and clears after 3 ticks", () => {
    expect(advanceCursorRedraw(null)).toBeNull();
    // elapsed:0 is the shape set on the move's own tick (see below); advance
    // 3 times (ticks T+1, T+2, T+3) to reach the settled/cleared state.
    let redraw: ReturnType<typeof advanceCursorRedraw> = { fromCursorPos: 0, elapsed: 0 };
    redraw = advanceCursorRedraw(redraw);
    expect(redraw).toEqual({ fromCursorPos: 0, elapsed: 1 });
    redraw = advanceCursorRedraw(redraw);
    expect(redraw).toEqual({ fromCursorPos: 0, elapsed: 2 });
    redraw = advanceCursorRedraw(redraw);
    expect(redraw).toBeNull();
  });

  it("a LEFT/RIGHT move starts a redraw pipeline from the old slot, settling 3 ticks later", () => {
    let state = createInitialState();
    expect(state.draftScreen.cursorRedraw).toBeNull();

    state = tick(state, new Set(["RIGHT"])); // 0 -> 1
    expect(state.draftScreen.cursorPos).toBe(1);
    expect(state.draftScreen.cursorRedraw).toEqual({ fromCursorPos: 0, elapsed: 0 });

    state = tick(state, new Set());
    expect(state.draftScreen.cursorRedraw).toEqual({ fromCursorPos: 0, elapsed: 1 });
    state = tick(state, new Set());
    expect(state.draftScreen.cursorRedraw).toEqual({ fromCursorPos: 0, elapsed: 2 });
    state = tick(state, new Set());
    expect(state.draftScreen.cursorRedraw).toBeNull(); // settled
  });
});

describe("draft screen menu mode", () => {
  // Select_Task_HandleMenu's STATE_MENU_HANDLE_INPUT (UP/DOWN/A/B) is only
  // reachable once the mon pic finishes opening - idle well past that
  // (monPic.test.ts pins the exact settle tick) before exercising menu input.
  function openMenu() {
    let state = createInitialState();
    state = tick(state, new Set(["A"]));
    for (let i = 0; i < 30; i += 1) state = tick(state, new Set());
    expect(state.draftScreen.monPic.phase).toBe("open");
    return state;
  }

  it("moveMenuCursor wraps at both ends of the 3 options", () => {
    expect(moveMenuCursor(0, -1)).toBe(2);
    expect(moveMenuCursor(2, 1)).toBe(0);
    expect(moveMenuCursor(1, 1)).toBe(2);
  });

  it("DOWN/UP move the menu cursor through SUMMARY/RENT/OTHERS with wrap", () => {
    let state = openMenu();
    expect(state.draftScreen.menuCursorPos).toBe(0);
    state = tap(state, "DOWN");
    expect(state.draftScreen.menuCursorPos).toBe(1);
    state = tap(state, "DOWN");
    expect(state.draftScreen.menuCursorPos).toBe(2);
    state = tap(state, "DOWN");
    expect(state.draftScreen.menuCursorPos).toBe(0); // wrap
    state = tap(state, "UP");
    expect(state.draftScreen.menuCursorPos).toBe(2); // wrap the other way
  });

  it("B closes the menu back to cursor mode without changing the slot cursor", () => {
    let state = openMenu();
    state = tap(state, "DOWN");
    state = tick(state, new Set(["B"]));
    expect(state.draftScreen.mode).toBe("cursor");
    expect(state.draftScreen.cursorPos).toBe(0);
  });

  it("LEFT/RIGHT do not move the slot cursor while the menu is open", () => {
    let state = openMenu();
    state = tap(state, "RIGHT");
    expect(state.draftScreen.cursorPos).toBe(0);
    expect(state.draftScreen.mode).toBe("menu");
  });

  it("A on OTHERS (Select_OptionOthers) cancels back to cursor mode, same as B", () => {
    let state = openMenu();
    state = tap(state, "DOWN"); // RENT
    state = tap(state, "DOWN"); // OTHERS
    expect(state.draftScreen.menuCursorPos).toBe(2);
    state = tick(state, new Set(["A"]));
    expect(state.draftScreen.mode).toBe("cursor");
  });

  it("A on SUMMARY/RENT does not close the menu (S4/S5, out of scope)", () => {
    let state = openMenu();
    state = tick(state, new Set(["A"])); // SUMMARY
    expect(state.draftScreen.mode).toBe("menu");
  });

  // Select_UpdateMenuCursorPosition moves the highlight sprite (a single
  // OAM position, no text windows involved) atomically on the input tick,
  // but - unlike the cursor-move case above, which has a piecemeal 3-tick
  // reveal across two text windows and a sprite - there's nothing to stage:
  // dense oracle probing (single-purpose DOWN-only trace from a settled
  // open menu) found the old row rendered for 2 full ticks after the input
  // before jumping straight to the new one. See MenuHighlightRedrawState's
  // doc and draft-menu-slot6.json's former f37-f38 cluster.
  describe("menu-highlight redraw scheduling", () => {
    it("advanceMenuHighlightRedraw passes null through and clears after 2 ticks", () => {
      expect(advanceMenuHighlightRedraw(null)).toBeNull();
      // elapsed:0 is the shape set on the move's own tick; advance twice
      // (ticks T+1, T+2) to reach the settled/cleared state.
      let redraw: ReturnType<typeof advanceMenuHighlightRedraw> = { fromMenuCursorPos: 0, elapsed: 0 };
      redraw = advanceMenuHighlightRedraw(redraw);
      expect(redraw).toEqual({ fromMenuCursorPos: 0, elapsed: 1 });
      redraw = advanceMenuHighlightRedraw(redraw);
      expect(redraw).toBeNull();
    });

    it("a DOWN/UP move starts a redraw pipeline from the old row, settling 2 ticks later", () => {
      let state = openMenu();
      expect(state.draftScreen.menuHighlightRedraw).toBeNull();

      state = tick(state, new Set(["DOWN"])); // 0 -> 1
      expect(state.draftScreen.menuCursorPos).toBe(1);
      expect(state.draftScreen.menuHighlightRedraw).toEqual({ fromMenuCursorPos: 0, elapsed: 0 });

      state = tick(state, new Set());
      expect(state.draftScreen.menuHighlightRedraw).toEqual({ fromMenuCursorPos: 0, elapsed: 1 });
      state = tick(state, new Set());
      expect(state.draftScreen.menuHighlightRedraw).toBeNull(); // settled
    });
  });
});
