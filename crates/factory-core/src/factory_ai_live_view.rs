//! Source-shaped Factory AI live-view construction.
//!
//! This module ports `createFactoryAiViewFromLiveRules` from
//! `src/engine/factoryAiLiveDriver.ts`.  Its source-facing
//! [`FactoryAiScoredView`] deliberately retains JavaScript `number` cells,
//! canonical ability symbol strings, and presence-vs-absence for optional
//! properties.  That is distinct from the older compressed numeric
//! `factory_ai_decision_policy::FactoryAiScoredView`, which is an internal
//! scoring input and remains the future M8e boundary's concern.

use crate::factory_ai_battle_history::{FactoryAiBattleHistory, FactoryAiBattleHistoryError};
use crate::gen_tables::ability_name_by_id;

/// `BattlePokemon::statStages[NUM_BATTLE_STATS]` has eight cells.
///
/// Source: `src/engine/battleScriptRulesContext.ts:340-341`, citing
/// `reference/pokeemerald/include/battle.h`'s `NUM_BATTLE_STATS` layout.
pub const FACTORY_AI_LIVE_VIEW_STAT_STAGE_COUNT: usize = 8;

/// `MAX_BATTLERS_COUNT` for the rules context's fixed battle slots.
pub const FACTORY_AI_LIVE_VIEW_BATTLER_COUNT: usize = 4;

/// `B_WEATHER_*` masks from `reference/pokeemerald/include/constants/battle.h:232-243`,
/// reproduced by the canonical live driver at lines 65-68.
const B_WEATHER_RAIN: i32 = 0x07;
const B_WEATHER_SANDSTORM: i32 = 0x18;
const B_WEATHER_SUN: i32 = 0x60;
const B_WEATHER_HAIL: i32 = 0x80;

// `factoryAiLiveDriver.ts:59-68`, each citing the corresponding source
// declaration in `reference/pokeemerald/include/constants/battle.h`.
const SIDE_STATUS_REFLECT: i32 = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN: i32 = 1 << 1;
const SIDE_STATUS_SPIKES: i32 = 1 << 4;
const SIDE_STATUS_SAFEGUARD: i32 = 1 << 5;
const SIDE_STATUS_FUTUREATTACK: i32 = 1 << 6;

// `battleScriptSourceConstants.ts:25-64,95-116,153`, sourced from
// `reference/pokeemerald/include/constants/battle.h`.
const STATUS1_SLEEP: i32 = 0x0000_0007;
const STATUS1_TOXIC_POISON: i32 = 1 << 7;
const STATUS1_REFRESH_CURE_MASK: i32 = (1 << 3) | (1 << 4) | (1 << 6) | (1 << 7);
const STATUS2_CONFUSION: i32 = 0x0000_0007;
const STATUS2_INFATUATION: i32 = 0x000f_0000;
const STATUS2_FOCUS_ENERGY: i32 = 1 << 20;
const STATUS2_SUBSTITUTE: i32 = 1 << 24;
const STATUS2_ESCAPE_PREVENTION: i32 = 1 << 26;
const STATUS2_NIGHTMARE: i32 = 1 << 27;
const STATUS2_CURSED: i32 = 1 << 28;
const STATUS2_FORESIGHT: i32 = 1 << 29;
const STATUS2_TORMENT: i32 = i32::MIN;
const STATUS3_LEECHSEED: i32 = 1 << 2;
const STATUS3_PERISH_SONG: i32 = 1 << 5;
const STATUS3_ROOTED: i32 = 1 << 10;
const STATUS3_YAWN: i32 = (1 << 11) | (1 << 12);

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

/// The complete property-read set of one `BattleScriptRulesContext` battler
/// for `createFactoryAiViewFromLiveRules`.
///
/// The TypeScript constructor performs no validation or narrowing before it
/// copies most of these `number` cells into its output.  They therefore stay
/// `f64` here, rather than pretending that a direct native caller can only
/// provide source-width values.  Mask reads retain JavaScript's `ToInt32`
/// semantics below; unmasked reads retain their exact input value.
#[derive(Debug, Clone, PartialEq)]
pub struct FactoryAiLiveRulesBattler {
    pub types: [String; 2],
    pub attack: f64,
    pub defense: f64,
    pub sp_attack: f64,
    pub sp_defense: f64,
    pub speed: f64,
    pub level: f64,
    pub stat_stages: [f64; FACTORY_AI_LIVE_VIEW_STAT_STAGE_COUNT],
    pub is_first_turn: f64,
    pub hp: f64,
    pub max_hp: f64,
    pub ability: f64,
    pub status1: f64,
    pub status2: f64,
    pub status3: f64,
    pub protect_uses: f64,
    pub taunt_timer: f64,
    pub species: f64,
    pub moves: [f64; 4],
}

/// The narrow rules-context projection read by the canonical live-view
/// constructor.  Slots zero and one are target and trainer AI respectively;
/// the other two slots remain present because the real context has exactly
/// four battlers, even though this Factory singles constructor does not read
/// them.
#[derive(Debug, Clone, PartialEq)]
pub struct FactoryAiLiveRulesContext {
    pub battlers: [FactoryAiLiveRulesBattler; FACTORY_AI_LIVE_VIEW_BATTLER_COUNT],
    pub weather: f64,
    pub side_statuses: [f64; 2],
    pub last_moves: [f64; FACTORY_AI_LIVE_VIEW_BATTLER_COUNT],
}

/// The three challenge-policy fields read by the canonical constructor.
/// `None` is the source `undefined` form of `battleTurnCount`, which uses the
/// `?? 0` default.  `Some(f64::NAN)` and other Number values are intentionally
/// not coerced because JavaScript's nullish coalescing retains them.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FactoryAiChallengePolicy {
    pub factory_win_streak: f64,
    pub trainer_opponent_id: f64,
    pub battle_turn_count: Option<f64>,
}

/// Borrowed input to [`create_factory_ai_view_from_live_rules`].  The M8a
/// history object is reused directly, including its arbitrary historical
/// strings and unvalidated numeric cells.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FactoryAiLiveViewInput<'a> {
    pub rules_context: &'a FactoryAiLiveRulesContext,
    pub history: &'a FactoryAiBattleHistory,
    pub challenge: FactoryAiChallengePolicy,
}

/// The fixed `active` sub-object of a Factory scored view.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiScoredViewActive {
    pub ai_battler: u8,
    pub target_battler: u8,
}

/// The source-shaped `factory` sub-object.  Its two policy values are fixed
/// by `FACTORY_LEVEL_MODE_50` / `FACTORY_BATTLE_MODE_SINGLES` in
/// `factoryAiLiveDriver.ts:284-289`; challenge numbers retain the raw Number
/// values supplied by the caller.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FactoryAiScoredViewFactory {
    pub level_mode: u8,
    pub battle_mode: u8,
    pub factory_win_streak: f64,
    pub trainer_opponent_id: f64,
}

/// The exact attacker object emitted by the TypeScript constructor.
///
/// `Option<bool>` distinguishes an absent optional property from the only
/// emitted optional boolean value, `true`.  In contrast, fields that the
/// canonical object writes unconditionally stay plain `bool` even when they
/// evaluate false.
#[derive(Debug, Clone, PartialEq)]
pub struct FactoryAiScoredBattlerView {
    pub types: [String; 2],
    pub attack: f64,
    pub defense: f64,
    pub sp_attack: f64,
    pub sp_defense: f64,
    pub speed: f64,
    pub level: f64,
    pub stat_stages: FactoryAiStatStages,
    pub is_first_turn: f64,
    pub hp: f64,
    pub max_hp: f64,
    pub ability: String,
    pub battle_turn_count: f64,
    pub light_screen_up: bool,
    pub reflect_up: bool,
    pub current_weather: Option<FactoryAiWeather>,
    pub is_rooted: bool,
    pub attacker_future_attack_up: Option<bool>,
    pub is_infatuated: Option<bool>,
    pub safeguard_up: Option<bool>,
    pub is_asleep: Option<bool>,
    pub has_curable_status: Option<bool>,
    pub has_substitute: Option<bool>,
    pub has_focus_energy: Option<bool>,
    pub is_leech_seeded: Option<bool>,
    pub has_yawn: Option<bool>,
    pub protect_uses: Option<f64>,
}

/// The exact target object emitted by the TypeScript constructor.  It stays
/// flat (rather than nesting a common battler struct) so its Rust surface
/// follows the canonical JS object shape and property order one-for-one.
#[derive(Debug, Clone, PartialEq)]
pub struct FactoryAiScoredTargetView {
    pub species: f64,
    pub types: [String; 2],
    pub attack: f64,
    pub defense: f64,
    pub sp_attack: f64,
    pub sp_defense: f64,
    pub speed: f64,
    pub level: f64,
    pub stat_stages: FactoryAiStatStages,
    pub is_first_turn: f64,
    pub hp: f64,
    pub max_hp: f64,
    pub last_used_move_id: f64,
    pub has_any_status: Option<bool>,
    pub is_asleep: Option<bool>,
    pub is_toxic_poisoned: bool,
    pub is_leech_seeded: bool,
    pub is_cursed: bool,
    pub is_confused: Option<bool>,
    pub is_taunted: Option<bool>,
    pub is_infatuated: Option<bool>,
    pub is_escape_prevented: Option<bool>,
    pub is_tormented: Option<bool>,
    pub is_nightmared: Option<bool>,
    pub is_foresighted: Option<bool>,
    pub has_yawn: Option<bool>,
    pub has_perish_song: Option<bool>,
    pub ability: String,
    /// Required-but-nullable `knownAbility`, unlike the optional spread
    /// fields above.  It is copied directly from M8a history and therefore
    /// may contain a noncanonical string without causing a constructor error.
    pub known_ability: Option<String>,
    /// Required `knownItemEffect`, copied directly from M8a history.
    pub known_item_effect: f64,
    pub known_move_ids: Option<Vec<f64>>,
    pub safeguard_up: Option<bool>,
    pub spikes_up: Option<bool>,
    pub target_future_attack_up: Option<bool>,
}

/// Source-faithful native result of
/// `createFactoryAiViewFromLiveRules`.
///
/// This intentionally shares the canonical TypeScript name but lives in
/// `factory_ai_live_view`; the already-landed numeric scoring struct lives in
/// `factory_ai_decision_policy` and is not a lossless representation of this
/// constructor's public surface.
#[derive(Debug, Clone, PartialEq)]
pub struct FactoryAiScoredView {
    pub schema: &'static str,
    pub mode: &'static str,
    pub active: FactoryAiScoredViewActive,
    pub factory: FactoryAiScoredViewFactory,
    pub moves: [f64; 4],
    pub attacker: FactoryAiScoredBattlerView,
    pub target: FactoryAiScoredTargetView,
}

/// The constructor has exactly the source's ability-name failure behavior.
/// Reusing M8a's error type preserves the canonical interpolation text for
/// integer, fractional, non-finite, and signed-zero `number` inputs.
pub type FactoryAiLiveViewError = FactoryAiBattleHistoryError;

/// Complete native port of `createFactoryAiViewFromLiveRules`
/// (`factoryAiLiveDriver.ts:277-411`).
///
/// The construction order deliberately resolves the attacker's live ability
/// before the target's, just as the canonical nested object literal does.
/// Every status and side-condition test uses JavaScript bitwise coercion,
/// while copied live/history/challenge values remain untouched.
pub fn create_factory_ai_view_from_live_rules(
    input: FactoryAiLiveViewInput<'_>,
) -> Result<FactoryAiScoredView, FactoryAiLiveViewError> {
    let attacker = &input.rules_context.battlers[1];
    let target = &input.rules_context.battlers[0];
    let weather = current_weather(input.rules_context.weather);

    let attacker_ability = resolve_ability_name(attacker.ability)?;
    let target_ability = resolve_ability_name(target.ability)?;

    Ok(FactoryAiScoredView {
        schema: "factory-ai-scored-view/v1",
        mode: "factory-level-50-singles",
        active: FactoryAiScoredViewActive { ai_battler: 1, target_battler: 0 },
        factory: FactoryAiScoredViewFactory {
            // FACTORY_LEVEL_MODE_50 / FACTORY_BATTLE_MODE_SINGLES, from
            // `reference/pokeemerald/include/constants/battle_frontier.h`
            // through `factoryAiMaskSelection.ts`.
            level_mode: 0,
            battle_mode: 0,
            factory_win_streak: input.challenge.factory_win_streak,
            trainer_opponent_id: input.challenge.trainer_opponent_id,
        },
        moves: attacker.moves,
        attacker: FactoryAiScoredBattlerView {
            types: attacker.types.clone(),
            attack: attacker.attack,
            defense: attacker.defense,
            sp_attack: attacker.sp_attack,
            sp_defense: attacker.sp_defense,
            speed: attacker.speed,
            level: attacker.level,
            stat_stages: stat_stages(&FactoryAiLiveViewBattler {
                stat_stages: attacker.stat_stages,
            }),
            is_first_turn: attacker.is_first_turn,
            hp: attacker.hp,
            max_hp: attacker.max_hp,
            ability: attacker_ability,
            battle_turn_count: input.challenge.battle_turn_count.unwrap_or(0.0),
            light_screen_up: has_mask(
                input.rules_context.side_statuses[1],
                SIDE_STATUS_LIGHTSCREEN,
            ),
            reflect_up: has_mask(input.rules_context.side_statuses[1], SIDE_STATUS_REFLECT),
            current_weather: weather,
            is_rooted: has_mask(attacker.status3, STATUS3_ROOTED),
            attacker_future_attack_up: present_if(has_mask(
                input.rules_context.side_statuses[1],
                SIDE_STATUS_FUTUREATTACK,
            )),
            is_infatuated: present_if(has_mask(attacker.status2, STATUS2_INFATUATION)),
            safeguard_up: present_if(has_mask(
                input.rules_context.side_statuses[1],
                SIDE_STATUS_SAFEGUARD,
            )),
            is_asleep: present_if(has_mask(attacker.status1, STATUS1_SLEEP)),
            has_curable_status: present_if(has_mask(attacker.status1, STATUS1_REFRESH_CURE_MASK)),
            has_substitute: present_if(has_mask(attacker.status2, STATUS2_SUBSTITUTE)),
            has_focus_energy: present_if(has_mask(attacker.status2, STATUS2_FOCUS_ENERGY)),
            is_leech_seeded: present_if(has_mask(attacker.status3, STATUS3_LEECHSEED)),
            has_yawn: present_if(has_mask(attacker.status3, STATUS3_YAWN)),
            protect_uses: nonzero_option(attacker.protect_uses),
        },
        target: FactoryAiScoredTargetView {
            species: target.species,
            types: target.types.clone(),
            attack: target.attack,
            defense: target.defense,
            sp_attack: target.sp_attack,
            sp_defense: target.sp_defense,
            speed: target.speed,
            level: target.level,
            stat_stages: stat_stages(&FactoryAiLiveViewBattler { stat_stages: target.stat_stages }),
            is_first_turn: target.is_first_turn,
            hp: target.hp,
            max_hp: target.max_hp,
            last_used_move_id: input.rules_context.last_moves[0],
            has_any_status: present_if(target.status1 != 0.0),
            is_asleep: present_if(has_mask(target.status1, STATUS1_SLEEP)),
            is_toxic_poisoned: has_mask(target.status1, STATUS1_TOXIC_POISON),
            is_leech_seeded: has_mask(target.status3, STATUS3_LEECHSEED),
            is_cursed: has_mask(target.status2, STATUS2_CURSED),
            is_confused: present_if(has_mask(target.status2, STATUS2_CONFUSION)),
            is_taunted: present_if(target.taunt_timer != 0.0),
            is_infatuated: present_if(has_mask(target.status2, STATUS2_INFATUATION)),
            is_escape_prevented: present_if(has_mask(target.status2, STATUS2_ESCAPE_PREVENTION)),
            is_tormented: present_if(has_mask(target.status2, STATUS2_TORMENT)),
            is_nightmared: present_if(has_mask(target.status2, STATUS2_NIGHTMARE)),
            is_foresighted: present_if(has_mask(target.status2, STATUS2_FORESIGHT)),
            has_yawn: present_if(has_mask(target.status3, STATUS3_YAWN)),
            has_perish_song: present_if(has_mask(target.status3, STATUS3_PERISH_SONG)),
            ability: target_ability,
            known_ability: input.history.known_abilities[0].clone(),
            known_item_effect: input.history.known_item_effects[0],
            known_move_ids: (!input.history.used_moves[0].is_empty())
                .then(|| input.history.used_moves[0].clone()),
            safeguard_up: present_if(has_mask(
                input.rules_context.side_statuses[0],
                SIDE_STATUS_SAFEGUARD,
            )),
            spikes_up: present_if(has_mask(
                input.rules_context.side_statuses[0],
                SIDE_STATUS_SPIKES,
            )),
            target_future_attack_up: present_if(has_mask(
                input.rules_context.side_statuses[0],
                SIDE_STATUS_FUTUREATTACK,
            )),
        },
    })
}

fn resolve_ability_name(ability_id: f64) -> Result<String, FactoryAiLiveViewError> {
    ability_name_by_id(ability_id)
        .map(str::to_owned)
        .ok_or(FactoryAiBattleHistoryError::UnknownAbilityId { ability_id })
}

fn has_mask(value: f64, mask: i32) -> bool {
    js_to_int32(value) & mask != 0
}

fn present_if(value: bool) -> Option<bool> {
    value.then_some(true)
}

fn nonzero_option(value: f64) -> Option<f64> {
    (value != 0.0).then_some(value)
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
    use super::{
        create_factory_ai_view_from_live_rules, current_weather, stat_stages,
        FactoryAiChallengePolicy, FactoryAiLiveRulesBattler, FactoryAiLiveRulesContext,
        FactoryAiLiveViewBattler, FactoryAiLiveViewInput, FactoryAiWeather,
    };
    use crate::factory_ai_battle_history::{FactoryAiBattleHistory, FactoryAiBattleHistoryError};

    fn battler() -> FactoryAiLiveRulesBattler {
        FactoryAiLiveRulesBattler {
            types: [String::from("TYPE_NORMAL"), String::from("TYPE_NORMAL")],
            attack: 100.0,
            defense: 100.0,
            sp_attack: 100.0,
            sp_defense: 100.0,
            speed: 100.0,
            level: 50.0,
            stat_stages: [0.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0],
            is_first_turn: 0.0,
            hp: 100.0,
            max_hp: 100.0,
            ability: 0.0,
            status1: 0.0,
            status2: 0.0,
            status3: 0.0,
            protect_uses: 0.0,
            taunt_timer: 0.0,
            species: 1.0,
            moves: [33.0, 0.0, 0.0, 0.0],
        }
    }

    fn history() -> FactoryAiBattleHistory {
        FactoryAiBattleHistory {
            used_moves: core::array::from_fn(|_| Vec::new()),
            known_abilities: core::array::from_fn(|_| None),
            known_item_effects: [0.0; 4],
            party_indexes: [0.0, 1.0, 2.0, 3.0],
        }
    }

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

    #[test]
    fn constructor_keeps_unconditional_false_fields_and_optional_true_fields_distinct() {
        let mut target = battler();
        target.ability = 69.0;
        target.status1 = 0x80 as f64;
        target.status2 = (0x0000_0007 | (1 << 28)) as f64;
        target.status3 = (1 << 2) as f64;
        target.taunt_timer = 1.0;
        target.species = 105.0;

        let mut attacker = battler();
        attacker.ability = 70.0;
        attacker.status1 = (0x0000_0007 | 0xd8) as f64;
        attacker.status2 = (0x000f_0000 | (1 << 20) | (1 << 24)) as f64;
        attacker.status3 = ((1 << 2) | (1 << 10) | (1 << 11)) as f64;
        attacker.protect_uses = 2.0;

        let rules = FactoryAiLiveRulesContext {
            battlers: [target, attacker, battler(), battler()],
            weather: 0x60 as f64,
            side_statuses: [
                (1 << 4) | (1 << 5) | (1 << 6),
                (1 << 0) | (1 << 1) | (1 << 5) | (1 << 6),
            ]
            .map(f64::from),
            last_moves: [89.0, 0.0, 0.0, 0.0],
        };
        let mut history = history();
        history.used_moves[0] = vec![89.0];
        history.known_abilities[0] = Some(String::from("ABILITY_CUSTOM"));
        history.known_item_effects[0] = 44.0;

        let view = create_factory_ai_view_from_live_rules(FactoryAiLiveViewInput {
            rules_context: &rules,
            history: &history,
            challenge: FactoryAiChallengePolicy {
                factory_win_streak: 12.0,
                trainer_opponent_id: 41.0,
                battle_turn_count: Some(7.0),
            },
        })
        .unwrap();

        assert_eq!(view.schema, "factory-ai-scored-view/v1");
        assert_eq!(view.mode, "factory-level-50-singles");
        assert_eq!(view.active.ai_battler, 1);
        assert_eq!(view.active.target_battler, 0);
        assert_eq!(view.factory.factory_win_streak, 12.0);
        assert_eq!(view.moves, [33.0, 0.0, 0.0, 0.0]);
        assert_eq!(view.attacker.ability, "ABILITY_DROUGHT");
        assert!(view.attacker.light_screen_up);
        assert!(view.attacker.reflect_up);
        assert_eq!(view.attacker.current_weather, Some(FactoryAiWeather::Sun));
        assert!(view.attacker.is_rooted);
        assert_eq!(view.attacker.attacker_future_attack_up, Some(true));
        assert_eq!(view.attacker.is_infatuated, Some(true));
        assert_eq!(view.attacker.safeguard_up, Some(true));
        assert_eq!(view.attacker.is_asleep, Some(true));
        assert_eq!(view.attacker.has_curable_status, Some(true));
        assert_eq!(view.attacker.has_substitute, Some(true));
        assert_eq!(view.attacker.has_focus_energy, Some(true));
        assert_eq!(view.attacker.is_leech_seeded, Some(true));
        assert_eq!(view.attacker.protect_uses, Some(2.0));
        assert_eq!(view.target.ability, "ABILITY_ROCK_HEAD");
        assert_eq!(view.target.has_any_status, Some(true));
        assert_eq!(view.target.is_toxic_poisoned, true);
        assert_eq!(view.target.is_leech_seeded, true);
        assert_eq!(view.target.is_cursed, true);
        assert_eq!(view.target.is_confused, Some(true));
        assert_eq!(view.target.is_taunted, Some(true));
        assert_eq!(view.target.known_ability.as_deref(), Some("ABILITY_CUSTOM"));
        assert_eq!(view.target.known_item_effect, 44.0);
        assert_eq!(view.target.known_move_ids, Some(vec![89.0]));
        assert_eq!(view.target.safeguard_up, Some(true));
        assert_eq!(view.target.spikes_up, Some(true));
        assert_eq!(view.target.target_future_attack_up, Some(true));
    }

    #[test]
    fn constructor_keeps_canonical_attacker_before_target_unknown_ability_error() {
        let mut target = battler();
        target.ability = 78.0;
        let mut attacker = battler();
        attacker.ability = 1.5;
        let rules = FactoryAiLiveRulesContext {
            battlers: [target, attacker, battler(), battler()],
            weather: 0.0,
            side_statuses: [0.0, 0.0],
            last_moves: [0.0; 4],
        };
        let error = create_factory_ai_view_from_live_rules(FactoryAiLiveViewInput {
            rules_context: &rules,
            history: &history(),
            challenge: FactoryAiChallengePolicy {
                factory_win_streak: 0.0,
                trainer_opponent_id: 0.0,
                battle_turn_count: None,
            },
        })
        .unwrap_err();
        assert_eq!(
            error,
            FactoryAiBattleHistoryError::UnknownAbilityId { ability_id: 1.5 }
        );
        assert_eq!(
            error.to_string(),
            "Factory AI live view: unknown ability id 1.5"
        );
    }
}
