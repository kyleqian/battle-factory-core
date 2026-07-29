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

const rolling = block(scripts, "Move_ROLLING_KICK", "Move_HEADBUTT");
const low = block(scripts, "Move_LOW_KICK", "Move_EARTHQUAKE");
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_HITMONLEE_1]"),
  mons.indexOf("[FRONTIER_MON_HITMONLEE_1]") + 500,
);
const entry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_ROLLING_KICK",
);
const required = [
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_TARGET",
  "setalpha 12, 8",
  "AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_ATTACKER, 18, 6, 1, 4",
  "playsewithpan SE_M_DOUBLE_TEAM, SOUND_PAN_ATTACKER",
  "gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, 20, 0, 0, 4",
  "gSlidingKickSpriteTemplate, ANIM_ATTACKER, 2, -24, 0, 48, 10, 160, 0",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite",
  "AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 6, 1",
  "gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 1, 8",
  "clearmonbg ANIM_TARGET",
  "blendoff",
];

if (
  !entry || entry.id !== 27 || entry.frontierMonCount !== 1
  || entry.exampleMons.length !== 1
  || entry.exampleMons[0] !== "FRONTIER_MON_HITMONLEE_1"
  || !constants.includes("#define FRONTIER_MON_HITMONLEE_1    233")
  || !carrier.includes(".species = SPECIES_HITMONLEE")
  || !carrier.includes(
    ".moves = {MOVE_ROLLING_KICK, MOVE_BRICK_BREAK, MOVE_FOCUS_ENERGY, MOVE_FACADE}",
  )
  || !carrier.includes(".itemTableId = BATTLE_FRONTIER_ITEM_BLACK_BELT")
  || !carrier.includes(
    ".evSpread = F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP",
  )
  || !carrier.includes(".nature = NATURE_ADAMANT")
  || required.some((text) => !rolling.includes(text))
  || !fight.includes("const struct SpriteTemplate gSlidingKickSpriteTemplate")
  || !fight.includes("sprite->data[5] = gBattleAnimArgs[5]")
  || !fight.includes("sprite->y2 += Sin(sprite->data[7] >> 8, sprite->data[5])")
  || !fight.includes("sprite->data[7] += sprite->data[6]")
  || !movement.includes("void AnimTask_TranslateMonEllipticalRespectSide(u8 taskId)")
  || !movement.includes("static void SlideMonToOriginalPos(struct Sprite *sprite)")
  || !movement.includes("static void SlideMonToOffset(struct Sprite *sprite)")
  || !low.includes(
    "gSlidingKickSpriteTemplate, ANIM_TARGET, 2, -24, 28, 40, 8, 160, 0",
  )
  || !low.includes("AnimTask_RotateMonSpriteToSide")
) throw new Error("Rolling Kick source contract changed");

console.log(
  "set 233/FRONTIER_MON_HITMONLEE_1 is the sole and lowest legal Level-50 "
  + "MOVE_ROLLING_KICK carrier; Rolling Kick owns attacker elliptical motion, "
  + "attacker-relative gSlidingKickSpriteTemplate args, impact/ShakeMon, and "
  + "8-tick horizontal restoration. MOVE_LOW_KICK uses target-relative "
  + "geometry, RotateMonSpriteToSide, different timing, and remains unsupported.",
);
