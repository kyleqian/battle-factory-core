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
const entry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_MEGA_PUNCH",
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
if (
  !entry || entry.id !== 5 || entry.frontierMonCount !== 1
  || !constants.includes("#define FRONTIER_MON_CACTURNE_1")
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
  || !kick.includes(
    "gMegaPunchKickSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 1, 50",
  )
  || !kick.includes("playsewithpan SE_M_MEGA_KICK2")
) throw new Error("Mega Punch source contract changed");

console.log(
  "set 254/FRONTIER_MON_CACTURNE_1 is the sole and lowest legal Level-50 "
  + "MOVE_MEGA_PUNCH carrier; punch variant 0 owns the 50+20 callback, "
  + "SetImpactBackground side branch, hitsplat, ShakeMon2, palette/audio/"
  + "cleanup body; MOVE_MEGA_KICK remains distinct at variant 1 with "
  + "SE_M_MEGA_KICK2 and is unsupported",
);
