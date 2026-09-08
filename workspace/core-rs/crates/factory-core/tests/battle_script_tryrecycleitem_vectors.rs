//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTryrecycleitemOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-tryrecycleitem-vectors.mjs`.

use factory_core::battle_script_tryrecycleitem::{
    apply_battle_script_tryrecycleitem, register_battle_script_tryrecycleitem_handler,
    BattleScriptTryrecycleitemBattlerState, BattleScriptTryrecycleitemPartyMember,
    BattleScriptTryrecycleitemRoles, BattleScriptTryrecycleitemRules,
    BattleScriptTryrecycleitemScheduler,
};
use factory_core::battle_script_tryrecycleitem_vectors_gen::{
    BattleScriptTryrecycleitemRegistrationVectorCase, BattleScriptTryrecycleitemVectorBattlerState,
    BattleScriptTryrecycleitemVectorCase, BattleScriptTryrecycleitemVectorPartyMember,
    BattleScriptTryrecycleitemVectorState, BATTLE_SCRIPT_TRYRECYCLEITEM_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYRECYCLEITEM_CASES, BATTLE_SCRIPT_TRYRECYCLEITEM_CATEGORY_CENSUS,
    BATTLE_SCRIPT_TRYRECYCLEITEM_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYRECYCLEITEM_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYRECYCLEITEM_REGISTRATION_CASES,
    BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_CORPUS_SHA256,
};

fn battler(
    value: BattleScriptTryrecycleitemVectorBattlerState,
) -> BattleScriptTryrecycleitemBattlerState {
    BattleScriptTryrecycleitemBattlerState {
        side: value.side,
        party_index: value.party_index,
        item: value.item,
        ability: value.ability,
        marker: value.marker,
    }
}

fn party_member(
    value: BattleScriptTryrecycleitemVectorPartyMember,
) -> BattleScriptTryrecycleitemPartyMember {
    BattleScriptTryrecycleitemPartyMember { item: value.item, noise: value.noise }
}

fn rules(value: BattleScriptTryrecycleitemVectorState) -> BattleScriptTryrecycleitemRules {
    BattleScriptTryrecycleitemRules {
        battlers: value.battlers.map(battler),
        party: value.party.map(|side| side.map(party_member)),
        selector_roles: BattleScriptTryrecycleitemRoles { attacker: value.attacker },
        used_held_items: value.used_held_items,
        last_used_item: value.last_used_item,
    }
}

fn vector_state(value: BattleScriptTryrecycleitemRules) -> BattleScriptTryrecycleitemVectorState {
    BattleScriptTryrecycleitemVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTryrecycleitemVectorBattlerState {
                side: battler.side,
                party_index: battler.party_index,
                item: battler.item,
                ability: battler.ability,
                marker: battler.marker,
            }),
        party: value.party.map(|side| {
            side.map(|member| BattleScriptTryrecycleitemVectorPartyMember {
                item: member.item,
                noise: member.noise,
            })
        }),
        attacker: value.selector_roles.attacker,
        used_held_items: value.used_held_items,
        last_used_item: value.last_used_item,
    }
}

fn scheduler(
    pending: [Option<factory_core::battle_script_tryrecycleitem::BattleScriptTryrecycleitemBattler>;
        4],
) -> BattleScriptTryrecycleitemScheduler {
    let pending_count = pending.iter().filter(|value| value.is_some()).count() as u8;
    BattleScriptTryrecycleitemScheduler { pending_controller_battlers: pending, pending_count }
}

#[test]
fn complete_projected_outputs_controls_events_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_CASES.len(), 85);
    for (case_index, case) in BATTLE_SCRIPT_TRYRECYCLEITEM_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTryrecycleitemVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let machine_input = scheduler(case.initial_pending);
    let machine_before = machine_input;

    let result = apply_battle_script_tryrecycleitem(case.instruction, &input, &machine_input);

    assert_eq!(
        input, before,
        "case {case_index} {} mutated rules input",
        case.label
    );
    assert_eq!(
        machine_input, machine_before,
        "case {case_index} {} mutated scheduler input",
        case.label
    );

    match (result, case.expected, case.expected_error) {
        (Ok(outcome), Some(expected), None) => {
            assert_eq!(Some(outcome.control), case.control, "case {case_index} {} control", case.label);
            assert_eq!(
                vector_state(outcome.rules),
                expected,
                "case {case_index} {} complete projected state",
                case.label
            );
            assert_eq!(
                outcome.scheduler.pending_controller_battlers,
                case.expected_pending,
                "case {case_index} {} pending list",
                case.label
            );
            assert_eq!(
                outcome.emitted_event, case.event,
                "case {case_index} {} emitted event",
                case.label
            );
        }
        (Err(actual), None, Some(expected)) => {
            assert_eq!(case.control, None, "case {case_index} {} error must have no control", case.label);
            assert_eq!(actual.to_string(), expected, "case {case_index} {} exact error", case.label);
        }
        (actual, expected, expected_error) => panic!(
            "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_REGISTRATION_CASES.len(), 8);
    for case in BATTLE_SCRIPT_TRYRECYCLEITEM_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTryrecycleitemRegistrationVectorCase) {
    match (
        register_battle_script_tryrecycleitem_handler(case.instructions),
        case.expected_opcode_id,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => assert_eq!(actual.opcode_id, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
        (actual, expected_opcode, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn jump_branch_never_changes_rules_or_scheduler() {
    for case in BATTLE_SCRIPT_TRYRECYCLEITEM_CASES
        .iter()
        .filter(|case| case.branch == "jump")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_pending);
        let outcome = apply_battle_script_tryrecycleitem(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| {
                panic!("{}: expected jump outcome, got error {error}", case.label)
            });
        assert_eq!(
            vector_state(outcome.rules),
            case.initial,
            "{}: jump must not mutate rules",
            case.label
        );
        assert_eq!(
            outcome.scheduler, machine_input,
            "{}: jump must not mutate scheduler",
            case.label
        );
        assert_eq!(
            outcome.emitted_event, None,
            "{}: jump must not emit an event",
            case.label
        );
    }
}

#[test]
fn advance_branch_transfers_item_and_clears_used_held_item_cell_only() {
    for case in BATTLE_SCRIPT_TRYRECYCLEITEM_CASES
        .iter()
        .filter(|case| case.branch == "advance")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_pending);
        let outcome = apply_battle_script_tryrecycleitem(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| {
                panic!(
                    "{}: expected advance outcome, got error {error}",
                    case.label
                )
            });
        let attacker = input
            .selector_roles
            .attacker
            .expect("advance case has attacker");
        let used_item = input.used_held_items[attacker.index()];
        assert_eq!(
            outcome.rules.battlers[attacker.index()].item,
            used_item,
            "{}: attacker item must equal the consumed used-held-item",
            case.label
        );
        assert_eq!(
            outcome.rules.used_held_items[attacker.index()],
            0,
            "{}: used-held-item cell must clear on success",
            case.label
        );
        assert_eq!(
            outcome.rules.last_used_item, used_item,
            "{}: lastUsedItem must record the transferred item",
            case.label
        );
        for (index, cell) in outcome.rules.used_held_items.iter().enumerate() {
            if index != attacker.index() {
                assert_eq!(
                    *cell, input.used_held_items[index],
                    "{}: other used-held-item cells must be retained",
                    case.label
                );
            }
        }
        assert!(
            outcome.emitted_event.is_some(),
            "{}: advance must emit a set-battler-item event",
            case.label
        );
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("used-item-values", 4),
            ("attacker-item-values", 3),
            ("party-sides", 2),
            ("party-indexes", 6),
            ("registration-cases", 8),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_CATEGORY_CENSUS,
        [
            ("attacker-useditem-item-matrix", 49),
            ("last-used-item-history", 2),
            ("late-label-resolution", 2),
            ("malformed-shape-precedes-role", 5),
            ("party-index-side-identity-matrix", 24),
            ("scheduler-pending-preservation", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_BRANCH_CENSUS,
        [
            ("advance", 41),
            ("invalid-instruction-shape", 5),
            ("jump", 37),
            ("missing-attacker-role", 1),
            ("unresolved-failure-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 4),
            ("registered", 2),
            ("wrong-cardinality", 2)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_CORPUS_SHA256,
        "fa5eeb58a8553b283a40624fa18dd85d9157ebc0cfdad9dcb518449f2b254328"
    );
}
