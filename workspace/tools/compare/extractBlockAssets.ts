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
  : join(root, "src/animation/assets/block.json");

function pokemon(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(
      ref,
      "graphics/pokemon/sudowoodo/normal.pal",
    )),
  };
}

const xImage = decodeIndexedPng(join(
  ref,
  "graphics/battle_anims/sprites/x_sign.png",
));
const xTiles = sliceTiles(xImage);
const hollowOrb = decodeIndexedPng(join(
  ref,
  "graphics/battle_anims/sprites/hollow_orb.png",
));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_SUDOWOODO_1 set 193; SPECIES_SUDOWOODO 185",
    back: "graphics/pokemon/sudowoodo/back.png",
    front: "graphics/pokemon/sudowoodo/anim_front.png frame 0",
    xSign:
      "graphics/battle_anims/sprites/x_sign.png with gBattleAnimSpritePal_HollowOrb",
  },
  sudowoodoBack: pokemon("graphics/pokemon/sudowoodo/back.png"),
  sudowoodoFront: pokemon("graphics/pokemon/sudowoodo/anim_front.png"),
  xSign: {
    tileset: {
      columns: xTiles.columns,
      rows: xTiles.rows,
      tiles: xTiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: hollowOrb.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
