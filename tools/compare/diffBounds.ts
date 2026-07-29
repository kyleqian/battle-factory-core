export interface PixelBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Returns inclusive bounds for row-major pixel indices. */
export function boundsForPixelIndices(
  pixelIndices: readonly number[],
  width: number,
): PixelBounds | null {
  if (!Number.isInteger(width) || width < 1) {
    throw new Error(`pixel width must be a positive integer, got ${width}`);
  }
  if (pixelIndices.length === 0) return null;

  let minX = width;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;
  for (const pixel of pixelIndices) {
    if (!Number.isInteger(pixel) || pixel < 0) {
      throw new Error(`pixel index must be a non-negative integer, got ${pixel}`);
    }
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

export function formatPixelBounds(bounds: PixelBounds): string {
  return `${bounds.minX},${bounds.minY}-${bounds.maxX},${bounds.maxY}`;
}
