// perf211: the render-path caches must be invisible -- every tier (first-sighting raster, index layer, RGBA copy,
// recorded paint) writes exactly what the uncached raster writes, including after inputs are edited in place.
import { describe, expect, it } from "vitest";

import { drawTileBg, type RgbColor, type TileBg } from "../src/engine/bg.ts";
import { OpaqueDrawMemo } from "../src/engine/opaqueDrawMemo.ts";
import { drawCompiledTileBg, tileBgPaletteKey } from "../src/engine/tileBgCache.ts";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBg(seed: number, width: number, height: number): TileBg {
  const random = mulberry32(seed);
  const int = (n: number) => Math.floor(random() * n);
  const tiles = Array.from({ length: 12 }, () => Array.from({ length: 64 }, () => (random() < 0.3 ? 0 : int(16))));
  const entries = Array.from({ length: width * height }, () => ({
    // tile 12 does not exist and palette 3 is missing: both raster skip / fallback rules are exercised
    tile: int(13),
    hFlip: random() < 0.5,
    vFlip: random() < 0.5,
    palette: int(4),
  }));
  const subpalettes = Array.from({ length: 3 }, () =>
    Array.from({ length: 16 }, () => ({ r: int(256), g: int(256), b: int(256) })));
  return { tileset: { columns: 4, rows: 3, tiles }, tilemap: { width, height, entries }, subpalettes };
}

/** A structurally identical copy with fresh identities: it is always drawn by the plain raster (first sighting). */
function cloneBg(bg: TileBg): TileBg {
  return structuredClone(bg);
}

function filled(seed: number): Uint8Array {
  const random = mulberry32(seed);
  return Uint8Array.from({ length: 240 * 160 * 4 }, () => Math.floor(random() * 256));
}

/** battleScene.ts's unscrolled 240x160 raster rule (no missing-row fallback). */
function referenceScreenRaster(fb: Uint8Array, bg: TileBg): void {
  for (let y = 0; y < 160; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const entry = bg.tilemap.entries[Math.floor(y / 8) * bg.tilemap.width + Math.floor(x / 8)];
      if (!entry) continue;
      const tile = bg.tileset.tiles[entry.tile];
      if (!tile) continue;
      const index = tile[(entry.vFlip ? 7 - y % 8 : y % 8) * 8 + (entry.hFlip ? 7 - x % 8 : x % 8)]!;
      if (index === 0) continue;
      const color = bg.subpalettes[entry.palette]?.[index];
      if (!color) continue;
      const o = (y * 240 + x) * 4;
      fb[o] = color.r;
      fb[o + 1] = color.g;
      fb[o + 2] = color.b;
      fb[o + 3] = 255;
    }
  }
}

describe("perf211 tile BG cache (bg.ts drawTileBg)", () => {
  it("every cache tier matches the raster at wrapped scrolls, with palettes rebuilt per call", () => {
    const bg = randomBg(1, 64, 32);
    for (const [scrollX, scrollY] of [[0, 0], [37, -5], [-300, 411], [512, 256]] as const) {
      for (let draw = 0; draw < 6; draw += 1) {
        // a fresh palette array with the same colors each time, like a per-frame fade
        const frameBg = { ...bg, subpalettes: bg.subpalettes.map((row) => row.map((c) => ({ ...c }))) };
        const actual = filled(draw);
        drawTileBg(actual, frameBg, scrollX, scrollY);
        const expected = filled(draw);
        drawTileBg(expected, cloneBg(bg), scrollX, scrollY);
        expect(Buffer.from(actual).equals(Buffer.from(expected)), `scroll ${scrollX},${scrollY} draw ${draw}`).toBe(true);
      }
    }
  });

  it("maps narrower than the screen wrap identically", () => {
    const bg = randomBg(2, 5, 3);
    for (let draw = 0; draw < 6; draw += 1) {
      const actual = filled(10 + draw);
      drawTileBg(actual, bg, 3 - draw * 11, draw * 7);
      const expected = filled(10 + draw);
      drawTileBg(expected, cloneBg(bg), 3 - draw * 11, draw * 7);
      expect(Buffer.from(actual).equals(Buffer.from(expected))).toBe(true);
    }
  });

  it("recompiles after an entry is replaced in place, and follows a palette change", () => {
    const bg = randomBg(3, 32, 32);
    for (let draw = 0; draw < 5; draw += 1) drawTileBg(filled(0), bg);
    bg.tilemap.entries[0] = { tile: 1, hFlip: false, vFlip: false, palette: 0 };
    bg.subpalettes[0] = bg.subpalettes[0]!.map((c) => ({ r: 255 - c.r, g: c.g, b: c.b }));
    for (let draw = 0; draw < 5; draw += 1) {
      const actual = filled(20 + draw);
      drawTileBg(actual, bg);
      const expected = filled(20 + draw);
      drawTileBg(expected, cloneBg(bg));
      expect(Buffer.from(actual).equals(Buffer.from(expected))).toBe(true);
    }
  });

  it("fractional scrolls keep the raster", () => {
    const bg = randomBg(4, 32, 32);
    const actual = filled(30);
    drawTileBg(actual, bg, 0.5, 0);
    drawTileBg(actual, bg, 0.5, 0);
    const expected = filled(30);
    drawTileBg(expected, cloneBg(bg), 0.5, 0);
    drawTileBg(expected, cloneBg(bg), 0.5, 0);
    expect(Buffer.from(actual).equals(Buffer.from(expected))).toBe(true);
  });
});

describe("perf211 tile BG cache (screen raster rule)", () => {
  it("matches the unscrolled raster for every tier; declines the first sighting", () => {
    const bg = randomBg(5, 32, 20);
    const options = { width: 240, height: 160, scrollX: 0, scrollY: 0, fallbackRow0: false };
    expect(drawCompiledTileBg(filled(0), bg.tileset, bg.tilemap, bg.subpalettes, options)).toBe(false);
    for (let draw = 0; draw < 6; draw += 1) {
      const actual = filled(40 + draw);
      expect(drawCompiledTileBg(actual, bg.tileset, bg.tilemap, bg.subpalettes, options)).toBe(true);
      const expected = filled(40 + draw);
      referenceScreenRaster(expected, bg);
      expect(Buffer.from(actual).equals(Buffer.from(expected))).toBe(true);
    }
  });

  it("palette keys separate holes, missing rows and colors", () => {
    const c: RgbColor = { r: 1, g: 2, b: 3 };
    const keys = [
      tileBgPaletteKey([[c]]),
      tileBgPaletteKey([[c, undefined]]),
      tileBgPaletteKey([[c], undefined]),
      tileBgPaletteKey([[{ r: 1, g: 2, b: 4 }]]),
      tileBgPaletteKey([[], [c]]),
    ];
    expect(new Set(keys).size).toBe(keys.length);
    expect(tileBgPaletteKey([[{ ...c }]])).toBe(keys[0]);
  });
});

describe("perf211 OpaqueDrawMemo", () => {
  it("replays a recorded opaque paint exactly over any framebuffer", () => {
    const memo = new OpaqueDrawMemo(2);
    const paint = (shift: number) => (fb: Uint8Array) => {
      for (let i = 0; i < 5000; i += 1) {
        const x = (i * 7 + shift) % 260 - 10;
        const y = (i * 13) % 170 - 5;
        if (x < 0 || y < 0 || x >= 240 || y >= 160) continue;
        const o = (y * 240 + x) * 4;
        fb[o] = i & 255;
        fb[o + 1] = shift;
        fb[o + 2] = 9;
        fb[o + 3] = 255;
      }
    };
    for (let draw = 0; draw < 8; draw += 1) {
      const shift = draw % 3; // three keys through a two-entry memo: evictions included
      const actual = filled(50 + draw);
      memo.draw(actual, `k${shift}`, paint(shift));
      const expected = filled(50 + draw);
      paint(shift)(expected);
      expect(Buffer.from(actual).equals(Buffer.from(expected))).toBe(true);
    }
  });
});
