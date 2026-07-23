import { createFramebuffer } from "./framebuffer.ts";
import { drawTileBg, type RgbColor, type TileBg } from "./bg.ts";
import { drawText, measureText, rightAlignXOffset, type FontData } from "./font.ts";
import { speciesNameColor } from "./speciesNameFade.ts";
import { drawSpriteFaded, drawTextFaded, drawTileBgFaded } from "./fadeRender.ts";
import {
  factorySwapActionFadeY,
  factorySwapCancelButtonX,
  factorySwapPlayerMonPicVisual,
  factorySwapPlayerOptionBallTile,
} from "./factorySwapPresentation.ts";
import { blendComponentToward } from "./paletteFade.ts";
import type { FactorySwapState } from "./factorySwap.ts";
import { drawMonPic, type BallVisual } from "./monPicRender.ts";

import menuBgData from "../assets/gen/menu-bg.json" with { type: "json" };
import pokeballData from "../assets/gen/pokeball.json" with { type: "json" };
import arrowData from "../assets/gen/arrow.json" with { type: "json" };
import actionBoxData from "../assets/gen/action-box.json" with { type: "json" };
import textPaletteData from "../assets/gen/text-palette.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import fontSmallData from "../data/gen/font-small.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };

const menuBg = menuBgData as unknown as TileBg;
const pokeball = pokeballData as {
  tileset: { columns: number; rows: number; tiles: number[][] };
  selectedPalette: RgbColor[];
  grayPalette: RgbColor[];
};
const arrow = arrowData as {
  tileset: { columns: number; rows: number; tiles: number[][] };
  palette: RgbColor[];
};
const actionBox = actionBoxData as {
  left: { columns: number; rows: number; tiles: number[][] };
  right: { columns: number; rows: number; tiles: number[][] };
  palette: RgbColor[];
};
const textPalette = (textPaletteData as { colors: RgbColor[] }).colors;
const font = fontNormalData as unknown as FontData;
const fontSmall = {
  ...(fontSmallData as unknown as FontData),
  glyphHeight: 12,
} satisfies FontData;
const charmap = new Map<string, number>(
  (charmapData as { entries: [string, number][] }).entries,
);

const DEFAULT_TEXT_COLORS = { fg: 2, bg: 1, shadow: 3 };
const SPECIES_TEXT_COLORS = { fg: 4, bg: 0, shadow: 0 };
const MENU_TEXT_COLORS = { fg: 2, bg: 0, shadow: 0 };

const CATEGORY_BY_SPECIES: Readonly<Record<string, string>> = {
  ONIX: "ROCK SNAKE",
  MAGBY: "LIVE COAL",
  BAYLEEF: "LEAF",
  GROVYLE: "WOOD GECKO",
  MURKROW: "DARKNESS",
  PIDGEOTTO: "BIRD",
};

export interface FactorySwapRenderView {
  readonly state: FactorySwapState;
  readonly ballTiles: readonly [number, number, number];
  readonly speciesRenderCoeff: number;
  readonly bgFadeY?: number;
  readonly objFadeY?: number;
  readonly phaseElapsed?: number;
}

function drawActionPiece(
  fb: Uint8Array,
  piece: { columns: number; rows: number; tiles: number[][] },
  originX: number,
  originY: number,
  objFadeY: number,
): void {
  drawSpriteFaded(
    fb,
    { tileset: piece },
    actionBox.palette,
    originX + piece.columns * 4,
    originY + piece.rows * 4,
    piece.columns,
    piece.rows,
    0,
    objFadeY,
  );
}

function drawCancelButton(
  fb: Uint8Array,
  bgFadeY: number,
  objFadeY: number,
  actionFadeY: number,
  buttonX: number,
): void {
  drawActionPiece(fb, actionBox.left, buttonX, 144, objFadeY);
  drawActionPiece(fb, actionBox.right, buttonX + 16, 144, objFadeY);
  // The BG2 fade window is cleared when the child slide task is created.
  if (buttonX > 192) return;
  const label = "CANCEL";
  const x = 168 + rightAlignXOffset(fontSmall, charmap, label, 70);
  if (actionFadeY > 0) {
    const target = actionBox.palette[3]!;
    const palette = textPalette.map((color) => ({
      r: blendComponentToward(color.r, target.r, actionFadeY),
      g: blendComponentToward(color.g, target.g, actionFadeY),
      b: blendComponentToward(color.b, target.b, actionFadeY),
    }));
    drawText(
      fb,
      fontSmall,
      charmap,
      label,
      x,
      144,
      palette,
      MENU_TEXT_COLORS,
    );
    return;
  }
  drawTextFaded(
    fb,
    fontSmall,
    charmap,
    label,
    x,
    144,
    textPalette,
    MENU_TEXT_COLORS,
    bgFadeY,
  );
}

/** State-driven settled player/enemy picker composition. */
export function renderFactorySwapPicker(view: FactorySwapRenderView): Uint8Array {
  const fb = createFramebuffer();
  const { state } = view;
  const enemy = state.phase === "enemyPicker" || state.playerMonId !== null;
  const bgFade = view.bgFadeY ?? 0;
  const objFade = view.objFadeY ?? 0;
  const party = enemy ? state.enemyParty : state.playerParty;
  const selected = party[state.cursor];
  const displaySelected = party[state.displayCursor];
  const renderedBallTiles = [...view.ballTiles] as [number, number, number];
  let actionFadeY = 0;
  let cancelButtonX = 192;
  if (state.phase === "playerOptions") {
    const phaseElapsed = view.phaseElapsed ?? 0;
    renderedBallTiles[state.cursor] = factorySwapPlayerOptionBallTile(phaseElapsed);
    actionFadeY = factorySwapActionFadeY(phaseElapsed);
    cancelButtonX = factorySwapCancelButtonX(phaseElapsed);
  }

  if (bgFade === 0) drawTileBg(fb, menuBg);
  else drawTileBgFaded(fb, menuBg, bgFade);

  drawTextFaded(
    fb,
    font,
    charmap,
    "POKéMON SWAP",
    2,
    17,
    textPalette,
    DEFAULT_TEXT_COLORS,
    bgFade,
  );
  const categoryText = `${CATEGORY_BY_SPECIES[selected.species] ?? ""} POKéMON`;
  drawTextFaded(
    fb,
    font,
    charmap,
    categoryText,
    120 + rightAlignXOffset(font, charmap, categoryText, 118),
    1,
    textPalette,
    DEFAULT_TEXT_COLORS,
    bgFade,
  );
  drawTextFaded(
    fb,
    font,
    charmap,
    displaySelected.species,
    152 + rightAlignXOffset(font, charmap, displaySelected.species, 86),
    17,
    [
      ...textPalette.slice(0, 4),
      speciesNameColor(view.speciesRenderCoeff),
    ],
    SPECIES_TEXT_COLORS,
    bgFade,
  );
  drawTextFaded(
    fb,
    font,
    charmap,
    enemy ? "Select POKéMON to accept." : "Select POKéMON to swap.",
    2,
    125,
    textPalette,
    DEFAULT_TEXT_COLORS,
    bgFade,
  );

  for (let i = 0; i < 3; i += 1) {
    drawSpriteFaded(
      fb,
      { tileset: pokeball.tileset },
      enemy ? pokeball.grayPalette : pokeball.selectedPalette,
      48 * i + 72,
      64,
      4,
      4,
      renderedBallTiles[i]! / 4,
      objFade,
    );
  }
  drawSpriteFaded(
    fb,
    { tileset: arrow.tileset },
    arrow.palette,
    48 * state.displayCursor + 72,
    88,
    2,
    2,
    0,
    objFade,
  );
  drawCancelButton(fb, bgFade, objFade, actionFadeY, cancelButtonX);

  if (state.phase === "playerOptions") {
    const ballVisuals: BallVisual[] = renderedBallTiles.map((firstTile, index) => ({
      palette: pokeball.selectedPalette,
      firstTileRow: firstTile / 4,
      centerX: 48 * index + 72,
    }));
    drawMonPic(
      fb,
      factorySwapPlayerMonPicVisual(view.phaseElapsed ?? 0),
      selected.species,
      48 * state.displayCursor + 72,
      ballVisuals,
    );
  }

  // Keep the small-font metric live in production and make accidental
  // fallback to FONT_NORMAL observable in Tier-1.
  void measureText(fontSmall, charmap, "CANCEL");
  return fb;
}
