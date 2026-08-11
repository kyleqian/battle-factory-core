// Hermetic Tier-1 tests for the RENT/DESELECT state machine (S5):
// Select_OptionRentDeselect's select/deselect branches and
// Select_HandleMonSelectionChange's renumbering special case
// (battle_factory_screen.c:1415-1433, see docs/rent-flow-notes.md section 1).
// No oracle, no pixels - tools/compare/traces/rent-slot1.json is the
// pixel-level parity check for a single select + its ball-anim dwell.

import { describe, expect, it } from "vitest";
import {
  applyDeselect,
  applySelect,
  selectMonMessage,
} from "../src/engine/factoryDraftScreen.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";

describe("selectMonMessage", () => {
  it("Select_PrintSelectMonString's 4 message variants", () => {
    expect(selectMonMessage(1)).toBe("Select the first POKéMON.");
    expect(selectMonMessage(2)).toBe("Select the second POKéMON.");
    expect(selectMonMessage(3)).toBe("Select the third POKéMON.");
    expect(selectMonMessage(4)).toBe("Are these three POKéMON OK?");
  });
});

describe("applySelect", () => {
  it("stamps the current selectingMonsState into the slot and increments it", () => {
    const ids = [0, 0, 0, 0, 0, 0];
    const result = applySelect(ids, 1, 2);
    expect(result.selectedIds).toEqual([0, 0, 1, 0, 0, 0]);
    expect(result.selectingMonsState).toBe(2);
    // original array untouched (pure)
    expect(ids).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("2nd and 3rd picks stamp 2 and 3", () => {
    let ids = [1, 0, 0, 0, 0, 0];
    let state = 2;
    ({ selectedIds: ids, selectingMonsState: state } = applySelect(ids, state, 4));
    expect(ids).toEqual([1, 0, 0, 0, 2, 0]);
    expect(state).toBe(3);
    ({ selectedIds: ids, selectingMonsState: state } = applySelect(ids, state, 1));
    expect(ids).toEqual([1, 3, 0, 0, 2, 0]);
    expect(state).toBe(4);
  });
});

describe("applyDeselect", () => {
  it("clears the slot and decrements selectingMonsState when only 1 is selected", () => {
    const ids = [1, 0, 0, 0, 0, 0];
    const result = applyDeselect(ids, 2, 0);
    expect(result.selectedIds).toEqual([0, 0, 0, 0, 0, 0]);
    expect(result.selectingMonsState).toBe(1);
  });

  it("deselecting the LATER pick (2nd) of 2 selected needs no renumbering", () => {
    const ids = [1, 0, 2, 0, 0, 0];
    const result = applyDeselect(ids, 3, 2);
    expect(result.selectedIds).toEqual([1, 0, 0, 0, 0, 0]);
    expect(result.selectingMonsState).toBe(2);
  });

  it("deselecting the FIRST pick of 2 selected renumbers the 2nd pick down to 1", () => {
    const ids = [1, 0, 2, 0, 0, 0];
    const result = applyDeselect(ids, 3, 0);
    expect(result.selectedIds).toEqual([0, 0, 1, 0, 0, 0]);
    expect(result.selectingMonsState).toBe(2);
  });

  it("renumbering targets whichever slot holds rank 2, regardless of slot index order", () => {
    const ids = [0, 2, 0, 0, 1, 0];
    const result = applyDeselect(ids, 3, 4);
    expect(result.selectedIds).toEqual([0, 1, 0, 0, 0, 0]);
    expect(result.selectingMonsState).toBe(2);
  });
});

function tap(state: ReturnType<typeof createInitialState>, button: GbaButton, holdFrames = 2) {
  for (let i = 0; i < holdFrames; i += 1) state = tick(state, new Set([button]));
  state = tick(state, new Set());
  return state;
}

function idle(state: ReturnType<typeof createInitialState>, frames: number) {
  for (let i = 0; i < frames; i += 1) state = tick(state, new Set());
  return state;
}

describe("engine RENT/DESELECT integration (core.ts tick())", () => {
  it("A on slot 1's RENT row selects it: palette flips, message advances, popup closes", () => {
    let state = createInitialState();
    state = tap(state, "A"); // open popup
    state = idle(state, 30);
    state = tap(state, "DOWN"); // menu cursor -> RENT row
    state = idle(state, 4);
    state = tap(state, "A"); // confirm RENT
    expect(state.draftScreen.selectedIds[0]).toBe(1);
    expect(state.draftScreen.selectingMonsState).toBe(2);
    expect(state.draftScreen.mode).toBe("cursor");
    expect(state.draftScreen.ballAnims[0]).not.toBeNull();
  });

  it("re-opening the same ball's popup shows DESELECT, and confirming it clears the pick", () => {
    let state = createInitialState();
    state = tap(state, "A");
    state = idle(state, 30);
    state = tap(state, "DOWN");
    state = idle(state, 4);
    state = tap(state, "A"); // RENT confirm
    state = idle(state, 30);
    state = tap(state, "A"); // re-open slot 1's popup (now DESELECT row 1)
    state = idle(state, 30);
    state = tap(state, "DOWN"); // menu cursor -> DESELECT row
    state = idle(state, 4);
    state = tap(state, "A"); // confirm DESELECT
    expect(state.draftScreen.selectedIds[0]).toBe(0);
    expect(state.draftScreen.selectingMonsState).toBe(1);
    expect(state.draftScreen.ballAnims[0]).toBeNull();
    expect(state.draftScreen.message).toBe("Select the first POKéMON.");
  });
});
