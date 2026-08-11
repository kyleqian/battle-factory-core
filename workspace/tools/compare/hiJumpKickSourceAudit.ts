import { readFileSync } from "node:fs";

const script = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const fight = readFileSync("reference/pokeemerald/src/battle_anim_fight.c", "utf8");
const frontierMons = readFileSync("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h", "utf8");
const constants = readFileSync("reference/pokeemerald/include/constants/battle_frontier_mons.h", "utf8");

const block = (script.match(/Move_HI_JUMP_KICK:\n([\s\S]*?)\n\nMove_DOUBLE_KICK:/) ?? [])[1] ?? "";
const requiredScriptRows = [
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "setalpha 12, 8",
  "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, -24, 0, 0, 8",
  "delay 10",
  "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 3",
  "createsprite gJumpKickSpriteTemplate, ANIM_ATTACKER, 2, -16, 8, 0, 0, 10, ANIM_TARGET, 1, 1",
  "playsewithpan SE_M_JUMP_KICK, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 1, -28, 0, 0, 3",
  "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 3, 0, 11, 1",
  "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 1, 0, 6",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
];
const requiredFightRows = [
  "const struct SpriteTemplate gJumpKickSpriteTemplate",
  ".tileTag = ANIM_TAG_HANDS_AND_FEET",
  ".callback = AnimJumpKick",
  "static void AnimJumpKick(struct Sprite *sprite)",
  "AnimSlideHandOrFootToTarget(sprite);",
  "AnimTravelDiagonally(sprite);",
];

for (const row of requiredScriptRows) {
  if (!block.includes(row)) throw new Error(`HJK script row missing: ${row}`);
}
for (const row of requiredFightRows) {
  if (!fight.includes(row)) throw new Error(`HJK fight source row missing: ${row}`);
}
if (!constants.includes("#define FRONTIER_MON_MEDICHAM_1     373")) {
  throw new Error("FRONTIER_MON_MEDICHAM_1 index drifted");
}
const carrier = (frontierMons.match(/\[FRONTIER_MON_MEDICHAM_1\] = \{([\s\S]*?)\n    \},/) ?? [])[1] ?? "";
if (!carrier.includes(".species = SPECIES_MEDICHAM")
  || !carrier.includes("MOVE_HI_JUMP_KICK")
  || !carrier.includes("NATURE_DOCILE")) {
  throw new Error("Medicham carrier source identity drifted");
}

console.log(
  "set 373/FRONTIER_MON_MEDICHAM_1 is a source-proven legal "
  + "Level-50 HI JUMP KICK carrier; source body and sprite callback are pinned",
);
