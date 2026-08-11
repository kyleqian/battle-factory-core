import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/return-frustration-friendship-off-evidence.json" with { type: "json" };

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
  level: number;
  challengeNum: number;
  battleNum: number;
  trainerId: number;
  playerSetIds: number[];
  opponentSetIds: number[];
  seed: number;
  overrides: {
    parties: { player: PartyMon[]; opponent: PartyMon[] };
    battlers?: unknown;
  };
  trace: {
    segments: Array<{ frames: number; buttons: string[] }>;
    captureFrames: number[];
  };
};

type Capture = {
  frame: number;
  sha256: string;
  rngValue: number;
  engine: {
    activeBattler: number;
    controllerExecFlags: number;
    playerControllerCommand: number;
    opponentControllerCommand: number;
    currentMove: number;
  };
  player: { hp: number; pp: number[] };
  opponent: { hp: number; pp: number[] };
};

type EvidenceCase = {
  id: string;
  move: number;
  friendship: number;
  derivedPower: number;
  scenario: string;
  scenarioSha256: string;
  runManifestSha256: string[];
  captures: Capture[];
};

const evidence = evidenceData as {
  schema: string;
  oracleProfile: string;
  source: Record<string, string>;
  publicAbiBoundary: {
    exposes: string[];
    doesNotExpose: string[];
    rule: string;
  };
  repeatability: {
    runsPerCase: number;
    comparison: string;
    allMatched: boolean;
  };
  oracleConstruction: {
    customPartiesBuiltBeforeBattle: boolean;
    playerSpecies: number[];
    opponentSpecies: number[];
    checksumValid: boolean[];
  };
  commonActiveRamFacts: {
    player: {
      species: number;
      types: number[];
      ability: number;
      stats: Omit<Stats, "hp">;
      maxHp: number;
    };
    opponent: {
      species: number;
      moves: number[];
      types: number[];
      ability: number;
      stats: Omit<Stats, "hp">;
      maxHp: number;
    };
  };
  cases: EvidenceCase[];
};

const MOVE_RETURN = 216;
const MOVE_FRUSTRATION = 218;
const COMPLETE_MON_KEYS = [
  "abilitySlot",
  "evs",
  "friendship",
  "gender",
  "item",
  "ivs",
  "level",
  "moves",
  "nature",
  "ppUps",
  "shiny",
  "species",
];
const STAT_KEYS = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function friendshipPower(move: number, friendship: number): number {
  if (move === MOVE_RETURN) {
    return Math.trunc((10 * friendship) / 25);
  }
  if (move === MOVE_FRUSTRATION) {
    return Math.trunc((10 * (255 - friendship)) / 25);
  }
  throw new Error(`unexpected friendship-power move ${move}`);
}

function sourceBlock(source: string, label: string): string {
  const start = source.indexOf(label);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("};", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 2);
}

describe("Battle Scene OFF Return/Frustration friendship-power oracle evidence", () => {
  it("keeps six short traces complete, legal, controller-driven, profile-pinned, and transient-free", () => {
    expect(evidence.schema).toBe("return-frustration-friendship-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.cases.map(({ id }) => id)).toEqual([
      "return-minimum",
      "return-floor-interior",
      "return-maximum",
      "frustration-maximum",
      "frustration-floor-interior",
      "frustration-minimum",
    ]);

    for (const receipt of evidence.cases) {
      const scenario = readScenario(receipt.scenario);
      expect(sha256(receipt.scenario)).toBe(receipt.scenarioSha256);
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        level: 50,
        challengeNum: 2,
        battleNum: 2,
        trainerId: 110,
        playerSetIds: [274, 354, 338],
        opponentSetIds: [349, 339, 327],
        seed: 1,
      });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.overrides.battlers).toBeUndefined();
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(evidence.oracleConstruction.customPartiesBuiltBeforeBattle).toBe(true);
      expect(scenario.overrides.parties.player.map(({ species }) => species))
        .toEqual(evidence.oracleConstruction.playerSpecies);
      expect(scenario.overrides.parties.opponent.map(({ species }) => species))
        .toEqual(evidence.oracleConstruction.opponentSpecies);
      expect(evidence.oracleConstruction.checksumValid).toEqual(Array(6).fill(true));

      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs).sort()).toEqual(STAT_KEYS);
        expect(Object.values(mon.ivs).every((value) => value >= 0 && value <= 31)).toBe(true);
        expect(Object.keys(mon.evs).sort()).toEqual(STAT_KEYS);
        expect(Object.values(mon.evs).every((value) => value >= 0 && value <= 255)).toBe(true);
        expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).not.toHaveProperty("status1");
        expect(mon).not.toHaveProperty("status2");
        expect(mon).not.toHaveProperty("status3");
        expect(mon).not.toHaveProperty("statStages");
      }

      expect(scenario.overrides.parties.player[0]).toMatchObject({
        species: evidence.commonActiveRamFacts.player.species,
        friendship: receipt.friendship,
        moves: [receipt.move, 150, 33, receipt.move],
      });
      for (const opponent of scenario.overrides.parties.opponent) {
        expect(opponent.moves).toEqual([150, 150, 150, 150]);
      }
      expect(JSON.stringify(scenario)).not.toMatch(
        /"(?:weather|weatherTurns|sideConditions|battleOutcome|status1|status2|status3|statStages)"/,
      );
      expect(scenario.trace).toEqual({
        segments: [
          { frames: 2, buttons: ["A"] },
          { frames: 30, buttons: [] },
          { frames: 2, buttons: ["A"] },
          { frames: 700, buttons: [] },
        ],
        captureFrames: [0, 734],
      });
    }
  });

  it("pins the shared source command, consecutive effect labels, and both move records", () => {
    const commands = readFileSync(
      "reference/pokeemerald/src/battle_script_commands.c",
      "utf8",
    );
    expect(commands).toContain(
      "gDynamicBasePower = 10 * (gBattleMons[gBattlerAttacker].friendship) / 25;",
    );
    expect(commands).toContain(
      "gDynamicBasePower = 10 * (MAX_FRIENDSHIP - gBattleMons[gBattlerAttacker].friendship) / 25;",
    );

    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(scripts).toContain(
      "BattleScript_EffectReturn::\nBattleScript_EffectFrustration::\n"
        + "\tattackcanceler\n\taccuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE\n"
        + "\tfriendshiptodamagecalculation\n\tgoto BattleScript_HitFromAtkString",
    );
    const moves = readFileSync("reference/pokeemerald/src/data/battle_moves.h", "utf8");
    expect(sourceBlock(moves, "[MOVE_RETURN] =")).toContain(".effect = EFFECT_RETURN");
    expect(sourceBlock(moves, "[MOVE_RETURN] =")).toContain(".power = 1");
    expect(sourceBlock(moves, "[MOVE_FRUSTRATION] =")).toContain(
      ".effect = EFFECT_FRUSTRATION",
    );
    expect(sourceBlock(moves, "[MOVE_FRUSTRATION] =")).toContain(".power = 1");
  });

  it("derives both extrema and the nontrivial floor point, with exact HP, PP, and RNG outcomes", () => {
    expect(evidence.commonActiveRamFacts.player.stats.speed).toBeGreaterThan(
      evidence.commonActiveRamFacts.opponent.stats.speed,
    );
    expect(evidence.commonActiveRamFacts.opponent.moves).toEqual([150, 150, 150, 150]);

    for (const receipt of evidence.cases) {
      expect(receipt.derivedPower).toBe(
        friendshipPower(receipt.move, receipt.friendship),
      );
      expect(receipt.captures).toHaveLength(2);
      const [before, after] = receipt.captures;
      expect(before!.frame).toBe(0);
      expect(after!.frame).toBe(734);
      expect(before!.player).toEqual({ hp: 95, pp: [20, 40, 35, 20] });
      expect(after!.player).toEqual({ hp: 95, pp: [19, 40, 35, 20] });
      expect(before!.opponent).toEqual({ hp: 162, pp: [40, 40, 40, 40] });
      expect(after!.opponent.pp).toEqual([40, 39, 40, 40]);
      expect(before!.rngValue).toBe(919694434);
      expect(after!.rngValue).toBe(2210656548);
      expect(before!.engine).toEqual(after!.engine);
      expect(before!.engine).toEqual({
        activeBattler: 2,
        controllerExecFlags: 1,
        playerControllerCommand: 18,
        opponentControllerCommand: 53,
        currentMove: 0,
      });
    }

    const returns = evidence.cases.filter(({ move }) => move === MOVE_RETURN);
    const frustrations = evidence.cases.filter(({ move }) => move === MOVE_FRUSTRATION);
    expect(returns.map(({ friendship, derivedPower }) => [friendship, derivedPower]))
      .toEqual([[0, 0], [127, 50], [255, 102]]);
    expect(frustrations.map(({ friendship, derivedPower }) => [friendship, derivedPower]))
      .toEqual([[0, 102], [127, 51], [255, 0]]);
    expect(returns.map(({ captures }) => 162 - captures[1]!.opponent.hp))
      .toEqual([2, 4, 7]);
    expect(frustrations.map(({ captures }) => 162 - captures[1]!.opponent.hp))
      .toEqual([7, 4, 2]);
    expect(10 * 127 % 25).toBe(20);
    expect(10 * (255 - 127) % 25).toBe(5);
  });

  it("pins two byte-identical manifests per case and keeps the ABI claim honest", () => {
    expect(evidence.repeatability).toEqual({
      runsPerCase: 2,
      comparison: "byte-identical manifest.json",
      allMatched: true,
    });
    for (const receipt of evidence.cases) {
      expect(receipt.runManifestSha256).toHaveLength(2);
      expect(receipt.runManifestSha256[0]).toBe(receipt.runManifestSha256[1]);
      expect(receipt.runManifestSha256[0]).toMatch(/^[a-f0-9]{64}$/);
      expect(receipt.captures.every(({ sha256: frameHash }) =>
        /^[a-f0-9]{64}$/.test(frameHash))).toBe(true);
    }
    expect(evidence.publicAbiBoundary.doesNotExpose).toContain("gDynamicBasePower");
    expect(evidence.publicAbiBoundary.rule).toMatch(/derived from the captured/i);
    expect(evidence.publicAbiBoundary.rule).toMatch(/without attributing individual/i);
  });
});
