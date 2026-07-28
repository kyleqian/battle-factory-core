import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/heal-party-status-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF B_SCR_OP_HEALPARTYSTATUS evidence", () => {
  it("pins 0xae's no-operand shape, no local RNG, family script order, and non-failing message path", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 174,
      opcodeHex: "0xae",
      length: 1,
      operands: [],
      pc: "gBattlescriptCurrInstr++",
      localRngCalls: 0,
    });
    expect(evidence.moveFamily).toMatchObject({
      effect: "EFFECT_HEAL_BELL",
      healBell: { id: 215, type: "TYPE_NORMAL", pp: 5 },
      aromatherapy: { id: 312, type: "TYPE_GRASS", pp: 5 },
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const start = commands.lastIndexOf("static void Cmd_healpartystatus(void)");
    const handler = commands.slice(start, commands.indexOf("static void Cmd_cursetarget(void)", start));
    expect(macro).toContain(".macro healpartystatus\n\t.byte B_SCR_OP_HEALPARTYSTATUS\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_HEALPARTYSTATUS]                 = Cmd_healpartystatus,                         //0xAE");
    expect(handler).toContain("gBattlescriptCurrInstr++;");
    expect(handler).not.toContain("Random(");
    expect(scripts).toContain("BattleScript_EffectHealBell::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\thealpartystatus\n\twaitstate\n\tattackanimation\n\twaitanimation\n\tprintfromtable gPartyStatusHealStringIds\n\twaitmessage B_WAIT_TIME_LONG\n\tjumpifnotmove MOVE_HEAL_BELL, BattleScript_PartyHealEnd");
    expect(evidence.moveFamily.failure).toMatch(/failed-result branch/i);
  });

  it("pins the Heal Bell Soundproof exclusion versus Aromatherapy's all-party mask and controller synchronization", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "abilities.h": sha256("reference/pokeemerald/include/constants/abilities.h"),
      "battle_string_ids.h": sha256("reference/pokeemerald/include/constants/battle_string_ids.h"),
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
      "battle_controller_player.c": sha256("reference/pokeemerald/src/battle_controller_player.c"),
      "battle_controllers.c": sha256("reference/pokeemerald/src/battle_controllers.c"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
    }).toEqual(evidence.sourceSha256);

    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const player = file("reference/pokeemerald/src/battle_controller_player.c");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const start = commands.lastIndexOf("static void Cmd_healpartystatus(void)");
    const handler = commands.slice(start, commands.indexOf("static void Cmd_cursetarget(void)", start));
    expect(handler).toContain("if (gCurrentMove == MOVE_HEAL_BELL)");
    expect(handler).toContain("if (gBattleMons[gBattlerAttacker].ability != ABILITY_SOUNDPROOF)");
    expect(handler).toContain("toHeal |= (1 << i);");
    expect(handler).toContain("toHeal = (1 << PARTY_SIZE) - 1;");
    expect(handler).toContain("BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_STATUS_BATTLE, toHeal, sizeof(zero), &zero);");
    expect(handler).toContain("MarkBattlerForControllerExec(gActiveBattler);");
    expect(player).toContain("if (monToCheck & 1)\n                SetPlayerMonData(i);");
    expect(player).toContain("case REQUEST_STATUS_BATTLE:\n        SetMonData(&gPlayerParty[monId], MON_DATA_STATUS, &gBattleBufferA[gActiveBattler][3]);");
    expect(messages).toContain("[B_MSG_BELL_SOUNDPROOF_ATTACKER] = STRINGID_BELLCHIMED");
    expect(messages).toContain("[B_MSG_SOOTHING_AROMA]           = STRINGID_SOOTHINGAROMA");
    expect(moves).toMatch(/\[MOVE_HEAL_BELL\][\s\S]*?\.effect = EFFECT_HEAL_BELL,[\s\S]*?\.pp = 5,/);
    expect(moves).toMatch(/\[MOVE_AROMATHERAPY\][\s\S]*?\.effect = EFFECT_HEAL_BELL,[\s\S]*?\.pp = 5,/);
    expect(evidence.semantics.healBell).toMatch(/not Soundproof/);
    expect(evidence.semantics.aromatherapy).toMatch(/includes Soundproof/);
  });

  it("keeps the legal complete-party OFF receipt deterministic and pins public PP/status/controller observations", () => {
    expect(evidence.schema).toBe("heal-party-status-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "8b4d24143b31fa9a9b840bbde5fd98a0265c81ee80aa9d241d2e85a7396cc6c8" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));

    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 358, moves: [149, 36, 215, 219], abilitySlot: 0 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 373, moves: [92, 92, 92, 92] });
    for (const observation of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);

    const observed = evidence.case.observed;
    expect(observed.initial).toMatchObject({ currentMove: 0, healBellPp: 5, activeStatus1: 0, partyStatus1: [0, 0, 0] });
    expect(observed.healthyBell).toMatchObject({ currentMove: 215, rngValue: observed.initial.rngValue, healBellPp: 4, activeStatus1: 0, partyStatus1: [0, 0, 0] });
    expect(observed.toxicLanded).toMatchObject({ currentMove: 92, activeStatus1: 128, partyStatus1: [128, 0, 0] });
    expect(observed.toxicBeforeBell).toMatchObject({ currentMove: 215, healBellPp: 4, activeStatus1: 384, partyStatus1: [128, 0, 0] });
    expect(observed.toxicBellCleared).toMatchObject({ currentMove: 215, rngValue: observed.toxicBeforeBell.rngValue, healBellPp: 3, activeStatus1: 0, partyStatus1: [0, 0, 0], controllerExecFlags: 1 });
    expect(observed.controllerSettled).toMatchObject({ currentMove: 215, rngValue: observed.toxicBellCleared.rngValue, healBellPp: 3, activeStatus1: 0, partyStatus1: [0, 0, 0], controllerExecFlags: 0 });
    expect(observed.initial.healBellPp - observed.healthyBell.healBellPp).toBe(1);
    expect(observed.healthyBell.healBellPp - observed.toxicBellCleared.healBellPp).toBe(1);
    expect(evidence.boundedRemainder).toContain("Soundproof");
  });
});
