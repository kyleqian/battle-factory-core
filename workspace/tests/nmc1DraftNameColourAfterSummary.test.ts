// nmc1 (frame catcher 2026-11-20, docs/fcp1-frame-catcher-pictures.md): the rental species name's red on the draft screen after a
// summary visit. Kyle's draft: ours drew the name (255, 0, 0), the ROM (231, 8, 8). On a summary return the select screen's
// Select_Task_HandleMenu STATE_MENU_REINIT (battle_factory_screen.c:1654-1657) sets the breathe's unfaded red from PALNUM_TEXT's entry
// 4, which Select_InitDisplay never loads (PLTT_SIZEOF(4), :1191): the field message box's red (gMessageBox_Pal[4], RGB(28, 1, 1)).
// ROM (the catcher's run of Kyle's trace): after the second summary visit the menu closes at ROM frame 4006 and the name turns
// (231, 8, 8) at 4008; the breathe then steps (214, 0, 0) (198, 0, 0) (181, 0, 0) (173, 0, 0) (156, 0, 0) (140, 0, 0) and back.
import { describe, expect, it } from "vitest";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";
import {
  activateSpeciesNameFade,
  advanceSpeciesNameFade,
  deactivateSpeciesNameFade,
  speciesNameColor,
  speciesNameFadeAfterSummary,
  type SpeciesNameFadeState,
} from "../src/engine/speciesNameFade.ts";

/** ROM, Kyle's draft after a summary visit: the name's colour at breathe coeff 0..6. */
const ROM_AFTER_SUMMARY: readonly (readonly [number, number, number])[] = [
  [231, 8, 8], [214, 0, 0], [198, 0, 0], [181, 0, 0], [173, 0, 0], [156, 0, 0], [140, 0, 0],
];

const rgb = (c: { r: number; g: number; b: number }) => [c.r, c.g, c.b];

describe("nmc1: after a summary visit the draft's species name breathes from the message box red", () => {
  it("the blend of RGB(28, 1, 1) toward black is the ROM's colour at every coeff", () => {
    expect(ROM_AFTER_SUMMARY.map((_, coeff) => rgb(speciesNameColor(coeff, "messageBoxRed")))).toEqual(ROM_AFTER_SUMMARY);
    expect(rgb(speciesNameColor(0))).toEqual([255, 0, 0]);
  });

  it("the old colour stays until the breathe runs again, then the new red shows one frame after the blend (ROM 4006 -> 4008)", () => {
    // In the menu: the breathe is off (RUN no-ops), coeff 0.
    let state: SpeciesNameFadeState = { active: false, tState: "run", coeffDelay: 2, coeff: 0, fadeOut: true, delay: 0, renderCoeff: 0 };
    state = speciesNameFadeAfterSummary(state);
    for (let i = 0; i < 40; i += 1) state = advanceSpeciesNameFade(state);
    expect(rgb(speciesNameColor(state.renderCoeff, state.renderBase))).toEqual([255, 0, 0]);
    // The menu closes on tick T (the tick advances first, then the B press reactivates the breathe, as core.ts does).
    state = activateSpeciesNameFade(advanceSpeciesNameFade(state));
    expect(rgb(speciesNameColor(state.renderCoeff, state.renderBase))).toEqual([255, 0, 0]);
    state = advanceSpeciesNameFade(state); // T + 1: BlendPalettes from the new red
    expect(rgb(speciesNameColor(state.renderCoeff, state.renderBase))).toEqual([255, 0, 0]);
    state = advanceSpeciesNameFade(state); // T + 2: on screen
    expect(rgb(speciesNameColor(state.renderCoeff, state.renderBase))).toEqual([231, 8, 8]);
    // A later popup and the breathe's own steps keep the new red.
    state = deactivateSpeciesNameFade(state);
    for (let i = 0; i < 20; i += 1) state = advanceSpeciesNameFade(state);
    expect(state.renderBase).toBe("messageBoxRed");
  });

  it("the engine: SUMMARY from the draft menu, back, B to the cursor, and the name is (231, 8, 8)", () => {
    const press = (s: EngineState, button: GbaButton | null, frames = 1): EngineState => {
      let out = tick(s, button ? new Set([button]) : new Set());
      for (let i = 1; i < frames; i += 1) out = tick(out, new Set());
      return out;
    };
    const waitFor = (s: EngineState, done: (s: EngineState) => boolean, limit = 400): EngineState => {
      let out = s;
      for (let i = 0; i < limit && !done(out); i += 1) out = tick(out, new Set());
      expect(done(out)).toBe(true);
      return out;
    };
    const namePixel = (s: EngineState): number[] => {
      const fb = render(s);
      // The species name's red pixels inside SELECT_WIN_SPECIES (x 152..239, y 17..31).
      const reds = new Set<string>();
      for (let y = 17; y < 32; y += 1) {
        for (let x = 152; x < 240; x += 1) {
          const o = (y * 240 + x) * 4;
          if (fb[o]! > 100 && fb[o + 1]! < 40 && fb[o + 2]! < 40) reds.add(`${fb[o]},${fb[o + 1]},${fb[o + 2]}`);
        }
      }
      expect(reds.size).toBe(1);
      return [...reds][0]!.split(",").map(Number);
    };
    let state = press(createInitialState(), null, 10);
    expect(namePixel(state)).toEqual([255, 0, 0]);
    state = press(state, "A", 30); // the menu (SUMMARY highlighted)
    state = press(state, "A");
    state = waitFor(state, (s) => s.summaryScreen.isOpen && s.summaryScreen.transition === null);
    state = press(state, null, 30); // the summary takes input once its page is up
    state = press(state, "B");
    state = waitFor(state, (s) => !s.summaryScreen.isOpen && s.summaryScreen.transition === null);
    state = press(state, null, 30);
    expect(namePixel(state)).toEqual([255, 0, 0]); // the menu is up: the old colour stays
    state = press(state, "B", 3);
    expect(namePixel(state)).toEqual([231, 8, 8]);
  });
});
