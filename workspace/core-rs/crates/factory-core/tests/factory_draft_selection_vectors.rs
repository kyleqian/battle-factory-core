//! Full-result differential test for the presentation-free Factory draft
//! selection helpers. Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-factory-draft-selection-vectors.mjs`.

use std::collections::{BTreeMap, BTreeSet};

use factory_core::factory_draft_selection::{
    advance_cursor_redraw, advance_menu_highlight_redraw, advance_rent_confirm_redraw,
    apply_deselect, apply_select, chosen_mon_species, cursor_move_stalls_balls, is_mons_confirmed,
    move_cursor, move_menu_cursor, select_mon_message, selected_rental_party,
    FactoryDraftDirection,
};
use factory_core::factory_draft_selection_vectors_gen::{
    FactoryDraftRentalVectorExpected, FACTORY_DRAFT_APPLY_DESELECT_CASES,
    FACTORY_DRAFT_APPLY_SELECT_CASES, FACTORY_DRAFT_CHOSEN_SPECIES_CASES,
    FACTORY_DRAFT_CONFIRMATION_CASES, FACTORY_DRAFT_CURSOR_MOVE_STALL_CASES,
    FACTORY_DRAFT_CURSOR_REDRAW_CASES, FACTORY_DRAFT_MENU_HIGHLIGHT_REDRAW_CASES,
    FACTORY_DRAFT_MOVE_CURSOR_CASES, FACTORY_DRAFT_MOVE_MENU_CURSOR_CASES,
    FACTORY_DRAFT_PROJECTION_BRANCHES, FACTORY_DRAFT_RENT_CONFIRM_REDRAW_CASES,
    FACTORY_DRAFT_SELECTED_RENTAL_PARTY_CASES, FACTORY_DRAFT_SELECTION_VECTOR_CASE_COUNT,
    FACTORY_DRAFT_SELECTION_VECTOR_CATEGORY_COUNTS, FACTORY_DRAFT_SELECTION_VECTOR_DOMAIN,
    FACTORY_DRAFT_SELECT_MON_MESSAGE_CASES, FACTORY_DRAFT_VECTOR_SOURCE_RECORDS,
};

const SLOT_SPECIES: [&str; 6] = [
    "SPECIES_ZERO",
    "SPECIES_ONE",
    "SPECIES_TWO",
    "SPECIES_THREE",
    "SPECIES_FOUR",
    "SPECIES_FIVE",
];

#[test]
fn complete_results_match_canonically_executed_typescript_vectors() {
    for case in FACTORY_DRAFT_SELECT_MON_MESSAGE_CASES {
        assert_eq!(
            select_mon_message(case.selecting_mons_state),
            case.expected_message,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_APPLY_SELECT_CASES {
        assert_eq!(
            apply_select(
                &case.selected_ids,
                case.selecting_mons_state,
                case.slot_index
            ),
            case.expected,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_APPLY_DESELECT_CASES {
        assert_eq!(
            apply_deselect(
                &case.selected_ids,
                case.selecting_mons_state,
                case.slot_index
            ),
            case.expected,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_CONFIRMATION_CASES {
        assert_eq!(
            is_mons_confirmed(case.selecting_mons_state),
            case.expected_confirmed,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_CURSOR_MOVE_STALL_CASES {
        assert_eq!(
            cursor_move_stalls_balls(case.entering_species),
            case.expected_stalls,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_MOVE_CURSOR_CASES {
        assert_eq!(
            move_cursor(case.cursor_pos, case.direction),
            case.expected_cursor_pos,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_MOVE_MENU_CURSOR_CASES {
        assert_eq!(
            move_menu_cursor(case.menu_cursor_pos, case.direction),
            case.expected_menu_cursor_pos,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_CURSOR_REDRAW_CASES {
        assert_eq!(
            advance_cursor_redraw(case.state),
            case.expected,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_MENU_HIGHLIGHT_REDRAW_CASES {
        assert_eq!(
            advance_menu_highlight_redraw(case.state),
            case.expected,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_RENT_CONFIRM_REDRAW_CASES {
        assert_eq!(
            advance_rent_confirm_redraw(case.state),
            case.expected,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_CHOSEN_SPECIES_CASES {
        assert_eq!(
            chosen_mon_species(&case.selected_ids, &SLOT_SPECIES),
            case.expected_species,
            "{}",
            case.label,
        );
    }
    for case in FACTORY_DRAFT_SELECTED_RENTAL_PARTY_CASES {
        let actual =
            selected_rental_party(&case.selected_ids, &FACTORY_DRAFT_VECTOR_SOURCE_RECORDS);
        match case.expected {
            FactoryDraftRentalVectorExpected::Ok(expected) => {
                assert_eq!(actual.unwrap(), expected, "{}", case.label);
            }
            FactoryDraftRentalVectorExpected::Err(expected) => {
                assert_eq!(actual.unwrap_err().to_string(), expected, "{}", case.label);
            }
        }
    }
}

#[test]
fn category_census_and_bounded_domain_are_ratchet_pinned() {
    let mut observed = BTreeMap::new();
    for category in FACTORY_DRAFT_SELECT_MON_MESSAGE_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_APPLY_SELECT_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_APPLY_DESELECT_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_CONFIRMATION_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_CURSOR_MOVE_STALL_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_MOVE_CURSOR_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_MOVE_MENU_CURSOR_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_CURSOR_REDRAW_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_MENU_HIGHLIGHT_REDRAW_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_RENT_CONFIRM_REDRAW_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_CHOSEN_SPECIES_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    for category in FACTORY_DRAFT_SELECTED_RENTAL_PARTY_CASES
        .iter()
        .map(|case| case.category)
    {
        *observed.entry(category).or_insert(0usize) += 1;
    }
    let expected = FACTORY_DRAFT_SELECTION_VECTOR_CATEGORY_COUNTS
        .iter()
        .copied()
        .collect::<BTreeMap<_, _>>();
    assert_eq!(observed, expected);
    assert_eq!(FACTORY_DRAFT_SELECTION_VECTOR_CATEGORY_COUNTS.len(), 23);
    assert_eq!(FACTORY_DRAFT_SELECTION_VECTOR_CASE_COUNT, 180);
    assert_eq!(
        observed.values().sum::<usize>(),
        FACTORY_DRAFT_SELECTION_VECTOR_CASE_COUNT
    );
    assert_eq!(
        FACTORY_DRAFT_SELECTION_VECTOR_DOMAIN,
        "six selectedIds cells 0..=3 for controller helpers and 0..=255 for projections; slots 0..=5; menu rows 0..=2; selectingMonsState 1..=4; elapsed only through each controller settle tick",
    );
}

#[test]
fn projection_branch_census_and_complete_slot_rank_matrices_are_pinned() {
    let observed_branches = FACTORY_DRAFT_CHOSEN_SPECIES_CASES
        .iter()
        .flat_map(|case| case.branches.iter().copied())
        .chain(
            FACTORY_DRAFT_SELECTED_RENTAL_PARTY_CASES
                .iter()
                .flat_map(|case| case.branches.iter().copied()),
        )
        .collect::<BTreeSet<_>>();
    assert_eq!(
        observed_branches,
        FACTORY_DRAFT_PROJECTION_BRANCHES.into_iter().collect()
    );
    assert_eq!(observed_branches.len(), 13);

    let chosen_matrix = FACTORY_DRAFT_CHOSEN_SPECIES_CASES
        .iter()
        .filter(|case| case.category == "chosen-slot-rank")
        .flat_map(|case| {
            case.selected_ids
                .iter()
                .enumerate()
                .filter(|(_, rank)| **rank > 0)
                .map(|(slot, &rank)| (slot, rank))
        })
        .collect::<BTreeSet<_>>();
    for slot in 0..6 {
        for rank in 1..=3 {
            assert!(
                chosen_matrix.contains(&(slot, rank)),
                "missing chosen slot {slot}, rank {rank}"
            );
        }
    }

    let rental_matrix = FACTORY_DRAFT_SELECTED_RENTAL_PARTY_CASES
        .iter()
        .filter(|case| case.category == "rental-slot-rank")
        .flat_map(|case| {
            case.selected_ids
                .iter()
                .enumerate()
                .filter(|(_, rank)| **rank > 0)
                .map(|(slot, &rank)| (slot, rank))
        })
        .collect::<BTreeSet<_>>();
    for slot in 0..6 {
        for rank in 1..=3 {
            assert!(
                rental_matrix.contains(&(slot, rank)),
                "missing rental slot {slot}, rank {rank}"
            );
        }
    }
}

#[test]
fn projection_vectors_pin_overwrite_errors_u32_boundaries_and_non_mutation() {
    for rank in 1..=3 {
        let chosen = FACTORY_DRAFT_CHOSEN_SPECIES_CASES
            .iter()
            .find(|case| case.label == format!("chosen_duplicate_rank_{rank}"))
            .expect("duplicate chosen rank case");
        let last_slot = chosen
            .selected_ids
            .iter()
            .rposition(|&candidate| candidate == rank)
            .unwrap();
        let first_slot = chosen
            .selected_ids
            .iter()
            .position(|&candidate| candidate == rank)
            .unwrap();
        assert!(chosen.expected_species.contains(&SLOT_SPECIES[last_slot]));
        assert!(!chosen.expected_species.contains(&SLOT_SPECIES[first_slot]));

        let rental = FACTORY_DRAFT_SELECTED_RENTAL_PARTY_CASES
            .iter()
            .find(|case| case.label == format!("rental_duplicate_rank_{rank}"))
            .expect("duplicate rental rank case");
        let duplicate_slot = rental
            .selected_ids
            .iter()
            .enumerate()
            .find_map(|(slot, &candidate)| {
                (candidate == rank && rental.selected_ids[..slot].contains(&candidate))
                    .then_some(slot)
            })
            .unwrap();
        let FactoryDraftRentalVectorExpected::Err(expected_error) = rental.expected else {
            panic!("duplicate rental case unexpectedly succeeded");
        };
        assert_eq!(
            expected_error,
            format!("invalid draft pick rank {rank} at rental slot {duplicate_slot}")
        );
    }

    assert_eq!(
        FACTORY_DRAFT_VECTOR_SOURCE_RECORDS[0].boundary_value,
        u32::MAX
    );
    assert_eq!(FACTORY_DRAFT_VECTOR_SOURCE_RECORDS[5].record_id, u32::MAX);
    assert_eq!(
        FACTORY_DRAFT_VECTOR_SOURCE_RECORDS[1].optional_value,
        Some(0)
    );
    assert_eq!(
        FACTORY_DRAFT_VECTOR_SOURCE_RECORDS[3].optional_value,
        Some(u32::MAX)
    );

    let invalid_matrix = FACTORY_DRAFT_SELECTED_RENTAL_PARTY_CASES
        .iter()
        .filter(|case| case.category == "rental-invalid")
        .flat_map(|case| {
            case.selected_ids
                .iter()
                .enumerate()
                .filter(|(_, rank)| matches!(**rank, 4 | 200))
                .map(|(slot, &rank)| (slot, rank))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(invalid_matrix.len(), 12);
    for slot in 0..6 {
        for rank in [4, 200] {
            assert!(invalid_matrix.contains(&(slot, rank)));
        }
    }

    let selected_ids = [3, 0, 1, 0, 2, 0];
    let selected_ids_before = selected_ids;
    let sources = FACTORY_DRAFT_VECTOR_SOURCE_RECORDS;
    let sources_before = sources;
    let selected = selected_rental_party(&selected_ids, &sources).unwrap();
    assert_eq!(selected_ids, selected_ids_before);
    assert_eq!(sources, sources_before);
    assert_eq!(
        selected,
        [sources[2], sources[4], sources[0]],
        "complete generic records must be preserved in rank order"
    );
}

#[test]
fn six_slot_selection_matrix_pins_both_rank_one_renumber_outcomes() {
    let select_matrix = FACTORY_DRAFT_APPLY_SELECT_CASES
        .iter()
        .map(|case| (case.slot_index, case.selecting_mons_state))
        .collect::<BTreeSet<_>>();
    assert_eq!(select_matrix.len(), 18);
    for slot in 0..6 {
        for rank in 1..=3 {
            assert!(
                select_matrix.contains(&(slot, rank)),
                "missing select slot {slot}, rank {rank}"
            );
        }
    }

    let deselect_matrix = FACTORY_DRAFT_APPLY_DESELECT_CASES
        .iter()
        .map(|case| {
            (
                case.slot_index,
                case.selected_ids[usize::from(case.slot_index)],
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(deselect_matrix.len(), 18);
    for slot in 0..6 {
        for rank in 1..=3 {
            assert!(
                deselect_matrix.contains(&(slot, rank)),
                "missing deselect slot {slot}, rank {rank}"
            );
        }
    }

    let found = FACTORY_DRAFT_APPLY_DESELECT_CASES
        .iter()
        .filter(|case| case.category == "apply-deselect-renumber-found")
        .collect::<Vec<_>>();
    let no_found = FACTORY_DRAFT_APPLY_DESELECT_CASES
        .iter()
        .filter(|case| case.category == "apply-deselect-renumber-no-found")
        .collect::<Vec<_>>();
    assert_eq!(found.len(), 6);
    assert_eq!(no_found.len(), 6);
    for case in found {
        let peer = case
            .selected_ids
            .iter()
            .position(|&rank| rank == 2)
            .expect("found matrix has a rank-2 peer");
        assert_eq!(case.expected.selecting_mons_state, 2, "{}", case.label);
        assert_eq!(case.expected.selected_ids[peer], 1, "{}", case.label);
    }
    for case in no_found {
        assert!(!case.selected_ids.contains(&2), "{}", case.label);
        assert_eq!(case.expected.selected_ids, [0; 6], "{}", case.label);
        assert_eq!(case.expected.selecting_mons_state, 2, "{}", case.label);
    }
}

#[test]
fn input_and_redraw_matrices_cover_the_controller_boundaries() {
    let confirmation_sides = FACTORY_DRAFT_CONFIRMATION_CASES
        .iter()
        .map(|case| case.expected_confirmed)
        .collect::<BTreeSet<_>>();
    assert_eq!(confirmation_sides, BTreeSet::from([false, true]));
    assert_eq!(
        FACTORY_DRAFT_SELECT_MON_MESSAGE_CASES[3].expected_message,
        "Are these three POKéMON OK?",
    );

    for (species, expected) in [
        ("BAYLEEF", false),
        ("HAUNTER", false),
        ("MAGBY", true),
        ("Bayleef", true),
    ] {
        let case = FACTORY_DRAFT_CURSOR_MOVE_STALL_CASES
            .iter()
            .find(|case| case.entering_species == species)
            .expect("species is generator-pinned");
        assert_eq!(case.expected_stalls, expected, "{species}");
    }

    let cursor_matrix = FACTORY_DRAFT_MOVE_CURSOR_CASES
        .iter()
        .map(|case| (case.cursor_pos, direction_value(case.direction)))
        .collect::<BTreeSet<_>>();
    assert_eq!(cursor_matrix.len(), 12);
    for cursor_pos in 0..6 {
        for direction in [-1, 1] {
            assert!(cursor_matrix.contains(&(cursor_pos, direction)));
        }
    }
    let menu_matrix = FACTORY_DRAFT_MOVE_MENU_CURSOR_CASES
        .iter()
        .map(|case| (case.menu_cursor_pos, direction_value(case.direction)))
        .collect::<BTreeSet<_>>();
    assert_eq!(menu_matrix.len(), 6);
    for menu_cursor_pos in 0..3 {
        for direction in [-1, 1] {
            assert!(menu_matrix.contains(&(menu_cursor_pos, direction)));
        }
    }

    assert_eq!(FACTORY_DRAFT_CURSOR_REDRAW_CASES.len(), 6);
    assert_eq!(
        FACTORY_DRAFT_CURSOR_REDRAW_CASES
            .iter()
            .filter(|case| case.state.is_none())
            .count(),
        1
    );
    assert!(FACTORY_DRAFT_CURSOR_REDRAW_CASES.iter().any(|case| {
        matches!(case.state, Some(state) if !state.fast && state.elapsed == 2)
            && case.expected.is_none()
    }));
    assert!(FACTORY_DRAFT_CURSOR_REDRAW_CASES.iter().any(|case| {
        matches!(case.state, Some(state) if state.fast && state.elapsed == 1)
            && case.expected.is_none()
    }));
    assert_eq!(FACTORY_DRAFT_MENU_HIGHLIGHT_REDRAW_CASES.len(), 3);
    assert_eq!(FACTORY_DRAFT_RENT_CONFIRM_REDRAW_CASES.len(), 3);
    assert_eq!(
        FACTORY_DRAFT_MENU_HIGHLIGHT_REDRAW_CASES
            .iter()
            .filter(|case| case.state.is_none())
            .count(),
        1,
    );
    assert!(FACTORY_DRAFT_MENU_HIGHLIGHT_REDRAW_CASES
        .iter()
        .any(|case| case.state.is_some() && case.expected.is_none()));
    assert_eq!(
        FACTORY_DRAFT_RENT_CONFIRM_REDRAW_CASES
            .iter()
            .filter(|case| case.state.is_none())
            .count(),
        1,
    );
    assert!(FACTORY_DRAFT_RENT_CONFIRM_REDRAW_CASES
        .iter()
        .any(|case| case.state.is_some() && case.expected.is_none()));
}

const fn direction_value(direction: FactoryDraftDirection) -> i8 {
    match direction {
        FactoryDraftDirection::Forward => 1,
        FactoryDraftDirection::Backward => -1,
    }
}
