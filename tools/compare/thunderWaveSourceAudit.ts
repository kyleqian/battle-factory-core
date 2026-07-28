import { readFileSync } from "node:fs";

const source = readFileSync(
  "reference/pokeemerald/data/battle_anim_scripts.s",
  "utf8",
);

function block(label: string, nextLabel: string): string {
  const start = source.indexOf(`${label}:`);
  const end = source.indexOf(`${nextLabel}:`, start + label.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${label}/${nextLabel}`);
  return source.slice(start, end);
}

function requireText(body: string, text: string): void {
  if (!body.includes(text)) throw new Error(`missing source text: ${text}`);
}

const thunderWave = block("Move_THUNDER_WAVE", "Move_BEAT_UP");
const thunderbolt = block("Move_THUNDERBOLT", "Move_THUNDER_WAVE");
const zapCannon = block("Move_ZAP_CANNON", "Move_STEEL_WING");

for (const text of [
  "loadspritegfx ANIM_TAG_SPARK",
  "loadspritegfx ANIM_TAG_SPARK_2",
  "loadspritegfx ANIM_TAG_SPARK_H",
  "createvisualtask AnimTask_ElectricBolt, 5, 0, -48, 0",
  "playsewithpan SE_M_THUNDER_WAVE, SOUND_PAN_TARGET",
  "loopsewithpan SE_M_THUNDERBOLT2, SOUND_PAN_TARGET, 10, 4",
  "createsprite gThunderWaveSpriteTemplate, ANIM_TARGET, 2, -16, -16",
  "createsprite gThunderWaveSpriteTemplate, ANIM_TARGET, 2, -16, 0",
  "createsprite gThunderWaveSpriteTemplate, ANIM_TARGET, 2, -16, 16",
]) requireText(thunderWave, text);

for (const text of [
  "ANIM_TAG_SHOCK_3",
  "AnimTask_ElectricBolt, 5, 24, -52, 0",
  "AnimTask_ElectricBolt, 5, -24, -52, 0",
  "AnimTask_ElectricBolt, 5, 0, -60, 1",
  "gThunderboltOrbSpriteTemplate",
  "gSparkElectricityFlashingSpriteTemplate",
  "F_PAL_TARGET",
  "SE_M_HYPER_BEAM",
]) requireText(thunderbolt, text);

for (const text of [
  "ANIM_TAG_BLACK_BALL_2",
  "gZapCannonBallSpriteTemplate",
  "gZapCannonSparkSpriteTemplate",
  "AnimTask_ShakeMon2",
  "ElectricityEffect",
]) requireText(zapCannon, text);

console.log(JSON.stringify({
  move: "MOVE_THUNDER_WAVE",
  representative: "ANIM_TAG_SPARK / AnimTask_ElectricBolt",
  siblings: {
    MOVE_THUNDERBOLT:
      "unsupported: three differently placed ElectricBolt tasks, SHOCK_3 orb, eight affine SPARK_2 sprites, target palette body, and distinct sounds",
    MOVE_ZAP_CANNON:
      "unsupported: BLACK_BALL_2 projectile, eight orbiting ZapCannon sparks, ShakeMon2, ElectricityEffect, and distinct pan sequence",
  },
}));
