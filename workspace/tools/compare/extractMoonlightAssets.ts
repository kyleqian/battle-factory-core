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
  : join(root, "src/animation/assets/moonlight.json");

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
    carrier:
      "challenge-0 set 167 FRONTIER_MON_GLOOM_1; SPECIES_GLOOM 44; MOVE_MOONLIGHT 236",
    gloomBack:
      "graphics/pokemon/gloom/back.png + graphics/pokemon/gloom/normal.pal",
    gloomFront:
      "graphics/pokemon/gloom/anim_front.png frame 0 + graphics/pokemon/gloom/normal.pal",
    moon:
      "graphics/battle_anims/sprites/moon.png; ANIM_TAG_MOON; gMoonSpriteTemplate",
    greenSparkle:
      "graphics/battle_anims/sprites/green_sparkle.png; ANIM_TAG_GREEN_SPARKLE; gMoonlightSparkleSpriteTemplate",
    blueStar:
      "graphics/battle_anims/sprites/blue_star.png; ANIM_TAG_BLUE_STAR; HealingEffect",
  },
  gloomBack: sprite(
    "graphics/pokemon/gloom/back.png",
    "graphics/pokemon/gloom/normal.pal",
  ),
  gloomFront: sprite(
    "graphics/pokemon/gloom/anim_front.png",
    "graphics/pokemon/gloom/normal.pal",
  ),
  moon: sprite("graphics/battle_anims/sprites/moon.png"),
  greenSparkle: sprite("graphics/battle_anims/sprites/green_sparkle.png"),
  blueStar: sprite("graphics/battle_anims/sprites/blue_star.png"),
})}\n`);
console.log(`wrote ${out}`);
