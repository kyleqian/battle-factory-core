/**
 * spd1 (frame catcher 2026-11-20, docs/fcp1-frame-catcher-pictures.md): SPINDA's personality spots on its front picture.
 *
 * The ROM decompresses every front picture through LoadSpecialPokePic (decompress.c:112 / :343 / :404), which calls
 * DrawSpindaSpots(species, personality, dest, isFrontPic) (pokemon.c:5808-5812): for SPINDA's front picture only, each of the four
 * gSpindaSpotGraphics spots (pokemon.c:1355-1361) is drawn at its (x, y) moved by one personality nibble pair - x by (byte & 0x0F) - 8,
 * y by ((byte & 0xF0) >> 4) - 8, one byte per spot, low byte first - and every covered pixel of colour 1..3 becomes colour 5..7
 * (DRAW_SPINDA_SPOTS / TRY_DRAW_SPOT_PIXEL, pokemon.c:5744-5796; FIRST_SPOT_COLOR 1, LAST_SPOT_COLOR 3, SPOT_COLOR_ADJUSTMENT 4).
 * The back picture never gets spots (isFrontPic FALSE).
 *
 * Each spot row is the 16-bit word the C shifts right one bit per column, so bit k is column x + k (the 1bpp words of
 * graphics/pokemon/spinda/spots/spot_N.png, "-plain -data_width 2"). Measured on the ROM: an opponent SPINDA of personality
 * 1313747607 (Kyle's battle 4), 0, 0xFFFFFFFF and 0x12345678 drawn with these rows matches the ROM's sprite pixel for pixel
 * (tests/spd1SpindaSpots.test.ts). Pure: the same rule as battleScene.ts's Dizzy Punch port (spindaFrontTilesetAtPersonality), which
 * re-applying leaves unchanged (a spotted pixel is 5..7, outside 1..3).
 */

export type SpindaTileset = Readonly<{ columns: number; rows: number; tiles: readonly (readonly number[])[] }>;

export const SPECIES_SPINDA_SYMBOL = "SPINDA";

const SPINDA_SPOTS: readonly Readonly<{ x: number; y: number; rows: readonly number[] }>[] = [
  { x: 16, y: 7, rows: [0x0070, 0x01fc, 0x03fe, 0x07fe, 0x07ff, 0x0fff, 0x0fff, 0x0fff, 0x07fe, 0x07fe, 0x03fc, 0x01e0, 0, 0, 0, 0] },
  { x: 40, y: 8, rows: [0x01e0, 0x03f8, 0x07fc, 0x0ffe, 0x0ffe, 0x1fff, 0x1fff, 0x1fff, 0x0ffe, 0x0ffe, 0x07fc, 0x07f8, 0x00e0, 0, 0, 0] },
  { x: 22, y: 25, rows: [0x001c, 0x003e, 0x007f, 0x007f, 0x007f, 0x007f, 0x007f, 0x003e, 0x001c, 0, 0, 0, 0, 0, 0, 0] },
  { x: 34, y: 26, rows: [0x003c, 0x007e, 0x00ff, 0x00ff, 0x00ff, 0x00ff, 0x00ff, 0x007e, 0x003c, 0, 0, 0, 0, 0, 0, 0] },
];

const FIRST_SPOT_COLOR = 1;
const LAST_SPOT_COLOR = 3;
const SPOT_COLOR_ADJUSTMENT = 4;
const FRAME_SIZE = 64;

/** The front picture's first 64x64 frame (8x8 tiles, row-major) with SPINDA's spots for `personality`; the rest of the sheet as is. */
export function spindaSpottedTileset<T extends SpindaTileset>(tileset: T, personality: number): T {
  const tiles = tileset.tiles.map((tile) => tile.slice());
  let bytes = personality >>> 0;
  for (const spot of SPINDA_SPOTS) {
    const originX = spot.x + ((bytes & 0x0f) - 8);
    const originY = spot.y + (((bytes >>> 4) & 0x0f) - 8);
    for (let row = 0; row < 16; row += 1) {
      const y = originY + row;
      let bits = spot.rows[row]!;
      for (let column = 0; column < 16 && bits !== 0; column += 1, bits >>>= 1) {
        if ((bits & 1) === 0) continue;
        const x = originX + column;
        if (x < 0 || x >= FRAME_SIZE || y < 0 || y >= FRAME_SIZE) continue;
        const tile = tiles[(y >> 3) * tileset.columns + (x >> 3)];
        if (tile === undefined) continue;
        const pixel = (y & 7) * 8 + (x & 7);
        const color = tile[pixel]!;
        if (color >= FIRST_SPOT_COLOR && color <= LAST_SPOT_COLOR) tile[pixel] = color + SPOT_COLOR_ADJUSTMENT;
      }
    }
    bytes >>>= 8;
  }
  return { ...tileset, tiles };
}
