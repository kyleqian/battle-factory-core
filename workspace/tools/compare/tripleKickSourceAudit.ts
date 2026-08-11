import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
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
const block = scripts.slice(
  scripts.indexOf("Move_TRIPLE_KICK:"),
  scripts.indexOf("Move_DYNAMIC_PUNCH:"),
);
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_HITMONTOP_1]"),
  mons.indexOf("[FRONTIER_MON_BANETTE_1]"),
);
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_TRIPLE_KICK",
);
const requiredRows = [
  "jumpifmoveturn 0, TripleKickLeft",
  "jumpifmoveturn 1, TripleKickRight",
  "goto TripleKickCenter",
  "create_wide_foot_sprite ANIM_TARGET, 4, x=-16, y=-8, duration=20",
  "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=-16, y=-16, relative_to=ANIM_TARGET, animation=2",
  "create_wide_foot_sprite ANIM_TARGET, 4, x=8, y=8, duration=20",
  "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=8, y=0, relative_to=ANIM_TARGET, animation=2",
  "create_wide_foot_sprite ANIM_TARGET, 4, x=0, y=0, duration=20",
  "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=0, y=-8, relative_to=ANIM_TARGET, animation=1",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 4, 0, 6, 1",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 6, 0, 8, 1",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
];

if (
  address("Move_TRIPLE_KICK") !== 0x082d2293
  || address("TripleKickContinue") !== 0x082d22b3
  || address("TripleKickLeft") !== 0x082d22b8
  || address("TripleKickRight") !== 0x082d22ee
  || address("TripleKickCenter") !== 0x082d2324
  || address("Move_DYNAMIC_PUNCH") !== 0x082d235a
  || address("gFistFootSpriteTemplate") !== 0x08595e98
  || address("gBasicHitSplatSpriteTemplate") !== 0x08597358
  || address("AnimBasicFistOrFoot") !== 0x0810cee0
  || address("AnimTask_ShakeMon") !== 0x080d51ac
  || address("AnimTask_ShakeMon_Step") !== 0x080d5220
  || address("gBattleAnimSpriteGfx_HandsAndFeet") !== 0x08c2cbac
  || address("gBattleAnimSpritePal_HandsAndFeet") !== 0x08c2cddc
  || address("gBattleAnimSpriteGfx_Impact") !== 0x08c1a3a0
  || address("gBattleAnimSpritePal_Impact") !== 0x08c1a478
  || requiredRows.some((row) => !block.includes(row))
  || (block.match(/TripleKickLeft:/g) ?? []).length !== 1
  || (block.match(/TripleKickRight:/g) ?? []).length !== 1
  || (block.match(/TripleKickCenter:/g) ?? []).length !== 1
  || !fight.includes("static void AnimBasicFistOrFoot(struct Sprite *sprite)")
  || !fight.includes("StartSpriteAnim(sprite, gBattleAnimArgs[4]);")
  || !movement.includes("void AnimTask_ShakeMon(u8 taskId)")
  || !movement.includes("static void AnimTask_ShakeMon_Step(u8 taskId)")
  || !move || move.id !== 167 || move.frontierMonCount !== 1
  || move.exampleMons[0] !== "FRONTIER_MON_HITMONTOP_1"
  || !constants.includes("#define FRONTIER_MON_HITMONTOP_1    236")
  || !carrier.includes(".species = SPECIES_HITMONTOP")
  || !carrier.includes(".moves = {MOVE_TRIPLE_KICK, MOVE_DIG, MOVE_MACH_PUNCH, MOVE_QUICK_ATTACK}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_LIECHI_BERRY")
  || !carrier.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !carrier.includes("NATURE_HARDY")
) throw new Error("MOVE_TRIPLE_KICK source/carrier/branch contract changed");

console.log(
  "Move_TRIPLE_KICK exclusive script interval 0x082d2293..0x082d235a (0xc7 bytes); "
  + "moveTurn 0 -> left, 1 -> right, fallback -> center; "
  + "gFistFootSpriteTemplate -> AnimBasicFistOrFoot, gBasicHitSplatSpriteTemplate, "
  + "AnimTask_ShakeMon(_Step), HANDS_AND_FEET and IMPACT assets; sole/lowest legal "
  + "Level-50 carrier set 236 FRONTIER_MON_HITMONTOP_1",
);
