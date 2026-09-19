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
  : join(root, "src/animation/assets/snore.json");

const image = decodeIndexedPng(join(ref, "graphics/battle_anims/sprites/snore_z.png"));
const sliced = sliceTiles(image);
const snoreZ = {
  tileset: {
    columns: sliced.columns,
    rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]),
  },
  palette: image.palette,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "graphics/battle_anims/sprites/snore_z.png; ANIM_TAG_SNORE_Z; gSnoreZSpriteTemplate",
  snoreZ,
})}\n`);
console.log(`wrote ${out}`);
