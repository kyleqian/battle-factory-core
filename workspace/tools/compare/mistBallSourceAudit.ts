import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ice = read("reference/pokeemerald/src/battle_anim_ice.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`), to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const body = block(scripts, "Move_MIST_BALL", "Move_FEATHER_DANCE");
const commands = body.split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
const expected = [
  "loadspritegfx ANIM_TAG_SMALL_BUBBLES",
  "loadspritegfx ANIM_TAG_WHITE_FEATHER",
  "delay 0",
  "playsewithpan SE_M_STRING_SHOT, SOUND_PAN_ATTACKER",
  "createsprite gMistBallSpriteTemplate, ANIM_TARGET, 0, 0, 0, 0, 0, 30, 0",
  "waitforvisualfinish",
  "playsewithpan SE_M_SAND_ATTACK, SOUND_PAN_TARGET",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 10, 0",
  "complex_palette_blend unused_anim_battler=ANIM_ATTACKER, unused_subpriority_offset=0, selector=F_PAL_BG, delay=1, num_blends=1, color1=RGB(23, 16, 31), blend_y1=16, color2=RGB_WHITE, blend_y2=16",
  "delay 0",
  "playsewithpan SE_M_HAZE, 0",
  "createvisualtask AnimTask_MistBallFog, 5",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 3, 0, 16, RGB_WHITE",
  "delay 8",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 4, 0, 70, 0",
  "delay 70",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 2, 16, 0, RGB_WHITE",
  "end",
];
if (commands.join("\n") !== expected.join("\n")) throw new Error(`Mist Ball script changed:\n${commands.join("\n")}`);

for (const token of [
  ".tileTag = ANIM_TAG_SMALL_BUBBLES", ".paletteTag = ANIM_TAG_SMALL_BUBBLES",
  ".callback = AnimThrowMistBall", "sprite->callback = TranslateAnimSpriteToTargetMonLocation",
  "SetGpuReg(REG_OFFSET_BLDCNT, BLDCNT_TGT1_BG1 | BLDCNT_EFFECT_BLEND | BLDCNT_TGT2_ALL)",
  "LoadBgTiles(animBg.bgId, gWeatherFogHorizontalTiles, 0x800, animBg.tilesOffset)",
  "AnimLoadCompressedBgTilemapHandleContest(&animBg, gBattleAnimFogTilemap, FALSE)",
  "LoadPalette(&gFogPalette, BG_PLTT_ID(animBg.paletteId), PLTT_SIZE_4BPP)",
  "gBattle_BG1_X += gTasks[taskId].data[15]", "if (++gTasks[taskId].data[11] == 0x51)",
  "ClearBattleAnimBg(1)", "ClearBattleAnimBg(2)", "DestroyAnimVisualTask(taskId)",
]) if (!ice.includes(token)) throw new Error(`Mist Ball fog/projectile source changed: ${token}`);
for (const token of [
  "static void AnimComplexPaletteBlend(struct Sprite *sprite)",
  "BlendPalettes(selectedPalettes, cmd->blendY1, cmd->color1)",
  "BlendPalettes(selectedPalettes, 0, 0)",
]) if (!normal.includes(token)) throw new Error(`complex palette source changed: ${token}`);
for (const token of ["void AnimTask_ShakeMon(u8 taskId)", "gSprites[spriteId].x2 = gBattleAnimArgs[1]", "DestroyAnimVisualTask(taskId)"])
  if (!movement.includes(token)) throw new Error(`ShakeMon source changed: ${token}`);
for (const token of ["void AnimTask_BlendBattleAnimPal(u8 taskId)", "StartBlendAnimSpriteColor(taskId, selectedPalettes)"])
  if (!utility.includes(token)) throw new Error(`battle-palette blend source changed: ${token}`);

const entry = inventory.tiers.level50.moves.find((value: { move: string }) => value.move === "MOVE_MIST_BALL");
if (!entry || entry.id !== 296 || entry.frontierMonCount !== 2 || entry.exampleMons.join(",") !== "FRONTIER_MON_LATIAS_4,FRONTIER_MON_LATIAS_6")
  throw new Error("Mist Ball inventory changed");
if (!constants.includes("#define FRONTIER_MON_LATIAS_4       798") || !constants.includes("#define FRONTIER_MON_LATIAS_6       843"))
  throw new Error("Latias carrier indices changed");
const carrierStart = mons.indexOf("[FRONTIER_MON_LATIAS_4] = {");
const carrierEnd = mons.indexOf("[FRONTIER_MON_LATIOS_4] = {", carrierStart);
const carrier = mons.slice(carrierStart, carrierEnd);
for (const token of [".species = SPECIES_LATIAS", ".moves = {MOVE_MIST_BALL, MOVE_SHADOW_BALL, MOVE_CHARM, MOVE_REFLECT}", ".nature = NATURE_DOCILE"])
  if (!carrier.includes(token)) throw new Error(`lowest carrier changed: ${token}`);
const components = graph.moves.find((value: { move: string }) => value.move === "MOVE_MIST_BALL")?.componentIds;
const expectedComponents = ["asset:ANIM_TAG_SMALL_BUBBLES", "asset:ANIM_TAG_WHITE_FEATHER", "sprite:gMistBallSpriteTemplate", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_MistBallFog", "task:AnimTask_ShakeMon", "visualCommand:complex_palette_blend"];
if (components?.join("\n") !== expectedComponents.join("\n")) throw new Error("Mist Ball component graph changed");

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
for (const token of ["082ce62e d Move_MIST_BALL", "082ce6bd d Move_FEATHER_DANCE", "08595c70 R gMistBallSpriteTemplate", "0810c2f0 t AnimThrowMistBall", "0810c324 T AnimTask_MistBallFog", "081158a4 t AnimComplexPaletteBlend", "080d51ac T AnimTask_ShakeMon"])
  if (!nm.includes(token)) throw new Error(`ELF symbol changed: ${token}`);
const bytes = execFileSync("arm-none-eabi-objdump", ["-s", "--start-address=0x082ce62e", "--stop-address=0x082ce6bc", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8" });
for (const token of ["82ce62e 00ab 27001e28", "82ce66e 0100 177e1000", "82ce6ae 1108 0a050400 02001000 0000ff7f"])
  if (!bytes.includes(token)) throw new Error(`exclusive ROM bytes changed: ${token}`);

console.log("MOVE_MIST_BALL source checkpoint: real even exclusive ROM interval 0x082ce62e..0x082ce6bc (0x8e bytes), 18 commands, seven source components; SMALL_BUBBLES is consumed by the 30-tick linear projectile while WHITE_FEATHER is loaded but unused; set/index 798 FRONTIER_MON_LATIAS_4 is the lowest Level-50 carrier and 843 LATIAS_6 the only sibling carrier.");
