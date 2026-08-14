//! Immutable observed-fact overlays from `src/engine/battleScriptAiReveal.ts`.
//!
//! The canonical helpers receive the full `BattleScriptRulesContext`, but read
//! and replace only these two source-shaped `MAX_BATTLERS_COUNT` arrays. This
//! native leaf deliberately models no other rules fields: activation owners
//! remain responsible for choosing the successful reveal branch and calling
//! one of these pure functions.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`: Battle Script reveal arrays always have four
/// slots (`battleScriptAiReveal.ts` via `BattleScriptBattlerId`).
pub const BATTLE_SCRIPT_AI_REVEAL_BATTLER_COUNT: usize = 4;

/// The fixed `0 | 1 | 2 | 3` battler parameter accepted by the TypeScript
/// reveal helpers. A typed value keeps invalid array indexes outside the
/// native pure API.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptAiRevealBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain, retained for reusable slot iteration.
pub const BATTLE_SCRIPT_AI_REVEAL_BATTLERS: [BattleScriptAiRevealBattler;
    BATTLE_SCRIPT_AI_REVEAL_BATTLER_COUNT] = [
    BattleScriptAiRevealBattler::Battler0,
    BattleScriptAiRevealBattler::Battler1,
    BattleScriptAiRevealBattler::Battler2,
    BattleScriptAiRevealBattler::Battler3,
];

impl BattleScriptAiRevealBattler {
    /// Zero-based source array index for this battler.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

/// A byte outside `BattleScriptBattlerId`'s fixed four-slot domain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAiRevealBattlerError {
    pub value: u8,
}

impl fmt::Display for BattleScriptAiRevealBattlerError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "Battle Script AI reveal battler must be in 0..=3, got {}",
            self.value
        )
    }
}

impl std::error::Error for BattleScriptAiRevealBattlerError {}

impl TryFrom<u8> for BattleScriptAiRevealBattler {
    type Error = BattleScriptAiRevealBattlerError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Battler0),
            1 => Ok(Self::Battler1),
            2 => Ok(Self::Battler2),
            3 => Ok(Self::Battler3),
            _ => Err(BattleScriptAiRevealBattlerError { value }),
        }
    }
}

/// The complete narrow native projection of the two context fields read by
/// `recordBattleScriptAbilityReveal` and
/// `recordBattleScriptItemEffectReveal`.
///
/// Each source cell is constructed as a u8 by `createMoveEndArray` in
/// `battleScriptRulesContext.ts`; retaining `[u8; 4]` makes that bounded
/// storage explicit without re-modeling the full rules context.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct BattleScriptAiRevealRules {
    pub ai_observed_ability_ids: [u8; BATTLE_SCRIPT_AI_REVEAL_BATTLER_COUNT],
    pub ai_observed_item_effects: [u8; BATTLE_SCRIPT_AI_REVEAL_BATTLER_COUNT],
}

/// Native immutable-value twin of `recordBattleScriptAbilityReveal`.
///
/// When the selected observation already equals `ability`, source returns the
/// original frozen context. The equivalent native value is returned unchanged;
/// otherwise only the selected ability cell is copied and replaced.
#[must_use]
pub fn record_battle_script_ability_reveal(
    rules: &BattleScriptAiRevealRules,
    battler: BattleScriptAiRevealBattler,
    ability: u8,
) -> BattleScriptAiRevealRules {
    let index = battler.index();
    if rules.ai_observed_ability_ids[index] == ability {
        return *rules;
    }

    let mut next = *rules;
    next.ai_observed_ability_ids[index] = ability;
    next
}

/// Native immutable-value twin of `recordBattleScriptItemEffectReveal`.
///
/// The item-effect branch has the same source identity fast path as ability
/// reveals. On a change it updates exactly one item-effect cell, preserving
/// all ability observations and every other item-effect cell.
#[must_use]
pub fn record_battle_script_item_effect_reveal(
    rules: &BattleScriptAiRevealRules,
    battler: BattleScriptAiRevealBattler,
    item_effect: u8,
) -> BattleScriptAiRevealRules {
    let index = battler.index();
    if rules.ai_observed_item_effects[index] == item_effect {
        return *rules;
    }

    let mut next = *rules;
    next.ai_observed_item_effects[index] = item_effect;
    next
}
