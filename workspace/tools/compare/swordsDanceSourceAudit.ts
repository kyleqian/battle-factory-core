import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const block = scripts.slice(scripts.indexOf("Move_SWORDS_DANCE:"), scripts.indexOf("Move_PSYCH_UP:"));
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_FARFETCHD]"), mons.indexOf("[FRONTIER_MON_OMANYTE]"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_SWORDS_DANCE");
const components = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_SWORDS_DANCE");
const expectedComponents = [
  "asset:ANIM_TAG_SWORD", "sprite:gSwordsDanceBladeSpriteTemplate",
  "task:AnimTask_TranslateMonEllipticalRespectSide", "visualCommand:blendoff",
  "visualCommand:clearmonbg", "visualCommand:flash_anim_tag_with_color",
  "visualCommand:monbg", "visualCommand:setalpha",
];
const rows = [
  "loadspritegfx ANIM_TAG_SWORD", "monbg ANIM_ATTACKER", "setalpha 12, 8",
  "playsewithpan SE_M_SWORDS_DANCE, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_ATTACKER, 16, 6, 1, 4",
  "createsprite gSwordsDanceBladeSpriteTemplate, ANIM_ATTACKER, 2, 0, 0", "delay 22",
  "flash_anim_tag_with_color tag=ANIM_TAG_SWORD, delay=2, num_blends=2, color1=RGB(18, 31, 31), blend_y1=16, color2=RGB_BLACK, blend_y2=0",
  "waitforvisualfinish", "clearmonbg ANIM_ATTACKER", "blendoff", "delay 1", "end",
];
if (
  address("Move_SWORDS_DANCE") !== 0x082caaa4 || address("Move_PSYCH_UP") !== 0x082caaea
  || address("gSwordsDanceBladeSpriteTemplate") !== 0x08593380
  || address("AnimSwordsDanceBlade") !== 0x0810387c || address("AnimSwordsDanceBlade_Step") !== 0x081038a0
  || address("AnimTask_FlashAnimTagWithColor") !== 0x08115d94
  || address("AnimTask_FlashAnimTagWithColor_Step1") !== 0x08115e00
  || address("AnimTask_FlashAnimTagWithColor_Step2") !== 0x08115eb8
  || address("AnimTask_TranslateMonEllipticalRespectSide") !== 0x080d5830
  || address("gBattleAnimSpriteGfx_Sword") !== 0x08c0270c || address("gBattleAnimSpritePal_Sword") !== 0x08c0292c
  || rows.some((row) => !block.includes(row)) || !effects.includes("static void AnimSwordsDanceBlade(struct Sprite *sprite)")
  || !effects.includes("static void AnimSwordsDanceBlade_Step(struct Sprite *sprite)")
  || !normal.includes("void AnimTask_FlashAnimTagWithColor(u8 taskId)")
  || !movement.includes("void AnimTask_TranslateMonEllipticalRespectSide(u8 taskId)")
  || !move || move.id !== 14 || move.frontierMonCount !== 15 || move.exampleMons[0] !== "FRONTIER_MON_FARFETCHD"
  || !components || JSON.stringify(components.componentIds) !== JSON.stringify(expectedComponents)
  || !constants.includes("#define FRONTIER_MON_FARFETCHD      137") || !carrier.includes(".species = SPECIES_FARFETCHD")
  || !carrier.includes(".moves = {MOVE_SLASH, MOVE_KNOCK_OFF, MOVE_SWORDS_DANCE, MOVE_AGILITY}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_STICK") || !carrier.includes("NATURE_RELAXED")
) throw new Error("MOVE_SWORDS_DANCE source/carrier/component contract changed");

console.log("Move_SWORDS_DANCE exclusive pointer interval 0x082caaa4..0x082caaea (0x46 bytes); eight-component SWORD/blade/ellipse/flash/monbg/alpha/audio/cleanup graph; lowest legal Level-50 carrier set 137 FRONTIER_MON_FARFETCHD");
