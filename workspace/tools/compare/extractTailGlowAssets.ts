// Reproducible source extraction for ANIM_TAG_CIRCLE_OF_LIGHT.
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
  : join(root, "src/animation/assets/tail-glow.json");

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
      "FRONTIER_MON_VOLBEAT_2 set 277; SPECIES_VOLBEAT; MOVE_TAIL_GLOW",
    circle:
      "graphics/battle_anims/sprites/circle_of_light.png; ANIM_TAG_CIRCLE_OF_LIGHT; gTailGlowOrbSpriteTemplate",
    volbeatBack:
      "graphics/pokemon/volbeat/back.png + normal.pal; FRONTIER_MON_VOLBEAT_2 set 277",
    volbeatFront:
      "graphics/pokemon/volbeat/anim_front.png frame 0 + normal.pal; FRONTIER_MON_VOLBEAT_2 set 277",
    reused:
      "SHUCKLE, battle background, window, text, and healthboxes from existing source-extracted battle assets",
    siblings: {
      MOVE_SUPERPOWER:
        "distinct METEOR/FLAT_ROCK, Superpower orb/rocks/fireball, BG shake, ShakeMon2, and four sounds",
      MOVE_SHOCK_WAVE:
        "distinct ELECTRIC_ORBS/SPARK/LIGHTNING, charging/progressing/lightning tasks, ShakeMon, and palette tasks",
    },
  },
  circleOfLight: sprite("graphics/battle_anims/sprites/circle_of_light.png"),
  volbeatBack: sprite(
    "graphics/pokemon/volbeat/back.png",
    "graphics/pokemon/volbeat/normal.pal",
  ),
  volbeatFront: sprite(
    "graphics/pokemon/volbeat/anim_front.png",
    "graphics/pokemon/volbeat/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
