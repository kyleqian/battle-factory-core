// Reproducible source extraction for MOVE_SOFT_BOILED's exact presentation.
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
  : join(root, "src/animation/assets/soft-boiled.json");

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

const data = {
  source: {
    carrier: "FRONTIER_MON_CHANSEY_2 set 332; SPECIES_CHANSEY 113; MOVE_SOFT_BOILED 135",
    breakingEgg: "graphics/battle_anims/sprites/breaking_egg.png; gSoftBoiledEggSpriteTemplate; ANIM_TAG_BREAKING_EGG",
    thinRing: "graphics/battle_anims/sprites/thin_ring.png; gThinRingExpandingSpriteTemplate; ANIM_TAG_THIN_RING",
    blueStar: "graphics/battle_anims/sprites/blue_star.png; gHealingBlueStarSpriteTemplate; ANIM_TAG_BLUE_STAR",
    chanseyBack: "graphics/pokemon/chansey/back.png + normal.pal; FRONTIER_MON_CHANSEY_2",
    chanseyFront: "graphics/pokemon/chansey/anim_front.png frame 0 + normal.pal; FRONTIER_MON_CHANSEY_2",
  },
  breakingEgg: sprite("graphics/battle_anims/sprites/breaking_egg.png"),
  thinRing: sprite("graphics/battle_anims/sprites/thin_ring.png"),
  blueStar: sprite("graphics/battle_anims/sprites/blue_star.png"),
  chanseyBack: sprite(
    "graphics/pokemon/chansey/back.png",
    "graphics/pokemon/chansey/normal.pal",
  ),
  chanseyFront: sprite(
    "graphics/pokemon/chansey/anim_front.png",
    "graphics/pokemon/chansey/normal.pal",
  ),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(data)}\n`);
console.log(`wrote ${out}`);
