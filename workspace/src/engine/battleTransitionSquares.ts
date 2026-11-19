/**
 * B_TRANSITION_FRONTIER_SQUARES (id 31) and B_TRANSITION_FRONTIER_SQUARES_SCROLL (id 32), battle_transition.c:4432-4780: 4x4-tile logo squares
 * drawn onto BG0, one per frame, over the room (docs/trn225-frontier-transitions.md). The task's state machine is replayed callback by callback
 * (`squaresState`), so the picture at a transition clock `te` is the BG0 tilemap, palette and scroll the callbacks before it left behind.
 *
 * Clock: the task's first callback (Init) runs on te SQUARES_INIT_TE, one frame before the circle families create their sprites. A callback's
 * tilemap copy (CopyBgTilemapBufferToVram) shows on its own frame (unlike OAM, which shows a frame later); the ROM sees the task gone one frame
 * after its last callback. Measured against the ROM (seeds 1 and 18).
 */
import squaresAsset from "../data/gen/battle-transition-frontier-squares.json" with { type: "json" };
import { advanceRngValue } from "./rng.ts";

export type FrontierSquaresTransition = "squares" | "squaresScroll";

export const SQUARES_INIT_TE = 77;
const SQUARE_SIZE = 4;
const MARGIN_SIZE = 1;
const PER_ROW = squaresAsset.layout.numSquaresPerRow;
const NUM_SQUARES = squaresAsset.layout.numSquares;
const SHRINK_DELAY = 10;
/** Task callbacks of FrontierSquares: Init, one Draw per square, then the Shrink calls up to and including its last (End runs in the same callback). */
const SHRINK_CALLBACKS = 1 + SHRINK_DELAY + 4 * (SHRINK_DELAY + 1);
const SQUARES_END_CALLBACK = 1 + NUM_SQUARES + SHRINK_CALLBACKS - 1;
const SCROLL_POSITIONS = squaresAsset.scrollPositions;
/** The task's last callback on the ROM-measured clock: the ROM sees it gone on te 207 (Init, Draw x64, SetBlack, Erase x64 is 130; End shows with the last Erase's frame). */
const SCROLL_END_CALLBACK = 1 + SCROLL_POSITIONS.length + 1 + SCROLL_POSITIONS.length - 1;
/**
 * Task_ScrollBg's BG0 offsets are written by the task itself, mid-logic, and on five frames of the ROM's run the write lands a frame late
 * (the offsets show the previous step for one frame, the next step arrives on time): `done` values measured on both scenes, seed 18.
 */
const SCROLL_LATE_STEP_DONE = new Set([37, 65, 75, 113, 129]);
/** Frames from the task's end to CB2_InitBattle's handoff on the engine's clock (the circle families: BRAIN_BATTLE_START_AFTER_EXIT_FADE less the 17 their fade takes after the task ends). */
const HANDOFF_AFTER_END = 3;
/**
 * LZ77UnCompVram writes the tileset straight into VRAM, so a Shrink tileset shows on the callback's own frame, one earlier than the tilemap
 * copies and palette blends the VBlank applies. The first one (case 1) follows BlendPalettes' 32 palettes in the same callback and lands
 * mid-frame: the ROM's frame shows the old tileset above scanline 23 and the new one from it down (seed 1, both scenes); the other two land
 * before the first scanline.
 */
const TEAR_ROW = 23;

type TilesetKey = "filledBg" | "emptyBg" | "shrink1" | "shrink2";
const SHRINK_TILESETS: TilesetKey[] = ["emptyBg", "shrink1", "shrink2"];

export type SquaresScrollDirection = readonly [dx: number, dy: number];
/** Random() % 4 in FrontierSquaresScroll_Init (battle_transition.c:4690-4708). */
export const SQUARES_SCROLL_DIRECTIONS: readonly SquaresScrollDirection[] = [[1, 1], [-1, -1], [1, -1], [-1, 1]];

/**
 * gRngValue steps from the transition draw's own post-state to the Random() of FrontierSquaresScroll_Init: the draw frame is followed by 49
 * plain frames (one VBlank advance each, the room is overworld), then the Init frame's VBlank advance and its Random() call (seeds 18/21/23
 * on the ROM, ids 32). The task clock is anchored to the battle BGM, which came one frame after the draw on some seeds (21, 23): the Init was
 * then one frame later too, so a caller that knows the BGM lag passes the draw's state advanced by it.
 */
const SCROLL_INIT_RNG_STEPS = 51;

export function squaresScrollDirectionIndex(rngAfterDraw: number): number {
  let v = rngAfterDraw >>> 0;
  for (let i = 0; i < SCROLL_INIT_RNG_STEPS; i += 1) v = advanceRngValue(v);
  return (v >>> 16) % 4;
}

export interface SquaresState {
  /** 32x32 tilemap entries: tile number, palette (0 = the room's palette 0, 15 = the squares' palette). */
  tile: Uint8Array;
  pal: Uint8Array;
  tileset: TilesetKey;
  /** The frame the first LZ77UnCompVram lands mid-display: rows above `tearRow` still show `tilesetAbove`. */
  tilesetAbove: TilesetKey;
  tearRow: number;
  /** gPlttBuffer entries 10..14 of palette 15 set to black (Shrink case 0). */
  innerBlack: boolean;
  /** BlendPalettes(all but 15, 16, black) has run: the room and its sprites are black behind the squares. */
  roomBlack: boolean;
  /** The task has ended: BlendPalettes(PALETTES_ALL, 16, black). */
  ended: boolean;
  scrollV: number;
  scrollH: number;
}

export function squaresEndTe(kind: FrontierSquaresTransition): number {
  return SQUARES_INIT_TE + (kind === "squares" ? SQUARES_END_CALLBACK : SCROLL_END_CALLBACK) + 1;
}

/** The engine clock at which the ROM's CB2_InitBattle takes over from the (black) transition. */
export function squaresIntroHandoffTe(kind: FrontierSquaresTransition): number {
  return squaresEndTe(kind) + HANDOFF_AFTER_END;
}

function fillRect(s: SquaresState, x0: number, y0: number, w: number, h: number, tile: number, pal: number): void {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const i = (y & 31) * 32 + (x & 31);
      s.tile[i] = tile;
      s.pal[i] = pal;
    }
  }
}

function drawSquare(s: SquaresState, x0: number, y0: number, pal: number): void {
  const map = squaresAsset.tilemap;
  for (let y = 0; y < SQUARE_SIZE; y += 1) {
    for (let x = 0; x < SQUARE_SIZE; x += 1) {
      const i = ((y0 + y) & 31) * 32 + ((x0 + x) & 31);
      s.tile[i] = map.entries[y * map.width + x]!.tile;
      s.pal[i] = pal;
    }
  }
}

/** The BG0 state after the task callbacks `0 .. done - 1` have run (done = te - SQUARES_INIT_TE + 1 for the picture shown on `te`). */
export function squaresState(done: number, kind: FrontierSquaresTransition, direction: SquaresScrollDirection): SquaresState {
  const s: SquaresState = { tile: new Uint8Array(1024), pal: new Uint8Array(1024), tileset: "filledBg", tilesetAbove: "filledBg", tearRow: 0, innerBlack: false, roomBlack: false, ended: false, scrollV: 0, scrollH: 0 };
  if (done <= 0) return s;
  const finish = () => {
    fillRect(s, 0, 0, 32, 32, 1, 0);
    s.roomBlack = true;
    s.ended = true;
  };
  if (kind === "squares") {
    fillRect(s, 0, 0, MARGIN_SIZE, 32, 1, 15);
    fillRect(s, 30 - MARGIN_SIZE, 0, MARGIN_SIZE, 32, 1, 15);
    const drawCallbacks = Math.min(done - 1, NUM_SQUARES);
    for (let i = 0; i < drawCallbacks; i += 1) {
      drawSquare(s, MARGIN_SIZE + SQUARE_SIZE * (i % PER_ROW), SQUARE_SIZE * Math.floor(i / PER_ROW), 15);
    }
    // Shrink callbacks: the action runs on the call whose timer already reached the delay (every SHRINK_DELAY + 1 calls).
    const actionsAt = (n: number) => Math.max(0, Math.floor((n - 1 - NUM_SQUARES) / (SHRINK_DELAY + 1)));
    const actions = actionsAt(done);
    for (let a = 0; a < actions; a += 1) {
      if (a === 0) s.innerBlack = true;
      else if (a === 1) s.roomBlack = true;
      else if (a === 4) finish();
    }
    const loads = Math.min(actionsAt(done + 1), 4) - 1;
    if (loads > 0) {
      s.tileset = SHRINK_TILESETS[loads - 1]!;
      s.tilesetAbove = s.tileset;
      if (loads === 1 && actions === 1) {
        s.tilesetAbove = "filledBg";
        s.tearRow = TEAR_ROW;
      }
    }
    return s;
  }
  // SQUARES_SCROLL: Init, Draw x64, SetBlack, Erase x64, End; Task_ScrollBg steps the scroll on every second call after the Init.
  const n = SCROLL_POSITIONS.length;
  const drawn = Math.min(done - 1, n);
  for (let i = 0; i < drawn; i += 1) {
    const pos = SCROLL_POSITIONS[i]!;
    drawSquare(s, SQUARE_SIZE * Math.floor(pos / (PER_ROW + 1)) + MARGIN_SIZE, SQUARE_SIZE * (pos % (PER_ROW + 1)), 15);
  }
  if (done - 1 > n) s.roomBlack = true;
  const erased = Math.min(Math.max(0, done - 2 - n), n);
  for (let i = 0; i < erased; i += 1) {
    const pos = SCROLL_POSITIONS[i]!;
    fillRect(s, SQUARE_SIZE * Math.floor(pos / (PER_ROW + 1)) + MARGIN_SIZE, SQUARE_SIZE * (pos % (PER_ROW + 1)), SQUARE_SIZE, SQUARE_SIZE, 1, 15);
  }
  const scrollUpdates = Math.floor(Math.max(0, Math.min(done, SCROLL_END_CALLBACK) - 1) / 2);
  const steps = scrollUpdates - (SCROLL_LATE_STEP_DONE.has(done) ? 1 : 0);
  // gBattle_BG0_X feeds BG0VOFS and gBattle_BG0_Y BG0HOFS (battle_transition.c:4673-4675).
  s.scrollV = steps * direction[0];
  s.scrollH = steps * direction[1];
  if (done > SCROLL_END_CALLBACK) {
    s.scrollV = 0;
    s.scrollH = 0;
    finish();
  }
  return s;
}

/** Draws BG0 over the room (already blacked out by the caller's fade when `roomBlack`). */
export function applySquares(fb: Uint8Array, te: number, kind: FrontierSquaresTransition, direction: SquaresScrollDirection = SQUARES_SCROLL_DIRECTIONS[0]!): void {
  const s = squaresState(te - SQUARES_INIT_TE + 1, kind, direction);
  if (s.roomBlack) {
    for (let i = 0; i < fb.length; i += 4) {
      fb[i] = 0;
      fb[i + 1] = 0;
      fb[i + 2] = 0;
    }
  }
  if (s.ended) return;
  const tilesBelow = squaresAsset.tileset[s.tileset].tiles;
  const tilesAbove = squaresAsset.tileset[s.tilesetAbove].tiles;
  const palette = squaresAsset.palette;
  for (let y = 0; y < 160; y += 1) {
    const mapY = (y + s.scrollV) & 255;
    const tiles = y < s.tearRow ? tilesAbove : tilesBelow;
    for (let x = 0; x < 240; x += 1) {
      const mapX = (x + s.scrollH) & 255;
      const cell = (mapY >> 3) * 32 + (mapX >> 3);
      const idx = tiles[s.tile[cell]!]![(mapY & 7) * 8 + (mapX & 7)]!;
      if (idx === 0) continue;
      const off = (y * 240 + x) * 4;
      if (s.pal[cell] === 15) {
        const c = s.innerBlack && idx >= 10 && idx <= 14 ? { r: 0, g: 0, b: 0 } : palette[idx]!;
        fb[off] = c.r;
        fb[off + 1] = c.g;
        fb[off + 2] = c.b;
      } else {
        fb[off] = 0;
        fb[off + 1] = 0;
        fb[off + 2] = 0;
      }
    }
  }
}
