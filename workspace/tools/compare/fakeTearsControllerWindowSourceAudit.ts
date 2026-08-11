import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const battleScripts = readFileSync(
  resolve(root, "reference/pokeemerald/data/battle_scripts_1.s"),
  "utf8",
);
const animationScripts = readFileSync(
  resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"),
  "utf8",
);
const battleCommands = readFileSync(
  resolve(root, "reference/pokeemerald/src/battle_script_commands.c"),
  "utf8",
);

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing source block ${start}`);
  return source.slice(from, to);
}

function requireOrdered(source: string, tokens: readonly string[]): void {
  let cursor = -1;
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1);
    if (next < 0) throw new Error(`missing ordered source token ${token}`);
    cursor = next;
  }
}

const effect = block(
  battleScripts,
  "BattleScript_EffectSpecialDefenseDown2::",
  "BattleScript_EffectReflect::",
);
requireOrdered(effect, [
  "setstatchanger STAT_SPDEF, 2, TRUE",
  "goto BattleScript_EffectStatDown",
]);

const statDown = block(
  battleScripts,
  "BattleScript_EffectStatDown::",
  "BattleScript_EffectHaze::",
);
requireOrdered(statDown, [
  "attackcanceler",
  "accuracycheck",
  "attackstring",
  "ppreduce",
  "statbuffchange STAT_CHANGE_ALLOW_PTR",
  "BattleScript_StatDownDoAnim::",
  "attackanimation",
  "waitanimation",
  "setgraphicalstatchangevalues",
  "playanimation BS_TARGET, B_ANIM_STATS_CHANGE",
  "BattleScript_StatDownPrintString::",
  "printfromtable gStatDownStringIds",
  "waitmessage B_WAIT_TIME_LONG",
  "BattleScript_StatDownEnd::",
  "goto BattleScript_MoveEnd",
]);

const fakeTears = block(
  animationScripts,
  "Move_FAKE_TEARS:",
  "Move_AIR_CUTTER:",
);
requireOrdered(fakeTears, [
  "loadspritegfx ANIM_TAG_SMALL_BUBBLES",
  "createvisualtask AnimTask_BlendParticle",
  "createvisualtask AnimTask_RockMonBackAndForth",
  "create_tear_drop_sprite",
  "waitforvisualfinish",
  "end",
]);

const statCommand = block(
  battleCommands,
  "static void Cmd_statbuffchange(void)",
  "// Haze",
);
requireOrdered(statCommand, [
  "ChangeStatBuffs(",
  "gBattleScripting.statChanger",
  "gBattlescriptCurrInstr += 6",
]);

console.log("MOVE_FAKE_TEARS full currentMove=313 ownership audit");
console.log("player-to-opponent: pre 39-75 (37), source 76-162 (87), stat/status 163-251 (89), message/post 252-359 (108), cleanup 360 (1)");
console.log("opponent-to-player: pre 39-79 (41), source 80-166 (87), stat/status 167-255 (89), message/post 256-359 (104), cleanup 360 (1)");
console.log("animation-owned: Move_FAKE_TEARS source body only (87 frames per orientation)");
console.log("main-owned: attack/controller kickoff, ChangeStatBuffs outcome, B_ANIM_STATS_CHANGE dispatch, stat message/wait, BattleScript_MoveEnd cleanup (235 frames per orientation)");
