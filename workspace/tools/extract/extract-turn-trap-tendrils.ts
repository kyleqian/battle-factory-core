// trp1 (docs/trp1-turn-trap-animation.md): the one tile/palette asset General_TurnTrap's Status_BindWrap loads that no other drawn body
// has: `loadspritegfx ANIM_TAG_TENDRILS` -> gConstrictBindingSpriteTemplate (src/battle_anim_effects_1.c:623-632, 64x32 affine OBJ,
// sAnim_ConstrictBinding's four 32-tile frames) -> graphics/battle_anims/sprites/tendrils.png (64x128: the four frames stacked).
//   node --experimental-strip-types tools/extract/extract-turn-trap-tendrils.ts [--out PATH]
// Never imported at runtime; writes src/animation/assets/tendrils.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1] ? resolve(process.argv[outFlag + 1]!) : join(root, "src/animation/assets/tendrils.json");
const path = "graphics/battle_anims/sprites/tendrils.png";
const image = decodeIndexedPng(join(root, "reference/pokeemerald", path));
const sliced = sliceTiles(image);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: { tendrils: `${path}; ANIM_TAG_TENDRILS; gConstrictBindingSpriteTemplate (frames at tiles 0 / 32 / 64 / 96)` },
  tendrils: {
    tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
