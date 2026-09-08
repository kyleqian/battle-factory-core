import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(root, "reference/pokeemerald/graphics/battle_anims/sprites/hollow_orb.png");
const output = join(root, "src/animation/assets/dragon-dance.json");
const image = decodeIndexedPng(source);
const sheet = sliceTiles(image);
if (image.width !== 16 || image.height !== 16 || sheet.columns !== 2 || sheet.rows !== 2) {
  throw new Error("ANIM_TAG_HOLLOW_ORB indexed sheet geometry drifted");
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: "graphics/battle_anims/sprites/hollow_orb.png; gBattleAnimSpriteGfx_HollowOrb/gBattleAnimSpritePal_HollowOrb; ANIM_TAG_HOLLOW_ORB",
  hollowOrb: {
    tileset: { columns: sheet.columns, rows: sheet.rows, tiles: sheet.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${output}`);
