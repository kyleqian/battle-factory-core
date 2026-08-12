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
  : join(root, "src/animation/assets/confuse-ray.json");

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
    yellowBall: "graphics/battle_anims/sprites/yellow_ball.png; ANIM_TAG_YELLOW_BALL",
    ghostBg: "src/assets/gen/battle-anim-ghost-bg.json; source-extracted BG_GHOST",
    chinchou: "graphics/pokemon/chinchou/{back.png,anim_front.png,normal.pal}; lowest Level-50 Confuse Ray carrier set 116",
  },
  yellowBall: sprite("graphics/battle_anims/sprites/yellow_ball.png"),
  chinchouBack: sprite(
    "graphics/pokemon/chinchou/back.png",
    "graphics/pokemon/chinchou/normal.pal",
  ),
  chinchouFront: sprite(
    "graphics/pokemon/chinchou/anim_front.png",
    "graphics/pokemon/chinchou/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
