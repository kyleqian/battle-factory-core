import { describe, expect, it } from "vitest";
import fixtureJson from "../src/data/gen/battle1-swap-rentalmons-dump.json" with { type: "json" };
import type { BattleMon, BattleParty } from "../src/engine/battleScenario.ts";
import {
  acknowledgeFactorySwapPresentation,
  applyFactorySwapMutation,
  copyFactorySwapCursor,
  createFactorySwapState,
  factorySwapAlreadyHasSpecies,
  handleFactorySwapInput,
  type FactoryRentalRoster,
  type FactorySwapState,
} from "../src/engine/factorySwap.ts";

function mon(id: string, species = id.toUpperCase()): BattleMon {
  return { id, species, hp: 100, maxHp: 100, status: "none" };
}

const player: BattleParty = [
  mon("onix", "ONIX"),
  mon("magby", "MAGBY"),
  mon("bayleef", "BAYLEEF"),
];
const enemy: BattleParty = [
  mon("grovyle", "GROVYLE"),
  mon("murkrow", "MURKROW"),
  mon("pidgeotto", "PIDGEOTTO"),
];
const fixture = fixtureJson as unknown as {
  yesBranch: { ticks: Record<string, { rentalMons: FactoryRentalRoster }> };
};
const rentals = fixture.yesBranch.ticks["29601"]!.rentalMons;

function ready(state: FactorySwapState): FactorySwapState {
  return acknowledgeFactorySwapPresentation(state);
}

describe("Factory swap state/input contract", () => {
  it("rejects input until each presentation transition is acknowledged", () => {
    const state = createFactorySwapState(player, enemy, rentals);
    expect(handleFactorySwapInput(state, "A")).toBe(state);
    const options = handleFactorySwapInput(ready(state), "A");
    expect(options.phase).toBe("playerOptions");
    expect(options.inputReady).toBe(false);
    expect(handleFactorySwapInput(options, "DOWN")).toBe(options);
  });

  it("wraps picker/menu cursors and separates logical from displayed picker position", () => {
    let state = ready(createFactorySwapState(player, enemy, rentals));
    state = handleFactorySwapInput(state, "LEFT");
    expect(state.cursor).toBe(2);
    expect(state.displayCursor).toBe(0);
    state = copyFactorySwapCursor(state);
    expect(state.displayCursor).toBe(2);
    state = handleFactorySwapInput(state, "A");
    state = ready(state);
    state = handleFactorySwapInput(state, "UP");
    expect(state.playerOptionCursor).toBe(2);
  });

  it("runs canonical ONIX slot 0 -> GROVYLE slot 0 and matches the RAM rental mutation", () => {
    let state = ready(createFactorySwapState(player, enemy, rentals));
    state = handleFactorySwapInput(state, "A");
    state = ready(state);
    state = handleFactorySwapInput(state, "DOWN");
    state = handleFactorySwapInput(state, "A");
    expect(state.phase).toBe("enemyPicker");
    expect(state.playerMonId).toBe(0);
    state = ready(state);
    state = handleFactorySwapInput(state, "A");
    expect(state.phase).toBe("acceptPrompt");
    state = ready(state);
    state = handleFactorySwapInput(state, "A");

    const accepted = fixture.yesBranch.ticks["30681"]!.rentalMons;
    expect(state.phase).toBe("complete");
    expect(state.result).toBe("accepted");
    expect(state.playerParty.map(({ species }) => species)).toEqual([
      "GROVYLE",
      "MAGBY",
      "BAYLEEF",
    ]);
    expect((state.playerParty[0] as BattleMon & { friendship: number }).friendship)
      .toBe(0);
    expect(state.rentalMons.slice(0, 3)).toEqual(accepted.slice(0, 3));
    expect(state.rentalMons.slice(3)).toEqual(rentals.slice(3));
  });

  it("accept-NO returns to the enemy picker without mutation", () => {
    let state: FactorySwapState = {
      ...createFactorySwapState(player, enemy, rentals),
      phase: "acceptPrompt" as const,
      playerMonId: 0 as const,
      enemyMonId: 0 as const,
      inputReady: true,
    };
    state = handleFactorySwapInput(
      handleFactorySwapInput(state, "DOWN"),
      "A",
    );
    expect(state.phase).toBe("enemyPicker");
    expect(state.result).toBeNull();
    expect(state.playerParty).toEqual(player);
    expect(state.rentalMons).toEqual(rentals);
  });

  it("rejects an enemy species already held in either non-replaced player slot", () => {
    const duplicateEnemy: BattleParty = [
      mon("other-magby", "MAGBY"),
      enemy[1],
      enemy[2],
    ];
    let state: FactorySwapState = {
      ...createFactorySwapState(player, duplicateEnemy, rentals),
      phase: "enemyPicker" as const,
      playerMonId: 0 as const,
      inputReady: true,
    };
    expect(factorySwapAlreadyHasSpecies(state)).toBe(true);
    state = handleFactorySwapInput(state, "A");
    expect(state.phase).toBe("duplicateSpecies");
    expect(state.inputReady).toBe(false);
    state = handleFactorySwapInput(ready(state), "A");
    expect(state.phase).toBe("enemyPicker");
    expect(state.result).toBeNull();
  });

  it("does not reject the species in the slot being replaced", () => {
    const sameAsReplaced: BattleParty = [
      mon("other-onix", "ONIX"),
      enemy[1],
      enemy[2],
    ];
    const state = {
      ...createFactorySwapState(player, sameAsReplaced, rentals),
      phase: "enemyPicker" as const,
      playerMonId: 0 as const,
      inputReady: true,
    };
    expect(factorySwapAlreadyHasSpecies(state)).toBe(false);
  });

  it("B from a picker keeps the party and direct mutation rejects missing selections", () => {
    const state = ready(createFactorySwapState(player, enemy, rentals));
    const quit = handleFactorySwapInput(state, "B");
    expect(quit).toMatchObject({ phase: "complete", result: "keptParty" });
    expect(quit.playerParty).toEqual(player);
    expect(() => applyFactorySwapMutation(state)).toThrow(/both selected/);
  });
});
