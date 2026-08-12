//! Runs `turn_order`/`turn_rng`'s pure functions against the checked-in,
//! TS-generated vectors in `turn_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-turn-vectors.mjs`). Every expected value in that file
//! came from executing the real `src/engine/turnOrder.ts` and
//! `src/engine/turnRng.ts`, not hand computation — this test just proves
//! the Rust port reproduces it.

use factory_core::turn_order::{
    effective_speed, get_who_strikes_first, sort_battlers_by_turn_order, TurnOrderBattler,
    WeatherState,
};
use factory_core::turn_rng::run_turn1_rng_ledger;
use factory_core::turn_vectors_gen::{
    TurnOrderBattlerRow, WeatherStateRow, EFFECTIVE_SPEED_CASES, SORT_CASES, STRIKES_FIRST_CASES,
    TURN_RNG_LEDGER_CASES,
};
use std::collections::HashMap;

fn battler_from_row(row: TurnOrderBattlerRow) -> TurnOrderBattler {
    TurnOrderBattler {
        speed: row.speed,
        speed_stage: row.speed_stage,
        move_priority: row.move_priority,
        is_paralyzed: row.is_paralyzed,
        ability: row.ability,
        hold_effect: row.hold_effect,
        hold_effect_param: row.hold_effect_param,
    }
}

fn weather_from_row(row: WeatherStateRow) -> WeatherState {
    WeatherState { is_raining: row.is_raining, is_sunny: row.is_sunny }
}

#[test]
fn effective_speed_cases_match_ts() {
    assert!(!EFFECTIVE_SPEED_CASES.is_empty());
    for (i, c) in EFFECTIVE_SPEED_CASES.iter().enumerate() {
        let battler = battler_from_row(c.battler);
        let weather = weather_from_row(c.weather);
        assert_eq!(
            effective_speed(&battler, weather, c.random_turn_number),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn strikes_first_cases_match_ts() {
    assert!(!STRIKES_FIRST_CASES.is_empty());
    for (i, c) in STRIKES_FIRST_CASES.iter().enumerate() {
        let b1 = battler_from_row(c.battler1);
        let b2 = battler_from_row(c.battler2);
        let weather = weather_from_row(c.weather);
        assert_eq!(
            get_who_strikes_first(
                &b1,
                &b2,
                c.speed_tie_rng_roll,
                weather,
                c.random_turn_number
            ),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn sort_cases_match_ts() {
    assert!(!SORT_CASES.is_empty());
    for (i, c) in SORT_CASES.iter().enumerate() {
        let ids: Vec<u32> = c.battler_ids[..c.count].to_vec();
        let battlers: HashMap<u32, TurnOrderBattler> = ids
            .iter()
            .zip(c.battlers[..c.count].iter())
            .map(|(&id, &row)| (id, battler_from_row(row)))
            .collect();
        let rolls: Vec<u16> = c.speed_tie_rng_rolls[..c.roll_count].to_vec();
        let weather = weather_from_row(c.weather);
        let result =
            sort_battlers_by_turn_order(&ids, &battlers, &rolls, weather, c.random_turn_number);
        let expected: Vec<u32> = c.expected[..c.count].to_vec();
        assert_eq!(result, expected, "case {i}: {c:?}");
    }
}

#[test]
fn turn_rng_ledger_cases_match_ts() {
    assert!(!TURN_RNG_LEDGER_CASES.is_empty());
    for (i, c) in TURN_RNG_LEDGER_CASES.iter().enumerate() {
        let results = run_turn1_rng_ledger(c.seed);
        let before: Vec<u32> = results.iter().map(|r| r.rng_value_before).collect();
        let after: Vec<u32> = results.iter().map(|r| r.rng_value_after).collect();
        assert_eq!(
            before,
            c.rng_value_before.to_vec(),
            "case {i} (seed {})",
            c.seed
        );
        assert_eq!(
            after,
            c.rng_value_after.to_vec(),
            "case {i} (seed {})",
            c.seed
        );
    }
}
