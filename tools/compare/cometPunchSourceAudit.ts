import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
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
const block = scripts.slice(scripts.indexOf("Move_COMET_PUNCH:"), scripts.indexOf("Move_SONIC_BOOM:"));
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_LEDIAN]"), mons.indexOf("[FRONTIER_MON_ARIADOS]"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_COMET_PUNCH");
const rows = [
  "loadspritegfx ANIM_TAG_IMPACT", "loadspritegfx ANIM_TAG_HANDS_AND_FEET", "monbg ANIM_TARGET", "setalpha 12, 8",
  "choosetwoturnanim CometPunchLeft, CometPunchRight",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=-8, y=-8, relative_to=ANIM_TARGET, animation=2",
  "create_fist_sprite ANIM_ATTACKER, 3, x=-8, y=0, duration=8",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=8, y=-8, relative_to=ANIM_TARGET, animation=2",
  "create_fist_sprite ANIM_ATTACKER, 3, x=8, y=0, duration=8",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 3, 0, 6, 1",
  "playsewithpan SE_M_COMET_PUNCH, SOUND_PAN_TARGET", "waitforvisualfinish", "clearmonbg ANIM_TARGET", "blendoff", "end",
];

if (
  address("Move_COMET_PUNCH") !== 0x082ca2c3 || address("CometPunchContinue") !== 0x082ca2d7
  || address("CometPunchLeft") !== 0x082ca2f1 || address("CometPunchRight") !== 0x082ca316
  || address("Move_SONIC_BOOM") !== 0x082ca33b || address("gBasicHitSplatSpriteTemplate") !== 0x08597358
  || address("AnimHitSplatBasic") !== 0x08116388 || address("gFistFootSpriteTemplate") !== 0x08595e98
  || address("AnimBasicFistOrFoot") !== 0x0810cee0 || address("AnimTask_ShakeMon") !== 0x080d51ac
  || address("AnimTask_ShakeMon_Step") !== 0x080d5220 || address("gBattleAnimSpriteGfx_HandsAndFeet") !== 0x08c2cbac
  || address("gBattleAnimSpritePal_HandsAndFeet") !== 0x08c2cddc || address("gBattleAnimSpriteGfx_Impact") !== 0x08c1a3a0
  || address("gBattleAnimSpritePal_Impact") !== 0x08c1a478 || rows.some((row) => !block.includes(row))
  || (block.match(/CometPunchLeft:/g) ?? []).length !== 1 || (block.match(/CometPunchRight:/g) ?? []).length !== 1
  || !macros.includes("createsprite gFistFootSpriteTemplate, \\anim_battler, \\subpriority_offset, \\x, \\y, \\duration, \\initPosition, 0")
  || !fight.includes("const struct SpriteTemplate gFistFootSpriteTemplate") || !fight.includes("static void AnimBasicFistOrFoot(struct Sprite *sprite)")
  || !fight.includes("sprite->callback = WaitAnimForDuration;") || !movement.includes("void AnimTask_ShakeMon(u8 taskId)")
  || !movement.includes("static void AnimTask_ShakeMon_Step(u8 taskId)") || !move || move.id !== 4
  || move.frontierMonCount !== 1 || move.exampleMons[0] !== "FRONTIER_MON_LEDIAN"
  || !constants.includes("#define FRONTIER_MON_LEDIAN         159") || !carrier.includes(".species = SPECIES_LEDIAN")
  || !carrier.includes(".moves = {MOVE_COMET_PUNCH, MOVE_BATON_PASS, MOVE_SWORDS_DANCE, MOVE_AGILITY}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_FOCUS_BAND") || !carrier.includes("NATURE_BASHFUL")
) throw new Error("MOVE_COMET_PUNCH source/carrier/component contract changed");

console.log("Move_COMET_PUNCH exclusive pointer interval 0x082ca2c3..0x082ca33b (0x78 bytes); choosetwoturnanim even -> left, odd -> right; IMPACT/basic-hitsplat plus HANDS_AND_FEET gFistFootSpriteTemplate -> AnimBasicFistOrFoot, AnimTask_ShakeMon, monbg/12:8 alpha and SE_M_COMET_PUNCH graph; sole/lowest legal Level-50 carrier set 159 FRONTIER_MON_LEDIAN");
