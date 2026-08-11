import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outArg = process.argv.indexOf("--out");
const out = outArg >= 0
  ? resolve(process.argv[outArg + 1]!)
  : join(root, "src/animation/assets/hypnosis.json");

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

const politoedFront = sprite(
  "graphics/pokemon/politoed/anim_front.png",
  "graphics/pokemon/politoed/normal.pal",
);
politoedFront.tileset = {
  columns: 8,
  rows: 8,
  tiles: politoedFront.tileset.tiles.slice(0, 64),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    goldRing:
      "graphics/battle_anims/sprites/gold_ring.png; "
      + "gGoldRingSpriteTemplate; ANIM_TAG_GOLD_RING",
    politoedBack: "graphics/pokemon/politoed/back.png",
    politoedFront:
      "graphics/pokemon/politoed/anim_front.png; resting frame 0",
  },
  goldRing: sprite("graphics/battle_anims/sprites/gold_ring.png"),
  politoedBack: sprite(
    "graphics/pokemon/politoed/back.png",
    "graphics/pokemon/politoed/normal.pal",
  ),
  politoedFront,
})}\n`);
console.log(`wrote ${out}`);
