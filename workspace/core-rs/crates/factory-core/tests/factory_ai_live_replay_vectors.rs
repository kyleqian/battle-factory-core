//! Differential corpus for the pure private `replayAiDraws` loop.
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-factory-ai-live-replay-vectors.mjs`.

use std::collections::BTreeMap;

use factory_core::factory_ai_live_replay::{
    replay_factory_ai_live_draws, FactoryAiLiveReplayBattleRngState, FactoryAiLiveReplayDraw,
};
use factory_core::factory_ai_live_replay_vectors_gen::{
    FactoryAiLiveReplayExpected, FactoryAiLiveReplayVectorCase, FACTORY_AI_LIVE_REPLAY_CASES,
    FACTORY_AI_LIVE_REPLAY_VECTOR_CATEGORY_COUNTS,
};

fn execute_case(
    case: &FactoryAiLiveReplayVectorCase,
) -> Result<FactoryAiLiveReplayBattleRngState, String> {
    let draws = case
        .draws
        .iter()
        .map(|draw| FactoryAiLiveReplayDraw {
            ordinal: draw.ordinal,
            reason: draw.reason,
            before: draw.before,
            after: draw.after,
            random_value: draw.random_value,
        })
        .collect::<Vec<_>>();
    replay_factory_ai_live_draws(case.initial_rng, &draws).map_err(|error| error.to_string())
}

#[test]
fn replay_results_and_errors_match_canonical_typescript() {
    assert_eq!(FACTORY_AI_LIVE_REPLAY_CASES.len(), 17);
    for (index, case) in FACTORY_AI_LIVE_REPLAY_CASES.iter().enumerate() {
        match (execute_case(case), case.expected) {
            (Ok(actual), FactoryAiLiveReplayExpected::Final(expected)) => {
                assert_eq!(actual, expected, "case {index} ({})", case.label,)
            }
            (Err(actual), FactoryAiLiveReplayExpected::Error(expected)) => {
                assert_eq!(actual, expected, "case {index} ({})", case.label,)
            }
            (actual, expected) => panic!(
                "case {index} ({}) result/expectation shape mismatch: {actual:?} vs {expected:?}",
                case.label,
            ),
        }
    }
}

#[test]
fn category_census_is_ratchet_pinned() {
    let mut observed = BTreeMap::new();
    for case in FACTORY_AI_LIVE_REPLAY_CASES {
        *observed.entry(case.category).or_insert(0usize) += 1;
    }
    let expected = FACTORY_AI_LIVE_REPLAY_VECTOR_CATEGORY_COUNTS
        .iter()
        .copied()
        .collect::<BTreeMap<_, _>>();
    assert_eq!(observed, expected);
    assert_eq!(FACTORY_AI_LIVE_REPLAY_CASES.len(), 17);
}
