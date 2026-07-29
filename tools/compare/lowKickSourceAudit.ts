import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const low = block(scripts, "Move_LOW_KICK", "Move_EARTHQUAKE");
const rolling = block(scripts, "Move_ROLLING_KICK", "Move_HEADBUTT");
const machokeStart = mons.indexOf("[FRONTIER_MON_MACHOKE_1]");
const sudowoodoStart = mons.indexOf("[FRONTIER_MON_SUDOWOODO_2]");
if (machokeStart < 0 || sudowoodoStart < 0) throw new Error("missing Low Kick carriers");
const machoke = mons.slice(machokeStart, machokeStart + 500);
const sudowoodo = mons.slice(sudowoodoStart, sudowoodoStart + 500);
const entry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_LOW_KICK",
);
const required = [
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "loadspritegfx ANIM_TAG_IMPACT",
  "gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, 20, 0, 0, 4",
  "gSlidingKickSpriteTemplate, ANIM_TARGET, 2, -24, 28, 40, 8, 160, 0",
  "create_basic_hitsplat_sprite ANIM_TARGET, 2, x=-8, y=8, relative_to=ANIM_TARGET, animation=2",
  "AnimTask_RotateMonSpriteToSide, 2, 6, 384, ANIM_TARGET, 2",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 1, 4",
];

if (
  !entry || entry.id !== 67 || entry.frontierMonCount !== 2
  || entry.exampleMons.join(",") !== "FRONTIER_MON_MACHOKE_1,FRONTIER_MON_SUDOWOODO_2"
  || !constants.includes("#define FRONTIER_MON_MACHOKE_1      178")
  || !constants.includes("#define FRONTIER_MON_SUDOWOODO_2    298")
  || !machoke.includes(".species = SPECIES_MACHOKE")
  || !machoke.includes(".moves = {MOVE_LOW_KICK, MOVE_ROCK_TOMB, MOVE_FORESIGHT, MOVE_SCARY_FACE}")
  || !machoke.includes(".itemTableId = BATTLE_FRONTIER_ITEM_FOCUS_BAND")
  || !machoke.includes(".evSpread = F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_HP")
  || !machoke.includes(".nature = NATURE_ADAMANT")
  || !sudowoodo.includes(".moves = {MOVE_MEGA_KICK, MOVE_EARTHQUAKE, MOVE_LOW_KICK, MOVE_SELF_DESTRUCT}")
  || required.some((text) => !low.includes(text))
  || !fight.includes("const struct SpriteTemplate gSlidingKickSpriteTemplate")
  || !fight.includes("static void AnimSlidingKick(struct Sprite *sprite)")
  || !movement.includes("void AnimTask_RotateMonSpriteToSide(u8 taskId)")
  || !movement.includes("static void AnimTask_RotateMonSpriteToSide_Step(u8 taskId)")
  || !rolling.includes("AnimTask_TranslateMonEllipticalRespectSide")
  || rolling.includes("AnimTask_RotateMonSpriteToSide, 2, 6, 384, ANIM_TARGET, 2")
) throw new Error("Low Kick source contract changed");

console.log(
  "set 178/FRONTIER_MON_MACHOKE_1 is the lowest legal Level-50 MOVE_LOW_KICK "
  + "carrier (before set 298 SUDOWOODO_2); Low Kick owns attacker slide/restore, "
  + "target-relative SlidingKick and hit splat geometry, target RotateMonSpriteToSide, "
  + "and Vital Throw target panning. Rolling Kick remains a distinct exact sibling.",
);
