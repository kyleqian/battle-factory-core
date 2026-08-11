import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const monsCode = read("reference/pokeemerald/src/battle_anim_mons.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const rolePlay = block(scripts, "Move_ROLE_PLAY", "Move_REFRESH");
const commands = rolePlay.split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
const expectedCommands = [
  "monbg ANIM_ATK_PARTNER",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 2, 0, 16, RGB_WHITE",
  "simple_palette_blend selector=F_PAL_BG, delay=2, initial_blend_y=0, target_blend_y=10, color=RGB_BLACK",
  "waitforvisualfinish",
  "playsewithpan SE_M_TRI_ATTACK, SOUND_PAN_ATTACKER",
  "waitplaysewithpan SE_M_DETECT, SOUND_PAN_ATTACKER, 30",
  "createvisualtask AnimTask_RolePlaySilhouette, 2",
  "waitforvisualfinish",
  "clearmonbg ANIM_ATK_PARTNER",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 2, 16, 0, RGB_WHITE",
  "delay 8",
  "simple_palette_blend selector=F_PAL_BG, delay=2, initial_blend_y=10, target_blend_y=0, color=RGB_BLACK",
  "end",
];
if (commands.join("\n") !== expectedCommands.join("\n")) {
  throw new Error(`MOVE_ROLE_PLAY 13-command body changed:\n${commands.join("\n")}`);
}

for (const token of [
  "GetMonData(&gPlayerParty[gBattlerPartyIndexes[gBattleAnimTarget]], MON_DATA_PERSONALITY)",
  "GetMonData(&gEnemyParty[gBattlerPartyIndexes[gBattleAnimTarget]], MON_DATA_PERSONALITY)",
  "GetMonData(&gPlayerParty[gBattlerPartyIndexes[gBattleAnimTarget]], MON_DATA_OT_ID)",
  "GetMonData(&gEnemyParty[gBattlerPartyIndexes[gBattleAnimTarget]], MON_DATA_OT_ID)",
  "species = gBattleSpritesDataPtr->battlerData[gBattleAnimTarget].transformSpecies",
  "isBackPic = FALSE",
  "xOffset = 20",
  "isBackPic = TRUE",
  "xOffset = -20",
  "CreateAdditionalMonSpriteForMoveAnim(species, isBackPic, 0, coord1 + xOffset, coord2, 5, personality, otId, gBattleAnimTarget, TRUE)",
  "gSprites[spriteId].oam.priority = priority",
  "gSprites[spriteId].oam.objMode = ST_OAM_OBJ_BLEND",
  "FillPalette(RGB_WHITE, OBJ_PLTT_ID(gSprites[spriteId].oam.paletteNum), PLTT_SIZE_4BPP)",
  "SetGpuReg(REG_OFFSET_BLDCNT, BLDCNT_EFFECT_BLEND | BLDCNT_TGT2_ALL)",
  "SetGpuReg(REG_OFFSET_BLDALPHA, BLDALPHA_BLEND(gTasks[taskId].data[1], 16 - gTasks[taskId].data[1]))",
  "if (gTasks[taskId].data[10]++ > 1)",
  "if (gTasks[taskId].data[1] == 10)",
  "gTasks[taskId].data[10] -= 16",
  "gTasks[taskId].data[11] += 128",
  "gSprites[spriteId].oam.affineMode |= ST_OAM_AFFINE_DOUBLE_MASK",
  "TrySetSpriteRotScale(&gSprites[spriteId], TRUE, gTasks[taskId].data[10], gTasks[taskId].data[11], 0)",
  "if (++gTasks[taskId].data[12] == 9)",
  "ResetSpriteRotScale_PreserveAffine(&gSprites[spriteId])",
  "DestroySpriteAndFreeResources_(&gSprites[spriteId])",
  "gTasks[taskId].func = DestroyAnimVisualTaskAndDisableBlend",
]) if (!effects.includes(token)) throw new Error(`Role Play silhouette source changed: ${token}`);

for (const token of [
  "#define TAG_MOVE_EFFECT_MON_1 55125",
  ".tileTag = TAG_MOVE_EFFECT_MON_1",
  ".paletteTag = TAG_MOVE_EFFECT_MON_1",
  "{ gMiscBlank_Gfx, MON_PIC_SIZE, TAG_MOVE_EFFECT_MON_1, }",
  "u8 CreateAdditionalMonSpriteForMoveAnim",
  "GetMonSpritePalFromSpeciesAndPersonality(species, trainerId, personality)",
  "gMonFrontPicTable[species]",
  "gMonBackPicTable[species]",
  "RequestDma3Copy(gMonSpritesGfxPtr->buffer",
  "AllocSpritePalette(sSpriteTemplates_MoveEffectMons[id].paletteTag)",
  "DestroySpriteAndFreeResources(sprite)",
]) if (!monsCode.includes(token)) throw new Error(`additional-mon source changed: ${token}`);

for (const token of [
  "void AnimTask_BlendBattleAnimPal(u8 taskId)",
  "UnpackSelectedBattlePalettes(gBattleAnimArgs[0])",
  "StartBlendAnimSpriteColor(taskId, selectedPalettes)",
]) if (!utility.includes(token)) throw new Error(`palette task source changed: ${token}`);

const rolePlayEffect = block(battleScripts, "BattleScript_EffectRolePlay", "BattleScript_EffectWish");
for (const token of [
  "accuracycheck BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON",
  "trycopyability BattleScript_ButItFailed",
  "attackanimation",
  "waitanimation",
]) if (!rolePlayEffect.includes(token)) throw new Error(`Role Play success route changed: ${token}`);

const entry = inventory.tiers.level50.moves.find((value: { move: string }) => value.move === "MOVE_ROLE_PLAY");
const carrierStart = mons.indexOf("[FRONTIER_MON_KADABRA_1]");
const carrier = mons.slice(carrierStart, carrierStart + 500);
if (
  !entry || entry.id !== 272 || entry.frontierMonCount !== 1 || entry.speciesCount !== 1
  || entry.exampleMons.join(",") !== "FRONTIER_MON_KADABRA_1"
  || !constants.includes("#define FRONTIER_MON_KADABRA_1      169")
  || !constants.includes("#define FRONTIER_MON_ONIX           156")
  || !carrier.includes(".species = SPECIES_KADABRA")
  || !carrier.includes(".moves = {MOVE_CONFUSION, MOVE_ROLE_PLAY, MOVE_FUTURE_SIGHT, MOVE_DISABLE}")
  || !carrier.includes(".itemTableId = BATTLE_FRONTIER_ITEM_TWISTED_SPOON")
  || !carrier.includes(".evSpread = F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP")
  || !carrier.includes(".nature = NATURE_IMPISH")
) throw new Error("Role Play Level-50 carrier contract changed");

const graphEntry = graph.moves.find((value: { move: string }) => value.move === "MOVE_ROLE_PLAY");
const expectedComponents = [
  "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_RolePlaySilhouette",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:simple_palette_blend",
];
if (!graphEntry || graphEntry.componentIds.join("\n") !== expectedComponents.join("\n")) {
  throw new Error(`Role Play component graph changed: ${JSON.stringify(graphEntry)}`);
}
const megaPunchGraph = graph.moves.find((value: { move: string }) => value.move === "MOVE_MEGA_PUNCH");
const sharedWithMegaPunch = expectedComponents.filter((component) => megaPunchGraph.componentIds.includes(component));
if (
  sharedWithMegaPunch.join("\n") !== [
    "task:AnimTask_BlendBattleAnimPal",
    "visualCommand:clearmonbg",
    "visualCommand:monbg",
    "visualCommand:simple_palette_blend",
  ].join("\n")
  || coverage.entries.find((value: { move: string }) => value.move === "MOVE_MEGA_PUNCH")?.status !== "exact"
) throw new Error("Role Play shared-component control contract changed");

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
for (const token of [
  "082d4fae d Move_ROLE_PLAY",
  "082d500b d Move_REFRESH",
  "0815ced8 T AnimTask_RolePlaySilhouette",
  "0815d160 t AnimTask_RolePlaySilhouette_Step1",
  "0815d1bc t AnimTask_RolePlaySilhouette_Step2",
  "08116620 T AnimTask_BlendBattleAnimPal",
]) if (!nm.includes(token)) throw new Error(`ELF symbol contract changed: ${token}`);

const bytes = execFileSync("arm-none-eabi-objdump", [
  "-s", "--start-address=0x082d4fae", "--stop-address=0x082d500a",
  resolve(root, "reference/pokeemerald/pokeemerald.elf"),
], { encoding: "utf8" });
for (const token of [
  "82d4fae 0a02 03216611 080a0504 00020000 0010",
  "82d4fbe 00ff 7f027472 59080205 01000200 0000",
  "82d4fce 0a00 00000519 dc00c01d d100c01e 03d9",
  "82d4fde ce15 08020005 0b020321 6611080a 0504",
  "82d4fee 0002 00100000 00ff7f04 08027472 5908",
  "82d4ffe 0205 01000200 0a000000 0000",
]) if (!bytes.includes(token)) throw new Error(`Role Play ROM bytes changed: ${token}`);

console.log(
  "MOVE_ROLE_PLAY source checkpoint: exact even ROM interval 0x082d4fae..0x082d500a "
  + "(0x5c bytes), 13 commands, five graph components with sole new task "
  + "AnimTask_RolePlaySilhouette; set 169 FRONTIER_MON_KADABRA_1 is the sole "
  + "and lowest Level-50 carrier; stable target set 156 ONIX. Dense bilateral "
  + "RAM/hardware/raw-RGB/framebuffer evidence, shared additional-mon tile/palette "
  + "TAG_MOVE_EFFECT_MON_1 resource proof, and OAM latch proof are supplied by rolePlayPortable.ts.",
);
