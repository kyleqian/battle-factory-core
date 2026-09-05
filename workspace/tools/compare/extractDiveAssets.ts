// Reproducible dev-time extraction for MOVE_DIVE's five source tags.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const spriteRoot = join(root, "reference/pokeemerald/graphics/battle_anims/sprites");
const out = join(root, "src/animation/assets/dive.json");

function sprite(name: string, paletteName = name) {
  const image = decodeIndexedPng(join(spriteRoot, `${name}.png`));
  const palette = decodeIndexedPng(join(spriteRoot, `${paletteName}.png`)).palette;
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    roundShadow: "graphics/battle_anims/sprites/round_shadow.png; ANIM_TAG_ROUND_SHADOW",
    splash: "graphics/battle_anims/sprites/splash.png; ANIM_TAG_SPLASH",
    sweatBead: "graphics/battle_anims/sprites/sweat_bead.png; ANIM_TAG_SWEAT_BEAD; shared SPLASH palette",
    waterImpact: "graphics/battle_anims/sprites/water_impact.png; ANIM_TAG_WATER_IMPACT",
    smallBubbles: "graphics/battle_anims/sprites/small_bubbles.png; ANIM_TAG_SMALL_BUBBLES",
  },
  roundShadow: sprite("round_shadow"),
  splash: sprite("splash"),
  sweatBead: sprite("sweat_bead", "splash"),
  waterImpact: sprite("water_impact"),
  smallBubbles: sprite("small_bubbles"),
})}\n`);
console.log(`wrote ${out}`);
