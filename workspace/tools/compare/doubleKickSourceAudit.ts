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
  scripts.indexOf("Move_DOUBLE_KICK:"),
  scripts.indexOf("Move_TRIPLE_KICK:"),
);
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_NIDORINA]"),
  mons.indexOf("[FRONTIER_MON_NIDORINO]"),
);
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_DOUBLE_KICK",
);
const rows = [
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "setalpha 12, 8",
  "createsprite gFistFootRandomPosSpriteTemplate, ANIM_ATTACKER, 3, 1, 20, 1",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 4, 0, 6, 1",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
  "end",
];

if (
  address("Move_DOUBLE_KICK") !== 0x082d2261
  || address("Move_TRIPLE_KICK") !== 0x082d2293
  || address("gFistFootRandomPosSpriteTemplate") !== 0x08595eb0
  || address("gBasicHitSplatSpriteTemplate") !== 0x08597358
  || address("AnimFistOrFootRandomPos") !== 0x0810cf30
  || address("AnimFistOrFootRandomPos_Step") !== 0x0810d0b8
  || address("AnimTask_ShakeMon") !== 0x080d51ac
  || address("AnimTask_ShakeMon_Step") !== 0x080d5220
  || address("gBattleAnimSpriteGfx_HandsAndFeet") !== 0x08c2cbac
  || address("gBattleAnimSpritePal_HandsAndFeet") !== 0x08c2cddc
  || address("gBattleAnimSpriteGfx_Impact") !== 0x08c1a3a0
  || address("gBattleAnimSpritePal_Impact") !== 0x08c1a478
  || rows.some((row) => !block.includes(row))
  || (block.match(/gFistFootRandomPosSpriteTemplate/g) ?? []).length !== 1
  || !fight.includes("x = Random2() % xMod;")
  || !fight.includes("y = Random2() % yMod;")
  || !fight.includes("sprite->data[7] = CreateSprite(&gBasicHitSplatSpriteTemplate")
  || !fight.includes("StartSpriteAffineAnim(&gSprites[sprite->data[7]], 0);")
  || !movement.includes("void AnimTask_ShakeMon(u8 taskId)")
  || !movement.includes("static void AnimTask_ShakeMon_Step(u8 taskId)")
  || !move || move.id !== 24 || move.frontierMonCount !== 11
  || move.exampleMons[0] !== "FRONTIER_MON_NIDORINA"
  || !constants.includes("#define FRONTIER_MON_NIDORINA       146")
  || !carrier.includes(".species = SPECIES_NIDORINA")
  || !carrier.includes(".moves = {MOVE_DOUBLE_KICK, MOVE_BITE, MOVE_AERIAL_ACE, MOVE_FLATTER}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_FOCUS_BAND")
  || !carrier.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !carrier.includes("NATURE_QUIRKY")
) throw new Error("MOVE_DOUBLE_KICK source/carrier/component contract changed");

console.log(
  "Move_DOUBLE_KICK exclusive script interval 0x082d2261..0x082d2293 (0x32 bytes); "
  + "HANDS_AND_FEET gfx/pal 0x08c2cbac..0x08c2cdf4, IMPACT gfx/pal 0x08c1a3a0..0x08c1a490; "
  + "gFistFootRandomPosSpriteTemplate -> AnimFistOrFootRandomPos(_Step) creates "
  + "gBasicHitSplatSpriteTemplate, plus AnimTask_ShakeMon(_Step); lowest legal Level-50 carrier "
  + "set 146 FRONTIER_MON_NIDORINA",
);
