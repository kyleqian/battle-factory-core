import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
const monsCode = read("reference/pokeemerald/src/battle_anim_mons.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const karate = block(scripts, "Move_KARATE_CHOP", "Move_CROSS_CHOP");
const primeapeStart = mons.indexOf("[FRONTIER_MON_PRIMEAPE_1]");
if (primeapeStart < 0) throw new Error("missing FRONTIER_MON_PRIMEAPE_1");
const primeape = mons.slice(primeapeStart, primeapeStart + 500);
const entry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_KARATE_CHOP",
);

for (const text of [
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "splitbgprio ANIM_TARGET",
  "setalpha 12, 8",
  "playsewithpan SE_M_DOUBLE_TEAM, SOUND_PAN_TARGET",
  "createsprite gKarateChopSpriteTemplate, ANIM_ATTACKER, 2, -16, 0, 0, 0, 10, 1, 3, 0",
  "playsewithpan SE_M_COMET_PUNCH, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 4, 0, 6, 1",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
]) if (!karate.includes(text)) throw new Error(`MOVE_KARATE_CHOP source changed: ${text}`);

for (const text of [
  "const struct SpriteTemplate gKarateChopSpriteTemplate",
  ".tileTag = ANIM_TAG_HANDS_AND_FEET",
  ".oam = &gOamData_AffineOff_ObjNormal_32x32",
  ".anims = sAnims_HandsAndFeet",
  ".affineAnims = gDummySpriteAffineAnimTable",
  ".callback = AnimSlideHandOrFootToTarget",
  "static void AnimSlideHandOrFootToTarget(struct Sprite *sprite)",
  "StartSpriteAnim(sprite, gBattleAnimArgs[6])",
  "AnimTravelDiagonally(sprite)",
]) if (!fight.includes(text)) throw new Error(`Karate Chop sprite source changed: ${text}`);

for (const text of [
  "void AnimTravelDiagonally(struct Sprite *sprite)",
  "InitSpritePosToAnimTarget(sprite, respectMonPicOffsets)",
  "sprite->data[0] = gBattleAnimArgs[4]",
  "sprite->callback = StartAnimLinearTranslation",
  "StoreSpriteCallbackInData6(sprite, DestroyAnimSprite)",
]) if (!monsCode.includes(text)) throw new Error(`diagonal translation source changed: ${text}`);

for (const text of [
  "void AnimTask_ShakeMon(u8 taskId)",
  "gSprites[spriteId].x2 = gBattleAnimArgs[1]",
  "gTasks[taskId].data[3] = gBattleAnimArgs[4]",
  "static void AnimTask_ShakeMon_Step(u8 taskId)",
  "DestroyAnimVisualTask(taskId)",
]) if (!movement.includes(text)) throw new Error(`ShakeMon source changed: ${text}`);

for (const text of [
  "static const union AffineAnimCmd sAffineAnim_HitSplat_2[]",
  "AFFINEANIMCMD_FRAME(0xB0, 0xB0, 0, 0)",
  "AFFINEANIMCMD_FRAME(0x0, 0x0, 0, 8)",
  "const struct SpriteTemplate gBasicHitSplatSpriteTemplate",
  ".oam = &gOamData_AffineNormal_ObjBlend_32x32",
  ".callback = AnimHitSplatBasic",
]) if (!normal.includes(text)) throw new Error(`animation-2 IMPACT source changed: ${text}`);

if (
  !entry || entry.id !== 2 || entry.frontierMonCount !== 1 || entry.speciesCount !== 1
  || entry.exampleMons.join(",") !== "FRONTIER_MON_PRIMEAPE_1"
  || !constants.includes("#define FRONTIER_MON_MANKEY         81")
  || !constants.includes("#define FRONTIER_MON_PRIMEAPE_1     232")
  || !primeape.includes(".species = SPECIES_PRIMEAPE")
  || !primeape.includes(".moves = {MOVE_KARATE_CHOP, MOVE_COUNTER, MOVE_SWAGGER, MOVE_SCREECH}")
  || !primeape.includes(".itemTableId = BATTLE_FRONTIER_ITEM_SCOPE_LENS")
  || !primeape.includes(".evSpread = F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP")
  || !primeape.includes(".nature = NATURE_QUIRKY")
) throw new Error("Karate Chop Level-50 inventory contract changed");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "reference/pokeemerald/pokeemerald.elf"], {
  encoding: "utf8",
  // The pinned ELF carries debug symbols; `nm -a` is ~7 MB in this build.
  maxBuffer: 16 * 1024 * 1024,
});
for (const text of [
  "082d20b3 d Move_KARATE_CHOP",
  "082d2105 d Move_CROSS_CHOP",
  "08595e68 R gKarateChopSpriteTemplate",
  "0810ce68 t AnimSlideHandOrFootToTarget",
  "080d51ac T AnimTask_ShakeMon",
]) if (!nm.includes(text)) throw new Error(`ELF symbol contract changed: ${text}`);

console.log(
  "MOVE_KARATE_CHOP source checkpoint: Move_KARATE_CHOP 0x082d20b3 through "
  + "first byte before Move_CROSS_CHOP 0x082d2105 (0x52 bytes); set 232 "
  + "FRONTIER_MON_PRIMEAPE_1 is the sole and lowest legal Level-50 carrier. "
  + "Set 81 Mankey is below the Level-50 challenge range. Full dense bilateral "
  + "hardware/OAM evidence, reducer, typed seam, compositor, and controls remain required.",
);
