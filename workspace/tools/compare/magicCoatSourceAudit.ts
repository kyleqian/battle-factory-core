import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const psychic = read("reference/pokeemerald/src/battle_anim_psychic.c");
const graphicsTable = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const start = scripts.indexOf("Move_MAGIC_COAT:");
const end = scripts.indexOf("Move_WATER_PULSE:", start);
if (start < 0 || end < 0) throw new Error("Magic Coat source body missing");
const body = scripts.slice(start, end);
for (const literal of [
  "loadspritegfx ANIM_TAG_ORANGE_LIGHT_WALL",
  "setalpha 0, 16",
  "waitplaysewithpan SE_M_BARRIER, SOUND_PAN_ATTACKER, 15",
  "createsprite gMagicCoatWallSpriteTemplate, ANIM_ATTACKER, 3, 40, 0, ANIM_TAG_ORANGE_LIGHT_WALL",
  "waitforvisualfinish", "delay 1", "blendoff", "end",
]) if (!body.includes(literal)) throw new Error(`Move_MAGIC_COAT lost ${literal}`);
if (body.trim().split("\n").length !== 9) throw new Error("Magic Coat body size changed");
for (const literal of [
  "const struct SpriteTemplate gMagicCoatWallSpriteTemplate",
  ".tileTag = ANIM_TAG_ORANGE_LIGHT_WALL",
  ".paletteTag = ANIM_TAG_ORANGE_LIGHT_WALL",
  ".oam = &gOamData_AffineOff_ObjBlend_64x64",
  ".callback = AnimDefensiveWall",
  "MoveBattlerSpriteToBG", "ResetBattleAnimBg",
  "SetGpuReg(REG_OFFSET_BLDALPHA",
  "gPlttBufferFaded[startOffset + 1] = color",
  "sprite->callback = DestroyAnimSprite",
]) if (!psychic.includes(literal)) throw new Error(`AnimDefensiveWall lost ${literal}`);
for (const literal of [
  "{gBattleAnimSpriteGfx_GreenLightWall, 0x0800, ANIM_TAG_ORANGE_LIGHT_WALL}",
  "{gBattleAnimSpritePal_OrangeLightWall, ANIM_TAG_ORANGE_LIGHT_WALL}",
]) if (!graphicsTable.includes(literal)) throw new Error(`graphics table lost ${literal}`);
if (!graphics.includes("gBattleAnimSpritePal_OrangeLightWall")) throw new Error("orange wall palette changed");
const spoink = mons.slice(mons.indexOf("[FRONTIER_MON_SPOINK]"), mons.indexOf("[FRONTIER_MON_SPOINK]") + 450);
const entry = inventory.tiers.level50.moves.find((item: { move: string }) => item.move === "MOVE_MAGIC_COAT");
if (!constants.includes("#define FRONTIER_MON_SPOINK         121")
  || !spoink.includes(".species = SPECIES_SPOINK")
  || !spoink.includes("MOVE_MAGIC_COAT")
  || !spoink.includes("BATTLE_FRONTIER_ITEM_SITRUS_BERRY")
  || !spoink.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !spoink.includes("NATURE_RELAXED")
  || !entry || entry.id !== 277 || entry.exampleMons[0] !== "FRONTIER_MON_SPOINK") {
  throw new Error("Magic Coat inventory contract changed");
}
console.log(JSON.stringify({
  move: "MOVE_MAGIC_COAT", moveId: 277,
  sourceBounds: { start: "0x082d6c5d", endExclusive: "0x082d6c7a", byteBody: "0x1d label-address bytes / 0x1e Thumb-data-symbol convention" },
  lowestCarrier: "set 121 FRONTIER_MON_SPOINK / SPECIES_SPOINK 351",
  components: ["asset:ANIM_TAG_ORANGE_LIGHT_WALL", "sprite:gMagicCoatWallSpriteTemplate", "visualCommand:setalpha", "visualCommand:blendoff"],
}));
