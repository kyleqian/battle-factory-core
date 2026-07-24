// S4/S9 summary compositor for the Battle Factory draft's Info page and the
// source-composed Skills page. Info↔Skills RIGHT uses the real screen's
// layered layout: fixed BG3 + OBJ, an eight-step horizontally moving BG1/BG2
// page block, and BG0 window replacement only after the scroll task finishes.
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
import { drawGlyphCodes, measureText, rightAlignXOffset, type FontData, type TextColors } from "./font.ts";
import { drawSpriteFaded, drawTextFaded, drawTileBgFaded, drawTilePatchFaded, fadeColor } from "./fadeRender.ts";
import { getMonGender } from "./monGender.ts";
import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import type { SummaryPageTransition } from "./summaryScreen.ts";
import { summaryPageLayerOffsets } from "./summaryScreen.ts";

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
import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import itemNamesData from "../data/gen/item-names.json" with { type: "json" };
import expTablesData from "../data/gen/exp-tables.json" with { type: "json" };

interface TileGrid {
  columns: number;
  rows: number;
  tiles: number[][];
}

const summaryBg = summaryBgData as unknown as {
  tileset: TileGrid;
  subpalettes: RgbColor[][];
  pages: Record<"info" | "skills", { width: number; height: number; entries: Array<{ tile: number; hFlip: boolean; vFlip: boolean; palette: number }> }>;
};
const typeIcons = summaryTypeIconsData as unknown as { types: Record<string, { tileset: TileGrid; palette: RgbColor[] }> };
const markings = summaryMarkingsData as unknown as { tileset: TileGrid; spritePalette: RgbColor[] };
const buttons = summaryButtonsData as unknown as { a: { tileset: TileGrid; palette: RgbColor[] } };
const ball = summaryBallData as unknown as { tileset: TileGrid; palette: RgbColor[] };
const frontSprites = frontSpritesData as unknown as Record<string, { tileset: TileGrid; animationFrame1: TileGrid; palette: RgbColor[] }>;
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
const frontierMons = (frontierMonsData as {
  entries: Array<{ index: number; itemName: string }>;
}).entries;
const itemNames = new Map(
  (itemNamesData as { items: Array<{ item: string; name: string }> }).items.map(
    ({ item, name }) => [item, name],
  ),
);
const expTables = expTablesData as {
  growthRates: Record<string, number[]>;
  speciesGrowthRate: Record<string, string>;
};

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
const WIN_SKILLS_ITEM = { x: 80, y: 32 };
const WIN_SKILLS_RIBBON = { x: 160, y: 32 };
const WIN_SKILLS_LABEL_LEFT = { x: 80, y: 56 };
const WIN_SKILLS_LABEL_RIGHT = { x: 176, y: 56 };
const WIN_SKILLS_LABEL_EXP = { x: 80, y: 112 };
const WIN_SKILLS_STATS_LEFT = { x: 128, y: 56 };
const WIN_SKILLS_STATS_RIGHT = { x: 216, y: 56 };
const WIN_SKILLS_EXP = { x: 192, y: 112 };

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
const CHAR_SPACER = 119;

type SummaryTilemap = (typeof summaryBg.pages)["info"];

function tilemapWithOverrides(
  source: SummaryTilemap,
  overrides: ReadonlyArray<{ x: number; y: number; tile: number }>,
): SummaryTilemap {
  const entries = source.entries.slice();
  for (const { x, y, tile } of overrides) {
    const index = y * source.width + x;
    entries[index] = { ...entries[index]!, tile };
  }
  return { ...source, entries };
}

// DrawPagination(page=Skills): tile IDs copied into BG3 while preserving its
// existing palette/flip bits (CopyTileMapEntry palette=16).
const INFO_BG_SKILLS_PAGINATION = tilemapWithOverrides(summaryBg.pages.info, [
  { x: 11, y: 0, tile: 0x46 }, { x: 12, y: 0, tile: 0x47 },
  { x: 13, y: 0, tile: 0x41 }, { x: 14, y: 0, tile: 0x42 },
  { x: 15, y: 0, tile: 0x43 }, { x: 16, y: 0, tile: 0x44 },
  { x: 17, y: 0, tile: 0x48 }, { x: 18, y: 0, tile: 0x49 },
  { x: 11, y: 1, tile: 0x56 }, { x: 12, y: 1, tile: 0x57 },
  { x: 13, y: 1, tile: 0x51 }, { x: 14, y: 1, tile: 0x52 },
  { x: 15, y: 1, tile: 0x53 }, { x: 16, y: 1, tile: 0x54 },
  { x: 17, y: 1, tile: 0x58 }, { x: 18, y: 1, tile: 0x59 },
]);

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

function compose(
  fb: Uint8Array,
  selectedSlot: number,
  bgY: number,
  objY: number,
  page: "info" | "skills",
  monAnimClock: number,
  clearPageWindows = false,
  pageOffsetX = 0,
  destinationChromeInstalled = page === "skills",
): void {
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
  const infoTilemap =
    page === "skills" && destinationChromeInstalled
      ? INFO_BG_SKILLS_PAGINATION
      : summaryBg.pages.info;
  drawTileBgFaded(fb, { tileset: summaryBg.tileset, tilemap: infoTilemap, subpalettes: summaryBg.subpalettes }, bgY);
  if (page === "skills") {
    // BG3 remains the fixed Info page. Skills is the active BG1/BG2 layer;
    // its transparent portrait-side tiles reveal BG3 underneath.
    drawTileBgFaded(
      fb,
      { tileset: summaryBg.tileset, tilemap: summaryBg.pages.skills, subpalettes: summaryBg.subpalettes },
      bgY,
      -pageOffsetX,
    );
  }

  drawTilePatchFaded(fb, summaryBg.tileset, summaryBg.subpalettes, STATUS_WINDOW_CLOSED_TILEMAP, 0, 18 * 8, bgY);

  const pool = draftPool[selectedSlot]!;
  const rental = rentals[selectedSlot]!;
  const info = speciesInfoBySpecies.get(rental.species)!;
  const ability = abilities[rental.ability]!;
  const gender = getMonGender(info.genderRatio, rental.personality);
  const natureName = rental.nature.replace("NATURE_", "");

  // Sprites, back to front (§7's composition order): type icon(s), markings,
  // caught-ball icon, mon front sprite.
  if (page === "info" && !clearPageWindows) {
    const types = info.types.map((t) => t.replace("TYPE_", ""));
    const type1 = typeIcons.types[types[0]!]!;
    sprite({ tileset: type1.tileset }, type1.palette, 136, 56, 4, 2, 0);
    if (types[1] && types[1] !== types[0]) {
      const type2 = typeIcons.types[types[1]]!;
      sprite({ tileset: type2.tileset }, type2.palette, 176, 56, 4, 2, 0);
    }
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
  let monTileset = frontSprite.tileset;
  let monX = 40;
  let monY = 64;
  // ONIX: no species delay; StartSpriteAnim(1) becomes visible at open+6,
  // then ANIM_RAPID_H_HOPS advances from data[2]=0 one callback later.
  // This is source-derived presentation state, not a framebuffer/tick fit.
  if (pool.species === "ONIX" && monAnimClock >= 6) {
    monTileset = frontSprite.animationFrame1;
    const data = Math.max(0, monAnimClock - 7) * 24;
    const phase = Math.floor(data / 512) % 4;
    const within = data % 512;
    // Anim_RapidHorizontalHops wraps its calculation in TryFlipX twice.
    // Summary sprites have sDontFlip=FALSE, so the computed X is negated.
    let computedX = 0;
    if (phase === 0) computedX = Math.trunc((-within * 16) / 512);
    else if (phase === 1) computedX = Math.trunc(within / 32) - 16;
    else if (phase === 2) computedX = Math.trunc(within / 32);
    else computedX = Math.trunc((-within * 16) / 512) + 16;
    monX -= computedX;
    const sine = GBA_SINE_TABLE_256[within % 128]!;
    monY -= Math.floor((sine * 4) / 256);
  }
  sprite({ tileset: monTileset }, frontSprite.palette, monX, monY, 8, 8, 0, true);

  // BG0 windows, topmost.
  text(
    page === "skills" && destinationChromeInstalled ? "POKéMON SKILLS" : "POKéMON INFO",
    WIN_TITLE.x + 2,
    WIN_TITLE.y + 1,
    COLOR_1,
    PAL6,
  );

  // PrintAOrBButtonIcon: BlitBitmapToWindow copies the bitmap's raw palette
  // indices straight into the window's own tile data - so, like the font
  // glyphs, the icon is colored by the WINDOW's palette (7, same as the
  // CANCEL text below), not summary-buttons.json's source-PNG preview
  // palette (a flat grayscale ramp, confirmed by oracle diff: index 5/13 are
  // this subpalette's reds, 15 is white, matching the red-circle/white-A icon).
  const cancelText = "CANCEL";
  const cancelStringX = WIN_PROMPT_CANCEL.x + rightAlignXOffset(font, charmap, cancelText, 62);
  const cancelIconX = Math.max(0, cancelStringX - 16);
  // PrintAOrBButtonIcon blits into the window's own tile data (BG0, not an
  // OBJ sprite - see the palette comment above), so it fades on `bgY`, not
  // `objY` (oracle-verified: the two curves land on visibly different y
  // during the entry fade-in and only bgY matches).
  if (page === "info" && !clearPageWindows) {
    drawSpriteFaded(fb, A_BUTTON_SHEET, summaryBg.subpalettes[PAL7]!, cancelIconX + 8, WIN_PROMPT_CANCEL.y + 8, 2, 2, 0, bgY);
    text(cancelText, cancelStringX, WIN_PROMPT_CANCEL.y + 1, COLOR_0, PAL7);
  }

  if (page === "info" && !clearPageWindows) {
    text("RENTAL POKéMON", WIN_RENTAL.x, WIN_RENTAL.y + 1, COLOR_1, PAL6);
    text("TYPE/", WIN_TYPE.x, WIN_TYPE.y + 1, COLOR_0, PAL6);
  }

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

  if (page === "info" && !clearPageWindows) {
    text(ability.name, WIN_ABILITY.x, WIN_ABILITY.y + 1, COLOR_1, PAL6);
    text(ability.description, WIN_ABILITY.x, WIN_ABILITY.y + 17, COLOR_0, PAL6);

    // gText_XNature: "{DYNAMIC 0}{nature}{DYNAMIC 1} nature" - two-tone via
    // inline {COLOR}/{SHADOW} control codes, not a single sTextColors row (§7).
    text(natureName, WIN_MEMO.x, WIN_MEMO.y + 1, MEMO_NATURE_COLOR, PAL6);
    const natureCursorX = WIN_MEMO.x + measureText(font, charmap, natureName) + font.letterSpacing;
    text(" nature", natureCursorX, WIN_MEMO.y + 1, MEMO_MISC_COLOR, PAL6);
  } else if (page === "skills" && destinationChromeInstalled) {
    const center = (value: string, width: number, inset: number) =>
      inset + Math.max(0, Math.floor((width - measureText(font, charmap, value)) / 2));
    const digitCodes = (value: number, width: number): number[] => {
      const digits = String(value);
      const codes = Array.from({ length: Math.max(0, width - digits.length) }, () => CHAR_SPACER);
      for (const digit of digits) codes.push(charmap.get(digit)!);
      return codes;
    };
    const drawCodes = (codes: readonly number[], x: number, y: number) =>
      drawGlyphCodes(
        fb,
        font,
        codes,
        x,
        y,
        summaryBg.subpalettes[PAL6]!.map((color) => fadeColor(color, bgY)),
        COLOR_0,
      );

    text("HP", WIN_SKILLS_LABEL_LEFT.x + center("HP", 42, 6), WIN_SKILLS_LABEL_LEFT.y + 1, COLOR_1, PAL6);
    text("ATTACK", WIN_SKILLS_LABEL_LEFT.x + center("ATTACK", 42, 6), WIN_SKILLS_LABEL_LEFT.y + 17, COLOR_1, PAL6);
    text("DEFENSE", WIN_SKILLS_LABEL_LEFT.x + center("DEFENSE", 42, 6), WIN_SKILLS_LABEL_LEFT.y + 33, COLOR_1, PAL6);
    text("SP. ATK", WIN_SKILLS_LABEL_RIGHT.x + center("SP. ATK", 36, 2), WIN_SKILLS_LABEL_RIGHT.y + 1, COLOR_1, PAL6);
    text("SP. DEF", WIN_SKILLS_LABEL_RIGHT.x + center("SP. DEF", 36, 2), WIN_SKILLS_LABEL_RIGHT.y + 17, COLOR_1, PAL6);
    text("SPEED", WIN_SKILLS_LABEL_RIGHT.x + center("SPEED", 36, 2), WIN_SKILLS_LABEL_RIGHT.y + 33, COLOR_1, PAL6);
    text("EXP. POINTS", WIN_SKILLS_LABEL_EXP.x + 6, WIN_SKILLS_LABEL_EXP.y + 1, COLOR_1, PAL6);
    text("NEXT LV.", WIN_SKILLS_LABEL_EXP.x + 6, WIN_SKILLS_LABEL_EXP.y + 17, COLOR_1, PAL6);

    const frontierMon = frontierMons.find((entry) => entry.index === (rental as { frontierMonIndex?: number }).frontierMonIndex);
    const itemKey = frontierMon?.itemName.replace("BATTLE_FRONTIER_", "") ?? "ITEM_NONE";
    const item = itemNames.get(itemKey) ?? "NONE";
    text(item, WIN_SKILLS_ITEM.x + center(item, 72, 6), WIN_SKILLS_ITEM.y + 1, COLOR_0, PAL6);
    text("NONE", WIN_SKILLS_RIBBON.x + center("NONE", 70, 6), WIN_SKILLS_RIBBON.y + 1, COLOR_0, PAL6);

    const stats = (rental as unknown as {
      stats: { hp: number; maxHp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number };
    }).stats;
    drawCodes(
      [...digitCodes(stats.hp, 3), charmap.get("/")!, ...digitCodes(stats.maxHp, 3)],
      WIN_SKILLS_STATS_LEFT.x + 4,
      WIN_SKILLS_STATS_LEFT.y + 1,
    );
    drawCodes(digitCodes(stats.attack, 7), WIN_SKILLS_STATS_LEFT.x + 4, WIN_SKILLS_STATS_LEFT.y + 17);
    drawCodes(digitCodes(stats.defense, 7), WIN_SKILLS_STATS_LEFT.x + 4, WIN_SKILLS_STATS_LEFT.y + 33);
    drawCodes(digitCodes(stats.spAttack, 3), WIN_SKILLS_STATS_RIGHT.x + 2, WIN_SKILLS_STATS_RIGHT.y + 1);
    drawCodes(digitCodes(stats.spDefense, 3), WIN_SKILLS_STATS_RIGHT.x + 2, WIN_SKILLS_STATS_RIGHT.y + 17);
    drawCodes(digitCodes(stats.speed, 3), WIN_SKILLS_STATS_RIGHT.x + 2, WIN_SKILLS_STATS_RIGHT.y + 33);

    const growth = expTables.growthRates[expTables.speciesGrowthRate[rental.species]!]!;
    const totalExp = growth[rental.level]!;
    const nextExp = growth[rental.level + 1]! - totalExp;
    const totalCodes = digitCodes(totalExp, 7);
    const nextCodes = digitCodes(nextExp, 6);
    const codeWidth = (codes: readonly number[]) =>
      codes.reduce((sum, code) => sum + (font.widths[code] ?? font.cellSize), 0);
    drawCodes(totalCodes, WIN_SKILLS_EXP.x + 2 + 42 - codeWidth(totalCodes), WIN_SKILLS_EXP.y + 1);
    drawCodes(nextCodes, WIN_SKILLS_EXP.x + 2 + 42 - codeWidth(nextCodes), WIN_SKILLS_EXP.y + 17);
  }
}

export function renderSummaryInfoPage(selectedSlot: number, monAnimClock = 0): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, selectedSlot, 0, 0, "info", monAnimClock);
  return fb;
}

/** S4 entry/exit fade variant - see module doc. bgY=objY=0 reproduces renderSummaryInfoPage exactly. */
export function renderSummaryInfoPageFaded(selectedSlot: number, bgY: number, objY: number): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, selectedSlot, bgY, objY, "info", 0);
  return fb;
}

export function renderSummarySkillsPage(selectedSlot: number, monAnimClock = 0): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, selectedSlot, 0, 0, "skills", monAnimClock);
  return fb;
}

export function renderSummaryInfoPageCleared(selectedSlot: number, monAnimClock: number): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, selectedSlot, 0, 0, "info", monAnimClock, true);
  return fb;
}

export function renderSummaryPageTransition(
  selectedSlot: number,
  transition: SummaryPageTransition,
  monAnimClock: number,
): Uint8Array {
  const fb = createFramebuffer();
  const layers = summaryPageLayerOffsets(transition);
  if (
    transition.fromPage === "info" &&
    transition.toPage === "skills" &&
    transition.direction === "right"
  ) {
    compose(
      fb,
      selectedSlot,
      0,
      0,
      "skills",
      monAnimClock,
      true,
      layers.movingX,
      false,
    );
    return fb;
  }
  // Later page pairs can share the reducer/layer geometry without pretending
  // their still-unimplemented page compositors are accepted.
  compose(fb, selectedSlot, 0, 0, "info", monAnimClock, true);
  return fb;
}
