import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type BattleMon = {
  readonly species: number;
  readonly level: number;
  readonly nature: number;
  readonly ivs: Record<string, number>;
  readonly evs: Record<string, number>;
  readonly moves: readonly number[];
  readonly ppUps: readonly number[];
  readonly item: number;
  readonly abilitySlot: number;
  readonly friendship: number;
  readonly gender: string;
  readonly shiny: boolean;
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly battleState: {
    readonly attackerSide: string;
    readonly targetSide: string;
    readonly attackerItem: number;
    readonly targetStatus1: number;
  };
};

type Scenario = {
  readonly mode: string;
  readonly profile: string;
  readonly level: number;
  readonly challengeNum: number;
  readonly seed: number;
  readonly overrides: {
    readonly parties: {
      readonly player: readonly BattleMon[];
      readonly opponent: readonly BattleMon[];
    };
  };
  readonly trace: {
    readonly segments: readonly { readonly frames: number; readonly buttons: readonly string[] }[];
    readonly captureFrames: readonly number[];
  };
};

type Receipt = {
  readonly path: string;
  readonly schema: string;
  readonly orientation: Fixture["orientation"];
  readonly window: Fixture["sourceWindow"];
  readonly evidence: string;
  readonly raw: string;
  readonly move: "MOVE_SPORE" | "MOVE_COTTON_SPORE";
  readonly attacker: {
    readonly species: number;
    readonly nature: number;
    readonly move: number;
    readonly item: number;
  };
  readonly seed: number;
};

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const trackGoal = "FULFILLED: This exact 8-component boundary is fulfilled only because MOVE_SPORE and MOVE_COTTON_SPORE independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual receipts. Spore independently owns 207/207 player-back and opponent-front blended 12:8-alpha/blendoff/SporeDoubleBattle bodies; Cotton Spore independently owns 204/204 player-back and opponent-front splitbgprio/opaque/no-alpha/no-blendoff/no-SporeDoubleBattle bodies. Their shared AnimSporeParticle source component remains proven only through those two independent move bodies. No sibling, component, or latch transfer is granted, including neither the distinct Powder AnimMovePowderParticle_Step latch nor acceptance for Sleep Powder, Stun Spore, Poison Powder, or any other sibling.";

const receipts: readonly Receipt[] = [
  {
    path: "tools/compare/fixtures/spore-player-parasect-opponent-onix.json",
    schema: "spore-portable-evidence/v1", orientation: "player-back",
    window: { startFrame: 366, endFrame: 572, frameCount: 207 },
    evidence: "5b275a53b8339e818fa56c158a04df729d1316fee0005ab11cc1ad1b9c446d40",
    raw: "9730e4ea34ffdaab25796ea069be7270eb36eb9ea05d13cb32c834cb8ea9d0a7",
    move: "MOVE_SPORE", attacker: { species: 47, nature: 20, move: 147, item: 200 },
    seed: 305419896,
  },
  {
    path: "tools/compare/fixtures/spore-opponent-parasect-player-onix.json",
    schema: "spore-portable-evidence/v1", orientation: "opponent-front",
    window: { startFrame: 370, endFrame: 576, frameCount: 207 },
    evidence: "7d723ded7813648cb6a29b9a5aaa651b1d677d9698f35f0aff9005f0410e687b",
    raw: "59a82fde62ce4c89b2a73f0053186df940bd51b39340339ef8fff92282f64e51",
    move: "MOVE_SPORE", attacker: { species: 47, nature: 20, move: 147, item: 200 },
    seed: 305419896,
  },
  {
    path: "tools/compare/fixtures/cotton-spore-player-mareep-opponent-onix.json",
    schema: "cotton-spore-portable-evidence/v1", orientation: "player-back",
    window: { startFrame: 286, endFrame: 489, frameCount: 204 },
    evidence: "f3505c583dbfd81459fa5a6ae013a0e84d8583f0cf3e0d0ec8cb1817c120e0c3",
    raw: "b46bd803dd59cf953c0fa0d4a979d15ab6c9060a6cc7b14571dbcb69cea38007",
    move: "MOVE_COTTON_SPORE", attacker: { species: 179, nature: 7, move: 178, item: 133 },
    seed: 1,
  },
  {
    path: "tools/compare/fixtures/cotton-spore-opponent-mareep-player-onix.json",
    schema: "cotton-spore-portable-evidence/v1", orientation: "opponent-front",
    window: { startFrame: 285, endFrame: 488, frameCount: 204 },
    evidence: "a719bb8dff37cdf3f82a3909b6129e694b1982fa0800152dbbd7c3ae105e5983",
    raw: "629fb753f6e9522a6144b90c630b4d6306e3fcdd1b2558fe9af8a55617ab569c",
    move: "MOVE_COTTON_SPORE", attacker: { species: 179, nature: 7, move: 178, item: 133 },
    seed: 1,
  },
];

function readFixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function expectCompleteParty(party: readonly BattleMon[]): void {
  expect(party).toHaveLength(3);
  for (const mon of party) {
    expect(Object.keys(mon).sort()).toEqual(monKeys.slice().sort());
    expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
    expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
    expect(mon.level).toBe(50);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.gender === "male" || mon.gender === "female").toBe(true);
    expect(mon.shiny).toBe(false);
  }
}

describe("spore-particles fulfilled component-track ratchet", () => {
  it("pins the exact eight-component boundary, distinct source bodies, and independent move credit", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/sporeSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "set 282/FRONTIER_MON_PARASECT_2 -> SPECIES_PARASECT 47/"
      + "MOVE_SPORE 147/LEFTOVERS/SP_DEFENSE+DEFENSE+HP/CALM; Spore owns nine "
      + "blended gSporeParticleSpriteTemplate lifecycles and "
      + "AnimTask_SporeDoubleBattle; lowest Cotton Spore carrier set "
      + "49/FRONTIER_MON_MAREEP -> SPECIES_MAREEP 179/CHERI_BERRY/"
      + "SP_ATTACK+HP/RELAXED; MOVE_COTTON_SPORE remains distinct with "
      + "splitbgprio, nine unblended particles, no alpha/SporeDoubleBattle, "
      + "and 18/10 loop audio\n",
    );

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const statuses = Object.fromEntries(coverage.entries
      .filter((entry: { move: string }) => ["MOVE_SPORE", "MOVE_COTTON_SPORE"]
        .includes(entry.move))
      .map((entry: { move: string; status: string }) => [entry.move, entry.status]));
    expect(statuses).toEqual({ MOVE_SPORE: "exact", MOVE_COTTON_SPORE: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "spore-particles")).toEqual({
      id: "spore-particles",
      components: [
        "asset:ANIM_TAG_SPORE",
        "subroutine:CreateSpore",
        "subroutine:CreateCottonSpores",
        "task:AnimTask_SporeDoubleBattle",
        "visualCommand:create_spore_particle_sprite",
        "visualCommand:setalpha",
        "visualCommand:blendoff",
        "visualCommand:splitbgprio",
      ],
      representatives: ["MOVE_SPORE", "MOVE_COTTON_SPORE"],
      fulfilled: true,
      goal: trackGoal,
    });
    const track = coverage.componentTracks.find((value: { id: string }) =>
      value.id === "spore-particles");
    expect(track.representatives).not.toEqual(expect.arrayContaining([
      "MOVE_SLEEP_POWDER", "MOVE_STUN_SPORE", "MOVE_POISON_POWDER",
    ]));
  });

  it("pins all four complete bilateral receipts and raw-RGB hashes without thinning a body", () => {
    const actual = receipts.map((expected) => {
      const fixture = readFixture(expected.path);
      return [
        fixture.schema,
        fixture.oracleProfile,
        fixture.orientation,
        fixture.sourceWindow,
        fixture.evidenceSha256,
        fixture.rawRgbSha256,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.schema,
      "battle-scene-on",
      expected.orientation,
      expected.window,
      expected.evidence,
      expected.raw,
    ]));
    expect(receipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(822);
  });

  it("keeps every bilateral fixture a complete legal party with no staged battle state", () => {
    for (const expected of receipts) {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      expect(fixture).toMatchObject({
        schema: expected.schema,
        oracleProfile: "battle-scene-on",
        orientation: expected.orientation,
        probe: "tools/compare/sporeProbe.py",
        sourceWindow: expected.window,
        evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
        battleState: {
          attackerSide: expected.orientation === "player-back" ? "player" : "opponent",
          targetSide: expected.orientation === "player-back" ? "opponent" : "player",
          attackerItem: expected.attacker.item,
          targetStatus1: 0,
        },
      });
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 2,
        seed: expected.seed,
      });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expectCompleteParty(scenario.overrides.parties.player);
      expectCompleteParty(scenario.overrides.parties.opponent);

      const attacker = expected.orientation === "player-back"
        ? scenario.overrides.parties.player[0]!
        : scenario.overrides.parties.opponent[0]!;
      const target = expected.orientation === "player-back"
        ? scenario.overrides.parties.opponent[0]!
        : scenario.overrides.parties.player[0]!;
      expect(attacker).toMatchObject({
        species: expected.attacker.species,
        level: 50,
        nature: expected.attacker.nature,
        item: expected.attacker.item,
        abilitySlot: 0,
      });
      expect(attacker.moves).toEqual(Array(4).fill(expected.attacker.move));
      expect(target).toMatchObject({
        species: 95,
        level: 50,
        nature: 0,
        item: 142,
        abilitySlot: 0,
      });
      expect(target.moves).toEqual([88, 88, 88, 88]);
      expect(scenario.trace.segments).toHaveLength(4);
      expect(scenario.trace.segments.filter((segment) => segment.buttons.includes("A")))
        .toHaveLength(2);
    }
  });
});
