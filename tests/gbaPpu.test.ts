import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import { brightnessDecreaseBgr555, drawMode0Ppu, type Mode0State } from "../src/engine/gbaPpu.ts";

function b64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
function stateFor(entries: number[], tilePixels: Record<number, number[]>): Mode0State {
  const chars = new Uint8Array(0x4000), map = new Uint8Array(0x800);
  for (const [tile, pixels] of Object.entries(tilePixels)) for (let i = 0; i < 64; i += 2) chars[Number(tile) * 32 + i / 2] = pixels[i]! | (pixels[i + 1]! << 4);
  entries.forEach((entry, i) => { map[i * 2] = entry & 255; map[i * 2 + 1] = entry >>> 8; });
  return { bldcnt: 0, bldy: 0, bg: [{ control: 0, hofs: 0, vofs: 0, mapB64: b64(map) }], charBases: { "0": b64(chars) }, paletteBgr555: [[0, 31, 31 << 5]], oam: [], objTileIds: [], objTilesB64: "" };
}
function pixel(fb: Uint8Array, x: number, y: number): number[] { return [...fb.slice((y * 240 + x) * 4, (y * 240 + x) * 4 + 3)]; }

describe("mode-0 raw tile compositor", () => {
  it("honors text-BG tile priority, h-flip and transparent index zero", () => {
    const lower = Array(64).fill(2), upper = Array(64).fill(0); upper[0] = 1;
    const base = stateFor([2], { 1: upper, 2: lower });
    const fb = createFramebuffer(); drawMode0Ppu(fb, base);
    expect(pixel(fb, 0, 0)).toEqual([0, 255, 0]); // transparent top tile exposes lower layer below
    base.bg.unshift({ control: 0, hofs: 0, vofs: 0, mapB64: b64(Uint8Array.from([1, 4, ...new Uint8Array(0x7fe)])) });
    drawMode0Ppu(fb, base);
    expect(pixel(fb, 7, 0)).toEqual([255, 0, 0]); // h-flipped top-left texel
    expect(pixel(fb, 0, 0)).toEqual([0, 255, 0]);
  });

  it("uses GBA BLDY brightness decrease in 5-bit color space", () => {
    expect(brightnessDecreaseBgr555(0x7fff, 15)).toBe(0x0842); // 31 - floor(31*15/16) = 2 per channel
    expect(brightnessDecreaseBgr555(0x4210, 0)).toBe(0x4210);
    expect(brightnessDecreaseBgr555(0x4210, 16)).toBe(0);
  });
});
