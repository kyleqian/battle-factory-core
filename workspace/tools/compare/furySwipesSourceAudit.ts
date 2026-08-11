import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const block = scripts.slice(
  scripts.indexOf("Move_FURY_SWIPES:"),
  scripts.indexOf("Move_INGRAIN:"),
);
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_AIPOM]"),
  mons.indexOf("[FRONTIER_MON_ELEKID]"),
);
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_FURY_SWIPES",
);
const components = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_FURY_SWIPES",
);
const expectedComponents = [
  "asset:ANIM_TAG_SWIPE",
  "sprite:gFurySwipesSpriteTemplate",
  "sprite:gHorizontalLungeSpriteTemplate",
  "task:AnimTask_ShakeMon2",
];
const rows = [
  "loadspritegfx ANIM_TAG_SWIPE",
  "createsprite gHorizontalLungeSpriteTemplate, ANIM_ATTACKER, 2, 5, 5",
  "playsewithpan SE_M_SCRATCH, SOUND_PAN_TARGET",
  "createsprite gFurySwipesSpriteTemplate, ANIM_TARGET, 2, 16, 0, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 3, 0, 5, 1",
  "createsprite gHorizontalLungeSpriteTemplate, ANIM_TARGET, 2, 5, 5",
  "createsprite gFurySwipesSpriteTemplate, ANIM_TARGET, 2, -16, 0, 0",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 7, 1",
  "end",
];

if (
  address("Move_FURY_SWIPES") !== 0x082d407c
  || address("Move_INGRAIN") !== 0x082d40e0
  || address("gFurySwipesSpriteTemplate") !== 0x08593b38
  || address("AnimFurySwipes") !== 0x08106c80
  || address("gHorizontalLungeSpriteTemplate") !== 0x0857fe28
  || address("AnimTask_ShakeMon2") !== 0x080d52d0
  || address("gBattleAnimSpriteGfx_Swipe") !== 0x08c251ac
  || address("gBattleAnimSpritePal_Swipe") !== 0x08c25498
  || rows.some((row) => !block.includes(row))
  || !effects.includes("static const union AnimCmd sAnim_FurySwipes[]")
  || !effects.includes("static const union AnimCmd sAnim_FurySwipes_Flipped[]")
  || !effects.includes("if (sprite->data[0] == 0)")
  || !effects.includes("else if (sprite->animEnded)")
  || !movement.includes("void AnimTask_ShakeMon2(u8 taskId)")
  || !movement.includes("static void DoHorizontalLunge(struct Sprite *sprite)")
  || move?.id !== 154
  || move.frontierMonCount !== 2
  || JSON.stringify(move.exampleMons) !== JSON.stringify([
    "FRONTIER_MON_AIPOM", "FRONTIER_MON_QUILAVA_1",
  ])
  || JSON.stringify(components?.componentIds) !== JSON.stringify(expectedComponents)
  || !constants.includes("#define FRONTIER_MON_AIPOM          142")
  || !carrier.includes(".species = SPECIES_AIPOM")
  || !carrier.includes(".moves = {MOVE_FURY_SWIPES, MOVE_SAND_ATTACK, MOVE_BATON_PASS, MOVE_AGILITY}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_SILK_SCARF")
  || !carrier.includes("NATURE_RELAXED")
)
  throw new Error("MOVE_FURY_SWIPES source/carrier/component contract changed");

console.log(
  "Move_FURY_SWIPES exclusive pointer interval 0x082d407c..0x082d40e0 (0x64 bytes); complete 4-component SWIPE/HorizontalLunge/ShakeMon2 graph; lowest legal Level-50 carrier set 142 FRONTIER_MON_AIPOM (QUILAVA_1 is the second carrier)",
);
