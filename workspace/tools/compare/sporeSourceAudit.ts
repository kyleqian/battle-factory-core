import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const species = read("reference/pokeemerald/include/constants/species.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const spore = block(scripts, "Move_SPORE", "Move_PETAL_DANCE");
const cotton = block(scripts, "Move_COTTON_SPORE", "Move_SPORE");
const parasect = mons.slice(
  mons.indexOf("[FRONTIER_MON_PARASECT_2]"),
  mons.indexOf("[FRONTIER_MON_PARASECT_2]") + 500,
);
const mareep = mons.slice(
  mons.indexOf("[FRONTIER_MON_MAREEP]"),
  mons.indexOf("[FRONTIER_MON_MAREEP]") + 500,
);
const sporeEntry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_SPORE",
);
const cottonEntry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_COTTON_SPORE",
);
const sporeRequired = [
  "loadspritegfx ANIM_TAG_SPORE",
  "monbg ANIM_DEF_PARTNER",
  "setalpha 12, 8",
  "AnimTask_SporeDoubleBattle",
  "SE_M_POISON_POWDER, SOUND_PAN_TARGET, 16, 11",
  "call CreateSpore",
  "create_spore_particle_sprite ANIM_TARGET, 2, x=0, y=-20, wave_offset=85, duration=80, blend=TRUE",
  "create_spore_particle_sprite ANIM_TARGET, 2, x=0, y=-10, wave_offset=170, duration=80, blend=TRUE",
  "create_spore_particle_sprite ANIM_TARGET, 2, x=0, y=-15, wave_offset=0, duration=80, blend=TRUE",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
];
const cottonDistinct = [
  "splitbgprio ANIM_TARGET",
  "SE_M_POISON_POWDER, SOUND_PAN_TARGET, 18, 10",
  "call CreateCottonSpores",
  "create_spore_particle_sprite ANIM_ATTACKER, 2, x=0, y=-20, wave_offset=85, duration=80, blend=FALSE",
  "create_spore_particle_sprite ANIM_ATTACKER, 2, x=0, y=-10, wave_offset=170, duration=80, blend=FALSE",
  "create_spore_particle_sprite ANIM_ATTACKER, 2, x=0, y=-15, wave_offset=0, duration=80, blend=FALSE",
];
if (
  !sporeEntry || sporeEntry.id !== 147 || sporeEntry.frontierMonCount !== 4
  || !cottonEntry || cottonEntry.id !== 178
  || !constants.includes("#define FRONTIER_MON_PARASECT_2     282")
  || !constants.includes("#define FRONTIER_MON_MAREEP         49")
  || !species.includes("#define SPECIES_PARASECT 47")
  || !species.includes("#define SPECIES_MAREEP 179")
  || !moves.includes("#define MOVE_SPORE 147")
  || !parasect.includes(".species = SPECIES_PARASECT")
  || !parasect.includes(
    ".moves = {MOVE_SPORE, MOVE_GIGA_DRAIN, MOVE_DIG, MOVE_DOUBLE_TEAM}",
  )
  || !parasect.includes("BATTLE_FRONTIER_ITEM_LEFTOVERS")
  || !parasect.includes(
    "F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP",
  )
  || !parasect.includes("NATURE_CALM")
  || !mareep.includes(".species = SPECIES_MAREEP")
  || !mareep.includes(
    ".moves = {MOVE_SHOCK_WAVE, MOVE_FLASH, MOVE_REFLECT, MOVE_COTTON_SPORE}",
  )
  || !mareep.includes("BATTLE_FRONTIER_ITEM_CHERI_BERRY")
  || !mareep.includes(
    "F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP",
  )
  || !mareep.includes("NATURE_RELAXED")
  || sporeRequired.some((text) => !spore.includes(text))
  || (spore.match(/call CreateSpore/g) ?? []).length !== 3
  || cottonDistinct.some((text) => !cotton.includes(text))
  || (cotton.match(/call CreateCottonSpores/g) ?? []).length !== 3
  || !effects.includes(".callback = AnimSporeParticle")
  || !effects.includes("sprite->x2 = Sin(sprite->data[1], 32)")
  || !effects.includes("sprite->data[1] += 2")
  || !effects.includes("if (--sprite->data[0] == -1)")
  || !effects.includes("void AnimTask_SporeDoubleBattle(u8 taskId)")
) throw new Error("Spore/ANIM_TAG_SPORE source contract changed");

console.log(
  "set 282/FRONTIER_MON_PARASECT_2 -> SPECIES_PARASECT 47/"
  + "MOVE_SPORE 147/LEFTOVERS/SP_DEFENSE+DEFENSE+HP/CALM; Spore owns nine "
  + "blended gSporeParticleSpriteTemplate lifecycles and "
  + "AnimTask_SporeDoubleBattle; lowest Cotton Spore carrier set "
  + "49/FRONTIER_MON_MAREEP -> SPECIES_MAREEP 179/CHERI_BERRY/"
  + "SP_ATTACK+HP/RELAXED; MOVE_COTTON_SPORE remains distinct with "
  + "splitbgprio, nine unblended particles, no alpha/SporeDoubleBattle, "
  + "and 18/10 loop audio",
);
