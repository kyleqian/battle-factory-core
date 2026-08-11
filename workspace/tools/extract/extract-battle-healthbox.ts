// Dev-time extractor: reads reference/pokeemerald's healthbox/healthbar art
// and the FONT_SMALL glyph set battle 1's bring-up needs
// (docs/battle-bringup-notes.md S3 "Healthboxes"). Singles-only subset of
// gHealthboxElementsGfxTable (src/graphics.c:358-372) - the doubles-specific
// entries (status2/3/4, healthbox_doubles_*, misc_frameend, hpbar_anim,
// ball_display, ball_caught_indicator) are out of scope for a Factory
// singles battle's first action menu. Each of these has its own committed
// .png sibling of the raw .4bpp INCBIN'd into the real ROM (confirmed
// byte-for-byte tile-count-equivalent: e.g. hpbar.png is 96x8 = 12 raster
// tiles = hpbar.4bpp's 384 bytes / 32 bytes-per-tile) - decoded from the PNG
// like every other extractor here, never the raw .4bpp.
//
// **None of these sheets use their own embedded PLTE at runtime** (unlike
// every other sheet-style asset extracted this session) - the real game
// copies their raw tile data into two *other* sprites' OBJ VRAM at a fixed
// palette slot, so what matters is whichever sprite's paletteTag governs
// that slot, not the source PNG's own colors. Traced the two relevant tags
// in src/battle_gfx_sfx_util.c:78-81: `TAG_HEALTHBOX_PAL` (the healthbox
// frame sprite's own tag, battle_interface.c:213 etc.) resolves to
// gBattleInterface_BallStatusBarPal (ball_status_bar.png) - covers the
// healthbox frame itself plus status.png/misc.png, which get CpuCopy'd into
// that same sprite's tiles (battle_interface.c:657 for the status ball case,
// same pattern for misc). `TAG_HEALTHBAR_PAL` (the *separate* sliding
// HP-bar-segment sprite, SpriteCB_HealthBar, battle_interface.c:285-317)
// resolves to gBattleInterface_BallDisplayPal (ball_display.png) instead -
// covers hpbar.png/expbar.png, whose tiles get copied into that second
// sprite's OBJ tiles.
// Oracle cross-check status (tests/battleHealthbox.test.ts): a first attempt
// using each PNG's own embedded palette scored 0/20-3/20 exact 8x8-tile
// matches for every sheet here against a live battle-1 frame
// (/tmp/s6-battle1.json, scratch). After this fix, every one of the 6
// distinct colors sampled from the live frame's healthbox-frame area is now
// present exactly in ballStatusBar's palette (confirmed color-by-color) -
// strong evidence the *palette* is now right. Full tile-for-tile matching
// still doesn't reach 100% for any sheet, because (confirmed separately,
// not a decode bug) the real sprite is assembled from a HP/EXP-fill-level-
// dependent *subset* of each sheet's tiles in a different on-screen
// arrangement than the sheet's own raster order (mirrors the trainer-back-pic
// sheet's frame-3-not-frame-0 finding above) - reproducing that arrangement
// is a rendering-code concern for a later engine slice, out of scope for
// this asset-extraction session.
//
// Species name in the healthbox uses FONT_SMALL (battle_interface.c:2156),
// not FONT_NORMAL (already extracted as src/data/gen/font-normal.json) - a
// genuinely different glyph bitmap, extracted here as font-small.json.
// The HP/level digits use FONT_BOLD instead (RenderTextHandleBold,
// battle_interface.c:1204) - but FONT_BOLD has no glyph bitmap of its own
// (sFontInfos[FONT_BOLD] = {} in src/text.c:234); it's FONT_NORMAL's glyphs
// bolded at render time, so there is no separate digit art to extract.
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-healthbox.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");
const BATTLE_INTERFACE = join(REF, "graphics", "battle_interface");

mkdirSync(ASSETS_GEN, { recursive: true });
mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

function loadTileset(pngPath: string) {
  const img = decodeIndexedPng(pngPath);
  const { columns, rows, tiles } = sliceTiles(img);
  return { columns, rows, tiles: tiles.map((t) => [...t.pixels]) };
}

function loadSheet(pngPath: string) {
  const img = decodeIndexedPng(pngPath);
  const { columns, rows, tiles } = sliceTiles(img);
  return { tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) }, palette: img.palette };
}

// gBattleInterface_BallStatusBarPal (graphics.c:354, TAG_HEALTHBOX_PAL) -
// shared by the healthbox frame + status/misc tiles (see header note).
const ballStatusBar = loadSheet(join(BATTLE_INTERFACE, "ball_status_bar.png"));
// gBattleInterface_BallDisplayPal (graphics.c:356, TAG_HEALTHBAR_PAL) -
// shared by the sliding HP/EXP bar-segment tiles (see header note).
const ballDisplayPalette = decodeIndexedPng(join(BATTLE_INTERFACE, "ball_display.png")).palette;

writeJson(join(ASSETS_GEN, "battle-healthbox.json"), {
  // sHealthboxPlayerSpriteTemplates[0] / sHealthboxOpponentSpriteTemplates[0]
  // (battle_interface.c:880-891) - the healthbox frame art itself.
  singlesPlayer: { tileset: loadTileset(join(BATTLE_INTERFACE, "healthbox_singles_player.png")), palette: ballStatusBar.palette },
  singlesOpponent: { tileset: loadTileset(join(BATTLE_INTERFACE, "healthbox_singles_opponent.png")), palette: ballStatusBar.palette },
  // gHealthboxElementsGfxTable[HEALTHBOX_GFX_*] singles-relevant sheets.
  hpbar: { tileset: loadTileset(join(BATTLE_INTERFACE, "hpbar.png")), palette: ballDisplayPalette },
  // HP bar yellow/red fill bands (HEALTHBOX_GFX_HP_BAR_YELLOW/_RED, enum
  // offsets 47/56 - hpbar.png only covers the green band, enum 0-11; ISSUES
  // #16 round 3, docs/healthbox-assembly-notes.md).
  hpbarAnim: { tileset: loadTileset(join(BATTLE_INTERFACE, "hpbar_anim.png")), palette: ballDisplayPalette },
  // HEALTHBOX_GFX_65: status-icon updates replace the normal "P" caption
  // tile with this fixed bar end-cap on opponent healthboxes.
  frameEnd: { tileset: loadTileset(join(BATTLE_INTERFACE, "misc_frameend.png")), palette: ballDisplayPalette },
  expbar: { tileset: loadTileset(join(BATTLE_INTERFACE, "expbar.png")), palette: ballDisplayPalette },
  status: { tileset: loadTileset(join(BATTLE_INTERFACE, "status.png")), palette: ballStatusBar.palette },
  // status2.png = GetStatusIconForBattlerId's BATTLER1 variant - the sheet
  // actually used by the *opponent* healthbox in a singles battle (battler
  // index 1), distinct from `status` (BATTLER0/player). ISSUES #16 round 3.
  status2: { tileset: loadTileset(join(BATTLE_INTERFACE, "status2.png")), palette: ballStatusBar.palette },
  misc: { tileset: loadTileset(join(BATTLE_INTERFACE, "misc.png")), palette: ballStatusBar.palette },
  // The party status summary ball strip itself (CreatePartyStatusSummarySprites),
  // uses its own embedded palette directly (its own sprite's paletteTag).
  ballStatusBar,
});

// --- FONT_SMALL: glyphs (latin_small.png) + widths (fonts.c) ----------------
{
  const fontImage = decodeIndexedPng(join(REF, "graphics", "fonts", "latin_small.png"));
  const CELL = 16;
  const columns = fontImage.width / CELL;
  const rows = fontImage.height / CELL;
  const glyphCount = columns * rows;
  const glyphs: number[][] = [];
  for (let code = 0; code < glyphCount; code += 1) {
    const gx = (code % columns) * CELL;
    const gy = Math.floor(code / columns) * CELL;
    const bitmap: number[] = [];
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        bitmap.push(fontImage.indices[(gy + y) * fontImage.width + (gx + x)]!);
      }
    }
    glyphs.push(bitmap);
  }

  const fontsC = readFileSync(join(REF, "src", "fonts.c"), "utf8");
  const widthsMatch = /gFontSmallLatinGlyphWidths\[\]\s*=\s*\{([^}]*)\}/s.exec(fontsC);
  if (!widthsMatch) throw new Error("could not find gFontSmallLatinGlyphWidths in fonts.c");
  const widths = widthsMatch[1]!
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);
  if (widths.length !== glyphCount) {
    throw new Error(`expected ${glyphCount} glyph widths, parsed ${widths.length}`);
  }

  writeJson(join(DATA_GEN, "font-small.json"), {
    cellSize: CELL,
    columns,
    rows,
    // FONT_SMALL, from sFontInfos in reference/pokeemerald/src/text.c:121-130.
    maxLetterWidth: 5,
    maxLetterHeight: 12,
    letterSpacing: 0,
    glyphs,
    widths,
  });
}
