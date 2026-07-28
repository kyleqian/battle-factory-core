import { readFileSync } from "node:fs";

const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const utility = readFileSync("reference/pokeemerald/src/battle_anim_utility_funcs.c", "utf8");
function block(start: string, end: string): string {
  const from = scripts.indexOf(`${start}:`); const to = scripts.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return scripts.slice(from, to);
}
function need(source: string, text: string): void {
  if (!source.includes(text)) throw new Error(`missing source text: ${text}`);
}
const fakeTears = block("Move_FAKE_TEARS", "Move_AIR_CUTTER");
const heatWave = block("Move_HEAT_WAVE", "Move_HAIL");
const lusterPurge = block("Move_LUSTER_PURGE", "Move_MIST_BALL");
const particleStart = utility.indexOf("void AnimTask_BlendParticle");
const particleEnd = utility.indexOf("void StartBlendAnimSpriteColor", particleStart);
if (particleStart < 0 || particleEnd < 0) throw new Error("missing BlendParticle source");
const particle = utility.slice(particleStart, particleEnd);
for (const text of [
  "loadspritegfx ANIM_TAG_SMALL_BUBBLES", "loadspritegfx ANIM_TAG_THOUGHT_BUBBLE",
  "loadspritegfx ANIM_TAG_MUSIC_NOTES",
  "createvisualtask AnimTask_BlendParticle, 5, ANIM_TAG_SMALL_BUBBLES, 0, 4, 4, RGB(12, 11, 31)",
  "waitforvisualfinish", "createvisualtask AnimTask_RockMonBackAndForth",
]) need(fakeTears, text);
for (const text of ["IndexOfSpritePaletteTag(gBattleAnimArgs[0])", "1 << (paletteIndex + 16)", "StartBlendAnimSpriteColor(taskId, selectedPalettes)"]) need(particle, text);
for (const text of ["ANIM_TAG_FLYING_DIRT", "AnimTask_LoadSandstormBackground", "AnimTask_BlendBackground", "AnimTask_MoveHeatWaveTargets", "gFlyingSandCrescentSpriteTemplate"]) need(heatWave, text);
for (const text of ["fadetobg BG_PSYCHIC", "AnimTask_FadeScreenToWhite", "gLusterPurgeCircleSpriteTemplate", "AnimTask_BlendBattleAnimPalExclude", "ANIM_TAG_WHITE_CIRCLE_OF_LIGHT", "ANIM_TAG_IMPACT", "create_random_pos_hitsplat_sprite", "AnimTask_HorizontalShake"]) need(lusterPurge, text);
console.log(JSON.stringify({
  component: "task:AnimTask_BlendParticle",
  representative: "MOVE_FAKE_TEARS",
  sourceModel: "SMALL_BUBBLES OBJ palette tag; the 0-delay 4-to-4 call blends in its creation dispatch then destroys before post-frame task RAM",
  siblings: {
    MOVE_HEAT_WAVE: "FLYING_DIRT tag plus sandstorm/background blend, moving both targets, pan sweep, and four crescent sprites",
    MOVE_LUSTER_PURGE: "psychic/white background pipeline, luster circle, two distinct particle tags, random hitsplats/sounds, target shake, and restoration",
  },
}));
