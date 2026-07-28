// Reproducible source extraction for MOVE_HEADBUTT's legal Level-50
// ZIGZAGOON carrier. IMPACT is reused from the shared source-derived
// battle-anim-hitsplat asset.
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
  : join(root, "src/animation/assets/headbutt.json");

function sprite(path: string, palettePath: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(ref, palettePath)),
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_ZIGZAGOON_1 set 24; SPECIES_ZIGZAGOON 263; complete legal parties",
    back:
      "graphics/pokemon/zigzagoon/back.png + graphics/pokemon/zigzagoon/normal.pal",
    front:
      "graphics/pokemon/zigzagoon/anim_front.png frame 0 + graphics/pokemon/zigzagoon/normal.pal",
    reused:
      "ANIM_TAG_IMPACT from src/assets/gen/battle-anim-hitsplat.json, generated from graphics/battle_anims/sprites/impact.png",
  },
  zigzagoonBack: sprite(
    "graphics/pokemon/zigzagoon/back.png",
    "graphics/pokemon/zigzagoon/normal.pal",
  ),
  zigzagoonFront: sprite(
    "graphics/pokemon/zigzagoon/anim_front.png",
    "graphics/pokemon/zigzagoon/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
