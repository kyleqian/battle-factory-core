import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_FOCUS_ENERGY");
const body = scripts.slice(scripts.indexOf("Move_FOCUS_ENERGY:"), scripts.indexOf("Move_BIDE:"));
const endure = scripts.slice(scripts.indexOf("EndureEffect:"), scripts.indexOf("General_FocusPunchSetUp:"));
const taillow = mons.slice(mons.indexOf("[FRONTIER_MON_TAILLOW]"), mons.indexOf("[FRONTIER_MON_WINGULL]"));
for (const token of ["loadspritegfx ANIM_TAG_FOCUS_ENERGY", "playsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER", "blend_color_cycle priority=2, selector=F_PAL_ATTACKER, delay=2, num_blends=2, initial_blend_y=0, target_blend_y=11, color=RGB_WHITE", "AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 1, 0, 32, 1", "waitforvisualfinish", "end"])
  if (!body.includes(token)) throw new Error(`Focus Energy source token changed: ${token}`);
if (!move || move.id !== 116 || move.frontierMonCount !== 2 || (body.match(/call EndureEffect/g) ?? []).length !== 3
  || (endure.match(/createsprite gEndureEnergySpriteTemplate/g) ?? []).length !== 5
  || !effects.includes("gEndureEnergySpriteTemplate") || !effects.includes("AnimEndureEnergy_Step")
  || !movement.includes("void AnimTask_ShakeMon2") || !taillow.includes(".species = SPECIES_TAILLOW")
  || !taillow.includes(".moves = {MOVE_FLY, MOVE_QUICK_ATTACK, MOVE_ENDEAVOR, MOVE_FOCUS_ENERGY}")
  || !species.includes("#define SPECIES_TAILLOW 304")) throw new Error("Focus Energy source contract changed");
console.log("Focus Energy source audit: legal set 44/species 304/move 116; 3 EndureEffect calls × 5 FOCUS_ENERGY sprites; Dragon Rage attacker pan; white BlendColorCycle(2,2,0,11); attacker ShakeMon2(1,0,32,1); inactive cleanup");
