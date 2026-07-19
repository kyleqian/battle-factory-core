import { describe, expect, it } from "vitest";
import {
  GO_TEXT,
  GO_TEXT_START_TICK,
  GO_TEXT_STATIC_FROM_TICK,
  GO_TEXT_TOTAL_CHARS,
  goTextVisibleChars,
} from "../src/engine/battleMenu.ts";
import { renderBattleScene, TICK0 } from "../src/engine/battleScene.ts";

/** Same rig as tests/battleScene.test.ts's `pixelAtSentOut` - send-out A-press already registered at trace tick 1420 (sendOutPressElapsed=380), the fixed script every committed trace in this window shares. */
function pixelAtSentOut(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380 });
  const o = (y * 240 + x) * 4;
  return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
}

describe("battleMenu: 'Go! ONIX!' print cadence (docs/battle-menu-notes.md §1/§2)", () => {
  it("'Go! ONIX!' is 9 printable characters", () => {
    expect(GO_TEXT).toBe("Go! ONIX!");
    expect(GO_TEXT_TOTAL_CHARS).toBe(9);
  });

  it("shows 0 characters before the box-clear tick", () => {
    expect(goTextVisibleChars(GO_TEXT_START_TICK - 1)).toBe(0);
  });

  it("box clear and the first glyph land on the same tick (1563)", () => {
    expect(GO_TEXT_START_TICK).toBe(1563);
    expect(goTextVisibleChars(GO_TEXT_START_TICK)).toBe(1);
  });

  it("prints exactly 1 char/tick including the silent space (index 3, tick 1566), clamped at the total", () => {
    expect(goTextVisibleChars(1564)).toBe(2); // "o"
    expect(goTextVisibleChars(1565)).toBe(3); // "!"
    expect(goTextVisibleChars(1566)).toBe(4); // " " (silent - GO_TEXT[3] is a space, still charged a tick)
    expect(GO_TEXT[3]).toBe(" ");
    expect(goTextVisibleChars(1567)).toBe(5); // "O"
    expect(goTextVisibleChars(1571)).toBe(GO_TEXT_TOTAL_CHARS); // "!"
    expect(goTextVisibleChars(1000000)).toBe(GO_TEXT_TOTAL_CHARS);
  });

  it("is static from tick 1572 (last new char at 1571)", () => {
    expect(GO_TEXT_STATIC_FROM_TICK).toBe(1572);
    expect(goTextVisibleChars(GO_TEXT_STATIC_FROM_TICK)).toBe(GO_TEXT_TOTAL_CHARS);
    expect(goTextVisibleChars(GO_TEXT_STATIC_FROM_TICK - 1)).toBe(GO_TEXT_TOTAL_CHARS);
  });
});

describe("battleMenu: rendered pixels (oracle-pinned, tools/compare/traces/menu-text.json)", () => {
  it("still shows the opponent's held 'sent\\nout GROVYLE!' text one tick before the clear (1562)", () => {
    // x=17,y=128 is inside the "G" glyph's cell once printed (1563+) but is
    // plain window background one tick earlier, since no character of
    // "BUG CATCHER DESTIN sent\nout GROVYLE!" occupies that cell.
    expect(pixelAtSentOut(1562, 17, 128)).toEqual([255, 255, 255]);
  });

  it("draws the 'G' glyph's ink color the same tick the box clears (1563)", () => {
    expect(pixelAtSentOut(GO_TEXT_START_TICK, 17, 128)).toEqual([107, 90, 115]);
  });

  it("renders byte-identical frames across the silent space tick (1565 -> 1566)", () => {
    const fb1 = new Uint8Array(240 * 160 * 4);
    const fb2 = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb1, { elapsed: 1565 - TICK0, sendOutPressElapsed: 380 });
    renderBattleScene(fb2, { elapsed: 1566 - TICK0, sendOutPressElapsed: 380 });
    expect(fb2).toEqual(fb1);
  });

  it("renders byte-identical frames once static (1571 -> 1572)", () => {
    const fb1 = new Uint8Array(240 * 160 * 4);
    const fb2 = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb1, { elapsed: 1571 - TICK0, sendOutPressElapsed: 380 });
    renderBattleScene(fb2, { elapsed: 1572 - TICK0, sendOutPressElapsed: 380 });
    expect(fb2).toEqual(fb1);
  });
});
