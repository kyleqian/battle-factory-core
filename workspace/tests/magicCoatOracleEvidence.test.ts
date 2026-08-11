import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/magic-coat-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const file = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (path: string) => createHash("sha256").update(file(path)).digest("hex");

describe("Battle Scene OFF Magic Coat / trysetmagiccoat evidence", () => {
  it("pins 0xdf's five-byte failure-pointer shape, attacker ownership, last-action failure, and command-local boundary", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 223, opcodeHex: "0xdf", length: 5, operands: ["failure pointer (u32)"], handler: "Cmd_trysetmagiccoat",
      ownership: {
        target: "gBattlerTarget = gBattlerAttacker",
        pressureExemption: "gSpecialStatuses[gBattlerAttacker].ppNotAffectedByPressure = 1",
        armedBit: "gProtectStructs[gBattlerAttacker].bounceMove = TRUE",
      },
      failure: { predicate: "gCurrentTurnActionNumber == gBattlersCount - 1", behavior: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" },
      duplicate: "no existing bounceMove test; a non-last action arms the attacker bit and advances",
      pc: { success: "gBattlescriptCurrInstr += 5", failure: "read operand pointer" }, localRngCalls: 0, localControllerCalls: 0,
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const handler = commands.match(/static void Cmd_trysetmagiccoat\(void\)\n\{[\s\S]*?\n\}/)?.[0];
    expect(macro).toContain(".macro trysetmagiccoat ptr:req\n\t.byte B_SCR_OP_TRYSETMAGICCOAT\n\t.4byte \\ptr\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_TRYSETMAGICCOAT]                 = Cmd_trysetmagiccoat,                         //0xDF");
    expect(handler).toBe("static void Cmd_trysetmagiccoat(void)\n{\n    gBattlerTarget = gBattlerAttacker;\n    gSpecialStatuses[gBattlerAttacker].ppNotAffectedByPressure = 1;\n    if (gCurrentTurnActionNumber == gBattlersCount - 1) // moves last turn\n    {\n        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);\n    }\n    else\n    {\n        gProtectStructs[gBattlerAttacker].bounceMove = TRUE;\n        gBattlescriptCurrInstr += 5;\n    }\n}");
    expect(handler).not.toContain("Random(");
    expect(handler).not.toContain("BtlController_");
    expect(handler).not.toContain("MarkBattlerForControllerExec");
  });

  it("pins the effect, target-owned attack-canceler bounce, resume consumer, delegated Pressure boundary, and cleanup", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"), "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"), "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"), "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"), "battle_move_effects.h": sha256("reference/pokeemerald/include/constants/battle_move_effects.h"), "battle.h": sha256("reference/pokeemerald/include/battle.h"), "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"), "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"), "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"), "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"), "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"), "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"), "pokemon.h": sha256("reference/pokeemerald/include/constants/pokemon.h"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    expect(scripts).toContain("BattleScript_EffectMagicCoat::\n\tattackcanceler\n\ttrysetmagiccoat BattleScript_FailedFromAtkString\n\tattackstring\n\tppreduce");
    expect(scripts).toContain("BattleScript_MagicCoatBounce::\n\tattackstring\n\tppreduce\n\tpause B_WAIT_TIME_SHORT\n\tprintstring STRINGID_PKMNMOVEBOUNCED\n\twaitmessage B_WAIT_TIME_LONG\n\torword gHitMarker, HITMARKER_ATTACKSTRING_PRINTED | HITMARKER_NO_PPDEDUCT | HITMARKER_ALLOW_NO_PP\n\tsetmagiccoattarget BS_ATTACKER\n\treturn");
    expect(commands).toMatch(/if \(gProtectStructs\[gBattlerTarget\]\.bounceMove && gBattleMoves\[gCurrentMove\]\.flags & FLAG_MAGIC_COAT_AFFECTED\)[\s\S]*?PressurePPLose\(gBattlerAttacker, gBattlerTarget, MOVE_MAGIC_COAT\);[\s\S]*?bounceMove = FALSE;[\s\S]*?BattleScriptPushCursor\(\);[\s\S]*?gBattlescriptCurrInstr = BattleScript_MagicCoatBounce;[\s\S]*?return;/);
    expect(commands).toMatch(/case VARIOUS_SET_MAGIC_COAT_TARGET:[\s\S]*?gBattlerAttacker = gBattlerTarget;[\s\S]*?followmeTimer[\s\S]*?gBattlerTarget = gActiveBattler;/);
    expect(util).toMatch(/void PressurePPLose\(u8 target, u8 attacker, u16 move\)[\s\S]*?if \(gBattleMons\[target\]\.ability != ABILITY_PRESSURE\)[\s\S]*?if \(MOVE_IS_PERMANENT\(attacker, moveIndex\)\)[\s\S]*?BtlController_EmitSetMonData[\s\S]*?MarkBattlerForControllerExec/);
    expect(main).toMatch(/void BattleTurnPassed\(void\)[\s\S]*?TurnValuesCleanUp\(FALSE\)/);
    expect(main).toMatch(/static void TurnValuesCleanUp\(bool8 var0\)[\s\S]*?dataPtr = \(u8 \*\)\(&gProtectStructs\[gActiveBattler\]\);[\s\S]*?sizeof\(struct ProtectStruct\)[\s\S]*?dataPtr\[i\] = 0;/);
    expect(moves).toMatch(/\[MOVE_MAGIC_COAT\][\s\S]*?\.effect = EFFECT_MAGIC_COAT,[\s\S]*?\.pp = 15,[\s\S]*?\.target = MOVE_TARGET_DEPENDS,[\s\S]*?\.priority = 4,[\s\S]*?\.flags = 0,/);
    expect(moves).toMatch(/\[MOVE_TAIL_WHIP\][\s\S]*?\.effect = EFFECT_DEFENSE_DOWN,[\s\S]*?\.pp = 30,[\s\S]*?FLAG_MAGIC_COAT_AFFECTED/);
  });

  it("keeps the complete-party OFF bounce receipt reproducible without promoting hidden mechanics to public proof", () => {
    expect(evidence.schema).toBe("magic-coat-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "5b737f6807036cbc50cd4235a16dc49294cf9c3eb136070cc36c55870a303870" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 325, moves: [277, 277, 277, 277], abilitySlot: 0 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 95, moves: [39, 39, 39, 39], abilitySlot: 0 });
    for (const observation of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    const observed = evidence.case.observed;
    expect(observed.initial).toMatchObject({ currentMove: 0, player: { pp: [15,15,15,15], defenseStage: 6 }, opponent: { pp: [30,30,30,30], defenseStage: 6 } });
    expect(observed.magicCoatPpSpent).toMatchObject({ currentMove: 277, player: { pp: [14,15,15,15], defenseStage: 6 }, opponent: { pp: [30,30,30,30], defenseStage: 6 } });
    expect(observed.tailWhipPpSpent).toMatchObject({ currentMove: 39, player: { pp: [14,15,15,15], defenseStage: 6 }, opponent: { pp: [30,29,30,30], defenseStage: 6 } });
    expect(observed.bouncePublic).toMatchObject({ currentMove: 39, player: { pp: [14,15,15,15], defenseStage: 6 }, opponent: { pp: [30,29,30,30], defenseStage: 5 } });
    expect(observed.settled).toMatchObject({ currentMove: 0, player: { defenseStage: 6 }, opponent: { defenseStage: 5 } });
    expect(evidence.boundedRemainder).toContain("ProtectStruct bits");
  });
});
