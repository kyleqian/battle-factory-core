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

type Window = {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile?: string;
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: string;
  readonly appStage: { readonly presentationAge: number };
  readonly sourceWindow: Window;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly lifecycleCounts: Record<string, number>;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: Side } };
};

type Receipt = {
  readonly path: string;
  readonly scenarioPath: string;
  readonly move: "MOVE_HOWL" | "MOVE_ROAR";
  readonly schema: string;
  readonly orientation: Fixture["orientation"];
  readonly side: Side;
  readonly window: Window;
  readonly evidence: string;
  readonly raw: string;
  readonly attacker: Pick<BattleMon, "species" | "nature" | "item" | "moves">;
  readonly target: Pick<BattleMon, "species" | "nature" | "item" | "moves">;
  readonly segments: number;
  readonly captureFrames: readonly number[];
  readonly selectsMoveWithDown?: boolean;
};

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const trackGoal = "FULFILLED: This exact 5-component boundary is fulfilled only because MOVE_HOWL and MOVE_ROAR independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. Howl independently owns its complete 102/102 player-back and opponent-front DeepInhale, high-pitch cry, RoarEffect six-NOISE_LINE, waits, hardware transfer, immutable state, and first-inactive cleanup, retaining 919211a099b285671b4e2e2afd2ed3cda267b2dc1b1c17a6c1bfbd349863f97a/1f19b38ed924b20fb4648adc24dea85a2be05460092df83d0d7991fa7a87a269 and 03aa671ccf17f3978744683b1a5f4066140129d4af6042d1fa05be64df827724/83ad92a022ee5484e24c8e78b49996c5692443bc76e7aef430b2ae15cedf0eac. Roar independently owns its complete 99/99 player-back and 104/104 opponent-front monbg/splitbgprio/8:8 alpha, double cry/wait, ScaleMonAndRestore, RoarEffect six-NOISE_LINE, target SlideOffScreen, hardware transfer, immutable state, and first-inactive cleanup, retaining cec50726a292d511a1a8317a501a60256c1932c9bb0b4ec42e026ef43b688aa1/0a90faea42c2ccf0886c633ec5234ad867aa54df51193c7a04e56cec21174899 and d7b5ddc1dea422802dbb466b050e7830259e891eb0acf5323530c4be3e1b4da8/727e277d1fae2dbb76b10948497badd0390c4a1b206719218cfcd3a8d1a0002a. No sibling, component, or latch transfer is granted: shared NOISE_LINE/RoarEffect does not promote any move, and no NOISE_LINE, RoarEffect, DeepInhale, cry, scale, slide, monbg, or alpha timing is inherited.";

const receipts: readonly Receipt[] = [
  {
    path: "tools/compare/fixtures/howl-player-loudred-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-howl-player-loudred-opponent-onix.json",
    move: "MOVE_HOWL", schema: "howl-portable-evidence/v1", orientation: "player-back", side: "player",
    window: { startFrame: 209, endFrame: 310, frameCount: 102 },
    evidence: "919211a099b285671b4e2e2afd2ed3cda267b2dc1b1c17a6c1bfbd349863f97a",
    raw: "1f19b38ed924b20fb4648adc24dea85a2be05460092df83d0d7991fa7a87a269",
    attacker: { species: 371, nature: 7, item: 196, moves: [336, 336, 336, 336] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
    segments: 4, captureFrames: [0, 734],
  },
  {
    path: "tools/compare/fixtures/howl-opponent-loudred-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-howl-opponent-loudred-player-onix.json",
    move: "MOVE_HOWL", schema: "howl-portable-evidence/v1", orientation: "opponent-front", side: "opponent",
    window: { startFrame: 209, endFrame: 310, frameCount: 102 },
    evidence: "03aa671ccf17f3978744683b1a5f4066140129d4af6042d1fa05be64df827724",
    raw: "83ad92a022ee5484e24c8e78b49996c5692443bc76e7aef430b2ae15cedf0eac",
    attacker: { species: 371, nature: 7, item: 196, moves: [336, 336, 336, 336] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
    segments: 4, captureFrames: [0, 734],
  },
  {
    path: "tools/compare/fixtures/roar-player-houndour-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-roar-player-houndour-opponent-onix.json",
    move: "MOVE_ROAR", schema: "roar-portable-evidence/v1", orientation: "player-back", side: "player",
    window: { startFrame: 252, endFrame: 350, frameCount: 99 },
    evidence: "cec50726a292d511a1a8317a501a60256c1932c9bb0b4ec42e026ef43b688aa1",
    raw: "0a90faea42c2ccf0886c633ec5234ad867aa54df51193c7a04e56cec21174899",
    attacker: { species: 228, nature: 6, item: 215, moves: [242, 52, 46, 182] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
    segments: 6, captureFrames: [0, 766], selectsMoveWithDown: true,
  },
  {
    path: "tools/compare/fixtures/roar-opponent-houndour-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-roar-opponent-houndour-player-onix.json",
    move: "MOVE_ROAR", schema: "roar-portable-evidence/v1", orientation: "opponent-front", side: "opponent",
    window: { startFrame: 219, endFrame: 322, frameCount: 104 },
    evidence: "d7b5ddc1dea422802dbb466b050e7830259e891eb0acf5323530c4be3e1b4da8",
    raw: "727e277d1fae2dbb76b10948497badd0390c4a1b206719218cfcd3a8d1a0002a",
    attacker: { species: 228, nature: 6, item: 215, moves: [46, 46, 46, 46] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
    segments: 4, captureFrames: [0, 734],
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

describe("noise-line-roar-effect standalone fulfilled component-track ratchet", () => {
  it("pins the exact five-component source boundary and keeps the two move bodies independent", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/howlSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "set 144/FRONTIER_MON_LOUDRED -> SPECIES_LOUDRED 371/MOVE_HOWL 336/"
      + "FOCUS_BAND/ATTACK+HP/RELAXED; Howl owns DeepInhale, six "
      + "gRoarNoiseLineSpriteTemplate lifecycles, high-pitch cry, waits and "
      + "cleanup; MOVE_ROAR remains distinct with ScaleMonAndRestore, "
      + "SlideOffScreen, double-cry/wait, monbg/splitbgprio/alpha choreography\n",
    );
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/roarSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "set 119/FRONTIER_MON_HOUNDOUR -> SPECIES_HOUNDOUR 228/MOVE_ROAR 46/"
      + "CHARCOAL/SP_ATTACK+HP/DOCILE; Roar owns NOISE_LINE x6, attacker monbg/"
      + "splitbgprio/8:8 alpha, double cry, ScaleMonAndRestore, target "
      + "SlideOffScreen, wait/clearmonbg/blendoff/cry cleanup; EffectRoar reaches "
      + "attackanimation only after attackcanceler, ability/rooted/accuracy/Arena "
      + "guards and forcerandomswitch\n",
    );

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(234);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "partial"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "staged"))
      .toHaveLength(0);
    const statuses = Object.fromEntries(coverage.entries
      .filter((entry: { move: string }) => ["MOVE_HOWL", "MOVE_ROAR"].includes(entry.move))
      .map((entry: { move: string; status: string }) => [entry.move, entry.status]));
    expect(statuses).toEqual({ MOVE_HOWL: "exact", MOVE_ROAR: "exact" });
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "noise-line-roar-effect",
    )).toEqual([{
      id: "noise-line-roar-effect",
      components: [
        "asset:ANIM_TAG_NOISE_LINE",
        "sprite:gRoarNoiseLineSpriteTemplate",
        "subroutine:RoarEffect",
        "task:AnimTask_DeepInhale",
        "task:SoundTask_PlayCryHighPitch",
      ],
      representatives: ["MOVE_HOWL", "MOVE_ROAR"],
      fulfilled: true,
      goal: trackGoal,
    }]);
  });

  it("pins all four complete semantic and raw-RGB receipts without thinning a body", () => {
    const actual = receipts.map((expected) => {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      return [
        fixture.schema,
        fixture.oracleProfile ?? scenario.profile,
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
    for (const receipt of receipts) {
      expect(receipt.window.endFrame - receipt.window.startFrame + 1)
        .toBe(receipt.window.frameCount);
    }
    expect(receipts.filter((receipt) => receipt.move === "MOVE_HOWL")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(204);
    expect(receipts.filter((receipt) => receipt.move === "MOVE_ROAR")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(203);
    expect(receipts.reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(407);
  });

  it("keeps each retained body a complete legal party and keeps Roar forced-switch gameplay out of scope", () => {
    for (const expected of receipts) {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      expect(fixture).toMatchObject({
        schema: expected.schema,
        orientation: expected.orientation,
        scenario: expected.scenarioPath,
        probe: expected.move === "MOVE_HOWL"
          ? "tools/compare/howlProbe.py"
          : "tools/compare/roarProbe.py",
        appStage: { presentationAge: 0 },
        sourceWindow: expected.window,
        evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
        attacker: {
          species: expected.move === "MOVE_HOWL" ? "LOUDRED" : "HOUNDOUR",
          geometry: { side: expected.side },
        },
        target: {
          species: "ONIX",
          geometry: { side: expected.side === "player" ? "opponent" : "player" },
        },
      });
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

      const attacker = scenario.overrides.parties[expected.side][0]!;
      const target = scenario.overrides.parties[
        expected.side === "player" ? "opponent" : "player"
      ][0]!;
      expect(attacker).toMatchObject(expected.attacker);
      expect(target).toMatchObject(expected.target);
      expect(scenario.trace.segments).toHaveLength(expected.segments);
      expect(scenario.trace.segments.filter((segment) => segment.buttons.includes("A")))
        .toHaveLength(2);
      expect(scenario.trace.captureFrames).toEqual(expected.captureFrames);
      const selectedWithDown = scenario.trace.segments.some((segment) =>
        segment.buttons.includes("DOWN"),
      );
      expect(selectedWithDown).toBe(expected.selectsMoveWithDown ?? false);
    }
  });

  it("keeps Rules 1, 2, and 5 explicit while this track adds no Howl/Roar latch", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured");
    for (const unmeasured of [
      "Howl", "Roar", "NOISE_LINE", "RoarEffect", "AnimTask_DeepInhale",
      "SoundTask_PlayCryHighPitch",
    ]) expect(latches).not.toContain(unmeasured);
    expect(trackGoal).toContain("No sibling, component, or latch transfer is granted");
  });
});
