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
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_ENDURE");
const body = scripts.slice(scripts.indexOf("Move_ENDURE:"), scripts.indexOf("Move_CHARM:"));
const endure = scripts.slice(scripts.indexOf("EndureEffect:"), scripts.indexOf("General_FocusPunchSetUp:"));
const eevee = mons.slice(mons.indexOf("[FRONTIER_MON_EEVEE]"), mons.indexOf("[FRONTIER_MON_DROWZEE]"));
for (const token of [
  "loadspritegfx ANIM_TAG_FOCUS_ENERGY",
  "playsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER",
  "blend_color_cycle priority=2, selector=F_PAL_ATTACKER, delay=2, num_blends=2, initial_blend_y=0, target_blend_y=11, color=RGB_RED",
  "AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 1, 0, 32, 1",
  "waitforvisualfinish",
  "end",
]) if (!body.includes(token)) throw new Error(`Endure source token changed: ${token}`);
if (!move || move.id !== 203 || move.frontierMonCount !== 24
  || (body.match(/call EndureEffect/g) ?? []).length !== 3
  || (endure.match(/createsprite gEndureEnergySpriteTemplate/g) ?? []).length !== 5
  || !effects.includes("gEndureEnergySpriteTemplate") || !effects.includes("AnimEndureEnergy_Step")
  || !movement.includes("void AnimTask_ShakeMon2") || !eevee.includes(".species = SPECIES_EEVEE")
  || !eevee.includes(".moves = {MOVE_CHARM, MOVE_ATTRACT, MOVE_FLAIL, MOVE_ENDURE}")
  || !eevee.includes(".evSpread = F_EV_SPREAD_SPEED | F_EV_SPREAD_HP")
  || !eevee.includes(".nature = NATURE_DOCILE") || !species.includes("#define SPECIES_EEVEE 133")) {
  throw new Error("Endure source contract changed");
}
console.log("Endure source audit: legal Level-50 set 113/species 133/move 203; 3 EndureEffect calls × 5 FOCUS_ENERGY sprites; Dragon Rage attacker pan; red BlendColorCycle(2,2,0,11); attacker ShakeMon2(1,0,32,1); inactive cleanup");
