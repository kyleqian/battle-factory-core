/** Strict source-relative audit for MOVE_ERUPTION's loopsewithpan component. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  ERUPTION_AUDIO_FINAL_PLAY_LOCAL_AGE,
  ERUPTION_AUDIO_FIRST_INACTIVE_LOCAL_AGE,
  ERUPTION_AUDIO_SOURCE_BASE,
  ERUPTION_AUDIO_SOURCE_OFFSET,
  eruptionAudioTimeline,
  type EruptionAudioProfile,
} from "../../src/animation/eruptionAudio.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const fail = (side: Side, age: number | string, field: string): never => { throw new Error(`${side} age ${age}: ${field}`); };

function sourceAddress(symbol: string): number {
  const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)(?:\\s+[0-9a-fA-F]+)?\\s+\\S+\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing source symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}

function auditSource(): void {
  const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
  const battleAnim = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim.c"), "utf8");
  const body = scripts.slice(scripts.indexOf("Move_ERUPTION:"), scripts.indexOf("Move_SKILL_SWAP:"));
  for (const token of [
    "loopsewithpan SE_M_ROCK_THROW, SOUND_PAN_TARGET, 16, 12",
    "delay 80",
    "simple_palette_blend unused_subpriority_offset=40",
  ]) if (!body.includes(token)) throw new Error(`Move_ERUPTION audio source drifted: ${token}`);
  for (const token of [
    "static void Cmd_loopsewithpan(void)",
    "taskId = CreateTask(Task_LoopAndPlaySE, 1);",
    "gTasks[taskId].tFrameCounter = framesToWait;",
    "gTasks[taskId].func(taskId);",
    "static void Task_LoopAndPlaySE(u8 taskId)",
    "if (gTasks[taskId].tFrameCounter++ >= gTasks[taskId].tFramesToWait)",
    "numberOfPlays = --gTasks[taskId].tNumberOfPlays;",
    "PlaySE12WithPanning(songId, panning);",
    "gAnimSoundTaskCount--;",
    "s8 BattleAnimAdjustPanning(s8 pan)",
  ]) if (!battleAnim.includes(token)) throw new Error(`battle_anim audio source drifted: ${token}`);
  if (sourceAddress("Move_ERUPTION") !== ERUPTION_AUDIO_SOURCE_BASE
    || sourceAddress("Cmd_loopsewithpan") !== 0x080a_565c
    || sourceAddress("Task_LoopAndPlaySE") !== 0x080a_56e4) throw new Error("Eruption audio source address drifted");
}

function rowsFor(side: Side): Json[] {
  const name = side === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/eruption-${name}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}

function auditSide(side: Side): Json {
  const rows = rowsFor(side);
  const commandAge = side === "player-back" ? 239 : 257;
  const profile: EruptionAudioProfile = {
    commandAge,
    endAge: rows.length - 1,
    taskSlot: 2,
    attackerSide: side === "player-back" ? "player" : "opponent",
    targetSide: side === "player-back" ? "opponent" : "player",
  };
  const timeline = eruptionAudioTimeline(profile);
  let taskRows = 0;
  let audioRows = 0;
  let passThroughRows = 0;
  let gameplayRows = 0;
  const starts: number[] = [];
  rows.forEach((row, age) => {
    const expected = timeline[age]!;
    const tasks = row.tasks.filter((task: Json) => task.func?.symbol === "Task_LoopAndPlaySE");
    if (!expected.owned) {
      if (tasks.length !== 0 || expected.task !== null || expected.audio !== null) fail(side, age, "pre-command pass-through drifted");
      passThroughRows += 1;
    } else {
      const track = row.audio.SE1.tracks[0];
      if (row.audio.SE1.songHeaderIdentity.symbol !== expected.audio!.song
        || row.audio.SE1.songHeaderIdentity.address !== 0x088f_e7dc
        || track.panX !== expected.audio!.pan
        || row.audio.SE1.status !== expected.audio!.status
        || track.flags !== expected.audio!.trackFlags) fail(side, age, "owned SE1 song/pan/status/track lifecycle drifted");
      if (expected.audio!.startThisRow) starts.push(age);
      audioRows += 1;
    }
    if (expected.task) {
      if (tasks.length !== 1 || row.soundTaskCount !== 1
        || tasks[0].slot !== expected.task.slot
        || tasks[0].priority !== expected.task.priority
        || !same(tasks[0].data, expected.task.data)) fail(side, age, "Task_LoopAndPlaySE state drifted");
      taskRows += 1;
    } else if (age >= commandAge && (tasks.length !== 0 || row.soundTaskCount !== 0)) fail(side, age, "sound-task cleanup drifted");
    if (row.gameplayRng !== rows[0].gameplayRng || !same(row.immutableState, rows[0].immutableState)) fail(side, age, "gameplay/RNG pass-through drifted");
    gameplayRows += 1;
  });
  if (!same(starts, expectedStarts(commandAge))) fail(side, "starts", "12-play source schedule drifted");
  if (rows[commandAge]!.scriptOffset !== ERUPTION_AUDIO_SOURCE_OFFSET
    || rows[commandAge]!.scriptPtr !== ERUPTION_AUDIO_SOURCE_BASE + ERUPTION_AUDIO_SOURCE_OFFSET
    || timeline[commandAge]!.source?.pointerParity !== 0
    || timeline[commandAge + ERUPTION_AUDIO_FINAL_PLAY_LOCAL_AGE]!.task !== null
    || !timeline[commandAge + ERUPTION_AUDIO_FIRST_INACTIVE_LOCAL_AGE]!.audio?.firstInactive) fail(side, "lifecycle", "source boundary/cleanup drifted");
  return {
    sourceWindow: { rows: rows.length, firstAge: 0, lastAge: rows.length - 1 },
    command: { age: commandAge, offset: ERUPTION_AUDIO_SOURCE_OFFSET, pointer: ERUPTION_AUDIO_SOURCE_BASE + ERUPTION_AUDIO_SOURCE_OFFSET, args: [131, "SOUND_PAN_TARGET", 16, 12] },
    panning: { attackerSide: profile.attackerSide, targetSide: profile.targetSide, adjustedPan: timeline[commandAge]!.audio!.pan },
    task: { slot: 2, callback: "Task_LoopAndPlaySE", firstAge: commandAge, lastAge: commandAge + 185, rows: taskRows, cleanupAge: commandAge + 186 },
    audio: { channel: "SE1", song: "se_m_rock_throw", starts, finalActiveAge: commandAge + 235, firstInactiveAge: commandAge + 236 },
    checked: { rows: rows.length, taskRows, audioRows, passThroughRows, gameplayRows },
  };
}

function expectedStarts(commandAge: number): number[] {
  return [0, 16, 33, 50, 67, 84, 101, 118, 135, 152, 169, 186].map((age) => commandAge + age);
}

auditSource();
console.log(JSON.stringify({
  schema: "eruption-loopsewithpan-audio-audit/v1",
  component: "audio:loopsewithpan-SE_M_ROCK_THROW-target-16-12",
  move: "MOVE_ERUPTION",
  oracleProfile: "battle-scene-on",
  status: "unsupported-unfulfilled-component-audit",
  coverageCredit: false,
  ownership: { loopSeWithPanOnly: true, explosion: false, launchRocks: false, fallingRocks: false, horizontalShake: false, palette: false, typedSeam: false, compositor: false, framebuffer: false, gameplay: false, rng: false, controller: false },
  sides: { "player-back": auditSide("player-back"), "opponent-front": auditSide("opponent-front") },
}, null, 2));
