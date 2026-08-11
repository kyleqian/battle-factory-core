import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../.."); const ref = join(root, "reference/pokeemerald");
const flag = process.argv.indexOf("--out"); const out = flag >= 0 && process.argv[flag + 1] ? resolve(process.argv[flag + 1]!) : join(root, "src/animation/assets/leaf-blade.json");
function sprite(path: string, palettePath?: string) { const image = decodeIndexedPng(join(ref, path)); const tiles = sliceTiles(image); return { tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) }, palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette }; }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, `${JSON.stringify({ source: { sceptileBack: "graphics/pokemon/sceptile/back.png; FRONTIER_MON_SCEPTILE_1 set 453; SPECIES_SCEPTILE 279", sceptileFront: "graphics/pokemon/sceptile/anim_front.png frame 0; FRONTIER_MON_SCEPTILE_1 set 453; SPECIES_SCEPTILE 279", leaf: "graphics/battle_anims/sprites/leaf.png; ANIM_TAG_LEAF; gLeafBladeSpriteTemplate", crossImpact: "graphics/battle_anims/sprites/cross_impact.png; ANIM_TAG_CROSS_IMPACT; gCrossImpactSpriteTemplate" }, sceptileBack: sprite("graphics/pokemon/sceptile/back.png", "graphics/pokemon/sceptile/normal.pal"), sceptileFront: sprite("graphics/pokemon/sceptile/anim_front.png", "graphics/pokemon/sceptile/normal.pal"), leaf: sprite("graphics/battle_anims/sprites/leaf.png"), crossImpact: sprite("graphics/battle_anims/sprites/cross_impact.png") })}\n`);
console.log(`wrote ${out}`);
