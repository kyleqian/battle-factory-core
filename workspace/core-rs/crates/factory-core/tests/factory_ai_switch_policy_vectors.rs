//! Full-object differential test for `factoryAiSwitchPolicy.ts`. Regenerate
//! with `node --experimental-strip-types
//! core-rs/tools/gen-factory-ai-switch-policy-vectors.mjs`.

use std::fmt::Write;

use factory_core::factory_ai_switch_policy::{
    evaluate_factory_ai_switch_policy, is_factory_ai_switch_precheck_blocked,
    FactoryAiSwitchBranchKind, FactoryAiSwitchBranchOutcome, FactoryAiSwitchChoice,
    FactoryAiSwitchDrawKind, FactoryAiSwitchPolicyResult,
};
use factory_core::factory_ai_switch_policy_vectors_gen::FACTORY_AI_SWITCH_POLICY_CASES;

fn choice_name(choice: FactoryAiSwitchChoice) -> &'static str {
    match choice {
        FactoryAiSwitchChoice::Chosen { .. } => "chosen",
        FactoryAiSwitchChoice::Sentinel => "sentinel",
        FactoryAiSwitchChoice::NoSwitch => "no-switch",
    }
}

fn draw_kind(kind: FactoryAiSwitchDrawKind) -> &'static str {
    match kind {
        FactoryAiSwitchDrawKind::WonderGuardCandidate => "wonder-guard-candidate",
        FactoryAiSwitchDrawKind::AbsorberActiveSuperEffective => "absorber-active-super-effective",
        FactoryAiSwitchDrawKind::AbsorberCandidate => "absorber-candidate",
        FactoryAiSwitchDrawKind::NaturalCureEarly => "natural-cure-early",
        FactoryAiSwitchDrawKind::NaturalCureStatusMove => "natural-cure-status-move",
        FactoryAiSwitchDrawKind::NaturalCureDefensive => "natural-cure-defensive",
        FactoryAiSwitchDrawKind::NaturalCureFinal => "natural-cure-final",
        FactoryAiSwitchDrawKind::ActiveSuperEffective => "active-super-effective",
        FactoryAiSwitchDrawKind::ImmunityFallback => "immunity-fallback",
        FactoryAiSwitchDrawKind::NotVeryEffectiveFallback => "not-very-effective-fallback",
    }
}

fn branch_name(branch: FactoryAiSwitchBranchKind) -> &'static str {
    match branch {
        FactoryAiSwitchBranchKind::WrappedOrEscapePrevented => "wrapped-or-escape-prevented",
        FactoryAiSwitchBranchKind::Rooted => "rooted",
        FactoryAiSwitchBranchKind::ShadowTag => "shadow-tag",
        FactoryAiSwitchBranchKind::ArenaTrap => "arena-trap",
        FactoryAiSwitchBranchKind::MagnetPullSteel => "magnet-pull-steel",
        FactoryAiSwitchBranchKind::BattleArena => "battle-arena",
        FactoryAiSwitchBranchKind::AvailableBench => "available-bench",
        FactoryAiSwitchBranchKind::PerishSong => "perish-song",
        FactoryAiSwitchBranchKind::WonderGuard => "wonder-guard",
        FactoryAiSwitchBranchKind::Absorber => "absorber",
        FactoryAiSwitchBranchKind::NaturalCure => "natural-cure",
        FactoryAiSwitchBranchKind::ActiveSuperEffective => "active-super-effective",
        FactoryAiSwitchBranchKind::StatsRaised => "stats-raised",
        FactoryAiSwitchBranchKind::ImmunityFallback => "immunity-fallback",
        FactoryAiSwitchBranchKind::NotVeryEffectiveFallback => "not-very-effective-fallback",
        FactoryAiSwitchBranchKind::SuitableSelector => "suitable-selector",
        FactoryAiSwitchBranchKind::FirstLegalFallback => "first-legal-fallback",
    }
}

fn outcome_name(outcome: FactoryAiSwitchBranchOutcome) -> &'static str {
    match outcome {
        FactoryAiSwitchBranchOutcome::Pass => "pass",
        FactoryAiSwitchBranchOutcome::Blocked => "blocked",
        FactoryAiSwitchBranchOutcome::Selected => "selected",
        FactoryAiSwitchBranchOutcome::Suppressed => "suppressed",
        FactoryAiSwitchBranchOutcome::None => "none",
    }
}

fn option_u8(output: &mut String, value: Option<u8>) {
    match value {
        Some(value) => write!(output, "{value}").unwrap(),
        None => output.push_str("null"),
    }
}

fn render_result(result: &FactoryAiSwitchPolicyResult) -> String {
    let mut output = String::new();
    write!(
        output,
        "{{\"schema\":\"{}\",\"choice\":{{\"kind\":\"{}\"",
        result.schema,
        choice_name(result.choice)
    )
    .unwrap();
    if let FactoryAiSwitchChoice::Chosen { party_index } = result.choice {
        write!(output, ",\"partyIndex\":{party_index}").unwrap();
    }
    output.push_str("},\"selectedPartyIndex\":");
    option_u8(&mut output, result.selected_party_index);
    write!(
        output,
        ",\"rng\":{{\"value\":{},\"calls\":{}}},\"draws\":[",
        result.rng.value, result.rng.calls
    )
    .unwrap();
    for (index, draw) in result.draws.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        write!(output, "{{\"ordinal\":{},\"reason\":\"{}\",\"kind\":\"{}\",\"before\":{{\"value\":{},\"calls\":{}}},\"after\":{{\"value\":{},\"calls\":{}}},\"rawRngValue\":{},\"randomValue\":{},\"modulus\":{},\"remainder\":{},\"succeeded\":{},\"partyIndex\":", draw.ordinal, draw.reason, draw_kind(draw.kind), draw.before.value, draw.before.calls, draw.after.value, draw.after.calls, draw.raw_rng_value, draw.random_value, draw.modulus, draw.remainder, draw.succeeded).unwrap();
        option_u8(&mut output, draw.party_index);
        output.push_str(",\"moveSlot\":");
        option_u8(&mut output, draw.move_slot);
        output.push('}');
    }
    output.push_str("],\"branches\":[");
    for (index, branch) in result.branches.iter().enumerate() {
        if index != 0 {
            output.push(',');
        }
        write!(
            output,
            "{{\"ordinal\":{},\"branch\":\"{}\",\"outcome\":\"{}\",\"partyIndex\":",
            branch.ordinal,
            branch_name(branch.branch),
            outcome_name(branch.outcome)
        )
        .unwrap();
        option_u8(&mut output, branch.party_index);
        output.push('}');
    }
    output.push_str("]}");
    output
}

#[test]
fn complete_results_and_errors_match_canonical_typescript() {
    assert_eq!(FACTORY_AI_SWITCH_POLICY_CASES.len(), 415);
    for (index, case) in FACTORY_AI_SWITCH_POLICY_CASES.iter().enumerate() {
        assert_eq!(
            is_factory_ai_switch_precheck_blocked(&case.input.rules),
            case.expected_precheck_blocked,
            "precheck case {index} ({})",
            case.label,
        );
        match evaluate_factory_ai_switch_policy(&case.input) {
            Ok(result) => assert_eq!(
                Some(render_result(&result).as_str()),
                case.expected_json,
                "case {index} ({})",
                case.label,
            ),
            Err(error) => assert_eq!(
                Some(error.to_string().as_str()),
                case.expected_error,
                "case {index} ({})",
                case.label,
            ),
        }
    }
}

#[test]
fn corpus_covers_every_retained_kind() {
    use std::collections::BTreeSet;
    let mut draws = BTreeSet::new();
    let mut branches = BTreeSet::new();
    for case in FACTORY_AI_SWITCH_POLICY_CASES.iter() {
        if let Ok(result) = evaluate_factory_ai_switch_policy(&case.input) {
            draws.extend(result.draws.into_iter().map(|draw| draw_kind(draw.kind)));
            branches.extend(
                result
                    .branches
                    .into_iter()
                    .map(|branch| branch_name(branch.branch)),
            );
        }
    }
    assert_eq!(draws.len(), 10, "{draws:?}");
    // The canonical TS union currently declares 17 branch strings (the
    // assignment brief's census of 16 omits first-legal-fallback).
    assert_eq!(branches.len(), 17, "{branches:?}");
}
