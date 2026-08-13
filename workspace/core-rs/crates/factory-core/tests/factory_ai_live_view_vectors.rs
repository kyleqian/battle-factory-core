//! Differential test for the two isolated Factory-AI live-view projections.
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-factory-ai-live-view-vectors.mjs`.

use std::collections::BTreeMap;
use std::fmt::Write;

use factory_core::factory_ai_live_view::{
    current_weather, stat_stages, FactoryAiStatStages, FactoryAiWeather,
};
use factory_core::factory_ai_live_view_vectors_gen::{
    FactoryAiLiveViewProjectionCase, FACTORY_AI_LIVE_VIEW_PROJECTION_CASES,
    FACTORY_AI_LIVE_VIEW_VECTOR_CATEGORY_COUNTS,
};

fn push_number(output: &mut String, value: f64) {
    // This matches JSON.stringify for the finite number surface deliberately
    // exercised by the stage vectors. Weather's non-finite inputs only affect
    // the optional enum output, never this renderer.
    if !value.is_finite() {
        output.push_str("null");
    } else if value == 0.0 {
        output.push('0');
    } else if value.fract() == 0.0 && value.abs() < 1e21 {
        write!(output, "{value:.0}").unwrap();
    } else {
        output.push_str(&value.to_string());
    }
}

fn push_stages(output: &mut String, stages: FactoryAiStatStages) {
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

fn weather_value(weather: Option<FactoryAiWeather>) -> Option<u8> {
    weather.map(FactoryAiWeather::ai_weather_value)
}

fn execute_case(case: &FactoryAiLiveViewProjectionCase) -> String {
    let mut output = String::from("{\"currentWeather\":");
    match weather_value(current_weather(case.weather)) {
        Some(value) => write!(output, "{value}").unwrap(),
        None => output.push_str("null"),
    }
    output.push_str(",\"attackerStages\":");
    push_stages(&mut output, stat_stages(&case.attacker));
    output.push_str(",\"targetStages\":");
    push_stages(&mut output, stat_stages(&case.target));
    output.push('}');
    output
}

#[test]
fn projections_match_canonical_typescript() {
    assert_eq!(FACTORY_AI_LIVE_VIEW_PROJECTION_CASES.len(), 25);
    for (index, case) in FACTORY_AI_LIVE_VIEW_PROJECTION_CASES.iter().enumerate() {
        assert_eq!(
            execute_case(case),
            case.expected_json,
            "case {index} ({})",
            case.label
        );
    }
}

#[test]
fn category_census_is_ratchet_pinned() {
    let mut observed = BTreeMap::new();
    for case in FACTORY_AI_LIVE_VIEW_PROJECTION_CASES {
        *observed.entry(case.category).or_insert(0usize) += 1;
    }
    let expected = FACTORY_AI_LIVE_VIEW_VECTOR_CATEGORY_COUNTS
        .iter()
        .copied()
        .collect::<BTreeMap<_, _>>();
    assert_eq!(observed, expected);
    assert_eq!(FACTORY_AI_LIVE_VIEW_PROJECTION_CASES.len(), 25);
}
