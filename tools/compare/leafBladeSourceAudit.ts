import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const script = read("reference/pokeemerald/data/battle_anim_scripts.s");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_LEAF_BLADE");
const between = (text: string, start: string, end: string) => text.slice(text.indexOf(start), text.indexOf(end));
const body = between(script, "Move_LEAF_BLADE:", "Move_DRAGON_DANCE:");
if (!move || move.id !== 348 || move.frontierMonCount !== 4
  || !mons.includes("[FRONTIER_MON_SCEPTILE_1]") || !mons.includes(".moves = {MOVE_LEAF_BLADE, MOVE_LEECH_SEED, MOVE_AERIAL_ACE, MOVE_DETECT}")
  || !body.includes("loadspritegfx ANIM_TAG_LEAF") || !body.includes("loadspritegfx ANIM_TAG_CROSS_IMPACT")
  || !body.includes("create_leaf_blade_task") || (body.match(/AnimTask_ShakeMon2/g) ?? []).length !== 4
  || (body.match(/SE_M_CUT/g) ?? []).length !== 3 || !body.includes("create_cross_impact_sprite")
  || !body.includes("SE_M_LEER") || !body.includes("clearmonbg ANIM_TARGET") || !body.includes("blendoff")
  || !effects.includes("void AnimTask_LeafBlade(u8 taskId)") || !effects.includes("AnimTask_LeafBlade_Step2_Callback")
  || !effects.includes("gLeafBladeSpriteTemplate")) throw new Error("Leaf Blade source contract changed");
console.log("set 453/species 279/move 348; LEAF + CROSS_IMPACT; LeafBlade task/trails; 4 ShakeMon2; 3 CUT + LEER; cleanup");
