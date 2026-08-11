import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/psych-up-off-evidence.json" with { type: "json" };

type Stats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  spAttack: number;
  spDefense: number;
};

type PartyMon = {
  species: number;
  level: number;
  nature: number;
  ivs: Stats;
  evs: Stats;
  moves: number[];
  ppUps: number[];
  item: number;
  abilitySlot: number;
  friendship: number;
  gender: string;
  shiny: boolean;
};

type Scenario = {
  schemaVersion: number;
  mode: string;
  profile: string;
  seed: number;
  overrides: { parties: { player: PartyMon[]; opponent: PartyMon[] }; battlers?: unknown };
  trace: { segments: Array<{ frames: number; buttons: string[] }>; captureFrames: number[] };
};

type BattlerCapture = {
  species: number;
  speed: number;
  hp: number;
  maxHp: number;
  status1: number;
  status2: number;
  status3: number;
  statStages: number[];
  pp: number[];
};

type Capture = {
  frame: number;
  sha256: string;
  rngValue: number;
  currentMove: number;
  player: BattlerCapture;
  opponent: BattlerCapture;
};

type EvidenceCase = {
  id: string;
  scenario: string;
  scenarioSha256: string;
  runManifestSha256: string[];
  builtPartyChecksumsValid: boolean[];
  captures: Capture[];
};

const evidence = evidenceData as {
  schema: string;
  oracleProfile: string;
  source: Record<string, string>;
  statStageOrder: string[];
  repeatability: { runsPerCase: number; comparison: string; allMatched: boolean };
  cases: EvidenceCase[];
  boundedRemainder: string;
};

const COMPLETE_MON_KEYS = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const TRANSIENT_KEYS = /"(?:battleOutcome|sideConditions|statStages|status1|status2|status3|weather|weatherTurns)"/;
const STATUS2_CURSED = 1 << 28;

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Battle Scene OFF Psych Up mechanic-lab evidence", () => {
  it("uses complete pre-battle parties and ordinary controller input only", () => {
    expect(evidence.schema).toBe("psych-up-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.cases.map(({ id }) => id)).toEqual([
      "copies-all-eight-stages-after-non-ghost-curse",
      "neutral-stages-copy-without-hp-or-curse-status-copy",
    ]);

    for (const receipt of evidence.cases) {
      const scenario = readScenario(receipt.scenario);
      expect(sha256(receipt.scenario)).toBe(receipt.scenarioSha256);
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        seed: 1,
      });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.overrides.battlers).toBeUndefined();
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(receipt.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
      expect(JSON.stringify(scenario)).not.toMatch(TRANSIENT_KEYS);

      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
        expect(mon.level).toBe(50);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toEqual([0, 0, 0, 0]);
        expect(Object.values(mon.evs).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(510);
        expect(mon).not.toHaveProperty("hp");
      }
      expect(scenario.overrides.parties.opponent[0]!.moves).toEqual([244, 244, 244, 244]);
      expect(scenario.trace.segments.slice(0, 3)).toEqual([
        { frames: 2, buttons: ["A"] },
        { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] },
      ]);
      expect(scenario.trace.captureFrames).toEqual(receipt.captures.map(({ frame }) => frame));
    }
  });

  it("pins source ownership, all eight stage slots, and the unused failure pointer", () => {
    expect(evidence.statStageOrder).toEqual([
      "hp", "attack", "defense", "speed", "spAttack", "spDefense", "accuracy", "evasion",
    ]);
    const commands = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    expect(commands).toContain("for (i = 0; i < NUM_BATTLE_STATS; i++)");
    expect(commands).toContain(
      "gBattleMons[gBattlerAttacker].statStages[i] = gBattleMons[gBattlerTarget].statStages[i];",
    );
    expect(commands).toContain(
      "gBattlescriptCurrInstr += 5; // Has an unused jump ptr(possibly for a failed attempt) parameter.",
    );
    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(scripts).toContain("copyfoestats BattleScript_ButItFailed");
    expect(scripts).toMatch(
      /BattleScript_EffectPsychUp::[\s\S]*attackstring[\s\S]*ppreduce[\s\S]*copyfoestats[\s\S]*attackanimation/,
    );
    const moves = readFileSync("reference/pokeemerald/src/data/battle_moves.h", "utf8");
    expect(moves).toMatch(/\[MOVE_PSYCH_UP\][\s\S]*\.effect = EFFECT_PSYCH_UP,[\s\S]*\.pp = 10,/);

    const learnsets = readFileSync(
      "reference/pokeemerald/src/data/pokemon/level_up_learnsets.h",
      "utf8",
    );
    expect(learnsets).toMatch(/sDrowzeeLevelUpLearnset[\s\S]*?MOVE_PSYCH_UP[\s\S]*?LEVEL_UP_END/);
    expect(learnsets).toMatch(/sHaunterLevelUpLearnset[\s\S]*?MOVE_CURSE[\s\S]*?LEVEL_UP_END/);
    expect(learnsets).toMatch(/sBulbasaurLevelUpLearnset[\s\S]*?MOVE_TACKLE[\s\S]*?LEVEL_UP_END/);
    expect(learnsets).toMatch(/sCharmanderLevelUpLearnset[\s\S]*?MOVE_SCRATCH[\s\S]*?LEVEL_UP_END/);
    expect(learnsets).toMatch(/sMagikarpLevelUpLearnset[\s\S]*?MOVE_SPLASH[\s\S]*?LEVEL_UP_END/);
    expect(learnsets).toMatch(/sHoppipLevelUpLearnset[\s\S]*?MOVE_SPLASH[\s\S]*?LEVEL_UP_END/);
    expect(readFileSync("reference/pokeemerald/src/data/pokemon/egg_moves.h", "utf8"))
      .toMatch(/egg_moves\(SNORLAX,[\s\S]*?MOVE_CURSE,[\s\S]*?\),/);
  });

  it("copies the staged Curse result exactly without changing HP, status, or RNG", () => {
    const [before, staged, copied] = evidence.cases[0]!.captures;
    expect(before!.player.speed).toBeGreaterThan(before!.opponent.speed);
    expect(before!.player.statStages).toEqual(Array(8).fill(6));
    expect(staged!.player.statStages).toEqual([6, 7, 7, 5, 6, 6, 6, 6]);
    expect(staged!.opponent.statStages).toEqual(Array(8).fill(6));
    expect(copied!.opponent.statStages).toEqual(staged!.player.statStages);
    expect(copied!.player).toEqual(staged!.player);
    expect(copied!.opponent.pp).toEqual([10, 9, 10, 10]);
    expect(copied!.currentMove).toBe(244);
    expect([before!.rngValue, staged!.rngValue, copied!.rngValue]).toEqual(
      Array(3).fill(before!.rngValue),
    );
  });

  it("keeps neutral stages successful while excluding Curse HP and volatile state", () => {
    const [before, staged, copied] = evidence.cases[1]!.captures;
    expect(before!.player.speed).toBeGreaterThan(before!.opponent.speed);
    expect(staged!.player.hp).toBe(before!.player.maxHp / 2);
    expect(staged!.opponent.status2).toBe(STATUS2_CURSED);
    expect(staged!.player.statStages).toEqual(Array(8).fill(6));
    expect(copied!.opponent.statStages).toEqual(Array(8).fill(6));
    expect(copied!.opponent.pp).toEqual([10, 9, 10, 10]);
    expect(copied!.player.hp).toBe(staged!.player.hp);
    expect(copied!.opponent.hp).toBe(staged!.opponent.hp);
    expect(copied!.opponent.status2).toBe(staged!.opponent.status2);
    expect(copied!.player.status2).toBe(0);
    expect(copied!.currentMove).toBe(244);
    expect([before!.rngValue, staged!.rngValue, copied!.rngValue]).toEqual(
      Array(3).fill(before!.rngValue),
    );
  });

  it("pins byte-stable two-run manifests and the bounded implementation handoff", () => {
    expect(evidence.repeatability).toEqual({
      runsPerCase: 2,
      comparison: "byte-identical full manifest.json",
      allMatched: true,
    });
    for (const receipt of evidence.cases) {
      expect(receipt.runManifestSha256).toHaveLength(2);
      expect(new Set(receipt.runManifestSha256).size).toBe(1);
      expect(receipt.runManifestSha256[0]).toMatch(/^[a-f0-9]{64}$/);
      expect(receipt.captures.every(({ sha256: digest }) => /^[a-f0-9]{64}$/.test(digest))).toBe(true);
    }
    expect(evidence.boundedRemainder).toMatch(/no reachable failure branch/);
  });
});
