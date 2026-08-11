import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/attract.json");
const image = decodeIndexedPng(
  join(ref, "graphics/battle_anims/backgrounds/attract.png"),
);
const sliced = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_EEVEE set 113; SPECIES_EEVEE 133; MOVE_ATTRACT 213; challenge 0",
    carrierArt:
      "shared source-exact src/animation/assets/endure.json",
    redHeart:
      "shared source-exact src/animation/assets/sweet-kiss.json; ANIM_TAG_RED_HEART",
    background:
      "graphics/battle_anims/backgrounds/attract.png + attract.bin; gBattleAnimBgImage_Attract/gBattleAnimBgTilemap_Attract/gBattleAnimBgPalette_Attract",
  },
  background: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    tilemap: parseTilemap(
      readFileSync(join(
        ref,
        "graphics/battle_anims/backgrounds/attract.bin",
      )),
      32,
      32,
    ),
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
