//! Full-result differential test for the isolated Factory AI battle-history
//! leaf. Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-factory-ai-battle-history-vectors.mjs`.

use std::collections::BTreeMap;
use std::fmt::Write;

use factory_core::factory_ai_battle_history::{
    create_factory_ai_battle_history, record_factory_ai_known_ability,
    record_factory_ai_known_item_effect, sync_factory_ai_battle_history, FactoryAiBattleHistory,
    FactoryAiBattleHistoryBattler, FactoryAiBattleHistoryLiveInput,
};
use factory_core::factory_ai_battle_history_vectors_gen::{
    FactoryAiBattleHistoryVectorCase, FactoryAiBattleHistoryVectorHistory,
    FactoryAiBattleHistoryVectorOperationKind, FACTORY_AI_BATTLE_HISTORY_CASES,
    FACTORY_AI_BATTLE_HISTORY_VECTOR_CATEGORY_COUNTS,
};
use factory_core::gen_tables::{ability_name_by_id, ABILITY_NAME_BY_ID};

fn battler(value: u8) -> FactoryAiBattleHistoryBattler {
    match value {
        0 => FactoryAiBattleHistoryBattler::Battler0,
        1 => FactoryAiBattleHistoryBattler::Battler1,
        2 => FactoryAiBattleHistoryBattler::Battler2,
        3 => FactoryAiBattleHistoryBattler::Battler3,
        _ => panic!("generator validation guarantees battler 0..3"),
    }
}

fn history_from_vector(vector: FactoryAiBattleHistoryVectorHistory) -> FactoryAiBattleHistory {
    FactoryAiBattleHistory {
        used_moves: vector.used_moves.map(|row| row.to_vec()),
        known_abilities: vector
            .known_abilities
            .map(|ability| ability.map(str::to_owned)),
        known_item_effects: vector.known_item_effects,
        party_indexes: vector.party_indexes,
    }
}

fn push_number(output: &mut String, value: f64) {
    // JSON.stringify writes non-finite Number cells as null and -0 as 0.
    if !value.is_finite() {
        output.push_str("null");
    } else if value == 0.0 {
        output.push('0');
    } else if value.fract() == 0.0 && value.abs() < 1e21 {
        write!(output, "{value:.0}").unwrap();
    } else {
        let rendered = value.to_string();
        if let Some((mantissa, exponent)) = rendered.split_once('e') {
            output.push_str(mantissa);
            output.push('e');
            if !exponent.starts_with('+') && !exponent.starts_with('-') {
                output.push('+');
            }
            output.push_str(exponent);
        } else {
            output.push_str(&rendered);
        }
    }
}

fn push_string(output: &mut String, value: &str) {
    output.push('"');
    for character in value.chars() {
        match character {
            '"' => output.push_str("\\\""),
            '\\' => output.push_str("\\\\"),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            '\t' => output.push_str("\\t"),
            value if value <= '\u{1f}' => write!(output, "\\u{:04x}", value as u32).unwrap(),
            value => output.push(value),
        }
    }
    output.push('"');
}

fn push_number_slice(output: &mut String, values: &[f64]) {
    output.push('[');
    for (index, value) in values.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        push_number(output, *value);
    }
    output.push(']');
}

fn render_history(history: &FactoryAiBattleHistory) -> String {
    let mut output = String::from("{\"usedMoves\":[");
    for (index, moves) in history.used_moves.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        push_number_slice(&mut output, moves);
    }
    output.push_str("],\"knownAbilities\":[");
    for (index, ability) in history.known_abilities.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        match ability {
            Some(ability) => push_string(&mut output, ability),
            None => output.push_str("null"),
        }
    }
    output.push_str("],\"knownItemEffects\":");
    push_number_slice(&mut output, &history.known_item_effects);
    output.push_str(",\"partyIndexes\":");
    push_number_slice(&mut output, &history.party_indexes);
    output.push('}');
    output
}

fn execute_case(case: &FactoryAiBattleHistoryVectorCase) -> Result<String, String> {
    let mut history = case
        .initial_history
        .map(history_from_vector)
        .unwrap_or_else(|| create_factory_ai_battle_history(&case.initial_input));
    for operation in case.operations {
        match operation.kind {
            FactoryAiBattleHistoryVectorOperationKind::Sync => {
                history = sync_factory_ai_battle_history(&history, &operation.input)
                    .map_err(|error| error.to_string())?;
            }
            FactoryAiBattleHistoryVectorOperationKind::RecordAbility => {
                history = record_factory_ai_known_ability(
                    &history,
                    battler(operation.battler),
                    operation
                        .ability
                        .expect("generator validation requires an ability"),
                );
            }
            FactoryAiBattleHistoryVectorOperationKind::RecordItem => {
                history = record_factory_ai_known_item_effect(
                    &history,
                    battler(operation.battler),
                    operation.item_effect,
                );
            }
        }
    }
    Ok(render_history(&history))
}

#[test]
fn complete_results_and_errors_match_canonical_typescript() {
    assert_eq!(FACTORY_AI_BATTLE_HISTORY_CASES.len(), 15);
    for (index, case) in FACTORY_AI_BATTLE_HISTORY_CASES.iter().enumerate() {
        match execute_case(case) {
            Ok(result) => assert_eq!(
                Some(result.as_str()),
                case.expected_json,
                "case {index} ({})",
                case.label,
            ),
            Err(error) => assert_eq!(
                Some(error.as_str()),
                case.expected_error,
                "case {index} ({})",
                case.label,
            ),
        }
    }
}

#[test]
fn category_census_is_ratchet_pinned() {
    let mut observed = BTreeMap::new();
    for case in FACTORY_AI_BATTLE_HISTORY_CASES {
        *observed.entry(case.category).or_insert(0usize) += 1;
    }
    let expected = FACTORY_AI_BATTLE_HISTORY_VECTOR_CATEGORY_COUNTS
        .iter()
        .copied()
        .collect::<BTreeMap<_, _>>();
    assert_eq!(observed, expected);
    assert_eq!(FACTORY_AI_BATTLE_HISTORY_CASES.len(), 15);
}

#[test]
fn generated_ability_names_are_complete_dense_and_exact_at_key_ids() {
    assert_eq!(ABILITY_NAME_BY_ID.len(), 78);
    for (index, row) in ABILITY_NAME_BY_ID.iter().enumerate() {
        assert_eq!(usize::from(row.id), index);
        assert_eq!(ability_name_by_id(f64::from(row.id)), Some(row.name));
    }
    assert_eq!(ability_name_by_id(0.0), Some("ABILITY_NONE"));
    assert_eq!(ability_name_by_id(9.0), Some("ABILITY_STATIC"));
    assert_eq!(ability_name_by_id(77.0), Some("ABILITY_AIR_LOCK"));
    assert_eq!(ability_name_by_id(78.0), None);
}

#[test]
fn live_input_is_the_complete_narrow_surface() {
    let input = FactoryAiBattleHistoryLiveInput {
        party_indexes: [0.0, 1.0, 2.0, 3.0],
        target_last_move: 0.0,
        observed_ability_ids: [0.0; 4],
        observed_item_effects: [0.0; 4],
    };
    assert_eq!(
        create_factory_ai_battle_history(&input).party_indexes,
        input.party_indexes
    );
}
