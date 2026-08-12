//! Differential test for `AI_TryToFaint`. The checked-in cases were generated
//! by executing the canonical TypeScript `runTryToFaint`; regenerate with
//! `node --experimental-strip-types core-rs/tools/gen-try-to-faint-vectors.mjs`.
//! This test only constructs the native input and compares the complete
//! observable result/receipt, including the two TS-originated error cases.

use std::any::Any;

use factory_core::damage_calc::StatStages;
use factory_core::factory_ai_check_bad_move::BattleRngState;
use factory_core::factory_ai_try_to_faint::{
    run_try_to_faint, FactoryAiTryToFaintBattler, FactoryAiTryToFaintTarget, RunTryToFaintInput,
    TryToFaintDrawKind, TryToFaintResult,
};
use factory_core::factory_ai_try_to_faint_vectors_gen::{
    TryToFaintBattlerCase, TryToFaintInputCase, TRY_TO_FAINT_ERROR_CASES, TRY_TO_FAINT_SCORED_CASES,
};

fn battler(case: TryToFaintBattlerCase) -> FactoryAiTryToFaintBattler {
    FactoryAiTryToFaintBattler {
        attack: case.attack,
        defense: case.defense,
        sp_attack: case.sp_attack,
        sp_defense: case.sp_defense,
        level: case.level,
        types: case.types,
        stat_stages: StatStages {
            atk: case.stat_stages[0],
            def: case.stat_stages[1],
            sp_atk: case.stat_stages[2],
            sp_def: case.stat_stages[3],
        },
    }
}

fn run_case(case: TryToFaintInputCase) -> TryToFaintResult {
    run_try_to_faint(RunTryToFaintInput {
        rng: BattleRngState { value: case.rng_value, calls: case.rng_calls },
        move_id: case.move_id,
        moveset_index: case.moveset_index,
        moveset: case.moveset,
        simulated_rng: case.simulated_rng,
        attacker: battler(case.attacker),
        target: FactoryAiTryToFaintTarget {
            battler: battler(case.target),
            hp: case.target_hp,
            ability: case.target_ability,
        },
        draw_ordinal_start: case.draw_ordinal_start,
    })
}

#[test]
fn scored_cases_match_canonical_typescript() {
    assert!(!TRY_TO_FAINT_SCORED_CASES.is_empty());
    for (index, case) in TRY_TO_FAINT_SCORED_CASES.iter().enumerate() {
        let TryToFaintResult::Scored {
            rng,
            draws,
            draw_count,
            score_delta,
            can_faint,
            most_powerful,
        } = run_case(case.input);
        assert_eq!(rng.value, case.expected_rng_value, "case {index}: {case:?}");
        assert_eq!(rng.calls, case.expected_rng_calls, "case {index}: {case:?}");
        assert_eq!(
            draw_count, case.expected_draw_count,
            "case {index}: {case:?}"
        );
        assert_eq!(
            score_delta, case.expected_score_delta,
            "case {index}: {case:?}"
        );
        assert_eq!(can_faint, case.expected_can_faint, "case {index}: {case:?}");
        assert_eq!(
            most_powerful.map(|value| value as u8),
            case.expected_most_powerful,
            "case {index}: {case:?}"
        );
        for (draw_index, (actual, expected)) in draws
            .iter()
            .zip(case.draws.iter())
            .take(draw_count as usize)
            .enumerate()
        {
            assert_eq!(
                actual.kind,
                TryToFaintDrawKind::DoubleSuperEffective,
                "case {index} draw {draw_index}: {case:?}"
            );
            assert_eq!(
                actual.ordinal, expected.ordinal,
                "case {index} draw {draw_index}: {case:?}"
            );
            assert_eq!(
                actual.before.value, expected.before_value,
                "case {index} draw {draw_index}: {case:?}"
            );
            assert_eq!(
                actual.before.calls, expected.before_calls,
                "case {index} draw {draw_index}: {case:?}"
            );
            assert_eq!(
                actual.after.value, expected.after_value,
                "case {index} draw {draw_index}: {case:?}"
            );
            assert_eq!(
                actual.after.calls, expected.after_calls,
                "case {index} draw {draw_index}: {case:?}"
            );
            assert_eq!(
                actual.raw_rng_value, expected.raw_rng_value,
                "case {index} draw {draw_index}: {case:?}"
            );
            assert_eq!(
                actual.random_value, expected.random_value,
                "case {index} draw {draw_index}: {case:?}"
            );
            assert_eq!(
                actual.succeeded, expected.succeeded,
                "case {index} draw {draw_index}: {case:?}"
            );
        }
    }
}

fn panic_message(payload: Box<dyn Any + Send>) -> String {
    if let Some(message) = payload.downcast_ref::<String>() {
        message.clone()
    } else if let Some(message) = payload.downcast_ref::<&str>() {
        (*message).to_owned()
    } else {
        "non-string panic payload".to_owned()
    }
}

#[test]
fn error_cases_match_canonical_typescript_messages() {
    assert!(!TRY_TO_FAINT_ERROR_CASES.is_empty());
    for (index, case) in TRY_TO_FAINT_ERROR_CASES.iter().enumerate() {
        let payload = match std::panic::catch_unwind(|| run_case(case.input)) {
            Ok(_) => panic!("case {index}: {case:?} unexpectedly returned"),
            Err(payload) => payload,
        };
        assert_eq!(
            panic_message(payload),
            case.expected_message,
            "case {index}: {case:?}"
        );
    }
}
