import { createFramebuffer, fillFramebuffer, setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { fadeColor } from "./fadeRender.ts";
import { bgFadeY, EXIT_FADE_OUT, FADE_IN, objFadeY } from "./paletteFade.ts";
import {
  drawMessageBoxFrame,
  drawMessageBoxText,
  drawStandardWindowFrame,
  drawStandardWindowText,
} from "./prebattleRoomRender.ts";
import {
  factoryTerminalActivePage,
  factoryTerminalDeclineBoxClearAge,
  factoryTerminalDeclineBoxGoneAge,
  factoryTerminalDeclineEdgeAge,
  factoryTerminalDeclineMenuClearAge,
  factoryTerminalDeclineTextFirstAge,
  factoryTerminalPageTextFirstAge,
  factoryTerminalPageVisualPhase,
  factoryTerminalRecordPromptFirstAge,
  factoryTerminalRecordPromptTextFirstAge,
  factoryTerminalRecordMenuVisible,
  factoryTerminalRecordSavedBoxClearAge,
  factoryTerminalRecordSavedMessageActive,
  factoryTerminalRecordSavedTextFirstAge,
  factoryTerminalVisibleChars,
  isFactoryTerminalRoundWon,
  type FactoryTerminalLossPresentationState,
  type FactoryTerminalPresentationState,
  type FactoryTerminalRoundWonPresentationState,
} from "./factoryTerminalPresentation.ts";

import layoutData from "../data/gen/factory-lobby-terminal-layout.json" with { type: "json" };
import tilesetData from "../assets/gen/factory-lobby-terminal-tileset.json" with { type: "json" };
import { createLobbyNpcs, lobbyNpcDraw, type LobbyNpcDraw, type LobbyNpcsState } from "./lobbyNpcs.ts";
import npcData from "../assets/gen/factory-lobby-terminal-npcs.json" with { type: "json" };
import downArrowData from "../assets/gen/factory-terminal-down-arrow.json" with { type: "json" };
import messageBoxData from "../assets/gen/prebattle-room-msgbox.json" with { type: "json" };
import fontData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import { measureText, type FontData } from "./font.ts";
import { drawFactoryLobbyAttendant } from "./factoryLobbyAttendantRender.ts";
import type { FactoryLobbyAttendantState } from "./factoryLobbyAttendant.ts";
import {
  LOBBY_FREE_ROAM_POSE_FRAMES,
  LOBBY_FREE_ROAM_TILE_FRAMES,
  lobbyFreeRoamCameraOrigin,
  lobbyFreeRoamPlayerFrame,
  lobbyFreeRoamPlayerFrameHFlipped,
  LOBBY_PLAYER_SCREEN_POS,
  type FactoryLobbyFreeRoamState,
} from "./factoryLobbyFreeRoam.ts";

interface TileEntry {
  readonly tile: number;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
  readonly pal: number;
}
interface Block {
  readonly metatileId: number;
}
interface TerminalLayout {
  readonly width: number;
  readonly height: number;
  readonly blocks: readonly Block[];
  readonly border: {
    readonly width: number;
    readonly height: number;
    readonly blocks: readonly Block[];
  };
  readonly cameraOriginPx: { readonly x: number; readonly y: number };
  readonly visibleObjects: readonly {
    readonly id: string;
    readonly asset: string;
    readonly tile: { readonly x: number; readonly y: number };
  }[];
}
interface TerminalTileset {
  readonly tiles: Readonly<Record<string, readonly number[]>>;
  readonly palettes: Readonly<Record<string, readonly RgbColor[]>>;
  readonly metatiles: Readonly<Record<string, {
    readonly layerType: number;
    readonly entries: readonly TileEntry[];
  }>>;
}
interface NpcAsset {
  readonly frames: readonly {
    readonly columns: number;
    readonly rows: number;
    readonly tiles: readonly (readonly number[])[];
  }[];
  readonly palette: readonly RgbColor[];
}

const layout = layoutData as TerminalLayout;
const tileset = tilesetData as TerminalTileset;
const npcs = npcData as Readonly<Record<string, NpcAsset>>;
const downArrow = downArrowData as {
  readonly blitWidth: number;
  readonly blitHeight: number;
  readonly indices: readonly (readonly number[])[];
};
const messageBoxPalette = (
  messageBoxData as { readonly palette: readonly RgbColor[] }
).palette;
const font = fontData as unknown as FontData;
const charmap = new Map<string, number>(
  (charmapData as { entries: [string, number][] }).entries,
);

function positiveMod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function blockAt(bx: number, by: number): Block {
  if (bx >= 0 && bx < layout.width && by >= 0 && by < layout.height) {
    return layout.blocks[by * layout.width + bx]!;
  }
  const x = positiveMod(bx, layout.border.width);
  const y = positiveMod(by, layout.border.height);
  return layout.border.blocks[y * layout.border.width + x]!;
}

function drawEntry(
  fb: Uint8Array,
  entry: TileEntry,
  x: number,
  y: number,
  fadeY: number,
): void {
  const tile = tileset.tiles[String(entry.tile)];
  const palette = tileset.palettes[String(entry.pal)];
  if (!tile || !palette) return;
  for (let py = 0; py < 8; py += 1) {
    for (let px = 0; px < 8; px += 1) {
      const sx = entry.hFlip ? 7 - px : px;
      const sy = entry.vFlip ? 7 - py : py;
      const colorIndex = tile[sy * 8 + sx]!;
      if (colorIndex === 0) continue;
      const color = fadeColor(palette[colorIndex]!, fadeY);
      setPixel(fb, x + px, y + py, color.r, color.g, color.b);
    }
  }
}

function forEachVisibleBlock(
  callback: (
    metatile: TerminalTileset["metatiles"][string],
    screenX: number,
    screenY: number,
  ) => void,
  bgOrigin: { readonly x: number; readonly y: number },
): void {
  // The real terminal warp (4,8) centers the camera at the layout's own
  // cameraOriginPx; the legacy staged seam's (8,8) camera was only ever a
  // probe-side position, so the renderer no longer hardcodes its x offset.
  // The free-roam follow-camera (factory-lobby-freeroam-ground-truth.md §5a)
  // passes the player-anchored scroll origin here instead.
  const minBx = Math.floor(bgOrigin.x / 16);
  const minBy = Math.floor(bgOrigin.y / 16);
  for (let by = minBy; by <= minBy + 10; by += 1) {
    for (let bx = minBx; bx <= minBx + 15; bx += 1) {
      const screenX = bx * 16 - bgOrigin.x;
      const screenY = by * 16 - bgOrigin.y;
      const metatile = tileset.metatiles[String(blockAt(bx, by).metatileId)];
      if (metatile) callback(metatile, screenX, screenY);
    }
  }
}

function drawLayerEntries(
  fb: Uint8Array,
  entries: readonly TileEntry[],
  screenX: number,
  screenY: number,
  fadeY: number,
): void {
  entries.forEach((entry, index) => {
    drawEntry(
      fb,
      entry,
      screenX + (index % 2) * 8,
      screenY + Math.floor(index / 2) * 8,
      fadeY,
    );
  });
}

function drawNpc(
  fb: Uint8Array,
  npc: NpcAsset,
  pos: { readonly x: number; readonly y: number },
  fadeY: number,
  frameIndex = 0,
  hFlip = false,
): void {
  const frame = npc.frames[frameIndex] ?? npc.frames[0]!;
  // The ROM's OAM h-flip mirrors the WHOLE frame (each row's tile columns are
  // swapped AND each column is mirrored in place), not each 8px tile alone —
  // docs/factory-lobby-freeroam-ground-truth.md §8b (a per-tile mirror of the
  // 16px woman frame is a 272px-different sprite).
  frame.tiles.forEach((_tile, index) => {
    const col = index % frame.columns;
    const row = Math.floor(index / frame.columns);
    const srcIndex = hFlip
      ? row * frame.columns + (frame.columns - 1 - col)
      : index;
    const srcTile = frame.tiles[srcIndex]!;
    for (let py = 0; py < 8; py += 1) {
      for (let px = 0; px < 8; px += 1) {
        const sx = hFlip ? 7 - px : px;
        const colorIndex = srcTile[py * 8 + sx]!;
        if (colorIndex === 0) continue;
        const color = fadeColor(npc.palette[colorIndex]!, fadeY);
        setPixel(
          fb,
          pos.x + col * 8 + px,
          pos.y + row * 8 + py,
          color.r,
          color.g,
          color.b,
        );
      }
    }
  });
}

export interface LobbyPlayerOverride {
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly hFlip: boolean;
}

export function renderFactoryTerminalField(
  bgY = 0,
  objY = 0,
  cameraOrigin: { readonly x: number; readonly y: number } = layout.cameraOriginPx,
  playerOverride?: LobbyPlayerOverride,
  npcOverrides?: ReadonlyMap<string, LobbyPlayerOverride>,
): Uint8Array {
  const fb = createFramebuffer();
  fillFramebuffer(fb, 0, 0, 0);
  // BG3/BG2: both stored layers are below OBJ only for COVERED metatiles.
  forEachVisibleBlock((metatile, x, y) => {
    drawLayerEntries(fb, metatile.entries.slice(0, 4), x, y, bgY);
    if (metatile.layerType === 1) {
      drawLayerEntries(fb, metatile.entries.slice(4, 8), x, y, bgY);
    }
  }, cameraOrigin);
  const objects = layout.visibleObjects
    .map((object) => ({
      object,
      pos: {
        // docs/post-terminal-return-to-lobby-ground-truth.md §2: the real
        // Lobby warp (4,8) centers the field camera at layout.cameraOriginPx
        // (see forEachVisibleBlock), and every overworld sprite OAM anchors
        // through the same camera with the source 16x32 feet-anchor
        // (event_object_movement.c's SetSpritePosToMapCoords + centerToCornerVec
        // and the +16 `sprite->y` shift, i.e. box top = tile*16 - cameraOrigin
        // - 16, left = tile*16 - cameraOrigin). The bootstrapped save's
        // north-facing Brendan frame 1 (OBJ_EVENT_GFX_BRENDAN_NORMAL, saved
        // at tile (4,8), asset `factory-lobby-terminal-npcs.json`) shares the
        // same generic OAM anchor as every other object event — the old
        // player-only +1px x2 sub-pixel offset was wrong (113,56 reproduced
        // the ~133px residual; the oracle's player at (112,56) matches frame
        // 3365 with 0 diff).
        x: object.tile.x * 16 - cameraOrigin.x,
        y: object.tile.y * 16 - cameraOrigin.y - 16,
      },
    }))
    .sort((a, b) =>
      (a.object.tile.y - b.object.tile.y) ||
      (a.object.tile.x - b.object.tile.x)
    );
  for (const { object, pos } of objects) {
    if (object.asset === "player") {
      // The terminal lock only ever shows the player's north-standing pose
      // (the saved spawn frame, walking.png sheet frame 1 — frames[0] is the
      // south standing pose used only by the free-roam walk-cycle indexing).
      const frame = playerOverride ? playerOverride.frame : 1;
      const hFlip = playerOverride?.hFlip ?? false;
      drawNpc(
        fb,
        npcs[object.asset]!,
        playerOverride ?? pos,
        objY,
        frame,
        hFlip,
      );
      continue;
    }
    const override = npcOverrides?.get(object.id);
    drawNpc(
      fb,
      npcs[object.asset]!,
      override ?? pos,
      objY,
      override?.frame ?? 0,
      override?.hFlip ?? false,
    );
  }
  // NORMAL and SPLIT top layers cover object-event sprites.
  forEachVisibleBlock((metatile, x, y) => {
    if (metatile.layerType !== 1) {
      drawLayerEntries(fb, metatile.entries.slice(4, 8), x, y, bgY);
    }
  }, cameraOrigin);
  return fb;
}

const MESSAGE_ORIGIN = { x: 16, y1: 121, y2: 137 };
const CURSOR_Y_OFFSETS = [0, 1, 2, 1] as const;

function drawPageText(
  fb: Uint8Array,
  lines: readonly [string, string],
  chars: number,
): void {
  drawMessageBoxText(fb, lines[0].slice(0, chars), MESSAGE_ORIGIN.x, MESSAGE_ORIGIN.y1);
  if (chars > lines[0].length) {
    drawMessageBoxText(
      fb,
      lines[1].slice(0, chars - lines[0].length),
      MESSAGE_ORIGIN.x,
      MESSAGE_ORIGIN.y2,
    );
  }
}

function drawPageCursor(
  fb: Uint8Array,
  state: FactoryTerminalLossPresentationState,
  page: 0 | 1,
): void {
  const firstAge = factoryTerminalPageTextFirstAge(state, page)!;
  const lines = state.profile.pages[page];
  const cursorStart = firstAge + lines[0].length + lines[1].length + 1;
  if (state.age < cursorStart) return;
  const phase = Math.floor((state.age - cursorStart) / 9) % 4;
  const y = (lines[1] ? 137 : 121) - CURSOR_Y_OFFSETS[phase]!;
  const line = lines[1] || lines[0];
  const x = MESSAGE_ORIGIN.x + measureText(font, charmap, line);
  for (let py = 0; py < downArrow.blitHeight; py += 1) {
    for (let px = 0; px < downArrow.blitWidth; px += 1) {
      const index = downArrow.indices[py]?.[px] ?? 0;
      if (index === 0) continue;
      const color = messageBoxPalette[index];
      if (!color) continue;
      setPixel(fb, x + px, y + py, color.r, color.g, color.b);
    }
  }
}

function drawDownArrow(
  fb: Uint8Array,
  line: string,
  y: number,
  animationAge: number,
): void {
  const phase = Math.floor(Math.max(0, animationAge) / 9) % 4;
  const x = MESSAGE_ORIGIN.x + measureText(font, charmap, line);
  const top = y - CURSOR_Y_OFFSETS[phase]!;
  for (let py = 0; py < downArrow.blitHeight; py += 1) {
    for (let px = 0; px < downArrow.blitWidth; px += 1) {
      const index = downArrow.indices[py]?.[px] ?? 0;
      const color = messageBoxPalette[index];
      if (index !== 0 && color) {
        setPixel(fb, x + px, top + py, color.r, color.g, color.b);
      }
    }
  }
}

const RECORD_LINES = [
  "Would you like to record your last",
  "BATTLE FACTORY match on your",
  "FRONTIER PASS?",
] as const;

function drawClippedMessageText(
  fb: Uint8Array,
  text: string,
  x: number,
  y: number,
): void {
  const layer = createFramebuffer();
  drawMessageBoxText(layer, text, x, y);
  for (let py = 120; py < 152; py += 1) {
    for (let px = 8; px < 232; px += 1) {
      const i = (py * 240 + px) * 4;
      if (layer[i + 3] === 0) continue;
      fb[i] = layer[i]!;
      fb[i + 1] = layer[i + 1]!;
      fb[i + 2] = layer[i + 2]!;
      fb[i + 3] = 255;
    }
  }
}

function drawRecordPrompt(
  fb: Uint8Array,
  state: FactoryTerminalPresentationState,
  suppressMenu = false,
): void {
  const release = state.recordPromptReleaseAge;
  const textFirstAge = factoryTerminalRecordPromptTextFirstAge(state);
  const promptFirstAge = factoryTerminalRecordPromptFirstAge(state);
  const inputReadyAge = promptFirstAge === null
    ? null
    : promptFirstAge + state.profile.recordPromptInputDelay;
  if (release === null || state.age === release) {
    const chars = Math.max(
      0,
      Math.min(
        RECORD_LINES[0].length + RECORD_LINES[1].length,
        textFirstAge === null ? 0 : state.age - textFirstAge + 1,
      ),
    );
    drawPageText(fb, [RECORD_LINES[0], RECORD_LINES[1]], chars);
    if (inputReadyAge !== null && state.age > inputReadyAge) {
      const phase = Math.floor(
        (state.age - inputReadyAge - 1) / 9,
      ) % 4;
      const x = MESSAGE_ORIGIN.x + measureText(font, charmap, RECORD_LINES[1]);
      const y = 137 - CURSOR_Y_OFFSETS[phase]!;
      for (let py = 0; py < downArrow.blitHeight; py += 1) {
        for (let px = 0; px < downArrow.blitWidth; px += 1) {
          const index = downArrow.indices[py]?.[px] ?? 0;
          const color = messageBoxPalette[index];
          if (index !== 0 && color) {
            setPixel(fb, x + px, y + py, color.r, color.g, color.b);
          }
        }
      }
    }
    return;
  }

  const elapsed = Math.max(0, state.age - release - 1);
  // OPTIONS_TEXT_SPEED_FAST selects the source table's 4 px/tick entry.
  const scroll = Math.min(state.profile.recordScrollTicks, elapsed) * 4;
  if (elapsed < state.profile.recordScrollTicks) {
    drawClippedMessageText(fb, RECORD_LINES[0], MESSAGE_ORIGIN.x, 121 - scroll);
  }
  drawClippedMessageText(fb, RECORD_LINES[1], MESSAGE_ORIGIN.x, 137 - scroll);
  const thirdChars = Math.max(
    0,
    Math.min(
      RECORD_LINES[2].length,
      state.age - (release + state.profile.recordThirdLineDelay) + 1,
    ),
  );
  drawClippedMessageText(
    fb,
    RECORD_LINES[2].slice(0, thirdChars),
    MESSAGE_ORIGIN.x,
    137,
  );
  if (factoryTerminalRecordMenuVisible(state) && !suppressMenu) {
    drawStandardWindowFrame(fb, 160, 64, 4, 4);
    drawStandardWindowText(fb, "YES", 176, 73);
    drawStandardWindowText(fb, "NO", 176, 89);
    // ISSUES #117: `recordMenuCursor` itself must flip on the press-processed
    // tick (the confirm choice below reads it), but the real ROM's arrow
    // sprite redraw lags that by one tick -- on the exact tick the cursor
    // changes, the drawn row is still the OLD one for this one frame.
    const drawnCursor = state.recordMenuCursorChangedAge === state.age
      ? ((1 - state.recordMenuCursor) as 0 | 1)
      : state.recordMenuCursor;
    drawStandardWindowText(
      fb,
      "▶",
      168,
      73 + drawnCursor * 16,
    );
  }
}

/**
 * ISSUES #104: the YES-only "battle was recorded" page
 * (`EventScript_SaveBattle`'s own msgbox) shown between the record-prompt
 * multichoice and the shared `EndRecordBattle` farewell. Same menu-clear
 * shape as `drawDeclineFarewell` below (the multichoice cursor vanishes
 * `declineMenuClearDelay` ticks after the YES confirm), but the old
 * record-question text lingers `recordSavedTextClearDelay` ticks (longer
 * than the farewell's own `declineTextClearDelay` -- `frontier_savebattle`'s
 * own processing time) before the box wipes and this message types in.
 */
function drawRecordSavedMessage(
  fb: Uint8Array,
  state: FactoryTerminalPresentationState,
): void {
  const lines = state.profile.recordSavedMessage;
  if (state.recordSavedDismissAge !== null) {
    // Dismissed, but still drawn (fully typed -- the dismiss only accepts
    // once typing is long done) for a few more ticks until the farewell's
    // own box-clear below takes over; declineFarewellReleaseAge has already
    // re-armed to the dismiss tick, so this message's own edge-relative ages
    // no longer apply here.
    drawPageText(fb, lines, lines[0].length + lines[1].length);
    return;
  }
  const menuClearAge = factoryTerminalDeclineMenuClearAge(state)!;
  const boxClearAge = factoryTerminalRecordSavedBoxClearAge(state)!;
  const textFirstAge = factoryTerminalRecordSavedTextFirstAge(state)!;
  if (state.age < menuClearAge) {
    drawRecordPrompt(fb, state);
    return;
  }
  if (state.age < boxClearAge) {
    drawRecordPrompt(fb, state, true);
    return;
  }
  if (state.age >= textFirstAge) {
    const chars = Math.min(
      lines[0].length + lines[1].length,
      state.age - textFirstAge + 1,
    );
    drawPageText(fb, lines, chars);
  }
}

/**
 * The EndRecordBattle farewell span (any recordChoice -- YES, NO, or
 * B-cancel all reach it, ISSUES #104): the YES/NO multichoice vanishes
 * `declineMenuClearDelay` ticks after the decline edge
 * while the scrolled record question stays drawn until `declineTextClearDelay`,
 * then FillWindowPixelBuffer wipes the box and the farewell prints 1 glyph/tick
 * from `declineTextFirstDelay`, holds (no wait-cursor), and stays fully drawn
 * through its own A dismiss + `declineReleaseClearDelay` before the box closes
 * into the bare free-roam Lobby field (the caller returns the field-only frame
 * once `declineBoxGoneAge` is reached).
 */
function drawDeclineFarewell(
  fb: Uint8Array,
  state: FactoryTerminalPresentationState,
): void {
  const menuClearAge = factoryTerminalDeclineMenuClearAge(state)!;
  const boxClearAge = factoryTerminalDeclineBoxClearAge(state)!;
  const textFirstAge = factoryTerminalDeclineTextFirstAge(state)!;
  const lines = state.profile.declineFarewell;
  if (state.recordDisabled) {
    if (state.age < boxClearAge) {
      if (!isFactoryTerminalRoundWon(state)) {
        const wait = state.profile.pages[2];
        drawPageText(fb, wait, wait[0].length + wait[1].length);
      }
      return;
    }
  } else if (state.age < menuClearAge) {
    drawRecordPrompt(fb, state);
    return;
  } else if (state.age < boxClearAge) {
    drawRecordPrompt(fb, state, true);
    return;
  }
  if (state.age >= textFirstAge) {
    const chars = Math.min(
      lines[0].length + lines[1].length,
      state.age - textFirstAge + 1,
    );
    drawPageText(fb, lines, chars);
  }
}

/**
 * `frontierBrainCongratulations`'s own `\n`+`\l` shape -- the same generic
 * "type first two lines, gate on a press, scroll 4 ticks, type the third
 * line" mechanic `drawRoundWonMessage`'s award branch below already
 * implements for `award`'s own `\n`+`\l` text, just against a different
 * string and its own scroll-release edge (`congratsScrollReleaseAge`,
 * distinct from `awardScrollReleaseAge`).
 */
function drawFrontierBrainCongratulations(
  fb: Uint8Array,
  state: FactoryTerminalRoundWonPresentationState,
): void {
  const profile = state.profile;
  const brain = profile.frontierBrainCongratulations;
  const textFirstAge = profile.congratulationsTextDelay;
  const scrollRelease = state.congratsScrollReleaseAge;
  if (scrollRelease === null) {
    const chars = Math.max(
      0,
      Math.min(
        brain.lines[0].length + brain.lines[1].length,
        state.age - textFirstAge + 1,
      ),
    );
    drawPageText(fb, [brain.lines[0], brain.lines[1]], chars);
    const cursorStart = textFirstAge + brain.lines[0].length + brain.lines[1].length + 1;
    if (state.age >= cursorStart) {
      drawDownArrow(fb, brain.lines[1], MESSAGE_ORIGIN.y2, state.age - cursorStart);
    }
    return;
  }

  const elapsed = Math.max(0, state.age - scrollRelease - 1);
  const scroll = Math.min(brain.scrollTicks, elapsed) * 4;
  if (elapsed < brain.scrollTicks) {
    drawClippedMessageText(fb, brain.lines[0], MESSAGE_ORIGIN.x, MESSAGE_ORIGIN.y1 - scroll);
  }
  drawClippedMessageText(fb, brain.lines[1], MESSAGE_ORIGIN.x, MESSAGE_ORIGIN.y2 - scroll);
  const thirdTextAge = scrollRelease + brain.thirdLineTextDelay;
  const thirdChars = Math.max(
    0,
    Math.min(brain.lines[2].length, state.age - thirdTextAge + 1),
  );
  drawClippedMessageText(
    fb,
    brain.lines[2].slice(0, thirdChars),
    MESSAGE_ORIGIN.x,
    MESSAGE_ORIGIN.y2,
  );
}

function drawRoundWonMessage(
  fb: Uint8Array,
  state: FactoryTerminalRoundWonPresentationState,
): void {
  const profile = state.profile;
  const congratulationsRelease = state.congratulationsReleaseAge;
  if (
    congratulationsRelease === null ||
    state.age < congratulationsRelease + profile.awardTextDelay - 1
  ) {
    if (state.frontierBrain) {
      drawFrontierBrainCongratulations(fb, state);
      return;
    }
    const chars = Math.max(
      0,
      Math.min(
        profile.congratulations[0].length + profile.congratulations[1].length,
        state.age - profile.congratulationsTextDelay + 1,
      ),
    );
    drawPageText(fb, profile.congratulations, chars);
    return;
  }

  const awardScrollRelease = state.awardScrollReleaseAge;
  const awardRelease = state.awardReleaseAge;
  const mutationAge = awardRelease === null
    ? null
    : awardRelease + profile.battlePointMutationDelay;
  const getPointsTextAge =
    mutationAge === null ? null : mutationAge + profile.getPointsTextDelay;
  const fanfareEndAge =
    mutationAge === null ? null : mutationAge + profile.fanfareTicks;
  const exchangeTextAge = fanfareEndAge === null
    ? null
    : fanfareEndAge + profile.exchangeTextDelayFromFanfareEnd;
  if (
    getPointsTextAge !== null &&
    state.age >= getPointsTextAge - 1 &&
    (exchangeTextAge === null || state.age < exchangeTextAge - 1)
  ) {
    const chars = Math.max(0, Math.min(
      profile.getPoints[0].length,
      state.age - getPointsTextAge + 1,
    ));
    drawPageText(fb, profile.getPoints, chars);
    return;
  }

  if (exchangeTextAge !== null && state.age >= exchangeTextAge - 1) {
    const release = state.exchangeReleaseAge;
    if (release === null) {
      const page = profile.exchange[0];
      const chars = Math.max(0, Math.min(
        page[0].length + page[1].length,
        state.age - exchangeTextAge + 1,
      ));
      drawPageText(fb, page, chars);
      const cursorStart = exchangeTextAge + page[0].length + page[1].length + 1;
      if (state.age >= cursorStart) {
        drawDownArrow(
          fb,
          page[1],
          MESSAGE_ORIGIN.y2,
          state.age - cursorStart,
        );
      }
      return;
    }
    const page = profile.exchange[1];
    const textAge = release + profile.exchangeNextPageVisualDelay;
    if (state.age < textAge) {
      const previous = profile.exchange[0];
      drawPageText(
        fb,
        previous,
        previous[0].length + previous[1].length,
      );
      const cursorStart =
        exchangeTextAge + previous[0].length + previous[1].length + 1;
      drawDownArrow(
        fb,
        previous[1],
        MESSAGE_ORIGIN.y2,
        state.age - cursorStart,
      );
      return;
    }
    const chars = Math.max(0, Math.min(
      page[0].length + page[1].length,
      state.age - textAge + 1,
    ));
    drawPageText(fb, page, chars);
    return;
  }

  const awardTextAge = congratulationsRelease + profile.awardTextDelay;
  if (awardScrollRelease === null || state.age === awardScrollRelease) {
    const chars = Math.max(
      0,
      Math.min(
        profile.award[0].length + profile.award[1].length,
        state.age - awardTextAge + 1,
      ),
    );
    drawPageText(fb, [profile.award[0], profile.award[1]], chars);
    const cursorStart =
      awardTextAge + profile.award[0].length + profile.award[1].length + 1;
    if (state.age >= cursorStart) {
      drawDownArrow(
        fb,
        profile.award[1],
        MESSAGE_ORIGIN.y2,
        state.age - cursorStart,
      );
    }
    return;
  }

  const elapsed = Math.max(0, state.age - awardScrollRelease - 1);
  const scroll = Math.min(profile.awardScrollTicks, elapsed) * 4;
  if (elapsed < profile.awardScrollTicks) {
    drawClippedMessageText(
      fb,
      profile.award[0],
      MESSAGE_ORIGIN.x,
      MESSAGE_ORIGIN.y1 - scroll,
    );
  }
  drawClippedMessageText(
    fb,
    profile.award[1],
    MESSAGE_ORIGIN.x,
    MESSAGE_ORIGIN.y2 - scroll,
  );
  const thirdTextAge =
    awardScrollRelease + profile.awardThirdLineTextDelay;
  const thirdChars = Math.max(
    0,
    Math.min(profile.award[2].length, state.age - thirdTextAge + 1),
  );
  drawClippedMessageText(
    fb,
    profile.award[2].slice(0, thirdChars),
    MESSAGE_ORIGIN.x,
    MESSAGE_ORIGIN.y2,
  );
}

export function renderFactoryTerminalPresentation(
  state: FactoryTerminalPresentationState,
  priorPresentation: () => Uint8Array,
): Uint8Array {
  if (state.age <= 1) return priorPresentation();
  if (state.age < state.profile.fieldFirstAge) {
    const fb = createFramebuffer();
    fillFramebuffer(fb, 0, 0, 0);
    return fb;
  }
  const fadeAge = state.age - state.profile.fadeFirstAge;
  const bgY = fadeAge < 0 ? 16 : bgFadeY(fadeAge, FADE_IN);
  const objY = fadeAge < 0 ? 16 : objFadeY(fadeAge, FADE_IN);
  const fb = renderFactoryTerminalField(bgY, objY);
  if (state.age < state.profile.messageFrameAge) return fb;
  // EndRecordBattle's `closemessage` closes the farewell box into the
  // free-roam Lobby field: from the decline box-gone age onward the box frame
  // itself is no longer drawn, leaving the bare (already byte-exact) field.
  if (factoryTerminalDeclineEdgeAge(state) !== null) {
    if (factoryTerminalRecordSavedMessageActive(state)) {
      drawMessageBoxFrame(fb);
      drawRecordSavedMessage(fb, state);
      return fb;
    }
    const boxGoneAge = factoryTerminalDeclineBoxGoneAge(state);
    if (boxGoneAge !== null && state.age >= boxGoneAge) return fb;
    drawMessageBoxFrame(fb);
    drawDeclineFarewell(fb, state);
    return fb;
  }
  drawMessageBoxFrame(fb);
  if (isFactoryTerminalRoundWon(state)) {
    const recordFirstAge = factoryTerminalRecordPromptFirstAge(state);
    if (recordFirstAge !== null && state.age >= recordFirstAge) {
      drawRecordPrompt(fb, state);
      return fb;
    }
    drawRoundWonMessage(fb, state);
    return fb;
  }
  const recordFirstAge = factoryTerminalRecordPromptFirstAge(state);
  if (recordFirstAge !== null && state.age >= recordFirstAge) {
    drawRecordPrompt(fb, state);
    return fb;
  }
  const page = factoryTerminalActivePage(state);
  drawPageText(
    fb,
    state.profile.pages[page],
    factoryTerminalVisibleChars(state),
  );
  if (
    (page === 0 || page === 1) &&
    factoryTerminalPageVisualPhase(state, page) !== "cleared"
  ) {
    drawPageCursor(fb, state, page);
  }
  return fb;
}

/**
 * Free-roam Lobby field (docs/factory-lobby-freeroam-ground-truth.md §5a):
 * the follow-camera renders the field + NPCs at the player-anchored scroll
 * origin (net 16px per tile, 1px/frame sub-tile phase, border blocks for the
 * out-of-map area the follow-cam reveals) and the player sprite at the fixed
 * (112,56) screen anchor with the walk-cycle/turn pose. At the spawn tile the
 * camera equals the terminal's own, so the handoff frame stays byte-identical.
 */
export function renderFactoryLobbyFreeRoam(
  state: FactoryLobbyFreeRoamState,
  npcs: LobbyNpcsState | null,
): Uint8Array {
  const cameraOrigin = lobbyFreeRoamCameraOrigin(
    state,
    layout.cameraOriginPx,
  );
  return renderFactoryTerminalField(0, 0, cameraOrigin, {
    x: LOBBY_PLAYER_SCREEN_POS.x,
    y: LOBBY_PLAYER_SCREEN_POS.y,
    frame: lobbyFreeRoamPlayerFrame(state),
    hFlip: lobbyFreeRoamPlayerFrameHFlipped(state),
  }, lobbyNpcOverrides(npcs, cameraOrigin));
}

/**
 * The wandering woman and the turning fat man from real NPC state (lobbyNpcs.ts): the sprites as of the previous tick (the OAM lags the
 * callbacks by a frame), at the 16x32 feet anchor (box top = tile * 16 - 16) under the follow-camera.
 */
function lobbyNpcOverrides(
  npcs: LobbyNpcsState | null,
  cameraOrigin: { readonly x: number; readonly y: number },
): Map<string, LobbyPlayerOverride> {
  const shown = npcs ?? createLobbyNpcs();
  const place = (draw: LobbyNpcDraw): LobbyPlayerOverride => ({
    x: draw.x - cameraOrigin.x,
    y: draw.y - cameraOrigin.y,
    frame: draw.frame,
    hFlip: draw.hFlip,
  });
  return new Map<string, LobbyPlayerOverride>([
    ["woman", place(lobbyNpcDraw(shown.shownWoman))],
    ["fatMan", place(lobbyNpcDraw(shown.shownFatMan))],
  ]);
}

/**
 * The attendant conversation's door walk and warp fade (lbr-b): the singles
 * attendant walks up 3 tiles and vanishes, the player follows 4 tiles up at
 * 16 frames/tile (BattleFrontier_BattleFactoryLobby_Movement_AttendantEnterDoor /
 * _PlayerEnterDoor), then the field fades to black (`fade`).
 */
export function renderFactoryLobbyDoorWalk(
  walkTick: number,
  npcs: LobbyNpcsState | null,
  fade: { readonly bgY: number; readonly objY: number } = { bgY: 0, objY: 0 },
): Uint8Array {
  const walked = Math.min(walkTick, 4 * LOBBY_FREE_ROAM_TILE_FRAMES);
  const tiles = Math.floor(walked / LOBBY_FREE_ROAM_TILE_FRAMES);
  const within = walked % LOBBY_FREE_ROAM_TILE_FRAMES;
  const player: FactoryLobbyFreeRoamState = Object.freeze({
    x: 4,
    y: 8 - tiles,
    facing: "north" as const,
    turnRemaining: 0,
    turnTarget: "north" as const,
    stepRemaining: within === 0 ? 0 : LOBBY_FREE_ROAM_TILE_FRAMES - within,
    stepFromX: 4,
    stepFromY: 8 - tiles,
    stepDir: "north" as const,
    animClock: walked - 1 + 2 * LOBBY_FREE_ROAM_POSE_FRAMES,
    heldDir: null,
    pendingDir: null,
    bumpElapsed: 0,
  });
  const cameraOrigin = lobbyFreeRoamCameraOrigin(player, layout.cameraOriginPx);
  const overrides = lobbyNpcOverrides(npcs, cameraOrigin);
  const attendantWalked = Math.min(walkTick, 3 * LOBBY_FREE_ROAM_TILE_FRAMES + 1);
  const attendantPose = Math.max(0, attendantWalked - 1);
  const attendantTile = Math.floor(attendantPose / LOBBY_FREE_ROAM_TILE_FRAMES);
  const attendantStepping = attendantPose % LOBBY_FREE_ROAM_TILE_FRAMES < LOBBY_FREE_ROAM_TILE_FRAMES / 2 && attendantWalked < 3 * LOBBY_FREE_ROAM_TILE_FRAMES;
  overrides.set("singlesAttendant", {
    x: 4 * 16 - cameraOrigin.x,
    y: 7 * 16 - attendantWalked - cameraOrigin.y - 16,
    frame: attendantStepping ? (attendantTile % 2 === 0 ? 6 : 5) : 1,
    hFlip: false,
  });
  if (attendantWalked > 3 * LOBBY_FREE_ROAM_TILE_FRAMES) {
    overrides.set("singlesAttendant", { x: -64, y: -64, frame: 0, hFlip: false });
  }
  return renderFactoryTerminalField(fade.bgY, fade.objY, cameraOrigin, {
    x: LOBBY_PLAYER_SCREEN_POS.x,
    y: LOBBY_PLAYER_SCREEN_POS.y,
    frame: lobbyFreeRoamPlayerFrame(player),
    hFlip: false,
  }, overrides);
}

/** The free-roam field with the attendant conversation's dialogue drawn over it. */
export function renderFactoryLobbyAttendant(
  lobby: FactoryLobbyFreeRoamState,
  attendant: FactoryLobbyAttendantState,
  npcs: LobbyNpcsState | null,
): Uint8Array {
  if (attendant.phase === "walk") return renderFactoryLobbyDoorWalk(attendant.phaseTick + 1, npcs);
  if (attendant.phase === "fade") {
    return renderFactoryLobbyDoorWalk(4 * LOBBY_FREE_ROAM_TILE_FRAMES, npcs, {
      bgY: bgFadeY(attendant.phaseTick, EXIT_FADE_OUT),
      objY: objFadeY(attendant.phaseTick, EXIT_FADE_OUT),
    });
  }
  const fb = renderFactoryLobbyFreeRoam(lobby, npcs);
  drawFactoryLobbyAttendant(fb, attendant);
  return fb;
}
