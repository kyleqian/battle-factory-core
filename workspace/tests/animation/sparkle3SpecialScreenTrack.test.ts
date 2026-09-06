import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mirrorCoatScenario } from "../../tools/compare/mirrorCoatScenario.ts";

type Orientation = "player-back" | "opponent-front";

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

type Fixture = {
  readonly schema: string;
  readonly oracleProfile?: string;
  readonly orientation: Orientation;
  readonly scenario?: string;
  readonly probe?: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
    readonly wallFrame: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly counterReceipt?: {
    readonly specialDmg: number;
    readonly specialBattlerId: number;
    readonly resolvedDamage: number;
  };
};

type Receipt = {
  readonly path: string;
  readonly schema: string;
  readonly move: "MOVE_LIGHT_SCREEN" | "MOVE_MIRROR_COAT";
  readonly orientation: Orientation;
  readonly window: Fixture["sourceWindow"];
  readonly evidence: string;
  readonly raw: string;
  readonly counterReceipt?: NonNullable<Fixture["counterReceipt"]>;
  readonly attacker: {
    readonly species: number;
    readonly nature: number;
    readonly item: number;
    readonly moves: readonly number[];
  };
  readonly target: {
    readonly species: number;
    readonly nature: number;
    readonly item: number;
    readonly moves: readonly number[];
  };
};

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const trackGoal = "FULFILLED: This exact 9-component boundary is fulfilled only because MOVE_LIGHT_SCREEN and MOVE_MIRROR_COAT independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual receipts. Light Screen independently owns 115/115 player-back and 119/119 opponent-front rows with unchanged semantic/raw receipts 7c1c3b39e53c00ee0174232a0c05a02ac7f14b6d2aa7478bc2ae372c5d2500a2/b135e9fbf2c70ea860f0ee126959bbb0eaf0c4603566067dd5405c9698a74837 and 51ffe743621c2745f8a59cd6786bb5d0fa9b12b844ee452d2e7ca729587e20db/654a49bafe3470e81c34dfa1d127d67a78d59eb6d0b6af3c983d36008a8dbf6b. Mirror Coat independently owns its sole reachable successful-special-damage body at 75/75 in each orientation, with real 26->52 and 31->62 counter receipts and unchanged semantic/raw receipts 1ea5591d85dc0e4926b8e763584f405ed4ec72d43c676ad06fc551cedb44aa92/c8a70485e2d13ae522c31760ee7e6ecb24bb464eb567427855448389ab1128a7 and 3328d443c81b35a5305590705e7448d009aa0111a326b318c08b420a29939a7d/0fcba1ad43f479f613f84243bca184e10f4545e7e6566558327c081444b73b5b. All four move-owned maps retain their own ordinary RAM+1 wall/SPARKLE_3 OAM and ages-16..46 faded-palette rotations; player-back age-0 setup and direct setalpha/blendoff schedules remain local exceptions. No sibling, component, or latch transfer is granted.";

const receipts: readonly Receipt[] = [
  {
    path: "tools/compare/fixtures/light-screen-player-exeggcute-opponent-onix.json",
    schema: "light-screen-portable-evidence/v1", move: "MOVE_LIGHT_SCREEN",
    orientation: "player-back",
    window: { startFrame: 270, endFrame: 384, frameCount: 115, wallFrame: 310 },
    evidence: "7c1c3b39e53c00ee0174232a0c05a02ac7f14b6d2aa7478bc2ae372c5d2500a2",
    raw: "b135e9fbf2c70ea860f0ee126959bbb0eaf0c4603566067dd5405c9698a74837",
    attacker: { species: 102, nature: 4, item: 140, moves: [113, 113, 113, 113] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
  },
  {
    path: "tools/compare/fixtures/light-screen-opponent-exeggcute-player-onix.json",
    schema: "light-screen-portable-evidence/v1", move: "MOVE_LIGHT_SCREEN",
    orientation: "opponent-front",
    window: { startFrame: 176, endFrame: 294, frameCount: 119, wallFrame: 220 },
    evidence: "51ffe743621c2745f8a59cd6786bb5d0fa9b12b844ee452d2e7ca729587e20db",
    raw: "654a49bafe3470e81c34dfa1d127d67a78d59eb6d0b6af3c983d36008a8dbf6b",
    attacker: { species: 102, nature: 4, item: 140, moves: [113, 113, 113, 113] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
  },
  {
    path: "tools/compare/fixtures/mirror-coat-player-corsola-opponent-exeggcute.json",
    schema: "mirror-coat-portable-evidence/v1", move: "MOVE_MIRROR_COAT",
    orientation: "player-back",
    window: { startFrame: 349, endFrame: 423, frameCount: 75, wallFrame: 349 },
    evidence: "1ea5591d85dc0e4926b8e763584f405ed4ec72d43c676ad06fc551cedb44aa92",
    raw: "c8a70485e2d13ae522c31760ee7e6ecb24bb464eb567427855448389ab1128a7",
    counterReceipt: { specialDmg: 26, specialBattlerId: 1, resolvedDamage: 52 },
    attacker: { species: 222, nature: 8, item: 142, moves: [243, 243, 243, 243] },
    target: { species: 102, nature: 4, item: 140, moves: [93, 93, 93, 93] },
  },
  {
    path: "tools/compare/fixtures/mirror-coat-opponent-corsola-player-exeggcute.json",
    schema: "mirror-coat-portable-evidence/v1", move: "MOVE_MIRROR_COAT",
    orientation: "opponent-front",
    window: { startFrame: 355, endFrame: 429, frameCount: 75, wallFrame: 355 },
    evidence: "3328d443c81b35a5305590705e7448d009aa0111a326b318c08b420a29939a7d",
    raw: "0fcba1ad43f479f613f84243bca184e10f4545e7e6566558327c081444b73b5b",
    counterReceipt: { specialDmg: 31, specialBattlerId: 0, resolvedDamage: 62 },
    attacker: { species: 222, nature: 8, item: 142, moves: [243, 243, 243, 243] },
    target: { species: 102, nature: 4, item: 140, moves: [93, 93, 93, 93] },
  },
];

function readFixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function scenarioFor(receipt: Receipt, fixture: Fixture): Scenario {
  if (receipt.move === "MOVE_MIRROR_COAT") {
    return mirrorCoatScenario(receipt.orientation) as Scenario;
  }
  if (!fixture.scenario) throw new Error(`${receipt.orientation}: missing Light Screen scenario`);
  return readScenario(fixture.scenario);
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

describe("sparkle-3-special-screen fulfilled component-track ratchet", () => {
  it("pins the exact nine-component boundary, distinct source bodies, and independent move credit", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/lightScreenSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      carrier: "set 112 FRONTIER_MON_EXEGGCUTE / SPECIES_EXEGGCUTE / MOVE_LIGHT_SCREEN",
      components: [
        "asset:ANIM_TAG_GREEN_LIGHT_WALL",
        "asset:ANIM_TAG_SPARKLE_3",
        "sprite:gLightScreenWallSpriteTemplate",
        "sprite:gSpecialScreenSparkleSpriteTemplate",
        "subroutine:SpecialScreenSparkle",
        "visualCommand:setalpha",
        "visualCommand:blendoff",
      ],
      sibling: {
        move: "MOVE_MIRROR_COAT",
        lowestCarrier: "set 151 FRONTIER_MON_CORSOLA / SPECIES_CORSOLA",
        reachableBodies: [{
          name: "successful-special-damage-counter",
          animation: "Move_MIRROR_COAT",
        }],
        failureRoute: expect.stringContaining("does not select a move-animation body"),
        presentationDifference: expect.stringContaining("RED_LIGHT_WALL"),
      },
    });

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const track = coverage.componentTracks.find((value: { id: string }) =>
      value.id === "sparkle-3-special-screen");
    expect(track).toEqual({
      id: "sparkle-3-special-screen",
      components: [
        "asset:ANIM_TAG_GREEN_LIGHT_WALL",
        "asset:ANIM_TAG_RED_LIGHT_WALL",
        "asset:ANIM_TAG_SPARKLE_3",
        "sprite:gLightScreenWallSpriteTemplate",
        "sprite:gMirrorCoatWallSpriteTemplate",
        "sprite:gSpecialScreenSparkleSpriteTemplate",
        "subroutine:SpecialScreenSparkle",
        "visualCommand:setalpha",
        "visualCommand:blendoff",
      ],
      representatives: ["MOVE_LIGHT_SCREEN", "MOVE_MIRROR_COAT"],
      fulfilled: true,
      goal: trackGoal,
    });
    expect([...audit.components,
      "asset:ANIM_TAG_RED_LIGHT_WALL",
      "sprite:gMirrorCoatWallSpriteTemplate",
    ].sort()).toEqual(track.components.slice().sort());
    const statuses = Object.fromEntries(coverage.entries
      .filter((entry: { move: string }) => ["MOVE_LIGHT_SCREEN", "MOVE_MIRROR_COAT"]
        .includes(entry.move))
      .map((entry: { move: string; status: string }) => [entry.move, entry.status]));
    expect(statuses).toEqual({ MOVE_LIGHT_SCREEN: "exact", MOVE_MIRROR_COAT: "exact" });
  });

  it("pins all four complete bilateral semantic and raw-RGB receipts without thinning a body", () => {
    const actual = receipts.map((expected) => {
      const fixture = readFixture(expected.path);
      const scenario = scenarioFor(expected, fixture);
      return [
        fixture.schema,
        fixture.oracleProfile ?? scenario.profile,
        fixture.orientation,
        fixture.sourceWindow,
        fixture.evidenceSha256,
        fixture.rawRgbSha256,
        fixture.counterReceipt,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.schema,
      "battle-scene-on",
      expected.orientation,
      expected.window,
      expected.evidence,
      expected.raw,
      expected.counterReceipt,
    ]));
    expect(receipts.reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(384);
  });

  it("keeps every bilateral body legal, complete, and free of staged battle state", () => {
    for (const expected of receipts) {
      const fixture = readFixture(expected.path);
      const scenario = scenarioFor(expected, fixture);
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        seed: 305420122,
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
      expect(attacker.moves).toEqual(expected.attacker.moves);
      expect(target).toMatchObject({
        species: expected.target.species,
        level: 50,
        nature: expected.target.nature,
        item: expected.target.item,
        abilitySlot: 0,
      });
      expect(target.moves).toEqual(expected.target.moves);
      expect(scenario.trace.segments).toHaveLength(4);
      expect(scenario.trace.segments.filter((segment) => segment.buttons.includes("A")))
        .toHaveLength(2);
      if (expected.move === "MOVE_MIRROR_COAT") {
        expect(fixture.counterReceipt).toEqual(expected.counterReceipt);
      } else {
        expect(fixture.probe).toBe("tools/compare/lightScreenProbe.py");
      }
    }
  });
});
