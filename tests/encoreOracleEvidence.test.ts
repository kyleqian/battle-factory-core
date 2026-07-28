import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/encore-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const file = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (path: string) => createHash("sha256").update(file(path)).digest("hex");

describe("Battle Scene OFF Encore / trysetencore evidence", () => {
  it("pins 0xa4's five-byte pointer shape, target-owned DisableStruct fields, predicates, and timer draw", () => {
    expect(evidence.instruction).toEqual({ opcode: 164, opcodeHex: "0xa4", length: 5, operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "failure script target" }], pc: { success: "gBattlescriptCurrInstr += 5", failure: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" } });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const battle = file("reference/pokeemerald/include/battle.h");
    const random = file("reference/pokeemerald/src/random.c");
    expect(macro).toContain(".macro trysetencore ptr:req\n\t.byte B_SCR_OP_TRYSETENCORE\n\t.4byte \\ptr\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_TRYSETENCORE]                    = Cmd_trysetencore,                            //0xA4");
    const handler = commands.match(/static void Cmd_trysetencore\(void\)\n\{[\s\S]*?\n\}/)?.[0];
    expect(handler).toContain("gLastMoves[gBattlerTarget] == MOVE_STRUGGLE");
    expect(handler).toContain("gLastMoves[gBattlerTarget] == MOVE_ENCORE");
    expect(handler).toContain("gLastMoves[gBattlerTarget] == MOVE_MIRROR_MOVE");
    expect(handler).toContain("gDisableStructs[gBattlerTarget].encoredMove == MOVE_NONE");
    expect(handler).toContain("gBattleMons[gBattlerTarget].pp[i] != 0");
    expect(handler).toContain("gDisableStructs[gBattlerTarget].encoredMovePos = i;");
    expect(handler).toContain("gDisableStructs[gBattlerTarget].encoreTimer = (Random() & 3) + 3;");
    expect(handler).toContain("gDisableStructs[gBattlerTarget].encoreTimerStartValue = gDisableStructs[gBattlerTarget].encoreTimer;");
    expect(battle).toContain("u16 encoredMove;");
    expect(battle).toContain("u8 encoredMovePos;");
    expect(battle).toContain("u8 encoreTimer:4;");
    expect(battle).toContain("u8 encoreTimerStartValue:4;");
    expect(random).toContain("gRngValue = ISO_RANDOMIZE1(gRngValue);\n    sRandCount++;\n    return gRngValue >> 16;");
  });

  it("pins source order, forced admission, expiry, message ownership, and cleanup", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"), "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"), "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"), "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"), "battle.h": sha256("reference/pokeemerald/include/battle.h"), "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"), "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"), "random.c": sha256("reference/pokeemerald/src/random.c"), "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"), "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    expect(scripts).toContain("BattleScript_EffectEncore::\n\tattackcanceler\n\taccuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE\n\tattackstring\n\tppreduce\n\ttrysetencore BattleScript_ButItFailed\n\tattackanimation\n\twaitanimation\n\tprintstring STRINGID_PKMNGOTENCORE");
    expect(util).toContain("gCurrentMove = gChosenMove = gDisableStructs[gBattlerAttacker].encoredMove;");
    expect(util).toContain("if (gDisableStructs[battler].encoreTimer && gDisableStructs[battler].encoredMove != gBattleMons[battler].moves[i])");
    expect(util).toContain("else if (--gDisableStructs[gActiveBattler].encoreTimer == 0\n                     || gBattleMons[gActiveBattler].pp[gDisableStructs[gActiveBattler].encoredMovePos] == 0)");
    expect(util).toContain("BattleScriptExecute(BattleScript_EncoredNoMore);");
    expect(main).toContain("gChosenMoveByBattler[gActiveBattler] = gDisableStructs[gActiveBattler].encoredMove;");
    expect(main).toContain("ptr = (u8 *)&gDisableStructs[gActiveBattler];\n    for (i = 0; i < sizeof(struct DisableStruct); i++)\n        ptr[i] = 0;");
    expect(main).toContain("gDisableStructs[gActiveBattler].perishSongTimer = disableStructCopy.perishSongTimer;");
    expect(messages).toContain('static const u8 sText_PkmnGotEncore[] = _("{B_DEF_NAME_WITH_PREFIX} got\\nan ENCORE!");');
    expect(messages).toContain('static const u8 sText_PkmnEncoreEnded[] = _("{B_ATK_NAME_WITH_PREFIX}\'s ENCORE\\nended!");');
  });

  it("keeps the complete-party OFF success, forced-target-PP, and duplicate receipt reproducible", () => {
    expect(evidence.schema).toBe("encore-off-evidence/v1");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "329676e3ac0cfb47f22254562dc910a2203d4531040d6392c0bb65030fe8bba2" });
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 312, moves: [33, 150, 227, 150] });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [33, 33, 33, 33] });
    for (const observed of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observed.frame);
    const observed = evidence.case.observed;
    expect(observed.encoreSuccess).toMatchObject({ currentMove: 227, playerPp: [34, 40, 4, 40], opponentPp: [35, 34, 35, 35] });
    expect(observed.firstForcedTackle).toMatchObject({ currentMove: 33, opponentPp: [34, 34, 35, 35] });
    expect(observed.duplicateEncoreFailureAfterPp).toMatchObject({ currentMove: 227, playerPp: [34, 40, 3, 40], opponentPp: [34, 34, 35, 35] });
    expect(observed.repeatedForcedTackle).toMatchObject({ currentMove: 33, opponentPp: [33, 34, 35, 35] });
    expect(evidence.boundedRemainder).toContain("not gLastMoves");
  });
});
