import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly targetSide?: string;
  readonly move?: string;
};

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

type ReceiptExpectation = {
  readonly path: string;
  readonly schema: string;
  readonly orientation: string;
  readonly targetSide: string | undefined;
  readonly window: Fixture["sourceWindow"];
  readonly evidence: string;
  readonly raw: string;
  readonly attackerSpecies: number;
  readonly attackerMove: number;
  readonly attackerNature: number;
  readonly challengeNum: number;
  readonly seed: number;
  readonly residual: boolean;
};

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const trackGoal = "FULFILLED: This exact 13-component boundary is fulfilled only because MOVE_HYDRO_PUMP and MOVE_WHIRLPOOL independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual receipts. Hydro Pump's player-back and opponent-front main bodies are 141/141 each; Whirlpool independently owns both 133/133 main bodies (18 affine vortex orbs, 50-tick ShakeMon) and both natural 108/108 Status_Whirlpool residual bodies (12 orbs, 30-tick ShakeMon). The four refreshed Whirlpool receipts differ from their historical values only by BattleLab's additive setup.preCheckpointCaptures:[] field; all six receipt and raw-RGB, source/component, own-latch, gameplay-state, and actual-core framebuffer proofs remain unchanged. No sibling, component, or latch transfer is granted.";

const receipts: readonly ReceiptExpectation[] = [
  {
    path: "tools/compare/fixtures/hydro-pump-player-masquerain-opponent-onix.json",
    schema: "hydro-pump-portable-evidence/v1", orientation: "player-back", targetSide: undefined,
    window: { startFrame: 213, endFrame: 353, frameCount: 141 },
    evidence: "a5b1f9832abff8e3e26b0122377fd9ea43eaf17d3fe72999916f272a11890e3b",
    raw: "360d0d7292aa8fa6125f3de46d5170d2d1a3ca62181ada3cdf11ff1cff779706",
    attackerSpecies: 312, attackerMove: 56, attackerNature: 17,
    challengeNum: 2, seed: 305419897, residual: false,
  },
  {
    path: "tools/compare/fixtures/hydro-pump-opponent-masquerain-player-onix.json",
    schema: "hydro-pump-portable-evidence/v1", orientation: "opponent-front", targetSide: undefined,
    window: { startFrame: 232, endFrame: 372, frameCount: 141 },
    evidence: "1ac9a23b2ef858a57ecc8b0f8298406131014a41f1cd22aef74fdb4a7de6737f",
    raw: "ff315fb58f55bcaa8c5e728faa33635d97e41d624747d867d4f1c9487fc06cee",
    attackerSpecies: 312, attackerMove: 56, attackerNature: 17,
    challengeNum: 2, seed: 12, residual: false,
  },
  {
    path: "tools/compare/fixtures/whirlpool-player-wailmer-opponent-onix.json",
    schema: "whirlpool-main-portable-evidence/v1", orientation: "player-back", targetSide: "opponent",
    window: { startFrame: 78, endFrame: 210, frameCount: 133 },
    evidence: "7525e3073f8832c7528f88a847227605d4024cbbc0022178a5e3e5d6531320ce",
    raw: "d3a4cebcb258d334414d99096b7ded4accc90be1af37da4abf01610866ae96c8",
    attackerSpecies: 313, attackerMove: 250, attackerNature: 6,
    challengeNum: 0, seed: 12, residual: false,
  },
  {
    path: "tools/compare/fixtures/whirlpool-opponent-wailmer-player-onix.json",
    schema: "whirlpool-main-portable-evidence/v1", orientation: "opponent-front", targetSide: "player",
    window: { startFrame: 82, endFrame: 214, frameCount: 133 },
    evidence: "d02b38e48b8b71affa46845e9fd867f93e913697d17ff1f03709814f7e690068",
    raw: "8b42073d713d49286935abd3079c2266464f6f66c492a039903fb70740a26ffa",
    attackerSpecies: 313, attackerMove: 250, attackerNature: 6,
    challengeNum: 0, seed: 12, residual: false,
  },
  {
    path: "tools/compare/fixtures/status-whirlpool-player-wailmer-opponent-onix.json",
    schema: "status-whirlpool-portable-evidence/v1", orientation: "player-back", targetSide: "opponent",
    window: { startFrame: 663, endFrame: 770, frameCount: 108 },
    evidence: "f1b3213432dc5269dce74e53d7b94dd92e53e9c718d60bb326fc8e8cb8bc491b",
    raw: "8a809496f28e7cb8e5eb9a37e26f721a9e9b3c14ef67bbf798825d4b527a9e71",
    attackerSpecies: 313, attackerMove: 250, attackerNature: 6,
    challengeNum: 0, seed: 12, residual: true,
  },
  {
    path: "tools/compare/fixtures/status-whirlpool-opponent-wailmer-player-onix.json",
    schema: "status-whirlpool-portable-evidence/v1", orientation: "opponent-front", targetSide: "player",
    window: { startFrame: 653, endFrame: 760, frameCount: 108 },
    evidence: "c5e73b98282c51e9a59dcd2e2da4d8cb67c58584d5d8400d7b2eb97733152929",
    raw: "481017b8c09ddf3bbe585e6e2845a02384e27e1b7ed38169834e3eb2ea82463c",
    attackerSpecies: 313, attackerMove: 250, attackerNature: 6,
    challengeNum: 0, seed: 12, residual: true,
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
    expect(mon.ppUps).toHaveLength(4);
  }
}

describe("water-orb Hydro Pump/Whirlpool fulfilled component-track ratchet", () => {
  it("pins the exact 13-component boundary, source bodies, and independent move credit", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/waterOrbSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "WATER_ORB source audit: Hydro Pump set 303/challenge 2, 44 sine orbs + 12 proved impacts; Whirlpool set 170/challenge 0, 18 affine vortex orbs; shared exact controls MUD_SHOT + WATER_GUN\n",
    );

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const statuses = Object.fromEntries(coverage.entries
      .filter((entry: { move: string }) => ["MOVE_HYDRO_PUMP", "MOVE_WHIRLPOOL"]
        .includes(entry.move))
      .map((entry: { move: string; status: string }) => [entry.move, entry.status]));
    expect(statuses).toEqual({ MOVE_HYDRO_PUMP: "exact", MOVE_WHIRLPOOL: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "water-orb-hydro-pump-whirlpool")).toEqual({
      id: "water-orb-hydro-pump-whirlpool",
      components: [
        "asset:ANIM_TAG_WATER_ORB",
        "asset:ANIM_TAG_WATER_IMPACT",
        "sprite:gHydroPumpOrbSpriteTemplate",
        "sprite:gWaterHitSplatSpriteTemplate",
        "subroutine:HydroPumpBeams",
        "subroutine:HydroPumpHitSplats",
        "sprite:gWhirlpoolSpriteTemplate",
        "subroutine:WhirlpoolEffect",
        "task:AnimTask_ShakeMon",
        "task:AnimTask_StartSinAnimTimer",
        "visualCommand:simple_palette_blend",
        "visualCommand:setalpha",
        "visualCommand:blendoff",
      ],
      representatives: ["MOVE_HYDRO_PUMP", "MOVE_WHIRLPOOL"],
      fulfilled: true,
      goal: trackGoal,
    });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_MUD_SHOT"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_WATER_GUN"))
      .toMatchObject({ status: "exact" });
  });

  it("pins all six complete bilateral raw-RGB receipts without thinning a body", () => {
    const actual = receipts.map((expected) => {
      const fixture = readFixture(expected.path);
      return [
        fixture.schema,
        fixture.oracleProfile,
        fixture.orientation,
        fixture.targetSide,
        fixture.sourceWindow,
        fixture.evidenceSha256,
        fixture.rawRgbSha256,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.schema,
      "battle-scene-on",
      expected.orientation,
      expected.targetSide,
      expected.window,
      expected.evidence,
      expected.raw,
    ]));
    expect(receipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(764);
  });

  it("keeps every bilateral scenario a complete legal party and reaches residual only naturally", () => {
    for (const expected of receipts) {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: expected.challengeNum,
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
        species: expected.attackerSpecies,
        level: 50,
        nature: expected.attackerNature,
        item: 221,
        abilitySlot: 0,
      });
      expect(attacker.moves).toEqual(Array(4).fill(expected.attackerMove));
      expect(target).toMatchObject({ species: 95, level: 50, item: 0, abilitySlot: 0 });
      expect(target.moves).toEqual([33, 33, 33, 33]);
      expect(scenario.trace.segments).toHaveLength(expected.residual ? 8 : 4);
      expect(scenario.trace.segments.filter((segment) => segment.buttons.includes("A")))
        .toHaveLength(expected.residual ? 4 : 2);
    }
  });
});
