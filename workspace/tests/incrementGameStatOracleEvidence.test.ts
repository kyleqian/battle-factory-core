import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/increment-game-stat-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF B_SCR_OP_INCREMENTGAMESTAT evidence", () => {
  it("pins 0x60's exact raw-u8 operand, attacker-side gate, two-byte PC advance, and no local battle work", () => {
    expect(evidence.instruction).toEqual({
      opcode: 96, opcodeHex: "0x60", length: 2,
      operand: { width: 1, encoding: "raw u8 game-stat index", read: "gBattlescriptCurrInstr[1]" },
      pc: "gBattlescriptCurrInstr += 2",
      gate: "GetBattlerSide(gBattlerAttacker) == B_SIDE_PLAYER",
      sideEffects: { rngCalls: 0, controller: "none", message: "none", battleTypeGate: "none" },
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    expect(macro).toContain(".macro incrementgamestat stat:req\n\t.byte B_SCR_OP_INCREMENTGAMESTAT\n\t.byte \\stat\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_INCREMENTGAMESTAT]               = Cmd_incrementgamestat,                       //0x60");
    const start = commands.lastIndexOf("static void Cmd_incrementgamestat(void)");
    const handler = commands.slice(start, commands.indexOf("static void Cmd_drawpartystatussummary(void)", start));
    expect(handler).toContain("if (GetBattlerSide(gBattlerAttacker) == B_SIDE_PLAYER)\n        IncrementGameStat(gBattlescriptCurrInstr[1]);");
    expect(handler).toContain("gBattlescriptCurrInstr += 2;");
    expect(handler).not.toMatch(/Random\(|gBattleControllerExecFlags|PrepareStringBattle|gBattleTypeFlags/);
  });

  it("pins the concrete stats and their encrypted SaveBlock lifecycle, including the saturating no-op range guard", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "game_stat.h": sha256("reference/pokeemerald/include/constants/game_stat.h"),
      "overworld.c": sha256("reference/pokeemerald/src/overworld.c"),
      "global.h": sha256("reference/pokeemerald/include/global.h"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "mauville_old_man.c": sha256("reference/pokeemerald/src/mauville_old_man.c"),
      "battle_factory.c": sha256("reference/pokeemerald/src/battle_factory.c"),
    }).toEqual(evidence.sourceSha256);
    expect(evidence.stats).toMatchObject({
      splash: { symbol: "GAME_STAT_USED_SPLASH", id: 26 },
      struggle: { symbol: "GAME_STAT_USED_STRUGGLE", id: 27 },
      validIndices: "0 <= index < NUM_USED_GAME_STATS (52)",
    });
    const constants = file("reference/pokeemerald/include/constants/game_stat.h");
    const overworld = file("reference/pokeemerald/src/overworld.c");
    const global = file("reference/pokeemerald/include/global.h");
    expect(constants).toContain("#define GAME_STAT_USED_SPLASH                 26");
    expect(constants).toContain("#define GAME_STAT_USED_STRUGGLE               27");
    expect(constants).toContain("#define NUM_USED_GAME_STATS                   52");
    expect(constants).toContain("#define NUM_GAME_STATS                        64");
    expect(global).toContain("/*0x159C*/ u32 gameStats[NUM_GAME_STATS];");
    expect(global).toContain("/*0xAC*/ u32 encryptionKey;");
    expect(overworld).toMatch(/void IncrementGameStat\(u8 index\)[\s\S]*?if \(index < NUM_USED_GAME_STATS\)[\s\S]*?if \(statVal < 0xFFFFFF\)[\s\S]*?statVal\+\+;[\s\S]*?statVal = 0xFFFFFF;[\s\S]*?SetGameStat\(index, statVal\);/);
    expect(overworld).toContain("return gSaveBlock1Ptr->gameStats[index] ^ gSaveBlock2Ptr->encryptionKey;");
    expect(overworld).toContain("gSaveBlock1Ptr->gameStats[index] = value ^ gSaveBlock2Ptr->encryptionKey;");
    const storyteller = file("reference/pokeemerald/src/mauville_old_man.c");
    const factory = file("reference/pokeemerald/src/battle_factory.c");
    expect(storyteller).toContain("GAME_STAT_USED_SPLASH, 1,\n        MauvilleCity_PokemonCenter_1F_Text_UsedSplashTitle");
    expect(storyteller).toContain("GAME_STAT_USED_STRUGGLE, 1,\n        MauvilleCity_PokemonCenter_1F_Text_UsedStruggleTitle");
    expect(storyteller).toContain("return GetGameStat(stat);");
    expect(factory).not.toMatch(/GAME_STAT_USED_SPLASH|GAME_STAT_USED_STRUGGLE|GetGameStat/);
  });

  it("pins Struggle's conditional placement and Splash's PP/animation/stat/message ordering", () => {
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    expect(evidence.scripts.recoil).toContain("jumpifnotmove MOVE_STRUGGLE");
    expect(evidence.scripts.splash).toContain("PP is therefore deducted before the stat write");
    expect(scripts).toContain("BattleScript_EffectRecoil::\n\tsetmoveeffect MOVE_EFFECT_RECOIL_25 | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN\n\tjumpifnotmove MOVE_STRUGGLE, BattleScript_EffectHit\n\tincrementgamestat GAME_STAT_USED_STRUGGLE\n\tgoto BattleScript_EffectHit");
    expect(scripts).toContain("BattleScript_EffectSplash::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tattackanimation\n\twaitanimation\n\tincrementgamestat GAME_STAT_USED_SPLASH\n\tprintstring STRINGID_BUTNOTHINGHAPPENED\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_MoveEnd");
    expect(moves).toContain("[MOVE_SPLASH] =");
    expect(moves).toMatch(/\[MOVE_SPLASH\][\s\S]*?\.effect = EFFECT_SPLASH,[\s\S]*?\.power = 0,[\s\S]*?\.pp = 40,[\s\S]*?\.target = MOVE_TARGET_USER,[\s\S]*?\.flags = 0,/);
  });

  it("keeps a complete-party, public Scene-OFF Splash receipt reproducible while bounding the hidden save stat", () => {
    expect(evidence.schema).toBe("increment-game-stat-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "3a4f4af1b89c239e61d4f6d188cd56ba92b04077d9f7722d838c3c02001fc9ff" });
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 129, moves: [150, 150, 150, 150] });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(scenario.trace.captureFrames).toEqual([0, 50, 75, 125, 175, 834]);
    expect(evidence.case.captures.find((capture) => capture.frame === 50)).toMatchObject({
      currentMove: 150, player: { pp: [40, 40, 40, 40] },
    });
    expect(evidence.case.captures.find((capture) => capture.frame === 75)).toMatchObject({
      currentMove: 150, rngValue: 919694434, player: { hp: 95, pp: [39, 40, 40, 40] },
    });
    expect(evidence.case.captures.find((capture) => capture.frame === 175)).toMatchObject({
      currentMove: 150, player: { hp: 95, pp: [39, 40, 40, 40] },
    });
    expect(evidence.boundedRemainder).toContain("forbids injecting zero PP");
    expect(evidence.boundedRemainder).toContain("save/meta layer");
  });
});
