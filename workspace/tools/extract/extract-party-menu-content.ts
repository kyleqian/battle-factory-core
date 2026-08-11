// Dev-time extractor for the in-battle party-menu content assets that the
// ranked ISSUES #80 binds need but that were not yet extracted from source:
//   - status-condition overlay icons (gStatusGfx_Icons)
//   - the held-item ball/icon (sHeldItemGfx / sHeldItemPalette)
//   - the ♂/♀ gender glyphs (FONT_SMALL, gText_MaleSymbol/FemaleSymbol)
//   - the per-slot sprite coords (sPartyMenuSpriteCoords)
// Writes src/assets/gen/party-menu-content.json. Run with:
//   node --experimental-strip-types tools/extract/extract-party-menu-content.ts
//
// Never imported at runtime - the production build only reads its JSON output.
// Renderer wiring is main-lane follow-up (src/engine/battlePartySelect.ts); this
// step only banks the assets + their Tier-1 pins.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { gbaRoundTrip } from "./gbaColor.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- Status-condition icons -------------------------------------------------
// gStatusGfx_Icons / gStatusPal_Icons = graphics/interface/status_icons.png,
// ".4bpp.lz" / ".gbapal.lz" (src/graphics.c:1119-1120). The PNG is the
// pre-compression source (32x64, 8 rows of 32x8 frames) and its embedded
// palette is the same gStatusPal_Icons data, so we decode from the PNG like
// every other sheet-style extractor here. Sheet size 0x400 bytes =
// 1024/32-per-4bpp-tile = 32 tiles = 8 frames x 4 tiles (32x8 each,
// sOamData_StatusCondition, src/data/party_menu.h:998-1013). Frame order
// (sSpriteTemplate_StatusCondition, party_menu.h:1063-1073):
// poison, paralyzed, sleep, frozen, burn, pokerus, faint, blank; ANIMCMD frame
// offsets 0/4/8/12/16/20/24/28 (party_menu.h:1015-1061).
{
  const image = decodeIndexedPng(join(REF, "graphics", "interface", "status_icons.png"));
  if (image.width !== 32 || image.height !== 64) {
    throw new Error(`status_icons.png: expected 32x64, got ${image.width}x${image.height}`);
  }
  const names = ["poison", "paralyzed", "sleep", "frozen", "burn", "pokerus", "faint", "blank"] as const;
  const frames: Record<string, unknown> = {};
  for (let i = 0; i < names.length; i += 1) {
    // Frame i = sheet rows [i*8, i*8+8) across all 32 columns = 4x1 tiles.
    const tiles: number[][] = [];
    for (let tileX = 0; tileX < 4; tileX += 1) {
      const px: number[] = [];
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const sy = i * 8 + y;
          const sx = tileX * 8 + x;
          px.push(image.indices[sy * image.width + sx]! & 0xf);
        }
      }
      tiles.push(px);
    }
    frames[names[i]] = { columns: 4, rows: 1, tiles };
  }
  writeJson(join(ASSETS_GEN, "party-menu-content.json"), {
    statusIcons: {
      source: {
        graphics: "graphics/interface/status_icons.png",
        rom: "gStatusGfx_Icons / gStatusPal_Icons, src/graphics.c:1119-1120 ('.4bpp.lz'/'.gbapal.lz')",
        order: "sSpriteTemplate_StatusCondition, src/data/party_menu.h:1063-1073",
        frameTiles: "ANIMCMD_FRAME offsets 0/4/8/12/16/20/24/28, party_menu.h:1015-1061",
        oam: "sOamData_StatusCondition (32x8, 4bpp), party_menu.h:998-1013",
      },
      frameNames: [...names],
      frameSize: { width: 32, height: 8 },
      palette: image.palette,
      frames,
    },
  });
}

// --- Held-item icon ---------------------------------------------------------
// sHeldItemGfx = graphics/party_menu/hold_icons.png, ".4bpp" uncompressed;
// sHeldItemPalette = same PNG, ".gbapal" (src/data/party_menu.h:801-802). The
// PNG is 8x16 = two 8x8 frames: frame 0 = held item (the ball marker),
// frame 1 = held mail (sSpriteAnimTable_HeldItem, party_menu.h:821-837). OAM
// is 8x8 4bpp (sOamData_HeldItem, party_menu.h:804-819).
{
  const image = decodeIndexedPng(join(REF, "graphics", "party_menu", "hold_icons.png"));
  if (image.width !== 8 || image.height !== 16) {
    throw new Error(`hold_icons.png: expected 8x16, got ${image.width}x${image.height}`);
  }
  const sliced = sliceTiles(image);
  const frames = {
    item: { columns: 1, rows: 1, tiles: [[...sliced.tiles[0]!.pixels]] },
    mail: { columns: 1, rows: 1, tiles: [[...sliced.tiles[1]!.pixels]] },
  };
  writeJson(join(ASSETS_GEN, "party-menu-held-item.json"), {
    source: {
      graphics: "graphics/party_menu/hold_icons.png",
      rom: "sHeldItemGfx / sHeldItemPalette, src/data/party_menu.h:801-802 ('.4bpp'/'.gbapal')",
      order: "sSpriteAnimTable_HeldItem, party_menu.h:821-837 (frame 0 = item, frame 1 = mail)",
      oam: "sOamData_HeldItem (8x8, 4bpp), party_menu.h:804-819",
    },
    frameNames: ["item", "mail"],
    frameSize: { width: 8, height: 8 },
    palette: image.palette,
    frames,
  });
}

// --- Gender glyphs (FONT_SMALL ♂/♀) ----------------------------------------
// The party menu prints the gender symbol with FONT_SMALL through
// DisplayPartyPokemonBarDetail (src/party_menu.c:2282-2285), using the string
// gText_MaleSymbol/gText_FemaleSymbol (src/strings.c:206-207), colored by
// sFontColorTable[2] = {TRANSPARENT, TEXT_DYNAMIC_COLOR_2, TEXT_DYNAMIC_COLOR_3}
// (src/data/party_menu.h:117). The two dynamic colors are loaded from the
// party-menu palette buffer by DisplayPartyPokemonGender (party_menu.c:2343-
// 2352): sGenderMalePalIds {59,60} / sGenderFemalePalIds {75,76}
// (party_menu.h:579-580) index the party menu's bg.png palette (loaded at
// BG_PLTT_ID(0) for 11 palettes, party_menu.c:749-750) - so male fg/shadow =
// bg palette entries 59/60 (palette 3 colors 11/12) and female = entries 75/76
// (palette 4 colors 11/12). Verified against the oracle (frame 905 of
// scratch-mid-battle-switch-dense-menu-a-off): the rendered ♀ uses exactly the
// round-tripped (255,156,148)/(156,66,57) and ♂ (66,206,255)/(0,99,148).
//
// CHAR_MALE = 0xB5, CHAR_FEMALE = 0xB6 (include/constants/characters.h:106-107)
// index gFontSmallLatinGlyphs (fonts.c:39) directly; the glyph cells are the
// 16x16 2bpp cells of graphics/fonts/latin_small.png at (charCode % 16,
// charCode / 16). Pixel values are the source font's 4-color palette indices:
// 0 = bg (transparent), 1 = fg ink, 2 = shadow ink, 3 = box (also transparent
// when printed). We normalize 1->1, 2->2, 0/3->0 and store the trimmed ink
// bbox with its cell offset so a renderer can print it at the box-rect origin.
{
  const fontImage = decodeIndexedPng(join(REF, "graphics", "fonts", "latin_small.png"));
  const CELL = 16;
  const columns = fontImage.width / CELL;
  const fontsC = readFileSync(join(REF, "src", "fonts.c"), "utf8");
  const widthsMatch = /gFontSmallLatinGlyphWidths\[\]\s*=\s*\{([^}]*)\}/s.exec(fontsC);
  if (!widthsMatch) throw new Error("could not find gFontSmallLatinGlyphWidths in fonts.c");
  const widths = widthsMatch[1]!
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);

  const bgImage = decodeIndexedPng(join(REF, "graphics", "party_menu", "bg.png"));
  // palBuffer copy (party_menu.c:750) snapshots bg.png's palette at slots
  // 0..175 = the 11 party-menu palettes. sGenderMalePalIds/FemalePalIds index
  // that buffer (party_menu.c:2344-2350). Guards pin the source values so a
  // future reference re-pin surfaces a changed palette loudly.
  const maleFg = bgImage.palette[59]!;
  const maleShadow = bgImage.palette[60]!;
  const femaleFg = bgImage.palette[75]!;
  const femaleShadow = bgImage.palette[76]!;
  const near = (a: { r: number; g: number; b: number }, r: number, g: number, b: number) =>
    Math.abs(a.r - r) <= 4 && Math.abs(a.g - g) <= 4 && Math.abs(a.b - b) <= 4;
  if (!near(maleFg, gbaRoundTrip(65), gbaRoundTrip(205), gbaRoundTrip(255))) {
    throw new Error(`bg.png palette[59] = ${maleFg.r},${maleFg.g},${maleFg.b}, expected the male blue ~${gbaRoundTrip(65)},${gbaRoundTrip(205)},${gbaRoundTrip(255)}`);
  }
  if (!near(femaleFg, gbaRoundTrip(255), gbaRoundTrip(156), gbaRoundTrip(148))) {
    throw new Error(`bg.png palette[75] = ${femaleFg.r},${femaleFg.g},${femaleFg.b}, expected the female pink ~${gbaRoundTrip(255)},${gbaRoundTrip(156)},${gbaRoundTrip(148)}`);
  }

  function extractGlyph(charCode: number) {
    const gx = (charCode % columns) * CELL;
    const gy = Math.floor(charCode / columns) * CELL;
    const raw: number[] = [];
    let minX = CELL, minY = CELL, maxX = -1, maxY = -1;
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        const v = fontImage.indices[(gy + y) * fontImage.width + (gx + x)]!;
        const ink = v === 1 || v === 2 ? v : 0;
        raw.push(ink);
        if (ink !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const trimmed: number[] = [];
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        trimmed.push(raw[y * CELL + x]!);
      }
    }
    return {
      charCode,
      glyphId: charCode,
      cellSize: CELL,
      width: widths[charCode]!,
      cellOffsetX: minX,
      cellOffsetY: minY,
      trimmedWidth: maxX - minX + 1,
      trimmedHeight: maxY - minY + 1,
      // 0 = transparent, 1 = fg ink, 2 = shadow ink (source font pixel values
      // 1/2; source values 0 and 3 both print transparent).
      pixels: trimmed,
    };
  }

  writeJson(join(ASSETS_GEN, "party-menu-gender-glyphs.json"), {
    source: {
      font: "FONT_SMALL (latin_small.png), gFontSmallLatinGlyphs, src/fonts.c:39",
      strings: "gText_MaleSymbol / gText_FemaleSymbol, src/strings.c:206-207",
      printSite: "DisplayPartyPokemonBarDetail, src/party_menu.c:2282-2285; DisplayPartyPokemonGender, party_menu.c:2333-2354",
      colorTriple: "sFontColorTable[2], src/data/party_menu.h:117 (TEXT_COLOR_TRANSPARENT / TEXT_DYNAMIC_COLOR_2 / TEXT_DYNAMIC_COLOR_3)",
      colors: "sGenderMalePalIds{59,60} / sGenderFemalePalIds{75,76}, party_menu.h:579-580 into bg.png palette (party_menu.c:749-750)",
      glyphs: "CHAR_MALE 0xB5 / CHAR_FEMALE 0xB6, include/constants/characters.h:106-107; charmap.txt:89-90",
      glyphHeight: "FONT_SMALL maxLetterHeight 12 (src/text.c:121-130); DecompressGlyph_Small hardcodes height 13 for Latin",
      pixelSemantics: "0 = transparent, 1 = fg ink, 2 = shadow ink, 3 = transparent (source 4-color font encoding)",
    },
    glyphs: {
      male: extractGlyph(0xb5),
      female: extractGlyph(0xb6),
    },
    colors: {
      male: { fg: maleFg, shadow: maleShadow },
      female: { fg: femaleFg, shadow: femaleShadow },
    },
  });
}

// --- Cancel/confirm pokeball button sprite -----------------------------------
// CreateCancelConfirmPokeballSprites (src/party_menu.c:1097-1118) ->
// CreatePokeballButtonSprite(198, 148) uses sSpriteTemplate_MenuPokeball
// (src/data/party_menu.h:1107-1130), whose gfx is gPartyMenuPokeballGfx =
// graphics/party_menu/pokeball.png (32x64, two 32x32 frames; frame 0 is the
// static ball). The sprite is blitted pixel-0 transparent; palette index 0 is
// the png's blue (41,131,205) which never renders, so the visible ball is the
// 16x16 at png offset (4,4)-(19,19). Frame 1 (sheet rows [32,64)) is the OPEN
// ball, chosen by AnimatePartySlot (party_menu.c:861-865) for the cursor slot
// (sPokeballAnim_Open, frame offset 16); non-cursor slots use anim 0 (closed).
{
  const image = decodeIndexedPng(join(REF, "graphics", "party_menu", "pokeball.png"));
  if (image.width !== 32 || image.height !== 64) {
    throw new Error(`pokeball.png: expected 32x64, got ${image.width}x${image.height}`);
  }
  const sliced = sliceTiles(image);
  // Frame 0 = sheet rows [0,32) = tiles 0..15, frame 1 = rows [32,64) =
  // tiles 16..31 (each 4 columns x 4 rows).
  const columns = sliced.columns;
  const frameTiles: number[][] = [];
  const frameOpenTiles: number[][] = [];
  for (let i = 0; i < columns * 8; i += 1) {
    (i < columns * 4 ? frameTiles : frameOpenTiles).push([...sliced.tiles[i]!.pixels]);
  }
  writeJson(join(ASSETS_GEN, "party-menu-pokeball.json"), {
    source: {
      graphics: "graphics/party_menu/pokeball.png",
      rom: "gPartyMenuPokeballGfx / sSpriteTemplate_MenuPokeball, src/data/party_menu.h:1107-1130",
      order: "CreatePokeballButtonSprite(198, 148), src/party_menu.c:1114",
      frames: "frame = anim 0 closed (rows [0,32)), frameOpen = anim 1 open (rows [32,64)); AnimatePartySlot (party_menu.c:861-865) picks anim 1 on the cursor slot",
      transparency: "palette index 0 (the png's blue) is OBJ-transparent; the visible ball is the 16x16 at png offset (4,4)-(19,19)",
    },
    frame: { columns, rows: 4, tiles: frameTiles },
    frameOpen: { columns, rows: 4, tiles: frameOpenTiles },
    palette: image.palette,
  });
}

// --- Per-slot sprite coords -------------------------------------------------
// sPartyMenuSpriteCoords (src/data/party_menu.h:68-78): per slot, in order
// icon (x,y), held item (x,y), status condition (x,y), menu Poké Ball (x,y).
// SINGLE is the in-battle menu layout; the full enum is banked for completeness.
{
  const layouts = {
    single: [
      { icon: [16, 40], heldItem: [20, 50], status: [50, 52], pokeball: [16, 34] },
      { icon: [104, 18], heldItem: [108, 28], status: [136, 27], pokeball: [102, 25] },
      { icon: [104, 42], heldItem: [108, 52], status: [136, 51], pokeball: [102, 49] },
      { icon: [104, 66], heldItem: [108, 76], status: [136, 75], pokeball: [102, 73] },
      { icon: [104, 90], heldItem: [108, 100], status: [136, 99], pokeball: [102, 97] },
      { icon: [104, 114], heldItem: [108, 124], status: [136, 123], pokeball: [102, 121] },
    ],
    double: [
      { icon: [16, 24], heldItem: [20, 34], status: [50, 36], pokeball: [16, 18] },
      { icon: [16, 80], heldItem: [20, 90], status: [50, 92], pokeball: [16, 74] },
      { icon: [104, 18], heldItem: [108, 28], status: [136, 27], pokeball: [102, 25] },
      { icon: [104, 50], heldItem: [108, 60], status: [136, 59], pokeball: [102, 57] },
      { icon: [104, 82], heldItem: [108, 92], status: [136, 91], pokeball: [102, 89] },
      { icon: [104, 114], heldItem: [108, 124], status: [136, 123], pokeball: [102, 121] },
    ],
    multi: [
      { icon: [16, 24], heldItem: [20, 34], status: [50, 36], pokeball: [16, 18] },
      { icon: [16, 80], heldItem: [20, 90], status: [50, 92], pokeball: [16, 74] },
      { icon: [104, 26], heldItem: [106, 36], status: [136, 35], pokeball: [102, 33] },
      { icon: [104, 50], heldItem: [106, 60], status: [136, 59], pokeball: [102, 57] },
      { icon: [104, 82], heldItem: [106, 92], status: [136, 91], pokeball: [102, 89] },
      { icon: [104, 106], heldItem: [106, 116], status: [136, 115], pokeball: [102, 113] },
    ],
    multiShowcase: [
      { icon: [16, 32], heldItem: [20, 42], status: [50, 44], pokeball: [16, 26] },
      { icon: [104, 34], heldItem: [106, 44], status: [136, 43], pokeball: [102, 41] },
      { icon: [104, 58], heldItem: [106, 68], status: [136, 67], pokeball: [102, 65] },
      { icon: [16, 104], heldItem: [20, 114], status: [50, 116], pokeball: [16, 98] },
      { icon: [104, 106], heldItem: [106, 116], status: [136, 115], pokeball: [102, 113] },
      { icon: [104, 130], heldItem: [106, 140], status: [136, 139], pokeball: [102, 137] },
    ],
  };
  writeJson(join(ASSETS_GEN, "party-menu-sprite-coords.json"), {
    source: "sPartyMenuSpriteCoords, src/data/party_menu.h:68-78",
    perSlotOrder: ["icon", "heldItem", "status", "pokeball"],
    layouts,
  });
}

console.log("extraction complete");
