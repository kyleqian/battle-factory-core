import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import { mgbaColorFromBgr555, mgbaDarkenColor, drawMode0Ppu, type Mode0State } from "../src/engine/gbaPpu.ts";

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

  it("uses mGBA's packed expanded-RGB BLDY darken transfer", () => {
    // `_darken` works after mColorFrom555, not on BGR555 channels.  The
    // packed-byte divisions retain different discarded low bits for R/G/B.
    expect(mgbaDarkenColor(mgbaColorFromBgr555(0x7fff), 15)).toBe(0x0f0f10);
    expect(mgbaDarkenColor(mgbaColorFromBgr555(0x7fff), 15)).toEqual(0x0f0f10); // RGB = 16,15,15
    // A non-white palette word pins the same upstream arithmetic directly.
    expect(mgbaDarkenColor(mgbaColorFromBgr555(0x4210), 15)).toBe(0x080809); // RGB = 9,8,8
    expect(mgbaDarkenColor(mgbaColorFromBgr555(0x4210), 0)).toBe(0x848484);
  });

  it("uses captured affine OAM matrix parameters rather than an identity approximation", () => {
    const base = stateFor([], {});
    const tile = new Uint8Array(32); tile[4] = 0x10; // source texel (1,1)
    base.paletteBgr555[16] = [0, 31];
    base.objTileIds = [0]; base.objTilesB64 = b64(tile);
    // A 180-degree captured matrix makes the source's top-left texel land
    // at the bottom-right of this 8x8 affine object.
    base.oam = [{ a0: 0x0100, a1: 0, a2: 0, matrix: [-256, 0, 0, -256] }];
    const fb = createFramebuffer(); drawMode0Ppu(fb, base);
    expect(pixel(fb, 7, 7)).toEqual([255, 0, 0]);
    expect(pixel(fb, 0, 0)).toEqual([0, 0, 0]);
  });
});
