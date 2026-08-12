//! Turn order, ported bit-exact from `GetWhoStrikesFirst`
//! (`reference/pokeemerald/src/battle_main.c:4595-4754`) and ported from
//! `src/engine/turnOrder.ts` (135 lines). Scope: priority + speed
//! comparison + the `Random()&1` speed-tie break; the weather-based
//! speed-doubling abilities (Swift Swim/Chlorophyll), Macho Brace,
//! paralysis speed-quarter, and Quick Claw are ported structurally (battle
//! 1 turn 1 needs none of them — both battlers are unstatused, unparalyzed,
//! hold no speed-affecting item, no weather) — see
//! `docs/battle-turn-notes.md` §10. Badge boosts are NOT ported: like
//! `damage_calc.rs`, `ShouldGetStatBadgeBoost` is unconditionally FALSE for
//! `BATTLE_TYPE_FRONTIER`, which every battle this engine models is.
//!
//! ## Numeric id spaces
//! Abilities/hold effects cross as the same `u16` ids `damage_calc.rs` and
//! `gen_tables.rs` use (`src/data/gen/ability-item-hooks.json`
//! `.universes`, verified at port time, not recalled): `ABILITY_SWIFT_SWIM`
//! = 33, `ABILITY_CHLOROPHYLL` = 34, `HOLD_EFFECT_MACHO_BRACE` = 24,
//! `HOLD_EFFECT_QUICK_CLAW` = 26.
//!
//! ## Arithmetic widths
//! `speed` is `u32` (needs to hold the `UINT_MAX` Quick Claw sentinel,
//! `0xffff_ffff`, which overflows `i32`); every other numeric field
//! (`speed_stage`, `hold_effect_param`) is non-negative in the domain this
//! function is ever called with, same as the TS module's header comment
//! notes ("speeds are non-negative here but document it"). Rust's `/` on
//! signed integers truncates toward zero, matching the ported TS's
//! `Math.trunc(a / b)`, for the (non-negative-in-practice) intermediate `i32`
//! math below.

use crate::damage_calc::STAT_STAGE_RATIOS;

/// `ABILITY_SWIFT_SWIM` (`src/data/gen/ability-item-hooks.json`
/// `.universes.abilities`, verified at port time).
pub const ABILITY_SWIFT_SWIM: u16 = 33;
/// `ABILITY_CHLOROPHYLL` (same source).
pub const ABILITY_CHLOROPHYLL: u16 = 34;
/// `HOLD_EFFECT_MACHO_BRACE` (`src/data/gen/ability-item-hooks.json`
/// `.universes.holdEffects`, verified at port time).
pub const HOLD_EFFECT_MACHO_BRACE: u16 = 24;
/// `HOLD_EFFECT_QUICK_CLAW` (same source).
pub const HOLD_EFFECT_QUICK_CLAW: u16 = 26;

/// `GetWhoStrikesFirst`'s stored-turn-random Quick Claw speed sentinel
/// (battle_main.c's `UINT_MAX`, mirrored from `turnOrder.ts`'s
/// `UINT_MAX = 0xffff_ffff`).
pub const UINT_MAX: u32 = 0xffff_ffff;

/// Mirrors `WeatherState` (`turnOrder.ts:34-37`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct WeatherState {
    pub is_raining: bool,
    pub is_sunny: bool,
}

/// Mirrors `TurnOrderBattler` (`turnOrder.ts:22-32`). `ability`/`hold_effect`
/// use `ABILITY_NONE`/`HOLD_EFFECT_NONE` (0, from `damage_calc.rs`) to mean
/// "unset", mirroring the TS `string | null | undefined` fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TurnOrderBattler {
    pub speed: u32,
    pub speed_stage: u8,
    /// The chosen move's priority bracket (`gBattleMoves[move].priority`),
    /// 0 for most moves.
    pub move_priority: i32,
    pub is_paralyzed: bool,
    /// `ABILITY_SWIFT_SWIM`/`ABILITY_CHLOROPHYLL` — structurally present,
    /// needs a weather flag to matter.
    pub ability: u16,
    pub hold_effect: u16,
    pub hold_effect_param: u32,
}

/// `GetWhoStrikesFirst`'s effective-speed computation for one battler
/// (`battle_main.c:4605-4650` half of the pairwise function — the two
/// battlers' halves are identical code, factored here instead of
/// duplicated).
#[must_use]
pub fn effective_speed(
    battler: &TurnOrderBattler,
    weather: WeatherState,
    random_turn_number: u16,
) -> u32 {
    let swift_boost = (battler.ability == ABILITY_SWIFT_SWIM && weather.is_raining)
        || (battler.ability == ABILITY_CHLOROPHYLL && weather.is_sunny);
    let speed_multiplier: i32 = if swift_boost { 2 } else { 1 };

    let (num, den) = STAT_STAGE_RATIOS[battler.speed_stage as usize];
    let mut speed: i32 = (battler.speed as i32 * speed_multiplier * num) / den;

    if battler.hold_effect == HOLD_EFFECT_MACHO_BRACE {
        speed /= 2;
    }
    if battler.is_paralyzed {
        speed /= 4;
    }
    if battler.hold_effect == HOLD_EFFECT_QUICK_CLAW
        && u32::from(random_turn_number) < (0xffffu32 * battler.hold_effect_param) / 100
    {
        return UINT_MAX;
    }
    speed as u32
}

/// `0` = battler1 strikes first (no swap); `1` or `2` = battler2 strikes
/// first (swap) — see `SetActionsAndBattlersTurnOrder`'s `!= 0` check.
/// Mirrors `StrikesFirstResult` (`turnOrder.ts:70`).
pub type StrikesFirstResult = u8;

/// `GetWhoStrikesFirst` (`battle_main.c:4595-4754`). `speed_tie_rng_roll` is
/// the raw `Random()` u16 output consumed ONLY when both priority and
/// effective speed are exactly equal (`battle_main.c:4728/4745`,
/// `Random() & 1`) — pass any value when a tie is impossible, it won't be
/// read.
#[must_use]
pub fn get_who_strikes_first(
    battler1: &TurnOrderBattler,
    battler2: &TurnOrderBattler,
    speed_tie_rng_roll: u16,
    weather: WeatherState,
    random_turn_number: u16,
) -> StrikesFirstResult {
    let speed1 = effective_speed(battler1, weather, random_turn_number);
    let speed2 = effective_speed(battler2, weather, random_turn_number);

    let both_priority_zero = battler1.move_priority == 0 && battler2.move_priority == 0;
    let priority_equal = battler1.move_priority == battler2.move_priority;

    if !both_priority_zero && !priority_equal {
        return if battler1.move_priority < battler2.move_priority {
            1
        } else {
            0
        };
    }
    // Either both priorities are 0, or they're equal-but-nonzero — both take
    // the plain speed comparison (battle_main.c:4724-4731/4741-4748).
    if speed1 == speed2 && (speed_tie_rng_roll & 1) == 1 {
        return 2;
    }
    if speed1 < speed2 {
        return 1;
    }
    0
}

/// `SetActionsAndBattlersTurnOrder`'s pairwise bubble sort
/// (`battle_main.c:4830-4839`), generalized to N battlers all using
/// `B_ACTION_USE_MOVE` (no switch/item/run — battle 1 turn 1's case).
/// `speed_tie_rng_rolls` supplies one u16 per pairwise comparison, consumed
/// left-to-right; only comparisons that actually tie will read from it.
///
/// # Panics
/// Panics if `battler_ids` contains an id not present in `battlers`
/// (mirrors the TS's `battlers.get(...)!` non-null assertion).
#[must_use]
pub fn sort_battlers_by_turn_order(
    battler_ids: &[u32],
    battlers: &std::collections::HashMap<u32, TurnOrderBattler>,
    speed_tie_rng_rolls: &[u16],
    weather: WeatherState,
    random_turn_number: u16,
) -> Vec<u32> {
    let mut order: Vec<u32> = battler_ids.to_vec();
    let mut roll_index = 0usize;
    for i in 0..order.len().saturating_sub(1) {
        for j in (i + 1)..order.len() {
            let b1 = battlers.get(&order[i]).expect("unknown battler id");
            let b2 = battlers.get(&order[j]).expect("unknown battler id");
            let priority_brackets_tie = (b1.move_priority == 0 && b2.move_priority == 0)
                || b1.move_priority == b2.move_priority;
            let is_speed_tie = priority_brackets_tie
                && effective_speed(b1, weather, random_turn_number)
                    == effective_speed(b2, weather, random_turn_number);
            let roll = if is_speed_tie {
                let r = speed_tie_rng_rolls.get(roll_index).copied().unwrap_or(0);
                roll_index += 1;
                r
            } else {
                0
            };
            let result = get_who_strikes_first(b1, b2, roll, weather, random_turn_number);
            if result != 0 {
                order.swap(i, j);
            }
        }
    }
    order
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    const NEUTRAL_SPEED_STAGE: u8 = 6; // DEFAULT_STAT_STAGE (damage_calc.rs)

    fn battler(speed: u32, move_priority: i32) -> TurnOrderBattler {
        TurnOrderBattler {
            speed,
            speed_stage: NEUTRAL_SPEED_STAGE,
            move_priority,
            is_paralyzed: false,
            ability: 0,
            hold_effect: 0,
            hold_effect_param: 0,
        }
    }

    // --- Battle 1 turn 1 (RAM-pinned, real speeds, no tie) — mirrors
    // tests/turnOrder.test.ts's first describe block.

    #[test]
    fn turn1_grovyle_strikes_before_onix_both_priority_zero() {
        let onix = battler(76, 0);
        let grovyle = battler(90, 0);
        assert_eq!(
            get_who_strikes_first(&onix, &grovyle, 0, WeatherState::default(), 0xffff),
            1
        );
    }

    #[test]
    fn turn1_sort_reproduces_gbattler_by_turn_order() {
        let onix = battler(76, 0);
        let grovyle = battler(90, 0);
        let battlers = HashMap::from([(0, onix), (1, grovyle)]);
        assert_eq!(
            sort_battlers_by_turn_order(&[0, 1], &battlers, &[], WeatherState::default(), 0xffff),
            vec![1, 0]
        );
    }

    // --- Battle 1 turn 9 (RAM-pinned): QUICK_ATTACK's +1 priority.

    #[test]
    fn turn9_pidgeotto_priority_beats_onix() {
        let onix = battler(76, 0); // ROCK_SLIDE
        let pidgeotto = battler(77, 1); // QUICK_ATTACK
        assert_eq!(
            get_who_strikes_first(&onix, &pidgeotto, 0, WeatherState::default(), 0xffff),
            1
        );
    }

    #[test]
    fn turn9_priority_overrides_a_losing_speed_margin() {
        let fast_onix = battler(200, 0);
        let pidgeotto = battler(77, 1);
        assert_eq!(
            get_who_strikes_first(&fast_onix, &pidgeotto, 0, WeatherState::default(), 0xffff),
            1
        );
    }

    // --- Speed-tie Random()&1 tie-break (synthetic, unreachable in battle 1).

    #[test]
    fn speed_tie_even_roll_no_swap() {
        let a = battler(100, 0);
        let b = battler(100, 0);
        assert_eq!(
            get_who_strikes_first(&a, &b, 0, WeatherState::default(), 0xffff),
            0
        );
        assert_eq!(
            get_who_strikes_first(&a, &b, 0b10, WeatherState::default(), 0xffff),
            0
        );
    }

    #[test]
    fn speed_tie_odd_roll_swaps_via_coin_flip() {
        let a = battler(100, 0);
        let b = battler(100, 0);
        assert_eq!(
            get_who_strikes_first(&a, &b, 1, WeatherState::default(), 0xffff),
            2
        );
        assert_eq!(
            get_who_strikes_first(&a, &b, 0b11, WeatherState::default(), 0xffff),
            2
        );
    }

    #[test]
    fn priority_overrides_a_speed_tie() {
        let priority1 = battler(100, 1);
        let b = battler(100, 0);
        assert_eq!(
            get_who_strikes_first(&priority1, &b, 1, WeatherState::default(), 0xffff),
            0
        );
    }

    // --- Quick Claw stored turn random.

    fn quick_claw_battler(speed: u32, param: u32) -> TurnOrderBattler {
        TurnOrderBattler {
            hold_effect: HOLD_EFFECT_QUICK_CLAW,
            hold_effect_param: param,
            ..battler(speed, 0)
        }
    }

    #[test]
    fn quick_claw_exact_param_20_threshold() {
        let slow_holder = quick_claw_battler(45, 20);
        let fast_opponent = battler(95, 0);
        assert_eq!(
            get_who_strikes_first(
                &slow_holder,
                &fast_opponent,
                0,
                WeatherState::default(),
                13106
            ),
            0
        );
        assert_eq!(
            get_who_strikes_first(
                &slow_holder,
                &fast_opponent,
                0,
                WeatherState::default(),
                13107
            ),
            1
        );
    }

    #[test]
    fn quick_claw_keeps_priority_above_the_uint_max_sentinel() {
        let slow_holder = quick_claw_battler(45, 20);
        let fast_opponent_priority = battler(95, 1);
        assert_eq!(
            get_who_strikes_first(
                &slow_holder,
                &fast_opponent_priority,
                0,
                WeatherState::default(),
                0
            ),
            1
        );
    }

    #[test]
    fn quick_claw_both_holders_proc_falls_to_ordinary_tie_roll() {
        let slow_holder = quick_claw_battler(45, 20);
        let fast_holder = quick_claw_battler(95, 20);
        assert_eq!(
            get_who_strikes_first(&slow_holder, &fast_holder, 0, WeatherState::default(), 0),
            0
        );
        assert_eq!(
            get_who_strikes_first(&slow_holder, &fast_holder, 1, WeatherState::default(), 0),
            2
        );
    }

    #[test]
    fn quick_claw_zero_param_never_procs() {
        let holder = quick_claw_battler(10, 0);
        assert_eq!(effective_speed(&holder, WeatherState::default(), 0), 10);
    }

    // --- Swift Swim / Chlorophyll x weather.

    #[test]
    fn swift_swim_doubles_speed_in_rain() {
        let mut b = battler(50, 0);
        b.ability = ABILITY_SWIFT_SWIM;
        let rain = WeatherState { is_raining: true, is_sunny: false };
        assert_eq!(effective_speed(&b, rain, 0xffff), 100);
    }

    #[test]
    fn swift_swim_no_boost_without_rain() {
        let mut b = battler(50, 0);
        b.ability = ABILITY_SWIFT_SWIM;
        assert_eq!(effective_speed(&b, WeatherState::default(), 0xffff), 50);
    }

    #[test]
    fn chlorophyll_doubles_speed_in_sun() {
        let mut b = battler(50, 0);
        b.ability = ABILITY_CHLOROPHYLL;
        let sun = WeatherState { is_raining: false, is_sunny: true };
        assert_eq!(effective_speed(&b, sun, 0xffff), 100);
    }

    #[test]
    fn chlorophyll_no_boost_without_sun() {
        let mut b = battler(50, 0);
        b.ability = ABILITY_CHLOROPHYLL;
        assert_eq!(effective_speed(&b, WeatherState::default(), 0xffff), 50);
    }

    // --- Macho Brace / paralysis.

    #[test]
    fn macho_brace_halves_speed() {
        let mut b = battler(100, 0);
        b.hold_effect = HOLD_EFFECT_MACHO_BRACE;
        assert_eq!(effective_speed(&b, WeatherState::default(), 0xffff), 50);
    }

    #[test]
    fn paralysis_quarters_speed() {
        let mut b = battler(100, 0);
        b.is_paralyzed = true;
        assert_eq!(effective_speed(&b, WeatherState::default(), 0xffff), 25);
    }

    #[test]
    fn macho_brace_and_paralysis_stack_in_source_order() {
        let mut b = battler(100, 0);
        b.hold_effect = HOLD_EFFECT_MACHO_BRACE;
        b.is_paralyzed = true;
        // trunc(trunc(100/2)/4) == 12.
        assert_eq!(effective_speed(&b, WeatherState::default(), 0xffff), 12);
    }

    // --- sort with 3/4 battlers, multi-tie roll consumption order.

    #[test]
    fn sort_three_battlers_with_a_tie_consumes_one_roll() {
        // battlers 0 and 1 tie at speed 100; battler 2 is faster (150).
        // Comparison order (i,j) over positions in `order`, left to right:
        //   (0,1): ids 0,1 tie (speed100==speed100) -> consumes rolls[0]=1
        //     (odd -> swap) -> order becomes [1,0,2].
        //   (0,2): ids 1,2 (speed100 vs speed150) -> no tie, roll not
        //     consumed, id1 slower -> swap -> order becomes [2,0,1].
        //   (1,2): ids 0,1 (speed100 vs speed100) -> tie again, but rolls
        //     is exhausted so the missing roll defaults to 0 (even -> no
        //     swap) -> order stays [2,0,1].
        // Only ONE roll is present in speedTieRngRolls, matching the
        // "consumes one roll" case name: the second tie falls back to the
        // TS `?? 0` default, exactly like a real roll of 0.
        let battlers = HashMap::from([
            (0, battler(100, 0)),
            (1, battler(100, 0)),
            (2, battler(150, 0)),
        ]);
        let order = sort_battlers_by_turn_order(
            &[0, 1, 2],
            &battlers,
            &[1],
            WeatherState::default(),
            0xffff,
        );
        assert_eq!(order, vec![2, 0, 1]);
    }

    #[test]
    fn sort_four_battlers_multi_tie_consumes_rolls_left_to_right() {
        // All four tie at speed 100 -> every pairwise comparison (6 total)
        // consumes one roll, left to right, i=0..3,j=i+1..4.
        let battlers = HashMap::from([
            (0, battler(100, 0)),
            (1, battler(100, 0)),
            (2, battler(100, 0)),
            (3, battler(100, 0)),
        ]);
        // All rolls even (0) => no swaps ever -> stays [0,1,2,3].
        let order = sort_battlers_by_turn_order(
            &[0, 1, 2, 3],
            &battlers,
            &[0, 0, 0, 0, 0, 0],
            WeatherState::default(),
            0xffff,
        );
        assert_eq!(order, vec![0, 1, 2, 3]);
    }
}
