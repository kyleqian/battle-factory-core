import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/focus-energy-off-evidence.json" with { type: "json" };
import { CRITICAL_HIT_CHANCE_ONE_IN, getCriticalHitChanceStage } from "../src/engine/damageCalc.ts";

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const file = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (path: string) => createHash("sha256").update(file(path)).digest("hex");

describe("Battle Scene OFF Focus Energy / setfocusenergy evidence", () => {
  it("pins opcode 0x9a, the exact one-byte handler, and command-local work", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 154, opcodeHex: "0x9a", length: 1, operands: [], handler: "Cmd_setfocusenergy",
      attackerBit: 1048576, pc: "gBattlescriptCurrInstr++ on both branches",
      localRngCalls: 0, localControllerCalls: 0,
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const handler = commands.match(/static void Cmd_setfocusenergy\(void\)\n\{[\s\S]*?\n\}/)?.[0];
    expect(macro).toContain(".macro setfocusenergy\n\t.byte B_SCR_OP_SETFOCUSENERGY\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETFOCUSENERGY]                  = Cmd_setfocusenergy,                          //0x9A");
    expect(handler).toBe("static void Cmd_setfocusenergy(void)\n{\n    if (gBattleMons[gBattlerAttacker].status2 & STATUS2_FOCUS_ENERGY)\n    {\n        gMoveResultFlags |= MOVE_RESULT_FAILED;\n        gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_FOCUS_ENERGY_FAILED;\n    }\n    else\n    {\n        gBattleMons[gBattlerAttacker].status2 |= STATUS2_FOCUS_ENERGY;\n        gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_GETTING_PUMPED;\n    }\n    gBattlescriptCurrInstr++;\n}");
    expect(handler).not.toContain("Random(");
    expect(handler).not.toContain("BtlController_");
    expect(handler).not.toContain("MarkBattlerForControllerExec");
  });

  it("pins every source hash, the real duplicate bypass, crit table/cap, and switch/Baton Pass lifetime", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "constants_battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const constants = file("reference/pokeemerald/include/constants/battle.h");
    const main = file("reference/pokeemerald/src/battle_main.c");
    expect(constants).toContain("#define STATUS2_FOCUS_ENERGY          (1 << 20)");
    expect(scripts).toContain("BattleScript_EffectFocusEnergy::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tjumpifstatus2 BS_ATTACKER, STATUS2_FOCUS_ENERGY, BattleScript_ButItFailed\n\tsetfocusenergy\n\tattackanimation\n\twaitanimation\n\tprintfromtable gFocusEnergyUsedStringIds\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_MoveEnd");
    expect(scripts).toContain("BattleScript_ButItFailed::\n\tpause B_WAIT_TIME_SHORT\n\torbyte gMoveResultFlags, MOVE_RESULT_FAILED\n\tresultmessage\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_MoveEnd");
    expect(commands).toContain("static const u16 sCriticalHitChance[] = {16, 8, 4, 3, 2};");
    expect(commands).toMatch(/critChance  = 2 \* \(\(gBattleMons\[gBattlerAttacker\]\.status2 & STATUS2_FOCUS_ENERGY\) != 0\)[\s\S]*?if \(critChance >= ARRAY_COUNT\(sCriticalHitChance\)\)\n        critChance = ARRAY_COUNT\(sCriticalHitChance\) - 1;/);
    expect(main).toContain("gBattleMons[gActiveBattler].status2 &= (STATUS2_CONFUSION | STATUS2_FOCUS_ENERGY | STATUS2_SUBSTITUTE | STATUS2_ESCAPE_PREVENTION | STATUS2_CURSED);");
    expect(main).toContain("gBattleMons[gActiveBattler].status2 = 0;");
    expect(evidence.publicScript.defensiveHandlerFailurePubliclyReached).toBe(false);
    expect(evidence.lifetime.ownership).toContain("per-active-Pokemon");
  });

  it("pins the source-derived critical-stage consumer table and cap", () => {
    expect(CRITICAL_HIT_CHANCE_ONE_IN).toEqual(evidence.criticalHitConsumer.tableOneIn);
    expect(getCriticalHitChanceStage({ focusEnergy: true })).toBe(2);
    expect(getCriticalHitChanceStage({ focusEnergy: true, moveEffect: "EFFECT_HIGH_CRITICAL" })).toBe(3);
    expect(getCriticalHitChanceStage({ focusEnergy: true, attackerHoldEffect: "HOLD_EFFECT_SCOPE_LENS" })).toBe(3);
    expect(getCriticalHitChanceStage({ focusEnergy: true, attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: true })).toBe(4);
    expect(getCriticalHitChanceStage({ focusEnergy: true, attackerHoldEffect: "HOLD_EFFECT_STICK", isFarfetchd: true })).toBe(4);
    expect(getCriticalHitChanceStage({ focusEnergy: true, moveEffect: "EFFECT_HIGH_CRITICAL", attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: true })).toBe(evidence.criticalHitConsumer.maximumStage);
  });

  it("keeps the exact complete-party, two-use OFF receipt and all compact observations reproducible", () => {
    expect(evidence.schema).toBe("focus-energy-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({
      runs: 2,
      comparison: "byte-identical full manifest.json",
      manifestSha256: "e96bcff2b5772a67db2dff838b85ff4e8429d3fc4eb90f19bc2b85d212d489c1",
    });
    const scenario = JSON.parse(file(evidence.case.scenario)) as {
      mode: string; profile: string;
      overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } };
      trace: { segments: Array<{frames: number; buttons: string[]}>; captureFrames: number[] };
    };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 66, moves: [116, 33, 33, 33] });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 113, moves: [150, 150, 150, 150] });
    expect(scenario.trace.segments.filter((segment) => segment.buttons.includes("A"))).toHaveLength(4);
    expect(evidence.case.captureContract).toEqual({ count: 247, totalFrames: 1108, maximumAllowed: 256 });
    expect(scenario.trace.captureFrames).toHaveLength(247);
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    for (const observation of Object.values(evidence.case.observed)) {
      expect(scenario.trace.captureFrames).toContain(observation.frame);
      expect(observation.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(observation.state).toHaveProperty("rngValue");
      expect(observation.state).toHaveProperty("currentMove");
      expect(observation.state.player).toHaveProperty("status2");
      expect(observation.state.opponent).toHaveProperty("status2");
    }
    expect(evidence.case.observed).toEqual({
      initial: {frame:0,sha256:"48e113edc9643f7c025309fbb3b0e5bc297eda493d3fa4d0e710e61ceeaa3e45",state:{rngValue:3690816045,currentMove:0,sideStatuses:[0,0],player:{species:66,hp:145,maxHp:145,pp:[30,35,35,35],status2:0},opponent:{species:113,hp:325,maxHp:325,pp:[40,40,40,40],status2:0}}},
      selected: {frame:60,sha256:"3ea36dd5bf1f9f01ce83bf42c63c404dabbc336c68789cabdb4baa33dbf96b4a",state:{rngValue:983229340,currentMove:116,sideStatuses:[0,0],player:{species:66,hp:145,maxHp:145,pp:[30,35,35,35],status2:0},opponent:{species:113,hp:325,maxHp:325,pp:[40,40,40,40],status2:0}}},
      success: {frame:99,sha256:"5e769603b8ac422acf7f53f6cfbb7b09d4c6c11d68877a34d2915ff3eae8a092",state:{rngValue:983229340,currentMove:116,sideStatuses:[0,0],player:{species:66,hp:145,maxHp:145,pp:[29,35,35,35],status2:1048576},opponent:{species:113,hp:325,maxHp:325,pp:[40,40,40,40],status2:0}}},
      opponentSplash: {frame:300,sha256:"c282f9504ff67a9a134f445358306b329dd8267e8dba17ee034ac1407deddae0",state:{rngValue:983229340,currentMove:150,sideStatuses:[0,0],player:{species:66,hp:145,maxHp:145,pp:[29,35,35,35],status2:1048576},opponent:{species:113,hp:325,maxHp:325,pp:[40,39,40,40],status2:0}}},
      nextChoice: {frame:540,sha256:"cc859f6d914ff837e109e25c9a8c885e594ef6f9786555863342187844560c18",state:{rngValue:2682491093,currentMove:0,sideStatuses:[0,0],player:{species:66,hp:145,maxHp:145,pp:[29,35,35,35],status2:1048576},opponent:{species:113,hp:325,maxHp:325,pp:[40,39,40,40],status2:0}}},
      repeatSelection: {frame:585,sha256:"24f655a3a0d64433db6e522621c9fd0987220c31a6c78e3c99953fc1837d1032",state:{rngValue:2682491093,currentMove:0,sideStatuses:[0,0],player:{species:66,hp:145,maxHp:145,pp:[29,35,35,35],status2:1048576},opponent:{species:113,hp:325,maxHp:325,pp:[40,39,40,40],status2:0}}},
      repeatFailed: {frame:1000,sha256:"6b6576fa9b34e9804390a867201a99b55a4048ce93bd84ab00ed3bf142dcf7ed",state:{rngValue:2184965245,currentMove:0,sideStatuses:[0,0],player:{species:66,hp:145,maxHp:145,pp:[28,35,35,35],status2:1048576},opponent:{species:113,hp:325,maxHp:325,pp:[40,39,40,39],status2:0}}},
      settled: {frame:1105,sha256:"6b6576fa9b34e9804390a867201a99b55a4048ce93bd84ab00ed3bf142dcf7ed",state:{rngValue:2184965245,currentMove:0,sideStatuses:[0,0],player:{species:66,hp:145,maxHp:145,pp:[28,35,35,35],status2:1048576},opponent:{species:113,hp:325,maxHp:325,pp:[40,39,40,39],status2:0}}},
    });
    expect(evidence.boundedRemainder).toContain("source-only facts");
  });
});
