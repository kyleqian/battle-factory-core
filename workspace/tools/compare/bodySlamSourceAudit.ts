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

const bodySlam = block("Move_BODY_SLAM", "Move_SUPERSONIC");
const flatter = block("Move_FLATTER", "CreateFlatterConfetti");
const returnMove = block("Move_RETURN", "ReturnWeak");
const weatherBall = block("Move_WEATHER_BALL", "WeatherBallNormal");

for (const text of [
  "loadspritegfx ANIM_TAG_IMPACT",
  "createsprite gVerticalDipSpriteTemplate, ANIM_ATTACKER, 2, 6, 1, ANIM_ATTACKER",
  "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, 26, 0, 0, 5",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 4, x=-10, y=0, relative_to=ANIM_TARGET, animation=0",
  "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 1, -28, 0, 0, 3",
  "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 4, 0, 12, 1",
  "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 6",
  "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 1, 0, 6",
  "playsewithpan SE_M_TAKE_DOWN, SOUND_PAN_ATTACKER",
  "loopsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET, 10, 2",
]) requireText(bodySlam, text);

for (const text of [
  "ANIM_TAG_SPOTLIGHT",
  "ANIM_TAG_CONFETTI",
  "AnimTask_CreateSpotlight",
  "AnimTask_HardwarePaletteFade",
  "gFlatterSpotlightSpriteTemplate",
  "gVerticalDipSpriteTemplate",
  "SoundTask_PlaySE1WithPanning",
]) requireText(flatter, text);

for (const text of [
  "AnimTask_GetReturnPowerLevel",
  "jumpreteq 0, ReturnWeak",
  "jumpreteq 1, ReturnMedium",
  "jumpreteq 2, ReturnStrong",
  "jumpreteq 3, ReturnStrongest",
]) requireText(returnMove, text);

for (const text of [
  "ANIM_TAG_WEATHER_BALL",
  "gVerticalDipSpriteTemplate",
  "gWeatherBallUpSpriteTemplate",
  "AnimTask_GetWeather",
]) requireText(weatherBall, text);

console.log(JSON.stringify({
  move: "MOVE_BODY_SLAM",
  representative: "gVerticalDipSpriteTemplate",
  siblings: {
    MOVE_RETURN:
      "unsupported: four friendship-power branches with distinct dips, lunges, hitsplats, shakes, sounds, and timing",
    MOVE_FLATTER:
      "unsupported: spotlight lifecycle, hardware palette fades, two target dips, 38 confetti sprites, and distinct sound tasks",
    MOVE_WEATHER_BALL:
      "outside Factory and unsupported: weather selector plus five projectile/impact bodies",
  },
}));
