import { readFileSync } from "node:fs";

const script = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const fire = readFileSync("reference/pokeemerald/src/battle_anim_fire.c", "utf8");
const movement = readFileSync("reference/pokeemerald/src/battle_anim_mon_movement.c", "utf8");
const mons = readFileSync("reference/pokeemerald/src/battle_anim_mons.c", "utf8");
const frontierMons = readFileSync("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h", "utf8");
const constants = readFileSync("reference/pokeemerald/include/constants/battle_frontier_mons.h", "utf8");

const body = (script.match(/Move_FLAME_WHEEL:\n([\s\S]*?)\n\nFlameWheel1:/) ?? [])[1] ?? "";
const requiredBody = [
  "loadspritegfx ANIM_TAG_SMALL_EMBER",
  "monbg ANIM_DEF_PARTNER",
  "splitbgprio_foes ANIM_TARGET",
  "createsprite gFireSpiralOutwardSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 56, 0",
  "createsprite gFireSpiralOutwardSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 56, 24",
  "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, 24, 0, 0, 6",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 8, 1",
  "createvisualtask AnimTask_BlendMonInAndOut, 3, ANIM_TARGET, RGB_RED, 12, 1, 1",
  "call FireSpreadEffect",
  "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 9",
  "clearmonbg ANIM_DEF_PARTNER",
];
for (const row of requiredBody) {
  if (!body.includes(row)) throw new Error(`FLAME WHEEL script row missing: ${row}`);
}
if ((body.match(/gFireSpiralOutwardSpriteTemplate/g) ?? []).length !== 7) {
  throw new Error("FLAME WHEEL outward-spiral spawn count drifted");
}

const componentRows = [
  [fire, "const struct SpriteTemplate gFireSpiralOutwardSpriteTemplate"],
  [fire, ".callback = AnimFireSpiralOutward"],
  [fire, "static void AnimFireSpiralOutward_Step2(struct Sprite *sprite)"],
  [fire, "sprite->data[1] = (sprite->data[1] + 10) & 0xFF;"],
  [fire, "sprite->data[2] += 0xD0;"],
  [movement, "const struct SpriteTemplate gSlideMonToOffsetSpriteTemplate"],
  [movement, "const struct SpriteTemplate gSlideMonToOriginalPosSpriteTemplate"],
  [movement, "void AnimTask_ShakeMon(u8 taskId)"],
  [mons, "void AnimTask_BlendMonInAndOut(u8 task)"],
  [mons, "static void AnimTask_BlendMonInAndOut_Step(u8 taskId)"],
] as const;
for (const [source, row] of componentRows) {
  if (!source.includes(row)) throw new Error(`FLAME WHEEL component row missing: ${row}`);
}

const spread = (script.match(/FireSpreadEffect:\n([\s\S]*?)\n\treturn/) ?? [])[1] ?? "";
if ((spread.match(/gFireSpreadSpriteTemplate/g) ?? []).length !== 7) {
  throw new Error("FireSpreadEffect sprite count drifted");
}
if (!fire.includes("static void AnimFireSpread(struct Sprite *sprite)")) {
  throw new Error("AnimFireSpread body missing");
}

if (!constants.includes("#define FRONTIER_MON_QUILAVA_1      181")) {
  throw new Error("FRONTIER_MON_QUILAVA_1 index drifted");
}
const carrier = (frontierMons.match(/\[FRONTIER_MON_QUILAVA_1\] = \{([\s\S]*?)\n    \},/) ?? [])[1] ?? "";
for (const row of [".species = SPECIES_QUILAVA", "MOVE_FLAME_WHEEL", "NATURE_DOCILE"]) {
  if (!carrier.includes(row)) throw new Error(`Quilava carrier row missing: ${row}`);
}

console.log(
  "Move_FLAME_WHEEL 0x082c9a66..0x082c9b60: set 181 Quilava carrier, "
  + "7 outward spirals, slide out/back, ShakeMon, BlendMonInAndOut, and 7 FireSpread sprites pinned",
);
