// Small, auditable mode-0 compositor for extracted live PPU state.  This is
// deliberately indexed: callers supply raw 4bpp character/map/OBJ tiles and
// BGR555 palette words, never a rendered capture.

import { fillFramebuffer, setPixel } from "./framebuffer.ts";

export interface Mode0Bg { control: number; hofs: number; vofs: number; mapB64: string; }
export interface Mode0Oam { a0: number; a1: number; a2: number; matrix?: number[] | null; }
export interface Mode0State {
  bldcnt: number; bldy: number;
  bg: Mode0Bg[];
  charBases: Record<string, string>;
  paletteBgr555: number[][];
  oam: Mode0Oam[];
  objTileIds: number[];
  objTilesB64: string;
}

function bytes(b64: string): Uint8Array {
  const text = atob(b64);
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}
function rgb5(c: number): number { return (c << 3) | (c >> 2); }

/** mGBA's `mColorFrom555`: packed low-byte R, then G and B. */
export function mgbaColorFromBgr555(color: number): number {
  return rgb5(color & 31) | (rgb5((color >>> 5) & 31) << 8) | (rgb5((color >>> 10) & 31) << 16);
}

/**
 * mGBA software renderer `_darken` (software-private.h), verbatim in
 * arithmetic shape.  It darkens each *packed expanded* component before
 * masking it back into place; that is deliberately not the GBA's 5-bit
 * `BlendPalette` equation.  At BLDY=15 white therefore becomes 16,15,15.
 */
export function mgbaDarkenColor(color: number, bldy: number): number {
  const y = Math.min(16, Math.max(0, bldy));
  let out = 0;
  for (const mask of [0x0000ff, 0x00ff00, 0xff0000]) {
    const component = color & mask;
    out |= (component - Math.floor(component * y / 16)) & mask;
  }
  return out;
}
type PaletteState = Pick<Mode0State, "bldcnt" | "bldy" | "paletteBgr555">;
function color(state: PaletteState, bank: number, index: number, targetBit: number): [number, number, number] {
  let packed = mgbaColorFromBgr555(state.paletteBgr555[bank]?.[index] ?? 0);
  if (((state.bldcnt >>> 6) & 3) === 3 && (state.bldcnt & targetBit) !== 0) packed = mgbaDarkenColor(packed, state.bldy);
  return [packed & 0xff, (packed >>> 8) & 0xff, (packed >>> 16) & 0xff];
}
function mapDimensions(size: number): [number, number] { return [[32, 32], [64, 32], [32, 64], [64, 64]][size] as [number, number]; }
function mapEntry(map: Uint8Array, width: number, x: number, y: number): number {
  const blockX = Math.floor(x / 32), blockY = Math.floor(y / 32);
  const blocksPerRow = width / 32;
  const i = ((blockY * blocksPerRow + blockX) * 1024 + (y & 31) * 32 + (x & 31)) * 2;
  return (map[i] ?? 0) | ((map[i + 1] ?? 0) << 8);
}
function drawBg(fb: Uint8Array, state: Mode0State, bgIndex: number, bg: Mode0Bg, chars: Uint8Array, map: Uint8Array): void {
  const size = (bg.control >>> 14) & 3;
  const [width, height] = mapDimensions(size);
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    const mx = (x + bg.hofs) & (width * 8 - 1), my = (y + bg.vofs) & (height * 8 - 1);
    const entry = mapEntry(map, width, mx >>> 3, my >>> 3);
    const px = (entry & 0x400) ? 7 - (mx & 7) : mx & 7;
    const py = (entry & 0x800) ? 7 - (my & 7) : my & 7;
    const offset = (entry & 0x3ff) * 32 + py * 4 + (px >>> 1);
    const packed = chars[offset] ?? 0;
    const index = (px & 1) ? packed >>> 4 : packed & 15;
    if (index === 0) continue;
    const [r, g, b] = color(state, (entry >>> 12) & 15, index, 1 << bgIndex);
    setPixel(fb, x, y, r, g, b);
  }
}
function objDimensions(a0: number, a1: number): [number, number] {
  const shape = (a0 >>> 14) & 3, size = (a1 >>> 14) & 3;
  return ([[[8, 8], [16, 16], [32, 32], [64, 64]], [[16, 8], [32, 8], [32, 16], [64, 32]], [[8, 16], [8, 32], [16, 32], [32, 64]]][shape]?.[size] ?? [0, 0]) as [number, number];
}
type ObjState = PaletteState;
function drawObj(fb: Uint8Array, state: ObjState, entry: Mode0Oam, tiles: Map<number, Uint8Array>): void {
  const [w, h] = objDimensions(entry.a0, entry.a1);
  const affine = ((entry.a0 >>> 8) & 3) !== 0;
  let ox = entry.a1 & 0x1ff, oy = entry.a0 & 0xff;
  const hFlip = !affine && (entry.a1 & 0x1000) !== 0, vFlip = !affine && (entry.a1 & 0x2000) !== 0;
  const baseTile = entry.a2 & 0x3ff, palette = 16 + (entry.a2 >>> 12);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let sx = hFlip ? w - 1 - x : x, sy = vFlip ? h - 1 - y : y;
    if (affine) {
      const [pa = 256, pb = 0, pc = 0, pd = 256] = entry.matrix ?? [];
      const dx = x - w / 2, dy = y - h / 2;
      sx = Math.floor((pa * dx + pb * dy) / 256 + w / 2);
      sy = Math.floor((pc * dx + pd * dy) / 256 + h / 2);
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
    }
    const tile = tiles.get(baseTile + (sy >>> 3) * (w >>> 3) + (sx >>> 3));
    const packed = tile?.[(sy & 7) * 4 + ((sx & 7) >>> 1)] ?? 0;
    const index = (sx & 1) ? packed >>> 4 : packed & 15;
    if (index === 0) continue;
    const [r, g, b] = color(state, palette, index, 1 << 4);
    setPixel(fb, ox + x, oy + y, r, g, b);
  }
}

/** Draw an OAM subset with the PPU's priority and lower-index tie order. */
export function drawMode0Objects(fb: Uint8Array, state: Pick<Mode0State, "bldcnt" | "bldy" | "paletteBgr555" | "objTileIds" | "objTilesB64"> & { oam: Mode0Oam[] }): void {
  const tileBytes = bytes(state.objTilesB64), tiles = new Map<number, Uint8Array>();
  state.objTileIds.forEach((id, i) => tiles.set(id, tileBytes.subarray(i * 32, i * 32 + 32)));
  for (let priority = 3; priority >= 0; priority -= 1) {
    for (let i = state.oam.length - 1; i >= 0; i -= 1) if (((state.oam[i]!.a2 >>> 10) & 3) === priority) drawObj(fb, state, state.oam[i]!, tiles);
  }
}

/** Draw a static mode-0 state, honoring text-BG priority, flips, OBJ OAM order and BLDY decrease. */
export function drawMode0Ppu(fb: Uint8Array, state: Mode0State): void {
  const [r, g, b] = color(state, 0, 0, 0); fillFramebuffer(fb, r, g, b);
  const layers = state.bg.map((bg, index) => ({ bg, index, priority: bg.control & 3, chars: bytes(state.charBases[String((bg.control >>> 2) & 3)] ?? ""), map: bytes(bg.mapB64) }));
  for (let priority = 3; priority >= 0; priority -= 1) {
    for (const layer of [...layers].sort((a, b) => b.index - a.index)) if (layer.priority === priority) drawBg(fb, state, layer.index, layer.bg, layer.chars, layer.map);
    // Object layers are composited after same-priority BGs.  Keep the OAM
    // subset local here because full mode-0 rendering interleaves BG/OBJ.
    const tileBytes = bytes(state.objTilesB64), tiles = new Map<number, Uint8Array>();
    state.objTileIds.forEach((id, i) => tiles.set(id, tileBytes.subarray(i * 32, i * 32 + 32)));
    for (let i = state.oam.length - 1; i >= 0; i -= 1) if (((state.oam[i]!.a2 >>> 10) & 3) === priority) drawObj(fb, state, state.oam[i]!, tiles);
  }
}
