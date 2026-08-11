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
  : join(root, "src/animation/assets/smokescreen.json");

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
const blackSmoke = sprite("graphics/battle_anims/sprites/black_smoke.png");
const blackBall = sprite("graphics/battle_anims/sprites/black_ball.png");
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s:2264-2286 Move_SMOKESCREEN",
    particles:
      "black_ball.png with the source table's shared black_smoke palette (ANIM_TAG_BLACK_BALL), black_smoke.png (ANIM_TAG_BLACK_SMOKE), smokescreen_impact.png (dynamic tag 55019)",
    carrier:
      "graphics/pokemon/koffing/{back.png,anim_front.png,normal.pal}; legal Level-50 FRONTIER_MON_KOFFING set 127",
    topology:
      "AnimThrowProjectile; SmokescreenImpact dynamic four-child lifetime; twelve AnimBlackSmoke_Step sprites; no visual task survives dispatch",
  },
  blackBall: { ...blackBall, palette: blackSmoke.palette },
  blackSmoke,
  impact: sprite("graphics/battle_anims/sprites/smokescreen_impact.png"),
  koffingBack: sprite(
    "graphics/pokemon/koffing/back.png",
    "graphics/pokemon/koffing/normal.pal",
  ),
  koffingFront: sprite(
    "graphics/pokemon/koffing/anim_front.png",
    "graphics/pokemon/koffing/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
