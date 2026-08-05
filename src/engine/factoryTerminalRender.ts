import { createFramebuffer, fillFramebuffer, setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { fadeColor } from "./fadeRender.ts";
import { bgFadeY, FADE_IN, objFadeY } from "./paletteFade.ts";
import {
  drawMessageBoxFrame,
  drawMessageBoxText,
  drawStandardWindowFrame,
  drawStandardWindowText,
} from "./prebattleRoomRender.ts";
import {
  factoryTerminalActivePage,
  factoryTerminalPageTextFirstAge,
  factoryTerminalRecordPromptFirstAge,
  factoryTerminalRecordPromptTextFirstAge,
  factoryTerminalRecordMenuVisible,
  factoryTerminalVisibleChars,
  isFactoryTerminalRoundWon,
  type FactoryTerminalLossPresentationState,
  type FactoryTerminalPresentationState,
  type FactoryTerminalRoundWonPresentationState,
} from "./factoryTerminalPresentation.ts";

import layoutData from "../data/gen/factory-lobby-terminal-layout.json" with { type: "json" };
import tilesetData from "../assets/gen/factory-lobby-terminal-tileset.json" with { type: "json" };
import npcData from "../assets/gen/factory-lobby-terminal-npcs.json" with { type: "json" };
import downArrowData from "../assets/gen/factory-terminal-down-arrow.json" with { type: "json" };
import messageBoxData from "../assets/gen/prebattle-room-msgbox.json" with { type: "json" };
import fontData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import { measureText, type FontData } from "./font.ts";

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
  bgOriginX: number,
): void {
  // The real terminal warp (4,8) centers the camera at the layout's own
  // cameraOriginPx; the legacy staged seam's (8,8) camera was only ever a
  // probe-side position, so the renderer no longer hardcodes its x offset.
  const bgOrigin = { x: bgOriginX, y: layout.cameraOriginPx.y };
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
): void {
  const frame = npc.frames[0]!;
  frame.tiles.forEach((tile, index) => {
    for (let py = 0; py < 8; py += 1) {
      for (let px = 0; px < 8; px += 1) {
        const colorIndex = tile[py * 8 + px]!;
        if (colorIndex === 0) continue;
        const color = fadeColor(npc.palette[colorIndex]!, fadeY);
        setPixel(
          fb,
          pos.x + (index % frame.columns) * 8 + px,
          pos.y + Math.floor(index / frame.columns) * 8 + py,
          color.r,
          color.g,
          color.b,
        );
      }
    }
  });
}

export function renderFactoryTerminalField(
  bgY = 0,
  objY = 0,
  bgOriginX = -48,
): Uint8Array {
  const fb = createFramebuffer();
  fillFramebuffer(fb, 0, 0, 0);
  // BG3/BG2: both stored layers are below OBJ only for COVERED metatiles.
  forEachVisibleBlock((metatile, x, y) => {
    drawLayerEntries(fb, metatile.entries.slice(0, 4), x, y, bgY);
    if (metatile.layerType === 1) {
      drawLayerEntries(fb, metatile.entries.slice(4, 8), x, y, bgY);
    }
  }, bgOriginX);
  const objects = layout.visibleObjects
    .map((object) => ({
      object,
      pos: {
        // docs/post-terminal-return-to-lobby-ground-truth.md §2: the real
        // Lobby warp (4,8) centers the field camera at layout.cameraOriginPx
        // (see forEachVisibleBlock), and every overworld sprite OAM anchors
        // through the same camera. The player's own sprite carries the
        // standard +1-px x2 sub-pixel offset the other object events lack.
        x: object.tile.x * 16 - layout.cameraOriginPx.x +
          (object.id === "player" ? 1 : 0),
        y: object.tile.y * 16 - layout.cameraOriginPx.y - 21,
      },
    }))
    .sort((a, b) =>
      (a.object.tile.y - b.object.tile.y) ||
      (a.object.tile.x - b.object.tile.x)
    );
  for (const { object, pos } of objects) {
    drawNpc(fb, npcs[object.asset]!, pos, objY);
  }
  // NORMAL and SPLIT top layers cover object-event sprites.
  forEachVisibleBlock((metatile, x, y) => {
    if (metatile.layerType !== 1) {
      drawLayerEntries(fb, metatile.entries.slice(4, 8), x, y, bgY);
    }
  }, bgOriginX);
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
  if (factoryTerminalRecordMenuVisible(state)) {
    drawStandardWindowFrame(fb, 160, 64, 4, 4);
    drawStandardWindowText(fb, "YES", 176, 73);
    drawStandardWindowText(fb, "NO", 176, 89);
    drawStandardWindowText(
      fb,
      "▶",
      168,
      73 + state.recordMenuCursor * 16,
    );
  }
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
  if (page === 0 || page === 1) drawPageCursor(fb, state, page);
  return fb;
}
