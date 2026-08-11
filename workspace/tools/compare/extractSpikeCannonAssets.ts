// Reproducible source extraction for MOVE_SPIKE_CANNON's legal Level-50
// Factory set-260 OMASTAR carrier. NEEDLE/IMPACT and ONIX remain byte-identical
// shared assets already extracted for TWINEEDLE and the battle compositor.
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
  : join(root, "src/animation/assets/spike-cannon.json");

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
    script:
      "data/battle_anim_scripts.s:1299-1321 Move_SPIKE_CANNON",
    omastar:
      "graphics/pokemon/omastar/{back.png,anim_front.png,normal.pal}; FRONTIER_MON_OMASTAR_1 set 260",
    reused:
      "ANIM_TAG_NEEDLE, gLinearStingerSpriteTemplate, and gHandleInvertHitSplatSpriteTemplate from src/animation/assets/twineedle.json; ANIM_TAG_IMPACT from src/assets/gen/battle-anim-hitsplat.json; ONIX/chrome/healthboxes from existing battle assets",
  },
  omastarBack: sprite(
    "graphics/pokemon/omastar/back.png",
    "graphics/pokemon/omastar/normal.pal",
  ),
  omastarFront: sprite(
    "graphics/pokemon/omastar/anim_front.png",
    "graphics/pokemon/omastar/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
