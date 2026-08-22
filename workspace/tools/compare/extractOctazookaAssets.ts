// Reproducible source extraction for MOVE_OCTAZOOKA's two loaded OBJ tags.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/octazooka.json");

function image(path: string, palettePath = path) {
  const source = decodeIndexedPng(join(ref, path));
  const paletteSource = decodeIndexedPng(join(ref, palettePath));
  const sliced = sliceTiles(source);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: paletteSource.palette,
  };
}

const blackBall = image(
  "graphics/battle_anims/sprites/black_ball.png",
  "graphics/battle_anims/sprites/black_smoke.png",
);
const graySmoke = image("graphics/battle_anims/sprites/gray_smoke.png");
if (blackBall.tileset.columns !== 1 || blackBall.tileset.rows !== 1
  || graySmoke.tileset.columns !== 4 || graySmoke.tileset.rows !== 20) {
  throw new Error("Octazooka source asset geometry changed");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    blackBall:
      "black_ball.png + black_smoke.png palette; gBattleAnimSpriteGfx_BlackBall/gBattleAnimSpritePal_BlackSmoke; ANIM_TAG_BLACK_BALL; gOctazookaBallSpriteTemplate",
    graySmoke:
      "gray_smoke.png; gBattleAnimSpriteGfx_GraySmoke/gBattleAnimSpritePal_GraySmoke; ANIM_TAG_GRAY_SMOKE; gOctazookaSmokeSpriteTemplate",
  },
  blackBall,
  graySmoke,
})}\n`);
console.log(`wrote ${out}`);
