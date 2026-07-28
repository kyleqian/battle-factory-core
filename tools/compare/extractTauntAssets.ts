// Reproducible source extraction for MOVE_TAUNT's real Level-50 Factory
// set-184 MURKROW carrier and its two move-exclusive loaded sprite tags.
// ANIM_TAG_ANGER is intentionally not duplicated: TAUNT uses the literal
// gAngerMarkSpriteTemplate already extracted for SWAGGER.
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
  : join(root, "src/animation/assets/taunt.json");

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
    murkrowBack:
      "graphics/pokemon/murkrow/back.png; FRONTIER_MON_MURKROW_1 set 184; SPECIES_MURKROW 198",
    murkrowFront:
      "graphics/pokemon/murkrow/anim_front.png frame 0; FRONTIER_MON_MURKROW_1 set 184; SPECIES_MURKROW 198",
    thoughtBubble:
      "graphics/battle_anims/sprites/thought_bubble.png; ANIM_TAG_THOUGHT_BUBBLE; gThoughtBubbleSpriteTemplate",
    finger:
      "graphics/battle_anims/sprites/finger_2.png; ANIM_TAG_FINGER_2; gTauntFingerSpriteTemplate; gBattleAnimSpritePal_Finger",
    anger:
      "reused byte-identical src/animation/assets/swagger.json anger; ANIM_TAG_ANGER; gAngerMarkSpriteTemplate",
  },
  murkrowBack: sprite(
    "graphics/pokemon/murkrow/back.png",
    "graphics/pokemon/murkrow/normal.pal",
  ),
  murkrowFront: sprite(
    "graphics/pokemon/murkrow/anim_front.png",
    "graphics/pokemon/murkrow/normal.pal",
  ),
  thoughtBubble: sprite("graphics/battle_anims/sprites/thought_bubble.png"),
  finger: sprite("graphics/battle_anims/sprites/finger_2.png"),
})}\n`);
console.log(`wrote ${out}`);
