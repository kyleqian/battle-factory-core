/** Reproducible source extraction for MOVE_SMOG's presentation-only asset graph. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/smog.json");
const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const source = (path: string): string => readFileSync(join(root, "reference/pokeemerald", path), "utf8");
const block = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start), to = text.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`source block missing: ${start}/${end}`);
  return text.slice(from, to);
};
const requireTokens = (label: string, text: string, tokens: readonly string[]): void => {
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${label} drifted: ${token}`);
};

const scripts = source("data/battle_anim_scripts.s");
const ice = source("src/battle_anim_ice.c");
const normal = source("src/battle_anim_normal.c");
const movement = source("src/battle_anim_mon_movement.c");
const runtime = source("src/battle_anim.c");
const registry = source("src/data/battle_anim.h");
const constants = source("include/constants/battle_anim.h");
const songs = source("include/constants/songs.h");
const rootBody = block(scripts, "Move_SMOG:\n", "Move_FAINT_ATTACK:\n");
const moveBody = block(scripts, "Move_SMOG:\n", "SmogCloud:\n");
const cloudBody = block(scripts, "SmogCloud:\n", "Move_FAINT_ATTACK:\n");
requireTokens("Move_SMOG", rootBody, [
  "loadspritegfx ANIM_TAG_PURPLE_GAS_CLOUD", "monbg ANIM_DEF_PARTNER", "splitbgprio_all", "setalpha 12, 8",
  "loopsewithpan SE_M_MIST, SOUND_PAN_TARGET, 17, 10", "loopsewithpan SE_M_TOXIC, SOUND_PAN_TARGET, 18, 2",
  "blend_color_cycle priority=2, selector=F_PAL_TARGET, delay=2, num_blends=2, initial_blend_y=0, target_blend_y=12, color=RGB(26, 0, 26)",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 15, 1", "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end",
]);
if ((rootBody.match(/\bcall SmogCloud\b/g) ?? []).length !== 7) throw new Error("Move_SMOG needs seven SmogCloud calls");
requireTokens("SmogCloud", cloudBody, ["createsprite gSmogCloudSpriteTemplate, ANIM_ATTACKER, 2, 0, -24, 48, 240, 1, 0", "delay 7", "return"]);
requireTokens("Smog template/callback", ice, [
  "static const union AnimCmd sAnim_Cloud[]", "ANIMCMD_FRAME(0, 8)", "ANIMCMD_FRAME(8, 8)", "ANIMCMD_JUMP(0)",
  "const struct SpriteTemplate gSmogCloudSpriteTemplate", ".tileTag = ANIM_TAG_PURPLE_GAS_CLOUD", ".paletteTag = ANIM_TAG_PURPLE_GAS_CLOUD",
  ".oam = &gOamData_AffineOff_ObjBlend_32x16", ".callback = InitSwirlingFogAnim", "static void InitSwirlingFogAnim", "static void AnimSwirlingFogAnim",
  "InitAnimLinearTranslation(sprite)", "sprite->data[5] = 64", "sprite->data[5] = (sprite->data[5] + 3) & 0xFF",
]);
requireTokens("Smog tasks", `${normal}\n${movement}`, [
  "void AnimTask_BlendColorCycle", "static void AnimTask_BlendColorCycleLoop", "BeginNormalPaletteFade(",
  "void AnimTask_ShakeMon2", "static void AnimTask_ShakeMon2_Step",
]);
requireTokens("Smog runtime/resources", `${runtime}\n${registry}`, [
  "static void Cmd_loadspritegfx", "static void Cmd_monbg", "static void Cmd_splitbgprio_all", "static void Cmd_loopsewithpan", "static void Cmd_clearmonbg", "static void Cmd_blendoff",
  "{gBattleAnimSpriteGfx_MistCloud, 0x0200, ANIM_TAG_PURPLE_GAS_CLOUD}", "{gBattleAnimSpritePal_PurpleGasCloud, ANIM_TAG_PURPLE_GAS_CLOUD}",
]);
if (!constants.includes("ANIM_SPRITES_START")
  || !/^#define\s+SE_M_MIST\s+168\b/mu.test(songs)
  || !/^#define\s+SE_M_TOXIC\s+148\b/mu.test(songs)) {
  throw new Error("Smog constants drifted");
}

const extracted = {
  schema: "smog-source-assets/v1",
  source: {
    script: "data/battle_anim_scripts.s Move_SMOG + SmogCloud",
    scriptSha256: sha256(rootBody), moveSha256: sha256(moveBody), cloudSha256: sha256(cloudBody),
    task: "src/battle_anim_ice.c InitSwirlingFogAnim + AnimSwirlingFogAnim",
    runtime: "src/battle_anim.c loadspritegfx/monbg/splitbgprio_all/loopsewithpan/clearmonbg/blendoff/end",
    rom: { gameCode: "AGB-BPEE", symbol: "Move_SMOG", start: "0x082d01e5", endExclusive: "0x082d0260" },
  },
  resources: {
    purpleGasCloud: { tag: 10172, tileBytes: 0x0200, graphics: "gBattleAnimSpriteGfx_MistCloud", palette: "gBattleAnimSpritePal_PurpleGasCloud", source: "graphics/battle_anims/sprites/mist_cloud.png + purple_gas_cloud.pal" },
  },
  templates: {
    smogCloud: { symbol: "gSmogCloudSpriteTemplate", affine: false, objMode: "objblend", shape: "32x16", callback: "InitSwirlingFogAnim -> AnimSwirlingFogAnim", frames: [[0, 8], [8, 8]], loop: 0, matrixNum: 0 },
  },
  cloud: { calls: 7, args: [0, -24, 48, 240, 1, 0], initialPhase: 64, phaseStep: 3, radiusX: 32, radiusY: -6, linearY: 48, duration: 240, delay: 7 },
  blendColorCycle: { priority: 2, selector: "F_PAL_TARGET", selectorValue: 4, delay: 2, numBlends: 2, initialBlendY: 0, targetBlendY: 12, colorRgb555: 26650 },
  shake: { task: "AnimTask_ShakeMon2", args: ["ANIM_TARGET", 2, 0, 15, 1] },
  audio: {
    mist: { song: "SE_M_MIST", id: 168, interval: 17, plays: 10 },
    toxic: { song: "SE_M_TOXIC", id: 148, interval: 18, plays: 2 },
  },
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(extracted, null, 2)}\n`);
console.log(`wrote ${out}`);
