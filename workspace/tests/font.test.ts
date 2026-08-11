import { describe, expect, it } from "vitest";
import { measureText, rightAlignXOffset, type FontData } from "../src/engine/font.ts";

const charmap = new Map<string, number>([
  ["A", 0],
  ["B", 1],
  [" ", 2],
]);

const font: FontData = {
  cellSize: 4,
  columns: 1,
  rows: 3,
  glyphHeight: 4,
  letterSpacing: 1,
  widths: [3, 5, 2],
  glyphs: [[], [], []],
};

describe("measureText", () => {
  it("sums glyph widths plus letter spacing between characters", () => {
    // "AB": 3 + 1(spacing) + 5 = 9 (no trailing spacing)
    expect(measureText(font, charmap, "AB")).toBe(9);
  });

  it("is zero for an empty string", () => {
    expect(measureText(font, charmap, "")).toBe(0);
  });

  it("skips characters missing from the charmap without throwing", () => {
    expect(measureText(font, charmap, "A?B")).toBe(measureText(font, charmap, "AB") + 0 /* '?' unmapped, contributes 0 */);
  });
});

describe("rightAlignXOffset", () => {
  it("returns totalWidth minus the measured text width", () => {
    expect(rightAlignXOffset(font, charmap, "A", 20)).toBe(20 - 3);
  });
});
