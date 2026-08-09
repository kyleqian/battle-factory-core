import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ice = read("reference/pokeemerald/src/battle_anim_ice.c");
const weather = read("reference/pokeemerald/src/field_weather_effect.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");

const start = scripts.indexOf("Move_HAZE:");
const end = scripts.indexOf("Move_FIRE_PUNCH:", start);
if (start < 0 || end < 0) throw new Error("Move_HAZE source body missing");
const body = scripts.slice(start, end);
for (const literal of [
  "waitforvisualfinish", "playsewithpan SE_M_HAZE, 0",
  "createvisualtask AnimTask_HazeScrollingFog, 5", "delay 30",
  "F_PAL_BATTLERS_2, 2, 0, 16, RGB_BLACK", "delay 90",
  "F_PAL_BATTLERS_2, 1, 16, 0, RGB_BLACK", "end",
]) if (!body.includes(literal)) throw new Error(`Move_HAZE lost ${literal}`);
for (const literal of [
  "static const u8 sHazeBlendAmounts[]", "AnimTask_HazeScrollingFog(u8 taskId)",
  "AnimTask_HazeScrollingFog_Step(u8 taskId)", "gWeatherFogHorizontalTiles",
  "gBattleAnimFogTilemap", "gFogPalette", "gBattle_BG1_X += -1",
  "ClearBattleAnimBg(1)", "ClearBattleAnimBg(2)", "DestroyAnimVisualTask(taskId)",
]) if (!ice.includes(literal)) throw new Error(`HAZE task lost ${literal}`);
if (!weather.includes("const u8 gWeatherFogHorizontalTiles[]")
  || !graphics.includes("const u32 gBattleAnimFogTilemap[]")
  || !songs.includes("#define SE_M_HAZE                   246")) throw new Error("HAZE asset/audio contract changed");
if (!constants.includes("#define FRONTIER_MON_KOFFING        127")) throw new Error("Koffing set changed");
const koffing = mons.slice(mons.indexOf("[FRONTIER_MON_KOFFING]"), mons.indexOf("[FRONTIER_MON_KOFFING]") + 400);
for (const move of ["MOVE_SLUDGE", "MOVE_SMOKESCREEN", "MOVE_TORMENT", "MOVE_HAZE"])
  if (!koffing.includes(move)) throw new Error(`Koffing lost ${move}`);

console.log(JSON.stringify({
  move: "MOVE_HAZE", moveId: 114, carrier: 127,
  sourceBounds: { start: "0x082d2c4a", endExclusive: "0x082d2c7d" },
  tasks: { init: "0x0810c0a0", step: "0x0810c164" },
  assets: ["gWeatherFogHorizontalTiles", "gBattleAnimFogTilemap", "gFogPalette", "sHazeBlendAmounts"],
  audio: "SE_M_HAZE 246",
}));
