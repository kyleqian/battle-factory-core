//! Runs `factory_ai_check_viability::run_check_viability` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_viability_shell_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cv-shell-vectors.mjs`). Every expected value in that
//! file came from executing the real `src/engine/factoryAiCheckViability.ts`,
//! not hand computation — this test just proves the Rust dispatcher shell
//! reproduces it. Scope: every vector uses a move whose effect is outside
//! the 122-entry `CV_TABLE_EFFECTS` table, since the real TS engine is
//! 122/122 dispatch-complete and would otherwise invoke a real `AI_CV_*`
//! handler this Rust step doesn't have (see the generator's module doc
//! comment).

use factory_core::factory_ai_check_viability::{
    run_check_viability, CheckViabilityResult, FactoryAiCheckViabilityBattler,
    RunCheckViabilityInput, MAX_CHECK_VIABILITY_DRAWS,
};
use factory_core::factory_ai_check_viability_shell_vectors_gen::CV_SHELL_SCORED_CASES;

fn neutral_battler() -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: 100,
        speed_stage: 6,
        types: [0, 0],
        is_first_turn: 0,
        evasion_stage: 6,
        acc_stage: 6,
        atk_stage: 6,
        def_stage: 6,
        sp_def_stage: 6,
        hp: 100,
        max_hp: 100,
        sp_atk_stage: None,
        last_used_move_id: None,
        is_toxic_poisoned: None,
        is_leech_seeded: None,
        is_rooted: None,
        is_cursed: None,
        ability: None,
        current_weather: None,
        moves: None,
        battle_turn_count: None,
        known_moves: None,
        known_moves_tail: None,
        is_infatuated: None,
        is_asleep: None,
        is_confused: None,
        is_taunted: None,
        has_yawn: None,
        has_perish_song: None,
        protect_uses: None,
        has_side_reflect: None,
        is_poisoned: None,
        is_burned: None,
        is_paralyzed: None,
        has_substitute: None,
        any_move_disabled: None,
        has_any_status: None,
        target_party_status_equals_any: None,
        hold_effect: None,
        species_abilities: None,
        known_ability: None,
        used_held_item_id: None,
        stockpile_count: None,
    }
}

#[test]
fn scored_cases_match_ts() {
    assert!(!CV_SHELL_SCORED_CASES.is_empty());
    for (i, c) in CV_SHELL_SCORED_CASES.iter().enumerate() {
        let result = run_check_viability(RunCheckViabilityInput {
            rng: factory_core::factory_ai_check_bad_move::BattleRngState {
                value: c.rng_value,
                calls: 0,
            },
            move_id: c.move_id,
            attacker: neutral_battler(),
            target: neutral_battler(),
            stale_func_result_fallback: c.fallback,
            draw_ordinal_start: 1,
        });
        let CheckViabilityResult::Scored { rng, draws, draw_count, score_delta, func_result_after } =
            result
        else {
            panic!("case {i}: {c:?} unexpectedly hit the NotYetPorted barrier");
        };
        assert_eq!(rng.value, c.expected_rng_value, "case {i}: {c:?}");
        assert_eq!(rng.calls, c.expected_rng_calls, "case {i}: {c:?}");
        assert_eq!(draw_count, 0, "case {i}: {c:?}");
        assert_eq!(draws.len(), MAX_CHECK_VIABILITY_DRAWS, "case {i}: {c:?}");
        assert_eq!(score_delta, c.expected_score_delta, "case {i}: {c:?}");
        assert_eq!(
            func_result_after, c.expected_func_result_after,
            "case {i}: {c:?}"
        );
    }
}
