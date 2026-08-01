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

export interface PixelCluster {
  readonly pixelCount: number;
  readonly bounds: PixelBounds;
}

/**
 * Group row-major pixel indices into 8-connected clusters, largest first.
 * A diff window carrying two independent defects reads as one merged bbox
 * without this; per-cluster bounds separate the families numerically.
 */
export function clusterPixelIndices(
  pixelIndices: readonly number[],
  width: number,
): PixelCluster[] {
  if (!Number.isInteger(width) || width < 1) {
    throw new Error(`pixel width must be a positive integer, got ${width}`);
  }
  const pending = new Set<number>();
  for (const pixel of pixelIndices) {
    if (!Number.isInteger(pixel) || pixel < 0) {
      throw new Error(`pixel index must be a non-negative integer, got ${pixel}`);
    }
    pending.add(pixel);
  }
  const clusters: PixelCluster[] = [];
  for (const seed of pixelIndices) {
    if (!pending.has(seed)) continue;
    pending.delete(seed);
    const members: number[] = [seed];
    const stack: number[] = [seed];
    while (stack.length > 0) {
      const pixel = stack.pop()!;
      const x = pixel % width;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const neighborX = x + dx;
          if (neighborX < 0 || neighborX >= width) continue;
          const neighbor = pixel + dy * width + dx;
          if (!pending.has(neighbor)) continue;
          pending.delete(neighbor);
          members.push(neighbor);
          stack.push(neighbor);
        }
      }
    }
    clusters.push({
      pixelCount: members.length,
      bounds: boundsForPixelIndices(members, width)!,
    });
  }
  return clusters.sort((a, b) => b.pixelCount - a.pixelCount);
}
