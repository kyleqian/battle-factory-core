import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/engine/core.ts";
import {
  ANCHOR_DRAFT_RENTAL_RECORDS,
  createDraftScreenStateFromRentalRecords,
  type DraftScreenState,
} from "../src/engine/factoryDraftScreen.ts";
import { generateInitialFactoryRentals } from "../src/engine/factoryRentalGeneration.ts";
import { INITIAL_MON_PIC_STATE } from "../src/engine/monPic.ts";
import { ANCHOR_SPECIES_NAME_FADE_STATE } from "../src/engine/speciesNameFade.ts";

const PREVIOUS_CANONICAL_DRAFT_STATE: DraftScreenState = {
  mode: "cursor",
  cursorPos: 0,
  menuCursorPos: 0,
  slots: [
    { species: "ONIX", category: "ROCK SNAKE" },
    { species: "MAGBY", category: "LIVE COAL" },
    { species: "BAYLEEF", category: "LEAF" },
    { species: "BUTTERFREE", category: "BUTTERFLY" },
    { species: "HAUNTER", category: "GAS" },
    { species: "QUILAVA", category: "VOLCANO" },
  ],
  message: "Select the first POKéMON.",
  monPic: INITIAL_MON_PIC_STATE,
  hasActed: false,
  hasOpenedMonPic: false,
  cursorRedraw: null,
  menuHighlightRedraw: null,
  selectedIds: [0, 0, 0, 0, 0, 0],
  selectingMonsState: 1,
  ballAnims: [null, null, null, null, null, null],
  rentConfirmRedraw: null,
  ballAnimStall: [],
  confirmReveal: null,
  yesNoCursorPos: 0,
  yesNoCursorRedraw: null,
  speciesNameFade: ANCHOR_SPECIES_NAME_FADE_STATE,
  closingFlashResidual: false,
};

describe("Factory draft generated-rental state adapter", () => {
  it("preserves the complete previous canonical state through the generic constructor", () => {
    const adapted = createDraftScreenStateFromRentalRecords(ANCHOR_DRAFT_RENTAL_RECORDS);

    expect(adapted).toEqual(PREVIOUS_CANONICAL_DRAFT_STATE);
    expect(createInitialState().draftScreen).toEqual(PREVIOUS_CANONICAL_DRAFT_STATE);
  });

  it("constructs six well-formed slots from a non-canonical generated rental set", () => {
    const generated = generateInitialFactoryRentals({
      rngValue: 0,
      factoryWinStreak: 0,
      rentsCount: 0,
      playerTrainerId: 0x1234_5678,
    });

    const state = createDraftScreenStateFromRentalRecords(generated.rentals);

    expect(state.slots).toHaveLength(6);
    expect(state.slots).toEqual([
      { species: "GRIMER", category: "SLUDGE" },
      { species: "POLIWHIRL", category: "TADPOLE" },
      { species: "LILEEP", category: "SEA LILY" },
      { species: "PORYGON", category: "VIRTUAL" },
      { species: "RATICATE", category: "MOUSE" },
      { species: "NIDORINO", category: "POISON PIN" },
    ]);
  });

  it("rejects anything other than the source's six selectable rentals", () => {
    expect(() => createDraftScreenStateFromRentalRecords(
      ANCHOR_DRAFT_RENTAL_RECORDS.slice(0, 5),
    )).toThrow("requires exactly 6 rental records");
  });
});
