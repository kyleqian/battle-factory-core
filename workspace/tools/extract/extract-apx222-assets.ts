// Source-only sprite sheets for the apx222 approximate bodies (Pay Day coin, Conversion 2, Barrage red ball, False Swipe slash_2 palette,
// Curse ghostly spirit). Tiles are in the PNG's raster order, the 1D OBJ order a frame's tile offset indexes.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const sprites = join(root, "reference", "pokeemerald", "graphics", "battle_anims", "sprites");
const out = join(root, "src", "assets", "gen", "battle-anim-apx222.json");

function sheet(name: string, palette?: { r: number; g: number; b: number }[]) {
  const image = decodeIndexedPng(join(sprites, `${name}.png`));
  const sliced = sliceTiles(image);
  return {
    tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: palette ?? image.palette,
  };
}

/** The same sheet with every 4x2-tile frame mirrored (OAM HFLIP; the tiles keep the 1D frame order of the unflipped sheet). */
function flippedFrames(source: ReturnType<typeof sheet>, frameColumns: number, frameRows: number) {
  const mirror = (tile: number[]) => tile.map((_, i) => tile[(i >> 3 << 3) + 7 - (i & 7)]!);
  const tiles = source.tileset.tiles.slice();
  const framesPerRow = source.tileset.columns / frameColumns;
  for (let frame = 0; frame < framesPerRow * (source.tileset.rows / frameRows); frame += 1) {
    const originX = (frame % framesPerRow) * frameColumns;
    const originY = Math.floor(frame / framesPerRow) * frameRows;
    for (let y = 0; y < frameRows; y += 1) {
      for (let x = 0; x < frameColumns; x += 1) {
        tiles[(originY + y) * source.tileset.columns + originX + x] = mirror(source.tileset.tiles[(originY + y) * source.tileset.columns + originX + frameColumns - 1 - x]!);
      }
    }
  }
  return { tileset: { ...source.tileset, tiles }, palette: source.palette };
}

function jascPalette(name: string) {
  const lines = readFileSync(join(sprites, `${name}.pal`), "utf8").trim().split(/\r?\n/);
  return lines.slice(3, 3 + Number(lines[2])).map((line) => {
    const [r, g, b] = line.trim().split(/\s+/).map(Number);
    return { r: r!, g: g!, b: b! };
  });
}

const nailSheet = sheet("nail");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "ANIM_TAG_COIN, ANIM_TAG_CONVERSION, ANIM_TAG_RED_BALL, ANIM_TAG_SLASH_2 (slash.png tiles, slash_2.pal), ANIM_TAG_GHOSTLY_SPIRIT, ANIM_TAG_NAIL (and its HFLIP copy)",
  coin: sheet("coin"),
  conversion: sheet("conversion"),
  redBall: sheet("red_ball"),
  slash2: sheet("slash", jascPalette("slash_2")),
  ghostlySpirit: sheet("ghostly_spirit"),
  nail: nailSheet,
  nailFlip: flippedFrames(nailSheet, 4, 2),
})}\n`);
console.log(`wrote ${out}`);
