// Static-scene renderer for BattleFrontier_BattleFactoryPreBattleRoom
// (docs/prebattle-room-notes.md, extraction-only session, composite-verified
// 0/38400px vs oracle frames 333/337): 17x14 map blocks (each a metatile's
// bottom 2x2 + top 2x2 tile-entries, layerType 0 - both layers flat-
// composited, no BG-layer split needed for this room's on-screen blocks) at
// camera origin (16,56), attendant + player 16x32 sprites on top.
//
// The message box is NOT part of that dossier's verified asset set - its own
// geometry claim (docs/prebattle-room-notes.md §3: "y=96-159, full 64px")
// turned out wrong when this session pixel-scanned it directly (see
// prebattleRoom.ts's module doc point 5): the real box is y112-159 (48px,
// 6 tile-rows, still screen-bottom-anchored) and does not start flush at
// x=0 (a 1px column of room floor peeks through at the far left/right before
// the border art's own edge). This session also found the border-tile
// colors don't exactly match src/assets/gen/prebattle-room-msgbox.json's
// extracted palette at every index (e.g. observed (0,255,156)/(0,206,189) on
// the left/right edge vs the closest palette entries (0,247,148)/(0,198,181)
// - a consistent one-GBA-step-brighter offset not yet root-caused - so
// rather than guess at a wrong tile/palette mapping under this session's time
// budget, the box's pre-text frame (border art + interior fill) is baked
// directly from an oracle capture (frame 340 of this session's own dense
// probe, box fully formed, zero characters printed yet) into
// src/assets/gen/prebattle-msgbox-frame.json - a flat 240x48 palette-indexed
// image, PAPERCUT-flagged in PROGRESS.md for a future session to replace with
// a proper tile-based derivation once the palette mismatch is root-caused.
// The interior white IS confirmed flat (255,255,255) matching text-
// palette.json's index 2, per prebattle-room-notes.md §3's original finding
// (independently re-confirmed this session by direct pixel sampling).
//
// Text (§3, cadence pinned in prebattleRoom.ts): glyph origin (16,121) -
// pixel-derived this session (Risk 2 in the dossier flagged the original
// x6-19/y98-111 sample as corner-art-contaminated; this session's own sample
// was against the corrected y112-159 box and cross-matched against the 'R'
// glyph bitmap's own leading blank rows to back out the true origin, 0
// mismatches once aligned). Colors: fg exactly matches prebattle-room-
// msgbox.json's palette[2] (99,99,99); the shadow color (214,214,206) does
// NOT match that palette's own idx3 (206,206,198) - same one-step-brighter
// pattern as the border art above, so it's pinned as its own literal
// constant (MESSAGE_SHADOW_COLOR) rather than indexed, pending the same
// future root-cause pass.

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { fadeColor } from "./fadeRender.ts";
import { drawText, type FontData } from "./font.ts";

import layout from "../data/gen/prebattle-room-layout.json" with { type: "json" };
import tileset from "../assets/gen/prebattle-room-tileset.json" with { type: "json" };
import npcs from "../assets/gen/prebattle-room-npcs.json" with { type: "json" };
import msgboxFrame from "../assets/gen/prebattle-msgbox-frame.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import { MESSAGE_TEXT } from "./prebattleRoom.ts";

interface TileEntry {
  tile: number;
  hFlip: boolean;
  vFlip: boolean;
  pal: number;
}
interface Metatile {
  layerType: number;
  entries: TileEntry[];
}
interface RoomTileset {
  tiles: Record<string, number[]>;
  palettes: Record<string, RgbColor[]>;
  metatiles: Record<string, Metatile>;
}
interface RoomLayout {
  width: number;
  height: number;
  blocks: { metatileId: number; collision: number; elevation: number }[];
  playerTile: { x: number; y: number };
  attendantTile: { x: number; y: number };
  cameraOriginPx: { x: number; y: number };
}
interface NpcFrame {
  columns: number;
  rows: number;
  tiles: number[][];
}
interface NpcSprite {
  /** All 9 standard poses (extract-prebattle-room.ts), indexed by picture-table frame number (object_event_anims.h sAnimTable_Standard). */
  frames: NpcFrame[];
  palette: RgbColor[];
  facing: string;
}

const roomLayout = layout as RoomLayout;
const roomTileset = tileset as RoomTileset;
const roomNpcs = npcs as { attendant: NpcSprite; player: NpcSprite };

/** Settled-scene picture-table frame indices (docs/prebattle-room-notes.md §2). */
const ATTENDANT_SETTLED_FRAME = 0;
const PLAYER_SETTLED_FRAME = 1;

const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);

/** docs/prebattle-room-notes.md §2: sprite top-left = (tileX*16 - cameraOriginX, tileY*16 + 16 - 32 - cameraOriginY). */
function spriteScreenPos(tile: { x: number; y: number }): { x: number; y: number } {
  return {
    x: tile.x * 16 - roomLayout.cameraOriginPx.x,
    y: tile.y * 16 - 16 - roomLayout.cameraOriginPx.y,
  };
}

const ATTENDANT_POS = spriteScreenPos(roomLayout.attendantTile);
const PLAYER_POS = spriteScreenPos(roomLayout.playerTile);

function drawBlockLayer(fb: Uint8Array, entries: TileEntry[], screenX: number, screenY: number, fadeY: number): void {
  for (let i = 0; i < 4; i += 1) {
    const entry = entries[i]!;
    if (entry.tile === 0 && entry.pal === 0) continue;
    const tile = roomTileset.tiles[String(entry.tile)];
    if (!tile) continue;
    const palette = roomTileset.palettes[String(entry.pal)];
    if (!palette) continue;
    const subX = i % 2;
    const subY = Math.floor(i / 2);
    for (let py = 0; py < 8; py += 1) {
      for (let px = 0; px < 8; px += 1) {
        const sx = entry.hFlip ? 7 - px : px;
        const sy = entry.vFlip ? 7 - py : py;
        const colorIndex = tile[sy * 8 + sx]!;
        if (colorIndex === 0) continue;
        const color = palette[colorIndex];
        if (!color) continue;
        const faded = fadeY > 0 ? fadeColor(color, fadeY) : color;
        setPixel(fb, screenX + subX * 8 + px, screenY + subY * 8 + py, faded.r, faded.g, faded.b);
      }
    }
  }
}

function drawRoomTiles(fb: Uint8Array, origin: { x: number; y: number }, fadeY: number): void {
  const { width, height, blocks } = roomLayout;
  for (let by = 0; by < height; by += 1) {
    for (let bx = 0; bx < width; bx += 1) {
      const block = blocks[by * width + bx]!;
      const screenX = bx * 16 - origin.x;
      const screenY = by * 16 - origin.y;
      if (screenX + 16 <= 0 || screenX >= 240 || screenY + 16 <= 0 || screenY >= 160) continue;
      const meta = roomTileset.metatiles[String(block.metatileId)];
      if (!meta) continue;
      drawBlockLayer(fb, meta.entries.slice(0, 4), screenX, screenY, fadeY);
      drawBlockLayer(fb, meta.entries.slice(4, 8), screenX, screenY, fadeY);
    }
  }
}

function drawNpcFrame(fb: Uint8Array, npc: NpcSprite, frameIndex: number, pos: { x: number; y: number }, fadeY: number): void {
  const frame = npc.frames[frameIndex]!;
  for (let ty = 0; ty < frame.rows; ty += 1) {
    for (let tx = 0; tx < frame.columns; tx += 1) {
      const tile = frame.tiles[ty * frame.columns + tx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const colorIndex = tile[py * 8 + px]!;
          if (colorIndex === 0) continue;
          const color = npc.palette[colorIndex];
          if (!color) continue;
          const faded = fadeY > 0 ? fadeColor(color, fadeY) : color;
          setPixel(fb, pos.x + tx * 8 + px, pos.y + ty * 8 + py, faded.r, faded.g, faded.b);
        }
      }
    }
  }
}

/** The settled scene: room tiles (BG) + both NPC sprites (OBJ) on top - docs/prebattle-room-notes.md §1/§2, oracle-verified 0/38400px. bgFadeY/objFadeY both 0 for the unfaded (settled) render. */
export function renderPrebattleRoomScene(fb: Uint8Array, bgFadeY = 0, objFadeY = 0): void {
  drawRoomTiles(fb, roomLayout.cameraOriginPx, bgFadeY);
  drawNpcFrame(fb, roomNpcs.attendant, ATTENDANT_SETTLED_FRAME, ATTENDANT_POS, objFadeY);
  drawNpcFrame(fb, roomNpcs.player, PLAYER_SETTLED_FRAME, PLAYER_POS, objFadeY);
}

/**
 * S6 slice 1a - the A-press-to-warp-fade walk window
 * (docs/battle-bringup-notes.md "Slice-0 ground truth" §2/§3,
 * src/engine/prebattleRoom.ts's WALK_STEPS table): the room tiles scroll
 * under a moving camera origin (the player itself stays screen-fixed at
 * PLAYER_POS, oracle-verified via gSpriteCoordOffsetX/Y RAM probing - see
 * that module's doc), the attendant walks independently and vanishes
 * (set_invisible) partway through.
 */
export function renderPrebattleRoomWalkScene(
  fb: Uint8Array,
  origin: { x: number; y: number },
  playerFrameIndex: number,
  attendant: { x: number; y: number; frameIndex: number; visible: boolean },
  bgFadeY = 0,
  objFadeY = 0,
): void {
  drawRoomTiles(fb, origin, bgFadeY);
  if (attendant.visible) drawNpcFrame(fb, roomNpcs.attendant, attendant.frameIndex, { x: attendant.x, y: attendant.y }, objFadeY);
  drawNpcFrame(fb, roomNpcs.player, playerFrameIndex, PLAYER_POS, objFadeY);
}

interface MsgboxFrameAsset {
  originX: number;
  originY: number;
  width: number;
  height: number;
  colors: [number, number, number][];
  pixels: number[][];
}
const boxFrame = msgboxFrame as MsgboxFrameAsset;

/** src/assets/gen/prebattle-msgbox-frame.json: baked oracle pixels for the box's frame art + white interior (see module doc - not yet re-derived from the tile assets). */
function drawMessageBoxFrame(fb: Uint8Array): void {
  for (let y = 0; y < boxFrame.height; y += 1) {
    const row = boxFrame.pixels[y]!;
    for (let x = 0; x < boxFrame.width; x += 1) {
      const [r, g, b] = boxFrame.colors[row[x]!]!;
      setPixel(fb, boxFrame.originX + x, boxFrame.originY + y, r, g, b);
    }
  }
}

/** Pixel-derived this session (see module doc) - not present in prebattle-room-msgbox.json's own palette. */
const MESSAGE_FG_COLOR: RgbColor = { r: 99, g: 99, b: 99 };
const MESSAGE_SHADOW_COLOR: RgbColor = { r: 214, g: 214, b: 206 };
const MESSAGE_TEXT_ORIGIN = { x: 16, y: 121 };

/** {fg:1,bg:0,shadow:2} into a 3-entry palette matching font.ts's role convention (raw 0/3->colors.bg, 1->fg, 2->shadow); bg=0 is always skipped (transparent). */
const MESSAGE_PALETTE: RgbColor[] = [{ r: 0, g: 0, b: 0 }, MESSAGE_FG_COLOR, MESSAGE_SHADOW_COLOR];
const MESSAGE_TEXT_COLORS = { fg: 1, bg: 0, shadow: 2 };

/** Draws the message box (frame + interior) and the first `visibleChars` characters of MESSAGE_TEXT. */
export function drawMessageBox(fb: Uint8Array, visibleChars: number): void {
  drawMessageBoxFrame(fb);
  if (visibleChars <= 0) return;
  const text = MESSAGE_TEXT.slice(0, visibleChars);
  drawText(fb, font, charmap, text, MESSAGE_TEXT_ORIGIN.x, MESSAGE_TEXT_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
}
