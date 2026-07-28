import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/refresh-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Refresh / cureifburnedparalyzedorpoisoned evidence", () => {
  it("pins 0xcd's one-pointer shape, attacker ownership, exact accepted mask, and zero local RNG", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 205,
      opcodeHex: "0xcd",
      length: 5,
      operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "failure script target" }],
      pc: { success: "gBattlescriptCurrInstr += 5", failure: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" },
      owner: "gBattleMons[gBattlerAttacker].status1",
      acceptedStatusMask: ["STATUS1_POISON", "STATUS1_BURN", "STATUS1_PARALYSIS", "STATUS1_TOXIC_POISON"],
      success: { status1: 0, activeBattler: "gBattlerAttacker", marksController: true },
      localRngCalls: 0,
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const start = commands.lastIndexOf("static void Cmd_cureifburnedparalyzedorpoisoned(void)");
    const handler = commands.slice(start, commands.indexOf("static void Cmd_settorment(void)", start));
    expect(macro).toContain(".macro cureifburnedparalyzedorpoisoned ptr:req\n\t.byte B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED\n\t.4byte \\ptr\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED] = Cmd_cureifburnedparalyzedorpoisoned,         //0xCD");
    expect(handler).toContain("gBattleMons[gBattlerAttacker].status1 & (STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON)");
    expect(handler).toContain("gBattleMons[gBattlerAttacker].status1 = 0;");
    expect(handler).toContain("gBattlescriptCurrInstr += 5;");
    expect(handler).toContain("gActiveBattler = gBattlerAttacker;");
    expect(handler).toContain("gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);");
    expect(handler).not.toContain("Random(");
  });

  it("pins the source script ordering, PP-before-pointer failure, controller synchronization/blocking, and party-status write", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle_move_effects.h": sha256("reference/pokeemerald/include/constants/battle_move_effects.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_controllers.h": sha256("reference/pokeemerald/include/battle_controllers.h"),
      "battle_controllers.c": sha256("reference/pokeemerald/src/battle_controllers.c"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle_util.h": sha256("reference/pokeemerald/include/battle_util.h"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "battle_factory.c": sha256("reference/pokeemerald/src/battle_factory.c"),
    }).toEqual(evidence.sourceSha256);

    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const controllers = file("reference/pokeemerald/src/battle_controllers.c");
    const playerController = file("reference/pokeemerald/src/battle_controller_player.c");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    const constants = file("reference/pokeemerald/include/constants/battle_frontier_mons.h");
    const statusIconStart = commands.lastIndexOf("static void Cmd_updatestatusicon(void)");
    const statusIcon = commands.slice(statusIconStart, commands.indexOf("static void Cmd_setmist(void)", statusIconStart));
    expect(scripts).toContain("BattleScript_EffectRefresh::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tcureifburnedparalyzedorpoisoned BattleScript_ButItFailed\n\tattackanimation\n\twaitanimation\n\tprintstring STRINGID_PKMNSTATUSNORMAL\n\twaitmessage B_WAIT_TIME_LONG\n\tupdatestatusicon BS_ATTACKER\n\tgoto BattleScript_MoveEnd");
    expect(scripts).toContain("BattleScript_ButItFailed::\n\tpause B_WAIT_TIME_SHORT\n\torbyte gMoveResultFlags, MOVE_RESULT_FAILED\n\tresultmessage");
    expect(moves).toMatch(/\[MOVE_REFRESH\][\s\S]*?\.effect = EFFECT_REFRESH,[\s\S]*?\.power = 0,[\s\S]*?\.type = TYPE_NORMAL,[\s\S]*?\.accuracy = 100,[\s\S]*?\.pp = 20,[\s\S]*?\.target = MOVE_TARGET_USER,[\s\S]*?\.priority = 0,[\s\S]*?\.flags = FLAG_SNATCH_AFFECTED,/);
    expect(constants).toContain("#define FRONTIER_MON_CHANSEY_1      227");
    expect(frontier).toMatch(/\[FRONTIER_MON_CHANSEY_1\][\s\S]*?\.species = SPECIES_CHANSEY,[\s\S]*?\.moves = \{MOVE_METRONOME, MOVE_REFRESH, MOVE_DEFENSE_CURL, MOVE_MINIMIZE\},[\s\S]*?BATTLE_FRONTIER_ITEM_SITRUS_BERRY,[\s\S]*?F_EV_SPREAD_SP_DEFENSE \| F_EV_SPREAD_DEFENSE,[\s\S]*?NATURE_RELAXED/);
    expect(commands).toContain("BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_STATUS_BATTLE, 0, sizeof(gBattleMons[gActiveBattler].status1), &gBattleMons[gActiveBattler].status1);");
    expect(controllers).toContain("void BtlController_EmitSetMonData(u8 bufferId, u8 requestId, u8 monToCheck, u8 bytes, void *data)");
    expect(controllers).toContain("sBattleBuffersTransferData[1] = requestId;");
    expect(playerController).toContain("case REQUEST_STATUS_BATTLE:\n        SetMonData(&gPlayerParty[monId], MON_DATA_STATUS, &gBattleBufferA[gActiveBattler][3]);");
    expect(util).toContain("void MarkBattlerForControllerExec(u8 battler)");
    expect(util).toContain("MARK_BATTLE_CONTROLLER_ACTIVE_ON_LOCAL(battler);");
    expect(statusIcon).toContain("if (gBattleControllerExecFlags)\n        return;");
    expect(statusIcon).toContain("BtlController_EmitStatusIconUpdate(B_COMM_TO_CONTROLLER, gBattleMons[gActiveBattler].status1, gBattleMons[gActiveBattler].status2);");
    expect(statusIcon).toContain("MarkBattlerForControllerExec(gActiveBattler);");
  });

  it("keeps the complete-party legal OFF healthy-failure, real-Toxic success receipt reproducible", () => {
    expect(evidence.schema).toBe("refresh-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "12571c447d03ec9ca1a71fd55c7715862d2c226539404571f307b96522a68012" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(evidence.frontierCarrier).toEqual({ setId: 227, name: "FRONTIER_MON_CHANSEY_1", level50Eligible: true, species: 113, moves: [118, 287, 111, 107], item: 142, itemTableId: "BATTLE_FRONTIER_ITEM_SITRUS_BERRY", nature: 7, evs: { hp: 0, attack: 0, defense: 255, speed: 0, spAttack: 0, spDefense: 255 } });

    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 113, moves: [118, 287, 111, 107], item: 142, nature: 7, friendship: 0 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 373, moves: [92, 92, 92, 92] });
    const observed = evidence.case.observed;
    for (const observation of Object.values(observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    expect(observed.initialHealthy).toMatchObject({ currentMove: 0, player: { hp: 325, pp: [10, 20, 40, 20], status1: 0 }, persistentStatus1: 0 });
    expect(observed.healthyFailureAfterPp).toMatchObject({ currentMove: 287, rngValue: observed.initialHealthy.rngValue, player: { hp: 325, pp: [10, 19, 40, 20], status1: 0 }, persistentStatus1: 0 });
    expect(observed.realToxicLanded).toMatchObject({ currentMove: 92, player: { status1: 128 }, persistentStatus1: 128 });
    expect(observed.toxicBeforeRefresh).toMatchObject({ currentMove: 287, player: { hp: 305, pp: [10, 19, 40, 20], status1: 384 }, persistentStatus1: 128 });
    expect(observed.toxicSuccess).toMatchObject({ currentMove: 287, rngValue: observed.toxicBeforeRefresh.rngValue, player: { hp: 305, pp: [10, 18, 40, 20], status1: 0 }, persistentStatus1: 0 });
    expect(observed.successHold).toMatchObject({ currentMove: 287, rngValue: observed.toxicSuccess.rngValue, player: { hp: 305, pp: [10, 18, 40, 20], status1: 0 }, persistentStatus1: 0 });
    expect(observed.initialHealthy.player.pp[1] - observed.healthyFailureAfterPp.player.pp[1]).toBe(1);
    expect(observed.healthyFailureAfterPp.player.pp[1] - observed.toxicSuccess.player.pp[1]).toBe(1);
    expect(evidence.boundedRemainder).toContain("sleep/freeze failures");
  });
});
