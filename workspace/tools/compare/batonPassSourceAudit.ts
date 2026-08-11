import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
const effects = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_effects_3.c"), "utf8");
const mons = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as {
  entries: readonly { index: number; label: string; moves: readonly string[] }[];
};

const body = scripts.slice(scripts.indexOf("Move_BATON_PASS:"), scripts.indexOf("Move_PERISH_SONG:"));
for (const token of [
  "loadspritegfx ANIM_TAG_POKEBALL",
  "playsewithpan SE_M_BATON_PASS, SOUND_PAN_ATTACKER",
  "selector=F_PAL_BG | F_PAL_BATTLERS, delay=1, num_blends=2",
  "target_blend_y=11, color=RGB(31, 22, 30)",
  "createsprite gBatonPassPokeballSpriteTemplate, ANIM_ATTACKER, 2",
  "end",
]) if (!body.includes(token)) throw new Error(`missing Baton Pass script token: ${token}`);
for (const token of [
  "PrepareBattlerSpriteForRotScale(spriteId, ST_OAM_OBJ_NORMAL)",
  "sprite->data[1] += 96",
  "sprite->data[2] -= 26",
  "if (++sprite->data[3] == 5)",
  "sprite->data[2] += 48",
  "if (++sprite->data[3] == 9)",
  "gSprites[spriteId].invisible = TRUE",
  "ResetSpriteRotScale(spriteId)",
  "sprite->y2 -= 6",
  "sprite->y + sprite->y2 < -32",
]) if (!effects.includes(token)) throw new Error(`missing AnimBatonPassPokeball token: ${token}`);
for (const token of ["gBatonPassPokeballSpriteTemplate", "ANIM_TAG_POKEBALL", "gOamData_AffineOff_ObjNormal_16x16", "AnimBatonPassPokeball"])
  if (!effects.includes(token)) throw new Error(`missing Baton Pass template token: ${token}`);
const carriers = mons.entries.filter((entry) => entry.index >= 110 && entry.moves.includes("MOVE_BATON_PASS"));
if (carriers[0]?.index !== 142 || carriers[0]?.label !== "FRONTIER_MON_AIPOM") {
  throw new Error(`unexpected lowest Baton Pass carrier: ${JSON.stringify(carriers[0])}`);
}
console.log(`MOVE_BATON_PASS source audit exact; ${carriers.length} Factory carriers; lowest set 142 AIPOM`);
