import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/leech-seed.json");

const image = decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/seed.png"),
);
const seed = sliceTiles(image);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier: "FRONTIER_MON_EXEGGCUTE_1 set 112; MOVE_LEECH_SEED 73",
    seed: "graphics/battle_anims/sprites/seed.png; ANIM_TAG_SEED",
    palette: "graphics/battle_anims/sprites/seed.png embedded gbapal; ANIM_TAG_SEED",
    exeggcute:
      "shared exact light-screen.json extraction from graphics/pokemon/exeggcute",
  },
  seed: {
    tileset: {
      columns: seed.columns,
      rows: seed.rows,
      tiles: seed.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
