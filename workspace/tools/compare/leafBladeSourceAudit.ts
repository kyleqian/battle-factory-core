import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const script = read("reference/pokeemerald/data/battle_anim_scripts.s");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_LEAF_BLADE");
const between = (text: string, start: string, end: string) => {
  const from = text.indexOf(start);
  return text.slice(from, text.indexOf(end, from + start.length));
};
const body = between(script, "Move_LEAF_BLADE:", "Move_DRAGON_DANCE:");
const taskBody = between(
  effects,
  "void AnimTask_LeafBlade(u8 taskId)",
  "static s16 LeafBladeGetPosFactor",
);
const trailBody = between(
  effects,
  "static void AnimTask_LeafBlade_Step2(struct Task *task, u8 taskId)",
  "static void AnimFlyingParticle",
);
const animationTiles = [28, 32, 20, 28, 16, 16, 28];
if (!move || move.id !== 348 || move.frontierMonCount !== 4
  || !mons.includes("[FRONTIER_MON_SCEPTILE_1]") || !mons.includes(".moves = {MOVE_LEAF_BLADE, MOVE_LEECH_SEED, MOVE_AERIAL_ACE, MOVE_DETECT}")
  || !body.includes("loadspritegfx ANIM_TAG_LEAF") || !body.includes("loadspritegfx ANIM_TAG_CROSS_IMPACT")
  || !body.includes("create_leaf_blade_task") || (body.match(/AnimTask_ShakeMon2/g) ?? []).length !== 4
  || (body.match(/SE_M_CUT/g) ?? []).length !== 3 || !body.includes("create_cross_impact_sprite")
  || !body.includes("SE_M_LEER") || !body.includes("clearmonbg ANIM_TARGET") || !body.includes("blendoff")
  || !effects.includes("void AnimTask_LeafBlade(u8 taskId)") || !effects.includes("AnimTask_LeafBlade_Step2_Callback")
  || !effects.includes("gLeafBladeSpriteTemplate")
  || (taskBody.match(/TranslateAnimHorizontalArc\(sprite\)/g) ?? []).length !== 7
  || ![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, "0xFF"].every((state) =>
    taskBody.includes(`case ${state}:`)
  )
  || !taskBody.includes("task->data[4] += 2")
  || !taskBody.includes("task->data[4] -= 2")
  || !taskBody.includes("if (++task->data[1] > 5)")
  || !trailBody.includes("gTasks[taskId].data[12]++")
  || !trailBody.includes("sprite->invisible ^= 1")
  || !trailBody.includes("if (sprite->data[1] > 8)")
  || !animationTiles.every((tile) => effects.includes(`ANIMCMD_FRAME(${tile}, 1`))) {
  throw new Error("Leaf Blade source contract changed");
}
console.log("set 453/species 279/move 348; LEAF + CROSS_IMPACT; states 0..13/0xFF; 7 arcs + 5-tick pauses; blinking child trails; 4 ShakeMon2; 3 CUT + LEER; cleanup");
