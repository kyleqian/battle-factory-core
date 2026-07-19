import { describe, expect, it } from "vitest";
import {
  GO_TEXT,
  GO_TEXT_START_TICK,
  GO_TEXT_STATIC_FROM_TICK,
  GO_TEXT_TOTAL_CHARS,
  goTextVisibleChars,
  BRENDAN_THROW_START_TICK,
  brendanThrowFrame,
  brendanThrowDx,
  PLAYER_THROW_BALL_START_TICK,
  PLAYER_THROW_BALL_EXACT_END_TICK,
  playerThrowBallTopLeft,
  playerSummaryFadeEva,
  playerSummaryIconExitDx,
  playerSummaryBarExitDx,
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

describe("battleMenu: Brendan's throw pose-swap + exit translation (docs/battle-menu-notes.md §3, slice 2)", () => {
  it("throw pose starts at tick 1574, not the ~1595 coarse estimate", () => {
    expect(BRENDAN_THROW_START_TICK).toBe(1574);
    expect(brendanThrowFrame(BRENDAN_THROW_START_TICK - 1)).toBeNull();
    expect(brendanThrowDx(BRENDAN_THROW_START_TICK - 1)).toBeNull();
  });

  it("cycles raw frames 0,1,2,0,3 per sAnimCmd_Brendan_1's own FRAME durations (24,9,24,9,50)", () => {
    expect(brendanThrowFrame(1574)).toBe(0);
    expect(brendanThrowFrame(1597)).toBe(0); // et=23, last frame-0 tick
    expect(brendanThrowFrame(1598)).toBe(1); // et=24
    expect(brendanThrowFrame(1606)).toBe(1); // et=32, last frame-1 tick
    expect(brendanThrowFrame(1607)).toBe(2); // et=33
    expect(brendanThrowFrame(1630)).toBe(2); // et=56, last frame-2 tick
    expect(brendanThrowFrame(1631)).toBe(0); // et=57
    expect(brendanThrowFrame(1639)).toBe(0); // et=65, last frame-0-reprise tick
    expect(brendanThrowFrame(1640)).toBe(3); // et=66
  });

  it("x2 offset matches the pixel-fit Q8.8 accumulator exactly at every dense-trace tick sampled this session", () => {
    // tools/compare/traces-groundtruth/battle1-menu-dense.json, 0/1665px
    // mismatch at every one of these ticks against trainer-pic-brendan-back.json's frame 0/1/2.
    expect(brendanThrowDx(1574)).toBe(-2);
    expect(brendanThrowDx(1580)).toBe(-16);
    expect(brendanThrowDx(1588)).toBe(-36);
    expect(brendanThrowDx(1596)).toBe(-55);
    expect(brendanThrowDx(1606)).toBe(-79);
    expect(brendanThrowDx(1614)).toBe(-98);
  });

  it("freezes at n=50 (translation duration) instead of continuing to slide forever", () => {
    const atDurationEnd = brendanThrowDx(BRENDAN_THROW_START_TICK + 49);
    expect(brendanThrowDx(BRENDAN_THROW_START_TICK + 200)).toBe(atDurationEnd);
  });
});

describe("battleMenu: the thrown Poke Ball's arc (docs/battle-menu-notes.md §3, slice 2)", () => {
  it("becomes visible at tick 1607 (spawn, no motion yet) and stops being modeled after 1614 (GBA affine-spin branch kicks in)", () => {
    expect(PLAYER_THROW_BALL_START_TICK).toBe(1607);
    expect(PLAYER_THROW_BALL_EXACT_END_TICK).toBe(1614);
    expect(playerThrowBallTopLeft(PLAYER_THROW_BALL_START_TICK - 1)).toBeNull();
    expect(playerThrowBallTopLeft(PLAYER_THROW_BALL_EXACT_END_TICK + 1)).toBeNull();
    expect(playerThrowBallTopLeft(1607)).toEqual({ x: 16, y: 60 });
  });

  it("traces the Q8.8 linear-x + sine-arc-y curve exactly at every tick this session pixel-fit (0/112px mismatch each)", () => {
    expect(playerThrowBallTopLeft(1608)).toEqual({ x: 17, y: 57 });
    expect(playerThrowBallTopLeft(1609)).toEqual({ x: 19, y: 55 });
    expect(playerThrowBallTopLeft(1610)).toEqual({ x: 21, y: 54 });
    expect(playerThrowBallTopLeft(1611)).toEqual({ x: 23, y: 52 });
    expect(playerThrowBallTopLeft(1612)).toEqual({ x: 25, y: 50 });
    expect(playerThrowBallTopLeft(1613)).toEqual({ x: 27, y: 49 });
    expect(playerThrowBallTopLeft(1614)).toEqual({ x: 29, y: 49 });
  });
});

describe("battleMenu: player party-status-summary fade-out (the tick-1574 'ball icon change', PROGRESS #93)", () => {
  it("eva holds at 16 (opaque, no visible blend) the tick the hide task is assigned, then steps down every other tick to 0", () => {
    expect(playerSummaryFadeEva(BRENDAN_THROW_START_TICK - 1)).toBeNull();
    expect(playerSummaryFadeEva(1574)).toBe(16);
    expect(playerSummaryFadeEva(1575)).toBe(15);
    expect(playerSummaryFadeEva(1576)).toBe(15); // held - data[11] alternates
    expect(playerSummaryFadeEva(1577)).toBe(14);
    expect(playerSummaryFadeEva(1605)).toBe(0);
    expect(playerSummaryFadeEva(1614)).toBe(0); // holds at 0, doesn't go negative
  });

  it("icon exit-slide is a per-icon-staggered (7 ticks/icon) triangular ramp, pixel-fit exact (icon 0 at tick 1580: -63px)", () => {
    expect(playerSummaryIconExitDx(1573, 0)).toBe(0);
    expect(playerSummaryIconExitDx(1580, 0)).toBe(-63); // K=6: -3*6*7/2
    expect(playerSummaryIconExitDx(1580, 1)).toBe(0); // icon 1's 7-tick predelay hasn't elapsed yet (K=6-7<=0)
    expect(playerSummaryIconExitDx(1587, 1)).toBe(-63); // icon 1, 7 ticks later, same K=6 shape
  });

  it("bar exit-slide is a flat -2px/tick (no predelay, no acceleration - data[1]'s low nibble never changes)", () => {
    expect(playerSummaryBarExitDx(1573)).toBe(0);
    expect(playerSummaryBarExitDx(1575)).toBe(-2);
    expect(playerSummaryBarExitDx(1584)).toBe(-20);
  });
});

describe("battleMenu: rendered pixels for slice 2 (oracle-pinned, tools/compare/traces/menu-throw.json, 11/11 0-diff)", () => {
  it("Brendan's throw-pose ink color is present at the translated position on the pose-swap tick (1574)", () => {
    expect(pixelAtSentOut(1574, 50, 70)).toEqual([247, 247, 255]);
  });

  it("the thrown ball's ink color is present at its arc position (tick 1607 spawn, tick 1610 mid-arc)", () => {
    expect(pixelAtSentOut(1607, 20, 64)).toEqual([173, 0, 0]);
    expect(pixelAtSentOut(1610, 25, 58)).toEqual([173, 0, 0]);
  });
});
