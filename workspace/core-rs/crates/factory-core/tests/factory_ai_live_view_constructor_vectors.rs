//! Full-result differential test for the native Factory AI live-view
//! constructor. Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-factory-ai-live-view-constructor-vectors.mjs`.

use std::collections::BTreeMap;
use std::fmt::Write;

use factory_core::factory_ai_battle_history::FactoryAiBattleHistory;
use factory_core::factory_ai_live_view::{
    create_factory_ai_view_from_live_rules, FactoryAiChallengePolicy, FactoryAiLiveRulesBattler,
    FactoryAiLiveRulesContext, FactoryAiLiveViewInput, FactoryAiScoredBattlerView,
    FactoryAiScoredTargetView, FactoryAiScoredView, FactoryAiStatStages, FactoryAiWeather,
};
use factory_core::factory_ai_live_view_constructor_vectors_gen::{
    FactoryAiLiveViewBattlerVector, FactoryAiLiveViewConstructorCase,
    FactoryAiLiveViewHistoryVector, FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_CASES,
    FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_VECTOR_CATEGORY_COUNTS,
};

fn battler_from_vector(vector: FactoryAiLiveViewBattlerVector) -> FactoryAiLiveRulesBattler {
    FactoryAiLiveRulesBattler {
        types: vector.types.map(str::to_owned),
        attack: vector.attack,
        defense: vector.defense,
        sp_attack: vector.sp_attack,
        sp_defense: vector.sp_defense,
        speed: vector.speed,
        level: vector.level,
        stat_stages: vector.stat_stages,
        is_first_turn: vector.is_first_turn,
        hp: vector.hp,
        max_hp: vector.max_hp,
        ability: vector.ability,
        status1: vector.status1,
        status2: vector.status2,
        status3: vector.status3,
        protect_uses: vector.protect_uses,
        taunt_timer: vector.taunt_timer,
        species: vector.species,
        moves: vector.moves,
    }
}

fn history_from_vector(vector: FactoryAiLiveViewHistoryVector) -> FactoryAiBattleHistory {
    FactoryAiBattleHistory {
        used_moves: vector.used_moves.map(|values| values.to_vec()),
        known_abilities: vector.known_abilities.map(|value| value.map(str::to_owned)),
        known_item_effects: vector.known_item_effects,
        party_indexes: vector.party_indexes,
    }
}

fn execute_case(case: &FactoryAiLiveViewConstructorCase) -> Result<String, String> {
    let rules_context = FactoryAiLiveRulesContext {
        battlers: case.battlers.map(battler_from_vector),
        weather: case.weather,
        side_statuses: case.side_statuses,
        last_moves: case.last_moves,
    };
    let history = history_from_vector(case.history);
    create_factory_ai_view_from_live_rules(FactoryAiLiveViewInput {
        rules_context: &rules_context,
        history: &history,
        challenge: FactoryAiChallengePolicy {
            factory_win_streak: case.factory_win_streak,
            trainer_opponent_id: case.trainer_opponent_id,
            battle_turn_count: case
                .battle_turn_count_present
                .then_some(case.battle_turn_count),
        },
    })
    .map(|view| render_view(&view))
    .map_err(|error| error.to_string())
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

fn push_bool(output: &mut String, value: bool) {
    output.push_str(if value { "true" } else { "false" });
}

fn push_number_array(output: &mut String, values: &[f64]) {
    output.push('[');
    for (index, value) in values.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        push_number(output, *value);
    }
    output.push(']');
}

fn push_string_array(output: &mut String, values: &[String; 2]) {
    output.push('[');
    push_string(output, &values[0]);
    output.push(',');
    push_string(output, &values[1]);
    output.push(']');
}

fn push_stat_stages(output: &mut String, stages: FactoryAiStatStages) {
    output.push_str("{\"atk\":");
    push_number(output, stages.atk);
    output.push_str(",\"def\":");
    push_number(output, stages.def);
    output.push_str(",\"speed\":");
    push_number(output, stages.speed);
    output.push_str(",\"spAtk\":");
    push_number(output, stages.sp_atk);
    output.push_str(",\"spDef\":");
    push_number(output, stages.sp_def);
    output.push_str(",\"acc\":");
    push_number(output, stages.acc);
    output.push_str(",\"evasion\":");
    push_number(output, stages.evasion);
    output.push('}');
}

fn push_optional_bool(output: &mut String, key: &str, value: Option<bool>) {
    if let Some(value) = value {
        output.push(',');
        push_string(output, key);
        output.push(':');
        push_bool(output, value);
    }
}

fn push_optional_number(output: &mut String, key: &str, value: Option<f64>) {
    if let Some(value) = value {
        output.push(',');
        push_string(output, key);
        output.push(':');
        push_number(output, value);
    }
}

fn push_optional_weather(output: &mut String, value: Option<FactoryAiWeather>) {
    if let Some(value) = value {
        output.push_str(",\"currentWeather\":");
        output.push_str(&value.ai_weather_value().to_string());
    }
}

fn render_attacker(view: &FactoryAiScoredBattlerView) -> String {
    let mut output = String::from("{\"types\":");
    push_string_array(&mut output, &view.types);
    output.push_str(",\"attack\":");
    push_number(&mut output, view.attack);
    output.push_str(",\"defense\":");
    push_number(&mut output, view.defense);
    output.push_str(",\"spAttack\":");
    push_number(&mut output, view.sp_attack);
    output.push_str(",\"spDefense\":");
    push_number(&mut output, view.sp_defense);
    output.push_str(",\"speed\":");
    push_number(&mut output, view.speed);
    output.push_str(",\"level\":");
    push_number(&mut output, view.level);
    output.push_str(",\"statStages\":");
    push_stat_stages(&mut output, view.stat_stages);
    output.push_str(",\"isFirstTurn\":");
    push_number(&mut output, view.is_first_turn);
    output.push_str(",\"hp\":");
    push_number(&mut output, view.hp);
    output.push_str(",\"maxHp\":");
    push_number(&mut output, view.max_hp);
    output.push_str(",\"ability\":");
    push_string(&mut output, &view.ability);
    output.push_str(",\"battleTurnCount\":");
    push_number(&mut output, view.battle_turn_count);
    output.push_str(",\"lightScreenUp\":");
    push_bool(&mut output, view.light_screen_up);
    output.push_str(",\"reflectUp\":");
    push_bool(&mut output, view.reflect_up);
    push_optional_weather(&mut output, view.current_weather);
    output.push_str(",\"isRooted\":");
    push_bool(&mut output, view.is_rooted);
    push_optional_bool(
        &mut output,
        "attackerFutureAttackUp",
        view.attacker_future_attack_up,
    );
    push_optional_bool(&mut output, "isInfatuated", view.is_infatuated);
    push_optional_bool(&mut output, "safeguardUp", view.safeguard_up);
    push_optional_bool(&mut output, "isAsleep", view.is_asleep);
    push_optional_bool(&mut output, "hasCurableStatus", view.has_curable_status);
    push_optional_bool(&mut output, "hasSubstitute", view.has_substitute);
    push_optional_bool(&mut output, "hasFocusEnergy", view.has_focus_energy);
    push_optional_bool(&mut output, "isLeechSeeded", view.is_leech_seeded);
    push_optional_bool(&mut output, "hasYawn", view.has_yawn);
    push_optional_number(&mut output, "protectUses", view.protect_uses);
    output.push('}');
    output
}

fn render_target(view: &FactoryAiScoredTargetView) -> String {
    let mut output = String::from("{\"species\":");
    push_number(&mut output, view.species);
    output.push_str(",\"types\":");
    push_string_array(&mut output, &view.types);
    output.push_str(",\"attack\":");
    push_number(&mut output, view.attack);
    output.push_str(",\"defense\":");
    push_number(&mut output, view.defense);
    output.push_str(",\"spAttack\":");
    push_number(&mut output, view.sp_attack);
    output.push_str(",\"spDefense\":");
    push_number(&mut output, view.sp_defense);
    output.push_str(",\"speed\":");
    push_number(&mut output, view.speed);
    output.push_str(",\"level\":");
    push_number(&mut output, view.level);
    output.push_str(",\"statStages\":");
    push_stat_stages(&mut output, view.stat_stages);
    output.push_str(",\"isFirstTurn\":");
    push_number(&mut output, view.is_first_turn);
    output.push_str(",\"hp\":");
    push_number(&mut output, view.hp);
    output.push_str(",\"maxHp\":");
    push_number(&mut output, view.max_hp);
    output.push_str(",\"lastUsedMoveId\":");
    push_number(&mut output, view.last_used_move_id);
    push_optional_bool(&mut output, "hasAnyStatus", view.has_any_status);
    push_optional_bool(&mut output, "isAsleep", view.is_asleep);
    output.push_str(",\"isToxicPoisoned\":");
    push_bool(&mut output, view.is_toxic_poisoned);
    output.push_str(",\"isLeechSeeded\":");
    push_bool(&mut output, view.is_leech_seeded);
    output.push_str(",\"isCursed\":");
    push_bool(&mut output, view.is_cursed);
    push_optional_bool(&mut output, "isConfused", view.is_confused);
    push_optional_bool(&mut output, "isTaunted", view.is_taunted);
    push_optional_bool(&mut output, "isInfatuated", view.is_infatuated);
    push_optional_bool(&mut output, "isEscapePrevented", view.is_escape_prevented);
    push_optional_bool(&mut output, "isTormented", view.is_tormented);
    push_optional_bool(&mut output, "isNightmared", view.is_nightmared);
    push_optional_bool(&mut output, "isForesighted", view.is_foresighted);
    push_optional_bool(&mut output, "hasYawn", view.has_yawn);
    push_optional_bool(&mut output, "hasPerishSong", view.has_perish_song);
    output.push_str(",\"ability\":");
    push_string(&mut output, &view.ability);
    output.push_str(",\"knownAbility\":");
    if let Some(ability) = &view.known_ability {
        push_string(&mut output, ability);
    } else {
        output.push_str("null");
    }
    output.push_str(",\"knownItemEffect\":");
    push_number(&mut output, view.known_item_effect);
    if let Some(moves) = &view.known_move_ids {
        output.push_str(",\"knownMoveIds\":");
        push_number_array(&mut output, moves);
    }
    push_optional_bool(&mut output, "safeguardUp", view.safeguard_up);
    push_optional_bool(&mut output, "spikesUp", view.spikes_up);
    push_optional_bool(
        &mut output,
        "targetFutureAttackUp",
        view.target_future_attack_up,
    );
    output.push('}');
    output
}

fn render_view(view: &FactoryAiScoredView) -> String {
    let mut output = String::from("{\"schema\":");
    push_string(&mut output, view.schema);
    output.push_str(",\"mode\":");
    push_string(&mut output, view.mode);
    output.push_str(",\"active\":{\"aiBattler\":");
    output.push_str(&view.active.ai_battler.to_string());
    output.push_str(",\"targetBattler\":");
    output.push_str(&view.active.target_battler.to_string());
    output.push_str("},\"factory\":{\"levelMode\":");
    output.push_str(&view.factory.level_mode.to_string());
    output.push_str(",\"battleMode\":");
    output.push_str(&view.factory.battle_mode.to_string());
    output.push_str(",\"factoryWinStreak\":");
    push_number(&mut output, view.factory.factory_win_streak);
    output.push_str(",\"trainerOpponentId\":");
    push_number(&mut output, view.factory.trainer_opponent_id);
    output.push_str("},\"moves\":");
    push_number_array(&mut output, &view.moves);
    output.push_str(",\"attacker\":");
    output.push_str(&render_attacker(&view.attacker));
    output.push_str(",\"target\":");
    output.push_str(&render_target(&view.target));
    output.push('}');
    output
}

#[test]
fn complete_success_views_and_reachable_errors_match_canonical_typescript() {
    assert_eq!(FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_CASES.len(), 17);
    for (index, case) in FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_CASES.iter().enumerate() {
        match execute_case(case) {
            Ok(result) => {
                assert!(
                    case.expected_error.is_none(),
                    "case {index} ({})",
                    case.label
                );
                assert_eq!(
                    Some(result.as_str()),
                    case.expected_json,
                    "case {index} ({})",
                    case.label
                );
            }
            Err(error) => {
                assert!(
                    case.expected_json.is_none(),
                    "case {index} ({})",
                    case.label
                );
                assert_eq!(
                    Some(error.as_str()),
                    case.expected_error,
                    "case {index} ({})",
                    case.label
                );
            }
        }
    }
}

#[test]
fn category_census_is_ratchet_pinned() {
    let mut observed = BTreeMap::new();
    for case in FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_CASES {
        *observed.entry(case.category).or_insert(0usize) += 1;
    }
    let expected = FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_VECTOR_CATEGORY_COUNTS
        .iter()
        .copied()
        .collect::<BTreeMap<_, _>>();
    assert_eq!(observed, expected);
    assert_eq!(FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_CASES.len(), 17);
}
