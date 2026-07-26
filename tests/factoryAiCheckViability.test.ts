import { describe, expect, it } from "vitest";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";

const MOVE_SURF = 57; // EFFECT_HIT -- no if_effect table entry
const MOVE_ROCK_SLIDE = 157; // EFFECT_FLINCH_HIT -- no entry
const MOVE_BODY_SLAM = 34; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_THUNDERBOLT = 85; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_GROWL = 45; // EFFECT_ATTACK_DOWN -- has an entry (AI_CV_AttackDown, not ported)
const MOVE_TOXIC = 92; // EFFECT_TOXIC -- has an entry (AI_CV_Toxic, not ported)

// Neutral speed/stage battlers for the tests below that don't exercise
// AI_CV_SpeedDown -- factoryAiCheckViabilitySpeedDown.test.ts owns that handler.
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
