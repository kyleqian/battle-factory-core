import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fire = read("reference/pokeemerald/src/battle_anim_fire.c");
const rock = read("reference/pokeemerald/src/battle_anim_rock.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const factory = read("reference/pokeemerald/src/battle_factory.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_HEAT_WAVE",
);
const body = scripts.slice(
  scripts.indexOf("Move_HEAT_WAVE:"),
  scripts.indexOf("Move_HAIL:"),
);
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_NINETALES_2]"),
  mons.indexOf("[FRONTIER_MON_NINETALES_2]") + 500,
);
const nm = execFileSync("arm-none-eabi-nm", [
  "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const requiredScript = [
  "loadspritegfx ANIM_TAG_FLYING_DIRT",
  "createvisualtask AnimTask_BlendParticle, 5, ANIM_TAG_FLYING_DIRT, 0, 6, 6, RGB_RED",
  "createvisualtask AnimTask_LoadSandstormBackground, 5, TRUE",
  "createvisualtask AnimTask_BlendBackground, 6, 6, RGB_RED",
  "panse SE_M_HEAT_WAVE, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +2, 0",
  "createvisualtask AnimTask_MoveHeatWaveTargets, 5",
];

if (
  address("Move_HEAT_WAVE") !== 0x082cdbc6
  || address("Move_HAIL") !== 0x082cdc76
  || !move || move.id !== 257 || move.frontierMonCount !== 1
  || move.exampleMons.join(",") !== "FRONTIER_MON_NINETALES_2"
  || !constants.includes("#define FRONTIER_MON_NINETALES_2    526")
  || !factory.includes("{FRONTIER_MON_DUGTRIO_2,  FRONTIER_MON_SLAKING_2},  // 468 - 563")
  || !carrier.includes(".species = SPECIES_NINETALES")
  || !carrier.includes(".moves = {MOVE_HEAT_WAVE, MOVE_BODY_SLAM, MOVE_GRUDGE, MOVE_SUNNY_DAY}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_LUM_BERRY")
  || !carrier.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_SPEED")
  || !carrier.includes("NATURE_QUIRKY")
  || requiredScript.some((line) => !body.includes(line))
  || (body.match(/gFlyingSandCrescentSpriteTemplate/g) ?? []).length !== 7
  || !body.includes("\n\tend\n")
  || !fire.includes("void AnimTask_MoveHeatWaveTargets(u8 taskId)")
  || !fire.includes("static void AnimTask_MoveHeatWaveTargets_Step(u8 taskId)")
  || !fire.includes("task->data[13] = IsBattlerSpriteVisible(BATTLE_PARTNER(gBattleAnimTarget)) + 1")
  || !fire.includes("if (++task->data[9] == 96)")
  || !rock.includes("static void AnimFlyingSandCrescent")
  || !utility.includes("void AnimTask_BlendParticle(u8 taskId)")
  || !rock.includes("void AnimTask_LoadSandstormBackground(u8 taskId)")
) throw new Error("MOVE_HEAT_WAVE source/carrier contract changed");

console.log(
  "Move_HEAT_WAVE 0x082cdbc6..0x082cdc76 (0xb0 bytes); sole/lowest "
  + "Level-50 carrier set 526 FRONTIER_MON_NINETALES_2, first legal in "
  + "challenge 4 range 468..563; red particle/background blends, mirrored "
  + "sandstorm BG, 7 flying-dirt crescents, pan sweep, bilateral target motion",
);
