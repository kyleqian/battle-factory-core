import { describe, expect, it } from "vitest";
import fixtureJson from "../src/data/gen/battle1-swap-rentalmons-dump.json" with { type: "json" };
import type { BattleMon } from "../src/engine/battleScenario.ts";
import {
  acknowledgeFactorySwapPresentation,
  applyFactorySwapMutation,
  copyFactorySwapCursor,
  createFactorySwapState,
  factorySwapRoundDecision,
  factorySwapAlreadyHasSpecies,
  handleFactorySwapInput,
  type FactoryRentalRoster,
  type FactorySwapMon,
  type FactorySwapParty,
  type FactorySwapState,
} from "../src/engine/factorySwap.ts";

function mon(
  id: string,
  species = id.toUpperCase(),
  personality = 0,
  abilityNum = 0,
): FactorySwapMon {
  return {
    id,
    species,
    hp: 100,
    maxHp: 100,
    status: "none",
    personality,
    abilityNum,
    friendship: 255,
  };
}

const player: FactorySwapParty = [
  mon("onix", "ONIX"),
  mon("magby", "MAGBY"),
  mon("bayleef", "BAYLEEF"),
];
const enemy: FactorySwapParty = [
  mon("grovyle", "GROVYLE", 1094072807, 0),
  mon("murkrow", "MURKROW", 3475344024, 0),
  mon("pidgeotto", "PIDGEOTTO", 3971699699, 0),
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
    expect(state.infoCursor).toBe(2);
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
    expect(state.phase).toBe("enemySwitch");
    expect(state.playerMonId).toBe(0);
    state = ready({ ...state, phase: "enemyPicker" });
    state = handleFactorySwapInput(state, "A");
    expect(state.phase).toBe("acceptPrompt");
    state = ready(state);
    state = handleFactorySwapInput(state, "A");

    expect(state.phase).toBe("acceptExit");
    expect(state.result).toBeNull();
    expect(state.mutationCommitted).toBe(false);
    expect(state.playerParty).toEqual(player);
    expect(factorySwapRoundDecision(state)).toBeNull();
    state = applyFactorySwapMutation(state);
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

  it("accept-NO enters the no-mutation return seam", () => {
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
    expect(state.phase).toBe("acceptReturn");
    expect(state.inputReady).toBe(false);
    expect(state.enemyMonId).toBe(0);
    expect(state.result).toBeNull();
    expect(state.playerParty).toEqual(player);
    expect(state.rentalMons).toEqual(rentals);
    expect(factorySwapRoundDecision(state)).toBeNull();
  });

  it("copies rental identity/IVs from the offered record but personality/ability from the enemy party", () => {
    const deliberatelyDifferent = [
      rentals[0],
      rentals[1],
      rentals[2],
      { ...rentals[3], personality: 1, abilityNum: 1 },
      rentals[4],
      rentals[5],
    ] as FactoryRentalRoster;
    const state = applyFactorySwapMutation({
      ...createFactorySwapState(player, enemy, deliberatelyDifferent),
      phase: "acceptPrompt",
      playerMonId: 0,
      enemyMonId: 0,
      inputReady: true,
    });
    expect(state.rentalMons[0]).toEqual({
      monId: rentals[3].monId,
      ivs: rentals[3].ivs,
      personality: enemy[0].personality,
      abilityNum: enemy[0].abilityNum,
    });
  });

  it("rejects an enemy species already held in either non-replaced player slot", () => {
    const duplicateEnemy: FactorySwapParty = [
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
    const sameAsReplaced: FactorySwapParty = [
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
    const quitPrompt = handleFactorySwapInput(state, "B");
    expect(quitPrompt).toMatchObject({ phase: "quitPrompt", result: null });
    const quit = handleFactorySwapInput(ready(quitPrompt), "A");
    expect(quit).toMatchObject({ phase: "complete", result: "keptParty" });
    expect(quit.playerParty).toEqual(player);
    expect(() => applyFactorySwapMutation(state)).toThrow(/both selected/);
  });

  it("B or NO in the quit prompt returns to the originating picker", () => {
    let state = ready(createFactorySwapState(player, enemy, rentals));
    state = handleFactorySwapInput(state, "B");
    state = handleFactorySwapInput(ready(state), "B");
    expect(state).toMatchObject({
      phase: "playerPicker",
      inputReady: false,
      result: null,
    });

    state = ready({
      ...state,
      phase: "enemyPicker",
      playerMonId: 0,
    });
    state = handleFactorySwapInput(state, "B");
    state = handleFactorySwapInput(
      handleFactorySwapInput(ready(state), "DOWN"),
      "A",
    );
    expect(state).toMatchObject({
      phase: "enemyPicker",
      inputReady: false,
      result: null,
    });
  });

  it("dispatches player options to the source-named next mechanisms", () => {
    const options: FactorySwapState = {
      ...createFactorySwapState(player, enemy, rentals),
      phase: "playerOptions",
      inputReady: true,
    };
    expect(handleFactorySwapInput(options, "A").phase).toBe("summaryFade");
    expect(handleFactorySwapInput(options, "B").phase).toBe("playerPickerReturn");
    expect(handleFactorySwapInput({
      ...options,
      playerOptionCursor: 1,
      playerOptionDisplayCursor: 1,
    }, "A")).toMatchObject({
      phase: "enemySwitch",
      playerMonId: 0,
    });
    expect(handleFactorySwapInput({
      ...options,
      playerOptionCursor: 2,
      playerOptionDisplayCursor: 2,
    }, "A").phase).toBe("playerPickerReturn");
  });

  it("wraps LEFT/RIGHT across all five enemy actions with the shared two-copy display lag", () => {
    let state: FactorySwapState = {
      ...createFactorySwapState(player, enemy, rentals),
      phase: "enemyPicker",
      playerMonId: 0,
      actionsCount: 5,
      inputReady: true,
    };
    state = handleFactorySwapInput(state, "LEFT");
    expect(state).toMatchObject({
      cursor: 4,
      infoCursor: 0,
      displayCursor: 0,
    });
    state = copyFactorySwapCursor(state);
    expect(state).toMatchObject({
      cursor: 4,
      infoCursor: 4,
      displayCursor: 0,
    });
    state = copyFactorySwapCursor(state);
    expect(state.displayCursor).toBe(4);
    expect(state.arrowCursor).toBe(0);
    state = copyFactorySwapCursor(state);
    expect(state.arrowCursor).toBe(4);
    state = handleFactorySwapInput(state, "RIGHT");
    expect(state.cursor).toBe(0);
    state = copyFactorySwapCursor(
      copyFactorySwapCursor(copyFactorySwapCursor(state)),
    );
    expect(state).toMatchObject({
      cursor: 0,
      infoCursor: 0,
      displayCursor: 0,
      arrowCursor: 0,
    });
  });
});
