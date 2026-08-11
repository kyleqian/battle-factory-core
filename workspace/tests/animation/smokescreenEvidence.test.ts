import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const smoke = readFileSync("reference/pokeemerald/src/battle_anim_smokescreen.c", "utf8");
const effects = readFileSync("reference/pokeemerald/src/battle_anim_effects_1.c", "utf8");
const effects3 = readFileSync("reference/pokeemerald/src/battle_anim_effects_3.c", "utf8");
const block = (start: string, end: string) => scripts.slice(scripts.indexOf(`${start}:`), scripts.indexOf(`${end}:`, scripts.indexOf(`${start}:`) + start.length));

describe("asset:ANIM_TAG_BLACK_BALL source audit", () => {
  it("pins Smokescreen's complete Black Ball, impact, smoke, and cleanup topology", () => {
    const script = block("Move_SMOKESCREEN", "Move_CONVERSION");
    for (const text of ["loadspritegfx ANIM_TAG_BLACK_SMOKE", "loadspritegfx ANIM_TAG_BLACK_BALL", "gBlackBallSpriteTemplate", "AnimTask_SmokescreenImpact", "SE_M_DOUBLE_TEAM", "SE_M_SAND_ATTACK", "gBlackSmokeSpriteTemplate", "waitforvisualfinish"]) expect(script).toContain(text);
    expect(script.match(/createsprite gBlackSmokeSpriteTemplate/g)).toHaveLength(12);
    // Unlike several neighboring impact moves, Emerald's actual Smokescreen
    // script never creates a battler shake task. This negative assertion keeps
    // the audit bounded to the immediate next label instead of accidentally
    // finding an unrelated ShakeMon2 in the later Move_BUBBLE block.
    expect(script).not.toContain("AnimTask_ShakeMon2");
    for (const text of ["sSmokescreenImpactSpriteSheet", "sSmokescreenImpactSpritePalette", "CreateInvisibleSpriteWithCallback(SpriteCB_SmokescreenImpactMain)", "CreateSprite(&sSmokescreenImpactSpriteTemplate", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag", "AnimBlackSmoke_Step"]) expect(`${smoke}\n${effects3}`).toContain(text);
  });

  it("keeps Octazooka unsupported: its shared Black Ball body is distinct", () => {
    const script = block("Move_OCTAZOOKA", "Move_MIST");
    for (const text of ["loadspritegfx ANIM_TAG_GRAY_SMOKE", "gOctazookaBallSpriteTemplate", "gOctazookaSmokeSpriteTemplate", "SE_M_MEGA_KICK2", "SE_M_SELF_DESTRUCT"]) expect(script).toContain(text);
    expect(script.match(/createsprite gOctazookaSmokeSpriteTemplate/g)).toHaveLength(4);
    for (const text of ["TranslateAnimSpriteToTargetMonLocation", "AnimSpriteOnMonPos", "ANIMCMD_FRAME(0, 3)", "ANIMCMD_FRAME(64, 3)"]) expect(effects).toContain(text);
  });
});
