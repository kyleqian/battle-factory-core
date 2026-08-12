import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
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
  scripts.indexOf("Move_METEOR_MASH:"),
  scripts.indexOf("Move_REVENGE:"),
);
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_METANG_2]"),
  mons.indexOf("[FRONTIER_MON_WIGGLYTUFF_2]"),
);
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_METEOR_MASH",
);
const components = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_METEOR_MASH",
);
const expectedComponents = [
  "asset:ANIM_TAG_GOLD_STARS",
  "asset:ANIM_TAG_HANDS_AND_FEET",
  "asset:ANIM_TAG_IMPACT",
  "sprite:gMeteorMashStarSpriteTemplate",
  "sprite:gSpinningHandOrFootSpriteTemplate",
  "task:AnimTask_ShakeMon2",
  "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:fadetobg",
  "visualCommand:panse",
  "visualCommand:restorebg",
  "visualCommand:waitbgfadein",
];
const rows = [
  "loadspritegfx ANIM_TAG_GOLD_STARS",
  "loadspritegfx ANIM_TAG_IMPACT",
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "panse SE_M_BARRIER, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +3, 0",
  "fadetobg BG_COSMIC",
  "createsprite gMeteorMashStarSpriteTemplate, ANIM_TARGET, 3, -48, -64, 72, 32, 30",
  "createsprite gMeteorMashStarSpriteTemplate, ANIM_TARGET, 3, -112, -64, 8, 32, 30",
  "createsprite gSpinningHandOrFootSpriteTemplate, ANIM_TARGET, 3, 0, 0, 0, 30",
  "createsprite gMeteorMashStarSpriteTemplate, ANIM_TARGET, 3, -80, -64, 40, 32, 30",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 5, 0, 20, 1",
  "restorebg",
];

if (
  address("Move_METEOR_MASH") !== 0x082d56aa
  || address("Move_REVENGE") !== 0x082d5731
  || address("gMeteorMashStarSpriteTemplate") !== 0x085ce8dc
  || address("AnimMeteorMashStar") !== 0x0815f18c
  || address("AnimMeteorMashStar_Step") !== 0x0815f10c
  || address("gSpinningHandOrFootSpriteTemplate") !== 0x08595f14
  || address("AnimSpinningKickOrPunch") !== 0x0810d278
  || address("AnimTask_ShakeMon2") !== 0x080d52d0
  || rows.some((row) => !block.includes(row))
  || !effects.includes("const struct SpriteTemplate gMeteorMashStarSpriteTemplate")
  || !effects.includes("static void AnimMeteorMashStar_Step")
  || !effects.includes("sprite->data[5] == sprite->data[4]")
  || !effects.includes("static void AnimMiniTwinklingStar(struct Sprite *sprite)")
  || !effects.includes("rand = Random2() & 3")
  || !effects.includes("y = Random2() & 7")
  || !effects.includes("if (++sprite->data[0] < 30)")
  || !effects.includes("if (sprite->data[0] > 60)")
  || !fight.includes("const struct SpriteTemplate gSpinningHandOrFootSpriteTemplate")
  || !movement.includes("void AnimTask_ShakeMon2(u8 taskId)")
  || move?.id !== 309
  || move.frontierMonCount !== 8
  || JSON.stringify(move.exampleMons) !== JSON.stringify([
    "FRONTIER_MON_METANG_2", "FRONTIER_MON_METAGROSS_1", "FRONTIER_MON_CLEFABLE_2",
  ])
  || JSON.stringify(components?.componentIds) !== JSON.stringify(expectedComponents)
  || !constants.includes("#define FRONTIER_MON_METANG_2       311")
  || !carrier.includes(".species = SPECIES_METANG")
  || !carrier.includes(".moves = {MOVE_METEOR_MASH, MOVE_PSYCHIC, MOVE_BODY_SLAM, MOVE_SCARY_FACE}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_FOCUS_BAND")
  || !carrier.includes("NATURE_QUIRKY")
)
  throw new Error("MOVE_METEOR_MASH source/carrier/component contract changed");

console.log(
  "Move_METEOR_MASH exclusive pointer interval 0x082d56aa..0x082d5731 (0x87 bytes); complete 11-component GOLD_STARS/MeteorStar/SpinningHand/IMPACT/ShakeMon2/BG_COSMIC graph; lowest legal Level-50 carrier set 311 FRONTIER_MON_METANG_2",
);
