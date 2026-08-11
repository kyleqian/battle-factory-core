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
  : join(root, "src/animation/assets/guillotine.json");
const image = decodeIndexedPng(
  join(ref, "graphics/battle_anims/backgrounds/guillotine.png"),
);
const sliced = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_GLIGAR_2 set 315; SPECIES_GLIGAR 207; MOVE_GUILLOTINE 12",
    background:
      "graphics/battle_anims/backgrounds/guillotine.png + guillotine_{player,opponent}.bin; BG_GUILLOTINE_*",
    cut:
      "source-identical ANIM_TAG_CUT/gBattleAnimSpriteGfx_Cut already extracted as battle-anim-cutting-slice.json",
    impact:
      "source-identical ANIM_TAG_IMPACT/gBattleAnimSpriteGfx_Impact and gBattleAnimSpritePal_Impact already extracted as battle-anim-hitsplat.json",
    gligar:
      "source-identical generated complete battle-mon front/back catalogs",
  },
  background: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
    playerTilemap: parseTilemap(readFileSync(join(
      ref,
      "graphics/battle_anims/backgrounds/guillotine_player.bin",
    )), 32, 32),
    opponentTilemap: parseTilemap(readFileSync(join(
      ref,
      "graphics/battle_anims/backgrounds/guillotine_opponent.bin",
    )), 32, 32),
  },
})}\n`);
console.log(`wrote ${out}`);
