import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
const movement = read(
  "reference/pokeemerald/src/battle_anim_mon_movement.c",
);
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const punch = block(scripts, "Move_MEGA_PUNCH", "Move_MEGA_KICK");
const kick = block(scripts, "Move_MEGA_KICK", "Move_COMET_PUNCH");
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_CACTURNE_1]"),
  mons.indexOf("[FRONTIER_MON_CACTURNE_1]") + 500,
);
const kickCarrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_SUDOWOODO_2]"),
  mons.indexOf("[FRONTIER_MON_SUDOWOODO_2]") + 500,
);
const punchEntry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_MEGA_PUNCH",
);
const kickEntry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_MEGA_KICK",
);
const required = [
  "loadspritegfx ANIM_TAG_IMPACT",
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "monbg ANIM_TARGET",
  "simple_palette_blend selector=F_PAL_BG",
  "setalpha 12, 8",
  "playsewithpan SE_M_MEGA_KICK, SOUND_PAN_TARGET",
  "gMegaPunchKickSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 0, 50",
  "AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 2, 0, 7, RGB_WHITE",
  "call SetImpactBackground",
  "create_basic_hitsplat_sprite",
  "AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 22, 1",
  "complex_palette_blend",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "clearmonbg ANIM_TARGET",
  "blendoff",
  "restorebg",
  "waitbgfadein",
];
const kickRequired = [
  "loadspritegfx ANIM_TAG_IMPACT",
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "monbg ANIM_TARGET",
  "simple_palette_blend selector=F_PAL_BG",
  "setalpha 12, 8",
  "playsewithpan SE_M_MEGA_KICK, SOUND_PAN_TARGET",
  "gMegaPunchKickSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 1, 50",
  "AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 2, 0, 7, RGB_WHITE",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET",
  "call SetImpactBackground",
  "create_basic_hitsplat_sprite",
  "AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 22, 1",
  "complex_palette_blend",
  "clearmonbg ANIM_TARGET",
  "blendoff",
  "restorebg",
  "waitbgfadein",
];
if (
  !punchEntry || punchEntry.id !== 5 || punchEntry.frontierMonCount !== 1
  || !kickEntry || kickEntry.id !== 25 || kickEntry.frontierMonCount !== 26
  || !constants.includes("#define FRONTIER_MON_CACTURNE_1")
  || !constants.includes("#define FRONTIER_MON_SUDOWOODO_2    298")
  || !carrier.includes(".species = SPECIES_CACTURNE")
  || !carrier.includes(
    ".moves = {MOVE_NEEDLE_ARM, MOVE_FAINT_ATTACK, MOVE_ACID, MOVE_MEGA_PUNCH}",
  )
  || required.some((text) => !punch.includes(text))
  || !fight.includes("const struct SpriteTemplate gMegaPunchKickSpriteTemplate")
  || !fight.includes("AFFINEANIMCMD_FRAME(0xFFFC, 0xFFFC, 20, 1)")
  || !fight.includes("sprite->data[0] = gBattleAnimArgs[3]")
  || !fight.includes("sprite->data[0] = 20")
  || !movement.includes("void AnimTask_ShakeMon2(u8 taskId)")
  || !kickCarrier.includes(".species = SPECIES_SUDOWOODO")
  || !kickCarrier.includes(
    ".moves = {MOVE_MEGA_KICK, MOVE_EARTHQUAKE, MOVE_LOW_KICK, MOVE_SELF_DESTRUCT}",
  )
  || !kickCarrier.includes(".itemTableId = BATTLE_FRONTIER_ITEM_FOCUS_BAND")
  || !kickCarrier.includes(".evSpread = F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_HP")
  || !kickCarrier.includes(".nature = NATURE_HARDY")
  || kickRequired.some((text) => !kick.includes(text))
) throw new Error("Mega Punch source contract changed");

console.log(
  "set 254/FRONTIER_MON_CACTURNE_1 is the sole and lowest legal Level-50 "
  + "MOVE_MEGA_PUNCH carrier; punch variant 0 owns the 50+20 callback, "
  + "SetImpactBackground side branch, hitsplat, ShakeMon2, palette/audio/"
  + "cleanup body; set 298/FRONTIER_MON_SUDOWOODO_2 is a source-proven legal "
  + "Level-50 MOVE_MEGA_KICK carrier (Hardy, HP+Sp.Def, Focus Band), whose "
  + "variant 1 foot and early SE_M_MEGA_KICK2 remain separately staged",
);
