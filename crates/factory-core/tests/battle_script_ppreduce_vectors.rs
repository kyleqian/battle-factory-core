//! Canonical-TypeScript differential, registration, and MOVES-table
//! agreement ratchets for `ppreduceOpcodeHandler`
//! (`src/engine/battleScriptHitChainOpcode.ts`).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-ppreduce-vectors.mjs`.

use factory_core::battle_script_ppreduce::{
    apply_battle_script_ppreduce, register_battle_script_ppreduce_handler,
    BattleScriptPpreduceBattlerState, BattleScriptPpreduceEvent, BattleScriptPpreduceInstruction,
    BattleScriptPpreducePartyMember, BattleScriptPpreduceRoles, BattleScriptPpreduceRules,
    BattleScriptPpreduceScheduler,
};
use factory_core::battle_script_ppreduce_vectors_gen::{
    PpreduceRegistrationVectorCase, PpreduceVectorBattlerState, PpreduceVectorPartyMember,
    PpreduceVectorState, BATTLE_SCRIPT_PPREDUCE_CASES, BATTLE_SCRIPT_PPREDUCE_CATEGORY_CENSUS,
    BATTLE_SCRIPT_PPREDUCE_DOMAIN_CENSUS, BATTLE_SCRIPT_PPREDUCE_MOVE_TARGET_AGREEMENT,
    BATTLE_SCRIPT_PPREDUCE_REGISTRATION_CASES, BATTLE_SCRIPT_PPREDUCE_VECTOR_CORPUS_SHA256,
};
use factory_core::gen_tables::MOVES;

fn battler(value: PpreduceVectorBattlerState) -> BattleScriptPpreduceBattlerState {
    BattleScriptPpreduceBattlerState {
        side: value.side,
        party_index: value.party_index,
        pp: value.pp,
        ability: value.ability,
        status2: value.status2,
        pp_not_affected_by_pressure: value.pp_not_affected_by_pressure,
        not_first_strike: value.not_first_strike,
    }
}

fn party_member(value: PpreduceVectorPartyMember) -> BattleScriptPpreducePartyMember {
    BattleScriptPpreducePartyMember { pp: value.pp }
}

fn rules(value: PpreduceVectorState) -> BattleScriptPpreduceRules {
    BattleScriptPpreduceRules {
        battlers: value.battlers.map(battler),
        party: value.party.map(|side| side.map(party_member)),
        selector_roles: BattleScriptPpreduceRoles {
            attacker: value.attacker,
            target: value.target,
        },
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        hit_marker: value.hit_marker,
        battlers_count: value.battlers_count,
    }
}

fn vector_state(value: BattleScriptPpreduceRules) -> PpreduceVectorState {
    PpreduceVectorState {
        battlers: value.battlers.map(|b| PpreduceVectorBattlerState {
            side: b.side,
            party_index: b.party_index,
            pp: b.pp,
            ability: b.ability,
            status2: b.status2,
            pp_not_affected_by_pressure: b.pp_not_affected_by_pressure,
            not_first_strike: b.not_first_strike,
        }),
        party: value
            .party
            .map(|side| side.map(|member| PpreduceVectorPartyMember { pp: member.pp })),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        hit_marker: value.hit_marker,
        battlers_count: value.battlers_count,
    }
}

fn scheduler(
    pending: [Option<factory_core::battle_script_ppreduce::BattleScriptPpreduceBattler>; 4],
) -> BattleScriptPpreduceScheduler {
    let pending_count = pending.iter().filter(|value| value.is_some()).count() as u8;
    BattleScriptPpreduceScheduler { pending_controller_battlers: pending, pending_count }
}

#[test]
fn complete_projected_outputs_events_pending_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_CASES.len(), 29);
    for (case_index, case) in BATTLE_SCRIPT_PPREDUCE_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;
        let machine_input = scheduler(case.initial_pending);
        let machine_before = machine_input;

        let result = apply_battle_script_ppreduce(&input, &machine_input);

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
                assert_eq!(
                    vector_state(outcome.rules),
                    expected,
                    "case {case_index} {} complete projected state",
                    case.label
                );
                assert_eq!(
                    outcome.scheduler.pending_controller_battlers, case.expected_pending,
                    "case {case_index} {} pending list",
                    case.label
                );
                let expected_events = case.events.map(|events| {
                    events.map(|event| BattleScriptPpreduceEvent {
                        battler: event.battler,
                        move_position: event.move_position,
                        pp: event.pp,
                    })
                });
                assert_eq!(
                    outcome.events, expected_events,
                    "case {case_index} {} events",
                    case.label
                );
            }
            (Err(actual), None, Some(expected)) => {
                assert_eq!(
                    actual.to_string(),
                    expected,
                    "case {case_index} {} exact error",
                    case.label
                );
            }
            (actual, expected, expected_error) => panic!(
                "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
                case.label
            ),
        }
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_REGISTRATION_CASES.len(), 2);
    for case in BATTLE_SCRIPT_PPREDUCE_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &PpreduceRegistrationVectorCase) {
    let present = [BattleScriptPpreduceInstruction {
        opcode_name: "B_SCR_OP_PPREDUCE",
        opcode_id: case.expected_opcode_id.unwrap_or(0x03),
    }];
    let absent =
        [
            BattleScriptPpreduceInstruction {
                opcode_name: "B_SCR_OP_ATTACKSTRING",
                opcode_id: 0x02,
            },
        ];
    let instructions: &[BattleScriptPpreduceInstruction] = if case.expected_error.is_some() {
        &absent
    } else {
        &present
    };
    match (register_battle_script_ppreduce_handler(instructions), case.expected_opcode_id, case.expected_error)
    {
        (Ok(actual), Some(expected), None) => assert_eq!(actual.opcode_id, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
        (actual, expected_opcode, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn moves_table_agreement_pins_native_target_byte_against_ts_resolved_target() {
    assert!(!BATTLE_SCRIPT_PPREDUCE_MOVE_TARGET_AGREEMENT.is_empty());
    for case in BATTLE_SCRIPT_PPREDUCE_MOVE_TARGET_AGREEMENT {
        let native_target = MOVES[usize::from(case.move_id)].target;
        assert_eq!(
            native_target, case.ts_target,
            "move {} native/TS target disagreement",
            case.move_id
        );
    }
}

#[test]
fn domain_and_category_censuses_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_PPREDUCE_DOMAIN_CENSUS,
        [
            ("committed-sites", 133),
            ("behavior-cases", 26),
            ("throw-cases", 3),
            ("registration-cases", 2),
            ("moves-table-agreement-checks", 4),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_PPREDUCE_CATEGORY_CENSUS,
        [
            ("deduct-gate", 10),
            ("permanence", 5),
            ("pressure-default", 4),
            ("pressure-foes-and-ally", 4),
            ("pressure-guard", 1),
            ("pressure-other-side", 2),
            ("throws", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_PPREDUCE_VECTOR_CORPUS_SHA256,
        "c5b4bb76bff88d5eaeeb661765aeccc4ac9fb89f510bbd45b9afa8e22fc839f1"
    );
}
