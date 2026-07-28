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
  : join(root, "src/animation/assets/dizzyPunch.json");

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
    spindaBack:
      "graphics/pokemon/spinda/back.png; FRONTIER_MON_SPINDA set 145; SPECIES_SPINDA 308",
    spindaFront:
      "graphics/pokemon/spinda/anim_front.png frame 0; FRONTIER_MON_SPINDA set 145; SPECIES_SPINDA 308",
    duck:
      "graphics/battle_anims/sprites/duck.png; ANIM_TAG_DUCK; gDizzyPunchDuckSpriteTemplate",
    fist:
      "graphics/battle_anims/sprites/hands_and_feet.png; ANIM_TAG_HANDS_AND_FEET; gFistFootSpriteTemplate anim 0",
    hitsplat:
      "graphics/battle_anims/sprites/impact.png; ANIM_TAG_IMPACT; gBasicHitSplatSpriteTemplate anim 1",
  },
  spindaBack: sprite(
    "graphics/pokemon/spinda/back.png",
    "graphics/pokemon/spinda/normal.pal",
  ),
  spindaFront: sprite(
    "graphics/pokemon/spinda/anim_front.png",
    "graphics/pokemon/spinda/normal.pal",
  ),
  duck: sprite("graphics/battle_anims/sprites/duck.png"),
  fist: sprite("graphics/battle_anims/sprites/hands_and_feet.png"),
  hitsplat: sprite("graphics/battle_anims/sprites/impact.png"),
})}\n`);
console.log(`wrote ${out}`);
