// Packed battle mon-pic sheets (dl2). The two sprite sheets ship as one string per species instead of tile JSON (docs/dl2-sprite-repack.md):
//   <frame pixels, 4096 hex digits each, image rows of a 64x64 picture, values 0..15><16 colours x 3 channels, one base-32 digit of 5 bits each>
// A back pic has one frame; a front pic has two (the second duplicates the first for the species with no animation). The decode reproduces
// the former `{tileset, palette, frame2?}` objects exactly (tests/dl2SpriteRepack.test.ts pins the canonical JSON by sha256).
// No JSON import and no side effect: the headless graph never reaches this module.

export type PackedMonPicSheets = Readonly<Record<string, string>>;
type Tileset = { columns: number; rows: number; tiles: number[][] };
type Rgb = { r: number; g: number; b: number };
export type UnpackedMonPicSheet = { tileset: Tileset; palette: Rgb[]; frame2?: Tileset };

const SIDE = 64;
const FRAME = SIDE * SIDE;
const TILES = SIDE / 8;
const COLOURS = 16;
const PALETTE_DIGITS = COLOURS * 3;

function decodeFrame(text: string, offset: number): Tileset {
  const tiles: number[][] = [];
  for (let ty = 0; ty < TILES; ty++) {
    for (let tx = 0; tx < TILES; tx++) {
      const tile = new Array<number>(64);
      for (let py = 0; py < 8; py++) {
        const row = (ty * 8 + py) * SIDE + tx * 8 + offset;
        for (let px = 0; px < 8; px++) tile[py * 8 + px] = parseInt(text[row + px]!, 16);
      }
      tiles.push(tile);
    }
  }
  return { columns: TILES, rows: TILES, tiles };
}

export function decodeMonPicSheet(packed: string): UnpackedMonPicSheet {
  const frames = (packed.length - PALETTE_DIGITS) / FRAME;
  if (frames !== 1 && frames !== 2) throw new Error(`packed mon pic sheet has an unexpected length ${packed.length}`);
  const palette: Rgb[] = [];
  for (let c = 0; c < COLOURS; c++) {
    const [r, g, b] = [0, 1, 2].map((channel) => {
      const v5 = parseInt(packed[frames * FRAME + c * 3 + channel]!, 32);
      return (v5 << 3) | (v5 >> 2);
    });
    palette.push({ r: r!, g: g!, b: b! });
  }
  const tileset = decodeFrame(packed, 0);
  return frames === 2 ? { tileset, palette, frame2: decodeFrame(packed, FRAME) } : { tileset, palette };
}

function encodeFrame(tileset: Tileset): string {
  if (tileset.columns !== TILES || tileset.rows !== TILES || tileset.tiles.length !== TILES * TILES) {
    throw new Error(`mon pic frame must be ${TILES}x${TILES} tiles, got ${tileset.columns}x${tileset.rows}`);
  }
  const pixels = new Array<string>(FRAME);
  tileset.tiles.forEach((tile, index) => {
    const tx = (index % TILES) * 8;
    const ty = Math.floor(index / TILES) * 8;
    if (tile.length !== 64) throw new Error("mon pic tile must have 64 pixels");
    for (let p = 0; p < 64; p++) {
      const v = tile[p]!;
      if (!Number.isInteger(v) || v < 0 || v > 15) throw new Error(`mon pic pixel ${v} is not a 4-bit value`);
      pixels[(ty + (p >> 3)) * SIDE + tx + (p & 7)] = v.toString(16);
    }
  });
  return pixels.join("");
}

export function encodeMonPicSheet(sheet: UnpackedMonPicSheet): string {
  if (sheet.palette.length !== COLOURS) throw new Error(`mon pic palette must have ${COLOURS} colours`);
  const palette = sheet.palette
    .map(({ r, g, b }) =>
      [r, g, b]
        .map((v) => {
          const v5 = v >> 3;
          if (((v5 << 3) | (v5 >> 2)) !== v) throw new Error(`mon pic palette channel ${v} is not a 5-bit expansion`);
          return v5.toString(32);
        })
        .join(""),
    )
    .join("");
  return encodeFrame(sheet.tileset) + (sheet.frame2 === undefined ? "" : encodeFrame(sheet.frame2)) + palette;
}

/** Every species decoded at once (extractors, tests, tools); same shapes and key order as the former JSON. */
export function unpackMonPicTable(packed: PackedMonPicSheets): Record<string, UnpackedMonPicSheet> {
  return Object.fromEntries(Object.entries(packed).map(([species, text]) => [species, decodeMonPicSheet(text)]));
}

/**
 * The runtime table: same keys in the same order, each species decoded on its first read and cached (the second read returns the same
 * object). `in`, key enumeration and reads behave as on the plain table; a species nobody reads is never decoded.
 */
export function lazyUnpackMonPicTable(packed: PackedMonPicSheets): Record<string, UnpackedMonPicSheet> {
  const table: Record<string, UnpackedMonPicSheet> = {};
  for (const species of Object.keys(packed)) {
    Object.defineProperty(table, species, {
      enumerable: true,
      configurable: true,
      get: () => {
        const sheet = decodeMonPicSheet(packed[species]!);
        Object.defineProperty(table, species, { value: sheet, enumerable: true, configurable: true });
        return sheet;
      },
    });
  }
  return table;
}
