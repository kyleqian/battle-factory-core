import { readFileSync } from "node:fs";

const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const water = readFileSync("reference/pokeemerald/src/battle_anim_water.c", "utf8");
const utility = readFileSync("reference/pokeemerald/src/battle_anim_utility_funcs.c", "utf8");

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`); const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}
function need(source: string, text: string): void {
  if (!source.includes(text)) throw new Error(`missing source text: ${text}`);
}

const surf = block(scripts, "Move_SURF", "Move_FLAMETHROWER");
const muddy = block(scripts, "Move_MUDDY_WATER", "Move_BULLET_SEED");
const secret = block(scripts, "Move_SECRET_POWER", "Move_TWISTER");
const commandStart = water.indexOf("void AnimTask_CreateSurfWave");
const commandEnd = water.indexOf("static void AnimSmallDriftingBubbles", commandStart);
if (commandStart < 0 || commandEnd < 0) throw new Error("missing Surf-wave task source");
const command = water.slice(commandStart, commandEnd);

need(surf, "create_surf_wave palette=ANIM_SURF_PAL_SURF");
need(surf, "delay 24"); need(surf, "panse SE_M_SURF, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +2, 0");
need(muddy, "panse SE_M_WHIRLPOOL, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +2, 0");
need(muddy, "create_surf_wave palette=ANIM_SURF_PAL_MUDDY_WATER");
for (const text of [
  "gBattleAnimBgTilemap_SurfOpponent", "gBattleAnimBgTilemap_SurfPlayer",
  "gBattleAnimBgImage_Surf", "gBattleAnimBgPalette_Surf",
  "gBattleAnimBackgroundImageMuddyWater_Pal", "AnimTask_SurfWaveScanlineEffect",
  "SetGpuReg(REG_OFFSET_BLDCNT, BLDCNT_TGT1_BG1 | BLDCNT_EFFECT_BLEND | BLDCNT_TGT2_ALL)",
  "SetGpuReg(REG_OFFSET_BLDALPHA, BLDALPHA_BLEND(0, 16))", "ClearBattleAnimBg(1)",
  "ClearBattleAnimBg(2)", "ScanlineEffect_Stop()",
]) need(command, text);
need(utility, "gBattleAnimArgs[0] = gBattleEnvironment;");
need(secret, "createvisualtask AnimTask_GetBattleEnvironment, 5");
need(secret, "jumpargeq 0, BATTLE_ENVIRONMENT_BUILDING,   Move_STRENGTH");
need(secret, "jumpargeq 0, BATTLE_ENVIRONMENT_WATER,      Move_SURF");

console.log(JSON.stringify({
  component: "visualCommand:create_surf_wave",
  representative: "MOVE_SURF",
  sourceModel: "BG1 water gfx/tilemap/palette + controller task + scanline BLDALPHA DMA; no software effect sprite",
  siblings: {
    MOVE_MUDDY_WATER: "same command and tilemap/gfx/tasks; muddy palette plus pre-command SE_M_WHIRLPOOL",
    MOVE_SECRET_POWER: "Factory BATTLE_ENVIRONMENT_BUILDING dispatches Move_STRENGTH, not Move_SURF; water branch alone dispatches Surf",
  },
}));
