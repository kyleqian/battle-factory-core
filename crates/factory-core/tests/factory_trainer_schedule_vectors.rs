//! Full-result differential test for `factoryTrainerSchedule.ts`.
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-factory-trainer-schedule-vectors.mjs`.

use std::collections::BTreeMap;
use std::fmt::Write;

use factory_core::factory_trainer_schedule::{
    generate_factory_trainer_schedule, select_factory_trainer, FactoryTrainerDrawLedgerEntry,
    FactoryTrainerRandomDraw, FactoryTrainerRangeKind, FactoryTrainerRngPort,
    FactoryTrainerScheduleResult, FactoryTrainerSelectionResult, GbaFactoryTrainerRng,
};
use factory_core::factory_trainer_schedule_vectors_gen::{
    FactoryTrainerScheduleVectorCase, FactoryTrainerScheduleVectorOperation,
    FactoryTrainerScheduleVectorRngMode, FACTORY_TRAINER_SCHEDULE_CASES,
    FACTORY_TRAINER_SCHEDULE_VECTOR_CATEGORY_COUNTS,
};

struct ScriptedRng<'a> {
    draws: &'a [factory_core::factory_trainer_schedule_vectors_gen::FactoryTrainerScheduleVectorDraw],
    index: usize,
}

impl FactoryTrainerRngPort for ScriptedRng<'_> {
    fn draw(&mut self, _rng_value: u32) -> FactoryTrainerRandomDraw {
        let draw = self
            .draws
            .get(self.index)
            .expect("vector's TS scripted port must not exhaust");
        self.index += 1;
        FactoryTrainerRandomDraw { rng_value: draw.rng_value, value: draw.value }
    }
}

fn range_kind_name(value: FactoryTrainerRangeKind) -> &'static str {
    match value {
        FactoryTrainerRangeKind::Normal => "normal",
        FactoryTrainerRangeKind::Hard => "hard",
    }
}

fn render_i64_slice(output: &mut String, values: &[i64]) {
    output.push('[');
    for (index, value) in values.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        write!(output, "{value}").unwrap();
    }
    output.push(']');
}

fn render_u16_slice(output: &mut String, values: &[u16]) {
    output.push('[');
    for (index, value) in values.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        write!(output, "{value}").unwrap();
    }
    output.push(']');
}

fn render_ledger(output: &mut String, ledger: &[FactoryTrainerDrawLedgerEntry]) {
    output.push('[');
    for (index, draw) in ledger.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        write!(
            output,
            "{{\"battleIndex\":{},\"attempt\":{},\"challenge\":{},\"rangeIndex\":{},\"rangeKind\":\"{}\",\"rangeStart\":{},\"rangeEnd\":{},\"rngBefore\":{},\"rngAfter\":{},\"raw\":{},\"trainerId\":{},\"accepted\":{}}}",
            draw.battle_index,
            draw.attempt,
            draw.challenge,
            draw.range_index,
            range_kind_name(draw.range_kind),
            draw.range_start,
            draw.range_end,
            draw.rng_before,
            draw.rng_after,
            draw.raw,
            draw.trainer_id,
            draw.accepted,
        )
        .unwrap();
    }
    output.push(']');
}

fn render_selection(result: &FactoryTrainerSelectionResult) -> String {
    let mut output = String::new();
    write!(
        output,
        "{{\"trainerId\":{},\"storedTrainerIds\":",
        result.trainer_id
    )
    .unwrap();
    render_i64_slice(&mut output, &result.stored_trainer_ids);
    write!(
        output,
        ",\"rngValue\":{},\"drawCount\":{},\"ledger\":",
        result.rng_value, result.draw_count
    )
    .unwrap();
    render_ledger(&mut output, &result.ledger);
    output.push('}');
    output
}

fn render_schedule(result: &FactoryTrainerScheduleResult) -> String {
    let mut output = String::new();
    output.push_str("{\"trainerIds\":");
    render_u16_slice(&mut output, &result.trainer_ids);
    output.push_str(",\"storedTrainerIds\":");
    render_i64_slice(&mut output, &result.stored_trainer_ids);
    write!(
        output,
        ",\"rngValue\":{},\"drawCount\":{},\"ledger\":",
        result.rng_value, result.draw_count
    )
    .unwrap();
    render_ledger(&mut output, &result.ledger);
    output.push('}');
    output
}

fn execute_case<R: FactoryTrainerRngPort + ?Sized>(
    case: &FactoryTrainerScheduleVectorCase,
    rng_port: &mut R,
) -> Result<String, String> {
    match case.operation {
        FactoryTrainerScheduleVectorOperation::Selection => select_factory_trainer(
            case.factory_win_streak,
            case.battle_index,
            case.stored_trainer_ids,
            case.rng_value,
            rng_port,
        )
        .map(|result| render_selection(&result))
        .map_err(|error| error.to_string()),
        FactoryTrainerScheduleVectorOperation::Schedule => {
            generate_factory_trainer_schedule(case.factory_win_streak, case.rng_value, rng_port)
                .map(|result| render_schedule(&result))
                .map_err(|error| error.to_string())
        }
    }
}

fn run_case(case: &FactoryTrainerScheduleVectorCase) -> Result<String, String> {
    match case.rng_mode {
        FactoryTrainerScheduleVectorRngMode::Gba => {
            let mut rng_port = GbaFactoryTrainerRng;
            execute_case(case, &mut rng_port)
        }
        FactoryTrainerScheduleVectorRngMode::Scripted => {
            let mut rng_port = ScriptedRng { draws: case.scripted_draws, index: 0 };
            execute_case(case, &mut rng_port)
        }
    }
}

#[test]
fn complete_results_and_errors_match_canonical_typescript() {
    assert_eq!(FACTORY_TRAINER_SCHEDULE_CASES.len(), 69);
    for (index, case) in FACTORY_TRAINER_SCHEDULE_CASES.iter().enumerate() {
        match run_case(case) {
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
    for case in FACTORY_TRAINER_SCHEDULE_CASES {
        *observed.entry(case.category).or_insert(0usize) += 1;
    }
    let expected = FACTORY_TRAINER_SCHEDULE_VECTOR_CATEGORY_COUNTS
        .iter()
        .copied()
        .collect::<BTreeMap<_, _>>();
    assert_eq!(observed, expected);
    assert_eq!(FACTORY_TRAINER_SCHEDULE_CASES.len(), 69);
}
