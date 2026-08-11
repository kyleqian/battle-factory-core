// Reproducible source extraction for MOVE_SWAGGER and its real Level-50
// Factory set-34 RATTATA carrier.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/swagger.json");

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
    breath:
      "graphics/battle_anims/sprites/breath.png; ANIM_TAG_BREATH; gBreathPuffSpriteTemplate",
    anger:
      "graphics/battle_anims/sprites/anger.png; ANIM_TAG_ANGER; gAngerMarkSpriteTemplate",
    rattataBack:
      "graphics/pokemon/rattata/back.png; FRONTIER_MON_RATTATA set 34",
    rattataFront:
      "graphics/pokemon/rattata/anim_front.png frame 0; FRONTIER_MON_RATTATA set 34",
  },
  breath: sprite("graphics/battle_anims/sprites/breath.png"),
  anger: sprite("graphics/battle_anims/sprites/anger.png"),
  rattataBack: sprite(
    "graphics/pokemon/rattata/back.png",
    "graphics/pokemon/rattata/normal.pal",
  ),
  rattataFront: sprite(
    "graphics/pokemon/rattata/anim_front.png",
    "graphics/pokemon/rattata/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
