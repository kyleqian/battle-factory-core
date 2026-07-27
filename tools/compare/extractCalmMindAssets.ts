// Reproducible source extraction for CALM MIND and real set-327 LUNATONE_2.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/calm-mind.json");

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
    thinRing: "graphics/battle_anims/sprites/thin_ring.png; gThinRingShrinkingSpriteTemplate; ANIM_TAG_THIN_RING",
    lunatoneBack: "graphics/pokemon/lunatone/back.png; real Factory set-327 LUNATONE_2 CALM MIND carrier",
    lunatoneFront: "graphics/pokemon/lunatone/anim_front.png; real Factory set-327 LUNATONE_2 CALM MIND carrier frame 0",
  },
  thinRing: sprite("graphics/battle_anims/sprites/thin_ring.png"),
  lunatoneBack: sprite(
    "graphics/pokemon/lunatone/back.png",
    "graphics/pokemon/lunatone/normal.pal",
  ),
  lunatoneFront: sprite(
    "graphics/pokemon/lunatone/anim_front.png",
    "graphics/pokemon/lunatone/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
