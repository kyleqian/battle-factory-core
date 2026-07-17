// Dev-time extractor: reads reference/pokeemerald's Battle Factory
// draft-screen art + the game font, and writes committed, decoded artifacts
// under src/assets/gen/ + src/data/gen/. Run with:
//   node --experimental-strip-types tools/extract/extract-factory-screen.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";
import { loadJascPal } from "./jascPal.ts";
import { loadCharmap } from "./charmap.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });
mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- BG1: the interface chrome (menu.png tileset + menu.bin tilemap) -------
// menu.png supplies its own 32-color palette (2 GBA subpalettes of 16,
// loaded to BG palette slots 0-1 by battle_factory_screen.c); menu.bin is
// the 32x32 GBA screen tilemap referencing that tileset.
{
  const factoryScreenDir = join(REF, "graphics", "battle_frontier", "factory_screen");
  const menuImage = decodeIndexedPng(join(factoryScreenDir, "menu.png"));
  const { columns, rows, tiles } = sliceTiles(menuImage);
  const menuTilemapBuf = readFileSync(join(factoryScreenDir, "menu.bin"));
  const tilemap = parseTilemap(menuTilemapBuf, 32, 32);

  const subpalettes: Array<{ r: number; g: number; b: number }[]> = [
    menuImage.palette.slice(0, 16),
    menuImage.palette.slice(16, 32),
  ];

  writeJson(join(ASSETS_GEN, "menu-bg.json"), {
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    tilemap: { width: tilemap.width, height: tilemap.height, entries: tilemap.entries },
    subpalettes,
  });

  // mon_pic_bg.* - loaded by the draft screen only when opened from the
  // summary screen (BG3, not shown on the plain draft anchor); extracted
  // for completeness per the roadmap brief, unused by the anchor render.
  const monPicBgImage = decodeIndexedPng(join(factoryScreenDir, "mon_pic_bg.png"));
  const monPicTiles = sliceTiles(monPicBgImage);
  const monPicTilemapBuf = readFileSync(join(factoryScreenDir, "mon_pic_bg.bin"));
  writeJson(join(ASSETS_GEN, "mon-pic-bg.json"), {
    tileset: { columns: monPicTiles.columns, rows: monPicTiles.rows, tiles: monPicTiles.tiles.map((t) => [...t.pixels]) },
    palette: monPicBgImage.palette,
    rawTilemapBytes: [...monPicTilemapBuf],
  });
}

// --- OBJ sprites: pokeballs, cursor arrow -----------------------------------
{
  // battle_factory_screen.c: sPokeball_Gfx (factory_screen/pokeball.png) is
  // unused - gPokeballSelection_Gfx (starter_choose/pokeball_selection.png)
  // is the graphic actually loaded for the draft-screen balls. Extract both:
  // the real one for rendering, the nominal one for asset-completeness per
  // the roadmap brief.
  const ballSelectionImage = decodeIndexedPng(join(REF, "graphics", "starter_choose", "pokeball_selection.png"));
  const ballFrames = sliceTiles(ballSelectionImage); // 4x4 8x8 tiles per 32x32 frame, stacked 4 frames tall
  const grayPal = loadJascPal(join(REF, "graphics", "battle_frontier", "factory_screen", "pokeball_gray.pal"));
  const selectedPal = loadJascPal(join(REF, "graphics", "battle_frontier", "factory_screen", "pokeball_selected.pal"));
  writeJson(join(ASSETS_GEN, "pokeball.json"), {
    tileset: { columns: ballFrames.columns, rows: ballFrames.rows, tiles: ballFrames.tiles.map((t) => [...t.pixels]) },
    frameHeightInTiles: 4, // each 32x32 animation frame is 4x4 tiles; frame 0 (rows 0-3) is the static ball used here
    grayPalette: grayPal,
    selectedPalette: selectedPal,
  });

  const factoryScreenDir = join(REF, "graphics", "battle_frontier", "factory_screen");
  const arrowImage = decodeIndexedPng(join(factoryScreenDir, "arrow.png"));
  const arrowTiles = sliceTiles(arrowImage);
  const interfacePal = loadJascPal(join(factoryScreenDir, "interface.pal"));
  writeJson(join(ASSETS_GEN, "arrow.json"), {
    tileset: { columns: arrowTiles.columns, rows: arrowTiles.rows, tiles: arrowTiles.tiles.map((t) => [...t.pixels]) },
    // interface.pal packs 32 entries (2 GBA palettes); the arrow/menu-highlight
    // sprites share OBJ palette slot 0 of that pair.
    palette: interfacePal.slice(0, 16),
  });

  // graphics/battle_frontier/factory_screen/pokeball.png - declared in
  // battle_factory_screen.c as sPokeball_Gfx but never loaded (the comment
  // there says so; gPokeballSelection_Gfx above is what's actually drawn).
  // Extracted anyway for asset-extraction completeness per the roadmap brief.
  const unusedBallImage = decodeIndexedPng(join(factoryScreenDir, "pokeball.png"));
  const unusedBallTiles = sliceTiles(unusedBallImage);
  writeJson(join(ASSETS_GEN, "unused-pokeball-source.json"), {
    tileset: { columns: unusedBallTiles.columns, rows: unusedBallTiles.rows, tiles: unusedBallTiles.tiles.map((t) => [...t.pixels]) },
  });

  // sSpriteTemplate_Select_MenuHighlightLeft/Right (SELECT_WIN_OPTIONS/
  // YES_NO's 2-sprite selection highlight bar, PALTAG_INTERFACE).
  const highlightLeftImage = decodeIndexedPng(join(factoryScreenDir, "menu_highlight_left.png"));
  const highlightLeftTiles = sliceTiles(highlightLeftImage);
  const highlightRightImage = decodeIndexedPng(join(factoryScreenDir, "menu_highlight_right.png"));
  const highlightRightTiles = sliceTiles(highlightRightImage);
  writeJson(join(ASSETS_GEN, "menu-highlight.json"), {
    left: {
      tileset: {
        columns: highlightLeftTiles.columns,
        rows: highlightLeftTiles.rows,
        tiles: highlightLeftTiles.tiles.map((t) => [...t.pixels]),
      },
    },
    right: {
      tileset: {
        columns: highlightRightTiles.columns,
        rows: highlightRightTiles.rows,
        tiles: highlightRightTiles.tiles.map((t) => [...t.pixels]),
      },
    },
    // Shares OBJ palette slot 0 of interface.pal with the arrow sprite.
    palette: interfacePal.slice(0, 16),
  });
}

// --- Text palette ------------------------------------------------------------
{
  const textPal = loadJascPal(join(REF, "graphics", "battle_frontier", "factory_screen", "text.pal"));
  writeJson(join(ASSETS_GEN, "text-palette.json"), { colors: textPal });
}

// --- Font: FONT_NORMAL glyphs + widths + charmap ----------------------------
{
  const fontImage = decodeIndexedPng(join(REF, "graphics", "fonts", "latin_normal.png"));
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
  const widthsMatch = /gFontNormalLatinGlyphWidths\[\]\s*=\s*\{([^}]*)\}/s.exec(fontsC);
  if (!widthsMatch) throw new Error("could not find gFontNormalLatinGlyphWidths in fonts.c");
  const widths = widthsMatch[1]!
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);
  if (widths.length !== glyphCount) {
    throw new Error(`expected ${glyphCount} glyph widths, parsed ${widths.length}`);
  }

  const charmap = loadCharmap(join(REF, "charmap.txt"));

  writeJson(join(DATA_GEN, "font-normal.json"), {
    cellSize: CELL,
    columns,
    rows,
    // FONT_NORMAL, from sFontInfos in reference/pokeemerald/src/text.c.
    maxLetterHeight: 16,
    // DecompressGlyph_Normal (text.c:1883) hardcodes gCurGlyph.height = 15
    // for the Latin glyph path regardless of maxLetterHeight - GLYPH_COPY
    // never blits the glyph cell's 16th row, so it must be excluded here too.
    glyphHeight: 15,
    letterSpacing: 0,
    lineSpacing: 0,
    defaultFgColor: 2,
    defaultBgColor: 1,
    defaultShadowColor: 3,
    widths,
    glyphs,
  });
  writeJson(join(DATA_GEN, "charmap.json"), { entries: [...charmap.entries()] });
}

console.log("extraction complete");
