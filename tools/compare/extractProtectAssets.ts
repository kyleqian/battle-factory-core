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
  : join(root, "src/animation/assets/protect.json");
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
    carrier: "challenge-0 set 119 FRONTIER_MON_HOUNDOUR; SPECIES_HOUNDOUR 228",
    houndour: "graphics/pokemon/houndour/{back,anim_front}.png + normal.pal",
    protect: "graphics/battle_anims/sprites/protect.png; ANIM_TAG_PROTECT",
  },
  houndourBack: sprite("graphics/pokemon/houndour/back.png", "graphics/pokemon/houndour/normal.pal"),
  houndourFront: sprite("graphics/pokemon/houndour/anim_front.png", "graphics/pokemon/houndour/normal.pal"),
  protect: sprite("graphics/battle_anims/sprites/protect.png"),
  templates: { protect: { oam: "gOamData_AffineOff_ObjBlend_64x64", callback: "AnimProtect", subpriority: 2 } },
})}\n`);
console.log(`wrote ${out}`);
