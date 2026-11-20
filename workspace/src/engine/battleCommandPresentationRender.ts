import battleWindowData from "../assets/gen/battle-window.json" with { type: "json" };
import yesNoFrameData from "../assets/gen/battle-yesno-frame.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import type {
  BattleCommandFieldBattler,
  BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import {
  createBattleCommandFieldArtView,
  type BattleCommandFieldArtView,
} from "./battleCommandFieldArt.ts";
import type { RgbColor } from "./bg.ts";
import {
  buildFightMoveset,
  type FightMoveset,
} from "./fightSubmenuText.ts";
import { setPixel } from "./framebuffer.ts";
import { drawText, type FontData } from "./font.ts";
import type { HealthboxContentParams } from "./healthboxAssembly.ts";
import {
  BAG_MESSAGE_FIRST_GLYPH_AT,
  BAG_MESSAGE_TEXT,
  FORFEIT_BOX_AT,
  FORFEIT_BOX_CLEAR_AT,
  FORFEIT_MESSAGE_FIRST_GLYPH_AT,
  FORFEIT_MESSAGE_TEXT,
  FORFEIT_QUESTION_FIRST_GLYPH_AT,
  FORFEIT_QUESTION_LINES,
  NO_MOVES_MESSAGE_FIRST_GLYPH_AT,
  NO_MOVES_MESSAGE_HOLD_AT,
  REJECTION_MESSAGE_FIRST_GLYPH_AT,
  REJECTION_MESSAGE_HOLD_AT,
} from "./battleCommandPresentation.ts";
import { resolveMoveSelectionRejectionMessageLines, resolveNoMovesLeftMessageLines } from "./battleResolutionPresentation.ts";
import { battleStringPrintableLength } from "./battleStringResolver.ts";

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
const yesNoFrame = yesNoFrameData as unknown as Readonly<{
  tiles: readonly (readonly number[])[];
  palette: readonly RgbColor[];
}>;
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
  fieldArt: BattleCommandFieldArtView;
  healthboxes: Readonly<{
    player: BattleCommandPlayerHealthboxRenderParams;
    opponent: HealthboxContentParams;
  }>;
  spriteVisibility: BattleCommandPresentationState["spriteVisibility"];
  actionMenu: BattleCommandActionMenuRenderView;
  fightMenu: Readonly<{
    moveset: FightMoveset;
    displayCursor: 0 | 1 | 2 | 3;
    /** msw1: the displayed "Switch which?" target slot; `null` outside SELECT move switching. */
    moveSwitchTarget: 0 | 1 | 2 | 3 | null;
  }>;
  /**
   * ISSUES #81: the selection-rejection message currently on the box (typed
   * 1 glyph/frame from the commit press, then held button-gated with the
   * wait ▼, then frozen cursorless through the reopen span). `null` unless
   * the presentation is in a rejection phase.
   */
  rejectionMessage: Readonly<{
    lines: readonly string[];
    visibleCharacters: number;
    waitCursorAge: number | null;
  }> | null;
  /** frf250a: the RUN forfeit yes/no box (cursor 0 = YES, 1 = NO), or `null` while it is not on screen. */
  forfeitBox: Readonly<{ cursor: 0 | 1 }> | null;
}>;

export type BattleCommandFieldRenderView = Readonly<{
  field: BattleCommandPresentationState["field"];
  fieldArt: BattleCommandFieldArtView;
  healthboxes: BattleCommandPresentationRenderView["healthboxes"];
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

/** Shared typed field art and healthbox projection for command and send-out. */
export function createBattleCommandFieldRenderView(
  field: BattleCommandPresentationState["field"],
): BattleCommandFieldRenderView {
  return Object.freeze({
    field,
    fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: Object.freeze({
      player: Object.freeze({
        ...healthboxParams(field.player),
        currentHp: field.player.hp,
        maxHp: field.player.maxHP,
      }),
      opponent: healthboxParams(field.opponent),
    }),
  });
}

/**
 * Projects the complete field/FIGHT content from the active battler snapshot.
 * No recorded turn flags participate in live HP, status, moves, or PP.
 */
export function createBattleCommandPresentationRenderView(
  presentation: BattleCommandPresentationState,
): BattleCommandPresentationRenderView {
  const fieldView = createBattleCommandFieldRenderView(presentation.field);
  let rejectionMessage: BattleCommandPresentationRenderView["rejectionMessage"] = null;
  if (
    presentation.rejectedSlot !== null
    && (presentation.lifecycle.phase === "rejection-message"
      || presentation.lifecycle.phase === "rejection-reopen")
  ) {
    const rejection = presentation.rejectionReasonBySlot[presentation.rejectedSlot];
    if (rejection !== null) {
      const lines = resolveMoveSelectionRejectionMessageLines(
        rejection,
        presentation.field,
      );
      const total = battleStringPrintableLength(lines);
      if (presentation.lifecycle.phase === "rejection-message") {
        const phaseElapsed = presentation.lifecycle.phaseElapsed;
        rejectionMessage = Object.freeze({
          lines,
          visibleCharacters: Math.min(
            total,
            Math.max(0, phaseElapsed - REJECTION_MESSAGE_FIRST_GLYPH_AT + 1),
          ),
          waitCursorAge:
            phaseElapsed >= REJECTION_MESSAGE_HOLD_AT
              ? phaseElapsed - REJECTION_MESSAGE_HOLD_AT
              : null,
        });
      } else {
        // The dismissed box freezes the fully-typed text with the wait ▼
        // held at its dismiss pose for the reopen span (oracle 968-977 all
        // one sha, cursor at the same age as the 968 frame).
        rejectionMessage = Object.freeze({
          lines,
          visibleCharacters: total,
          waitCursorAge: presentation.rejectionWaitCursorAge,
        });
      }
    }
  }
  let forfeitBox: BattleCommandPresentationRenderView["forfeitBox"] = null;
  const phase = presentation.lifecycle.phase;
  const elapsed = presentation.lifecycle.phaseElapsed;
  if (phase === "bag-message") {
    rejectionMessage = Object.freeze({
      lines: Object.freeze([BAG_MESSAGE_TEXT]),
      visibleCharacters: Math.min(
        BAG_MESSAGE_TEXT.length,
        Math.max(0, elapsed - BAG_MESSAGE_FIRST_GLYPH_AT + 1),
      ),
      waitCursorAge: null,
    });
  } else if (phase === "no-moves-message") {
    const lines = resolveNoMovesLeftMessageLines(presentation.field, 0);
    rejectionMessage = Object.freeze({
      lines,
      visibleCharacters: Math.min(
        battleStringPrintableLength(lines),
        Math.max(0, elapsed - NO_MOVES_MESSAGE_FIRST_GLYPH_AT + 1),
      ),
      waitCursorAge: elapsed >= NO_MOVES_MESSAGE_HOLD_AT ? elapsed - NO_MOVES_MESSAGE_HOLD_AT : null,
    });
  } else if (phase === "forfeit-question" || phase === "forfeit-closing") {
    rejectionMessage = Object.freeze({
      lines: FORFEIT_QUESTION_LINES,
      visibleCharacters: Math.max(
        0,
        phase === "forfeit-closing"
          ? battleStringPrintableLength(FORFEIT_QUESTION_LINES)
          : Math.min(
            battleStringPrintableLength(FORFEIT_QUESTION_LINES),
            elapsed - FORFEIT_QUESTION_FIRST_GLYPH_AT + 1,
          ),
      ),
      waitCursorAge: null,
    });
    if (
      (phase === "forfeit-question" && elapsed >= FORFEIT_BOX_AT)
      || (phase === "forfeit-closing" && elapsed < FORFEIT_BOX_CLEAR_AT)
    ) {
      forfeitBox = Object.freeze({ cursor: presentation.forfeitDisplayCursor });
    }
  }
  if (phase === "forfeit-message") {
    const questionHeld = elapsed < FORFEIT_MESSAGE_FIRST_GLYPH_AT;
    rejectionMessage = Object.freeze({
      lines: questionHeld ? FORFEIT_QUESTION_LINES : Object.freeze([FORFEIT_MESSAGE_TEXT]),
      visibleCharacters: questionHeld
        ? battleStringPrintableLength(FORFEIT_QUESTION_LINES)
        : Math.min(
          FORFEIT_MESSAGE_TEXT.length,
          elapsed - FORFEIT_MESSAGE_FIRST_GLYPH_AT + 1,
        ),
      waitCursorAge: null,
    });
    if (questionHeld) {
      forfeitBox = Object.freeze({ cursor: presentation.forfeitDisplayCursor });
    }
  }
  return Object.freeze({
    ...fieldView,
    spriteVisibility: presentation.spriteVisibility,
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
      moveSwitchTarget: presentation.moveSwitchDisplay,
    }),
    rejectionMessage,
    forfeitBox,
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

const YESNO_BOX = Object.freeze({ x: 24, y: 8, width: 6, height: 6 });
const YESNO_TEXT_ORIGINS = Object.freeze([
  Object.freeze({ x: 208, y: 73 }),
  Object.freeze({ x: 208, y: 89 }),
] as const);

/**
 * frf250a: `forfeityesnobox` -- `HandleBattleWindow(YESNOBOX_X_Y)` frame tiles
 * (0x22-0x2A, palette 1: `LoadUserWindowBorderGfx`'s gTextWindowFrame1, see
 * tools/extract/extract-battle-yesno-frame.ts), the `B_WIN_YESNO` text, then
 * `BattleCreateYesNoCursorAt` (tiles 1/2, palette 0, at tile column 25).
 */
export function drawBattleCommandYesNoBox(
  framebuffer: Uint8Array,
  cursor: 0 | 1,
): void {
  const xEnd = YESNO_BOX.x + YESNO_BOX.width - 1;
  const yEnd = YESNO_BOX.y + YESNO_BOX.height - 1;
  for (let ty = YESNO_BOX.y; ty <= yEnd; ty += 1) {
    for (let tx = YESNO_BOX.x; tx <= xEnd; tx += 1) {
      const row = ty === YESNO_BOX.y ? 0 : ty === yEnd ? 2 : 1;
      const col = tx === YESNO_BOX.x ? 0 : tx === xEnd ? 2 : 1;
      const tile = yesNoFrame.tiles[row * 3 + col]!;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const index = tile[py * 8 + px]!;
          const color = yesNoFrame.palette[index];
          if (index !== 0 && color !== undefined) {
            setPixel(framebuffer, tx * 8 + px, ty * 8 + py, color.r, color.g, color.b);
          }
        }
      }
    }
  }
  const fill = battleWindow.textPalette[14]!;
  for (let y = 72; y < 104; y += 1) {
    for (let x = 208; x < 232; x += 1) setPixel(framebuffer, x, y, fill.r, fill.g, fill.b);
  }
  ["Yes", "No"].forEach((label, row) => {
    drawText(
      framebuffer,
      font,
      charmap,
      label,
      YESNO_TEXT_ORIGINS[row]!.x,
      YESNO_TEXT_ORIGINS[row]!.y,
      battleWindow.textPalette as RgbColor[],
      { fg: 13, bg: 14, shadow: 15 },
    );
  });
  drawBattleWindowTile(framebuffer, 1, 0, 200, 72 + 16 * cursor);
  drawBattleWindowTile(framebuffer, 2, 0, 200, 80 + 16 * cursor);
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
  drawRejectionMessage(
    framebuffer: Uint8Array,
    view: BattleCommandPresentationRenderView,
  ): void;
}>;

function drawCommandMessage(
  framebuffer: Uint8Array,
  view: BattleCommandPresentationRenderView,
  assets: BattleCommandPresentationRenderAssets,
): void {
  const typed = view.rejectionMessage;
  if (typed === null || typed.visibleCharacters <= 0) {
    // The press leaves the live action menu up until the first glyph's frame.
    assets.drawActionMenu(framebuffer, view, true);
    return;
  }
  assets.drawRejectionMessage(framebuffer, view);
  if (view.forfeitBox !== null) drawBattleCommandYesNoBox(framebuffer, view.forfeitBox.cursor);
}

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
    case "rejection-message":
      // The reject press leaves the live move menu up until the first
      // glyph's frame (oracle 766-769: box not yet drawn, pixels unchanged).
      if (presentation.lifecycle.phaseElapsed < REJECTION_MESSAGE_FIRST_GLYPH_AT) {
        assets.drawFightMenu(framebuffer, view);
        return;
      }
      assets.drawRejectionMessage(framebuffer, view);
      return;
    case "rejection-reopen":
      assets.drawRejectionMessage(framebuffer, view);
      return;
    case "bag-message":
    case "no-moves-message":
    case "forfeit-question":
    case "forfeit-closing":
    case "forfeit-message":
      drawCommandMessage(framebuffer, view, assets);
      return;
    case "party-handoff":
    case "submitting":
      return;
  }
}
