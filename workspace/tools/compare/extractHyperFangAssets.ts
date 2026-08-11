// Reproducible source extraction for Hyper Fang, its impact BG variants,
// and the real Level-50 Factory set-302 RATICATE carrier.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";
import { parseTilemap } from "../extract/tilemap.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/hyperFang.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}

const impact = sprite("graphics/battle_anims/backgrounds/impact.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    fang: "graphics/battle_anims/sprites/fang_attack.png; ANIM_TAG_FANG_ATTACK; gFangSpriteTemplate",
    impact: "graphics/battle_anims/backgrounds/impact.png + impact_{opponent,player}.bin; BG_IMPACT_*",
    raticateBack: "graphics/pokemon/raticate/back.png; FRONTIER_MON_RATICATE_2 set 302",
    raticateFront: "graphics/pokemon/raticate/anim_front.png frame 0; FRONTIER_MON_RATICATE_2 set 302",
  },
  fang: sprite("graphics/battle_anims/sprites/fang_attack.png"),
  impact: {
    ...impact,
    opponentTilemap: parseTilemap(readFileSync(
      join(ref, "graphics/battle_anims/backgrounds/impact_opponent.bin"),
    ), 32, 20),
    playerTilemap: parseTilemap(readFileSync(
      join(ref, "graphics/battle_anims/backgrounds/impact_player.bin"),
    ), 32, 20),
  },
  raticateBack: sprite(
    "graphics/pokemon/raticate/back.png",
    "graphics/pokemon/raticate/normal.pal",
  ),
  raticateFront: sprite(
    "graphics/pokemon/raticate/anim_front.png",
    "graphics/pokemon/raticate/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
