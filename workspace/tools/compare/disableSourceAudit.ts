import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const status = read("reference/pokeemerald/src/battle_anim_status_effects.c");
const monsAnim = read("reference/pokeemerald/src/battle_anim_mons.c");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const frontierMons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));

const start = scripts.indexOf("Move_DISABLE:");
const end = scripts.indexOf("Move_RECOVER:", start);
if (start < 0 || end < 0) throw new Error("Move_DISABLE source bounds missing");
const body = scripts.slice(start, end);
for (const literal of [
  "loadspritegfx ANIM_TAG_SPARKLE_4",
  "monbg ANIM_TARGET",
  "splitbgprio ANIM_TARGET",
  "setalpha 8, 8",
  "playsewithpan SE_M_DETECT, SOUND_PAN_ATTACKER",
  "createsprite gSpinningSparkleSpriteTemplate, ANIM_ATTACKER, 13, 24, -16",
  "waitforvisualfinish",
  "createvisualtask AnimTask_GrowAndGrayscale, 5",
  "loopsewithpan SE_M_BIND, SOUND_PAN_TARGET, 15, 4",
  "delay 1",
  "clearmonbg ANIM_TARGET",
  "blendoff",
  "end",
]) if (!body.includes(literal)) throw new Error(`Move_DISABLE lost ${literal}`);
if (body.trim().split("\n").length !== 15) throw new Error("Move_DISABLE body size changed");

for (const literal of [
  "void AnimTask_GrowAndGrayscale(u8 taskId)",
  "PrepareBattlerSpriteForRotScale(spriteId, ST_OAM_OBJ_BLEND)",
  "SetSpriteRotScale(spriteId, 0xD0, 0xD0, 0)",
  "SetGrayscaleOrOriginalPalette(gSprites[spriteId].oam.paletteNum + 16, FALSE)",
  "gTasks[taskId].data[0] = 80",
  "static void AnimTask_GrowAndGrayscale_Step(u8 taskId)",
  "if (--gTasks[taskId].data[0] == -1)",
  "ResetSpriteRotScale(spriteId)",
  "SetGrayscaleOrOriginalPalette(gSprites[spriteId].oam.paletteNum + 16, TRUE)",
  "DestroyAnimVisualTask(taskId)",
]) if (!effects.includes(literal)) throw new Error(`GrowAndGrayscale lost ${literal}`);
for (const literal of [
  "sAnim_SpinningSparkle",
  "ANIMCMD_FRAME(0, 3)",
  "ANIMCMD_FRAME(16, 3)",
  "ANIMCMD_FRAME(32, 3)",
  "ANIMCMD_FRAME(48, 3)",
  "ANIMCMD_FRAME(64, 3)",
  "gSpinningSparkleSpriteTemplate",
  ".callback = AnimSpinningSparkle",
]) if (!status.includes(literal)) throw new Error(`sparkle program lost ${literal}`);
for (const literal of [
  "void AnimSpinningSparkle(struct Sprite *sprite)",
  "SetSpriteCoordsToAnimAttackerCoords(sprite)",
  "if (GetBattlerSide(gBattleAnimAttacker))",
  "sprite->x += gBattleAnimArgs[0]",
  "sprite->x -= gBattleAnimArgs[0]",
]) if (!monsAnim.includes(literal)) throw new Error(`sparkle placement lost ${literal}`);
if (!songs.includes("#define SE_M_BIND                   170")
  || !songs.includes("#define SE_M_DETECT                 209")) {
  throw new Error("Disable audio constants changed");
}
if (!frontierConstants.includes("#define FRONTIER_MON_DROWZEE        114")) {
  throw new Error("Drowzee set id changed");
}
const drowzeeStart = frontierMons.indexOf("[FRONTIER_MON_DROWZEE]");
const drowzee = frontierMons.slice(drowzeeStart, drowzeeStart + 500);
for (const literal of [
  ".species = SPECIES_DROWZEE",
  ".moves = {MOVE_CONFUSION, MOVE_HEADBUTT, MOVE_DISABLE, MOVE_BARRIER}",
  ".itemTableId = BATTLE_FRONTIER_ITEM_SITRUS_BERRY",
  ".evSpread = F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP",
  ".nature = NATURE_QUIRKY",
]) if (!drowzee.includes(literal)) throw new Error(`set 114 lost ${literal}`);
const entry = inventory.tiers.level50.moves.find((item: { move: string }) => item.move === "MOVE_DISABLE");
if (!entry || entry.id !== 50 || entry.frontierMonCount !== 5 || entry.exampleMons[0] !== "FRONTIER_MON_DROWZEE") {
  throw new Error("Disable inventory contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_DISABLE",
  moveId: 50,
  sourceBounds: { start: "0x082d3a67", endExclusive: "0x082d3a95" },
  taskBounds: { start: "0x081045b0", step: "0x08104614" },
  carrier: "FRONTIER_MON_DROWZEE 114",
  components: [
    "asset:ANIM_TAG_SPARKLE_4",
    "sprite:gSpinningSparkleSpriteTemplate",
    "task:AnimTask_GrowAndGrayscale",
    "monbg/splitbgprio/alpha/cleanup",
    "audio:SE_M_DETECT attacker + SE_M_BIND target",
  ],
}));
