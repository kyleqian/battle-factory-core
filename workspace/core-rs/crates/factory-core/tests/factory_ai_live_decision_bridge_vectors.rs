use factory_core::factory_ai_check_bad_move::BattleRngState;
use factory_core::factory_ai_check_viability::{CheckViabilityDraw, CvDrawKind};
use factory_core::factory_ai_decision_policy::{
    FactoryAiDecisionSide, FactoryAiLegalDecision, FactoryAiMoveDecision,
    FactoryAiMovePolicyRequest, FactoryAiMoveSlot, FactoryAiRngDraw, FactoryAiScoredChoice,
    FactoryAiScoredDraw, FactoryAiTurnStartRandomNumber,
};
use factory_core::factory_ai_live_decision_bridge::{
    choose_factory_ai_decision_from_live_view, choose_factory_ai_mask_zero_decision_from_live_view,
    choose_factory_ai_scored_decision_from_live_view, FactoryAiLiveDecisionInput,
};
use factory_core::factory_ai_live_decision_bridge_vectors_gen::{
    FactoryAiLiveDecisionBattlerVector, FactoryAiLiveDecisionCase,
    FactoryAiLiveDecisionHistoryVector, FACTORY_AI_LIVE_DECISION_BRIDGE_CASES,
    FACTORY_AI_LIVE_DECISION_BRIDGE_CATEGORY_COUNTS,
};
use factory_core::factory_ai_live_view::{
    create_factory_ai_view_from_live_rules, FactoryAiChallengePolicy, FactoryAiLiveRulesBattler,
    FactoryAiLiveRulesContext, FactoryAiLiveViewInput,
};
use factory_core::factory_ai_mask::FactoryAiPolicyBranchId;

struct Hash64(u64);

impl Hash64 {
    fn new() -> Self {
        Self(0xcbf2_9ce4_8422_2325)
    }

    fn add(&mut self, mut value: u64) {
        for _ in 0..8 {
            self.0 ^= value & 0xff;
            self.0 = self.0.wrapping_mul(0x100_0000_01b3);
            value >>= 8;
        }
    }

    fn option(&mut self, value: Option<u64>) {
        self.add(u64::from(value.is_some()));
        if let Some(value) = value {
            self.add(value);
        }
    }
}

fn add_rng(hash: &mut Hash64, rng: BattleRngState) {
    hash.add(u64::from(rng.value));
    hash.add(u64::from(rng.calls));
}

fn branch_id(branch: FactoryAiPolicyBranchId) -> u64 {
    branch as u64
}

fn add_receipt(hash: &mut Hash64, receipt: factory_core::factory_ai_mask::FactoryAiMaskSelection) {
    let receipt = receipt.receipt;
    hash.add(u64::from(receipt.inputs.level_mode));
    hash.add(u64::from(receipt.inputs.battle_mode));
    hash.add(u64::from(receipt.inputs.factory_win_streak));
    hash.add(u64::from(receipt.inputs.trainer_opponent_id));
    hash.add(u64::from(receipt.is_frontier_brain));
    hash.add(u64::from(receipt.frontier_stages_per_challenge));
    hash.option(receipt.challenge_number.map(u64::from));
    hash.add(u64::from(receipt.evaluation_count));
    for evaluation in receipt.evaluations[..receipt.evaluation_count as usize].iter() {
        hash.add(branch_id(evaluation.branch));
        hash.add(u64::from(evaluation.matched));
    }
    hash.add(branch_id(receipt.branch));
    hash.add(u64::from(receipt.mask));
}

fn add_common_draw(
    hash: &mut Hash64,
    ordinal: u32,
    before: BattleRngState,
    after: BattleRngState,
    raw_rng_value: u32,
    random_value: u16,
) {
    hash.add(u64::from(ordinal));
    add_rng(hash, before);
    add_rng(hash, after);
    hash.add(u64::from(raw_rng_value));
    hash.add(u64::from(random_value));
}

fn hash_mask_zero(
    choice: &factory_core::factory_ai_decision_policy::FactoryAiMaskZeroDecisionChoice,
) -> u64 {
    let mut hash = Hash64::new();
    hash.add(u64::from(choice.submission.request_id));
    hash.add(choice.submission.side as u64);
    hash.add(choice.submission.decision.move_slot as u64);
    hash.add(u64::from(choice.submission.decision.target_battler));
    add_rng(&mut hash, choice.rng);
    let trace = &choice.trace;
    hash.add(u64::from(trace.mask));
    add_receipt(&mut hash, trace.mask_selection);
    hash.add(0);
    hash.add(5);
    for draw in trace.draws {
        match draw {
            FactoryAiRngDraw::SetupSimulatedRng(draw) => {
                hash.add(0);
                hash.add(draw.move_slot as u64);
                add_common_draw(
                    &mut hash,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
                hash.add(u64::from(draw.simulated_rng));
            }
            FactoryAiRngDraw::BestMoveTie(draw) => {
                hash.add(1);
                add_common_draw(
                    &mut hash,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
            }
        }
    }
    hash.add(4);
    for score in trace.slot_scores {
        hash.add(score.move_slot as u64);
        hash.add(u64::from(score.move_id));
        hash.add(u64::from(score.legal));
        hash.add(score.initial_score as i64 as u64);
        hash.add(score.final_score as i64 as u64);
    }
    hash.add(u64::from(trace.best_move_slot_count));
    for slot in trace.best_move_slots[..trace.best_move_slot_count as usize].iter() {
        hash.add(*slot as u64);
    }
    hash.add(u64::from(trace.tie_modulus));
    hash.add(u64::from(trace.tie_index));
    hash.add(trace.chosen_decision.move_slot as u64);
    hash.add(u64::from(trace.chosen_decision.target_battler));
    hash.0
}

fn cv_site(kind: CvDrawKind) -> u64 {
    match kind {
        CvDrawKind::Sleep => 0,
        CvDrawKind::Pursuit => 1,
        CvDrawKind::Roar => 2,
        CvDrawKind::Paralyze => 3,
        CvDrawKind::EvasionUp1 => 1,
        CvDrawKind::EvasionUp2 => 2,
        CvDrawKind::EvasionUp3 => 3,
        CvDrawKind::EvasionUp4 => 4,
        CvDrawKind::EvasionUp5 => 5,
        CvDrawKind::EvasionUp6 => 6,
        CvDrawKind::EvasionUp7 => 7,
        CvDrawKind::EvasionUp8 => 8,
        other => panic!("unexpected CV draw kind in bridge corpus: {other:?}"),
    }
}

fn hash_scored(choice: &FactoryAiScoredChoice) -> u64 {
    let mut hash = Hash64::new();
    hash.add(u64::from(choice.submission.request_id));
    hash.add(choice.submission.side as u64);
    hash.add(choice.submission.decision.move_slot as u64);
    hash.add(u64::from(choice.submission.decision.target_battler));
    add_rng(&mut hash, choice.rng);
    let trace = &choice.trace;
    hash.add(u64::from(trace.mask));
    add_receipt(&mut hash, trace.mask_selection);
    hash.add(u64::from(trace.executed_scoring_script_count));
    for script in trace.executed_scoring_scripts[..trace.executed_scoring_script_count as usize]
        .iter()
        .flatten()
    {
        hash.add(*script as u64);
    }
    hash.add(trace.turn_start_random_number.owner as u64);
    hash.option(trace.turn_start_random_number.value.map(u64::from));
    hash.add(u64::from(trace.draw_count));
    for draw in trace.draws[..trace.draw_count as usize].iter().flatten() {
        match *draw {
            FactoryAiScoredDraw::SetupSimulatedRng(draw) => {
                hash.add(0);
                hash.add(draw.move_slot as u64);
                add_common_draw(
                    &mut hash,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
                hash.add(u64::from(draw.simulated_rng));
            }
            FactoryAiScoredDraw::BestMoveTie(draw) => {
                hash.add(1);
                add_common_draw(
                    &mut hash,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
            }
            FactoryAiScoredDraw::TurnStartRandomNumber(draw) => {
                hash.add(2);
                add_common_draw(
                    &mut hash,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
            }
            FactoryAiScoredDraw::CheckBadMove { move_slot, draw } => {
                hash.add(3);
                hash.add(move_slot as u64);
                hash.add(draw.site as u64);
                add_common_draw(
                    &mut hash,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
                hash.add(u64::from(draw.guessed_ability));
            }
            FactoryAiScoredDraw::TryToFaint { move_slot, draw } => {
                hash.add(4);
                hash.add(move_slot as u64);
                add_common_draw(
                    &mut hash,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
                hash.add(u64::from(draw.succeeded));
            }
            FactoryAiScoredDraw::CheckViability { move_slot, draw } => match draw {
                CheckViabilityDraw::TargetFasterTie {
                    ordinal,
                    before,
                    after,
                    raw_rng_value,
                    random_value,
                    strikes_first,
                } => {
                    hash.add(5);
                    hash.add(move_slot as u64);
                    hash.add(0);
                    add_common_draw(
                        &mut hash,
                        ordinal,
                        before,
                        after,
                        raw_rng_value,
                        random_value,
                    );
                    hash.add(u64::from(strikes_first));
                }
                CheckViabilityDraw::SpeedDownRoll {
                    ordinal,
                    before,
                    after,
                    raw_rng_value,
                    random_value,
                    succeeded,
                } => {
                    hash.add(6);
                    hash.add(move_slot as u64);
                    hash.add(0);
                    add_common_draw(
                        &mut hash,
                        ordinal,
                        before,
                        after,
                        raw_rng_value,
                        random_value,
                    );
                    hash.add(u64::from(succeeded));
                }
                CheckViabilityDraw::PursuitSleepRoarParalyzeRoll {
                    ordinal,
                    before,
                    after,
                    raw_rng_value,
                    random_value,
                    kind,
                    succeeded,
                } => {
                    hash.add(8);
                    hash.add(move_slot as u64);
                    hash.add(cv_site(kind));
                    add_common_draw(
                        &mut hash,
                        ordinal,
                        before,
                        after,
                        raw_rng_value,
                        random_value,
                    );
                    hash.add(u64::from(succeeded));
                }
                CheckViabilityDraw::EvasionUpRoll {
                    ordinal,
                    before,
                    after,
                    raw_rng_value,
                    random_value,
                    kind,
                    succeeded,
                } => {
                    hash.add(7);
                    hash.add(move_slot as u64);
                    hash.add(cv_site(kind));
                    add_common_draw(
                        &mut hash,
                        ordinal,
                        before,
                        after,
                        raw_rng_value,
                        random_value,
                    );
                    hash.add(u64::from(succeeded));
                }
                other => panic!("unexpected CV draw in bridge corpus: {other:?}"),
            },
        }
    }
    hash.add(4);
    for score in trace.slot_scores {
        hash.add(score.move_slot as u64);
        hash.add(u64::from(score.move_id));
        hash.add(u64::from(score.legal));
        hash.add(score.initial_score as i64 as u64);
        hash.option(score.check_bad_move_delta.map(|value| value as i64 as u64));
        hash.option(score.try_to_faint_delta.map(|value| value as i64 as u64));
        hash.option(score.check_viability_delta.map(|value| value as i64 as u64));
        hash.add(score.final_score as i64 as u64);
    }
    hash.add(u64::from(trace.best_move_slot_count));
    for slot in trace.best_move_slots[..trace.best_move_slot_count as usize].iter() {
        hash.add(*slot as u64);
    }
    hash.add(u64::from(trace.tie_modulus));
    hash.add(u64::from(trace.tie_index));
    hash.add(trace.chosen_decision.move_slot as u64);
    hash.add(u64::from(trace.chosen_decision.target_battler));
    hash.0
}

fn native_battler(value: FactoryAiLiveDecisionBattlerVector) -> FactoryAiLiveRulesBattler {
    FactoryAiLiveRulesBattler {
        types: [value.types[0].to_owned(), value.types[1].to_owned()],
        attack: value.attack,
        defense: value.defense,
        sp_attack: value.sp_attack,
        sp_defense: value.sp_defense,
        speed: value.speed,
        level: value.level,
        stat_stages: value.stat_stages,
        is_first_turn: value.is_first_turn,
        hp: value.hp,
        max_hp: value.max_hp,
        ability: value.ability,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        protect_uses: value.protect_uses,
        taunt_timer: value.taunt_timer,
        species: value.species,
        moves: value.moves,
    }
}

fn native_history(
    value: FactoryAiLiveDecisionHistoryVector,
) -> factory_core::factory_ai_battle_history::FactoryAiBattleHistory {
    factory_core::factory_ai_battle_history::FactoryAiBattleHistory {
        used_moves: value.used_moves.map(|row| row.to_vec()),
        known_abilities: value
            .known_abilities
            .map(|ability| ability.map(str::to_owned)),
        known_item_effects: value.known_item_effects,
        party_indexes: value.party_indexes,
    }
}

fn legal_decisions(mask: u8) -> Vec<FactoryAiLegalDecision> {
    FactoryAiMoveSlot::ALL
        .into_iter()
        .filter(|slot| mask & (1 << (*slot as u8)) != 0)
        .map(|move_slot| {
            FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
                move_slot,
                target_battler: if move_slot == FactoryAiMoveSlot::Slot2 {
                    1
                } else {
                    0
                },
            })
        })
        .collect()
}

fn input<'a>(
    case: &FactoryAiLiveDecisionCase,
    view: &'a factory_core::factory_ai_live_view::FactoryAiScoredView,
    decisions: &'a [FactoryAiLegalDecision],
) -> FactoryAiLiveDecisionInput<'a> {
    FactoryAiLiveDecisionInput {
        view,
        request: FactoryAiMovePolicyRequest {
            kind: factory_core::factory_ai_decision_policy::FactoryAiRequestKind::Command,
            request_id: 91,
            side: FactoryAiDecisionSide::Trainer,
            battler: 1,
            legal_decisions: decisions,
        },
        rng: BattleRngState { value: case.seed, calls: case.calls },
        turn_start_random_number: match case.turn_mode {
            0 => None,
            1 => Some(FactoryAiTurnStartRandomNumber::Decision),
            2 => Some(FactoryAiTurnStartRandomNumber::BattleTurnBoundary { value: 0x4321 }),
            other => panic!("unknown turn mode {other}"),
        },
    }
}

fn run_case(case: &FactoryAiLiveDecisionCase) -> u64 {
    let view = native_view(case);
    let decisions = legal_decisions(case.legal_mask);
    let bridge_input = input(case, &view, &decisions);
    if case.chooser == 0 {
        let result = choose_factory_ai_mask_zero_decision_from_live_view(bridge_input)
            .unwrap_or_else(|error| panic!("{} mask-zero bridge failed: {error}", case.label));
        hash_mask_zero(&result)
    } else {
        let result = choose_factory_ai_scored_decision_from_live_view(bridge_input)
            .unwrap_or_else(|error| panic!("{} scored bridge failed: {error}", case.label));
        hash_scored(&result)
    }
}

fn native_view(
    case: &FactoryAiLiveDecisionCase,
) -> factory_core::factory_ai_live_view::FactoryAiScoredView {
    let battlers = case.battlers.map(native_battler);
    let rules = FactoryAiLiveRulesContext {
        battlers,
        weather: case.weather,
        side_statuses: case.side_statuses,
        last_moves: case.last_moves,
    };
    let history = native_history(case.history);
    create_factory_ai_view_from_live_rules(FactoryAiLiveViewInput {
        rules_context: &rules,
        history: &history,
        challenge: FactoryAiChallengePolicy {
            factory_win_streak: case.streak,
            trainer_opponent_id: case.trainer_opponent_id,
            battle_turn_count: case
                .battle_turn_count_present
                .then_some(case.battle_turn_count),
        },
    })
    .unwrap_or_else(|error| panic!("{} constructor failed: {error}", case.label))
}

#[test]
fn category_census_is_checked_in_and_complete() {
    assert_eq!(FACTORY_AI_LIVE_DECISION_BRIDGE_CATEGORY_COUNTS.len(), 9);
    assert_eq!(
        FACTORY_AI_LIVE_DECISION_BRIDGE_CASES.len(),
        FACTORY_AI_LIVE_DECISION_BRIDGE_CATEGORY_COUNTS
            .iter()
            .map(|(_, count)| count)
            .sum::<usize>()
    );
    for (category, expected) in FACTORY_AI_LIVE_DECISION_BRIDGE_CATEGORY_COUNTS {
        assert_eq!(
            FACTORY_AI_LIVE_DECISION_BRIDGE_CASES
                .iter()
                .filter(|case| case.category == category)
                .count(),
            expected,
            "category {category}"
        );
    }
}

#[test]
fn canonical_ts_live_constructor_to_chooser_receipts_match() {
    for case in FACTORY_AI_LIVE_DECISION_BRIDGE_CASES {
        assert_eq!(
            run_case(&case),
            case.expected_hash,
            "complete receipt mismatch for {}",
            case.label
        );
    }
}

#[test]
fn direct_chooser_entries_keep_their_existing_projection_error_labels() {
    let mask_zero_case = &FACTORY_AI_LIVE_DECISION_BRIDGE_CASES[0];
    let mut mask_zero_view = native_view(mask_zero_case);
    mask_zero_view.factory.factory_win_streak = 65_536.0;
    let mask_zero_decisions = legal_decisions(mask_zero_case.legal_mask);
    let error = choose_factory_ai_mask_zero_decision_from_live_view(input(
        mask_zero_case,
        &mask_zero_view,
        &mask_zero_decisions,
    ))
    .unwrap_err();
    assert_eq!(
        error.to_string(),
        "Factory AI live decision view.factory.factoryWinStreak must be a native integer"
    );

    let scored_case = &FACTORY_AI_LIVE_DECISION_BRIDGE_CASES[4];
    let mut scored_view = native_view(scored_case);
    scored_view.factory.trainer_opponent_id = -1.0;
    let scored_decisions = legal_decisions(scored_case.legal_mask);
    let error = choose_factory_ai_scored_decision_from_live_view(input(
        scored_case,
        &scored_view,
        &scored_decisions,
    ))
    .unwrap_err();
    assert_eq!(
        error.to_string(),
        "Factory AI live decision view.factory.trainerOpponentId must be a native integer"
    );
}

#[test]
fn composite_projection_keeps_select_factory_ai_mask_range_text() {
    let case = &FACTORY_AI_LIVE_DECISION_BRIDGE_CASES[0];
    let mut view = native_view(case);
    view.factory.factory_win_streak = f64::NAN;
    let decisions = legal_decisions(case.legal_mask);
    let error =
        choose_factory_ai_decision_from_live_view(input(case, &view, &decisions)).unwrap_err();
    assert_eq!(
        error.to_string(),
        "factoryWinStreak must be an integer from 0 through 65535"
    );
}
