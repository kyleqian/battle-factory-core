/** Dev-time source extraction for Skill Swap's unique blue-green orb. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/skill-swap-bluegreen-orb.json");
const source = "graphics/battle_anims/sprites/bluegreen_orb.png";
const image = decodeIndexedPng(join(ref, source));
const sliced = sliceTiles(image);
if (image.width !== 16 || image.height !== 16 || sliced.columns !== 2
  || sliced.rows !== 2 || sliced.tiles.length !== 4) {
  throw new Error("Skill Swap blue-green orb source geometry changed");
}
const psychic = readFileSync(join(ref, "src/battle_anim_psychic.c"), "utf8");
for (const token of ["gSkillSwapOrbSpriteTemplate", "ANIM_TAG_BLUEGREEN_ORB",
  "gOamData_AffineNormal_ObjNormal_16x16", "AnimSkillSwapOrb"]) {
  if (!psychic.includes(token)) throw new Error(`Skill Swap source drifted: ${token}`);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  schema: "skill-swap-bluegreen-orb-source-asset/v1",
  source: {
    art: source,
    graphics: "gBattleAnimSpriteGfx_BluegreenOrb; ANIM_TAG_BLUEGREEN_ORB",
    palette: "gBattleAnimSpritePal_BluegreenOrb; ANIM_TAG_BLUEGREEN_ORB",
    template: "gSkillSwapOrbSpriteTemplate; gOamData_AffineNormal_ObjNormal_16x16",
  },
  orb: {
    tileset: { columns: sliced.columns, rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
