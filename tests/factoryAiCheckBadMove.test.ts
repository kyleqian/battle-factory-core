import { describe, expect, it } from "vitest";
import {
  MOVES_BY_ID,
  runCheckBadMovePreamble,
  type FactoryAiCheckBadMoveAttacker,
  type FactoryAiCheckBadMoveRoarTarget,
  type FactoryAiCheckBadMoveTarget,
} from "../src/engine/factoryAiCheckBadMove.ts";

// DEFAULT_STAT_STAGE (6) on both stages -- neutral, irrelevant to every test
// in this file except the dedicated AI_CBM_AttackUp/DefenseUp/BulkUp block below.
const NEUTRAL_ATTACKER: FactoryAiCheckBadMoveAttacker = Object.freeze({ atkStage: 6, defStage: 6 });

const MAROWAK: FactoryAiCheckBadMoveTarget = Object.freeze({
  species: 105,
  types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
  knownAbility: null,
  realAbility: "ABILITY_ROCK_HEAD",
  speedStage: 6, // DEFAULT_STAT_STAGE -- neutral, irrelevant to the effects this file exercises.
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
});

const MOVE_SURF = 57;
const MOVE_ROCK_SLIDE = 157;
const MOVE_BODY_SLAM = 34;
const MOVE_THUNDERBOLT = 85;
const MOVE_HAZE = 114; // EFFECT_HAZE -- has an if_effect table entry (AI_CBM_Haze, not ported)
const MOVE_SNORE = 173;
const MOVE_POISON_POWDER = 77; // EFFECT_POISON -> AI_CBM_Toxic
const MOVE_TOXIC = 92; // EFFECT_TOXIC -> AI_CBM_Toxic
const MOVE_STRING_SHOT = 81; // EFFECT_SPEED_DOWN
const MOVE_COTTON_SPORE = 178; // EFFECT_SPEED_DOWN_2 -- same handler, different table entry

function run(
  moveId: number,
  target: FactoryAiCheckBadMoveTarget,
  rngValue = 249_678_687,
  attacker: FactoryAiCheckBadMoveAttacker = NEUTRAL_ATTACKER,
) {
  return runCheckBadMovePreamble({
    rng: { value: rngValue, calls: 0 },
    moveId,
    target,
    attacker,
    drawOrdinalStart: 1,
    reasonPrefix: "test-slot",
  });
}

describe("AI_CheckBadMove universal preamble (docs/factory-ai-ground-truth.md §4 item 2)", () => {
  it("scores a type-immune move -10 with zero get_ability draws (the x0 short-circuit)", () => {
    const result = run(MOVE_THUNDERBOLT, MAROWAK);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
    expect(result.rng.calls).toBe(0);
  });

  it.each([
    ["Surf (EFFECT_HIT)", MOVE_SURF],
    ["Rock Slide (EFFECT_FLINCH_HIT)", MOVE_ROCK_SLIDE],
    ["Body Slam (EFFECT_PARALYZE_HIT)", MOVE_BODY_SLAM],
  ])(
    "draws exactly two uncached get_ability calls and scores 0 for a non-immune, no-table-entry move: %s",
    (_label, moveId) => {
      const result = run(moveId, MAROWAK);
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws.map((d) => d.reason)).toEqual([
        "test-slot-negates-type",
        "test-slot-soundproof",
      ]);
      expect(result.rng.calls).toBe(2);
    },
  );

  it("never caches the ability guess: both preamble call sites redraw fresh even with an identical rng value", () => {
    // A synthetic (rngValue, seed) pair chosen so both draws' randomValue happen
    // to be identical is not required here -- what's asserted is structural:
    // two independent Random() calls occur, not a single cached lookup reused
    // twice. rng.calls strictly increases by 1 per draw, and each draw's
    // `before`/`after` differ.
    const result = run(MOVE_SURF, MAROWAK);
    if (result.kind !== "scored") throw new Error("unreachable");
    const [first, second] = result.draws;
    expect(first!.after).toEqual(second!.before);
    expect(first!.before).not.toEqual(second!.before);
  });

  it("skips the redraw entirely once the ability is known (BattleHistory-style cache input)", () => {
    const known: FactoryAiCheckBadMoveTarget = { ...MAROWAK, knownAbility: "ABILITY_ROCK_HEAD" };
    const result = run(MOVE_SURF, known);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("uses the real (not guessed) ability for a trapper species, without drawing", () => {
    const trapper: FactoryAiCheckBadMoveTarget = {
      species: 25, // SPECIES_PIKACHU (single ability, irrelevant -- realAbility short-circuits first)
      types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
      knownAbility: null,
      realAbility: "ABILITY_SHADOW_TAG",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_SURF, trapper);
    expect(result).toMatchObject({ kind: "scored" });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -12 when the guessed ability is Volt Absorb and the move is Electric-type", () => {
    const knownVoltAbsorb: FactoryAiCheckBadMoveTarget = {
      species: 171, // SPECIES_LANTURN: Volt Absorb / Water Absorb
      types: ["TYPE_GRASS", "TYPE_GRASS"], // non-immune to Electric, isolates the ability branch
      knownAbility: "ABILITY_VOLT_ABSORB",
      realAbility: "ABILITY_VOLT_ABSORB",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_THUNDERBOLT, knownVoltAbsorb);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -12 });
  });

  it("falls through to soundproof (not negated) when the guessed ability doesn't match the move's type", () => {
    const knownWaterAbsorb: FactoryAiCheckBadMoveTarget = {
      species: 171,
      types: ["TYPE_GRASS", "TYPE_GRASS"],
      knownAbility: "ABILITY_WATER_ABSORB",
      realAbility: "ABILITY_WATER_ABSORB",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_THUNDERBOLT /* Electric, not Water */, knownWaterAbsorb);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0); // ability already known -> no draws either way
  });

  it("scores -10 for a Wonder Guard target when the considered move isn't x2 effective", () => {
    const wonderGuardTarget: FactoryAiCheckBadMoveTarget = {
      species: 386, // SPECIES_DEOXYS-ish placeholder unused; Wonder Guard is realAbility-independent here
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_BODY_SLAM /* Normal vs Normal = 1x, not x2 */, wonderGuardTarget);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("scores -10 for a Soundproof target on a sound move in the nine-move list", () => {
    const soundproofTarget: FactoryAiCheckBadMoveTarget = {
      species: 1,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_SOUNDPROOF",
      realAbility: "ABILITY_SOUNDPROOF",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_SNORE, soundproofTarget);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("halts with a named unsupported-branch barrier for a move whose effect has an if_effect table entry", () => {
    const result = run(MOVE_HAZE, { ...MAROWAK, knownAbility: "ABILITY_ROCK_HEAD" });
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
      moveId: MOVE_HAZE,
    });
  });

  it("reproduces the exact ground-truth Scenario A per-slot draw/score shape (docs/factory-ai-ground-truth.md §4 item 2/§0(2))", () => {
    const slots = [MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT];
    let rng = { value: 249_678_687, calls: 0 };
    let totalDraws = 0;
    const scores: number[] = [];
    for (const moveId of slots) {
      const result = runCheckBadMovePreamble({
        rng,
        moveId,
        target: MAROWAK,
        attacker: NEUTRAL_ATTACKER,
        drawOrdinalStart: totalDraws + 1,
        reasonPrefix: `slot-${moveId}`,
      });
      if (result.kind !== "scored") throw new Error(`expected scored, got barrier for move ${moveId}`);
      rng = result.rng;
      totalDraws += result.draws.length;
      scores.push(result.scoreDelta);
    }
    // Surf/RockSlide/BodySlam: 2 draws each (ability-negation + soundproof,
    // neither matches Rock Head/Lightning Rod); Thunderbolt: 0 (x0 short-circuit).
    expect(totalDraws).toBe(6);
    expect(scores).toEqual([0, 0, 0, -10]);
  });
});

describe("AI_CBM_Sleep (docs/factory-ai-checkviability-ground-truth.md §29)", () => {
  const MOVE_SING = 47;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it.each([
    ["Insomnia", { knownAbility: "ABILITY_INSOMNIA", realAbility: "ABILITY_INSOMNIA" }],
    ["Vital Spirit", { knownAbility: "ABILITY_VITAL_SPIRIT", realAbility: "ABILITY_VITAL_SPIRIT" }],
    ["any primary status", { hasAnyStatus: true }],
    ["Safeguard", { safeguardUp: true }],
  ])("%s gate JUMPs to Score_Minus10", (_label, overrides) => {
    const result = run(MOVE_SING, target(overrides));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("all four gates FALL THROUGH to end for an eligible target", () => {
    const result = run(MOVE_SING, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("executes the handler's own fresh get_ability after the universal preamble", () => {
    const result = run(MOVE_SING, { ...MAROWAK, hasAnyStatus: true });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-sleep-ability",
    ]);
  });

  it("leaves the next unported CBM table effect behind the generic barrier", () => {
    expect(run(MOVE_HAZE, target())).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
      moveId: MOVE_HAZE,
    });
  });
});

describe("AI_CBM_Roar (docs/factory-ai-checkviability-ground-truth.md §30)", () => {
  const MOVE_ROAR = 46;

  function target(overrides: Partial<FactoryAiCheckBadMoveRoarTarget> = {}): FactoryAiCheckBadMoveRoarTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      usablePartyMons: 1,
      ...overrides,
    });
  }

  it("usable-party count 0 JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_ROAR, target({
      species: 111,
      knownAbility: null,
      realAbility: "ABILITY_LIGHTNING_ROD",
      usablePartyMons: 0,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual(["test-slot-soundproof"]);
  });

  it("positive usable-party count FALLS THROUGH; Suction Cups JUMPs to Score_Minus10", () => {
    const result = run(MOVE_ROAR, target({
      knownAbility: "ABILITY_SUCTION_CUPS",
      realAbility: "ABILITY_SUCTION_CUPS",
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("positive usable-party count and another ability FALL THROUGH to end", () => {
    expect(run(MOVE_ROAR, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("executes the handler's fresh get_ability only after the count gate falls through", () => {
    const result = run(MOVE_ROAR, target({
      species: 111,
      knownAbility: null,
      realAbility: "ABILITY_LIGHTNING_ROD",
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-roar-ability",
    ]);
  });

  it("leaves Haze behind the same generic CBM barrier", () => {
    expect(run(MOVE_HAZE, target())).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
    });
  });
});

describe("AI_CBM_Paralyze (docs/factory-ai-checkviability-ground-truth.md §31)", () => {
  const MOVE_THUNDER_WAVE = 86;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("type immunity JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_THUNDER_WAVE, {
      ...MAROWAK,
      knownAbility: null,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual(["test-slot-soundproof"]);
  });

  it("nonimmune type FALLS THROUGH; Limber JUMPs to Score_Minus10", () => {
    expect(run(MOVE_THUNDER_WAVE, target({
      species: 132,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_LIMBER",
      realAbility: "ABILITY_LIMBER",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it.each([
    ["any primary status", { hasAnyStatus: true }],
    ["Safeguard", { safeguardUp: true }],
  ])("%s gate JUMPs to Score_Minus10 after the non-Limber ability FALLTHROUGH", (_label, overrides) => {
    expect(run(MOVE_THUNDER_WAVE, target(overrides))).toMatchObject({
      kind: "scored",
      scoreDelta: -10,
      draws: [],
    });
  });

  it("all four gates FALL THROUGH to end for an eligible target", () => {
    expect(run(MOVE_THUNDER_WAVE, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("executes the handler's own fresh get_ability after the universal preamble", () => {
    const result = run(MOVE_THUNDER_WAVE, {
      ...MAROWAK,
      types: ["TYPE_ROCK", "TYPE_ROCK"],
      hasAnyStatus: true,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-paralyze-ability",
    ]);
  });

  it("leaves Haze behind the same generic CBM barrier", () => {
    expect(run(MOVE_HAZE, target())).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
    });
  });
});

describe("AI_CBM_Toxic (data/battle_ai_scripts.s:341-352)", () => {
  const CLEAN_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213, // Shuckle: single known-by-species Sturdy keeps all handler draws at zero.
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it.each([
    [["TYPE_STEEL", "TYPE_FLYING"] as const, "type 1 Steel"],
    [["TYPE_NORMAL", "TYPE_POISON"] as const, "type 2 Poison"],
  ])("scores -10 at the source-ordered type gates with no handler draw: %s", (types, _label) => {
    const result = run(MOVE_TOXIC, { ...MAROWAK, types, knownAbility: "ABILITY_ROCK_HEAD" });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 for Immunity after the type gates", () => {
    const result = run(MOVE_TOXIC, {
      ...CLEAN_TARGET,
      knownAbility: "ABILITY_IMMUNITY",
      realAbility: "ABILITY_IMMUNITY",
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it.each([
    [{ hasAnyStatus: true }, "STATUS1_ANY"],
    [{ safeguardUp: true }, "SIDE_STATUS_SAFEGUARD"],
  ])("scores -10 at the final source gates: %s", (patch, _label) => {
    const result = run(MOVE_TOXIC, { ...CLEAN_TARGET, ...patch });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it.each([
    [MOVE_TOXIC, "EFFECT_TOXIC"],
    [MOVE_POISON_POWDER, "EFFECT_POISON"],
  ])("ports both table entries sharing the clean AI_CBM_Toxic end: move %i %s", (moveId) => {
    const result = run(moveId, CLEAN_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("keeps the handler get_ability after Soundproof and before the status gate", () => {
    const result = run(MOVE_TOXIC, { ...MAROWAK, hasAnyStatus: true });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map(({ reason }) => reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-toxic-immunity",
    ]);
    expect(result.rng.calls).toBe(2);
  });
});

// data/battle_ai_scripts.s:287-312, docs/factory-ai-checkviability-ground-truth.md's
// proven CBM+CV pair (§6 is the CV half; this is the CBM half).
describe("AI_CBM_SpeedDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §6)", () => {
  // Marowak's own realAbility is ambiguous (Rock Head / Lightning Rod, two
  // distinct abilities) -- it still draws once for the universal preamble's
  // OWN soundproof guess regardless of this handler, so the "zero total
  // draws" claim below needs a single-ability target (Shuckle, this doc's
  // own §6 fixture species) to isolate the SpeedDown branch's own zero-RNG
  // MIN_STAT_STAGE short-circuit cleanly.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -10 with zero draws when the target's Speed stage is already MIN_STAT_STAGE", () => {
    const atMinSpeed: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, speedStage: 0 };
    const result = run(MOVE_STRING_SHOT, atMinSpeed);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("EFFECT_SPEED_DOWN_2 hits the identical MIN_STAT_STAGE short-circuit", () => {
    const atMinSpeed: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, speedStage: 0 };
    const result = run(MOVE_COTTON_SPORE, atMinSpeed);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a Speed Boost target (if_ability, zero-RNG check_ability, not a get_ability guess)", () => {
    const speedBoost: FactoryAiCheckBadMoveTarget = {
      species: 302, // SPECIES_NINJASK: Speed Boost is its only ability
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_STRING_SHOT, speedBoost);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("if_ability's own quirk: an UNKNOWN two-ability target never registers a check_ability match, even when one of its two abilities is the one being asked about", () => {
    // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved -- real
    // source behavior (Cmd_check_ability's abilityDummyVariable branch) is
    // that check_ability can never return true for such a target, so the
    // MIN_STAT_STAGE/Speed-Boost short-circuits both miss and the shared
    // CheckIfAbilityBlocksStatChange tail's own get_ability guess runs.
    const ambiguousSpeedBoost: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_STRING_SHOT, ambiguousSpeedBoost);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    // One draw for the universal preamble's own soundproof guess, one for
    // CheckIfAbilityBlocksStatChange's get_ability guess -- neither can ever
    // land on Clear Body/White Smoke for this species, so scoreDelta stays 0
    // regardless of the coin flip, but both draws are real.
    expect(result.draws).toHaveLength(2);
  });

  it("scores -10 when CheckIfAbilityBlocksStatChange's get_ability guess is Clear Body (known ability, zero draws)", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_STRING_SHOT, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 when CheckIfAbilityBlocksStatChange's get_ability guess is White Smoke (known ability, zero draws)", () => {
    const knownWhiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: "ABILITY_WHITE_SMOKE",
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_STRING_SHOT, knownWhiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("still barriers every other reachable CBM handler untouched by this narrowing (pass-through, EFFECT_HAZE)", () => {
    const result = run(MOVE_HAZE, { ...MAROWAK, knownAbility: "ABILITY_ROCK_HEAD" });
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
      moveId: MOVE_HAZE,
    });
  });
});

// data/battle_ai_scripts.s:277-281,308-312, docs/factory-ai-checkviability-ground-truth.md
// §14.1: the first CBM-blocked pair's own CBM half (this is the CBM side;
// AI_CV_AttackDown, the CV side, is in factoryAiCheckViability.test.ts).
describe("AI_CBM_AttackDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §14.1)", () => {
  const MOVE_GROWL = 45; // EFFECT_ATTACK_DOWN
  const MOVE_CHARM = 204; // EFFECT_ATTACK_DOWN_2 -- same handler, different table entry

  // Single-ability species so both draw sites' free-guess path is exercised
  // without a confound (doc §14.2's own porter guidance).
  const PINSIR: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 127, // Hyper Cutter is its only ability
    types: ["TYPE_BUG", "TYPE_BUG"] as const,
    knownAbility: null,
    realAbility: "ABILITY_HYPER_CUTTER",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -10 with zero draws when the target's ATK stage is already MIN_STAT_STAGE", () => {
    const atMinAtk: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, atkStage: 0 };
    const result = run(MOVE_GROWL, atMinAtk);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("EFFECT_ATTACK_DOWN_2 hits the identical MIN_STAT_STAGE short-circuit", () => {
    const atMinAtk: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, atkStage: 0 };
    const result = run(MOVE_CHARM, atMinAtk);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability Hyper Cutter target (get_ability's own free guess, the first of the handler's two draw sites)", () => {
    const result = run(MOVE_GROWL, PINSIR);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws when Hyper Cutter is the known (BattleHistory-cached) ability", () => {
    const known: FactoryAiCheckBadMoveTarget = { ...PINSIR, knownAbility: "ABILITY_HYPER_CUTTER" };
    const result = run(MOVE_GROWL, known);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability is Hyper Cutter, Clear Body, or White Smoke) draws exactly three times -- the universal preamble's own soundproof guess, plus once per AttackDown draw site -- and scores 0", () => {
    // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved -- neither
    // can ever land on Soundproof (universal preamble), Hyper Cutter (first
    // AttackDown draw site), or Clear Body/White Smoke (shared-tail second
    // draw site). Growl is 0-power (MOVE_POWER_OTHER), so the preamble's own
    // type-negation ability guess is skipped -- only its soundproof guess
    // draws, same convention the SpeedDown tests already established for why
    // Marowak (also ambiguous) can't isolate a handler's own draw count.
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_GROWL, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(3);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-attack-down-hyper-cutter",
      "test-slot-attack-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws (second draw site, known-ability short-circuit)", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_GROWL, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (second draw site's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_GROWL, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("still barriers every other reachable CBM handler untouched by this narrowing (pass-through, EFFECT_HAZE)", () => {
    const result = run(MOVE_HAZE, PINSIR);
    expect(result).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
    });
  });
});

// data/battle_ai_scripts.s:283-285,308-312, docs/factory-ai-checkviability-ground-truth.md
// §15.1: the second CBM-blocked pair's own CBM half (this is the CBM side;
// AI_CV_DefenseDown, the CV side, is in factoryAiCheckViability.test.ts).
// Unlike AI_CBM_AttackDown, this handler has no intervening get_ability call
// of its own before the shared tail -- just a bare MIN_STAT_STAGE gate then
// a direct goto -- so the shared tail's own get_ability fires at most once.
describe("AI_CBM_DefenseDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §15.1)", () => {
  const MOVE_TAIL_WHIP = 39; // EFFECT_DEFENSE_DOWN
  const MOVE_SCREECH = 103; // EFFECT_DEFENSE_DOWN_2 -- same handler, different table entry

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -10 with zero draws when the target's DEF stage is already MIN_STAT_STAGE", () => {
    const atMinDef: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, defStage: 0 };
    const result = run(MOVE_TAIL_WHIP, atMinDef);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("EFFECT_DEFENSE_DOWN_2 hits the identical MIN_STAT_STAGE short-circuit", () => {
    const atMinDef: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, defStage: 0 };
    const result = run(MOVE_SCREECH, atMinDef);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability is Clear Body nor White Smoke) draws exactly twice -- the universal preamble's own soundproof guess, plus the shared tail's own -- and scores 0", () => {
    // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved -- Tail
    // Whip is 0-power (MOVE_POWER_OTHER), so the preamble's own type-negation
    // ability guess is skipped, same convention the AttackDown block already
    // established.
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_TAIL_WHIP, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-defense-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_TAIL_WHIP, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (shared tail's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_TAIL_WHIP, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

// data/battle_ai_scripts.s:296-298,308-312, docs/factory-ai-checkviability-ground-truth.md
// §16.1: the third CBM-blocked pair's own CBM half -- byte-for-byte the same
// shape as AI_CBM_DefenseDown above with STAT_SPDEF swapped for STAT_DEF.
// EFFECT_SPECIAL_DEFENSE_DOWN itself is unused by any real move (doc §16.2),
// so every test here dispatches via the _2 table entry; MOVE_FAKE_TEARS (not
// MOVE_METAL_SOUND, which is in the Soundproof nine-move list) keeps the
// universal preamble's own soundproof guess from confounding the handler's
// own scoreDelta.
describe("AI_CBM_SpDefDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §16.1)", () => {
  const MOVE_FAKE_TEARS = 313; // EFFECT_SPECIAL_DEFENSE_DOWN_2
  const MOVE_METAL_SOUND = 319; // EFFECT_SPECIAL_DEFENSE_DOWN_2 -- same handler, different table entry (also Soundproof-blocked)

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -10 with zero draws when the target's SPDEF stage is already MIN_STAT_STAGE", () => {
    const atMinSpDef: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, spDefStage: 0 };
    const result = run(MOVE_FAKE_TEARS, atMinSpDef);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("MOVE_METAL_SOUND dispatches to the identical handler (both are EFFECT_SPECIAL_DEFENSE_DOWN_2)", () => {
    const atMinSpDef: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, spDefStage: 0 };
    const result = run(MOVE_METAL_SOUND, atMinSpDef);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability is Clear Body nor White Smoke) draws exactly twice -- the universal preamble's own soundproof guess, plus the shared tail's own -- and scores 0", () => {
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_FAKE_TEARS, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-sp-def-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_FAKE_TEARS, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (shared tail's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_FAKE_TEARS, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

// data/battle_ai_scripts.s:249-251/253-255/581-584,
// docs/factory-ai-checkviability-ground-truth.md §17.1/§18.1. Unlike every
// stat-DOWN CBM handler above, these three read AI_USER's OWN ATK/DEF stat
// stage (the ATTACKER, not the target) and never call get_ability at all --
// a bare MAX_STAT_STAGE gate, no shared CheckIfAbilityBlocksStatChange tail.
describe("AI_CBM_AttackUp / AI_CBM_DefenseUp / AI_CBM_BulkUp (docs/factory-ai-checkviability-ground-truth.md §17.1/§18.1)", () => {
  const MOVE_MEDITATE = 96; // EFFECT_ATTACK_UP
  const MOVE_SWORDS_DANCE = 14; // EFFECT_ATTACK_UP_2 -- same handler, different table entry
  const MOVE_HARDEN = 106; // EFFECT_DEFENSE_UP
  const MOVE_ACID_ARMOR = 151; // EFFECT_DEFENSE_UP_2 -- same handler, different table entry
  const MOVE_DEFENSE_CURL = 111; // EFFECT_DEFENSE_CURL -- also routes to AI_CBM_DefenseUp, CBM-only (doc §18.1)
  const MOVE_BULK_UP = 339; // EFFECT_BULK_UP -- separate handler, CBM side only

  // Single-ability (Sturdy) target: the universal preamble's own soundproof
  // guess (still run for every move, including these 0-power stat-up moves)
  // costs zero real draws here, isolating each handler's own zero-RNG gate.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withAttacker(atkStage: number, defStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage, defStage });
  }

  it.each([
    ["Meditate (EFFECT_ATTACK_UP)", MOVE_MEDITATE],
    ["Swords Dance (EFFECT_ATTACK_UP_2)", MOVE_SWORDS_DANCE],
  ])("AI_CBM_AttackUp: %s scores -10 with zero draws when AI_USER's own ATK stage is already MAX_STAT_STAGE (12)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 6, 0])("AI_CBM_AttackUp: scores 0 with zero draws when AI_USER's own ATK stage is %i (not maxed)", (atkStage) => {
    const result = run(MOVE_MEDITATE, SHUCKLE, undefined, withAttacker(atkStage, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([
    ["Harden (EFFECT_DEFENSE_UP)", MOVE_HARDEN],
    ["Acid Armor (EFFECT_DEFENSE_UP_2)", MOVE_ACID_ARMOR],
    ["Defense Curl (EFFECT_DEFENSE_CURL, CBM-only dispatch)", MOVE_DEFENSE_CURL],
  ])("AI_CBM_DefenseUp: %s scores -10 with zero draws when AI_USER's own DEF stage is already MAX_STAT_STAGE (12)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_DefenseUp: scores 0 with zero draws when AI_USER's own DEF stage is not maxed", () => {
    const result = run(MOVE_HARDEN, SHUCKLE, undefined, withAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_BulkUp: scores -18 (both gates fire independently, -10 + -8) when both ATK and DEF are already MAX_STAT_STAGE", () => {
    const result = run(MOVE_BULK_UP, SHUCKLE, undefined, withAttacker(12, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_BulkUp: scores -10 (only the ATK gate fires) when ATK is maxed but DEF is not", () => {
    const result = run(MOVE_BULK_UP, SHUCKLE, undefined, withAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("AI_CBM_BulkUp: scores -8 (only the DEF gate fires) when DEF is maxed but ATK is not", () => {
    const result = run(MOVE_BULK_UP, SHUCKLE, undefined, withAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("AI_CBM_BulkUp: scores 0 when neither ATK nor DEF is maxed", () => {
    const result = run(MOVE_BULK_UP, SHUCKLE, undefined, withAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

// data/battle_ai_scripts.s:257-259/261-263,
// docs/factory-ai-checkviability-ground-truth.md §20.1/§21.1. Byte-for-byte
// the same bare MAX_STAT_STAGE-on-AI_USER's-own-stage shape as
// AI_CBM_AttackUp/AI_CBM_DefenseUp above, with STAT_SPEED/STAT_SPATK
// swapped in -- zero get_ability calls, no shared tail.
describe("AI_CBM_SpeedUp / AI_CBM_SpAtkUp (docs/factory-ai-checkviability-ground-truth.md §20.1/§21.1)", () => {
  const MOVE_AGILITY = 97; // EFFECT_SPEED_UP_2 -- EFFECT_SPEED_UP itself has no real move (like EFFECT_ACCURACY_DOWN_2)
  const MOVE_GROWTH = 74; // EFFECT_SPECIAL_ATTACK_UP
  const MOVE_TAIL_GLOW = 294; // EFFECT_SPECIAL_ATTACK_UP_2 -- same handler, different table entry

  // Single-ability (Sturdy) target, same species/rationale as the
  // AttackUp/DefenseUp/BulkUp block's own SHUCKLE above (out of scope here,
  // this describe block's own sibling) -- isolates each handler's own
  // zero-RNG gate from the universal soundproof preamble's get_ability draw.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withSpeedAttacker(speedStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, speedStage });
  }
  function withSpAtkAttacker(spAtkStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, spAtkStage });
  }

  it("AI_CBM_SpeedUp: Agility (EFFECT_SPEED_UP_2) scores -10 with zero draws when AI_USER's own SPEED stage is already MAX_STAT_STAGE (12)", () => {
    const result = run(MOVE_AGILITY, SHUCKLE, undefined, withSpeedAttacker(12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 6, 0])("AI_CBM_SpeedUp: scores 0 with zero draws when AI_USER's own SPEED stage is %i (not maxed)", (speedStage) => {
    const result = run(MOVE_AGILITY, SHUCKLE, undefined, withSpeedAttacker(speedStage));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_SpeedUp: omitted speedStage defaults to DEFAULT_STAT_STAGE (6, not maxed) -- scores 0", () => {
    const result = run(MOVE_AGILITY, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it.each([
    ["Growth (EFFECT_SPECIAL_ATTACK_UP)", MOVE_GROWTH],
    ["Tail Glow (EFFECT_SPECIAL_ATTACK_UP_2)", MOVE_TAIL_GLOW],
  ])("AI_CBM_SpAtkUp: %s scores -10 with zero draws when AI_USER's own SPATK stage is already MAX_STAT_STAGE (12)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withSpAtkAttacker(12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 6, 0])("AI_CBM_SpAtkUp: scores 0 with zero draws when AI_USER's own SPATK stage is %i (not maxed)", (spAtkStage) => {
    const result = run(MOVE_GROWTH, SHUCKLE, undefined, withSpAtkAttacker(spAtkStage));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_SpAtkUp: omitted spAtkStage defaults to DEFAULT_STAT_STAGE (6, not maxed) -- scores 0", () => {
    const result = run(MOVE_GROWTH, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

// data/battle_ai_scripts.s:265-267, docs/factory-ai-checkviability-ground-
// truth.md §28. Byte-for-byte the same bare MAX_STAT_STAGE-on-AI_USER gate
// as AttackUp/SpeedUp/SpAtkUp. The CV half is the already-ported shared
// AI_CV_SpDefUp body (§22), so these tests close the remaining CBM branch.
describe("AI_CBM_SpDefUp (docs/factory-ai-checkviability-ground-truth.md §28)", () => {
  const MOVE_AMNESIA = 133; // EFFECT_SPECIAL_DEFENSE_UP_2

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("JUMP applies Score_Minus10 with zero draws when AI_USER's own SPDEF stage equals MAX_STAT_STAGE", () => {
    const result = run(
      MOVE_AMNESIA,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 6, defStage: 6, spDefStage: 12 }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 6, 0])("FALLTHROUGH reaches end and skips Score_Minus10 with zero draws when AI_USER's own SPDEF stage is %i", (spDefStage) => {
    const result = run(
      MOVE_AMNESIA,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 6, defStage: 6, spDefStage }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("omitted spDefStage defaults to DEFAULT_STAT_STAGE and the next unported table effect still reaches the generic barrier", () => {
    const amnesia = run(MOVE_AMNESIA, SHUCKLE);
    expect(amnesia).toMatchObject({ kind: "scored", scoreDelta: 0 });

    const MOVE_HAZE = 114;
    expect(run(MOVE_HAZE, SHUCKLE)).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
      moveId: MOVE_HAZE,
    });
  });
});

// data/battle_ai_scripts.s:576-579/590-593, docs/factory-ai-checkviability-ground-truth.md
// §22.1: the ninth CBM-blocked pair's own CBM half -- unlike every stat-UP
// handler above, TWO SEPARATE dual-stat handlers (the AI_CBM_BulkUp/
// AI_CBM_DragonDance shape, §18.1), each independently checking both stats
// its own move raises (-10 first stat, -8 second), not aliases of each
// other or of AI_CBM_DefenseUp/AI_CBM_SpAtkUp/AI_CBM_SpDefUp.
describe("AI_CBM_CosmicPower / AI_CBM_CalmMind (docs/factory-ai-checkviability-ground-truth.md §22.1)", () => {
  const MOVE_COSMIC_POWER = 322; // EFFECT_COSMIC_POWER
  const MOVE_CALM_MIND = 347; // EFFECT_CALM_MIND

  // Single-ability (Sturdy) target, same species/rationale as the
  // AttackUp/DefenseUp/BulkUp/SpeedUp/SpAtkUp blocks' own SHUCKLE above.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withCosmicPowerAttacker(defStage: number, spDefStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage, spDefStage });
  }
  function withCalmMindAttacker(spAtkStage: number, spDefStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, spAtkStage, spDefStage });
  }

  it("AI_CBM_CosmicPower: scores -18 (both gates fire independently, -10 + -8) when both DEF and SPDEF are already MAX_STAT_STAGE", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, withCosmicPowerAttacker(12, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_CosmicPower: scores -10 (only the DEF gate fires) when DEF is maxed but SPDEF is not", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, withCosmicPowerAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("AI_CBM_CosmicPower: scores -8 (only the SPDEF gate fires) when SPDEF is maxed but DEF is not", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, withCosmicPowerAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("AI_CBM_CosmicPower: scores 0 with zero draws when neither DEF nor SPDEF is maxed", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, withCosmicPowerAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_CosmicPower: omitted spDefStage defaults to DEFAULT_STAT_STAGE (6, not maxed) -- DEF-only gate still fires", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 12 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("AI_CBM_CalmMind: scores -18 (both gates fire independently, -10 + -8) when both SPATK and SPDEF are already MAX_STAT_STAGE", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, withCalmMindAttacker(12, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_CalmMind: scores -10 (only the SPATK gate fires) when SPATK is maxed but SPDEF is not", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, withCalmMindAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("AI_CBM_CalmMind: scores -8 (only the SPDEF gate fires) when SPDEF is maxed but SPATK is not", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, withCalmMindAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("AI_CBM_CalmMind: scores 0 with zero draws when neither SPATK nor SPDEF is maxed", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, withCalmMindAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_CalmMind: omitted spAtkStage/spDefStage both default to DEFAULT_STAT_STAGE (6, not maxed) -- scores 0", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

// data/battle_ai_scripts.s:300-312, docs/factory-ai-checkviability-ground-truth.md
// §19.1: the sixth CBM-blocked pair's own CBM half (this is the CBM side;
// AI_CV_AccuracyDown, the CV side, is in factoryAiCheckViability.test.ts).
// Unlike AI_CBM_DefenseDown/SpDefDown (bare MIN_STAT_STAGE gate, direct goto),
// this handler has its own extra ABILITY_KEEN_EYE get_ability call first --
// the same two-draw-site shape AI_CBM_AttackDown already established for
// Hyper Cutter.
describe("AI_CBM_AccDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §19.1)", () => {
  const MOVE_SAND_ATTACK = 28; // EFFECT_ACCURACY_DOWN

  // Single-ability species so both draw sites' free-guess path is exercised
  // without a confound (doc §14.2's own porter guidance, reused here).
  const PIDGEOTTO: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 17, // SPECIES_PIDGEOTTO: Keen Eye is its only ability
    types: ["TYPE_NORMAL", "TYPE_FLYING"] as const,
    knownAbility: null,
    realAbility: "ABILITY_KEEN_EYE",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    accStage: 6,
  });
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    accStage: 6,
  });

  it("scores -10 with zero draws when the target's ACC stage is already MIN_STAT_STAGE", () => {
    const atMinAcc: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, accStage: 0 };
    const result = run(MOVE_SAND_ATTACK, atMinAcc);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("defaults an omitted accStage to DEFAULT_STAT_STAGE (6), not MIN_STAT_STAGE -- doesn't short-circuit", () => {
    const { accStage: _omit, ...withoutAccStage } = SHUCKLE;
    const result = run(MOVE_SAND_ATTACK, withoutAccStage as FactoryAiCheckBadMoveTarget);
    // Sturdy is neither Keen Eye nor Clear Body/White Smoke -- falls through
    // both draw sites to score 0, proving the gate did NOT fire at MIN.
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("scores -10 with zero draws for a single-ability Keen Eye target (get_ability's own free guess, the first of the handler's two draw sites)", () => {
    const result = run(MOVE_SAND_ATTACK, PIDGEOTTO);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws when Keen Eye is the known (BattleHistory-cached) ability", () => {
    const known: FactoryAiCheckBadMoveTarget = { ...PIDGEOTTO, knownAbility: "ABILITY_KEEN_EYE" };
    const result = run(MOVE_SAND_ATTACK, known);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability is Keen Eye, Clear Body, or White Smoke) draws exactly three times -- the universal preamble's own soundproof guess, plus once per AccDown draw site -- and scores 0", () => {
    // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved -- neither
    // can ever land on Soundproof (universal preamble), Keen Eye (first
    // AccDown draw site), or Clear Body/White Smoke (shared-tail second
    // draw site). Sand Attack is 0-power (MOVE_POWER_OTHER), so the
    // preamble's own type-negation ability guess is skipped -- only its
    // soundproof guess draws, same convention the AttackDown block already
    // established.
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      accStage: 6,
    };
    const result = run(MOVE_SAND_ATTACK, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(3);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-acc-down-keen-eye",
      "test-slot-acc-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws (second draw site, known-ability short-circuit)", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      accStage: 6,
    };
    const result = run(MOVE_SAND_ATTACK, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (second draw site's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      accStage: 6,
    };
    const result = run(MOVE_SAND_ATTACK, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("still barriers every other reachable CBM handler untouched by this narrowing (pass-through, EFFECT_HAZE)", () => {
    const result = run(MOVE_HAZE, PIDGEOTTO);
    expect(result).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
    });
  });

  it("EFFECT_ACCURACY_DOWN_2 is a vestigial constant with zero real moves (doc §19.1) -- not independently testable through a real move ID, confirmed absent from the generated move table", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_ACCURACY_DOWN_2")).toBe(false);
  });
});

// data/battle_ai_scripts.s:354-356/393-395, docs/factory-ai-checkviability-ground-truth.md
// §23.1: the tenth CBM-blocked pair's own CBM half -- the smallest CBM
// handler shape in this doc to date, a single AI_USER-own-side-status bit
// test with zero stat-stage read and zero get_ability call.
describe("AI_CBM_LightScreen / AI_CBM_Reflect (docs/factory-ai-checkviability-ground-truth.md §23.1)", () => {
  const MOVE_LIGHT_SCREEN = 113; // EFFECT_LIGHT_SCREEN
  const MOVE_REFLECT = 115; // EFFECT_REFLECT

  // Single-ability (Sturdy) target, same species/rationale as the
  // AttackUp/DefenseUp/BulkUp/SpeedUp/SpAtkUp/CosmicPower/CalmMind blocks'
  // own SHUCKLE above.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("AI_CBM_LightScreen: scores -8 when AI_USER's own light screen is up", () => {
    const result = run(MOVE_LIGHT_SCREEN, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, lightScreenUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_LightScreen: scores 0 with zero draws when AI_USER's own light screen is not up", () => {
    const result = run(MOVE_LIGHT_SCREEN, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, lightScreenUp: false }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_LightScreen: omitted lightScreenUp defaults to false (not up) -- scores 0", () => {
    const result = run(MOVE_LIGHT_SCREEN, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("AI_CBM_LightScreen: AI_USER's own reflectUp is irrelevant to this gate (distinct SIDE_STATUS_* bits)", () => {
    const result = run(MOVE_LIGHT_SCREEN, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, reflectUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("AI_CBM_Reflect: scores -8 when AI_USER's own reflect is up", () => {
    const result = run(MOVE_REFLECT, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, reflectUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_Reflect: scores 0 with zero draws when AI_USER's own reflect is not up", () => {
    const result = run(MOVE_REFLECT, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, reflectUp: false }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_Reflect: omitted reflectUp defaults to false (not up) -- scores 0", () => {
    const result = run(MOVE_REFLECT, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("AI_CBM_Reflect: AI_USER's own lightScreenUp is irrelevant to this gate (distinct SIDE_STATUS_* bits)", () => {
    const result = run(MOVE_REFLECT, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, lightScreenUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

// data/battle_ai_scripts.s:273-275, docs/factory-ai-checkviability-ground-truth.md
// §24.1: the eleventh CBM-blocked pair's own CBM half -- byte-for-byte the
// same bare 2-instruction MAX_STAT_STAGE-on-AI_USER's-own-stage shape as
// AI_CBM_AttackUp/DefenseUp/SpeedUp/SpAtkUp with STAT_EVASION swapped in.
describe("AI_CBM_EvasionUp (docs/factory-ai-checkviability-ground-truth.md §24.1)", () => {
  const MOVE_DOUBLE_TEAM = 104; // EFFECT_EVASION_UP
  const MOVE_MINIMIZE = 107; // EFFECT_MINIMIZE -- shares this same single-stat handler

  // Single-ability (Sturdy) target, same rationale as the AttackUp/DefenseUp/
  // BulkUp block's own SHUCKLE above -- isolates the zero-RNG gate from the
  // universal preamble's own soundproof guess.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withEvasionAttacker(evasionStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, evasionStage });
  }

  it.each([
    ["Double Team (EFFECT_EVASION_UP)", MOVE_DOUBLE_TEAM],
    ["Minimize (EFFECT_MINIMIZE, shares this same handler per doc §24.1/§24.7)", MOVE_MINIMIZE],
  ])("%s scores -10 with zero draws when AI_USER's own EVASION stage is already MAX_STAT_STAGE (12)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withEvasionAttacker(12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 7, 6, 0])("scores 0 with zero draws when AI_USER's own EVASION stage is %i (not maxed)", (evasionStage) => {
    const result = run(MOVE_DOUBLE_TEAM, SHUCKLE, undefined, withEvasionAttacker(evasionStage));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("omitted evasionStage defaults to DEFAULT_STAT_STAGE (6), not MAX_STAT_STAGE -- scores 0", () => {
    const result = run(MOVE_DOUBLE_TEAM, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("EFFECT_EVASION_UP_2 is a vestigial constant with zero real moves (doc §24.7) -- not independently testable through a real move ID, confirmed absent from the generated move table", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_EVASION_UP_2")).toBe(false);
  });
});

// data/battle_ai_scripts.s:306-312, docs/factory-ai-checkviability-ground-truth.md
// §24.1: the eleventh CBM-blocked pair's other CBM half -- the same bare
// MIN_STAT_STAGE-gate-plus-shared-tail shape AI_CBM_DefenseDown/SpDefDown
// already established (no own-ability short-circuit like AttackDown/AccDown's
// Hyper Cutter/Keen Eye -- no dedicated evasion-immunity ability in Gen 3).
describe("AI_CBM_EvasionDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §24.1)", () => {
  const MOVE_SWEET_SCENT = 230; // EFFECT_EVASION_DOWN

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    evasionStage: 6,
  });

  it("scores -10 with zero draws when the target's EVASION stage is already MIN_STAT_STAGE", () => {
    const atMinEvasion: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, evasionStage: 0 };
    const result = run(MOVE_SWEET_SCENT, atMinEvasion);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("defaults an omitted evasionStage to DEFAULT_STAT_STAGE (6), not MIN_STAT_STAGE -- doesn't short-circuit", () => {
    const { evasionStage: _omit, ...withoutEvasionStage } = SHUCKLE;
    const result = run(MOVE_SWEET_SCENT, withoutEvasionStage as FactoryAiCheckBadMoveTarget);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("an ambiguous two-ability target (neither ability is Clear Body nor White Smoke) draws exactly twice -- the universal preamble's own soundproof guess, plus the shared tail's own -- and scores 0", () => {
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      evasionStage: 6,
    };
    const result = run(MOVE_SWEET_SCENT, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-evasion-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      evasionStage: 6,
    };
    const result = run(MOVE_SWEET_SCENT, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (shared tail's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      evasionStage: 6,
    };
    const result = run(MOVE_SWEET_SCENT, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("EFFECT_EVASION_DOWN_2 is a vestigial constant with zero real moves (doc §24.7) -- not independently testable through a real move ID, confirmed absent from the generated move table", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_EVASION_DOWN_2")).toBe(false);
  });

  it("still barriers every other reachable CBM handler untouched by this narrowing (pass-through, EFFECT_HAZE)", () => {
    const result = run(MOVE_HAZE, SHUCKLE);
    expect(result).toMatchObject({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_HAZE",
    });
  });
});

// data/battle_ai_scripts.s:490-493/:495-498/:522-525, docs/factory-ai-
// checkviability-ground-truth.md §25.1: the twelfth and final CBM-blocked
// pair's own CBM third -- three separately named dispatch targets, but
// byte-for-byte identical 3-instruction bodies (`get_weather; if_equal
// <OWN>, Score_Minus8; end`). Zero get_ability/stat-stage reads at all, so
// the SHUCKLE target above (irrelevant to this handler) still works fine.
describe("AI_CBM_RainDance / AI_CBM_SunnyDay / AI_CBM_Hail (docs/factory-ai-checkviability-ground-truth.md §25.1)", () => {
  const MOVE_RAIN_DANCE = 240;
  const MOVE_SUNNY_DAY = 241;
  const MOVE_HAIL = 258;

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withWeather(currentWeather: 0 | 1 | 2 | 3 | undefined): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, currentWeather });
  }

  it.each([
    ["AI_CBM_RainDance", MOVE_RAIN_DANCE, 1 as const],
    ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY, 0 as const],
    ["AI_CBM_Hail", MOVE_HAIL, 3 as const],
  ])("%s scores -8 with zero draws when current weather already equals the move's own type", (_label, moveId, ownWeather) => {
    const result = run(moveId, SHUCKLE, undefined, withWeather(ownWeather));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([
    ["AI_CBM_RainDance", MOVE_RAIN_DANCE, 1 as const],
    ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY, 0 as const],
    ["AI_CBM_Hail", MOVE_HAIL, 3 as const],
  ])("%s scores 0 when current weather is a DIFFERENT weather (cross-weather irrelevance)", (_label, moveId, ownWeather) => {
    // Pick any weather constant that isn't this handler's own.
    const other = ([0, 1, 2, 3] as const).find((w) => w !== ownWeather)!;
    const result = run(moveId, SHUCKLE, undefined, withWeather(other));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it.each([
    ["AI_CBM_RainDance", MOVE_RAIN_DANCE],
    ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY],
    ["AI_CBM_Hail", MOVE_HAIL],
  ])("%s scores 0 with zero draws when currentWeather is omitted (no weather bit set)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withWeather(undefined));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("the three bodies are byte-for-byte identical shape (doc §25.1) -- confirmed by cross-handler parity: RainDance under Sun scores the same as SunnyDay under Sun would under RainDance's own constant swapped in", () => {
    // RainDance's own weather (Rain=1) does nothing to SunnyDay (own weather Sun=0);
    // conversely Sun does nothing to RainDance. Parity check: swapping the
    // move AND the weather together reproduces the -8/0 split symmetrically.
    const rainUnderRain = run(MOVE_RAIN_DANCE, SHUCKLE, undefined, withWeather(1));
    const sunnyUnderSun = run(MOVE_SUNNY_DAY, SHUCKLE, undefined, withWeather(0));
    const hailUnderHail = run(MOVE_HAIL, SHUCKLE, undefined, withWeather(3));
    expect(rainUnderRain).toMatchObject({ kind: "scored", scoreDelta: -8 });
    expect(sunnyUnderSun).toMatchObject({ kind: "scored", scoreDelta: -8 });
    expect(hailUnderHail).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  // `get_weather`'s own stale-`funcResult` bug, Channel 1 (ground truth doc
  // §25.10.1/.3, ISSUES #47): on a genuinely weatherless dispatch
  // (currentWeather === undefined), get_weather reads whatever the universal
  // preamble's own get_ability AI_TARGET call (the soundproof check, same
  // script, same slot) left behind -- the target's real ability ID, not a
  // clean "no weather" sentinel. Mechanism-level cases below force a specific
  // ability via `knownAbility` (bypassing species lookup, zero draws either
  // way) to cover all four IDs the AI_WEATHER_* range can ever collide with
  // (0-3); the species-level cases after that reproduce §25.10.2's own two
  // live fixtures verbatim (Ninjask id 3, Anorith id 4).
  describe("get_weather's own stale-funcResult bug, Channel 1: universal preamble's get_ability AI_TARGET leaks into a weatherless read (doc §25.10)", () => {
    function knownAbilityTarget(knownAbility: string): FactoryAiCheckBadMoveTarget {
      return { ...SHUCKLE, knownAbility };
    }

    it.each([
      ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY, "ABILITY_NONE"], // id 0 == AI_WEATHER_SUN
      ["AI_CBM_RainDance", MOVE_RAIN_DANCE, "ABILITY_STENCH"], // id 1 == AI_WEATHER_RAIN
      ["AI_CBM_Hail", MOVE_HAIL, "ABILITY_SPEED_BOOST"], // id 3 == AI_WEATHER_HAIL
    ])("%s scores -8 with zero draws when weatherless and the target's ability ID collides with its own weather constant", (_label, moveId, knownAbility) => {
      const result = run(moveId, knownAbilityTarget(knownAbility), undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(0);
    });

    it.each([
      ["AI_CBM_RainDance", MOVE_RAIN_DANCE],
      ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY],
      ["AI_CBM_Hail", MOVE_HAIL],
    ])("%s stays 0 when weatherless and the target's ability ID (2, Drizzle) collides with none of the three CBM handlers' own constant (Sandstorm is never a CBM-checked type)", (_label, moveId) => {
      const result = run(moveId, knownAbilityTarget("ABILITY_DRIZZLE"), undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    });

    it("AI_CBM_Hail stays 0 when weatherless and the target's colliding ability ID belongs to a DIFFERENT handler's own constant (id 1 == Rain, not Hail)", () => {
      const result = run(MOVE_HAIL, knownAbilityTarget("ABILITY_STENCH"), undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    });

    // Real Factory-reachable species, reproducing §25.10.2's own two live
    // fixtures' CBM-side contribution exactly (both single-ability species,
    // so nextGetAbilityDraw's own species lookup returns ability0 directly,
    // zero draws -- no `knownAbility` override needed).
    const NINJASK: FactoryAiCheckBadMoveTarget = Object.freeze({
      species: 302,
      types: ["TYPE_BUG", "TYPE_FLYING"] as const,
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    });
    const ANORITH: FactoryAiCheckBadMoveTarget = Object.freeze({
      species: 390,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: null,
      realAbility: "ABILITY_BATTLE_ARMOR",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    });

    it("`hail-staleweather-collision` (doc §25.10.2): Ninjask (Speed Boost, id 3) weatherless -- AI_CBM_Hail scores -8 with zero draws, the collision's own CBM contribution to the ROM's live net -7", () => {
      const result = run(MOVE_HAIL, NINJASK, undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(0);
    });

    it.each([
      ["AI_CBM_RainDance", MOVE_RAIN_DANCE],
      ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY],
    ])("%s stays 0 for the same weatherless Ninjask target -- the collision is Hail-specific (id 3 matches only AI_WEATHER_HAIL)", (_label, moveId) => {
      const result = run(moveId, NINJASK, undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    });

    it("`hail-staleweather-control` (doc §25.10.2): Anorith (Battle Armor, id 4) weatherless -- outside the 0-3 collision range, AI_CBM_Hail stays 0, silencing this channel so the ROM's live net +1 is Channel 2 alone", () => {
      const result = run(MOVE_HAIL, ANORITH, undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(0);
    });

    it("a genuinely set weather always wins over the stale ability read, even for a colliding-ID target (Ninjask, id 3) -- the clean path is untouched", () => {
      const realRain = run(MOVE_RAIN_DANCE, NINJASK, undefined, withWeather(1));
      const realSandstormAgainstHail = run(MOVE_HAIL, NINJASK, undefined, withWeather(2));
      expect(realRain).toMatchObject({ kind: "scored", scoreDelta: -8 }); // real weather == RainDance's own type
      expect(realSandstormAgainstHail).toMatchObject({ kind: "scored", scoreDelta: 0 }); // real weather != Hail's own type
    });
  });
});
