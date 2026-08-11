import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
const monMovement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const stomp = block(scripts, "Move_STOMP", "Move_TAIL_WHIP");
const loudred = mons.slice(mons.indexOf("[FRONTIER_MON_LOUDRED]"), mons.indexOf("[FRONTIER_MON_LOUDRED]") + 500);
for (const text of [
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_TARGET",
  "setalpha 12, 8",
  "playsewithpan SE_M_DOUBLE_TEAM, SOUND_PAN_TARGET",
  "createsprite gStompFootSpriteTemplate, ANIM_ATTACKER, 3, 0, -32, 15",
  "delay 19",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=-8, relative_to=ANIM_TARGET, animation=1",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 4, 9, 1",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "clearmonbg ANIM_TARGET",
  "blendoff",
]) if (!stomp.includes(text)) throw new Error(`MOVE_STOMP source changed: ${text}`);
for (const text of [
  "const struct SpriteTemplate gStompFootSpriteTemplate",
  ".anims = &sAnims_HandsAndFeet[1]",
  ".callback = AnimStompFoot",
  "static void AnimStompFoot(struct Sprite *sprite)",
  "sprite->data[0] = gBattleAnimArgs[2]",
  "if (--sprite->data[0] == -1)",
  "sprite->data[0] = 6",
  "BATTLER_COORD_Y_PIC_OFFSET",
  "StoreSpriteCallbackInData6(sprite, AnimStompFoot_End)",
  "sprite->data[0] = 15",
]) if (!fight.includes(text)) throw new Error(`gStompFoot source changed: ${text}`);
for (const text of [
  "void AnimTask_ShakeMon(u8 taskId)",
  "gSprites[spriteId].y2 = gBattleAnimArgs[2]",
  "gTasks[taskId].data[3] = gBattleAnimArgs[4]",
  "static void AnimTask_ShakeMon_Step(u8 taskId)",
]) if (!monMovement.includes(text)) throw new Error(`ShakeMon source changed: ${text}`);
if (!constants.includes("#define FRONTIER_MON_LOUDRED        144")
  || !loudred.includes(".species = SPECIES_LOUDRED")
  || !loudred.includes(".moves = {MOVE_STOMP, MOVE_HOWL, MOVE_ASTONISH, MOVE_SUPERSONIC}")) {
  throw new Error("set 144 Loudred/Stomp source contract changed");
}
console.log("MOVE_STOMP: set-144 LOUDRED uses unique gStompFootSpriteTemplate; 15 wait + six-step downward translation + 15 tail, animation-1 IMPACT, target ShakeMon, monbg/12:8 alpha and two target-pan sounds");
