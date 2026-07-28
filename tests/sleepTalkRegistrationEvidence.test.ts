import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/sleep-talk-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Sleep Talk registration evidence", () => {
  it("pins both concrete encodings, operands, PC branches, selection retry, and no-return dispatch", () => {
    expect(evidenceData.instructions).toEqual({
      tryChooseSleepTalkMove: {
        opcode: 169,
        opcodeHex: "0xa9",
        length: 5,
        operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "BattleScript_SleepTalkUsingMove" }],
        pc: { allUnusable: "gBattlescriptCurrInstr += 5", selected: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" },
      },
      jumpToCalledMove: {
        opcode: 99,
        opcodeHex: "0x63",
        length: 2,
        operands: [{ width: 1, encoding: "literal", value: "TRUE (1)" }],
        pc: "gBattlescriptCurrInstr = gBattleScriptsForMoveEffects[gBattleMoves[gCurrentMove].effect]",
      },
    });

    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    expect(macro).toContain(".macro trychoosesleeptalkmove ptr:req\n\t.byte B_SCR_OP_TRYCHOOSESLEEPTALKMOVE\n\t.4byte \\ptr");
    expect(macro).toContain(".macro jumptocalledmove notChosenMove:req\n\t.byte B_SCR_OP_JUMPTOCALLEDMOVE\n\t.byte \\notChosenMove");
    expect(commands).toContain("[B_SCR_OP_JUMPTOCALLEDMOVE]                = Cmd_jumptocalledmove,                        //0x63");
    expect(commands).toContain("[B_SCR_OP_TRYCHOOSESLEEPTALKMOVE]          = Cmd_trychoosesleeptalkmove,                  //0xA9");
    expect(commands).toContain("gBattlescriptCurrInstr += 5;");
    expect(commands).toContain("movePosition = MOD(Random(), MAX_MON_MOVES);");
    expect(commands).toContain("while ((gBitTable[movePosition] & unusableMovesBits));");
    expect(commands).toContain("gCalledMove = gBattleMons[gBattlerAttacker].moves[movePosition];");
    expect(commands).toContain("gCurrMovePos = movePosition;");
    expect(commands).toContain("gBattlerTarget = GetMoveTarget(gCalledMove, NO_TARGET_OVERRIDE);");
    expect(commands).toContain("gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);");
    expect(commands).toContain("gCurrentMove = gCalledMove;");
    expect(commands).toContain("gChosenMove = gCurrentMove = gCalledMove;");
    expect(commands).toContain("gBattlescriptCurrInstr = gBattleScriptsForMoveEffects[gBattleMoves[gCurrentMove].effect];");
    expect(commands).not.toMatch(/Cmd_jumptocalledmove[\s\S]{0,900}BattleScriptPushCursor/);
  });

  it("pins every Sleep Talk source branch, exclusions, PP policy, messages, and a Level-50 Factory carrier", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
      "battle_string_ids.h": sha256("reference/pokeemerald/include/constants/battle_string_ids.h"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
    }).toEqual(evidenceData.sourceSha256);

    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    const frontierIds = file("reference/pokeemerald/include/constants/battle_frontier_mons.h");
    expect(scripts).toMatch(/BattleScript_EffectSleepTalk::[\s\S]*?jumpifstatus BS_ATTACKER, STATUS1_SLEEP, BattleScript_SleepTalkIsAsleep[\s\S]*?attackstring[\s\S]*?ppreduce[\s\S]*?goto BattleScript_ButItFailed/);
    expect(scripts).toMatch(/BattleScript_SleepTalkIsAsleep::[\s\S]*?STRINGID_PKMNFASTASLEEP[\s\S]*?orword gHitMarker, HITMARKER_NO_PPDEDUCT[\s\S]*?trychoosesleeptalkmove BattleScript_SleepTalkUsingMove[\s\S]*?pause B_WAIT_TIME_LONG[\s\S]*?goto BattleScript_ButItFailed/);
    expect(scripts).toContain("BattleScript_SleepTalkUsingMove::\n\tattackanimation\n\twaitanimation\n\tsetbyte sB_ANIM_TURN, 0\n\tsetbyte sB_ANIM_TARGETS_HIT, 0\n\tjumptocalledmove TRUE");
    expect(scripts).toContain("BattleScript_ButItFailed::\n\tpause B_WAIT_TIME_SHORT\n\torbyte gMoveResultFlags, MOVE_RESULT_FAILED\n\tresultmessage");
    expect(scripts).toContain("BattleScript_EffectOHKO::\n\tattackcanceler\n\tattackstring\n\tppreduce");
    expect(messages).toContain('static const u8 sText_PkmnFastAsleep[] = _("{B_ATK_NAME_WITH_PREFIX} is fast\\nasleep.");');
    expect(messages).toContain('static const u8 sText_ButItFailed[] = _("But it failed!");');
    expect(commands).toContain("|| move == MOVE_SLEEP_TALK\n     || move == MOVE_ASSIST\n     || move == MOVE_MIRROR_MOVE\n     || move == MOVE_METRONOME");
    expect(commands).toContain("|| gBattleMons[gBattlerAttacker].moves[i] == MOVE_FOCUS_PUNCH\n            || gBattleMons[gBattlerAttacker].moves[i] == MOVE_UPROAR\n            || IsTwoTurnsMove(gBattleMons[gBattlerAttacker].moves[i])");
    expect(commands).toContain("CheckMoveLimitations(gBattlerAttacker, unusableMovesBits, ~MOVE_LIMITATION_PP)");
    expect(util).toContain("if (gBattleMons[battler].pp[i] == 0 && check & MOVE_LIMITATION_PP)");
    expect(moves).toMatch(/\[MOVE_SLEEP_TALK\][\s\S]*?\.effect = EFFECT_SLEEP_TALK,[\s\S]*?\.pp = 10,/);
    expect(frontierIds).toContain("#define FRONTIER_MON_WHISCASH_3     576");
    expect(frontier).toMatch(/\[FRONTIER_MON_WHISCASH_3\][\s\S]*?\.moves = \{MOVE_SLEEP_TALK, MOVE_REST, MOVE_SURF, MOVE_FISSURE\}/);
  });

  it("keeps the complete-party, controller-driven awake failure, real Spore, and asleep dispatch reproducible", () => {
    expect(evidenceData.schema).toBe("sleep-talk-off-evidence/v1");
    expect(evidenceData.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidenceData.case.scenario)).toBe(evidenceData.case.scenarioSha256);
    expect(evidenceData.repeatability).toEqual({ runsPerCase: 2, comparison: "byte-identical full manifest.json", allMatched: true });
    expect(new Set(evidenceData.case.runManifestSha256).size).toBe(1);
    expect(evidenceData.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));

    const scenario = JSON.parse(file(evidenceData.case.scenario)) as { overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 324, level: 50, moves: [214, 156, 57, 90], item: 0 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 47, level: 50, moves: [147, 147, 147, 147] });
    expect(evidenceData.case.captures.every(({ frame }) => scenario.trace.captureFrames.includes(frame))).toBe(true);

    const [, awakeFailure, slept, menu, asleepChoice, calledFissure, fainted] = evidenceData.case.captures;
    expect(awakeFailure).toMatchObject({ frame: 100, currentMove: 214, player: { pp: [9, 10, 15, 5], status1: 0 } });
    expect(slept).toMatchObject({ frame: 300, currentMove: 147, player: { status1: 2 }, opponent: { pp: [15, 15, 15, 14] } });
    expect(menu).toMatchObject({ frame: 400, currentMove: 0, player: { status1: 2 } });
    expect(asleepChoice).toMatchObject({ frame: 800, currentMove: 214, player: { pp: [9, 10, 15, 5], status1: 1 } });
    expect(calledFissure).toMatchObject({ frame: 900, rngValue: 3986388119, currentMove: 90, player: { pp: [8, 10, 15, 5], status1: 1 } });
    expect(fainted).toMatchObject({ frame: 1200, currentMove: 90, player: { pp: [8, 10, 15, 5] }, opponent: { hp: 0 } });
  });
});
