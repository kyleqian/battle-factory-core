//! Runs `factory_ai_check_bad_move::run_check_bad_move_preamble` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_bad_move_m5b3_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cbm-m5b3-vectors.mjs`). Every expected value in that
//! file came from executing the real `src/engine/factoryAiCheckBadMove.ts`,
//! not hand computation — this test just proves the Rust port's M5b-3 batch
//! reproduces it bit-for-bit, handler logic included (mirrors
//! `cbm_m5b1_vectors.rs`/`cbm_m5b2_vectors.rs`'s own precedent). The
//! vestigial `EFFECT_ACCURACY_UP(_2)` cases (`CBM_M5B3_ACC_UP_CASES`) call
//! `run_cbm_acc_up` directly, same as the generator; that handler is
//! `pub(crate)` (batching doc §4), so those cases are checked in
//! `factory_ai_check_bad_move.rs`'s own in-file test module instead of here.

use factory_core::factory_ai_check_bad_move::{
    run_check_bad_move_preamble, BattleRngState, CheckBadMoveDrawSite, CheckBadMovePreambleInput,
    CheckBadMoveResult, FactoryAiCheckBadMoveAttacker, FactoryAiCheckBadMoveRoarTarget,
    FactoryAiCheckBadMoveTarget,
};
use factory_core::factory_ai_check_bad_move_m5b3_vectors_gen::{
    CbmM5b3DrawCase, CBM_M5B3_SCORED_CASES,
};

fn draw_site(site: u8) -> CheckBadMoveDrawSite {
    match site {
        0 => CheckBadMoveDrawSite::NegatesType,
        1 => CheckBadMoveDrawSite::Soundproof,
        other => panic!("cbm_m5b3_vectors: unrecognized draw site {other} in a generated case"),
    }
}

fn assert_draw_matches(
    actual: &factory_core::factory_ai_check_bad_move::CheckBadMoveDraw,
    expected: &CbmM5b3DrawCase,
    ctx: &str,
) {
    assert_eq!(actual.ordinal, expected.ordinal, "{ctx}");
    assert_eq!(actual.site, draw_site(expected.site), "{ctx}");
    assert_eq!(actual.before.value, expected.before_value, "{ctx}");
    assert_eq!(actual.before.calls, expected.before_calls, "{ctx}");
    assert_eq!(actual.after.value, expected.after_value, "{ctx}");
    assert_eq!(actual.after.calls, expected.after_calls, "{ctx}");
    assert_eq!(actual.raw_rng_value, expected.raw_rng_value, "{ctx}");
    assert_eq!(actual.random_value, expected.random_value, "{ctx}");
    assert_eq!(actual.guessed_ability, expected.guessed_ability, "{ctx}");
}

#[test]
fn scored_cases_match_ts() {
    assert!(!CBM_M5B3_SCORED_CASES.is_empty());
    for (i, c) in CBM_M5B3_SCORED_CASES.iter().enumerate() {
        let target = FactoryAiCheckBadMoveTarget {
            species: c.species,
            types: c.types,
            known_ability: c.known_ability,
            real_ability: c.real_ability,
            speed_stage: c.target_speed_stage,
            atk_stage: c.target_atk_stage,
            def_stage: c.target_def_stage,
            sp_def_stage: c.target_sp_def_stage,
            acc_stage: c.target_acc_stage,
            evasion_stage: c.target_evasion_stage,
            has_any_status: None,
            safeguard_up: None,
            is_confused: None,
            is_leech_seeded: None,
            is_asleep: None,
            is_escape_prevented: c.target_is_escape_prevented,
            is_tormented: c.target_is_tormented,
            has_perish_song: None,
            is_nightmared: None,
            is_foresighted: None,
            spikes_up: None,
            target_future_attack_up: None,
            level: None,
            sp_atk_stage: c.target_sp_atk_stage,
            is_infatuated: None,
            any_move_disabled: c.target_any_move_disabled,
            any_move_encored: c.target_any_move_encored,
            gender: None,
        };
        let attacker = FactoryAiCheckBadMoveAttacker {
            atk_stage: c.attacker_atk_stage,
            def_stage: c.attacker_def_stage,
            speed_stage: c.attacker_speed_stage,
            sp_atk_stage: c.attacker_sp_atk_stage,
            sp_def_stage: c.attacker_sp_def_stage,
            light_screen_up: c.attacker_light_screen_up,
            reflect_up: c.attacker_reflect_up,
            evasion_stage: c.attacker_evasion_stage,
            attacker_future_attack_up: None,
            has_focus_energy: None,
            has_curable_status: None,
            current_weather: None,
            level: None,
            is_first_turn: None,
            safeguard_up: c.attacker_safeguard_up,
            is_asleep: c.attacker_is_asleep,
            usable_party_mons: c.attacker_usable_party_mons,
            has_substitute: c.attacker_has_substitute,
            hp: c.attacker_hp,
            max_hp: c.attacker_max_hp,
            is_rooted: None,
            acc_stage: c.attacker_acc_stage,
            mist_up: c.attacker_mist_up,
            gender: None,
            imprisoned_others: c.attacker_imprisoned_others,
            mud_sport_up: c.attacker_mud_sport_up,
            water_sport_up: c.attacker_water_sport_up,
            used_held_item_id: c.attacker_used_held_item_id,
            stockpile_count: c.attacker_stockpile_count,
        };
        let result = run_check_bad_move_preamble(CheckBadMovePreambleInput {
            rng: BattleRngState { value: c.rng_value, calls: 0 },
            move_id: c.move_id,
            target: FactoryAiCheckBadMoveRoarTarget { target, usable_party_mons: None },
            attacker,
            draw_ordinal_start: 1,
        });
        let CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta } = result else {
            panic!("case {i}: {c:?} unexpectedly hit the NotYetPorted barrier");
        };
        let ctx = format!("case {i}: {c:?}");
        assert_eq!(rng.value, c.expected_rng_value, "{ctx}");
        assert_eq!(rng.calls, c.expected_rng_calls, "{ctx}");
        assert_eq!(draw_count, c.expected_draw_count, "{ctx}");
        assert_eq!(score_delta, c.expected_score_delta, "{ctx}");
        for (d, (actual, expected)) in draws
            .iter()
            .zip(c.draws.iter())
            .take(draw_count as usize)
            .enumerate()
        {
            assert_draw_matches(actual, expected, &format!("{ctx} draw {d}"));
        }
    }
}
