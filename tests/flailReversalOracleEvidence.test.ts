import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/flail-reversal-hp-power-off-evidence.json" with { type: "json" };

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

type Action = {
  beforeFrame: number;
  afterFrame: number;
  attackerHp: number;
  maxHp: number;
  scaledHpFraction: number;
  power: number;
  targetHpBefore: number;
  targetHpAfter: number;
  targetHpLoss: number;
  targetFainted: boolean;
};

type EvidenceCase = {
  id: string;
  move: number;
  scenario: string;
  scenarioSha256: string;
  runManifestSha256: string[];
  customPartiesBuiltBeforeBattle: boolean;
  builtParties: {
    playerSpecies: number[];
    opponentSpecies: number[];
    checksumValid: boolean[];
  };
  activeRamFacts: {
    player: { species: number; moves: number[]; types: number[]; ability: number; stats: Omit<Stats, "hp">; maxHp: number };
    opponent: { species: number; moves: number[]; types: number[]; ability: number; stats: Omit<Stats, "hp">; maxHp: number };
  };
  captures: Capture[];
  actions: Action[];
};

const evidence = evidenceData as {
  schema: string;
  oracleProfile: string;
  source: Record<string, string>;
  publicAbiBoundary: {
    ramFacts: string[];
    doesNotExpose: string[];
    rule: string;
  };
  repeatability: {
    runsPerCase: number;
    comparison: string;
    allMatched: boolean;
  };
  cases: EvidenceCase[];
  boundedRemainder: string;
};

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
const HP_POWER_TABLE = [
  [1, 200],
  [4, 150],
  [9, 100],
  [16, 80],
  [32, 40],
  [48, 20],
] as const;

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function scaledHpFraction(hp: number, maxHp: number): number {
  const fraction = Math.floor((hp * 48) / maxHp);
  return fraction === 0 && hp > 0 ? 1 : fraction;
}

function remainingHpPower(hpFraction: number): number {
  const row = HP_POWER_TABLE.find(([upperBound]) => hpFraction <= upperBound);
  if (row === undefined) {
    throw new Error(`HP fraction ${hpFraction} exceeded the source table`);
  }
  return row[1];
}

function sourceBlock(source: string, label: string): string {
  const start = source.indexOf(label);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("};", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 2);
}

describe("Battle Scene OFF Flail/Reversal HP-to-power oracle evidence", () => {
  it("keeps both traces complete, legal, controller-driven, profile-pinned, and transient-free", () => {
    expect(evidence.schema).toBe("flail-reversal-hp-power-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.cases.map(({ id }) => id)).toEqual([
      "flail-six-hp-power-bands",
      "reversal-five-hp-power-bands",
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
      expect(receipt.customPartiesBuiltBeforeBattle).toBe(true);
      expect(receipt.builtParties.playerSpecies).toEqual(
        scenario.overrides.parties.player.map(({ species }) => species),
      );
      expect(receipt.builtParties.opponentSpecies).toEqual(
        scenario.overrides.parties.opponent.map(({ species }) => species),
      );
      expect(receipt.builtParties.checksumValid).toEqual(Array(6).fill(true));

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
        expect(mon).not.toHaveProperty("hp");
        expect(mon).not.toHaveProperty("status1");
        expect(mon).not.toHaveProperty("status2");
        expect(mon).not.toHaveProperty("status3");
        expect(mon).not.toHaveProperty("statStages");
      }

      for (const opponent of scenario.overrides.parties.opponent) {
        expect(opponent.moves[0]).toBe(opponent.moves[1]);
        expect(opponent.moves[1]).toBe(opponent.moves[2]);
        expect(opponent.moves[2]).toBe(opponent.moves[3]);
      }
      expect(scenario.overrides.parties.opponent[0]!.moves).toEqual([162, 162, 162, 162]);
      expect(JSON.stringify(scenario)).not.toMatch(
        /"(?:weather|weatherTurns|sideConditions|battleOutcome|status1|status2|status3|statStages)"/,
      );
      expect(scenario.trace.captureFrames).toEqual(
        receipt.captures.map(({ frame }) => frame),
      );
      expect(scenario.trace.segments).toHaveLength(receipt.actions.length * 4);
      for (let action = 0; action < receipt.actions.length; action += 1) {
        expect(scenario.trace.segments.slice(action * 4, action * 4 + 4)).toEqual([
          { frames: 2, buttons: ["A"] },
          { frames: 30, buttons: [] },
          { frames: 2, buttons: ["A"] },
          { frames: 700, buttons: [] },
        ]);
      }
    }
  });

  it("pins the shared source table and both move records to EFFECT_FLAIL", () => {
    const commands = readFileSync(
      "reference/pokeemerald/src/battle_script_commands.c",
      "utf8",
    );
    const hpTable = sourceBlock(commands, "static const u8 sFlailHpScaleToPowerTable[]");
    for (const [fraction, power] of HP_POWER_TABLE) {
      expect(hpTable).toContain(`${fraction}, ${power}`);
    }
    expect(commands).toContain(
      "s32 hpFraction = GetScaledHPFraction(gBattleMons[gBattlerAttacker].hp, gBattleMons[gBattlerAttacker].maxHP, 48);",
    );
    expect(commands).toContain(
      "gDynamicBasePower = sFlailHpScaleToPowerTable[i + 1];",
    );

    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(scripts).toContain(
      "BattleScript_EffectFlail::\n\tremaininghptopower\n\tgoto BattleScript_EffectHit",
    );
    const moves = readFileSync("reference/pokeemerald/src/data/battle_moves.h", "utf8");
    expect(sourceBlock(moves, "[MOVE_FLAIL] =")).toContain(".effect = EFFECT_FLAIL");
    expect(sourceBlock(moves, "[MOVE_FLAIL] =")).toContain(".type = TYPE_NORMAL");
    expect(sourceBlock(moves, "[MOVE_REVERSAL] =")).toContain(".effect = EFFECT_FLAIL");
    expect(sourceBlock(moves, "[MOVE_REVERSAL] =")).toContain(".type = TYPE_FIGHTING");
  });

  it("derives every captured band exactly and pins HP loss, PP, and RAM damage inputs", () => {
    for (const receipt of evidence.cases) {
      expect(receipt.activeRamFacts.player.moves[0]).toBe(receipt.move);
      expect(receipt.activeRamFacts.player.stats.speed).toBeGreaterThan(
        receipt.activeRamFacts.opponent.stats.speed,
      );
      expect(receipt.activeRamFacts.opponent.moves).toEqual([162, 162, 162, 162]);
      expect(receipt.activeRamFacts.opponent.stats.defense).toBe(123);

      for (const action of receipt.actions) {
        const before = receipt.captures.find(({ frame }) => frame === action.beforeFrame)!;
        const after = receipt.captures.find(({ frame }) => frame === action.afterFrame)!;
        expect(action.attackerHp).toBe(before.player.hp);
        expect(action.maxHp).toBe(receipt.activeRamFacts.player.maxHp);
        expect(action.scaledHpFraction).toBe(
          scaledHpFraction(action.attackerHp, action.maxHp),
        );
        expect(action.power).toBe(remainingHpPower(action.scaledHpFraction));
        expect(action.targetHpBefore).toBe(before.opponent.hp);
        expect(action.targetHpAfter).toBe(after.opponent.hp);
        expect(action.targetHpLoss).toBe(
          action.targetHpBefore - action.targetHpAfter,
        );
        expect(action.targetFainted).toBe(action.targetHpAfter === 0);
        expect(after.player.pp[0]).toBe(before.player.pp[0] - 1);
      }
    }

    const [flail, reversal] = evidence.cases;
    expect(flail!.actions.map(({ power }) => power)).toEqual([20, 40, 80, 100, 150, 200]);
    expect(flail!.actions.map(({ targetHpLoss }) => targetHpLoss)).toEqual([2, 3, 7, 7, 9, 13]);
    expect(flail!.captures.map(({ player }) => player.hp)).toEqual([95, 48, 24, 12, 6, 3, 2]);
    expect(reversal!.actions.map(({ power }) => power)).toEqual([20, 40, 80, 100, 150]);
    expect(reversal!.actions.map(({ targetHpLoss }) => targetHpLoss)).toEqual([10, 21, 34, 45, 52]);
    expect(reversal!.captures.map(({ player }) => player.hp)).toEqual([140, 70, 35, 18, 9, 9]);
    expect(reversal!.actions.at(-1)).toMatchObject({
      attackerHp: 9,
      scaledHpFraction: 3,
      power: 150,
      targetHpBefore: 52,
      targetHpAfter: 0,
      targetHpLoss: 52,
      targetFainted: true,
    });
  });

  it("proves Super Fang staged every HP reduction through ordinary turns", () => {
    for (const receipt of evidence.cases) {
      for (let index = 0; index < receipt.actions.length; index += 1) {
        const before = receipt.captures[index]!;
        const after = receipt.captures[index + 1]!;
        const opponentPpBefore = before.opponent.pp.reduce((sum, pp) => sum + pp, 0);
        const opponentPpAfter = after.opponent.pp.reduce((sum, pp) => sum + pp, 0);
        const targetFainted = receipt.actions[index]!.targetFainted;
        expect(opponentPpAfter).toBe(opponentPpBefore - (targetFainted ? 0 : 1));
        if (!targetFainted) {
          expect(after.player.hp).toBe(Math.ceil(before.player.hp / 2));
        } else {
          expect(after.player.hp).toBe(before.player.hp);
        }
      }
    }

    const learnsets = readFileSync(
      "reference/pokeemerald/src/data/pokemon/level_up_learnsets.h",
      "utf8",
    );
    const eggMoves = readFileSync(
      "reference/pokeemerald/src/data/pokemon/egg_moves.h",
      "utf8",
    );
    expect(sourceBlock(learnsets, "sFeebasLevelUpLearnset")).toContain(
      "LEVEL_UP_MOVE(30, MOVE_FLAIL)",
    );
    expect(sourceBlock(eggMoves, "egg_moves(YANMA")).toContain("MOVE_REVERSAL");
    expect(sourceBlock(learnsets, "sRaticateLevelUpLearnset")).toContain(
      "LEVEL_UP_MOVE(40, MOVE_SUPER_FANG)",
    );
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
      expect(receipt.captures.every(({ sha256: frameHash }) => /^[a-f0-9]{64}$/.test(frameHash))).toBe(true);
    }
    expect(evidence.publicAbiBoundary.doesNotExpose).toContain("gDynamicBasePower");
    expect(evidence.publicAbiBoundary.rule).toMatch(/derived exactly/i);
    expect(evidence.boundedRemainder).toMatch(/uncapped Reversal damage/i);
  });
});
