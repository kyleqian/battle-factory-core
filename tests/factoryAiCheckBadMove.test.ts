import { describe, expect, it } from "vitest";
import {
  runCheckBadMovePreamble,
  type FactoryAiCheckBadMoveTarget,
} from "../src/engine/factoryAiCheckBadMove.ts";

const MAROWAK: FactoryAiCheckBadMoveTarget = Object.freeze({
  species: 105,
  types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
  knownAbility: null,
  realAbility: "ABILITY_ROCK_HEAD",
});

const MOVE_SURF = 57;
const MOVE_ROCK_SLIDE = 157;
const MOVE_BODY_SLAM = 34;
const MOVE_THUNDERBOLT = 85;
const MOVE_GROWL = 45;
const MOVE_SNORE = 173;

function run(moveId: number, target: FactoryAiCheckBadMoveTarget, rngValue = 249_678_687) {
  return runCheckBadMovePreamble({
    rng: { value: rngValue, calls: 0 },
    moveId,
    target,
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
    };
    const result = run(MOVE_SNORE, soundproofTarget);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("halts with a named unsupported-branch barrier for a move whose effect has an if_effect table entry", () => {
    const result = run(MOVE_GROWL, { ...MAROWAK, knownAbility: "ABILITY_ROCK_HEAD" });
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: "EFFECT_ATTACK_DOWN",
      moveId: MOVE_GROWL,
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
