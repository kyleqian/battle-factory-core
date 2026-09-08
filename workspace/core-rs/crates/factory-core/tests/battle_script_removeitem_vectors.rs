//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptRemoveitemOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-removeitem-vectors.mjs`.

use factory_core::battle_script_removeitem::{
    apply_battle_script_removeitem, register_battle_script_removeitem_handler,
    BattleScriptRemoveitemBattlerState, BattleScriptRemoveitemOutcome,
    BattleScriptRemoveitemPartyMember, BattleScriptRemoveitemRoles, BattleScriptRemoveitemRules,
    BattleScriptRemoveitemScheduler,
};
use factory_core::battle_script_removeitem_vectors_gen::{
    BattleScriptRemoveitemRegistrationVectorCase, BattleScriptRemoveitemVectorBattlerState,
    BattleScriptRemoveitemVectorCase, BattleScriptRemoveitemVectorOutcome,
    BattleScriptRemoveitemVectorPartyMember, BattleScriptRemoveitemVectorState,
    BATTLE_SCRIPT_REMOVEITEM_BRANCH_CENSUS, BATTLE_SCRIPT_REMOVEITEM_CASES,
    BATTLE_SCRIPT_REMOVEITEM_CATEGORY_CENSUS, BATTLE_SCRIPT_REMOVEITEM_DOMAIN_CENSUS,
    BATTLE_SCRIPT_REMOVEITEM_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_REMOVEITEM_REGISTRATION_CASES, BATTLE_SCRIPT_REMOVEITEM_VECTOR_CORPUS_SHA256,
};

fn battler(value: BattleScriptRemoveitemVectorBattlerState) -> BattleScriptRemoveitemBattlerState {
    BattleScriptRemoveitemBattlerState {
        side: value.side,
        party_index: value.party_index,
        item: value.item,
        ability: value.ability,
        marker: value.marker,
    }
}

fn party_member(
    value: BattleScriptRemoveitemVectorPartyMember,
) -> BattleScriptRemoveitemPartyMember {
    BattleScriptRemoveitemPartyMember { item: value.item, noise: value.noise }
}

fn rules(value: BattleScriptRemoveitemVectorState) -> BattleScriptRemoveitemRules {
    BattleScriptRemoveitemRules {
        battlers: value.battlers.map(battler),
        party: value.party.map(|side| side.map(party_member)),
        selector_roles: BattleScriptRemoveitemRoles { attacker: value.attacker },
        scripting_battler: value.scripting_battler,
        used_held_items: value.used_held_items,
        last_used_item: value.last_used_item,
    }
}

fn vector_state(value: BattleScriptRemoveitemRules) -> BattleScriptRemoveitemVectorState {
    BattleScriptRemoveitemVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptRemoveitemVectorBattlerState {
                side: battler.side,
                party_index: battler.party_index,
                item: battler.item,
                ability: battler.ability,
                marker: battler.marker,
            }),
        party: value.party.map(|side| {
            side.map(|member| BattleScriptRemoveitemVectorPartyMember {
                item: member.item,
                noise: member.noise,
            })
        }),
        attacker: value.selector_roles.attacker,
        scripting_battler: value.scripting_battler,
        used_held_items: value.used_held_items,
        last_used_item: value.last_used_item,
    }
}

fn scheduler(
    pending: [Option<factory_core::battle_script_removeitem::BattleScriptRemoveitemBattler>; 4],
) -> BattleScriptRemoveitemScheduler {
    let pending_count = pending.iter().filter(|value| value.is_some()).count() as u8;
    BattleScriptRemoveitemScheduler { pending_controller_battlers: pending, pending_count }
}

#[test]
fn complete_projected_outputs_controls_events_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_CASES.len(), 76);
    for (case_index, case) in BATTLE_SCRIPT_REMOVEITEM_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptRemoveitemVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let machine_input = scheduler(case.initial_pending);
    let machine_before = machine_input;

    let outcome = apply_battle_script_removeitem(case.instruction, &input, &machine_input)
        .unwrap_or_else(|error| {
            panic!("case {case_index} {} unexpected error {error}", case.label)
        });

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

    match (outcome, case.outcome) {
        (
            BattleScriptRemoveitemOutcome::Applied { rules, scheduler, control, emitted_event },
            BattleScriptRemoveitemVectorOutcome::Applied {
                rules: expected_rules,
                pending: expected_pending,
                control: expected_control,
                event: expected_event,
            },
        ) => {
            assert_eq!(control, expected_control, "case {case_index} {} control", case.label);
            assert_eq!(
                vector_state(rules),
                expected_rules,
                "case {case_index} {} complete projected state",
                case.label
            );
            assert_eq!(
                scheduler.pending_controller_battlers, expected_pending,
                "case {case_index} {} pending list",
                case.label
            );
            assert_eq!(
                emitted_event, expected_event,
                "case {case_index} {} emitted event",
                case.label
            );
        }
        (
            BattleScriptRemoveitemOutcome::UnsupportedBranch(reason),
            BattleScriptRemoveitemVectorOutcome::UnsupportedBranch(expected_reason),
        ) => {
            assert_eq!(reason, expected_reason, "case {case_index} {} halt reason", case.label);
        }
        (actual, expected) => panic!(
            "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}",
            case.label
        ),
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_REGISTRATION_CASES.len(), 10);
    for case in BATTLE_SCRIPT_REMOVEITEM_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptRemoveitemRegistrationVectorCase) {
    match (
        register_battle_script_removeitem_handler(case.instructions),
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
fn unsupported_branch_never_mutates_rules_or_scheduler_and_emits_no_event() {
    for case in BATTLE_SCRIPT_REMOVEITEM_CASES
        .iter()
        .filter(|case| case.branch == "unsupported-branch")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_pending);
        let outcome = apply_battle_script_removeitem(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| {
                panic!(
                    "{}: expected unsupported-branch, got error {error}",
                    case.label
                )
            });
        match outcome {
            BattleScriptRemoveitemOutcome::UnsupportedBranch(_) => {}
            other => panic!("{}: expected unsupported-branch, got {other:?}", case.label),
        }
    }
}

#[test]
fn applied_branch_records_old_active_item_and_clears_active_and_party_slots() {
    for case in BATTLE_SCRIPT_REMOVEITEM_CASES
        .iter()
        .filter(|case| case.branch == "applied")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_pending);
        let outcome = apply_battle_script_removeitem(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| {
                panic!(
                    "{}: expected applied outcome, got error {error}",
                    case.label
                )
            });
        let resolved_battler = case.instruction.operands[0].expression == "BS_ATTACKER"
            && input.selector_roles.attacker.is_some()
            || case.instruction.operands[0].expression == "BS_SCRIPTING"
                && input.scripting_battler.is_some();
        assert!(
            resolved_battler,
            "{}: applied case must have a resolvable selector",
            case.label
        );
        let battler = if case.instruction.operands[0].expression == "BS_ATTACKER" {
            input.selector_roles.attacker.unwrap()
        } else {
            input.scripting_battler.unwrap()
        };
        let old_active_item = input.battlers[battler.index()].item;
        match outcome {
            BattleScriptRemoveitemOutcome::Applied { rules, emitted_event, .. } => {
                assert_eq!(
                    rules.used_held_items[battler.index()],
                    old_active_item,
                    "{}: usedHeldItems cell must equal the OLD active item",
                    case.label
                );
                assert_eq!(
                    rules.battlers[battler.index()].item,
                    0,
                    "{}: active item must clear",
                    case.label
                );
                assert_eq!(
                    rules.last_used_item, input.last_used_item,
                    "{}: lastUsedItem must never be touched",
                    case.label
                );
                assert!(
                    emitted_event.is_some(),
                    "{}: applied must emit a set-battler-item event",
                    case.label
                );
                for (index, cell) in rules.used_held_items.iter().enumerate() {
                    if index != battler.index() {
                        assert_eq!(
                            *cell, input.used_held_items[index],
                            "{}: other used-held-item cells must be retained",
                            case.label
                        );
                    }
                }
            }
            other => panic!("{}: expected applied outcome, got {other:?}", case.label),
        }
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("item-values", 4),
            ("party-sides", 2),
            ("party-indexes", 6),
            ("real-call-sites", 13),
            ("registration-cases", 10),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_CATEGORY_CENSUS,
        [
            ("active-item-values", 8),
            ("call-site-battler-matrix", 13),
            ("last-used-item-history", 2),
            ("party-index-side-identity-matrix", 48),
            ("scheduler-pending-preservation", 3),
            ("unsupported-branch", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_BRANCH_CENSUS,
        [("applied", 74), ("unsupported-branch", 2)]
    );
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 6),
            ("registered", 1),
            ("wrong-cardinality", 3)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_VECTOR_CORPUS_SHA256,
        "ecf8ec5ecd95f1ba20fec374b3525b4fd44ee827b8b818cae5cbba8f98cee419"
    );
}
