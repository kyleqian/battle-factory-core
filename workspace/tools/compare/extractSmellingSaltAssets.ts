// Reproducible source extraction for MOVE_SMELLING_SALT's exclusive effect.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const output = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/smelling-salt.json");
const ref = join(root, "reference/pokeemerald");

const effect = decodeIndexedPng(join(
  ref,
  "graphics/battle_anims/sprites/smellingsalt_effect.png",
));
const sliced = sliceTiles(effect);
if (effect.width !== 32 || effect.height !== 32
  || sliced.columns !== 4 || sliced.rows !== 4 || sliced.tiles.length !== 16) {
  throw new Error("Smelling Salt effect source geometry changed");
}

// AnimSmellingSaltsHand adds 16 to tileNum, selecting the same source cell
// already retained for Encore/Helping Hand. Verify that identity here rather
// than duplicating TAG_HAND under the move-owned asset.
const tagHand = sliceTiles(decodeIndexedPng(join(
  ref,
  "graphics/battle_anims/sprites/tag_hand.png",
)));
const encore = JSON.parse(readFileSync(
  join(root, "src/animation/assets/encore.json"),
  "utf8",
)) as { clappingHand: { tileset: { tiles: number[][] } } };
const selectedHandTiles = tagHand.tiles.slice(16, 32)
  .map((tile) => [...tile.pixels]);
if (JSON.stringify(selectedHandTiles)
  !== JSON.stringify(encore.clappingHand.tileset.tiles)) {
  throw new Error("TAG_HAND tiles 16..31 no longer match Encore/Helping Hand");
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    effect: "graphics/battle_anims/sprites/smellingsalt_effect.png",
    graphics: "gBattleAnimSpriteGfx_SmellingsaltEffect; ANIM_TAG_SMELLINGSALT_EFFECT",
    palette: "gBattleAnimSpritePal_SmellingsaltEffect; ANIM_TAG_SMELLINGSALT_EFFECT",
    template: "gSmellingSaltExclamationSpriteTemplate; gOamData_AffineOff_ObjNormal_32x32",
    reusedHand: "src/animation/assets/encore.json clappingHand; tag_hand.png tiles 16..31",
  },
  exclamation: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: effect.palette,
  },
})}\n`);
console.log(`wrote ${output}`);
