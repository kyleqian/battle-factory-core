import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/synthesis.json");

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
    sparkle2: "graphics/battle_anims/sprites/sparkle_1.png + sparkle_2.pal; ANIM_TAG_SPARKLE_2",
    blueStar: "graphics/battle_anims/sprites/blue_star.png; shared HealingEffect",
    skiploomBack: "graphics/pokemon/skiploom/back.png; Factory set-129 carrier",
    skiploomFront: "graphics/pokemon/skiploom/anim_front.png; Factory set-129 carrier frame 0",
  },
  sparkle2: sprite(
    "graphics/battle_anims/sprites/sparkle_1.png",
    "graphics/battle_anims/sprites/sparkle_2.pal",
  ),
  blueStar: sprite("graphics/battle_anims/sprites/blue_star.png"),
  skiploomBack: sprite(
    "graphics/pokemon/skiploom/back.png",
    "graphics/pokemon/skiploom/normal.pal",
  ),
  skiploomFront: sprite(
    "graphics/pokemon/skiploom/anim_front.png",
    "graphics/pokemon/skiploom/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
