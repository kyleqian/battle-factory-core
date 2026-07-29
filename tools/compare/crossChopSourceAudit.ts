import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const script = read("reference/pokeemerald/data/battle_anim_scripts.s");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const fight = read("reference/pokeemerald/src/battle_anim_fight.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_CROSS_CHOP");
const between = (text: string, start: string, end: string) => text.slice(text.indexOf(start), text.indexOf(end));
const body = between(script, "Move_CROSS_CHOP:", "Move_JUMP_KICK:");
if (!move || move.id !== 238 || move.frontierMonCount !== 19 || !body.includes("loadspritegfx ANIM_TAG_CROSS_IMPACT")
  || (body.match(/gCrossChopHandSpriteTemplate/g) ?? []).length !== 2
  || !body.includes("create_cross_impact_sprite") || !body.includes("AnimTask_ShakeMon, 5, ANIM_TARGET, 7, 0, 9, 1")
  || !body.includes("complex_palette_blend") || !body.includes("clearmonbg ANIM_DEF_PARTNER")
  || !mons.includes("[FRONTIER_MON_MACHOKE_2]") || !mons.includes(".moves = {MOVE_CROSS_CHOP, MOVE_ROCK_SLIDE, MOVE_FORESIGHT, MOVE_SCARY_FACE}")
  || !fight.includes("gCrossChopHandSpriteTemplate") || !fight.includes("AnimCrossChopHand_Step")
  || !normal.includes("gCrossImpactSpriteTemplate") || !normal.includes("WaitAnimForDuration")) {
  throw new Error("Cross Chop source contract changed");
}
console.log("set 283/species 67/move 238; 2 HANDS_AND_FEET + 1 CROSS_IMPACT; alpha 12:8; target ShakeMon(7,0,9,1); cleanup");
