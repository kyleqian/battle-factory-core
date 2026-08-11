import { describe, expect, it } from "vitest";
import { runTurn1RngLedger, TURN1_RNG_STEPS, TURN1_RNG_TOTAL_STEPS } from "../src/engine/turnRng.ts";
import ramDump from "../src/data/gen/battle1-turn1-ram-dump.json" with { type: "json" };

// The committed ground truth: src/data/gen/battle1-turn1-ram-dump.json's
// own rngLedger array (7 entries, RAM-verified fromValue/toValue/steps per
// docs/battle-turn-notes.md §3/§9's "RESOLVED" cluster mapping).
const DUMP_LEDGER = ramDump.rngLedger;
const PRE_TURN_RNG_VALUE = DUMP_LEDGER[0]!.fromValue;

describe("runTurn1RngLedger - replays the committed dump's RNG ledger bit-exactly", () => {
  it("totals 12 Random() calls across 7 named steps, matching the dump's rngLedgerTotalSteps", () => {
    expect(TURN1_RNG_TOTAL_STEPS).toBe(12);
    expect(TURN1_RNG_TOTAL_STEPS).toBe(ramDump.rngLedgerTotalSteps);
    expect(TURN1_RNG_STEPS).toHaveLength(7);
  });

  it("each step's call count matches the dump's rngLedger entry", () => {
    const results = runTurn1RngLedger(PRE_TURN_RNG_VALUE);
    expect(results.map((r) => r.rolls.length)).toEqual(DUMP_LEDGER.map((e) => e.steps));
  });

  it("replaying from the dump's own pre-turn gRngValue reproduces every intermediate checkpoint value", () => {
    const results = runTurn1RngLedger(PRE_TURN_RNG_VALUE);
    for (let i = 0; i < DUMP_LEDGER.length; i++) {
      expect(results[i]!.rngValueBefore, `step ${i} (${results[i]!.name}) fromValue`).toBe(DUMP_LEDGER[i]!.fromValue);
      expect(results[i]!.rngValueAfter, `step ${i} (${results[i]!.name}) toValue`).toBe(DUMP_LEDGER[i]!.toValue);
    }
  });

  it("the final gRngValue after all 12 steps matches the dump's own flat post-turn tail (tick 2900)", () => {
    const results = runTurn1RngLedger(PRE_TURN_RNG_VALUE);
    const finalValue = results.at(-1)!.rngValueAfter;
    const lastTick = ramDump.ticks.at(-1)! as { rng: number };
    expect(finalValue).toBe(lastTick.rng);
  });
});
