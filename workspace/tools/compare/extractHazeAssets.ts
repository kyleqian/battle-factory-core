import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/haze.json");
const image = decodeIndexedPng(join(ref, "graphics/weather/fog_horizontal.png"));
const sliced = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    move: "data/battle_anim_scripts.s Move_HAZE",
    task: "src/battle_anim_ice.c AnimTask_HazeScrollingFog / Step",
    fog: "graphics/weather/fog_horizontal.png + fog.pal; graphics/battle_anims/backgrounds/fog.bin",
    carrier: "FRONTIER_MON_KOFFING set 127 / internal species 109",
  },
  fog: {
    tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: loadJascPal(join(ref, "graphics/weather/fog.pal")),
    tilemap: parseTilemap(readFileSync(join(ref, "graphics/battle_anims/backgrounds/fog.bin")), 32, 32),
  },
  blendAmounts: [0, 1, 2, 2, 2, 2, 3, 4, 4, 4, 5, 6, 6, 6, 6, 7, 8, 8, 8, 9],
})}\n`);
console.log(`wrote ${out}`);
