//! Runs `factory_ai_mask::select_factory_ai_mask` against the checked-in,
//! TS-generated vectors in `factory_ai_mask_vectors_gen.rs` (regenerate with
//! `node core-rs/tools/gen-factory-ai-mask-vectors.mjs`). Every expected
//! value in that file came from executing the real
//! `src/engine/factoryAiMaskSelection.ts`, not hand computation — this test
//! just proves the Rust port reproduces it.

use factory_core::factory_ai_mask::{
    select_factory_ai_mask, FactoryAiMaskError, FactoryAiMaskSelectionInput,
};
use factory_core::factory_ai_mask_vectors_gen::{
    FACTORY_AI_MASK_ERROR_CASES, FACTORY_AI_MASK_SUCCESS_CASES,
};

#[test]
fn success_cases_match_ts() {
    assert!(!FACTORY_AI_MASK_SUCCESS_CASES.is_empty());
    for (i, c) in FACTORY_AI_MASK_SUCCESS_CASES.iter().enumerate() {
        let result = select_factory_ai_mask(FactoryAiMaskSelectionInput {
            level_mode: c.level_mode,
            battle_mode: c.battle_mode,
            factory_win_streak: c.factory_win_streak,
            trainer_opponent_id: c.trainer_opponent_id,
        })
        .unwrap_or_else(|e| panic!("case {i}: {c:?} unexpectedly errored: {e}"));

        assert_eq!(result.mask, c.expected_mask, "case {i}: {c:?}");
        assert_eq!(
            result.receipt.is_frontier_brain, c.expected_is_frontier_brain,
            "case {i}: {c:?}"
        );
        assert_eq!(
            result.receipt.challenge_number.is_some(),
            c.expected_has_challenge_number,
            "case {i}: {c:?}"
        );
        if c.expected_has_challenge_number {
            assert_eq!(
                result.receipt.challenge_number,
                Some(c.expected_challenge_number),
                "case {i}: {c:?}"
            );
        }
        assert_eq!(
            result.receipt.evaluation_count, c.expected_evaluation_count,
            "case {i}: {c:?}"
        );
        assert_eq!(
            result.receipt.branch as u8, c.expected_branch,
            "case {i}: {c:?}"
        );
        assert_eq!(
            result.mask,
            gen_tables_mask(c.expected_branch),
            "case {i}: {c:?}"
        );
    }
}

fn gen_tables_mask(branch: u8) -> u8 {
    factory_core::gen_tables::FACTORY_AI_POLICY_MASKS[branch as usize]
}

#[test]
fn error_cases_match_ts_site() {
    assert!(!FACTORY_AI_MASK_ERROR_CASES.is_empty());
    for (i, c) in FACTORY_AI_MASK_ERROR_CASES.iter().enumerate() {
        let result = select_factory_ai_mask(FactoryAiMaskSelectionInput {
            level_mode: c.level_mode,
            battle_mode: c.battle_mode,
            factory_win_streak: c.factory_win_streak,
            trainer_opponent_id: c.trainer_opponent_id,
        });
        let field = match result {
            Ok(v) => panic!("case {i}: {c:?} unexpectedly succeeded: {v:?}"),
            Err(FactoryAiMaskError::LevelModeOutOfRange { .. }) => 0,
            Err(FactoryAiMaskError::BattleModeOutOfRange { .. }) => 1,
            Err(FactoryAiMaskError::FactoryWinStreakOutOfRange { .. }) => 2,
            Err(FactoryAiMaskError::TrainerOpponentIdOutOfRange { .. }) => 3,
        };
        assert_eq!(field, c.expected_field, "case {i}: {c:?}");
    }
}
