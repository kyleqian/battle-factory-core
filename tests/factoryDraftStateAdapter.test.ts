import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/engine/core.ts";
import {
  ANCHOR_DRAFT_RENTAL_RECORDS,
  createDraftScreenStateFromRentalRecords,
} from "../src/engine/factoryDraftScreen.ts";
import { generateInitialFactoryRentals } from "../src/engine/factoryRentalGeneration.ts";

describe("Factory draft generated-rental state adapter", () => {
  it("preserves the canonical six rentals and initial draft controller state", () => {
    const adapted = createDraftScreenStateFromRentalRecords(ANCHOR_DRAFT_RENTAL_RECORDS);

    expect(adapted).toEqual(createInitialState().draftScreen);
    expect(adapted.slots).toEqual([
      { species: "ONIX", category: "ROCK SNAKE" },
      { species: "MAGBY", category: "LIVE COAL" },
      { species: "BAYLEEF", category: "LEAF" },
      { species: "BUTTERFREE", category: "BUTTERFLY" },
      { species: "HAUNTER", category: "GAS" },
      { species: "QUILAVA", category: "VOLCANO" },
    ]);
    expect(adapted.rentals).toHaveLength(6);
  });

  it("preserves complete non-anchor presentation records for multiple slots", () => {
    const generated = generateInitialFactoryRentals({
      rngValue: 0,
      factoryWinStreak: 0,
      rentsCount: 0,
      playerTrainerId: 0x1234_5678,
    });

    const state = createDraftScreenStateFromRentalRecords(generated.rentals);

    expect(state.slots).toEqual([
      { species: "GRIMER", category: "SLUDGE" },
      { species: "POLIWHIRL", category: "TADPOLE" },
      { species: "LILEEP", category: "SEA LILY" },
      { species: "PORYGON", category: "VIRTUAL" },
      { species: "RATICATE", category: "MOUSE" },
      { species: "NIDORINO", category: "POISON PIN" },
    ]);
    expect(state.rentals[0]).toMatchObject({
      species: "SPECIES_GRIMER",
      name: "GRIMER",
      level: 50,
      nature: "QUIRKY",
      item: { name: "PECHA BERRY" },
      moves: [
        { name: "SLUDGE", currentPp: 20, maxPp: 20 },
        { name: "ROCK TOMB", currentPp: 10, maxPp: 10 },
        { name: "ACID ARMOR", currentPp: 40, maxPp: 40 },
        { name: "MINIMIZE", currentPp: 20, maxPp: 20 },
      ],
      ot: { id: 0x1234_5678, nameText: null, idText: null },
      frontPicSpecies: "GRIMER",
    });
    expect(state.rentals[1]).toMatchObject({
      species: "SPECIES_POLIWHIRL",
      name: "POLIWHIRL",
      level: 50,
      nature: "QUIRKY",
      item: { name: "PETAYA BERRY" },
      moves: [
        { name: "WATER PULSE", currentPp: 20, maxPp: 20 },
        { name: "DOUBLESLAP", currentPp: 10, maxPp: 10 },
        { name: "ICY WIND", currentPp: 15, maxPp: 15 },
        { name: "RAIN DANCE", currentPp: 5, maxPp: 5 },
      ],
      ot: { id: 0x1234_5678, nameText: null, idText: null },
      frontPicSpecies: "POLIWHIRL",
    });
  });

  it("rejects anything other than the source's six selectable rentals", () => {
    expect(() => createDraftScreenStateFromRentalRecords(
      ANCHOR_DRAFT_RENTAL_RECORDS.slice(0, 5),
    )).toThrow("requires exactly 6 rental records");
  });
});
