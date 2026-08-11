import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string =>
  readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
const address = (symbol: string): number => {
  const match = nm.match(
    new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"),
  );
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};

const block = scripts.slice(
  scripts.indexOf("Move_LEER:"),
  scripts.indexOf("Move_DREAM_EATER:"),
);
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_DRAGONAIR_1]"),
  mons.indexOf("[FRONTIER_MON_MIGHTYENA_1]"),
);
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_LEER",
);
const components = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_LEER",
);
const expectedComponents = [
  "asset:ANIM_TAG_LEER",
  "sprite:gLeerSpriteTemplate",
  "task:AnimTask_ScaleMonAndRestore",
  "task:AnimTask_ShakeMon2",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:setalpha",
  "visualCommand:splitbgprio",
];
const rows = [
  "loadspritegfx ANIM_TAG_LEER",
  "monbg ANIM_ATTACKER",
  "splitbgprio ANIM_ATTACKER",
  "setalpha 8, 8",
  "playsewithpan SE_M_LEER, SOUND_PAN_ATTACKER",
  "createsprite gLeerSpriteTemplate, ANIM_ATTACKER, 2, 24, -12",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -5, -5, 10, ANIM_ATTACKER, 1",
  "delay 10",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 1, 0, 9, 1",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_DEF_PARTNER, 1, 0, 9, 1",
  "clearmonbg ANIM_ATTACKER",
  "blendoff",
  "delay 1",
  "end",
];

if (
  address("Move_LEER") !== 0x082d2d90 ||
  address("Move_DREAM_EATER") !== 0x082d2de7 ||
  address("gLeerSpriteTemplate") !== 0x085ce150 ||
  address("gLeerAnimCmds") !== 0x085ce134 ||
  address("gLeerAnimTable") !== 0x085ce14c ||
  address("AnimLeer") !== 0x0815a7b0 ||
  address("AnimTask_ScaleMonAndRestore") !== 0x080d6064 ||
  address("AnimTask_ScaleMonAndRestore_Step") !== 0x080d60bc ||
  address("AnimTask_ShakeMon2") !== 0x080d52d0 ||
  address("AnimTask_ShakeMon2_Step") !== 0x080d53bc ||
  address("gBattleAnimSpriteGfx_Leer") !== 0x08c0481c ||
  address("gBattleAnimSpritePal_Leer") !== 0x08c047f4 ||
  rows.some((row) => !block.includes(row)) ||
  !effects.includes("static void AnimLeer(struct Sprite *sprite)") ||
  !effects.includes("ANIMCMD_FRAME(64, 3)") ||
  !movement.includes("void AnimTask_ScaleMonAndRestore(u8 taskId)") ||
  !movement.includes("void AnimTask_ShakeMon2(u8 taskId)") ||
  !move ||
  move.id !== 43 ||
  move.frontierMonCount !== 1 ||
  JSON.stringify(move.exampleMons) !==
    JSON.stringify(["FRONTIER_MON_DRAGONAIR_1"]) ||
  !components ||
  JSON.stringify(components.componentIds) !==
    JSON.stringify(expectedComponents) ||
  !constants.includes("#define FRONTIER_MON_DRAGONAIR_1    201") ||
  !carrier.includes(".species = SPECIES_DRAGONAIR") ||
  !carrier.includes(
    ".moves = {MOVE_DRAGON_BREATH, MOVE_LEER, MOVE_WRAP, MOVE_SAFEGUARD}",
  ) ||
  !carrier.includes("BATTLE_FRONTIER_ITEM_CHERI_BERRY") ||
  !carrier.includes("NATURE_DOCILE")
)
  throw new Error("MOVE_LEER source/carrier/component contract changed");

console.log(
  "Move_LEER exclusive pointer interval 0x082d2d90..0x082d2de7 (0x57 bytes); nine-component LEER/ScaleMonAndRestore/ShakeMon2/monbg/splitbgprio/8:8 alpha graph plus SE_M_LEER; sole legal Level-50 carrier set 201 FRONTIER_MON_DRAGONAIR_1",
);
