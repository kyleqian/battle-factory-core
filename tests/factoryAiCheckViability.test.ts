import { describe, expect, it } from "vitest";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";
import { MOVES_BY_ID } from "../src/engine/factoryAiCheckBadMove.ts";

const MOVE_SURF = 57; // EFFECT_HIT -- no if_effect table entry
const MOVE_ROCK_SLIDE = 157; // EFFECT_FLINCH_HIT -- no entry
const MOVE_BODY_SLAM = 34; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_THUNDERBOLT = 85; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_HAZE = 114; // EFFECT_HAZE -- has an entry (AI_CV_Haze, not ported)
const MOVE_TOXIC = 92; // EFFECT_TOXIC -> AI_CV_Toxic

// Neutral speed/stage battlers for the tests above that don't exercise
// AI_CV_SpeedDown -- the describe block below owns that handler's own battlers.
// types/isFirstTurn/evasionStage/accStage/hp/maxHp are irrelevant to these
// no-table-entry/barrier cases but required by the widened battler shape
// (entry 466 added isFirstTurn, entry 467 added evasionStage/accStage, this
// entry adds hp/maxHp).
const NEUTRAL_BATTLER = Object.freeze({
  speed: 100,
  speedStage: 6,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  isFirstTurn: 0,
  evasionStage: 6,
  accStage: 6,
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
  hp: 100,
  maxHp: 100,
  moves: [MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT] as const,
});

describe("AI_CV_Counter (docs/factory-ai-checkviability-ground-truth.md §34)", () => {
  const MOVE_COUNTER = 68;
  const MOVE_MIRROR_COAT = 243;
  const MOVE_TACKLE = 33; // nonzero-power physical
  const MOVE_WATER_GUN = 55; // nonzero-power special

  function counterRun(
    rngValue: number,
    attackerOverrides: Record<string, unknown> = {},
    targetOverrides: Record<string, unknown> = {},
  ) {
    return runCheckViability({
      rng: { value: rngValue, calls: 0 },
      moveId: MOVE_COUNTER,
      attacker: {
        ...NEUTRAL_BATTLER,
        moves: [MOVE_COUNTER, 150, 150, 150] as const,
        ...attackerOverrides,
      },
      target: {
        ...NEUTRAL_BATTLER,
        types: ["TYPE_WATER", "TYPE_WATER"] as const,
        lastUsedMoveId: MOVE_TACKLE,
        ...targetOverrides,
      },
      staleFuncResultFallback: 3,
      drawOrdinalStart: 1,
      reasonPrefix: "counter",
    });
  }

  it.each([
    ["sleep", { isAsleep: true }],
    ["infatuation", { isInfatuated: true }],
    ["confusion", { isConfused: true }],
  ])("%s gate JUMPs immediately to ScoreDown1", (_label, targetOverrides) => {
    expect(counterRun(1, {}, targetOverrides)).toMatchObject({
      kind: "scored",
      scoreDelta: -1,
      draws: [],
      funcResultAfter: 3,
    });
  });

  it("HP >30 and >50 JUMP over both HP rolls", () => {
    const result = counterRun(1, { hp: 100, maxHp: 100 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.kind)).toEqual(["counter-physical-roll"]);
  });

  it("HP <=30 FALLS THROUGH to both HP rolls, driving each random JUMP polarity", () => {
    const jumped = counterRun(31, { hp: 30, maxHp: 100 });
    if (jumped.kind !== "scored") throw new Error("unreachable");
    expect(jumped.draws.slice(0, 2).map((draw) => draw.kind)).toEqual([
      "counter-low-hp-roll",
      "counter-mid-hp-roll",
    ]);
    expect(jumped.draws[0]).toMatchObject({ jumped: true });

    const fellThrough = counterRun(1, { hp: 30, maxHp: 100 });
    if (fellThrough.kind !== "scored") throw new Error("unreachable");
    expect(fellThrough.draws[0]).toMatchObject({ jumped: false });
  });

  it("HP in (30,50] skips the first HP roll and FALLS THROUGH to the second", () => {
    const jumped = counterRun(3, { hp: 40, maxHp: 100 });
    const fellThrough = counterRun(1, { hp: 40, maxHp: 100 });
    if (jumped.kind !== "scored" || fellThrough.kind !== "scored") throw new Error("unreachable");
    expect(jumped.draws[0]).toMatchObject({ kind: "counter-mid-hp-roll", jumped: true });
    expect(fellThrough.draws[0]).toMatchObject({ kind: "counter-mid-hp-roll", jumped: false });
  });

  it("Mirror Coat present JUMPs over last-move/taunt/type gates into the bonus roll", () => {
    const result = counterRun(1, {
      moves: [MOVE_COUNTER, MOVE_MIRROR_COAT, 150, 150],
    }, {
      isTaunted: true,
      lastUsedMoveId: MOVE_WATER_GUN,
    });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.kind)).toEqual(["counter-bonus-roll"]);
    expect(result).toMatchObject({ scoreDelta: 4, funcResultAfter: 3 });
    expect(counterRun(3, {
      moves: [MOVE_COUNTER, MOVE_MIRROR_COAT, 150, 150],
    })).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("nonzero-power physical last move FALLS THROUGH the type gate and drives both roll polarities", () => {
    const jumped = counterRun(3);
    const fellThrough = counterRun(1);
    expect(jumped).toMatchObject({ kind: "scored", scoreDelta: 0 });
    expect(fellThrough).toMatchObject({ kind: "scored", scoreDelta: 1 });
    if (jumped.kind !== "scored" || fellThrough.kind !== "scored") throw new Error("unreachable");
    expect(jumped.draws[0]).toMatchObject({ kind: "counter-physical-roll", jumped: true });
    expect(fellThrough.draws[0]).toMatchObject({ kind: "counter-physical-roll", jumped: false });
  });

  it("nonzero-power special last move JUMPs to ScoreDown1 without a type-tail draw", () => {
    expect(counterRun(1, {}, { lastUsedMoveId: MOVE_WATER_GUN })).toMatchObject({
      kind: "scored",
      scoreDelta: -1,
      draws: [],
    });
  });

  it("Taunt FALLTHROUGH drives its roll; not-taunted JUMPs over it", () => {
    const taunted = counterRun(1, {}, { isTaunted: true });
    const clear = counterRun(1);
    if (taunted.kind !== "scored" || clear.kind !== "scored") throw new Error("unreachable");
    expect(taunted.draws.map((draw) => draw.kind)).toEqual([
      "counter-taunt-roll",
      "counter-physical-roll",
    ]);
    expect(clear.draws.map((draw) => draw.kind)).toEqual(["counter-physical-roll"]);
    const tauntJump = counterRun(3, {}, { isTaunted: true });
    if (tauntJump.kind !== "scored") throw new Error("unreachable");
    expect(tauntJump.draws[0]).toMatchObject({ kind: "counter-taunt-roll", jumped: true });
  });

  it("zero-power path preserves Emerald's non-BUGFIX physical-type JUMPs", () => {
    const type1 = counterRun(1, {}, {
      lastUsedMoveId: 0,
      types: ["TYPE_NORMAL", "TYPE_WATER"],
    });
    const type2 = counterRun(1, {}, {
      lastUsedMoveId: 0,
      types: ["TYPE_WATER", "TYPE_STEEL"],
    });
    expect(type1).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [], funcResultAfter: 0 });
    expect(type2).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [], funcResultAfter: undefined });
  });

  it("zero-power, both-special path drives target-type and bonus roll JUMP/FALLTHROUGH", () => {
    const targetJump = counterRun(31, {}, { lastUsedMoveId: 0 });
    if (targetJump.kind !== "scored") throw new Error("unreachable");
    expect(targetJump.draws).toHaveLength(1);
    expect(targetJump.draws[0]).toMatchObject({ kind: "counter-target-type-roll", jumped: true });

    const fallthrough = counterRun(8, {}, { lastUsedMoveId: 0 });
    if (fallthrough.kind !== "scored") throw new Error("unreachable");
    expect(fallthrough.draws.map((draw) => draw.kind)).toEqual([
      "counter-target-type-roll",
      "counter-bonus-roll",
    ]);
    expect(fallthrough.draws[0]).toMatchObject({ jumped: false });
  });

  it("leaves Haze behind the same generic CV barrier", () => {
    expect(run({ value: 1, calls: 0 }, MOVE_HAZE)).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
    });
  });
});

function run(rng: { value: number; calls: number }, moveId: number) {
  return runCheckViability({
    rng,
    moveId,
    attacker: NEUTRAL_BATTLER,
    target: NEUTRAL_BATTLER,
    drawOrdinalStart: 1,
    reasonPrefix: "test-slot",
  });
}

describe("AI_CheckViability dispatch shell (docs/factory-ai-ground-truth.md §4 item 5)", () => {
  it.each([
    ["Surf (EFFECT_HIT)", MOVE_SURF],
    ["Rock Slide (EFFECT_FLINCH_HIT)", MOVE_ROCK_SLIDE],
    ["Body Slam (EFFECT_PARALYZE_HIT)", MOVE_BODY_SLAM],
    ["Thunderbolt (EFFECT_PARALYZE_HIT)", MOVE_THUNDERBOLT],
  ])("falls through to zero score/zero draws for a no-table-entry move: %s", (_label, moveId) => {
    const rng = { value: 12345, calls: 0 };
    const result = run(rng, moveId);
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: 0 });
  });

  it("halts with a named unsupported-branch barrier for a move whose effect has an if_effect table entry", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_HAZE",
      moveId: MOVE_HAZE,
    });
  });

  it("ports Toxic instead of treating every table effect as a barrier", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_TOXIC);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });
});

describe("AI_CV_Sleep (docs/factory-ai-checkviability-ground-truth.md §29)", () => {
  const MOVE_SING = 47;
  const MOVE_DREAM_EATER = 138;
  const MOVE_NIGHTMARE = 171;

  function sleepRun(rngValue: number, knownMoves: readonly number[]) {
    return runCheckViability({
      rng: { value: rngValue, calls: 0 },
      moveId: MOVE_SING,
      attacker: NEUTRAL_BATTLER,
      target: { ...NEUTRAL_BATTLER, knownMoves },
      drawOrdinalStart: 1,
      reasonPrefix: "sleep",
    });
  }

  it("neither Dream Eater nor Nightmare known: both scans FALL THROUGH, goto End makes zero draws", () => {
    expect(sleepRun(1, [MOVE_SURF])).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it.each([
    ["Dream Eater", [MOVE_DREAM_EATER]],
    ["Nightmare after a nonmatching earlier move", [MOVE_SURF, MOVE_NIGHTMARE]],
  ])("%s reaches the single random site; roll < 128 JUMPs to End and skips +1", (_label, knownMoves) => {
    // seed 3 -> high-half 50515, low byte 83.
    const result = sleepRun(3, knownMoves);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "sleep-roll", succeeded: false });
  });

  it("roll >= 128 FALLS THROUGH and applies +1", () => {
    // seed 1 -> high-half 16838, low byte 198.
    const result = sleepRun(1, [MOVE_DREAM_EATER]);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 1 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "sleep-roll", succeeded: true });
  });

  it("leaves the next unported CV table effect behind the generic barrier", () => {
    expect(run({ value: 1, calls: 0 }, MOVE_HAZE)).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_HAZE",
    });
  });
});

describe("AI_CV_Roar (docs/factory-ai-checkviability-ground-truth.md §30)", () => {
  const MOVE_ROAR = 46;

  function roarRun(rngValue: number, targetOverrides: Record<string, number> = {}) {
    return runCheckViability({
      rng: { value: rngValue, calls: 0 },
      moveId: MOVE_ROAR,
      attacker: NEUTRAL_BATTLER,
      target: { ...NEUTRAL_BATTLER, ...targetOverrides },
      drawOrdinalStart: 1,
      reasonPrefix: "roar",
    });
  }

  it("ATK/DEF/SPATK/SPDEF/EVASION gates each JUMP when that target stage is >8", () => {
    for (const field of ["atkStage", "defStage", "spAtkStage", "spDefStage", "evasionStage"] as const) {
      const result = roarRun(3, { [field]: 9 });
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "roar-roll", succeeded: false });
    }
  });

  it("all five stage gates FALL THROUGH at the exact threshold 8, applying -3 with no draw", () => {
    expect(roarRun(1, {
      atkStage: 8,
      defStage: 8,
      spAtkStage: 8,
      spDefStage: 8,
      evasionStage: 8,
    })).toMatchObject({
      kind: "scored",
      scoreDelta: -3,
      draws: [],
    });
  });

  it("raised-stage roll <128 JUMPs to End and skips +2", () => {
    // seed 3 -> high-half 50515, low byte 83.
    const result = roarRun(3, { atkStage: 9 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws[0]).toMatchObject({ kind: "roar-roll", succeeded: false });
  });

  it("raised-stage roll >=128 FALLS THROUGH and applies +2", () => {
    // seed 1 -> high-half 16838, low byte 198.
    const result = roarRun(1, { evasionStage: 9 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 2 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws[0]).toMatchObject({ kind: "roar-roll", succeeded: true });
  });

  it("leaves Haze behind the same generic CV barrier", () => {
    expect(run({ value: 1, calls: 0 }, MOVE_HAZE)).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_HAZE",
    });
  });
});

describe("AI_CV_Paralyze (docs/factory-ai-checkviability-ground-truth.md §31)", () => {
  const MOVE_THUNDER_WAVE = 86;

  function paralyzeRun(
    rngValue: number,
    attackerOverrides: Record<string, number> = {},
    targetOverrides: Record<string, number> = {},
  ) {
    return runCheckViability({
      rng: { value: rngValue, calls: 0 },
      moveId: MOVE_THUNDER_WAVE,
      attacker: { ...NEUTRAL_BATTLER, speed: 100, ...attackerOverrides },
      target: { ...NEUTRAL_BATTLER, speed: 50, ...targetOverrides },
      drawOrdinalStart: 1,
      reasonPrefix: "paralyze",
    });
  }

  it("target-faster gate JUMPs to the random site; roll <20 JUMPs to End at zero", () => {
    const result = paralyzeRun(13, { speed: 50 }, { speed: 100 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "paralyze-roll", succeeded: false });
  });

  it("target-faster gate JUMPs to the random site; roll >=20 FALLS THROUGH to +3", () => {
    const result = paralyzeRun(1, { speed: 50 }, { speed: 100 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 3 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "paralyze-roll", succeeded: true });
  });

  it("target-not-faster FALLTHROUGH and own HP >70 JUMPs to End at zero", () => {
    expect(paralyzeRun(1, { hp: 71 })).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it.each([70, 1])("target-not-faster and own HP %i%% (not >70) FALL THROUGH to -1", (hp) => {
    expect(paralyzeRun(1, { hp })).toMatchObject({
      kind: "scored",
      scoreDelta: -1,
      draws: [],
    });
  });

  it("an exact Speed tie burns the source turn-order tie draw before following its selected polarity", () => {
    const result = paralyzeRun(1, { speed: 100 }, { speed: 100 });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws[0]).toMatchObject({ kind: "target-faster-tie" });
    expect(result.rng.calls).toBeGreaterThanOrEqual(1);
  });

  it("leaves Haze behind the same generic CV barrier", () => {
    expect(run({ value: 1, calls: 0 }, MOVE_HAZE)).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_HAZE",
    });
  });
});

describe("AI_CV_Confuse (docs/factory-ai-checkviability-ground-truth.md §32)", () => {
  const MOVE_CONFUSE_RAY = 109;

  function confuseRun(rngValue: number, targetHp: number) {
    return runCheckViability({
      rng: { value: rngValue, calls: 0 },
      moveId: MOVE_CONFUSE_RAY,
      attacker: NEUTRAL_BATTLER,
      target: { ...NEUTRAL_BATTLER, hp: targetHp, maxHp: 100 },
      drawOrdinalStart: 1,
      reasonPrefix: "confuse",
    });
  }

  it("target HP >70 JUMPs to End with zero score and zero draws", () => {
    expect(confuseRun(1, 71)).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("target HP 70 FALLS THROUGH; roll <128 JUMPs over the first -1", () => {
    const result = confuseRun(3, 70); // low byte 83
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws[0]).toMatchObject({ kind: "confuse-roll", jumped: true });
  });

  it("roll >=128 FALLS THROUGH to the first -1", () => {
    const result = confuseRun(1, 70); // low byte 198
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -1 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws[0]).toMatchObject({ kind: "confuse-roll", jumped: false });
  });

  it("target HP >50 JUMPs after the roll; exact 50 FALLS THROUGH to the second -1", () => {
    expect(confuseRun(3, 51)).toMatchObject({ kind: "scored", scoreDelta: 0 });
    expect(confuseRun(3, 50)).toMatchObject({ kind: "scored", scoreDelta: -1 });
  });

  it("target HP >30 JUMPs after the second -1; exact 30 FALLS THROUGH to the third -1", () => {
    expect(confuseRun(3, 31)).toMatchObject({ kind: "scored", scoreDelta: -1 });
    expect(confuseRun(3, 30)).toMatchObject({ kind: "scored", scoreDelta: -2 });
  });

  it("leaves Haze behind the same generic CV barrier", () => {
    expect(run({ value: 1, calls: 0 }, MOVE_HAZE)).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_HAZE",
    });
  });
});

describe("AI_CV_Swagger (docs/factory-ai-checkviability-ground-truth.md §33)", () => {
  const MOVE_SWAGGER = 207;
  const MOVE_PSYCH_UP = 244;

  function swaggerRun(input: Readonly<{
    rngValue?: number;
    attackerMoves?: readonly [number, number, number, number];
    battleTurnCount?: number;
    targetAtkStage?: number;
    targetHp?: number;
    staleFuncResultFallback?: 0 | 1 | 2 | 3;
  }> = {}) {
    return runCheckViability({
      rng: { value: input.rngValue ?? 1, calls: 0 },
      moveId: MOVE_SWAGGER,
      attacker: {
        ...NEUTRAL_BATTLER,
        moves: input.attackerMoves ?? [MOVE_SWAGGER, MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM],
        battleTurnCount: input.battleTurnCount,
      },
      target: {
        ...NEUTRAL_BATTLER,
        atkStage: input.targetAtkStage ?? 6,
        hp: input.targetHp ?? 100,
        maxHp: 100,
      },
      staleFuncResultFallback: input.staleFuncResultFallback,
      drawOrdinalStart: 1,
      reasonPrefix: "swagger",
    });
  }

  it("no Psych Up FALLS THROUGH to Swagger's roll; low byte <128 JUMPs over +1 into Confuse", () => {
    const result = swaggerRun({ rngValue: 3 }); // low byte 83
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "swagger-roll", jumped: true });
  });

  it("no Psych Up and low byte >=128 FALLS THROUGH to +1 before the Confuse tail", () => {
    const result = swaggerRun({ rngValue: 1 }); // low byte 198
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 1 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "swagger-roll", jumped: false });
  });

  it("the no-Psych-Up path enters Confuse: target HP <=70 FALLS THROUGH to its independent roll", () => {
    const result = swaggerRun({ rngValue: 1, targetHp: 70 });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.kind)).toEqual(["swagger-roll", "confuse-roll"]);
  });

  it("Psych Up present and target ATK >3 JUMPs directly to -5 without get_turn_count", () => {
    const result = swaggerRun({
      attackerMoves: [MOVE_SWAGGER, MOVE_PSYCH_UP, MOVE_SURF, MOVE_ROCK_SLIDE],
      targetAtkStage: 4,
      battleTurnCount: 2,
      staleFuncResultFallback: 3,
    });
    expect(result).toMatchObject({
      kind: "scored",
      scoreDelta: -5,
      draws: [],
      funcResultAfter: 3,
    });
  });

  it("target ATK exactly 3 FALLS THROUGH to +3; turn count 0 FALLS THROUGH to another +2", () => {
    expect(swaggerRun({
      attackerMoves: [MOVE_SWAGGER, MOVE_PSYCH_UP, MOVE_SURF, MOVE_ROCK_SLIDE],
      targetAtkStage: 3,
      battleTurnCount: 0,
      staleFuncResultFallback: 3,
    })).toMatchObject({
      kind: "scored",
      scoreDelta: 5,
      draws: [],
      funcResultAfter: 0,
    });
  });

  it("after +3, nonzero turn count JUMPs to End and get_turn_count overwrites funcResult", () => {
    expect(swaggerRun({
      attackerMoves: [MOVE_SWAGGER, MOVE_PSYCH_UP, MOVE_SURF, MOVE_ROCK_SLIDE],
      targetAtkStage: 2,
      battleTurnCount: 2,
      staleFuncResultFallback: 0,
    })).toMatchObject({
      kind: "scored",
      scoreDelta: 3,
      draws: [],
      funcResultAfter: 2,
    });
  });

  it("no-Psych-Up path preserves the incoming funcResult carry", () => {
    expect(swaggerRun({ staleFuncResultFallback: 3 })).toMatchObject({
      kind: "scored",
      funcResultAfter: 3,
    });
  });

  it("leaves Haze behind the same generic CV barrier", () => {
    expect(run({ value: 1, calls: 0 }, MOVE_HAZE)).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_HAZE",
    });
  });
});

describe("AI_CV_Toxic (data/battle_ai_scripts.s:1353-1371)", () => {
  function toxicRun(input: Readonly<{
    rngValue?: number;
    attackerHp?: number;
    targetHp?: number;
    moves: readonly [number, number, number, number];
  }>) {
    return runCheckViability({
      rng: { value: input.rngValue ?? 1, calls: 0 },
      moveId: MOVE_TOXIC,
      attacker: { ...NEUTRAL_BATTLER, hp: input.attackerHp ?? 100, moves: input.moves },
      target: { ...NEUTRAL_BATTLER, hp: input.targetHp ?? 100 },
      drawOrdinalStart: 1,
      reasonPrefix: "toxic",
    });
  }

  it("jumps directly to Toxic3 with no attacking moves, then ends with no partner effect", () => {
    const result = toxicRun({ moves: [MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC] });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("applies the first -3 only after a low-HP user roll falls through", () => {
    const result = toxicRun({
      attackerHp: 50,
      targetHp: 100,
      moves: [MOVE_SURF, MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC],
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -3 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toEqual([
      expect.objectContaining({ kind: "toxic-roll-1", randomValue: 16838, jumped: false }),
    ]);
  });

  it("applies both -3 gates in order, then Protect's +2 when all three rolls fall through", () => {
    const result = toxicRun({
      rngValue: 5,
      attackerHp: 50,
      targetHp: 50,
      moves: [MOVE_SURF, 182 /* Protect */, MOVE_TOXIC, MOVE_TOXIC],
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -4 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map(({ kind, randomValue }) => ({ kind, lowByte: randomValue % 256 })))
      .toEqual([
        { kind: "toxic-roll-1", lowByte: 223 },
        { kind: "toxic-roll-2", lowByte: 171 },
        { kind: "toxic-roll-3", lowByte: 229 },
      ]);
  });
});

describe("AI_CV_Protect (data/battle_ai_scripts.s:1894-1932)", () => {
  const MOVE_PROTECT = 182;
  const MOVE_LOCK_ON = 199;

  function protectRun(
    attackerPatch: Record<string, unknown> = {},
    targetPatch: Record<string, unknown> = {},
    rngValue = 1,
  ) {
    return runCheckViability({
      rng: { value: rngValue, calls: 0 },
      moveId: MOVE_PROTECT,
      attacker: { ...NEUTRAL_BATTLER, ...attackerPatch },
      target: { ...NEUTRAL_BATTLER, lastUsedMoveId: MOVE_PROTECT, ...targetPatch },
      drawOrdinalStart: 1,
      reasonPrefix: "protect",
    });
  }

  it("takes the ordinary +2 path and exactly one roll when protectUses is zero", () => {
    const result = protectRun();
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 1 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toEqual([
      expect.objectContaining({ kind: "protect-roll-1", randomValue: 16838, jumped: false }),
    ]);
  });

  it("applies both consecutive-Protect penalties and both source-ordered rolls", () => {
    const result = protectRun({ protectUses: 1 }, {}, 1);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map(({ kind }) => kind)).toEqual(["protect-roll-1", "protect-roll-2"]);
  });

  it("takes Protect3 and scores -2 only when the target's last move was Lock-On", () => {
    const result = protectRun({ isInfatuated: true }, { lastUsedMoveId: MOVE_LOCK_ON });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -2, draws: [] });
  });

  it("uses BattleHistory-known target moves for the Restore HP / Defense Curl early branch", () => {
    const result = protectRun({}, { knownMoves: [105 /* Recover */] });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });
});

const MOVE_STRING_SHOT = 81; // EFFECT_SPEED_DOWN
const MOVE_COTTON_SPORE = 178; // EFFECT_SPEED_DOWN_2 -- same handler, different table entry

// data/battle_ai_scripts.s:1142-1152, docs/factory-ai-checkviability-ground-truth.md §6.
describe("AI_CV_SpeedDown (docs/factory-ai-checkviability-ground-truth.md §6)", () => {
  const SPEED_BATTLER_EXTRAS = Object.freeze({
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });
  const FASTER_USER = Object.freeze({ speed: 120, speedStage: 6, ...SPEED_BATTLER_EXTRAS }); // AI_USER faster -> target NOT faster
  const SLOWER_USER = Object.freeze({ speed: 5, speedStage: 6, ...SPEED_BATTLER_EXTRAS }); // AI_USER slower -> target faster
  const FASTER_TARGET = Object.freeze({ speed: 120, speedStage: 6, ...SPEED_BATTLER_EXTRAS });
  const SLOWER_TARGET = Object.freeze({ speed: 5, speedStage: 6, ...SPEED_BATTLER_EXTRAS });

  it("scores a deterministic -3 with zero draws when the target is not faster (if_target_faster false)", () => {
    const rng = { value: 249_678_687, calls: 0 };
    const result = runCheckViability({
      rng,
      moveId: MOVE_STRING_SHOT,
      attacker: FASTER_USER,
      target: SLOWER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: -3 });
  });

  it("EFFECT_SPEED_DOWN_2 dispatches through the identical handler", () => {
    const rng = { value: 249_678_687, calls: 0 };
    const result = runCheckViability({
      rng,
      moveId: MOVE_COTTON_SPORE,
      attacker: FASTER_USER,
      target: SLOWER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: -3 });
  });

  it("draws exactly one if_random_less_than 70 roll and scores 0 when the target is faster and the roll is < 70", () => {
    // seed 4 -> randomValue 1817>>16&0xffff=... % 256 = 25 (< 70).
    const result = runCheckViability({
      rng: { value: 4, calls: 0 },
      moveId: MOVE_STRING_SHOT,
      attacker: SLOWER_USER,
      target: FASTER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "speed-down-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it("draws exactly one if_random_less_than 70 roll and scores +2 when the target is faster and the roll is >= 70", () => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 70).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_STRING_SHOT,
      attacker: SLOWER_USER,
      target: FASTER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(2);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "speed-down-roll", succeeded: true });
  });

  it("an exact speed tie still burns GetWhoStrikesFirst's own Random() call, but never takes the target-faster branch (Cmd_if_user_goes matches strikesFirst===1 exactly, a tie can only resolve to 0 or 2)", () => {
    const TIED = Object.freeze({ speed: 100, speedStage: 6, ...SPEED_BATTLER_EXTRAS });
    // seed 3 -> tie-roll randomValue 50515 is ODD -> GetWhoStrikesFirst's own
    // `Random() & 1` tie-break would read as "battler2/target strikes" (2),
    // which if_target_faster's `== 1` check still treats as NOT faster.
    const oddTie = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_STRING_SHOT,
      attacker: TIED,
      target: TIED,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(oddTie.kind).toBe("scored");
    if (oddTie.kind !== "scored") throw new Error("unreachable");
    expect(oddTie.scoreDelta).toBe(-3);
    expect(oddTie.draws).toHaveLength(1);
    expect(oddTie.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 2 });
    expect(oddTie.rng.calls).toBe(1);

    // seed 8 -> tie-roll randomValue 3634 is EVEN -> strikesFirst stays 0.
    const evenTie = runCheckViability({
      rng: { value: 8, calls: 0 },
      moveId: MOVE_STRING_SHOT,
      attacker: TIED,
      target: TIED,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(evenTie.kind).toBe("scored");
    if (evenTie.kind !== "scored") throw new Error("unreachable");
    expect(evenTie.scoreDelta).toBe(-3);
    expect(evenTie.draws).toHaveLength(1);
    expect(evenTie.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 0 });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_PURSUIT = 228; // EFFECT_PURSUIT

/** Speed/speedStage/evasionStage/accStage/hp/maxHp are irrelevant to AI_CV_Pursuit -- fixed dummy values, only `types`/`isFirstTurn` vary per test. */
function pursuitBattler(types: readonly [string, string], isFirstTurn: number) {
  return Object.freeze({ speed: 100, speedStage: 6, types, isFirstTurn, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100 });
}

// data/battle_ai_scripts.s:2018-2036, docs/factory-ai-checkviability-ground-truth.md §11.1.
describe("AI_CV_Pursuit (docs/factory-ai-checkviability-ground-truth.md §11.1)", () => {
  const ATTACKER_UNUSED_TYPES = ["TYPE_DARK", "TYPE_DARK"] as const; // AI_CV_Pursuit never reads the attacker's own types

  it("turn 1 (isFirstTurn=2): deterministic zero draws/score, even against a Ghost/Psychic target", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 2),
      target: pursuitBattler(["TYPE_GHOST", "TYPE_PSYCHIC"], 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("turn 2 (isFirstTurn=1): still deterministic zero draws/score against a Ghost target", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 1),
      target: pursuitBattler(["TYPE_GHOST", "TYPE_NORMAL"], 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("turn 3+ (isFirstTurn=0) against a target with neither Ghost nor Psychic typing: zero draws/score (goto End)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 0),
      target: pursuitBattler(["TYPE_NORMAL", "TYPE_NORMAL"], 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it.each([
    ["type1 == GHOST", ["TYPE_GHOST", "TYPE_NORMAL"] as const],
    ["type1 == PSYCHIC", ["TYPE_PSYCHIC", "TYPE_NORMAL"] as const],
    ["type2 == GHOST", ["TYPE_NORMAL", "TYPE_GHOST"] as const],
    ["type2 == PSYCHIC", ["TYPE_NORMAL", "TYPE_PSYCHIC"] as const],
  ])("turn 3+ (isFirstTurn=0), %s: reaches AI_CV_Pursuit2 and draws exactly once", (_label, targetTypes) => {
    // seed 3 -> randomValue 50515 % 256 = 83 (< 128, jumps to End, no bonus).
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 0),
      target: pursuitBattler(targetTypes, 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "pursuit-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it("if_random_less_than 128 roll >= 128: falls through to score +1, exactly one draw", () => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 128).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 0),
      target: pursuitBattler(["TYPE_GHOST", "TYPE_NORMAL"], 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(1);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "pursuit-roll", succeeded: true });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_SLASH = 163; // EFFECT_HIGH_CRITICAL, TYPE_NORMAL
const MOVE_KARATE_CHOP = 2; // EFFECT_HIGH_CRITICAL, TYPE_FIGHTING
const MOVE_BLAZE_KICK = 299; // EFFECT_BLAZE_KICK, TYPE_FIRE
const MOVE_POISON_TAIL = 342; // EFFECT_POISON_TAIL, TYPE_POISON

/** isFirstTurn/evasionStage/accStage/hp/maxHp are irrelevant to AI_CV_HighCrit -- fixed dummy values, only `types` vary per test. */
function highCritBattler(types: readonly [string, string]) {
  return Object.freeze({ speed: 100, speedStage: 6, types, isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100 });
}

// data/battle_ai_scripts.s:1449-1461, docs/factory-ai-checkviability-ground-truth.md §11.2.
describe("AI_CV_HighCrit (docs/factory-ai-checkviability-ground-truth.md §11.2)", () => {
  it("exactly 0.25x (no STAB, double 0.5x resist): deterministic zero draws/score", () => {
    // Slash (Normal) vs Rock+Steel: 40 * 5/10 * 5/10 = 10 = AI_EFFECTIVENESS_x0_25, direct match.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SLASH,
      attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
      target: highCritBattler(["TYPE_ROCK", "TYPE_STEEL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("exactly 0.5x (no STAB, single 0.5x resist -- Onix's real Rock/Ground typing): deterministic zero draws/score", () => {
    // Slash (Normal) vs Rock+Ground: 40 * 5/10 = 20 = AI_EFFECTIVENESS_x0_5, direct match (Ground has no entry, stays 1x).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SLASH,
      attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
      target: highCritBattler(["TYPE_ROCK", "TYPE_GROUND"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("0.5x via the STAB magic-number remap (60*5/10=30 -> AI_EFFECTIVENESS_x0_5): deterministic zero draws/score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SLASH,
      attacker: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]), // STAB
      target: highCritBattler(["TYPE_ROCK", "TYPE_GROUND"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("0.25x via the STAB magic-number remap (60*5/10*5/10=15 -> AI_EFFECTIVENESS_x0_25): deterministic zero draws/score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SLASH,
      attacker: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]), // STAB
      target: highCritBattler(["TYPE_ROCK", "TYPE_STEEL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("exactly 2x (no STAB, single weak, direct match): jumps straight to AI_CV_HighCrit2, roll < 128 -> zero score, one draw", () => {
    // Karate Chop (Fighting) vs Normal (dedup'd Normal/Normal): 40 * 20/10 = 80 = AI_EFFECTIVENESS_x2.
    // seed 3 -> randomValue 50515 % 256 = 83 (< 128).
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_WATER", "TYPE_WATER"]),
      target: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it("exactly 2x, roll >= 128 -> score +1, one draw", () => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 128).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_WATER", "TYPE_WATER"]),
      target: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(1);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll", succeeded: true });
  });

  it("exactly 4x (no STAB, double weak, direct match): jumps straight to AI_CV_HighCrit2, one draw", () => {
    // Karate Chop (Fighting) vs Normal+Rock (both 2x): 40 * 20/10 * 20/10 = 160 = AI_EFFECTIVENESS_x4.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_WATER", "TYPE_WATER"]),
      target: highCritBattler(["TYPE_NORMAL", "TYPE_ROCK"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  it("2x via the STAB magic-number remap (60*20/10=120 -> AI_EFFECTIVENESS_x2): jumps straight to AI_CV_HighCrit2, one draw", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_FIGHTING", "TYPE_FIGHTING"]), // STAB
      target: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  it("4x via the STAB magic-number remap (60*20/10*20/10=240 -> AI_EFFECTIVENESS_x4): jumps straight to AI_CV_HighCrit2, one draw", () => {
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_FIGHTING", "TYPE_FIGHTING"]), // STAB
      target: highCritBattler(["TYPE_NORMAL", "TYPE_ROCK"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  describe("neutral/immune fallthrough (no explicit match -- the doc's own §11.2 quirk: 1 or 2 draws, not fixed)", () => {
    const NEUTRAL_TARGET = ["TYPE_GROUND", "TYPE_GROUND"] as const; // Slash (Normal) has no table entry either direction -> stays 1x
    const IMMUNE_TARGET = ["TYPE_GHOST", "TYPE_GHOST"] as const; // Normal vs Ghost = 0x

    it("first if_random_less_than 128 roll < 128: jumps to End immediately, exactly one draw, zero score", () => {
      // seed 3 -> randomValue 50515 % 256 = 83 (< 128).
      const result = runCheckViability({
        rng: { value: 3, calls: 0 },
        moveId: MOVE_SLASH,
        attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
        target: highCritBattler(NEUTRAL_TARGET),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "high-crit-fallthrough-roll", jumpedToEnd: true });
      expect(result.rng.calls).toBe(1);
    });

    it("first roll >= 128, second roll (AI_CV_HighCrit2's own) < 128: falls through into the second instruction, TWO draws, zero score", () => {
      // seed 1 -> draw1 randomValue 16838 % 256 = 198 (>= 128, falls through);
      // draw2 (from the advanced rngValue) randomValue % 256 = 33 (< 128, jumps to End).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SLASH,
        attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
        target: highCritBattler(NEUTRAL_TARGET),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "high-crit-fallthrough-roll", jumpedToEnd: false });
      expect(result.draws[1]).toMatchObject({ kind: "high-crit-roll", succeeded: false });
      expect(result.rng.calls).toBe(2);
    });

    it("both rolls >= 128: falls through both instructions, TWO draws, score +1", () => {
      // seed 2 -> draw1 randomValue % 256 = 140 (>= 128); draw2 randomValue % 256 = 195 (>= 128).
      const result = runCheckViability({
        rng: { value: 2, calls: 0 },
        moveId: MOVE_SLASH,
        attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
        target: highCritBattler(NEUTRAL_TARGET),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(1);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "high-crit-fallthrough-roll", jumpedToEnd: false });
      expect(result.draws[1]).toMatchObject({ kind: "high-crit-roll", succeeded: true });
    });

    it("0x immune effectiveness falls through the SAME path as neutral (not a fifth explicit branch)", () => {
      const result = runCheckViability({
        rng: { value: 3, calls: 0 },
        moveId: MOVE_SLASH,
        attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
        target: highCritBattler(IMMUNE_TARGET),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "high-crit-fallthrough-roll", jumpedToEnd: true });
    });
  });

  it("EFFECT_BLAZE_KICK dispatches through the identical handler", () => {
    // Blaze Kick (Fire) vs Grass (STAB'd single weak, 60*20/10=120 -> remap x2): jumps straight to AI_CV_HighCrit2.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_BLAZE_KICK,
      attacker: highCritBattler(["TYPE_FIRE", "TYPE_FIRE"]),
      target: highCritBattler(["TYPE_GRASS", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  it("EFFECT_POISON_TAIL dispatches through the identical handler", () => {
    // Poison Tail (Poison) vs Grass (STAB'd single weak, 60*20/10=120 -> remap x2): jumps straight to AI_CV_HighCrit2.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_POISON_TAIL,
      attacker: highCritBattler(["TYPE_POISON", "TYPE_POISON"]),
      target: highCritBattler(["TYPE_GRASS", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_SWIFT = 129; // EFFECT_ALWAYS_HIT

/**
 * speed/speedStage/types/isFirstTurn/hp/maxHp are irrelevant to AI_CV_AlwaysHit --
 * fixed dummy values, only `evasionStage` (read from AI_TARGET) and
 * `accStage` (read from AI_USER) vary per test.
 */
function alwaysHitBattler(evasionStage: number, accStage: number) {
  return Object.freeze({
    speed: 100,
    speedStage: 6,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage,
    accStage,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });
}

// data/battle_ai_scripts.s:1075-1089, docs/factory-ai-checkviability-ground-truth.md §11.3/§12.1.
describe("AI_CV_AlwaysHit (docs/factory-ai-checkviability-ground-truth.md §11.3/§12.1)", () => {
  const NEUTRAL_EVASION = 6; // DEFAULT_STAT_STAGE
  const NEUTRAL_ACC = 6;

  it("neither gate true (evasion<=8, acc>=4): deterministic zero draws/score (goto End)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SWIFT,
      attacker: alwaysHitBattler(NEUTRAL_EVASION, NEUTRAL_ACC),
      target: alwaysHitBattler(NEUTRAL_EVASION, NEUTRAL_ACC),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it.each([
    ["target evasion stage 9 (>8, not >10)", 9, NEUTRAL_ACC],
    ["target evasion stage 10 (>8, not >10)", 10, NEUTRAL_ACC],
    ["user acc stage 3 (<4, not <2)", NEUTRAL_EVASION, 3],
    ["user acc stage 2 (<4, not <2)", NEUTRAL_EVASION, 2],
  ])("%s: reaches AI_CV_AlwaysHit2 directly, roll < 100 -> zero score, one draw", (_label, evasionStage, accStage) => {
    // seed 3 -> randomValue 50515 % 256 = 83 (< 100, jumps to End, no bonus).
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_SWIFT,
      attacker: alwaysHitBattler(NEUTRAL_EVASION, accStage),
      target: alwaysHitBattler(evasionStage, NEUTRAL_ACC),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "always-hit-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it.each([
    ["target evasion stage 9 (>8, not >10)", 9, NEUTRAL_ACC],
    ["target evasion stage 10 (>8, not >10)", 10, NEUTRAL_ACC],
    ["user acc stage 3 (<4, not <2)", NEUTRAL_EVASION, 3],
    ["user acc stage 2 (<4, not <2)", NEUTRAL_EVASION, 2],
  ])("%s: reaches AI_CV_AlwaysHit2 directly, roll >= 100 -> score +1, one draw", (_label, evasionStage, accStage) => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 100).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SWIFT,
      attacker: alwaysHitBattler(NEUTRAL_EVASION, accStage),
      target: alwaysHitBattler(evasionStage, NEUTRAL_ACC),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(1);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "always-hit-roll", succeeded: true });
  });

  describe("ScoreUp1 fallthrough (real finding beyond doc §11.3's own inline gloss -- score +1 does NOT terminate the script, it falls through into AI_CV_AlwaysHit2's own roll)", () => {
    it.each([
      ["target evasion stage 11 (>10)", 11, NEUTRAL_ACC],
      ["target evasion stage 12 (>10)", 12, NEUTRAL_ACC],
      ["user acc stage 1 (<2)", NEUTRAL_EVASION, 1],
      ["user acc stage 0 (<2)", NEUTRAL_EVASION, 0],
    ])("%s: falls through ScoreUp1 into AlwaysHit2, roll < 100 -> score +1 (not +0), exactly one draw (not zero)", (_label, evasionStage, accStage) => {
      // seed 3 -> randomValue 50515 % 256 = 83 (< 100, jumps to End after ScoreUp1's own +1).
      const result = runCheckViability({
        rng: { value: 3, calls: 0 },
        moveId: MOVE_SWIFT,
        attacker: alwaysHitBattler(NEUTRAL_EVASION, accStage),
        target: alwaysHitBattler(evasionStage, NEUTRAL_ACC),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "always-hit-roll", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it.each([
      ["target evasion stage 11 (>10)", 11, NEUTRAL_ACC],
      ["target evasion stage 12 (>10)", 12, NEUTRAL_ACC],
      ["user acc stage 1 (<2)", NEUTRAL_EVASION, 1],
      ["user acc stage 0 (<2)", NEUTRAL_EVASION, 0],
    ])("%s: falls through ScoreUp1 into AlwaysHit2, roll >= 100 -> score +2, exactly one draw", (_label, evasionStage, accStage) => {
      // seed 1 -> randomValue 16838 % 256 = 198 (>= 100).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SWIFT,
        attacker: alwaysHitBattler(NEUTRAL_EVASION, accStage),
        target: alwaysHitBattler(evasionStage, NEUTRAL_ACC),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "always-hit-roll", succeeded: true });
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_VITAL_THROW = 233; // EFFECT_VITAL_THROW

/** types/isFirstTurn/evasionStage/accStage are irrelevant to AI_CV_VitalThrow -- fixed dummy values, only `speed`/`hp`/`maxHp` vary per test. */
function vitalThrowBattler(speed: number, hp: number, maxHp: number) {
  return Object.freeze({
    speed,
    speedStage: 6,
    types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp,
    maxHp,
  });
}

// data/battle_ai_scripts.s:1536-1546, docs/factory-ai-checkviability-ground-truth.md §13.
describe("AI_CV_VitalThrow (docs/factory-ai-checkviability-ground-truth.md §13)", () => {
  it("target strictly faster: deterministic zero draws/score, HP is never even read (goto End before the HP check)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(75, 1, 100), // 1% HP -- would reach VitalThrow2 if the speed gate didn't short-circuit first.
      target: vitalThrowBattler(95, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("an exact speed tie still burns GetWhoStrikesFirst's own Random() call, but never takes the target-faster branch (same Cmd_if_user_goes quirk runCvSpeedDown already pins)", () => {
    // seed 3 -> tie-roll randomValue 50515 is ODD -> strikesFirst=2 (still not 1).
    const oddTie = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 100, 100), // 100% HP -> deterministic End once past the speed gate.
      target: vitalThrowBattler(100, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(oddTie.kind).toBe("scored");
    if (oddTie.kind !== "scored") throw new Error("unreachable");
    expect(oddTie.scoreDelta).toBe(0);
    expect(oddTie.draws).toHaveLength(1);
    expect(oddTie.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 2 });

    // seed 8 -> tie-roll randomValue 3634 is EVEN -> strikesFirst stays 0.
    const evenTie = runCheckViability({
      rng: { value: 8, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 100, 100),
      target: vitalThrowBattler(100, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(evenTie.kind).toBe("scored");
    if (evenTie.kind !== "scored") throw new Error("unreachable");
    expect(evenTie.scoreDelta).toBe(0);
    expect(evenTie.draws).toHaveLength(1);
    expect(evenTie.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 0 });
  });

  it("HP% exactly 61 (>60): deterministic zero draws/score (if_hp_more_than AI_USER, 60 is true)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 61, 100),
      target: vitalThrowBattler(50, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("HP% exactly 60 (NOT >60): reaches the [40,60] midband roll, not the deterministic End", () => {
    // seed 2 -> randomValue % 256 = 140 (< 180, jumps to End), exactly one draw.
    const result = runCheckViability({
      rng: { value: 2, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 60, 100),
      target: vitalThrowBattler(50, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: true });
  });

  it("HP% exactly 40 (NOT <40): reaches the [40,60] midband roll too, same as 60", () => {
    // seed 2 -> randomValue % 256 = 140 (< 180, jumps to End), exactly one draw.
    const result = runCheckViability({
      rng: { value: 2, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 40, 100),
      target: vitalThrowBattler(50, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: true });
  });

  it("HP% exactly 39 (<40): skips the midband roll entirely, straight to AI_CV_VitalThrow2's own roll (one draw, not two)", () => {
    // seed 4 -> randomValue % 256 = 25 (< 50, jumps to End).
    const result = runCheckViability({
      rng: { value: 4, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 39, 100),
      target: vitalThrowBattler(50, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "vital-throw-roll", succeeded: false });
  });

  describe("[40,60] midband roll (if_random_less_than 180)", () => {
    it("roll < 180: jumps straight to End, exactly one draw, zero score", () => {
      // seed 2 -> randomValue % 256 = 140 (< 180).
      const result = runCheckViability({
        rng: { value: 2, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 50, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: true });
    });

    it("roll >= 180, then AI_CV_VitalThrow2's own roll < 50: falls through both instructions, TWO draws, zero score", () => {
      // seed 1 -> draw1 randomValue % 256 = 198 (>= 180, falls through); draw2 randomValue % 256 = 33 (< 50, jumps to End).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 50, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: false });
      expect(result.draws[1]).toMatchObject({ kind: "vital-throw-roll", succeeded: false });
      expect(result.rng.calls).toBe(2);
    });

    it("roll >= 180, then AI_CV_VitalThrow2's own roll >= 50: falls through both instructions, TWO draws, score -1", () => {
      // seed 9 -> draw1 randomValue % 256 = 249 (>= 180); draw2 randomValue % 256 = 53 (>= 50).
      const result = runCheckViability({
        rng: { value: 9, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 50, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-1);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: false });
      expect(result.draws[1]).toMatchObject({ kind: "vital-throw-roll", succeeded: true });
      expect(result.rng.calls).toBe(2);
    });
  });

  describe("<40% direct AI_CV_VitalThrow2 roll (if_random_less_than 50)", () => {
    it("roll < 50: jumps to End, exactly one draw, zero score", () => {
      // seed 4 -> randomValue % 256 = 25 (< 50).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 20, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-roll", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it("roll >= 50: falls through to score -1, exactly one draw", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 50).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 20, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-roll", succeeded: true });
      expect(result.rng.calls).toBe(1);
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_GROWL_ATTACK_DOWN = 45; // EFFECT_ATTACK_DOWN
const MOVE_CHARM = 204; // EFFECT_ATTACK_DOWN_2 -- same handler, different table entry
const PHYSICAL_TYPES = ["TYPE_BUG", "TYPE_ROCK"] as const; // both in AI_CV_AttackDown_PhysicalTypeList (Shuckle-shaped)
const NON_PHYSICAL_TYPES = ["TYPE_GHOST", "TYPE_POISON"] as const; // neither in the list (Haunter-shaped), doc §14.3's own reach fixture

/** isFirstTurn/evasionStage/accStage/speed(Stage) are irrelevant to AI_CV_AttackDown -- fixed dummy values. */
function attackDownAttacker(hp: number, maxHp = 100) {
  return Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp, maxHp,
  });
}
function attackDownTarget(atkStage: number, hp: number, types: readonly [string, string], maxHp = 100) {
  return Object.freeze({
    speed: 100, speedStage: 6, types,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage, defStage: 6, spDefStage: 6, hp, maxHp,
  });
}

// data/battle_ai_scripts.s:1090-1123, docs/factory-ai-checkviability-ground-truth.md §14.1:
// the first CBM-blocked pair's own CV half (AI_CBM_AttackDown, the CBM side,
// is in factoryAiCheckBadMove.test.ts). Every one of the 6 gates and both
// if_random_less_than draw sites, isolated one at a time by holding the
// other gates at their deterministic/skip settings, plus a combined test
// proving DRAW SITE 1 and DRAW SITE 2 are NOT mutually exclusive.
describe("AI_CV_AttackDown (docs/factory-ai-checkviability-ground-truth.md §14.1)", () => {
  it("Gate A held (target ATK stage == DEFAULT_STAT_STAGE) + Gate D skip (target HP > 70) + Gate E match (type1 physical): fully deterministic, zero draws, zero score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_GROWL_ATTACK_DOWN,
      attacker: attackDownAttacker(100),
      target: attackDownTarget(6, 100, PHYSICAL_TYPES),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("EFFECT_ATTACK_DOWN_2 dispatches to the identical handler", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_CHARM,
      attacker: attackDownAttacker(100),
      target: attackDownTarget(6, 100, PHYSICAL_TYPES),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  describe("Gate A / Gate B (target ATK stage != DEFAULT_STAT_STAGE; AI_USER's own HP > 90)", () => {
    it("Gate A not held, Gate C skips DRAW SITE 1 (ATK stage 4 > 3), Gate B skips the second -1 (attacker HP 100% > 90): score -1, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(4, 100, PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -1 });
    });

    it("Gate A not held, Gate B applies the second -1 (attacker HP exactly 90%, NOT >90): score -2, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(90),
        target: attackDownTarget(4, 100, PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gate C / DRAW SITE 1 (if_random_less_than 50, reached only at target ATK stage in [0,3])", () => {
    it("ATK stage 3 (<=3) reaches the roll; roll < 50 skips the -2 (one draw, base -1 from Gate A only)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 50).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100), // > 90 -> Gate B's second -1 skipped
        target: attackDownTarget(3, 100, PHYSICAL_TYPES), // Gate D/E deterministic zero past this
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-1", succeeded: false });
    });

    it("ATK stage 3 (<=3), roll >= 50 applies the -2 (one draw, -1 -2 = -3 total)", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 50).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(3, 100, PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-3);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-1", succeeded: true });
    });
  });

  describe("Gate D (if_hp_more_than AI_TARGET, 70 -- the target's OWN hp, a plain fallthrough)", () => {
    it("target HP exactly 71% (>70): skips the -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 71, PHYSICAL_TYPES), // Gate A held -> only Gate D/E vary
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("target HP exactly 70% (NOT >70): applies the -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 70, PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gates E/F (get_target_type1/2 + if_in_bytes AI_CV_AttackDown_PhysicalTypeList)", () => {
    it("Gate E matches on type1 alone (type2 non-physical): jumps to End, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 100, ["TYPE_BUG", "TYPE_FLYING"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("Gate F matches on type2 alone (type1 non-physical, Gate E misses): jumps to End, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 100, ["TYPE_GHOST", "TYPE_ROCK"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("DRAW SITE 2 (if_random_less_than 50, reached only when neither Gate E nor F matches)", () => {
    it("roll < 50: jumps to End, exactly one draw, zero score (doc §14.3's own reach fixture shape)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 50).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 100, NON_PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-2", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it("roll >= 50: falls through to score -2, exactly one draw", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 50).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 100, NON_PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-2", succeeded: true });
      expect(result.rng.calls).toBe(1);
    });
  });

  it("DRAW SITE 1 and DRAW SITE 2 are NOT mutually exclusive: both fire in one pass, worst-case -8 (-1,-1,-2,-2,-2)", () => {
    // seed 2 -> draw1 randomValue % 256 = 140 (>= 50, succeeds); draw2 randomValue % 256 = 195 (>= 50, succeeds).
    const result = runCheckViability({
      rng: { value: 2, calls: 0 },
      moveId: MOVE_GROWL_ATTACK_DOWN,
      attacker: attackDownAttacker(50), // <= 90 -> Gate B's second -1 applies
      target: attackDownTarget(3, 50, NON_PHYSICAL_TYPES), // ATK stage <=3 -> draw1; HP <=70 -> Gate D -2; non-physical -> draw2
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-8);
    expect(result.draws).toHaveLength(2);
    expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-1", succeeded: true });
    expect(result.draws[1]).toMatchObject({ kind: "attack-down-roll-2", succeeded: true });
    expect(result.rng.calls).toBe(2);
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_TAIL_WHIP_DEFENSE_DOWN = 39; // EFFECT_DEFENSE_DOWN
const MOVE_SCREECH = 103; // EFFECT_DEFENSE_DOWN_2 -- same handler, different table entry

/** speed/speedStage/types/isFirstTurn/evasionStage/accStage/atkStage/spDefStage are irrelevant to AI_CV_DefenseDown -- fixed dummy values. */
function defenseDownAttacker(hp: number, maxHp = 100) {
  return Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp, maxHp,
  });
}
function defenseDownTarget(defStage: number, hp: number, maxHp = 100) {
  return Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage, spDefStage: 6, hp, maxHp,
  });
}

// data/battle_ai_scripts.s:1124-1134, docs/factory-ai-checkviability-ground-truth.md
// §15.1: the second CBM-blocked pair's own CV half (AI_CBM_DefenseDown, the
// CBM side, is in factoryAiCheckBadMove.test.ts). Gate A (attacker's own hp
// < 70) and Gate B (target's own DEF stage > 3, only checked if Gate A is
// false) are two different PATHS INTO THE SAME draw site, not independent
// options -- isolated one at a time below, plus a combined test proving the
// draw site's own -2 and Gate C's own -2 are not mutually exclusive.
describe("AI_CV_DefenseDown (docs/factory-ai-checkviability-ground-truth.md §15.1)", () => {
  it("Gate A false (attacker HP 100% >= 70) + Gate B true (target DEF stage 6 > 3): skips the draw site entirely, zero draws, zero score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_TAIL_WHIP_DEFENSE_DOWN,
      attacker: defenseDownAttacker(100),
      target: defenseDownTarget(6, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("EFFECT_DEFENSE_DOWN_2 dispatches to the identical handler", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SCREECH,
      attacker: defenseDownAttacker(100),
      target: defenseDownTarget(6, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  describe("Gate C (if_hp_more_than AI_TARGET, 70 -- the target's OWN hp, a plain fallthrough past the draw site)", () => {
    it("target HP exactly 71% (>70): skips the -2, still zero draws (Gate A/B both skip the roll)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_TAIL_WHIP_DEFENSE_DOWN,
        attacker: defenseDownAttacker(100),
        target: defenseDownTarget(6, 71),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("target HP exactly 70% (NOT >70): applies the -2, still zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_TAIL_WHIP_DEFENSE_DOWN,
        attacker: defenseDownAttacker(100),
        target: defenseDownTarget(6, 70),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gate A (attacker's own HP < 70): reaches the draw site unconditionally, regardless of Gate B", () => {
    it("roll < 50 skips the -2 (one draw, zero score)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 50).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_TAIL_WHIP_DEFENSE_DOWN,
        attacker: defenseDownAttacker(69), // < 70 -> Gate A true
        target: defenseDownTarget(6, 100), // Gate B would also be true, but Gate A short-circuits past it; Gate C deterministic zero
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "defense-down-roll", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it("roll >= 50 applies the -2 (one draw)", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 50).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_TAIL_WHIP_DEFENSE_DOWN,
        attacker: defenseDownAttacker(69),
        target: defenseDownTarget(6, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "defense-down-roll", succeeded: true });
      expect(result.rng.calls).toBe(1);
    });
  });

  it("Gate A false, Gate B false (target DEF stage 3 <= 3): falls through into the SAME draw site the Gate A path would have jumped to, one draw", () => {
    // seed 1 -> randomValue % 256 = 198 (>= 50).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_TAIL_WHIP_DEFENSE_DOWN,
      attacker: defenseDownAttacker(100), // >= 70 -> Gate A false
      target: defenseDownTarget(3, 100), // <= 3 -> Gate B false, falls through
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-2);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "defense-down-roll", succeeded: true });
  });

  it("the draw site's own -2 and Gate C's own -2 are NOT mutually exclusive: both fire in one pass, total -4", () => {
    // seed 1 -> randomValue % 256 = 198 (>= 50, succeeds).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_TAIL_WHIP_DEFENSE_DOWN,
      attacker: defenseDownAttacker(50), // < 70 -> Gate A true, reaches the draw site
      target: defenseDownTarget(6, 50), // <= 70 -> Gate C applies its own -2 too
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-4);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "defense-down-roll", succeeded: true });
    expect(result.rng.calls).toBe(1);
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_FAKE_TEARS_SPDEF_DOWN = 313; // EFFECT_SPECIAL_DEFENSE_DOWN_2
const MOVE_METAL_SOUND = 319; // EFFECT_SPECIAL_DEFENSE_DOWN_2 -- same handler, different table entry

/** speed/speedStage/types/isFirstTurn/evasionStage/accStage/atkStage/defStage are irrelevant to AI_CV_SpDefDown -- fixed dummy values. */
function spDefDownAttacker(hp: number, maxHp = 100) {
  return Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp, maxHp,
  });
}
function spDefDownTarget(spDefStage: number, hp: number, maxHp = 100) {
  return Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage, hp, maxHp,
  });
}

// data/battle_ai_scripts.s:1186-1196, docs/factory-ai-checkviability-ground-truth.md
// §16.1: the third CBM-blocked pair's own CV half -- byte-for-byte the same
// shape as AI_CV_DefenseDown above with STAT_SPDEF swapped for STAT_DEF, so
// this block mirrors that one's gate coverage exactly (doc §16 itself notes
// the shapes are identical).
describe("AI_CV_SpDefDown (docs/factory-ai-checkviability-ground-truth.md §16.1)", () => {
  it("Gate A false (attacker HP 100% >= 70) + Gate B true (target SPDEF stage 6 > 3): skips the draw site entirely, zero draws, zero score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_FAKE_TEARS_SPDEF_DOWN,
      attacker: spDefDownAttacker(100),
      target: spDefDownTarget(6, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("MOVE_METAL_SOUND dispatches to the identical handler (both are EFFECT_SPECIAL_DEFENSE_DOWN_2)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_METAL_SOUND,
      attacker: spDefDownAttacker(100),
      target: spDefDownTarget(6, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  describe("Gate C (if_hp_more_than AI_TARGET, 70 -- the target's OWN hp, a plain fallthrough past the draw site)", () => {
    it("target HP exactly 71% (>70): skips the -2, still zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_FAKE_TEARS_SPDEF_DOWN,
        attacker: spDefDownAttacker(100),
        target: spDefDownTarget(6, 71),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("target HP exactly 70% (NOT >70): applies the -2, still zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_FAKE_TEARS_SPDEF_DOWN,
        attacker: spDefDownAttacker(100),
        target: spDefDownTarget(6, 70),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gate A (attacker's own HP < 70): reaches the draw site unconditionally, regardless of Gate B", () => {
    it("roll < 50 skips the -2 (one draw, zero score)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 50).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_FAKE_TEARS_SPDEF_DOWN,
        attacker: spDefDownAttacker(69), // < 70 -> Gate A true
        target: spDefDownTarget(6, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-down-roll", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it("roll >= 50 applies the -2 (one draw)", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 50).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_FAKE_TEARS_SPDEF_DOWN,
        attacker: spDefDownAttacker(69),
        target: spDefDownTarget(6, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-down-roll", succeeded: true });
      expect(result.rng.calls).toBe(1);
    });
  });

  it("Gate A false, Gate B false (target SPDEF stage 3 <= 3): falls through into the SAME draw site the Gate A path would have jumped to, one draw", () => {
    // seed 1 -> randomValue % 256 = 198 (>= 50).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_FAKE_TEARS_SPDEF_DOWN,
      attacker: spDefDownAttacker(100), // >= 70 -> Gate A false
      target: spDefDownTarget(3, 100), // <= 3 -> Gate B false, falls through
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-2);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "sp-def-down-roll", succeeded: true });
  });

  it("the draw site's own -2 and Gate C's own -2 are NOT mutually exclusive: both fire in one pass, total -4", () => {
    // seed 1 -> randomValue % 256 = 198 (>= 50, succeeds).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_FAKE_TEARS_SPDEF_DOWN,
      attacker: spDefDownAttacker(50), // < 70 -> Gate A true, reaches the draw site
      target: spDefDownTarget(6, 50), // <= 70 -> Gate C applies its own -2 too
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-4);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "sp-def-down-roll", succeeded: true });
    expect(result.rng.calls).toBe(1);
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_MEDITATE_ATTACK_UP = 96; // EFFECT_ATTACK_UP
const MOVE_SWORDS_DANCE_ATTACK_UP = 14; // EFFECT_ATTACK_UP_2 -- same handler, different table entry

// data/battle_ai_scripts.s:896-913, docs/factory-ai-checkviability-ground-truth.md
// §17.1: the fourth CBM-blocked pair's own CV half (AI_CBM_AttackUp, the CBM
// side, is in factoryAiCheckBadMove.test.ts). Every gate/draw site reads
// AI_USER's OWN state (atkStage/hp) -- AI_TARGET is never read at all, so
// `target` below is a fixed irrelevant dummy. seed 1 -> every roll site's
// randomValue % 256 = 198 (>= every threshold used here: 100/128/40);
// seed 4 -> 25 (< every threshold) -- reused from the AttackDown/DefenseDown/
// SpDefDown blocks' own established seed convention above.
describe("AI_CV_AttackUp (docs/factory-ai-checkviability-ground-truth.md §17.1)", () => {
  function attackUpAttacker(atkStage: number, hp: number, maxHp = 100) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage, defStage: 6, spDefStage: 6, hp, maxHp,
    });
  }
  const IRRELEVANT_TARGET = Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100,
  });

  it("EFFECT_ATTACK_UP_2 (Swords Dance) dispatches to the identical handler", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SWORDS_DANCE_ATTACK_UP,
      attacker: attackUpAttacker(6, 99), // ATK<9 skips site 1; hp!=100 skips site 2; hp>70 ends at Gate C -- fully deterministic
      target: IRRELEVANT_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  describe("Gate A / DRAW SITE 1 (own ATK stage < 9 skips the roll)", () => {
    it("ATK stage 6 (< 9): Gate A skips DRAW SITE 1 entirely -- falls to AttackUp2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(6, 99), // hp != 100 -> Gate B also skips DRAW SITE 2; hp > 70 -> Gate C ends
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("ATK stage 9 (>= 9): reaches DRAW SITE 1; roll < 100 skips the -1 (hp 100 -> Gate C ends right after)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 100).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(9, 100),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-up-roll-1", succeeded: false });
    });

    it("ATK stage 11 (>= 9, < 12 -- 12 is excluded earlier by AI_CBM_AttackUp): roll >= 100 applies the -1", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 100).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(11, 100),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-up-roll-1", succeeded: true });
    });
  });

  describe("Gate B / DRAW SITE 2 (own HP != 100%, an EQUALITY test, skips the roll)", () => {
    it("HP 99% (!= 100): Gate B skips DRAW SITE 2 entirely -- falls to AttackUp3, Gate C ends (99 > 70)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(6, 99),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("HP exactly 100%: reaches DRAW SITE 2; roll < 128 skips the +2 (Gate C ends right after)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 128).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(6, 100),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-up-roll-2", succeeded: false });
    });

    it("HP exactly 100%: roll >= 128 applies the +2", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 128).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(6, 100),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-up-roll-2", succeeded: true });
    });
  });

  describe("Gate C (own HP > 70%: a clean, deterministic stop)", () => {
    it("HP exactly 71% (> 70): stops at AttackUp3, zero further draws/score", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(6, 71),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gate D (own HP < 40%: skips DRAW SITE 3 straight to the -2 penalty)", () => {
    it("HP exactly 39% (< 40): applies -2 with zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(6, 39),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("DRAW SITE 3 (if_random_less_than 40, only reached at own HP in [40,70))", () => {
    it("HP exactly 40% (in band): roll < 40 skips the -2", () => {
      // seed 4 -> randomValue % 256 = 25 (< 40).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(6, 40),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-up-roll-3", succeeded: false });
    });

    it("HP exactly 69% (in band): roll >= 40 applies the -2", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 40).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_MEDITATE_ATTACK_UP,
        attacker: attackUpAttacker(6, 69),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-up-roll-3", succeeded: true });
    });
  });

  it("DRAW SITE 1 and DRAW SITE 3 are NOT mutually exclusive: ATK stage 9 (reaches site 1) + HP 55% (reaches site 3) draws twice", () => {
    // seed 1's RNG chain: draw1 randomValue % 256 = 198 (>= 100, -1); draw3 (next
    // value in the same chain) randomValue % 256 = 33 (< 40, skips the -2).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_MEDITATE_ATTACK_UP,
      attacker: attackUpAttacker(9, 55),
      target: IRRELEVANT_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-1);
    expect(result.draws).toHaveLength(2);
    expect(result.draws[0]).toMatchObject({ kind: "attack-up-roll-1", succeeded: true });
    expect(result.draws[1]).toMatchObject({ kind: "attack-up-roll-3", succeeded: false });
    expect(result.rng.calls).toBe(2);
  });

  it("Gate B's own DRAW SITE 2 can NEVER combine with DRAW SITE 3: HP==100 forces Gate C true immediately after", () => {
    // hp must be exactly 100 to reach DRAW SITE 2 at all (Gate B is an
    // equality test) -- and 100 > 70 makes Gate C a guaranteed stop right
    // after, so this path structurally can never also reach DRAW SITE 3.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_MEDITATE_ATTACK_UP,
      attacker: attackUpAttacker(6, 100),
      target: IRRELEVANT_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "attack-up-roll-2" });
  });
});

const MOVE_HARDEN_DEFENSE_UP = 106; // EFFECT_DEFENSE_UP
const MOVE_ACID_ARMOR_DEFENSE_UP_2 = 151; // EFFECT_DEFENSE_UP_2 -- same handler, different table entry
const MOVE_BULK_UP_DEFENSE_UP = 339; // EFFECT_BULK_UP -- CV side dispatches to the SAME AI_CV_DefenseUp
const MOVE_SPLASH_ZERO_POWER = 150; // power 0 -- Gate E true, same code path as the untouched MOVE_NONE default
const MOVE_VITAL_THROW_PHYSICAL_LAST = 233; // power 70, Fighting -- IN AI_CV_DefenseUp_PhysicalTypes
const MOVE_DRAGON_RAGE_NONPHYSICAL_LAST = 82; // power 1 (fixed-damage placeholder), Dragon -- NOT in the list

// data/battle_ai_scripts.s:915-942, docs/factory-ai-checkviability-ground-truth.md
// §18.1: the fifth CBM-blocked pair's own CV half (AI_CBM_DefenseUp/AI_CBM_BulkUp,
// the CBM side, are in factoryAiCheckBadMove.test.ts). Gates A/B/DRAW SITE 1/2
// are AttackUp's own shape with STAT_DEF swapped for STAT_ATK -- not
// re-tested exhaustively here beyond one smoke case each; this block's own
// focus is Gate C's inversion and the target's-last-move Gates E/F, the two
// shapes with no AttackUp precedent. seed 1 -> randomValue % 256 = 198 (>=
// every threshold except 200); seed 4 -> 25 (< every threshold); seed 5 ->
// 223 (>= 200, the one case seed 1 can't cover).
describe("AI_CV_DefenseUp (docs/factory-ai-checkviability-ground-truth.md §18.1)", () => {
  function defenseUpAttacker(defStage: number, hp: number, maxHp = 100) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage, spDefStage: 6, hp, maxHp,
    });
  }
  function defenseUpTarget(lastUsedMoveId: number) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100,
      lastUsedMoveId,
    });
  }

  it("EFFECT_DEFENSE_UP_2 (Acid Armor) and EFFECT_BULK_UP (Bulk Up) both dispatch to the identical handler", () => {
    for (const moveId of [MOVE_ACID_ARMOR_DEFENSE_UP_2, MOVE_BULK_UP_DEFENSE_UP]) {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId,
        attacker: defenseUpAttacker(6, 65), // DEF<9 skips site 1; hp!=100 skips site 2; hp<70 skips site 3 straight to Gate D
        target: defenseUpTarget(MOVE_SPLASH_ZERO_POWER), // hp 65 >= 40 -> Gate D false -> reaches Gate E: power 0 -> site 5
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-5" });
    }
  });

  describe("Gate A / DRAW SITE 1 (own DEF stage < 9 skips the roll, same shape as AttackUp's Gate A)", () => {
    it("DEF stage 9 (>= 9): reaches DRAW SITE 1; roll >= 100 applies the -1", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 100).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(9, 65), // hp 65 -> Gate C true (hp<70) -> straight to Gate D (false, 65>=40) -> Gate E
        target: defenseUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      // seed 1's RNG chain: draw1 = 198 (>= 100, -1); draw5 (next value) = 33 (< 60, no further score).
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-1", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "defense-up-roll-5", succeeded: false });
      expect(result.scoreDelta).toBe(-1);
    });
  });

  describe("Gate B / DRAW SITE 2 (own HP != 100% skips the roll, same shape as AttackUp's Gate B)", () => {
    it("HP exactly 100%: reaches DRAW SITE 2; roll >= 128 applies the +2 (then Gate C: hp>=70 -> DRAW SITE 3 too)", () => {
      // seed 1's chain: draw2 = 198 (>= 128, +2); draw3 (next) = 33 (< 200, stops at End).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 100),
        target: defenseUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-2", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "defense-up-roll-3", succeeded: false });
      expect(result.scoreDelta).toBe(2);
    });
  });

  describe("Gate C (INVERTED vs AttackUp: own HP < 70% jumps straight into DefenseUp4, skipping DRAW SITE 3)", () => {
    it("HP exactly 69% (< 70): DRAW SITE 3 skipped entirely -- Gate D false (69 >= 40) -- falls to Gate E", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 69),
        target: defenseUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-5" });
    });

    it("HP exactly 70% (>= 70): reaches DRAW SITE 3; roll < 200 stops immediately (own draw only, no Gate D/E/F reached)", () => {
      // seed 1 -> randomValue % 256 = 198 (< 200).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 70),
        target: defenseUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-3", succeeded: false });
    });

    it("HP exactly 70% (>= 70): roll >= 200 falls through to DefenseUp4/Gate E instead of stopping", () => {
      // seed 5 -> randomValue % 256 = 223 (>= 200).
      const result = runCheckViability({
        rng: { value: 5, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 70),
        target: defenseUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-3", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "defense-up-roll-5" });
    });
  });

  describe("Gate D (own HP < 40%: skips straight to the -2 penalty, same shape as AttackUp's Gate D)", () => {
    it("HP exactly 39% (< 40, reached via the direct Gate C jump since 39 < 70): applies -2 with zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 39),
        target: defenseUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gates E/F (the TARGET's own last-used move power/type, not AI_USER's)", () => {
    it("last move power == 0 (Splash): Gate E routes to DefenseUp5's own DRAW SITE 5, skipping Gate F entirely", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 50),
        target: defenseUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-5", succeeded: false });
    });

    // DRAW SITE 4 and DRAW SITE 5 are a CHAINED pair, not two independent
    // alternatives (docs/factory-ai-draw-discrepancy-probe.md §4): DRAW SITE
    // 4's own failure (roll >= 60) falls straight through into DRAW SITE 5's
    // own roll with no gate between them, and the -2 penalty only fires if
    // THAT roll also fails (roll >= 60). Three outcomes, one seed each (all
    // reuse this file's own established seed convention): pass@4 (seed 4:
    // 25 < 60, stops after 1 draw); fail@4+pass@5 (seed 1: 198 >= 60 chains,
    // then 33 < 60 stops, 2 draws, no penalty); fail@4+fail@5 (seed 5: 223
    // >= 60 chains, then 171 >= 60, 2 draws, -2 penalty).
    it("last move power != 0, type IN the physical list (Vital Throw, Fighting): pass@4 -- roll < 60 stops with a single draw, no penalty", () => {
      // seed 4 -> randomValue % 256 = 25 (< 60, stops here).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 50),
        target: defenseUpTarget(MOVE_VITAL_THROW_PHYSICAL_LAST),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-4", succeeded: false });
    });

    it("last move power != 0, type IN the physical list: fail@4+pass@5 -- DRAW SITE 4's own failure falls through to DRAW SITE 5, whose own roll < 60 still stops with no penalty", () => {
      // seed 1's chain: draw4 = 198 (>= 60, falls through); draw5 (next) = 33 (< 60, stops).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 50),
        target: defenseUpTarget(MOVE_VITAL_THROW_PHYSICAL_LAST),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-4", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "defense-up-roll-5", succeeded: false });
    });

    it("last move power != 0, type IN the physical list: fail@4+fail@5 -- only a SECOND failed roll applies the -2 penalty", () => {
      // seed 5's chain: draw4 = 223 (>= 60, falls through); draw5 (next) = 171 (>= 60, applies -2).
      const result = runCheckViability({
        rng: { value: 5, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 50),
        target: defenseUpTarget(MOVE_VITAL_THROW_PHYSICAL_LAST),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-4", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "defense-up-roll-5", succeeded: true });
    });

    it("last move power != 0, type NOT in the physical list (Dragon Rage, Dragon): Gate F jumps straight to the -2, skipping BOTH remaining draw sites", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 50),
        target: defenseUpTarget(MOVE_DRAGON_RAGE_NONPHYSICAL_LAST),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });

    it("omitted lastUsedMoveId defaults to MOVE_NONE (0), the real battle-start default -- same code path as a genuine 0-power last move (doc §18.2)", () => {
      const bareTarget = Object.freeze({
        speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
        isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100,
      });
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_HARDEN_DEFENSE_UP,
        attacker: defenseUpAttacker(6, 50),
        target: bareTarget,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "defense-up-roll-5" });
    });
  });
});

// data/battle_ai_scripts.s:1198-1234, docs/factory-ai-checkviability-ground-truth.md
// §19.1: the sixth CBM-blocked pair's own CV half, and the largest ported
// handler in this doc (7 if_random_less_than sites). Two RNG seeds are used
// throughout: seed 1's first roll is 198 (>= every threshold used here, so
// it always takes the "succeeded" branch for a single isolated draw), seed
// 4's first roll is 25 (< every threshold, so it always takes the "skipped"
// branch) -- computed directly from `advanceRngValue`, same convention the
// DefenseUp block above already uses for its own seed choices.
describe("AI_CV_AccuracyDown (docs/factory-ai-checkviability-ground-truth.md §19.1)", () => {
  const MOVE_SAND_ATTACK = 28; // EFFECT_ACCURACY_DOWN
  const MOVE_SMOKESCREEN = 108; // EFFECT_ACCURACY_DOWN -- same handler, different real move

  function accDownBattler(overrides: Record<string, unknown> = {}) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6,
      hp: 100, maxHp: 100,
      ...overrides,
    });
  }

  it("EFFECT_ACCURACY_DOWN dispatches identically for every real move using it (Sand Attack, Smokescreen)", () => {
    for (const moveId of [MOVE_SAND_ATTACK, MOVE_SMOKESCREEN]) {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId,
        attacker: accDownBattler({ hp: 71 }), // Gate H (71 > 70) stops the whole tail; A-G all skip too
        target: accDownBattler(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    }
  });

  it("EFFECT_ACCURACY_DOWN_2 is a vestigial constant with zero real moves (doc §19.1) -- confirmed absent from the generated move table, not independently dispatch-testable through a real move ID", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_ACCURACY_DOWN_2")).toBe(false);
  });

  describe("Gates A/B / DRAW SITE 1 (either battler's own HP band reaches it)", () => {
    it("Gate A: opponent's own HP 65% (< 70) reaches DRAW SITE 1 directly; roll >= 100 applies the -1", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 65 }),
        target: accDownBattler(), // hp 100 -> Gate H would stop anyway after site1 either way
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-1", succeeded: true });
      expect(result.scoreDelta).toBe(-1);
    });

    it("Gate A false, Gate B: target's own HP exactly 70% (<= 70) falls through into the SAME DRAW SITE 1; roll < 100 skips the -1", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 100 }),
        target: accDownBattler({ hp: 70 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-1", succeeded: false });
      expect(result.scoreDelta).toBe(0);
    });

    it("Gate A false, Gate B true (target HP 71% > 70): DRAW SITE 1 skipped entirely -- 0 draws (also the doc's own control-fixture shape once Gate H stops the tail too)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 100 }),
        target: accDownBattler({ hp: 71 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gate C / DRAW SITE 2 (opponent's own ACC stage <= 4 reaches it; > 4, the battle-start default, skips)", () => {
    it("ACC stage 4 (<= 4): reaches DRAW SITE 2; roll >= 80 applies the -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ accStage: 4 }), // hp 100 -> Gates A/B skip site 1
        target: accDownBattler(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-2", succeeded: true });
      expect(result.scoreDelta).toBe(-2);
    });

    it("ACC stage 5 (> 4): DRAW SITE 2 skipped -- 0 draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ accStage: 5 }),
        target: accDownBattler(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gates D/E/F/G / DRAW SITEs 3-6 (four independent status flags, NOT mutually exclusive -- no goto after any of their own score, so every one is evaluated regardless of the others)", () => {
    it("Gate D: target toxic-poisoned reaches DRAW SITE 3; roll >= 70 applies +2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler(),
        target: accDownBattler({ isToxicPoisoned: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-3", succeeded: true });
      expect(result.scoreDelta).toBe(2);
    });

    it("Gate D false (not toxic-poisoned): DRAW SITE 3 skipped -- 0 draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler(),
        target: accDownBattler(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("Gate E: target leech-seeded reaches DRAW SITE 4; roll < 70 skips the +2", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler(),
        target: accDownBattler({ isLeechSeeded: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-4", succeeded: false });
      expect(result.scoreDelta).toBe(0);
    });

    it("Gate F: OPPONENT's own rooted (Ingrain) flag reaches DRAW SITE 5 -- the target's copy is irrelevant here; roll >= 128 applies +1", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ isRooted: true }),
        target: accDownBattler({ isRooted: false }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-5", succeeded: true });
      expect(result.scoreDelta).toBe(1);
    });

    it("Gate F false: target's own rooted flag is NEVER read by this gate -- 0 draws despite the target being rooted", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ isRooted: false }),
        target: accDownBattler({ isRooted: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("Gate G: target cursed reaches DRAW SITE 6; roll >= 70 applies +2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler(),
        target: accDownBattler({ isCursed: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-6", succeeded: true });
      expect(result.scoreDelta).toBe(2);
    });

    it("all four status flags set simultaneously: DRAW SITEs 3-6 ALL fire, in order, in the SAME pass (not mutually exclusive, same finding as AttackDown's own sites 1/2)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler(),
        target: accDownBattler({
          isToxicPoisoned: true,
          isLeechSeeded: true,
          isCursed: true,
        }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // seed 1's chain: 198 (site3, >=70 -> +2), 33 (site4, <70 -> +0),
      // 238 (site5 needs attacker isRooted too -- see below), ...
      // Gate F reads the OPPONENT's own rooted flag, not the target's, so a
      // target-only status object does NOT reach DRAW SITE 5 here.
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(3);
      expect(result.draws.map((d) => d.kind)).toEqual([
        "accuracy-down-roll-3",
        "accuracy-down-roll-4",
        "accuracy-down-roll-6",
      ]);
      expect(result.draws.map((d) => (d as { succeeded: boolean }).succeeded)).toEqual([true, false, true]);
      expect(result.scoreDelta).toBe(2 + 0 + 2);
    });

    it("all FIVE gates (D/E/F/G plus the opponent's own rooted flag) fire together -- the full non-mutual-exclusivity shape", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ isRooted: true }),
        target: accDownBattler({
          isToxicPoisoned: true,
          isLeechSeeded: true,
          isCursed: true,
        }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // seed 1's chain: 198 (site3 +2), 33 (site4 +0), 238 (site5, >=128 -> +1), 183 (site6, >=70 -> +2).
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(4);
      expect(result.draws.map((d) => d.kind)).toEqual([
        "accuracy-down-roll-3",
        "accuracy-down-roll-4",
        "accuracy-down-roll-5",
        "accuracy-down-roll-6",
      ]);
      expect(result.scoreDelta).toBe(2 + 0 + 1 + 2);
    });
  });

  describe("Gate H (opponent's own HP > 70%: clean stop, skips Gates I/J/K and DRAW SITE 7 entirely)", () => {
    it("opponent HP exactly 100%: the tail never runs, even with the target's ACC stage already lowered", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 100 }),
        target: accDownBattler({ accStage: 5, hp: 71 }), // hp 71 also skips site 1 via Gate B
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gate I (target's own ACC stage back at DEFAULT_STAT_STAGE: clean stop)", () => {
    it("opponent HP exactly 70% (Gate H false), target ACC stage still 6 (neutral): stops at Gate I, 0 draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 70 }),
        target: accDownBattler({ hp: 100 }), // > 70 -> Gate B skips site 1 too
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("target ACC stage 5 (already lowered by this SAME dispatch move this turn, doc §19.1/§19.2): does NOT stop -- falls through toward DRAW SITE 7", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 70 }),
        target: accDownBattler({ hp: 100, accStage: 5 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-7" });
    });
  });

  describe("Gates J/K (either battler < 40% HP skips DRAW SITE 7 straight to the deterministic -2)", () => {
    it("Gate J: opponent's own HP 35% (< 40) -- deterministic -2, no DRAW SITE 7 (Gate A's own <70% threshold also reaches DRAW SITE 1 first, a real overlap since 40 < 70)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 35 }),
        target: accDownBattler({ hp: 100, accStage: 5 }), // accStage 5 keeps Gate I from stopping first
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1); // DRAW SITE 1 only -- DRAW SITE 7 is skipped by Gate J
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-1", succeeded: true }); // roll 198 >= 100
      expect(result.scoreDelta).toBe(-1 + -2); // DRAW SITE 1's own -1, plus the tail's deterministic -2
    });

    it("Gate K: target's own HP 35% (< 40) -- deterministic -2, no DRAW SITE 7 (same real overlap via Gate B's <=70% threshold)", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 70 }),
        target: accDownBattler({ hp: 35, accStage: 5 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-1", succeeded: false }); // roll 25 < 100
      expect(result.scoreDelta).toBe(0 + -2);
    });
  });

  describe("DRAW SITE 7 (both battlers in [40,70]% HP -- OPPOSITE polarity from every other site in this handler)", () => {
    it("roll >= 70 (fall through): applies the -2, same destination Gates J/K jump to directly", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 50 }), // [40,70) -> reaches site 1 via Gate A too
        target: accDownBattler({ hp: 50, accStage: 5 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      // seed 1: draw1 (site1, roll198>=100 -> -1), draw7 (next roll 33, <70 -> jump, no score).
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-1", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "accuracy-down-roll-7", succeeded: false });
      expect(result.scoreDelta).toBe(-1); // DRAW SITE 7's own jump applies NO further score
    });

    it("roll < 70 (jump to End): NO further score change from DRAW SITE 7 itself", () => {
      const result = runCheckViability({
        rng: { value: 3, calls: 0 },
        moveId: MOVE_SAND_ATTACK,
        attacker: accDownBattler({ hp: 50 }),
        target: accDownBattler({ hp: 50, accStage: 5 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      // seed 3's chain: 83 (site1, >=100? no, 83<100 -> skip), 102 (site7, >=70 -> apply -2).
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "accuracy-down-roll-1", succeeded: false });
      expect(result.draws[1]).toMatchObject({ kind: "accuracy-down-roll-7", succeeded: true });
      expect(result.scoreDelta).toBe(-2);
    });
  });
});

const MOVE_AGILITY_SPEED_UP_2 = 97; // EFFECT_SPEED_UP_2 -- EFFECT_SPEED_UP itself has no real move

// data/battle_ai_scripts.s:956-965, docs/factory-ai-checkviability-ground-truth.md
// §20.1: the seventh CBM-blocked pair's own CV half (AI_CBM_SpeedUp, the CBM
// side, is in factoryAiCheckBadMove.test.ts). SAME if_target_faster gate and
// tie-break machinery as AI_CV_SpeedDown above (doc §20.1 cites §6, not
// AttackUp, as the true structural sibling) -- only the fallthrough score
// differs (+3 here vs SpeedDown's own +2); the deterministic branch's -3 is
// identical in both.
describe("AI_CV_SpeedUp (docs/factory-ai-checkviability-ground-truth.md §20.1)", () => {
  const SPEED_BATTLER_EXTRAS = Object.freeze({
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });
  const FASTER_USER = Object.freeze({ speed: 120, speedStage: 6, ...SPEED_BATTLER_EXTRAS }); // AI_USER faster -> target NOT faster
  const SLOWER_USER = Object.freeze({ speed: 5, speedStage: 6, ...SPEED_BATTLER_EXTRAS }); // AI_USER slower -> target faster
  const FASTER_TARGET = Object.freeze({ speed: 120, speedStage: 6, ...SPEED_BATTLER_EXTRAS });
  const SLOWER_TARGET = Object.freeze({ speed: 5, speedStage: 6, ...SPEED_BATTLER_EXTRAS });

  it("EFFECT_SPEED_UP itself is unused by any real move (like EFFECT_ACCURACY_DOWN_2, doc §19.1) -- confirmed absent from the generated move table", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_SPEED_UP")).toBe(false);
  });

  it("scores a deterministic -3 with zero draws when the target is not faster (if_target_faster false)", () => {
    const rng = { value: 249_678_687, calls: 0 };
    const result = runCheckViability({
      rng,
      moveId: MOVE_AGILITY_SPEED_UP_2,
      attacker: FASTER_USER,
      target: SLOWER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: -3 });
  });

  it("draws exactly one if_random_less_than 70 roll and scores 0 when the target is faster and the roll is < 70", () => {
    // seed 4 -> randomValue % 256 = 25 (< 70).
    const result = runCheckViability({
      rng: { value: 4, calls: 0 },
      moveId: MOVE_AGILITY_SPEED_UP_2,
      attacker: SLOWER_USER,
      target: FASTER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "speed-up-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it("draws exactly one if_random_less_than 70 roll and scores +3 when the target is faster and the roll is >= 70 (SpeedDown's own sibling site scores +2 here)", () => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 70).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_AGILITY_SPEED_UP_2,
      attacker: SLOWER_USER,
      target: FASTER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(3);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "speed-up-roll", succeeded: true });
  });

  it("an exact speed tie still burns GetWhoStrikesFirst's own Random() call, but never takes the target-faster branch", () => {
    const TIED = Object.freeze({ speed: 100, speedStage: 6, ...SPEED_BATTLER_EXTRAS });
    // seed 3 -> tie-roll randomValue 50515 is ODD -> strikesFirst resolves to 2 (target), still not === 1.
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_AGILITY_SPEED_UP_2,
      attacker: TIED,
      target: TIED,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-3);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 2 });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_GROWTH_SPATK_UP = 74; // EFFECT_SPECIAL_ATTACK_UP
const MOVE_TAIL_GLOW_SPATK_UP_2 = 294; // EFFECT_SPECIAL_ATTACK_UP_2 -- same handler, different table entry

// data/battle_ai_scripts.s:967-983, docs/factory-ai-checkviability-ground-truth.md
// §21.1: the eighth CBM-blocked pair's own CV half (AI_CBM_SpAtkUp, the CBM
// side, is in factoryAiCheckBadMove.test.ts). Byte-for-byte AI_CV_AttackUp's
// own gate topology (§17.1) with STAT_SPATK for STAT_ATK -- reusing that
// block's own seed convention (seed 1 -> every roll site's randomValue % 256
// = 198; seed 4 -> 25) -- EXCEPT DRAW SITE 3's threshold is 70, not 40 (doc
// §21.1's own citation-level correction), so seed 1/4's roll of 198/25
// against threshold 70 flips DRAW SITE 3's own succeeded/skip verdict
// relative to AttackUp's own tests at the same seeds -- asserted explicitly
// below rather than assumed transferable.
describe("AI_CV_SpAtkUp (docs/factory-ai-checkviability-ground-truth.md §21.1)", () => {
  function spAtkUpAttacker(spAtkStage: number, hp: number, maxHp = 100) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, spAtkStage, hp, maxHp,
    });
  }
  const IRRELEVANT_TARGET = Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100,
  });

  it("EFFECT_SPECIAL_ATTACK_UP_2 (Tail Glow) dispatches to the identical handler", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_TAIL_GLOW_SPATK_UP_2,
      attacker: spAtkUpAttacker(6, 99), // SPATK<9 skips site 1; hp!=100 skips site 2; hp>70 ends at Gate C -- fully deterministic
      target: IRRELEVANT_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("omitted spAtkStage defaults to DEFAULT_STAT_STAGE (6, < 9): Gate A skips DRAW SITE 1", () => {
    const { spAtkStage: _omit, ...withoutSpAtkStage } = spAtkUpAttacker(6, 99);
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_GROWTH_SPATK_UP,
      attacker: withoutSpAtkStage,
      target: IRRELEVANT_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  describe("Gate A / DRAW SITE 1 (own SPATK stage < 9 skips the roll)", () => {
    it("SPATK stage 9 (>= 9): reaches DRAW SITE 1; roll < 100 skips the -1 (hp 100 -> Gate C ends right after)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 100).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_GROWTH_SPATK_UP,
        attacker: spAtkUpAttacker(9, 100),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-atk-up-roll-1", succeeded: false });
    });

    it("SPATK stage 11 (>= 9, < 12): roll >= 100 applies the -1", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 100).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWTH_SPATK_UP,
        attacker: spAtkUpAttacker(11, 100),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-atk-up-roll-1", succeeded: true });
    });
  });

  describe("Gate B / DRAW SITE 2 (own HP != 100%, an EQUALITY test, skips the roll)", () => {
    it("HP exactly 100%: reaches DRAW SITE 2; roll < 128 skips the +2 (Gate C ends right after)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 128).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_GROWTH_SPATK_UP,
        attacker: spAtkUpAttacker(6, 100),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-atk-up-roll-2", succeeded: false });
    });

    it("HP exactly 100%: roll >= 128 applies the +2", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 128).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWTH_SPATK_UP,
        attacker: spAtkUpAttacker(6, 100),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-atk-up-roll-2", succeeded: true });
    });
  });

  describe("Gate D (own HP < 40%: skips DRAW SITE 3 straight to the -2 penalty)", () => {
    it("HP exactly 39% (< 40): applies -2 with zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWTH_SPATK_UP,
        attacker: spAtkUpAttacker(6, 39),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("DRAW SITE 3 (if_random_less_than 70, NOT AttackUp's own 40 -- doc §21.1's citation-level correction)", () => {
    it("HP exactly 55% (in [40,70) band): roll < 70 skips the -2 (seed 4 -> randomValue % 256 = 25)", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_GROWTH_SPATK_UP,
        attacker: spAtkUpAttacker(6, 55),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-atk-up-roll-3", succeeded: false });
    });

    it("HP exactly 55% (in band): roll >= 70 applies the -2 (seed 1 -> randomValue % 256 = 198 -- this SAME roll value would have skipped AttackUp's own threshold-40 site, but here it applies, confirming the two sites are NOT interchangeable)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWTH_SPATK_UP,
        attacker: spAtkUpAttacker(6, 55),
        target: IRRELEVANT_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-atk-up-roll-3", succeeded: true });
    });
  });

  it("DRAW SITE 1 and DRAW SITE 3 are NOT mutually exclusive: SPATK stage 9 (reaches site 1) + HP 55% (reaches site 3) draws twice", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_GROWTH_SPATK_UP,
      attacker: spAtkUpAttacker(9, 55),
      target: IRRELEVANT_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws[0]).toMatchObject({ kind: "sp-atk-up-roll-1" });
    expect(result.draws[1]).toMatchObject({ kind: "sp-atk-up-roll-3" });
    expect(result.rng.calls).toBe(2);
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_COSMIC_POWER_SPDEF_UP = 322; // EFFECT_COSMIC_POWER
const MOVE_CALM_MIND_SPDEF_UP = 347; // EFFECT_CALM_MIND
const MOVE_SEISMIC_TOSS_PHYSICAL_LAST = 69; // power 1 (fixed-damage placeholder), Fighting -- IN AI_CV_DefenseUp_PhysicalTypes

// data/battle_ai_scripts.s:986-1013, docs/factory-ai-checkviability-ground-truth.md
// §22.1: the ninth CBM-blocked pair's own CV half -- the single shared
// AI_CV_SpDefUp target for EFFECT_SPECIAL_DEFENSE_UP(_2)/EFFECT_COSMIC_POWER/
// EFFECT_CALM_MIND (AI_CBM_CosmicPower/AI_CBM_CalmMind, the CBM side, are in
// factoryAiCheckBadMove.test.ts). Gates A/B/C/D/DRAW SITE 1/2/3 are
// AI_CV_DefenseUp's own shape with STAT_DEF swapped for STAT_SPDEF -- not
// re-tested exhaustively here beyond one smoke case each; this block's own
// focus is Gate F's INVERTED polarity (the one real structural break vs
// DefenseUp), reusing the same seed convention DefenseUp's own block
// established (seed 1 -> randomValue % 256 = 198; seed 4 -> 25; seed 5 -> 223).
describe("AI_CV_SpDefUp (docs/factory-ai-checkviability-ground-truth.md §22.1)", () => {
  function spDefUpAttacker(spDefStage: number, hp: number, maxHp = 100) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage, hp, maxHp,
    });
  }
  function spDefUpTarget(lastUsedMoveId: number) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100,
      lastUsedMoveId,
    });
  }

  it("EFFECT_COSMIC_POWER and EFFECT_CALM_MIND both dispatch to the identical handler", () => {
    for (const moveId of [MOVE_COSMIC_POWER_SPDEF_UP, MOVE_CALM_MIND_SPDEF_UP]) {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId,
        attacker: spDefUpAttacker(6, 65), // SPDEF<9 skips site 1; hp!=100 skips site 2; hp<70 skips site 3 straight to Gate D
        target: spDefUpTarget(MOVE_SPLASH_ZERO_POWER), // hp 65 >= 40 -> Gate D false -> reaches Gate E: power 0 -> site 5
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-5" });
    }
  });

  describe("Gate A / DRAW SITE 1 (own SPDEF stage < 9 skips the roll, same shape as DefenseUp's own Gate A)", () => {
    it("SPDEF stage 9 (>= 9): reaches DRAW SITE 1; roll >= 100 applies the -1", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 100).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_COSMIC_POWER_SPDEF_UP,
        attacker: spDefUpAttacker(9, 65), // hp 65 -> Gate C true (hp<70) -> straight to Gate D (false, 65>=40) -> Gate E
        target: spDefUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-1", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "sp-def-up-roll-5", succeeded: false });
      expect(result.scoreDelta).toBe(-1);
    });
  });

  describe("Gate B / DRAW SITE 2 (own HP != 100% skips the roll)", () => {
    it("HP exactly 100%: reaches DRAW SITE 2; roll >= 128 applies the +2 (then Gate C: hp>=70 -> DRAW SITE 3 too)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_COSMIC_POWER_SPDEF_UP,
        attacker: spDefUpAttacker(6, 100),
        target: spDefUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-2", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "sp-def-up-roll-3", succeeded: false });
      expect(result.scoreDelta).toBe(2);
    });
  });

  describe("Gate C (same direction as DefenseUp: own HP < 70% jumps straight into SpDefUp4, skipping DRAW SITE 3)", () => {
    it("HP exactly 69% (< 70): DRAW SITE 3 skipped entirely -- Gate D false (69 >= 40) -- falls to Gate E", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_COSMIC_POWER_SPDEF_UP,
        attacker: spDefUpAttacker(6, 69),
        target: spDefUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-5" });
    });

    it("HP exactly 70% (>= 70): roll >= 200 falls through to SpDefUp4/Gate E instead of stopping", () => {
      // seed 5 -> randomValue % 256 = 223 (>= 200).
      const result = runCheckViability({
        rng: { value: 5, calls: 0 },
        moveId: MOVE_COSMIC_POWER_SPDEF_UP,
        attacker: spDefUpAttacker(6, 70),
        target: spDefUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-3", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "sp-def-up-roll-5" });
    });
  });

  describe("Gate D (own HP < 40%: skips straight to the -2 penalty)", () => {
    it("HP exactly 39% (< 40, reached via the direct Gate C jump since 39 < 70): applies -2 with zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_COSMIC_POWER_SPDEF_UP,
        attacker: spDefUpAttacker(6, 39),
        target: spDefUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gates E/F (the TARGET's own last-used move power/type, INVERTED Gate F polarity vs DefenseUp)", () => {
    it("last move power == 0 (Splash): Gate E routes to SpDefUp5's own DRAW SITE 5, skipping Gate F entirely", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_COSMIC_POWER_SPDEF_UP,
        attacker: spDefUpAttacker(6, 50),
        target: spDefUpTarget(MOVE_SPLASH_ZERO_POWER),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-5", succeeded: false });
    });

    it("last move power != 0, type IN the physical list (Seismic Toss, Fighting): Gate F is INVERTED -- jumps straight to the -2, skipping BOTH remaining draw sites (the opposite of DefenseUp's own Gate F verdict for this exact move)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_COSMIC_POWER_SPDEF_UP,
        attacker: spDefUpAttacker(6, 50),
        target: spDefUpTarget(MOVE_SEISMIC_TOSS_PHYSICAL_LAST),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // Gate F's own get_move_type_from_result writes funcResult = TYPE_FIGHTING
      // (1), which collides with AI_WEATHER_RAIN -- doc §27.1 handler 15.
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2, funcResultAfter: 1 });
    });

    // Same chained DRAW SITE 4/5 pair as AI_CV_DefenseUp's own (byte-for-byte
    // identical topology past Gate F, docs/factory-ai-draw-discrepancy-probe.md
    // §4) -- three outcomes, same seed convention: pass@4 (seed 4), fail@4+
    // pass@5 (seed 1), fail@4+fail@5 (seed 5).
    it("last move power != 0, type NOT in the physical list (Dragon Rage, Dragon): Gate F is INVERTED -- falls through to DRAW SITE 4; pass@4 stops with a single draw, no penalty", () => {
      // seed 4 -> randomValue % 256 = 25 (< 60, stops here).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_CALM_MIND_SPDEF_UP,
        attacker: spDefUpAttacker(6, 50),
        target: spDefUpTarget(MOVE_DRAGON_RAGE_NONPHYSICAL_LAST),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-4", succeeded: false });
    });

    it("last move power != 0, type NOT in the physical list: fail@4+pass@5 -- DRAW SITE 4's own failure falls through to DRAW SITE 5, whose own roll < 60 still stops with no penalty", () => {
      // seed 1's chain: draw4 = 198 (>= 60, falls through); draw5 (next) = 33 (< 60, stops).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_CALM_MIND_SPDEF_UP,
        attacker: spDefUpAttacker(6, 50),
        target: spDefUpTarget(MOVE_DRAGON_RAGE_NONPHYSICAL_LAST),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-4", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "sp-def-up-roll-5", succeeded: false });
    });

    it("last move power != 0, type NOT in the physical list: fail@4+fail@5 -- only a SECOND failed roll applies the -2 penalty", () => {
      // seed 5's chain: draw4 = 223 (>= 60, falls through); draw5 (next) = 171 (>= 60, applies -2).
      const result = runCheckViability({
        rng: { value: 5, calls: 0 },
        moveId: MOVE_CALM_MIND_SPDEF_UP,
        attacker: spDefUpAttacker(6, 50),
        target: spDefUpTarget(MOVE_DRAGON_RAGE_NONPHYSICAL_LAST),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-4", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "sp-def-up-roll-5", succeeded: true });
    });

    it("omitted lastUsedMoveId defaults to MOVE_NONE (0), the real battle-start default -- same code path as a genuine 0-power last move", () => {
      const bareTarget = Object.freeze({
        speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
        isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100,
      });
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_COSMIC_POWER_SPDEF_UP,
        attacker: spDefUpAttacker(6, 50),
        target: bareTarget,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "sp-def-up-roll-5" });
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_LIGHT_SCREEN_CV = 113; // EFFECT_LIGHT_SCREEN
const MOVE_REFLECT_CV = 115; // EFFECT_REFLECT

// data/battle_ai_scripts.s:1373-1382/1492-1501, docs/factory-ai-checkviability-
// ground-truth.md §23.1: the tenth CBM-blocked pair's own CV half
// (AI_CBM_LightScreen/AI_CBM_Reflect, the CBM side, are in
// factoryAiCheckBadMove.test.ts) -- the first fully twin-symmetric pair in
// this doc, byte-for-byte identical shape between siblings differing only in
// which type list is referenced. seed 1 -> randomValue % 256 = 198 (>= 50,
// draw succeeds); seed 4 -> 25 (< 50, draw fails).
describe("AI_CV_LightScreen / AI_CV_Reflect (docs/factory-ai-checkviability-ground-truth.md §23.1)", () => {
  function sideScreenAttacker(hp: number, maxHp = 100) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp, maxHp,
    });
  }
  function sideScreenTarget(types: readonly [string, string]) {
    return Object.freeze({
      speed: 100, speedStage: 6, types,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100,
    });
  }

  describe("Gate A (AI_USER's own hp < 50 -- ScoreDown2, zero draws, no further gates read)", () => {
    it("AI_CV_LightScreen: hp exactly 49% (< 50): scores -2 with zero draws regardless of target type", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_LIGHT_SCREEN_CV,
        attacker: sideScreenAttacker(49),
        target: sideScreenTarget(["TYPE_FIRE", "TYPE_FIRE"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });

    it("AI_CV_Reflect: hp exactly 49% (< 50): scores -2 with zero draws regardless of target type", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_REFLECT_CV,
        attacker: sideScreenAttacker(49),
        target: sideScreenTarget(["TYPE_NORMAL", "TYPE_NORMAL"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });

    it("hp exactly 50% (NOT < 50): falls through to Gates B/C instead of the deterministic -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_LIGHT_SCREEN_CV,
        attacker: sideScreenAttacker(50),
        target: sideScreenTarget(["TYPE_FIRE", "TYPE_FIRE"]), // Gate B matches -> deterministic 0, not -2
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gates B/C (target's own type1/type2 vs the type list) -- LightScreen's 8-type special list, Reflect's 9-type physical list, exact complements", () => {
    it("AI_CV_LightScreen: type1 alone in the special list (Fire): jumps to End, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_LIGHT_SCREEN_CV,
        attacker: sideScreenAttacker(100),
        target: sideScreenTarget(["TYPE_FIRE", "TYPE_NORMAL"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("AI_CV_LightScreen: type2 alone in the special list (type1 not, Gate B misses): jumps to End, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_LIGHT_SCREEN_CV,
        attacker: sideScreenAttacker(100),
        target: sideScreenTarget(["TYPE_NORMAL", "TYPE_DRAGON"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("AI_CV_LightScreen: neither type in the special list (Bug/Rock, Shuckle-shaped): falls through to the DRAW SITE", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 }, // roll < 50 -> succeeded false -> score 0
        moveId: MOVE_LIGHT_SCREEN_CV,
        attacker: sideScreenAttacker(100),
        target: sideScreenTarget(["TYPE_BUG", "TYPE_ROCK"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "light-screen-roll", succeeded: false });
    });

    it("AI_CV_Reflect: type1 alone in the physical list (Bug, Shuckle-shaped): jumps to End, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_REFLECT_CV,
        attacker: sideScreenAttacker(100),
        target: sideScreenTarget(["TYPE_BUG", "TYPE_ROCK"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("AI_CV_Reflect: neither type in the physical list (pure Fire, Vulpix-shaped): falls through to the DRAW SITE", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 }, // roll < 50 -> succeeded false -> score 0
        moveId: MOVE_REFLECT_CV,
        attacker: sideScreenAttacker(100),
        target: sideScreenTarget(["TYPE_FIRE", "TYPE_FIRE"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "reflect-roll", succeeded: false });
    });
  });

  describe("DRAW SITE (if_random_less_than 50, only reached when neither type is listed)", () => {
    it("AI_CV_LightScreen: roll >= 50 applies the -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 }, // randomValue % 256 = 198 (>= 50)
        moveId: MOVE_LIGHT_SCREEN_CV,
        attacker: sideScreenAttacker(100),
        target: sideScreenTarget(["TYPE_BUG", "TYPE_ROCK"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "light-screen-roll", succeeded: true });
    });

    it("AI_CV_Reflect: roll >= 50 applies the -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 }, // randomValue % 256 = 198 (>= 50)
        moveId: MOVE_REFLECT_CV,
        attacker: sideScreenAttacker(100),
        target: sideScreenTarget(["TYPE_FIRE", "TYPE_FIRE"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "reflect-roll", succeeded: true });
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_DOUBLE_TEAM_CV = 104; // EFFECT_EVASION_UP
const MOVE_MINIMIZE_CV = 107; // EFFECT_MINIMIZE -- shares this same handler (doc §24.1/§24.7)

// data/battle_ai_scripts.s:1037-1074, docs/factory-ai-checkviability-ground-truth.md
// §24.1: the eleventh CBM-blocked pair's own CV half (AI_CBM_EvasionUp, the
// CBM side, is in factoryAiCheckBadMove.test.ts) -- the largest ported CV
// handler in this doc, 8 if_random_less_than sites. Re-derived independently
// from the raw assembly, NOT assumed from AI_CV_AccuracyDown's own shape
// despite the structural similarity -- three real divergences (doc §24.1):
// DRAW SITE 1 has no Gate B companion (single 90%-HP gate, not
// AccuracyDown's own two-gate 70% shape); Gate A's own threshold is 90 not
// 70; Gate I reads AI_USER's own evasion stage, not AI_TARGET's (the operand
// flips because this handler raises the OPPONENT's own stat).
// seed 1 -> randomValue % 256 = 198 (>= every site's own threshold, succeeds
// everywhere); seed 4 -> 25 (< every threshold, fails everywhere) -- same
// two-seed convention every prior handler in this file already established.
// Baseline battler sits at hp 80% (opponent) -- strictly between Gate A's
// 90% and Gate H's 70% thresholds, so NEITHER DRAW SITE 1 nor the entire
// tail (Gates I/J/K, DRAW SITE 8) fires by construction, the same
// "disjoint-threshold shared zero-draw control" shape doc §24.2 designed for
// the live fixtures.
describe("AI_CV_EvasionUp (docs/factory-ai-checkviability-ground-truth.md §24.1)", () => {
  function evasionUpAttacker(overrides: Record<string, unknown> = {}) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6,
      hp: 80, maxHp: 100,
      ...overrides,
    });
  }
  function evasionUpTarget(overrides: Record<string, unknown> = {}) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6,
      hp: 100, maxHp: 100,
      ...overrides,
    });
  }

  it("EFFECT_EVASION_UP and EFFECT_MINIMIZE dispatch identically (doc §24.7: Minimize shares this handler despite being blocked-on-opcodes for move execution itself, unrelated to this AI-decision port)", () => {
    for (const moveId of [MOVE_DOUBLE_TEAM_CV, MOVE_MINIMIZE_CV]) {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId,
        attacker: evasionUpAttacker({ hp: 90 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-1", succeeded: true });
      expect(result.scoreDelta).toBe(3);
    }
  });

  it("EFFECT_EVASION_UP_2 is a vestigial constant with zero real moves (doc §24.7) -- confirmed absent from the generated move table, not independently dispatch-testable through a real move ID", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_EVASION_UP_2")).toBe(false);
  });

  describe("Gate A / DRAW SITE 1 (opponent's OWN hp >= 90% -- no Gate B companion, doc §24.1 divergence 1)", () => {
    it("opponent HP exactly 90% (>= 90): reaches DRAW SITE 1; roll >= 100 applies +3", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 90 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-1", succeeded: true });
      expect(result.scoreDelta).toBe(3);
    });

    it("roll < 100 skips the +3", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 90 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-1", succeeded: false });
      expect(result.scoreDelta).toBe(0);
    });

    it("opponent HP 89% (< 90): DRAW SITE 1 skipped entirely; also skips the entire tail (89 > 70 -> Gate H) -- zero draws total", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 89 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("doc §24.1 divergence 1: the TARGET's own hp is NEVER read by this gate -- even a very low target hp adds no second route into DRAW SITE 1 (unlike AccuracyDown's own two-gate DRAW SITE 1)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker(), // hp 80% -- baseline gap, Gate A false
        target: evasionUpTarget({ hp: 5 }), // very low target hp, irrelevant here
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gate B / DRAW SITE 2 (opponent's OWN evasion stage already >= 9)", () => {
    it("evasion stage 9: reaches DRAW SITE 2; roll >= 128 applies -1", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ evasionStage: 9 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-2", succeeded: true });
      expect(result.scoreDelta).toBe(-1);
    });

    it("evasion stage 8 (< 9): DRAW SITE 2 skipped -- 0 draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ evasionStage: 8 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  // Gates C/D's own opponent-HP band picks the ENTRY point, not two mutually
  // exclusive single-draw sites (docs/factory-ai-draw-discrepancy-probe.md
  // §7): own HP > 50% jumps straight to DRAW SITE 4 alone (unaffected by the
  // fix below). Own HP <= 50% reaches DRAW SITE 3 first, whose own failure
  // (roll >= 80) chains straight into DRAW SITE 4's own roll -- the SAME
  // DefenseUp-style chain, three outcomes: pass@3 (seed 4), fail@3+pass@4
  // (seed 1), fail@3+fail@4 (seed 2).
  describe("Gates C/D / DRAW SITEs 3-4 (own hp band picks the entry point; <= 50% chains DRAW SITE 3's own failure into DRAW SITE 4, same shape as AI_CV_DefenseUp's own DRAW SITE 4/5)", () => {
    it("target toxic-poisoned + opponent's OWN hp > 50%: routes to DRAW SITE 4 only (direct entry, not part of the chain); roll >= 50 applies +3", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker(), // hp 80% (> 50)
        target: evasionUpTarget({ isToxicPoisoned: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-4", succeeded: true });
      expect(result.scoreDelta).toBe(3);
    });

    it("target toxic-poisoned + opponent's OWN hp <= 50%: pass@3 -- roll < 80 stops with a single draw, no bonus", () => {
      // seed 4 -> randomValue % 256 = 25 (< 80, stops here).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 45 }), // <= 50 -- Gate I (default evasion) stops the tail cleanly after
        target: evasionUpTarget({ isToxicPoisoned: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-3", succeeded: false });
      expect(result.scoreDelta).toBe(0);
    });

    it("target toxic-poisoned + opponent's OWN hp <= 50%: fail@3+pass@4 -- DRAW SITE 3's own failure chains into DRAW SITE 4, whose own roll < 50 still stops with no bonus", () => {
      // seed 1's chain: draw3 = 198 (>= 80, chains); draw4 (next) = 33 (< 50, stops).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 45 }),
        target: evasionUpTarget({ isToxicPoisoned: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-3", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "evasion-up-roll-4", succeeded: false });
      expect(result.scoreDelta).toBe(0);
    });

    it("target toxic-poisoned + opponent's OWN hp <= 50%: fail@3+fail@4 -- only a SECOND failed roll applies the +3", () => {
      // seed 2's chain: draw3 = 140 (>= 80, chains); draw4 (next) = 195 (>= 50, applies +3).
      const result = runCheckViability({
        rng: { value: 2, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 45 }),
        target: evasionUpTarget({ isToxicPoisoned: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-3", succeeded: true });
      expect(result.draws[1]).toMatchObject({ kind: "evasion-up-roll-4", succeeded: true });
      expect(result.scoreDelta).toBe(3);
    });

    it("target NOT toxic-poisoned: neither DRAW SITE 3 nor 4 fires, regardless of HP band", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 45 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gate E / DRAW SITE 5 (target leech-seeded)", () => {
    it("target leech-seeded: reaches DRAW SITE 5; roll >= 70 applies +3", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker(),
        target: evasionUpTarget({ isLeechSeeded: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-5", succeeded: true });
      expect(result.scoreDelta).toBe(3);
    });

    it("target not leech-seeded: DRAW SITE 5 skipped -- 0 draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker(),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gate F / DRAW SITE 6 (opponent's OWN rooted/Ingrain flag)", () => {
    it("opponent's OWN rooted flag: reaches DRAW SITE 6; roll >= 128 applies +2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ isRooted: true }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-6", succeeded: true });
      expect(result.scoreDelta).toBe(2);
    });

    it("the TARGET's own rooted flag is NEVER read by this gate -- 0 draws despite the target being rooted", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ isRooted: false }),
        target: evasionUpTarget({ isRooted: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gate G / DRAW SITE 7 (target cursed)", () => {
    it("target cursed: reaches DRAW SITE 7; roll >= 70 applies +3", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker(),
        target: evasionUpTarget({ isCursed: true }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-7", succeeded: true });
      expect(result.scoreDelta).toBe(3);
    });

    it("target not cursed: DRAW SITE 7 skipped -- 0 draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker(),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  it("Gate B plus Gates D/E/F/G all fire together in one pass (not mutually exclusive with each other, only C/D internally are) -- 6 draws total", () => {
    // seed 1's chain: 198 (site2, >=128 -> -1), 33 (site4, <50 -> +0),
    // 238 (site5, >=70 -> +3), 183 (site6, >=128 -> +2), 227 (site7, >=70 -> +3),
    // 168 (site8, >=70 -> -2). Total: -1+0+3+2+3-2 = 5.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_DOUBLE_TEAM_CV,
      attacker: evasionUpAttacker({ hp: 69, evasionStage: 9, isRooted: true }), // < 90 skips site1; Gate H false (69<=70); Gate I false (9 != 6)
      target: evasionUpTarget({ isToxicPoisoned: true, isLeechSeeded: true, isCursed: true }),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(6);
    expect(result.draws.map((d) => d.kind)).toEqual([
      "evasion-up-roll-2",
      "evasion-up-roll-4",
      "evasion-up-roll-5",
      "evasion-up-roll-6",
      "evasion-up-roll-7",
      "evasion-up-roll-8",
    ]);
    expect(result.draws.map((d) => (d as { succeeded: boolean }).succeeded)).toEqual([
      true, false, true, true, true, true,
    ]);
    expect(result.scoreDelta).toBe(5);
  });

  describe("Gate H (opponent's own HP > 70%: clean stop, skips Gates I/J/K and DRAW SITE 8 entirely)", () => {
    it("opponent HP 71%, evasion stage 9 (Gate B still fires independently -- different gate, same pass, unaffected by the tail's own fate)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 71, evasionStage: 9 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-2" });
    });

    it("isolated: opponent HP 71%, evasion stage at neutral (6, Gate B also false) -- zero draws anywhere in the handler", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 71 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gate I (opponent's OWN evasion stage back at DEFAULT_STAT_STAGE: clean stop -- doc §24.1 divergence 3, AI_USER not AI_TARGET)", () => {
    it("opponent HP exactly 70% (Gate H false, continues), evasion stage still 6 (neutral): stops at Gate I, 0 draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 70 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("opponent's own evasion stage 7 (already raised by this same dispatch move's own real prior use, doc §24.1/§24.2): does NOT stop -- falls through toward DRAW SITE 8", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 70, evasionStage: 7 }),
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-8" });
    });

    it("doc §24.1 divergence 3: this gate reads AI_USER's own evasion stage, not AI_TARGET's -- the target's own non-neutral evasion stage is irrelevant and does NOT prevent the clean stop", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 70 }), // own evasion stage still 6 -- stops
        target: evasionUpTarget({ evasionStage: 9 }), // target's own stage is non-neutral, but irrelevant here
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("Gates J/K (either battler < 40% HP skips DRAW SITE 8 straight to the deterministic -2)", () => {
    it("Gate J: opponent's own HP 35% (< 40) -- deterministic -2, no DRAW SITE 8", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 35, evasionStage: 7 }), // < 70 -> Gate H false; evasionStage 7 -> Gate I false
        target: evasionUpTarget(),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });

    it("Gate K: target's own HP 35% (< 40) -- deterministic -2, no DRAW SITE 8", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 70, evasionStage: 7 }),
        target: evasionUpTarget({ hp: 35 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("DRAW SITE 8 (both battlers in [40,70]% HP -- OPPOSITE polarity, same shape as AccuracyDown's own DRAW SITE 7)", () => {
    it("roll >= 70 (fall through): applies the -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 50, evasionStage: 7 }),
        target: evasionUpTarget({ hp: 50 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-8", succeeded: true });
      expect(result.scoreDelta).toBe(-2);
    });

    it("roll < 70 (jump to End): NO further score change", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_DOUBLE_TEAM_CV,
        attacker: evasionUpAttacker({ hp: 50, evasionStage: 7 }),
        target: evasionUpTarget({ hp: 50 }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-up-roll-8", succeeded: false });
      expect(result.scoreDelta).toBe(0);
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through, EFFECT_EVASION_UP block)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_SWEET_SCENT_CV = 230; // EFFECT_EVASION_DOWN

// data/battle_ai_scripts.s:1235-1246, docs/factory-ai-checkviability-ground-truth.md
// §24.1: the eleventh CBM-blocked pair's other CV half -- confirmed
// byte-for-byte the same topology as AI_CV_DefenseDown/AI_CV_SpDefDown
// (STAT_EVASION swapped in, same 70/50/70 thresholds and odds, same score -2
// on every non-skip branch), reusing the identical shared runCvStatDown body.
describe("AI_CV_EvasionDown (docs/factory-ai-checkviability-ground-truth.md §24.1)", () => {
  function evasionDownAttacker(hp: number, maxHp = 100) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp, maxHp,
    });
  }
  function evasionDownTarget(evasionStage: number, hp: number, maxHp = 100) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp, maxHp,
    });
  }

  it("Gate A false (attacker HP 100% >= 70) + Gate B true (target EVASION stage 6 > 3): skips the draw site entirely, zero draws, zero score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SWEET_SCENT_CV,
      attacker: evasionDownAttacker(100),
      target: evasionDownTarget(6, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("EFFECT_EVASION_DOWN_2 is a vestigial constant with zero real moves (doc §24.7) -- confirmed absent from the generated move table, not independently dispatch-testable through a real move ID", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_EVASION_DOWN_2")).toBe(false);
  });

  describe("Gate C (if_hp_more_than AI_TARGET, 70 -- the target's OWN hp, a plain fallthrough past the draw site)", () => {
    it("target HP exactly 71% (>70): skips the -2, still zero draws (Gate A/B both skip the roll)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SWEET_SCENT_CV,
        attacker: evasionDownAttacker(100),
        target: evasionDownTarget(6, 71),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("target HP exactly 70% (NOT >70): applies the -2, still zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SWEET_SCENT_CV,
        attacker: evasionDownAttacker(100),
        target: evasionDownTarget(6, 70),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gate A (attacker's own HP < 70): reaches the draw site unconditionally, regardless of Gate B", () => {
    it("roll < 50 skips the -2 (one draw, zero score)", () => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_SWEET_SCENT_CV,
        attacker: evasionDownAttacker(69),
        target: evasionDownTarget(6, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-down-roll", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it("roll >= 50 applies the -2 (one draw)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SWEET_SCENT_CV,
        attacker: evasionDownAttacker(69),
        target: evasionDownTarget(6, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "evasion-down-roll", succeeded: true });
      expect(result.rng.calls).toBe(1);
    });
  });

  it("Gate A false, Gate B false (target EVASION stage 3 <= 3): falls through into the SAME draw site the Gate A path would have jumped to, one draw", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SWEET_SCENT_CV,
      attacker: evasionDownAttacker(100),
      target: evasionDownTarget(3, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-2);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "evasion-down-roll", succeeded: true });
  });

  it("the draw site's own -2 and Gate C's own -2 are NOT mutually exclusive: both fire in one pass, total -4", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SWEET_SCENT_CV,
      attacker: evasionDownAttacker(50),
      target: evasionDownTarget(6, 50),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-4);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "evasion-down-roll", succeeded: true });
    expect(result.rng.calls).toBe(1);
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_RAIN_DANCE_CV = 240; // EFFECT_RAIN_DANCE
const MOVE_SUNNY_DAY_CV = 241; // EFFECT_SUNNY_DAY
const MOVE_HAIL_CV = 258; // EFFECT_HAIL

// data/battle_ai_scripts.s:2060-2075/:2261-2276, docs/factory-ai-
// checkviability-ground-truth.md §25.2: the weather trio's twin siblings --
// 1 HP gate + a 3-way get_weather chain over the OTHER three weather
// values, zero if_random_less_than anywhere in either body (§25.4), so no
// rng seed sensitivity to cover -- only HP%/weather combinations.
describe("AI_CV_SunnyDay / AI_CV_Hail (docs/factory-ai-checkviability-ground-truth.md §25.2)", () => {
  function weatherBattler(hp: number, currentWeather: 0 | 1 | 2 | 3 | undefined, maxHp = 100) {
    return Object.freeze({
      speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6,
      hp, maxHp, currentWeather,
    });
  }
  const NEUTRAL_TARGET = weatherBattler(100, undefined);

  it.each([
    ["AI_CV_SunnyDay", MOVE_SUNNY_DAY_CV],
    ["AI_CV_Hail", MOVE_HAIL_CV],
  ])("%s: own HP 39%% (< 40): scores -1 with zero draws even when weather would otherwise match", (_label, moveId) => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId,
      attacker: weatherBattler(39, 2), // Sandstorm -- in both handlers' "other three" list, would otherwise be +1
      target: NEUTRAL_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -1 });
  });

  it.each([
    ["AI_CV_SunnyDay", MOVE_SUNNY_DAY_CV],
    ["AI_CV_Hail", MOVE_HAIL_CV],
  ])("%s: own HP exactly 40%% (NOT < 40): falls through to the weather chain instead of the deterministic -1", (_label, moveId) => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId,
      attacker: weatherBattler(40, undefined), // no weather match -> 0, not -1
      target: NEUTRAL_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("AI_CV_SunnyDay: weather Hail/Rain/Sandstorm (the 'other three', excludes Sun) each score +1 with zero draws", () => {
    for (const weather of [3, 1, 2] as const) {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SUNNY_DAY_CV,
        attacker: weatherBattler(100, weather),
        target: NEUTRAL_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // get_weather always writes funcResult = currentWeather when it's set.
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 1, funcResultAfter: weather });
    }
  });

  it("AI_CV_SunnyDay: own weather (Sun) scores 0, zero draws -- excluded from its own chain", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SUNNY_DAY_CV,
      attacker: weatherBattler(100, 0),
      target: NEUTRAL_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0, funcResultAfter: 0 });
  });

  it("AI_CV_SunnyDay: omitted weather (undefined) scores 0, zero draws -- never matches any AI_WEATHER_* constant", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SUNNY_DAY_CV,
      attacker: weatherBattler(100, undefined),
      target: NEUTRAL_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("AI_CV_Hail: weather Sun/Rain/Sandstorm (the 'other three', excludes Hail) each score +1 with zero draws", () => {
    for (const weather of [0, 1, 2] as const) {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_HAIL_CV,
        attacker: weatherBattler(100, weather),
        target: NEUTRAL_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 1, funcResultAfter: weather });
    }
  });

  it("AI_CV_Hail: own weather (Hail) scores 0, zero draws -- excluded from its own chain", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_HAIL_CV,
      attacker: weatherBattler(100, 3),
      target: NEUTRAL_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0, funcResultAfter: 3 });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

// data/battle_ai_scripts.s:2037-2058, docs/factory-ai-checkviability-
// ground-truth.md §25.2/§25.3: the ONE weather-trio sibling that genuinely
// diverges from SunnyDay/Hail's shared shape -- an if_user_faster/Swift-Swim
// bypass prologue (Gates P/S) wrapping the SAME HP/weather span, plus a
// Rain-Dish tail bonus (Gate R). Re-derived independently from the raw
// assembly per the doc's own standing divergence-check rule, not assumed
// from the sibling shape. Gate P's `if_user_faster` reuses the exact
// GetWhoStrikesFirst/tie-break-Random() machinery `AI_CV_SpeedDown`'s own
// `target-faster-tie` already ports (doc §25.3) -- same seeds (3/8) reused
// here to exercise the tie-break parity/odd branch.
describe("AI_CV_RainDance (docs/factory-ai-checkviability-ground-truth.md §25.2/§25.3)", () => {
  const EXTRAS = Object.freeze({
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6,
  });
  function raindanceBattler(opts: Readonly<{
    speed: number;
    hp?: number;
    maxHp?: number;
    ability?: string;
    currentWeather?: 0 | 1 | 2 | 3;
  }>) {
    return Object.freeze({
      speed: opts.speed, speedStage: 6, ...EXTRAS,
      hp: opts.hp ?? 100, maxHp: opts.maxHp ?? 100,
      ability: opts.ability, currentWeather: opts.currentWeather,
    });
  }
  const FASTER = 120;
  const SLOWER = 5;

  describe("Gate P (if_user_faster) + Gate S (Swift Swim bypass, only checked when NOT user-faster)", () => {
    it("user strictly faster: skips Gate S/Swift-Swim entirely (present but irrelevant), zero draws, proceeds straight to Gate H/weather", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: FASTER, hp: 100, ability: "ABILITY_SWIFT_SWIM", currentWeather: undefined }),
        target: raindanceBattler({ speed: SLOWER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // user faster -> Gate H (hp 100 >= 40) -> weather chain (none, no match) -> Gate R (Swift Swim != Rain Dish) -> 0.
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("user NOT faster, own ability Swift Swim: deterministic +1 bypass -- own HP<40% (would normally score -1) is never read", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: SLOWER, hp: 10, ability: "ABILITY_SWIFT_SWIM" }),
        target: raindanceBattler({ speed: FASTER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 1 });
    });

    it("user NOT faster, own ability NOT Swift Swim: falls through into the normal Gate H/weather chain (own HP<40% applies -1)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: SLOWER, hp: 10, ability: "ABILITY_NONE" }),
        target: raindanceBattler({ speed: FASTER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // !userFaster -> Gate S's own get_ability AI_USER always wrote funcResult
      // = ABILITY_NONE's id (0) before the HP<40% short-circuit, doc §27.1
      // handler 22.
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -1, funcResultAfter: 0 });
    });

    it("omitted ability defaults to ABILITY_NONE, not a false Swift-Swim match", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: SLOWER, hp: 100 }),
        target: raindanceBattler({ speed: FASTER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // NOT faster, ability defaults ABILITY_NONE != Swift Swim -> weather chain: hp100>=40, weather undefined -> Gate R: ABILITY_NONE != Rain Dish -> 0.
      // Gate S's own write (ABILITY_NONE's id, 0) feeds the weather-chain's
      // own stale read since weather is unset, and 0 == AI_WEATHER_SUN IS in
      // the "other three" -- it matches, jumping away with that same value.
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0, funcResultAfter: 0 });
    });

    it("an exact speed tie still burns GetWhoStrikesFirst's own Random() call (doc §25.3) -- even tie-roll resolves to userFaster, skipping Gate S", () => {
      const TIED = raindanceBattler({ speed: 100, hp: 100, ability: "ABILITY_SWIFT_SWIM" });
      // seed 8 -> tie-roll randomValue 3634 is EVEN -> strikesFirst stays 0 -> userFaster=true (same seed as AI_CV_SpeedDown's own "evenTie" case).
      const result = runCheckViability({
        rng: { value: 8, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: TIED,
        target: TIED,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0); // userFaster -> Gate H (100>=40) -> weather chain (none) -> Gate R (Swift Swim != Rain Dish) -> 0.
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "user-faster-tie", strikesFirst: 0 });
      expect(result.rng.calls).toBe(1);
    });

    it("an exact speed tie resolved to the target (odd tie-roll): userFaster=false -> Gate S checked, Swift Swim present -> +1 bypass", () => {
      const TIED = raindanceBattler({ speed: 100, hp: 10, ability: "ABILITY_SWIFT_SWIM" }); // low HP would be -1 if the bypass didn't fire
      // seed 3 -> tie-roll randomValue 50515 is ODD -> strikesFirst=2 -> userFaster=false (same seed as AI_CV_SpeedDown's own "oddTie" case).
      const result = runCheckViability({
        rng: { value: 3, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: TIED,
        target: TIED,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "user-faster-tie", strikesFirst: 2 });
    });
  });

  describe("Gate H / weather chain (shared span, reached whenever the Gate P/S prologue doesn't short-circuit)", () => {
    it("own HP 39% (< 40): scores -1, zero draws -- Rain Dish never checked even when present", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: FASTER, hp: 39, ability: "ABILITY_RAIN_DISH", currentWeather: 1 }),
        target: raindanceBattler({ speed: SLOWER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -1 });
    });

    it("own HP exactly 40% (NOT < 40): falls through into the weather chain instead of the deterministic -1", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: FASTER, hp: 40, currentWeather: 3 }), // Hail -- in the other-three list
        target: raindanceBattler({ speed: SLOWER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // get_weather always writes funcResult = currentWeather when it's set.
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 1, funcResultAfter: 3 });
    });

    it.each([3, 0, 2] as const)("weather %i (Hail/Sun/Sandstorm, the 'other three' excluding Rain): scores +1, zero draws, Rain Dish never checked", (weather) => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: FASTER, hp: 100, currentWeather: weather, ability: "ABILITY_NONE" }),
        target: raindanceBattler({ speed: SLOWER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 1, funcResultAfter: weather });
    });

    it("own weather already Rain (own type, excluded from the chain): falls through to Gate R", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: FASTER, hp: 100, currentWeather: 1, ability: "ABILITY_NONE" }),
        target: raindanceBattler({ speed: SLOWER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // Weather set to Rain (excluded from RainDance's own "other three") ->
      // get_weather still writes it, but no match -> falls to Gate R, which
      // re-writes funcResult = ABILITY_NONE's own id (0).
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0, funcResultAfter: 0 });
    });
  });

  describe("Gate R tail (own ability == Rain Dish, only reached when the weather chain falls all the way through)", () => {
    it("own weather already Rain + own ability Rain Dish: scores +1 -- can coexist with AI_CBM_RainDance's own -8 (independent score contributions, doc §25.6 item 2)", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: FASTER, hp: 100, currentWeather: 1, ability: "ABILITY_RAIN_DISH" }),
        target: raindanceBattler({ speed: SLOWER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 1 });
    });

    it("own weather none (undefined) + own ability Rain Dish: scores +1 -- wants rain regardless of current weather", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: FASTER, hp: 100, currentWeather: undefined, ability: "ABILITY_RAIN_DISH" }),
        target: raindanceBattler({ speed: SLOWER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 1 });
    });

    it("own weather none + own ability NOT Rain Dish: scores 0, the true deterministic-zero fallthrough", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_RAIN_DANCE_CV,
        attacker: raindanceBattler({ speed: FASTER, hp: 100, currentWeather: undefined, ability: "ABILITY_NONE" }),
        target: raindanceBattler({ speed: SLOWER }),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      // Gate R's own get_ability AI_USER re-write: ABILITY_NONE's own id (0).
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0, funcResultAfter: 0 });
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

// data/battle_ai_scripts.s:1136-1141, docs/factory-ai-checkviability-ground-truth.md
// §5's table row, §4's footnote, §10's porter note. The 22nd and last
// reachable CV handler, completing the §14-§25 program. Zero if_random
// sites of its own -- a plain `if_move` literal-ID compare against 3 of its
// 6 covered moves that `goto`s into AI_CV_SpeedDown's own label; the other 3
// fall through to a genuine, deterministic `end` (score 0, zero draws).
// Real-source color confirming the split isn't arbitrary: the 3 redirecting
// moves (Icy Wind/Rock Tomb/Mud Shot) all carry secondaryEffectChance 100
// (the speed drop ALWAYS happens on a hit); the 3 falling through
// (Bubblebeam/Constrict/Bubble) all carry secondaryEffectChance 10 -- the AI
// only bothers scoring the speed-down bonus for the moves where it's
// guaranteed, per move data, not by reading the chance field at runtime.
describe("AI_CV_SpeedDownFromChance (docs/factory-ai-checkviability-ground-truth.md §5's table row, §4's footnote)", () => {
  const MOVE_ICY_WIND = 196; // redirects -- secondaryEffectChance 100
  const MOVE_ROCK_TOMB = 317; // redirects -- secondaryEffectChance 100
  const MOVE_MUD_SHOT = 341; // redirects -- secondaryEffectChance 100
  const MOVE_BUBBLE_BEAM = 61; // falls through to `end` -- secondaryEffectChance 10
  const MOVE_CONSTRICT = 132; // falls through to `end` -- secondaryEffectChance 10
  const MOVE_BUBBLE = 145; // falls through to `end` -- secondaryEffectChance 10

  const EXTRAS = Object.freeze({
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });
  const FASTER_USER = Object.freeze({ speed: 120, speedStage: 6, ...EXTRAS }); // target NOT faster
  const SLOWER_USER = Object.freeze({ speed: 5, speedStage: 6, ...EXTRAS }); // target faster
  const FASTER_TARGET = Object.freeze({ speed: 120, speedStage: 6, ...EXTRAS });
  const SLOWER_TARGET = Object.freeze({ speed: 5, speedStage: 6, ...EXTRAS });

  describe("redirecting moves (Icy Wind/Rock Tomb/Mud Shot) land in AI_CV_SpeedDown's own body", () => {
    it.each([
      ["Icy Wind", MOVE_ICY_WIND],
      ["Rock Tomb", MOVE_ROCK_TOMB],
      ["Mud Shot", MOVE_MUD_SHOT],
    ])("%s: deterministic -3, zero draws, when the target is not faster", (_label, moveId) => {
      const rng = { value: 249_678_687, calls: 0 };
      const result = runCheckViability({
        rng,
        moveId,
        attacker: FASTER_USER,
        target: SLOWER_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: -3 });
    });

    it.each([
      ["Icy Wind", MOVE_ICY_WIND],
      ["Rock Tomb", MOVE_ROCK_TOMB],
      ["Mud Shot", MOVE_MUD_SHOT],
    ])("%s: draws exactly one if_random_less_than 70 roll, scores 0 when it lands < 70", (_label, moveId) => {
      const result = runCheckViability({
        rng: { value: 4, calls: 0 }, // seed 4 -> randomValue % 256 = 25 (< 70)
        moveId,
        attacker: SLOWER_USER,
        target: FASTER_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "speed-down-roll", succeeded: false });
    });

    it.each([
      ["Icy Wind", MOVE_ICY_WIND],
      ["Rock Tomb", MOVE_ROCK_TOMB],
      ["Mud Shot", MOVE_MUD_SHOT],
    ])("%s: draws exactly one if_random_less_than 70 roll, scores +2 when it lands >= 70", (_label, moveId) => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 }, // seed 1 -> randomValue % 256 = 198 (>= 70)
        moveId,
        attacker: SLOWER_USER,
        target: FASTER_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "speed-down-roll", succeeded: true });
    });

    it("an exact speed tie still burns GetWhoStrikesFirst's own Random() call, same quirk AI_CV_SpeedDown itself pins", () => {
      const TIED = Object.freeze({ speed: 100, speedStage: 6, ...EXTRAS });
      const result = runCheckViability({
        rng: { value: 3, calls: 0 }, // seed 3 -> odd tie-roll -> strikesFirst 2, NOT target-faster
        moveId: MOVE_ICY_WIND,
        attacker: TIED,
        target: TIED,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-3);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 2 });
    });

    it.each([
      ["deterministic branch", { value: 249_678_687, calls: 0 }, FASTER_USER, SLOWER_TARGET],
      ["probabilistic-fail branch", { value: 4, calls: 0 }, SLOWER_USER, FASTER_TARGET],
      ["probabilistic-succeed branch", { value: 1, calls: 0 }, SLOWER_USER, FASTER_TARGET],
    ] as const)("redirect-equivalence: Icy Wind's post-gate scoring is byte-identical to MOVE_STRING_SHOT's own EFFECT_SPEED_DOWN dispatch (%s)", (_label, rngSeed, attacker, target) => {
      const viaRedirect = runCheckViability({
        rng: { ...rngSeed },
        moveId: MOVE_ICY_WIND,
        attacker,
        target,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      const viaDirect = runCheckViability({
        rng: { ...rngSeed },
        moveId: MOVE_STRING_SHOT,
        attacker,
        target,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(viaRedirect).toEqual(viaDirect);
    });
  });

  describe("fall-through moves (Bubblebeam/Constrict/Bubble) hit the handler's own `end` -- genuine zero, not a stub", () => {
    it.each([
      ["Bubblebeam", MOVE_BUBBLE_BEAM],
      ["Constrict", MOVE_CONSTRICT],
      ["Bubble", MOVE_BUBBLE],
    ])("%s: zero score, zero draws, regardless of relative speed (target faster)", (_label, moveId) => {
      const rng = { value: 1, calls: 0 };
      const result = runCheckViability({
        rng,
        moveId,
        attacker: SLOWER_USER,
        target: FASTER_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: 0 });
    });

    it.each([
      ["Bubblebeam", MOVE_BUBBLE_BEAM],
      ["Constrict", MOVE_CONSTRICT],
      ["Bubble", MOVE_BUBBLE],
    ])("%s: zero score, zero draws, regardless of relative speed (target not faster)", (_label, moveId) => {
      const rng = { value: 1, calls: 0 };
      const result = runCheckViability({
        rng,
        moveId,
        attacker: FASTER_USER,
        target: SLOWER_TARGET,
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: 0 });
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

describe("AI_CV_Rest (EFFECT_REST, docs/executable-frontier-census.md 49 weighted)", () => {
  const MOVE_REST = 156;
  const MOVE_SNATCH = 289;

  const EXTRAS = Object.freeze({
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });
  const FASTER_USER = Object.freeze({ speed: 120, speedStage: 6, ...EXTRAS }); // target NOT faster
  const SLOWER_USER = Object.freeze({ speed: 5, speedStage: 6, ...EXTRAS }); // target faster
  const FASTER_TARGET = Object.freeze({ speed: 120, speedStage: 6, ...EXTRAS });
  const SLOWER_TARGET = Object.freeze({ speed: 5, speedStage: 6, ...EXTRAS });

  function restRun(rngValue: number, attacker: unknown, target: unknown) {
    return runCheckViability({
      rng: { value: rngValue, calls: 0 },
      moveId: MOVE_REST,
      attacker: attacker as never,
      target: target as never,
      drawOrdinalStart: 1,
      reasonPrefix: "rest",
    });
  }

  it("target not faster + full HP: deterministic -8, zero draws", () => {
    const rng = { value: 1, calls: 0 };
    const result = runCheckViability({
      rng,
      moveId: MOVE_REST,
      attacker: FASTER_USER, // hp 100/100
      target: SLOWER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "rest",
    });
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: -8 });
  });

  it("target not faster + HP 45: the <70 midband roll's FALL-THROUGH scores -3", () => {
    // seed 1 -> high-half 16838, low byte 198 (>= 70, FALL-THROUGH scores -3).
    const result = restRun(1, { ...FASTER_USER, hp: 45 }, SLOWER_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -3 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "rest-roll-1", succeeded: true });
  });

  it("target not faster + HP 45: a <70 midband roll JUMPs into the Snatch-less tail; <10 there ends at 0", () => {
    // seed 4 -> low byte 25 (< 70): JUMP to tail; tail low byte 8 (< 10): End at 0.
    const result = restRun(4, { ...FASTER_USER, hp: 45 }, SLOWER_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws[0]).toMatchObject({ kind: "rest-roll-1", succeeded: false });
    expect(result.draws[1]).toMatchObject({ kind: "rest-tail-roll", succeeded: false });
  });

  it("target not faster + HP 45: a <70 midband roll JUMPs into the Snatch-less tail; >=10 there adds +3", () => {
    // seed 8 -> low byte 50 (< 70): JUMP to tail; tail low byte 147 (>= 10): +3.
    const result = restRun(8, { ...FASTER_USER, hp: 45 }, SLOWER_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 3 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws[0]).toMatchObject({ kind: "rest-roll-1", succeeded: false });
    expect(result.draws[1]).toMatchObject({ kind: "rest-tail-roll", succeeded: true });
  });

  it("target faster + HP 65: the <50 midband roll's JUMP lands in the Snatch-less tail; <10 ends at 0", () => {
    // seed 4 -> low byte 25 (< 50): JUMP to tail; tail low byte 8 (< 10): End at 0.
    const result = restRun(4, { ...SLOWER_USER, hp: 65 }, FASTER_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws[0]).toMatchObject({ kind: "rest-roll-2", succeeded: false });
    expect(result.draws[1]).toMatchObject({ kind: "rest-tail-roll", succeeded: false });
  });

  it("target faster + HP 65: the <50 midband roll's FALL-THROUGH scores -3", () => {
    // seed 3 -> low byte 83 (>= 50, FALL-THROUGH scores -3).
    const result = restRun(3, { ...SLOWER_USER, hp: 65 }, FASTER_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -3 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "rest-roll-2", succeeded: true });
  });

  it("target faster + HP 50 (< 60): straight into the Snatch-less tail", () => {
    // seed 1 -> tail low byte 198 >= 10 -> +3.
    const result = restRun(1, { ...SLOWER_USER, hp: 50 }, FASTER_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 3 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "rest-tail-roll", succeeded: true });
  });

  it("target faster + HP 80 (> 70): deterministic -3, zero draws", () => {
    const rng = { value: 1, calls: 0 };
    const result = runCheckViability({
      rng,
      moveId: MOVE_REST,
      attacker: { ...SLOWER_USER, hp: 80 },
      target: FASTER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "rest",
    });
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: -3 });
  });

  it("Snatch-guarded tail: roll < 50 at the gate ends at 0; roll >= 50 reaches the <10 roll", () => {
    // seed 4 -> low byte 25 (< 50): snatch gate JUMP ends at 0.
    const gateJump = restRun(4, { ...FASTER_USER, hp: 30 }, { ...SLOWER_TARGET, knownMoves: [MOVE_SNATCH] });
    expect(gateJump).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (gateJump.kind !== "scored") throw new Error("unreachable");
    expect(gateJump.draws).toHaveLength(1);
    expect(gateJump.draws[0]).toMatchObject({ kind: "rest-snatch-roll", succeeded: false });

    // seed 1 -> low byte 198 (>= 50): gate falls to the <10 roll; 198 >= 10 -> +3.
    const gateFall = restRun(1, { ...FASTER_USER, hp: 30 }, { ...SLOWER_TARGET, knownMoves: [MOVE_SNATCH] });
    expect(gateFall).toMatchObject({ kind: "scored", scoreDelta: 3 });
    if (gateFall.kind !== "scored") throw new Error("unreachable");
    expect(gateFall.draws).toHaveLength(2);
    expect(gateFall.draws[0]).toMatchObject({ kind: "rest-snatch-roll", succeeded: true });
    expect(gateFall.draws[1]).toMatchObject({ kind: "rest-tail-roll", succeeded: true });
  });
});

describe("AI_CV_Absorb (EFFECT_ABSORB, docs/executable-frontier-census.md 43 weighted)", () => {
  const MOVE_ABSORB = 71;

  const EXTRAS = Object.freeze({
    speed: 100,
    speedStage: 6,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });
  const GRASS_ATTACKER = Object.freeze({ ...EXTRAS, types: ["TYPE_GRASS", "TYPE_NORMAL"] as const });

  function absorbRun(rngValue: number, targetTypes: readonly [string, string]) {
    return runCheckViability({
      rng: { value: rngValue, calls: 0 },
      moveId: MOVE_ABSORB,
      attacker: GRASS_ATTACKER,
      target: { ...EXTRAS, types: targetTypes },
      drawOrdinalStart: 1,
      reasonPrefix: "absorb",
    });
  }

  it("neutral 1x target: deterministic zero score, zero draws", () => {
    const rng = { value: 1, calls: 0 };
    const result = runCheckViability({
      rng,
      moveId: MOVE_ABSORB,
      attacker: GRASS_ATTACKER,
      target: { ...EXTRAS, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const },
      drawOrdinalStart: 1,
      reasonPrefix: "absorb",
    });
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: 0 });
  });

  it("super effective 2x target (Water): deterministic zero score, zero draws", () => {
    const result = absorbRun(1, ["TYPE_WATER", "TYPE_NORMAL"]);
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("0.5x target (Fire): the roll's FALL-THROUGH applies -3", () => {
    // seed 1 -> low byte 198 (>= 50, FALL-THROUGH to -3).
    const result = absorbRun(1, ["TYPE_FIRE", "TYPE_NORMAL"]);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -3 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "absorb-roll", succeeded: true });
  });

  it("0.5x target (Fire): the roll's JUMP ends at zero", () => {
    // seed 4 -> low byte 25 (< 50, JUMP to End).
    const result = absorbRun(4, ["TYPE_FIRE", "TYPE_NORMAL"]);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "absorb-roll", succeeded: false });
  });
});
