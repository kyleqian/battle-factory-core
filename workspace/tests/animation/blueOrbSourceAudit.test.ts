import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const effects = readFileSync("reference/pokeemerald/src/battle_anim_effects_3.c", "utf8");
const factory = readFileSync("reference/pokeemerald/src/battle_factory.c", "utf8");
const frontierMons = readFileSync("reference/pokeemerald/include/constants/battle_frontier_mons.h", "utf8");
const block = (start: string, end: string) => scripts.slice(scripts.indexOf(`${start}:`), scripts.indexOf(`${end}:`, scripts.indexOf(`${start}:`) + start.length));

describe("asset:ANIM_TAG_BLUE_ORB source audit", () => {
  it("pins Reversal's complete orb, blend, strike, and damage-shake topology", () => {
    const reversal = block("Move_REVERSAL", "Move_PURSUIT");
    for (const text of ["loadspritegfx ANIM_TAG_BLUE_ORB", "loadspritegfx ANIM_TAG_HANDS_AND_FEET", "loadspritegfx ANIM_TAG_IMPACT", "complex_palette_blend", "blend_color_cycle", "SE_M_DETECT", "SE_M_REVERSAL", "SE_M_VITAL_THROW2", "gReversalOrbSpriteTemplate", "gHorizontalLungeSpriteTemplate", "create_fist_sprite", "create_basic_hitsplat_sprite", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "waitforvisualfinish"]) expect(reversal).toContain(text);
    expect(reversal.match(/createsprite gReversalOrbSpriteTemplate/g)).toHaveLength(6);
    for (const text of ["const struct SpriteTemplate gReversalOrbSpriteTemplate", "ANIM_TAG_BLUE_ORB", "static void AnimReversalOrb", "static void AnimReversalOrb_Step", "Sin(sprite->data[1]", "Cos(sprite->data[1]", "DestroyAnimSprite(sprite)"]) expect(effects).toContain(text);
  });

  it("requires the same challenge-2 Level-50 range for Reversal's complete legal parties", () => {
    expect(factory).toContain("{FRONTIER_MON_DELCATTY_2, FRONTIER_MON_CLOYSTER_2}, // 267 - 371");
    for (const text of [
      "#define FRONTIER_MON_ONIX           156",
      "#define FRONTIER_MON_DELCATTY_2     267",
      "#define FRONTIER_MON_SABLEYE_2      268",
      "#define FRONTIER_MON_LICKITUNG_2    269",
      "#define FRONTIER_MON_VIGOROTH_2     326",
      "#define FRONTIER_MON_LUNATONE_2     327",
      "#define FRONTIER_MON_SOLROCK_2      328",
    ]) expect(frontierMons).toContain(text);
  });

  it("keeps Swallow unsupported: it shares BLUE_ORB but has turn-dependent healing topology", () => {
    const swallow = block("Move_SWALLOW", "Move_TRANSFORM");
    for (const text of ["loadspritegfx ANIM_TAG_BLUE_ORB", "loadspritegfx ANIM_TAG_BLUE_STAR", "AnimTask_SwallowDeformMon", "AnimTask_ShakeMon2", "SE_M_TAKE_DOWN", "SE_M_SPIT_UP", "call SwallowEffect", "jumpifmoveturn 2, SwallowGood", "jumpifmoveturn 3, SwallowBest", "call HealingEffect"]) expect(swallow).toContain(text);
    expect(block("SwallowEffect", "SwallowGood").match(/createsprite gSwallowBlueOrbSpriteTemplate/g)).toHaveLength(5);
    for (const text of ["const struct SpriteTemplate gSwallowBlueOrbSpriteTemplate", "AnimSwallowBlueOrb", "gSwallowDeformMonAffineAnimCmds", "void AnimTask_SwallowDeformMon", "DestroyAnimVisualTask"]) expect(effects).toContain(text);
  });
});
