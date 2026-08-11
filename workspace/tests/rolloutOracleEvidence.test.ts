import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/rollout-off-evidence.json" with { type: "json" };

type Mon = {
  species: number;
  level: number;
  moves: number[];
  ppUps: number[];
};

type Scenario = {
  schemaVersion: number;
  mode: string;
  profile: string;
  seed: number;
  overrides: { parties: { player: Mon[]; opponent: Mon[] }; battlers?: unknown };
  trace: { segments: Array<{ frames: number; buttons: string[] }>; captureFrames: number[] };
};

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Rollout / rolloutdamagecalculation registration evidence", () => {
  it("pins the one-byte opcode and both PC outcomes", () => {
    expect(evidenceData.instruction).toEqual({
      opcode: 179,
      opcodeHex: "0xb3",
      length: 1,
      operandWidths: [],
      pc: {
        successfulHit: "gBattlescriptCurrInstr++",
        noEffectMiss: "CancelMultiTurnMoves(gBattlerAttacker); gBattlescriptCurrInstr = BattleScript_MoveMissedPause",
      },
    });

    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    expect(macro).toContain(".macro rolloutdamagecalculation\n\t.byte B_SCR_OP_ROLLOUTDAMAGECALCULATION\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_ROLLOUTDAMAGECALCULATION]        = Cmd_rolloutdamagecalculation,                //0xB3");
    expect(commands).toMatch(/static void Cmd_rolloutdamagecalculation\(void\)[\s\S]*?if \(gMoveResultFlags & MOVE_RESULT_NO_EFFECT\)[\s\S]*?CancelMultiTurnMoves\(gBattlerAttacker\);[\s\S]*?gBattlescriptCurrInstr = BattleScript_MoveMissedPause;[\s\S]*?gBattlescriptCurrInstr\+\+;/);
  });

  it("pins initial/repeated attacker-owned state, power ladder, and cancellation ownership", () => {
    expect(evidenceData.handler).toMatchObject({
      owner: "gBattlerAttacker",
      initialSuccessfulHit: {
        rolloutTimer: 5,
        rolloutTimerStartValue: 5,
        status2Set: "STATUS2_MULTIPLETURNS (1 << 12)",
        lockedMove: "gLockedMoves[gBattlerAttacker] = gCurrentMove",
      },
      eachSuccessfulHit: {
        decrement: "--gDisableStructs[gBattlerAttacker].rolloutTimer",
        defenseCurlPowers: [60, 120, 240, 480, 960],
      },
    });

    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    expect(commands).toMatch(/if \(!\(gBattleMons\[gBattlerAttacker\]\.status2 & STATUS2_MULTIPLETURNS\)\)[\s\S]*?rolloutTimer = 5;[\s\S]*?rolloutTimerStartValue = 5;[\s\S]*?status2 \|= STATUS2_MULTIPLETURNS;[\s\S]*?gLockedMoves\[gBattlerAttacker\] = gCurrentMove;/);
    expect(commands).toContain("if (--gDisableStructs[gBattlerAttacker].rolloutTimer == 0) // last hit");
    expect(commands).toContain("gDynamicBasePower = gBattleMoves[gCurrentMove].power;");
    expect(commands).toContain("for (i = 1; i < (5 - gDisableStructs[gBattlerAttacker].rolloutTimer); i++)");
    expect(commands).toContain("if (gBattleMons[gBattlerAttacker].status2 & STATUS2_DEFENSE_CURL)\n            gDynamicBasePower *= 2;");
    expect(commands).toContain("gBattleMons[gBattlerAttacker].status2 |= STATUS2_DEFENSE_CURL;");
    expect(main).toContain("gChosenActionByBattler[gActiveBattler] = B_ACTION_USE_MOVE;");
    expect(util).toContain("gCurrentMove = gChosenMove = gLockedMoves[gBattlerAttacker];");

    const cancel = util.slice(util.indexOf("void CancelMultiTurnMoves"), util.indexOf("bool8 WasUnableToUseMove"));
    expect(cancel).toContain("gBattleMons[battler].status2 &= ~STATUS2_MULTIPLETURNS;");
    expect(cancel).toContain("gDisableStructs[battler].rolloutTimer = 0;");
    expect(cancel).toContain("gDisableStructs[battler].furyCutterCounter = 0;");
    expect(cancel).not.toContain("rolloutTimerStartValue");
    expect(cancel).not.toContain("gLockedMoves");
  });

  it("pins the genuine effect's initial-only PP reduction, Defense Curl route, move, and Factory carrier", () => {
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    const frontierIds = file("reference/pokeemerald/include/constants/battle_frontier_mons.h");
    expect(scripts).toMatch(/BattleScript_EffectRollout::[\s\S]*?attackcanceler[\s\S]*?attackstring[\s\S]*?jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_RolloutCheckAccuracy[\s\S]*?ppreduce[\s\S]*?BattleScript_RolloutCheckAccuracy::[\s\S]*?accuracycheck BattleScript_RolloutHit, ACC_CURR_MOVE[\s\S]*?typecalc2[\s\S]*?rolloutdamagecalculation/);
    expect(scripts).toMatch(/BattleScript_EffectDefenseCurl::[\s\S]*?attackcanceler[\s\S]*?attackstring[\s\S]*?ppreduce[\s\S]*?setdefensecurlbit/);
    expect(moves).toMatch(/\[MOVE_ROLLOUT\][\s\S]*?\.effect = EFFECT_ROLLOUT,[\s\S]*?\.power = 30,[\s\S]*?\.accuracy = 90,[\s\S]*?\.pp = 20,/);
    expect(frontierIds).toContain("#define FRONTIER_MON_SHUCKLE_1      432");
    expect(frontier).toMatch(/\[FRONTIER_MON_SHUCKLE_1\][\s\S]*?\.moves = \{MOVE_ROLLOUT, MOVE_DEFENSE_CURL, MOVE_SLEEP_TALK, MOVE_REST\}/);
  });

  it("keeps the complete-party, constrained-AI, controller-driven escalating route reproducible", () => {
    expect(evidenceData.schema).toBe("rollout-off-evidence/v1");
    expect(evidenceData.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidenceData.case.scenario)).toBe(evidenceData.case.scenarioSha256);
    expect(evidenceData.repeatability).toEqual({ runsPerCase: 2, comparison: "byte-identical full manifest.json", allMatched: true });
    expect(new Set(evidenceData.case.runManifestSha256).size).toBe(1);
    expect(evidenceData.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));

    const scenario = JSON.parse(file(evidenceData.case.scenario)) as Scenario;
    expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 2 });
    expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
    expect(scenario.overrides.battlers).toBeUndefined();
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 213, moves: [205, 111, 214, 156] });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [150, 150, 150, 150] });
    expect(scenario.trace.segments.filter(({ buttons }) => buttons.includes("A"))).toHaveLength(4);
    expect(scenario.trace.segments.filter(({ buttons }) => buttons.includes("LEFT"))).toHaveLength(1);
    expect(evidenceData.case.captures.every(({ frame }) => scenario.trace.captureFrames.includes(frame))).toBe(true);

    const [, defenseCurl, menuAfterCurl, rolloutSelected, firstHit, secondHit, thirdHit, fourthHit] = evidenceData.case.captures;
    expect(defenseCurl).toMatchObject({ currentMove: 111, player: { pp: [20, 39, 10, 10], status2: 1 << 30, defenseStage: 7 } });
    expect(menuAfterCurl).toMatchObject({ currentMove: 0, player: { pp: [20, 39, 10, 10], status2: 1 << 30 } });
    expect(rolloutSelected).toMatchObject({ currentMove: 205, player: { pp: [20, 39, 10, 10], status2: 1 << 30 } });
    for (const capture of [firstHit, secondHit, thirdHit, fourthHit]) {
      expect(capture).toMatchObject({ player: { hp: 95, pp: [19, 39, 10, 10], status2: (1 << 30) | (1 << 12) } });
    }
    expect([firstHit.opponent.hp, secondHit.opponent.hp, thirdHit.opponent.hp, fourthHit.opponent.hp]).toEqual([327, 170, 12, 0]);
    expect([362 - firstHit.opponent.hp, 327 - secondHit.opponent.hp, 170 - thirdHit.opponent.hp]).toEqual([35, 157, 158]);
  });
});
