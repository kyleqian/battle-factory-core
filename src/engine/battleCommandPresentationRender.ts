import battleWindowData from "../assets/gen/battle-window.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import type {
  BattleCommandFieldBattler,
  BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import type { RgbColor } from "./bg.ts";
import {
  buildFightMoveset,
  type FightMoveset,
} from "./fightSubmenuText.ts";
import { setPixel } from "./framebuffer.ts";
import { drawText, type FontData } from "./font.ts";
import type { HealthboxContentParams } from "./healthboxAssembly.ts";

type BattleWindowAsset = Readonly<{
  tileset: Readonly<{
    columns: number;
    rows: number;
    tiles: readonly (readonly number[])[];
  }>;
  tilemap: Readonly<{
    width: number;
    height: number;
    entries: readonly Readonly<{
      tile: number;
      hFlip: boolean;
      vFlip: boolean;
      palette: number;
    }>[];
  }>;
  palette: readonly (readonly RgbColor[])[];
  textPalette: readonly RgbColor[];
}>;

const battleWindow = battleWindowData as unknown as BattleWindowAsset;
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>(
  (charmapData as { entries: [string, number][] }).entries,
);

export const BATTLE_COMMAND_ACTION_PROMPT_PREFIX = "What will ";
export const BATTLE_COMMAND_ACTION_PROMPT_SUFFIX = " do?";

export type BattleCommandActionMenuRenderView = Readonly<{
  prompt: string;
  options: readonly ["FIGHT", "BAG", "POKéMON", "RUN"];
  cursor: 0 | 1 | 2 | 3;
}>;

export type BattleCommandPlayerHealthboxRenderParams =
  HealthboxContentParams
  & Readonly<{ currentHp: number; maxHp: number }>;

export type BattleCommandPresentationRenderView = Readonly<{
  field: BattleCommandPresentationState["field"];
  healthboxes: Readonly<{
    player: BattleCommandPlayerHealthboxRenderParams;
    opponent: HealthboxContentParams;
  }>;
  actionMenu: BattleCommandActionMenuRenderView;
  fightMenu: Readonly<{
    moveset: FightMoveset;
    displayCursor: 0 | 1 | 2 | 3;
  }>;
}>;

function healthboxParams(
  battler: BattleCommandFieldBattler,
): HealthboxContentParams {
  return Object.freeze({
    name: battler.name,
    level: battler.level,
    gender: battler.gender === "genderless" ? "none" : battler.gender,
    hpFraction: battler.hp / battler.maxHP,
    status: battler.status,
  });
}

/**
 * Projects the complete field/FIGHT content from the active battler snapshot.
 * No recorded turn flags participate in live HP, status, moves, or PP.
 */
export function createBattleCommandPresentationRenderView(
  presentation: BattleCommandPresentationState,
): BattleCommandPresentationRenderView {
  return Object.freeze({
    field: presentation.field,
    healthboxes: Object.freeze({
      player: Object.freeze({
        ...healthboxParams(presentation.field.player),
        currentHp: presentation.field.player.hp,
        maxHp: presentation.field.player.maxHP,
      }),
      opponent: healthboxParams(presentation.field.opponent),
    }),
    actionMenu: Object.freeze({
      prompt:
        `${BATTLE_COMMAND_ACTION_PROMPT_PREFIX}${presentation.field.player.name}`
        + BATTLE_COMMAND_ACTION_PROMPT_SUFFIX,
      options: Object.freeze(["FIGHT", "BAG", "POKéMON", "RUN"] as const),
      cursor: presentation.actionCursor,
    }),
    fightMenu: Object.freeze({
      moveset: buildFightMoveset(
        presentation.field.player.moveIds,
        presentation.field.player.currentPP,
        presentation.field.player.ppBonuses,
      ),
      displayCursor: presentation.fightDisplayCursor,
    }),
  });
}

const ACTION_PROMPT_FILL = Object.freeze({ x: 8, y: 120, width: 112, height: 32 });
const ACTION_PROMPT_ORIGINS = Object.freeze([
  Object.freeze({ x: 9, y: 121 }),
  Object.freeze({ x: 9, y: 137 }),
] as const);
const ACTION_OPTION_ORIGINS = Object.freeze([
  Object.freeze({ x: 136, y: 121 }),
  Object.freeze({ x: 192, y: 121 }),
  Object.freeze({ x: 136, y: 137 }),
  Object.freeze({ x: 192, y: 137 }),
] as const);
const ACTION_CURSOR_ORIGINS = Object.freeze([
  Object.freeze({ x: 128, y: 120 }),
  Object.freeze({ x: 184, y: 120 }),
  Object.freeze({ x: 128, y: 136 }),
  Object.freeze({ x: 184, y: 136 }),
] as const);

function drawBattleWindowTile(
  framebuffer: Uint8Array,
  tileIndex: number,
  paletteIndex: number,
  x: number,
  y: number,
  hFlip = false,
  vFlip = false,
): void {
  const tile = battleWindow.tileset.tiles[tileIndex];
  const palette = battleWindow.palette[paletteIndex];
  if (tile === undefined || palette === undefined) return;
  for (let py = 0; py < 8; py += 1) {
    for (let px = 0; px < 8; px += 1) {
      const sx = hFlip ? 7 - px : px;
      const sy = vFlip ? 7 - py : py;
      const color = palette[tile[sy * 8 + sx]!];
      if (color !== undefined) {
        setPixel(framebuffer, x + px, y + py, color.r, color.g, color.b);
      }
    }
  }
}

/**
 * Rebuilds the interactive content inside the already-composed source
 * `B_WIN_ACTION_PROMPT`/`B_WIN_ACTION_MENU` frames: prompt fill/text, all
 * four labels, source cursor destruction tiles, then the typed cursor.
 */
export function drawBattleCommandActionChrome(
  framebuffer: Uint8Array,
  view: BattleCommandActionMenuRenderView,
): void {
  const promptFill = battleWindow.palette[0]![15]!;
  for (let y = 0; y < ACTION_PROMPT_FILL.height; y += 1) {
    for (let x = 0; x < ACTION_PROMPT_FILL.width; x += 1) {
      setPixel(
        framebuffer,
        ACTION_PROMPT_FILL.x + x,
        ACTION_PROMPT_FILL.y + y,
        promptFill.r,
        promptFill.g,
        promptFill.b,
      );
    }
  }

  const firstPromptLine = BATTLE_COMMAND_ACTION_PROMPT_PREFIX.trimEnd();
  const secondPromptLine =
    view.prompt.slice(BATTLE_COMMAND_ACTION_PROMPT_PREFIX.length);
  drawText(
    framebuffer,
    font,
    charmap,
    firstPromptLine,
    ACTION_PROMPT_ORIGINS[0].x,
    ACTION_PROMPT_ORIGINS[0].y,
    battleWindow.palette[0] as RgbColor[],
    { fg: 1, bg: 15, shadow: 6 },
  );
  drawText(
    framebuffer,
    font,
    charmap,
    secondPromptLine,
    ACTION_PROMPT_ORIGINS[1].x,
    ACTION_PROMPT_ORIGINS[1].y,
    battleWindow.palette[0] as RgbColor[],
    { fg: 1, bg: 15, shadow: 6 },
  );

  // `ActionSelectionDestroyCursorAt`: tile 0x16 in palette 1, twice.
  for (const origin of ACTION_CURSOR_ORIGINS) {
    drawBattleWindowTile(framebuffer, 0x16, 1, origin.x, origin.y);
    drawBattleWindowTile(framebuffer, 0x16, 1, origin.x, origin.y + 8);
  }
  for (let slot = 0; slot < view.options.length; slot += 1) {
    const origin = ACTION_OPTION_ORIGINS[slot]!;
    drawText(
      framebuffer,
      font,
      charmap,
      view.options[slot]!,
      origin.x,
      origin.y,
      battleWindow.textPalette as RgbColor[],
      { fg: 13, bg: 14, shadow: 15 },
    );
  }

  // `ActionSelectionCreateCursorAt`: source entries 1 and 2 carry palette 0;
  // `CopyToBgTilemapBufferRect_ChangePalette(..., 0x11)` preserves it.
  const cursorOrigin = ACTION_CURSOR_ORIGINS[view.cursor];
  drawBattleWindowTile(framebuffer, 1, 0, cursorOrigin.x, cursorOrigin.y);
  drawBattleWindowTile(framebuffer, 2, 0, cursorOrigin.x, cursorOrigin.y + 8);
}

/**
 * Field art and chrome assembly stay injectable until the later asset/data
 * slices make those layers fully species-generic. The render view passed to
 * both callbacks already owns live FIGHT text and both healthbox projections.
 */
export type BattleCommandPresentationRenderAssets = Readonly<{
  drawActionMenu(
    framebuffer: Uint8Array,
    view: BattleCommandPresentationRenderView,
    revealed: boolean,
  ): void;
  drawFightMenu(
    framebuffer: Uint8Array,
    view: BattleCommandPresentationRenderView,
  ): void;
}>;

/**
 * Renders one typed command lifecycle without consulting encounter identity
 * or any scene/trace clock. Open, close, cursor-display, and reopen timing are
 * represented entirely by the presentation's phase-relative lifecycle.
 */
export function renderBattleCommandPresentation(
  framebuffer: Uint8Array,
  presentation: BattleCommandPresentationState,
  assets: BattleCommandPresentationRenderAssets,
): void {
  const view = createBattleCommandPresentationRenderView(presentation);
  switch (presentation.lifecycle.phase) {
    case "action-enter":
      assets.drawActionMenu(framebuffer, view, false);
      return;
    case "action-menu":
    case "fight-opening":
      assets.drawActionMenu(framebuffer, view, true);
      return;
    case "fight-menu":
    case "fight-closing":
      assets.drawFightMenu(framebuffer, view);
      return;
    case "party-handoff":
    case "submitting":
      return;
  }
}
