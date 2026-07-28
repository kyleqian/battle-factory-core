// Reproducible source extraction for MOVE_TWINEEDLE's NEEDLE tag and the
// legal Level-50 Factory BEEDRILL carrier used by the portable proof.
// IMPACT, ONIX, field chrome, and healthboxes remain shared assets.
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
  : join(root, "src/animation/assets/twineedle.json");

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
    script: "data/battle_anim_scripts.s:836-854 Move_TWINEEDLE",
    needle:
      "graphics/battle_anims/sprites/needle.png; src/graphics.c:39-40; ANIM_TAG_NEEDLE; gLinearStingerSpriteTemplate",
    beedrillBack:
      "graphics/pokemon/beedrill/back.png + normal.pal; FRONTIER_MON_BEEDRILL set 154",
    beedrillFront:
      "graphics/pokemon/beedrill/anim_front.png frame 0 + normal.pal; FRONTIER_MON_BEEDRILL set 154",
    reused:
      "ANIM_TAG_IMPACT from src/assets/gen/battle-anim-hitsplat.json; ONIX/chrome/healthboxes from existing battle assets",
  },
  needle: sprite("graphics/battle_anims/sprites/needle.png"),
  beedrillBack: sprite(
    "graphics/pokemon/beedrill/back.png",
    "graphics/pokemon/beedrill/normal.pal",
  ),
  beedrillFront: sprite(
    "graphics/pokemon/beedrill/anim_front.png",
    "graphics/pokemon/beedrill/normal.pal",
  ),
  templates: {
    linearStinger: {
      source: "src/battle_anim_bug.c:139-149,364-408",
      oam: "gOamData_AffineNormal_ObjNormal_16x16",
      callback: "AnimTranslateStinger",
      tileBytes: 0x80,
    },
    invertHitSplat: {
      source: "src/battle_anim_normal.c:180-189,1036-1050",
      oam: "gOamData_AffineNormal_ObjBlend_32x32",
      callback: "AnimHitSplatHandleInvert",
      affineAnimation: 3,
    },
  },
})}\n`);
console.log(`wrote ${out}`);
