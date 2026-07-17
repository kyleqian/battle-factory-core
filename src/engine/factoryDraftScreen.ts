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

// sSelect_WindowTemplates, tile coords * 8 for pixels.
const WIN_TITLE = { x: 0 * 8, y: 2 * 8, w: 12 * 8 };
const WIN_SPECIES = { x: 19 * 8, y: 2 * 8, w: 11 * 8 };
const WIN_INFO = { x: 0 * 8, y: 15 * 8, w: 20 * 8 };
const WIN_MON_CATEGORY = { x: 15 * 8, y: 0 * 8, w: 15 * 8 };

const DEFAULT_TEXT_COLORS = { fg: 2, bg: 1, shadow: 3 };
const SPECIES_TEXT_COLORS = { fg: 4, bg: 0, shadow: 0 };

export interface RentalSlot {
  /** Species category text, e.g. "ROCK SNAKE" (rendered "<category> POKéMON"). */
  category: string;
  species: string;
}

export interface DraftScreenState {
  cursorPos: number;
  slots: RentalSlot[];
  message: string;
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

  return fb;
}

export const ANCHOR_DRAFT_SCREEN_STATE: DraftScreenState = {
  cursorPos: 0,
  slots: [
    { category: "ROCK SNAKE", species: "ONIX" },
    { category: "", species: "" },
    { category: "", species: "" },
    { category: "", species: "" },
    { category: "", species: "" },
    { category: "", species: "" },
  ],
  message: "Select the first POKéMON.",
};
