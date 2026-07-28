import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/defense-curl-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Defense Curl / setdefensecurlbit registration evidence", () => {
  it("pins the one-byte 0xbf opcode, attacker-owned status2 bit, and direct PC", () => {
    expect(evidence.instruction).toEqual({
      opcode: 191,
      opcodeHex: "0xbf",
      length: 1,
      operandWidths: [],
      pc: "gBattlescriptCurrInstr++",
    });
    expect(evidence.state).toEqual({
      owner: "gBattleMons[gBattlerAttacker].status2",
      target: "gBattlerTarget is neither read nor written by Cmd_setdefensecurlbit",
      bit: "STATUS2_DEFENSE_CURL (1 << 30)",
      write: "OR the bit unconditionally; no local failure branch or result-flag write",
    });

    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const commandConstants = file("reference/pokeemerald/include/constants/battle_script_commands.h");
    const battleConstants = file("reference/pokeemerald/include/constants/battle.h");
    expect(macro).toContain(".macro setdefensecurlbit\n\t.byte B_SCR_OP_SETDEFENSECURLBIT\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETDEFENSECURLBIT]               = Cmd_setdefensecurlbit,                       //0xBF");
    expect(commandConstants).toContain("    B_SCR_OP_SETDEFENSECURLBIT,");
    expect(battleConstants).toContain("#define STATUS2_DEFENSE_CURL          (1 << 30)");
    expect(commands).toMatch(/static void Cmd_setdefensecurlbit\(void\)\n\{\n    gBattleMons\[gBattlerAttacker\]\.status2 \|= STATUS2_DEFENSE_CURL;\n    gBattlescriptCurrInstr\+\+;\n\}/);
  });

  it("pins effect ordering, max-stat behavior, source persistence, and the Rollout reader", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "constants_battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
    }).toEqual(evidence.sourceSha256);

    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const defenseCurlScript = scripts.slice(scripts.indexOf("BattleScript_EffectDefenseCurl::"), scripts.indexOf("BattleScript_EffectSoftboiled::"));
    expect(defenseCurlScript).toMatch(/attackcanceler[\s\S]*?attackstring[\s\S]*?ppreduce[\s\S]*?setdefensecurlbit[\s\S]*?setstatchanger STAT_DEF, 1, FALSE[\s\S]*?statbuffchange MOVE_EFFECT_AFFECTS_USER \| STAT_CHANGE_ALLOW_PTR, BattleScript_DefenseCurlDoStatUpAnim[\s\S]*?jumpifbyte CMP_EQUAL, cMULTISTRING_CHOOSER, B_MSG_STAT_WONT_INCREASE, BattleScript_StatUpPrintString/);
    expect(commands).toContain("if (gBattleMons[gActiveBattler].statStages[statId] == MAX_STAT_STAGE)\n            gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_STAT_WONT_INCREASE;");
    expect(commands).toContain("if (gBattleCommunication[MULTISTRING_CHOOSER] == B_MSG_STAT_WONT_INCREASE && flags & STAT_CHANGE_ALLOW_PTR)\n        gMoveResultFlags |= MOVE_RESULT_MISSED;");
    expect(commands.match(/STATUS2_DEFENSE_CURL/g)).toHaveLength(2);
    expect(commands).toContain("if (gBattleMons[gBattlerAttacker].status2 & STATUS2_DEFENSE_CURL)\n            gDynamicBasePower *= 2;");
    expect(evidence.rolloutInteraction.sourcePowerLadderWithDefenseCurl).toEqual([60, 120, 240, 480, 960]);
  });

  it("keeps the complete-party legal Factory-carrier route and twice-replayed observations reproducible", () => {
    expect(evidence.schema).toBe("defense-curl-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.frontierCarrier).toMatchObject({
      setId: 432,
      name: "FRONTIER_MON_SHUCKLE_1",
      level50Eligible: true,
      species: 213,
      moves: [205, 111, 214, 156],
      nature: "NATURE_BRAVE",
    });
    expect(evidence.case.repeatability).toEqual({
      runs: 2,
      comparison: "byte-identical full manifest.json",
      manifestSha256: "4460104ba9d448e255dd46c66f9922b85f4cdb1b77e711c6c1bb96c219479677",
    });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));

    const scenario = JSON.parse(file(evidence.case.scenario)) as {
      mode: string;
      profile: string;
      overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } };
      trace: { segments: Array<{ buttons: string[] }>; captureFrames: number[] };
    };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 213, moves: [205, 111, 214, 156] });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [150, 150, 150, 150] });
    expect(scenario.trace.segments.filter(({ buttons }) => buttons.includes("A"))).toHaveLength(4);

    const observed = evidence.case.observed;
    expect(observed.defenseCurl).toMatchObject({ currentMove: 111, playerPp: [20, 39, 10, 10], playerStatus2: 1 << 30, defenseStage: 7, opponentHp: 362 });
    expect(observed.postTurnPersistence).toMatchObject({ currentMove: 0, playerStatus2: 1 << 30, defenseStage: 7 });
    expect(observed.rolloutHits.map(({ opponentHp }) => opponentHp)).toEqual([327, 170, 12, 0]);
    for (const hit of observed.rolloutHits) {
      expect(hit.playerPp).toEqual([19, 39, 10, 10]);
      expect(hit.playerStatus2).toBe((1 << 30) | (1 << 12));
      expect(scenario.trace.captureFrames).toContain(hit.frame);
    }
  });
});
