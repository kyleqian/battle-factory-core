import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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

type Fixture = {
  readonly schema: string;
  readonly oracleProfile?: string;
  readonly orientation: Orientation;
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
    readonly attackerSide: "player" | "opponent";
    readonly targetSide: "player" | "opponent";
    readonly attackerItem: number;
    readonly targetConfusionTurns?: number;
    readonly targetStatus2?: number;
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
  };
};

type Receipt = {
  readonly path: string;
  readonly schema: string;
  readonly move: "MOVE_SWEET_KISS" | "MOVE_ATTRACT";
  readonly orientation: Orientation;
  readonly window: Fixture["sourceWindow"];
  readonly evidence: string;
  readonly raw: string;
  readonly attacker: {
    readonly species: number;
    readonly nature: number;
    readonly item: number;
    readonly gender: "female";
    readonly move: number;
  };
  readonly battleState: Fixture["battleState"];
};

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const trackGoal = "FULFILLED: This exact 9-component boundary is fulfilled only because MOVE_SWEET_KISS and MOVE_ATTRACT independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. Sweet Kiss independently owns its 159/159 player-back and opponent-front ANGEL plus six RED_HEART-burst body, retaining semantic/raw receipts 5117db12992b65aadfc65a448ea2260dfd5848be19fc3d6e2df733d90604af21/61870ad0f56694de71f2d492c51fbe208216ef88b8550eca8a3a17fca8f73f11 and db45d09de25efa0d267f53c0337017c98094b0d174e8b99babfaa7dabf496821/76f32756df4d9bbdbfee5daf5d5ecf5b72bcdbacc3c4eab909c44cd7a8759876. Attract independently owns its 435/435 player-back and opponent-front projectile, six burst, eight rising RED_HEART, SwayMon, HeartsBackground, and two target blend-cycle body, retaining a5008ce72fd22417d8ec1be80158fd3a5f93b715165700b875601c476c5717c8/e627d99e69936a320250ab89b946221a179d2ea3a2ed076068a2ff82e9edd9a9 and 234dd9d0da4f02be12a404f3ef36eaa1071bd66d2886eaa75fe3aa25ae48422e/daa9c2ed067fcfa6d56a98d364c5d3e31e0ca7af30bd15ca72c2c93ddb2ef329. The historic compact Python receipts assert and omit only BattleLab's empty setup.preCheckpointCaptures transport field. No sibling, component, or latch transfer is granted: shared RED_HEART art does not promote Lovely Kiss or any sibling, and Rest/Sleep Talk/Frustration SwayMon timing is excluded.";

const receipts: readonly Receipt[] = [
  {
    path: "tools/compare/fixtures/sweet-kiss-player-luvdisc-opponent-onix.json",
    schema: "sweet-kiss-portable-evidence/v1", move: "MOVE_SWEET_KISS",
    orientation: "player-back",
    window: { startFrame: 74, endFrame: 232, frameCount: 159 },
    evidence: "5117db12992b65aadfc65a448ea2260dfd5848be19fc3d6e2df733d90604af21",
    raw: "61870ad0f56694de71f2d492c51fbe208216ef88b8550eca8a3a17fca8f73f11",
    attacker: { species: 325, nature: 7, item: 183, gender: "female", move: 186 },
    battleState: {
      attackerSide: "player", targetSide: "opponent", attackerItem: 183,
      targetConfusionTurns: 0,
    },
  },
  {
    path: "tools/compare/fixtures/sweet-kiss-opponent-luvdisc-player-onix.json",
    schema: "sweet-kiss-portable-evidence/v1", move: "MOVE_SWEET_KISS",
    orientation: "opponent-front",
    window: { startFrame: 78, endFrame: 236, frameCount: 159 },
    evidence: "db45d09de25efa0d267f53c0337017c98094b0d174e8b99babfaa7dabf496821",
    raw: "76f32756df4d9bbdbfee5daf5d5ecf5b72bcdbacc3c4eab909c44cd7a8759876",
    attacker: { species: 325, nature: 7, item: 183, gender: "female", move: 186 },
    battleState: {
      attackerSide: "opponent", targetSide: "player", attackerItem: 183,
      targetConfusionTurns: 0,
    },
  },
  {
    path: "tools/compare/fixtures/attract-player-eevee-opponent-onix.json",
    schema: "attract-portable-evidence/v1", move: "MOVE_ATTRACT",
    orientation: "player-back",
    window: { startFrame: 66, endFrame: 500, frameCount: 435 },
    evidence: "a5008ce72fd22417d8ec1be80158fd3a5f93b715165700b875601c476c5717c8",
    raw: "e627d99e69936a320250ab89b946221a179d2ea3a2ed076068a2ff82e9edd9a9",
    attacker: { species: 133, nature: 6, item: 170, gender: "female", move: 213 },
    battleState: {
      attackerSide: "player", targetSide: "opponent", attackerItem: 170,
      targetStatus2: 65536,
    },
  },
  {
    path: "tools/compare/fixtures/attract-opponent-eevee-player-onix.json",
    schema: "attract-portable-evidence/v1", move: "MOVE_ATTRACT",
    orientation: "opponent-front",
    window: { startFrame: 70, endFrame: 504, frameCount: 435 },
    evidence: "234dd9d0da4f02be12a404f3ef36eaa1071bd66d2886eaa75fe3aa25ae48422e",
    raw: "daa9c2ed067fcfa6d56a98d364c5d3e31e0ca7af30bd15ca72c2c93ddb2ef329",
    attacker: { species: 133, nature: 6, item: 170, gender: "female", move: 213 },
    battleState: {
      attackerSide: "opponent", targetSide: "player", attackerItem: 170,
      targetStatus2: 131072,
    },
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

describe("red-heart-sweet-kiss fulfilled component-track ratchet", () => {
  it("pins the exact nine-component boundary, distinct source bodies, and independent move credit", () => {
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/sweetKissSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "set 123/FRONTIER_MON_LUVDISC -> SPECIES_LUVDISC 325/MOVE_SWEET_KISS 186/"
      + "QUICK_CLAW/SP_ATTACK+HP/RELAXED; Sweet Kiss owns one gAngelSpriteTemplate and "
      + "six gRedHeartBurstSpriteTemplate lifecycles; MOVE_ATTRACT remains distinct with "
      + "projectile/rising hearts, HeartsBackground, SwayMon, and BlendColorCycle\n",
    );
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/attractSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "set 113/FRONTIER_MON_EEVEE is the lowest legal Level-50 carrier; one opposite-gender "
      + "success body reaches attackanimation; accuracy, same gender, genderless, existing "
      + "infatuation, and Oblivious routes select no animation body\n",
    );

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const track = coverage.componentTracks.find((value: { id: string }) =>
      value.id === "red-heart-sweet-kiss");
    expect(track).toEqual({
      id: "red-heart-sweet-kiss",
      components: [
        "asset:ANIM_TAG_RED_HEART",
        "sprite:gRedHeartBurstSpriteTemplate",
        "sprite:gRedHeartProjectileSpriteTemplate",
        "sprite:gRedHeartRisingSpriteTemplate",
        "asset:ANIM_TAG_ANGEL",
        "sprite:gAngelSpriteTemplate",
        "task:AnimTask_SwayMon",
        "task:AnimTask_HeartsBackground",
        "visualCommand:blend_color_cycle",
      ],
      representatives: ["MOVE_SWEET_KISS", "MOVE_ATTRACT"],
      fulfilled: true,
      goal: trackGoal,
    });
    const statuses = Object.fromEntries(coverage.entries
      .filter((entry: { move: string }) => ["MOVE_SWEET_KISS", "MOVE_ATTRACT"]
        .includes(entry.move))
      .map((entry: { move: string; status: string }) => [entry.move, entry.status]));
    expect(statuses).toEqual({ MOVE_SWEET_KISS: "exact", MOVE_ATTRACT: "exact" });
    expect(track.representatives).not.toContain("MOVE_LOVELY_KISS");
  });

  it("pins all four complete bilateral semantic and raw-RGB receipts without thinning a body", () => {
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
    expect(receipts.filter((receipt) => receipt.move === "MOVE_SWEET_KISS")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(318);
    expect(receipts.filter((receipt) => receipt.move === "MOVE_ATTRACT")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(870);
    expect(receipts.reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(1188);
  });

  it("keeps every bilateral body legal, complete, and free of staged battle state", () => {
    for (const expected of receipts) {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      expect(fixture).toMatchObject({
        schema: expected.schema,
        orientation: expected.orientation,
        probe: expected.move === "MOVE_SWEET_KISS"
          ? "tools/compare/sweetKissProbe.py"
          : "tools/compare/attractProbe.py",
        sourceWindow: expected.window,
        evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
        battleState: expected.battleState,
      });
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        seed: 305419898,
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
        gender: expected.attacker.gender,
      });
      expect(attacker.moves).toEqual(Array(4).fill(expected.attacker.move));
      expect(target).toMatchObject({
        species: 95,
        level: 50,
        nature: 0,
        item: 142,
        abilitySlot: 0,
        gender: "male",
      });
      expect(target.moves).toEqual([33, 33, 33, 33]);
      expect(scenario.trace.segments).toHaveLength(4);
      expect(scenario.trace.segments.filter((segment) => segment.buttons.includes("A")))
        .toHaveLength(2);
    }
  });
});
