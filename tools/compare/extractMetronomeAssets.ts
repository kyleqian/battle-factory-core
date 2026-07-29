// Reproducible source extraction for legal Level-50 Factory set-227 Chansey,
// set-183 Togetic, plus ANIM_TAG_FINGER and ANIM_TAG_THOUGHT_BUBBLE.
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
  : join(root, "src/animation/assets/metronome.json");

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
    chanseyBack:
      "graphics/pokemon/chansey/back.png; FRONTIER_MON_CHANSEY_1 set 227; SPECIES_CHANSEY 113",
    chanseyFront:
      "graphics/pokemon/chansey/anim_front.png frame 0; FRONTIER_MON_CHANSEY_1 set 227; SPECIES_CHANSEY 113",
    togeticBack:
      "graphics/pokemon/togetic/back.png; FRONTIER_MON_TOGETIC_1 set 183; SPECIES_TOGETIC 176",
    togeticFront:
      "graphics/pokemon/togetic/anim_front.png frame 0; FRONTIER_MON_TOGETIC_1 set 183; SPECIES_TOGETIC 176",
    finger:
      "graphics/battle_anims/sprites/finger.png; ANIM_TAG_FINGER; gMetronomeFingerSpriteTemplate",
    thoughtBubble:
      "graphics/battle_anims/sprites/thought_bubble.png; ANIM_TAG_THOUGHT_BUBBLE; gThoughtBubbleSpriteTemplate",
  },
  chanseyBack: sprite(
    "graphics/pokemon/chansey/back.png",
    "graphics/pokemon/chansey/normal.pal",
  ),
  chanseyFront: sprite(
    "graphics/pokemon/chansey/anim_front.png",
    "graphics/pokemon/chansey/normal.pal",
  ),
  togeticBack: sprite(
    "graphics/pokemon/togetic/back.png",
    "graphics/pokemon/togetic/normal.pal",
  ),
  togeticFront: sprite(
    "graphics/pokemon/togetic/anim_front.png",
    "graphics/pokemon/togetic/normal.pal",
  ),
  finger: sprite("graphics/battle_anims/sprites/finger.png"),
  thoughtBubble: sprite("graphics/battle_anims/sprites/thought_bubble.png"),
})}\n`);
console.log(`wrote ${out}`);
