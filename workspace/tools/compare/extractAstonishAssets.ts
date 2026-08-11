// Reproducible source extraction for MOVE_ASTONISH's legal set-144 LOUDRED
// carrier and literal ANIM_TAG_SWEAT_BEAD effect.
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
  : join(root, "src/animation/assets/astonish.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath
      ? palettePath.endsWith(".png")
        ? decodeIndexedPng(join(ref, palettePath)).palette
        : loadJascPal(join(ref, palettePath))
      : image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_LOUDRED set 144; SPECIES_LOUDRED 371; complete legal parties",
    back:
      "graphics/pokemon/loudred/back.png + graphics/pokemon/loudred/normal.pal",
    front:
      "graphics/pokemon/loudred/anim_front.png frame 0 + graphics/pokemon/loudred/normal.pal",
    sweatBead:
      "graphics/battle_anims/sprites/sweat_bead.png + splash.png palette; gSprayWaterDropletSpriteTemplate; ANIM_TAG_SWEAT_BEAD",
  },
  loudredBack: sprite(
    "graphics/pokemon/loudred/back.png",
    "graphics/pokemon/loudred/normal.pal",
  ),
  loudredFront: sprite(
    "graphics/pokemon/loudred/anim_front.png",
    "graphics/pokemon/loudred/normal.pal",
  ),
  sweatBead: sprite(
    "graphics/battle_anims/sprites/sweat_bead.png",
    "graphics/battle_anims/sprites/splash.png",
  ),
})}\n`);
console.log(`wrote ${out}`);
