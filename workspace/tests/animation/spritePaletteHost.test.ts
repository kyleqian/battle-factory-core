import { describe, expect, it } from "vitest";
import {
  allocSpritePalette, blendPalette, copyUnfadedToFaded, createSpritePaletteHost,
  freeAllSpritePalettes, freeSpritePaletteByTag, indexOfSpritePaletteTag,
  loadPalette, loadSpritePalette, writeFadedPalette, SPRITE_PALETTE_NOT_FOUND,
} from "../../src/animation/spritePaletteHost.ts";

describe("source sprite-palette ownership and stale color memory", () => {
  it("retains a freed resource's unfaded row across Shadow Punch's faded-only copy", () => {
    const red = Array(16).fill(0x001f), blue = Array(16).fill(0x7c00);
    const original = loadPalette(createSpritePaletteHost(4), 256, blue);
    const previousMove = loadSpritePalette(original, 100, red);
    expect(previousMove.index).toBe(4);
    const freed = freeSpritePaletteByTag(previousMove.host, 100);
    const trace = allocSpritePalette(freed, 101);
    const copied = copyUnfadedToFaded(trace.host, 256, 320, 16);
    expect(copied.faded.slice(320, 336)).toEqual(blue);
    const blended = blendPalette(copied, 320, 16, 8, 0);
    expect(blended.faded.slice(320, 336)).toEqual(Array(16).fill(0x000f));
    expect(blended.unfaded.slice(320, 336)).toEqual(red);
    expect(original.tags[4]).toBe(0xffff);
    expect(original.unfaded.slice(320, 336)).toEqual(Array(16).fill(0));
  });

  it("writes only selected faded colors without clearing stale unfaded RAM", () => {
    const original = loadPalette(createSpritePaletteHost(4), 400, Array(16).fill(0x1234));
    const written = writeFadedPalette(original, 401, [0x7fff, 0x1f, 0x3e0, 0x7c00, 0]);
    expect(written.unfaded.slice(400, 416)).toEqual(Array(16).fill(0x1234));
    expect(written.faded.slice(400, 407)).toEqual([0x1234, 0x7fff, 0x1f, 0x3e0, 0x7c00, 0, 0x1234]);
    expect(original.faded.slice(400, 416)).toEqual(Array(16).fill(0x1234));
    expect(() => writeFadedPalette(original, 511, [1, 2])).toThrow("exceeds color RAM");
  });

  it("distinguishes load's existing-tag reuse from alloc's duplicate-tag reservation", () => {
    const first = loadSpritePalette(createSpritePaletteHost(4), 42, Array(16).fill(123));
    const reused = loadSpritePalette(first.host, 42, Array(16).fill(456));
    expect(reused).toEqual({ index: 4, host: first.host });
    const allocated = allocSpritePalette(first.host, 42);
    expect(allocated.index).toBe(5);
    const freed = freeSpritePaletteByTag(allocated.host, 42);
    expect(indexOfSpritePaletteTag(freed, 42)).toBe(5);
    expect(freed.unfaded.slice(320, 336)).toEqual(Array(16).fill(123));
  });

  it("exhausts only unreserved banks and reports allocation failure without altering memory", () => {
    let host = createSpritePaletteHost(4);
    for (let i = 0; i < 12; i++) {
      const result = allocSpritePalette(host, 100 + i);
      expect(result.index).toBe(i + 4);
      host = result.host;
    }
    expect(allocSpritePalette(host, 999)).toEqual({ host, index: SPRITE_PALETTE_NOT_FOUND });
    expect(loadSpritePalette(host, 999, Array(16).fill(1))).toEqual({ host, index: SPRITE_PALETTE_NOT_FOUND });
    const released = freeAllSpritePalettes(host);
    expect(released.reservedCount).toBe(0);
    expect(released.tags).toEqual(Array(16).fill(0xffff));
    expect(released.unfaded).toEqual(host.unfaded);
  });

  it("uses signed fixed-point rounding for descending color channels", () => {
    const host = loadPalette(createSpritePaletteHost(4), 0, [0x7fff, 0]);
    expect(blendPalette(host, 0, 2, 1, 0).faded.slice(0, 2)).toEqual([0x77bd, 0]);
    expect(blendPalette(host, 0, 2, 16, 0x1234).faded.slice(0, 2)).toEqual([0x1234, 0x1234]);
  });
});
