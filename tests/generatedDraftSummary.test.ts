import { describe, expect, it } from "vitest";
import {
  createInitialState,
  render,
  tick,
  type EngineState,
} from "../src/engine/core.ts";
import { createDraftScreenStateFromRentalRecords } from "../src/engine/factoryDraftScreen.ts";
import { generateInitialFactoryRentals } from "../src/engine/factoryRentalGeneration.ts";
import {
  renderSummaryBattleMovesPage,
  renderSummaryInfoPage,
  renderSummarySkillsPage,
} from "../src/engine/summaryInfoPage.ts";
import { CLOSED_SUMMARY_SCREEN_STATE } from "../src/engine/summaryScreen.ts";

function generatedDraft() {
  const generated = generateInitialFactoryRentals({
    rngValue: 0,
    factoryWinStreak: 0,
    rentsCount: 0,
    playerTrainerId: 0x1234_5678,
  });
  return createDraftScreenStateFromRentalRecords(generated.rentals);
}

function openGeneratedSummary(
  draftScreen: ReturnType<typeof generatedDraft>,
  selectedSlot: number,
  page: "info" | "skills" | "battleMoves" = "info",
): EngineState {
  return {
    ...createInitialState(),
    draftScreen,
    summaryScreen: {
      ...CLOSED_SUMMARY_SCREEN_STATE,
      isOpen: true,
      onInfoPage: page === "info",
      selectedSlot,
      page,
    },
  };
}

describe("generated draft summary presentation", () => {
  it("renders two non-anchor slots from their live species, moves, item, and nature records", () => {
    const draft = generatedDraft();
    const anchor = createInitialState().draftScreen.rentals;

    expect(draft.rentals[0]).toMatchObject({
      name: "GRIMER",
      nature: "QUIRKY",
      item: { name: "PECHA BERRY" },
      moves: [
        { name: "SLUDGE" },
        { name: "ROCK TOMB" },
        { name: "ACID ARMOR" },
        { name: "MINIMIZE" },
      ],
    });
    expect(draft.rentals[1]).toMatchObject({
      name: "POLIWHIRL",
      nature: "QUIRKY",
      item: { name: "PETAYA BERRY" },
      moves: [
        { name: "WATER PULSE" },
        { name: "DOUBLESLAP" },
        { name: "ICY WIND" },
        { name: "RAIN DANCE" },
      ],
    });

    for (const slot of [0, 1]) {
      const info = render(openGeneratedSummary(draft, slot, "info"));
      const skills = render(openGeneratedSummary(draft, slot, "skills"));
      const battleMoves = render(openGeneratedSummary(draft, slot, "battleMoves"));
      expect(info).toEqual(renderSummaryInfoPage(draft.rentals, slot));
      expect(skills).toEqual(renderSummarySkillsPage(draft.rentals, slot));
      expect(battleMoves).toEqual(renderSummaryBattleMovesPage(draft.rentals, slot));
      expect(Buffer.from(info).equals(Buffer.from(renderSummaryInfoPage(anchor, slot)))).toBe(false);
      expect(Buffer.from(skills).equals(Buffer.from(renderSummarySkillsPage(anchor, slot)))).toBe(false);
      expect(Buffer.from(battleMoves).equals(Buffer.from(renderSummaryBattleMovesPage(anchor, slot)))).toBe(false);
    }
  });

  it("keeps an un-rented generated pool slot live through summary DOWN navigation", () => {
    const draft = generatedDraft();
    let state = openGeneratedSummary(draft, 0);

    state = tick(state, new Set(["DOWN"]));
    expect(state.summaryScreen.monTransition).toMatchObject({
      fromSlot: 0,
      toSlot: 1,
      direction: "down",
    });
    for (let i = 0; i < 20; i += 1) state = tick(state, new Set());

    expect(state.summaryScreen.selectedSlot).toBe(1);
    expect(state.summaryScreen.monTransition).toBeNull();
    expect(render(state)).toEqual(renderSummaryInfoPage(draft.rentals, 1));
  });
});
