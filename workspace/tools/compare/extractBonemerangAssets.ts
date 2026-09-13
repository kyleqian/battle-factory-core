/** Reproducible source extraction for MOVE_BONEMERANG's ANIM_TAG_BONE art. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reference = join(root, "reference/pokeemerald");
const outIndex = process.argv.indexOf("--out");
const out = outIndex >= 0 && process.argv[outIndex + 1]
  ? resolve(process.argv[outIndex + 1]!)
  : join(root, "src/animation/assets/bonemerang.json");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const source = (path: string): string => readFileSync(join(reference, path), "utf8");

const scripts = source("data/battle_anim_scripts.s");
const ground = source("src/battle_anim_ground.c");
const graphics = source("src/graphics.c");
const registry = source("src/data/battle_anim.h");
const moveStart = scripts.indexOf("Move_BONEMERANG:\n");
const moveEnd = scripts.indexOf("Move_BONE_CLUB:\n", moveStart);
if (moveStart < 0 || moveEnd < 0) throw new Error("MOVE_BONEMERANG source root missing");
const moveBody = scripts.slice(moveStart, moveEnd);
for (const token of [
  "loadspritegfx ANIM_TAG_BONE", "createsprite gBonemerangSpriteTemplate, ANIM_ATTACKER, 2",
  "create_basic_hitsplat_sprite", "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 5, 0, 5, 1",
  "createsprite gHorizontalLungeSpriteTemplate, ANIM_ATTACKER, 2, 6, -4",
]) if (!moveBody.includes(token)) throw new Error(`MOVE_BONEMERANG source drifted: ${token}`);
for (const token of [
  "const struct SpriteTemplate gBonemerangSpriteTemplate", "sAffineAnim_Bonemerang",
  "static void AnimBonemerangProjectile", "static void AnimBonemerangProjectile_Step",
  "static void AnimBonemerangProjectile_End",
]) if (!ground.includes(token)) throw new Error(`Bonemerang source drifted: ${token}`);
for (const token of [
  "gBattleAnimSpriteGfx_Bone", "gBattleAnimSpritePal_Bone",
  "graphics/battle_anims/sprites/bone.png", "{gBattleAnimSpriteGfx_Bone, 0x0200, ANIM_TAG_BONE}",
  "{gBattleAnimSpritePal_Bone, ANIM_TAG_BONE}",
]) if (!`${graphics}\n${registry}`.includes(token)) throw new Error(`BONE resource registry drifted: ${token}`);

const imagePath = join(reference, "graphics/battle_anims/sprites/bone.png");
const image = decodeIndexedPng(imagePath);
const tiles = sliceTiles(image);
const result = {
  schema: "bonemerang-source-assets/v1",
  source: {
    move: "data/battle_anim_scripts.s Move_BONEMERANG",
    moveSha256: sha(moveBody),
    template: "src/battle_anim_ground.c gBonemerangSpriteTemplate / AnimBonemerangProjectile",
    resource: "src/graphics.c gBattleAnimSpriteGfx_Bone + gBattleAnimSpritePal_Bone",
    image: "graphics/battle_anims/sprites/bone.png",
    imageSha256: sha(readFileSync(imagePath)),
  },
  resource: {
    tag: "ANIM_TAG_BONE", tagValue: 10000, tileBytes: 0x0200,
    graphics: "gBattleAnimSpriteGfx_Bone", palette: "gBattleAnimSpritePal_Bone",
  },
  template: {
    symbol: "gBonemerangSpriteTemplate", shape: "32x32", affine: true,
    objMode: "objnormal", affineProgram: [[0, 0, 15, 1]], callback: "AnimBonemerangProjectile",
  },
  bone: {
    dimensions: { width: image.width, height: image.height },
    tileset: {
      columns: tiles.columns, rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${out}`);
