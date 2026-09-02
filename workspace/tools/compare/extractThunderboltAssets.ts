/** Deterministic extraction for Thunderbolt's three source sprite sheets. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/thunderbolt.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
  palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "Move_THUNDERBOLT; ANIM_TAG_SPARK/SHOCK_3/SPARK_2",
  bolt: sprite("graphics/battle_anims/sprites/spark_0.png",
    "graphics/battle_anims/sprites/spark.pal"),
  boltWide: sprite("graphics/battle_anims/sprites/spark_1.png",
    "graphics/battle_anims/sprites/spark.pal"),
  orb: sprite("graphics/battle_anims/sprites/shock_3.png"),
  spark2: sprite("graphics/battle_anims/sprites/spark_2.png"),
})}\n`);
console.log(`wrote ${out}`);
