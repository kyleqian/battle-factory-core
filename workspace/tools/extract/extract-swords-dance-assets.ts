import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = join(root, "reference", "pokeemerald", "graphics", "battle_anims", "sprites", "sword.png");
const image = decodeIndexedPng(source);
const sliced = sliceTiles(image);
const output = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, "src", "assets", "gen", "battle-anim-sword.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: "graphics/battle_anims/sprites/sword.png (gBattleAnimSpriteGfx_Sword/gBattleAnimSpritePal_Sword, ANIM_TAG_SWORD)",
  tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
  palette: image.palette,
  oam: { shape: "32x64", affine: true, doubleSize: false, objMode: "blend" },
  affine: { initialXScale: 16, xScaleDelta: 20, duration: 12, hold: 32 },
  rise: { duration: 6, yOffset: -32 },
})}\n`);
console.log(`wrote ${output}`);
