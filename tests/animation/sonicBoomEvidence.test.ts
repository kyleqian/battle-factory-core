import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const effects1 = readFileSync("reference/pokeemerald/src/battle_anim_effects_1.c", "utf8");
const effects2 = readFileSync("reference/pokeemerald/src/battle_anim_effects_2.c", "utf8");
const animationData = readFileSync("reference/pokeemerald/src/data/battle_anim.h", "utf8");
const block = (start: string, end: string) => scripts.slice(
  scripts.indexOf(`${start}:`), scripts.indexOf(`${end}:`, scripts.indexOf(`${start}:`) + start.length),
);
const sonic = block("Move_SONIC_BOOM", "Move_THUNDER_SHOCK");
const airCutter = block("Move_AIR_CUTTER", "Move_ODOR_SLEUTH");

describe("asset:ANIM_TAG_AIR_WAVE source audit", () => {
  it("pins Sonic Boom's complete source topology and three projectile calls", () => {
    expect(sonic.match(/call SonicBoomProjectile/g)).toHaveLength(3);
    for (const text of [
      "loadspritegfx ANIM_TAG_AIR_WAVE",
      "loadspritegfx ANIM_TAG_IMPACT",
      "monbg ANIM_DEF_PARTNER",
      "splitbgprio ANIM_TARGET",
      "setalpha 12, 8",
      "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 3, 0, 10, 1",
      "call SonicBoomHit",
      "clearmonbg ANIM_DEF_PARTNER",
      "blendoff",
      "createsprite gSonicBoomSpriteTemplate, ANIM_TARGET, 2, 16, 0, 0, 0, 15",
      "playsewithpan SE_M_RAZOR_WIND2, SOUND_PAN_ATTACKER",
      "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=2",
    ]) expect(sonic).toContain(text);
    // The helper body is written once: its delay executes three times via
    // the three calls above; SonicBoomHit contributes the second literal.
    expect(sonic.match(/delay 4/g)).toHaveLength(2);
    for (const text of [
      "gSonicBoomSpriteTemplate", "ANIM_TAG_AIR_WAVE", "gOamData_AffineDouble_ObjBlend_32x16",
      "AnimSonicBoomProjectile", "TrySetSpriteRotScale", "StartAnimLinearTranslation",
    ]) expect(effects2).toContain(text);
    for (const text of [
      "gBattleAnimSpriteGfx_AirWave", "gBattleAnimSpritePal_AirWave", "ANIM_TAG_AIR_WAVE",
    ]) expect(animationData).toContain(text);
  });

  it("keeps Air Cutter unsupported because its shared asset has a distinct task/body", () => {
    for (const text of [
      "loadspritegfx ANIM_TAG_AIR_WAVE", "loadspritegfx ANIM_TAG_CUT",
      "createvisualtask AnimTask_AirCutterProjectile, 2, 32, -24, 6 * 256, 2, 128",
      "createsprite gAirCutterSliceSpriteTemplate", "AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
      "AnimTask_ShakeMon2, 2, ANIM_DEF_PARTNER, 2, 0, 8, 1",
    ]) expect(airCutter).toContain(text);
    for (const text of ["gAirCutterSliceSpriteTemplate", "AnimAirCutterSlice"])
      expect(effects1).toContain(text);
    expect(effects2).toContain("void AnimTask_AirCutterProjectile(u8 taskId)");
  });
});
