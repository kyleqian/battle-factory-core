import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const psychic = read("reference/pokeemerald/src/battle_anim_psychic.c");
const graphicsTable = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const monConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));

const start = scripts.indexOf("Move_BARRIER:");
const end = scripts.indexOf("Move_BUBBLE:", start);
if (start < 0 || end < 0) throw new Error("Move_BARRIER source body missing");
const body = scripts.slice(start, end);
for (const literal of [
  "loadspritegfx ANIM_TAG_GRAY_LIGHT_WALL",
  "setalpha 0, 16",
  "waitplaysewithpan SE_M_BARRIER, SOUND_PAN_ATTACKER, 15",
  "createsprite gBarrierWallSpriteTemplate, ANIM_ATTACKER, 3, 40, 0, ANIM_TAG_GRAY_LIGHT_WALL",
  "waitforvisualfinish",
  "delay 1",
  "blendoff",
  "end",
]) if (!body.includes(literal)) throw new Error(`Move_BARRIER lost ${literal}`);
if (body.trim().split("\n").length !== 9) throw new Error("Move_BARRIER body size changed");

for (const literal of [
  "const struct SpriteTemplate gBarrierWallSpriteTemplate",
  ".tileTag = ANIM_TAG_GRAY_LIGHT_WALL",
  ".paletteTag = ANIM_TAG_GRAY_LIGHT_WALL",
  ".oam = &gOamData_AffineOff_ObjBlend_64x64",
  ".callback = AnimDefensiveWall",
  "static void AnimDefensiveWall(struct Sprite *sprite)",
  "static void AnimDefensiveWall_Step1(struct Sprite *sprite)",
  "static void AnimDefensiveWall_Step2(struct Sprite *sprite)",
  "static void AnimDefensiveWall_Step3(struct Sprite *sprite)",
  "static void AnimDefensiveWall_Step4(struct Sprite *sprite)",
  "static void AnimDefensiveWall_Step5(struct Sprite *sprite)",
  "MoveBattlerSpriteToBG",
  "ResetBattleAnimBg",
  "SetGpuReg(REG_OFFSET_BLDALPHA",
  "gPlttBufferFaded[startOffset + 1] = color",
  "sprite->callback = DestroyAnimSprite",
]) if (!psychic.includes(literal)) throw new Error(`AnimDefensiveWall lost ${literal}`);
for (const literal of [
  "{gBattleAnimSpriteGfx_GreenLightWall, 0x0800, ANIM_TAG_GRAY_LIGHT_WALL}",
  "{gBattleAnimSpritePal_GrayLightWall, ANIM_TAG_GRAY_LIGHT_WALL}",
]) if (!graphicsTable.includes(literal)) throw new Error(`graphics table lost ${literal}`);
if (!graphics.includes("gBattleAnimSpritePal_GrayLightWall")
  || !songs.includes("#define SE_M_BARRIER                208")) {
  throw new Error("gray palette or BARRIER song contract changed");
}

for (const literal of [
  "#define FRONTIER_MON_DROWZEE        114",
  "#define FRONTIER_MON_TENTACOOL      124",
  "#define FRONTIER_MON_MAGMAR_1       415",
  "#define FRONTIER_MON_CRADILY_1      416",
  "#define FRONTIER_MON_TENTACRUEL_1   434",
]) if (!monConstants.includes(literal)) throw new Error(`carrier constant changed: ${literal}`);
if (!species.includes("#define SPECIES_DROWZEE 96")) throw new Error("DROWZEE species id changed");
for (const label of ["DROWZEE", "TENTACOOL", "MAGMAR_1", "CRADILY_1", "TENTACRUEL_1"])
  if (!mons.slice(mons.indexOf(`[FRONTIER_MON_${label}]`), mons.indexOf(`[FRONTIER_MON_${label}]`) + 400).includes("MOVE_BARRIER"))
    throw new Error(`${label} lost MOVE_BARRIER`);
const entry = inventory.tiers.level50.moves.find((item: { move: string }) => item.move === "MOVE_BARRIER");
if (!entry || entry.id !== 112 || entry.frontierMonCount !== 5 || entry.exampleMons[0] !== "FRONTIER_MON_DROWZEE")
  throw new Error("BARRIER inventory contract changed");

console.log(JSON.stringify({
  move: "MOVE_BARRIER", moveId: 112,
  sourceBounds: { start: "0x082d00f2", endExclusive: "0x082d010f" },
  lowestCarrier: "set 114 FRONTIER_MON_DROWZEE / SPECIES_DROWZEE 96",
  carriers: [114, 124, 415, 416, 434],
  components: [
    "asset:ANIM_TAG_GRAY_LIGHT_WALL", "sprite:gBarrierWallSpriteTemplate",
    "callback:AnimDefensiveWall steps 0-5 through destroy",
    "visualCommand:setalpha", "visualCommand:blendoff",
    "audio:SE_M_BARRIER attacker pan / 15-frame wait",
  ],
}));
