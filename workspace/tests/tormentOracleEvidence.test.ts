import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/torment-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Torment / settorment registration evidence", () => {
  it("pins 0xce's target-owned high status2 bit, four-byte failure pointer, and zero command-local RNG", () => {
    expect(evidence.instruction).toEqual({
      opcode: 206,
      opcodeHex: "0xce",
      length: 5,
      operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "failure script target" }],
      pc: { success: "gBattlescriptCurrInstr += 5", alreadyTormented: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" },
    });
    expect(evidence.state).toMatchObject({ owner: "gBattleMons[gBattlerTarget].status2", bit: { name: "STATUS2_TORMENT", value: "1 << 31", unsignedValue: 2147483648 } });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    expect(macro).toContain(".macro settorment ptr:req\n\t.byte B_SCR_OP_SETTORMENT\n\t.4byte \\ptr\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETTORMENT]                      = Cmd_settorment,                              //0xCE");
    const handler = commands.match(/static void Cmd_settorment\(void\)\n\{[\s\S]*?\n\}/)?.[0];
    expect(handler).toContain("if (gBattleMons[gBattlerTarget].status2 & STATUS2_TORMENT)");
    expect(handler).toContain("gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);");
    expect(handler).toContain("gBattleMons[gBattlerTarget].status2 |= STATUS2_TORMENT;");
    expect(handler).toContain("gBattlescriptCurrInstr += 5;");
    expect(handler).not.toContain("Random(");
  });

  it("pins source ordering, admission/Struggle semantics, and status2 lifecycle", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
    }).toEqual(evidence.sourceSha256);

    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    expect(scripts).toContain("BattleScript_EffectTorment::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\taccuracycheck BattleScript_ButItFailed, ACC_CURR_MOVE\n\tsettorment BattleScript_ButItFailed\n\tattackanimation\n\twaitanimation\n\tprintstring STRINGID_PKMNSUBJECTEDTOTORMENT");
    expect(scripts).toContain("BattleScript_ButItFailed::\n\tpause B_WAIT_TIME_SHORT\n\torbyte gMoveResultFlags, MOVE_RESULT_FAILED\n\tresultmessage");
    expect(commands).toContain("if ((Random() % 100 + 1) > calc)");
    expect(util).toContain("move == gLastMoves[gActiveBattler] && move != MOVE_STRUGGLE && (gBattleMons[gActiveBattler].status2 & STATUS2_TORMENT)");
    expect(util).toContain("if (gBattleMons[battler].moves[i] == gLastMoves[battler] && check & MOVE_LIMITATION_TORMENTED && gBattleMons[battler].status2 & STATUS2_TORMENT)");
    expect(util).toContain("if (unusable == ALL_MOVES_MASK) // All moves are unusable.");
    expect(util).toContain("gCurrentMove = gChosenMove = MOVE_STRUGGLE;");
    expect(util).toContain("gHitMarker |= HITMARKER_NO_PPDEDUCT;");
    expect(main).toContain("if (gProtectStructs[battler1].noValidMoves)\n                moveBattler1 = MOVE_STRUGGLE;");
    expect(main).toMatch(/void BeginBattleIntro\(void\)\n\{\n    BattleStartClearSetData\(\);/);
    expect(main).toContain("gBattleMons[gActiveBattler].status2 = 0;");
    expect(main).toContain("gBattleMons[gActiveBattler].status2 &= (STATUS2_CONFUSION | STATUS2_FOCUS_ENERGY | STATUS2_SUBSTITUTE | STATUS2_ESCAPE_PREVENTION | STATUS2_CURSED);");
    expect(main).toContain("gBattleMons[i].status2 &= ~STATUS2_FLINCHED;");
    expect(messages).toContain('static const u8 sText_PkmnSubjectedToTorment[] = _("{B_DEF_NAME_WITH_PREFIX} was subjected\\nto TORMENT!");');
    expect(messages).toContain('static const u8 sText_PkmnCantUseMoveTorment[] = _("{B_ACTIVE_NAME_WITH_PREFIX} can\'t use the same\\nmove in a row due to the TORMENT!\\p");');
    expect(evidence.lifetime.batonPass).toContain("STATUS2_TORMENT is absent");
    expect(evidence.admission.struggle).toContain("HITMARKER_NO_PPDEDUCT");
  });

  it("keeps the complete-party legal OFF success, duplicate, and all-slot consumer receipt reproducible", () => {
    expect(evidence.schema).toBe("torment-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "f7a0003672131070f36641ade4d017eddef0d0f55468be7a41e3f16b27ab28c2" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(evidence.frontierCarrier).toEqual({ setId: 127, name: "FRONTIER_MON_KOFFING", level50Eligible: true, species: 109, moves: [124, 108, 259, 114], item: 211, nature: 24 });

    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 109, moves: [124, 108, 259, 114], item: 211 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [33, 33, 33, 33] });
    for (const observation of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    const observed = evidence.case.observed;
    expect(observed.tormentSet).toMatchObject({ currentMove: 259, player: { pp: [20, 20, 14, 30] }, opponent: { status2: 2147483648, pp: [35, 34, 35, 35] } });
    expect(observed.allTackleSlotsBlockedStruggle).toMatchObject({ currentMove: 165, opponent: { pp: [35, 34, 35, 35], status2: 2147483648 } });
    expect(observed.duplicateFailureAfterPp).toMatchObject({ currentMove: 259, player: { pp: [20, 20, 13, 30] }, opponent: { status2: 2147483648 } });
    expect(observed.tormentSet.player.pp[2] - observed.duplicateFailureAfterPp.player.pp[2]).toBe(1);
    expect(evidence.boundedRemainder).toContain("not gBattlescriptCurrInstr");
  });
});
