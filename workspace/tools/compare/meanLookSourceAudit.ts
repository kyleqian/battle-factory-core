import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
function block(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const move = block(scripts, "Move_MEAN_LOOK:", "Move_ROCK_THROW:");
const definitions = block(effects, "const union AffineAnimCmd gMeanLookEyeAffineAnimCmds1[]", "const struct SpriteTemplate gSpikesSpriteTemplate");
const callbacks = block(effects, "static void AnimMeanLookEye(struct Sprite *sprite)", "\nvoid AnimTask_SetPsychicBackground");
const carrier = mons.slice(mons.indexOf("[FRONTIER_MON_MURKROW_2]"), mons.indexOf("[FRONTIER_MON_MURKROW_2]") + 500);
for (const token of ["loadspritegfx ANIM_TAG_EYE", "monbg ANIM_DEF_PARTNER", "simple_palette_blend selector=F_PAL_BG", "gMeanLookEyeSpriteTemplate", "delay 120", "clearmonbg ANIM_DEF_PARTNER"]) if (!move.includes(token)) throw new Error(`Mean Look source missing ${token}`);
for (const token of ["AFFINEANIMCMD_FRAME(0x180, 0x180, 0, 0)", "AFFINEANIMCMD_FRAME(-0x20, 0x18, 0, 5)", "AFFINEANIMCMD_FRAME(0x18, -0x20, 0, 5)", "AFFINEANIMCMD_FRAME(0x30, 0x30, 0, 0)", "AFFINEANIMCMD_FRAME(0x20, 0x20, 0, 6)", "gOamData_AffineDouble_ObjBlend_64x64"]) if (!definitions.includes(token)) throw new Error(`Mean Look definitions missing ${token}`);
for (const token of ["sprite->data[2]++ > 70", "sprite->data[2]++ > 9", "sprite->data[4]++ > 15", "sprite->data[1]++ > 1", "DestroyAnimSprite(sprite)"]) if (!callbacks.includes(token)) throw new Error(`Mean Look callback missing ${token}`);
if (!constants.includes("#define FRONTIER_MON_MURKROW_2      289") || !carrier.includes(".species = SPECIES_MURKROW") || !carrier.includes("MOVE_MEAN_LOOK") || !carrier.includes("BATTLE_FRONTIER_ITEM_BRIGHT_POWDER") || !animData.includes("{gBattleAnimSpriteGfx_Eye, 0x0800, ANIM_TAG_EYE}") || !animData.includes("{gBattleAnimSpritePal_Eye, ANIM_TAG_EYE}")) throw new Error("Mean Look carrier/EYE source contract changed");
console.log("set 289/FRONTIER_MON_MURKROW_2 -> SPECIES_MURKROW 198/MOVE_MEAN_LOOK 212; 0x082cbf1a..<0x082cbf5f; EYE affine pulse, hidden growth, wobble, fade, monbg, simple palette ramps, audio and cleanup pinned");
