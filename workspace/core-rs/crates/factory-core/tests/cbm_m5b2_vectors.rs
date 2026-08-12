//! Runs `factory_ai_check_bad_move::run_check_bad_move_preamble` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_bad_move_m5b2_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cbm-m5b2-vectors.mjs`). Every expected value in that
//! file came from executing the real `src/engine/factoryAiCheckBadMove.ts`,
//! not hand computation — this test just proves the Rust port's M5b-2 batch
//! reproduces it bit-for-bit, handler logic included (mirrors
//! `cbm_m5b1_vectors.rs`'s own precedent). The vestigial
//! `EFFECT_SPECIAL_ATTACK_DOWN(_2)` cases (`CBM_M5B2_SP_ATK_DOWN_CASES`) call
//! `run_cbm_sp_atk_down` directly, same as the generator; that handler is
//! `pub(crate)` (batching doc §4), so those cases are checked in
//! `factory_ai_check_bad_move.rs`'s own in-file test module instead of here.

use factory_core::factory_ai_check_bad_move::{
    run_check_bad_move_preamble, BattleRngState, CheckBadMoveDrawSite, CheckBadMovePreambleInput,
    CheckBadMoveResult, FactoryAiCheckBadMoveAttacker, FactoryAiCheckBadMoveRoarTarget,
    FactoryAiCheckBadMoveTarget, FactoryAiMonGender,
};
use factory_core::factory_ai_check_bad_move_m5b2_vectors_gen::{
    CbmM5b2DrawCase, CBM_M5B2_SCORED_CASES,
};

fn draw_site(site: u8) -> CheckBadMoveDrawSite {
    match site {
        0 => CheckBadMoveDrawSite::NegatesType,
        1 => CheckBadMoveDrawSite::Soundproof,
        2 => CheckBadMoveDrawSite::HighRiskForDamageAbility,
        3 => CheckBadMoveDrawSite::MagnitudeLevitate,
        4 => CheckBadMoveDrawSite::SpeedDownSharedTail,
        5 => CheckBadMoveDrawSite::AttackDownHyperCutter,
        6 => CheckBadMoveDrawSite::AttackDownSharedTail,
        7 => CheckBadMoveDrawSite::DefenseDownSharedTail,
        8 => CheckBadMoveDrawSite::SpDefDownSharedTail,
        9 => CheckBadMoveDrawSite::AccDownKeenEye,
        10 => CheckBadMoveDrawSite::AccDownSharedTail,
        11 => CheckBadMoveDrawSite::EvasionDownSharedTail,
        12 => CheckBadMoveDrawSite::SpAtkDownSharedTail,
        13 => CheckBadMoveDrawSite::ToxicImmunity,
        14 => CheckBadMoveDrawSite::SleepAbility,
        15 => CheckBadMoveDrawSite::ParalyzeAbility,
        16 => CheckBadMoveDrawSite::ConfuseAbility,
        17 => CheckBadMoveDrawSite::OneHitKoAbility,
        18 => CheckBadMoveDrawSite::WillOWispAbility,
        19 => CheckBadMoveDrawSite::RoarAbility,
        20 => CheckBadMoveDrawSite::TrickAndKnockOffAbility,
        21 => CheckBadMoveDrawSite::ExplosionAbility,
        22 => CheckBadMoveDrawSite::AttractAbility,
        other => panic!("cbm_m5b2_vectors: unrecognized draw site {other} in a generated case"),
    }
}

fn gender(id: Option<u8>) -> Option<FactoryAiMonGender> {
    match id {
        None => None,
        Some(0) => Some(FactoryAiMonGender::Male),
        Some(1) => Some(FactoryAiMonGender::Female),
        Some(2) => Some(FactoryAiMonGender::Genderless),
        Some(other) => {
            panic!("cbm_m5b2_vectors: unrecognized gender id {other} in a generated case")
        }
    }
}

fn assert_draw_matches(
    actual: &factory_core::factory_ai_check_bad_move::CheckBadMoveDraw,
    expected: &CbmM5b2DrawCase,
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
    assert!(!CBM_M5B2_SCORED_CASES.is_empty());
    for (i, c) in CBM_M5B2_SCORED_CASES.iter().enumerate() {
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
            has_any_status: c.target_has_any_status,
            safeguard_up: c.target_safeguard_up,
            is_confused: c.target_is_confused,
            is_leech_seeded: c.target_is_leech_seeded,
            is_asleep: c.target_is_asleep,
            is_escape_prevented: None,
            is_tormented: None,
            has_perish_song: None,
            is_nightmared: None,
            is_foresighted: None,
            spikes_up: None,
            target_future_attack_up: None,
            level: c.target_level,
            sp_atk_stage: c.target_sp_atk_stage,
            is_infatuated: c.target_is_infatuated,
            any_move_disabled: None,
            any_move_encored: None,
            gender: gender(c.target_gender),
        };
        let attacker = FactoryAiCheckBadMoveAttacker {
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
            level: c.attacker_level,
            is_first_turn: c.attacker_is_first_turn,
            safeguard_up: None,
            is_asleep: None,
            usable_party_mons: c.attacker_usable_party_mons,
            has_substitute: None,
            hp: None,
            max_hp: None,
            is_rooted: None,
            acc_stage: None,
            mist_up: None,
            gender: gender(c.attacker_gender),
            imprisoned_others: None,
            mud_sport_up: None,
            water_sport_up: None,
            used_held_item_id: None,
            stockpile_count: c.attacker_stockpile_count,
        };
        let result = run_check_bad_move_preamble(CheckBadMovePreambleInput {
            rng: BattleRngState { value: c.rng_value, calls: 0 },
            move_id: c.move_id,
            target: FactoryAiCheckBadMoveRoarTarget {
                target,
                usable_party_mons: c.target_usable_party_mons,
            },
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
