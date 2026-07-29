import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const script = read("reference/pokeemerald/data/battle_anim_scripts.s");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_TICKLE");
const body = script.slice(script.indexOf("Move_TICKLE:"), script.indexOf("Move_WATER_SPOUT:"));
if (!move || move.id !== 321 || move.frontierMonCount !== 3
  || !mons.includes("[FRONTIER_MON_OMANYTE]")
  || !mons.includes(".moves = {MOVE_MUD_SHOT, MOVE_WATER_GUN, MOVE_ANCIENT_POWER, MOVE_TICKLE}")
  || !body.includes("loadspritegfx ANIM_TAG_EYE_SPARKLE")
  || (body.match(/gEyeSparkleSpriteTemplate/g) ?? []).length !== 2
  || !body.includes("SE_M_DETECT") || !body.includes("AnimTask_SwayMon, 3, 0, 6, 1280, 3, ANIM_ATTACKER")
  || !body.includes("AnimTask_RockMonBackAndForth, 3, ANIM_TARGET, 6, 2")
  || !body.includes("SE_M_TAIL_WHIP, SOUND_PAN_TARGET, 8, 8")
  || !movement.includes("void AnimTask_SwayMon(u8 taskId)")
  || !effects.includes("void AnimTask_RockMonBackAndForth(u8 taskId)")) throw new Error("Tickle source contract changed");
console.log("set 138/species 139/move 321; EYE_SPARKLE; palette fade; SwayMon(0,6,1280,3); RockMonBackAndForth(target,6,2); DETECT + TAIL_WHIP; cleanup");
