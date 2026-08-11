import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const block = scripts.slice(scripts.indexOf("Move_DOUBLE_SLAP:"), scripts.indexOf("Move_POISON_POWDER:"));
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_POLIWHIRL]"), mons.indexOf("[FRONTIER_MON_ONIX]"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_DOUBLE_SLAP");
const rows = [
  "loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_TARGET", "setalpha 12, 8",
  "choosetwoturnanim DoubleSlapLeft, DoubleSlapRight",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=-8, y=0, relative_to=ANIM_TARGET, animation=2",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=8, y=0, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 3, 0, 6, 1",
  "playsewithpan SE_M_DOUBLE_SLAP, SOUND_PAN_TARGET", "clearmonbg ANIM_TARGET", "blendoff", "end",
];
if (
  address("Move_DOUBLE_SLAP") !== 0x082c93c9 || address("DoubleSlapContinue") !== 0x082c93da
  || address("DoubleSlapLeft") !== 0x082c93f4 || address("DoubleSlapRight") !== 0x082c9408
  || address("Move_POISON_POWDER") !== 0x082c941c || address("gBasicHitSplatSpriteTemplate") !== 0x08597358
  || address("AnimHitSplatBasic") !== 0x08116388 || address("AnimTask_ShakeMon") !== 0x080d51ac
  || address("AnimTask_ShakeMon_Step") !== 0x080d5220 || address("gBattleAnimSpriteGfx_Impact") !== 0x08c1a3a0
  || address("gBattleAnimSpritePal_Impact") !== 0x08c1a478 || rows.some((row) => !block.includes(row))
  || (block.match(/DoubleSlapLeft:/g) ?? []).length !== 1 || (block.match(/DoubleSlapRight:/g) ?? []).length !== 1
  || !normal.includes("static void AnimHitSplatBasic(struct Sprite *sprite)")
  || !movement.includes("void AnimTask_ShakeMon(u8 taskId)") || !movement.includes("static void AnimTask_ShakeMon_Step(u8 taskId)")
  || !move || move.id !== 3 || move.frontierMonCount !== 1 || move.exampleMons[0] !== "FRONTIER_MON_POLIWHIRL"
  || !constants.includes("#define FRONTIER_MON_POLIWHIRL      155") || !carrier.includes(".species = SPECIES_POLIWHIRL")
  || !carrier.includes(".moves = {MOVE_WATER_PULSE, MOVE_DOUBLE_SLAP, MOVE_ICY_WIND, MOVE_RAIN_DANCE}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_PETAYA_BERRY") || !carrier.includes("NATURE_QUIRKY")
) throw new Error("MOVE_DOUBLE_SLAP source/carrier/branch contract changed");

console.log("Move_DOUBLE_SLAP exclusive pointer interval 0x082c93c9..0x082c941c (0x53 bytes); choosetwoturnanim even -> left, odd -> right; IMPACT/basic-hitsplat, AnimTask_ShakeMon, monbg/alpha and SE_M_DOUBLE_SLAP graph; sole/lowest legal Level-50 carrier set 155 FRONTIER_MON_POLIWHIRL");
