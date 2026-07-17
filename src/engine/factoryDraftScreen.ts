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
import { getMonPicVisual, INITIAL_MON_PIC_STATE, type MonPicState } from "./monPic.ts";
import { drawMonPic } from "./monPicRender.ts";

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

/**
 * Select_UpdateBallCursorPosition/Select_PrintMonCategory/Select_PrintMonSpecies
 * redraw scheduling: `Select_Task_HandleChooseMons` applies a LEFT/RIGHT move
 * and prints both text windows atomically on the input tick, but
 * `CB2_SelectScreen` runs `BuildOamBuffer()`/`RunTextPrinters()` *before*
 * `RunTasks()` each frame, so the visible result lands piecemeal over the
 * next 3 ticks (dense-probed via a single-purpose LEFT-only oracle trace,
 * `bin/oracle run` + captureFrames every tick from the anchor): the move
 * tick itself still shows the old cursor slot everywhere; category text
 * (SELECT_WIN_MON_CATEGORY) catches up 1 tick later; species text
 * (SELECT_WIN_SPECIES) 2 ticks later; the ball-cursor arrow sprite (OAM,
 * gated an extra tick behind the window copies) 3 ticks later, at which
 * point it's fully settled and matches an instant apply. `elapsed` counts
 * ticks since the move (0 = the move's own tick).
 */
export interface CursorRedrawState {
  fromCursorPos: number;
  elapsed: number;
}

/**
 * Select_UpdateMenuCursorPosition redraw scheduling: unlike the cursor case
 * above, the SUMMARY/RENT/OTHERS highlight bar is a single OAM sprite
 * position (no separate text windows involved), so there's no piecemeal
 * reveal - dense oracle probing (single-purpose DOWN-only trace from a
 * settled open menu) showed the old row rendered for 2 full ticks after the
 * move before jumping straight to the new row on the 3rd.
 */
export interface MenuHighlightRedrawState {
  fromMenuCursorPos: number;
  elapsed: number;
}

export interface DraftScreenState {
  mode: DraftScreenMode;
  cursorPos: number;
  menuCursorPos: number;
  slots: RentalSlot[];
  message: string;
  monPic: MonPicState;
  /** Has any LEFT/RIGHT/UP/DOWN been processed yet - see monPic.ts's variant-selection comment. */
  hasActed: boolean;
  /** Has any ball-open happened yet this session - see monPic.ts's `blended` doc. */
  hasOpenedMonPic: boolean;
  /** In-flight cursor-move redraw (see `CursorRedrawState`); null once settled. */
  cursorRedraw: CursorRedrawState | null;
  /** In-flight menu-highlight redraw (see `MenuHighlightRedrawState`); null once settled. */
  menuHighlightRedraw: MenuHighlightRedrawState | null;
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

/** Advance an in-flight cursor-move redraw by one tick; call before applying this tick's input (a new move overrides the result). */
export function advanceCursorRedraw(state: CursorRedrawState | null): CursorRedrawState | null {
  if (!state) return null;
  const elapsed = state.elapsed + 1;
  return elapsed >= 3 ? null : { ...state, elapsed };
}

/** Advance an in-flight menu-highlight redraw by one tick; call before applying this tick's input (a new move overrides the result). */
export function advanceMenuHighlightRedraw(state: MenuHighlightRedrawState | null): MenuHighlightRedrawState | null {
  if (!state) return null;
  const elapsed = state.elapsed + 1;
  return elapsed >= 2 ? null : { ...state, elapsed };
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

  // Cursor-move redraw scheduling (see CursorRedrawState doc): category
  // text, species text, and the arrow sprite each catch up to `cursorPos`
  // on their own tick during an in-flight move.
  const redraw = state.cursorRedraw;
  const categoryPos = !redraw || redraw.elapsed >= 1 ? state.cursorPos : redraw.fromCursorPos;
  const speciesPos = !redraw || redraw.elapsed >= 2 ? state.cursorPos : redraw.fromCursorPos;
  const arrowPos = redraw ? redraw.fromCursorPos : state.cursorPos;

  const slot = state.slots[state.cursorPos];
  const categorySlot = state.slots[categoryPos];
  if (categorySlot) {
    const categoryText = `${categorySlot.category} POKéMON`;
    const categoryX = WIN_MON_CATEGORY.x + rightAlignXOffset(font, charmap, categoryText, 118);
    drawText(fb, font, charmap, categoryText, categoryX, WIN_MON_CATEGORY.y + 1, textPalette, DEFAULT_TEXT_COLORS);
  }
  const speciesSlot = state.slots[speciesPos];
  if (speciesSlot) {
    const speciesX = WIN_SPECIES.x + rightAlignXOffset(font, charmap, speciesSlot.species, 86);
    drawText(fb, font, charmap, speciesSlot.species, speciesX, WIN_SPECIES.y + 1, textPalette, SPECIES_TEXT_COLORS);
  }

  drawText(fb, font, charmap, state.message, WIN_INFO.x + 2, WIN_INFO.y + 5, textPalette, DEFAULT_TEXT_COLORS);

  // OBJ: 6 rental balls (CreateSprite(..., 35*i + 32, 64, 1)) then the slot
  // cursor arrow (CreateSprite(..., ball[cursorPos].x, 88, 0)).
  for (let i = 0; i < 6; i += 1) {
    const centerX = 35 * i + 32;
    drawSprite(fb, BALL_SHEET, pokeball.grayPalette, centerX, 64, 4, 4, 0);
  }
  const cursorCenterX = 35 * state.cursorPos + 32;
  drawSprite(fb, ARROW_SHEET, arrow.palette, 35 * arrowPos + 32, 88, 2, 2, 0);

  // Select_ShowMenuOptions: SELECT_WIN_OPTIONS text (SUMMARY/RENT/OTHERS) +
  // the 2-sprite highlight bar (menuCursor1 left half, menuCursor2 right
  // half), both at the same row (menuCursorPos * 16 + 112). Gated on the
  // mon-pic reveal, not directly on `mode` - Select_Task_HandleMenu's
  // STATE_MENU_SHOW_OPTIONS delays this until OpenMonPic's animation ends,
  // and CloseMonPic's Select_ErasePopupMenu erases it a tick before `mode`
  // itself flips back to "cursor" - see monPic.ts.
  const monPicVisual = getMonPicVisual(state.monPic);
  if (monPicVisual.menuHighlightVisible) {
    // Menu-highlight redraw scheduling (see MenuHighlightRedrawState doc):
    // a single OAM sprite move, no piecemeal reveal - stays at the old row
    // for 2 ticks after the input, then jumps straight to the new one.
    const highlightMenuCursorPos = state.menuHighlightRedraw
      ? state.menuHighlightRedraw.fromMenuCursorPos
      : state.menuCursorPos;
    const highlightY = highlightMenuCursorPos * 16 + 112;
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
  if (monPicVisual.menuTextVisible) {
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
  }

  if (slot) drawMonPic(fb, monPicVisual, slot.species, cursorCenterX);

  return fb;
}

const draftPool = (draftPoolHeaderData as { pool: RentalSlot[] }).pool;

export const ANCHOR_DRAFT_SCREEN_STATE: DraftScreenState = {
  mode: "cursor",
  cursorPos: 0,
  menuCursorPos: 0,
  slots: draftPool,
  message: "Select the first POKéMON.",
  monPic: INITIAL_MON_PIC_STATE,
  hasActed: false,
  hasOpenedMonPic: false,
  cursorRedraw: null,
  menuHighlightRedraw: null,
};
