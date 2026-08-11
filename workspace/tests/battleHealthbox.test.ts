import { describe, expect, it } from "vitest";
import healthbox from "../src/assets/gen/battle-healthbox.json" with { type: "json" };
import fontSmall from "../src/data/gen/font-small.json" with { type: "json" };

// Oracle cross-check (docs/battle-bringup-notes.md's first-action-menu
// scene, scratch trace): all 6 distinct colors sampled from the live
// frame's healthbox-frame area are present exactly in ballStatusBar's
// palette (the one shared by the healthbox frame + status/misc sheets) -
// see tools/extract/extract-battle-healthbox.ts's header note for the full
// palette-sharing story (each sheet does NOT use its own embedded PLTE at
// runtime - two other sprites' paletteTags govern what's actually shown).

describe("battle-healthbox.json", () => {
  it("healthbox frame sheets share ballStatusBar's palette (TAG_HEALTHBOX_PAL), not their own embedded PLTE", () => {
    expect(healthbox.singlesPlayer.palette).toEqual(healthbox.ballStatusBar.palette);
    expect(healthbox.singlesOpponent.palette).toEqual(healthbox.ballStatusBar.palette);
    expect(healthbox.status.palette).toEqual(healthbox.ballStatusBar.palette);
    expect(healthbox.misc.palette).toEqual(healthbox.ballStatusBar.palette);
  });

  it("hpbar/expbar use a distinct palette (TAG_HEALTHBAR_PAL, ball_display.png)", () => {
    expect(healthbox.hpbar.palette).toEqual(healthbox.expbar.palette);
    expect(healthbox.hpbar.palette).not.toEqual(healthbox.ballStatusBar.palette);
  });

  it("pins sheet shapes (singles-only subset of gHealthboxElementsGfxTable)", () => {
    expect(healthbox.singlesPlayer.tileset.columns * healthbox.singlesPlayer.tileset.rows).toBe(128);
    expect(healthbox.singlesOpponent.tileset.columns * healthbox.singlesOpponent.tileset.rows).toBe(64);
    expect(healthbox.hpbar.tileset.tiles).toHaveLength(12);
    expect(healthbox.expbar.tileset.tiles).toHaveLength(9);
    expect(healthbox.status.tileset.tiles).toHaveLength(15);
    expect(healthbox.misc.tileset.tiles).toHaveLength(11);
  });

  it("pins an oracle-confirmed color present in ballStatusBar's palette", () => {
    expect(healthbox.ballStatusBar.palette).toContainEqual({ r: 33, g: 57, b: 0 });
  });
});

describe("font-small.json", () => {
  it("has 512 glyphs (16x32 grid of 16px cells) with matching widths", () => {
    expect(fontSmall.columns).toBe(16);
    expect(fontSmall.rows).toBe(32);
    expect(fontSmall.glyphs).toHaveLength(512);
    expect(fontSmall.widths).toHaveLength(512);
  });

  it("pins FONT_SMALL's metrics from sFontInfos (text.c:121-130)", () => {
    expect(fontSmall.maxLetterWidth).toBe(5);
    expect(fontSmall.maxLetterHeight).toBe(12);
  });

  it("pins the first glyph widths from gFontSmallLatinGlyphWidths", () => {
    expect(fontSmall.widths.slice(0, 5)).toEqual([3, 5, 5, 5, 5]);
  });
});
