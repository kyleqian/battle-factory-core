import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/minimize-stomp-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Minimize / Stomp evidence", () => {
  it("pins 0xc7's operandless, obeys-gated attacker status3 write and PC", () => {
    expect(evidence.instruction).toEqual({
      opcode: 199, opcodeHex: "0xc7", length: 1, operandWidths: [],
      pc: "gBattlescriptCurrInstr++", owner: "gStatuses3[gBattlerAttacker]",
      bit: "STATUS3_MINIMIZED (1 << 8)", gate: "gHitMarker & HITMARKER_OBEYS",
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const constants = file("reference/pokeemerald/include/constants/battle.h");
    expect(macro).toContain(".macro setminimize\n\t.byte B_SCR_OP_SETMINIMIZE\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETMINIMIZE]                     = Cmd_setminimize,                             //0xC7");
    expect(commands).toMatch(/static void Cmd_setminimize\(void\)\n\{\n    if \(gHitMarker & HITMARKER_OBEYS\)\n        gStatuses3\[gBattlerAttacker\] \|= STATUS3_MINIMIZED;\n\n    gBattlescriptCurrInstr\+\+;\n\}/);
    expect(constants).toContain("#define STATUS3_MINIMIZED               (1 << 8)");
    expect(constants).toContain("#define HITMARKER_OBEYS                 (1 << 25)");
  });

  it("pins source ordering, max-stat non-rollback, every lifecycle clear, Baton Pass exclusion, and Stomp's target branch", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "constants_battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    expect(scripts).toContain("BattleScript_EffectMinimize::\n\tattackcanceler\n\tsetminimize\n\tsetstatchanger STAT_EVASION, 1, FALSE\n\tgoto BattleScript_EffectStatUpAfterAtkCanceler");
    expect(scripts).toContain("BattleScript_EffectStatUpAfterAtkCanceler::\n\tattackstring\n\tppreduce\n\tstatbuffchange MOVE_EFFECT_AFFECTS_USER | STAT_CHANGE_ALLOW_PTR, BattleScript_StatUpEnd");
    expect(commands).toContain("if (gBattleCommunication[MULTISTRING_CHOOSER] == B_MSG_STAT_WONT_INCREASE && flags & STAT_CHANGE_ALLOW_PTR)\n        gMoveResultFlags |= MOVE_RESULT_MISSED;");
    expect(main).toContain("gStatuses3[i] = 0;");
    expect(main).toContain("gStatuses3[gActiveBattler] &= (STATUS3_LEECHSEED_BATTLER | STATUS3_LEECHSEED | STATUS3_ALWAYS_HITS | STATUS3_PERISH_SONG | STATUS3_ROOTED | STATUS3_MUDSPORT | STATUS3_WATERSPORT);");
    expect(main).toContain("gStatuses3[gActiveBattler] = 0;");
    expect(scripts).toContain("BattleScript_EffectStomp::\n\tjumpifnostatus3 BS_TARGET, STATUS3_MINIMIZED, BattleScript_FlinchEffect\n\tsetbyte sDMG_MULTIPLIER, 2\n\tgoto BattleScript_FlinchEffect");
    expect(scripts).toContain("BattleScript_FlinchEffect::\n\tsetmoveeffect MOVE_EFFECT_FLINCH\n\tgoto BattleScript_EffectHit");
  });

  it("keeps the complete-party OFF carrier case, captures, and twice-replayed manifest reproducible", () => {
    expect(evidence.schema).toBe("minimize-stomp-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "67c617f7e38f3ce045008e9ed8b78dd8b0fb1918f8a23fa55fd86fd08c842977" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(evidence.frontierCarriers.minimize).toMatchObject({ setId: 128, species: 120, moves: [61, 107, 129, 113] });
    expect(evidence.frontierCarriers.stomp).toMatchObject({ setId: 235, species: 203, moves: [60, 23, 273, 285] });
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 120, moves: [61, 107, 129, 113] });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 203, moves: [23, 23, 23, 23] });
    expect(scenario.trace.captureFrames).toEqual([0, 200, 300, 450, 600, 816]);

    const captures = evidence.case.captures;
    expect(captures[1]).toMatchObject({ frame: 200, currentMove: 107, player: { pp: [20, 19, 20, 30], evasionStage: 7, status3: 256 } });
    expect(captures[2]).toMatchObject({ frame: 450, currentMove: 23, rngValue: 2463073799, player: { hp: 105, status3: 256 }, opponent: { pp: [20, 20, 19, 20] } });
    expect(captures[3]).toMatchObject({ frame: 600, currentMove: 23, player: { hp: 0, maxHp: 105, evasionStage: 7, status3: 256 } });
    expect(captures[4]).toMatchObject({ frame: 816, currentMove: 23, rngValue: 765236078, player: { hp: 0, evasionStage: 6, status3: 0 } });
  });
});
