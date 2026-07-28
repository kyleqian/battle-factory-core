import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/curse-off-evidence.json" with { type: "json" };

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

type BattlerObservation = {
  partyIndex: number;
  species: number;
  types: number[];
  hp: number;
  maxHp: number;
  status2: number;
  statStages: number[];
  pp: number[];
};

type EvidenceCase = {
  id: string;
  scenario: string;
  scenarioSha256: string;
  runManifestSha256: string[];
  customPartiesBuiltBeforeBattle: boolean;
  builtParties: {
    playerSpecies: number[];
    opponentSpecies: number[];
    checksumValid: boolean[];
  };
  captures: Array<{
    frame: number;
    sha256: string;
    player: BattlerObservation;
    opponent: BattlerObservation;
  }>;
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
const STATUS2_CURSED = 1 << 28;
const TYPE_GHOST = 7;

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sourceBlock(source: string, label: string): string {
  const start = source.indexOf(label);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("};", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 2);
}

describe("Battle Scene OFF Curse mechanic-lab evidence", () => {
  it("keeps both cases complete, legal, controller-driven, and transient-free", () => {
    expect(evidence.schema).toBe("curse-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.cases.map(({ id }) => id)).toEqual([
      "ghost-curse-hp-cost-and-target-bit",
      "non-ghost-curse-three-stage-change",
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
      expect(scenario.overrides.battlers).toBeUndefined();
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
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
        expect(mon.species).toBeGreaterThan(0);
        expect(mon.species).toBeLessThan(412);
        expect(mon.level).toBe(50);
        expect(mon.nature).toBeGreaterThanOrEqual(0);
        expect(mon.nature).toBeLessThan(25);
        expect(Object.keys(mon.ivs).sort()).toEqual(STAT_KEYS);
        expect(Object.values(mon.ivs).every((value) => Number.isInteger(value) && value >= 0 && value <= 31)).toBe(true);
        expect(Object.keys(mon.evs).sort()).toEqual(STAT_KEYS);
        expect(Object.values(mon.evs).every((value) => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
        expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
        expect(mon.moves).toHaveLength(4);
        expect(mon.moves.every((move) => Number.isInteger(move) && move > 0 && move < 355)).toBe(true);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon.ppUps.every((value) => Number.isInteger(value) && value >= 0 && value <= 3)).toBe(true);
        expect(mon.item).toBeGreaterThanOrEqual(0);
        expect(mon.item).toBeLessThan(377);
        expect([0, 1]).toContain(mon.abilitySlot);
        expect(mon.friendship).toBeGreaterThanOrEqual(0);
        expect(mon.friendship).toBeLessThanOrEqual(255);
        expect(["male", "female", "genderless"]).toContain(mon.gender);
        expect(mon.shiny).toBe(false);
        expect(mon).not.toHaveProperty("hp");
        expect(mon).not.toHaveProperty("status1");
        expect(mon).not.toHaveProperty("status2");
        expect(mon).not.toHaveProperty("status3");
        expect(mon).not.toHaveProperty("statStages");
      }

      for (const opponent of scenario.overrides.parties.opponent) {
        expect(opponent.moves).toEqual([150, 150, 150, 150]);
      }
      expect(JSON.stringify(scenario)).not.toMatch(
        /"(?:weather|weatherTurns|sideConditions|battleOutcome|status1|status2|status3|statStages)"/,
      );
      expect(scenario.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] },
        { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] },
        { frames: 416, buttons: [] },
      ]);
      expect(scenario.trace.segments.reduce((total, { frames }) => total + frames, 0)).toBe(450);
      expect(scenario.trace.captureFrames).toEqual(receipt.captures.map(({ frame }) => frame));
    }
  });

  it("pins legal learnable moves for every staged species and the one-action opponent", () => {
    const learnsets = readFileSync(
      "reference/pokeemerald/src/data/pokemon/level_up_learnsets.h",
      "utf8",
    );
    const eggMoves = readFileSync(
      "reference/pokeemerald/src/data/pokemon/egg_moves.h",
      "utf8",
    );
    expect(sourceBlock(learnsets, "sHaunterLevelUpLearnset")).toContain(
      "LEVEL_UP_MOVE(16, MOVE_CURSE)",
    );
    expect(sourceBlock(eggMoves, "egg_moves(SNORLAX")).toContain("MOVE_CURSE");
    expect(sourceBlock(learnsets, "sBulbasaurLevelUpLearnset")).toContain(
      "LEVEL_UP_MOVE( 1, MOVE_TACKLE)",
    );
    expect(sourceBlock(learnsets, "sCharmanderLevelUpLearnset")).toContain(
      "LEVEL_UP_MOVE( 1, MOVE_SCRATCH)",
    );
    expect(sourceBlock(learnsets, "sMagikarpLevelUpLearnset")).toContain(
      "LEVEL_UP_MOVE( 1, MOVE_SPLASH)",
    );
    expect(sourceBlock(learnsets, "sHoppipLevelUpLearnset")).toContain(
      "LEVEL_UP_MOVE( 1, MOVE_SPLASH)",
    );

    const moveTable = readFileSync(
      "reference/pokeemerald/src/data/battle_moves.h",
      "utf8",
    );
    expect(sourceBlock(moveTable, "[MOVE_CURSE] =")).toContain(".effect = EFFECT_CURSE");
    expect(sourceBlock(moveTable, "[MOVE_CURSE] =")).toContain(".pp = 10");
    expect(sourceBlock(moveTable, "[MOVE_SPLASH] =")).toContain(".pp = 40");
  });

  it("pins Ghost Curse's real half-max-HP cost and STATUS2_CURSED target bit", () => {
    const [before, after] = evidence.cases[0]!.captures;
    expect(before!.player.types).toContain(TYPE_GHOST);
    expect(before!.player).toMatchObject({
      species: 93,
      hp: 120,
      maxHp: 120,
      status2: 0,
      statStages: Array(8).fill(6),
      pp: [10, 10, 10, 10],
    });
    expect(after!.player).toMatchObject({
      species: 93,
      hp: 60,
      maxHp: 120,
      status2: 0,
      statStages: Array(8).fill(6),
      pp: [9, 10, 10, 10],
    });
    expect(before!.player.hp - after!.player.hp).toBe(
      Math.floor(before!.player.maxHp / 2),
    );
    expect(before!.opponent.status2 & STATUS2_CURSED).toBe(0);
    expect(after!.opponent.status2).toBe(STATUS2_CURSED);
    expect(after!.opponent.hp).toBe(before!.opponent.hp);
  });

  it("pins non-Ghost Curse's Attack/Defense rise and Speed fall without a cursed bit", () => {
    const [before, after] = evidence.cases[1]!.captures;
    expect(before!.player.types).not.toContain(TYPE_GHOST);
    expect(before!.player.statStages).toEqual(Array(8).fill(6));
    expect(after!.player.statStages).toEqual([6, 7, 7, 5, 6, 6, 6, 6]);
    expect(after!.player.statStages[1] - before!.player.statStages[1]).toBe(1);
    expect(after!.player.statStages[2] - before!.player.statStages[2]).toBe(1);
    expect(after!.player.statStages[3] - before!.player.statStages[3]).toBe(-1);
    expect(after!.player.hp).toBe(before!.player.hp);
    expect(after!.player.pp[0]).toBe(before!.player.pp[0] - 1);
    expect(before!.player.status2 & STATUS2_CURSED).toBe(0);
    expect(after!.player.status2 & STATUS2_CURSED).toBe(0);
    expect(before!.opponent.status2 & STATUS2_CURSED).toBe(0);
    expect(after!.opponent.status2 & STATUS2_CURSED).toBe(0);
  });

  it("pins source ownership, public-ABI honesty, and two-run repeatability", () => {
    expect(evidence.source).toEqual({
      effectScript: "reference/pokeemerald/data/battle_scripts_1.s:1482-1530",
      curseTargetCommand: "reference/pokeemerald/src/battle_script_commands.c:8468-8483",
      curseMove: "reference/pokeemerald/src/data/battle_moves.h:2265-2276",
      status2Cursed: "reference/pokeemerald/include/constants/battle.h:152",
      statStages: "reference/pokeemerald/include/constants/pokemon.h:75-91",
      controllerTargeting: "reference/pokeemerald/src/battle_controller_player.c:481-506",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(scripts).toContain(
      "jumpiftype2 BS_ATTACKER, TYPE_GHOST, BattleScript_GhostCurse",
    );
    expect(scripts).toContain("setstatchanger STAT_SPEED, 1, TRUE");
    expect(scripts).toContain("setstatchanger STAT_ATK, 1, FALSE");
    expect(scripts).toContain("setstatchanger STAT_DEF, 1, FALSE");
    expect(scripts).toContain("cursetarget BattleScript_ButItFailed");
    expect(scripts).toContain("datahpupdate BS_ATTACKER");

    const commands = readFileSync(
      "reference/pokeemerald/src/battle_script_commands.c",
      "utf8",
    );
    expect(commands).toContain(
      "gBattleMons[gBattlerTarget].status2 |= STATUS2_CURSED;",
    );
    expect(commands).toContain(
      "gBattleMoveDamage = gBattleMons[gBattlerAttacker].maxHP / 2;",
    );
    expect(readFileSync("reference/pokeemerald/include/constants/battle.h", "utf8"))
      .toContain("#define STATUS2_CURSED                (1 << 28)");
    expect(readFileSync("reference/pokeemerald/include/constants/pokemon.h", "utf8"))
      .toContain("#define DEFAULT_STAT_STAGE 6");

    expect(evidence.publicAbiBoundary.exposes).toEqual([
      "types",
      "hp",
      "maxHp",
      "status2",
      "statStages",
      "pp",
      "parties.checksumValid",
    ]);
    expect(evidence.publicAbiBoundary.doesNotExpose).toContain("gBattleMoveDamage");
    expect(evidence.publicAbiBoundary.rule).toMatch(/does not add raw addresses/i);
    expect(evidence.repeatability).toEqual({
      runsPerCase: 2,
      comparison: "byte-identical manifest.json",
      allMatched: true,
    });
    for (const receipt of evidence.cases) {
      expect(receipt.runManifestSha256).toHaveLength(2);
      expect(new Set(receipt.runManifestSha256)).toHaveProperty("size", 1);
      expect(receipt.runManifestSha256[0]).toMatch(/^[a-f0-9]{64}$/);
      expect(receipt.captures.every(({ sha256: digest }) => /^[a-f0-9]{64}$/.test(digest))).toBe(true);
    }
    expect(evidence.boundedRemainder).toMatch(/end-turn Curse damage/);
  });
});
