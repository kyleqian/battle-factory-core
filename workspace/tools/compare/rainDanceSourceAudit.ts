import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const water = read("reference/pokeemerald/src/battle_anim_water.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const frontierMons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const body = block(scripts, "Move_RAIN_DANCE", "Move_BITE");
const wooperStart = frontierMons.indexOf("[FRONTIER_MON_WOOPER]");
const wooperEnd = frontierMons.indexOf("[FRONTIER_MON_TYROGUE]", wooperStart);
if (wooperStart < 0 || wooperEnd < 0) throw new Error("Wooper frontier record missing");
const wooper = frontierMons.slice(wooperStart, wooperEnd);
const requiredBody = [
  "loadspritegfx ANIM_TAG_RAIN_DROPS",
  "playsewithpan SE_M_RAIN_DANCE, SOUND_PAN_ATTACKER",
  "F_PAL_BG | F_PAL_BATTLERS_2, 2, 0, 4, RGB_BLACK",
  "createvisualtask AnimTask_CreateRaindrops, 2, 0, 3, 120",
  "delay 120",
  "delay 30",
  "F_PAL_BG | F_PAL_BATTLERS_2, 2, 4, 0, RGB_BLACK",
];
const requiredTask = [
  "#define tRaindropSpawnTimer    data[0]",
  "gTasks[taskId].tRaindropSpawnInterval = gBattleAnimArgs[1]",
  "gTasks[taskId].tRaindropSpawnDuration = gBattleAnimArgs[2]",
  "gTasks[taskId].tRaindropSpawnTimer % gTasks[taskId].tRaindropSpawnInterval == 1",
  "x = Random2() % DISPLAY_WIDTH",
  "y = Random2() % (DISPLAY_HEIGHT / 2)",
  "CreateSprite(&gRainDropSpriteTemplate, x, y, 4)",
  "DestroyAnimVisualTask(taskId)",
];
const requiredSprite = [
  "ANIMCMD_FRAME(0, 2)", "ANIMCMD_FRAME(8, 2)",
  "ANIMCMD_FRAME(16, 2)", "ANIMCMD_FRAME(24, 6)",
  "ANIMCMD_FRAME(32, 2)", "ANIMCMD_FRAME(40, 2)",
  "ANIMCMD_FRAME(48, 2)",
  ".oam = &gOamData_AffineOff_ObjNormal_16x32",
  ".affineAnims = gDummySpriteAffineAnimTable",
  ".callback = AnimRainDrop",
  "sprite->callback = AnimRainDrop_Step",
  "sprite->x2++",
  "sprite->y2 += 4",
  "if (sprite->animEnded)",
  "DestroySprite(sprite)",
];
if (requiredBody.some(text => !body.includes(text))) throw new Error("Move_RAIN_DANCE script changed");
if ((body.match(/AnimTask_CreateRaindrops/g) ?? []).length !== 2) {
  throw new Error("Move_RAIN_DANCE must create exactly two raindrop tasks");
}
if (requiredTask.some(text => !water.includes(text))) throw new Error("raindrop task changed");
if (requiredSprite.some(text => !water.includes(text))) throw new Error("raindrop sprite changed");
for (const text of [
  "void AnimTask_BlendBattleAnimPal(u8 taskId)",
  "StartBlendAnimSpriteColor(taskId, selectedPalettes)",
]) if (!utility.includes(text)) throw new Error("BlendBattleAnimPal changed");
for (const text of [
  "const u32 gBattleAnimSpriteGfx_RainDrops[] = INCGFX_U32(\"graphics/battle_anims/sprites/rain_drops.png\", \".4bpp.lz\")",
  "const u32 gBattleAnimSpritePal_RainDrops[] = INCGFX_U32(\"graphics/battle_anims/sprites/rain_drops.png\", \".gbapal.lz\")",
  "{gBattleAnimSpriteGfx_RainDrops, 0x0700, ANIM_TAG_RAIN_DROPS}",
  "{gBattleAnimSpritePal_RainDrops, ANIM_TAG_RAIN_DROPS}",
]) if (!graphics.includes(text) && !animData.includes(text)) throw new Error(`Rain asset identity changed: ${text}`);
if (!songs.includes("#define SE_M_RAIN_DANCE             127")) throw new Error("Rain Dance audio changed");
if (!moves.includes("#define MOVE_RAIN_DANCE 240")
  || !species.includes("#define SPECIES_WOOPER 194")
  || !frontierConstants.includes("#define FRONTIER_MON_WOOPER         14")
  || !wooper.includes(".species = SPECIES_WOOPER")
  || !wooper.includes(".moves = {MOVE_YAWN, MOVE_DIG, MOVE_WATER_PULSE, MOVE_RAIN_DANCE}")
  || !wooper.includes("BATTLE_FRONTIER_ITEM_SITRUS_BERRY")
  || !wooper.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !wooper.includes("NATURE_DOCILE")) throw new Error("lowest Rain Dance carrier changed");

console.log(JSON.stringify({
  move: "MOVE_RAIN_DANCE", moveId: 240,
  sourceBounds: { start: "0x082d050a", endExclusive: "0x082d0555", pointerContract: "half-open-byte-interval-with-even-and-odd-command-pointers-observed" },
  carrier: { frontierMon: "FRONTIER_MON_WOOPER", setId: 14, species: 194 },
  tasks: ["AnimTask_BlendBattleAnimPal", "AnimTask_CreateRaindrops"],
  assets: ["ANIM_TAG_RAIN_DROPS", "gBattleAnimSpriteGfx_RainDrops", "gBattleAnimSpritePal_RainDrops"],
  audio: { soundEffect: "SE_M_RAIN_DANCE", id: 127, pan: "SOUND_PAN_ATTACKER" },
  cleanup: ["DestroySprite", "DestroyAnimVisualTask", "palette blend restore 4->0"],
}));
