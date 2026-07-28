// Reproducible source extraction for MOVE_BITE's exclusive SHARP_TEETH tag
// and the legal Level-50 Factory set-56 MEOWTH carrier used by its portable
// proof. IMPACT, ONIX, field chrome, and healthboxes remain shared assets.
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
  : join(root, "src/animation/assets/bite.json");

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
    script: "data/battle_anim_scripts.s:5289-5300 Move_BITE",
    sharpTeeth:
      "graphics/battle_anims/sprites/sharp_teeth.png; src/graphics.c:474-475; ANIM_TAG_SHARP_TEETH; gSharpTeethSpriteTemplate",
    meowthBack:
      "graphics/pokemon/meowth/back.png + normal.pal; FRONTIER_MON_MEOWTH set 56",
    meowthFront:
      "graphics/pokemon/meowth/anim_front.png frame 0 + normal.pal; FRONTIER_MON_MEOWTH set 56",
    reused:
      "ANIM_TAG_IMPACT from src/assets/gen/battle-anim-hitsplat.json; ONIX/chrome/healthboxes from existing battle assets",
  },
  sharpTeeth: sprite("graphics/battle_anims/sprites/sharp_teeth.png"),
  meowthBack: sprite(
    "graphics/pokemon/meowth/back.png",
    "graphics/pokemon/meowth/normal.pal",
  ),
  meowthFront: sprite(
    "graphics/pokemon/meowth/anim_front.png",
    "graphics/pokemon/meowth/normal.pal",
  ),
  template: {
    source: "src/battle_anim_dark.c:101-110,146-184",
    oam: "gOamData_AffineNormal_ObjBlend_64x64",
    callback: "AnimSharpTeeth",
    affineAnimations: {
      top: "gAffineAnims_Bite1 (index 0)",
      bottom: "gAffineAnims_Bite2 (index 4)",
    },
    tileBytes: 0x0800,
  },
})}\n`);
console.log(`wrote ${out}`);
