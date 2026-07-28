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

const headbutt = block("Move_HEADBUTT", "Move_HORN_ATTACK");
const hornAttack = block("Move_HORN_ATTACK", "Move_FURY_ATTACK");
const hornDrill = block("Move_HORN_DRILL", "Move_THRASH");
const drillPeck = block("Move_DRILL_PECK", "Move_WATERFALL");

for (const text of [
  "loadspritegfx ANIM_TAG_IMPACT",
  "createsprite gBowMonSpriteTemplate, ANIM_ATTACKER, 2, 0",
  "createsprite gBowMonSpriteTemplate, ANIM_ATTACKER, 2, 1",
  "createsprite gBowMonSpriteTemplate, ANIM_ATTACKER, 2, 2",
  "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_ATTACKER, 2, 0, 4, 1",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 6, 1",
  "create_flashing_hitsplat_sprite ANIM_TARGET, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
  "playsewithpan SE_M_HEADBUTT, SOUND_PAN_ATTACKER",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
]) requireText(headbutt, text);

if ((headbutt.match(/gBowMonSpriteTemplate/g) ?? []).length !== 3) {
  throw new Error("HEADBUTT must contain exactly three BowMon phases");
}
for (const forbidden of [
  "ANIM_TAG_HORN_HIT",
  "gHornHitSpriteTemplate",
  "AnimTask_RotateMonSpriteToSide",
  "gFuryAttackNeedleSpriteTemplate",
]) {
  if (headbutt.includes(forbidden)) {
    throw new Error(`HEADBUTT unexpectedly contains ${forbidden}`);
  }
}

for (const text of ["ANIM_TAG_HORN_HIT", "gHornHitSpriteTemplate"]) {
  requireText(hornAttack, text);
}
for (const text of [
  "ANIM_TAG_HORN_HIT",
  "fadetobg BG_DRILL",
  "AnimTask_StartSlidingBg",
  "AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 10, 0, 40, 1",
]) requireText(hornDrill, text);
for (const text of [
  "ANIM_TAG_WHIRLWIND_LINES",
  "AnimTask_DrillPeckHitSplats",
  "AnimTask_ShakeMon2",
]) requireText(drillPeck, text);

console.log(JSON.stringify({
  move: "MOVE_HEADBUTT",
  bowPhases: [0, 1, 2],
  siblings: {
    MOVE_HORN_ATTACK: "adds ANIM_TAG_HORN_HIT and gHornHitSpriteTemplate",
    MOVE_HORN_DRILL:
      "adds drill BG, sliding BG, horn sprite, long dual shakes, and repeated impacts",
    MOVE_DRILL_PECK:
      "adds whirlwind assets, a hitsplat task, looped sound, and ShakeMon2",
  },
}));
