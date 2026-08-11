import { describe, expect, it } from "vitest";
import {
  boundsForPixelIndices,
  formatPixelBounds,
} from "../tools/compare/diffBounds.ts";

describe("per-frame comparison bounds", () => {
  it("returns inclusive bounds across distinct mismatch regions", () => {
    const bounds = boundsForPixelIndices(
      [
        1, // (1, 0)
        2 + 1 * 4, // (2, 1)
        3 + 2 * 4, // (3, 2)
      ],
      4,
    );

    expect(bounds).toEqual({ minX: 1, minY: 0, maxX: 3, maxY: 2 });
    expect(formatPixelBounds(bounds!)).toBe("1,0-3,2");
  });

  it("returns null for an exact frame", () => {
    expect(boundsForPixelIndices([], 240)).toBeNull();
  });

  it("rejects invalid dimensions and pixel indices", () => {
    expect(() => boundsForPixelIndices([0], 0)).toThrow("positive integer");
    expect(() => boundsForPixelIndices([-1], 240)).toThrow("non-negative integer");
  });
});
