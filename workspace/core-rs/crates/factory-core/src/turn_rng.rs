//! The turn-1 RNG-consumption model: the exact 12-step ledger RAM-verified
//! in `src/data/gen/battle1-turn1-ram-dump.json` and documented in
//! `docs/battle-turn-notes.md` §3/§9. Reuses the S3 gen-3 LCG (`GbaRng`,
//! `rng.rs`) rather than duplicating it — this module only names and orders
//! the steps. Ported from `src/engine/turnRng.ts` (64 lines).
//!
//! The ledger below models battle 1's specific turn 1 (Onix ROCK_SLIDE vs
//! Grovyle DOUBLE_TEAM): a status-only opening move consumes zero
//! `Random()` calls (§3), so this exact 7-named-step/12-call shape is
//! turn-1-specific, not a general "every turn has these steps" rule — a
//! turn with two damaging moves, secondary effects on both sides, etc.
//! would have a different shape. See `docs/battle-turn-notes.md` §10 for
//! what's generalized vs. what's still battle-1-turn-1-specific.
//!
//! ## Numeric id space
//! Step names stay TS-side (per the M4c step brief); this port names each
//! step with a `u8` index into `TURN1_RNG_STEPS`, `TurnRngStepName`
//! mirroring the TS `Turn1RngStepName` union's declaration order exactly.

use crate::rng::GbaRng;

/// Mirrors `Turn1RngStepName` (`turnRng.ts:16-23`)'s declaration order — the
/// `u8` discriminant IS the step's index into `TURN1_RNG_STEPS`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum TurnRngStepName {
    AttackerAccuracyCheck = 0,
    AttackerCritCalc = 1,
    AttackerDamageSpread = 2,
    AttackerSecondaryEffect = 3,
    BattleTurnPassed = 4,
    OpponentShouldSwitch = 5,
    OpponentSetupAiDataAndTiebreak = 6,
}

/// One named step's call count.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Turn1RngStep {
    pub name: TurnRngStepName,
    pub steps: u32,
}

/// Step order + call counts (`docs/battle-turn-notes.md` §3/§9, RESOLVED
/// cluster mapping). Mirrors `TURN1_RNG_STEPS` (`turnRng.ts:26-34`).
pub const TURN1_RNG_STEPS: [Turn1RngStep; 7] = [
    Turn1RngStep { name: TurnRngStepName::AttackerAccuracyCheck, steps: 1 },
    Turn1RngStep { name: TurnRngStepName::AttackerCritCalc, steps: 1 },
    Turn1RngStep { name: TurnRngStepName::AttackerDamageSpread, steps: 1 },
    Turn1RngStep { name: TurnRngStepName::AttackerSecondaryEffect, steps: 1 },
    Turn1RngStep { name: TurnRngStepName::BattleTurnPassed, steps: 1 },
    Turn1RngStep { name: TurnRngStepName::OpponentShouldSwitch, steps: 2 },
    Turn1RngStep { name: TurnRngStepName::OpponentSetupAiDataAndTiebreak, steps: 5 },
];

/// Mirrors `TURN1_RNG_TOTAL_STEPS` (`turnRng.ts:36`).
pub const TURN1_RNG_TOTAL_STEPS: u32 = 12;

/// One step's replay result. `rolls` holds each `Random()` u16 call this
/// step makes, in order — a fixed-capacity array (max step width is 5,
/// `OpponentSetupAiDataAndTiebreak`) paired with `roll_count`, since this
/// crate has zero dependencies (no heap `Vec` needed for a bound this
/// small). Mirrors `Turn1RngStepResult` (`turnRng.ts:38-46`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Turn1RngStepResult {
    pub name: TurnRngStepName,
    /// `gRngValue` immediately before this step's first `Random()` call.
    pub rng_value_before: u32,
    /// `gRngValue` immediately after this step's last `Random()` call.
    pub rng_value_after: u32,
    pub rolls: [u16; 5],
    pub roll_count: usize,
}

impl Turn1RngStepResult {
    #[must_use]
    pub fn rolls(&self) -> &[u16] {
        &self.rolls[..self.roll_count]
    }
}

/// Replays the turn-1 ledger from a starting `gRngValue`, consuming
/// `Random()` once per step-count entry in `TURN1_RNG_STEPS`, in order.
/// Returns each step's before/after `gRngValue` plus its raw roll(s) — the
/// same shape as the committed dump's `rngLedger` array, for direct
/// comparison. Mirrors `runTurn1RngLedger` (`turnRng.ts:54-64`).
#[must_use]
pub fn run_turn1_rng_ledger(starting_rng_value: u32) -> [Turn1RngStepResult; 7] {
    let mut rng = GbaRng::new(starting_rng_value);
    let mut results: [Turn1RngStepResult; 7] = [Turn1RngStepResult {
        name: TurnRngStepName::AttackerAccuracyCheck,
        rng_value_before: 0,
        rng_value_after: 0,
        rolls: [0; 5],
        roll_count: 0,
    }; 7];
    for (i, step) in TURN1_RNG_STEPS.iter().enumerate() {
        let rng_value_before = rng.rng_value();
        let mut rolls = [0u16; 5];
        for roll in rolls.iter_mut().take(step.steps as usize) {
            *roll = rng.next();
        }
        results[i] = Turn1RngStepResult {
            name: step.name,
            rng_value_before,
            rng_value_after: rng.rng_value(),
            rolls,
            roll_count: step.steps as usize,
        };
    }
    results
}

#[cfg(test)]
mod tests {
    use super::*;

    // The committed ground truth: src/data/gen/battle1-turn1-ram-dump.json's
    // own rngLedger array (7 entries, RAM-verified fromValue/toValue/steps),
    // read (not imported — this crate has zero dependencies, including no
    // JSON parsing) and copied in as literal constants. Cross-checked
    // against tests/turnRng.test.ts (read-only).

    const RAM_ANCHORED_SEED: u32 = 3_485_459_011; // rngLedger[0].fromValue
    const RAM_LEDGER_TO_VALUES: [u32; 7] = [
        4_000_719_098,
        2_176_095_973,
        435_971_572,
        3_326_091_607,
        3_552_646_270,
        1_572_843_288,
        4_098_214_719,
    ];
    const RAM_LEDGER_STEP_COUNTS: [u32; 7] = [1, 1, 1, 1, 1, 2, 5];

    #[test]
    fn totals_12_random_calls_across_7_named_steps() {
        assert_eq!(TURN1_RNG_TOTAL_STEPS, 12);
        assert_eq!(TURN1_RNG_STEPS.len(), 7);
        assert_eq!(
            TURN1_RNG_STEPS.iter().map(|s| s.steps).sum::<u32>(),
            TURN1_RNG_TOTAL_STEPS
        );
    }

    #[test]
    fn each_step_call_count_matches_the_dump() {
        let results = run_turn1_rng_ledger(RAM_ANCHORED_SEED);
        for (i, r) in results.iter().enumerate() {
            assert_eq!(r.roll_count as u32, RAM_LEDGER_STEP_COUNTS[i], "step {i}");
        }
    }

    #[test]
    fn replaying_from_the_dumps_seed_reproduces_every_checkpoint_value() {
        let results = run_turn1_rng_ledger(RAM_ANCHORED_SEED);
        let mut expected_before = RAM_ANCHORED_SEED;
        for (i, r) in results.iter().enumerate() {
            assert_eq!(r.rng_value_before, expected_before, "step {i} fromValue");
            assert_eq!(
                r.rng_value_after, RAM_LEDGER_TO_VALUES[i],
                "step {i} toValue"
            );
            expected_before = RAM_LEDGER_TO_VALUES[i];
        }
    }

    #[test]
    fn final_rng_value_matches_the_dumps_post_turn_tail() {
        let results = run_turn1_rng_ledger(RAM_ANCHORED_SEED);
        assert_eq!(results.last().unwrap().rng_value_after, 4_098_214_719);
    }

    // --- Additional seeds: the step/count shape is seed-independent (it
    // only depends on TURN1_RNG_STEPS), so any starting seed must replay
    // the same 7-step/12-call structure while chaining through the shared
    // GbaRng exactly like rng.rs's own pinned streams.

    #[test]
    fn zero_seed_replays_the_same_step_shape_and_chains_the_shared_lcg() {
        let results = run_turn1_rng_ledger(0);
        assert_eq!(
            results
                .iter()
                .map(|r| r.roll_count as u32)
                .collect::<Vec<_>>(),
            RAM_LEDGER_STEP_COUNTS.to_vec()
        );
        // Cross-check against rng.rs's own pinned zero-seed stream
        // (matches_ts_stream_from_zero_seed): first 8 outputs
        // [0x0000, 0xe97e, 0x5271, 0x31b0, 0x8e42, 0xe2cc, 0xafc5, 0x67db].
        assert_eq!(results[0].rolls()[0], 0x0000); // attackerAccuracyCheck
        assert_eq!(results[1].rolls()[0], 0xe97e); // attackerCritCalc
        assert_eq!(results[2].rolls()[0], 0x5271); // attackerDamageSpread
        assert_eq!(results[3].rolls()[0], 0x31b0); // attackerSecondaryEffect
        assert_eq!(results[4].rolls()[0], 0x8e42); // battleTurnPassed
        assert_eq!(results[5].rolls(), [0xe2cc, 0xafc5]); // opponentShouldSwitch
        assert_eq!(results[6].rolls()[0], 0x67db); // opponentSetupAiDataAndTiebreak[0]
    }

    #[test]
    fn max_seed_wraps_and_still_replays_the_full_shape() {
        let results = run_turn1_rng_ledger(0xffff_ffff);
        assert_eq!(results[0].rng_value_before, 0xffff_ffff);
        assert_eq!(results.last().unwrap().roll_count, 5);
        // Chains continuously: each step's after-value is the next step's
        // before-value.
        for w in results.windows(2) {
            assert_eq!(w[0].rng_value_after, w[1].rng_value_before);
        }
    }

    #[test]
    fn anchor_seed_from_rng_rs_replays_the_full_shape() {
        // rng::ANCHOR_RNG_VALUE — a second RAM-verified real seed, distinct
        // from this module's own turn-1-specific anchor.
        let results = run_turn1_rng_ledger(crate::rng::ANCHOR_RNG_VALUE);
        assert_eq!(results[0].rng_value_before, crate::rng::ANCHOR_RNG_VALUE);
        assert_eq!(
            results.iter().map(|r| r.roll_count).sum::<usize>(),
            TURN1_RNG_TOTAL_STEPS as usize
        );
        for w in results.windows(2) {
            assert_eq!(w[0].rng_value_after, w[1].rng_value_before);
        }
    }
}
