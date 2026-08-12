import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ground = read("reference/pokeemerald/src/battle_anim_ground.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => Number.parseInt(nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"))?.[1] ?? "0", 16);
const block = scripts.slice(scripts.indexOf("Move_FISSURE:"), scripts.indexOf("Move_DIG:"));
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_DUGTRIO_3]"), mons.indexOf("[FRONTIER_MON_MEDICHAM_3]"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_FISSURE");
const fissure = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_FISSURE");
const dig = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_DIG");
const expected = [
  "asset:ANIM_TAG_MUD_SAND", "sprite:gDirtPlumeSpriteTemplate",
  "subroutine:FissureDirtPlumeClose", "subroutine:FissureDirtPlumeFar",
  "task:AnimTask_HorizontalShake", "task:AnimTask_PositionFissureBgOnBattler",
  "visualCommand:complex_palette_blend", "visualCommand:fadetobg",
  "visualCommand:restorebg", "visualCommand:setarg",
  "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
];
const sharedWithDig = dig.componentIds.filter((id: string) => expected.includes(id));
const rows = [
  "loadspritegfx ANIM_TAG_MUD_SAND",
  "createvisualtask AnimTask_HorizontalShake, 3, (MAX_BATTLERS_COUNT + 1), 10, 50",
  "createvisualtask AnimTask_HorizontalShake, 3, ANIM_TARGET, 10, 50",
  "call FissureDirtPlumeFar", "call FissureDirtPlumeClose",
  "complex_palette_blend", "fadetobg BG_FISSURE",
  "createvisualtask AnimTask_PositionFissureBgOnBattler, 5, ANIM_TARGET, 5, -1",
  "restorebg", "setarg 7, -1", "end",
];

if (
  address("Move_FISSURE") !== 0x082ccb7e || address("Move_DIG") !== 0x082ccca1
  || address("FissureDirtPlumeFar") !== 0x082ccbff || address("FissureDirtPlumeClose") !== 0x082ccc50
  || address("gDirtPlumeSpriteTemplate") !== 0x085971fc
  || address("AnimDirtPlumeParticle") !== 0x081151a0 || address("AnimDirtPlumeParticle_Step") !== 0x08115228
  || address("AnimTask_HorizontalShake") !== 0x081152dc
  || address("AnimTask_PositionFissureBgOnBattler") !== 0x08115628
  || address("WaitForFissureCompletion") !== 0x081156d0
  || address("gBattleAnimSpriteGfx_MudSand") !== 0x08c1b29c
  || address("gBattleAnimSpritePal_MudSand") !== 0x08c1b304
  || address("gBattleAnimBgImage_Fissure") !== 0x08d9405c
  || address("gBattleAnimBgPalette_Fissure") !== 0x08d94350
  || address("gBattleAnimBgTilemap_Fissure") !== 0x08d9436c
  || rows.some((row) => !block.includes(row))
  || !ground.includes("void AnimDirtPlumeParticle(struct Sprite *sprite)")
  || !ground.includes("if (TranslateAnimHorizontalArc(sprite))")
  || !ground.includes("void AnimTask_PositionFissureBgOnBattler(u8 taskId)")
  || !ground.includes("if (gBattleAnimArgs[7] == task->data[3])")
  || move?.id !== 90 || move.frontierMonCount !== 9
  || JSON.stringify(fissure.componentIds) !== JSON.stringify(expected)
  || dig.componentIds.length !== 17
  || JSON.stringify(sharedWithDig) !== JSON.stringify(["asset:ANIM_TAG_MUD_SAND", "sprite:gDirtPlumeSpriteTemplate"])
  || !constants.includes("#define FRONTIER_MON_DUGTRIO_3      564")
  || !carrier.includes(".species = SPECIES_DUGTRIO")
  || !carrier.includes(".moves = {MOVE_EARTHQUAKE, MOVE_DOUBLE_EDGE, MOVE_SLUDGE_BOMB, MOVE_FISSURE}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_KINGS_ROCK") || !carrier.includes("NATURE_ADAMANT")
) throw new Error("MOVE_FISSURE source/carrier/component contract changed");

console.log("Move_FISSURE exclusive pointer interval 0x082ccb7e..0x082ccca1 (0x123 bytes); complete 12-component MUD_SAND/dirt-plume/HorizontalShake/Fissure-BG/palette graph; lowest legal Level-50 carrier set 564 FRONTIER_MON_DUGTRIO_3; MOVE_DIG has 17 components and shares exactly MUD_SAND plus gDirtPlumeSpriteTemplate");
