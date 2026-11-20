// pic6 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): B in the battle's POKéMON menu fades out and back in, as the ROM
// does, instead of cutting straight to the battle (Kyle's round, frame 12345 -> 12346).
// ROM: HandleChooseMonCancel's default action (party_menu.c:1394-1403) plays SE_SELECT and runs Task_ClosePartyMenu, whose
// BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, RGB_BLACK) (party_menu.c:1227) fades the menu to black before the battle's exit
// callback rebuilds and fades in the field. ROM lab tools/battle-lab/pic6-party-cancel-{on,off}.json (B first held at trace frame
// 160, both scenes frame-identical), relative to that press P:
//   P+0..P+2 menu unchanged, P+3..P+17 fade to black, P+18..P+56 black, P+57..P+72 field fades in, P+73..P+78 field with the empty
//   message box, P+79 "What will RATTATA do?" + the action menu.
// The engine's party-menu close clock starts one frame after the trace press (closeElapsed 0 = P+1, the same convention as the
// SHIFT close measured on mid-battle-switch-dense-a-off: A at 962, closeElapsed 0 = 963), so closeElapsed c shows ROM frame P+1+c.
import { describe, expect, it } from "vitest";
import { createStartCarryState, runSeed } from "../tools/soak/randomRoundSoakDriver.ts";
import { render, tick, type EngineState } from "../src/engine/core.ts";
import { PARTY_SELECT_OPEN_TOTAL_FRAMES } from "../src/engine/battlePartySelect.ts";
import type { GbaButton } from "../src/input.ts";

const NONE: ReadonlySet<GbaButton> = new Set();

/** The ROM's frame classes, relative to the press P (pic6 lab). */
const ROM_CLASSES: readonly (readonly [from: number, to: number, cls: string])[] = [
  [0, 2, "menu"], [3, 17, "fading-out"], [18, 56, "black"], [57, 72, "fading-in"], [73, 78, "field"], [79, 79, "action-menu"],
];

function actionMenuState(): EngineState {
  let captured: EngineState | null = null;
  runSeed(0, {
    policy: "winning", scene: "on", renderEvery: 1, maxFrames: 40_000,
    stateFactory: (seed) => createStartCarryState(0, seed * 7 + 1, "on"),
    drawCheck: { check: (state) => {
      const command = state.factoryRoundBattleOrchestrator?.battleCommandPresentation;
      if (captured === null && command?.lifecycle.phase === "action-menu"
        && state.factoryRoundBattleOrchestrator!.battlePartySelect === null && command.actionCursor === 0) {
        captured = state;
        throw new Error("captured");
      }
    } },
  });
  if (captured === null) throw new Error("no action menu reached");
  return captured;
}

const press = (state: EngineState, button: GbaButton): EngineState => tick(state, new Set([button]));
const mean = (fb: Uint8Array): number => {
  let sum = 0;
  for (let p = 0; p < fb.length; p += 4) sum += fb[p]! + fb[p + 1]! + fb[p + 2]!;
  return sum / (fb.length / 4) / 3;
};
const boxMean = (fb: Uint8Array): number => mean(fb.subarray(112 * 240 * 4));

describe("pic6: B in the battle party menu closes through the ROM's fade", () => {
  it("menu, fade to black, black hold, field fade-in, field hold, then the action menu, frame for frame", () => {
    let state = actionMenuState();
    for (let i = 0; i < 60; i += 1) state = tick(state, NONE);
    state = tick(press(state, "DOWN"), NONE);
    expect(state.factoryRoundBattleOrchestrator!.battleCommandPresentation!.actionCursor).toBe(2);
    state = tick(press(state, "A"), NONE);
    for (let i = 0; i < 400 && state.factoryRoundBattleOrchestrator!.battlePartySelect!.openElapsed < PARTY_SELECT_OPEN_TOTAL_FRAMES + 4; i += 1) {
      state = tick(state, NONE);
    }
    state = press(state, "B");
    expect(state.factoryRoundBattleOrchestrator!.battlePartySelect!.closeElapsed).toBe(0);
    const frames: Uint8Array[] = [];
    const selectorShown: boolean[] = [];
    for (let c = 0; c <= 78; c += 1) {
      frames.push(Buffer.from(render(state)));
      selectorShown.push(state.factoryRoundBattleOrchestrator!.battlePartySelect !== null);
      if (c < 78) state = tick(state, NONE);
    }
    const classOf = (c: number): string => {
      const rom = c + 1;
      return ROM_CLASSES.find(([from, to]) => rom >= from && rom <= to)![2];
    };
    for (let c = 0; c <= 78; c += 1) {
      const m = mean(frames[c]!);
      const cls = classOf(c);
      if (cls === "menu") expect(Buffer.from(frames[c]!).equals(Buffer.from(frames[0]!)), `c ${c}`).toBe(true);
      if (cls === "fading-out") expect(m, `c ${c}`).toBeLessThan(mean(frames[c - 1]!) + 0.01);
      if (cls === "black") expect(m, `c ${c}`).toBe(0);
      if (cls === "fading-in") expect(m, `c ${c}`).toBeGreaterThan(mean(frames[c - 1]!));
      if (cls === "field") expect(Buffer.from(frames[c]!).equals(Buffer.from(frames[71]!)), `c ${c}`).toBe(true);
    }
    expect(mean(frames[1]!)).toBeGreaterThan(100);
    expect(mean(frames[16]!)).toBeLessThan(5);
    // the action menu (prompt + FIGHT / BAG / POKéMON / RUN) replaces the empty message box on the ROM's P+79
    expect(classOf(78)).toBe("action-menu");
    expect(selectorShown.slice(0, 78).every(Boolean)).toBe(true);
    expect(selectorShown[78]).toBe(false);
    expect(boxMean(frames[78]!)).not.toBe(boxMean(frames[77]!));
    expect(state.factoryRoundBattleOrchestrator!.battleCommandPresentation!.lifecycle.phase).toBe("action-menu");
  }, 120_000);
});
