// Reproducible source extraction for Shadow Ball and its real set-268 carrier.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/shadow-ball.json");

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
    shadowBall: "graphics/battle_anims/sprites/shadow_ball.png; ANIM_TAG_SHADOW_BALL / gShadowBallSpriteTemplate",
    sableyeBack: "graphics/pokemon/sableye/back.png; real Factory set-268 SHADOW BALL carrier",
    sableyeFront: "graphics/pokemon/sableye/anim_front.png frame 0; real Factory set-268 SHADOW BALL carrier",
  },
  shadowBall: sprite("graphics/battle_anims/sprites/shadow_ball.png"),
  sableyeBack: sprite(
    "graphics/pokemon/sableye/back.png",
    "graphics/pokemon/sableye/normal.pal",
  ),
  sableyeFront: sprite(
    "graphics/pokemon/sableye/anim_front.png",
    "graphics/pokemon/sableye/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
