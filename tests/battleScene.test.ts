import { describe, expect, it } from "vitest";
import {
  advanceBattleScene,
  ballIcons,
  ballStatusBarPositions,
  cursorState,
  CURSOR_START_TICK,
  evaEvb,
  INITIAL_BATTLE_SCENE_STATE,
  shiftBottom,
  shiftTop,
  TEXT_START_TICK,
  TEXT_TOTAL_CHARS,
  textVisibleChars,
  windowRange,
} from "../src/engine/battleScene.ts";

// Oracle/RAM cross-check: tools/compare/traces/scene-assembly.json is NOT
// yet 256/256 (see PROGRESS.md for the current count and the open gap).
// The window/shift schedules below were re-derived this session by scanning
// the oracle's own captured frames (unambiguous ground truth: everything
// outside the window is pure black) - one tick later throughout than the
// naive RAM-tick reading, a consistent "task writes this tick, display
// shows it next tick" lag also confirmed directly via `ram-probe.py` for
// `gBattle_BG1_X` and the scanline buffers (see src/engine/battleScene.ts's
// module doc + docs/battle-scene-notes.md §2).

describe("battleScene: state advance", () => {
  it("has no phase split - elapsed just keeps incrementing forever", () => {
    let state = INITIAL_BATTLE_SCENE_STATE;
    for (let i = 0; i < 500; i += 1) state = advanceBattleScene(state);
    expect(state.elapsed).toBe(500);
  });
});

describe("battleScene: vertical reveal window", () => {
  it("is null (fully black) before tick 1075", () => {
    expect(windowRange(1074)).toBeNull();
    expect(windowRange(1000)).toBeNull();
  });

  it("opens exactly 1px (row 80 only) at tick 1075 (pixel-ground-truthed - the oracle's own capture, not the naive RAM-tick reading)", () => {
    expect(windowRange(1075)).toEqual({ top: 80, bottom: 81 });
  });

  it("grows by 1px top/bottom per tick through tick 1107 (RAM: gBattle_WIN0V -= 0xFF/tick, one tick later than the raw RAM value)", () => {
    expect(windowRange(1080)).toEqual({ top: 75, bottom: 86 });
    expect(windowRange(1106)).toEqual({ top: 49, bottom: 112 });
    expect(windowRange(1107)).toEqual({ top: 48, bottom: 113 });
  });

  it("switches to a 4px/tick second phase from 1108 (RAM: gBattle_WIN0V -= 0x3FC/tick), fully open at 1119", () => {
    expect(windowRange(1108)).toEqual({ top: 44, bottom: 117 });
    expect(windowRange(1118)).toEqual({ top: 4, bottom: 157 });
    expect(windowRange(1119)).toEqual({ top: 0, bottom: 160 });
  });

  it("stays fully open past 1119", () => {
    expect(windowRange(1200)).toEqual({ top: 0, bottom: 160 });
    expect(windowRange(2000)).toEqual({ top: 0, bottom: 160 });
  });
});

describe("battleScene: BLDALPHA schedule (RAM-confirmed, docs/battle-scene-notes.md §2)", () => {
  it("holds 8:8 before tick 1139", () => {
    expect(evaEvb(1000)).toEqual({ eva: 8, evb: 8 });
    expect(evaEvb(1138)).toEqual({ eva: 8, evb: 8 });
  });

  it("steps EVA down / EVB up by 1 every 6 ticks from 1139", () => {
    expect(evaEvb(1139)).toEqual({ eva: 7, evb: 9 });
    expect(evaEvb(1144)).toEqual({ eva: 7, evb: 9 });
    expect(evaEvb(1145)).toEqual({ eva: 6, evb: 10 });
  });

  it("reaches 0:16 at tick 1181 and holds", () => {
    expect(evaEvb(1181)).toEqual({ eva: 0, evb: 16 });
    expect(evaEvb(1226)).toEqual({ eva: 0, evb: 16 });
  });
});

describe("battleScene: per-scanline shift (RAM-confirmed: gTasks[0].data[2], docs/battle-scene-notes.md §2)", () => {
  it("is 0 before tick 1075 and after the slide ends (tick 1227)", () => {
    expect(shiftTop(1074)).toBe(0);
    expect(shiftBottom(1074)).toBe(0);
    expect(shiftTop(1227)).toBe(0);
    expect(shiftBottom(1227)).toBe(0);
    expect(shiftTop(5000)).toBe(0);
  });

  it("holds a constant leftover 240 for ticks 1075-1107 (RAM: gScanlineEffectRegBuffers unwritten by this task yet, one tick later than the raw RAM-tick reading)", () => {
    expect(shiftTop(1075)).toBe(240);
    expect(shiftTop(1107)).toBe(240);
  });

  it("decrements by exactly 2/tick from tick 1108, reaching 2 at tick 1226 (RAM-confirmed via the actual DMA'd buffer content, not just data[2]'s own value)", () => {
    expect(shiftTop(1108)).toBe(238);
    expect(shiftTop(1109)).toBe(236);
    expect(shiftTop(1226)).toBe(2);
  });

  it("top/bottom halves are equal-magnitude opposite sign throughout the shift", () => {
    expect(shiftTop(1150)).toBe(-shiftBottom(1150));
    expect(shiftTop(1200)).toBe(-shiftBottom(1200));
  });
});

describe("battleScene: intro text cadence (docs/battle-scene-notes.md §3.2, 1 tick/char incl. spaces)", () => {
  it("has 39 total printable characters across both lines", () => {
    expect(TEXT_TOTAL_CHARS).toBe(39);
  });

  it("shows 0 characters before the first glyph tick", () => {
    expect(textVisibleChars(TEXT_START_TICK - 1)).toBe(0);
  });

  it("shows exactly 1 char/tick from the first glyph tick, clamped at the total", () => {
    expect(textVisibleChars(TEXT_START_TICK)).toBe(1);
    expect(textVisibleChars(TEXT_START_TICK + 10)).toBe(11);
    expect(textVisibleChars(TEXT_START_TICK + TEXT_TOTAL_CHARS - 1)).toBe(TEXT_TOTAL_CHARS);
    expect(textVisibleChars(TEXT_START_TICK + 1000)).toBe(TEXT_TOTAL_CHARS);
  });
});

describe("battleScene: wait-cursor bob / 36-tick idle cycle (docs/battle-interface-assets.md)", () => {
  it("is hidden before its first draw tick", () => {
    expect(cursorState(CURSOR_START_TICK - 1).visible).toBe(false);
  });

  it("cycles through the 4-phase/9-tick schedule, oracle-confirmed at ticks 1274/1283/1292/1295", () => {
    expect(cursorState(1274)).toEqual({ visible: true, yOffset: 0 });
    expect(cursorState(1282)).toEqual({ visible: true, yOffset: 0 });
    expect(cursorState(1283)).toEqual({ visible: true, yOffset: 1 });
    expect(cursorState(1291)).toEqual({ visible: true, yOffset: 1 });
    expect(cursorState(1292)).toEqual({ visible: true, yOffset: 2 });
    expect(cursorState(1295)).toEqual({ visible: true, yOffset: 2 });
  });

  it("keeps cycling correctly indefinitely past this window (36-tick period)", () => {
    expect(cursorState(1274 + 36)).toEqual(cursorState(1274));
    expect(cursorState(1300 + 36 * 5)).toEqual(cursorState(1300));
  });
});

describe("battleScene: party-status-summary ball-icon + bar widget entrance slide (RAM-confirmed, module doc point 3)", () => {
  it("has 12 icons (6 opponent + 6 player), all hidden before their side's creation tick", () => {
    const icons = ballIcons(1000);
    expect(icons).toHaveLength(12);
    expect(icons.every((icon) => !icon.visible)).toBe(true);
  });

  it("player-side icons/bar become visible at tick 1229, opponent-side at tick 1232 (not simultaneous - one tick later than their own RAM creation tick, the same render lag GAP A found)", () => {
    expect(ballIcons(1228).every((icon) => !icon.visible)).toBe(true);
    expect(ballIcons(1229).slice(6).every((icon) => icon.visible)).toBe(true);
    expect(ballIcons(1229).slice(0, 6).every((icon) => !icon.visible)).toBe(true);
    expect(ballIcons(1232).every((icon) => icon.visible)).toBe(true);
    expect(ballStatusBarPositions(1229).player.visible).toBe(true);
    expect(ballStatusBarPositions(1229).opponent.visible).toBe(false);
    expect(ballStatusBarPositions(1232).opponent.visible).toBe(true);
  });

  it("settles at the CreatePartyStatusSummarySprites corner formula by tick 1292", () => {
    const icons = ballIcons(1292);
    expect(icons[0]).toEqual({ x: 26, y: 32, state: "Empty", visible: true });
    expect(icons[5]).toEqual({ x: 76, y: 32, state: "Full", visible: true });
    expect(icons[6]).toEqual({ x: 156, y: 88, state: "Full", visible: true });
    expect(icons[11]).toEqual({ x: 206, y: 88, state: "Empty", visible: true });
    const bars = ballStatusBarPositions(1292);
    expect(bars.opponent.x).toBe(-24);
    expect(bars.player.x).toBe(136);
  });

  it("mid-slide: player icon 0 offset by its own RAM-baked x2 table (e.g. tick 1230 -> x2=120, tick 1245 -> x2=57)", () => {
    expect(ballIcons(1230)[6]).toEqual({ x: 276, y: 88, state: "Full", visible: true });
    expect(ballIcons(1245)[6]).toEqual({ x: 213, y: 88, state: "Full", visible: true });
  });
});
