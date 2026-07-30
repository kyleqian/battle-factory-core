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
  : join(root, "src/animation/assets/mirror-coat.json");

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
      "challenge-0 set 151 FRONTIER_MON_CORSOLA; SPECIES_CORSOLA 222",
    corsola:
      "graphics/pokemon/corsola/{back,anim_front}.png + normal.pal",
    redLightWall:
      "green_light_wall.png tiles + red_light_wall.pal; "
      + "ANIM_TAG_RED_LIGHT_WALL",
    sharedSparkle:
      "src/animation/assets/light-screen.json sparkle3; source-identical "
      + "ANIM_TAG_SPARKLE_3/gSpecialScreenSparkleSpriteTemplate",
  },
  corsolaBack: sprite(
    "graphics/pokemon/corsola/back.png",
    "graphics/pokemon/corsola/normal.pal",
  ),
  corsolaFront: sprite(
    "graphics/pokemon/corsola/anim_front.png",
    "graphics/pokemon/corsola/normal.pal",
  ),
  redLightWall: sprite(
    "graphics/battle_anims/sprites/green_light_wall.png",
    "graphics/battle_anims/sprites/red_light_wall.pal",
  ),
  templates: {
    mirrorCoatWall: {
      oam: "gOamData_AffineOff_ObjBlend_64x64",
      callback: "AnimDefensiveWall",
      subpriority: 1,
    },
  },
})}\n`);
console.log(`wrote ${out}`);
