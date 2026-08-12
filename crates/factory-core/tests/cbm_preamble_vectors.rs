//! Runs `factory_ai_check_bad_move::run_check_bad_move_preamble` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_bad_move_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cbm-preamble-vectors.mjs`). Every expected value in
//! that file came from executing the real
//! `src/engine/factoryAiCheckBadMove.ts`, not hand computation — this test
//! just proves the Rust port reproduces it. Scope: every vector uses a move
//! whose effect is outside the 109-entry `if_effect` table (or short-
//! circuits before reaching it), since the real TS engine is 109/109 ported
//! and would otherwise invoke a real per-effect handler this Rust step
//! doesn't have (see the generator's module doc comment).

use factory_core::factory_ai_check_bad_move::{
    run_check_bad_move_preamble, BattleRngState, CheckBadMoveDrawSite, CheckBadMovePreambleInput,
    CheckBadMoveResult, FactoryAiCheckBadMoveAttacker, FactoryAiCheckBadMoveRoarTarget,
    FactoryAiCheckBadMoveTarget,
};
use factory_core::factory_ai_check_bad_move_vectors_gen::CBM_PREAMBLE_SCORED_CASES;

fn neutral_attacker() -> FactoryAiCheckBadMoveAttacker {
    FactoryAiCheckBadMoveAttacker {
        atk_stage: 6,
        def_stage: 6,
        speed_stage: None,
        sp_atk_stage: None,
        sp_def_stage: None,
        light_screen_up: None,
        reflect_up: None,
        evasion_stage: None,
        attacker_future_attack_up: None,
        has_focus_energy: None,
        has_curable_status: None,
        current_weather: None,
        level: None,
        is_first_turn: None,
        safeguard_up: None,
        is_asleep: None,
        usable_party_mons: None,
        has_substitute: None,
        hp: None,
        max_hp: None,
        is_rooted: None,
        acc_stage: None,
        mist_up: None,
        gender: None,
        imprisoned_others: None,
        mud_sport_up: None,
        water_sport_up: None,
        used_held_item_id: None,
        stockpile_count: None,
    }
}

#[test]
fn scored_cases_match_ts() {
    assert!(!CBM_PREAMBLE_SCORED_CASES.is_empty());
    for (i, c) in CBM_PREAMBLE_SCORED_CASES.iter().enumerate() {
        let target = FactoryAiCheckBadMoveTarget {
            species: c.species,
            types: c.types,
            known_ability: c.known_ability,
            real_ability: c.real_ability,
            speed_stage: 6,
            atk_stage: 6,
            def_stage: 6,
            sp_def_stage: 6,
            acc_stage: None,
            evasion_stage: None,
            has_any_status: None,
            safeguard_up: None,
            is_confused: None,
            is_leech_seeded: None,
            is_asleep: None,
            is_escape_prevented: None,
            is_tormented: None,
            has_perish_song: None,
            is_nightmared: None,
            is_foresighted: None,
            spikes_up: None,
            target_future_attack_up: None,
            level: None,
            sp_atk_stage: None,
            is_infatuated: None,
            any_move_disabled: None,
            any_move_encored: None,
            gender: None,
        };
        let result = run_check_bad_move_preamble(CheckBadMovePreambleInput {
            rng: BattleRngState { value: c.rng_value, calls: 0 },
            move_id: c.move_id,
            target: FactoryAiCheckBadMoveRoarTarget { target, usable_party_mons: None },
            attacker: neutral_attacker(),
            draw_ordinal_start: 1,
        });
        let CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta } = result else {
            panic!("case {i}: {c:?} unexpectedly hit the NotYetPorted barrier");
        };
        assert_eq!(rng.value, c.expected_rng_value, "case {i}: {c:?}");
        assert_eq!(rng.calls, c.expected_rng_calls, "case {i}: {c:?}");
        assert_eq!(draw_count, c.expected_draw_count, "case {i}: {c:?}");
        assert_eq!(score_delta, c.expected_score_delta, "case {i}: {c:?}");
        for (d, (actual, expected)) in draws
            .iter()
            .zip(c.draws.iter())
            .take(draw_count as usize)
            .enumerate()
        {
            assert_eq!(actual.ordinal, expected.ordinal, "case {i} draw {d}: {c:?}");
            let expected_site = if expected.site == 0 {
                CheckBadMoveDrawSite::NegatesType
            } else {
                CheckBadMoveDrawSite::Soundproof
            };
            assert_eq!(actual.site, expected_site, "case {i} draw {d}: {c:?}");
            assert_eq!(
                actual.before.value, expected.before_value,
                "case {i} draw {d}: {c:?}"
            );
            assert_eq!(
                actual.before.calls, expected.before_calls,
                "case {i} draw {d}: {c:?}"
            );
            assert_eq!(
                actual.after.value, expected.after_value,
                "case {i} draw {d}: {c:?}"
            );
            assert_eq!(
                actual.after.calls, expected.after_calls,
                "case {i} draw {d}: {c:?}"
            );
            assert_eq!(
                actual.raw_rng_value, expected.raw_rng_value,
                "case {i} draw {d}: {c:?}"
            );
            assert_eq!(
                actual.random_value, expected.random_value,
                "case {i} draw {d}: {c:?}"
            );
            assert_eq!(
                actual.guessed_ability, expected.guessed_ability,
                "case {i} draw {d}: {c:?}"
            );
        }
    }
}
