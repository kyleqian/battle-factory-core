//! Canonical-TS corpus for the pure scored DecisionPolicy. Regenerate with:
//! `node --experimental-strip-types core-rs/tools/gen-factory-ai-scored-decision-vectors.mjs`.

use factory_core::damage_calc::{
    StatStages, TYPE_BUG, TYPE_FLYING, TYPE_GRASS, TYPE_GROUND, TYPE_NORMAL, TYPE_PSYCHIC,
    TYPE_ROCK, TYPE_WATER,
};
use factory_core::factory_ai_check_bad_move::{BattleRngState, ABILITY_NONE, ABILITY_STURDY};
use factory_core::factory_ai_check_viability::{CheckViabilityDraw, CvDrawKind};
use factory_core::factory_ai_decision_policy::*;
use factory_core::factory_ai_mask::FactoryAiPolicyBranchId;
use factory_core::factory_ai_scored_decision_vectors_gen::{
    FACTORY_AI_SCORED_DECISION_CASES, FACTORY_AI_SCORED_DECISION_ERROR_CASES,
};

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

    fn option_i32(&mut self, value: Option<i32>) {
        self.add(u64::from(value.is_some()));
        if let Some(value) = value {
            self.add(value as i64 as u64);
        }
    }

    fn option_u32(&mut self, value: Option<u32>) {
        self.add(u64::from(value.is_some()));
        if let Some(value) = value {
            self.add(u64::from(value));
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

fn evasion_site(kind: CvDrawKind) -> u64 {
    match kind {
        CvDrawKind::EvasionUp1 => 1,
        CvDrawKind::EvasionUp2 => 2,
        CvDrawKind::EvasionUp3 => 3,
        CvDrawKind::EvasionUp4 => 4,
        CvDrawKind::EvasionUp5 => 5,
        CvDrawKind::EvasionUp6 => 6,
        CvDrawKind::EvasionUp7 => 7,
        CvDrawKind::EvasionUp8 => 8,
        other => panic!("unexpected EvasionUp kind in scored corpus: {other:?}"),
    }
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

fn full_receipt_hash(choice: &FactoryAiScoredChoice) -> u64 {
    let mut hash = Hash64::new();
    hash.add(u64::from(choice.submission.request_id));
    hash.add(choice.submission.side as u64);
    hash.add(choice.submission.decision.move_slot as u64);
    hash.add(u64::from(choice.submission.decision.target_battler));
    add_rng(&mut hash, choice.rng);

    let trace = &choice.trace;
    hash.add(u64::from(trace.mask));
    let receipt = trace.mask_selection.receipt;
    hash.add(u64::from(receipt.inputs.level_mode));
    hash.add(u64::from(receipt.inputs.battle_mode));
    hash.add(u64::from(receipt.inputs.factory_win_streak));
    hash.add(u64::from(receipt.inputs.trainer_opponent_id));
    hash.add(u64::from(receipt.is_frontier_brain));
    hash.add(u64::from(receipt.frontier_stages_per_challenge));
    hash.option_u32(receipt.challenge_number);
    hash.add(u64::from(receipt.evaluation_count));
    for evaluation in receipt.evaluations[..receipt.evaluation_count as usize].iter() {
        hash.add(branch_id(evaluation.branch));
        hash.add(u64::from(evaluation.matched));
    }
    hash.add(branch_id(receipt.branch));
    hash.add(u64::from(receipt.mask));
    hash.add(u64::from(trace.executed_scoring_script_count));
    for script in trace.executed_scoring_scripts[..trace.executed_scoring_script_count as usize]
        .iter()
        .flatten()
    {
        hash.add(*script as u64);
    }
    hash.add(trace.turn_start_random_number.owner as u64);
    hash.add(u64::from(trace.turn_start_random_number.value.is_some()));
    if let Some(value) = trace.turn_start_random_number.value {
        hash.add(u64::from(value));
    }

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
                    hash.add(evasion_site(kind));
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
                other => panic!("unexpected CV draw in scored corpus: {other:?}"),
            },
        }
    }

    hash.add(4);
    for score in trace.slot_scores {
        hash.add(score.move_slot as u64);
        hash.add(u64::from(score.move_id));
        hash.add(u64::from(score.legal));
        hash.add(score.initial_score as i64 as u64);
        hash.option_i32(score.check_bad_move_delta);
        hash.option_i32(score.try_to_faint_delta);
        hash.option_i32(score.check_viability_delta);
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

fn battler(types: [u8; 2]) -> FactoryAiScoredBattlerView {
    FactoryAiScoredBattlerView {
        types,
        attack: 100,
        defense: 100,
        sp_attack: 100,
        sp_defense: 100,
        speed: 100,
        level: 50,
        stat_stages: StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 },
        speed_stage: 6,
        acc_stage: 6,
        evasion_stage: 6,
        is_first_turn: 2,
        hp: 100,
        max_hp: 100,
        last_used_move_id: None,
        is_toxic_poisoned: None,
        has_any_status: None,
        is_confused: None,
        is_asleep: None,
        is_taunted: None,
        is_leech_seeded: None,
        is_infatuated: None,
        has_yawn: None,
        has_perish_song: None,
        is_nightmared: None,
        is_foresighted: None,
        spikes_up: None,
        target_future_attack_up: None,
        protect_uses: None,
        battle_turn_count: None,
        is_rooted: None,
        attacker_future_attack_up: None,
        has_focus_energy: None,
        has_curable_status: None,
        is_poisoned: None,
        is_burned: None,
        is_paralyzed: None,
        is_cursed: None,
        is_escape_prevented: None,
        is_tormented: None,
        light_screen_up: None,
        reflect_up: None,
        target_side_reflect_up: None,
        target_party_status_equals_any: None,
        safeguard_up: None,
        ability: ABILITY_NONE,
        hold_effect: None,
        current_weather: None,
        usable_party_mons: None,
        has_substitute: None,
        any_move_disabled: None,
        any_move_encored: None,
        mist_up: None,
        gender: None,
        imprisoned_others: None,
        mud_sport_up: None,
        water_sport_up: None,
        used_held_item_id: None,
        stockpile_count: None,
    }
}

fn scenario(id: u8) -> FactoryAiScoredView {
    let mut attacker = battler([TYPE_PSYCHIC, TYPE_PSYCHIC]);
    let mut target_battler = battler([TYPE_NORMAL, TYPE_NORMAL]);
    target_battler.ability = ABILITY_STURDY;
    let mut target = FactoryAiScoredTargetView {
        battler: target_battler,
        species: 213,
        known_ability: Some(ABILITY_STURDY),
        species_abilities: None,
        known_moves: None,
        known_moves_tail: None,
    };
    let mut moves = [150; 4];
    match id {
        0 => {}
        1 => {
            moves = [85, 150, 150, 150];
            target.species = 105;
            target.battler.types = [TYPE_GROUND, TYPE_GROUND];
            target.battler.ability = 69; // ABILITY_ROCK_HEAD
            target.known_ability = Some(69);
        }
        2 => {
            moves = [57, 157, 34, 85];
            target.species = 105;
            target.battler.types = [TYPE_GROUND, TYPE_GROUND];
            target.battler.hp = 5;
            target.battler.max_hp = 135;
            target.battler.ability = 69;
            target.known_ability = Some(69);
        }
        3 => {
            moves = [98, 1, 57, 150];
            target.battler.hp = 5;
        }
        4 => {
            moves = [81, 150, 150, 150];
            attacker.speed = 5;
            attacker.types = [TYPE_BUG, TYPE_ROCK];
            target.species = 51;
            target.battler.speed = 120;
            target.battler.hp = 999;
            target.battler.max_hp = 999;
            target.battler.types = [TYPE_GROUND, TYPE_GROUND];
            target.battler.ability = 71; // ABILITY_ARENA_TRAP
            target.known_ability = Some(71);
        }
        5 | 6 => {
            moves = if id == 5 {
                [81, 258, 150, 150]
            } else {
                [45, 258, 150, 150]
            };
            attacker.speed = 120;
            attacker.types = [TYPE_GROUND, TYPE_GROUND];
            target.battler.speed = 5;
            target.battler.hp = 999;
            target.battler.max_hp = 999;
            target.battler.types = [TYPE_BUG, TYPE_ROCK];
        }
        7 => {
            moves = [58, 150, 150, 150];
            target.species = 12;
            target.battler.hp = 999;
            target.battler.max_hp = 999;
            target.battler.types = [TYPE_GRASS, TYPE_FLYING];
        }
        8 => {
            moves = [57, 150, 150, 150];
            target.species = 183;
            target.battler.types = [TYPE_WATER, TYPE_WATER];
            target.battler.ability = 37; // ABILITY_HUGE_POWER
            target.known_ability = None;
        }
        9 => {
            moves = [104, 150, 150, 150];
            attacker.hp = 50;
            attacker.evasion_stage = 9;
            target.battler.is_toxic_poisoned = Some(true);
            target.battler.is_leech_seeded = Some(true);
            target.battler.is_cursed = Some(true);
            target.battler.is_infatuated = Some(true);
            target.battler.hp = 999;
            target.battler.max_hp = 999;
        }
        _ => panic!("unknown generated scenario {id}"),
    }
    FactoryAiScoredView {
        factory: factory_core::factory_ai_mask::FactoryAiMaskSelectionInput {
            level_mode: 0,
            battle_mode: 0,
            factory_win_streak: 0,
            trainer_opponent_id: 222,
        },
        moves,
        attacker,
        target,
    }
}

fn legal_decisions(mask: u8) -> Vec<FactoryAiLegalDecision> {
    FactoryAiMoveSlot::ALL
        .into_iter()
        .filter(|slot| mask & (1 << (*slot as u8)) != 0)
        .map(|slot| {
            FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
                move_slot: slot,
                target_battler: if slot == FactoryAiMoveSlot::Slot2 {
                    1
                } else {
                    0
                },
            })
        })
        .collect()
}

fn input<'a>(
    scenario_id: u8,
    streak: u32,
    seed: u32,
    calls: u32,
    turn_mode: u8,
    decisions: &'a [FactoryAiLegalDecision],
) -> FactoryAiScoredDecisionInput<'a> {
    let mut view = scenario(scenario_id);
    view.factory.factory_win_streak = streak;
    FactoryAiScoredDecisionInput {
        view,
        request: FactoryAiMovePolicyRequest {
            kind: FactoryAiRequestKind::Command,
            request_id: 91,
            side: FactoryAiDecisionSide::Trainer,
            battler: 1,
            legal_decisions: decisions,
        },
        rng: BattleRngState { value: seed, calls },
        turn_start_random_number: match turn_mode {
            0 => None,
            1 => Some(FactoryAiTurnStartRandomNumber::Decision),
            2 => Some(FactoryAiTurnStartRandomNumber::BattleTurnBoundary { value: 0x4321 }),
            _ => panic!("unknown turn mode {turn_mode}"),
        },
    }
}

#[test]
fn canonical_ts_success_corpus_matches_every_retained_result_and_trace_field() {
    let mut max_draw_count = 0;
    for case in FACTORY_AI_SCORED_DECISION_CASES {
        let decisions = legal_decisions(case.legal_mask);
        let result = choose_factory_ai_scored_decision(input(
            case.scenario_id,
            case.streak,
            case.seed,
            case.calls,
            case.turn_mode,
            &decisions,
        ))
        .unwrap_or_else(|error| panic!("case {case:?} unexpectedly failed: {error}"));
        max_draw_count = max_draw_count.max(result.trace.draw_count);
        assert_eq!(
            full_receipt_hash(&result),
            case.expected_full_receipt_hash,
            "full result/trace mismatch for {case:?}"
        );
    }
    assert!(
        max_draw_count >= 10,
        "directed corpus must retain a draw-heavy path"
    );
}

#[test]
fn canonical_ts_error_corpus_matches_typed_reachable_errors() {
    for case in FACTORY_AI_SCORED_DECISION_ERROR_CASES {
        let mut decisions = legal_decisions(1);
        match case.scenario_id {
            4 => decisions.push(FactoryAiLegalDecision::Switch { party_index: 1 }),
            5 => decisions.push(FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
                move_slot: FactoryAiMoveSlot::Slot0,
                target_battler: 1,
            })),
            7 => decisions.clear(),
            _ => {}
        }
        let mut value = input(0, 14, 1, 0, 0, &decisions);
        match case.scenario_id {
            0 => value.view.factory.factory_win_streak = 0,
            1 => value.request.kind = FactoryAiRequestKind::ForcedSwitch,
            2 | 3 => {
                value.request.side = FactoryAiDecisionSide::Player;
                value.request.battler = 0;
            }
            4 | 5 | 7 => {}
            6 => value.view.moves[0] = 0,
            8 => value.view.factory.level_mode = 3,
            9 => value.view.factory.battle_mode = 2,
            10 => value.view.factory.factory_win_streak = 65_536,
            11 => value.view.factory.trainer_opponent_id = 65_536,
            12 => value.view.moves[0] = 999,
            other => panic!("unknown error scenario {other}"),
        }
        let error = choose_factory_ai_scored_decision(value)
            .unwrap_err()
            .to_string();
        assert_eq!(error, case.expected_message, "error case {case:?}");
    }
}
