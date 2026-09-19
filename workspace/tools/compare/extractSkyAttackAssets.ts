/** Dev-time extraction for MOVE_SKY_ATTACK's BIRD sprite and BG_SKY palette. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/sky-attack.json");
const birdImage = decodeIndexedPng(join(ref,
  "graphics/battle_anims/sprites/bird.png"));
const bird = sliceTiles(birdImage);
if (bird.columns !== 8 || bird.rows !== 8 || bird.tiles.length !== 64) {
  throw new Error("Sky Attack bird source shape drifted");
}
const registry = readFileSync(join(ref, "src/data/battle_anim.h"), "utf8");
for (const token of [
  "{gBattleAnimSpriteGfx_Bird, 0x0800, ANIM_TAG_BIRD}",
  "[BG_SKY]                 = {gBattleAnimBgImage_Drill,      gBattleAnimBgPalette_Sky,        gBattleAnimBgTilemap_Drill}",
]) if (!registry.includes(token)) throw new Error(`Sky Attack resource drifted: ${token}`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  schema: "sky-attack-source-assets/v1",
  source: {
    bird: "graphics/battle_anims/sprites/bird.png",
    sky: "BG_SKY reuses drill.png + drill.bin with sky.pal",
    backgroundReuse: "src/animation/assets/horn-drill.json",
  },
  bird: { tag: 10284, tileset: { columns: bird.columns, rows: bird.rows,
    tiles: bird.tiles.map((tile) => [...tile.pixels]) }, palette: birdImage.palette },
  skyPalette: loadJascPal(join(ref, "graphics/battle_anims/backgrounds/sky.pal")),
})}\n`);
console.log(`wrote ${out}`);
