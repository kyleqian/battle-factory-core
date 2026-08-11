// S4/S9 summary compositor for the Battle Factory draft's Info, Skills,
// Battle Moves, and Contest Moves pages. Page changes use the real screen's
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
import {
  drawGlyphCodeRows,
  drawGlyphCodes,
  measureText,
  rightAlignXOffset,
  type FontData,
  type TextColors,
} from "./font.ts";
import { drawSpriteFaded, drawTextFaded, drawTileBgFaded, drawTilePatchFaded, fadeColor } from "./fadeRender.ts";
import { drawSpriteSheetAffineRotate } from "./battleScene.ts";
import type {
  SummaryMonTransition,
  SummaryMoveSelectState,
  SummaryPage,
  SummaryPageTransition,
} from "./summaryScreen.ts";
import { summaryPageLayerOffsets } from "./summaryScreen.ts";
import {
  glyphLastRowColumnsForTransfer,
  glyphRasterRowsForTransfer,
  glyphTrailingRowColumnsForTransfer,
  movesWindowTransferAt,
  type MovesWindowTransfer,
} from "./summaryWindowTransfer.ts";
import {
  summaryFrontAnimationForSpecies,
  summaryFrontSpritePresentation,
} from "./summaryFrontAnimation.ts";
import type { FactoryRentalPresentation } from "./factoryRentalPresentation.ts";

import summaryBgData from "../assets/gen/summary-bg.json" with { type: "json" };
import summaryTypeIconsData from "../assets/gen/summary-type-icons.json" with { type: "json" };
import summaryMarkingsData from "../assets/gen/summary-markings.json" with { type: "json" };
import summaryButtonsData from "../assets/gen/summary-buttons.json" with { type: "json" };
import summaryBallData from "../assets/gen/summary-ball.json" with { type: "json" };
import frontSpritesData from "../assets/gen/front-sprites.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import summaryMoveEffectBattleData from "../assets/gen/summary-move-effect-battle.json" with { type: "json" };
import summaryMoveEffectContestData from "../assets/gen/summary-move-effect-contest.json" with { type: "json" };
import summaryMoveEffectCancelData from "../assets/gen/summary-move-effect-cancel.json" with { type: "json" };
import summaryMoveSelectData from "../assets/gen/summary-move-select.json" with { type: "json" };

interface TileGrid {
  columns: number;
  rows: number;
  tiles: number[][];
}

const summaryBg = summaryBgData as unknown as {
  tileset: TileGrid;
  subpalettes: RgbColor[][];
  ppPalette: RgbColor[];
  pages: Record<SummaryPage, { width: number; height: number; entries: Array<{ tile: number; hFlip: boolean; vFlip: boolean; palette: number }> }>;
};
const typeIcons = summaryTypeIconsData as unknown as {
  types: Record<string, { tileset: TileGrid; palette: RgbColor[] }>;
  contestCategories: Record<string, { tileset: TileGrid; palette: RgbColor[] }>;
};
const markings = summaryMarkingsData as unknown as { tileset: TileGrid; spritePalette: RgbColor[] };
const buttons = summaryButtonsData as unknown as { a: { tileset: TileGrid; palette: RgbColor[] } };
const ball = summaryBallData as unknown as { tileset: TileGrid; palette: RgbColor[] };
const frontSprites = frontSpritesData as unknown as Record<string, { tileset: TileGrid; animationFrame1: TileGrid; palette: RgbColor[] }>;
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const moveEffectBattle = summaryMoveEffectBattleData as unknown as {
  tilemap: SummaryTilemap;
  readRows: number;
};
const moveEffectContest = summaryMoveEffectContestData as unknown as {
  tilemap: SummaryTilemap;
  readRows: number;
};
const moveEffectCancel = summaryMoveEffectCancelData as unknown as {
  entries: SummaryTilemap["entries"];
};
const moveSelector = summaryMoveSelectData as unknown as {
  tileset: TileGrid;
  palette: RgbColor[];
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
const WIN_MOVES_NAMES = { x: 120, y: 32 };
const WIN_MOVES_PP = { x: 192, y: 32 };

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
const GLYPH_CODE_PP = 262;
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

// DrawPagination copies the four two-tile dots into fixed BG3 while
// preserving the Info tilemap's palette/flip bits.
function infoBgWithPagination(page: SummaryPage): SummaryTilemap {
  const pageIndex = ["info", "skills", "battleMoves", "contestMoves"].indexOf(page);
  const overrides: Array<{ x: number; y: number; tile: number }> = [];
  for (let i = 0; i < 4; i += 1) {
    const top =
      i < pageIndex ? [0x46, 0x47]
      : i === pageIndex ? (i === 3 ? [0x4b, 0x4c] : [0x41, 0x42])
      : i === 3 ? [0x48, 0x49]
      : [0x43, 0x44];
    overrides.push(
      { x: 11 + i * 2, y: 0, tile: top[0]! },
      { x: 12 + i * 2, y: 0, tile: top[1]! },
      { x: 11 + i * 2, y: 1, tile: top[0]! + 0x10 },
      { x: 12 + i * 2, y: 1, tile: top[1]! + 0x10 },
    );
  }
  return tilemapWithOverrides(summaryBg.pages.info, overrides);
}

// SetDefaultTilemaps -> PositionPowerAccSlidingWindow(0, 0xFF) replaces the
// closed Battle Moves effect panel with transparent tile 0. The source page
// binary carries the open panel art; the runtime copy is part of page setup.
const BATTLE_MOVES_CLOSED_TILEMAP = tilemapWithOverrides(
  summaryBg.pages.battleMoves,
  Array.from({ length: 7 * 10 }, (_, index) => ({
    x: index % 10,
    y: 13 + Math.floor(index / 10),
    tile: 0,
  })),
);

// PositionAppealJamSlidingWindow(0, 0xFF, 0) runs while the summary opens on
// Info. Its width-clamped copy closes the Contest effect panel in the same
// 10x7 portrait-side region as Battle's power/accuracy panel.
const CONTEST_MOVES_CLOSED_TILEMAP = tilemapWithOverrides(
  summaryBg.pages.contestMoves,
  Array.from({ length: 7 * 10 }, (_, index) => ({
    x: index % 10,
    y: 13 + Math.floor(index / 10),
    tile: 0,
  })),
);

function pageTilemap(page: SummaryPage): SummaryTilemap {
  if (page === "battleMoves") return BATTLE_MOVES_CLOSED_TILEMAP;
  if (page === "contestMoves") return CONTEST_MOVES_CLOSED_TILEMAP;
  return summaryBg.pages[page];
}

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
const MOVE_SELECTOR_SHEET: SpriteSheet = { tileset: moveSelector.tileset };

function movesSelectTilemap(page: "battleMoves" | "contestMoves"): SummaryTilemap {
  const base =
    page === "battleMoves" ? BATTLE_MOVES_CLOSED_TILEMAP : CONTEST_MOVES_CLOSED_TILEMAP;
  const entries = base.entries.slice();
  const palette = page === "battleMoves" ? 3 : 1;
  for (let i = 0; i < 20; i += 1) {
    entries[11 * 32 + 10 + i] = {
      ...moveEffectCancel.entries[i]!,
      palette,
    };
    entries[12 * 32 + 10 + i] = {
      ...moveEffectCancel.entries[i]!,
      palette,
    };
    entries[13 * 32 + 10 + i] = {
      ...moveEffectCancel.entries[20 + i]!,
      palette,
    };
  }
  return { ...base, entries };
}

function moveEffectPatch(
  page: "battleMoves" | "contestMoves",
  hiddenColumns: number,
  appeal = 0,
  jam = 0,
): SummaryTilemap {
  const width = 10;
  const height = 7;
  const source =
    page === "battleMoves" ? moveEffectBattle.tilemap : moveEffectContest.tilemap;
  const entries = Array.from({ length: width * height }, () => ({
    tile: 0,
    hFlip: false,
    vFlip: false,
    palette: 0,
  }));
  for (let y = 0; y < height; y += 1) {
    for (let x = hiddenColumns; x < width; x += 1) {
      entries[y * width + x] = source.entries[y * width + x - hiddenColumns]!;
    }
  }
  if (page === "contestMoves" && hiddenColumns === 0) {
    const heart = (filled: boolean, isJam: boolean) => ({
      tile: isJam ? (filled ? 0x3c : 0x3d) : (filled ? 0x3a : 0x39),
      hFlip: false,
      vFlip: false,
      palette: 1,
    });
    for (let i = 0; i < 8; i += 1) {
      const x = 6 + (i & 3);
      const row = Math.floor(i / 4);
      entries[(2 + row) * width + x] = heart(i < appeal / 10, false);
      entries[(4 + row) * width + x] = heart(i < jam / 10, true);
    }
  }
  return { width, height, entries };
}

function compose(
  fb: Uint8Array,
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  bgY: number,
  objY: number,
  page: SummaryPage,
  monAnimClock: number,
  clearPageWindows = false,
  pageOffsetX = 0,
  destinationChromeInstalled = page !== "info",
  monReplacement: {
    readonly spriteSlot?: number;
    readonly typeSlot?: number;
    readonly monInfoSlot?: number;
    readonly abilitySlot?: number;
    readonly memoSlot?: number;
    /** Slot owned by PrintPageSpecificText (moves/stats), one task state after PrintMonInfo. */
    readonly pageTextSlot?: number;
    /** Slot owned by SetTypeIcons, one task state before PrintMonInfo. */
    readonly pageIconSlot?: number;
    readonly movesWindowTransfer?: MovesWindowTransfer;
    readonly abilityDescriptionCharLimit?: number;
    readonly showMon?: boolean;
    readonly showBall?: boolean;
    readonly animateSwitchedMon?: boolean;
    /** Page-owned source callbacks may defer the replacement sprite by ticks. */
    readonly replacementAnimationDelay?: number;
  } = {},
  underlyingPage?: SummaryPage,
  moveSelect?: SummaryMoveSelectState,
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
  const chromePage = destinationChromeInstalled ? page : underlyingPage ?? "info";
  const infoTilemap =
    destinationChromeInstalled
      ? infoBgWithPagination(page)
      : underlyingPage
        ? infoBgWithPagination(underlyingPage)
        : summaryBg.pages.info;
  drawTileBgFaded(fb, { tileset: summaryBg.tileset, tilemap: infoTilemap, subpalettes: summaryBg.subpalettes }, bgY);
  if (underlyingPage && underlyingPage !== "info") {
    drawTileBgFaded(
      fb,
      { tileset: summaryBg.tileset, tilemap: pageTilemap(underlyingPage), subpalettes: summaryBg.subpalettes },
      bgY,
    );
  }
  if (page !== "info") {
    // BG3 remains the fixed Info page. Non-Info pages rotate through BG1/BG2;
    // their transparent portrait-side tiles reveal BG3 underneath.
    drawTileBgFaded(
      fb,
      {
        tileset: summaryBg.tileset,
        tilemap:
          (page === "battleMoves" || page === "contestMoves") &&
          moveSelect &&
          (moveSelect.phase === "open" ? moveSelect.elapsed >= 3 : moveSelect.elapsed === 0)
            ? movesSelectTilemap(page)
            : pageTilemap(page),
        subpalettes: summaryBg.subpalettes,
      },
      bgY,
      -pageOffsetX,
    );
  }

  drawTilePatchFaded(fb, summaryBg.tileset, summaryBg.subpalettes, STATUS_WINDOW_CLOSED_TILEMAP, 0, 18 * 8, bgY);

  const spriteSlot = monReplacement.spriteSlot ?? selectedSlot;
  const typeSlot = monReplacement.typeSlot ?? selectedSlot;
  const monInfoSlot = monReplacement.monInfoSlot ?? selectedSlot;
  const abilitySlot = monReplacement.abilitySlot ?? selectedSlot;
  const memoSlot = monReplacement.memoSlot ?? selectedSlot;
  const pageTextSlot = monReplacement.pageTextSlot ?? selectedSlot;
  const pageIconSlot = monReplacement.pageIconSlot ?? selectedSlot;
  const rental = rentals[monInfoSlot]!;
  if (!rental) throw new Error(`summary rental slot ${monInfoSlot} is unavailable`);

  // Sprites, back to front (§7's composition order): type icon(s), markings,
  // caught-ball icon, mon front sprite.
  if (page === "info" && !clearPageWindows) {
    const typeRental = rentals[typeSlot]!;
    if (!typeRental) throw new Error(`summary type rental slot ${typeSlot} is unavailable`);
    const types = typeRental.types.map((t) => t.replace("TYPE_", ""));
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
  if (monReplacement.showBall !== false) {
    sprite(BALL_SHEET, ball.palette, 16, 136, 2, 2, 0);
  }

  // CreateMonSprite(..., 40, 64, 5): hFlip = !IsMonSpriteNotFlipped(species)
  // - all 6 anchor species have noFlip=FALSE in species_info.h, so hFlip is
  // always TRUE here (unlike the draft screen's unflipped ball-open pic).
  const spriteRental = rentals[spriteSlot]!;
  if (!spriteRental) throw new Error(`summary sprite rental slot ${spriteSlot} is unavailable`);
  const frontSprite = frontSprites[spriteRental.frontPicSpecies];
  // The current front-pic asset tranche covers the canonical six. A live
  // generated rental keeps its exact front-pic identity in state and never
  // substitutes anchor art; until that species asset exists, only the
  // portrait layer is absent while all record-backed text remains visible.
  if (frontSprite) {
    let presentationClock = monAnimClock;
    if (monReplacement.replacementAnimationDelay) {
      const motionType = summaryFrontAnimationForSpecies(spriteRental.frontPicSpecies).motion.type;
      presentationClock =
        motionType === "ANIM_RAPID_H_HOPS"
          ? monAnimClock
          : monAnimClock - monReplacement.replacementAnimationDelay;
    }
    const frontPresentation = summaryFrontSpritePresentation(
      spriteRental.frontPicSpecies,
      presentationClock,
      monReplacement.animateSwitchedMon === true,
    );
    const monTileset =
      frontPresentation.frame === 1 ? frontSprite.animationFrame1 : frontSprite.tileset;
    const monX = 40 + frontPresentation.x2;
    const monY = 64 + frontPresentation.y2;
    if (
      monReplacement.showMon !== false &&
      frontPresentation.affine
    ) {
      drawSpriteSheetAffineRotate(
        fb,
        monTileset,
        frontSprite.palette.map((color) => fadeColor(color, objY)),
        monX,
        monY,
        -frontPresentation.affine.xScale,
        0,
        0,
        frontPresentation.affine.yScale,
        undefined,
        true,
      );
    } else if (monReplacement.showMon !== false) {
      sprite({ tileset: monTileset }, frontSprite.palette, monX, monY, 8, 8, 0, true);
    }
  }

  const moveSelectInstalled =
    moveSelect !== undefined &&
    (moveSelect.phase === "closing" || moveSelect.elapsed >= 3);
  if (moveSelectInstalled) {
    const hiddenColumns =
      moveSelect.phase === "closing"
        ? Math.min(10, moveSelect.elapsed * 3)
        : Math.max(0, 9 - (moveSelect.elapsed - 2) * 3);
    const presentedMove = rental.moves[moveSelect.presentedMoveIndex]!;
    drawTilePatchFaded(
      fb,
      summaryBg.tileset,
      summaryBg.subpalettes,
      moveEffectPatch(
        page as "battleMoves" | "contestMoves",
        hiddenColumns,
        presentedMove.contest.appeal,
        presentedMove.contest.jam,
      ),
      0,
      13 * 8,
      bgY,
    );
  }

  // BG0 windows, topmost.
  text(
    chromePage === "skills" ? "POKéMON SKILLS"
      : chromePage === "battleMoves" ? "BATTLE MOVES"
      : chromePage === "contestMoves" ? "CONTEST MOVES"
      : "POKéMON INFO",
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
  if ((chromePage === "battleMoves" || chromePage === "contestMoves") && !clearPageWindows) {
    const infoText = "INFO";
    const infoStringX = WIN_PROMPT_CANCEL.x + rightAlignXOffset(font, charmap, infoText, 62);
    const infoIconX = Math.max(0, infoStringX - 16);
    drawSpriteFaded(fb, A_BUTTON_SHEET, summaryBg.subpalettes[PAL7]!, infoIconX + 8, WIN_PROMPT_CANCEL.y + 8, 2, 2, 0, bgY);
    text(infoText, infoStringX, WIN_PROMPT_CANCEL.y + 1, COLOR_0, PAL7);
  }

  if (page === "info" && !clearPageWindows) {
    text("RENTAL POKéMON", WIN_RENTAL.x, WIN_RENTAL.y + 1, COLOR_1, PAL6);
    text("TYPE/", WIN_TYPE.x, WIN_TYPE.y + 1, COLOR_0, PAL6);
  }

  // gText_NumberClear01 = "{NO}{CLEAR 1}" + the zero-padded dex number.
  const noGlyphWidth = drawGlyphCode(fb, GLYPH_CODE_NO, WIN_DEX_NUMBER.x, WIN_DEX_NUMBER.y + 1, COLOR_1, summaryBg.subpalettes[PAL7]!, bgY);
  const CLEAR_1_WIDTH = 1;
  if (rental.dexNumber !== null) {
    text(
      String(rental.dexNumber).padStart(3, "0"),
      WIN_DEX_NUMBER.x + noGlyphWidth + CLEAR_1_WIDTH,
      WIN_DEX_NUMBER.y + 1,
      COLOR_1,
      PAL7,
    );
  }
  text(rental.name, WIN_NICKNAME.x, WIN_NICKNAME.y + 1, COLOR_1, PAL6);

  // gText_LevelSymbol = "{LV}" + the (left-aligned, not zero-padded) level.
  if (!moveSelectInstalled) {
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
    text(`/${rental.name}`, WIN_SPECIES.x, WIN_SPECIES.y + 1, COLOR_1, PAL6);
    if (rental.gender === "male") text("♂", WIN_SPECIES.x + 57, WIN_SPECIES.y + 17, COLOR_MALE, PAL6);
    else if (rental.gender === "female") text("♀", WIN_SPECIES.x + 57, WIN_SPECIES.y + 17, COLOR_FEMALE, PAL6);
  }

  if (page === "info" && !clearPageWindows) {
    const abilityRental = rentals[abilitySlot]!;
    if (!abilityRental) throw new Error(`summary ability rental slot ${abilitySlot} is unavailable`);
    const ability = abilityRental.ability;
    const memoRental = rentals[memoSlot]!;
    if (!memoRental) throw new Error(`summary memo rental slot ${memoSlot} is unavailable`);
    const natureName = memoRental.nature;
    if (ability.name !== null) {
      text(ability.name, WIN_ABILITY.x, WIN_ABILITY.y + 1, COLOR_1, PAL6);
    }
    const abilityDescription =
      ability.description === null
        ? ""
        : monReplacement.abilityDescriptionCharLimit === undefined
        ? ability.description
        : ability.description.slice(0, monReplacement.abilityDescriptionCharLimit);
    text(abilityDescription, WIN_ABILITY.x, WIN_ABILITY.y + 17, COLOR_0, PAL6);

    // gText_XNature: "{DYNAMIC 0}{nature}{DYNAMIC 1} nature" - two-tone via
    // inline {COLOR}/{SHADOW} control codes, not a single sTextColors row (§7).
    text(natureName, WIN_MEMO.x, WIN_MEMO.y + 1, MEMO_NATURE_COLOR, PAL6);
    const natureCursorX = WIN_MEMO.x + measureText(font, charmap, natureName) + font.letterSpacing;
    text(" nature", natureCursorX, WIN_MEMO.y + 1, MEMO_MISC_COLOR, PAL6);
  } else if (page === "skills" && destinationChromeInstalled && !clearPageWindows) {
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

    const item = rental.item.name;
    text(item, WIN_SKILLS_ITEM.x + center(item, 72, 6), WIN_SKILLS_ITEM.y + 1, COLOR_0, PAL6);
    text("NONE", WIN_SKILLS_RIBBON.x + center("NONE", 70, 6), WIN_SKILLS_RIBBON.y + 1, COLOR_0, PAL6);

    const stats = rental.stats;
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

    const totalExp = rental.experience;
    const nextExp = rental.nextLevelExperience;
    const totalCodes = digitCodes(totalExp, 7);
    const nextCodes = digitCodes(nextExp, 6);
    const codeWidth = (codes: readonly number[]) =>
      codes.reduce((sum, code) => sum + (font.widths[code] ?? font.cellSize), 0);
    drawCodes(totalCodes, WIN_SKILLS_EXP.x + 2 + 42 - codeWidth(totalCodes), WIN_SKILLS_EXP.y + 1);
    drawCodes(nextCodes, WIN_SKILLS_EXP.x + 2 + 42 - codeWidth(nextCodes), WIN_SKILLS_EXP.y + 17);
  } else if (
    (page === "battleMoves" || page === "contestMoves") &&
    destinationChromeInstalled &&
    !clearPageWindows
  ) {
    const pageRental = rentals[pageTextSlot]!;
    const iconRental = rentals[pageIconSlot]!;
    if (!pageRental) throw new Error(`summary page rental slot ${pageTextSlot} is unavailable`);
    if (!iconRental) throw new Error(`summary icon rental slot ${pageIconSlot} is unavailable`);
    const ppPalette = [
      summaryBg.subpalettes[0]![0]!,
      ...summaryBg.ppPalette.slice(0, 15),
    ].map((color) => fadeColor(color, bgY));
    const codeWidth = (codes: readonly number[]) =>
      codes.reduce(
        (sum, code) => sum + (font.widths[code] ?? font.cellSize) + font.letterSpacing,
        0,
      );
    for (let i = 0; i < 4; i += 1) {
      const move = pageRental.moves[i]!;
      const y = i * 16 + 1;
      const windowTransfer = monReplacement.movesWindowTransfer;
      const namesTransfer = windowTransfer?.names ?? { completeRows: 4 };
      const ppTransfer = windowTransfer?.pp ?? { completeRows: 4 };
      if (i < namesTransfer.completeRows) {
        text(move.name, WIN_MOVES_NAMES.x, WIN_MOVES_NAMES.y + y, COLOR_1, PAL6);
      }
      const currentPp = move.currentPp;
      const ppCodes = [
        GLYPH_CODE_PP,
        ...String(currentPp).padStart(2, " ").split("").map((char) =>
          char === " " ? CHAR_SPACER : charmap.get(char)!),
        charmap.get("/")!,
        ...String(move.maxPp).padStart(2, " ").split("").map((char) =>
          char === " " ? CHAR_SPACER : charmap.get(char)!),
      ];
      const ppX = WIN_MOVES_PP.x + 44 - codeWidth(ppCodes);
      if (i < ppTransfer.completeRows) {
        drawGlyphCodes(
          fb,
          font,
          ppCodes,
          ppX,
          WIN_MOVES_PP.y + y,
          ppPalette,
          { bg: 0, fg: 7, shadow: 8 },
        );
      } else if (ppTransfer.partialRow?.row === i) {
        let glyphX = ppX;
        for (const [glyphIndex, code] of ppCodes.entries()) {
          const rasterRows = glyphRasterRowsForTransfer(
            ppTransfer,
            i,
            glyphIndex,
            font.glyphHeight,
          );
          drawGlyphCodeRows(
            fb,
            font,
            code,
            glyphX,
            WIN_MOVES_PP.y + y,
            ppPalette,
            { bg: 0, fg: 7, shadow: 8 },
            rasterRows,
            glyphTrailingRowColumnsForTransfer(ppTransfer, i, glyphIndex) ??
              glyphLastRowColumnsForTransfer(ppTransfer, i, glyphIndex),
          );
          glyphX += font.widths[code] ?? font.cellSize;
        }
      }
      const icon =
        page === "contestMoves"
          ? typeIcons.contestCategories[
              iconRental.moves[i]!.contest.category.replace("CONTEST_CATEGORY_", "")
            ]!
          : typeIcons.types[
              iconRental.moves[i]!.type.replace("TYPE_", "")
            ]!;
      sprite({ tileset: icon.tileset }, icon.palette, 101, 40 + i * 16, 4, 2, 0);
    }

    const showMoveDetails =
      moveSelect &&
      (moveSelect.phase === "open"
        ? moveSelect.elapsed >= 3
        : moveSelect.elapsed === 0);
    const showCancel =
      moveSelect &&
      (moveSelect.phase === "open"
        ? moveSelect.elapsed >= (page === "contestMoves" ? 2 : 3)
        : moveSelect.elapsed === 0);
    if (showCancel) {
      text("CANCEL", WIN_MOVES_NAMES.x, WIN_MOVES_NAMES.y + 65, COLOR_1, PAL6);
    }
    if (showMoveDetails) {
      const presentedMove = pageRental.moves[moveSelect.presentedMoveIndex]!;
      const description =
        page === "contestMoves"
          ? presentedMove.contest.description
          : presentedMove.description;
      for (const [lineIndex, line] of description.split("\n").entries()) {
        text(line, 86, 121 + lineIndex * 16, COLOR_0, PAL6);
      }
      const panelFullyOpen =
        (moveSelect.phase === "open" && moveSelect.elapsed >= 5) ||
        (moveSelect.phase === "closing" && moveSelect.elapsed === 0);
      if (panelFullyOpen) {
        // PrintMovePowerAndAccuracy's already-mapped label window reaches
        // VRAM one tick before the description/selector OAM handoff.
        const powerMoveIndex =
          moveSelect.pendingPresentationTicks > 1
            ? moveSelect.presentedMoveIndex
            : moveSelect.selectedMoveIndex;
        const detailMove = pageRental.moves[powerMoveIndex]!;
        text(page === "contestMoves" ? "APPEAL" : "POWER", 8, 121, COLOR_1, PAL6);
        text(page === "contestMoves" ? "JAM" : "ACCURACY", 8, 137, COLOR_1, PAL6);
        if (page === "contestMoves") {
          // DrawContestMoveHearts owns the BG tilemap values; there are no
          // numeric values in the Contest label window.
        } else {
          const valueCodes = (value: number, isPower: boolean) =>
            value < (isPower ? 2 : 1)
              ? "---".split("").map((char) => charmap.get(char)!)
              : [
                  ...Array.from(
                    { length: Math.max(0, 3 - String(value).length) },
                    () => CHAR_SPACER,
                  ),
                  ...String(value).split("").map((char) => charmap.get(char)!),
                ];
          drawGlyphCodes(
            fb,
            font,
            valueCodes(detailMove.power, true),
            61,
            121,
            summaryBg.subpalettes[PAL6]!,
            COLOR_0,
          );
          drawGlyphCodes(
            fb,
            font,
            valueCodes(detailMove.accuracy, false),
            61,
            137,
            summaryBg.subpalettes[PAL6]!,
            COLOR_0,
          );
        }
      }

      const selectorCounter =
        moveSelect.selectorAnimationClock < 2
          ? 0
          : (moveSelect.selectorAnimationClock - 2) & 0x1f;
      if (selectorCounter <= 24) {
        for (let i = 0; i < 10; i += 1) {
          sprite(
            MOVE_SELECTOR_SHEET,
            moveSelector.palette,
            i * 16 + 89,
            40 + moveSelect.presentedMoveIndex * 16,
            2,
            2,
            i === 0 || i === 9 ? 8 : 10,
            i === 9,
          );
        }
      }
    }
  }
}

export function renderSummaryInfoPage(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  monAnimClock = 0,
  animateSwitchedMon = false,
): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, rentals, selectedSlot, 0, 0, "info", monAnimClock, false, 0, false, {
    animateSwitchedMon,
  });
  return fb;
}

/** S4 entry/exit fade variant - see module doc. bgY=objY=0 reproduces renderSummaryInfoPage exactly. */
export function renderSummaryInfoPageFaded(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  bgY: number,
  objY: number,
  monAnimClock = 0,
  animateSwitchedMon = false,
): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, rentals, selectedSlot, bgY, objY, "info", monAnimClock, false, 0, false, {
    animateSwitchedMon,
  });
  return fb;
}

export function renderSummarySkillsPage(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  monAnimClock = 0,
  animateSwitchedMon = false,
): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, rentals, selectedSlot, 0, 0, "skills", monAnimClock, false, 0, true, {
    animateSwitchedMon,
  });
  return fb;
}

export function renderSummaryBattleMovesPage(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  monAnimClock = 0,
  animateSwitchedMon = false,
): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, rentals, selectedSlot, 0, 0, "battleMoves", monAnimClock, false, 0, true, {
    animateSwitchedMon,
  });
  return fb;
}

export function renderSummaryBattleMoveSelectPage(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  monAnimClock: number,
  moveSelect: SummaryMoveSelectState,
  animateSwitchedMon = false,
  page: "battleMoves" | "contestMoves" = "battleMoves",
): Uint8Array {
  const fb = createFramebuffer();
  compose(
    fb,
    rentals,
    selectedSlot,
    0,
    0,
    page,
    monAnimClock,
    false,
    0,
    true,
    { animateSwitchedMon },
    undefined,
    moveSelect,
  );
  return fb;
}

export function renderSummaryContestMovesPage(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  monAnimClock = 0,
  animateSwitchedMon = false,
): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, rentals, selectedSlot, 0, 0, "contestMoves", monAnimClock, false, 0, true, {
    animateSwitchedMon,
    // Contest's longer page-specific text copy defers the replacement sprite
    // callback by one presentation tick without delaying controller input.
    replacementAnimationDelay: animateSwitchedMon ? 1 : 0,
  });
  return fb;
}

export function renderSummaryPageFaded(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  page: SummaryPage,
  bgY: number,
  objY: number,
  monAnimClock = 0,
  animateSwitchedMon = false,
): Uint8Array {
  const fb = createFramebuffer();
  compose(fb, rentals, selectedSlot, bgY, objY, page, monAnimClock, false, 0, page !== "info", {
    animateSwitchedMon,
  });
  return fb;
}

export function renderSummaryPageCleared(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  monAnimClock: number,
  page: SummaryPage = "info",
  animateSwitchedMon = false,
): Uint8Array {
  const fb = createFramebuffer();
  compose(
    fb,
    rentals,
    selectedSlot,
    0,
    0,
    page,
    monAnimClock,
    true,
    0,
    page !== "info",
    { animateSwitchedMon },
    page === "info" ? undefined : page,
  );
  return fb;
}

/**
 * Task_ChangeSummaryMon's source-ordered Info-page replacement. Each field
 * switches ownership only when its task state becomes visible; the old
 * portrait is absent while graphics and sprite resources are rebuilt.
 */
export function renderSummaryMonTransition(
  rentals: readonly FactoryRentalPresentation[],
  transition: SummaryMonTransition,
  oldMonAnimClock: number,
  sourceIsReplacement = false,
  page: SummaryPage = "info",
): Uint8Array {
  const elapsed = transition.elapsed;
  const spriteIsNew = elapsed >= 16;
  const movesWindowTransfer =
    page === "battleMoves" || page === "contestMoves"
      ? movesWindowTransferAt(elapsed, sourceIsReplacement, page)
      : undefined;
  const pageTextUsesSource = movesWindowTransfer?.textOwner === "source";
  const fb = createFramebuffer();
  compose(
    fb,
    rentals,
    transition.fromSlot,
    0,
    0,
    page,
    spriteIsNew ? 0 : oldMonAnimClock + (sourceIsReplacement ? elapsed : 0),
    false,
    0,
    page !== "info",
    {
      spriteSlot: spriteIsNew ? transition.toSlot : transition.fromSlot,
      typeSlot: elapsed >= 17 ? transition.toSlot : transition.fromSlot,
      monInfoSlot: elapsed >= 18 ? transition.toSlot : transition.fromSlot,
      abilitySlot: elapsed >= 19 ? transition.toSlot : transition.fromSlot,
      memoSlot: elapsed >= 20 ? transition.toSlot : transition.fromSlot,
      pageTextSlot:
        elapsed >= 19 && !pageTextUsesSource
          ? transition.toSlot
          : transition.fromSlot,
      pageIconSlot: elapsed >= 17 ? transition.toSlot : transition.fromSlot,
      movesWindowTransfer,
      // The first replacement after page construction inherits the initial
      // window-copy queue: AddTextPrinter's speed-0 callback exposes 21
      // printable characters here and the remainder lands next VBlank.
      // Subsequent replacements start from an already installed rental
      // window and complete this field within the same callback.
      abilityDescriptionCharLimit:
        page === "info" && elapsed === 19 && !sourceIsReplacement ? 21 : undefined,
      showMon: elapsed < 3 || spriteIsNew,
      showBall: elapsed < 4 || elapsed >= 12,
      animateSwitchedMon: !spriteIsNew && sourceIsReplacement,
      replacementAnimationDelay:
        page === "contestMoves" && sourceIsReplacement ? 1 : 0,
    },
  );
  if (elapsed === 19 && !sourceIsReplacement) {
    if (page === "battleMoves" || page === "contestMoves") {
      const handoff = movesWindowTransferAt(
        elapsed,
        sourceIsReplacement,
        page,
      ).pp.clearHandoff;
      if (handoff) {
        const cleared = renderSummaryPageCleared(rentals, transition.toSlot, 0, page);
        // PP layout is always the 10px PP glyph plus five 6px cells,
        // right-aligned in the source's 44px field: its glyph origin is +4.
        const x0 = WIN_MOVES_PP.x + 4 + handoff.glyphX;
        const y0 = WIN_MOVES_PP.y + handoff.row * 16 + 1 + handoff.glyphY;
        for (let y = y0; y < y0 + handoff.height; y += 1) {
          for (let x = x0; x < x0 + handoff.width; x += 1) {
            const offset = (y * 240 + x) * 4;
            fb[offset] = cleared[offset]!;
            fb[offset + 1] = cleared[offset + 1]!;
            fb[offset + 2] = cleared[offset + 2]!;
            fb[offset + 3] = cleared[offset + 3]!;
          }
        }
      }
      return fb;
    }
    const description = rentals[transition.toSlot]!.ability.description ?? "";
    const prefix = description.slice(0, 21);
    const glyphX = WIN_ABILITY.x + measureText(font, charmap, prefix);
    const glyphWidth = measureText(font, charmap, description.slice(0, 22)) - measureText(font, charmap, prefix);
    const glyphY = WIN_ABILITY.y + 17;

    // The speed-0 printer has reached the 22nd glyph when this render scans
    // out, but only its first 9 cell rows have crossed COPYWIN_GFX yet.
    // Model that window-transfer boundary from glyph metrics (not pixels).
    const partial = createFramebuffer();
    compose(partial, rentals, transition.fromSlot, 0, 0, "info", oldMonAnimClock, false, 0, false, {
      spriteSlot: transition.toSlot,
      typeSlot: transition.toSlot,
      monInfoSlot: transition.toSlot,
      abilitySlot: transition.toSlot,
      memoSlot: transition.fromSlot,
      abilityDescriptionCharLimit: 22,
      showMon: true,
      showBall: true,
      animateSwitchedMon: false,
    });
    for (let y = glyphY; y < glyphY + 9; y += 1) {
      for (let x = glyphX; x < glyphX + glyphWidth; x += 1) {
        const offset = (y * 240 + x) * 4;
        fb[offset] = partial[offset]!;
        fb[offset + 1] = partial[offset + 1]!;
        fb[offset + 2] = partial[offset + 2]!;
        fb[offset + 3] = partial[offset + 3]!;
      }
    }
    // COPYWIN_GFX is 4bpp: the next transferred halfword contributes four
    // pixels of row 10 before scanout reaches this OBJ/BG composition.
    for (let x = glyphX; x < glyphX + 4; x += 1) {
      const offset = ((glyphY + 9) * 240 + x) * 4;
      fb[offset] = partial[offset]!;
      fb[offset + 1] = partial[offset + 1]!;
      fb[offset + 2] = partial[offset + 2]!;
      fb[offset + 3] = partial[offset + 3]!;
    }
  }
  return fb;
}

export function renderSummaryPageTransition(
  rentals: readonly FactoryRentalPresentation[],
  selectedSlot: number,
  transition: SummaryPageTransition,
  monAnimClock: number,
  animateSwitchedMon = false,
): Uint8Array {
  const fb = createFramebuffer();
  const layers = summaryPageLayerOffsets(transition);
  if (
    layers.movingPage === "skills" &&
    layers.fixedPage === "info"
  ) {
    compose(
      fb,
      rentals,
      selectedSlot,
      0,
      0,
      "skills",
      monAnimClock,
      true,
      layers.movingX,
      transition.fromPage === "skills",
      { animateSwitchedMon },
      layers.fixedPage,
    );
    return fb;
  }
  if (layers.movingPage === "battleMoves" && layers.fixedPage === "skills") {
    compose(
      fb,
      rentals,
      selectedSlot,
      0,
      0,
      "battleMoves",
      monAnimClock,
      true,
      layers.movingX,
      false,
      { animateSwitchedMon },
      "skills",
    );
    return fb;
  }
  if (layers.movingPage === "contestMoves" && layers.fixedPage === "battleMoves") {
    compose(
      fb,
      rentals,
      selectedSlot,
      0,
      0,
      "contestMoves",
      monAnimClock,
      true,
      layers.movingX,
      false,
      { animateSwitchedMon },
      "battleMoves",
    );
    return fb;
  }
  compose(fb, rentals, selectedSlot, 0, 0, "info", monAnimClock, true);
  return fb;
}
