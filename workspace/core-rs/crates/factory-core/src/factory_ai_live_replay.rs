//! Pure replay of Factory-AI live-driver RNG receipts.
//!
//! This is the deliberately narrow observable core of the private
//! `replayAiDraws` helper in `src/engine/factoryAiLiveDriver.ts`.  It owns
//! neither a battle state nor a reducer: given the cursor published by the
//! battle boundary plus an ordered receipt list, it verifies every canonical
//! checkpoint while replaying the Gen-3 LCG and returns the final cursor.
//! Later live-driver composition can supply its own reducer after this leaf
//! has accepted the receipt stream.
//!
//! ## Number representation
//!
//! The canonical `BattleRngState` has a u32 raw value and a JavaScript safe
//! integer call counter.  Existing native AI-policy receipts use
//! `factory_ai_check_bad_move::BattleRngState` (`u32` for both fields), which
//! is exact for those policy leaves and their current ABI packets.  A live
//! battle boundary, however, validates `calls` through `Number.MAX_SAFE_INTEGER`
//! before `replayAiDraws` runs.  This leaf therefore keeps the same field
//! names but uses `u64` for `calls`, preserving every source-reachable
//! boundary value without widening unrelated policy/WASM surfaces.  `u64`
//! exactly contains all JavaScript safe integers.
//!
//! Recorded `ordinal`s are native `u32`s because every canonical producer
//! writes `draws.length` (array indexes are u32) and `randomValue` is a
//! native `Random()` u16.  No values are silently coerced: callers that need
//! broader unvalidated TypeScript objects belong at the future boundary
//! parser, not this source-generated receipt leaf.

use crate::factory_ai_check_bad_move::BattleRngState;
use crate::rng::advance_rng_value;

/// JavaScript's `Number.MAX_SAFE_INTEGER`, the live boundary's maximum RNG
/// call counter before it throws `Battle RNG call counter overflow`.
pub const FACTORY_AI_LIVE_REPLAY_MAX_SAFE_CALLS: u64 = 9_007_199_254_740_991;

/// The exact `BattleRngState` domain visible to the live decision boundary.
///
/// This separate representation intentionally avoids narrowing the boundary's
/// safe-integer call counter to the older policy receipt's u32 field.  The raw
/// LCG value remains u32 because `battleDecisionBoundary.ts` validates it in
/// that range before the helper can observe it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiLiveReplayBattleRngState {
    pub value: u32,
    pub calls: u64,
}

impl From<BattleRngState> for FactoryAiLiveReplayBattleRngState {
    fn from(value: BattleRngState) -> Self {
        Self { value: value.value, calls: u64::from(value.calls) }
    }
}

/// One recorded `replayAiDraws` receipt.  `reason` remains part of the
/// source-shaped input even though the pure Gen-3 LCG does not branch on it;
/// future composition can forward it to its boundary-owned RNG recorder.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiLiveReplayDraw<'a> {
    pub ordinal: u32,
    pub reason: &'a str,
    pub before: FactoryAiLiveReplayBattleRngState,
    pub after: FactoryAiLiveReplayBattleRngState,
    pub random_value: u16,
}

/// Canonical errors observable while replaying the live receipt list.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiLiveReplayError {
    /// Exact private-helper error before it asks the live RNG to draw.
    DivergedBefore { index: usize, ordinal: u32 },
    /// Exact private-helper error after it has advanced and snapshotted RNG.
    DivergedAfter { index: usize, ordinal: u32 },
    /// Exact error emitted by the canonical boundary-owned `draw` method.
    CallCounterOverflow,
}

impl core::fmt::Display for FactoryAiLiveReplayError {
    fn fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::DivergedBefore { index, ordinal } => write!(
                formatter,
                "Factory AI RNG diverged before live draw {index}/{ordinal}"
            ),
            Self::DivergedAfter { index, ordinal } => write!(
                formatter,
                "Factory AI RNG diverged after live draw {index}/{ordinal}"
            ),
            Self::CallCounterOverflow => write!(formatter, "Battle RNG call counter overflow"),
        }
    }
}

impl std::error::Error for FactoryAiLiveReplayError {}

/// Replays ordered Factory-AI live-driver draw receipts.
///
/// This is a semantic twin of the private TypeScript helper's loop.  Array
/// order controls replay; `ordinal` is diagnostic-only, so duplicate or
/// non-monotonic ordinals are intentionally accepted when checkpoints line
/// up.  The first bad checkpoint stops replay at exactly the same before/after
/// point as canonical TypeScript.
pub fn replay_factory_ai_live_draws(
    initial_rng: FactoryAiLiveReplayBattleRngState,
    draws: &[FactoryAiLiveReplayDraw<'_>],
) -> Result<FactoryAiLiveReplayBattleRngState, FactoryAiLiveReplayError> {
    let mut rng = initial_rng;
    for (index, draw) in draws.iter().enumerate() {
        if rng != draw.before {
            return Err(FactoryAiLiveReplayError::DivergedBefore { index, ordinal: draw.ordinal });
        }

        // This guard belongs to the source boundary's `BattleDecisionRng.draw`
        // implementation, immediately after the helper's before-check and
        // before the LCG mutation.  Keeping it here makes the standalone leaf
        // reproduce the only non-divergence error reachable during a replay.
        if rng.calls >= FACTORY_AI_LIVE_REPLAY_MAX_SAFE_CALLS {
            return Err(FactoryAiLiveReplayError::CallCounterOverflow);
        }
        rng = FactoryAiLiveReplayBattleRngState {
            value: advance_rng_value(rng.value),
            calls: rng.calls + 1,
        };
        let random_value = (rng.value >> 16) as u16;
        if random_value != draw.random_value || rng != draw.after {
            return Err(FactoryAiLiveReplayError::DivergedAfter { index, ordinal: draw.ordinal });
        }
    }
    Ok(rng)
}

#[cfg(test)]
mod tests {
    use super::{
        replay_factory_ai_live_draws, FactoryAiLiveReplayBattleRngState, FactoryAiLiveReplayDraw,
        FactoryAiLiveReplayError,
    };

    #[test]
    fn conversion_from_existing_policy_rng_preserves_both_cells() {
        let state = FactoryAiLiveReplayBattleRngState::from(
            crate::factory_ai_check_bad_move::BattleRngState { value: 0xffff_ffff, calls: 17 },
        );
        assert_eq!(state.value, 0xffff_ffff);
        assert_eq!(state.calls, 17);
    }

    #[test]
    fn ordinal_is_diagnostic_and_array_order_is_authoritative() {
        let initial = FactoryAiLiveReplayBattleRngState { value: 0, calls: 0 };
        let result = replay_factory_ai_live_draws(
            initial,
            &[FactoryAiLiveReplayDraw {
                ordinal: 99,
                reason: "receipt-order-probe",
                before: initial,
                after: FactoryAiLiveReplayBattleRngState { value: 24_691, calls: 1 },
                random_value: 0,
            }],
        );
        assert_eq!(
            result,
            Ok(FactoryAiLiveReplayBattleRngState { value: 24_691, calls: 1 })
        );

        let err = replay_factory_ai_live_draws(
            initial,
            &[FactoryAiLiveReplayDraw {
                ordinal: 99,
                reason: "receipt-order-probe",
                before: FactoryAiLiveReplayBattleRngState { value: 1, calls: 0 },
                after: initial,
                random_value: 0,
            }],
        )
        .expect_err("the before checkpoint must fail before a draw");
        assert_eq!(
            err,
            FactoryAiLiveReplayError::DivergedBefore { index: 0, ordinal: 99 }
        );
        assert_eq!(
            err.to_string(),
            "Factory AI RNG diverged before live draw 0/99"
        );
    }
}
