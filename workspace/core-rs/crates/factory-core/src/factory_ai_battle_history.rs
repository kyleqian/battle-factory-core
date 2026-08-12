//! Pure Factory AI battle-history leaf from `factoryAiLiveDriver.ts`.
//!
//! This deliberately accepts only the live fields its TypeScript twin reads:
//! the four current party indexes, target's last move, and four observed
//! ability/item overlays.  It does not construct a Factory AI view, choose a
//! decision, own a clock, or cross the WASM boundary; those are separate
//! milestones.  The narrow input keeps that future adapter honest while this
//! source-shaped history remains independently testable.

use crate::gen_tables::ability_name_by_id;

/// `MAX_BATTLERS_COUNT` for the Factory driver's fixed four battle slots.
pub const FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT: usize = 4;
/// `MOVE_NONE` (`factoryAiLiveDriver.ts:70`).
pub const FACTORY_AI_MOVE_NONE: f64 = 0.0;

/// A typed fixed-slot equivalent of the TS leaf's `0 | 1 | 2 | 3` battler
/// parameter.  Invalid indexes cannot reach the pure native API.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiBattleHistoryBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl FactoryAiBattleHistoryBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

const HISTORY_BATTLERS: [FactoryAiBattleHistoryBattler; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT] = [
    FactoryAiBattleHistoryBattler::Battler0,
    FactoryAiBattleHistoryBattler::Battler1,
    FactoryAiBattleHistoryBattler::Battler2,
    FactoryAiBattleHistoryBattler::Battler3,
];

/// The smallest live-rule projection needed by the battle-history leaf.
///
/// The canonical TS context uses JavaScript `number`s without this leaf
/// validating them, so native numeric cells stay `f64`: callers can retain
/// arbitrary historical values without accidental narrowing.  `sync` uses
/// JS-equivalent comparisons where source behavior makes that observable
/// (`Array.prototype.includes` uses SameValueZero for `NaN`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FactoryAiBattleHistoryLiveInput {
    pub party_indexes: [f64; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT],
    pub target_last_move: f64,
    pub observed_ability_ids: [f64; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT],
    pub observed_item_effects: [f64; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT],
}

/// Immutable-by-convention state returned by every TS history helper.  Rust
/// returns a newly cloned value for the two record functions and `sync`, so
/// callers get the same persistent-history ergonomics without shared mutable
/// aliases.  Fields are public for source-faithful staged tests: the TS type
/// permits arbitrary `number`/`string` history payloads and does not validate
/// existing history before updating it.
#[derive(Debug, Clone, PartialEq)]
pub struct FactoryAiBattleHistory {
    pub used_moves: [Vec<f64>; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT],
    pub known_abilities: [Option<String>; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT],
    pub known_item_effects: [f64; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT],
    pub party_indexes: [f64; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT],
}

/// The only source-owned error in this leaf: the TS `ABILITY_NAME_BY_ID` map
/// did not contain a nonzero observed ability id.
#[derive(Debug, Clone, PartialEq)]
pub enum FactoryAiBattleHistoryError {
    UnknownAbilityId { ability_id: f64 },
}

impl core::fmt::Display for FactoryAiBattleHistoryError {
    fn fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::UnknownAbilityId { ability_id } => write!(
                formatter,
                "Factory AI live view: unknown ability id {}",
                js_number_to_string(*ability_id)
            ),
        }
    }
}

impl std::error::Error for FactoryAiBattleHistoryError {}

/// `createFactoryAiBattleHistory`.  Only party membership is meaningful at
/// creation; all known facts and used-move rows begin empty.
#[must_use]
pub fn create_factory_ai_battle_history(
    input: &FactoryAiBattleHistoryLiveInput,
) -> FactoryAiBattleHistory {
    FactoryAiBattleHistory {
        used_moves: core::array::from_fn(|_| Vec::new()),
        known_abilities: core::array::from_fn(|_| None),
        known_item_effects: [0.0; FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT],
        party_indexes: input.party_indexes,
    }
}

/// Semantic twin of source `RecordAbilityBattle`.
#[must_use]
pub fn record_factory_ai_known_ability(
    history: &FactoryAiBattleHistory,
    battler: FactoryAiBattleHistoryBattler,
    ability: impl Into<String>,
) -> FactoryAiBattleHistory {
    let mut next = history.clone();
    next.known_abilities[battler.index()] = Some(ability.into());
    next
}

/// Semantic twin of source `RecordItemEffectBattle`.
#[must_use]
pub fn record_factory_ai_known_item_effect(
    history: &FactoryAiBattleHistory,
    battler: FactoryAiBattleHistoryBattler,
    item_effect: f64,
) -> FactoryAiBattleHistory {
    let mut next = history.clone();
    next.known_item_effects[battler.index()] = item_effect;
    next
}

/// Applies the source clear-on-party-change rule, then
/// `RecordLastUsedMoveByTarget` for the player target in Factory singles.
///
/// `SwitchInClearSetData` / `FaintClearSetData` clear moves and abilities but
/// do not call `ClearBattlerItemEffectHistory`, so item-effect history is
/// deliberately retained across every party change.
pub fn sync_factory_ai_battle_history(
    history: &FactoryAiBattleHistory,
    input: &FactoryAiBattleHistoryLiveInput,
) -> Result<FactoryAiBattleHistory, FactoryAiBattleHistoryError> {
    let mut synced = history.clone();
    synced.party_indexes = input.party_indexes;

    for battler in HISTORY_BATTLERS {
        let index = battler.index();
        // TS's `!==` means NaN is never equal to itself, exactly as Rust's
        // ordinary f64 `!=` does here.
        if input.party_indexes[index] != history.party_indexes[index] {
            synced.used_moves[index].clear();
            synced.known_abilities[index] = None;
        }
    }

    let target_moves = &mut synced.used_moves[FactoryAiBattleHistoryBattler::Battler0.index()];
    if input.target_last_move != FACTORY_AI_MOVE_NONE
        && !target_moves
            .iter()
            .any(|move_id| same_value_zero(*move_id, input.target_last_move))
        && target_moves.len() < FACTORY_AI_BATTLE_HISTORY_BATTLER_COUNT
    {
        target_moves.push(input.target_last_move);
    }

    for battler in HISTORY_BATTLERS {
        let index = battler.index();
        let ability_id = input.observed_ability_ids[index];
        if ability_id != 0.0 {
            let ability = ability_name_by_id(ability_id)
                .ok_or(FactoryAiBattleHistoryError::UnknownAbilityId { ability_id })?;
            synced = record_factory_ai_known_ability(&synced, battler, ability);
        }

        let item_effect = input.observed_item_effects[index];
        if item_effect != 0.0 {
            synced = record_factory_ai_known_item_effect(&synced, battler, item_effect);
        }
    }

    Ok(synced)
}

/// JavaScript `Array.prototype.includes` compares number values using
/// SameValueZero, unlike Rust's default `f64` equality only for `NaN`.
fn same_value_zero(left: f64, right: f64) -> bool {
    left == right || (left.is_nan() && right.is_nan())
}

/// The source's unknown-id throw interpolates a JavaScript Number.  Real live
/// ability ids are u8 values, but preserving the common non-finite/fractional
/// typed-call forms keeps this leaf's named error useful without introducing a
/// JavaScript runtime dependency.
fn js_number_to_string(value: f64) -> String {
    if value.is_nan() {
        return String::from("NaN");
    }
    if value == f64::INFINITY {
        return String::from("Infinity");
    }
    if value == f64::NEG_INFINITY {
        return String::from("-Infinity");
    }
    if value == 0.0 {
        return String::from("0");
    }
    if value.fract() == 0.0 && value.abs() < 1e21 {
        return format!("{value:.0}");
    }

    let rendered = value.to_string();
    if let Some((mantissa, exponent)) = rendered.split_once('e') {
        let exponent = if exponent.starts_with(['+', '-']) {
            exponent.to_owned()
        } else {
            format!("+{exponent}")
        };
        return format!("{mantissa}e{exponent}");
    }
    rendered
}

#[cfg(test)]
mod tests {
    use super::{
        create_factory_ai_battle_history, record_factory_ai_known_ability,
        record_factory_ai_known_item_effect, sync_factory_ai_battle_history,
        FactoryAiBattleHistoryBattler, FactoryAiBattleHistoryError,
        FactoryAiBattleHistoryLiveInput,
    };

    fn live_input() -> FactoryAiBattleHistoryLiveInput {
        FactoryAiBattleHistoryLiveInput {
            party_indexes: [0.0, 1.0, 2.0, 3.0],
            target_last_move: 0.0,
            observed_ability_ids: [0.0; 4],
            observed_item_effects: [0.0; 4],
        }
    }

    #[test]
    fn create_keeps_only_party_membership() {
        let history = create_factory_ai_battle_history(&live_input());
        assert_eq!(history.used_moves, [vec![], vec![], vec![], vec![]]);
        assert_eq!(history.known_abilities, [None, None, None, None]);
        assert_eq!(history.known_item_effects, [0.0; 4]);
        assert_eq!(history.party_indexes, [0.0, 1.0, 2.0, 3.0]);
    }

    #[test]
    fn record_helpers_return_new_history_and_cover_all_slots() {
        let history = create_factory_ai_battle_history(&live_input());
        let history = record_factory_ai_known_ability(
            &history,
            FactoryAiBattleHistoryBattler::Battler3,
            "ABILITY_CUSTOM",
        );
        let history = record_factory_ai_known_item_effect(
            &history,
            FactoryAiBattleHistoryBattler::Battler2,
            -9.5,
        );
        assert_eq!(
            history.known_abilities[3].as_deref(),
            Some("ABILITY_CUSTOM")
        );
        assert_eq!(history.known_item_effects[2], -9.5);
    }

    #[test]
    fn sync_deduplicates_caps_and_retains_items_when_any_slot_changes_party() {
        let mut input = live_input();
        let mut history = create_factory_ai_battle_history(&input);
        for move_id in [70.0, 89.0, 33.0, 57.0, 85.0] {
            input.target_last_move = move_id;
            history = sync_factory_ai_battle_history(&history, &input).unwrap();
        }
        input.target_last_move = 89.0;
        input.party_indexes[2] = 9.0;
        input.observed_item_effects[2] = 29.0;
        let history = sync_factory_ai_battle_history(&history, &input).unwrap();
        assert_eq!(history.used_moves[0], vec![70.0, 89.0, 33.0, 57.0]);
        assert_eq!(history.known_item_effects[2], 29.0);

        input.party_indexes[2] = 10.0;
        input.observed_item_effects[2] = 0.0;
        let switched = sync_factory_ai_battle_history(&history, &input).unwrap();
        assert_eq!(switched.used_moves[2], Vec::<f64>::new());
        assert_eq!(switched.known_abilities[2], None);
        assert_eq!(switched.known_item_effects[2], 29.0);
    }

    #[test]
    fn sync_resolves_exact_source_symbols_and_unknown_error_text() {
        let mut input = live_input();
        input.observed_ability_ids = [9.0, 77.0, 0.0, 69.0];
        let history =
            sync_factory_ai_battle_history(&create_factory_ai_battle_history(&input), &input)
                .unwrap();
        assert_eq!(
            history.known_abilities[0].as_deref(),
            Some("ABILITY_STATIC")
        );
        assert_eq!(
            history.known_abilities[1].as_deref(),
            Some("ABILITY_AIR_LOCK")
        );
        assert_eq!(
            history.known_abilities[3].as_deref(),
            Some("ABILITY_ROCK_HEAD")
        );

        input.observed_ability_ids[1] = 78.0;
        assert_eq!(
            sync_factory_ai_battle_history(&history, &input).unwrap_err(),
            FactoryAiBattleHistoryError::UnknownAbilityId { ability_id: 78.0 }
        );
        assert_eq!(
            sync_factory_ai_battle_history(&history, &input)
                .unwrap_err()
                .to_string(),
            "Factory AI live view: unknown ability id 78"
        );
    }

    #[test]
    fn sync_uses_same_value_zero_for_nan_move_history() {
        let mut input = live_input();
        input.target_last_move = f64::NAN;
        let history =
            sync_factory_ai_battle_history(&create_factory_ai_battle_history(&input), &input)
                .unwrap();
        let next = sync_factory_ai_battle_history(&history, &input).unwrap();
        assert_eq!(next.used_moves[0].len(), 1);
        assert!(next.used_moves[0][0].is_nan());
    }
}
