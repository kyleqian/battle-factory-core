// Reproducible source extraction for Move_SUBSTITUTE's sprite swap.
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
  : join(root, "src/animation/assets/substitute.json");

function decode(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  };
}

const front = decode("graphics/battle_anims/sprites/substitute.png");
const back = decode("graphics/battle_anims/sprites/substitute_back.png");
if (JSON.stringify(front.palette) !== JSON.stringify(back.palette)) {
  throw new Error("substitute front/back source palettes differ");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s:8791-8794 Move_SUBSTITUTE",
    task: "src/battle_anim_effects_3.c:4782-4865 AnimTask_MonToSubstitute / AnimTask_MonToSubstituteDoll",
    loader: "src/battle_gfx_sfx_util.c:1032-1078 BattleLoadSubstituteOrMonSpriteGfx / LoadBattleMonGfxAndAnimate",
    front: "graphics/battle_anims/sprites/substitute.png; gSubstituteDollFrontGfx",
    back: "graphics/battle_anims/sprites/substitute_back.png; gSubstituteDollBackGfx",
    palette: "graphics/battle_anims/sprites/substitute.png; gSubstituteDollPal",
  },
  front: front.tileset,
  back: back.tileset,
  palette: front.palette,
  contract: {
    dimensions: "64x64",
    tileBytes: 0x0800,
    battlerPaletteBank: true,
  },
})}\n`);
console.log(`wrote ${out}`);
