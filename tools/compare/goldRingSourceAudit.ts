import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const psychic = read("reference/pokeemerald/src/battle_anim_psychic.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const monConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const hypnosis = block(scripts, "Move_HYPNOSIS", "Move_PSYWAVE");
const psybeam = block(scripts, "Move_PSYBEAM", "Move_HYPNOSIS");
const politoed = mons.slice(
  mons.indexOf("[FRONTIER_MON_POLITOED_1]"),
  mons.indexOf("[FRONTIER_MON_POLITOED_1]") + 500,
);
const spinda = mons.slice(
  mons.indexOf("[FRONTIER_MON_SPINDA]"),
  mons.indexOf("[FRONTIER_MON_SPINDA]") + 500,
);
const hypnosisRequired = [
  "loadspritegfx ANIM_TAG_GOLD_RING",
  "call SetPsychicBackground",
  "call HypnosisRings",
  "blend_color_cycle priority=2, selector=F_PAL_TARGET, delay=2, num_blends=2, initial_blend_y=0, target_blend_y=12, color=RGB(31, 18, 31)",
  "call UnsetPsychicBackground",
  "playsewithpan SE_M_SUPERSONIC, SOUND_PAN_ATTACKER",
  "gGoldRingSpriteTemplate, ANIM_TARGET, 2, 0, 8, 0, 8, 27, 0",
  "gGoldRingSpriteTemplate, ANIM_TARGET, 2, 16, -8, 0, -8, 27, 0",
];
const psybeamDistinct = [
  "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER",
  "SoundTask_LoopSEAdjustPanning, SE_M_PSYBEAM2, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 3, 4, 0, 15",
  "createvisualtask AnimTask_SwayMon, 5, 0, 6, 2048, 4, ANIM_TARGET",
  "gGoldRingSpriteTemplate, ANIM_TARGET, 2, 16, 0, 0, 0, 13, 0",
];
if (
  !monConstants.includes("#define FRONTIER_MON_POLITOED_1     265")
  || !monConstants.includes("#define FRONTIER_MON_SPINDA         145")
  || !species.includes("#define SPECIES_POLITOED 186")
  || !species.includes("#define SPECIES_SPINDA 308")
  || !moves.includes("#define MOVE_HYPNOSIS 95")
  || !moves.includes("#define MOVE_PSYBEAM 60")
  || !politoed.includes(".species = SPECIES_POLITOED")
  || !politoed.includes(".moves = {MOVE_DIVE, MOVE_DIG, MOVE_HYPNOSIS, MOVE_SWAGGER}")
  || !politoed.includes("BATTLE_FRONTIER_ITEM_SHELL_BELL")
  || !politoed.includes("F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE")
  || !politoed.includes("NATURE_RELAXED")
  || !spinda.includes(".species = SPECIES_SPINDA")
  || !spinda.includes(".moves = {MOVE_DIZZY_PUNCH, MOVE_TEETER_DANCE, MOVE_PSYBEAM, MOVE_FAINT_ATTACK}")
  || hypnosisRequired.some((text) => !hypnosis.includes(text))
  || (hypnosis.match(/call HypnosisRings/g) ?? []).length !== 3
  || psybeamDistinct.some((text) => !psybeam.includes(text))
  || (psybeam.match(/call PsybeamRings/g) ?? []).length !== 11
  || !psychic.includes("const struct SpriteTemplate gGoldRingSpriteTemplate")
  || !psychic.includes(".oam = &gOamData_AffineOff_ObjNormal_16x32")
  || !psychic.includes(".callback = TranslateAnimSpriteToTargetMonLocation")
) throw new Error("Hypnosis/Psybeam GoldRing source contract changed");

console.log(
  "set 265 POLITOED_1 is the lowest legal Level-50 Hypnosis carrier; Hypnosis owns "
  + "six 27-tick GoldRing translations, psychic BG, target 0<->12 tint, and "
  + "three Supersonic sounds. Set 145 SPINDA is Psybeam's lowest carrier; "
  + "Psybeam remains distinct with eleven 13-tick rings, SwayMon, and "
  + "LoopSEAdjustPanning 3/4/0/15.",
);
