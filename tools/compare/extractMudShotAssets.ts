// Reproducible source extraction for legal set-111 KRABBY and BROWN_ORB.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/mud-shot.json");

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

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_KRABBY set 111; SPECIES_KRABBY 98; MOVE_MUD_SHOT 341",
    brownOrb:
      "graphics/battle_anims/sprites/water_orb.png + brown_orb.pal; ANIM_TAG_BROWN_ORB; gMudShotOrbSpriteTemplate",
    krabbyBack:
      "graphics/pokemon/krabby/back.png + normal.pal; set 111 player-back",
    krabbyFront:
      "graphics/pokemon/krabby/anim_front.png frame 0 + normal.pal; set 111 opponent-front",
    target:
      "ONIX and field chrome reuse independently source-extracted battle assets",
  },
  brownOrb: sprite(
    "graphics/battle_anims/sprites/water_orb.png",
    "graphics/battle_anims/sprites/brown_orb.pal",
  ),
  krabbyBack: sprite(
    "graphics/pokemon/krabby/back.png",
    "graphics/pokemon/krabby/normal.pal",
  ),
  krabbyFront: sprite(
    "graphics/pokemon/krabby/anim_front.png",
    "graphics/pokemon/krabby/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
