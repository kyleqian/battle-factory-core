import { describe, expect, it } from "vitest";
import {
  glyphLastRowColumnsForTransfer,
  glyphRasterRowsForTransfer,
  glyphTrailingRowColumnsForTransfer,
  movesWindowTransferAt,
} from "../src/engine/summaryWindowTransfer.ts";

describe("summary move-window CopyWindowToVram transfer model", () => {
  it("keeps both complete source windows before PrintPageSpecificText", () => {
    expect(movesWindowTransferAt(18, false)).toEqual({
      names: { completeRows: 4 },
      pp: { completeRows: 4 },
    });
  });

  it("exposes the source-ordered first VBlank for initial and installed windows", () => {
    expect(movesWindowTransferAt(19, false)).toEqual({
      names: { completeRows: 2 },
      pp: {
        completeRows: 1,
        clearHandoff: {
          row: 3,
          glyphX: 5,
          glyphY: 8,
          width: 6,
          height: 10,
        },
      },
    });
    expect(movesWindowTransferAt(19, true)).toEqual({
      names: { completeRows: 2 },
      pp: { completeRows: 2 },
    });
  });

  it("models the final pending PP copy as a generic partial glyph raster", () => {
    const initial = movesWindowTransferAt(20, false).pp;
    const installed = movesWindowTransferAt(20, true).pp;
    expect(initial).toEqual({
      completeRows: 3,
      partialRow: {
        row: 3,
        completeGlyphs: 1,
        partialGlyphRows: 8,
        partialGlyphLastRowColumns: 4,
      },
    });
    expect(glyphRasterRowsForTransfer(initial, 3, 0, 15)).toBe(15);
    expect(glyphRasterRowsForTransfer(initial, 3, 1, 15)).toBe(8);
    expect(glyphLastRowColumnsForTransfer(initial, 3, 1)).toBe(4);
    expect(glyphRasterRowsForTransfer(initial, 3, 2, 15)).toBe(0);
    expect(glyphRasterRowsForTransfer(installed, 3, 1, 15)).toBe(5);
  });

  it("settles every row after the final queued PP window copy", () => {
    expect(movesWindowTransferAt(21, false)).toEqual({
      names: { completeRows: 4 },
      pp: { completeRows: 4 },
    });
    expect(movesWindowTransferAt(21, true)).toEqual(
      movesWindowTransferAt(21, false),
    );
  });

  it("preserves Contest's source window, then exposes its page-specific copy fragments", () => {
    expect(movesWindowTransferAt(19, false, "contestMoves")).toMatchObject({
      textOwner: "source",
      names: { completeRows: 4 },
      pp: { completeRows: 4 },
    });
    expect(movesWindowTransferAt(20, false, "contestMoves")).toMatchObject({
      textOwner: "destination",
      names: { completeRows: 2 },
      pp: {
        completeRows: 1,
        partialRow: { row: 1, completeGlyphs: 1, partialGlyphRows: 13 },
      },
    });
    expect(movesWindowTransferAt(21, false, "contestMoves").pp).toMatchObject({
      completeRows: 3,
      partialRow: { row: 3, completeGlyphs: 4, partialGlyphRows: 0 },
    });
  });

  it("models Contest's installed-window DMA fragment as trailing row widths", () => {
    const transfer = movesWindowTransferAt(20, true, "contestMoves").pp;
    expect(glyphRasterRowsForTransfer(transfer, 3, 0, 15)).toBe(7);
    expect(glyphTrailingRowColumnsForTransfer(transfer, 3, 0)).toEqual([8, 7]);
    expect(glyphRasterRowsForTransfer(transfer, 3, 1, 15)).toBe(0);
  });
});
