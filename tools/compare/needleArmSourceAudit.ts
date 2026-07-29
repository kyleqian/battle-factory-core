import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_NEEDLE_ARM",
);
const body = scripts.slice(
  scripts.indexOf("Move_NEEDLE_ARM:"),
  scripts.indexOf("Move_SLACK_OFF:"),
);
const secret = scripts.slice(
  scripts.indexOf("Move_SECRET_POWER:"),
  scripts.indexOf("Move_TWISTER:"),
);
const cacnea = mons.slice(
  mons.indexOf("[FRONTIER_MON_CACNEA]"),
  mons.indexOf("[FRONTIER_MON_CACNEA]") + 500,
);

if (
  !move || move.id !== 302 || move.frontierMonCount !== 2
  || move.exampleMons[0] !== "FRONTIER_MON_CACNEA"
  || !constants.includes("#define FRONTIER_MON_CACNEA         125")
  || !species.includes("#define SPECIES_CACNEA 344")
  || !cacnea.includes(".species = SPECIES_CACNEA")
  || !cacnea.includes("MOVE_NEEDLE_ARM")
  || !cacnea.includes("BATTLE_FRONTIER_ITEM_SITRUS_BERRY")
  || !cacnea.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !cacnea.includes("NATURE_QUIRKY")
  || !body.includes("loadspritegfx ANIM_TAG_GREEN_SPIKE")
  || (body.match(/gNeedleArmSpikeSpriteTemplate/g) ?? []).length !== 20
  || !body.includes("AnimTask_ShakeMon2")
  || !body.includes("create_basic_hitsplat_sprite")
  || !body.includes("create_fist_sprite")
  || !effects.includes(".callback = AnimNeedleArmSpike")
  || !effects.includes("sprite->callback = AnimNeedleArmSpike_Step")
  || !secret.includes("BATTLE_ENVIRONMENT_GRASS,      Move_NEEDLE_ARM")
  || !secret.includes("BATTLE_ENVIRONMENT_BUILDING,   Move_STRENGTH")
) throw new Error("Needle Arm/GREEN_SPIKE source contract changed");

console.log(
  "lowest Level-50 carrier set 125/FRONTIER_MON_CACNEA -> "
  + "SPECIES_CACNEA 344/move 302/SITRUS_BERRY/ATTACK+HP/QUIRKY; "
  + "20 gNeedleArmSpikeSpriteTemplate lifecycles; Factory Secret Power "
  + "dispatches to Strength, not Needle Arm",
);
