import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const rock = read("reference/pokeemerald/src/battle_anim_rock.c");
const fire = read("reference/pokeemerald/src/battle_anim_fire.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const species = read("reference/pokeemerald/include/constants/species.h");
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);
const sandstorm = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SANDSTORM",
);
const heatWave = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_HEAT_WAVE",
);
const sandBody = scripts.slice(
  scripts.indexOf("Move_SANDSTORM:"),
  scripts.indexOf("Move_WHIRLPOOL:"),
);
const heatBody = scripts.slice(
  scripts.indexOf("Move_HEAT_WAVE:"),
  scripts.indexOf("Move_HAIL:"),
);
const phanpy = mons.slice(
  mons.indexOf("[FRONTIER_MON_PHANPY]"),
  mons.indexOf("[FRONTIER_MON_PHANPY]") + 500,
);

if (
  !sandstorm || sandstorm.id !== 201 || sandstorm.frontierMonCount !== 14
  || sandstorm.exampleMons[0] !== "FRONTIER_MON_PHANPY"
  || !heatWave || heatWave.id !== 257 || heatWave.frontierMonCount !== 1
  || !constants.includes("#define FRONTIER_MON_PHANPY         120")
  || !species.includes("#define SPECIES_PHANPY 231")
  || !phanpy.includes(".species = SPECIES_PHANPY")
  || !phanpy.includes("MOVE_SANDSTORM")
  || !phanpy.includes("BATTLE_FRONTIER_ITEM_LAX_INCENSE")
  || !phanpy.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !phanpy.includes("NATURE_NAUGHTY")
  || !sandBody.includes("loadspritegfx ANIM_TAG_FLYING_DIRT")
  || !sandBody.includes("AnimTask_LoadSandstormBackground, 5, FALSE")
  || (sandBody.match(/gFlyingSandCrescentSpriteTemplate/g) ?? []).length !== 7
  || !rock.includes("static void AnimFlyingSandCrescent")
  || !rock.includes("gBattle_BG1_X += -6")
  || !rock.includes("gBattle_BG1_Y += -1")
  || !rock.includes("gTasks[taskId].tFullAlphaTimer == 101")
  || !heatBody.includes("AnimTask_BlendParticle")
  || !heatBody.includes("AnimTask_LoadSandstormBackground, 5, TRUE")
  || !heatBody.includes("AnimTask_BlendBackground")
  || !heatBody.includes("AnimTask_MoveHeatWaveTargets")
  || !heatBody.includes("panse SE_M_HEAT_WAVE")
  || !fire.includes("AnimTask_MoveHeatWaveTargets_Step")
) throw new Error("Sandstorm/FLYING_DIRT source contract changed");

console.log(
  "lowest challenge-0 Level-50 carrier set 120/FRONTIER_MON_PHANPY -> "
  + "SPECIES_PHANPY 231/move 201/LAX_INCENSE/ATTACK+HP/NAUGHTY; "
  + "7 gFlyingSandCrescentSpriteTemplate lifecycles; "
  + "Heat Wave remains distinct: red particle/background blends, mirrored "
  + "background, pan sweep, and target-motion task",
);
