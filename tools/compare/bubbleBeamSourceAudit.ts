import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
const water = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_water.c"), "utf8");
const movement = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_mon_movement.c"), "utf8");
const mons = readFileSync(resolve(root, "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"), "utf8");
const frontier = readFileSync(resolve(root, "reference/pokeemerald/include/constants/battle_frontier_mons.h"), "utf8");
const species = readFileSync(resolve(root, "reference/pokeemerald/include/constants/species.h"), "utf8");
const moves = readFileSync(resolve(root, "reference/pokeemerald/include/constants/moves.h"), "utf8");

const body = scripts.slice(scripts.indexOf("Move_BUBBLE_BEAM:"), scripts.indexOf("Move_ICY_WIND:"));
const bubbles = scripts.slice(scripts.indexOf("BubblebeamCreateBubbles:"), scripts.indexOf("Move_ICY_WIND:"));
const short = scripts.slice(scripts.indexOf("WaterBubblesEffectShort:"), scripts.indexOf("WaterBubblesEffectLong:"));
if ((body.match(/call BubblebeamCreateBubbles/g) ?? []).length !== 3
  || (bubbles.match(/createsprite gWaterBubbleProjectileSpriteTemplate/g) ?? []).length !== 6
  || (bubbles.match(/playsewithpan SE_M_BUBBLE/g) ?? []).length !== 6
  || (short.match(/createsprite gWaterBubbleSpriteTemplate/g) ?? []).length !== 6
  || (short.match(/playsewithpan SE_M_BUBBLE3/g) ?? []).length !== 6) {
  throw new Error("Bubble Beam literal create-call topology changed");
}
for (const token of [
  "loadspritegfx ANIM_TAG_BUBBLE", "loadspritegfx ANIM_TAG_SMALL_BUBBLES",
  "monbg ANIM_TARGET", "splitbgprio ANIM_TARGET", "setalpha 12, 8",
  "createvisualtask AnimTask_SwayMon, 5, 0, 3, 3072, 8, ANIM_TARGET",
  "waitforvisualfinish", "call WaterBubblesEffectShort", "clearmonbg ANIM_TARGET", "blendoff",
]) if (!body.includes(token)) throw new Error(`missing Bubble Beam script token: ${token}`);
for (const token of [
  ".tileTag = ANIM_TAG_BUBBLE", ".paletteTag = ANIM_TAG_BUBBLE",
  ".callback = AnimWaterBubbleProjectile", "AnimWaterBubbleProjectile_Step1",
  "AnimWaterBubbleProjectile_Step2", "AnimWaterBubbleProjectile_Step3",
  "ANIMCMD_FRAME(0, 1)", "ANIMCMD_FRAME(4, 5)", "ANIMCMD_FRAME(8, 5)",
]) if (!water.includes(token)) throw new Error(`missing Bubble projectile token: ${token}`);
for (const token of ["void AnimTask_SwayMon", "sineIndex = gTasks[taskId].data[10] + gTasks[taskId].data[2]", "DestroyAnimVisualTask(taskId)"])
  if (!movement.includes(token)) throw new Error(`missing SwayMon token: ${token}`);
if (!frontier.includes("#define FRONTIER_MON_SURSKIT        42")
  || !species.includes("#define SPECIES_SURSKIT 311")
  || !moves.includes("#define MOVE_BUBBLE_BEAM 61")) throw new Error("Surskit numeric identity changed");
const set = mons.slice(mons.indexOf("[FRONTIER_MON_SURSKIT]"), mons.indexOf("[FRONTIER_MON_JIGGLYPUFF]"));
for (const token of [".species = SPECIES_SURSKIT", "MOVE_BUBBLE_BEAM", "MOVE_RAIN_DANCE", "MOVE_SWEET_SCENT", "MOVE_QUICK_ATTACK", "NATURE_RELAXED"])
  if (!set.includes(token)) throw new Error(`Surskit set 42 changed: ${token}`);
console.log("Bubble Beam source audit: set 42/species 311/move 61; 3×6=18 BUBBLE projectiles argv [0,35,70,0,256,50] [0,20,40,-10,256,50] [0,10,-60,0,256,50] [0,15,-15,10,256,50] [0,30,10,-10,256,50] [0,25,-30,10,256,50]; SwayMon(0,3,3072,8,target); 6 SMALL_BUBBLES; alpha 12:8");
