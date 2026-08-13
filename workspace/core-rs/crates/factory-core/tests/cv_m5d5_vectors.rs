//! Runs `factory_ai_check_viability::run_check_viability` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_viability_m5d5_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cv-m5d5-vectors.mjs`). Every expected value in that
//! file came from executing the real `src/engine/factoryAiCheckViability.ts`,
//! not hand computation -- this test just proves the Rust M5d-5 handlers
//! reproduce it, including per-draw RNG values, the Trick/ChangeSelfAbility/
//! Snatch branch cascades, the Sport same-function/two-dispatch-arm pair,
//! Flatter's cross-batch delegation into `run_cv_confuse`, and the stale-
//! `funcResult` collision maps. The 2 fully-vestigial handlers
//! (`run_cv_accuracy_up`/`run_cv_sp_atk_down`) are `pub(crate)`, not `pub`
//! (batching doc §2/§4), so their own checked-in vectors
//! (`CV_M5D5_VESTIGIAL_CASES`) are consumed by a same-crate test inside
//! `factory_ai_check_viability.rs`'s own `mod tests` instead of here.

use factory_core::factory_ai_check_bad_move::BattleRngState;
use factory_core::factory_ai_check_viability::{
    run_check_viability, CheckViabilityDraw, CheckViabilityResult, CvDrawKind,
    FactoryAiCheckViabilityBattler, RunCheckViabilityInput,
};
use factory_core::factory_ai_check_viability_m5d5_vectors_gen::{CvM5d5Case, CV_M5D5_CASES};

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

fn attacker_from_case(c: &CvM5d5Case) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: c.attacker_speed,
        speed_stage: c.attacker_speed_stage,
        types: c.attacker_types,
        hp: c.attacker_hp,
        max_hp: c.attacker_max_hp,
        atk_stage: c.attacker_atk_stage,
        def_stage: c.attacker_def_stage,
        sp_def_stage: c.attacker_sp_def_stage,
        sp_atk_stage: c.attacker_sp_atk_stage,
        evasion_stage: c.attacker_evasion_stage,
        acc_stage: c.attacker_acc_stage,
        is_first_turn: c.attacker_is_first_turn,
        moves: Some(c.attacker_moves),
        ability: c.attacker_ability,
        hold_effect: c.attacker_hold_effect,
        used_held_item_id: c.attacker_used_held_item_id,
        stockpile_count: c.attacker_stockpile_count,
        battle_turn_count: c.attacker_battle_turn_count,
        ..neutral_battler()
    }
}

fn target_from_case(c: &CvM5d5Case) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: c.target_speed,
        speed_stage: c.target_speed_stage,
        types: c.target_types,
        hp: c.target_hp,
        max_hp: c.target_max_hp,
        atk_stage: c.target_atk_stage,
        def_stage: c.target_def_stage,
        sp_def_stage: c.target_sp_def_stage,
        sp_atk_stage: c.target_sp_atk_stage,
        evasion_stage: c.target_evasion_stage,
        acc_stage: c.target_acc_stage,
        is_paralyzed: c.target_is_paralyzed,
        last_used_move_id: c.target_last_used_move_id,
        known_moves: Some(c.target_known_moves),
        hold_effect: c.target_hold_effect,
        ability: c.target_ability,
        known_ability: c.target_known_ability,
        species_abilities: c.target_species_abilities,
        ..neutral_battler()
    }
}

/// Decodes one actual `CheckViabilityDraw` into the generator's own generic
/// `(site, ordinal, before, after, raw_rng_value, random_value, flag)`
/// snapshot shape (`CvM5d5Draw`, `gen-cv-m5d5-vectors.mjs`'s own
/// `SITE_BY_KIND`/`drawFlag`). Covers exactly the variant/kind combinations
/// M5d-5 constructs; any other variant/kind reaching here is this test's own
/// bug, not a real handler output.
fn decode_draw(d: &CheckViabilityDraw) -> (u8, u32, BattleRngState, BattleRngState, u32, u16, u8) {
    match *d {
        CheckViabilityDraw::TargetFasterTie {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            strikes_first,
        } => (
            0,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            strikes_first,
        ),
        CheckViabilityDraw::TrickRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            1,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::GetAbility {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            guessed_ability,
        } => (
            2,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            (guessed_ability & 0xff) as u8,
        ),
        CheckViabilityDraw::ChangeSelfAbilityRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            3,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::DisableRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            4,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::FlatterRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            5,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::ConfuseRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            6,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::LockOnImprisonRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::LockOn => 7,
                CvDrawKind::Imprison => 8,
                other => panic!("unexpected CvDrawKind {other:?} for LockOnImprisonRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(jumped),
            )
        }
        CheckViabilityDraw::ConversionRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            9,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::ThiefRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            10,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::HazeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::Haze1 => 11,
                CvDrawKind::Haze2 => 12,
                CvDrawKind::Haze3 => 13,
                other => panic!("unexpected CvDrawKind {other:?} for HazeRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(jumped),
            )
        }
        CheckViabilityDraw::RecycleRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            14,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::SpitUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            15,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::MirrorMoveRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::MirrorMove1 => 16,
                CvDrawKind::MirrorMove2 => 17,
                other => panic!("unexpected CvDrawKind {other:?} for MirrorMoveRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(jumped),
            )
        }
        CheckViabilityDraw::SnatchRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::Snatch1 => 18,
                CvDrawKind::Snatch2 => 19,
                CvDrawKind::Snatch3 => 20,
                CvDrawKind::Snatch4 => 21,
                CvDrawKind::Snatch5 => 22,
                other => panic!("unexpected CvDrawKind {other:?} for SnatchRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(jumped),
            )
        }
        other => panic!("decode_draw: unexpected M5d-5 draw variant {other:?}"),
    }
}

#[test]
fn m5d5_cases_match_ts() {
    assert!(!CV_M5D5_CASES.is_empty());
    for c in CV_M5D5_CASES.iter() {
        let result = run_check_viability(RunCheckViabilityInput {
            rng: BattleRngState { value: c.rng_value, calls: 0 },
            move_id: c.move_id,
            attacker: attacker_from_case(c),
            target: target_from_case(c),
            stale_func_result_fallback: c.fallback,
            draw_ordinal_start: 1,
        });
        let CheckViabilityResult::Scored { rng, draws, draw_count, score_delta, func_result_after } =
            result
        else {
            panic!(
                "case {}: unexpectedly hit the NotYetPorted barrier",
                c.label
            );
        };
        assert_eq!(rng.value, c.expected_rng_value, "case {}", c.label);
        assert_eq!(rng.calls, c.expected_rng_calls, "case {}", c.label);
        assert_eq!(draw_count, c.expected_draw_count, "case {}", c.label);
        assert_eq!(score_delta, c.expected_score_delta, "case {}", c.label);
        assert_eq!(
            func_result_after, c.expected_func_result_after,
            "case {}",
            c.label
        );

        for (i, (actual_draw, expected)) in draws
            .iter()
            .zip(c.draws.iter())
            .take(draw_count as usize)
            .enumerate()
        {
            let (site, ordinal, before, after, raw_rng_value, random_value, flag) =
                decode_draw(actual_draw);
            assert_eq!(site, expected.site, "case {} draw {i}: site", c.label);
            assert_eq!(
                ordinal, expected.ordinal,
                "case {} draw {i}: ordinal",
                c.label
            );
            assert_eq!(
                before.value, expected.before_value,
                "case {} draw {i}: before.value",
                c.label
            );
            assert_eq!(
                before.calls, expected.before_calls,
                "case {} draw {i}: before.calls",
                c.label
            );
            assert_eq!(
                after.value, expected.after_value,
                "case {} draw {i}: after.value",
                c.label
            );
            assert_eq!(
                after.calls, expected.after_calls,
                "case {} draw {i}: after.calls",
                c.label
            );
            assert_eq!(
                raw_rng_value, expected.raw_rng_value,
                "case {} draw {i}: raw_rng_value",
                c.label
            );
            assert_eq!(
                random_value, expected.random_value,
                "case {} draw {i}: random_value",
                c.label
            );
            assert_eq!(flag, expected.flag, "case {} draw {i}: flag", c.label);
        }
    }
}
