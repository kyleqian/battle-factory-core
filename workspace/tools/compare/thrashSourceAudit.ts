import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const nm = execFileSync("arm-none-eabi-nm", [
  "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const block = (start: string, end: string): string => scripts.slice(
  scripts.indexOf(`${start}:`), scripts.indexOf(`${end}:`),
);
const thrash = block("Move_THRASH", "Move_SING");
const doubleKick = block("Move_DOUBLE_KICK", "Move_TRIPLE_KICK");
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_TAUROS_1]"), mons.indexOf("[FRONTIER_MON_SLOWBRO_1]"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_THRASH");
const sibling = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_DOUBLE_KICK");

const thrashLines = [
  "loadspritegfx ANIM_TAG_IMPACT",
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "createvisualtask AnimTask_ThrashMoveMonHorizontal, 2",
  "createvisualtask AnimTask_ThrashMoveMonVertical, 2",
  "createsprite gFistFootRandomPosSpriteTemplate, ANIM_TARGET, 3, 1, 10, 0",
  "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 4, 0, 7, 1",
  "createsprite gFistFootRandomPosSpriteTemplate, ANIM_TARGET, 3, 1, 10, 1",
  "createsprite gFistFootRandomPosSpriteTemplate, ANIM_TARGET, 3, 1, 10, 3",
  "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 8, 0, 16, 1",
  "playsewithpan SE_M_COMET_PUNCH, SOUND_PAN_TARGET",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET",
];
const siblingLines = [
  "monbg ANIM_DEF_PARTNER", "setalpha 12, 8",
  "createsprite gFistFootRandomPosSpriteTemplate, ANIM_ATTACKER, 3, 1, 20, 1",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 4, 0, 6, 1",
  "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff",
];

if (
  address("Move_THRASH") !== 0x082cc981
  || address("Move_SING") !== 0x082cca00
  || address("Move_DOUBLE_KICK") !== 0x082d2261
  || address("gFistFootRandomPosSpriteTemplate") !== 0x08595eb0
  || thrashLines.some((line) => !thrash.includes(line))
  || (thrash.match(/gFistFootRandomPosSpriteTemplate/g) ?? []).length !== 3
  || siblingLines.some((line) => !doubleKick.includes(line))
  || !fight.includes("static void AnimFistOrFootRandomPos(struct Sprite *sprite)")
  || !fight.includes("x = Random2() % xMod;") || !fight.includes("y = Random2() % yMod;")
  || !fight.includes("CreateSprite(&gBasicHitSplatSpriteTemplate")
  || !movement.includes("void AnimTask_ShakeMonInPlace(u8 taskId)")
  || !effects.includes("void AnimTask_ThrashMoveMonHorizontal(u8 taskId)")
  || !effects.includes("void AnimTask_ThrashMoveMonVertical(u8 taskId)")
  || !move || move.id !== 37 || move.frontierMonCount !== 1 || move.exampleMons.join() !== "FRONTIER_MON_TAUROS_1"
  || !sibling || sibling.id !== 24 || sibling.frontierMonCount !== 11
  || !constants.includes("#define FRONTIER_MON_TAUROS_1       408")
  || !carrier.includes(".species = SPECIES_TAUROS")
  || !carrier.includes(".moves = {MOVE_EARTHQUAKE, MOVE_THRASH, MOVE_SWAGGER, MOVE_FACADE}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_PERSIM_BERRY")
  || !carrier.includes("F_EV_SPREAD_SPEED | F_EV_SPREAD_ATTACK")
  || !carrier.includes("NATURE_ADAMANT")
) throw new Error("MOVE_THRASH source/carrier/sibling contract changed");

console.log(
  "Move_THRASH real exclusive script-data interval 0x082cc981..0x082cca00 (0x7f bytes; byte 0x082cc980 belongs to HornDrillInContest); "
  + "six components: HANDS_AND_FEET, IMPACT, gFistFootRandomPosSpriteTemplate, ShakeMonInPlace, "
  + "ThrashMoveMonHorizontal, ThrashMoveMonVertical; sole Level-50 carrier set 408 FRONTIER_MON_TAUROS_1; "
  + "MOVE_DOUBLE_KICK has 11 carriers and a distinct monbg/alpha/ShakeMon/wait/cleanup body",
);
