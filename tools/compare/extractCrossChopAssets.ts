// Reproducible source extraction for the legal Factory Machoke Cross Chop carrier.
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
  : join(root, "src/animation/assets/cross-chop.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const tiles = sliceTiles(image);
  return {
    tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    machokeBack: "graphics/pokemon/machoke/back.png; FRONTIER_MON_MACHOKE_2 set 283; SPECIES_MACHOKE 67",
    machokeFront: "graphics/pokemon/machoke/anim_front.png frame 0; FRONTIER_MON_MACHOKE_2 set 283; SPECIES_MACHOKE 67",
    handsAndFeet: "graphics/battle_anims/sprites/hands_and_feet.png; ANIM_TAG_HANDS_AND_FEET; gCrossChopHandSpriteTemplate animation 3",
    crossImpact: "graphics/battle_anims/sprites/cross_impact.png; ANIM_TAG_CROSS_IMPACT; gCrossImpactSpriteTemplate",
  },
  machokeBack: sprite("graphics/pokemon/machoke/back.png", "graphics/pokemon/machoke/normal.pal"),
  machokeFront: sprite("graphics/pokemon/machoke/anim_front.png", "graphics/pokemon/machoke/normal.pal"),
  handsAndFeet: sprite("graphics/battle_anims/sprites/hands_and_feet.png"),
  crossImpact: sprite("graphics/battle_anims/sprites/cross_impact.png"),
})}\n`);
console.log(`wrote ${out}`);
