// Reproducible source extraction for MOVE_ABSORB's legal challenge-0
// Factory set-131 LOMBRE carrier and every literal sprite tag it loads.
// ONIX is intentionally reused from the exact shared battle-mon assets.
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
  : join(root, "src/animation/assets/absorb.json");

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
    lombreBack:
      "graphics/pokemon/lombre/back.png; FRONTIER_MON_LOMBRE_1 set 131; SPECIES_LOMBRE 271",
    lombreFront:
      "graphics/pokemon/lombre/anim_front.png frame 0; FRONTIER_MON_LOMBRE_1 set 131; SPECIES_LOMBRE 271",
    target:
      "reuse exact shared ONIX back/front battle-mon assets",
    orbs:
      "graphics/battle_anims/sprites/orbs.png; ANIM_TAG_ORBS; gAbsorptionOrbSpriteTemplate",
    impact:
      "graphics/battle_anims/sprites/impact.png; ANIM_TAG_IMPACT; gBasicHitSplatSpriteTemplate anim 2",
    blueStar:
      "graphics/battle_anims/sprites/blue_star.png; ANIM_TAG_BLUE_STAR; gHealingBlueStarSpriteTemplate",
  },
  lombreBack: sprite(
    "graphics/pokemon/lombre/back.png",
    "graphics/pokemon/lombre/normal.pal",
  ),
  lombreFront: sprite(
    "graphics/pokemon/lombre/anim_front.png",
    "graphics/pokemon/lombre/normal.pal",
  ),
  orbs: sprite("graphics/battle_anims/sprites/orbs.png"),
  impact: sprite("graphics/battle_anims/sprites/impact.png"),
  blueStar: sprite("graphics/battle_anims/sprites/blue_star.png"),
})}\n`);
console.log(`wrote ${out}`);
