/** Deterministic extraction for Zap Cannon's two source sprite sheets. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/zap-cannon.json");

function sprite(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) }, palette: image.palette };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "Move_ZAP_CANNON; ANIM_TAG_BLACK_BALL_2/SPARK_2",
  blackBall2: sprite("graphics/battle_anims/sprites/black_ball_2.png"),
  spark2: sprite("graphics/battle_anims/sprites/spark_2.png"),
})}\n`);
console.log(`wrote ${out}`);
