//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTryswapitemsOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-tryswapitems-vectors.mjs`.

use factory_core::battle_script_tryswapitems::{
    apply_battle_script_tryswapitems, register_battle_script_tryswapitems_handler,
    BattleScriptTryswapitemsBattlerState, BattleScriptTryswapitemsPartyMember,
    BattleScriptTryswapitemsRoles, BattleScriptTryswapitemsRules,
    BattleScriptTryswapitemsScheduler,
};
use factory_core::battle_script_tryswapitems_vectors_gen::{
    BattleScriptTryswapitemsRegistrationVectorCase, BattleScriptTryswapitemsVectorBattlerState,
    BattleScriptTryswapitemsVectorCase, BattleScriptTryswapitemsVectorPartyMember,
    BattleScriptTryswapitemsVectorState, BATTLE_SCRIPT_TRYSWAPITEMS_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSWAPITEMS_CASES, BATTLE_SCRIPT_TRYSWAPITEMS_CATEGORY_CENSUS,
    BATTLE_SCRIPT_TRYSWAPITEMS_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYSWAPITEMS_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSWAPITEMS_REGISTRATION_CASES, BATTLE_SCRIPT_TRYSWAPITEMS_VECTOR_CORPUS_SHA256,
};

fn battler(
    value: BattleScriptTryswapitemsVectorBattlerState,
) -> BattleScriptTryswapitemsBattlerState {
    BattleScriptTryswapitemsBattlerState {
        side: value.side,
        party_index: value.party_index,
        item: value.item,
        ability: value.ability,
        marker: value.marker,
    }
}

fn party_member(
    value: BattleScriptTryswapitemsVectorPartyMember,
) -> BattleScriptTryswapitemsPartyMember {
    BattleScriptTryswapitemsPartyMember { item: value.item, noise: value.noise }
}

fn rules(value: BattleScriptTryswapitemsVectorState) -> BattleScriptTryswapitemsRules {
    BattleScriptTryswapitemsRules {
        battlers: value.battlers.map(battler),
        party: value.party.map(|side| side.map(party_member)),
        selector_roles: BattleScriptTryswapitemsRoles {
            attacker: value.attacker,
            target: value.target,
        },
        battle_type_flags: value.battle_type_flags,
        knocked_off_mons: value.knocked_off_mons,
        changed_items: value.changed_items,
        choiced_move: value.choiced_move,
        last_used_ability: value.last_used_ability,
        ai_observed_ability_ids: value.ai_observed_ability_ids,
        multistring_chooser: value.multistring_chooser,
        battle_text_buff1_item: value.battle_text_buff1_item,
        battle_text_buff2_item: value.battle_text_buff2_item,
    }
}

fn vector_state(value: BattleScriptTryswapitemsRules) -> BattleScriptTryswapitemsVectorState {
    BattleScriptTryswapitemsVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTryswapitemsVectorBattlerState {
                side: battler.side,
                party_index: battler.party_index,
                item: battler.item,
                ability: battler.ability,
                marker: battler.marker,
            }),
        party: value.party.map(|side| {
            side.map(|member| BattleScriptTryswapitemsVectorPartyMember {
                item: member.item,
                noise: member.noise,
            })
        }),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        battle_type_flags: value.battle_type_flags,
        knocked_off_mons: value.knocked_off_mons,
        changed_items: value.changed_items,
        choiced_move: value.choiced_move,
        last_used_ability: value.last_used_ability,
        ai_observed_ability_ids: value.ai_observed_ability_ids,
        multistring_chooser: value.multistring_chooser,
        battle_text_buff1_item: value.battle_text_buff1_item,
        battle_text_buff2_item: value.battle_text_buff2_item,
    }
}

fn scheduler(
    pending: [Option<factory_core::battle_script_tryswapitems::BattleScriptTryswapitemsBattler>; 4],
) -> BattleScriptTryswapitemsScheduler {
    let pending_count = pending.iter().filter(|value| value.is_some()).count() as u8;
    BattleScriptTryswapitemsScheduler { pending_controller_battlers: pending, pending_count }
}

#[test]
fn complete_projected_outputs_controls_events_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_CASES.len(), 44);
    for (case_index, case) in BATTLE_SCRIPT_TRYSWAPITEMS_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTryswapitemsVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let machine_input = scheduler(case.initial_pending);
    let machine_before = machine_input;

    let result = apply_battle_script_tryswapitems(case.instruction, &input, &machine_input);

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
                outcome.events, case.events,
                "case {case_index} {} emitted events",
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
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_REGISTRATION_CASES.len(), 8);
    for case in BATTLE_SCRIPT_TRYSWAPITEMS_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTryswapitemsRegistrationVectorCase) {
    match (
        register_battle_script_tryswapitems_handler(case.instructions),
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
fn jump_branch_never_changes_rules_or_scheduler_except_sticky_hold_reveal() {
    for case in BATTLE_SCRIPT_TRYSWAPITEMS_CASES
        .iter()
        .filter(|case| case.branch == "jump")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_pending);
        let outcome = apply_battle_script_tryswapitems(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| {
                panic!("{}: expected jump outcome, got error {error}", case.label)
            });
        assert_eq!(
            outcome.scheduler, machine_input,
            "{}: jump must not mutate scheduler",
            case.label
        );
        assert_eq!(
            outcome.events, None,
            "{}: jump must not emit events",
            case.label
        );
        if case.category == "sticky-hold" {
            assert_eq!(
                outcome.rules.last_used_ability, 60,
                "{}: sticky hold must record lastUsedAbility",
                case.label
            );
        } else {
            assert_eq!(
                vector_state(outcome.rules),
                case.initial,
                "{}: non-sticky-hold jump must not mutate rules",
                case.label
            );
        }
    }
}

#[test]
fn advance_branch_swaps_items_asymmetrically_and_emits_two_events() {
    for case in BATTLE_SCRIPT_TRYSWAPITEMS_CASES
        .iter()
        .filter(|case| case.branch == "advance")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_pending);
        let outcome = apply_battle_script_tryswapitems(case.instruction, &input, &machine_input)
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
        let target = input
            .selector_roles
            .target
            .expect("advance case has target");
        let old_item_atk = input.battlers[attacker.index()].item;
        let new_item_atk = input.battlers[target.index()].item;

        assert_eq!(
            outcome.rules.battlers[attacker.index()].item,
            0,
            "{}: attacker active item clears",
            case.label
        );
        assert_eq!(
            outcome.rules.battlers[target.index()].item,
            old_item_atk,
            "{}: target active item receives attacker's old item",
            case.label
        );
        let attacker_side = input.battlers[attacker.index()].side;
        let attacker_party_index = usize::from(input.battlers[attacker.index()].party_index);
        let target_side = input.battlers[target.index()].side;
        let target_party_index = usize::from(input.battlers[target.index()].party_index);
        assert_eq!(
            outcome.rules.party[attacker_side.index()][attacker_party_index].item,
            new_item_atk,
            "{}: attacker's PARTY slot receives target's item (asymmetric)",
            case.label
        );
        assert_eq!(
            outcome.rules.party[target_side.index()][target_party_index].item,
            old_item_atk,
            "{}: target's party slot receives attacker's old item",
            case.label
        );
        assert_eq!(
            outcome.rules.changed_items[attacker.index()],
            new_item_atk,
            "{}: changedItems[attacker] records the new item",
            case.label
        );
        assert_eq!(
            outcome.rules.choiced_move[attacker.index()],
            0,
            "{}: attacker choicedMove clears",
            case.label
        );
        assert_eq!(
            outcome.rules.choiced_move[target.index()],
            0,
            "{}: target choicedMove clears",
            case.label
        );
        assert_eq!(
            outcome.events,
            Some([
                factory_core::battle_script_tryswapitems::BattleScriptTryswapitemsEvent {
                    battler: attacker,
                    item: new_item_atk,
                },
                factory_core::battle_script_tryswapitems::BattleScriptTryswapitemsEvent {
                    battler: target,
                    item: old_item_atk,
                },
            ]),
            "{}: two events in attacker-then-target order",
            case.label
        );
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPITEMS_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("party-sides", 2),
            ("party-indexes", 6),
            ("success-item-pairs", 3),
            ("role-assignments", 4),
            ("registration-cases", 8),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPITEMS_CATEGORY_CENSUS,
        [
            ("item-guard", 9),
            ("knocked-off-guard", 3),
            ("late-label-resolution", 3),
            ("malformed-shape-precedes-role", 5),
            ("missing-role", 2),
            ("opponent-regular-guard", 3),
            ("pending-list", 4),
            ("sticky-hold", 2),
            ("success-swap-matrix", 12),
            ("trainer-hill", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPITEMS_BRANCH_CENSUS,
        [
            ("advance", 16),
            ("invalid-instruction-shape", 5),
            ("jump", 19),
            ("missing-attacker-role", 1),
            ("missing-target-role", 1),
            ("unresolved-failure-target", 1),
            ("unresolved-sticky-hold-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPITEMS_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 4),
            ("registered", 2),
            ("wrong-cardinality", 2)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPITEMS_VECTOR_CORPUS_SHA256,
        "0fd8d0364b543840ff250f6d438bebfd2f5d2bb7456e78ae8033cb67373a0cf8"
    );
}
