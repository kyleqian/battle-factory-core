//! Source-complete mask-0 Factory move-choice policy, ported from the pure
//! `chooseFactoryAiMaskZeroDecision` half of
//! `src/engine/factoryAiDecisionPolicy.ts`.
//!
//! This module deliberately does **not** port the JSON/plain-object guards or
//! `submitFactoryAiMaskZeroDecision`'s `BattleDecisionBoundary` integration:
//! Rust callers supply typed values and the boundary has no native port yet.
//! It does retain every policy-semantic guard reachable through those typed
//! values, including the source's otherwise-upstream-protected empty legal
//! move guard.
//!
//! ## Reusable scored-policy seam
//!
//! `setup_factory_ai_move_policy` is intentionally mask-agnostic after its
//! shared Level-50 singles validation.  It returns the selected mask receipt,
//! four unconditional setup draws, initial slot scores, and the authoritative
//! legal decision for every slot.  A future mask-1/mask-7 policy can update
//! `slot_scores` with scoring deltas and pass that exact array plus
//! `legal_decisions` to `choose_best_factory_ai_move`; it must not recreate
//! setup draws or target resolution.

use crate::damage_calc::StatStages;
use crate::factory_ai_check_bad_move::{
    run_check_bad_move_preamble, BattleRngState, CheckBadMoveDraw, CheckBadMovePreambleInput,
    CheckBadMoveResult, FactoryAiCheckBadMoveAttacker, FactoryAiCheckBadMoveRoarTarget,
    FactoryAiCheckBadMoveTarget, FactoryAiMonGender, MAX_CHECK_BAD_MOVE_DRAWS,
};
use crate::factory_ai_check_viability::{
    run_check_viability, CheckViabilityDraw, CheckViabilityResult, FactoryAiCheckViabilityBattler,
    FactoryAiKnownMoveHistoryTail, RunCheckViabilityInput, MAX_CHECK_VIABILITY_DRAWS,
};
use crate::factory_ai_mask::{
    select_factory_ai_mask, FactoryAiMaskError, FactoryAiMaskSelection,
    FactoryAiMaskSelectionInput, FactoryAiPolicyBranchId, FACTORY_BATTLE_MODE_DOUBLES,
    FACTORY_BATTLE_MODE_SINGLES, FACTORY_LEVEL_MODE_50, FACTORY_LEVEL_MODE_TENT,
};
use crate::factory_ai_try_to_faint::{
    run_try_to_faint, FactoryAiMostPowerful, FactoryAiTryToFaintBattler, FactoryAiTryToFaintDraw,
    FactoryAiTryToFaintTarget, RunTryToFaintInput, TryToFaintResult, MAX_TRY_TO_FAINT_DRAWS,
};
use crate::gen_tables;
use crate::rng::advance_rng_value;

/// `MAX_MON_MOVES` (`include/constants/pokemon.h`), mirrored by the TS
/// chooser's `MAX_MON_MOVES` constant.
pub const FACTORY_AI_MOVE_SLOT_COUNT: usize = 4;
/// `DEFAULT_MOVE_SCORE` (`factoryAiDecisionPolicy.ts:43`).
pub const FACTORY_AI_DEFAULT_MOVE_SCORE: i32 = 100;
/// `MOVE_NONE` (`include/constants/moves.h`).
pub const FACTORY_AI_MOVE_NONE: u16 = 0;

/// The four real `BattleMoveSlot` values.  Making invalid indexes
/// unrepresentable is one of the typed-boundary simplifications relative to
/// TypeScript's JSON request parser.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiMoveSlot {
    Slot0 = 0,
    Slot1 = 1,
    Slot2 = 2,
    Slot3 = 3,
}

impl FactoryAiMoveSlot {
    pub const ALL: [Self; FACTORY_AI_MOVE_SLOT_COUNT] =
        [Self::Slot0, Self::Slot1, Self::Slot2, Self::Slot3];

    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    #[must_use]
    pub const fn from_index(index: usize) -> Option<Self> {
        match index {
            0 => Some(Self::Slot0),
            1 => Some(Self::Slot1),
            2 => Some(Self::Slot2),
            3 => Some(Self::Slot3),
            _ => None,
        }
    }
}

/// The two `BattleDecisionRequest.side` values the pure chooser needs.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiDecisionSide {
    Player = 0,
    Trainer = 1,
}

/// One fully target-resolved `BattleMoveDecision`.  The Factory AI chooses a
/// move slot only; preserving this decision rather than regenerating a target
/// is the same source invariant as TS's `legalBySlot` map.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMoveDecision {
    pub move_slot: FactoryAiMoveSlot,
    pub target_battler: u8,
}

/// The only command decisions that matter to this policy.  `Switch` carries
/// just enough data to make the source's unsupported-switch guard testable;
/// the party index is otherwise intentionally not modeled here.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiLegalDecision {
    UseMove(FactoryAiMoveDecision),
    Switch { party_index: u8 },
}

/// The `BattleDecisionRequest.kind` distinction relevant to the pure chooser.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiRequestKind {
    Command = 0,
    ForcedSwitch = 1,
}

/// Typed subset of a Battle command request used by this pure policy.
///
/// `legal_decisions` is a borrowed slice so callers can retain their own
/// authoritative command list and the returned setup can copy the one chosen
/// decision per slot without allocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMovePolicyRequest<'a> {
    pub kind: FactoryAiRequestKind,
    pub request_id: u32,
    pub side: FactoryAiDecisionSide,
    pub battler: u8,
    pub legal_decisions: &'a [FactoryAiLegalDecision],
}

/// Minimal common view for Factory move policy setup.  Unlike the TS view,
/// no schema/mode/active JSON tags are carried: the type itself names this
/// policy and its active target is fixed by the Factory singles contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMovePolicyView {
    pub factory: FactoryAiMaskSelectionInput,
    pub moves: [u16; FACTORY_AI_MOVE_SLOT_COUNT],
}

/// Alias matching the TypeScript mask-zero view name.  Kept public so callers
/// can use the source-facing name while the scored sibling reuses the common
/// typed view above.
pub type FactoryAiMaskZeroView = FactoryAiMovePolicyView;

/// Input to both the reusable setup and `choose_factory_ai_mask_zero_decision`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMovePolicyInput<'a> {
    pub view: FactoryAiMovePolicyView,
    pub request: FactoryAiMovePolicyRequest<'a>,
    pub rng: BattleRngState,
}

/// Alias matching the TypeScript pure chooser's input role.
pub type FactoryAiMaskZeroDecisionInput<'a> = FactoryAiMovePolicyInput<'a>;

/// One of `BattleAI_SetupAIData`'s unconditional simulated-damage draws.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiSetupDraw {
    pub ordinal: u32,
    pub move_slot: FactoryAiMoveSlot,
    pub before: BattleRngState,
    pub after: BattleRngState,
    pub raw_rng_value: u32,
    pub random_value: u16,
    pub simulated_rng: u8,
}

/// The unconditional `ChooseMoveOrAction_Singles` tie-selection draw.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiTieDraw {
    pub ordinal: u32,
    pub before: BattleRngState,
    pub after: BattleRngState,
    pub raw_rng_value: u32,
    pub random_value: u16,
}

/// Complete draw receipt in the source's observable order.  The typed enum
/// replaces TS's constant `kind`/free-form `reason` strings.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiRngDraw {
    SetupSimulatedRng(FactoryAiSetupDraw),
    BestMoveTie(FactoryAiTieDraw),
}

/// A score after the shared setup.  Scored masks can replace `final_score`
/// while keeping the initial score, legality and move identity intact.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiSlotScore {
    pub move_slot: FactoryAiMoveSlot,
    pub move_id: u16,
    pub legal: bool,
    pub initial_score: i32,
    pub final_score: i32,
}

/// Shared pre-scoring state for the mask-zero and future scored policies.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMovePolicySetup {
    pub mask_selection: FactoryAiMaskSelection,
    /// State after the four unconditional setup draws.
    pub rng: BattleRngState,
    pub setup_draws: [FactoryAiSetupDraw; FACTORY_AI_MOVE_SLOT_COUNT],
    pub slot_scores: [FactoryAiSlotScore; FACTORY_AI_MOVE_SLOT_COUNT],
    /// One authoritative command decision per move slot; `None` means the
    /// kernel did not make that slot legal.
    pub legal_decisions: [Option<FactoryAiMoveDecision>; FACTORY_AI_MOVE_SLOT_COUNT],
}

/// Shared best-score/tie resolution output.  This is deliberately independent
/// of mask-zero tracing so the scored sibling can reuse it after applying its
/// own score deltas.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiBestMoveChoice {
    pub rng: BattleRngState,
    pub best_move_slots: [FactoryAiMoveSlot; FACTORY_AI_MOVE_SLOT_COUNT],
    pub best_move_slot_count: u8,
    pub tie_draw: FactoryAiTieDraw,
    pub tie_modulus: u8,
    pub tie_index: u8,
    pub chosen_decision: FactoryAiMoveDecision,
}

/// Typed equivalent of `BattleDecisionSubmission` for this pure layer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiDecisionSubmission {
    pub request_id: u32,
    pub side: FactoryAiDecisionSide,
    pub decision: FactoryAiMoveDecision,
}

/// Mask-zero's complete trace receipt.  `mask_selection.receipt.branch` is
/// the source branch receipt; `draws` preserves the five-draw order exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMaskZeroTrace {
    /// Kept explicit for direct parity with TS's `trace.mask`; always zero
    /// after `choose_factory_ai_mask_zero_decision`'s branch guard.
    pub mask: u8,
    pub mask_selection: FactoryAiMaskSelection,
    pub draws: [FactoryAiRngDraw; FACTORY_AI_MOVE_SLOT_COUNT + 1],
    pub slot_scores: [FactoryAiSlotScore; FACTORY_AI_MOVE_SLOT_COUNT],
    pub best_move_slots: [FactoryAiMoveSlot; FACTORY_AI_MOVE_SLOT_COUNT],
    pub best_move_slot_count: u8,
    pub tie_modulus: u8,
    pub tie_index: u8,
    pub chosen_decision: FactoryAiMoveDecision,
}

/// Result of the source-complete pure mask-zero chooser.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMaskZeroDecisionChoice {
    pub submission: FactoryAiDecisionSubmission,
    pub rng: BattleRngState,
    pub trace: FactoryAiMaskZeroTrace,
}

/// Semantic errors that remain relevant once request/view JSON parsing is
/// replaced by Rust types.  Display messages intentionally match the TS pure
/// chooser for every shared error site.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiDecisionPolicyError {
    ViewLevelModeOutOfRange {
        value: u8,
    },
    ViewBattleModeOutOfRange {
        value: u8,
    },
    ViewFactoryWinStreakOutOfRange {
        value: u32,
    },
    ViewTrainerOpponentIdOutOfRange {
        value: u32,
    },
    Level50SinglesOnly,
    CommandRequestsOnly,
    TrainerBattlerOneRequired,
    SwitchActionPrechecksUnsupported,
    DuplicateLegalMoveSlot {
        move_slot: FactoryAiMoveSlot,
    },
    LegalMoveContainsMoveNone {
        move_slot: FactoryAiMoveSlot,
    },
    AtLeastOneLegalMoveRequired,
    UnsupportedSelectedMask {
        branch: FactoryAiPolicyBranchId,
        mask: u8,
    },
    /// Defensive propagation only: after the four view-range guards above,
    /// this cannot be returned by `select_factory_ai_mask`.
    MaskSelection(FactoryAiMaskError),
}

impl std::fmt::Display for FactoryAiDecisionPolicyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ViewLevelModeOutOfRange { .. } => write!(
                f,
                "Factory AI view.factory.levelMode must be an integer in 0..2"
            ),
            Self::ViewBattleModeOutOfRange { .. } => write!(
                f,
                "Factory AI view.factory.battleMode must be an integer in 0..1"
            ),
            Self::ViewFactoryWinStreakOutOfRange { .. } => write!(
                f,
                "Factory AI view.factory.factoryWinStreak must be an integer in 0..65535"
            ),
            Self::ViewTrainerOpponentIdOutOfRange { .. } => write!(
                f,
                "Factory AI view.factory.trainerOpponentId must be an integer in 0..65535"
            ),
            Self::Level50SinglesOnly => {
                write!(
                    f,
                    "Factory AI mask-0 policy supports only Level-50 Factory singles"
                )
            }
            Self::CommandRequestsOnly => {
                write!(f, "Factory AI mask-0 policy supports only command requests")
            }
            Self::TrainerBattlerOneRequired => write!(
                f,
                "Factory AI mask-0 policy requires the current trainer battler-1 request"
            ),
            Self::SwitchActionPrechecksUnsupported => write!(
                f,
                "Factory AI mask-0 move policy does not implement switch action prechecks"
            ),
            Self::DuplicateLegalMoveSlot { move_slot } => write!(
                f,
                "Factory AI legal move slot {} has ambiguous duplicate decisions",
                *move_slot as u8
            ),
            Self::LegalMoveContainsMoveNone { move_slot } => write!(
                f,
                "Factory AI legal move slot {} contains MOVE_NONE",
                *move_slot as u8
            ),
            Self::AtLeastOneLegalMoveRequired => {
                write!(
                    f,
                    "Factory AI mask-0 policy requires at least one legal move"
                )
            }
            Self::UnsupportedSelectedMask { branch, mask } => write!(
                f,
                "Factory AI mask-0 policy does not support selected {} mask {mask}",
                branch_name(*branch)
            ),
            Self::MaskSelection(error) => write!(f, "Factory AI mask selection failed: {error}"),
        }
    }
}

impl std::error::Error for FactoryAiDecisionPolicyError {}

fn branch_name(branch: FactoryAiPolicyBranchId) -> &'static str {
    match branch {
        FactoryAiPolicyBranchId::Tent => "tent",
        FactoryAiPolicyBranchId::FrontierBrain => "frontierBrain",
        FactoryAiPolicyBranchId::ChallengeBelow2 => "challengeBelow2",
        FactoryAiPolicyBranchId::ChallengeBelow4 => "challengeBelow4",
        FactoryAiPolicyBranchId::ChallengeAtLeast4 => "challengeAtLeast4",
    }
}

fn next_draw(rng: BattleRngState, ordinal: u32) -> (BattleRngState, FactoryAiTieDraw) {
    let raw_rng_value = advance_rng_value(rng.value);
    let after = BattleRngState { value: raw_rng_value, calls: rng.calls + 1 };
    let draw = FactoryAiTieDraw {
        ordinal,
        before: rng,
        after,
        raw_rng_value,
        random_value: (raw_rng_value >> 16) as u16,
    };
    (after, draw)
}

fn validate_factory_view(
    factory: FactoryAiMaskSelectionInput,
) -> Result<(), FactoryAiDecisionPolicyError> {
    // `viewAt` performs these range checks before the Level-50/singles
    // restriction.  Rust's numeric types eliminate negative/non-integral
    // inputs, leaving exactly these upper-bound cases reachable.
    if factory.level_mode > FACTORY_LEVEL_MODE_TENT {
        return Err(FactoryAiDecisionPolicyError::ViewLevelModeOutOfRange {
            value: factory.level_mode,
        });
    }
    if factory.battle_mode > FACTORY_BATTLE_MODE_DOUBLES {
        return Err(FactoryAiDecisionPolicyError::ViewBattleModeOutOfRange {
            value: factory.battle_mode,
        });
    }
    if factory.factory_win_streak > 0xffff {
        return Err(
            FactoryAiDecisionPolicyError::ViewFactoryWinStreakOutOfRange {
                value: factory.factory_win_streak,
            },
        );
    }
    if factory.trainer_opponent_id > 0xffff {
        return Err(
            FactoryAiDecisionPolicyError::ViewTrainerOpponentIdOutOfRange {
                value: factory.trainer_opponent_id,
            },
        );
    }
    if factory.level_mode != FACTORY_LEVEL_MODE_50
        || factory.battle_mode != FACTORY_BATTLE_MODE_SINGLES
    {
        return Err(FactoryAiDecisionPolicyError::Level50SinglesOnly);
    }
    Ok(())
}

/// Runs the common command validation, `GetAiScriptsInBattleFactory` selection
/// and four unconditional setup draws.  The function does not restrict the
/// selected mask: that is intentionally left to each policy consumer.
pub fn setup_factory_ai_move_policy(
    input: FactoryAiMovePolicyInput<'_>,
) -> Result<FactoryAiMovePolicySetup, FactoryAiDecisionPolicyError> {
    // `commandRequestAt` is called before `viewAt` in the TS chooser.
    if input.request.kind != FactoryAiRequestKind::Command {
        return Err(FactoryAiDecisionPolicyError::CommandRequestsOnly);
    }
    validate_factory_view(input.view.factory)?;
    if input.request.side != FactoryAiDecisionSide::Trainer || input.request.battler != 1 {
        return Err(FactoryAiDecisionPolicyError::TrainerBattlerOneRequired);
    }

    let mut legal_decisions = [None; FACTORY_AI_MOVE_SLOT_COUNT];
    for &decision in input.request.legal_decisions {
        let FactoryAiLegalDecision::UseMove(move_decision) = decision else {
            return Err(FactoryAiDecisionPolicyError::SwitchActionPrechecksUnsupported);
        };
        let slot = move_decision.move_slot.index();
        if legal_decisions[slot].is_some() {
            return Err(FactoryAiDecisionPolicyError::DuplicateLegalMoveSlot {
                move_slot: move_decision.move_slot,
            });
        }
        if input.view.moves[slot] == FACTORY_AI_MOVE_NONE {
            return Err(FactoryAiDecisionPolicyError::LegalMoveContainsMoveNone {
                move_slot: move_decision.move_slot,
            });
        }
        legal_decisions[slot] = Some(move_decision);
    }
    if legal_decisions.iter().all(Option::is_none) {
        return Err(FactoryAiDecisionPolicyError::AtLeastOneLegalMoveRequired);
    }

    let mask_selection = select_factory_ai_mask(input.view.factory)
        .map_err(FactoryAiDecisionPolicyError::MaskSelection)?;
    let mut rng = input.rng;
    let mut setup_draws = [FactoryAiSetupDraw {
        ordinal: 0,
        move_slot: FactoryAiMoveSlot::Slot0,
        before: BattleRngState { value: 0, calls: 0 },
        after: BattleRngState { value: 0, calls: 0 },
        raw_rng_value: 0,
        random_value: 0,
        simulated_rng: 0,
    }; FACTORY_AI_MOVE_SLOT_COUNT];
    let mut slot_scores = [FactoryAiSlotScore {
        move_slot: FactoryAiMoveSlot::Slot0,
        move_id: 0,
        legal: false,
        initial_score: FACTORY_AI_DEFAULT_MOVE_SCORE,
        final_score: 0,
    }; FACTORY_AI_MOVE_SLOT_COUNT];

    for move_slot in FactoryAiMoveSlot::ALL {
        let slot = move_slot.index();
        let (after, tie_shape) = next_draw(rng, (slot + 1) as u32);
        rng = after;
        setup_draws[slot] = FactoryAiSetupDraw {
            ordinal: tie_shape.ordinal,
            move_slot,
            before: tie_shape.before,
            after: tie_shape.after,
            raw_rng_value: tie_shape.raw_rng_value,
            random_value: tie_shape.random_value,
            simulated_rng: (FACTORY_AI_DEFAULT_MOVE_SCORE as u16 - (tie_shape.random_value % 16))
                as u8,
        };
        let legal = legal_decisions[slot].is_some();
        slot_scores[slot] = FactoryAiSlotScore {
            move_slot,
            move_id: input.view.moves[slot],
            legal,
            initial_score: FACTORY_AI_DEFAULT_MOVE_SCORE,
            final_score: if legal {
                FACTORY_AI_DEFAULT_MOVE_SCORE
            } else {
                0
            },
        };
    }

    Ok(FactoryAiMovePolicySetup { mask_selection, rng, setup_draws, slot_scores, legal_decisions })
}

/// Resolves the highest legal score with the source's unconditional final
/// tie draw.  `draw_ordinal` lets scored masks account for their own
/// intermediate draws before sharing this exact tie-selection routine.
pub fn choose_best_factory_ai_move(
    rng: BattleRngState,
    slot_scores: [FactoryAiSlotScore; FACTORY_AI_MOVE_SLOT_COUNT],
    legal_decisions: [Option<FactoryAiMoveDecision>; FACTORY_AI_MOVE_SLOT_COUNT],
    draw_ordinal: u32,
) -> Result<FactoryAiBestMoveChoice, FactoryAiDecisionPolicyError> {
    let best_score = slot_scores
        .iter()
        .filter(|score| score.legal)
        .map(|score| score.final_score)
        .max()
        .ok_or(FactoryAiDecisionPolicyError::AtLeastOneLegalMoveRequired)?;

    let mut best_move_slots = [FactoryAiMoveSlot::Slot0; FACTORY_AI_MOVE_SLOT_COUNT];
    let mut best_move_slot_count = 0usize;
    for score in slot_scores {
        if score.legal && score.final_score == best_score {
            best_move_slots[best_move_slot_count] = score.move_slot;
            best_move_slot_count += 1;
        }
    }
    debug_assert!(best_move_slot_count > 0);
    let (rng, tie_draw) = next_draw(rng, draw_ordinal);
    let tie_modulus = best_move_slot_count as u8;
    let tie_index = (tie_draw.random_value % u16::from(tie_modulus)) as u8;
    let chosen_slot = best_move_slots[tie_index as usize];
    let chosen_decision = legal_decisions[chosen_slot.index()]
        .expect("a legal best score must retain its authoritative move decision");

    Ok(FactoryAiBestMoveChoice {
        rng,
        best_move_slots,
        best_move_slot_count: tie_modulus,
        tie_draw,
        tie_modulus,
        tie_index,
        chosen_decision,
    })
}

/// The pure, source-complete mask-0 Factory move chooser.
///
/// It consumes four setup draws even for unusable slots, scores legal slots
/// `100` and others `0`, runs no scoring scripts, then consumes the fifth
/// tie draw even when there is only one best move.
pub fn choose_factory_ai_mask_zero_decision(
    input: FactoryAiMaskZeroDecisionInput<'_>,
) -> Result<FactoryAiMaskZeroDecisionChoice, FactoryAiDecisionPolicyError> {
    let setup = setup_factory_ai_move_policy(input)?;
    if setup.mask_selection.mask != 0
        || setup.mask_selection.receipt.branch != FactoryAiPolicyBranchId::ChallengeBelow2
    {
        return Err(FactoryAiDecisionPolicyError::UnsupportedSelectedMask {
            branch: setup.mask_selection.receipt.branch,
            mask: setup.mask_selection.mask,
        });
    }

    let choice = choose_best_factory_ai_move(
        setup.rng,
        setup.slot_scores,
        setup.legal_decisions,
        (FACTORY_AI_MOVE_SLOT_COUNT + 1) as u32,
    )?;
    let draws = [
        FactoryAiRngDraw::SetupSimulatedRng(setup.setup_draws[0]),
        FactoryAiRngDraw::SetupSimulatedRng(setup.setup_draws[1]),
        FactoryAiRngDraw::SetupSimulatedRng(setup.setup_draws[2]),
        FactoryAiRngDraw::SetupSimulatedRng(setup.setup_draws[3]),
        FactoryAiRngDraw::BestMoveTie(choice.tie_draw),
    ];
    let submission = FactoryAiDecisionSubmission {
        request_id: input.request.request_id,
        side: input.request.side,
        decision: choice.chosen_decision,
    };
    let trace = FactoryAiMaskZeroTrace {
        mask: 0,
        mask_selection: setup.mask_selection,
        draws,
        slot_scores: setup.slot_scores,
        best_move_slots: choice.best_move_slots,
        best_move_slot_count: choice.best_move_slot_count,
        tie_modulus: choice.tie_modulus,
        tie_index: choice.tie_index,
        chosen_decision: choice.chosen_decision,
    };
    Ok(FactoryAiMaskZeroDecisionChoice { submission, rng: choice.rng, trace })
}

// === scored mask-1 / mask-7 policy =========================================

/// Unified numeric view of every battler field read by the three native
/// Factory scoring leaves.  Unlike TypeScript's structural object, Rust makes
/// every optional/defaulted field explicit and uses the numeric type/ability
/// ids already shared by those leaves.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiScoredBattlerView {
    pub types: [u8; 2],
    pub attack: i32,
    pub defense: i32,
    pub sp_attack: i32,
    pub sp_defense: i32,
    pub speed: u32,
    pub level: u8,
    pub stat_stages: StatStages,
    pub speed_stage: u8,
    pub acc_stage: u8,
    pub evasion_stage: u8,
    pub is_first_turn: u8,
    pub hp: i32,
    pub max_hp: i32,
    pub last_used_move_id: Option<u16>,
    pub is_toxic_poisoned: Option<bool>,
    pub has_any_status: Option<bool>,
    pub is_confused: Option<bool>,
    pub is_asleep: Option<bool>,
    pub is_taunted: Option<bool>,
    pub is_leech_seeded: Option<bool>,
    pub is_infatuated: Option<bool>,
    pub has_yawn: Option<bool>,
    pub has_perish_song: Option<bool>,
    pub is_nightmared: Option<bool>,
    pub is_foresighted: Option<bool>,
    pub spikes_up: Option<bool>,
    pub target_future_attack_up: Option<bool>,
    pub protect_uses: Option<u8>,
    pub battle_turn_count: Option<u32>,
    pub is_rooted: Option<bool>,
    pub attacker_future_attack_up: Option<bool>,
    pub has_focus_energy: Option<bool>,
    pub has_curable_status: Option<bool>,
    pub is_poisoned: Option<bool>,
    pub is_burned: Option<bool>,
    pub is_paralyzed: Option<bool>,
    pub is_cursed: Option<bool>,
    pub is_escape_prevented: Option<bool>,
    pub is_tormented: Option<bool>,
    pub light_screen_up: Option<bool>,
    pub reflect_up: Option<bool>,
    pub target_side_reflect_up: Option<bool>,
    pub target_party_status_equals_any: Option<bool>,
    pub safeguard_up: Option<bool>,
    pub ability: u16,
    pub hold_effect: Option<u16>,
    pub current_weather: Option<u8>,
    pub usable_party_mons: Option<u8>,
    pub has_substitute: Option<bool>,
    pub any_move_disabled: Option<bool>,
    pub any_move_encored: Option<bool>,
    pub mist_up: Option<bool>,
    pub gender: Option<FactoryAiMonGender>,
    pub imprisoned_others: Option<bool>,
    pub mud_sport_up: Option<bool>,
    pub water_sport_up: Option<bool>,
    pub used_held_item_id: Option<u16>,
    pub stockpile_count: Option<u8>,
}

/// Target-only additions to the common scored battler view.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiScoredTargetView {
    pub battler: FactoryAiScoredBattlerView,
    pub species: u16,
    pub known_ability: Option<u16>,
    pub species_abilities: Option<[u16; 2]>,
    pub known_moves: Option<[u16; 4]>,
    pub known_moves_tail: Option<FactoryAiKnownMoveHistoryTail>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiScoredView {
    pub factory: FactoryAiMaskSelectionInput,
    pub moves: [u16; FACTORY_AI_MOVE_SLOT_COUNT],
    pub attacker: FactoryAiScoredBattlerView,
    pub target: FactoryAiScoredTargetView,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiTurnStartRandomNumber {
    Decision,
    BattleTurnBoundary { value: u16 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiScoredDecisionInput<'a> {
    pub view: FactoryAiScoredView,
    pub request: FactoryAiMovePolicyRequest<'a>,
    pub rng: BattleRngState,
    /// `None` is the canonical TS function's legacy post-boundary form.
    pub turn_start_random_number: Option<FactoryAiTurnStartRandomNumber>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiTurnStartOwner {
    Decision,
    BattleTurnBoundary,
    LegacyPostBoundary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiTurnStartReceipt {
    pub owner: FactoryAiTurnStartOwner,
    pub value: Option<u16>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiTurnStartDraw {
    pub ordinal: u32,
    pub before: BattleRngState,
    pub after: BattleRngState,
    pub raw_rng_value: u32,
    pub random_value: u16,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiScoringScript {
    CheckBadMove,
    TryToFaint,
    CheckViability,
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiScoredDraw {
    TurnStartRandomNumber(FactoryAiTurnStartDraw),
    SetupSimulatedRng(FactoryAiSetupDraw),
    CheckBadMove {
        move_slot: FactoryAiMoveSlot,
        draw: CheckBadMoveDraw,
    },
    TryToFaint {
        move_slot: FactoryAiMoveSlot,
        draw: FactoryAiTryToFaintDraw,
    },
    CheckViability {
        move_slot: FactoryAiMoveSlot,
        draw: CheckViabilityDraw,
    },
    BestMoveTie(FactoryAiTieDraw),
}

/// One turn-start draw + setup + every leaf's per-slot maximum + final tie.
pub const MAX_FACTORY_AI_SCORED_DRAWS: usize = 1
    + FACTORY_AI_MOVE_SLOT_COUNT
    + FACTORY_AI_MOVE_SLOT_COUNT * MAX_CHECK_BAD_MOVE_DRAWS
    + FACTORY_AI_MOVE_SLOT_COUNT * MAX_TRY_TO_FAINT_DRAWS
    + FACTORY_AI_MOVE_SLOT_COUNT * MAX_CHECK_VIABILITY_DRAWS
    + 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiScoredSlot {
    pub move_slot: FactoryAiMoveSlot,
    pub move_id: u16,
    pub legal: bool,
    pub initial_score: i32,
    pub check_bad_move_delta: Option<i32>,
    pub try_to_faint_delta: Option<i32>,
    pub check_viability_delta: Option<i32>,
    pub final_score: i32,
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiScoredTrace {
    pub mask: u8,
    pub mask_selection: FactoryAiMaskSelection,
    pub executed_scoring_scripts: [Option<FactoryAiScoringScript>; 3],
    pub executed_scoring_script_count: u8,
    pub turn_start_random_number: FactoryAiTurnStartReceipt,
    pub draws: [Option<FactoryAiScoredDraw>; MAX_FACTORY_AI_SCORED_DRAWS],
    pub draw_count: u8,
    pub slot_scores: [FactoryAiScoredSlot; FACTORY_AI_MOVE_SLOT_COUNT],
    pub best_move_slots: [FactoryAiMoveSlot; FACTORY_AI_MOVE_SLOT_COUNT],
    pub best_move_slot_count: u8,
    pub tie_modulus: u8,
    pub tie_index: u8,
    pub chosen_decision: FactoryAiMoveDecision,
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiScoredChoice {
    pub submission: FactoryAiDecisionSubmission,
    pub rng: BattleRngState,
    pub trace: FactoryAiScoredTrace,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiScoredDecisionError {
    Policy(FactoryAiDecisionPolicyError),
    UnknownCheckBadMove {
        move_id: u16,
    },
    CheckBadMoveBarrier {
        move_slot: FactoryAiMoveSlot,
        move_id: u16,
        effect: u16,
    },
    CheckViabilityBarrier {
        move_slot: FactoryAiMoveSlot,
        move_id: u16,
        effect: u16,
    },
}

impl std::fmt::Display for FactoryAiScoredDecisionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Policy(FactoryAiDecisionPolicyError::ViewLevelModeOutOfRange { .. }) => write!(
                f,
                "Factory AI scored view.factory.levelMode must be an integer in 0..2"
            ),
            Self::Policy(FactoryAiDecisionPolicyError::ViewBattleModeOutOfRange { .. }) => write!(
                f,
                "Factory AI scored view.factory.battleMode must be an integer in 0..1"
            ),
            Self::Policy(FactoryAiDecisionPolicyError::ViewFactoryWinStreakOutOfRange {
                ..
            }) => write!(
                f,
                "Factory AI scored view.factory.factoryWinStreak must be an integer in 0..65535"
            ),
            Self::Policy(FactoryAiDecisionPolicyError::ViewTrainerOpponentIdOutOfRange {
                ..
            }) => write!(
                f,
                "Factory AI scored view.factory.trainerOpponentId must be an integer in 0..65535"
            ),
            Self::Policy(FactoryAiDecisionPolicyError::Level50SinglesOnly) => {
                write!(
                    f,
                    "Factory AI scored policy supports only Level-50 Factory singles"
                )
            }
            // `commandRequestAt` is shared with mask zero in canonical TS
            // and retains this historical message even in the scored caller.
            Self::Policy(FactoryAiDecisionPolicyError::CommandRequestsOnly) => {
                write!(f, "Factory AI mask-0 policy supports only command requests")
            }
            Self::Policy(FactoryAiDecisionPolicyError::TrainerBattlerOneRequired) => write!(
                f,
                "Factory AI scored policy requires the current trainer battler-1 request"
            ),
            Self::Policy(FactoryAiDecisionPolicyError::SwitchActionPrechecksUnsupported) => write!(
                f,
                "Factory AI scored move policy does not implement switch action prechecks"
            ),
            Self::Policy(FactoryAiDecisionPolicyError::AtLeastOneLegalMoveRequired) => {
                write!(
                    f,
                    "Factory AI scored policy requires at least one legal move"
                )
            }
            Self::Policy(FactoryAiDecisionPolicyError::UnsupportedSelectedMask {
                branch,
                mask,
            }) => write!(
                f,
                "Factory AI scored policy does not support selected {} mask {mask}",
                branch_name(*branch)
            ),
            Self::Policy(error) => error.fmt(f),
            Self::UnknownCheckBadMove { move_id } => {
                write!(f, "factory-ai-check-bad-move: unknown move {move_id}")
            }
            Self::CheckBadMoveBarrier { move_slot, move_id, effect } => write!(
                f,
                "Factory AI check-bad-move barrier: slot {} move {move_id} effect {effect}",
                *move_slot as u8
            ),
            Self::CheckViabilityBarrier { move_slot, move_id, effect } => write!(
                f,
                "Factory AI check-viability barrier: slot {} move {move_id} effect {effect}",
                *move_slot as u8
            ),
        }
    }
}

impl std::error::Error for FactoryAiScoredDecisionError {}

fn scored_try_battler(view: FactoryAiScoredBattlerView) -> FactoryAiTryToFaintBattler {
    FactoryAiTryToFaintBattler {
        attack: view.attack,
        defense: view.defense,
        sp_attack: view.sp_attack,
        sp_defense: view.sp_defense,
        level: i32::from(view.level),
        types: view.types,
        stat_stages: view.stat_stages,
    }
}

fn scored_cbm_target(view: FactoryAiScoredTargetView) -> FactoryAiCheckBadMoveRoarTarget {
    let battler = view.battler;
    FactoryAiCheckBadMoveRoarTarget {
        target: FactoryAiCheckBadMoveTarget {
            species: view.species,
            types: battler.types,
            known_ability: view.known_ability,
            real_ability: battler.ability,
            speed_stage: battler.speed_stage,
            atk_stage: battler.stat_stages.atk,
            def_stage: battler.stat_stages.def,
            sp_def_stage: battler.stat_stages.sp_def,
            acc_stage: Some(battler.acc_stage),
            evasion_stage: Some(battler.evasion_stage),
            has_any_status: battler.has_any_status,
            safeguard_up: battler.safeguard_up,
            is_confused: battler.is_confused,
            is_leech_seeded: battler.is_leech_seeded,
            is_asleep: battler.is_asleep,
            is_escape_prevented: battler.is_escape_prevented,
            is_tormented: battler.is_tormented,
            has_perish_song: battler.has_perish_song,
            is_nightmared: battler.is_nightmared,
            is_foresighted: battler.is_foresighted,
            spikes_up: battler.spikes_up,
            target_future_attack_up: battler.target_future_attack_up,
            level: Some(battler.level),
            sp_atk_stage: Some(battler.stat_stages.sp_atk),
            is_infatuated: battler.is_infatuated,
            any_move_disabled: battler.any_move_disabled,
            any_move_encored: battler.any_move_encored,
            gender: battler.gender,
        },
        usable_party_mons: battler.usable_party_mons,
    }
}

fn scored_cbm_attacker(view: FactoryAiScoredBattlerView) -> FactoryAiCheckBadMoveAttacker {
    FactoryAiCheckBadMoveAttacker {
        atk_stage: view.stat_stages.atk,
        def_stage: view.stat_stages.def,
        speed_stage: Some(view.speed_stage),
        sp_atk_stage: Some(view.stat_stages.sp_atk),
        sp_def_stage: Some(view.stat_stages.sp_def),
        light_screen_up: view.light_screen_up,
        reflect_up: view.reflect_up,
        evasion_stage: Some(view.evasion_stage),
        attacker_future_attack_up: view.attacker_future_attack_up,
        has_focus_energy: view.has_focus_energy,
        has_curable_status: view.has_curable_status,
        current_weather: view.current_weather,
        level: Some(view.level),
        is_first_turn: Some(view.is_first_turn),
        safeguard_up: view.safeguard_up,
        is_asleep: view.is_asleep,
        usable_party_mons: view.usable_party_mons,
        has_substitute: view.has_substitute,
        hp: Some(view.hp),
        max_hp: Some(view.max_hp),
        is_rooted: view.is_rooted,
        acc_stage: Some(view.acc_stage),
        mist_up: view.mist_up,
        gender: view.gender,
        imprisoned_others: view.imprisoned_others,
        mud_sport_up: view.mud_sport_up,
        water_sport_up: view.water_sport_up,
        used_held_item_id: view.used_held_item_id,
        stockpile_count: view.stockpile_count,
    }
}

fn scored_cv_battler(
    view: FactoryAiScoredBattlerView,
    moves: Option<[u16; 4]>,
    known_moves: Option<[u16; 4]>,
    known_moves_tail: Option<FactoryAiKnownMoveHistoryTail>,
    species_abilities: Option<[u16; 2]>,
    known_ability: Option<u16>,
) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: view.speed,
        speed_stage: view.speed_stage,
        types: view.types,
        is_first_turn: view.is_first_turn,
        evasion_stage: view.evasion_stage,
        acc_stage: view.acc_stage,
        atk_stage: view.stat_stages.atk,
        def_stage: view.stat_stages.def,
        sp_def_stage: view.stat_stages.sp_def,
        hp: view.hp,
        max_hp: view.max_hp,
        sp_atk_stage: Some(view.stat_stages.sp_atk),
        last_used_move_id: view.last_used_move_id,
        is_toxic_poisoned: view.is_toxic_poisoned,
        is_leech_seeded: view.is_leech_seeded,
        is_rooted: view.is_rooted,
        is_cursed: view.is_cursed,
        ability: Some(view.ability),
        current_weather: view.current_weather,
        moves,
        battle_turn_count: view.battle_turn_count,
        known_moves,
        known_moves_tail,
        is_infatuated: view.is_infatuated,
        is_asleep: view.is_asleep,
        is_confused: view.is_confused,
        is_taunted: view.is_taunted,
        has_yawn: view.has_yawn,
        has_perish_song: view.has_perish_song,
        protect_uses: view.protect_uses,
        has_side_reflect: view.target_side_reflect_up,
        is_poisoned: view.is_poisoned,
        is_burned: view.is_burned,
        is_paralyzed: view.is_paralyzed,
        has_substitute: view.has_substitute,
        any_move_disabled: view.any_move_disabled,
        has_any_status: view.has_any_status,
        target_party_status_equals_any: view.target_party_status_equals_any,
        hold_effect: view.hold_effect,
        species_abilities,
        known_ability,
        used_held_item_id: view.used_held_item_id,
        stockpile_count: view.stockpile_count,
    }
}

fn push_scored_draw(
    draws: &mut [Option<FactoryAiScoredDraw>; MAX_FACTORY_AI_SCORED_DRAWS],
    draw_count: &mut usize,
    draw: FactoryAiScoredDraw,
) {
    draws[*draw_count] = Some(draw);
    *draw_count += 1;
}

/// Pure source-complete scored Factory chooser.  Mask 1 runs only
/// CheckBadMove; mask 7 runs CheckBadMove, TryToFaint, then CheckViability as
/// three whole-slot passes.  Illegal slots never execute a leaf.
pub fn choose_factory_ai_scored_decision(
    input: FactoryAiScoredDecisionInput<'_>,
) -> Result<FactoryAiScoredChoice, FactoryAiScoredDecisionError> {
    let mut rng = input.rng;
    let mut draws = [None; MAX_FACTORY_AI_SCORED_DRAWS];
    let mut draw_count = 0usize;
    let turn_start_random_number = match input.turn_start_random_number {
        None => FactoryAiTurnStartReceipt {
            owner: FactoryAiTurnStartOwner::LegacyPostBoundary,
            value: None,
        },
        Some(FactoryAiTurnStartRandomNumber::BattleTurnBoundary { value }) => {
            FactoryAiTurnStartReceipt {
                owner: FactoryAiTurnStartOwner::BattleTurnBoundary,
                value: Some(value),
            }
        }
        Some(FactoryAiTurnStartRandomNumber::Decision) => {
            let (after, shape) = next_draw(rng, 1);
            rng = after;
            let draw = FactoryAiTurnStartDraw {
                ordinal: shape.ordinal,
                before: shape.before,
                after: shape.after,
                raw_rng_value: shape.raw_rng_value,
                random_value: shape.random_value,
            };
            push_scored_draw(
                &mut draws,
                &mut draw_count,
                FactoryAiScoredDraw::TurnStartRandomNumber(draw),
            );
            FactoryAiTurnStartReceipt {
                owner: FactoryAiTurnStartOwner::Decision,
                value: Some(shape.random_value),
            }
        }
    };

    let mut setup = setup_factory_ai_move_policy(FactoryAiMovePolicyInput {
        view: FactoryAiMovePolicyView { factory: input.view.factory, moves: input.view.moves },
        request: input.request,
        rng,
    })
    .map_err(FactoryAiScoredDecisionError::Policy)?;
    if setup.mask_selection.mask != 1 && setup.mask_selection.mask != 7 {
        return Err(FactoryAiScoredDecisionError::Policy(
            FactoryAiDecisionPolicyError::UnsupportedSelectedMask {
                branch: setup.mask_selection.receipt.branch,
                mask: setup.mask_selection.mask,
            },
        ));
    }
    let mask = setup.mask_selection.mask;
    let setup_ordinal_offset = draw_count as u32;
    for setup_draw in &mut setup.setup_draws {
        setup_draw.ordinal += setup_ordinal_offset;
        push_scored_draw(
            &mut draws,
            &mut draw_count,
            FactoryAiScoredDraw::SetupSimulatedRng(*setup_draw),
        );
    }
    rng = setup.rng;
    let simulated_rng = setup.setup_draws.map(|draw| i32::from(draw.simulated_rng));

    let mut slot_scores = setup.slot_scores.map(|score| FactoryAiScoredSlot {
        move_slot: score.move_slot,
        move_id: score.move_id,
        legal: score.legal,
        initial_score: score.initial_score,
        check_bad_move_delta: None,
        try_to_faint_delta: None,
        check_viability_delta: None,
        final_score: score.final_score,
    });

    let cbm_target = scored_cbm_target(input.view.target);
    let cbm_attacker = scored_cbm_attacker(input.view.attacker);
    for score in &mut slot_scores {
        if !score.legal {
            continue;
        }
        if gen_tables::MOVES.get(score.move_id as usize).is_none() {
            return Err(FactoryAiScoredDecisionError::UnknownCheckBadMove {
                move_id: score.move_id,
            });
        }
        match run_check_bad_move_preamble(CheckBadMovePreambleInput {
            rng,
            move_id: score.move_id,
            target: cbm_target,
            attacker: cbm_attacker,
            draw_ordinal_start: draw_count as u32 + 1,
        }) {
            CheckBadMoveResult::Scored {
                rng: after,
                draws: leaf_draws,
                draw_count: leaf_draw_count,
                score_delta,
            } => {
                rng = after;
                for draw in leaf_draws.into_iter().take(leaf_draw_count as usize) {
                    push_scored_draw(
                        &mut draws,
                        &mut draw_count,
                        FactoryAiScoredDraw::CheckBadMove { move_slot: score.move_slot, draw },
                    );
                }
                score.check_bad_move_delta = Some(score_delta);
            }
            CheckBadMoveResult::NotYetPorted { effect, move_id } => {
                return Err(FactoryAiScoredDecisionError::CheckBadMoveBarrier {
                    move_slot: score.move_slot,
                    move_id,
                    effect,
                });
            }
        }
    }

    if mask == 7 {
        let attacker = scored_try_battler(input.view.attacker);
        let target = FactoryAiTryToFaintTarget {
            battler: scored_try_battler(input.view.target.battler),
            hp: input.view.target.battler.hp,
            ability: input.view.target.battler.ability,
        };
        let mut ttf_exit_func_result = None;
        for score in &mut slot_scores {
            if !score.legal {
                continue;
            }
            let TryToFaintResult::Scored {
                rng: after,
                draws: leaf_draws,
                draw_count: leaf_draw_count,
                score_delta,
                most_powerful,
                ..
            } = run_try_to_faint(RunTryToFaintInput {
                rng,
                move_id: score.move_id,
                moveset_index: score.move_slot as u8,
                moveset: input.view.moves,
                simulated_rng,
                attacker,
                target,
                draw_ordinal_start: draw_count as u32 + 1,
            });
            rng = after;
            for draw in leaf_draws.into_iter().take(leaf_draw_count as usize) {
                push_scored_draw(
                    &mut draws,
                    &mut draw_count,
                    FactoryAiScoredDraw::TryToFaint { move_slot: score.move_slot, draw },
                );
            }
            score.try_to_faint_delta = Some(score_delta);
            if let Some(most_powerful) = most_powerful {
                ttf_exit_func_result = Some(match most_powerful {
                    FactoryAiMostPowerful::PowerOther => 0,
                    FactoryAiMostPowerful::NotMostPowerful => 1,
                    FactoryAiMostPowerful::MostPowerful => 2,
                });
            }
        }

        let cv_attacker = scored_cv_battler(
            input.view.attacker,
            Some(input.view.moves),
            None,
            None,
            None,
            None,
        );
        let cv_target = scored_cv_battler(
            input.view.target.battler,
            None,
            input.view.target.known_moves,
            input.view.target.known_moves_tail,
            input.view.target.species_abilities,
            input.view.target.known_ability,
        );
        let mut cv_func_result = ttf_exit_func_result;
        for score in &mut slot_scores {
            if !score.legal {
                continue;
            }
            match run_check_viability(RunCheckViabilityInput {
                rng,
                move_id: score.move_id,
                attacker: cv_attacker,
                target: cv_target,
                stale_func_result_fallback: cv_func_result,
                draw_ordinal_start: draw_count as u32 + 1,
            }) {
                CheckViabilityResult::Scored {
                    rng: after,
                    draws: leaf_draws,
                    draw_count: leaf_draw_count,
                    score_delta,
                    func_result_after,
                } => {
                    rng = after;
                    for draw in leaf_draws.into_iter().take(leaf_draw_count as usize) {
                        push_scored_draw(
                            &mut draws,
                            &mut draw_count,
                            FactoryAiScoredDraw::CheckViability {
                                move_slot: score.move_slot,
                                draw,
                            },
                        );
                    }
                    score.check_viability_delta = Some(score_delta);
                    cv_func_result = func_result_after;
                }
                CheckViabilityResult::NotYetPorted { effect, move_id } => {
                    return Err(FactoryAiScoredDecisionError::CheckViabilityBarrier {
                        move_slot: score.move_slot,
                        move_id,
                        effect,
                    });
                }
            }
        }
    }

    for (native, scored) in setup.slot_scores.iter_mut().zip(&mut slot_scores) {
        if scored.legal {
            scored.final_score = FACTORY_AI_DEFAULT_MOVE_SCORE
                + scored.check_bad_move_delta.unwrap_or(0)
                + scored.try_to_faint_delta.unwrap_or(0)
                + scored.check_viability_delta.unwrap_or(0);
        }
        native.final_score = scored.final_score;
    }
    let best = choose_best_factory_ai_move(
        rng,
        setup.slot_scores,
        setup.legal_decisions,
        draw_count as u32 + 1,
    )
    .map_err(FactoryAiScoredDecisionError::Policy)?;
    push_scored_draw(
        &mut draws,
        &mut draw_count,
        FactoryAiScoredDraw::BestMoveTie(best.tie_draw),
    );

    let executed_scoring_scripts = if mask == 1 {
        [Some(FactoryAiScoringScript::CheckBadMove), None, None]
    } else {
        [
            Some(FactoryAiScoringScript::CheckBadMove),
            Some(FactoryAiScoringScript::TryToFaint),
            Some(FactoryAiScoringScript::CheckViability),
        ]
    };
    let submission = FactoryAiDecisionSubmission {
        request_id: input.request.request_id,
        side: input.request.side,
        decision: best.chosen_decision,
    };
    let trace = FactoryAiScoredTrace {
        mask,
        mask_selection: setup.mask_selection,
        executed_scoring_scripts,
        executed_scoring_script_count: if mask == 1 { 1 } else { 3 },
        turn_start_random_number,
        draws,
        draw_count: draw_count as u8,
        slot_scores,
        best_move_slots: best.best_move_slots,
        best_move_slot_count: best.best_move_slot_count,
        tie_modulus: best.tie_modulus,
        tie_index: best.tie_index,
        chosen_decision: best.chosen_decision,
    };
    Ok(FactoryAiScoredChoice { submission, rng: best.rng, trace })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::damage_calc::{TYPE_GROUND, TYPE_NORMAL, TYPE_PSYCHIC};
    use crate::factory_ai_check_bad_move::{ABILITY_NONE, ABILITY_STURDY};

    const MOVES: [u16; FACTORY_AI_MOVE_SLOT_COUNT] = [85, 86, 69, 273];

    fn input<'a>(legal_decisions: &'a [FactoryAiLegalDecision]) -> FactoryAiMovePolicyInput<'a> {
        FactoryAiMovePolicyInput {
            view: FactoryAiMovePolicyView {
                factory: FactoryAiMaskSelectionInput {
                    level_mode: FACTORY_LEVEL_MODE_50,
                    battle_mode: FACTORY_BATTLE_MODE_SINGLES,
                    factory_win_streak: 0,
                    trainer_opponent_id: 50,
                },
                moves: MOVES,
            },
            request: FactoryAiMovePolicyRequest {
                kind: FactoryAiRequestKind::Command,
                request_id: 73,
                side: FactoryAiDecisionSide::Trainer,
                battler: 1,
                legal_decisions,
            },
            rng: BattleRngState { value: 0x1234_5678, calls: 0 },
        }
    }

    fn scored_battler(types: [u8; 2]) -> FactoryAiScoredBattlerView {
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

    fn scored_input<'a>(
        legal_decisions: &'a [FactoryAiLegalDecision],
        moves: [u16; 4],
        streak: u32,
    ) -> FactoryAiScoredDecisionInput<'a> {
        let attacker = scored_battler([TYPE_PSYCHIC, TYPE_PSYCHIC]);
        let mut target_battler = scored_battler([TYPE_NORMAL, TYPE_NORMAL]);
        target_battler.ability = ABILITY_STURDY;
        FactoryAiScoredDecisionInput {
            view: FactoryAiScoredView {
                factory: FactoryAiMaskSelectionInput {
                    level_mode: 0,
                    battle_mode: 0,
                    factory_win_streak: streak,
                    trainer_opponent_id: 222,
                },
                moves,
                attacker,
                target: FactoryAiScoredTargetView {
                    battler: target_battler,
                    species: 213,
                    known_ability: Some(ABILITY_STURDY),
                    species_abilities: None,
                    known_moves: None,
                    known_moves_tail: None,
                },
            },
            request: FactoryAiMovePolicyRequest {
                kind: FactoryAiRequestKind::Command,
                request_id: 91,
                side: FactoryAiDecisionSide::Trainer,
                battler: 1,
                legal_decisions,
            },
            rng: BattleRngState { value: 1, calls: 0 },
            turn_start_random_number: None,
        }
    }

    #[test]
    fn setup_is_reusable_and_still_draws_for_illegal_slots() {
        let legal = [FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
            move_slot: FactoryAiMoveSlot::Slot3,
            target_battler: 1,
        })];
        let setup = setup_factory_ai_move_policy(input(&legal)).unwrap();
        assert_eq!(setup.rng, BattleRngState { value: 0xf4e0_23dc, calls: 4 });
        assert_eq!(
            setup.setup_draws.map(|draw| draw.simulated_rng),
            [99, 90, 90, 100]
        );
        assert_eq!(
            setup.slot_scores.map(|score| score.final_score),
            [0, 0, 0, 100]
        );
        assert_eq!(setup.legal_decisions[3].unwrap().target_battler, 1);
    }

    #[test]
    fn single_best_move_still_consumes_fifth_draw() {
        let legal = [FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
            move_slot: FactoryAiMoveSlot::Slot3,
            target_battler: 1,
        })];
        let result = choose_factory_ai_mask_zero_decision(input(&legal)).unwrap();
        assert_eq!(result.rng, BattleRngState { value: 0x2684_ad1f, calls: 5 });
        assert_eq!(result.trace.tie_modulus, 1);
        assert_eq!(result.trace.tie_index, 0);
        assert_eq!(result.submission.decision.target_battler, 1);
    }

    #[test]
    fn scored_mask_one_runs_only_check_bad_move_in_slot_major_order() {
        let legal = FactoryAiMoveSlot::ALL.map(|move_slot| {
            FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision { move_slot, target_battler: 0 })
        });
        let mut input = scored_input(&legal, [85, 150, 150, 150], 14);
        input.view.target.battler.types = [TYPE_GROUND, TYPE_GROUND];
        let result = choose_factory_ai_scored_decision(input).unwrap();
        assert_eq!(result.trace.mask, 1);
        assert_eq!(result.trace.executed_scoring_script_count, 1);
        assert_eq!(
            result.trace.slot_scores.map(|score| score.final_score),
            [90, 100, 100, 100]
        );
        assert!(result.trace.slot_scores.iter().all(
            |score| score.try_to_faint_delta.is_none() && score.check_viability_delta.is_none()
        ));
    }

    #[test]
    fn scored_mask_seven_runs_three_whole_slot_passes_and_keeps_targets() {
        let legal = FactoryAiMoveSlot::ALL.map(|move_slot| {
            FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
                move_slot,
                target_battler: if move_slot == FactoryAiMoveSlot::Slot2 {
                    1
                } else {
                    0
                },
            })
        });
        let mut input = scored_input(&legal, [57, 157, 34, 85], 28);
        input.view.target.battler.types = [TYPE_GROUND, TYPE_GROUND];
        input.view.target.battler.hp = 5;
        let result = choose_factory_ai_scored_decision(input).unwrap();
        assert_eq!(result.trace.executed_scoring_script_count, 3);
        assert_eq!(
            result.trace.slot_scores.map(|score| score.final_score),
            [104, 104, 104, 89]
        );
        if result.submission.decision.move_slot == FactoryAiMoveSlot::Slot2 {
            assert_eq!(result.submission.decision.target_battler, 1);
        }
        let phase_order: Vec<u8> = result.trace.draws[..result.trace.draw_count as usize]
            .iter()
            .flatten()
            .filter_map(|draw| match draw {
                FactoryAiScoredDraw::CheckBadMove { .. } => Some(0),
                FactoryAiScoredDraw::TryToFaint { .. } => Some(1),
                FactoryAiScoredDraw::CheckViability { .. } => Some(2),
                _ => None,
            })
            .collect();
        assert!(phase_order.windows(2).all(|window| window[0] <= window[1]));
    }

    #[test]
    fn scored_turn_start_owned_draw_shifts_every_ordinal_and_honors_cursor() {
        let legal = [FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
            move_slot: FactoryAiMoveSlot::Slot3,
            target_battler: 1,
        })];
        let mut input = scored_input(&legal, [150; 4], 14);
        input.rng.calls = 41;
        input.turn_start_random_number = Some(FactoryAiTurnStartRandomNumber::Decision);
        let result = choose_factory_ai_scored_decision(input).unwrap();
        assert_eq!(result.trace.draw_count, 6);
        assert!(matches!(
            result.trace.draws[0],
            Some(FactoryAiScoredDraw::TurnStartRandomNumber(
                FactoryAiTurnStartDraw { ordinal: 1, .. }
            ))
        ));
        assert!(matches!(
            result.trace.draws[1],
            Some(FactoryAiScoredDraw::SetupSimulatedRng(FactoryAiSetupDraw {
                ordinal: 2,
                ..
            }))
        ));
        assert_eq!(result.rng.calls, 47);
        assert_eq!(result.submission.decision.target_battler, 1);
    }

    #[test]
    fn scored_chooser_rejects_mask_zero_with_scored_message() {
        let legal = [FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
            move_slot: FactoryAiMoveSlot::Slot0,
            target_battler: 0,
        })];
        let error =
            choose_factory_ai_scored_decision(scored_input(&legal, [150; 4], 0)).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Factory AI scored policy does not support selected challengeBelow2 mask 0"
        );
    }
}
