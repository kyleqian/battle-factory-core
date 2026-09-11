/** Reproducible source extraction for MOVE_SHEER_COLD's presentation graph. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/sheer-cold.json");
const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const source = (path: string): string => readFileSync(join(root, "reference/pokeemerald", path), "utf8");

const scripts = source("data/battle_anim_scripts.s");
const start = scripts.indexOf("Move_SHEER_COLD:\n");
const end = scripts.indexOf("Move_ARM_THRUST:\n", start);
if (start < 0 || end < 0) throw new Error("Move_SHEER_COLD source body missing");
const body = scripts.slice(start, end);
for (const token of [
  "fadetobg BG_ICE", "waitbgfadeout", "loadspritegfx ANIM_TAG_ICE_CUBE",
  "monbg ANIM_DEF_PARTNER", "splitbgprio ANIM_TARGET", "setalpha 12, 8",
  "createvisualtask AnimTask_FrozenIceCube, 2", "waitplaysewithpan SE_M_HAIL",
  "clearmonbg ANIM_DEF_PARTNER", "blendoff", "restorebg", "waitbgfadein", "end",
]) if (!body.includes(token)) throw new Error(`Sheer Cold source drifted: ${token}`);

const statusEffects = source("src/battle_anim_status_effects.c");
const runtime = source("src/battle_anim.c");
const registry = source("src/data/battle_anim.h");
const constants = source("include/constants/battle_anim.h");
const graphics = source("src/graphics.c");
for (const token of [
  "sFrozenIceCubeSubsprites", "sFrozenIceCubeSubspriteTable", "sFrozenIceCubeSpriteTemplate",
  "AnimTask_FrozenIceCube_Step1", "AnimTask_FrozenIceCube_Step2",
  "AnimTask_FrozenIceCube_Step3", "AnimTask_FrozenIceCube_Step4",
]) if (!statusEffects.includes(token)) throw new Error(`FrozenIceCube source drifted: ${token}`);
for (const token of ["Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg", "Cmd_fadetobg", "Cmd_restorebg"])
  if (!runtime.includes(token)) throw new Error(`battle animation runtime drifted: ${token}`);
for (const token of [
  "{gBattleAnimSpriteGfx_IceCube, 0x1200, ANIM_TAG_ICE_CUBE}",
  "{gBattleAnimSpritePal_IceCube, ANIM_TAG_ICE_CUBE}",
  "[BG_ICE]                 = {gBattleAnimBgImage_Ice",
]) if (!registry.includes(token)) throw new Error(`Sheer Cold registry drifted: ${token}`);
if (!graphics.includes('graphics/battle_anims/sprites/ice_cube.4bpp')
  || !graphics.includes('graphics/battle_anims/backgrounds/ice.png')) throw new Error("Sheer Cold graphics drifted");

const extracted = {
  schema: "sheer-cold-source-assets/v1",
  source: {
    script: "data/battle_anim_scripts.s Move_SHEER_COLD",
    scriptSha256: sha256(body),
    task: "src/battle_anim_status_effects.c AnimTask_FrozenIceCube",
    runtime: "src/battle_anim.c BG_ICE/monbg/fade/clear lifecycle",
    rom: { gameCode: "AGB-BPEE", symbol: "Move_SHEER_COLD", start: "0x082d5242", endExclusive: "0x082d5267" },
  },
  resources: {
    iceCube: {
      tag: 10010, tileBytes: 0x1200,
      graphics: "gBattleAnimSpriteGfx_IceCube",
      palette: "gBattleAnimSpritePal_IceCube",
      source: "graphics/battle_anims/sprites/ice_cube.4bpp + ice_cube.pal",
    },
    iceBackground: {
      id: 15, symbol: "BG_ICE",
      source: "graphics/battle_anims/backgrounds/ice.png + ice.bin",
    },
  },
  templates: {
    frozenIceCube: {
      symbol: "sFrozenIceCubeSpriteTemplate", affine: false, objMode: "objblend",
      callback: "SpriteCallbackDummy", matrixNum: 0, subpriority: 4,
    },
  },
  subsprites: [
    { x: -16, y: -16, shape: "64x64", tileOffset: 0, priority: 2 },
    { x: -16, y: 48, shape: "64x32", tileOffset: 64, priority: 2 },
    { x: 48, y: -16, shape: "32x64", tileOffset: 96, priority: 2 },
    { x: 48, y: 48, shape: "32x32", tileOffset: 128, priority: 2 },
  ],
  taskStages: {
    step1: { start: 45, end: 53 }, step2: { start: 54, end: 99 },
    step3: { start: 100, end: 109 }, step4: { start: 110, end: 148 },
    parentSprite: { start: 45, end: 146 },
  },
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(extracted, null, 2)}\n`);
console.log(`wrote ${out}`);
