// Reproducible source extraction for MOVE_DEFENSE_CURL's ECLIPSING_ORB tag.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const output = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/defense-curl.json");
const image = decodeIndexedPng(join(
  root,
  "reference/pokeemerald/graphics/battle_anims/sprites/eclipsing_orb.png",
));
const sliced = sliceTiles(image);

if (image.width !== 32 || image.height !== 128
  || sliced.columns !== 4 || sliced.rows !== 16
  || sliced.tiles.length !== 64) {
  throw new Error("Defense Curl ECLIPSING_ORB source asset geometry changed");
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/eclipsing_orb.png",
    graphics: "gBattleAnimSpriteGfx_EclipsingOrb; ANIM_TAG_ECLIPSING_ORB",
    palette: "gBattleAnimSpritePal_EclipsingOrb; ANIM_TAG_ECLIPSING_ORB",
    template: "gEclipsingOrbSpriteTemplate; gOamData_AffineOff_ObjNormal_32x32",
    animation: "seven 3-frame cells (0,16,32,48,32h,16h,0h), loop once",
  },
  eclipsingOrb: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${output}`);
