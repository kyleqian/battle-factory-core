/**
 * Visible tile-buffer state while pokemon_summary_screen.c's speed-0
 * PrintMoveNameAndPP loop overlaps VBlank's ProcessDma3Requests.
 *
 * CopyWindowToVram queues the whole window but retains a pointer to its live
 * RAM tile buffer. VBlank can therefore copy that buffer between row printers,
 * or while CopyGlyphToWindow is partway through a glyph. This describes that
 * generic text-window state without referring to framebuffer coordinates.
 */
export interface TextWindowTransfer {
  /** Fully copied 16px text rows, in source print order. */
  readonly completeRows: number;
  /** Optional in-progress row copied while its next glyph was being blitted. */
  readonly partialRow?: {
    readonly row: number;
    readonly completeGlyphs: number;
    readonly partialGlyphRows: number;
    /** Columns copied on the final partial glyph row; omitted means full. */
    readonly partialGlyphLastRowColumns?: number;
  };
  /**
   * Region still exposing the cleared BG handoff while the initial live
   * window buffer and its queued VRAM copy overlap.
   */
  readonly clearHandoff?: {
    readonly row: number;
    readonly glyphX: number;
    readonly glyphY: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface MovesWindowTransfer {
  readonly names: TextWindowTransfer;
  readonly pp: TextWindowTransfer;
}

const FULL_MOVES_WINDOW: MovesWindowTransfer = {
  names: { completeRows: 4 },
  pp: { completeRows: 4 },
};

/**
 * Task_ChangeSummaryMon state 11 becomes visible at elapsed 19. The first
 * replacement after page construction inherits that page's outstanding copy
 * queue; later replacements begin with the two move windows already installed.
 */
export function movesWindowTransferAt(
  elapsed: number,
  sourceIsReplacement: boolean,
): MovesWindowTransfer {
  if (elapsed < 19) {
    // No destination print has started; VRAM still owns the complete source
    // rental windows selected by pageTextSlot.
    return FULL_MOVES_WINDOW;
  }
  if (elapsed === 19) {
    return {
      names: { completeRows: 2 },
      pp: sourceIsReplacement
        ? { completeRows: 2 }
        : {
            completeRows: 1,
            clearHandoff: {
              row: 3,
              glyphX: 5,
              glyphY: 8,
              width: 6,
              height: 10,
            },
          },
    };
  }
  if (elapsed === 20) {
    return {
      names: { completeRows: 4 },
      pp: {
        completeRows: 3,
        partialRow: {
          row: 3,
          completeGlyphs: 1,
          partialGlyphRows: sourceIsReplacement ? 5 : 8,
          partialGlyphLastRowColumns: sourceIsReplacement ? undefined : 4,
        },
      },
    };
  }
  return FULL_MOVES_WINDOW;
}

export function glyphRasterRowsForTransfer(
  transfer: TextWindowTransfer,
  row: number,
  glyphIndex: number,
  glyphHeight: number,
): number {
  if (row < transfer.completeRows) return glyphHeight;
  const partial = transfer.partialRow;
  if (!partial || row !== partial.row) return 0;
  if (glyphIndex < partial.completeGlyphs) return glyphHeight;
  if (glyphIndex === partial.completeGlyphs) {
    return Math.min(glyphHeight, partial.partialGlyphRows);
  }
  return 0;
}

export function glyphLastRowColumnsForTransfer(
  transfer: TextWindowTransfer,
  row: number,
  glyphIndex: number,
): number | undefined {
  const partial = transfer.partialRow;
  return partial && row === partial.row && glyphIndex === partial.completeGlyphs
    ? partial.partialGlyphLastRowColumns
    : undefined;
}
