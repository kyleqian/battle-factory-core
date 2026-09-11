/** Reproducible source extraction for MOVE_AIR_CUTTER's reducer assets. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/air-cutter.json");
const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const source = (path: string): string => readFileSync(join(root, "reference/pokeemerald", path), "utf8");

const scripts = source("data/battle_anim_scripts.s");
const start = scripts.indexOf("Move_AIR_CUTTER:\n");
const end = scripts.indexOf("Move_ODOR_SLEUTH:\n", start);
if (start < 0 || end < 0) throw new Error("Move_AIR_CUTTER source body missing");
const body = scripts.slice(start, end);
for (const token of [
  "loadspritegfx ANIM_TAG_AIR_WAVE", "loadspritegfx ANIM_TAG_CUT", "loadspritegfx ANIM_TAG_IMPACT",
  "AnimTask_AirCutterProjectile", "gAirCutterSliceSpriteTemplate", "AnimTask_ShakeMon2",
]) if (!body.includes(token)) throw new Error(`Move_AIR_CUTTER source drifted: ${token}`);
const effects1 = source("src/battle_anim_effects_1.c");
const effects2 = source("src/battle_anim_effects_2.c");
const registry = source("src/data/battle_anim.h");
for (const token of [
  "gAirCutterSliceSpriteTemplate", "AnimAirCutterSlice", "AnimSlice_Step",
]) if (!effects1.includes(token)) throw new Error(`Air Cutter slice source drifted: ${token}`);
for (const token of [
  "gAirWaveProjectileSpriteTemplate", "AnimAirWaveProjectile", "AirCutterProjectileStep1",
  "AirCutterProjectileStep2", "AnimTask_AirCutterProjectile",
]) if (!effects2.includes(token)) throw new Error(`Air Cutter projectile source drifted: ${token}`);
for (const token of [
  "{gBattleAnimSpriteGfx_AirWave, 0x0100, ANIM_TAG_AIR_WAVE}",
  "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}",
  "{gBattleAnimSpriteGfx_Cut, 0x0800, ANIM_TAG_CUT}",
]) if (!registry.includes(token)) throw new Error(`Air Cutter resource registry drifted: ${token}`);

const extracted = {
  source: {
    script: "data/battle_anim_scripts.s Move_AIR_CUTTER",
    scriptSha256: sha256(body),
    projectile: "src/battle_anim_effects_2.c gAirWaveProjectileSpriteTemplate / AnimTask_AirCutterProjectile",
    slice: "src/battle_anim_effects_1.c gAirCutterSliceSpriteTemplate / AnimAirCutterSlice",
    airWaveIdentity: "graphics/battle_anims/sprites/air_wave.png; shared with MOVE_SONIC_BOOM as an asset control only",
  },
  resources: {
    airWave: { tag: 10003, tileBytes: 256, graphics: "gBattleAnimSpriteGfx_AirWave", palette: "gBattleAnimSpritePal_AirWave" },
    cut: { tag: 10138, tileBytes: 2048, graphics: "gBattleAnimSpriteGfx_Cut", palette: "gBattleAnimSpritePal_Impact" },
    impact: { tag: 10135, tileBytes: 512, graphics: "gBattleAnimSpriteGfx_Impact", palette: "gBattleAnimSpritePal_Impact" },
  },
  templates: {
    airWaveProjectile: { symbol: "gAirWaveProjectileSpriteTemplate", shape: "32x16", affine: false, objMode: "objblend", callback: "AnimAirWaveProjectile" },
    airCutterSlice: { symbol: "gAirCutterSliceSpriteTemplate", shape: "32x32", affine: false, objMode: "objblend", callback: "AnimAirCutterSlice" },
  },
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(extracted, null, 2)}\n`);
console.log(`wrote ${out}`);
