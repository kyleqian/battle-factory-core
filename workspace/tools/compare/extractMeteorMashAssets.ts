import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/meteorMash.json");

const backgroundPath = join(ref, "graphics/battle_anims/backgrounds/cosmic.png");
const background = decodeIndexedPng(backgroundPath);
const sliced = sliceTiles(background);
const tilemap = parseTilemap(
  readFileSync(join(ref, "graphics/battle_anims/backgrounds/cosmic.bin")),
  32,
  32,
);
const stars = decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/gold_stars.png"),
);
const starTiles = sliceTiles(stars);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    background: "graphics/battle_anims/backgrounds/cosmic.{png,bin}; BG_COSMIC",
    goldStars: "graphics/battle_anims/sprites/gold_stars.png; ANIM_TAG_GOLD_STARS",
  },
  background: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: background.palette,
    tilemap,
  },
  goldStars: {
    tileset: {
      columns: starTiles.columns,
      rows: starTiles.rows,
      tiles: starTiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: stars.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
