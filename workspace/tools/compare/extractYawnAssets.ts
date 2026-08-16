import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(root, "reference/pokeemerald/graphics/battle_anims/sprites/pink_cloud.png");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/yawn.json");
const image = decodeIndexedPng(source);
const sheet = sliceTiles(image);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    cloud: "graphics/battle_anims/sprites/pink_cloud.png; ANIM_TAG_PINK_CLOUD; gYawnCloudSpriteTemplate",
    togetic: "graphics/pokemon/togetic/{back,anim_front}.png; FRONTIER_MON_TOGETIC_2 set 288; SPECIES_TOGETIC 176",
    gengar: "graphics/pokemon/gengar/{back,anim_front}.png; battle field carrier; SPECIES_GENGAR 94",
  },
  cloud: {
    tileset: { columns: sheet.columns, rows: sheet.rows,
      tiles: sheet.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
