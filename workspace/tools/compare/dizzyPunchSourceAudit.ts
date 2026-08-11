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

const dizzy = block("Move_DIZZY_PUNCH", "DizzyPunchLunge");
const dizzyLunge = block("DizzyPunchLunge", "Move_FIRE_SPIN");
const teeter = block("Move_TEETER_DANCE", "Move_MUD_SPORT");
const signal = block("Move_SIGNAL_BEAM", "SignalBeamOrbs");
const signalOrbs = block("SignalBeamOrbs", "Move_ABSORB");

for (const text of [
  "loadspritegfx ANIM_TAG_DUCK",
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "loadspritegfx ANIM_TAG_IMPACT",
  "create_basic_hitsplat_sprite ANIM_TARGET, 4, x=16, y=0, relative_to=ANIM_TARGET, animation=1",
  "create_basic_hitsplat_sprite ANIM_TARGET, 4, x=-16, y=-16, relative_to=ANIM_TARGET, animation=1",
  "playsewithpan SE_M_COMET_PUNCH, SOUND_PAN_TARGET",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
]) requireText(dizzy, text);
if ((dizzy.match(/gDizzyPunchDuckSpriteTemplate/g) ?? []).length !== 12) {
  throw new Error("DIZZY_PUNCH must contain exactly twelve literal ducks");
}
for (const forbidden of [
  "ANIM_TAG_WHITE_FEATHER",
  "gFallingFeatherSpriteTemplate",
]) {
  if (dizzy.includes(forbidden)) {
    throw new Error(`DIZZY_PUNCH unexpectedly contains ${forbidden}`);
  }
}
for (const text of [
  "gHorizontalLungeSpriteTemplate",
  "AnimTask_ShakeMon2",
]) requireText(dizzyLunge, text);

for (const text of [
  "AnimTask_TeeterDanceMovement",
  "gFastFlyingMusicNotesSpriteTemplate",
  "SE_M_TEETER_DANCE",
]) requireText(teeter, text);
if ((teeter.match(/gFastFlyingMusicNotesSpriteTemplate/g) ?? []).length !== 5) {
  throw new Error("TEETER_DANCE must retain five independent music notes");
}

for (const text of [
  "ANIM_TAG_GLOWY_RED_ORB",
  "ANIM_TAG_GLOWY_GREEN_ORB",
  "AnimTask_StartSinAnimTimer",
  "complex_palette_blend",
]) requireText(signal, text);
for (const text of [
  "gSignalBeamRedOrbSpriteTemplate",
  "gSignalBeamGreenOrbSpriteTemplate",
]) requireText(signalOrbs, text);

console.log(JSON.stringify({
  move: "MOVE_DIZZY_PUNCH",
  literalDuckCount: 12,
  fallingFeatherCount: 0,
  siblings: {
    MOVE_TEETER_DANCE:
      "distinct movement plus five fast music-note paths and sounds",
    MOVE_SIGNAL_BEAM:
      "distinct red/green orb stream, sinus timer, shakes, pan sweep, and target palette cycle",
  },
}));
