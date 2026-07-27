// Reproducible dev-time extraction for MOVE_MILK_DRINK's source sprites.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/milk-drink.json");

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
    milkBottle: "graphics/battle_anims/sprites/milk_bottle.png; gMilkBottleSpriteTemplate; ANIM_TAG_MILK_BOTTLE",
    thinRing: "graphics/battle_anims/sprites/thin_ring.png; gThinRingExpandingSpriteTemplate; ANIM_TAG_THIN_RING",
    blueStar: "graphics/battle_anims/sprites/blue_star.png; gHealingBlueStarSpriteTemplate; ANIM_TAG_BLUE_STAR",
    miltankBack: "graphics/pokemon/miltank/back.png; gMonBackPic_Miltank",
    miltankFront: "graphics/pokemon/miltank/anim_front.png; gMonFrontPic_Miltank frame program 1x30,0x30",
  },
  milkBottle: sprite("graphics/battle_anims/sprites/milk_bottle.png"),
  thinRing: sprite("graphics/battle_anims/sprites/thin_ring.png"),
  blueStar: sprite("graphics/battle_anims/sprites/blue_star.png"),
  miltankBack: sprite(
    "graphics/pokemon/miltank/back.png",
    "graphics/pokemon/miltank/normal.pal",
  ),
  miltankFront: sprite(
    "graphics/pokemon/miltank/anim_front.png",
    "graphics/pokemon/miltank/normal.pal",
  ),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(data)}\n`);
console.log(`wrote ${out}`);
