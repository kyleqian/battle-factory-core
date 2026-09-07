import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(root, "reference/pokeemerald/graphics/battle_anims/sprites/amnesia.png");
const output = join(root, "src/animation/assets/amnesia.json");
const image = decodeIndexedPng(source);
const sheet = sliceTiles(image);
if (image.width !== 32 || image.height !== 256 || sheet.columns !== 4 || sheet.rows !== 32) {
  throw new Error("ANIM_TAG_AMNESIA indexed sheet geometry drifted");
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: "graphics/battle_anims/sprites/amnesia.png; gBattleAnimSpriteGfx_Amnesia/gBattleAnimSpritePal_Amnesia; ANIM_TAG_AMNESIA",
  questionMark: {
    tileset: { columns: sheet.columns, rows: sheet.rows, tiles: sheet.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${output}`);
