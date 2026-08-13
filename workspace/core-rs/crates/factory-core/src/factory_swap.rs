//! Native-only pure Factory-swap state/mutation leaf.
//!
//! This ports the state-only boundaries in `src/engine/factorySwap.ts`:
//! initialization, presentation acknowledgement, VBlank cursor copying,
//! duplicate-species detection, the atomic accepted-swap copy, its live-exit
//! wrapper, and the presentation-to-round decision seam. Input/UI reducers
//! deliberately remain outside this module.

/// The source's fixed Factory party width.
pub const FACTORY_SWAP_PARTY_SIZE: usize = 3;
/// The source's six-record Factory rental roster width.
pub const FACTORY_SWAP_RENTAL_ROSTER_SIZE: usize = 6;

/// A validated Factory party position.  The TypeScript signatures use the
/// same `0 | 1 | 2` domain; keeping it typed means native callers cannot
/// accidentally index a four- or six-slot menu cursor as a party member.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapPartyIndex {
    Slot0 = 0,
    Slot1 = 1,
    Slot2 = 2,
}

impl FactorySwapPartyIndex {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    #[must_use]
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Slot0),
            1 => Some(Self::Slot1),
            2 => Some(Self::Slot2),
            _ => None,
        }
    }
}

/// Every source-visible swap phase.  The mutation leaf changes only
/// `Complete`/`AcceptExit`, but retaining all phases makes the returned state
/// a source-shaped persistent value and preserves irrelevant presentation
/// fields exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapPhase {
    PlayerPicker,
    PlayerOptions,
    SummaryFade,
    SummaryReturn,
    PlayerPickerReturn,
    EnemySwitch,
    PlayerSwitch,
    EnemyPicker,
    AcceptPrompt,
    AcceptReturn,
    AcceptExit,
    QuitPrompt,
    QuitReturn,
    QuitExit,
    DuplicateSpecies,
    DuplicateReturn,
    Complete,
}

impl FactorySwapPhase {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PlayerPicker => "playerPicker",
            Self::PlayerOptions => "playerOptions",
            Self::SummaryFade => "summaryFade",
            Self::SummaryReturn => "summaryReturn",
            Self::PlayerPickerReturn => "playerPickerReturn",
            Self::EnemySwitch => "enemySwitch",
            Self::PlayerSwitch => "playerSwitch",
            Self::EnemyPicker => "enemyPicker",
            Self::AcceptPrompt => "acceptPrompt",
            Self::AcceptReturn => "acceptReturn",
            Self::AcceptExit => "acceptExit",
            Self::QuitPrompt => "quitPrompt",
            Self::QuitReturn => "quitReturn",
            Self::QuitExit => "quitExit",
            Self::DuplicateSpecies => "duplicateSpecies",
            Self::DuplicateReturn => "duplicateReturn",
            Self::Complete => "complete",
        }
    }
}

/// The complete `BattleStatus` string union inherited by a swap party mon.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapBattleStatus {
    None,
    Sleep,
    Poison,
    Burn,
    Freeze,
    Paralysis,
    Toxic,
}

impl FactorySwapBattleStatus {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Sleep => "sleep",
            Self::Poison => "poison",
            Self::Burn => "burn",
            Self::Freeze => "freeze",
            Self::Paralysis => "paralysis",
            Self::Toxic => "toxic",
        }
    }
}

/// Narrow, complete mutable payload of a `FactorySwapMon`.  The copied enemy
/// record deliberately carries battle fields and its preexisting friendship;
/// the sole source-owned write resets that friendship to zero.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FactorySwapMon {
    pub id: String,
    pub species: String,
    pub max_hp: u32,
    pub hp: u32,
    pub status: FactorySwapBattleStatus,
    pub personality: u32,
    pub ability_num: u8,
    pub friendship: u8,
}

/// Persisted source `RentalMon` identity fields touched by `CopySwappedMonData`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryRentalMon {
    pub mon_id: u32,
    pub personality: u32,
    pub ivs: u32,
    pub ability_num: u8,
}

/// The only two source values permitted in `quitReturnPhase`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapQuitReturnPhase {
    PlayerPicker,
    EnemyPicker,
}

impl FactorySwapQuitReturnPhase {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PlayerPicker => "playerPicker",
            Self::EnemyPicker => "enemyPicker",
        }
    }
}

/// Source script-facing terminal result.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapResult {
    Accepted,
    KeptParty,
}

impl FactorySwapResult {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Accepted => "accepted",
            Self::KeptParty => "keptParty",
        }
    }
}

/// The smallest source-shaped state that all four boundaries clone, inspect,
/// or preserve.  Menu/presentation cells are intentionally data-only here:
/// input progression belongs to `handleFactorySwapInput`, which is not part
/// of this native mutation leaf.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FactorySwapState {
    pub phase: FactorySwapPhase,
    pub player_party: [FactorySwapMon; FACTORY_SWAP_PARTY_SIZE],
    pub enemy_party: [FactorySwapMon; FACTORY_SWAP_PARTY_SIZE],
    pub rental_mons: [FactoryRentalMon; FACTORY_SWAP_RENTAL_ROSTER_SIZE],
    pub cursor: u8,
    pub info_cursor: u8,
    pub display_cursor: u8,
    pub arrow_cursor: u8,
    pub cursor_copy_pending: bool,
    pub actions_count: u8,
    pub player_option_cursor: u8,
    pub player_option_display_cursor: u8,
    pub player_option_cursor_copy_pending: bool,
    pub yes_no_cursor: u8,
    pub player_mon_id: Option<FactorySwapPartyIndex>,
    pub enemy_mon_id: Option<FactorySwapPartyIndex>,
    pub quit_return_phase: Option<FactorySwapQuitReturnPhase>,
    pub player_switch_completed: bool,
    pub input_ready: bool,
    pub script_result: Option<bool>,
    pub mutation_committed: bool,
    pub result: Option<FactorySwapResult>,
}

/// Source `createFactorySwapState`.
///
/// All caller-owned records are cloned into a fresh persistent value, matching
/// the source's per-record spreads rather than retaining shared references.
#[must_use]
pub fn create_factory_swap_state(
    player_party: &[FactorySwapMon; FACTORY_SWAP_PARTY_SIZE],
    enemy_party: &[FactorySwapMon; FACTORY_SWAP_PARTY_SIZE],
    rental_mons: &[FactoryRentalMon; FACTORY_SWAP_RENTAL_ROSTER_SIZE],
) -> FactorySwapState {
    FactorySwapState {
        phase: FactorySwapPhase::PlayerPicker,
        player_party: player_party.clone(),
        enemy_party: enemy_party.clone(),
        rental_mons: *rental_mons,
        cursor: 0,
        info_cursor: 0,
        display_cursor: 0,
        arrow_cursor: 0,
        cursor_copy_pending: false,
        actions_count: 4,
        player_option_cursor: 0,
        player_option_display_cursor: 0,
        player_option_cursor_copy_pending: false,
        yes_no_cursor: 0,
        player_mon_id: None,
        enemy_mon_id: None,
        quit_return_phase: None,
        player_switch_completed: false,
        input_ready: false,
        script_result: None,
        mutation_committed: false,
        result: None,
    }
}

/// Source `acknowledgeFactorySwapPresentation`.
///
/// Rust values have no observable object identity, so both source identity
/// branches are represented by a value-equal clone.
#[must_use]
pub fn acknowledge_factory_swap_presentation(state: &FactorySwapState) -> FactorySwapState {
    if state.phase == FactorySwapPhase::Complete || state.input_ready {
        return state.clone();
    }
    let mut next = state.clone();
    next.input_ready = true;
    next
}

/// Source `copyFactorySwapCursor`, called at the VBlank copy boundary.
///
/// Each output is derived from the old state, preserving the source's cursor
/// pipeline: info follows the logical cursor, display follows on a later copy,
/// and the arrow follows the old display cursor one copy after that. Pending
/// flags suppress their corresponding display copy once and are always clear
/// in the returned state.
#[must_use]
pub fn copy_factory_swap_cursor(state: &FactorySwapState) -> FactorySwapState {
    let info_cursor = state.cursor;
    let display_cursor = if state.cursor_copy_pending || state.display_cursor == state.cursor {
        state.display_cursor
    } else {
        state.cursor
    };
    let arrow_cursor = if state.arrow_cursor == state.display_cursor {
        state.arrow_cursor
    } else {
        state.display_cursor
    };
    let player_option_display_cursor = if state.player_option_cursor_copy_pending
        || state.player_option_display_cursor == state.player_option_cursor
    {
        state.player_option_display_cursor
    } else {
        state.player_option_cursor
    };

    if info_cursor == state.info_cursor
        && display_cursor == state.display_cursor
        && arrow_cursor == state.arrow_cursor
        && !state.cursor_copy_pending
        && player_option_display_cursor == state.player_option_display_cursor
        && !state.player_option_cursor_copy_pending
    {
        return state.clone();
    }

    let mut next = state.clone();
    next.info_cursor = info_cursor;
    next.display_cursor = display_cursor;
    next.arrow_cursor = arrow_cursor;
    next.cursor_copy_pending = false;
    next.player_option_display_cursor = player_option_display_cursor;
    next.player_option_cursor_copy_pending = false;
    next
}

/// Rust's typed/result boundary for the only source throw plus the one
/// invalid default-cursor state that the TypeScript static union normally
/// prevents from reaching `factorySwapAlreadyHasSpecies`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapError {
    AcceptedSwapRequiresBothSelectedPartyIndexes,
    EnemyCursorDoesNotIdentifyPartyMon { cursor: u8 },
}

impl core::fmt::Display for FactorySwapError {
    fn fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::AcceptedSwapRequiresBothSelectedPartyIndexes => {
                formatter.write_str("accepted Factory swap requires both selected party indexes")
            }
            Self::EnemyCursorDoesNotIdentifyPartyMon { cursor } => write!(
                formatter,
                "Factory swap enemy cursor {cursor} does not identify a party mon"
            ),
        }
    }
}

impl std::error::Error for FactorySwapError {}

/// Source `factorySwapAlreadyHasSpecies`.
///
/// Passing `None` selects the source default (`state.cursor`).  A non-party
/// cursor is not representable in TypeScript's declared parameter union; the
/// native API reports it explicitly instead of indexing out of bounds.
pub fn factory_swap_already_has_species(
    state: &FactorySwapState,
    enemy_mon_id: Option<FactorySwapPartyIndex>,
) -> Result<bool, FactorySwapError> {
    let Some(player_mon_id) = state.player_mon_id else {
        return Ok(false);
    };
    let enemy_mon_id = match enemy_mon_id {
        Some(enemy_mon_id) => enemy_mon_id,
        None => FactorySwapPartyIndex::from_u8(state.cursor)
            .ok_or(FactorySwapError::EnemyCursorDoesNotIdentifyPartyMon { cursor: state.cursor })?,
    };
    let species = &state.enemy_party[enemy_mon_id.index()].species;
    Ok(state
        .player_party
        .iter()
        .enumerate()
        .any(|(index, mon)| index != player_mon_id.index() && mon.species == *species))
}

/// Source `applyFactorySwapMutation`.
///
/// The source clones the selected enemy party record, explicitly resets its
/// friendship, replaces the selected player party row, then rebuilds the
/// selected player rental identity from enemy roster row `enemy + 3`.
pub fn apply_factory_swap_mutation(
    state: &FactorySwapState,
) -> Result<FactorySwapState, FactorySwapError> {
    let (Some(player_mon_id), Some(enemy_mon_id)) = (state.player_mon_id, state.enemy_mon_id)
    else {
        return Err(FactorySwapError::AcceptedSwapRequiresBothSelectedPartyIndexes);
    };

    let mut next = state.clone();
    let mut replacement = state.enemy_party[enemy_mon_id.index()].clone();
    replacement.friendship = 0;
    next.player_party[player_mon_id.index()] = replacement.clone();

    let offered = state.rental_mons[enemy_mon_id.index() + FACTORY_SWAP_PARTY_SIZE];
    next.rental_mons[player_mon_id.index()] = FactoryRentalMon {
        mon_id: offered.mon_id,
        ivs: offered.ivs,
        personality: replacement.personality,
        ability_num: replacement.ability_num,
    };
    next.phase = FactorySwapPhase::Complete;
    next.input_ready = false;
    next.mutation_committed = true;
    next.result = Some(FactorySwapResult::Accepted);
    Ok(next)
}

/// Source `commitFactorySwapMutation`: the same atomic copy as
/// [`apply_factory_swap_mutation`], while retaining the live `acceptExit`
/// presentation phase until its callback handoff completes.
pub fn commit_factory_swap_mutation(
    state: &FactorySwapState,
) -> Result<FactorySwapState, FactorySwapError> {
    let mut committed = apply_factory_swap_mutation(state)?;
    committed.phase = FactorySwapPhase::AcceptExit;
    Ok(committed)
}

/// Presentation-to-round result exposed by source `factorySwapRoundDecision`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapRoundDecision {
    Accept {
        player_party_index: FactorySwapPartyIndex,
        opponent_party_index: FactorySwapPartyIndex,
    },
    Decline,
}

/// Source `factorySwapRoundDecision`.
///
/// An accepted mutation is actionable already during `acceptExit`; a decline
/// becomes actionable only after the later `complete` handoff.
#[must_use]
pub fn factory_swap_round_decision(state: &FactorySwapState) -> Option<FactorySwapRoundDecision> {
    if state.phase == FactorySwapPhase::Complete
        && state.result == Some(FactorySwapResult::KeptParty)
    {
        return Some(FactorySwapRoundDecision::Decline);
    }
    if !state.mutation_committed
        || state.result != Some(FactorySwapResult::Accepted)
        || state.player_mon_id.is_none()
        || state.enemy_mon_id.is_none()
    {
        return None;
    }
    Some(FactorySwapRoundDecision::Accept {
        player_party_index: state.player_mon_id.expect("checked above"),
        opponent_party_index: state.enemy_mon_id.expect("checked above"),
    })
}

#[cfg(test)]
mod tests {
    use super::{
        apply_factory_swap_mutation, commit_factory_swap_mutation,
        factory_swap_already_has_species, factory_swap_round_decision, FactoryRentalMon,
        FactorySwapBattleStatus, FactorySwapError, FactorySwapMon, FactorySwapPartyIndex,
        FactorySwapPhase, FactorySwapResult, FactorySwapRoundDecision, FactorySwapState,
    };

    fn mon(
        id: &str,
        species: &str,
        personality: u32,
        ability_num: u8,
        friendship: u8,
    ) -> FactorySwapMon {
        FactorySwapMon {
            id: id.to_owned(),
            species: species.to_owned(),
            max_hp: 100,
            hp: 70,
            status: FactorySwapBattleStatus::None,
            personality,
            ability_num,
            friendship,
        }
    }

    fn state() -> FactorySwapState {
        FactorySwapState {
            phase: FactorySwapPhase::AcceptPrompt,
            player_party: [
                mon("player-0", "SPECIES_TREECKO", 10, 0, 70),
                mon("player-1", "SPECIES_TORCHIC", 11, 1, 71),
                mon("player-2", "SPECIES_MUDKIP", 12, 0, 72),
            ],
            enemy_party: [
                mon("enemy-0", "SPECIES_RALTS", 20, 1, 255),
                mon("enemy-1", "SPECIES_SLUGMA", 21, 0, 255),
                mon("enemy-2", "SPECIES_SWABLU", 22, 1, 255),
            ],
            rental_mons: [
                FactoryRentalMon { mon_id: 100, personality: 1, ivs: 2, ability_num: 0 },
                FactoryRentalMon { mon_id: 101, personality: 3, ivs: 4, ability_num: 1 },
                FactoryRentalMon { mon_id: 102, personality: 5, ivs: 6, ability_num: 0 },
                FactoryRentalMon { mon_id: 200, personality: 7, ivs: 8, ability_num: 1 },
                FactoryRentalMon { mon_id: 201, personality: 9, ivs: 10, ability_num: 0 },
                FactoryRentalMon { mon_id: 202, personality: 11, ivs: 12, ability_num: 1 },
            ],
            cursor: 0,
            info_cursor: 1,
            display_cursor: 2,
            arrow_cursor: 3,
            cursor_copy_pending: true,
            actions_count: 5,
            player_option_cursor: 2,
            player_option_display_cursor: 1,
            player_option_cursor_copy_pending: true,
            yes_no_cursor: 1,
            player_mon_id: Some(FactorySwapPartyIndex::Slot1),
            enemy_mon_id: Some(FactorySwapPartyIndex::Slot2),
            quit_return_phase: None,
            player_switch_completed: true,
            input_ready: true,
            script_result: Some(false),
            mutation_committed: false,
            result: None,
        }
    }

    #[test]
    fn mutation_changes_only_the_source_owned_copy_cells() {
        let before = state();
        let after = apply_factory_swap_mutation(&before).unwrap();
        assert_eq!(after.phase, FactorySwapPhase::Complete);
        assert_eq!(after.player_party[1].id, "enemy-2");
        assert_eq!(after.player_party[1].friendship, 0);
        assert_eq!(after.rental_mons[1].mon_id, before.rental_mons[5].mon_id);
        assert_eq!(after.rental_mons[1].ivs, before.rental_mons[5].ivs);
        assert_eq!(
            after.rental_mons[1].personality,
            before.enemy_party[2].personality
        );
        assert_eq!(
            after.rental_mons[1].ability_num,
            before.enemy_party[2].ability_num
        );
        assert_eq!(after.player_party[0], before.player_party[0]);
        assert_eq!(after.player_party[2], before.player_party[2]);
        assert_eq!(after.enemy_party, before.enemy_party);
        assert_eq!(after.rental_mons[0], before.rental_mons[0]);
        assert_eq!(after.rental_mons[2], before.rental_mons[2]);
        assert_eq!(after.rental_mons[3..], before.rental_mons[3..]);
        assert_eq!(after.info_cursor, before.info_cursor);
        assert_eq!(after.display_cursor, before.display_cursor);
        assert_eq!(after.arrow_cursor, before.arrow_cursor);
        assert!(!after.input_ready);
        assert!(after.mutation_committed);
        assert_eq!(after.result, Some(FactorySwapResult::Accepted));
    }

    #[test]
    fn typed_error_distinguishes_missing_selection_from_invalid_default_cursor() {
        let mut missing = state();
        missing.player_mon_id = None;
        assert_eq!(
            apply_factory_swap_mutation(&missing),
            Err(FactorySwapError::AcceptedSwapRequiresBothSelectedPartyIndexes)
        );

        let mut cursor = state();
        cursor.cursor = 4;
        assert_eq!(
            factory_swap_already_has_species(&cursor, None),
            Err(FactorySwapError::EnemyCursorDoesNotIdentifyPartyMon { cursor: 4 })
        );
    }

    #[test]
    fn accept_is_available_during_exit_but_decline_waits_for_complete() {
        let committed = commit_factory_swap_mutation(&state()).unwrap();
        assert_eq!(
            factory_swap_round_decision(&committed),
            Some(FactorySwapRoundDecision::Accept {
                player_party_index: FactorySwapPartyIndex::Slot1,
                opponent_party_index: FactorySwapPartyIndex::Slot2,
            })
        );

        let mut decline = state();
        decline.phase = FactorySwapPhase::AcceptExit;
        decline.result = Some(FactorySwapResult::KeptParty);
        assert_eq!(factory_swap_round_decision(&decline), None);
        decline.phase = FactorySwapPhase::Complete;
        assert_eq!(
            factory_swap_round_decision(&decline),
            Some(FactorySwapRoundDecision::Decline)
        );
    }
}
