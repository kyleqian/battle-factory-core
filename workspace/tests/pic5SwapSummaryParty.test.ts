// pic5 (docs/pic1-live-field-pictures.md): the swap screen's SUMMARY shows the Pokemon being swapped from. The ROM opens it on the
// player's party (battle_factory_screen.c:2404, Swap_Task_OpenSummaryScreen: ShowPokemonSummaryScreen(SUMMARY_MODE_NORMAL, gPlayerParty, cursorPos, ...)),
// and the engine's swap is built from the round's own rental records (createPendingFactorySwapPresentation). The summary used to page
// through `draftScreen.rentals`, the opening draft's six, so after any draft that did not rent slots 0, 1, 2 (or after an earlier swap)
// it drew another Pokemon: here row 1 is PONYTA, but the summary drew ANORITH (draft slot 0).
import { describe, expect, it } from "vitest";
import { createStartCarryState, runSeed } from "../tools/soak/randomRoundSoakDriver.ts";
import { render, tick, type EngineState } from "../src/engine/core.ts";
import { recordDraws } from "../src/engine/drawRecord.ts";
import type { GbaButton } from "../src/input.ts";

const NONE: ReadonlySet<GbaButton> = new Set();

function swapPickerState(): EngineState {
  let captured: EngineState | null = null;
  runSeed(0, {
    policy: "winning-swap", scene: "off", renderEvery: 1, maxFrames: 60_000,
    stateFactory: (seed) => createStartCarryState(0, seed * 7 + 1, "off"),
    drawCheck: { check: (state) => {
      const controller = state.factorySwap?.controller;
      if (captured === null && controller?.phase === "playerPicker" && controller.inputReady) {
        captured = state;
        throw new Error("captured");
      }
    } },
  });
  if (captured === null) throw new Error("seed 0 never reached the swap screen");
  return captured;
}

function press(state: EngineState, button: GbaButton): EngineState {
  return tick(tick(state, new Set([button])), NONE);
}

function waitFor(state: EngineState, done: (s: EngineState) => boolean, limit = 600): EngineState {
  for (let i = 0; i < limit; i += 1) {
    if (done(state)) return state;
    state = tick(state, NONE);
  }
  throw new Error("timed out");
}

describe("pic5: the swap screen's SUMMARY shows the player's own party", () => {
  it("row 1's SUMMARY draws the party's PONYTA, not the opening draft's slot 0 ANORITH", () => {
    let state = swapPickerState();
    const partySpecies = state.factorySwap!.controller.playerParty.map((mon) => mon.species);
    expect(partySpecies).toEqual(["PONYTA", "PORYGON", "EXEGGCUTE"]);
    expect(state.draftScreen.rentals.slice(0, 3).map((rental) => rental.species)).toEqual(["SPECIES_ANORITH", "SPECIES_WOBBUFFET", "SPECIES_PORYGON"]);
    expect(state.factorySwap!.controller.cursor).toBe(0);
    state = press(state, "A");
    state = waitFor(state, (s) => s.factorySwap?.controller.phase === "playerOptions" && s.factorySwap.controller.inputReady);
    expect(state.factorySwap!.controller.playerOptionCursor).toBe(0);
    state = press(state, "A");
    state = waitFor(state, (s) => s.summaryScreen.onInfoPage && s.summaryScreen.transition === null, 2000);
    for (let i = 0; i < 10; i += 1) state = tick(state, NONE);
    const { record } = recordDraws(() => render(state));
    expect(record.monPics.map((pic) => pic.species)).toContain("PONYTA");
    expect(record.monPics.map((pic) => pic.species)).not.toContain("ANORITH");
  }, 120_000);
});
