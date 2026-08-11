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
    carrier: "battle_frontier_mons.h index 3 FRONTIER_MON_WEEDLE, the lowest Level-50 Factory POISON_STING carrier",
    script: "data/battle_anim_scripts.s Move_POISON_STING",
    reused: "NEEDLE from twineedle.json; IMPACT from battle-anim-hitsplat.json; POISON_BUBBLE from poisonFang.json, each by identical tag/template source identity",
  },
  weedleBack: sprite("graphics/pokemon/weedle/back.png", "graphics/pokemon/weedle/normal.pal"),
  weedleFront: sprite("graphics/pokemon/weedle/anim_front.png", "graphics/pokemon/weedle/normal.pal"),
})}\n`);
console.log(`wrote ${out}`);
