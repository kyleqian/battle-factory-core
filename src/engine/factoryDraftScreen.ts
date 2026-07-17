// Renders the Battle Factory rental-draft screen (reference/pokeemerald's
// battle_factory_screen.c Select_* state) into the shared framebuffer.
// Stage S1 only needs the static anchor frame: BG1 chrome, the four BG0 text
// windows that are visible before any input, and the OBJ layer (6 rental
// balls + the slot cursor arrow). Layout constants below are transcribed
// directly from sSelect_WindowTemplates and the CreateSprite call sites in
// battle_factory_screen.c, not eyeballed from pixels.

import { createFramebuffer } from "./framebuffer.ts";
import { drawTileBg, type TileBg } from "./bg.ts";
import { drawSprite, type SpriteSheet } from "./sprites.ts";
import { drawText, rightAlignXOffset, type FontData } from "./font.ts";
import type { RgbColor } from "./bg.ts";

import menuBgData from "../assets/gen/menu-bg.json" with { type: "json" };
import pokeballData from "../assets/gen/pokeball.json" with { type: "json" };
import arrowData from "../assets/gen/arrow.json" with { type: "json" };
import textPaletteData from "../assets/gen/text-palette.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import draftPoolHeaderData from "../data/gen/draft-pool-header.json" with { type: "json" };
import menuHighlightData from "../assets/gen/menu-highlight.json" with { type: "json" };

const menuBg = menuBgData as unknown as TileBg;
const pokeball = pokeballData as {
  tileset: { columns: number; rows: number; tiles: number[][] };
  frameHeightInTiles: number;
  grayPalette: RgbColor[];
  selectedPalette: RgbColor[];
};
const arrow = arrowData as { tileset: { columns: number; rows: number; tiles: number[][] }; palette: RgbColor[] };
const textPalette = (textPaletteData as { colors: RgbColor[] }).colors;
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const menuHighlight = menuHighlightData as {
  left: { tileset: { columns: number; rows: number; tiles: number[][] } };
  right: { tileset: { columns: number; rows: number; tiles: number[][] } };
  palette: RgbColor[];
};

// sSelect_WindowTemplates, tile coords * 8 for pixels.
const WIN_TITLE = { x: 0 * 8, y: 2 * 8, w: 12 * 8 };
const WIN_SPECIES = { x: 19 * 8, y: 2 * 8, w: 11 * 8 };
const WIN_INFO = { x: 0 * 8, y: 15 * 8, w: 20 * 8 };
const WIN_MON_CATEGORY = { x: 15 * 8, y: 0 * 8, w: 15 * 8 };
// SELECT_WIN_OPTIONS: tilemapLeft=22, tilemapTop=14 (tile coords * 8).
const WIN_OPTIONS = { x: 22 * 8, y: 14 * 8 };

const DEFAULT_TEXT_COLORS = { fg: 2, bg: 1, shadow: 3 };
const SPECIES_TEXT_COLORS = { fg: 4, bg: 0, shadow: 0 };
// sMenuOptionTextColors: {TEXT_COLOR_TRANSPARENT, TEXT_COLOR_DARK_GRAY, TEXT_COLOR_TRANSPARENT}.
const MENU_TEXT_COLORS = { fg: 2, bg: 0, shadow: 0 };
const MENU_OPTION_LABELS = ["SUMMARY", "RENT", "OTHERS"];

export interface RentalSlot {
  /** Species category text, e.g. "ROCK SNAKE" (rendered "<category> POKéMON"). */
  category: string;
  species: string;
}

export type DraftScreenMode = "cursor" | "menu";

/** Select_MenuOptionFuncs order: SUMMARY, RENT/DESELECT, OTHERS. */
export const MENU_OPTION_COUNT = 3;
export const MENU_OPTION_OTHERS = 2;

export interface DraftScreenState {
  mode: DraftScreenMode;
  cursorPos: number;
  menuCursorPos: number;
  slots: RentalSlot[];
  message: string;
}

/** Select_UpdateBallCursorPosition: wraps at both ends of the 6 slots. */
export function moveCursor(cursorPos: number, direction: 1 | -1): number {
  if (direction > 0) {
    return cursorPos === 5 ? 0 : cursorPos + 1;
  }
  return cursorPos === 0 ? 5 : cursorPos - 1;
}

/** Select_UpdateMenuCursorPosition: wraps at both ends of the 3 options. */
export function moveMenuCursor(menuCursorPos: number, direction: 1 | -1): number {
  if (direction > 0) {
    return menuCursorPos === MENU_OPTION_COUNT - 1 ? 0 : menuCursorPos + 1;
  }
  return menuCursorPos === 0 ? MENU_OPTION_COUNT - 1 : menuCursorPos - 1;
}

const BALL_SHEET: SpriteSheet = { tileset: pokeball.tileset };
const ARROW_SHEET: SpriteSheet = { tileset: arrow.tileset };

export function renderFactoryDraftScreen(state: DraftScreenState): Uint8Array {
  const fb = createFramebuffer();

  // BG1: the interface chrome (tilemapLeft/Top scroll reset to 0,0 - see
  // battle_factory_screen.c Select_InitBgs).
  drawTileBg(fb, menuBg, 0, 0);

  // BG0 text windows visible before any input.
  drawText(fb, font, charmap, "RENTAL POKéMON", WIN_TITLE.x + 2, WIN_TITLE.y + 1, textPalette, DEFAULT_TEXT_COLORS);

  const slot = state.slots[state.cursorPos];
  if (slot) {
    const categoryText = `${slot.category} POKéMON`;
    const categoryX = WIN_MON_CATEGORY.x + rightAlignXOffset(font, charmap, categoryText, 118);
    drawText(fb, font, charmap, categoryText, categoryX, WIN_MON_CATEGORY.y + 1, textPalette, DEFAULT_TEXT_COLORS);

    const speciesX = WIN_SPECIES.x + rightAlignXOffset(font, charmap, slot.species, 86);
    drawText(fb, font, charmap, slot.species, speciesX, WIN_SPECIES.y + 1, textPalette, SPECIES_TEXT_COLORS);
  }

  drawText(fb, font, charmap, state.message, WIN_INFO.x + 2, WIN_INFO.y + 5, textPalette, DEFAULT_TEXT_COLORS);

  // OBJ: 6 rental balls (CreateSprite(..., 35*i + 32, 64, 1)) then the slot
  // cursor arrow (CreateSprite(..., ball[cursorPos].x, 88, 0)).
  for (let i = 0; i < 6; i += 1) {
    const centerX = 35 * i + 32;
    drawSprite(fb, BALL_SHEET, pokeball.grayPalette, centerX, 64, 4, 4, 0);
  }
  const cursorCenterX = 35 * state.cursorPos + 32;
  drawSprite(fb, ARROW_SHEET, arrow.palette, cursorCenterX, 88, 2, 2, 0);

  // Select_ShowMenuOptions: SELECT_WIN_OPTIONS text (SUMMARY/RENT/OTHERS) +
  // the 2-sprite highlight bar (menuCursor1 left half, menuCursor2 right
  // half), both at the same row (menuCursorPos * 16 + 112).
  if (state.mode === "menu") {
    for (let i = 0; i < MENU_OPTION_LABELS.length; i += 1) {
      drawText(
        fb,
        font,
        charmap,
        MENU_OPTION_LABELS[i]!,
        WIN_OPTIONS.x + 7,
        WIN_OPTIONS.y + 1 + i * 16,
        textPalette,
        MENU_TEXT_COLORS,
      );
    }
    const highlightY = state.menuCursorPos * 16 + 112;
    drawSprite(
      fb,
      { tileset: menuHighlight.left.tileset },
      menuHighlight.palette,
      176 + 16,
      highlightY + 8,
      4,
      2,
      0,
    );
    drawSprite(
      fb,
      { tileset: menuHighlight.right.tileset },
      menuHighlight.palette,
      208 + 16,
      highlightY + 8,
      4,
      2,
      0,
    );
  }

  return fb;
}

const draftPool = (draftPoolHeaderData as { pool: RentalSlot[] }).pool;

export const ANCHOR_DRAFT_SCREEN_STATE: DraftScreenState = {
  mode: "cursor",
  cursorPos: 0,
  menuCursorPos: 0,
  slots: draftPool,
  message: "Select the first POKéMON.",
};
