import { describe, expect, it } from "vitest";
import battleWindow from "../src/assets/gen/battle-window.json" with { type: "json" };
import templates from "../src/data/gen/battle-window-templates.json" with { type: "json" };

// Oracle cross-check (docs/battle-bringup-notes.md's first-action-menu
// scene, scratch trace): rendering this tileset+tilemap+palette reproduces
// 7505/9600 (78%) of the oracle's bottom message/action-menu area
// byte-for-byte - the remaining 22% is text glyphs printed into the window
// interior at runtime (out of scope for this static frame-art extraction),
// not a border/frame decode error. Getting there required the same
// screenSize correction as battle-bg.json's static tilemap: bg0 is
// screenSize=2 (32 wide x 64 tall), not screenSize=1.

describe("battle-window.json", () => {
  it("has a 128x128 (16x16 tile) tileset with 2 subpalettes", () => {
    expect(battleWindow.tileset.columns).toBe(16);
    expect(battleWindow.tileset.rows).toBe(16);
    expect(battleWindow.tileset.tiles).toHaveLength(256);
    expect(battleWindow.palette).toHaveLength(2);
    for (const p of battleWindow.palette) expect(p).toHaveLength(16);
  });

  it("has a 32x64 tilemap (not 64x32 - matches battle-bg's bg0/bg3 screenSize=2 finding)", () => {
    expect(battleWindow.tilemap.width).toBe(32);
    expect(battleWindow.tilemap.height).toBe(64);
    expect(battleWindow.tilemap.entries).toHaveLength(32 * 64);
  });

  it("only uses the 2 loaded subpalettes (0-1)", () => {
    const used = new Set(battleWindow.tilemap.entries.map((e) => e.palette));
    for (const p of used) expect(p).toBeLessThanOrEqual(1);
  });

  it("extracted the glyph fg/bg/shadow text palette (gBattleWindowTextPalette, 16 colors)", () => {
    expect(battleWindow.textPalette).toHaveLength(16);
  });
});

describe("battle-window-templates.json", () => {
  it("pins sStandardBattleWindowTemplates' geometry for the first action menu (battle_bg.c)", () => {
    expect(templates.B_WIN_MSG).toEqual({ bg: 0, tilemapLeft: 2, tilemapTop: 15, width: 26, height: 4, paletteNum: 0, baseBlock: 0x0090 });
    expect(templates.B_WIN_ACTION_PROMPT).toEqual({ bg: 0, tilemapLeft: 1, tilemapTop: 35, width: 14, height: 4, paletteNum: 0, baseBlock: 0x01c0 });
    expect(templates.B_WIN_ACTION_MENU).toEqual({ bg: 0, tilemapLeft: 17, tilemapTop: 35, width: 12, height: 4, paletteNum: 5, baseBlock: 0x0190 });
  });
});
