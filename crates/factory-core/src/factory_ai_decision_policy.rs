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

use crate::factory_ai_check_bad_move::BattleRngState;
use crate::factory_ai_mask::{
    select_factory_ai_mask, FactoryAiMaskError, FactoryAiMaskSelection,
    FactoryAiMaskSelectionInput, FactoryAiPolicyBranchId, FACTORY_BATTLE_MODE_DOUBLES,
    FACTORY_BATTLE_MODE_SINGLES, FACTORY_LEVEL_MODE_50, FACTORY_LEVEL_MODE_TENT,
};
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
