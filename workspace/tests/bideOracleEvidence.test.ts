import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/bide-off-evidence.json" with { type: "json" };

type RecordValue = Record<string, unknown>;
const evidence = evidenceData as RecordValue & {
  cases: Array<{ id: string; scenario: string; ticks: Record<string, RecordValue> }>;
};

function scenario(path: string): RecordValue {
  return JSON.parse(readFileSync(path, "utf8")) as RecordValue;
}

describe("Battle Scene OFF Bide mechanic-lab evidence", () => {
  it("keeps both cases legal, controller-driven, and free of transient injection", () => {
    expect(evidence.schema).toBe("bide-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.probe).toBe("tools/probe/stage-bide-off.py");
    expect(evidence.cases.map((entry) => entry.id)).toEqual([
      "positive-tackle-damage-release",
      "zero-energy-splash-release",
    ]);

    for (const receipt of evidence.cases) {
      const input = scenario(receipt.scenario);
      expect(input).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        level: 50,
        challengeNum: 2,
        battleNum: 2,
        trainerId: 110,
        playerSetIds: [278, 354, 338],
        opponentSetIds: [277, 339, 327],
        seed: 1,
        overrides: {
          battlers: {
            player: { moves: [117, 33, 33, 33], ppUps: [0, 0, 0, 0], ability: 0 },
          },
        },
        trace: { captureFrames: [0, 734] },
      });
      expect(JSON.stringify(input)).not.toMatch(/"(?:hp|status1|status2|status3|weather|statStages|sideConditions)"/);
      expect((input.trace as { segments: Array<{ frames: number }> }).segments
        .reduce((total, segment) => total + segment.frames, 0)).toBe(734);
    }
    expect(evidence.boundary).toMatch(/no per-call RNG attribution/i);
    expect(evidence.boundary).toMatch(/doubles-only absent-target fallback/i);
  });

  it("pins the two-turn Bide counter, positive stored damage, target, and doubled release", () => {
    const positive = evidence.cases[0]!.ticks;
    expect(positive.setBide).toMatchObject({
      bideTurns: [2, 0], status2: [0x1200, 0], multipleTurns: [true, false],
      bideDmg: [0, 0], currentMove: 117, pp: [[9, 35, 35, 35], [35, 34, 35, 35]],
    });
    expect(positive.opponentDamage).toMatchObject({
      bideTurns: [2, 0], bideDmg: [20, 0], bideTarget: [1, 0], hp: [91, 129],
    });
    expect(positive.storing).toMatchObject({
      bideTurns: [1, 0], status2: [0x1100, 0], multipleTurns: [true, false],
      bideDmg: [20, 0], script: "BattleScript_BideStoringEnergy",
    });
    expect(positive.release).toMatchObject({
      bideTurns: [0, 0], status2: [0x1000, 0], multipleTurns: [true, false],
      bideDmg: [20, 0], bideTarget: [1, 0], scriptingBideDmg: 40,
      currentMove: 117, battlerAttacker: 0, battlerTarget: 1,
      script: "BattleScript_BideAttack",
    });
    expect(positive.releaseScriptClearsMultiTurn).toMatchObject({
      status2: [0, 0], multipleTurns: [false, false], script: "BattleScript_BideAttack",
    });
    expect(positive.damageApplied).toMatchObject({
      bideDmg: [20, 40], scriptingBideDmg: 40, hp: [91, 89],
    });
  });

  it("pins the harmless-action no-energy path without fabricating a target or damage", () => {
    const zero = evidence.cases[1]!.ticks;
    expect(zero.setBide).toMatchObject({
      bideTurns: [2, 0], status2: [0x1200, 0], multipleTurns: [true, false],
      bideDmg: [0, 0], currentMove: 117, hp: [129, 129],
    });
    expect(zero.storing).toMatchObject({
      bideTurns: [1, 0], status2: [0x1100, 0], multipleTurns: [true, false],
      bideDmg: [0, 0], script: "BattleScript_BideStoringEnergy",
    });
    expect(zero.release).toMatchObject({
      bideTurns: [0, 0], status2: [0x1000, 0], multipleTurns: [true, false],
      bideDmg: [0, 0], bideTarget: [0, 0], scriptingBideDmg: 0,
      currentMove: 117, battlerAttacker: 0, battlerTarget: 0,
      hp: [129, 129], script: "BattleScript_BideNoEnergyToAttack",
    });
    expect(zero.releaseScriptClearsMultiTurn).toMatchObject({
      status2: [0, 0], multipleTurns: [false, false], bideDmg: [0, 0],
      scriptingBideDmg: 0, hp: [129, 129], script: "BattleScript_BideNoEnergyToAttack",
    });
  });

  it("keeps the source-shaped ownership claims intact", () => {
    const commands = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const utility = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(commands).toContain("gBideDmg[gBattlerAttacker] = 0;");
    expect(commands).toContain("gBattleMons[gBattlerAttacker].status2 |= STATUS2_BIDE_TURN(2);");
    expect(commands).toContain("gBideDmg[gActiveBattler] += gBattleMoveDamage;");
    expect(commands).toContain("gBideTarget[gActiveBattler] = gBattlerAttacker;");
    expect(utility).toContain("gBattleMons[gBattlerAttacker].status2 -= STATUS2_BIDE_TURN(1);");
    expect(utility).toContain("*bideDmg = gBideDmg[gBattlerAttacker] * 2;");
    expect(utility).toContain("gBattlescriptCurrInstr = BattleScript_BideNoEnergyToAttack;");
    expect(scripts).toContain("BattleScript_BideAttack::");
    expect(scripts).toContain("BattleScript_BideNoEnergyToAttack::");
  });
});
