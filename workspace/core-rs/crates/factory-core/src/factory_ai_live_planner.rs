//! Pure switch-or-move planning prefix of `submitLiveFactoryAiDecision`.
//!
//! This ports exactly the non-reducer portion of
//! `src/engine/factoryAiLiveDriver.ts:468-572`.  The canonical driver owns
//! two separate concerns: this planner builds a decision and its complete
//! receipt, while `submitBattleDecision` replays that receipt through the
//! generic BattleState reducer.  The generic reducer is intentionally not a
//! dependency here.  A future controller/WASM seam can consume this plan and
//! decide how to replay its already-recorded draws without moving the source
//! decision order back into TypeScript.
//!
//! The source has one `BattleScriptRulesContext`; earlier Rust milestones
//! deliberately exposed only the three focused projections each leaf reads.
//! [`FactoryAiLivePlannerRulesContext`] ties those existing projections
//! together at this composition seam.  Its switch fields are source-width,
//! already-validated domain types from M6b, while the view/history fields
//! preserve the JS-number surface required by M8a/M8d.  That is a typed input
//! guarantee, not a new planner validation branch: malformed source-context
//! JSON is rejected by the canonical rules-context constructor before this
//! driver is called.

use crate::factory_ai_battle_history::{
    sync_factory_ai_battle_history, FactoryAiBattleHistory, FactoryAiBattleHistoryError,
    FactoryAiBattleHistoryLiveInput,
};
use crate::factory_ai_check_bad_move::BattleRngState;
use crate::factory_ai_decision_policy::{
    FactoryAiDecisionSide, FactoryAiDecisionSubmission, FactoryAiLegalDecision,
    FactoryAiMaskZeroTrace, FactoryAiMovePolicyRequest, FactoryAiRequestKind, FactoryAiScoredTrace,
    FactoryAiTurnStartRandomNumber,
};
use crate::factory_ai_live_decision_bridge::{
    choose_factory_ai_decision_from_live_view, FactoryAiLiveDecisionChoice,
    FactoryAiLiveDecisionError, FactoryAiLiveDecisionInput,
};
use crate::factory_ai_live_view::{
    create_factory_ai_view_from_live_rules, FactoryAiChallengePolicy, FactoryAiLiveRulesContext,
    FactoryAiLiveViewError, FactoryAiLiveViewInput, FactoryAiScoredView,
};
use crate::factory_ai_switch_policy::{
    evaluate_factory_ai_switch_policy, FactoryAiSwitchPolicyError, FactoryAiSwitchPolicyInput,
    FactoryAiSwitchPolicyResult, FactoryAiSwitchRules,
};

/// The source's fixed Factory action gate
/// (`factoryAiLiveDriver.ts:113-115`).  Items are source-unreachable for
/// Frontier trainer battles; the planner retains the fact in every result
/// rather than silently dropping it while no item branch is implemented.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiActionGate {
    pub item: &'static str,
}

pub const FACTORY_AI_ACTION_GATE: FactoryAiActionGate =
    FactoryAiActionGate { item: "frontier-trainer-items-source-unreachable" };

/// Source-shaped rules data shared by history synchronization, live-view
/// construction, the switch policy, and scored-turn ownership.
///
/// `switch_rules.battlers[*].party_index` is also the source
/// `gBattlerPartyIndexes[*]` row read by M8a.  Keeping that one canonical
/// typed row prevents callers from supplying a second, conflicting party
/// index projection merely for history synchronization.
#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLivePlannerRulesContext<'a> {
    /// M8d's complete live-view property projection.
    pub live_view: &'a FactoryAiLiveRulesContext,
    /// Source `gBattleStruct->aiObservedAbilityIds` handoff (M8a).
    pub observed_ability_ids: [f64; 4],
    /// Source `gBattleStruct->aiObservedItemEffects` handoff (M8a).
    pub observed_item_effects: [f64; 4],
    /// M6b's exact source-shaped `ShouldSwitch` projection.
    pub switch_rules: FactoryAiSwitchRules,
    /// Source `gRandomTurnNumber`, stored by `BattleTurnPassed` before this
    /// command boundary (`factoryAiLiveDriver.ts:550-556`).
    pub random_turn_number: u16,
}

impl FactoryAiLivePlannerRulesContext<'_> {
    fn history_input(&self) -> FactoryAiBattleHistoryLiveInput {
        FactoryAiBattleHistoryLiveInput {
            party_indexes: self
                .switch_rules
                .battlers
                .map(|battler| f64::from(battler.party_index)),
            target_last_move: self.live_view.last_moves[0],
            observed_ability_ids: self.observed_ability_ids,
            observed_item_effects: self.observed_item_effects,
        }
    }
}

/// The only boundary distinction the pure planner reads.  The generic
/// terminal/machine-barrier payload is deliberately absent: both forms fail
/// the canonical driver's same initial trainer-command guard before any
/// payload field is observed.
#[derive(Debug, Clone, Copy)]
pub enum FactoryAiLivePlannerBoundary<'a> {
    DecisionRequired(FactoryAiMovePolicyRequest<'a>),
    NotDecisionRequired,
}

/// Complete pure input corresponding to the source driver's readable state.
/// There is deliberately no reducer callback and no generic BattleState:
/// replay/transition is the next integration seam, not part of M8i.
#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLivePlannerInput<'a> {
    pub boundary: FactoryAiLivePlannerBoundary<'a>,
    pub rules_context: FactoryAiLivePlannerRulesContext<'a>,
    pub history: &'a FactoryAiBattleHistory,
    pub challenge: FactoryAiChallengePolicy,
    pub rng: BattleRngState,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiLivePlannerPhase {
    Move = 0,
    Switch = 1,
}

/// Source-equivalent switch submission.  The policy has already resolved a
/// concrete 0..5 party slot before this object is made.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiLivePlannerSwitchSubmission {
    pub request_id: u32,
    pub side: FactoryAiDecisionSide,
    pub party_index: u8,
}

/// The canonical move result spreads either existing chooser choice.  This
/// enum preserves the exact mask-specific trace shape without re-running or
/// re-projecting a chooser.
#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiLivePlannerMoveTrace {
    MaskZero(FactoryAiMaskZeroTrace),
    Scored(FactoryAiScoredTrace),
}

/// Pure equivalent of the move-phase portion of
/// `FactoryAiLiveTransition`: all planner-owned output is retained, and the
/// generic `transition` field is intentionally absent.
#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, PartialEq)]
pub struct FactoryAiLivePlannerMoveResult {
    pub phase: FactoryAiLivePlannerPhase,
    pub submission: FactoryAiDecisionSubmission,
    pub rng: BattleRngState,
    pub trace: FactoryAiLivePlannerMoveTrace,
    pub history: FactoryAiBattleHistory,
    pub view: FactoryAiScoredView,
    pub switch_policy: FactoryAiSwitchPolicyResult,
    pub action_gate: FactoryAiActionGate,
}

/// Pure equivalent of the switch-phase portion of
/// `FactoryAiLiveTransition`.  Its `rng` is the switch-policy cursor; no
/// move chooser or command legality filtering has run on this branch.
#[derive(Debug, Clone, PartialEq)]
pub struct FactoryAiLivePlannerSwitchResult {
    pub phase: FactoryAiLivePlannerPhase,
    pub submission: FactoryAiLivePlannerSwitchSubmission,
    pub rng: BattleRngState,
    pub history: FactoryAiBattleHistory,
    pub view: FactoryAiScoredView,
    pub switch_policy: FactoryAiSwitchPolicyResult,
    pub action_gate: FactoryAiActionGate,
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, PartialEq)]
pub enum FactoryAiLivePlannerResult {
    Move(FactoryAiLivePlannerMoveResult),
    Switch(FactoryAiLivePlannerSwitchResult),
}

/// Explicit errors at the pure planner seam.  Existing leaves retain their
/// own exact source text; the two new messages are the canonical driver's
/// own guard/empty-filter errors.  Other JavaScript boundary validation is
/// deliberately unrepresentable by these existing typed domain inputs.
#[derive(Debug, Clone, PartialEq)]
pub enum FactoryAiLivePlannerError {
    TrainerCommandBoundaryRequired,
    History(FactoryAiBattleHistoryError),
    LiveView(FactoryAiLiveViewError),
    SwitchPolicy(FactoryAiSwitchPolicyError),
    SwitchPrecheckDeclinedNoLegalMove,
    MoveChooser(FactoryAiLiveDecisionError),
}

impl core::fmt::Display for FactoryAiLivePlannerError {
    fn fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::TrainerCommandBoundaryRequired => {
                formatter.write_str("Factory AI live driver requires a trainer command boundary")
            }
            Self::History(error) | Self::LiveView(error) => error.fmt(formatter),
            Self::SwitchPolicy(error) => error.fmt(formatter),
            Self::SwitchPrecheckDeclinedNoLegalMove => {
                formatter.write_str("Factory AI switch precheck declined but no legal move remains")
            }
            Self::MoveChooser(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for FactoryAiLivePlannerError {}

/// Native-only pure port of the planning portion of
/// `submitLiveFactoryAiDecision`.
///
/// Ordering is intentionally observable and matches the source exactly:
/// trainer-command boundary guard; M8a history synchronization; M8d view
/// construction; M6b switch policy from the original cursor; selected-switch
/// submission; then the filtered authoritative move request and M8g/M8h live
/// chooser from the switch cursor.  Scored masks are explicitly attributed to
/// the prior battle-turn boundary and never advance RNG for
/// `random_turn_number` again.
pub fn plan_live_factory_ai_decision(
    input: FactoryAiLivePlannerInput<'_>,
) -> Result<FactoryAiLivePlannerResult, FactoryAiLivePlannerError> {
    // This is intentionally first.  In particular, a malformed/unknown
    // observed ability must not leak ahead of a non-command boundary.
    let request = match input.boundary {
        FactoryAiLivePlannerBoundary::DecisionRequired(request)
            if request.kind == FactoryAiRequestKind::Command
                && request.side == FactoryAiDecisionSide::Trainer =>
        {
            request
        }
        FactoryAiLivePlannerBoundary::DecisionRequired(_)
        | FactoryAiLivePlannerBoundary::NotDecisionRequired => {
            return Err(FactoryAiLivePlannerError::TrainerCommandBoundaryRequired)
        }
    };

    let history_input = input.rules_context.history_input();
    let synced_history = sync_factory_ai_battle_history(input.history, &history_input)
        .map_err(FactoryAiLivePlannerError::History)?;
    let view = create_factory_ai_view_from_live_rules(FactoryAiLiveViewInput {
        rules_context: input.rules_context.live_view,
        history: &synced_history,
        challenge: input.challenge,
    })
    .map_err(FactoryAiLivePlannerError::LiveView)?;
    let switch_policy = evaluate_factory_ai_switch_policy(&FactoryAiSwitchPolicyInput {
        rules: input.rules_context.switch_rules,
        rng: input.rng,
        // `submitLiveFactoryAiDecision` supplies only rules + rng; M6b owns
        // the source's default selector scratch when no external scratch is
        // present.  Do not create a second planner-owned fallback.
        suitable_damage_fallback: None,
    })
    .map_err(FactoryAiLivePlannerError::SwitchPolicy)?;

    if let Some(party_index) = switch_policy.selected_party_index {
        return Ok(FactoryAiLivePlannerResult::Switch(
            FactoryAiLivePlannerSwitchResult {
                phase: FactoryAiLivePlannerPhase::Switch,
                submission: FactoryAiLivePlannerSwitchSubmission {
                    request_id: request.request_id,
                    side: request.side,
                    party_index,
                },
                rng: switch_policy.rng,
                history: synced_history,
                view,
                switch_policy,
                action_gate: FACTORY_AI_ACTION_GATE,
            },
        ));
    }

    // `AI_TrySwitchOrUseItem` selected B_ACTION_USE_MOVE.  Preserve the
    // original request metadata/authoritative targets, but filter its legal
    // decisions only now: a selected switch intentionally bypasses this
    // otherwise-empty move-list error in the source driver.
    let move_decisions = request
        .legal_decisions
        .iter()
        .copied()
        .filter(|decision| matches!(decision, FactoryAiLegalDecision::UseMove(_)))
        .collect::<Vec<_>>();
    if move_decisions.is_empty() {
        return Err(FactoryAiLivePlannerError::SwitchPrecheckDeclinedNoLegalMove);
    }
    let policy_request = FactoryAiMovePolicyRequest {
        kind: request.kind,
        request_id: request.request_id,
        side: request.side,
        battler: request.battler,
        legal_decisions: &move_decisions,
    };
    let choice = choose_factory_ai_decision_from_live_view(FactoryAiLiveDecisionInput {
        view: &view,
        request: policy_request,
        rng: switch_policy.rng,
        turn_start_random_number: Some(FactoryAiTurnStartRandomNumber::BattleTurnBoundary {
            value: input.rules_context.random_turn_number,
        }),
    })
    .map_err(FactoryAiLivePlannerError::MoveChooser)?;

    let (submission, rng, trace) = match choice {
        FactoryAiLiveDecisionChoice::MaskZero(choice) => (
            choice.submission,
            choice.rng,
            FactoryAiLivePlannerMoveTrace::MaskZero(choice.trace),
        ),
        FactoryAiLiveDecisionChoice::Scored(choice) => (
            choice.submission,
            choice.rng,
            FactoryAiLivePlannerMoveTrace::Scored(choice.trace),
        ),
    };
    Ok(FactoryAiLivePlannerResult::Move(
        FactoryAiLivePlannerMoveResult {
            phase: FactoryAiLivePlannerPhase::Move,
            submission,
            rng,
            trace,
            history: synced_history,
            view,
            switch_policy,
            action_gate: FACTORY_AI_ACTION_GATE,
        },
    ))
}
