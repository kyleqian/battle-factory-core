// Reproducible source extraction for MOVE_SONIC_BOOM's AIR_WAVE projectile
// and legal Level-50 Factory set-244 MAGNETON carrier. IMPACT, ONIX, and the
// battle chrome remain shared assets already exercised by exact moves.
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
  : join(root, "src/animation/assets/sonic-boom.json");

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
    script: "data/battle_anim_scripts.s:1029-1053 Move_SONIC_BOOM",
    projectile:
      "graphics/battle_anims/sprites/air_wave.png; ANIM_TAG_AIR_WAVE; gSonicBoomSpriteTemplate",
    magneton:
      "graphics/pokemon/magneton/{back.png,anim_front.png,normal.pal}; FRONTIER_MON_MAGNETON_1 set 244",
    enemyShadow:
      "graphics/battle_interface/enemy_mon_shadow.png; GFXTAG_SHADOW/PALTAG_SHADOW; first source display latch",
    reused:
      "ANIM_TAG_IMPACT from src/assets/gen/battle-anim-hitsplat.json; AnimTask_ShakeMon from src/animation/shakeMon.ts; ONIX/chrome/healthboxes from existing battle assets",
  },
  airWave: sprite("graphics/battle_anims/sprites/air_wave.png"),
  enemyShadow: sprite("graphics/battle_interface/enemy_mon_shadow.png"),
  magnetonBack: sprite(
    "graphics/pokemon/magneton/back.png",
    "graphics/pokemon/magneton/normal.pal",
  ),
  magnetonFront: sprite(
    "graphics/pokemon/magneton/anim_front.png",
    "graphics/pokemon/magneton/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
