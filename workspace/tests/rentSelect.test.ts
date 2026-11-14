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
  isSelectSpeciesValid,
  CANT_SELECT_SAME_MESSAGE,
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

describe("same-species refusal (iss216, Select_AreSpeciesValid :2255-2276)", () => {
  // The anchor deal has no duplicate: give slot 6 slot 1's species so the 2nd pick is refused.
  function withDuplicatePair() {
    const state = createInitialState();
    const rentals = state.draftScreen.rentals.map((rental, i) =>
      i === 5 ? { ...rental, species: state.draftScreen.rentals[0]!.species } : rental);
    return { ...state, draftScreen: { ...state.draftScreen, rentals } };
  }
  function openMenuOnSlot(state: ReturnType<typeof createInitialState>, slot: number) {
    let s = state;
    for (let i = 0; i < slot; i += 1) {
      s = tap(s, "RIGHT");
      s = idle(s, 8);
    }
    s = tap(s, "A");
    s = idle(s, 40);
    s = tap(s, "DOWN");
    return idle(s, 4);
  }

  it("isSelectSpeciesValid compares only earlier picks' species", () => {
    const rentals = [{ species: "A" }, { species: "B" }, { species: "A" }];
    expect(isSelectSpeciesValid(rentals, [1, 0, 0], 2, 2)).toBe(false);
    expect(isSelectSpeciesValid(rentals, [0, 1, 0], 2, 2)).toBe(true);
    expect(isSelectSpeciesValid(rentals, [0, 0, 0], 1, 2)).toBe(true);
  });

  it("refuses the 2nd rental of a species: prompt text, popup gone, pic open, still 1 pick", () => {
    let s = openMenuOnSlot(withDuplicatePair(), 0);
    s = tap(s, "A"); // RENT slot 1
    expect(s.draftScreen.selectedIds[0]).toBe(1);
    s = idle(s, 40);
    s = openMenuOnSlot(s, 5);
    s = tap(s, "A"); // RENT the duplicate
    expect(s.draftScreen.mode).toBe("invalid");
    expect(s.draftScreen.message).toBe(CANT_SELECT_SAME_MESSAGE);
    expect(CANT_SELECT_SAME_MESSAGE).toBe("Can't select same \uE053\uE054."); // {PKMN} is the PK MN glyph pair (strings.c:1623)
    expect(s.draftScreen.selectedIds[5]).toBe(0);
    expect(s.draftScreen.selectingMonsState).toBe(2);
    expect(s.draftScreen.monPic.phase).toBe("open");
    expect(s.draftScreen.ballAnims[5]).toBeNull();
  });

  it("only A leaves the refusal; B and the d-pad are ignored, then the prompt is restored with 2 picks possible", () => {
    let s = openMenuOnSlot(withDuplicatePair(), 0);
    s = idle(tap(s, "A"), 40);
    s = tap(openMenuOnSlot(s, 5), "A");
    for (const key of ["B", "UP", "DOWN", "LEFT", "RIGHT"] as const) {
      s = idle(tap(s, key), 6);
      expect(s.draftScreen.mode).toBe("invalid");
      expect(s.draftScreen.cursorPos).toBe(5);
    }
    s = tap(s, "A");
    expect(s.draftScreen.mode).toBe("cursor");
    expect(s.draftScreen.message).toBe("Select the second POKéMON.");
    expect(s.draftScreen.monPic.phase).toBe("closing");
    s = idle(s, 40);
    expect(s.draftScreen.monPic.phase).toBe("closed");
    expect(s.draftScreen.selectedIds).toEqual([1, 0, 0, 0, 0, 0]);
    // a non-duplicate slot can still be rented afterwards
    s = openMenuOnSlot(tap(idle(s, 8), "LEFT"), 0);
    s = tap(s, "A");
    expect(s.draftScreen.selectingMonsState).toBe(3);
  });

  it("deselecting the earlier pick re-allows the same species", () => {
    let s = openMenuOnSlot(withDuplicatePair(), 0);
    s = idle(tap(s, "A"), 40);
    s = tap(openMenuOnSlot(s, 5), "A"); // refused
    s = idle(tap(s, "A"), 40);
    s = idle(tap(s, "RIGHT"), 8); // 6 -> 1 (wraps)
    expect(s.draftScreen.cursorPos).toBe(0);
    s = tap(s, "A");
    s = idle(s, 40);
    s = idle(tap(s, "DOWN"), 4);
    s = idle(tap(s, "A"), 40); // DESELECT slot 1
    expect(s.draftScreen.selectedIds).toEqual([0, 0, 0, 0, 0, 0]);
    s = idle(tap(s, "LEFT"), 8); // 1 -> 6
    s = tap(s, "A");
    s = idle(s, 40);
    s = idle(tap(s, "DOWN"), 4);
    s = tap(s, "A"); // RENT slot 6: now valid
    expect(s.draftScreen.mode).toBe("cursor");
    expect(s.draftScreen.selectedIds[5]).toBe(1);
  });
});
