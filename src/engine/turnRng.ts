// The turn-1 RNG-consumption model: the exact 12-step ledger RAM-verified
// in src/data/gen/battle1-turn1-ram-dump.json and documented in
// docs/battle-turn-notes.md §3/§9. Reuses the S3 gen-3 LCG (GbaRng) rather
// than duplicating it - this module only names and orders the steps.
//
// The ledger below models battle 1's specific turn 1 (Onix ROCK_SLIDE vs
// Grovyle DOUBLE_TEAM): a status-only opening move consumes zero Random()
// calls (§3), so this exact 7-named-step/12-call shape is turn-1-specific,
// not a general "every turn has these steps" rule - a turn with two
// damaging moves, secondary effects on both sides, etc. would have a
// different shape. See docs/battle-turn-notes.md §10 for what's generalized
// vs. what's still battle-1-turn-1-specific.

import { GbaRng } from "./rng.ts";

export type Turn1RngStepName =
  | "attackerAccuracyCheck"
  | "attackerCritCalc"
  | "attackerDamageSpread"
  | "attackerSecondaryEffect"
  | "battleTurnPassed"
  | "opponentShouldSwitch"
  | "opponentSetupAiDataAndTiebreak";

/** Step order + call counts (docs/battle-turn-notes.md §3/§9, RESOLVED cluster mapping). */
export const TURN1_RNG_STEPS: ReadonlyArray<{ name: Turn1RngStepName; steps: number }> = [
  { name: "attackerAccuracyCheck", steps: 1 },
  { name: "attackerCritCalc", steps: 1 },
  { name: "attackerDamageSpread", steps: 1 },
  { name: "attackerSecondaryEffect", steps: 1 },
  { name: "battleTurnPassed", steps: 1 },
  { name: "opponentShouldSwitch", steps: 2 },
  { name: "opponentSetupAiDataAndTiebreak", steps: 5 },
];

export const TURN1_RNG_TOTAL_STEPS = TURN1_RNG_STEPS.reduce((sum, s) => sum + s.steps, 0);

export interface Turn1RngStepResult {
  name: Turn1RngStepName;
  /** gRngValue immediately before this step's first Random() call. */
  rngValueBefore: number;
  /** gRngValue immediately after this step's last Random() call. */
  rngValueAfter: number;
  /** The raw Random() u16 output of each call this step makes, in order. */
  rolls: number[];
}

/**
 * Replays the turn-1 ledger from a starting gRngValue, consuming Random()
 * once per step-count entry in TURN1_RNG_STEPS, in order. Returns each
 * step's before/after gRngValue plus its raw roll(s) - the same shape as
 * the committed dump's `rngLedger` array, for direct comparison.
 */
export function runTurn1RngLedger(startingRngValue: number): Turn1RngStepResult[] {
  const rng = new GbaRng(startingRngValue);
  const results: Turn1RngStepResult[] = [];
  for (const step of TURN1_RNG_STEPS) {
    const rngValueBefore = rng.rngValue;
    const rolls: number[] = [];
    for (let i = 0; i < step.steps; i++) rolls.push(rng.next());
    results.push({ name: step.name, rngValueBefore, rngValueAfter: rng.rngValue, rolls });
  }
  return results;
}
