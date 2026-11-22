/**
 * B_TRANSITION_FRONTIER_LOGO_WIGGLE (id 29), battle_transition.c:4232-4270 on the shared PatternWeave states (:1375-1745): the Frontier logo on BG0
 * fades in over the room (BLDALPHA, BG0 as target 1) while an HBlank DMA scrolls BG0 sideways by a sine wave that shrinks to nothing, then a
 * shrinking circular window (WIN0H per scanline) closes the screen to black (docs/trn225-frontier-transitions.md, trn226).
 *
 * The task's callbacks are replayed by index `c` (c = 0 is the callback that loads the tilemap and runs Blend1 for the first time). The task's
 * Init runs on te WIGGLE_INIT_TE (the frame after the intro's gray flicker ends), callback c shows on te WIGGLE_INIT_TE + 1 + c (the same layout
 * as FrontierLogoWave and the squares families; ROM-measured, seed 25 both scenes).
 */
import logoAsset from "../assets/gen/battle-transition-frontier-logo.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";

interface LogoAsset {
  palette: Array<{ r: number; g: number; b: number }>;
  tileset: { tiles: number[][] };
  tilemap: { width: number; height: number; entries: Array<{ tile: number; hFlip: boolean; vFlip: boolean; palette: number }> };
}
const logo = logoAsset as LogoAsset;

export const WIGGLE_INIT_TE = 77;
const MAP_SIZE = 256;
const DISPLAY_W = 240;
const DISPLAY_H = 160;
/** InitPatternWeaveTransition: tSinIndex 0, tAmplitude 0x4000, tBlendTarget1 16, tBlendTarget2 0. */
const START_AMPLITUDE = 0x4000;
const MASK_CENTER_X = DISPLAY_W / 2;
const MASK_CENTER_Y = DISPLAY_H / 2;

export interface WiggleState {
  /** BG0's blend weights (BLDALPHA eva = tBlendTarget2, evb = tBlendTarget1) after this callback; the first frame BG0 is drawn at all is c = 0. */
  eva: number;
  evb: number;
  /** BG0HOFS of scanlines 0..159 as the HBlank DMA leaves them (line 0 keeps the previous frame's last write). */
  hofs: Int16Array;
  /** The circular mask's WIN0H (left << 8 | right) per scanline, or null while the window covers the screen. */
  window: Uint16Array | null;
  /** WIN0H on scanline 0: the previous frame's last entry (the whole screen before the first mask frame). */
  windowLine0: number;
  /** The mask has closed (the task is destroyed and the screen is black). */
  ended: boolean;
}

function sin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}
function cos(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[(index + 64) & 0xff]! * amplitude) >> 8;
}

/** SetSinWave(buffer, 0, tSinIndex, 132, amplitude, DISPLAY_HEIGHT). */
function sinWave(sinIndex: number, amplitude: number): Int16Array {
  const out = new Int16Array(DISPLAY_H);
  for (let i = 0, index = sinIndex; i < DISPLAY_H; i += 1, index += 132) out[i] = sin(index & 0xff, amplitude);
  return out;
}

/** SetCircularMask(buffer, 120, 80, radius): the scanline buffer WIN0H reads. */
function circularMask(radius: number): Uint16Array {
  const buffer = new Uint16Array(DISPLAY_H).fill(0x0a0a);
  for (let i = 0; i < 64; i += 1) {
    const sinResult = sin(i, radius);
    const cosResult = cos(i, radius);
    let drawXLeft = MASK_CENTER_X - sinResult;
    let drawX = MASK_CENTER_X + sinResult;
    let drawYTop = MASK_CENTER_Y - cosResult;
    let drawYBott = MASK_CENTER_Y + cosResult;
    if (drawXLeft < 0) drawXLeft = 0;
    if (drawX > DISPLAY_W) drawX = DISPLAY_W;
    if (drawYTop < 0) drawYTop = 0;
    if (drawYBott > DISPLAY_H - 1) drawYBott = DISPLAY_H - 1;
    drawX |= drawXLeft << 8;
    buffer[drawYTop] = drawX;
    buffer[drawYBott] = drawX;
    const nextCos = cos(i + 1, radius);
    let drawYTopNext = MASK_CENTER_Y - nextCos;
    let drawYBottNext = MASK_CENTER_Y + nextCos;
    if (drawYTopNext < 0) drawYTopNext = 0;
    if (drawYBottNext > DISPLAY_H - 1) drawYBottNext = DISPLAY_H - 1;
    while (drawYTop > drawYTopNext) buffer[--drawYTop] = drawX;
    while (drawYTop < drawYTopNext) buffer[++drawYTop] = drawX;
    while (drawYBott > drawYBottNext) buffer[--drawYBott] = drawX;
    while (drawYBott < drawYBottNext) buffer[++drawYBott] = drawX;
  }
  return buffer;
}

/** The state the task's callback `c` leaves (c >= 0), replaying every callback before it. */
export function wiggleState(c: number): WiggleState {
  let amplitude = START_AMPLITUDE;
  let sinIndex = 0;
  let target1 = 16;
  let target2 = 0;
  let delay = 0;
  let phase: "blend1" | "blend2" | "finish" | "mask" = "blend1";
  let radius = DISPLAY_H;
  let radiusDelta = 1 << 8;
  let window: Uint16Array | null = null;
  let hofs = new Int16Array(DISPLAY_H).fill(DISPLAY_W);
  let prevLast = DISPLAY_W;
  let windowLine0 = DISPLAY_W;
  let ended = false;
  for (let k = 0; k <= c; k += 1) {
    prevLast = hofs[DISPLAY_H - 1]!;
    windowLine0 = window === null ? DISPLAY_W : window[DISPLAY_H - 1]!;
    if (phase === "mask") {
      if (radiusDelta < 4 << 8) radiusDelta += 128;
      if (radius !== 0) {
        radius -= radiusDelta >> 8;
        if (radius < 0) radius = 0;
      }
      if (radius === 0) {
        ended = true;
        break;
      }
      window = circularMask(radius);
      continue;
    }
    if (phase === "blend1") {
      if (delay === 0 || --delay === 0) {
        target2 += 1;
        delay = 2;
      }
      if (target2 > 15) phase = "blend2";
    } else if (phase === "blend2") {
      if (delay === 0 || --delay === 0) {
        target1 -= 1;
        delay = 2;
      }
      if (target1 === 0) phase = "finish";
    }
    sinIndex += 8;
    amplitude -= 256;
    hofs = sinWave(sinIndex, amplitude >> 8);
    if (phase === "finish" && amplitude <= 0) {
      phase = "mask";
      radius = DISPLAY_H;
      radiusDelta = 1 << 8;
    }
  }
  const scroll = new Int16Array(DISPLAY_H);
  if (phase === "mask") {
    scroll.fill(hofs[DISPLAY_H - 1]!);
    scroll[0] = prevLast;
  } else {
    scroll[0] = prevLast;
    for (let y = 1; y < DISPLAY_H; y += 1) scroll[y] = hofs[y - 1]!;
  }
  return { eva: target2, evb: target1, hofs: scroll, window, windowLine0, ended };
}

/** The oracle's BLDALPHA blend works on the 8-bit expanded colors. */
function blend8(top: number, under: number, eva: number, evb: number): number {
  return Math.min(255, Math.floor((top * eva + under * evb) / 16));
}

/** BG0's logo over the framebuffer (room, NPCs), through BLDALPHA and the circular window; black outside the window. */
export function applyLogoWiggle(fb: Uint8Array, te: number): void {
  const c = te - WIGGLE_INIT_TE - 1;
  if (c < 0) return;
  const s = wiggleState(c);
  if (s.ended) {
    for (let i = 0; i < fb.length; i += 4) {
      fb[i] = 0;
      fb[i + 1] = 0;
      fb[i + 2] = 0;
    }
    return;
  }
  for (let y = 0; y < DISPLAY_H; y += 1) {
    const mapY = y & (MAP_SIZE - 1);
    const hofs = s.hofs[y]!;
    for (let x = 0; x < DISPLAY_W; x += 1) {
      const off = (y * DISPLAY_W + x) * 4;
      const mapX = (x + hofs) & (MAP_SIZE - 1);
      const entry = logo.tilemap.entries[(mapY >> 3) * logo.tilemap.width + (mapX >> 3)]!;
      const sx = entry.hFlip ? 7 - (mapX & 7) : mapX & 7;
      const sy = entry.vFlip ? 7 - (mapY & 7) : mapY & 7;
      const colorIndex = logo.tileset.tiles[entry.tile]![sy * 8 + sx]!;
      if (colorIndex !== 0) {
        const source = logo.palette[colorIndex]!;
        fb[off] = blend8(source.r, fb[off]!, s.eva, s.evb);
        fb[off + 1] = blend8(source.g, fb[off + 1]!, s.eva, s.evb);
        fb[off + 2] = blend8(source.b, fb[off + 2]!, s.eva, s.evb);
      }
    }
    if (s.window !== null) {
      const row = y === 0 ? s.windowLine0 : s.window[y - 1]!;
      const left = row >> 8;
      const right = row & 0xff;
      for (let x = 0; x < DISPLAY_W; x += 1) {
        if (x >= left && x < right) continue;
        const off = (y * DISPLAY_W + x) * 4;
        fb[off] = 0;
        fb[off + 1] = 0;
        fb[off + 2] = 0;
      }
    }
  }
}

/** The task's last visible mask frame is the callback before the radius reaches 0; the frame of that callback and every later one is black. */
export function wiggleEndTe(): number {
  let c = 0;
  while (!wiggleState(c).ended) c += 1;
  return WIGGLE_INIT_TE + 1 + c;
}

/** CB2_InitBattle's handoff on the engine's clock: the closing callback's frame + 3 (ROM-measured, seeds 25/45/8 both scenes). */
export function logoWiggleIntroHandoffTe(): number {
  return wiggleEndTe() + 3;
}
