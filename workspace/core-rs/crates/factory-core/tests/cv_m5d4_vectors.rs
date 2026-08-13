//! Runs `factory_ai_check_viability::run_check_viability` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_viability_m5d4_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cv-m5d4-vectors.mjs`). Every expected value in that
//! file came from executing the real `src/engine/factoryAiCheckViability.ts`,
//! not hand computation — this test just proves the Rust M5d-4 handlers
//! reproduce it, including per-draw RNG values and the charge-up-move/
//! Curse/PsychUp/MirrorCoat/Substitute branch cascades, the stale-
//! `funcResult` collision maps, and the shared `target-faster-tie` draw.

use factory_core::factory_ai_check_bad_move::BattleRngState;
use factory_core::factory_ai_check_viability::{
    run_check_viability, CheckViabilityDraw, CheckViabilityResult, CvDrawKind,
    FactoryAiCheckViabilityBattler, RunCheckViabilityInput,
};
use factory_core::factory_ai_check_viability_m5d4_vectors_gen::{CvM5d4Case, CV_M5D4_CASES};

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

fn attacker_from_case(c: &CvM5d4Case) -> FactoryAiCheckViabilityBattler {
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
        is_first_turn: c.attacker_is_first_turn,
        moves: Some(c.attacker_moves),
        has_substitute: c.attacker_has_substitute,
        ..neutral_battler()
    }
}

fn target_from_case(c: &CvM5d4Case) -> FactoryAiCheckViabilityBattler {
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
        has_side_reflect: c.target_has_side_reflect,
        is_poisoned: c.target_is_poisoned,
        is_burned: c.target_is_burned,
        is_paralyzed: c.target_is_paralyzed,
        is_toxic_poisoned: c.target_is_toxic_poisoned,
        is_asleep: c.target_is_asleep,
        is_infatuated: c.target_is_infatuated,
        is_confused: c.target_is_confused,
        is_taunted: c.target_is_taunted,
        last_used_move_id: c.target_last_used_move_id,
        known_moves: Some(c.target_known_moves),
        any_move_disabled: c.target_any_move_disabled,
        has_any_status: c.target_has_any_status,
        target_party_status_equals_any: c.target_party_status_equals_any,
        is_leech_seeded: c.target_is_leech_seeded,
        ..neutral_battler()
    }
}

/// Decodes one actual `CheckViabilityDraw` into the generator's own generic
/// `(site, ordinal, before, after, raw_rng_value, random_value, flag)`
/// snapshot shape (`CvM5d4Draw`, `gen-cv-m5d4-vectors.mjs`'s own
/// `SITE_BY_KIND`/`drawFlag`). Covers exactly the variant/kind combinations
/// M5d-4 constructs; any other variant/kind reaching here is this test's own
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
        CheckViabilityDraw::CurseRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::Curse1 => 1,
                CvDrawKind::Curse2 => 2,
                CvDrawKind::Curse3 => 3,
                other => panic!("unexpected CvDrawKind {other:?} for CurseRoll"),
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
        CheckViabilityDraw::PsychUpRoll {
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
        CheckViabilityDraw::MirrorCoatRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::MirrorCoat1 => 5,
                CvDrawKind::MirrorCoat2 => 6,
                CvDrawKind::MirrorCoat3 => 7,
                CvDrawKind::MirrorCoat4 => 8,
                CvDrawKind::MirrorCoat5 => 9,
                CvDrawKind::MirrorCoat6 => 10,
                CvDrawKind::MirrorCoat7 => 11,
                other => panic!("unexpected CvDrawKind {other:?} for MirrorCoatRoll"),
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
        CheckViabilityDraw::DragonDanceRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::DragonDance1 => 12,
                CvDrawKind::DragonDance2 => 13,
                other => panic!("unexpected CvDrawKind {other:?} for DragonDanceRoll"),
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
        CheckViabilityDraw::BatonPassRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            14,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::FocusPunchKnockOffRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::KnockOff => 15,
                CvDrawKind::FocusPunch1 => 16,
                CvDrawKind::FocusPunch2 => 17,
                other => {
                    panic!("unexpected CvDrawKind {other:?} for FocusPunchKnockOffRoll in M5d-4")
                }
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
        CheckViabilityDraw::RevengeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            18,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::MagicCoatRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::MagicCoat1 => 19,
                CvDrawKind::MagicCoat2 => 20,
                CvDrawKind::MagicCoat3 => 21,
                other => panic!("unexpected CvDrawKind {other:?} for MagicCoatRoll"),
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
        CheckViabilityDraw::ForesightRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::Foresight1 => 22,
                CvDrawKind::Foresight2 => 23,
                other => panic!("unexpected CvDrawKind {other:?} for ForesightRoll"),
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
        CheckViabilityDraw::EncoreRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            24,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::SubstituteRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::Substitute1 => 25,
                CvDrawKind::Substitute2 => 26,
                CvDrawKind::Substitute3 => 27,
                CvDrawKind::Substitute4 => 28,
                other => panic!("unexpected CvDrawKind {other:?} for SubstituteRoll"),
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
        other => panic!("decode_draw: unexpected M5d-4 draw variant {other:?}"),
    }
}

#[test]
fn m5d4_cases_match_ts() {
    assert!(!CV_M5D4_CASES.is_empty());
    for c in CV_M5D4_CASES.iter() {
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
