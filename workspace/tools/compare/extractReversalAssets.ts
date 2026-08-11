// Reproducible source extraction for MOVE_REVERSAL's legal set-326 VIGOROTH
// carrier and its BLUE_ORB/HANDS_AND_FEET/IMPACT sheets.
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
  : join(root, "src/animation/assets/reversal.json");

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
    vigorothBack:
      "graphics/pokemon/vigoroth/back.png; FRONTIER_MON_VIGOROTH_2 set 326; SPECIES_VIGOROTH 365",
    vigorothFront:
      "graphics/pokemon/vigoroth/anim_front.png frame 0; FRONTIER_MON_VIGOROTH_2 set 326; SPECIES_VIGOROTH 365",
    blueOrb:
      "graphics/battle_anims/sprites/gray_orb.png + blue_orb.pal; ANIM_TAG_BLUE_ORB; gReversalOrbSpriteTemplate",
    fist:
      "graphics/battle_anims/sprites/hands_and_feet.png; byte-identical Dynamic Punch source",
    hitsplat:
      "graphics/battle_anims/sprites/impact.png; byte-identical Dynamic Punch source",
  },
  vigorothBack: sprite(
    "graphics/pokemon/vigoroth/back.png",
    "graphics/pokemon/vigoroth/normal.pal",
  ),
  vigorothFront: sprite(
    "graphics/pokemon/vigoroth/anim_front.png",
    "graphics/pokemon/vigoroth/normal.pal",
  ),
  blueOrb: sprite(
    "graphics/battle_anims/sprites/gray_orb.png",
    "graphics/battle_anims/sprites/blue_orb.pal",
  ),
  fist: sprite("graphics/battle_anims/sprites/hands_and_feet.png"),
  hitsplat: sprite("graphics/battle_anims/sprites/impact.png"),
})}\n`);
console.log(`wrote ${out}`);
