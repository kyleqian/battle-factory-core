// Static-scene renderer for BattleFrontier_BattleFactoryPreBattleRoom
// (docs/prebattle-room-notes.md, extraction-only session, composite-verified
// 0/38400px vs oracle frames 333/337): 17x14 map blocks (each a metatile's
// bottom 2x2 + top 2x2 tile-entries, layerType 0 - both layers flat-
// composited, no BG-layer split needed for this room's on-screen blocks) at
// camera origin (16,56), attendant + player 16x32 sprites on top.
//
// The message box frame (border + interior fill) is derived directly from
// src/assets/gen/prebattle-room-msgbox.json's extracted tile/palette data,
// composited using the real game's own tile-placement algorithm
// (WindowFunc_DrawDialogueFrame, reference/pokeemerald/src/menu.c:319-402,
// called for the standard width=27/height=4 field message window - see
// drawMessageBoxFrame below for the exact column/tile mapping this encodes).
// ISSUES #15: an earlier session found this same tile/palette data produced
// a consistent one-GBA-step color offset vs the oracle when rendered, and
// baked the frame from a literal oracle capture instead
// (src/assets/gen/prebattle-msgbox-frame.json) rather than root-cause it.
// The actual bug was upstream, in tools/extract/gbaColor.ts's to5Bit(): it
// assumed every reference PNG/pal file's 8-bit RGB approximates a 5-bit GBA
// channel via floor(c5*255/31) (true for most extracted assets, e.g. this
// map's own tileset/NPC sprites), but message_box.png's embedded palette
// instead stores exact c5*8 values (a different, plainer convention) -
// floor()-based rounding silently recovered the wrong 5-bit value for those
// (e.g. 248 -> 30 instead of 31, one GBA step darker). Fixed by recovering
// the 5-bit value via v8>>3 (the top 5 bits - correct regardless of which
// forward convention produced the reference value; see gbaColor.ts's module
// doc). Once fixed, prebattle-room-msgbox.json's own palette contains the
// oracle-exact interior white (idx1, 255,255,255) and matches this file's
// message-text fg/shadow colors exactly (idx2/idx3) - no companion asset or
// hardcoded fudge-color needed. The baked asset is deleted; this file now
// renders the frame tile-by-tile, skipping each tile's transparent (index 0)
// pixels so the already-drawn room scene shows through the border art's own
// notched corners exactly as the real hardware compositing would (byte-exact
// verified against the now-deleted baked capture before deletion: all 9948
// non-transparent frame pixels matched exactly, 0 mismatches).
//
// Text (§3, cadence pinned in prebattleRoom.ts): glyph origin (16,121) -
// pixel-derived this session (Risk 2 in the dossier flagged the original
// x6-19/y98-111 sample as corner-art-contaminated; this session's own sample
// was against the corrected y112-159 box and cross-matched against the 'R'
// glyph bitmap's own leading blank rows to back out the true origin, 0
// mismatches once aligned).

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { fadeColor } from "./fadeRender.ts";
import { drawText, type FontData } from "./font.ts";

import layout from "../data/gen/prebattle-room-layout.json" with { type: "json" };
import tileset from "../assets/gen/prebattle-room-tileset.json" with { type: "json" };
import npcs from "../assets/gen/prebattle-room-npcs.json" with { type: "json" };
import msgbox from "../assets/gen/prebattle-room-msgbox.json" with { type: "json" };
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

interface MsgboxAsset {
  tileset: { columns: number; rows: number; tiles: number[][] };
  palette: RgbColor[];
}
const msgboxAsset = msgbox as MsgboxAsset;
const msgboxTiles = msgboxAsset.tileset.tiles;
const msgboxPalette = msgboxAsset.palette;

/** Screen origin of the box's top-left border tile (bottom-of-screen field message box). */
const BOX_ORIGIN = { x: 0, y: 112 };
/** WindowFunc_DrawDialogueFrame's own width/height params for this standard field window (reference/pokeemerald/src/menu.c). */
const BOX_WIDTH_TILES = 27;
const BOX_HEIGHT_TILES = 4;
/** Total on-screen tile-column/row span: the border's own 3 extra columns (tilemapLeft-2..tilemapLeft+width) and 2 extra rows (top border row, and a bottom border row that overwrites what would otherwise be the interior fill's own 5th row - see drawMessageBoxFrame). */
const BOX_COLS = BOX_WIDTH_TILES + 3;
const BOX_ROWS = BOX_HEIGHT_TILES + 2;

// message_box.png's own 14 tiles (7 cols x 2 rows, row-major) - the exact
// indices WindowFunc_DrawDialogueFrame's DLG_WINDOW_BASE_TILE_NUM+N offsets
// resolve to once its 56x16 art is loaded as a flat sequential tile array.
const TILE_TOP_LEFT_FLOURISH = 1;
const TILE_TOP_NEAR_CORNER = 3;
const TILE_TOP_EDGE = 4;
const TILE_TOP_FAR_CORNER = 5;
const TILE_TOP_RIGHT_FLOURISH = 6;
const TILE_LEFT_EDGE = 7;
const TILE_INTERIOR_FILL = 9;
const TILE_RIGHT_EDGE = 10;

/** Top/bottom border row tile per column (bx 0..BOX_COLS-1) - the bottom row reuses the same tiles v-flipped (BG_TILE_V_FLIP in the source). */
function borderTileForCol(bx: number): number {
  if (bx === 0) return TILE_TOP_LEFT_FLOURISH;
  if (bx === 1) return TILE_TOP_NEAR_CORNER;
  if (bx === BOX_COLS - 2) return TILE_TOP_FAR_CORNER;
  if (bx === BOX_COLS - 1) return TILE_TOP_RIGHT_FLOURISH;
  return TILE_TOP_EDGE;
}

/** Interior rows' tile per column - left/right edge art, flat fill everywhere between. */
function interiorTileForCol(bx: number): number {
  if (bx === 0) return TILE_LEFT_EDGE;
  if (bx === BOX_COLS - 1) return TILE_RIGHT_EDGE;
  return TILE_INTERIOR_FILL;
}

/** One 8x8 message-box tile; transparent (index 0) pixels are skipped so the already-drawn room scene shows through the border art's own notched corners, exactly like the real hardware's BG compositing. */
function drawMsgboxTile(fb: Uint8Array, tileId: number, screenX: number, screenY: number, vFlip: boolean): void {
  const tile = msgboxTiles[tileId]!;
  for (let py = 0; py < 8; py += 1) {
    const sy = vFlip ? 7 - py : py;
    for (let px = 0; px < 8; px += 1) {
      const colorIndex = tile[sy * 8 + px]!;
      if (colorIndex === 0) continue;
      const color = msgboxPalette[colorIndex]!;
      setPixel(fb, screenX + px, screenY + py, color.r, color.g, color.b);
    }
  }
}

/**
 * Composites the standard field message box frame (border + interior fill)
 * from prebattle-room-msgbox.json, replicating WindowFunc_DrawDialogueFrame's
 * tile placement (reference/pokeemerald/src/menu.c:319-402) for the
 * width=27/height=4 field window: one top border row, BOX_HEIGHT_TILES
 * interior rows (flat fill + left/right edge art), one bottom border row
 * (same border tiles, v-flipped) - byte-exact verified against the
 * predecessor baked-pixel asset before its deletion (ISSUES #15 fix; see
 * module doc).
 */
export function drawMessageBoxFrame(fb: Uint8Array): void {
  for (let bx = 0; bx < BOX_COLS; bx += 1) {
    drawMsgboxTile(fb, borderTileForCol(bx), BOX_ORIGIN.x + bx * 8, BOX_ORIGIN.y, false);
  }
  for (let by = 1; by <= BOX_HEIGHT_TILES; by += 1) {
    for (let bx = 0; bx < BOX_COLS; bx += 1) {
      drawMsgboxTile(fb, interiorTileForCol(bx), BOX_ORIGIN.x + bx * 8, BOX_ORIGIN.y + by * 8, false);
    }
  }
  const bottomRow = BOX_ROWS - 1;
  for (let bx = 0; bx < BOX_COLS; bx += 1) {
    drawMsgboxTile(fb, borderTileForCol(bx), BOX_ORIGIN.x + bx * 8, BOX_ORIGIN.y + bottomRow * 8, true);
  }
}

const MESSAGE_TEXT_ORIGIN = { x: 16, y: 121 };

/** {fg:1,bg:0,shadow:2} into a 3-entry palette matching font.ts's role convention (raw 0/3->colors.bg, 1->fg, 2->shadow); bg=0 is always skipped (transparent). Indexed straight from message_box.json's own palette - see module doc. */
const MESSAGE_PALETTE: RgbColor[] = [{ r: 0, g: 0, b: 0 }, msgboxPalette[2]!, msgboxPalette[3]!];
const MESSAGE_TEXT_COLORS = { fg: 1, bg: 0, shadow: 2 };

/** Draws `text` at the given screen position using the message box's own fg/shadow palette (msgboxPalette indices 2/3) - shared with battleRoomRender.ts's opponent-speech box, which reuses this literal same box asset (docs/battle-room-notes.md §8.1). */
export function drawMessageBoxText(fb: Uint8Array, text: string, x: number, y: number): void {
  drawText(fb, font, charmap, text, x, y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
}

/** Draws the message box (frame + interior) and the first `visibleChars` characters of MESSAGE_TEXT. */
export function drawMessageBox(fb: Uint8Array, visibleChars: number): void {
  drawMessageBoxFrame(fb);
  if (visibleChars <= 0) return;
  const text = MESSAGE_TEXT.slice(0, visibleChars);
  drawMessageBoxText(fb, text, MESSAGE_TEXT_ORIGIN.x, MESSAGE_TEXT_ORIGIN.y);
}
