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
import { drawMonPic, drawMonPicFaded } from "./monPicRender.ts";
import { drawSpriteFaded, drawTextFaded, drawTileBgFaded } from "./fadeRender.ts";
import { ballAnimTile, type BallAnimState } from "./ballAnim.ts";

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
export const MENU_OPTION_SUMMARY = 0;
export const MENU_OPTION_RENT = 1;
export const MENU_OPTION_OTHERS = 2;

/** FRONTIER_PARTY_SIZE (include/constants/global.h:35). */
const FRONTIER_PARTY_SIZE = 3;

const SELECT_MON_MESSAGES = [
  "",
  "Select the first POKéMON.",
  "Select the second POKéMON.",
  "Select the third POKéMON.",
];
const CONFIRM_MONS_MESSAGE = "Are these three POKéMON OK?";

/** Select_PrintSelectMonString (battle_factory_screen.c:1893-1909). */
export function selectMonMessage(selectingMonsState: number): string {
  return SELECT_MON_MESSAGES[selectingMonsState] ?? CONFIRM_MONS_MESSAGE;
}

/**
 * Select_OptionRentDeselect's select branch (:1949-1970,
 * Select_HandleMonSelectionChange :1415-1433): stamps the next pick number
 * into the cursored slot and advances the counter.
 */
export function applySelect(
  selectedIds: readonly number[],
  selectingMonsState: number,
  slotIndex: number,
): { selectedIds: number[]; selectingMonsState: number } {
  const nextIds = selectedIds.slice();
  nextIds[slotIndex] = selectingMonsState;
  return { selectedIds: nextIds, selectingMonsState: selectingMonsState + 1 };
}

/**
 * Select_OptionRentDeselect's deselect branch (Select_HandleMonSelectionChange
 * :1415-1433): clears the cursored slot's pick number. Renumbering special
 * case (:1418-1430): deselecting the *first* pick while exactly two mons are
 * currently selected renumbers the 2nd pick down to 1, keeping the remaining
 * pick(s) numbered contiguously from 1.
 */
export function applyDeselect(
  selectedIds: readonly number[],
  selectingMonsState: number,
  slotIndex: number,
): { selectedIds: number[]; selectingMonsState: number } {
  const nextIds = selectedIds.slice();
  const deselectedRank = nextIds[slotIndex]!;
  nextIds[slotIndex] = 0;
  if (deselectedRank === 1 && selectingMonsState === FRONTIER_PARTY_SIZE) {
    const otherIndex = nextIds.findIndex((id) => id === FRONTIER_PARTY_SIZE - 1);
    if (otherIndex !== -1) nextIds[otherIndex] = 1;
  }
  return { selectedIds: nextIds, selectingMonsState: selectingMonsState - 1 };
}

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

/**
 * Select_OptionRentDeselect's own redraw scheduling: `Select_HandleMonSelectionChange`'s
 * ball palette swap is immediate (same tick), but the info-window message
 * text (Select_PrintSelectMonString) and the popup's own RENT/DESELECT label
 * lag - dense oracle probing (rent-slot1.json) found the info window still
 * shows the *previous* pick's message through this tick and the next
 * (elapsed 0-1), only catching up on elapsed 2; the popup itself is already
 * erased (monPic.ts's close animation) by elapsed 1, so the label only ever
 * needs `fromSelected` for elapsed 0.
 */
export interface RentConfirmRedrawState {
  fromMessage: string;
  fromSelected: boolean;
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
  /** mons[i].selectedId (:1415-1433): 0 = not rented, else this ball's 1-based pick number. */
  selectedIds: number[];
  /** Which pick we're on next (init 1); also the value stamped on select - see applySelect. */
  selectingMonsState: number;
  /** SpriteCB_Pokeball state per rented ball (ballAnim.ts); null for unselected slots. */
  ballAnims: (BallAnimState | null)[];
  /** In-flight RENT/DESELECT confirm redraw (see `RentConfirmRedrawState`); null once settled. */
  rentConfirmRedraw: RentConfirmRedrawState | null;
  /**
   * Ball slots whose SpriteCB_Pokeball advance must be skipped THIS tick
   * (ISSUES #6, RAM-confirmed): a LEFT/RIGHT cursor move or a RENT/DESELECT
   * confirm on the *previous* tick calls a text-printer function
   * (Select_PrintMonCategory/Select_PrintMonSpecies for the cursor move,
   * Select_PrintSelectMonString for RENT/DESELECT via
   * Select_OptionRentDeselect) whose knock-on cost delays every OTHER
   * currently-rented ball's own AnimateSprite() advance by exactly one tick,
   * landing on the tick *after* the trigger (CB2_SelectScreen runs
   * AnimateSprites() before RunTasks() each frame, so a text-print call
   * processed this tick's RunTasks() can only affect next tick's
   * AnimateSprites() pass). RAM-confirmed NOT triggered by: opening/closing
   * a popup (Task_OpenMonPic/Task_CloseMonPic - no text print involved),
   * B/OTHERS-close, SUMMARY-open, or the popup's own internal DOWN/UP menu
   * move. The ball just rented/deselected THIS action is excluded (its own
   * settle timer isn't stalled by its own trigger - RAM-confirmed via a
   * second ball's fresh selection landing its first roll exactly
   * SETTLE_TICKS after its own selection tick, unaffected). Empty when no
   * trigger fired last tick.
   */
  ballAnimStall: readonly number[];
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

/** Advance an in-flight RENT/DESELECT confirm redraw by one tick; call before applying this tick's input. */
export function advanceRentConfirmRedraw(state: RentConfirmRedrawState | null): RentConfirmRedrawState | null {
  if (!state) return null;
  const elapsed = state.elapsed + 1;
  return elapsed >= 2 ? null : { ...state, elapsed };
}

const BALL_SHEET: SpriteSheet = { tileset: pokeball.tileset };
const ARROW_SHEET: SpriteSheet = { tileset: arrow.tileset };

/** pokeball.json's 3 extracted 32x32 animation frames, tile 0/16/32 -> firstTileRow 0/frameHeightInTiles/2*frameHeightInTiles. */
function ballFirstTileRow(tile: number): number {
  return (tile / 16) * pokeball.frameHeightInTiles;
}

/** Per-slot palette/tile-frame for both the OBJ ball loop and monPicRender's window-blend target2 source (must agree). */
function ballVisuals(state: DraftScreenState): { palette: RgbColor[]; firstTileRow: number }[] {
  return state.slots.map((_, i) => {
    const selected = state.selectedIds[i] !== 0;
    const anim = state.ballAnims[i];
    return {
      palette: selected ? pokeball.selectedPalette : pokeball.grayPalette,
      firstTileRow: selected && anim ? ballFirstTileRow(ballAnimTile(anim)) : 0,
    };
  });
}

/** Select_PrintMenuOptions (:1918-1932): row 1 is RENT/DESELECT for the currently-cursored ball, SUMMARY/OTHERS never change. */
function menuOptionLabel(state: DraftScreenState, index: number): string {
  if (index === MENU_OPTION_RENT) {
    const redraw = state.rentConfirmRedraw;
    const selected = redraw && redraw.elapsed < 1 ? redraw.fromSelected : state.selectedIds[state.cursorPos] !== 0;
    return selected ? "DESELECT" : "RENT";
  }
  return MENU_OPTION_LABELS[index]!;
}

/** Select_PrintSelectMonString's own window-redraw lag - see RentConfirmRedrawState doc. */
function currentMessage(state: DraftScreenState): string {
  const redraw = state.rentConfirmRedraw;
  return redraw && redraw.elapsed < 2 ? redraw.fromMessage : state.message;
}

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

  drawText(fb, font, charmap, currentMessage(state), WIN_INFO.x + 2, WIN_INFO.y + 5, textPalette, DEFAULT_TEXT_COLORS);

  // OBJ: 6 rental balls (CreateSprite(..., 35*i + 32, 64, 1)) then the slot
  // cursor arrow (CreateSprite(..., ball[cursorPos].x, 88, 0)).
  const balls = ballVisuals(state);
  for (let i = 0; i < 6; i += 1) {
    const centerX = 35 * i + 32;
    const { palette, firstTileRow } = balls[i]!;
    drawSprite(fb, BALL_SHEET, palette, centerX, 64, 4, 4, firstTileRow);
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
        menuOptionLabel(state, i),
        WIN_OPTIONS.x + 7,
        WIN_OPTIONS.y + 1 + i * 16,
        textPalette,
        MENU_TEXT_COLORS,
      );
    }
  }

  if (slot) drawMonPic(fb, monPicVisual, slot.species, cursorCenterX, balls);

  return fb;
}

/**
 * S4 entry/exit fade variant of renderFactoryDraftScreen: identical
 * composition (see that function), but BG1 chrome + all BG0 text fade on
 * `bgY` while the OBJ layer (balls, cursor arrow, menu highlight, monPic's
 * sprite/OBJ portion of its blend window) fades on `objY` - see
 * fadeRender.ts/monPicRender.ts's drawMonPicFaded for why these can't share
 * one curve. bgY=objY=0 reproduces renderFactoryDraftScreen exactly.
 */
export function renderFactoryDraftScreenFaded(state: DraftScreenState, bgY: number, objY: number): Uint8Array {
  const fb = createFramebuffer();

  drawTileBgFaded(fb, menuBg, bgY, 0, 0);

  drawTextFaded(fb, font, charmap, "RENTAL POKéMON", WIN_TITLE.x + 2, WIN_TITLE.y + 1, textPalette, DEFAULT_TEXT_COLORS, bgY);

  const redraw = state.cursorRedraw;
  const categoryPos = !redraw || redraw.elapsed >= 1 ? state.cursorPos : redraw.fromCursorPos;
  const speciesPos = !redraw || redraw.elapsed >= 2 ? state.cursorPos : redraw.fromCursorPos;
  const arrowPos = redraw ? redraw.fromCursorPos : state.cursorPos;

  const slot = state.slots[state.cursorPos];
  const categorySlot = state.slots[categoryPos];
  if (categorySlot) {
    const categoryText = `${categorySlot.category} POKéMON`;
    const categoryX = WIN_MON_CATEGORY.x + rightAlignXOffset(font, charmap, categoryText, 118);
    drawTextFaded(fb, font, charmap, categoryText, categoryX, WIN_MON_CATEGORY.y + 1, textPalette, DEFAULT_TEXT_COLORS, bgY);
  }
  const speciesSlot = state.slots[speciesPos];
  if (speciesSlot) {
    const speciesX = WIN_SPECIES.x + rightAlignXOffset(font, charmap, speciesSlot.species, 86);
    drawTextFaded(fb, font, charmap, speciesSlot.species, speciesX, WIN_SPECIES.y + 1, textPalette, SPECIES_TEXT_COLORS, bgY);
  }

  drawTextFaded(fb, font, charmap, currentMessage(state), WIN_INFO.x + 2, WIN_INFO.y + 5, textPalette, DEFAULT_TEXT_COLORS, bgY);

  const balls = ballVisuals(state);
  for (let i = 0; i < 6; i += 1) {
    const centerX = 35 * i + 32;
    const { palette, firstTileRow } = balls[i]!;
    drawSpriteFaded(fb, BALL_SHEET, palette, centerX, 64, 4, 4, firstTileRow, objY);
  }
  const cursorCenterX = 35 * state.cursorPos + 32;
  drawSpriteFaded(fb, ARROW_SHEET, arrow.palette, 35 * arrowPos + 32, 88, 2, 2, 0, objY);

  const monPicVisual = getMonPicVisual(state.monPic);
  if (monPicVisual.menuHighlightVisible) {
    const highlightMenuCursorPos = state.menuHighlightRedraw
      ? state.menuHighlightRedraw.fromMenuCursorPos
      : state.menuCursorPos;
    const highlightY = highlightMenuCursorPos * 16 + 112;
    drawSpriteFaded(fb, { tileset: menuHighlight.left.tileset }, menuHighlight.palette, 176 + 16, highlightY + 8, 4, 2, 0, objY);
    drawSpriteFaded(fb, { tileset: menuHighlight.right.tileset }, menuHighlight.palette, 208 + 16, highlightY + 8, 4, 2, 0, objY);
  }
  if (monPicVisual.menuTextVisible) {
    for (let i = 0; i < MENU_OPTION_LABELS.length; i += 1) {
      drawTextFaded(
        fb,
        font,
        charmap,
        menuOptionLabel(state, i),
        WIN_OPTIONS.x + 7,
        WIN_OPTIONS.y + 1 + i * 16,
        textPalette,
        MENU_TEXT_COLORS,
        bgY,
      );
    }
  }

  if (slot) drawMonPicFaded(fb, monPicVisual, slot.species, cursorCenterX, bgY, objY, balls);

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
  selectedIds: [0, 0, 0, 0, 0, 0],
  selectingMonsState: 1,
  ballAnims: [null, null, null, null, null, null],
  rentConfirmRedraw: null,
  ballAnimStall: [],
};
