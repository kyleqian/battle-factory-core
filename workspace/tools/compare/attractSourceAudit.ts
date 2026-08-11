import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const anim = read("reference/pokeemerald/data/battle_anim_scripts.s");
const scripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const commands = read("reference/pokeemerald/src/battle_script_commands.c");
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);
const attract = anim.slice(
  anim.indexOf("Move_ATTRACT:"),
  anim.indexOf("Move_GROWTH:"),
);
const effect = scripts.slice(
  scripts.indexOf("BattleScript_EffectAttract::"),
  scripts.indexOf("BattleScript_EffectReturn::"),
);
const carriers = mons.entries.filter(
  (mon: { index: number; moves: string[] }) =>
    mon.index >= 110 && mon.index <= 849 && mon.moves.includes("MOVE_ATTRACT"),
);
const entry = inventory.tiers.level50.moves.find(
  (move: { move: string }) => move.move === "MOVE_ATTRACT",
);
const requiredBody = [
  "gRedHeartProjectileSpriteTemplate",
  "gRedHeartBurstSpriteTemplate",
  "gRedHeartRisingSpriteTemplate",
  "AnimTask_HeartsBackground",
  "AnimTask_SwayMon",
  "blend_color_cycle",
];
const requiredFailures = [
  "ABILITY_OBLIVIOUS",
  "== GetGenderFromSpeciesAndPersonality(speciesTarget",
  "status2 & STATUS2_INFATUATION",
  "== MON_GENDERLESS",
  "gBattlescriptCurrInstr = T1_READ_PTR",
];
if (
  !entry || entry.id !== 213
  || carriers[0]?.index !== 113
  || carriers[0]?.label !== "FRONTIER_MON_EEVEE"
  || carriers[0]?.species !== "SPECIES_EEVEE"
  || carriers[0]?.itemName !== "BATTLE_FRONTIER_ITEM_SALAC_BERRY"
  || !effect.includes("accuracycheck BattleScript_ButItFailed")
  || !effect.includes("tryinfatuating BattleScript_ButItFailed")
  || effect.indexOf("tryinfatuating") > effect.indexOf("attackanimation")
  || requiredBody.some((text) => !attract.includes(text))
  || requiredFailures.some((text) => !commands.includes(text))
) throw new Error("Attract source/controller contract changed");

console.log(
  "set 113/FRONTIER_MON_EEVEE is the lowest legal Level-50 carrier; "
  + "one opposite-gender success body reaches attackanimation; accuracy, "
  + "same gender, genderless, existing infatuation, and Oblivious routes "
  + "select no animation body",
);
