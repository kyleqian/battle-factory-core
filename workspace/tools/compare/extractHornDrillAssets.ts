/** Dev-time extraction of the source-owned Horn Drill BG and horn OBJ art. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/horn-drill.json");

function indexed(path: string) {
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

const drill = indexed("graphics/battle_anims/backgrounds/drill.png");
const horn = indexed("graphics/battle_anims/sprites/horn_hit.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s Move_HORN_DRILL",
    background: "graphics/battle_anims/backgrounds/drill.png + drill.bin",
    horn: "graphics/battle_anims/sprites/horn_hit.png",
  },
  drill: {
    ...drill,
    tilemap: (() => {
      const map = parseTilemap(readFileSync(join(
        ref, "graphics/battle_anims/backgrounds/drill.bin",
      )), 32, 32);
      return { ...map, entries: map.entries.map((entry) => ({ ...entry, palette: 0 })) };
    })(),
  },
  horn,
})}\n`);
console.log(`wrote ${out}`);
