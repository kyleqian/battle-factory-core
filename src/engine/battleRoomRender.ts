// Static-scene renderer for BattleFrontier_BattleFactoryBattleRoom's ENTRY
// window (S6 slice 2a - see battleRoom.ts's module doc for the RAM-probed
// ground truth). Mirrors prebattleRoomRender.ts's tile/sprite compositing
// conventions (docs/prebattle-room-notes.md), consuming the S6-groundwork
// assets (src/assets/gen/battle-room-{tileset,npcs}.json,
// src/data/gen/battle-room-layout.json - extraction-only session, tick-624
// composite-verified 0/38400px, docs/battle-room-notes.md).
//
// Two differences from the pre-battle room's renderer:
// 1. **The camera pans** - every tile-formula-positioned element (the room
//    tiles, the border void columns, the 6 static scientists) is drawn
//    relative to a dynamic origin (initial minus the tick's camPanY -
//    battleRoom.ts's ENTRY_STEPS), not a fixed one.
// 2. **The room (208px) is narrower than the screen (240px)** - the map
//    doesn't cover the horizontal edges at all, so the void margins need
//    the border metatile drawn explicitly (docs/battle-room-notes.md §1:
//    "a near-fully-transparent primary-tileset tile that composites to flat
//    black"). Implemented generically (any out-of-[0,width)/[0,height)
//    block position falls back to the border metatile) rather than
//    hardcoding "left/right only", since the general pokeemerald border
//    mechanism applies to all four directions - this room's own aspect
//    ratio just means only the horizontal case is ever exercised in
//    practice for the on-screen origin range this slice uses.
//
// The decoy's own screen position is NOT tile-formula-derived (see
// battleRoom.ts doc point 5) - it's drawn at the RAM-sampled screen
// coordinates directly (fixed screenX, screenY tracking camPanY 1:1).

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { fadeColor } from "./fadeRender.ts";
import { type EntryStep, opponentStep, scientistTurnFrame } from "./battleRoom.ts";

import layout from "../data/gen/battle-room-layout.json" with { type: "json" };
import tileset from "../assets/gen/battle-room-tileset.json" with { type: "json" };
import npcs from "../assets/gen/battle-room-npcs.json" with { type: "json" };

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
interface Block {
  metatileId: number;
  collision: number;
  elevation: number;
}
interface RoomLayout {
  width: number;
  height: number;
  blocks: Block[];
  border: { width: number; height: number; blocks: Block[] };
  initialCameraOriginPx: { x: number; y: number };
  settledCameraOriginPx: { x: number; y: number };
  objects: {
    opponent: { spawnTile: { x: number; y: number }; settleTile: { x: number; y: number }; settleFacing: string };
    scientists: { localId: number; tile: { x: number; y: number }; turn: string }[];
  };
}
interface NpcFrame {
  columns: number;
  rows: number;
  tiles: number[][];
}
interface NpcSprite {
  frames: NpcFrame[];
  palette: RgbColor[];
}

const roomLayout = layout as RoomLayout;
const roomTileset = tileset as RoomTileset;
const roomNpcs = npcs as { player: NpcSprite; scientist: NpcSprite; opponent: NpcSprite };

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

const BORDER_METATILE_ID = roomLayout.border.blocks[0]!.metatileId;

function blockAt(bx: number, by: number): Block {
  if (bx < 0 || bx >= roomLayout.width || by < 0 || by >= roomLayout.height) {
    return { metatileId: BORDER_METATILE_ID, collision: 0, elevation: 0 };
  }
  return roomLayout.blocks[by * roomLayout.width + bx]!;
}

/** Draws every on-screen block (room + border fallback) at the given panning origin. */
function drawRoomTiles(fb: Uint8Array, origin: { x: number; y: number }, fadeY: number): void {
  const bxMin = Math.floor((0 + origin.x) / 16) - 1;
  const bxMax = Math.floor((240 + origin.x) / 16) + 1;
  const byMin = Math.floor((0 + origin.y) / 16) - 1;
  const byMax = Math.floor((160 + origin.y) / 16) + 1;
  for (let by = byMin; by <= byMax; by += 1) {
    for (let bx = bxMin; bx <= bxMax; bx += 1) {
      const block = blockAt(bx, by);
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

function drawNpcFrame(
  fb: Uint8Array,
  npc: NpcSprite,
  frameIndex: number,
  pos: { x: number; y: number },
  hFlip: boolean,
  fadeY: number,
): void {
  const frame = npc.frames[frameIndex]!;
  for (let ty = 0; ty < frame.rows; ty += 1) {
    for (let tx = 0; tx < frame.columns; tx += 1) {
      const srcTx = hFlip ? frame.columns - 1 - tx : tx;
      const tile = frame.tiles[ty * frame.columns + srcTx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const sx = hFlip ? 7 - px : px;
          const colorIndex = tile[py * 8 + sx]!;
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

/** docs/prebattle-room-notes.md §2 formula, re-used here for every element that follows the standard camera-tracking convention (room tiles, scientists) - NOT the decoy (battleRoom.ts doc point 5). */
function tileScreenPos(tile: { x: number; y: number }, origin: { x: number; y: number }): { x: number; y: number } {
  return { x: tile.x * 16 - origin.x, y: tile.y * 16 - 16 - origin.y };
}

/** The decoy's fixed screen X and its screen Y at zero pan (battleRoom.ts doc point 5, RAM-sampled). */
/**
 * The decoy walks in exact lockstep with the camera pan (both driven by the
 * same shared waitmovement, docs/battle-room-notes.md "Fake-player / real-
 * player split") - net effect (re-derived from RAM: raw sprite.y decreases
 * 1:1 with the pan while gSpriteCoordOffsetY increases 1:1, and the standard
 * `sprite.y + coordOffsetY - 16` screen formula cancels the two exactly) is
 * that the decoy's own screen position is CONSTANT the whole window, same
 * as the (also screen-fixed) real player elsewhere in this codebase - only
 * its walk-cycle frame changes. Computed once via the same tile formula
 * every other camera-tracked element uses (spawn tile against the initial
 * origin - algebraically identical to settle tile against the settled
 * origin, since both shift by the same 80px).
 */
const INITIAL_ORIGIN = roomLayout.initialCameraOriginPx;
const DECOY_POS = { x: 5, y: 11 } satisfies { x: number; y: number };
const decoyScreenPos = tileScreenPos(DECOY_POS, INITIAL_ORIGIN);

/** Fixed screen X of the opponent's walk-in column (tile x=7, never changes - `walk_down` is vertical-only, battleRoom.ts finding 2). */
const opponentScreenX = tileScreenPos(roomLayout.objects.opponent.settleTile, INITIAL_ORIGIN).x;

/**
 * Renders the battle-room ENTRY window's scene at a given camera pan amount
 * (0 = initial/warp-landing origin, 80 = settled), decoy frame/facing, and
 * optional BG/OBJ fade coefficients (paletteFade.ts convention - 0 = no
 * fade, matching every other faded-render function in this codebase).
 * `elapsed` (S6 slice 2b) additionally drives the scientists' turn-in-place
 * and the opponent's walk-in, both settled/no-op for elapsed <=103 (the
 * slice 2a ENTRY window) - see battleRoom.ts's scientistTurnFrame/
 * opponentStep for the oracle-pinned per-tick schedule.
 */
export function renderBattleRoomEntryScene(fb: Uint8Array, step: EntryStep, elapsed: number, bgFadeY = 0, objFadeY = 0): void {
  const origin = { x: roomLayout.initialCameraOriginPx.x, y: roomLayout.initialCameraOriginPx.y - step.camPanY };
  drawRoomTiles(fb, origin, bgFadeY);
  const turn = scientistTurnFrame(elapsed);
  for (const scientist of roomLayout.objects.scientists) {
    const pos = tileScreenPos(scientist.tile, origin);
    const hFlip = turn.turned && scientist.turn === "east";
    drawNpcFrame(fb, roomNpcs.scientist, turn.frame, pos, hFlip, objFadeY);
  }
  drawNpcFrame(fb, roomNpcs.player, step.decoyFrame, decoyScreenPos, step.decoyHFlip, objFadeY);
  const opponent = opponentStep(elapsed);
  if (opponent.visible) {
    drawNpcFrame(fb, roomNpcs.opponent, opponent.frame, { x: opponentScreenX, y: opponent.screenY }, false, objFadeY);
  }
}
