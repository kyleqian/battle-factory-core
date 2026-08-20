// Reproducible source extraction for MOVE_LOVELY_KISS's two loaded OBJ tags.
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
  : join(root, "src/animation/assets/lovely-kiss.json");

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

const devil = sprite("graphics/battle_anims/sprites/devil.png");
const pinkHeart = sprite(
  "graphics/battle_anims/sprites/magenta_heart.png",
  "graphics/battle_anims/sprites/pink_heart.pal",
);
if (devil.tileset.columns !== 4 || devil.tileset.rows !== 8
  || pinkHeart.tileset.columns !== 2 || pinkHeart.tileset.rows !== 2) {
  throw new Error("Lovely Kiss source asset geometry changed");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    devil:
      "graphics/battle_anims/sprites/devil.png; gBattleAnimSpriteGfx_Devil/gBattleAnimSpritePal_Devil; ANIM_TAG_DEVIL; gDevilSpriteTemplate",
    pinkHeart:
      "graphics/battle_anims/sprites/magenta_heart.png + pink_heart.pal; gBattleAnimSpriteGfx_MagentaHeart/gBattleAnimSpritePal_PinkHeart; ANIM_TAG_PINK_HEART; gPinkHeartSpriteTemplate",
  },
  devil,
  pinkHeart,
})}\n`);
console.log(`wrote ${out}`);
