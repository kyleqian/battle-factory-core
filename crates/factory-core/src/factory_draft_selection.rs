//! Presentation-free Battle Factory rental-draft selection helpers.
//!
//! This is the deliberately narrow pure leaf from
//! `src/engine/factoryDraftScreen.ts`: selection numbering, cursor wrapping,
//! and redraw-settle scheduling.  It owns neither draft-state construction,
//! rendering, ball animation, confirmation reveal, nor the controller reducer.
//!
//! ## Bounded controller domain
//!
//! The live TypeScript controller always supplies a six-cell `selectedIds`
//! array whose cells are pick ranks `0..=3`, a slot position in `0..=5`, a
//! menu position in `0..=2`, and a `selectingMonsState` in `1..=4`.  This
//! module intentionally models those stored source cells as `u8`s rather than
//! inventing validation or fallback behavior that the JavaScript helpers do
//! not have.  Its error-free native domain is exactly those bounds plus the
//! two source directions below.  Redraw inputs are either absent or carry the
//! controller-reachable pre-settle elapsed values documented on each state.
//!
//! The differential vectors additionally include the sparse `rank 1` /
//! `selectingMonsState 3` tuple with no rank-2 peer.  It is within the stored
//! cell bounds but is not formed by the reducer; it pins the canonical
//! `findIndex(...) === -1` branch without widening the helper's domain.

/// `FRONTIER_PARTY_SIZE` from `include/constants/global.h`.
pub const FRONTIER_PARTY_SIZE: u8 = 3;

/// The six rental balls visible on the Factory draft screen.
pub const FACTORY_DRAFT_SLOT_COUNT: usize = 6;

/// `Select_MenuOptionFuncs` has SUMMARY, RENT/DESELECT, and OTHERS.
pub const MENU_OPTION_COUNT: u8 = 3;

/// The source controller's fixed six-cell `selectedIds` storage.
pub type FactoryDraftSelectedIds = [u8; FACTORY_DRAFT_SLOT_COUNT];

const SELECT_FIRST_MON_MESSAGE: &str = "Select the first POKéMON.";
const SELECT_SECOND_MON_MESSAGE: &str = "Select the second POKéMON.";
const SELECT_THIRD_MON_MESSAGE: &str = "Select the third POKéMON.";
const CONFIRM_MONS_MESSAGE: &str = "Are these three POKéMON OK?";

/// Source `1 | -1` movement direction for the two wrapping cursor helpers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryDraftDirection {
    /// TypeScript direction `1` (RIGHT or DOWN).
    Forward,
    /// TypeScript direction `-1` (LEFT or UP).
    Backward,
}

/// The immutable result of `applySelect` or `applyDeselect`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryDraftSelectionChange {
    pub selected_ids: FactoryDraftSelectedIds,
    pub selecting_mons_state: u8,
}

/// Source `CursorRedrawState`, with a copied source cursor position.
///
/// A controller-created slow state can have elapsed `0..=2`; a fast state
/// can have elapsed `0..=1`.  Advancing the final value returns `None`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryDraftCursorRedrawState {
    pub from_cursor_pos: u8,
    pub elapsed: u8,
    pub fast: bool,
}

/// Source `MenuHighlightRedrawState`, shared by the menu and YES/NO cursor.
/// Controller-created states have elapsed `0..=1`; the elapsed-1 advance
/// settles and returns `None`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryDraftMenuHighlightRedrawState {
    pub from_menu_cursor_pos: u8,
    pub elapsed: u8,
}

/// Source `RentConfirmRedrawState`.
///
/// `from_message` is borrowed rather than owned because the source helper
/// spreads the state object without modifying its string cell.  As with menu
/// highlight redraws, controller-created states have elapsed `0..=1`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryDraftRentConfirmRedrawState<'a> {
    pub from_message: &'a str,
    pub from_selected: bool,
    pub elapsed: u8,
}

/// `Select_PrintSelectMonString`'s message choice.
///
/// State 4 is the source array's fallback and is the confirmation state the
/// controller reaches after stamping the third pick.
#[must_use]
pub const fn select_mon_message(selecting_mons_state: u8) -> &'static str {
    match selecting_mons_state {
        1 => SELECT_FIRST_MON_MESSAGE,
        2 => SELECT_SECOND_MON_MESSAGE,
        3 => SELECT_THIRD_MON_MESSAGE,
        _ => CONFIRM_MONS_MESSAGE,
    }
}

/// Source `Select_OptionRentDeselect` select branch.
///
/// The caller-owned fixed array is copied before its cursored cell is stamped,
/// matching TypeScript's `selectedIds.slice()` immutable-return behavior.
#[must_use]
pub fn apply_select(
    selected_ids: &FactoryDraftSelectedIds,
    selecting_mons_state: u8,
    slot_index: u8,
) -> FactoryDraftSelectionChange {
    let mut next_ids = *selected_ids;
    next_ids[usize::from(slot_index)] = selecting_mons_state;
    FactoryDraftSelectionChange {
        selected_ids: next_ids,
        selecting_mons_state: selecting_mons_state + 1,
    }
}

/// Source `Select_OptionRentDeselect` deselect branch.
///
/// When the first pick is removed while exactly two mons are selected, the
/// source finds the rank-2 peer and renumbers it to rank 1.  `position` is
/// deliberately optional: the canonical JavaScript leaves the array alone
/// when `findIndex` returns `-1`.
#[must_use]
pub fn apply_deselect(
    selected_ids: &FactoryDraftSelectedIds,
    selecting_mons_state: u8,
    slot_index: u8,
) -> FactoryDraftSelectionChange {
    let mut next_ids = *selected_ids;
    let deselected_rank = next_ids[usize::from(slot_index)];
    next_ids[usize::from(slot_index)] = 0;
    if deselected_rank == 1 && selecting_mons_state == FRONTIER_PARTY_SIZE {
        if let Some(other_index) = next_ids
            .iter()
            .position(|&id| id == FRONTIER_PARTY_SIZE - 1)
        {
            next_ids[other_index] = 1;
        }
    }
    FactoryDraftSelectionChange {
        selected_ids: next_ids,
        selecting_mons_state: selecting_mons_state - 1,
    }
}

/// `Select_OptionRentDeselect`'s post-third-pick input boundary.
#[must_use]
pub const fn is_mons_confirmed(selecting_mons_state: u8) -> bool {
    selecting_mons_state > FRONTIER_PARTY_SIZE
}

/// Whether a cursor move into this species stalls the other active balls.
///
/// The two exact canonical spellings are exceptions; comparison is deliberately
/// case-sensitive, as it is for the TypeScript `Set<string>` lookup.
#[must_use]
pub fn cursor_move_stalls_balls(entering_species: &str) -> bool {
    !matches!(entering_species, "BAYLEEF" | "HAUNTER")
}

/// `Select_UpdateBallCursorPosition`: wrap a valid 0..=5 cursor position.
#[must_use]
pub const fn move_cursor(cursor_pos: u8, direction: FactoryDraftDirection) -> u8 {
    match direction {
        FactoryDraftDirection::Forward => {
            if cursor_pos == FACTORY_DRAFT_SLOT_COUNT as u8 - 1 {
                0
            } else {
                cursor_pos + 1
            }
        }
        FactoryDraftDirection::Backward => {
            if cursor_pos == 0 {
                FACTORY_DRAFT_SLOT_COUNT as u8 - 1
            } else {
                cursor_pos - 1
            }
        }
    }
}

/// `Select_UpdateMenuCursorPosition`: wrap a valid 0..=2 menu position.
#[must_use]
pub const fn move_menu_cursor(menu_cursor_pos: u8, direction: FactoryDraftDirection) -> u8 {
    match direction {
        FactoryDraftDirection::Forward => {
            if menu_cursor_pos == MENU_OPTION_COUNT - 1 {
                0
            } else {
                menu_cursor_pos + 1
            }
        }
        FactoryDraftDirection::Backward => {
            if menu_cursor_pos == 0 {
                MENU_OPTION_COUNT - 1
            } else {
                menu_cursor_pos - 1
            }
        }
    }
}

/// Advance a cursor redraw once before processing fresh input.
///
/// Slow moves settle after three advances; `fast` moves settle after two.
#[must_use]
pub fn advance_cursor_redraw(
    state: Option<FactoryDraftCursorRedrawState>,
) -> Option<FactoryDraftCursorRedrawState> {
    let state = state?;
    let elapsed = state.elapsed + 1;
    let settle_ticks = if state.fast { 2 } else { 3 };
    if elapsed >= settle_ticks {
        None
    } else {
        Some(FactoryDraftCursorRedrawState { elapsed, ..state })
    }
}

/// Advance a menu-highlight redraw once before processing fresh input.
#[must_use]
pub fn advance_menu_highlight_redraw(
    state: Option<FactoryDraftMenuHighlightRedrawState>,
) -> Option<FactoryDraftMenuHighlightRedrawState> {
    let state = state?;
    let elapsed = state.elapsed + 1;
    if elapsed >= 2 {
        None
    } else {
        Some(FactoryDraftMenuHighlightRedrawState { elapsed, ..state })
    }
}

/// Advance a RENT/DESELECT confirm redraw once before processing fresh input.
#[must_use]
pub fn advance_rent_confirm_redraw<'a>(
    state: Option<FactoryDraftRentConfirmRedrawState<'a>>,
) -> Option<FactoryDraftRentConfirmRedrawState<'a>> {
    let state = state?;
    let elapsed = state.elapsed + 1;
    if elapsed >= 2 {
        None
    } else {
        Some(FactoryDraftRentConfirmRedrawState { elapsed, ..state })
    }
}

#[cfg(test)]
mod tests {
    use super::{
        advance_cursor_redraw, apply_deselect, apply_select, cursor_move_stalls_balls,
        FactoryDraftCursorRedrawState, FRONTIER_PARTY_SIZE,
    };

    #[test]
    fn selection_helpers_copy_the_six_cell_input_before_changing_it() {
        let selected_ids = [1, 0, 2, 0, 0, 0];
        let selected = apply_select(&selected_ids, 3, 1);
        let deselected = apply_deselect(&selected_ids, 3, 0);

        assert_eq!(selected_ids, [1, 0, 2, 0, 0, 0]);
        assert_eq!(selected.selected_ids, [1, 3, 2, 0, 0, 0]);
        assert_eq!(deselected.selected_ids, [0, 0, 1, 0, 0, 0]);
    }

    #[test]
    fn sparse_two_selected_rank_one_keeps_the_no_found_case_unmodified() {
        let result = apply_deselect(&[1, 0, 0, 0, 0, 0], FRONTIER_PARTY_SIZE, 0);
        assert_eq!(result.selected_ids, [0, 0, 0, 0, 0, 0]);
        assert_eq!(result.selecting_mons_state, 2);
    }

    #[test]
    fn cursor_redraw_fast_threshold_is_one_tick_earlier() {
        assert_eq!(
            advance_cursor_redraw(Some(FactoryDraftCursorRedrawState {
                from_cursor_pos: 4,
                elapsed: 1,
                fast: true,
            })),
            None,
        );
        assert!(cursor_move_stalls_balls("Bayleef"));
        assert!(!cursor_move_stalls_balls("BAYLEEF"));
    }
}
