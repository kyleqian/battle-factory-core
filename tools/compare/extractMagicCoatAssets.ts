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
  : join(root, "src/animation/assets/magic-coat.json");
function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
  palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette };
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier: "challenge-0 set 121 FRONTIER_MON_SPOINK; SPECIES_SPOINK 351",
    spoink: "graphics/pokemon/spoink/{back,anim_front}.png + normal.pal",
    orangeLightWall: "green_light_wall.png tiles + orange_light_wall.pal; ANIM_TAG_ORANGE_LIGHT_WALL",
  },
  spoinkBack: sprite("graphics/pokemon/spoink/back.png", "graphics/pokemon/spoink/normal.pal"),
  spoinkFront: sprite("graphics/pokemon/spoink/anim_front.png", "graphics/pokemon/spoink/normal.pal"),
  orangeLightWall: sprite("graphics/battle_anims/sprites/green_light_wall.png", "graphics/battle_anims/sprites/orange_light_wall.pal"),
  templates: { magicCoatWall: { oam: "gOamData_AffineOff_ObjBlend_64x64", callback: "AnimDefensiveWall", subpriority: 3 } },
})}\n`);
console.log(`wrote ${out}`);
