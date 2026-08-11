import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
const movement = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_mon_movement.c"), "utf8");
const flying = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_flying.c"), "utf8");
const frontier = readFileSync(resolve(root, "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"), "utf8");
const block = (start: string, end: string) => scripts.slice(scripts.indexOf(start), scripts.indexOf(end));
const steel = block("Move_STEEL_WING:", "Move_IRON_TAIL:");
const wing = block("Move_WING_ATTACK:", "Move_PECK:");
const razor = block("Move_RAZOR_WIND:", "Move_DISABLE:");

const obligations = [
  "loadspritegfx ANIM_TAG_GUST", "loadspritegfx ANIM_TAG_IMPACT",
  "metallic_shine permanent=FALSE", "SE_M_HARDEN", "monbg ANIM_DEF_PARTNER",
  "splitbgprio ANIM_TARGET", "setalpha 12, 8", "SE_M_WING_ATTACK",
  "AnimTask_TranslateMonElliptical, 2, 0, 12, 4, 1, 4",
  "AnimTask_AnimateGustTornadoPalette, 5, 1, 70",
  "gGustToTargetSpriteTemplate, ANIM_ATTACKER, 2, -25, 0, 0, 0, 20",
  "gGustToTargetSpriteTemplate, ANIM_ATTACKER, 2, 25, 0, 0, 0, 20",
  "delay 24", "gSlideMonToOffsetSpriteTemplate", "delay 17",
  "x=16", "x=-16", "animation=1", "SE_M_RAZOR_WIND",
  "gSlideMonToOriginalPosSpriteTemplate", "clearmonbg ANIM_DEF_PARTNER",
  "blendoff", "end",
];
for (const token of obligations) if (!steel.includes(token)) throw new Error(`Steel Wing source obligation missing: ${token}`);
if (!movement.includes("void AnimTask_TranslateMonElliptical(u8 taskId)")) throw new Error("elliptical source missing");
for (const token of ["gGustToTargetSpriteTemplate", "AnimGustToTarget", "AnimTask_AnimateGustTornadoPalette"]) {
  if (!flying.includes(token)) throw new Error(`gust source missing: ${token}`);
}
if (!frontier.slice(frontier.indexOf("[FRONTIER_MON_WINGULL]"), frontier.indexOf("[FRONTIER_MON_NIDORAN_M]")).includes("MOVE_STEEL_WING")) {
  throw new Error("record-45 Wingull carrier missing");
}
const steelBody = steel.slice(steel.indexOf("monbg ANIM_DEF_PARTNER"));
const wingBody = wing.slice(wing.indexOf("monbg ANIM_DEF_PARTNER"));
if (!steelBody.includes("SE_M_RAZOR_WIND") || !wingBody.includes("SE_M_DOUBLE_SLAP")) throw new Error("distinct hit audio audit failed");
if (razor.includes("gGustToTargetSpriteTemplate") || !razor.includes("gRazorWindTornadoSpriteTemplate")) throw new Error("Razor Wind body audit failed");
console.log("Steel Wing source audit passed; Wing Attack/Razor Wind remain no-credit siblings");
