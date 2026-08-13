//! Full-result differential test for the native-only Factory-swap mutation
//! leaf. Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-factory-swap-vectors.mjs`.

use std::collections::{BTreeMap, BTreeSet};

use factory_core::factory_swap::{
    apply_factory_swap_mutation, commit_factory_swap_mutation, factory_swap_already_has_species,
    factory_swap_round_decision, FactoryRentalMon, FactorySwapMon, FactorySwapPartyIndex,
    FactorySwapState,
};
use factory_core::factory_swap_vectors_gen::{
    FactorySwapVectorCase, FactorySwapVectorExpected, FactorySwapVectorMon,
    FactorySwapVectorOperation, FactorySwapVectorRentalMon, FactorySwapVectorState,
    FACTORY_SWAP_CASES, FACTORY_SWAP_VECTOR_CATEGORY_COUNTS,
};

fn party_index(value: Option<u8>) -> Option<FactorySwapPartyIndex> {
    value.map(|value| {
        FactorySwapPartyIndex::from_u8(value)
            .expect("generator validation guarantees a Factory party index")
    })
}

fn mon_from_vector(value: FactorySwapVectorMon) -> FactorySwapMon {
    FactorySwapMon {
        id: value.id.to_owned(),
        species: value.species.to_owned(),
        max_hp: value.max_hp,
        hp: value.hp,
        status: value.status,
        personality: value.personality,
        ability_num: value.ability_num,
        friendship: value.friendship,
    }
}

fn rental_from_vector(value: FactorySwapVectorRentalMon) -> FactoryRentalMon {
    FactoryRentalMon {
        mon_id: value.mon_id,
        personality: value.personality,
        ivs: value.ivs,
        ability_num: value.ability_num,
    }
}

fn state_from_vector(value: FactorySwapVectorState) -> FactorySwapState {
    FactorySwapState {
        phase: value.phase,
        player_party: value.player_party.map(mon_from_vector),
        enemy_party: value.enemy_party.map(mon_from_vector),
        rental_mons: value.rental_mons.map(rental_from_vector),
        cursor: value.cursor,
        info_cursor: value.info_cursor,
        display_cursor: value.display_cursor,
        arrow_cursor: value.arrow_cursor,
        cursor_copy_pending: value.cursor_copy_pending,
        actions_count: value.actions_count,
        player_option_cursor: value.player_option_cursor,
        player_option_display_cursor: value.player_option_display_cursor,
        player_option_cursor_copy_pending: value.player_option_cursor_copy_pending,
        yes_no_cursor: value.yes_no_cursor,
        player_mon_id: party_index(value.player_mon_id),
        enemy_mon_id: party_index(value.enemy_mon_id),
        quit_return_phase: value.quit_return_phase,
        player_switch_completed: value.player_switch_completed,
        input_ready: value.input_ready,
        script_result: value.script_result,
        mutation_committed: value.mutation_committed,
        result: value.result,
    }
}

#[derive(Debug, PartialEq, Eq)]
enum Actual {
    Bool(bool),
    State(Box<FactorySwapState>),
    Decision(Option<factory_core::factory_swap::FactorySwapRoundDecision>),
}

fn execute_case(case: &FactorySwapVectorCase) -> Result<Actual, String> {
    let state = state_from_vector(case.state);
    match case.operation {
        FactorySwapVectorOperation::AlreadyHasSpecies => {
            factory_swap_already_has_species(&state, party_index(case.enemy_mon_id))
                .map(Actual::Bool)
                .map_err(|error| error.to_string())
        }
        FactorySwapVectorOperation::ApplyMutation => apply_factory_swap_mutation(&state)
            .map(|state| Actual::State(Box::new(state)))
            .map_err(|error| error.to_string()),
        FactorySwapVectorOperation::CommitMutation => commit_factory_swap_mutation(&state)
            .map(|state| Actual::State(Box::new(state)))
            .map_err(|error| error.to_string()),
        FactorySwapVectorOperation::RoundDecision => {
            Ok(Actual::Decision(factory_swap_round_decision(&state)))
        }
    }
}

fn same_expected(case: &FactorySwapVectorCase, actual: Result<Actual, String>) -> bool {
    match (actual, case.expected) {
        (Ok(Actual::Bool(actual)), FactorySwapVectorExpected::Bool(expected)) => actual == expected,
        (Ok(Actual::State(actual)), FactorySwapVectorExpected::State(expected)) => {
            *actual == state_from_vector(expected)
        }
        (Ok(Actual::Decision(actual)), FactorySwapVectorExpected::Decision(expected)) => {
            actual == expected
        }
        (Err(actual), FactorySwapVectorExpected::Error(expected)) => actual == expected,
        _ => false,
    }
}

#[test]
fn full_results_and_errors_match_canonical_typescript() {
    assert_eq!(FACTORY_SWAP_CASES.len(), 17);
    for (index, case) in FACTORY_SWAP_CASES.iter().enumerate() {
        assert!(
            same_expected(case, execute_case(case)),
            "case {index} ({})",
            case.label,
        );
    }
}

#[test]
fn category_census_is_ratchet_pinned() {
    let mut observed = BTreeMap::new();
    for case in FACTORY_SWAP_CASES {
        *observed.entry(case.category).or_insert(0usize) += 1;
    }
    let expected = FACTORY_SWAP_VECTOR_CATEGORY_COUNTS
        .iter()
        .copied()
        .collect::<BTreeMap<_, _>>();
    assert_eq!(observed, expected);
    assert_eq!(FACTORY_SWAP_CASES.len(), 17);
}

#[test]
fn accepted_vectors_cover_every_player_and_enemy_offset_and_preserve_copy_contract() {
    let mut player_indexes = BTreeSet::new();
    let mut enemy_indexes = BTreeSet::new();
    for case in FACTORY_SWAP_CASES {
        if !matches!(case.operation, FactorySwapVectorOperation::ApplyMutation) {
            continue;
        }
        let (Some(player), Some(enemy)) = (case.state.player_mon_id, case.state.enemy_mon_id)
        else {
            continue;
        };
        let FactorySwapVectorExpected::State(expected) = case.expected else {
            continue;
        };
        player_indexes.insert(player);
        enemy_indexes.insert(enemy);
        let copied = expected.player_party[usize::from(player)];
        let offered = case.state.rental_mons[usize::from(enemy) + 3];
        assert_eq!(copied.friendship, 0, "{} resets friendship", case.label);
        assert_eq!(
            expected.rental_mons[usize::from(player)].mon_id,
            offered.mon_id
        );
        assert_eq!(expected.rental_mons[usize::from(player)].ivs, offered.ivs);
        assert_eq!(
            expected.rental_mons[usize::from(player)].personality,
            copied.personality,
        );
        assert_eq!(
            expected.rental_mons[usize::from(player)].ability_num,
            copied.ability_num,
        );
    }
    assert_eq!(player_indexes, BTreeSet::from([0, 1, 2]));
    assert_eq!(enemy_indexes, BTreeSet::from([0, 1, 2]));
}
