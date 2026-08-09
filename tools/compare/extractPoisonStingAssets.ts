import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/poisonSting.json");
function sprite(path: string, palettePath: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: loadJascPal(join(ref, palettePath)) };
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier: "battle_frontier_mons.h index 4 FRONTIER_MON_WURMPLE exact checkpoint; WEEDLE index 3 remains the lower-carrier acceptance gap",
    script: "data/battle_anim_scripts.s Move_POISON_STING",
    reused: "NEEDLE from twineedle.json; IMPACT from battle-anim-hitsplat.json; POISON_BUBBLE from poisonFang.json, each by identical tag/template source identity",
  },
  wurmpleBack: sprite("graphics/pokemon/wurmple/back.png", "graphics/pokemon/wurmple/normal.pal"),
  wurmpleFront: sprite("graphics/pokemon/wurmple/anim_front.png", "graphics/pokemon/wurmple/normal.pal"),
})}\n`);
console.log(`wrote ${out}`);
