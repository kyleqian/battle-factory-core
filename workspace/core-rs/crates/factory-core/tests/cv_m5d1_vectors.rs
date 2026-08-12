//! Runs `factory_ai_check_viability::run_check_viability` against the
//! checked-in, TS-generated vectors in
//! `factory_ai_check_viability_m5d1_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-cv-m5d1-vectors.mjs`). Every expected value in that
//! file came from executing the real `src/engine/factoryAiCheckViability.ts`,
//! not hand computation — this test just proves the Rust M5d-1 handlers
//! reproduce it, including per-draw RNG values and the delegated/non-
//! delegated `EFFECT_SPEED_DOWN_HIT` split.

use factory_core::factory_ai_check_bad_move::BattleRngState;
use factory_core::factory_ai_check_viability::{
    run_check_viability, CheckViabilityDraw, CheckViabilityResult, CvDrawKind,
    FactoryAiCheckViabilityBattler, RunCheckViabilityInput,
};
use factory_core::factory_ai_check_viability_m5d1_vectors_gen::{CvM5d1Case, CV_M5D1_CASES};

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

fn attacker_from_case(c: &CvM5d1Case) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: c.attacker_speed,
        speed_stage: c.attacker_speed_stage,
        types: c.attacker_types,
        is_first_turn: c.attacker_is_first_turn,
        acc_stage: c.attacker_acc_stage,
        hp: c.attacker_hp,
        max_hp: c.attacker_max_hp,
        moves: c.attacker_moves,
        is_infatuated: c.attacker_is_infatuated,
        is_leech_seeded: c.attacker_is_leech_seeded,
        has_yawn: c.attacker_has_yawn,
        protect_uses: c.attacker_protect_uses,
        ..neutral_battler()
    }
}

fn target_from_case(c: &CvM5d1Case) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: c.target_speed,
        speed_stage: c.target_speed_stage,
        types: c.target_types,
        evasion_stage: c.target_evasion_stage,
        hp: c.target_hp,
        max_hp: c.target_max_hp,
        last_used_move_id: c.target_last_used_move_id,
        known_moves: c.target_known_moves,
        is_toxic_poisoned: c.target_is_toxic_poisoned,
        is_cursed: c.target_is_cursed,
        has_perish_song: c.target_has_perish_song,
        is_infatuated: c.target_is_infatuated,
        is_leech_seeded: c.target_is_leech_seeded,
        has_yawn: c.target_has_yawn,
        ..neutral_battler()
    }
}

/// Decodes one actual `CheckViabilityDraw` into the generator's own generic
/// `(site, ordinal, before, after, raw_rng_value, random_value, flag)`
/// snapshot shape (`CvM5d1Draw`, `gen-cv-m5d1-vectors.mjs`'s own
/// `SITE_BY_KIND`/`drawFlag`). Covers exactly the 10 variants M5d-1
/// constructs; any other variant reaching here is this test's own bug, not
/// a real handler output.
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
        CheckViabilityDraw::SpeedDownRoll {
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
                CvDrawKind::Sleep => 2,
                CvDrawKind::Pursuit => 3,
                other => panic!(
                    "unexpected CvDrawKind {other:?} for PursuitSleepRoarParalyzeRoll in M5d-1"
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
        CheckViabilityDraw::ProtectRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::Protect1 => 4,
                CvDrawKind::Protect2 => 5,
                other => panic!("unexpected CvDrawKind {other:?} for ProtectRoll"),
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
        CheckViabilityDraw::ToxicRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let site = match kind {
                CvDrawKind::Toxic1 => 6,
                CvDrawKind::Toxic2 => 7,
                CvDrawKind::Toxic3 => 8,
                other => panic!("unexpected CvDrawKind {other:?} for ToxicRoll"),
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
        CheckViabilityDraw::HighCritFallthroughRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped_to_end,
        } => (
            9,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped_to_end),
        ),
        CheckViabilityDraw::HighCritRoll {
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
        CheckViabilityDraw::AlwaysHitRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            11,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        CheckViabilityDraw::VitalThrowMidbandRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped_to_end,
        } => (
            12,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(jumped_to_end),
        ),
        CheckViabilityDraw::VitalThrowRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => (
            13,
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            u8::from(succeeded),
        ),
        other => panic!("decode_draw: unexpected M5d-1 draw variant {other:?}"),
    }
}

#[test]
fn m5d1_cases_match_ts() {
    assert!(!CV_M5D1_CASES.is_empty());
    for c in CV_M5D1_CASES.iter() {
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
