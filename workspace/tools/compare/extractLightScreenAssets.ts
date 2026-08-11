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
  : join(root, "src/animation/assets/light-screen.json");

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
    carrier:
      "challenge-0 set 112 FRONTIER_MON_EXEGGCUTE; SPECIES_EXEGGCUTE 102",
    exeggcute:
      "graphics/pokemon/exeggcute/{back,anim_front}.png + normal.pal",
    greenLightWall:
      "graphics/battle_anims/sprites/green_light_wall.png; ANIM_TAG_GREEN_LIGHT_WALL",
    sparkle3:
      "graphics/battle_anims/sprites/sparkle_3.png; ANIM_TAG_SPARKLE_3",
  },
  exeggcuteBack: sprite(
    "graphics/pokemon/exeggcute/back.png",
    "graphics/pokemon/exeggcute/normal.pal",
  ),
  exeggcuteFront: sprite(
    "graphics/pokemon/exeggcute/anim_front.png",
    "graphics/pokemon/exeggcute/normal.pal",
  ),
  greenLightWall: sprite(
    "graphics/battle_anims/sprites/green_light_wall.png",
  ),
  sparkle3: sprite("graphics/battle_anims/sprites/sparkle_3.png"),
  templates: {
    lightScreenWall: {
      oam: "gOamData_AffineOff_ObjBlend_64x64",
      callback: "AnimDefensiveWall",
      subpriority: 1,
    },
    specialScreenSparkle: {
      oam: "gOamData_AffineOff_ObjNormal_16x16",
      frames: [0, 4, 8, 12],
      frameDuration: 5,
      callback: "AnimWallSparkle",
      subpriority: 2,
    },
  },
})}\n`);
console.log(`wrote ${out}`);
