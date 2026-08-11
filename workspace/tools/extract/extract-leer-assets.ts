import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = join(root, "reference", "pokeemerald", "graphics", "battle_anims", "sprites", "leer.png");
const image = decodeIndexedPng(source);
const sliced = sliceTiles(image);
const output = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, "src", "assets", "gen", "battle-anim-leer.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: "graphics/battle_anims/sprites/leer.png (gBattleAnimSpriteGfx_Leer/gBattleAnimSpritePal_Leer, ANIM_TAG_LEER)",
  tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
  palette: image.palette,
  oam: { shape: "32x32", affine: false, doubleSize: false, objMode: "normal" },
  anim: { frameTileOffsets: [0, 16, 32, 48, 64], durationTicksPerFrame: 3, loops: false },
})}\n`);
console.log(`wrote ${output}`);
