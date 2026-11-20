// snd2: the swap screen's SUMMARY cries the party Pokemon it shows. The ROM opens it on gPlayerParty (battle_factory_screen.c:2404) and
// SpriteCB_Pokemon / Task_ChangeSummaryMon cry the summary's own mon (pokemon_summary_screen.c PlayMonCry); HealPlayerParty runs before the
// swap question (BattleFactoryPreBattleRoom ReturnToRoomFromBattle), so every cry is the NORMAL one. pic5 made the picture read the round's
// party; the cries still read the opening draft's six by row. ROM (frame catcher, seed 1 cut at the swap screen and SUMMARY opened, UP, UP):
// MACHOKE, POLIWHIRL, BAYLEEF on rows 2, 1, 0, the open cry 63 frames after the A, each change's cry 21 frames after its UP; ours cried
// the draft's SABLEYE, ARON, DELCATTY. Here (soak seed 0, pic5's staging) row 0 is PONYTA and the draft's slot 0 ANORITH.
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { tick, type EngineState } from "../src/engine/core.ts";
import { CRY_MODE_NORMAL } from "../src/engine/screenSounds.ts";
import type { GbaButton } from "../src/input.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };
import { createStartCarryState, runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

const NONE: ReadonlySet<GbaButton> = new Set();
const SPECIES_ID = new Map((speciesStats as { species: { id: number; name: string }[] }).species.map((row) => [row.name, row.id]));

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

describe("snd2: the swap screen's SUMMARY cries the party's Pokemon", () => {
  it("row 0 cries PONYTA (not the draft's slot 0 ANORITH); DOWN cries row 1's PORYGON", () => {
    let state = swapPickerState();
    const party = state.factorySwap!.controller.playerParty.map((mon) => mon.species);
    expect(party).toEqual(["PONYTA", "PORYGON", "EXEGGCUTE"]);
    expect(state.draftScreen.rentals[0]!.species).toBe("SPECIES_ANORITH");
    const cries: { frame: number; id: number | null; mode: number | undefined }[] = [];
    const step = (buttons: ReadonlySet<GbaButton>): void => {
      const result = collectSoundTick(state.frame + 1, () => tick(state, buttons));
      state = result.result;
      for (const e of result.events as SoundEvent[]) if (e.kind === "cry") cries.push({ frame: e.frame, id: e.id, mode: e.mode });
    };
    const waitFor = (done: (s: EngineState) => boolean, limit = 2000): void => {
      for (let i = 0; i < limit && !done(state); i += 1) step(NONE);
      if (!done(state)) throw new Error("timed out");
    };
    step(new Set(["A"])); // row 0 (the cursor starts there)
    waitFor((s) => s.factorySwap?.controller.phase === "playerOptions" && s.factorySwap.controller.inputReady);
    expect(state.factorySwap!.controller.playerOptionCursor).toBe(0); // SUMMARY
    step(new Set(["A"]));
    const opened = state.frame;
    waitFor((s) => s.summaryScreen.isOpen && s.summaryScreen.transition === null && cries.length > 0);
    for (let i = 0; i < 40; i += 1) step(NONE);
    step(new Set(["DOWN"]));
    const changed = state.frame;
    for (let i = 0; i < 60; i += 1) step(NONE);
    expect(cries).toEqual([
      { frame: opened + 63, id: SPECIES_ID.get("SPECIES_PONYTA"), mode: CRY_MODE_NORMAL },
      { frame: changed + 21, id: SPECIES_ID.get("SPECIES_PORYGON"), mode: CRY_MODE_NORMAL },
    ]);
  }, 120_000);
});
