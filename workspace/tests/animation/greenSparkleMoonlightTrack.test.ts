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
  readonly gender: "male" | "female";
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
  readonly scenario: string;
  readonly probe: string;
  readonly move?: string;
  readonly orientation: "player-to-opponent" | "opponent-to-player";
  readonly branch?: "damage" | "heal";
  readonly occurrence?: number;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly lifecycleCounts: Record<string, number>;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly attacker?: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly target?: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly fieldProfile?: {
    readonly pendingHeal?: {
      readonly battler: string;
      readonly fromHp: number;
      readonly toHp: number;
      readonly weather: string;
      readonly numerator: number;
      readonly denominator: number;
    };
  };
};

type Receipt = {
  readonly path: string;
  readonly scenarioPath: string;
  readonly move: "MOVE_MOONLIGHT" | "MOVE_PRESENT";
  readonly schema: string;
  readonly orientation: Fixture["orientation"];
  readonly side: Side;
  readonly branch: "moonlight" | "damage" | "heal";
  readonly occurrence: number;
  readonly window: Fixture["denseWindow"];
  readonly lifecycle: Record<string, number>;
  readonly evidence: string;
  readonly raw: string;
  readonly attacker: Pick<BattleMon,
    "species" | "nature" | "item" | "abilitySlot" | "gender" | "moves">;
  readonly target: Pick<BattleMon,
    "species" | "nature" | "item" | "abilitySlot" | "gender" | "moves">;
  readonly segments: number;
  readonly aPresses: number;
  readonly captureFrames: readonly number[];
};

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const trackGoal = "FULFILLED: This exact 9-component boundary is fulfilled only because MOVE_MOONLIGHT and MOVE_PRESENT independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. Moonlight independently owns its complete 352/352 player-back and opponent-front Gloom blackout, MOON, alpha fade, five staggered GREEN_SPARKLE lifecycles, MoonlightEndFade palette choreography, HealingEffect BLUE_STAR tail, audio, hardware transfer, immutable state, and first-inactive cleanup, retaining 5486f398b5a29f20da4c97c6d67315973e01746b498250af3f5ea2aae116776b/433d0a9869f2ef60f0b68c812dce3ef9f2d1b8944bb54beba63a39f3c82e13bf and fdf3da2cd3ea60d4be20f7d040f917cc302562da145e5a04fa9d750147e55b0d/83e6ccdfd48c9380fbead22b3b80af91202c3e04540d1e26798eaea60d1a6e1e. Present independently owns its source-constrained player-back and opponent-front damage 201/201 ITEM_BAG plus five EXPLOSION bodies and heal 252/252 ITEM_BAG plus nine GREEN_SPARKLE and target HealingEffect2 BLUE_STAR bodies, retaining a2cc09d1f2e3424c16412095b63bb028fdae781f3c0d4b9ad7330fc2b18dd6dd/0507c4120384abae357322f65905bb7426d14d55a426853670e18814748e903f, bbb023fe5b5bfa1ef06cf14a22fddc994f1af61ed4e3c39175d2d65e44406359/b2fe7f30fa358dd7255026be702920ea977afabaf7517cddecdc78feea2e75c7, 9d752ec604a8d2e7f5f871b156ceb72e6f65902f9f03625787a15f5b8a0a4779/8e9f36a7cd0858ed4d05c13be30fdc24e156df67b23f6d1445d89be3b1948442, and 9a76aeeb3b5ea1f21ab38903d9d3f025c38f2501a76001b7560743faebc13fd5/2e5b78ad63f1968c74a51f7366a1b2267ebfdbd41420bfb3f70a588303cc11e0. The historic compact Python receipts assert and omit only BattleLab's empty setup.preCheckpointCaptures transport field. No sibling, component, or latch transfer is granted: shared GREEN_SPARKLE, BLUE_STAR, HealingEffect-family work, AlphaFadeIn, or MoonlightEndFade does not promote Recover, Synthesis, Soft-Boiled, or any other move.";

const receipts: readonly Receipt[] = [
  {
    path: "tools/compare/fixtures/moonlight-player-gloom-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-moonlight-player-gloom-opponent-onix.json",
    move: "MOVE_MOONLIGHT", schema: "moonlight-portable-evidence/v1",
    orientation: "player-to-opponent", side: "player", branch: "moonlight", occurrence: 0,
    window: { startFrame: 207, endFrame: 558, frameCount: 352 },
    lifecycle: {
      gMoonSpriteTemplate: 1, gMoonlightSparkleSpriteTemplate: 5,
      gHealingBlueStarSpriteTemplate: 4,
    },
    evidence: "5486f398b5a29f20da4c97c6d67315973e01746b498250af3f5ea2aae116776b",
    raw: "433d0a9869f2ef60f0b68c812dce3ef9f2d1b8944bb54beba63a39f3c82e13bf",
    attacker: {
      species: 44, nature: 24, item: 140, abilitySlot: 0, gender: "female",
      moves: [236, 236, 236, 236],
    },
    target: {
      species: 95, nature: 0, item: 142, abilitySlot: 0, gender: "male",
      moves: [33, 33, 33, 33],
    },
    segments: 4, aPresses: 2, captureFrames: [0, 934],
  },
  {
    path: "tools/compare/fixtures/moonlight-opponent-gloom-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-moonlight-opponent-gloom-player-onix.json",
    move: "MOVE_MOONLIGHT", schema: "moonlight-portable-evidence/v1",
    orientation: "opponent-to-player", side: "opponent", branch: "moonlight", occurrence: 0,
    window: { startFrame: 207, endFrame: 558, frameCount: 352 },
    lifecycle: {
      gMoonSpriteTemplate: 1, gMoonlightSparkleSpriteTemplate: 5,
      gHealingBlueStarSpriteTemplate: 4,
    },
    evidence: "fdf3da2cd3ea60d4be20f7d040f917cc302562da145e5a04fa9d750147e55b0d",
    raw: "83e6ccdfd48c9380fbead22b3b80af91202c3e04540d1e26798eaea60d1a6e1e",
    attacker: {
      species: 44, nature: 24, item: 140, abilitySlot: 0, gender: "female",
      moves: [236, 236, 236, 236],
    },
    target: {
      species: 95, nature: 0, item: 142, abilitySlot: 0, gender: "male",
      moves: [33, 33, 33, 33],
    },
    segments: 4, aPresses: 2, captureFrames: [0, 934],
  },
  {
    path: "tools/compare/fixtures/present-player-damage.json",
    scenarioPath: "tools/battle-lab/mechanic-present-player-delibird-opponent-onix.json",
    move: "MOVE_PRESENT", schema: "present-source-evidence/v1",
    orientation: "player-to-opponent", side: "player", branch: "damage", occurrence: 1,
    window: { startFrame: 1012, endFrame: 1212, frameCount: 201 },
    lifecycle: {
      gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 0,
      gExplosionSpriteTemplate: 5, gHealingBlueStarSpriteTemplate: 0,
    },
    evidence: "a2cc09d1f2e3424c16412095b63bb028fdae781f3c0d4b9ad7330fc2b18dd6dd",
    raw: "0507c4120384abae357322f65905bb7426d14d55a426853670e18814748e903f",
    attacker: {
      species: 225, nature: 6, item: 212, abilitySlot: 0, gender: "male",
      moves: [217, 301, 332, 258],
    },
    target: {
      species: 95, nature: 0, item: 142, abilitySlot: 0, gender: "male",
      moves: [33, 33, 33, 33],
    },
    segments: 10, aPresses: 4, captureFrames: [0, 1468],
  },
  {
    path: "tools/compare/fixtures/present-player-heal.json",
    scenarioPath: "tools/battle-lab/mechanic-present-player-delibird-opponent-onix-heal.json",
    move: "MOVE_PRESENT", schema: "present-source-evidence/v1",
    orientation: "player-to-opponent", side: "player", branch: "heal", occurrence: 1,
    window: { startFrame: 1946, endFrame: 2197, frameCount: 252 },
    lifecycle: {
      gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 9,
      gExplosionSpriteTemplate: 0, gHealingBlueStarSpriteTemplate: 4,
    },
    evidence: "bbb023fe5b5bfa1ef06cf14a22fddc994f1af61ed4e3c39175d2d65e44406359",
    raw: "b2fe7f30fa358dd7255026be702920ea977afabaf7517cddecdc78feea2e75c7",
    attacker: {
      species: 225, nature: 6, item: 212, abilitySlot: 0, gender: "male",
      moves: [217, 301, 332, 258],
    },
    target: {
      species: 95, nature: 0, item: 142, abilitySlot: 0, gender: "male",
      moves: [33, 33, 33, 33],
    },
    segments: 16, aPresses: 6, captureFrames: [0, 3130],
  },
  {
    path: "tools/compare/fixtures/present-opponent-damage.json",
    scenarioPath: "tools/battle-lab/mechanic-present-opponent-delibird-player-onix.json",
    move: "MOVE_PRESENT", schema: "present-source-evidence/v1",
    orientation: "opponent-to-player", side: "opponent", branch: "damage", occurrence: 1,
    window: { startFrame: 78, endFrame: 278, frameCount: 201 },
    lifecycle: {
      gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 0,
      gExplosionSpriteTemplate: 5, gHealingBlueStarSpriteTemplate: 0,
    },
    evidence: "9d752ec604a8d2e7f5f871b156ceb72e6f65902f9f03625787a15f5b8a0a4779",
    raw: "8e9f36a7cd0858ed4d05c13be30fdc24e156df67b23f6d1445d89be3b1948442",
    attacker: {
      species: 225, nature: 6, item: 212, abilitySlot: 0, gender: "male",
      moves: [217, 217, 217, 217],
    },
    target: {
      species: 95, nature: 0, item: 142, abilitySlot: 0, gender: "male",
      moves: [33, 33, 33, 33],
    },
    segments: 8, aPresses: 4, captureFrames: [0, 1468],
  },
  {
    path: "tools/compare/fixtures/present-opponent-heal.json",
    scenarioPath: "tools/battle-lab/mechanic-present-opponent-delibird-player-onix-heal.json",
    move: "MOVE_PRESENT", schema: "present-source-evidence/v1",
    orientation: "opponent-to-player", side: "opponent", branch: "heal", occurrence: 2,
    window: { startFrame: 1404, endFrame: 1655, frameCount: 252 },
    lifecycle: {
      gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 9,
      gExplosionSpriteTemplate: 0, gHealingBlueStarSpriteTemplate: 4,
    },
    evidence: "9a76aeeb3b5ea1f21ab38903d9d3f025c38f2501a76001b7560743faebc13fd5",
    raw: "2e5b78ad63f1968c74a51f7366a1b2267ebfdbd41420bfb3f70a588303cc11e0",
    attacker: {
      species: 225, nature: 6, item: 212, abilitySlot: 0, gender: "male",
      moves: [217, 217, 217, 217],
    },
    target: {
      species: 95, nature: 13, item: 0, abilitySlot: 1, gender: "male",
      moves: [20, 38, 20, 20],
    },
    segments: 9, aPresses: 4, captureFrames: [0, 1868],
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
    expect(mon.friendship).toBe(0);
    expect(mon.gender === "male" || mon.gender === "female").toBe(true);
    expect(mon.shiny).toBe(false);
  }
}

describe("green-sparkle-moonlight standalone fulfilled component-track ratchet", () => {
  it("pins the exact nine-component source boundary and keeps Moonlight and Present independent", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/moonlightSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "set 167 GLOOM_1 -> MOVE_MOONLIGHT 236/PERSIM_BERRY/SP_ATTACK+HP/"
      + "QUIRKY; Moonlight owns MOON, five GREEN_SPARKLE lifecycles, alpha/"
      + "BG fade, MoonlightEndFade, HealingEffect BLUE_STAR and cleanup; "
      + "MOVE_PRESENT remains distinct: IsHealingMove dispatch, ITEM_BAG "
      + "projectile, five EXPLOSION damage sprites or nine heal particles plus "
      + "HealingEffect2 on its target\n",
    );
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/presentSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "generated Level-50 inventory and source prove set 118 DELIBIRD is the sole/"
      + "lowest Factory Present carrier: Present bag -> 5 EXPLOSION damage or 9 "
      + "GREEN_SPARKLE + target HealingEffect2; healing requires a non-full target "
      + "and a ROM RNG roll >= 204; opponent-heal staging uses only tutor-legal Onix "
      + "Double-Edge with Sturdy, not a claimed Factory set\n",
    );

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(255);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "partial"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "staged"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_MOONLIGHT", "MOVE_PRESENT",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_MOONLIGHT", status: "exact" }),
      expect.objectContaining({ move: "MOVE_PRESENT", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "green-sparkle-moonlight",
    )).toEqual([
      {
        id: "green-sparkle-moonlight",
        components: [
          "asset:ANIM_TAG_GREEN_SPARKLE",
          "sprite:gMoonlightSparkleSpriteTemplate",
          "visualCommand:create_present_heal_particle_sprite",
          "task:AnimTask_AlphaFadeIn",
          "task:AnimTask_MoonlightEndFade",
          "asset:ANIM_TAG_MOON",
          "sprite:gMoonSpriteTemplate",
          "subroutine:HealingEffect",
          "asset:ANIM_TAG_BLUE_STAR",
        ],
        representatives: ["MOVE_MOONLIGHT", "MOVE_PRESENT"],
        fulfilled: true,
        goal: trackGoal,
      },
    ]);
    const track = coverage.componentTracks.find((entry: { id: string }) =>
      entry.id === "green-sparkle-moonlight");
    expect(track.representatives).not.toEqual(expect.arrayContaining([
      "MOVE_RECOVER", "MOVE_SYNTHESIS", "MOVE_SOFT_BOILED", "MOVE_ABSORB",
    ]));
  });

  it("pins all six complete semantic and raw-RGB receipts without thinning a body", () => {
    const actual = receipts.map((expected) => {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      return [
        fixture.schema,
        fixture.oracleProfile ?? scenario.profile,
        fixture.orientation,
        fixture.branch ?? "moonlight",
        fixture.occurrence ?? 0,
        fixture.denseWindow,
        fixture.lifecycleCounts,
        fixture.evidenceSha256,
        fixture.rawRgbSha256,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.schema,
      "battle-scene-on",
      expected.orientation,
      expected.branch,
      expected.occurrence,
      expected.window,
      expected.lifecycle,
      expected.evidence,
      expected.raw,
    ]));
    for (const expected of receipts) {
      expect(expected.window.endFrame - expected.window.startFrame + 1)
        .toBe(expected.window.frameCount);
    }
    expect(receipts.filter((receipt) => receipt.move === "MOVE_MOONLIGHT")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(704);
    expect(receipts.filter((receipt) => receipt.move === "MOVE_PRESENT" && receipt.branch === "damage")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(402);
    expect(receipts.filter((receipt) => receipt.move === "MOVE_PRESENT" && receipt.branch === "heal")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(504);
    expect(receipts.reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(1610);
    expect(new Set(receipts.filter((receipt) => receipt.move === "MOVE_PRESENT")
      .map((receipt) => `${receipt.orientation}/${receipt.branch}`))).toEqual(new Set([
      "player-to-opponent/damage", "player-to-opponent/heal",
      "opponent-to-player/damage", "opponent-to-player/heal",
    ]));
  });

  it("keeps each source-constrained body legal, complete, and free of staged battle state", () => {
    for (const expected of receipts) {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      expect(fixture).toMatchObject({
        schema: expected.schema,
        scenario: expected.scenarioPath,
        probe: expected.move === "MOVE_MOONLIGHT"
          ? "tools/compare/moonlightProbe.py"
          : "tools/compare/presentProbe.py",
        orientation: expected.orientation,
        denseWindow: expected.window,
        lifecycleCounts: expected.lifecycle,
        evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
      });
      if (expected.move === "MOVE_MOONLIGHT") {
        expect(fixture).toMatchObject({
          oracleProfile: "battle-scene-on",
          move: "MOONLIGHT",
          attacker: { species: "GLOOM", geometry: { side: expected.side } },
          target: {
            species: "ONIX",
            geometry: { side: expected.side === "player" ? "opponent" : "player" },
          },
          fieldProfile: {
            pendingHeal: {
              battler: "attacker", fromHp: 143, toHp: 153,
              weather: "none", numerator: 1, denominator: 2,
            },
          },
        });
      } else {
        expect(fixture).toMatchObject({
          branch: expected.branch,
          occurrence: expected.occurrence,
        });
        if (expected.branch === "damage") {
          expect(fixture.lifecycleCounts).toMatchObject({
            gExplosionSpriteTemplate: 5, gPresentHealParticleSpriteTemplate: 0,
            gHealingBlueStarSpriteTemplate: 0,
          });
        } else {
          expect(fixture.lifecycleCounts).toMatchObject({
            gExplosionSpriteTemplate: 0, gPresentHealParticleSpriteTemplate: 9,
            gHealingBlueStarSpriteTemplate: 4,
          });
        }
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
      expect(scenario.trace.segments).toHaveLength(expected.segments);
      expect(scenario.trace.segments.filter((segment) => segment.buttons.includes("A")))
        .toHaveLength(expected.aPresses);
      expect(scenario.trace.captureFrames).toEqual(expected.captureFrames);

      const attacker = scenario.overrides.parties[expected.side][0]!;
      const target = scenario.overrides.parties[
        expected.side === "player" ? "opponent" : "player"
      ][0]!;
      expect(attacker).toMatchObject(expected.attacker);
      expect(target).toMatchObject(expected.target);
    }
  });

  it("keeps Rules 1, 2, and 5 explicit while no Moonlight/Present latch is inherited", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured");
  });
});
