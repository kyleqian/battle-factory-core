// Deterministic source extraction for MOVE_BATON_PASS's sole animation asset.
// Species art comes from the already-generated complete battle sprite catalogs.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/baton-pass.json");
const image = decodeIndexedPng(join(ref, "graphics/battle_anims/sprites/pokeball.png"));
const tiles = sliceTiles(image);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "graphics/battle_anims/sprites/pokeball.png; gBattleAnimSpriteGfx/Pal_Pokeball; ANIM_TAG_POKEBALL",
  pokeball: {
    tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
