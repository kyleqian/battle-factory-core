import { readFileSync } from "node:fs";

const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const effects = readFileSync("reference/pokeemerald/src/battle_anim_effects_2.c", "utf8");
const movement = readFileSync("reference/pokeemerald/src/battle_anim_mon_movement.c", "utf8");
const flying = readFileSync("reference/pokeemerald/src/battle_anim_flying.c", "utf8");
function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`); const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}
function need(source: string, text: string): void { if (!source.includes(text)) throw new Error(`missing source text: ${text}`); }

const astonish = block(scripts, "Move_ASTONISH", "Move_SEISMIC_TOSS");
const fakeOut = block(scripts, "Move_FAKE_OUT", "Move_SCARY_FACE");
const trick = block(scripts, "Move_TRICK", "Move_ASTONISH");
const stretch = effects.slice(effects.indexOf("void AnimTask_StretchTargetUp"), effects.indexOf("void AnimTask_StretchAttackerUp"));
for (const text of [
  "loadspritegfx ANIM_TAG_SWEAT_BEAD", "playsewithpan SE_M_ENCORE, SOUND_PAN_ATTACKER",
  "createsprite gHorizontalLungeSpriteTemplate, ANIM_ATTACKER, 2, 4, 6", "delay 25",
  "createsprite gSprayWaterDropletSpriteTemplate, ANIM_TARGET, 5, 0, 1",
  "playsewithpan SE_M_SKETCH, SOUND_PAN_TARGET",
  "createsprite gSprayWaterDropletSpriteTemplate, ANIM_TARGET, 5, 1, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 5, 1",
  "createvisualtask AnimTask_StretchTargetUp, 3", "waitforvisualfinish",
]) need(astonish, text);
for (const text of ["PrepareAffineAnimInTaskData", "sAffineAnims_StretchBattlerUp", "gSprites[spriteId].x2 = 4", "gSprites[spriteId].x2 = -gSprites[spriteId].x2", "RunAffineAnimFromTaskData", "gSprites[spriteId].x2 = 0", "gSprites[spriteId].y2 = 0", "DestroyAnimVisualTask(taskId)"]) need(stretch, text);
for (const text of ["gHorizontalLungeSpriteTemplate", "callback = DoHorizontalLunge"]) need(movement, text);
for (const text of ["gSprayWaterDropletSpriteTemplate", "tileTag = ANIM_TAG_SWEAT_BEAD", "callback = AnimSprayWaterDroplet"]) need(flying, text);
for (const text of ["AnimTask_FakeOut", "AnimTask_ShakeMon2", "AnimTask_StretchTargetUp", "simple_palette_blend selector=F_PAL_BG"]) need(fakeOut, text);
for (const text of ["ANIM_TAG_ITEM_BAG", "ANIM_TAG_SPEED_DUST", "create_trick_bag_sprite", "AnimTask_StretchTargetUp", "AnimTask_StretchAttackerUp", "gHydroCannonBeamSpriteTemplate"]) need(trick, text);

console.log(JSON.stringify({
  component: "task:AnimTask_StretchTargetUp", representative: "MOVE_ASTONISH",
  sourceModel: "two 10-frame affine legs (10/-13 then -10/13), x2 alternates ±4 after setup, then the task clears x2/y2 and destroys itself",
  blocker: "Astonish also owns a HorizontalLunge sprite, two SWEAT_BEAD droplet callbacks, ShakeMon2, two sounds, and the script wait; StretchTargetUp alone cannot satisfy the move window",
  siblings: {
    MOVE_FAKE_OUT: "adds AnimTask_FakeOut and a post-body F_PAL_BG white blend",
    MOVE_TRICK: "adds ITEM_BAG/SPEED_DUST assets, two bag affine programs, StretchAttackerUp, five DOUBLE_TEAM cues, and Hydro Cannon beams",
  },
}));
