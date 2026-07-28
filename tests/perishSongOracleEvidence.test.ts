import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/perish-song-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const file = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (path: string) => createHash("sha256").update(file(path)).digest("hex");

describe("Battle Scene OFF Perish Song / trysetperishsong evidence", () => {
  it("pins 0xb2's five-byte pointer shape, all-battler predicates, fields, and no local RNG/controller work", () => {
    expect(evidence.instruction).toEqual({ opcode: 178, opcodeHex: "0xb2", length: 5, operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "all-unaffected failure script target" }], pc: { success: "gBattlescriptCurrInstr += 5", failure: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" }, localRngCalls: 0 });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const battle = file("reference/pokeemerald/include/battle.h");
    const handler = commands.match(/static void Cmd_trysetperishsong\(void\)\n\{[\s\S]*?\n\}/)?.[0];
    expect(macro).toContain(".macro trysetperishsong ptr:req\n\t.byte B_SCR_OP_TRYSETPERISHSONG\n\t.4byte \\ptr\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_TRYSETPERISHSONG]                = Cmd_trysetperishsong,                        //0xB2");
    expect(handler).toContain("for (i = 0; i < gBattlersCount; i++)");
    expect(handler).toContain("gStatuses3[i] & STATUS3_PERISH_SONG");
    expect(handler).toContain("gBattleMons[i].ability == ABILITY_SOUNDPROOF");
    expect(handler).toContain("gStatuses3[i] |= STATUS3_PERISH_SONG;");
    expect(handler).toContain("gDisableStructs[i].perishSongTimer = 3;");
    expect(handler).toContain("gDisableStructs[i].perishSongTimerStartValue = 3;");
    expect(handler).toContain("PressurePPLoseOnUsingPerishSong(gBattlerAttacker);");
    expect(handler).toContain("if (notAffectedCount == gBattlersCount)");
    expect(handler).not.toContain("Random(");
    expect(handler).not.toContain("BtlController_");
    expect(battle).toContain("u8 perishSongTimer:4;");
    expect(battle).toContain("u8 perishSongTimerStartValue:4;");
  });

  it("pins script-owned messages, end-turn countdown/faint routing, and switch lifetime rules from source", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"), "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"), "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"), "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"), "battle.h": sha256("reference/pokeemerald/include/battle.h"), "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"), "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"), "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"), "abilities.h": sha256("reference/pokeemerald/include/constants/abilities.h"), "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    expect(scripts).toContain("BattleScript_EffectPerishSong::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\ttrysetperishsong BattleScript_ButItFailed\n\tattackanimation\n\twaitanimation\n\tprintstring STRINGID_FAINTINTHREE");
    expect(scripts).toContain("jumpifability BS_SCRIPTING, ABILITY_SOUNDPROOF, BattleScript_PerishSongNotAffected");
    expect(scripts).toContain("BattleScript_PerishSongTakesLife::\n\tprintstring STRINGID_PKMNPERISHCOUNTFELL\n\twaitmessage B_WAIT_TIME_LONG\n\torword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE\n\thealthbarupdate BS_ATTACKER\n\tdatahpupdate BS_ATTACKER\n\ttryfaintmon BS_ATTACKER");
    expect(util).toContain("gActiveBattler = gBattlerAttacker = gBattlerByTurnOrder[gBattleStruct->wishPerishSongBattlerId];");
    expect(util).toContain("if (gStatuses3[gActiveBattler] & STATUS3_PERISH_SONG)");
    expect(util).toContain("PREPARE_BYTE_NUMBER_BUFFER(gBattleTextBuff1, 1, gDisableStructs[gActiveBattler].perishSongTimer);");
    expect(util).toContain("gDisableStructs[gActiveBattler].perishSongTimer--;");
    expect(main).toContain("gStatuses3[gActiveBattler] = 0;");
    expect(main).toContain("gStatuses3[gActiveBattler] &= (STATUS3_LEECHSEED_BATTLER | STATUS3_LEECHSEED | STATUS3_ALWAYS_HITS | STATUS3_PERISH_SONG");
    expect(main).toContain("gDisableStructs[gActiveBattler].perishSongTimer = disableStructCopy.perishSongTimer;");
    expect(main).toContain("gDisableStructs[gActiveBattler].perishSongTimerStartValue = disableStructCopy.perishSongTimerStartValue;");
  });

  it("keeps the legal complete-party OFF initial-set, duplicate, and countdown receipt reproducible", () => {
    expect(evidence.schema).toBe("perish-song-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "e0f1d6d6488d45e9087afdf60456adf939dfcb93d942e0177b6bfc60a93c6a61" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 131, moves: [195, 150, 150, 150], abilitySlot: 0 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [33, 33, 33, 33], abilitySlot: 0 });
    for (const observation of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    const observed = evidence.case.observed;
    expect(observed.initialSet).toMatchObject({ currentMove: 195, playerPp: [4, 40, 40, 40], playerStatus3: 32, opponentStatus3: 32, playerPerishSongTurns: 3, opponentPerishSongTurns: 3, controllerExecFlags: 0 });
    expect(observed.firstPlayerCountdown).toMatchObject({ playerPerishSongTurns: 2, opponentPerishSongTurns: 3 });
    expect(observed.firstBothCountdown).toMatchObject({ playerPerishSongTurns: 2, opponentPerishSongTurns: 2 });
    expect(observed.allAffectedRepeatFailure).toMatchObject({ currentMove: 195, playerPp: [3, 40, 40, 40], playerStatus3: 32, opponentStatus3: 32, playerPerishSongTurns: 2, opponentPerishSongTurns: 2, controllerExecFlags: 0 });
    expect(observed.secondBothCountdown).toMatchObject({ playerPerishSongTurns: 1, opponentPerishSongTurns: 1 });
    expect(observed.initialSet.playerPp[0] - observed.allAffectedRepeatFailure.playerPp[0]).toBe(1);
    expect(evidence.boundedRemainder).toContain("Soundproof");
  });
});
