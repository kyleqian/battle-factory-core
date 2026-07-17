// S4 slice-1 Info-page compositor: the static SUMMARY_MODE_LOCK_MOVES Info
// page reached from the Battle Factory draft menu's SUMMARY option (mon
// idle-animation churn, page-change wipe, and mon-switching are all out of
// scope - see docs/summary-screen-notes.md §7, the resolved implementation
// spec this file follows directly). Renders one rental slot's Info page as a
// single static frame: BG3's info tilemap, then the type/markings/ball/mon
// sprites (back to front), then all BG0 text windows on top.
//
// Built entirely on fadeRender.ts's *Faded primitives called with y=0 (a
// no-op fade, identical output to the unfaded originals) so the same
// compositor serves both the settled render and the S4 entry/exit palette
// fade (renderSummaryInfoPageFaded): BG3 + all BG0 text fade on `bgY`, the
// OBJ sprites (type icons, markings, ball, mon front sprite) fade on `objY`
// - see paletteFade.ts's module doc for why these differ by one tick.

import { createFramebuffer, setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import type { SpriteSheet } from "./sprites.ts";
import { measureText, rightAlignXOffset, type FontData, type TextColors } from "./font.ts";
import { drawSpriteFaded, drawTextFaded, drawTileBgFaded, drawTilePatchFaded, fadeColor } from "./fadeRender.ts";
import { getMonGender } from "./monGender.ts";

import summaryBgData from "../assets/gen/summary-bg.json" with { type: "json" };
import summaryTypeIconsData from "../assets/gen/summary-type-icons.json" with { type: "json" };
import summaryMarkingsData from "../assets/gen/summary-markings.json" with { type: "json" };
import summaryButtonsData from "../assets/gen/summary-buttons.json" with { type: "json" };
import summaryBallData from "../assets/gen/summary-ball.json" with { type: "json" };
import frontSpritesData from "../assets/gen/front-sprites.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import draftPoolHeaderData from "../data/gen/draft-pool-header.json" with { type: "json" };
import summaryInfoData from "../data/gen/summary-info.json" with { type: "json" };
import anchorStateData from "../data/gen/anchor-state.json" with { type: "json" };

interface TileGrid {
  columns: number;
  rows: number;
  tiles: number[][];
}

const summaryBg = summaryBgData as unknown as {
  tileset: TileGrid;
  subpalettes: RgbColor[][];
  pages: { info: { width: number; height: number; entries: Array<{ tile: number; hFlip: boolean; vFlip: boolean; palette: number }> } };
};
const typeIcons = summaryTypeIconsData as unknown as { types: Record<string, { tileset: TileGrid; palette: RgbColor[] }> };
const markings = summaryMarkingsData as unknown as { tileset: TileGrid; spritePalette: RgbColor[] };
const buttons = summaryButtonsData as unknown as { a: { tileset: TileGrid; palette: RgbColor[] } };
const ball = summaryBallData as unknown as { tileset: TileGrid; palette: RgbColor[] };
const frontSprites = frontSpritesData as unknown as Record<string, { tileset: TileGrid; palette: RgbColor[] }>;
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const draftPool = (draftPoolHeaderData as { pool: Array<{ species: string; category: string }> }).pool;
const speciesInfoBySpecies = new Map(
  (summaryInfoData as { species: Array<{ species: string; dexNumber: number; types: string[]; genderRatio: number }> }).species.map((s) => [
    s.species,
    s,
  ]),
);
const abilities = (summaryInfoData as { abilities: Record<string, { name: string; description: string }> }).abilities;
const rentals = (anchorStateData as { rentals: Array<{ species: string; personality: number; ability: string; nature: string; level: number }> })
  .rentals;

// PositionStatusSlidingWindow(0, 0xFF): unconditionally reset on Info-page
// load (pokemon_summary_screen.c:1494) regardless of ailment. Tracing the
// call chain: visibleColumns=0, speed=0xFF clamps to sStatusSlidingWindow's
// width (10) -> PositionStatusSlidingWindow's `speed==width` branch passes
// that clamped 10 (not the 0!) as CopyNColumnsToTilemap's own
// `visibleColumns` -> since width==visibleColumns there, its gfx-copy loop
// is skipped entirely and the block stays `defaultTile`-filled (tile 1,
// palette 0 - a flat fill, oracle-confirmed as solid color (0,107,99) =
// summary-bg.json subpalette 0 index 15) - overwriting page_info.bin's
// static default at (0,18)-(10,20). Every anchor rental has status 0 (no
// ailment), so this always applies for this slice's traces.
const STATUS_WINDOW_CLOSED_TILEMAP = {
  width: 10,
  height: 2,
  entries: Array.from({ length: 20 }, () => ({ tile: 1, hFlip: false, vFlip: false, palette: 0 })),
};

// sSummaryTemplate window pixel origins (tile coords * 8) - see §7's table.
const WIN_TITLE = { x: 0, y: 0 };
const WIN_PROMPT_CANCEL = { x: 176, y: 0 };
const WIN_RENTAL = { x: 88, y: 32 };
const WIN_TYPE = { x: 88, y: 48 };
const WIN_DEX_NUMBER = { x: 8, y: 16 };
const WIN_NICKNAME = { x: 8, y: 96 };
const WIN_SPECIES = { x: 8, y: 112 };
const WIN_ABILITY = { x: 88, y: 72 };
const WIN_MEMO = { x: 88, y: 112 };

// sTextColors[][3] rows ({bgIdx, fgIdx, shadowIdx}) used on this page, plus
// the two named-color {COLOR}/{SHADOW} control-code overrides the nature
// memo string switches to mid-print (text.c / characters.h TEXT_COLOR_*
// literal palette indices - NOT the same table, see §7's memo caveat).
const COLOR_0: TextColors = { bg: 0, fg: 1, shadow: 2 };
const COLOR_1: TextColors = { bg: 0, fg: 3, shadow: 4 };
const COLOR_MALE: TextColors = { bg: 0, fg: 7, shadow: 8 };
const COLOR_FEMALE: TextColors = { bg: 0, fg: 9, shadow: 10 };
const MEMO_NATURE_COLOR: TextColors = { bg: 0, fg: 5, shadow: 6 };
const MEMO_MISC_COLOR: TextColors = COLOR_0;

const PAL6 = 6;
const PAL7 = 7;

// gText_NumberClear01 = "{NO}{CLEAR 1}" and gText_LevelSymbol = "{LV}":
// single-glyph control codes (charmap.txt's bare-word entries `NO = F9 08`,
// `LV = 34`) selecting fixed ligature glyphs ("No." / "Lv"), not sequences of
// ordinary printable characters - extract-charmap's parser only captures
// quoted single-character entries, so these never made it into charmap.json
// as lookupable strings, but font-normal.json's glyph table is a flat
// 512-entry array covering every raw code (0-255 direct, 256+N for the F9 N
// extended range) regardless of charmap coverage, so the already-extracted
// bitmaps at their numeric codes (LV=0x34=52, NO=0x100|0x08=264) are used
// directly here, bypassing the charmap.
const GLYPH_CODE_LV = 52;
const GLYPH_CODE_NO = 264;

function drawGlyphCode(fb: Uint8Array, code: number, x: number, y: number, colors: TextColors, palette: RgbColor[], fadeY: number): number {
  const bitmap = font.glyphs[code];
  const width = (font.widths[code] ?? font.cellSize) + font.letterSpacing;
  if (!bitmap) return width;
  for (let gy = 0; gy < font.glyphHeight; gy += 1) {
    for (let gx = 0; gx < font.cellSize; gx += 1) {
      const raw = bitmap[gy * font.cellSize + gx]!;
      const role = raw === 3 ? 0 : raw;
      if (role === 0) continue;
      const colorIndex = role === 1 ? colors.fg : colors.shadow;
      if (colorIndex === 0) continue;
      const color = palette[colorIndex];
      if (!color) continue;
      const faded = fadeColor(color, fadeY);
      setPixel(fb, x + gx, y + gy, faded.r, faded.g, faded.b);
    }
  }
  return width;
}

const BALL_SHEET: SpriteSheet = { tileset: ball.tileset };
const MARKINGS_SHEET: SpriteSheet = { tileset: markings.tileset };
const A_BUTTON_SHEET: SpriteSheet = { tileset: buttons.a.tileset };

function compose(fb: Uint8Array, selectedSlot: number, bgY: number, objY: number): void {
  const text = (str: string, x: number, y: number, colors: TextColors, paletteNum: number) =>
    drawTextFaded(fb, font, charmap, str, x, y, summaryBg.subpalettes[paletteNum]!, colors, bgY);
  const sprite = (
    sheet: SpriteSheet,
    palette: RgbColor[],
    cx: number,
    cy: number,
    w: number,
    h: number,
    firstRow: number,
    hFlip = false,
  ) => drawSpriteFaded(fb, sheet, palette, cx, cy, w, h, firstRow, objY, hFlip);

  // BG3: the fixed Info-page tilemap (InitBGs points BG3 here permanently -
  // see §2/§7's BG-layering note: for a static Info render, BG1/BG2 sit
  // scrolled off-screen and can be ignored entirely).
  drawTileBgFaded(fb, { tileset: summaryBg.tileset, tilemap: summaryBg.pages.info, subpalettes: summaryBg.subpalettes }, bgY);

  drawTilePatchFaded(fb, summaryBg.tileset, summaryBg.subpalettes, STATUS_WINDOW_CLOSED_TILEMAP, 0, 18 * 8, bgY);

  const pool = draftPool[selectedSlot]!;
  const rental = rentals[selectedSlot]!;
  const info = speciesInfoBySpecies.get(rental.species)!;
  const ability = abilities[rental.ability]!;
  const gender = getMonGender(info.genderRatio, rental.personality);
  const natureName = rental.nature.replace("NATURE_", "");

  // Sprites, back to front (§7's composition order): type icon(s), markings,
  // caught-ball icon, mon front sprite.
  const types = info.types.map((t) => t.replace("TYPE_", ""));
  const type1 = typeIcons.types[types[0]!]!;
  sprite({ tileset: type1.tileset }, type1.palette, 136, 56, 4, 2, 0);
  if (types[1] && types[1] !== types[0]) {
    const type2 = typeIcons.types[types[1]]!;
    sprite({ tileset: type2.tileset }, type2.palette, 176, 56, 4, 2, 0);
  }

  // CreateMonMarkingAllCombosSprite: frame = MON_DATA_MARKINGS (0 for every
  // fresh rental) = the sheet's first 4-tiles-wide row ("all off").
  sprite(MARKINGS_SHEET, markings.spritePalette, 60, 26, 4, 1, 0);

  // CreateCaughtBallSprite(..., 16, 136, 0): every rental is created with
  // MON_DATA_POKEBALL defaulted to ITEM_POKE_BALL (pokemon.c:2261).
  sprite(BALL_SHEET, ball.palette, 16, 136, 2, 2, 0);

  // CreateMonSprite(..., 40, 64, 5): hFlip = !IsMonSpriteNotFlipped(species)
  // - all 6 anchor species have noFlip=FALSE in species_info.h, so hFlip is
  // always TRUE here (unlike the draft screen's unflipped ball-open pic).
  const frontSprite = frontSprites[pool.species]!;
  sprite({ tileset: frontSprite.tileset }, frontSprite.palette, 40, 64, 8, 8, 0, true);

  // BG0 windows, topmost.
  text("POKéMON INFO", WIN_TITLE.x + 2, WIN_TITLE.y + 1, COLOR_1, PAL6);

  // PrintAOrBButtonIcon: BlitBitmapToWindow copies the bitmap's raw palette
  // indices straight into the window's own tile data - so, like the font
  // glyphs, the icon is colored by the WINDOW's palette (7, same as the
  // CANCEL text below), not summary-buttons.json's source-PNG preview
  // palette (a flat grayscale ramp, confirmed by oracle diff: index 5/13 are
  // this subpalette's reds, 15 is white, matching the red-circle/white-A icon).
  const cancelText = "CANCEL";
  const cancelStringX = WIN_PROMPT_CANCEL.x + rightAlignXOffset(font, charmap, cancelText, 62);
  const cancelIconX = Math.max(0, cancelStringX - 16);
  sprite(A_BUTTON_SHEET, summaryBg.subpalettes[PAL7]!, cancelIconX + 8, WIN_PROMPT_CANCEL.y + 8, 2, 2, 0);
  text(cancelText, cancelStringX, WIN_PROMPT_CANCEL.y + 1, COLOR_0, PAL7);

  text("RENTAL POKéMON", WIN_RENTAL.x, WIN_RENTAL.y + 1, COLOR_1, PAL6);
  text("TYPE/", WIN_TYPE.x, WIN_TYPE.y + 1, COLOR_0, PAL6);

  // gText_NumberClear01 = "{NO}{CLEAR 1}" + the zero-padded dex number.
  const noGlyphWidth = drawGlyphCode(fb, GLYPH_CODE_NO, WIN_DEX_NUMBER.x, WIN_DEX_NUMBER.y + 1, COLOR_1, summaryBg.subpalettes[PAL7]!, bgY);
  const CLEAR_1_WIDTH = 1;
  text(
    String(info.dexNumber).padStart(3, "0"),
    WIN_DEX_NUMBER.x + noGlyphWidth + CLEAR_1_WIDTH,
    WIN_DEX_NUMBER.y + 1,
    COLOR_1,
    PAL7,
  );
  text(pool.species, WIN_NICKNAME.x, WIN_NICKNAME.y + 1, COLOR_1, PAL6);

  // gText_LevelSymbol = "{LV}" + the (left-aligned, not zero-padded) level.
  const lvGlyphWidth = drawGlyphCode(
    fb,
    GLYPH_CODE_LV,
    WIN_SPECIES.x + 24,
    WIN_SPECIES.y + 17,
    COLOR_1,
    summaryBg.subpalettes[PAL6]!,
    bgY,
  );
  text(`${rental.level}`, WIN_SPECIES.x + 24 + lvGlyphWidth, WIN_SPECIES.y + 17, COLOR_1, PAL6);
  text(`/${pool.species}`, WIN_SPECIES.x, WIN_SPECIES.y + 1, COLOR_1, PAL6);
  if (gender === "male") text("♂", WIN_SPECIES.x + 57, WIN_SPECIES.y + 17, COLOR_MALE, PAL6);
  else if (gender === "female") text("♀", WIN_SPECIES.x + 57, WIN_SPECIES.y + 17, COLOR_FEMALE, PAL6);

  text(ability.name, WIN_ABILITY.x, WIN_ABILITY.y + 1, COLOR_1, PAL6);
  text(ability.description, WIN_ABILITY.x, WIN_ABILITY.y + 17, COLOR_0, PAL6);

  // gText_XNature: "{DYNAMIC 0}{nature}{DYNAMIC 1} nature" - two-tone via
  // inline {COLOR}/{SHADOW} control codes, not a single sTextColors row (§7).
  text(natureName, WIN_MEMO.x, WIN_MEMO.y + 1, MEMO_NATURE_COLOR, PAL6);
  const natureCursorX = WIN_MEMO.x + measureText(font, charmap, natureName) + font.letterSpacing;
  text(" nature", natureCursorX, WIN_MEMO.y + 1, MEMO_MISC_COLOR, PAL6);
}

export function renderSummaryInfoPage(selectedSlot: number): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, selectedSlot, 0, 0);
  return fb;
}

/** S4 entry/exit fade variant - see module doc. bgY=objY=0 reproduces renderSummaryInfoPage exactly. */
export function renderSummaryInfoPageFaded(selectedSlot: number, bgY: number, objY: number): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, selectedSlot, bgY, objY);
  return fb;
}
