import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const scripts = readFileSync(
  resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"),
  "utf8",
);
const water = readFileSync(
  resolve(root, "reference/pokeemerald/src/battle_anim_water.c"),
  "utf8",
);
const mons = readFileSync(
  resolve(root, "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
  "utf8",
);
const constants = readFileSync(
  resolve(root, "reference/pokeemerald/include/constants/battle_frontier_mons.h"),
  "utf8",
);

const body = scripts.slice(
  scripts.indexOf("Move_MUD_SHOT:"),
  scripts.indexOf("Move_METEOR_MASH:"),
);
const orbCalls = (body.match(/call MudShotOrbs/g) ?? []).length;
const orbCreates = (body.match(/createsprite gMudShotOrbSpriteTemplate/g) ?? []).length;
if (orbCalls !== 11 || orbCreates !== 2) {
  throw new Error(`expected 11 calls × 2 creates, got ${orbCalls} × ${orbCreates}`);
}
for (const sourceToken of [
  "loadspritegfx ANIM_TAG_BROWN_ORB",
  "createvisualtask AnimTask_StartSinAnimTimer, 5, 100",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 46, 1",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 3, 0, 43, 1",
  "panse SE_M_WHIRLPOOL",
]) {
  if (!body.includes(sourceToken)) throw new Error(`missing ${sourceToken}`);
}
for (const sourceToken of [
  ".tileTag = ANIM_TAG_BROWN_ORB",
  ".paletteTag = ANIM_TAG_BROWN_ORB",
  ".callback = AnimToTargetInSinWave",
  "void AnimTask_StartSinAnimTimer",
]) {
  if (!water.includes(sourceToken)) throw new Error(`missing ${sourceToken}`);
}
if (!constants.includes("#define FRONTIER_MON_KRABBY         111")) {
  throw new Error("FRONTIER_MON_KRABBY numeric identity changed");
}
const krabby = mons.slice(
  mons.indexOf("[FRONTIER_MON_KRABBY]"),
  mons.indexOf("[FRONTIER_MON_EXEGGCUTE]"),
);
if (!krabby.includes(".species = SPECIES_KRABBY")
  || !krabby.includes("MOVE_MUD_SHOT")) {
  throw new Error("set-111 KRABBY is no longer a Mud Shot carrier");
}
const secret = scripts.slice(
  scripts.indexOf("Move_SECRET_POWER:"),
  scripts.indexOf("Move_TWISTER:"),
);
if (!/jumpargeq 0, BATTLE_ENVIRONMENT_BUILDING,\s+Move_STRENGTH/.test(secret)) {
  throw new Error("Secret Power building dispatch changed");
}
console.log("Mud Shot source audit: set 111/species 98/move 341; 11×2 BROWN_ORB; Secret Power building->Strength");
