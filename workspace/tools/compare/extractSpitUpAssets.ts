/** Reproducible source extraction for MOVE_SPIT_UP's RED_ORB_2 resource. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const reference = join(root, "reference/pokeemerald");
const outIndex = process.argv.indexOf("--out");
const output = outIndex >= 0 && process.argv[outIndex + 1]
  ? resolve(process.argv[outIndex + 1]!)
  : resolve(root, "src/animation/assets/spit-up-red-orb.json");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");
const text = (path: string): string => readFileSync(join(reference, path), "utf8");

const scripts = text("data/battle_anim_scripts.s");
const effects2 = text("src/battle_anim_effects_2.c");
const graphics = text("src/graphics.c");
const registry = text("src/data/battle_anim.h");
const start = scripts.indexOf("Move_SPIT_UP:\n");
const end = scripts.indexOf("Move_SWALLOW:\n", start);
if (start < 0 || end < 0) throw new Error("MOVE_SPIT_UP source root missing");
const moveBody = scripts.slice(start, end);
for (const token of ["loadspritegfx ANIM_TAG_RED_ORB_2", "createsprite gSpitUpOrbSpriteTemplate",
  "SpitUpStrong:", "SpitUpStrongest:", "SpitUpContinue:"]) {
  if (!moveBody.includes(token)) throw new Error(`MOVE_SPIT_UP source drifted: ${token}`);
}
for (const token of ["const struct SpriteTemplate gSpitUpOrbSpriteTemplate",
  ".oam = &gOamData_AffineDouble_ObjNormal_8x8", ".callback = AnimSpitUpOrb",
  "static void AnimSpitUpOrb_Step(struct Sprite *sprite)"]) {
  if (!effects2.includes(token)) throw new Error(`Spit Up orb source drifted: ${token}`);
}
for (const token of [
  "gBattleAnimSpriteGfx_GrayOrb[] = INCGFX_U32(\"graphics/battle_anims/sprites/gray_orb.png\"",
  "gBattleAnimSpritePal_RedOrb2[] = INCGFX_U32(\"graphics/battle_anims/sprites/red_orb_2.pal\"",
  "{gBattleAnimSpriteGfx_GrayOrb, 0x0060, ANIM_TAG_RED_ORB_2}",
  "{gBattleAnimSpritePal_RedOrb2, ANIM_TAG_RED_ORB_2}",
]) {
  if (!`${graphics}\n${registry}`.includes(token)) throw new Error(`RED_ORB_2 registry drifted: ${token}`);
}

const imagePath = join(reference, "graphics/battle_anims/sprites/gray_orb.png");
const palettePath = join(reference, "graphics/battle_anims/sprites/red_orb_2.pal");
const image = decodeIndexedPng(imagePath);
const tiles = sliceTiles(image);
const result = {
  schema: "spit-up-red-orb-source-asset/v1",
  source: {
    move: "data/battle_anim_scripts.s Move_SPIT_UP through Move_SWALLOW",
    moveSha256: sha256(moveBody),
    template: "src/battle_anim_effects_2.c gSpitUpOrbSpriteTemplate / AnimSpitUpOrb",
    image: "graphics/battle_anims/sprites/gray_orb.png",
    imageSha256: sha256(readFileSync(imagePath)),
    palette: "graphics/battle_anims/sprites/red_orb_2.pal",
    paletteSha256: sha256(readFileSync(palettePath)),
  },
  resource: { tag: "ANIM_TAG_RED_ORB_2", tagValue: 10237, tileBytes: 0x60 },
  template: {
    symbol: "gSpitUpOrbSpriteTemplate", shape: "8x8", affine: "double",
    objMode: "normal", callback: "AnimSpitUpOrb / AnimSpitUpOrb_Step",
  },
  art: {
    tileset: { columns: tiles.columns, rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
    palette: loadJascPal(palettePath),
  },
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${output}`);
