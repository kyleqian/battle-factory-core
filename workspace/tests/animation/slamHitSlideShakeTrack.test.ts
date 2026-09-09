import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Side = "player" | "opponent";

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
  readonly attacker: {
    readonly species: string;
    readonly geometry: { readonly side: Side };
  };
  readonly target: {
    readonly species: string;
    readonly geometry: { readonly side: Side };
  };
  readonly battleState?: {
    readonly attackerSide: Side;
    readonly species: number;
    readonly hp: number;
    readonly maxHp: number;
    readonly heldItem: number;
  };
  readonly status?: string;
  readonly acceptance?: {
    readonly reducerPinned: boolean;
    readonly typedSeam: boolean;
    readonly productionFramebuffer: boolean;
    readonly exact: boolean;
  };
  readonly topology?: {
    readonly tasks: readonly string[];
    readonly templates: readonly string[];
    readonly audio: readonly string[];
  };
};

type Receipt = {
  readonly fixturePath: string;
  readonly scenarioPath: string;
  readonly move: "MOVE_SLAM" | "MOVE_SECRET_POWER";
  readonly schema: string;
  readonly orientation: string;
  readonly side: Side;
  readonly window: Fixture["sourceWindow"];
  readonly evidence: string;
  readonly raw: string;
  readonly attacker: { readonly species: number; readonly nature: number; readonly item: number; readonly move: number };
  readonly target: { readonly species: number; readonly nature: number; readonly item: number };
  readonly tailFrames: number;
  readonly terminalCapture: number;
};

const trackGoal = "FULFILLED: MOVE_SLAM independently proves its complete SLAM_HIT/IMPACT, dual-slide, ShakeMonInPlace, target-monbg/alpha, audio, immutable state, hardware/seam/raw-RGB/actual-core framebuffer equality, and cleanup at 54/54 dense frames in both orientations twice fresh, retaining semantic/raw receipts 8f520d7599ce22335081f096258dba8a4dc61f880c9b5167f0d3d68a33e14182/4e3abdaf0e4ab636fc415fb933a10cb47f9ed86fffcef880fd3d6479d1a4c8c2 and 66a2b9d72b6dd0eb160faf6336a395fd036745d1fc09433fca7aea3641697401/66d4cdf1aed7f739b15a44eaccbb346268f5cc3b05112836b8717d31255f62fc. MOVE_SECRET_POWER independently proves Factory indoor BATTLE_ENVIRONMENT_BUILDING -> Move_STRENGTH through its complete 102/102 first-active through first-inactive frames twice fresh in both orientations, including IMPACT, ShakeAndSinkMon's two-transfer behavior, return slide, side-respecting ellipse, three hitsplats with slot reuse, final ShakeMon2, monbg/alpha, audio, legal geometry, immutable state, hardware latches, raw-RGB, actual-core framebuffer equality, and cleanup, retaining 9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3/af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903 and 8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172/f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a. All four historic normal-Python receipts now assert and omit only BattleLab's empty setup.preCheckpointCaptures transport field; SLAM and Secret Power remain independent acceptance units.";

const receipts: readonly Receipt[] = [
  {
    fixturePath: "tools/compare/fixtures/slam-player-lickitung-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-slam-player-lickitung-opponent-onix.json",
    move: "MOVE_SLAM", schema: "slam-portable-evidence/v1",
    orientation: "player-to-opponent", side: "player",
    window: { startFrame: 212, endFrame: 265, frameCount: 54 },
    evidence: "8f520d7599ce22335081f096258dba8a4dc61f880c9b5167f0d3d68a33e14182",
    raw: "4e3abdaf0e4ab636fc415fb933a10cb47f9ed86fffcef880fd3d6479d1a4c8c2",
    attacker: { species: 108, nature: 19, item: 142, move: 21 },
    target: { species: 95, nature: 0, item: 142 },
    tailFrames: 500, terminalCapture: 534,
  },
  {
    fixturePath: "tools/compare/fixtures/slam-opponent-lickitung-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-slam-opponent-lickitung-player-onix.json",
    move: "MOVE_SLAM", schema: "slam-portable-evidence/v1",
    orientation: "opponent-to-player", side: "opponent",
    window: { startFrame: 211, endFrame: 264, frameCount: 54 },
    evidence: "66a2b9d72b6dd0eb160faf6336a395fd036745d1fc09433fca7aea3641697401",
    raw: "66d4cdf1aed7f739b15a44eaccbb346268f5cc3b05112836b8717d31255f62fc",
    attacker: { species: 108, nature: 19, item: 142, move: 21 },
    target: { species: 95, nature: 0, item: 142 },
    tailFrames: 500, terminalCapture: 534,
  },
  {
    fixturePath: "tools/compare/fixtures/secret-power-strength-player-teddiursa-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-secret-power-player-teddiursa-opponent-onix.json",
    move: "MOVE_SECRET_POWER", schema: "secret-power-strength-portable-evidence/v1",
    orientation: "player-back Teddiursa -> opponent-front Onix", side: "player",
    window: { startFrame: 222, endFrame: 323, frameCount: 102 },
    evidence: "9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3",
    raw: "af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903",
    attacker: { species: 216, nature: 7, item: 134, move: 290 },
    target: { species: 95, nature: 0, item: 142 },
    tailFrames: 700, terminalCapture: 734,
  },
  {
    fixturePath: "tools/compare/fixtures/secret-power-strength-opponent-teddiursa-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-secret-power-opponent-teddiursa-player-onix.json",
    move: "MOVE_SECRET_POWER", schema: "secret-power-strength-portable-evidence/v1",
    orientation: "opponent-front Teddiursa -> player-back Onix", side: "opponent",
    window: { startFrame: 222, endFrame: 323, frameCount: 102 },
    evidence: "8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172",
    raw: "f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a",
    attacker: { species: 216, nature: 7, item: 134, move: 290 },
    target: { species: 95, nature: 0, item: 142 },
    tailFrames: 700, terminalCapture: 734,
  },
];

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function readFixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function sourceAudit(path: string): Record<string, unknown> {
  return JSON.parse(execFileSync(process.execPath, [
    "--experimental-strip-types", path,
  ], { encoding: "utf8" })) as Record<string, unknown>;
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
    expect(mon.abilitySlot).toBe(0);
    expect(mon.friendship).toBe(70);
    expect(mon.gender === "male" || mon.gender === "female").toBe(true);
    expect(mon.shiny).toBe(false);
  }
}

describe("slam-hit-slide-shake standalone fulfilled component-track ratchet", () => {
  it("pins the source-selected Slam and Factory indoor Strength bodies without transferring a Secret Power environment", () => {
    expect(sourceAudit("tools/compare/slamSourceAudit.ts")).toEqual({
      move: "MOVE_SLAM",
      carrier: {
        setId: 164,
        set: "FRONTIER_MON_LICKITUNG_1",
        species: 108,
        nature: "NATURE_QUIRKY",
        item: "ITEM_SITRUS_BERRY",
      },
      body: {
        slamHitFrames: [64, 80, 96, 112],
        slamHitDurations: [3, 3, 3, 6],
        reused: [
          "ANIM_TAG_IMPACT",
          "gSlideMonToOffsetSpriteTemplate",
          "gSlideMonToOriginalPosSpriteTemplate",
          "AnimTask_ShakeMonInPlace",
        ],
      },
      sibling: {
        MOVE_SECRET_POWER:
          "unsupported: Factory BATTLE_ENVIRONMENT_BUILDING dispatches Move_STRENGTH; only the final non-Factory fallback reaches Move_SLAM",
      },
    });

    const secretPower = sourceAudit("tools/compare/secretPowerSourceAudit.ts");
    expect(secretPower).toMatchObject({
      move: "MOVE_SECRET_POWER",
      moveId: 290,
      carrier: {
        setId: 117,
        set: "FRONTIER_MON_TEDDIURSA",
        species: "SPECIES_TEDDIURSA",
        legalRange: [110, 199],
        challengeNum: 0,
      },
      factory: {
        mapType: "MAP_TYPE_INDOOR",
        environment: "BATTLE_ENVIRONMENT_BUILDING",
        environmentValue: 8,
        reachableBodies: ["Move_STRENGTH"],
      },
      factoryBody: {
        label: "Move_STRENGTH",
        components: [
          "ANIM_TAG_IMPACT",
          "AnimTask_ShakeAndSinkMon",
          "gSlideMonToOriginalPosSpriteTemplate",
          "AnimTask_TranslateMonEllipticalRespectSide",
          "three gBasicHitSplatSpriteTemplate animation-1 lifecycles",
          "AnimTask_ShakeMon2",
          "ANIM_DEF_PARTNER monbg",
          "12:8 alpha",
          "SE_M_TAKE_DOWN",
          "three SE_M_MEGA_KICK2",
          "cleanup",
        ],
      },
    });
    expect(secretPower.visualDispatch).toEqual({
      BATTLE_ENVIRONMENT_GRASS: { value: 0, body: "Move_NEEDLE_ARM" },
      BATTLE_ENVIRONMENT_LONG_GRASS: { value: 1, body: "Move_MAGICAL_LEAF" },
      BATTLE_ENVIRONMENT_SAND: { value: 2, body: "Move_MUD_SHOT" },
      BATTLE_ENVIRONMENT_UNDERWATER: { value: 3, body: "Move_WATERFALL" },
      BATTLE_ENVIRONMENT_WATER: { value: 4, body: "Move_SURF" },
      BATTLE_ENVIRONMENT_POND: { value: 5, body: "Move_BUBBLE_BEAM" },
      BATTLE_ENVIRONMENT_MOUNTAIN: { value: 6, body: "Move_ROCK_THROW" },
      BATTLE_ENVIRONMENT_CAVE: { value: 7, body: "Move_BITE" },
      BATTLE_ENVIRONMENT_BUILDING: { value: 8, body: "Move_STRENGTH" },
      BATTLE_ENVIRONMENT_PLAIN: { value: 9, body: "Move_SLAM" },
    });
  });

  it("pins all four complete legal bilateral receipts, not a thinned subset", () => {
    const actual = receipts.map((expected) => {
      const fixture = readFixture(expected.fixturePath);
      return [
        fixture.schema,
        fixture.oracleProfile,
        fixture.orientation,
        fixture.scenario,
        fixture.sourceWindow,
        fixture.evidenceSha256,
        fixture.rawRgbSha256,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.schema,
      "battle-scene-on",
      expected.orientation,
      expected.scenarioPath,
      expected.window,
      expected.evidence,
      expected.raw,
    ]));
    expect(receipts.filter((receipt) => receipt.move === "MOVE_SLAM")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(108);
    expect(receipts.filter((receipt) => receipt.move === "MOVE_SECRET_POWER")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(204);
    expect(receipts.reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(312);

    for (const expected of receipts) {
      const fixture = readFixture(expected.fixturePath);
      const scenario = readScenario(fixture.scenario);
      expect(fixture).toMatchObject({
        schema: expected.schema,
        oracleProfile: "battle-scene-on",
        orientation: expected.orientation,
        scenario: expected.scenarioPath,
        probe: "tools/compare/bodySlamProbe.py",
        sourceWindow: expected.window,
        evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
        attacker: { species: expected.move === "MOVE_SLAM" ? "LICKITUNG" : "TEDDIURSA", geometry: { side: expected.side } },
        target: { species: "ONIX", geometry: { side: expected.side === "player" ? "opponent" : "player" } },
      });
      expect(
        fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame + 1,
      ).toBe(expected.window.frameCount);
      if (expected.move === "MOVE_SLAM") {
        expect(fixture.battleState).toMatchObject({
          attackerSide: expected.side,
          species: 108,
          heldItem: 142,
        });
      } else {
        expect(fixture).toMatchObject({
          status: "exact",
          acceptance: {
            reducerPinned: true,
            typedSeam: true,
            productionFramebuffer: true,
            exact: true,
          },
          topology: {
            tasks: [
              "AnimTask_ShakeAndSinkMon_Step",
              "AnimTask_TranslateMonElliptical_Step",
              "AnimTask_ShakeMon2_Step",
            ],
            templates: [
              "gSlideMonToOriginalPosSpriteTemplate",
              "gBasicHitSplatSpriteTemplate",
            ],
            audio: ["SE_M_TAKE_DOWN", "SE_M_MEGA_KICK2"],
          },
        });
      }

      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        seed: 305419897,
      });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expectCompleteParty(scenario.overrides.parties.player);
      expectCompleteParty(scenario.overrides.parties.opponent);
      expect(scenario.trace.segments.map(({ frames, buttons }) => [frames, buttons]))
        .toEqual([[2, ["A"]], [30, []], [2, ["A"]], [expected.tailFrames, []]]);
      expect(scenario.trace.captureFrames).toEqual([0, expected.terminalCapture]);

      const attacker = scenario.overrides.parties[expected.side][0]!;
      const target = scenario.overrides.parties[expected.side === "player" ? "opponent" : "player"][0]!;
      expect(attacker).toMatchObject({
        species: expected.attacker.species,
        nature: expected.attacker.nature,
        item: expected.attacker.item,
        abilitySlot: 0,
        friendship: 70,
        gender: "male",
      });
      expect(attacker.moves).toEqual(Array(4).fill(expected.attacker.move));
      expect(target).toMatchObject({
        species: expected.target.species,
        nature: expected.target.nature,
        item: expected.target.item,
        abilitySlot: 0,
        friendship: 70,
        gender: "male",
      });
      expect(target.moves).toEqual([33, 33, 33, 33]);
    }
  });

  it("fulfills only the exact ten-component track at the unchanged coverage count", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(243);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_SLAM", "MOVE_SECRET_POWER",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_SECRET_POWER", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SLAM", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "slam-hit-slide-shake",
    )).toEqual([
      {
        id: "slam-hit-slide-shake",
        components: [
          "asset:ANIM_TAG_SLAM_HIT",
          "sprite:gSlamHitSpriteTemplate",
          "sprite:gSlideMonToOffsetSpriteTemplate",
          "sprite:gSlideMonToOriginalPosSpriteTemplate",
          "visualCommand:create_basic_hitsplat_sprite",
          "task:AnimTask_ShakeMonInPlace",
          "visualCommand:monbg",
          "visualCommand:setalpha",
          "visualCommand:blendoff",
          "visualCommand:clearmonbg",
        ],
        representatives: ["MOVE_SLAM", "MOVE_SECRET_POWER"],
        fulfilled: true,
        goal: trackGoal,
      },
    ]);

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured");
    expect(latches).toContain("other `AnimTask_ShakeMonInPlace` schedules remain open");
  });
});
