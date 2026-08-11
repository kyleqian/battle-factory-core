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
  : join(root, "src/animation/assets/barrier.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier: "challenge-0 set 114 FRONTIER_MON_DROWZEE; SPECIES_DROWZEE 96",
    drowzee: "graphics/pokemon/drowzee/{back,anim_front}.png + normal.pal",
    grayLightWall: "green_light_wall.png tiles + gray_light_wall.pal; ANIM_TAG_GRAY_LIGHT_WALL",
  },
  drowzeeBack: sprite(
    "graphics/pokemon/drowzee/back.png",
    "graphics/pokemon/drowzee/normal.pal",
  ),
  drowzeeFront: sprite(
    "graphics/pokemon/drowzee/anim_front.png",
    "graphics/pokemon/drowzee/normal.pal",
  ),
  grayLightWall: sprite(
    "graphics/battle_anims/sprites/green_light_wall.png",
    "graphics/battle_anims/sprites/gray_light_wall.pal",
  ),
  templates: {
    barrierWall: {
      oam: "gOamData_AffineOff_ObjBlend_64x64",
      callback: "AnimDefensiveWall",
      subpriority: 3,
    },
  },
})}\n`);
console.log(`wrote ${out}`);
