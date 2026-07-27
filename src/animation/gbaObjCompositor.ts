/**
 * Reduced GBA OBJ/OBJ-window scanline compositor.
 *
 * Hardware evaluates OAM in ascending index order.  Every OBJ intersecting a
 * scanline consumes its full fetch cost even when all of its texels on that
 * line are transparent; the OBJ which exhausts the budget is still evaluated,
 * and later entries are omitted.  Normal and OBJ-window texels then arbitrate
 * by OBJ priority followed by OAM index.  An OBJ-window texel only changes the
 * color-effect mask when it is in front of the winning normal OBJ texel.
 *
 * Source:
 * - mGBA 0.10.5 `GBAVideoRendererCleanOAM` and
 *   `GBAVideoSoftwareRendererPreprocessSpriteLayer`
 * - GBA OAM priority/index rules as exercised by pokeemerald's
 *   `BuildOamBuffer`/`AddSpritesToOamBuffer`
 */

export const GBA_OBJ_CYCLE_BUDGET = 1210;
export const GBA_OBJ_HBLANK_FREE_CYCLE_BUDGET = 954;

export interface GbaObjRaster<T> {
  readonly oamIndex: number;
  readonly priority: 0 | 1 | 2 | 3;
  readonly mode: "normal" | "objWindow";
  /** Declared (pre-double-size) OBJ width used by the fetch-cost rule. */
  readonly declaredWidth: number;
  readonly affine?: boolean;
  readonly doubleSize?: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Row-major local pixels; `null` is OBJ palette index zero. */
  readonly pixels: readonly (T | null)[];
}

export interface GbaObjComposite<T> {
  readonly normalPixels: readonly (T | null)[];
  /** One where the winning OBJ-window texel disables color effects. */
  readonly objWindowMask: Uint8Array;
  /** Accepted OAM indices for each scanline, useful for focused evidence. */
  readonly evaluatedOamByScanline: readonly (readonly number[])[];
}

function assertRaster<T>(raster: Readonly<GbaObjRaster<T>>): void {
  if (!Number.isInteger(raster.oamIndex) || raster.oamIndex < 0 || raster.oamIndex >= 128) {
    throw new Error(`OAM index must be an integer in [0, 127], got ${raster.oamIndex}`);
  }
  if (!Number.isInteger(raster.declaredWidth) || raster.declaredWidth <= 0) {
    throw new Error(`declared OBJ width must be positive, got ${raster.declaredWidth}`);
  }
  if (
    !Number.isInteger(raster.width)
    || !Number.isInteger(raster.height)
    || raster.width <= 0
    || raster.height <= 0
    || raster.pixels.length !== raster.width * raster.height
  ) {
    throw new Error(`OBJ raster ${raster.oamIndex} has inconsistent dimensions`);
  }
}

function fetchCycles<T>(raster: Readonly<GbaObjRaster<T>>): number {
  if (!raster.affine) return raster.declaredWidth;
  const displayWidth = raster.declaredWidth * (raster.doubleSize ? 2 : 1);
  return 10 + displayWidth * 2;
}

function rank<T>(raster: Readonly<GbaObjRaster<T>>): number {
  return raster.priority * 128 + raster.oamIndex;
}

function pixelAt<T>(
  raster: Readonly<GbaObjRaster<T>>,
  screenX: number,
  screenY: number,
): T | null {
  const localX = screenX - raster.x;
  const localY = screenY - raster.y;
  if (
    localX < 0
    || localX >= raster.width
    || localY < 0
    || localY >= raster.height
  ) return null;
  return raster.pixels[localY * raster.width + localX] ?? null;
}

export function compositeGbaObjScanlines<T>(
  width: number,
  height: number,
  rasters: readonly Readonly<GbaObjRaster<T>>[],
  cycleBudget = GBA_OBJ_CYCLE_BUDGET,
): GbaObjComposite<T> {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`frame dimensions must be positive integers, got ${width}x${height}`);
  }
  if (!Number.isInteger(cycleBudget) || cycleBudget <= 0) {
    throw new Error(`OBJ cycle budget must be positive, got ${cycleBudget}`);
  }
  rasters.forEach(assertRaster);
  if (new Set(rasters.map((raster) => raster.oamIndex)).size !== rasters.length) {
    throw new Error("OBJ rasters must have unique OAM indices");
  }

  const ordered = [...rasters].sort((a, b) => a.oamIndex - b.oamIndex);
  const normalPixels: (T | null)[] = new Array(width * height).fill(null);
  const objWindowMask = new Uint8Array(width * height);
  const evaluatedOamByScanline: number[][] = [];

  for (let y = 0; y < height; y += 1) {
    let remaining = cycleBudget;
    const evaluated: Readonly<GbaObjRaster<T>>[] = [];
    for (const raster of ordered) {
      if (y < raster.y || y >= raster.y + raster.height) continue;
      evaluated.push(raster);
      remaining -= fetchCycles(raster);
      if (remaining <= 0) break;
    }
    evaluatedOamByScanline.push(evaluated.map((raster) => raster.oamIndex));

    for (let x = 0; x < width; x += 1) {
      let normal: Readonly<GbaObjRaster<T>> | null = null;
      let normalPixel: T | null = null;
      let window: Readonly<GbaObjRaster<T>> | null = null;
      for (const raster of evaluated) {
        const pixel = pixelAt(raster, x, y);
        if (pixel === null) continue;
        if (raster.mode === "normal") {
          if (normal === null || rank(raster) < rank(normal)) {
            normal = raster;
            normalPixel = pixel;
          }
        } else if (window === null || rank(raster) < rank(window)) {
          window = raster;
        }
      }
      const offset = y * width + x;
      normalPixels[offset] = normalPixel;
      if (window !== null && (normal === null || rank(window) < rank(normal))) {
        objWindowMask[offset] = 1;
      }
    }
  }

  return { normalPixels, objWindowMask, evaluatedOamByScanline };
}
