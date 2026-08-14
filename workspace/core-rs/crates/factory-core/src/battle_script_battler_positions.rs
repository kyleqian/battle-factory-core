//! Singles `GetBattlerAtPosition` resolver from
//! `src/engine/battleScriptBattlerPositions.ts`.
//!
//! The TypeScript seam carries the cited source behavior directly:
//! `GetBattlerAtPosition(u8 position)` in
//! `reference/pokeemerald/src/battle_anim_mons.c:859-869` scans
//! `gBattlerPositions`; the Factory's singles map makes
//! `B_POSITION_PLAYER_LEFT` (`reference/pokeemerald/include/constants/battle.h:28`)
//! battler 0 and `B_POSITION_OPPONENT_LEFT`
//! (`reference/pokeemerald/include/constants/battle.h:29`) battler 1.
//!
//! `BS_ATTACKER` is intentionally a raw expression spelling here, not an
//! attacker-role lookup. `Cmd_trainerslidein`
//! (`reference/pokeemerald/src/battle_script_commands.c:5301-5308`) passes its
//! byte directly to `GetBattlerAtPosition`, while `BS_ATTACKER`
//! (`reference/pokeemerald/include/constants/battle_script_commands.h:305`) is
//! the same byte value (1) as `B_POSITION_OPPONENT_LEFT`.

/// The complete `BattleScriptBattlersCount` TypeScript domain. The source
/// context validates this as exactly `2 | 4`; retaining that finite type keeps
/// impossible counts outside this native pure leaf.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptBattlersCount {
    Singles = 2,
    Doubles = 4,
}

/// Canonical typed-reachable `battleTopology.battlersCount` values.
pub const BATTLE_SCRIPT_BATTLERS_COUNT_DOMAIN: [BattleScriptBattlersCount; 2] = [
    BattleScriptBattlersCount::Singles,
    BattleScriptBattlersCount::Doubles,
];

impl BattleScriptBattlersCount {
    /// Source `gBattlersCount` scalar representation.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// The only `BattleScriptBattlerId` values this singles-position resolver can
/// return. They retain the source array ids rather than inventing a distinct
/// display-side coordinate system.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptBattlerId {
    PlayerLeft = 0,
    OpponentLeft = 1,
}

impl BattleScriptBattlerId {
    /// Source battler-array index.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Native twin of TypeScript `resolveSingleBattlePosition`.
///
/// The raw string match deliberately preserves the source byte collision:
/// `BS_ATTACKER` resolves to the opponent-left position (battler 1), regardless
/// of an action's attacker role. Unknown expressions stay `None`. The final
/// count comparison is retained exactly even though both typed-reachable count
/// values admit the two left-side positions.
#[must_use]
pub fn resolve_single_battle_position(
    battlers_count: BattleScriptBattlersCount,
    expression: &str,
) -> Option<BattleScriptBattlerId> {
    let position = match expression {
        "B_POSITION_PLAYER_LEFT" => BattleScriptBattlerId::PlayerLeft,
        "B_POSITION_OPPONENT_LEFT" | "BS_ATTACKER" => BattleScriptBattlerId::OpponentLeft,
        _ => return None,
    };

    (position.as_u8() < battlers_count.as_u8()).then_some(position)
}
