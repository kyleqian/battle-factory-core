import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/spikes-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const file = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (path: string) => createHash("sha256").update(file(path)).digest("hex");

describe("Battle Scene OFF Spikes / trysetspikes source and receipt evidence", () => {
  it("pins 0xb0's pointer shape, attacker-opposite ownership, all normal layer boundaries, and command-local work", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 176,
      opcodeHex: "0xb0",
      length: 5,
      operands: ["failure pointer (u32)"],
      handler: "Cmd_trysetspikes",
      branches: {
        amount0: "success: set SPIKES, 0 -> 1, PC += 5",
        amount1: "success: set SPIKES, 1 -> 2, PC += 5",
        amount2: "success: set SPIKES, 2 -> 3, PC += 5",
        amount3: "failure: set attacker ppNotAffectedByPressure and PC = T1_READ_PTR(PC + 1)",
      },
      localRngCalls: 0,
      localControllerCalls: 0,
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const handler = commands.match(/static void Cmd_trysetspikes\(void\)\n\{[\s\S]*?\n\}/)?.[0];
    expect(macro).toContain(".macro trysetspikes ptr:req\n\t.byte B_SCR_OP_TRYSETSPIKES\n\t.4byte \\ptr\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_TRYSETSPIKES]                    = Cmd_trysetspikes,                            //0xB0");
    expect(handler).toBe("static void Cmd_trysetspikes(void)\n{\n    u8 targetSide = BATTLE_OPPOSITE(GetBattlerSide(gBattlerAttacker));\n\n    if (gSideTimers[targetSide].spikesAmount == 3)\n    {\n        gSpecialStatuses[gBattlerAttacker].ppNotAffectedByPressure = 1;\n        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);\n    }\n    else\n    {\n        gSideStatuses[targetSide] |= SIDE_STATUS_SPIKES;\n        gSideTimers[targetSide].spikesAmount++;\n        gBattlescriptCurrInstr += 5;\n    }\n}");
    expect(handler).not.toContain("Random(");
    expect(handler).not.toContain("BtlController_");
    expect(handler).not.toContain("MarkBattlerForControllerExec");
  });

  it("pins the side condition's real switch-in formula, immunity, one-switch guard, scripts, and lifetime to source", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "constants_battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
    }).toEqual(evidence.sourceSha256);
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const constants = file("reference/pokeemerald/include/constants/battle.h");
    const battle = file("reference/pokeemerald/include/battle.h");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    expect(constants).toContain("#define SIDE_STATUS_SPIKES           (1 << 4)");
    expect(constants).toContain("#define SIDE_STATUS_SPIKES_DAMAGED   (1 << 9)");
    expect(battle).toContain("u8 spikesAmount;");
    expect(commands).toMatch(/SIDE_STATUS_SPIKES_DAMAGED[\s\S]*?SIDE_STATUS_SPIKES[\s\S]*?!IS_BATTLER_OF_TYPE\(gActiveBattler, TYPE_FLYING\)[\s\S]*?ABILITY_LEVITATE[\s\S]*?spikesDmg = \(5 - gSideTimers\[GetBattlerSide\(gActiveBattler\)\]\.spikesAmount\) \* 2;[\s\S]*?maxHP \/ \(spikesDmg\)[\s\S]*?gBattleMoveDamage == 0/);
    expect(commands).toMatch(/SIDE_STATUS_SPIKES_DAMAGED[\s\S]*?BattleScriptPushCursor\(\);[\s\S]*?BattleScript_SpikesOnTarget[\s\S]*?BattleScript_SpikesOnAttacker[\s\S]*?BattleScript_SpikesOnFaintedBattler/);
    expect(commands).toContain("gSideStatuses[GetBattlerSide(gActiveBattler)] &= ~SIDE_STATUS_SPIKES_DAMAGED;");
    expect(commands).toContain("gSideStatuses[GetBattlerSide(gBattlerAttacker)] &= ~SIDE_STATUS_SPIKES;");
    expect(commands).toContain("gSideTimers[GetBattlerSide(gBattlerAttacker)].spikesAmount = 0;");
    expect(main).toContain("gSideTimers[0].followmeTimer = 0;");
    expect(main).not.toContain("spikesAmount = 0");
    expect(scripts).toContain("BattleScript_EffectSpikes::\n\tattackcanceler\n\ttrysetspikes BattleScript_FailedFromAtkString\n\tattackstring\n\tppreduce");
    expect(scripts).toContain("BattleScript_PrintHurtBySpikes::\n\tprintstring STRINGID_PKMNHURTBYSPIKES");
    expect(moves).toMatch(/\[MOVE_SPIKES\][\s\S]*?\.effect = EFFECT_SPIKES,[\s\S]*?\.type = TYPE_GROUND,[\s\S]*?\.pp = 20,[\s\S]*?\.target = MOVE_TARGET_OPPONENTS_FIELD,[\s\S]*?\.flags = 0,/);
  });

  it("keeps the dense complete-party OFF set, grounded switch damage, and repeated-set receipt reproducible", () => {
    expect(evidence.schema).toBe("spikes-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({
      runs: 2,
      comparison: "byte-identical full manifest.json",
      manifestSha256: "42ce49883bdd9687f7eb4ea76b161846b9f8b8b82de8df8fbcb973f2604c742d",
    });
    const scenario = JSON.parse(file(evidence.case.scenario)) as {
      mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] };
    };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 213, moves: [150, 150, 150, 150] });
    expect(scenario.overrides.parties.player[1]).toMatchObject({ species: 111, moves: [33, 33, 33, 33] });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 91, moves: [191, 191, 191, 191] });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(scenario.trace.captureFrames).toHaveLength(256);
    expect(scenario.trace.captureFrames).toEqual([
      0, 50, 250, 700, 950,
      ...Array.from({ length: 249 }, (_, index) => 1002 + index),
      1350, 1606,
    ]);
    for (const observation of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);

    const observed = evidence.case.observed;
    expect(observed.spikesSet).toMatchObject({ currentMove: 191, sideStatuses: [16, 0], sideConditions: { player: { spikes: 1 }, opponent: { spikes: 0 } } });
    expect(observed.switchDataCommitted).toMatchObject({ player: { partyIndex: 1, species: 111, hp: 155, maxHp: 155 } });
    expect(observed.spikesDamageFlagged).toMatchObject({ sideStatuses: [528, 0], player: { hp: 155 } });
    expect(observed.spikesDamage).toMatchObject({ sideStatuses: [528, 0], player: { partyIndex: 1, species: 111, hp: 136, maxHp: 155 } });
    expect(observed.switchDataCommitted.player.hp - observed.spikesDamage.player.hp).toBe(Math.floor(observed.spikesDamage.player.maxHp / 8));
    expect(observed.repeatSet).toMatchObject({ currentMove: 191, sideStatuses: [16, 0], sideConditions: { player: { spikes: 2 }, opponent: { spikes: 0 } } });
    expect(observed.settled).toMatchObject({ sideConditions: { player: { spikes: 2 }, opponent: { spikes: 0 } } });
    expect(evidence.boundedRemainder).toContain("source-only");
  });
});
