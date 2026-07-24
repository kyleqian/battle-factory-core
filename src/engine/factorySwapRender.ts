import { createFramebuffer } from "./framebuffer.ts";
import { drawTileBg, type RgbColor, type TileBg } from "./bg.ts";
import { drawText, measureText, rightAlignXOffset, type FontData } from "./font.ts";
import { speciesNameColor } from "./speciesNameFade.ts";
import { drawSpriteFaded, drawTextFaded, drawTileBgFaded } from "./fadeRender.ts";
import {
  factorySwapAcceptCancelButtonX,
  factorySwapAcceptExitMonPicVisual,
  factorySwapAcceptMonPicVisual,
  factorySwapAcceptPkmnButtonX,
  factorySwapAcceptSpeciesRenderCoeff,
  factorySwapAcceptYesNoVisual,
  factorySwapActionFadeY,
  factorySwapCancelButtonX,
  factorySwapEnemyActionFadeY,
  factorySwapEnemyBallCycleVisuals,
  factorySwapEnemyCancelButtonX,
  factorySwapEnemyPkmnButtonX,
  factorySwapEnemySpeciesRenderCoeff,
  factorySwapPlayerMonPicVisual,
  factorySwapPlayerReturnActionFadeY,
  factorySwapPlayerReturnCancelButtonX,
  factorySwapPlayerReturnMonPicVisual,
} from "./factorySwapPresentation.ts";
import { blendComponentToward } from "./paletteFade.ts";
import type { FactorySwapState } from "./factorySwap.ts";
import { drawMonPic, type BallVisual } from "./monPicRender.ts";

import menuBgData from "../assets/gen/menu-bg.json" with { type: "json" };
import pokeballData from "../assets/gen/pokeball.json" with { type: "json" };
import arrowData from "../assets/gen/arrow.json" with { type: "json" };
import actionBoxData from "../assets/gen/action-box.json" with { type: "json" };
import actionHighlightData from "../assets/gen/action-highlight.json" with { type: "json" };
import menuHighlightData from "../assets/gen/menu-highlight.json" with { type: "json" };
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
const actionHighlight = actionHighlightData as {
  left: { columns: number; rows: number; tiles: number[][] };
  middle: { columns: number; rows: number; tiles: number[][] };
  right: { columns: number; rows: number; tiles: number[][] };
  palette: RgbColor[];
};
const menuHighlight = menuHighlightData as {
  left: { tileset: { columns: number; rows: number; tiles: number[][] } };
  right: { tileset: { columns: number; rows: number; tiles: number[][] } };
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
charmap.set("\uE053", 0x53);
charmap.set("\uE054", 0x54);

const DEFAULT_TEXT_COLORS = { fg: 2, bg: 1, shadow: 3 };
const SPECIES_TEXT_COLORS = { fg: 4, bg: 0, shadow: 0 };
const MENU_TEXT_COLORS = { fg: 2, bg: 0, shadow: 0 };
const PLAYER_OPTION_LABELS = ["SUMMARY", "SWAP", "RECHOOSE"] as const;
const PLAYER_OPTIONS_ORIGIN = { x: 21 * 8, y: 14 * 8 } as const;
const YES_NO_LABELS = ["YES", "NO"] as const;
const YES_NO_ORIGIN = { x: 22 * 8, y: 14 * 8 } as const;

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
  readonly selectedBallIndex?: 0 | 1 | 2 | null;
  readonly selectedBallTile?: 0 | 16 | 32 | null;
}

function drawActionPiece(
  fb: Uint8Array,
  piece: { columns: number; rows: number; tiles: number[][] },
  originX: number,
  originY: number,
  objFadeY: number,
  palette: RgbColor[] = actionBox.palette,
): void {
  drawSpriteFaded(
    fb,
    { tileset: piece },
    palette,
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
  labelVisible = true,
  highlighted = false,
): void {
  drawActionPiece(fb, actionBox.left, buttonX, 144, objFadeY);
  drawActionPiece(fb, actionBox.right, buttonX + 16, 144, objFadeY);
  if (highlighted) {
    drawActionPiece(
      fb,
      actionHighlight.left,
      buttonX,
      144,
      objFadeY,
      actionHighlight.palette,
    );
    drawActionPiece(
      fb,
      actionHighlight.right,
      buttonX + 16,
      144,
      objFadeY,
      actionHighlight.palette,
    );
  }
  // The BG2 fade window is cleared when the child slide task is created.
  if (buttonX > 192 || !labelVisible) return;
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

function drawPkmnForSwapButton(
  fb: Uint8Array,
  bgFadeY: number,
  objFadeY: number,
  actionFadeY: number,
  buttonX: number,
  labelVisible: boolean,
  highlighted: boolean,
): void {
  drawActionPiece(fb, actionBox.left, buttonX, 120, objFadeY);
  drawActionPiece(fb, actionBox.right, buttonX + 16, 120, objFadeY);
  drawActionPiece(fb, actionBox.right, buttonX + 48, 120, objFadeY);
  if (highlighted) {
    drawActionPiece(
      fb,
      actionHighlight.left,
      buttonX,
      120,
      objFadeY,
      actionHighlight.palette,
    );
    drawActionPiece(
      fb,
      actionHighlight.middle,
      buttonX + 16,
      120,
      objFadeY,
      actionHighlight.palette,
    );
    drawActionPiece(
      fb,
      actionHighlight.right,
      buttonX + 48,
      120,
      objFadeY,
      actionHighlight.palette,
    );
  }
  if (buttonX > 160 || !labelVisible) return;
  const label = "\uE053\uE054 FOR SWAP";
  const x = 168 + rightAlignXOffset(fontSmall, charmap, label, 70);
  if (actionFadeY > 0) {
    const target = actionBox.palette[3]!;
    const palette = textPalette.map((color) => ({
      r: blendComponentToward(color.r, target.r, actionFadeY),
      g: blendComponentToward(color.g, target.g, actionFadeY),
      b: blendComponentToward(color.b, target.b, actionFadeY),
    }));
    drawText(fb, fontSmall, charmap, label, x, 120, palette, MENU_TEXT_COLORS);
    return;
  }
  drawTextFaded(
    fb,
    fontSmall,
    charmap,
    label,
    x,
    120,
    textPalette,
    MENU_TEXT_COLORS,
    bgFadeY,
  );
}

/** State-driven settled player/enemy picker composition. */
export function renderFactorySwapPicker(view: FactorySwapRenderView): Uint8Array {
  const fb = createFramebuffer();
  const { state } = view;
  const enemy =
    state.phase === "enemyPicker" ||
    state.phase === "acceptPrompt" ||
    state.phase === "acceptExit" ||
    state.phase === "duplicateSpecies" ||
    (state.phase === "quitPrompt" && state.quitReturnPhase === "enemyPicker");
  const enemySwitch = state.phase === "enemySwitch";
  const phaseElapsed = view.phaseElapsed ?? 0;
  const bgFade = view.bgFadeY ?? 0;
  const objFade = view.objFadeY ?? 0;
  const party = enemy ? state.enemyParty : state.playerParty;
  const selected = party[Math.min(state.cursor, 2)]!;
  const infoIndex = state.infoCursor < 3
    ? state.infoCursor as 0 | 1 | 2
    : null;
  const displayIndex = state.displayCursor < 3
    ? state.displayCursor as 0 | 1 | 2
    : null;
  const infoSelected = infoIndex === null ? null : party[infoIndex];
  const displaySelected =
    infoIndex !== null &&
    displayIndex !== null &&
    !(state.phase === "enemyPicker" && phaseElapsed === 0)
      ? party[displayIndex]
      : null;
  const speciesCoeff = enemySwitch
    ? factorySwapEnemySpeciesRenderCoeff(phaseElapsed)
    : state.phase === "acceptPrompt"
      ? factorySwapAcceptSpeciesRenderCoeff(
          phaseElapsed,
          view.speciesRenderCoeff,
        )
      : view.speciesRenderCoeff;
  const speciesColor =
    state.phase === "enemyPicker" && phaseElapsed === 1
      ? { r: 8, g: 0, b: 0 }
      : speciesNameColor(speciesCoeff);
  const renderedBallTiles = [...view.ballTiles] as [number, number, number];
  const ballCycle = enemySwitch
    ? factorySwapEnemyBallCycleVisuals(phaseElapsed)
    : null;
  let actionFadeY = 0;
  let cancelButtonX = 192;
  let pkmnButtonX = 240;
  let actionLabelsVisible = true;
  if (
    view.selectedBallIndex !== undefined &&
    view.selectedBallIndex !== null &&
    view.selectedBallTile !== undefined &&
    view.selectedBallTile !== null
  ) {
    renderedBallTiles[view.selectedBallIndex] = view.selectedBallTile;
  }
  if (state.phase === "playerOptions") {
    const phaseElapsed = view.phaseElapsed ?? 0;
    actionFadeY = factorySwapActionFadeY(phaseElapsed);
    cancelButtonX = factorySwapCancelButtonX(phaseElapsed);
  } else if (state.phase === "playerPickerReturn") {
    actionFadeY = factorySwapPlayerReturnActionFadeY(phaseElapsed);
    cancelButtonX = factorySwapPlayerReturnCancelButtonX(phaseElapsed);
  } else if (enemySwitch) {
    actionFadeY = factorySwapEnemyActionFadeY(phaseElapsed);
    cancelButtonX = factorySwapEnemyCancelButtonX(phaseElapsed);
    pkmnButtonX = factorySwapEnemyPkmnButtonX(phaseElapsed);
    actionLabelsVisible = phaseElapsed >= 107;
  } else if (state.phase === "acceptPrompt") {
    actionFadeY = factorySwapActionFadeY(phaseElapsed);
    pkmnButtonX = factorySwapAcceptPkmnButtonX(phaseElapsed);
    cancelButtonX = factorySwapAcceptCancelButtonX(phaseElapsed);
  } else if (state.phase === "acceptExit") {
    // ScreenInfoTransitionOut already parked both action buttons offscreen
    // before the accept prompt was installed.
    pkmnButtonX = 240;
    cancelButtonX = 240;
  } else if (enemy) {
    pkmnButtonX = 160;
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
  const categoryText = infoSelected
    ? `${CATEGORY_BY_SPECIES[infoSelected.species] ?? ""} POKéMON`
    : "";
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
    displaySelected?.species ?? "",
    152 + rightAlignXOffset(font, charmap, displaySelected?.species ?? "", 86),
    17,
    [
      ...textPalette.slice(0, 4),
      speciesColor,
    ],
    SPECIES_TEXT_COLORS,
    bgFade,
  );
  drawTextFaded(
    fb,
    font,
    charmap,
    (state.phase === "acceptPrompt" && phaseElapsed >= 41) ||
      state.phase === "acceptExit"
      ? "Accept this POKéMON?"
      : enemy
        ? "Select POKéMON to accept."
        : "Select POKéMON to swap.",
    2,
    125,
    textPalette,
    DEFAULT_TEXT_COLORS,
    bgFade,
  );

  for (let i = 0; i < 3; i += 1) {
    const gray = ballCycle?.[i].cycledToEnemy ?? enemy;
    const firstTile = gray ? 0 : renderedBallTiles[i]!;
    drawSpriteFaded(
      fb,
      { tileset: pokeball.tileset },
      gray ? pokeball.grayPalette : pokeball.selectedPalette,
      ballCycle?.[i].centerX ?? 48 * i + 72,
      64,
      4,
      4,
      firstTile / 4,
      objFade,
    );
  }
  const arrowVisible =
    state.displayCursor < 3 &&
    state.arrowCursor < 3 &&
    (!enemySwitch || phaseElapsed <= 21) &&
    (state.phase !== "enemyPicker" || phaseElapsed >= 1);
  if (arrowVisible) {
    drawSpriteFaded(
      fb,
      { tileset: arrow.tileset },
      arrow.palette,
      ballCycle?.[state.arrowCursor as 0 | 1 | 2]?.centerX ??
        48 * state.arrowCursor + 72,
      88,
      2,
      2,
      0,
      objFade,
    );
  }
  drawPkmnForSwapButton(
    fb,
    bgFade,
    objFade,
    actionFadeY,
    pkmnButtonX,
    actionLabelsVisible,
    enemy && state.displayCursor === 3,
  );
  drawCancelButton(
    fb,
    bgFade,
    objFade,
    actionFadeY,
    cancelButtonX,
    actionLabelsVisible,
    enemy && state.displayCursor === 4,
  );

  if (
    state.phase === "playerOptions" ||
    state.phase === "playerPickerReturn" ||
    enemySwitch ||
    state.phase === "acceptPrompt" || state.phase === "acceptExit"
  ) {
    const returning = state.phase === "playerPickerReturn";
    const ballVisuals: BallVisual[] = renderedBallTiles.map((firstTile, index) => ({
      palette: state.phase === "acceptPrompt" || state.phase === "acceptExit"
        ? pokeball.grayPalette
        : pokeball.selectedPalette,
      firstTileRow:
        state.phase === "acceptPrompt" || state.phase === "acceptExit"
          ? 0
          : firstTile / 4,
      centerX: 48 * index + 72,
    }));
    const monPic = state.phase === "acceptPrompt"
      ? factorySwapAcceptMonPicVisual(phaseElapsed)
      : state.phase === "acceptExit"
        ? factorySwapAcceptExitMonPicVisual(phaseElapsed)
      : returning || enemySwitch
        ? factorySwapPlayerReturnMonPicVisual(phaseElapsed)
        : factorySwapPlayerMonPicVisual(view.phaseElapsed ?? 0);
    const adjustedMonPic =
      enemySwitch && phaseElapsed === 0
        ? { ...monPic, menuHighlightVisible: true }
        : monPic;
    drawMonPic(
      fb,
      adjustedMonPic,
      selected.species,
      48 * state.displayCursor + 72,
      ballVisuals,
    );
    if (
      adjustedMonPic.menuHighlightVisible &&
      state.phase !== "acceptPrompt" &&
      state.phase !== "acceptExit"
    ) {
      const highlightY = PLAYER_OPTIONS_ORIGIN.y +
        state.playerOptionDisplayCursor * 16 + 8;
      drawSpriteFaded(
        fb,
        { tileset: menuHighlight.left.tileset },
        menuHighlight.palette,
        192,
        highlightY,
        4,
        2,
        0,
        objFade,
      );
      drawSpriteFaded(
        fb,
        { tileset: menuHighlight.right.tileset },
        menuHighlight.palette,
        224,
        highlightY,
        4,
        2,
        0,
        objFade,
      );
    }
    if (
      adjustedMonPic.menuTextVisible &&
      state.phase !== "acceptPrompt" &&
      state.phase !== "acceptExit"
    ) {
      for (let i = 0; i < PLAYER_OPTION_LABELS.length; i += 1) {
        drawTextFaded(
          fb,
          font,
          charmap,
          PLAYER_OPTION_LABELS[i]!,
          PLAYER_OPTIONS_ORIGIN.x + 15,
          PLAYER_OPTIONS_ORIGIN.y + 1 + i * 16,
          textPalette,
          MENU_TEXT_COLORS,
          bgFade,
        );
      }
    }
    const yesNoVisual = factorySwapAcceptYesNoVisual(phaseElapsed);
    if (
      (state.phase === "acceptPrompt" && yesNoVisual.textVisible) ||
      state.phase === "acceptExit"
    ) {
      if (
        yesNoVisual.highlightVisible ||
        (state.phase === "acceptExit" && phaseElapsed >= 1)
      ) {
        const highlightY = YES_NO_ORIGIN.y + state.yesNoCursor * 16 + 8;
        drawSpriteFaded(
          fb,
          { tileset: menuHighlight.left.tileset },
          menuHighlight.palette,
          192,
          highlightY,
          4,
          2,
          0,
          objFade,
        );
        drawSpriteFaded(
          fb,
          { tileset: menuHighlight.right.tileset },
          menuHighlight.palette,
          224,
          highlightY,
          4,
          2,
          0,
          objFade,
        );
      }
      for (let i = 0; i < YES_NO_LABELS.length; i += 1) {
        drawTextFaded(
          fb,
          font,
          charmap,
          YES_NO_LABELS[i]!,
          YES_NO_ORIGIN.x + 7,
          YES_NO_ORIGIN.y + 1 + i * 16,
          textPalette,
          MENU_TEXT_COLORS,
          bgFade,
        );
      }
    }
  }

  // Keep the small-font metric live in production and make accidental
  // fallback to FONT_NORMAL observable in Tier-1.
  void measureText(fontSmall, charmap, "CANCEL");
  return fb;
}
