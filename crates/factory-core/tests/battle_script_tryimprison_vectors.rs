//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTryimprisonOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-tryimprison-vectors.mjs`.

use factory_core::battle_script_tryimprison::{
    apply_battle_script_tryimprison, register_battle_script_tryimprison_handler,
    BattleScriptTryimprisonBattlerState, BattleScriptTryimprisonPartyMember,
    BattleScriptTryimprisonRoles, BattleScriptTryimprisonRules, BattleScriptTryimprisonScheduler,
};
use factory_core::battle_script_tryimprison_vectors_gen::{
    BattleScriptTryimprisonRegistrationVectorCase, BattleScriptTryimprisonVectorBattlerState,
    BattleScriptTryimprisonVectorCase, BattleScriptTryimprisonVectorPartyMember,
    BattleScriptTryimprisonVectorScheduler, BattleScriptTryimprisonVectorState,
    BATTLE_SCRIPT_TRYIMPRISON_BRANCH_CENSUS, BATTLE_SCRIPT_TRYIMPRISON_CASES,
    BATTLE_SCRIPT_TRYIMPRISON_CATEGORY_CENSUS, BATTLE_SCRIPT_TRYIMPRISON_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYIMPRISON_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYIMPRISON_REGISTRATION_CASES, BATTLE_SCRIPT_TRYIMPRISON_VECTOR_CORPUS_SHA256,
};

fn battler(
    value: BattleScriptTryimprisonVectorBattlerState,
) -> BattleScriptTryimprisonBattlerState {
    BattleScriptTryimprisonBattlerState {
        side: value.side,
        party_index: value.party_index,
        ability: value.ability,
        status2: value.status2,
        status3: value.status3,
        moves: value.moves,
        pp: value.pp,
        mimicked_moves: value.mimicked_moves,
    }
}

fn party_member(
    value: BattleScriptTryimprisonVectorPartyMember,
) -> BattleScriptTryimprisonPartyMember {
    BattleScriptTryimprisonPartyMember { pp: value.pp }
}

fn rules(value: BattleScriptTryimprisonVectorState) -> BattleScriptTryimprisonRules {
    BattleScriptTryimprisonRules {
        battlers: value.battlers.map(battler),
        party: value.party.map(|side| side.map(party_member)),
        selector_roles: BattleScriptTryimprisonRoles { attacker: value.attacker },
        battlers_count: value.battlers_count,
    }
}

fn vector_state(value: BattleScriptTryimprisonRules) -> BattleScriptTryimprisonVectorState {
    BattleScriptTryimprisonVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTryimprisonVectorBattlerState {
                side: battler.side,
                party_index: battler.party_index,
                ability: battler.ability,
                status2: battler.status2,
                status3: battler.status3,
                moves: battler.moves,
                pp: battler.pp,
                mimicked_moves: battler.mimicked_moves,
            }),
        party: value.party.map(|side| {
            side.map(|member| BattleScriptTryimprisonVectorPartyMember { pp: member.pp })
        }),
        attacker: value.selector_roles.attacker,
        battlers_count: value.battlers_count,
    }
}

fn scheduler(value: BattleScriptTryimprisonVectorScheduler) -> BattleScriptTryimprisonScheduler {
    BattleScriptTryimprisonScheduler {
        active_battler: value.active_battler,
        pending_controller_battlers: value.pending_controller_battlers,
        pending_count: value.pending_count,
    }
}

fn vector_scheduler(
    value: BattleScriptTryimprisonScheduler,
) -> BattleScriptTryimprisonVectorScheduler {
    BattleScriptTryimprisonVectorScheduler {
        active_battler: value.active_battler,
        pending_controller_battlers: value.pending_controller_battlers,
        pending_count: value.pending_count,
    }
}

#[test]
fn complete_projected_outputs_controls_events_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_CASES.len(), 52);
    for (case_index, case) in BATTLE_SCRIPT_TRYIMPRISON_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTryimprisonVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let machine_input = scheduler(case.initial_scheduler);
    let machine_before = machine_input;

    let result = apply_battle_script_tryimprison(case.instruction, &input, &machine_input);

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
                vector_scheduler(outcome.scheduler),
                case.expected_scheduler.expect("advance/jump cases carry expected scheduler"),
                "case {case_index} {} scheduler",
                case.label
            );
            assert_eq!(outcome.emitted_event, case.event, "case {case_index} {} emitted event", case.label);
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
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_REGISTRATION_CASES.len(), 8);
    for case in BATTLE_SCRIPT_TRYIMPRISON_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTryimprisonRegistrationVectorCase) {
    match (
        register_battle_script_tryimprison_handler(case.instructions),
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
fn already_imprisoned_jump_never_loses_pp_even_with_opposing_pressure() {
    for case in BATTLE_SCRIPT_TRYIMPRISON_CASES
        .iter()
        .filter(|case| case.category == "already-imprisoned-early-jump")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_scheduler);
        let outcome = apply_battle_script_tryimprison(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| {
                panic!("{}: expected jump outcome, got error {error}", case.label)
            });
        assert_eq!(
            outcome.control,
            case.control.expect("jump case carries control")
        );
        assert_eq!(
            vector_state(outcome.rules),
            case.initial,
            "{}: already-imprisoned jump must not mutate rules",
            case.label
        );
        assert_eq!(
            outcome.emitted_event, None,
            "{}: no PP-loss event on early jump",
            case.label
        );
    }
}

#[test]
fn eager_label_resolution_errors_regardless_of_branch() {
    for case in BATTLE_SCRIPT_TRYIMPRISON_CASES
        .iter()
        .filter(|case| case.category == "late-label-resolution")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_scheduler);
        let error = apply_battle_script_tryimprison(case.instruction, &input, &machine_input)
            .expect_err(&format!("{}: eager resolution must error", case.label));
        assert_eq!(
            error.to_string(),
            "Cmd_tryimprison unresolved failure target BattleScript_RustTryimprisonUnresolved",
            "{}",
            case.label
        );
    }
}

#[test]
fn permanence_gate_controls_party_scheduler_and_event_but_never_active_pp() {
    for case in BATTLE_SCRIPT_TRYIMPRISON_CASES
        .iter()
        .filter(|case| case.category == "permanence-gate-matrix")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_scheduler);
        let outcome = apply_battle_script_tryimprison(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| panic!("{}: expected outcome, got error {error}", case.label));
        let attacker = input
            .selector_roles
            .attacker
            .expect("permanence cases have attacker");
        // Active PP always updates once an Imprison slot was found, regardless of permanence.
        assert_ne!(
            outcome.rules.battlers[attacker.index()].pp[0],
            input.battlers[attacker.index()].pp[0],
            "{}: active pp must always update",
            case.label
        );
        let permanent = case.event.is_some();
        assert_eq!(
            outcome.rules.party[input.battlers[attacker.index()].side.index()]
                [usize::from(input.battlers[attacker.index()].party_index)]
            .pp[0]
                != input.party[input.battlers[attacker.index()].side.index()]
                    [usize::from(input.battlers[attacker.index()].party_index)]
                .pp[0],
            permanent,
            "{}: party mirror write must match permanence gate",
            case.label
        );
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYIMPRISON_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("battlers-count-variants", 2),
            ("pressure-pp-values", 3),
            ("permanence-variants", 5),
            ("party-sides", 2),
            ("party-indexes", 6),
            ("registration-cases", 8),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYIMPRISON_CATEGORY_CENSUS,
        [
            ("active-battler-gating", 3),
            ("already-imprisoned-early-jump", 2),
            ("attacker-identity-matrix", 7),
            ("late-label-resolution", 2),
            ("malformed-shape-precedes-role", 5),
            ("overlap-grid", 7),
            ("party-mirror-side-index-matrix", 6),
            ("permanence-gate-matrix", 5),
            ("pressure-count-matrix", 12),
            ("scheduler-pending", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYIMPRISON_BRANCH_CENSUS,
        [
            ("advance", 10),
            ("invalid-instruction-shape", 5),
            ("jump", 34),
            ("missing-attacker-role", 1),
            ("unresolved-failure-target", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYIMPRISON_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 4),
            ("registered", 2),
            ("wrong-cardinality", 2)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYIMPRISON_VECTOR_CORPUS_SHA256,
        "fa2ed7db8c54beafe6733c53c648e3d9eb64dddedad355ec87aeac9f2c1b89ab"
    );
}
