import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const battle = read("reference/pokeemerald/src/battle_script_commands.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");

const between = (source: string, first: string, last: string) => {
  const start = source.indexOf(`${first}:`);
  const end = source.indexOf(`${last}:`, start + first.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${first}/${last}`);
  return source.slice(start, end);
};

const present = between(scripts, "Move_PRESENT", "Move_BATON_PASS");
const calculationStart = battle.indexOf("static void Cmd_presentdamagecalculation(void)\n{");
const calculationEnd = battle.indexOf("static void Cmd_setsafeguard", calculationStart);
if (calculationStart < 0 || calculationEnd < 0) {
  throw new Error("missing Cmd_presentdamagecalculation");
}
const calculation = battle.slice(calculationStart, calculationEnd);
const delibirdStart = mons.indexOf("[FRONTIER_MON_DELIBIRD]");
const delibirdEnd = mons.indexOf("[FRONTIER_MON_HOUNDOUR]", delibirdStart);
if (delibirdStart < 0 || delibirdEnd < 0) throw new Error("missing Delibird set");
const delibird = mons.slice(delibirdStart, delibirdEnd);
const required = [
  "loadspritegfx ANIM_TAG_ITEM_BAG", "createvisualtask AnimTask_IsHealingMove, 2",
  "create_present_sprite ANIM_TARGET, 2", "jumpretfalse PresentDamage",
  "jumprettrue PresentHeal", "loadspritegfx ANIM_TAG_EXPLOSION",
  "loadspritegfx ANIM_TAG_GREEN_SPARKLE", "loadspritegfx ANIM_TAG_BLUE_STAR",
  "call HealingEffect2",
];
if (required.some((entry) => !present.includes(entry))
  || (present.match(/gExplosionSpriteTemplate/g) ?? []).length !== 5
  || (present.match(/create_present_heal_particle_sprite/g) ?? []).length !== 9
  || !effects1.includes("const struct SpriteTemplate gPresentSpriteTemplate")
  || !effects1.includes("const struct SpriteTemplate gPresentHealParticleSpriteTemplate")
  || !effects1.includes("static void AnimPresent(struct Sprite *sprite)")
  || !effects1.includes("static void AnimPresentHealParticle(struct Sprite *sprite)")
  || !effects3.includes("void AnimTask_IsHealingMove(u8 taskId)")
  || !effects3.includes("if (gAnimMoveDmg > 0)")
  || !calculation.includes("s32 rand = Random() & 0xFF")
  || !calculation.includes("else if (rand < 204)")
  || !calculation.includes("gBattleMoveDamage = gBattleMons[gBattlerTarget].maxHP / 4")
  || !calculation.includes("BattleScript_AlreadyAtFullHp")
  || !delibird.includes(".species = SPECIES_DELIBIRD")
  || !delibird.includes(".moves = {MOVE_PRESENT, MOVE_ICE_BALL, MOVE_AERIAL_ACE, MOVE_HAIL}")
  || !delibird.includes("BATTLE_FRONTIER_ITEM_NEVER_MELT_ICE")
  || !delibird.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !delibird.includes("NATURE_DOCILE")) {
  throw new Error("MOVE_PRESENT source contract changed");
}

console.log("set 118 DELIBIRD: Present bag -> 5 EXPLOSION damage or 9 GREEN_SPARKLE + target HealingEffect2; healing requires a non-full target and a ROM RNG roll >= 204");
