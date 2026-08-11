// Reproducible source extraction for MOVE_DYNAMIC_PUNCH's real Level-50
// Factory set-339 HITMONCHAN carrier and its fist/impact sprite sheets.
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
  : join(root, "src/animation/assets/dynamicPunch.json");

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
    hitmonchanBack:
      "graphics/pokemon/hitmonchan/back.png; FRONTIER_MON_HITMONCHAN_2 set 339; SPECIES_HITMONCHAN 107",
    hitmonchanFront:
      "graphics/pokemon/hitmonchan/anim_front.png frame 0; FRONTIER_MON_HITMONCHAN_2 set 339; SPECIES_HITMONCHAN 107",
    fist:
      "graphics/battle_anims/sprites/hands_and_feet.png; ANIM_TAG_HANDS_AND_FEET; gFistFootSpriteTemplate anim 0",
    hitsplat:
      "graphics/battle_anims/sprites/impact.png; ANIM_TAG_IMPACT; gBasicHitSplatSpriteTemplate anim 0",
  },
  hitmonchanBack: sprite(
    "graphics/pokemon/hitmonchan/back.png",
    "graphics/pokemon/hitmonchan/normal.pal",
  ),
  hitmonchanFront: sprite(
    "graphics/pokemon/hitmonchan/anim_front.png",
    "graphics/pokemon/hitmonchan/normal.pal",
  ),
  fist: sprite("graphics/battle_anims/sprites/hands_and_feet.png"),
  hitsplat: sprite("graphics/battle_anims/sprites/impact.png"),
})}\n`);
console.log(`wrote ${out}`);
