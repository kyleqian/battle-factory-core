//! Native-only pure Factory-swap state, mutation, and input reducer.
//!
//! This ports the state-only boundaries in `src/engine/factorySwap.ts`:
//! initialization, presentation acknowledgement, VBlank cursor copying,
//! duplicate-species detection, the atomic accepted-swap copy, its live-exit
//! wrapper, the presentation-to-round decision seam, and the complete
//! `handleFactorySwapInput` UI reducer.

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

/// The six discrete inputs accepted by source `handleFactorySwapInput`.
///
/// Keeping this as a closed native enum mirrors the canonical TypeScript
/// string union and makes it impossible for callers to inject an unrelated
/// controller button into this pure reducer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapInput {
    Left,
    Right,
    Up,
    Down,
    A,
    B,
}

impl FactorySwapInput {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Left => "LEFT",
            Self::Right => "RIGHT",
            Self::Up => "UP",
            Self::Down => "DOWN",
            Self::A => "A",
            Self::B => "B",
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

/// The smallest source-shaped state that the pure boundaries clone, inspect,
/// or preserve.
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
    if state.player_mon_id.is_none() {
        return Ok(false);
    }
    let enemy_mon_id = match enemy_mon_id {
        Some(enemy_mon_id) => enemy_mon_id,
        None => FactorySwapPartyIndex::from_u8(state.cursor)
            .ok_or(FactorySwapError::EnemyCursorDoesNotIdentifyPartyMon { cursor: state.cursor })?,
    };
    Ok(factory_swap_already_has_species_at(state, enemy_mon_id))
}

fn factory_swap_already_has_species_at(
    state: &FactorySwapState,
    enemy_mon_id: FactorySwapPartyIndex,
) -> bool {
    let Some(player_mon_id) = state.player_mon_id else {
        return false;
    };
    let species = &state.enemy_party[enemy_mon_id.index()].species;
    state
        .player_party
        .iter()
        .enumerate()
        .any(|(index, mon)| index != player_mon_id.index() && mon.species == *species)
}

fn move_action_left(value: u8, actions_count: u8) -> u8 {
    let actions_count = u16::from(actions_count);
    if actions_count == 0 {
        return value;
    }
    ((u16::from(value) + actions_count - 1) % actions_count) as u8
}

fn move_action_right(value: u8, actions_count: u8) -> u8 {
    let actions_count = u16::from(actions_count);
    if actions_count == 0 {
        return value;
    }
    ((u16::from(value) + 1) % actions_count) as u8
}

fn move_three_up(value: u8) -> u8 {
    ((u16::from(value) + 2) % 3) as u8
}

fn move_three_down(value: u8) -> u8 {
    ((u16::from(value) + 1) % 3) as u8
}

fn quit_prompt_from_picker(state: &FactorySwapState) -> FactorySwapState {
    let mut next = state.clone();
    next.phase = FactorySwapPhase::QuitPrompt;
    next.input_ready = false;
    next.yes_no_cursor = 0;
    next.quit_return_phase = Some(match state.phase {
        FactorySwapPhase::PlayerPicker => FactorySwapQuitReturnPhase::PlayerPicker,
        FactorySwapPhase::EnemyPicker => FactorySwapQuitReturnPhase::EnemyPicker,
        _ => unreachable!("only picker phases may open the quit prompt"),
    });
    next
}

/// Source `handleFactorySwapInput`.
///
/// This reducer only changes source-owned state for the current ready phase.
/// It deliberately derives every lag/pending field from the old state (the
/// separate VBlank copy boundary remains [`copy_factory_swap_cursor`]) and
/// keeps all presentation transition phases value-identical until their
/// presentation adapter advances them.
#[must_use]
pub fn handle_factory_swap_input(
    state: &FactorySwapState,
    input: FactorySwapInput,
) -> FactorySwapState {
    if !state.input_ready || state.phase == FactorySwapPhase::Complete {
        return state.clone();
    }

    match state.phase {
        FactorySwapPhase::PlayerPicker | FactorySwapPhase::EnemyPicker => {
            if matches!(
                input,
                FactorySwapInput::Left
                    | FactorySwapInput::Right
                    | FactorySwapInput::Up
                    | FactorySwapInput::Down
            ) {
                let cursor = match input {
                    FactorySwapInput::Left => move_action_left(state.cursor, state.actions_count),
                    FactorySwapInput::Right => move_action_right(state.cursor, state.actions_count),
                    FactorySwapInput::Down => {
                        if state.cursor < 3 {
                            3
                        } else {
                            move_action_right(state.cursor, state.actions_count)
                        }
                    }
                    FactorySwapInput::Up => {
                        if state.cursor < 3 {
                            state.actions_count.saturating_sub(1)
                        } else {
                            move_action_left(state.cursor, state.actions_count)
                        }
                    }
                    FactorySwapInput::A | FactorySwapInput::B => unreachable!("filtered above"),
                };
                let mut next = state.clone();
                next.cursor = cursor;
                next.cursor_copy_pending = true;
                return next;
            }
            if input == FactorySwapInput::B {
                return quit_prompt_from_picker(state);
            }

            debug_assert_eq!(input, FactorySwapInput::A);
            if (state.phase == FactorySwapPhase::PlayerPicker && state.cursor == 3)
                || (state.phase == FactorySwapPhase::EnemyPicker && state.cursor == 4)
            {
                return quit_prompt_from_picker(state);
            }
            if state.phase == FactorySwapPhase::EnemyPicker && state.cursor == 3 {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::PlayerSwitch;
                next.input_ready = false;
                return next;
            }
            if state.cursor >= 3 {
                return state.clone();
            }
            if state.phase == FactorySwapPhase::PlayerPicker {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::PlayerOptions;
                next.player_option_cursor = 0;
                next.player_option_display_cursor = 0;
                next.player_option_cursor_copy_pending = false;
                next.input_ready = false;
                return next;
            }

            let Some(enemy_mon_id) = FactorySwapPartyIndex::from_u8(state.cursor) else {
                return state.clone();
            };
            if factory_swap_already_has_species_at(state, enemy_mon_id) {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::DuplicateSpecies;
                next.input_ready = false;
                return next;
            }
            let mut next = state.clone();
            next.phase = FactorySwapPhase::AcceptPrompt;
            next.enemy_mon_id = Some(enemy_mon_id);
            next.yes_no_cursor = 0;
            next.input_ready = false;
            next
        }
        FactorySwapPhase::PlayerOptions => match input {
            FactorySwapInput::Up | FactorySwapInput::Down => {
                let mut next = state.clone();
                next.player_option_cursor = if input == FactorySwapInput::Up {
                    move_three_up(state.player_option_cursor)
                } else {
                    move_three_down(state.player_option_cursor)
                };
                next.player_option_cursor_copy_pending = true;
                next
            }
            FactorySwapInput::B => {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::PlayerPickerReturn;
                next.input_ready = false;
                next
            }
            FactorySwapInput::A if state.player_option_cursor == 2 => {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::PlayerPickerReturn;
                next.input_ready = false;
                next
            }
            FactorySwapInput::A if state.player_option_cursor == 0 => {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::SummaryFade;
                next.input_ready = false;
                next
            }
            FactorySwapInput::A => {
                let Some(player_mon_id) = FactorySwapPartyIndex::from_u8(state.cursor) else {
                    return state.clone();
                };
                let mut next = state.clone();
                next.phase = FactorySwapPhase::EnemySwitch;
                next.player_mon_id = Some(player_mon_id);
                next.cursor = 0;
                next.info_cursor = 0;
                next.display_cursor = 0;
                next.arrow_cursor = 0;
                next.cursor_copy_pending = false;
                next.input_ready = false;
                next
            }
            FactorySwapInput::Left | FactorySwapInput::Right => state.clone(),
        },
        FactorySwapPhase::SummaryFade
        | FactorySwapPhase::SummaryReturn
        | FactorySwapPhase::PlayerPickerReturn
        | FactorySwapPhase::EnemySwitch
        | FactorySwapPhase::PlayerSwitch
        | FactorySwapPhase::DuplicateReturn
        | FactorySwapPhase::AcceptReturn
        | FactorySwapPhase::AcceptExit
        | FactorySwapPhase::QuitReturn
        | FactorySwapPhase::QuitExit => state.clone(),
        FactorySwapPhase::AcceptPrompt => match input {
            FactorySwapInput::Up | FactorySwapInput::Down => {
                let mut next = state.clone();
                next.yes_no_cursor = if state.yes_no_cursor == 0 { 1 } else { 0 };
                next
            }
            FactorySwapInput::B => {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::AcceptReturn;
                next.input_ready = false;
                next
            }
            FactorySwapInput::A if state.yes_no_cursor == 1 => {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::AcceptReturn;
                next.input_ready = false;
                next
            }
            FactorySwapInput::A => {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::AcceptExit;
                next.input_ready = false;
                next
            }
            FactorySwapInput::Left | FactorySwapInput::Right => state.clone(),
        },
        FactorySwapPhase::QuitPrompt => match input {
            FactorySwapInput::Up | FactorySwapInput::Down => {
                let mut next = state.clone();
                next.yes_no_cursor = if state.yes_no_cursor == 0 { 1 } else { 0 };
                next
            }
            FactorySwapInput::A if state.yes_no_cursor == 0 => {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::QuitExit;
                next.input_ready = false;
                next
            }
            FactorySwapInput::A | FactorySwapInput::B => {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::QuitReturn;
                next.input_ready = false;
                next
            }
            FactorySwapInput::Left | FactorySwapInput::Right => state.clone(),
        },
        FactorySwapPhase::DuplicateSpecies => {
            if matches!(input, FactorySwapInput::A | FactorySwapInput::B) {
                let mut next = state.clone();
                next.phase = FactorySwapPhase::DuplicateReturn;
                next.input_ready = false;
                next
            } else {
                state.clone()
            }
        }
        FactorySwapPhase::Complete => state.clone(),
    }
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
        factory_swap_already_has_species, factory_swap_round_decision, handle_factory_swap_input,
        FactoryRentalMon, FactorySwapBattleStatus, FactorySwapError, FactorySwapInput,
        FactorySwapMon, FactorySwapPartyIndex, FactorySwapPhase, FactorySwapResult,
        FactorySwapRoundDecision, FactorySwapState,
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

    #[test]
    fn picker_actions_wrap_and_stage_only_the_old_state_cursor_copy_flag() {
        let mut player = state();
        player.phase = FactorySwapPhase::PlayerPicker;
        player.actions_count = 4;
        player.cursor = 0;
        player.info_cursor = 1;
        player.display_cursor = 2;
        player.arrow_cursor = 3;
        player.cursor_copy_pending = false;
        player.input_ready = true;

        let mut expected = player.clone();
        expected.cursor = 3;
        expected.cursor_copy_pending = true;
        assert_eq!(
            handle_factory_swap_input(&player, FactorySwapInput::Left),
            expected
        );

        player.cursor = 3;
        let mut expected = player.clone();
        expected.cursor = 0;
        expected.cursor_copy_pending = true;
        assert_eq!(
            handle_factory_swap_input(&player, FactorySwapInput::Right),
            expected
        );

        let mut enemy = player.clone();
        enemy.phase = FactorySwapPhase::EnemyPicker;
        enemy.actions_count = 5;
        enemy.cursor = 0;
        enemy.player_mon_id = Some(FactorySwapPartyIndex::Slot1);
        let mut expected = enemy.clone();
        expected.cursor = 4;
        expected.cursor_copy_pending = true;
        assert_eq!(
            handle_factory_swap_input(&enemy, FactorySwapInput::Up),
            expected
        );
    }

    #[test]
    fn player_option_routes_reset_exactly_the_source_owned_picker_cells() {
        let mut options = state();
        options.phase = FactorySwapPhase::PlayerOptions;
        options.actions_count = 4;
        options.cursor = 2;
        options.info_cursor = 1;
        options.display_cursor = 2;
        options.arrow_cursor = 3;
        options.cursor_copy_pending = true;
        options.input_ready = true;

        options.player_option_cursor = 0;
        let mut expected = options.clone();
        expected.phase = FactorySwapPhase::SummaryFade;
        expected.input_ready = false;
        assert_eq!(
            handle_factory_swap_input(&options, FactorySwapInput::A),
            expected
        );

        options.player_option_cursor = 1;
        let mut expected = options.clone();
        expected.phase = FactorySwapPhase::EnemySwitch;
        expected.player_mon_id = Some(FactorySwapPartyIndex::Slot2);
        expected.cursor = 0;
        expected.info_cursor = 0;
        expected.display_cursor = 0;
        expected.arrow_cursor = 0;
        expected.cursor_copy_pending = false;
        expected.input_ready = false;
        assert_eq!(
            handle_factory_swap_input(&options, FactorySwapInput::A),
            expected
        );

        options.player_option_cursor = 2;
        let mut expected = options.clone();
        expected.phase = FactorySwapPhase::PlayerPickerReturn;
        expected.input_ready = false;
        assert_eq!(
            handle_factory_swap_input(&options, FactorySwapInput::A),
            expected
        );
    }

    #[test]
    fn picker_duplicate_and_yes_no_routes_follow_selected_slot_exclusion() {
        let mut duplicate = state();
        duplicate.phase = FactorySwapPhase::EnemyPicker;
        duplicate.actions_count = 5;
        duplicate.cursor = 1;
        duplicate.player_mon_id = Some(FactorySwapPartyIndex::Slot0);
        duplicate.enemy_mon_id = None;
        duplicate.input_ready = true;
        duplicate.enemy_party[1].species = duplicate.player_party[2].species.clone();
        let mut expected = duplicate.clone();
        expected.phase = FactorySwapPhase::DuplicateSpecies;
        expected.input_ready = false;
        assert_eq!(
            handle_factory_swap_input(&duplicate, FactorySwapInput::A),
            expected
        );

        duplicate.player_mon_id = Some(FactorySwapPartyIndex::Slot1);
        duplicate.enemy_party[1].species = duplicate.player_party[1].species.clone();
        let mut expected = duplicate.clone();
        expected.phase = FactorySwapPhase::AcceptPrompt;
        expected.enemy_mon_id = Some(FactorySwapPartyIndex::Slot1);
        expected.yes_no_cursor = 0;
        expected.input_ready = false;
        assert_eq!(
            handle_factory_swap_input(&duplicate, FactorySwapInput::A),
            expected
        );

        let mut accept = state();
        accept.phase = FactorySwapPhase::AcceptPrompt;
        accept.yes_no_cursor = 0;
        accept.input_ready = true;
        let mut expected = accept.clone();
        expected.phase = FactorySwapPhase::AcceptExit;
        expected.input_ready = false;
        assert_eq!(
            handle_factory_swap_input(&accept, FactorySwapInput::A),
            expected
        );

        let mut quit = state();
        quit.phase = FactorySwapPhase::QuitPrompt;
        quit.yes_no_cursor = 1;
        quit.input_ready = true;
        let mut expected = quit.clone();
        expected.phase = FactorySwapPhase::QuitReturn;
        expected.input_ready = false;
        assert_eq!(
            handle_factory_swap_input(&quit, FactorySwapInput::A),
            expected
        );
    }
}
