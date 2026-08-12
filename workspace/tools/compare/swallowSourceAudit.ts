import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const monsCode = read("reference/pokeemerald/src/battle_anim_mons.c");
const animEngine = read("reference/pokeemerald/src/battle_anim.c");
const battleCommands = read("reference/pokeemerald/src/battle_script_commands.c");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const factory = read("reference/pokeemerald/src/battle_factory.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const swallow = block(scripts, "Move_SWALLOW", "Move_TRANSFORM");
const effect = block(scripts, "SwallowEffect", "SwallowGood");
const healing = block(scripts, "HealingEffect", "HealingEffect2");
const battleEffect = block(battleScripts, "BattleScript_EffectSwallow", "BattleScript_SwallowFail");
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_PELIPPER_1]"),
  mons.indexOf("[FRONTIER_MON_SWELLOW_1]"),
);
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SWALLOW",
);
const graphEntry = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SWALLOW",
);

const requiredScript = [
  "loadspritegfx ANIM_TAG_BLUE_ORB",
  "loadspritegfx ANIM_TAG_BLUE_STAR",
  "playsewithpan SE_M_TAKE_DOWN, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_SwallowDeformMon, 5",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 1, 0, 8, 2",
  "delay 38",
  "playsewithpan SE_M_SPIT_UP, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 2, 0, 12, 1",
  "jumpifmoveturn 2, SwallowGood",
  "jumpifmoveturn 3, SwallowBest",
  "waitforvisualfinish",
  "call HealingEffect",
  "end",
];
const expectedComponents = [
  "asset:ANIM_TAG_BLUE_ORB",
  "asset:ANIM_TAG_BLUE_STAR",
  "sprite:gHealingBlueStarSpriteTemplate",
  "sprite:gSwallowBlueOrbSpriteTemplate",
  "subroutine:HealingEffect",
  "subroutine:SwallowBest",
  "subroutine:SwallowContinue",
  "subroutine:SwallowEffect",
  "subroutine:SwallowGood",
  "task:AnimTask_ShakeMon2",
  "task:AnimTask_SwallowDeformMon",
];

if (
  requiredScript.some((line) => !swallow.includes(line))
  || (effect.match(/gSwallowBlueOrbSpriteTemplate/g) ?? []).length !== 5
  || (swallow.match(/call SwallowEffect/g) ?? []).length !== 4
  || !swallow.includes("SwallowGood:\n\tcall SwallowEffect\n\tgoto SwallowContinue")
  || !swallow.includes("SwallowBest:\n\tcall SwallowEffect\n\tcall SwallowEffect")
  || (healing.match(/gHealingBlueStarSpriteTemplate/g) ?? []).length !== 4
  || !healing.includes("playsewithpan SE_M_ABSORB_2, SOUND_PAN_ATTACKER")
  || (healing.match(/delay 7/g) ?? []).length !== 4
) throw new Error("Swallow script/branch/healing contract changed");

for (const token of [
  "const struct SpriteTemplate gSwallowBlueOrbSpriteTemplate",
  ".tileTag = ANIM_TAG_BLUE_ORB",
  ".paletteTag = ANIM_TAG_BLUE_ORB",
  ".callback = AnimSwallowBlueOrb",
  "AFFINEANIMCMD_FRAME(0, 6, 0, 20)",
  "AFFINEANIMCMD_FRAME(7, -30, 0, 6)",
  "AFFINEANIMCMD_FRAME(-2, 3, 0, 20)",
  "sprite->data[1] = 0x900",
  "sprite->y2 -= sprite->data[1] >> 8",
  "sprite->data[1] -= 96",
  "if (sprite->y + sprite->y2 > sprite->data[2])",
  "DestroyAnimSprite(sprite)",
  "void AnimTask_SwallowDeformMon(u8 taskId)",
  "DestroyAnimVisualTask(taskId)",
]) if (!effects3.includes(token)) throw new Error(`Swallow effect source changed: ${token}`);

for (const token of [
  "const union AnimCmd gHealingBlueStarAnimCmds[]",
  "ANIMCMD_FRAME(0, 2)",
  "ANIMCMD_FRAME(48, 3)",
  "ANIMCMD_FRAME(64, 5)",
  "ANIMCMD_FRAME(96, 2)",
  "const struct SpriteTemplate gHealingBlueStarSpriteTemplate",
  ".tileTag = ANIM_TAG_BLUE_STAR",
  ".callback = AnimSpriteOnMonPos",
]) if (!effects1.includes(token)) throw new Error(`HealingEffect source changed: ${token}`);

for (const token of [
  "void AnimTask_ShakeMon2(u8 taskId)",
  "gSprites[spriteId].x2 = gBattleAnimArgs[1]",
  "gTasks[taskId].data[1] = gBattleAnimArgs[3]",
  "gTasks[taskId].func = AnimTask_ShakeMon2_Step",
  "gSprites[gTasks[taskId].data[0]].x2 = -gTasks[taskId].data[4]",
  "gSprites[gTasks[taskId].data[0]].x2 = 0",
  "DestroyAnimVisualTask(taskId)",
]) if (!movement.includes(token)) throw new Error(`ShakeMon2 source changed: ${token}`);

for (const token of [
  "task->data[10] = 0x100",
  "task->data[11] = 0x100",
  "SetSpriteRotScale(task->data[15], task->data[10], task->data[11], task->data[12])",
  "SetBattlerSpriteYOffsetFromYScale(task->data[15])",
  "ResetSpriteRotScale(task->data[15])",
]) if (!monsCode.includes(token)) throw new Error(`affine task source changed: ${token}`);

for (const token of [
  "gBattleScripting.animTurn = gDisableStructs[gBattlerAttacker].stockpileCounter",
  "gDisableStructs[gBattlerAttacker].stockpileCounter = 0",
  "gBattleMoveDamage = gBattleMons[gBattlerAttacker].maxHP / (1 << (3 - gDisableStructs[gBattlerAttacker].stockpileCounter))",
]) if (!battleCommands.includes(token)) throw new Error(`stockpile receipt source changed: ${token}`);
for (const token of [
  "stockpiletohpheal BattleScript_SwallowFail",
  "goto BattleScript_PresentHealTarget",
]) if (!battleEffect.includes(token)) throw new Error(`Swallow battle route changed: ${token}`);

if (
  !animData.includes("{gBattleAnimSpriteGfx_GrayOrb, 0x0060, ANIM_TAG_BLUE_ORB}")
  || !animData.includes("{gBattleAnimSpritePal_BlueOrb, ANIM_TAG_BLUE_ORB}")
  || !animData.includes("{gBattleAnimSpriteGfx_BlueStar, 0x0E00, ANIM_TAG_BLUE_STAR}")
  || !animData.includes("{gBattleAnimSpritePal_BlueStar, ANIM_TAG_BLUE_STAR}")
  || !graphics.includes('gBattleAnimSpriteGfx_GrayOrb[] = INCGFX_U32("graphics/battle_anims/sprites/gray_orb.png"')
  || !graphics.includes('gBattleAnimSpritePal_BlueOrb[] = INCGFX_U32("graphics/battle_anims/sprites/blue_orb.pal"')
  || !graphics.includes('gBattleAnimSpriteGfx_BlueStar[] = INCGFX_U32("graphics/battle_anims/sprites/blue_star.png"')
) throw new Error("Swallow asset tag/source contract changed");

if (
  !move || move.id !== 256 || move.frontierMonCount !== 2 || move.speciesCount !== 2
  || move.exampleMons.join(",") !== "FRONTIER_MON_PELIPPER_1,FRONTIER_MON_SWALOT_1"
  || !constants.includes("#define FRONTIER_MON_PELIPPER_1     213")
  || !factory.includes("{FRONTIER_MON_DELCATTY_1, FRONTIER_MON_CLOYSTER_1}, // 162 - 266")
  || !factory.includes("{6, 9}")
  || !carrier.includes(".species = SPECIES_PELIPPER")
  || !carrier.includes(".moves = {MOVE_WATER_PULSE, MOVE_AERIAL_ACE, MOVE_STOCKPILE, MOVE_SWALLOW}")
  || !carrier.includes("BATTLE_FRONTIER_ITEM_SITRUS_BERRY")
  || !carrier.includes("F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_HP")
  || !carrier.includes("NATURE_QUIET")
  || !graphEntry || graphEntry.componentIds.join("\n") !== expectedComponents.join("\n")
) throw new Error("Swallow inventory/carrier/component contract changed");

const nm = execFileSync("arm-none-eabi-nm", [
  "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
for (const token of [
  "082d4b2e d Move_SWALLOW",
  "082d4bda d Move_TRANSFORM",
  "085ce418 R gSwallowBlueOrbSpriteTemplate",
  "085ce430 R gSwallowDeformMonAffineAnimCmds",
  "0815b70c t AnimSwallowBlueOrb",
  "0815b778 T AnimTask_SwallowDeformMon",
  "080d52d0 T AnimTask_ShakeMon2",
  "080d53bc t AnimTask_ShakeMon2_Step",
  "08592f2c R gHealingBlueStarSpriteTemplate",
  "080a77c8 T AnimSpriteOnMonPos",
  "088ff170 R se_m_take_down",
  "08902370 R se_m_spit_up",
  "088fff3c R se_m_absorb_2",
]) if (!nm.includes(token)) throw new Error(`Swallow ELF contract changed: ${token}`);

const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const bytes = rom.subarray(0x2d4b2e, 0x2d4bda);
const digest = createHash("sha256").update(bytes).digest("hex");
if (bytes.length !== 0xac || digest !== "0242f7d969eb4862f9335d6804dde42d3be39cfddfff34bd3a67cc05acf7dae9") {
  throw new Error(`Swallow ROM interval changed: ${bytes.length}/${digest}`);
}

// This body owns only sprite positions, affine matrices, tagged OBJ resources,
// and audio. There is no BG/blend/window/mosaic register command or callback.
if (
  /\b(?:monbg|setalpha|blendoff|setbldcnt|fadetobg|changebg)\b/.test(swallow)
  || [effect, healing].some((source) => source.includes("SetGpuReg"))
) throw new Error("Swallow unexpectedly acquired GPU-register ownership");
for (const token of [
  "FreeSpriteTilesByTag",
  "FreeSpritePaletteByTag",
  "gAnimScriptActive = FALSE",
]) if (!animEngine.includes(token)) throw new Error(`animation cleanup changed: ${token}`);

console.log(
  "MOVE_SWALLOW source checkpoint: exact even ROM interval 0x082d4b2e..0x082d4bda "
  + "(0xac bytes, sha256 0242f7d969eb4862f9335d6804dde42d3be39cfddfff34bd3a67cc05acf7dae9); "
  + "set 213 FRONTIER_MON_PELIPPER_1 is the lowest Level-50 carrier in challenge-1 range 162..266; "
  + "animTurn/stockpile 1,2,3 selects 5,10,15 BLUE_ORB sprites before shared four-BLUE_STAR HealingEffect; "
  + "SwallowDeformMon, ShakeMon2(1/0/8/2 then 2/0/12/1), TAKE_DOWN/SPIT_UP/ABSORB_2 audio, "
  + "tag unload and inactive cleanup are pinned; the source body owns no GPU registers.",
);
