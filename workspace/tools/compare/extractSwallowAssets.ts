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
  : join(root, "src/animation/assets/swallow.json");

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
    pelipperBack:
      "graphics/pokemon/pelipper/back.png; FRONTIER_MON_PELIPPER_1 set 213; SPECIES_PELIPPER 310",
    pelipperFront:
      "graphics/pokemon/pelipper/anim_front.png frame 0; FRONTIER_MON_PELIPPER_1 set 213; SPECIES_PELIPPER 310",
    blueOrb:
      "graphics/battle_anims/sprites/gray_orb.png + blue_orb.pal; source-identical to Reversal ANIM_TAG_BLUE_ORB",
    blueStar:
      "graphics/battle_anims/sprites/blue_star.png; source-identical HealingEffect ANIM_TAG_BLUE_STAR",
  },
  pelipperBack: sprite(
    "graphics/pokemon/pelipper/back.png",
    "graphics/pokemon/pelipper/normal.pal",
  ),
  pelipperFront: sprite(
    "graphics/pokemon/pelipper/anim_front.png",
    "graphics/pokemon/pelipper/normal.pal",
  ),
  blueOrb: sprite(
    "graphics/battle_anims/sprites/gray_orb.png",
    "graphics/battle_anims/sprites/blue_orb.pal",
  ),
  blueStar: sprite("graphics/battle_anims/sprites/blue_star.png"),
})}\n`);
console.log(`wrote ${out}`);
