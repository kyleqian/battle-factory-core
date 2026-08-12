//! Runs `factory_ai_check_viability::run_check_viability` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_viability_m5d2_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cv-m5d2-vectors.mjs`). Every expected value in that
//! file came from executing the real `src/engine/factoryAiCheckViability.ts`,
//! not hand computation — this test just proves the Rust M5d-2 handlers
//! reproduce it, including per-draw RNG values and the shared-tail/shared-
//! handler-family delegations (TICKLE, BULK_UP, COSMIC_POWER/CALM_MIND,
//! MINIMIZE).

use factory_core::factory_ai_check_bad_move::BattleRngState;
use factory_core::factory_ai_check_viability::{
    run_check_viability, CheckViabilityDraw, CheckViabilityResult, CvDrawKind,
    FactoryAiCheckViabilityBattler, RunCheckViabilityInput,
};
use factory_core::factory_ai_check_viability_m5d2_vectors_gen::{CvM5d2Case, CV_M5D2_CASES};

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

fn attacker_from_case(c: &CvM5d2Case) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: c.attacker_speed,
        speed_stage: c.attacker_speed_stage,
        atk_stage: c.attacker_atk_stage,
        def_stage: c.attacker_def_stage,
        sp_def_stage: c.attacker_sp_def_stage,
        evasion_stage: c.attacker_evasion_stage,
        acc_stage: c.attacker_acc_stage,
        sp_atk_stage: c.attacker_sp_atk_stage,
        hp: c.attacker_hp,
        max_hp: c.attacker_max_hp,
        is_rooted: c.attacker_is_rooted,
        ..neutral_battler()
    }
}

fn target_from_case(c: &CvM5d2Case) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: c.target_speed,
        speed_stage: c.target_speed_stage,
        types: c.target_types,
        atk_stage: c.target_atk_stage,
        def_stage: c.target_def_stage,
        sp_def_stage: c.target_sp_def_stage,
        evasion_stage: c.target_evasion_stage,
        acc_stage: c.target_acc_stage,
        hp: c.target_hp,
        max_hp: c.target_max_hp,
        last_used_move_id: c.target_last_used_move_id,
        is_toxic_poisoned: c.target_is_toxic_poisoned,
        is_leech_seeded: c.target_is_leech_seeded,
        is_cursed: c.target_is_cursed,
        ..neutral_battler()
    }
}

/// Decodes one actual `CheckViabilityDraw` into the generator's own generic
/// `(site, ordinal, before, after, raw_rng_value, random_value, flag)`
/// snapshot shape (`CvM5d2Draw`, `gen-cv-m5d2-vectors.mjs`'s own
/// `SITE_BY_KIND`/`drawFlag`). Covers exactly the 21 variant/kind
/// combinations M5d-2 constructs (13 draw sites its own handlers'
/// non-multi-kind variants, 8 more via the shared `CvDrawKind`-tagged
/// variants' individual kinds counted separately -- see the site numbering
/// comment inline); any other variant/kind reaching here is this test's own
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
        CheckViabilityDraw::AttackDownRoll1 {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            1,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::AttackDownRoll2 {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            2,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::DefenseDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            3,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::SpDefDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            4,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::EvasionDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            5,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::AttackUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::AttackUp1 => 6,
                CvDrawKind::AttackUp2 => 7,
                CvDrawKind::AttackUp3 => 8,
                other => panic!("unexpected CvDrawKind {other:?} for AttackUpRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(succeeded),
            )
        }
        CheckViabilityDraw::SpAtkUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::SpAtkUp1 => 9,
                CvDrawKind::SpAtkUp2 => 10,
                CvDrawKind::SpAtkUp3 => 11,
                other => panic!("unexpected CvDrawKind {other:?} for SpAtkUpRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(succeeded),
            )
        }
        CheckViabilityDraw::DefenseUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::DefenseUp1 => 12,
                CvDrawKind::DefenseUp2 => 13,
                CvDrawKind::DefenseUp3 => 14,
                CvDrawKind::DefenseUp4 => 15,
                CvDrawKind::DefenseUp5 => 16,
                other => panic!("unexpected CvDrawKind {other:?} for DefenseUpRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(succeeded),
            )
        }
        CheckViabilityDraw::SpDefUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::SpDefUp1 => 17,
                CvDrawKind::SpDefUp2 => 18,
                CvDrawKind::SpDefUp3 => 19,
                CvDrawKind::SpDefUp4 => 20,
                CvDrawKind::SpDefUp5 => 21,
                other => panic!("unexpected CvDrawKind {other:?} for SpDefUpRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(succeeded),
            )
        }
        CheckViabilityDraw::ScreenRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::LightScreen => 22,
                CvDrawKind::Reflect => 23,
                other => panic!("unexpected CvDrawKind {other:?} for ScreenRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(succeeded),
            )
        }
        CheckViabilityDraw::AccuracyDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::AccuracyDown1 => 24,
                CvDrawKind::AccuracyDown2 => 25,
                CvDrawKind::AccuracyDown3 => 26,
                CvDrawKind::AccuracyDown4 => 27,
                CvDrawKind::AccuracyDown5 => 28,
                CvDrawKind::AccuracyDown6 => 29,
                CvDrawKind::AccuracyDown7 => 30,
                other => panic!("unexpected CvDrawKind {other:?} for AccuracyDownRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(succeeded),
            )
        }
        CheckViabilityDraw::SpeedUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            31,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::EvasionUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::EvasionUp1 => 32,
                CvDrawKind::EvasionUp2 => 33,
                CvDrawKind::EvasionUp3 => 34,
                CvDrawKind::EvasionUp4 => 35,
                CvDrawKind::EvasionUp5 => 36,
                CvDrawKind::EvasionUp6 => 37,
                CvDrawKind::EvasionUp7 => 38,
                CvDrawKind::EvasionUp8 => 39,
                other => panic!("unexpected CvDrawKind {other:?} for EvasionUpRoll"),
            };
            (
                site,
                ordinal,
                before,
                after,
                raw_rng_value,
                random_value,
                u8::from(succeeded),
            )
        }
        other => panic!("decode_draw: unexpected M5d-2 draw variant {other:?}"),
    }
}

#[test]
fn m5d2_cases_match_ts() {
    assert!(!CV_M5D2_CASES.is_empty());
    for c in CV_M5D2_CASES.iter() {
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
