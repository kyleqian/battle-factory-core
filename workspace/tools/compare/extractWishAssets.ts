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
  : join(root, "src/animation/assets/wish.json");

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
    goldStars:
      "graphics/battle_anims/sprites/gold_stars.png; ANIM_TAG_GOLD_STARS; gWishStarSpriteTemplate/gMiniTwinklingStarSpriteTemplate",
    sparkle2:
      "graphics/battle_anims/sprites/sparkle_1.png + sparkle_2.pal; ANIM_TAG_SPARKLE_2; GrantingStarsEffect",
    illumiseBack:
      "graphics/pokemon/illumise/back.png; challenge-0 set 173 FRONTIER_MON_ILLUMISE_1",
    illumiseFront:
      "graphics/pokemon/illumise/anim_front.png frame 0; challenge-0 set 173 FRONTIER_MON_ILLUMISE_1",
  },
  goldStars: sprite("graphics/battle_anims/sprites/gold_stars.png"),
  sparkle2: sprite(
    "graphics/battle_anims/sprites/sparkle_1.png",
    "graphics/battle_anims/sprites/sparkle_2.pal",
  ),
  illumiseBack: sprite(
    "graphics/pokemon/illumise/back.png",
    "graphics/pokemon/illumise/normal.pal",
  ),
  illumiseFront: sprite(
    "graphics/pokemon/illumise/anim_front.png",
    "graphics/pokemon/illumise/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
