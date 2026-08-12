//! Runs `factory_ai_check_viability::run_check_viability` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_viability_m5d3_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cv-m5d3-vectors.mjs`). Every expected value in that
//! file came from executing the real `src/engine/factoryAiCheckViability.ts`,
//! not hand computation — this test just proves the Rust M5d-3 handlers
//! reproduce it, including per-draw RNG values and the weather-trio/heal-
//! family shared-tail delegations (SYNTHESIS/MOONLIGHT, SOFTBOILED/SWALLOW,
//! MEAN_LOOK, MEMENTO), the stale-`funcResult` collision maps, and the
//! Swagger→Confuse delegation.

use factory_core::factory_ai_check_bad_move::BattleRngState;
use factory_core::factory_ai_check_viability::{
    run_check_viability, CheckViabilityDraw, CheckViabilityResult, CvDrawKind,
    FactoryAiCheckViabilityBattler, RunCheckViabilityInput,
};
use factory_core::factory_ai_check_viability_m5d3_vectors_gen::{CvM5d3Case, CV_M5D3_CASES};

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

fn attacker_from_case(c: &CvM5d3Case) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: c.attacker_speed,
        speed_stage: c.attacker_speed_stage,
        hp: c.attacker_hp,
        max_hp: c.attacker_max_hp,
        types: c.attacker_types,
        ability: c.attacker_ability,
        current_weather: c.attacker_current_weather,
        moves: Some(c.attacker_moves),
        battle_turn_count: c.attacker_battle_turn_count,
        is_asleep: c.attacker_is_asleep,
        ..neutral_battler()
    }
}

fn target_from_case(c: &CvM5d3Case) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: c.target_speed,
        speed_stage: c.target_speed_stage,
        hp: c.target_hp,
        max_hp: c.target_max_hp,
        types: c.target_types,
        atk_stage: c.target_atk_stage,
        evasion_stage: c.target_evasion_stage,
        sp_atk_stage: c.target_sp_atk_stage,
        last_used_move_id: c.target_last_used_move_id,
        known_moves: Some(c.target_known_moves),
        is_toxic_poisoned: c.target_is_toxic_poisoned,
        is_leech_seeded: c.target_is_leech_seeded,
        is_cursed: c.target_is_cursed,
        has_perish_song: c.target_has_perish_song,
        is_infatuated: c.target_is_infatuated,
        is_asleep: c.target_is_asleep,
        is_confused: c.target_is_confused,
        is_taunted: c.target_is_taunted,
        ..neutral_battler()
    }
}

/// Decodes one actual `CheckViabilityDraw` into the generator's own generic
/// `(site, ordinal, before, after, raw_rng_value, random_value, flag)`
/// snapshot shape (`CvM5d3Draw`, `gen-cv-m5d3-vectors.mjs`'s own
/// `SITE_BY_KIND`/`drawFlag`). Covers exactly the variant/kind combinations
/// M5d-3 constructs; any other variant/kind reaching here is this test's own
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
        CheckViabilityDraw::UserFasterTie {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            strikes_first,
        } => (
            1,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            strikes_first,
        ),
        CheckViabilityDraw::RestRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::Rest1 => 2,
                CvDrawKind::Rest2 => 3,
                CvDrawKind::RestSnatch => 4,
                CvDrawKind::RestTail => 5,
                other => panic!("unexpected CvDrawKind {other:?} for RestRoll"),
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
        CheckViabilityDraw::HealRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::Heal1 => 6,
                CvDrawKind::Heal2 => 7,
                CvDrawKind::Heal3 => 8,
                other => panic!("unexpected CvDrawKind {other:?} for HealRoll"),
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
        CheckViabilityDraw::AbsorbRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            9,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::EndureRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            10,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::PursuitSleepRoarParalyzeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let site = match kind {
                CvDrawKind::Roar => 11,
                CvDrawKind::Paralyze => 23,
                other => panic!(
                    "unexpected CvDrawKind {other:?} for PursuitSleepRoarParalyzeRoll in M5d-3"
                ),
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
        CheckViabilityDraw::FlailRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            12,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::DestinyBondRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::DestinyBond1 => 13,
                CvDrawKind::DestinyBond2 => 14,
                CvDrawKind::DestinyBond3 => 15,
                other => panic!("unexpected CvDrawKind {other:?} for DestinyBondRoll"),
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
        CheckViabilityDraw::SelfKoRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::SelfKo1 => 16,
                CvDrawKind::SelfKo2 => 17,
                CvDrawKind::SelfKo3 => 18,
                CvDrawKind::SelfKo4 => 19,
                CvDrawKind::SelfKo5 => 20,
                other => panic!("unexpected CvDrawKind {other:?} for SelfKoRoll"),
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
        CheckViabilityDraw::SemiInvulnerableRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            21,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::TrapRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            22,
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
            24,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::SwaggerRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => (
            25,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped),
        ),
        CheckViabilityDraw::CounterRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::CounterLowHp => 26,
                CvDrawKind::CounterMidHp => 27,
                CvDrawKind::CounterTaunt => 28,
                CvDrawKind::CounterPhysical => 29,
                CvDrawKind::CounterTargetType => 30,
                CvDrawKind::CounterBonus => 31,
                other => panic!("unexpected CvDrawKind {other:?} for CounterRoll"),
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
        other => panic!("decode_draw: unexpected M5d-3 draw variant {other:?}"),
    }
}

#[test]
fn m5d3_cases_match_ts() {
    assert!(!CV_M5D3_CASES.is_empty());
    for c in CV_M5D3_CASES.iter() {
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
