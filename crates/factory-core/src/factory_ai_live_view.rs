//! Narrow live-rule projections used by the Factory AI view.
//!
//! This is deliberately **not** `createFactoryAiViewFromLiveRules`: it ports
//! only that canonical helper's `currentWeather` and `statStages` leaves from
//! `src/engine/factoryAiLiveDriver.ts:257-274`.  View construction, history,
//! decision selection, WASM packets, and adapters remain separate milestones.

/// `BattlePokemon::statStages[NUM_BATTLE_STATS]` has eight cells.
///
/// Source: `src/engine/battleScriptRulesContext.ts:340-341`, citing
/// `reference/pokeemerald/include/battle.h`'s `NUM_BATTLE_STATS` layout.
pub const FACTORY_AI_LIVE_VIEW_STAT_STAGE_COUNT: usize = 8;

/// `B_WEATHER_*` masks from `reference/pokeemerald/include/constants/battle.h:232-243`,
/// reproduced by the canonical live driver at lines 65-68.
const B_WEATHER_RAIN: i32 = 0x07;
const B_WEATHER_SANDSTORM: i32 = 0x18;
const B_WEATHER_SUN: i32 = 0x60;
const B_WEATHER_HAIL: i32 = 0x80;

/// The `AI_WEATHER_*` encoding, rather than `gBattleWeather`'s raw bit
/// encoding.  Source: `src/engine/factoryAiCheckBadMove.ts:138-152`, citing
/// `include/constants/battle_ai.h:27-30`.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiWeather {
    Sun = 0,
    Rain = 1,
    Sandstorm = 2,
    Hail = 3,
}

impl FactoryAiWeather {
    #[must_use]
    pub const fn ai_weather_value(self) -> u8 {
        self as u8
    }
}

/// The only battler field read by the native `stat_stages` projection.
///
/// Cells remain `f64` because the TypeScript helper reads unvalidated
/// JavaScript `number` cells directly.  Normal rules-context construction
/// narrows them to source `s8` values, but this narrow leaf must not silently
/// introduce a different numeric coercion for a direct caller.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FactoryAiLiveViewBattler {
    pub stat_stages: [f64; FACTORY_AI_LIVE_VIEW_STAT_STAGE_COUNT],
}

/// The exact property order and source-slot mapping of canonical
/// `statStages(battler)` (`factoryAiLiveDriver.ts:265-274`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FactoryAiStatStages {
    pub atk: f64,
    pub def: f64,
    pub speed: f64,
    pub sp_atk: f64,
    pub sp_def: f64,
    pub acc: f64,
    pub evasion: f64,
}

/// Canonical `currentWeather(weather)`.
///
/// The TypeScript `&` operator applies ECMAScript `ToInt32` to its number
/// operand before masking.  `weather` is normally the u32 context field, but
/// its static type is `number`; preserving that coercion makes direct native
/// callers match the canonical helper for fractional, non-finite, negative,
/// and wider-number inputs too.  The order is intentionally Sun, Rain,
/// Sandstorm, Hail, matching the four sequential TS `if`s.
#[must_use]
pub fn current_weather(weather: f64) -> Option<FactoryAiWeather> {
    let weather = js_to_int32(weather);
    if weather & B_WEATHER_SUN != 0 {
        Some(FactoryAiWeather::Sun)
    } else if weather & B_WEATHER_RAIN != 0 {
        Some(FactoryAiWeather::Rain)
    } else if weather & B_WEATHER_SANDSTORM != 0 {
        Some(FactoryAiWeather::Sandstorm)
    } else if weather & B_WEATHER_HAIL != 0 {
        Some(FactoryAiWeather::Hail)
    } else {
        None
    }
}

/// Canonical `statStages(battler)`: slot zero is HP and is intentionally
/// omitted; the seven returned fields retain the TS helper's order exactly.
#[must_use]
pub const fn stat_stages(battler: &FactoryAiLiveViewBattler) -> FactoryAiStatStages {
    FactoryAiStatStages {
        atk: battler.stat_stages[1],
        def: battler.stat_stages[2],
        speed: battler.stat_stages[3],
        sp_atk: battler.stat_stages[4],
        sp_def: battler.stat_stages[5],
        acc: battler.stat_stages[6],
        evasion: battler.stat_stages[7],
    }
}

/// ECMAScript `ToInt32` for an already-number-valued Rust input.
///
/// `f64::rem_euclid(2^32)` is exact for the power-of-two modulus of every
/// finite IEEE-754 integer represented by the input; after that reduction the
/// conversion is within `u32` range.  This mirrors the operation JavaScript
/// performs before every bitwise `&` in the canonical helper.
fn js_to_int32(value: f64) -> i32 {
    if !value.is_finite() || value == 0.0 {
        return 0;
    }
    let uint32 = value.trunc().rem_euclid(4_294_967_296.0) as u32;
    uint32 as i32
}

#[cfg(test)]
mod tests {
    use super::{current_weather, stat_stages, FactoryAiLiveViewBattler, FactoryAiWeather};

    #[test]
    fn weather_keeps_canonical_precedence_and_javascript_to_int32() {
        assert_eq!(
            current_weather((0x07 | 0x18 | 0x80) as f64),
            Some(FactoryAiWeather::Rain)
        );
        assert_eq!(
            current_weather((0x07 | 0x18 | 0x60 | 0x80) as f64),
            Some(FactoryAiWeather::Sun)
        );
        assert_eq!(
            current_weather(4_294_967_296.0 + 0x80 as f64),
            Some(FactoryAiWeather::Hail)
        );
        assert_eq!(current_weather(f64::NAN), None);
    }

    #[test]
    fn stages_omit_hp_and_keep_the_live_driver_slot_order() {
        let stages = stat_stages(&FactoryAiLiveViewBattler {
            stat_stages: [99.0, 11.0, 22.0, 33.0, 44.0, 55.0, 66.0, 77.0],
        });
        assert_eq!(stages.atk, 11.0);
        assert_eq!(stages.def, 22.0);
        assert_eq!(stages.speed, 33.0);
        assert_eq!(stages.sp_atk, 44.0);
        assert_eq!(stages.sp_def, 55.0);
        assert_eq!(stages.acc, 66.0);
        assert_eq!(stages.evasion, 77.0);
    }
}
