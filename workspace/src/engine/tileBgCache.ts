// perf211: compiled tile BG rasters for the per-frame render path.
//
// Both tile BG rasterisers (bg.ts `drawTileBg`, battleScene.ts `drawTileBg`) read, per layer pixel (x, y), the
// entry at `entries[floor(y / 8) * tilemap.width + floor(x / 8)]`, its tile's pixel at (x % 8, y % 8) after flips,
// and a palette color. Everything but the palette lookup depends only on (tileset, tilemap), so it is compiled once
// into an index layer: per pixel the entry's palette row (as a slot into `rowValues`) and the color index, or -1
// where the raster skips the pixel. Drawing then only resolves colors for the frame's palette. Stable palettes also
// get a full RGBA copy once drawn a few times, keyed by exact palette content (`tileBgPaletteKey`), so palettes
// rebuilt each frame with the same colors share it.
//
// Purity: the output is a function of the inputs alone. Layers are cached by tileset / tilemap identity and
// re-validated on every draw against the entry and tile references they read (an entries array edited in place
// recompiles); tile pixel arrays, entry fields and color channels are never mutated in src/. Inputs seen only once
// are drawn by the caller's own raster, so one-off tilemaps and palettes cost what they always did.

import type { RgbColor } from "./bg.ts";

type Entry = { tile: number; hFlip: boolean; vFlip: boolean; palette: number };
type TilesetLike = { tiles: number[][] };
type TilemapLike = { width: number; entries: Entry[] };
type Subpalettes = readonly (readonly (RgbColor | undefined)[] | undefined)[];

type CompiledRgba = { rgba: Uint8Array; runs: Int32Array[] };

type IndexLayer = {
  width: number;
  height: number;
  stride: number;
  /** palette row slot per pixel (into `rowValues`); meaningful where `colors` >= 0 */
  rows: Uint8Array;
  /** color index per pixel, -1 where the raster skips the pixel (no entry / no tile / index 0) */
  colors: Int16Array;
  /** distinct `entry.palette` values the layer reads */
  rowValues: number[];
  cellCols: number;
  cellRows: number;
  entryRefs: (Entry | undefined)[];
  tileRefs: (number[] | undefined)[];
  /** RGBA per palette key, or how many times the key was drawn indexed so far */
  rgbaByKey: Map<string, CompiledRgba | number>;
};

const SEEN_ONCE = null;
const RGBA_LIMIT = 8;
/** a palette key drawn this many times through the index layer gets its RGBA copy (ramps rarely repeat a step) */
const RGBA_AFTER = 3;
const layers = new WeakMap<object, WeakMap<object, Map<string, IndexLayer | typeof SEEN_ONCE>>>();

/** Exact content key of a subpalette list: every row's length and every slot's r,g,b; holes and missing rows apart. */
export function tileBgPaletteKey(subpalettes: Subpalettes): string {
  let key = `${subpalettes.length}`;
  for (let row = 0; row < subpalettes.length; row += 1) {
    const colors = subpalettes[row];
    if (!colors) {
      key += "|u";
      continue;
    }
    key += `|${colors.length}:`;
    for (let index = 0; index < colors.length; index += 1) {
      const color = colors[index];
      key += color ? `${color.r},${color.g},${color.b};` : "_;";
    }
  }
  return key;
}

function compileIndexLayer(tileset: TilesetLike, tilemap: TilemapLike, width: number, height: number): IndexLayer | null {
  const rows = new Uint8Array(width * height);
  const colors = new Int16Array(width * height).fill(-1);
  const rowValues: number[] = [];
  const cellCols = Math.ceil(width / 8);
  const cellRows = Math.ceil(height / 8);
  const entryRefs: (Entry | undefined)[] = [];
  const tileRefs: (number[] | undefined)[] = [];
  for (let cellY = 0; cellY < cellRows; cellY += 1) {
    for (let cellX = 0; cellX < cellCols; cellX += 1) {
      const entry = tilemap.entries[cellY * tilemap.width + cellX];
      entryRefs.push(entry);
      const tile = entry ? tileset.tiles[entry.tile] : undefined;
      tileRefs.push(tile);
      if (!entry || !tile) continue;
      let slot = rowValues.indexOf(entry.palette);
      if (slot < 0) {
        slot = rowValues.length;
        if (slot > 255) return null;
        rowValues.push(entry.palette);
      }
      for (let inY = 0; inY < 8; inY += 1) {
        const y = cellY * 8 + inY;
        if (y >= height) break;
        const sy = entry.vFlip ? 7 - inY : inY;
        for (let inX = 0; inX < 8; inX += 1) {
          const x = cellX * 8 + inX;
          if (x >= width) break;
          const sx = entry.hFlip ? 7 - inX : inX;
          const colorIndex = tile[sy * 8 + sx];
          // Index 0 is transparent; a missing or non-index value can never name a palette slot either.
          if (colorIndex === undefined || colorIndex === 0 || !Number.isInteger(colorIndex) || colorIndex < 0) continue;
          if (colorIndex > 0x7fff) return null;
          rows[y * width + x] = slot;
          colors[y * width + x] = colorIndex;
        }
      }
    }
  }
  return {
    width, height, stride: tilemap.width, rows, colors, rowValues, cellCols, cellRows, entryRefs, tileRefs,
    rgbaByKey: new Map(),
  };
}

function indexLayerCurrent(layer: IndexLayer, tileset: TilesetLike, tilemap: TilemapLike): boolean {
  if (layer.stride !== tilemap.width) return false;
  for (let cellY = 0, cell = 0; cellY < layer.cellRows; cellY += 1) {
    for (let cellX = 0; cellX < layer.cellCols; cellX += 1, cell += 1) {
      const entry = tilemap.entries[cellY * tilemap.width + cellX];
      if (entry !== layer.entryRefs[cell]) return false;
      if ((entry ? tileset.tiles[entry.tile] : undefined) !== layer.tileRefs[cell]) return false;
    }
  }
  return true;
}

/**
 * The compiled index layer of a `width` x `height` raster of (tileset, tilemap), or null when the caller should
 * run its own raster this time (first sighting, or a layer the compiler declines).
 */
function indexLayerFor(tileset: TilesetLike, tilemap: TilemapLike, width: number, height: number): IndexLayer | null {
  let byTilemap = layers.get(tileset);
  if (!byTilemap) layers.set(tileset, byTilemap = new WeakMap());
  let bySize = byTilemap.get(tilemap);
  if (!bySize) byTilemap.set(tilemap, bySize = new Map());
  const size = `${width}x${height}`;
  const cached = bySize.get(size);
  if (cached === undefined) {
    bySize.set(size, SEEN_ONCE);
    return null;
  }
  if (cached !== SEEN_ONCE && indexLayerCurrent(cached, tileset, tilemap)) return cached;
  const layer = compileIndexLayer(tileset, tilemap, width, height);
  bySize.set(size, layer);
  return layer;
}

/** Palette rows per layer row slot; `fallbackRow0` mirrors bg.ts's `subpalettes[row] ?? subpalettes[0]`. */
function resolveRows(layer: IndexLayer, subpalettes: Subpalettes, fallbackRow0: boolean): ((readonly (RgbColor | undefined)[]) | undefined)[] {
  return layer.rowValues.map((value) => fallbackRow0 ? subpalettes[value] ?? subpalettes[0] : subpalettes[value]);
}

function compileRgba(layer: IndexLayer, resolved: ((readonly (RgbColor | undefined)[]) | undefined)[]): CompiledRgba {
  const { width, height, rows, colors } = layer;
  const rgba = new Uint8Array(width * height * 4);
  const runs: Int32Array[] = [];
  for (let y = 0; y < height; y += 1) {
    const rowRuns: number[] = [];
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const p = y * width + x;
      const colorIndex = x < width ? colors[p]! : -1;
      const color = colorIndex < 0 ? undefined : resolved[rows[p]!]?.[colorIndex];
      if (color) {
        rgba[p * 4] = color.r;
        rgba[p * 4 + 1] = color.g;
        rgba[p * 4 + 2] = color.b;
        rgba[p * 4 + 3] = 255;
        if (start < 0) start = x;
      } else if (start >= 0) {
        rowRuns.push(start, x);
        start = -1;
      }
    }
    runs.push(Int32Array.from(rowRuns));
  }
  return { rgba, runs };
}

function blitRgba(fb: Uint8Array, layer: IndexLayer, compiled: CompiledRgba, scrollX: number, scrollY: number): void {
  const { width, height } = layer;
  const { rgba, runs } = compiled;
  for (let screenY = 0; screenY < 160; screenY += 1) {
    const y = ((screenY + scrollY) % height + height) % height;
    const rowRuns = runs[y]!;
    if (rowRuns.length === 0) continue;
    // The screen row reads layer columns [scrollX, scrollX + 240) with wrap: walk it as contiguous segments.
    let screenX = 0;
    while (screenX < 240) {
      const segStart = ((screenX + scrollX) % width + width) % width;
      const segEnd = Math.min(width, segStart + (240 - screenX));
      const shift = screenX - segStart;
      for (let index = 0; index < rowRuns.length; index += 2) {
        const start = Math.max(rowRuns[index]!, segStart);
        const end = Math.min(rowRuns[index + 1]!, segEnd);
        if (start >= end) continue;
        const from = (y * width + start) * 4;
        const to = (screenY * 240 + start + shift) * 4;
        const length = (end - start) * 4;
        if (length >= 64) {
          fb.set(rgba.subarray(from, from + length), to);
        } else {
          for (let o = 0; o < length; o += 1) fb[to + o] = rgba[from + o]!;
        }
      }
      screenX += segEnd - segStart;
    }
  }
}

function blitIndexed(
  fb: Uint8Array,
  layer: IndexLayer,
  resolved: ((readonly (RgbColor | undefined)[]) | undefined)[],
  scrollX: number,
  scrollY: number,
): void {
  const { width, height, rows, colors } = layer;
  for (let screenY = 0; screenY < 160; screenY += 1) {
    const y = ((screenY + scrollY) % height + height) % height;
    const base = y * width;
    let x = ((scrollX % width) + width) % width;
    for (let screenX = 0; screenX < 240; screenX += 1) {
      const p = base + x;
      x += 1;
      if (x === width) x = 0;
      const colorIndex = colors[p]!;
      if (colorIndex < 0) continue;
      const color = resolved[rows[p]!]?.[colorIndex];
      if (!color) continue;
      const o = (screenY * 240 + screenX) * 4;
      fb[o] = color.r;
      fb[o + 1] = color.g;
      fb[o + 2] = color.b;
      fb[o + 3] = 255;
    }
  }
}

/**
 * Draw the `width` x `height` raster of (tileset, tilemap, subpalettes) onto the 240x160 framebuffer at integer
 * (scrollX, scrollY) with wrap, exactly as the caller's raster would. Returns false (nothing drawn) when the caller
 * must run its own raster instead. `fallbackRow0` selects bg.ts's missing-row rule; a row that resolves to nothing
 * under it makes that raster throw, so it is declined back to the raster too.
 */
export function drawCompiledTileBg(
  fb: Uint8Array,
  tileset: TilesetLike,
  tilemap: TilemapLike,
  subpalettes: Subpalettes,
  options: Readonly<{ width: number; height: number; scrollX: number; scrollY: number; fallbackRow0: boolean }>,
): boolean {
  const { width, height, scrollX, scrollY, fallbackRow0 } = options;
  if (!(width > 0) || !(height > 0) || !Number.isInteger(width) || !Number.isInteger(height)) return false;
  if (!Number.isInteger(scrollX) || !Number.isInteger(scrollY)) return false;
  if (fb.length !== 240 * 160 * 4) return false;
  const layer = indexLayerFor(tileset, tilemap, width, height);
  if (layer === null) return false;
  const resolved = resolveRows(layer, subpalettes, fallbackRow0);
  if (fallbackRow0 && resolved.some((row) => row === undefined || row === null)) return false;
  const key = tileBgPaletteKey(subpalettes);
  const cached = layer.rgbaByKey.get(key);
  if (cached === undefined || typeof cached === "number") {
    const seen = cached ?? 0;
    if (seen < RGBA_AFTER) {
      // A palette not seen often yet (a fade step): draw through the index layer and count it.
      layer.rgbaByKey.delete(key);
      layer.rgbaByKey.set(key, seen + 1);
      if (layer.rgbaByKey.size > RGBA_LIMIT) layer.rgbaByKey.delete(layer.rgbaByKey.keys().next().value!);
      blitIndexed(fb, layer, resolved, scrollX, scrollY);
      return true;
    }
  }
  const compiled = typeof cached === "object" ? cached : compileRgba(layer, resolved);
  // Most recently drawn last, so a steady palette outlives a stream of one-off fade steps.
  layer.rgbaByKey.delete(key);
  layer.rgbaByKey.set(key, compiled);
  blitRgba(fb, layer, compiled, scrollX, scrollY);
  return true;
}
