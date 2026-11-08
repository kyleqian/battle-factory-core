export type MonPicGeometry = Readonly<{
  columns: number;
  rows: number;
  /** First pixel row (0-based, tileset space) holding a non-zero pixel; null when the sheet is fully transparent. */
  topRow: number | null;
}>;

type TilesetLike = Readonly<{ columns: number; rows: number; tiles: readonly (readonly number[])[] }>;

/** Pure geometry of a 4bpp tile sheet; the generated battle-pic-geometry.json is this function applied to every battle pic sheet. */
export function monPicGeometry(tileset: TilesetLike): MonPicGeometry {
  const { columns, rows, tiles } = tileset;
  for (let y = 0; y < rows * 8; y++) {
    for (let x = 0; x < columns * 8; x++) {
      if (tiles[(y >> 3) * columns + (x >> 3)]![(y & 7) * 8 + (x & 7)] !== 0) return { columns, rows, topRow: y };
    }
  }
  return { columns, rows, topRow: null };
}
