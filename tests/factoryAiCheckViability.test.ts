import { describe, expect, it } from "vitest";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";

const MOVE_SURF = 57; // EFFECT_HIT -- no if_effect table entry
const MOVE_ROCK_SLIDE = 157; // EFFECT_FLINCH_HIT -- no entry
const MOVE_BODY_SLAM = 34; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_THUNDERBOLT = 85; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_GROWL = 45; // EFFECT_ATTACK_DOWN -- has an entry (AI_CV_AttackDown, not ported)
const MOVE_TOXIC = 92; // EFFECT_TOXIC -- has an entry (AI_CV_Toxic, not ported)

// Neutral speed/stage battlers for the tests above that don't exercise
// AI_CV_SpeedDown -- the describe block below owns that handler's own battlers.
const NEUTRAL_BATTLER = Object.freeze({ speed: 100, speedStage: 6 });

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
    const result = run({ value: 1, calls: 0 }, MOVE_GROWL);
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_ATTACK_DOWN",
      moveId: MOVE_GROWL,
    });
  });

  it("barriers a second, unrelated effect too (table is source-complete, not a single hardcoded case)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_TOXIC);
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_TOXIC",
      moveId: MOVE_TOXIC,
    });
  });
});

const MOVE_STRING_SHOT = 81; // EFFECT_SPEED_DOWN
const MOVE_COTTON_SPORE = 178; // EFFECT_SPEED_DOWN_2 -- same handler, different table entry

// data/battle_ai_scripts.s:1142-1152, docs/factory-ai-checkviability-ground-truth.md §6.
describe("AI_CV_SpeedDown (docs/factory-ai-checkviability-ground-truth.md §6)", () => {
  const FASTER_USER = Object.freeze({ speed: 120, speedStage: 6 }); // AI_USER faster -> target NOT faster
  const SLOWER_USER = Object.freeze({ speed: 5, speedStage: 6 }); // AI_USER slower -> target faster
  const FASTER_TARGET = Object.freeze({ speed: 120, speedStage: 6 });
  const SLOWER_TARGET = Object.freeze({ speed: 5, speedStage: 6 });

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
    const TIED = Object.freeze({ speed: 100, speedStage: 6 });
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
    const result = run({ value: 1, calls: 0 }, MOVE_GROWL);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_ATTACK_DOWN" });
  });
});
