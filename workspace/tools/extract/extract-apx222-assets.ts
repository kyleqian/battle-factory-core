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

function jascPalette(name: string) {
  const lines = readFileSync(join(sprites, `${name}.pal`), "utf8").trim().split(/\r?\n/);
  return lines.slice(3, 3 + Number(lines[2])).map((line) => {
    const [r, g, b] = line.trim().split(/\s+/).map(Number);
    return { r: r!, g: g!, b: b! };
  });
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "ANIM_TAG_COIN, ANIM_TAG_CONVERSION, ANIM_TAG_RED_BALL, ANIM_TAG_SLASH_2 (slash.png tiles, slash_2.pal), ANIM_TAG_GHOSTLY_SPIRIT",
  coin: sheet("coin"),
  conversion: sheet("conversion"),
  redBall: sheet("red_ball"),
  slash2: sheet("slash", jascPalette("slash_2")),
  ghostlySpirit: sheet("ghostly_spirit"),
})}\n`);
console.log(`wrote ${out}`);
