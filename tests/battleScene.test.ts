import { describe, expect, it } from "vitest";
import {
  advanceBattleScene,
  ballIcons,
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

// Oracle cross-check (this session's own dense-trace pixel probes against
// tools/compare/traces-groundtruth/battle1-scene-dense.json, not yet
// re-run as a standing fixture): the settled composite (tick 1227+), text
// print cadence, cursor bob schedule, and ball-widget final positions are
// byte-exact; the BattleIntroSlide3 shift/blend window (1075-1226) and the
// ball-widget entrance slide (1230-1291) are this session's best-effort
// model, NOT yet byte-exact - see src/engine/battleScene.ts's module doc.

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

  it("opens as a 1px hairline at tick 1075, centered on row 80", () => {
    expect(windowRange(1075)).toEqual({ top: 80, bottom: 81 });
  });

  it("grows by 1px top and bottom per tick until fully open at tick 1119", () => {
    expect(windowRange(1080)).toEqual({ top: 75, bottom: 86 });
    expect(windowRange(1118)).toEqual({ top: 37, bottom: 124 });
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

describe("battleScene: per-scanline shift (best-effort, see module doc)", () => {
  it("clamps to 0 for both halves once the slide ends (tick 1227)", () => {
    expect(shiftTop(1227)).toBe(0);
    expect(shiftBottom(1227)).toBe(0);
    expect(shiftTop(5000)).toBe(0);
  });

  it("top/bottom halves are equal-magnitude opposite sign before the slide ends", () => {
    expect(shiftTop(1150)).toBe(-shiftBottom(1150));
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

describe("battleScene: party-status-summary ball-icon widgets (docs/battle-interface-assets.md)", () => {
  it("has 12 icons (6 opponent + 6 player) at the CreatePartyStatusSummarySprites corner formula", () => {
    const icons = ballIcons();
    expect(icons).toHaveLength(12);
    expect(icons[0]).toEqual({ x: 26, y: 32, state: "Empty" });
    expect(icons[5]).toEqual({ x: 76, y: 32, state: "Full" });
    expect(icons[6]).toEqual({ x: 156, y: 88, state: "Full" });
    expect(icons[11]).toEqual({ x: 206, y: 88, state: "Empty" });
  });
});
