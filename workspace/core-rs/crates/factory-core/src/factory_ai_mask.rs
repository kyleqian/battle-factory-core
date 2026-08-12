//! Pure port of `GetAiScriptsInBattleFactory`
//! (`reference/pokeemerald/src/battle_factory.c:889-912`), from
//! `src/engine/factoryAiMaskSelection.ts` (188 lines, its only import
//! `src/data/gen/factory-ai-policy.json`). Selects which Battle Factory AI
//! script mask (`0`, `AI_SCRIPT_CHECK_BAD_MOVE` alone = `1`, or the full
//! `AI_SCRIPT_CHECK_BAD_MOVE | AI_SCRIPT_TRY_TO_FAINT |
//! AI_SCRIPT_CHECK_VIABILITY` = `7`) a battle uses, driven by the generated
//! per-branch mask table (`gen_tables::FACTORY_AI_POLICY_MASKS`, from
//! `src/data/gen/factory-ai-policy.json`).
//!
//! ## Branch id discriminant
//! `FactoryAiPolicyBranchId`'s five variants are the TS module's
//! `FactoryAiPolicyBranchId` string union (`"tent"`, `"frontierBrain"`,
//! `"challengeBelow2"`, `"challengeBelow4"`, `"challengeAtLeast4"`) reduced
//! to their declared `order` as a `#[repr(u8)]` discriminant. The branch
//! *matching* logic (`branchMatches`'s switch, `factoryAiMaskSelection.ts:126-143`)
//! is hardcoded native code here just like in TS; only the resulting `mask`
//! per branch crosses as generated data. `condition`/`flags` strings stay
//! TS-side — M5c's adapter renders them for receipts/UI; this native port
//! only needs the id to select a mask.
//!
//! ## Policy-table validation (TS quirk 1)
//! TS's `failPolicy` throws re-validate the imported JSON at module load
//! (schema tag, branch order/id/mask domain, `frontierStagesPerChallenge`
//! positivity) because TS imports raw JSON at runtime. Rust bakes that
//! validation into `core-rs/tools/gen-data.mjs` at codegen time instead
//! (the `FRONTIER_MONS` index-order check in that script is the same
//! precedent) — `gen_tables::FACTORY_AI_POLICY_MASKS` is trusted, checked
//! data, so the one `failPolicy` call reachable from *within*
//! `selectFactoryAiMask` itself (the "no branch matched" fallback,
//! `factoryAiMaskSelection.ts:171`) is asserted with `.expect()` below
//! instead of a `Result` variant, mirroring `mon_construction.rs`'s
//! `PartyMemberError` doc comment ("every other TS throw ... is impossible
//! against the generated gen_tables ... so those lookups use `.expect()`").
//!
//! ## Error surface (TS quirk 2)
//! TS's `requireIntegerInRange` rejects non-integers/negatives/`NaN`/
//! `Infinity` at runtime because every input arrives as a loosely-typed JS
//! `number`. Rust's `u8`/`u32` parameter types make the non-integer and
//! negative cases unrepresentable at the call site, so `FactoryAiMaskError`
//! only covers the upper-bound violations that remain reachable — the same
//! four error sites (`factoryAiMaskSelection.ts:152-155`), a strict subset
//! of the values that trigger them in TS.

use crate::gen_tables;

pub const FACTORY_LEVEL_MODE_50: u8 = 0;
pub const FACTORY_LEVEL_MODE_OPEN: u8 = 1;
pub const FACTORY_LEVEL_MODE_TENT: u8 = 2;
pub const FACTORY_BATTLE_MODE_SINGLES: u8 = 0;
pub const FACTORY_BATTLE_MODE_DOUBLES: u8 = 1;
/// `TRAINER_FRONTIER_BRAIN` (`include/constants/trainers.h`), mirrored from
/// `factoryAiMaskSelection.ts:8`.
pub const TRAINER_FRONTIER_BRAIN: u32 = 1022;

/// `factoryWinStreak`/`trainerOpponentId`'s documented storage domain
/// (`factoryAiMaskSelection.ts`'s doc comment: "u16 streak/trainer values").
const U16_MAX: u32 = 0xffff;

const NUM_FACTORY_AI_BRANCHES: usize = 5;

/// The TS module's `FactoryAiPolicyBranchId` string union, reduced to its
/// declared `order` (see the module doc comment). Discriminants match
/// `gen_tables::FACTORY_AI_POLICY_MASKS`'s index order 1:1.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiPolicyBranchId {
    Tent = 0,
    FrontierBrain = 1,
    ChallengeBelow2 = 2,
    ChallengeBelow4 = 3,
    ChallengeAtLeast4 = 4,
}

const BRANCH_ORDER: [FactoryAiPolicyBranchId; NUM_FACTORY_AI_BRANCHES] = [
    FactoryAiPolicyBranchId::Tent,
    FactoryAiPolicyBranchId::FrontierBrain,
    FactoryAiPolicyBranchId::ChallengeBelow2,
    FactoryAiPolicyBranchId::ChallengeBelow4,
    FactoryAiPolicyBranchId::ChallengeAtLeast4,
];

/// Mirrors `FactoryAiMaskSelectionInput` (`factoryAiMaskSelection.ts:25-30`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMaskSelectionInput {
    pub level_mode: u8,
    pub battle_mode: u8,
    pub factory_win_streak: u32,
    pub trainer_opponent_id: u32,
}

/// Mirrors one `receipt.evaluations[]` entry
/// (`factoryAiMaskSelection.ts:43-47`), minus the string `id` (see the
/// module doc comment).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiBranchEvaluation {
    pub branch: FactoryAiPolicyBranchId,
    pub matched: bool,
}

/// Mirrors `FactoryAiMaskSelectionReceipt` (`factoryAiMaskSelection.ts:32-55`),
/// minus the `schema` tag (a JSON-runtime-safety idiom the Rust type system
/// makes unnecessary) and the `condition`/`flags` strings (see the module
/// doc comment). `evaluations`/`evaluation_count` mirror the fixed-array +
/// count pattern `turn_vectors_gen.rs`'s `SortCase` already uses for the
/// same reason (this crate has zero dependencies, so no heap `Vec` in a
/// `Copy` struct) — the source loop breaks at the first match
/// (`factoryAiMaskSelection.ts:163-169`), so `evaluation_count` is in
/// `1..=NUM_FACTORY_AI_BRANCHES`, not always 5.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMaskSelectionReceipt {
    pub inputs: FactoryAiMaskSelectionInput,
    pub is_frontier_brain: bool,
    pub frontier_stages_per_challenge: u32,
    /// `None` in Tent mode, where the source returns before computing an
    /// indexed challenge (`factoryAiMaskSelection.ts:158-160`).
    pub challenge_number: Option<u32>,
    pub evaluations: [FactoryAiBranchEvaluation; NUM_FACTORY_AI_BRANCHES],
    pub evaluation_count: u8,
    pub branch: FactoryAiPolicyBranchId,
    pub mask: u8,
}

/// Mirrors `FactoryAiMaskSelection` (`factoryAiMaskSelection.ts:57-60`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiMaskSelection {
    pub mask: u8,
    pub receipt: FactoryAiMaskSelectionReceipt,
}

/// Mirrors the four `requireIntegerInRange` `RangeError` throws
/// (`factoryAiMaskSelection.ts:120-124`, called at
/// `factoryAiMaskSelection.ts:152-155`) — see the module doc comment for
/// why this is a strict subset of TS's triggering values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiMaskError {
    /// `requireIntegerInRange("levelMode", ..., 0, FACTORY_LEVEL_MODE_TENT)`.
    LevelModeOutOfRange { value: u8 },
    /// `requireIntegerInRange("battleMode", ..., 0, FACTORY_BATTLE_MODE_DOUBLES)`.
    BattleModeOutOfRange { value: u8 },
    /// `requireIntegerInRange("factoryWinStreak", ..., 0, 0xffff)`.
    FactoryWinStreakOutOfRange { value: u32 },
    /// `requireIntegerInRange("trainerOpponentId", ..., 0, 0xffff)`.
    TrainerOpponentIdOutOfRange { value: u32 },
}

impl std::fmt::Display for FactoryAiMaskError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FactoryAiMaskError::LevelModeOutOfRange { value } => write!(
                f,
                "levelMode must be an integer from {FACTORY_LEVEL_MODE_50} through {FACTORY_LEVEL_MODE_TENT}, got {value}"
            ),
            FactoryAiMaskError::BattleModeOutOfRange { value } => write!(
                f,
                "battleMode must be an integer from {FACTORY_BATTLE_MODE_SINGLES} through {FACTORY_BATTLE_MODE_DOUBLES}, got {value}"
            ),
            FactoryAiMaskError::FactoryWinStreakOutOfRange { value } => write!(
                f,
                "factoryWinStreak must be an integer from 0 through {U16_MAX}, got {value}"
            ),
            FactoryAiMaskError::TrainerOpponentIdOutOfRange { value } => write!(
                f,
                "trainerOpponentId must be an integer from 0 through {U16_MAX}, got {value}"
            ),
        }
    }
}

impl std::error::Error for FactoryAiMaskError {}

/// `branchMatches` (`factoryAiMaskSelection.ts:126-143`).
fn branch_matches(
    id: FactoryAiPolicyBranchId,
    input: &FactoryAiMaskSelectionInput,
    challenge_number: Option<u32>,
) -> bool {
    match id {
        FactoryAiPolicyBranchId::Tent => input.level_mode == FACTORY_LEVEL_MODE_TENT,
        FactoryAiPolicyBranchId::FrontierBrain => {
            input.trainer_opponent_id == TRAINER_FRONTIER_BRAIN
        }
        FactoryAiPolicyBranchId::ChallengeBelow2 => challenge_number.is_some_and(|c| c < 2),
        FactoryAiPolicyBranchId::ChallengeBelow4 => challenge_number.is_some_and(|c| c < 4),
        FactoryAiPolicyBranchId::ChallengeAtLeast4 => challenge_number.is_some(),
    }
}

/// Pure port of `battle_factory.c:GetAiScriptsInBattleFactory` via
/// `selectFactoryAiMask` (`factoryAiMaskSelection.ts:151-188`).
///
/// The numeric domains mirror the source storage/indexes: level modes 0/1
/// plus the Tent sentinel 2, battle-mode indexes 0/1, and u16 streak/trainer
/// values (documented, not type-enforced — see `FactoryAiMaskError`).
pub fn select_factory_ai_mask(
    input: FactoryAiMaskSelectionInput,
) -> Result<FactoryAiMaskSelection, FactoryAiMaskError> {
    if input.level_mode > FACTORY_LEVEL_MODE_TENT {
        return Err(FactoryAiMaskError::LevelModeOutOfRange { value: input.level_mode });
    }
    if input.battle_mode > FACTORY_BATTLE_MODE_DOUBLES {
        return Err(FactoryAiMaskError::BattleModeOutOfRange { value: input.battle_mode });
    }
    if input.factory_win_streak > U16_MAX {
        return Err(FactoryAiMaskError::FactoryWinStreakOutOfRange {
            value: input.factory_win_streak,
        });
    }
    if input.trainer_opponent_id > U16_MAX {
        return Err(FactoryAiMaskError::TrainerOpponentIdOutOfRange {
            value: input.trainer_opponent_id,
        });
    }

    // The source returns before reading the indexed streak in Tent mode
    // (factoryAiMaskSelection.ts:157-160).
    let challenge_number = if input.level_mode == FACTORY_LEVEL_MODE_TENT {
        None
    } else {
        Some(input.factory_win_streak / gen_tables::FACTORY_AI_FRONTIER_STAGES_PER_CHALLENGE)
    };

    let mut evaluations =
        [FactoryAiBranchEvaluation { branch: FactoryAiPolicyBranchId::Tent, matched: false };
            NUM_FACTORY_AI_BRANCHES];
    let mut evaluation_count: u8 = 0;
    let mut selected: Option<FactoryAiPolicyBranchId> = None;
    for &id in &BRANCH_ORDER {
        let matched = branch_matches(id, &input, challenge_number);
        evaluations[evaluation_count as usize] = FactoryAiBranchEvaluation { branch: id, matched };
        evaluation_count += 1;
        if matched {
            selected = Some(id);
            break;
        }
    }
    // challengeAtLeast4 (the last branch) unconditionally matches whenever
    // it's reached, since its condition is only `challenge_number.is_some()`
    // and every non-Tent input reaches it with `Some` (Tent's own branch
    // matches first). See the module doc comment: guaranteed by
    // gen-data.mjs's codegen-time policy validation, mirroring
    // mon_construction.rs's precedent for impossible-by-construction throws.
    let branch = selected
        .expect("the source branch sequence always selects a mask (factoryAiMaskSelection.ts:171)");
    let mask = gen_tables::FACTORY_AI_POLICY_MASKS[branch as usize];

    Ok(FactoryAiMaskSelection {
        mask,
        receipt: FactoryAiMaskSelectionReceipt {
            inputs: input,
            is_frontier_brain: input.trainer_opponent_id == TRAINER_FRONTIER_BRAIN,
            frontier_stages_per_challenge: gen_tables::FACTORY_AI_FRONTIER_STAGES_PER_CHALLENGE,
            challenge_number,
            evaluations,
            evaluation_count,
            branch,
            mask,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(
        level_mode: u8,
        battle_mode: u8,
        factory_win_streak: u32,
        trainer_opponent_id: u32,
    ) -> FactoryAiMaskSelectionInput {
        FactoryAiMaskSelectionInput {
            level_mode,
            battle_mode,
            factory_win_streak,
            trainer_opponent_id,
        }
    }

    // Pinned directly against tests/factoryAiMaskSelection.test.ts (READ-ONLY).

    #[test]
    fn tent_precedence_over_frontier_brain_no_challenge_number() {
        // tests/factoryAiMaskSelection.test.ts:26-42.
        let result = select_factory_ai_mask(input(
            FACTORY_LEVEL_MODE_TENT,
            FACTORY_BATTLE_MODE_SINGLES,
            0xffff,
            TRAINER_FRONTIER_BRAIN,
        ))
        .unwrap();
        assert_eq!(result.mask, 0);
        assert_eq!(result.receipt.challenge_number, None);
        assert!(result.receipt.is_frontier_brain);
        assert_eq!(result.receipt.branch, FactoryAiPolicyBranchId::Tent);
        assert_eq!(result.receipt.evaluation_count, 1);
        assert!(result.receipt.evaluations[0].matched);
    }

    #[test]
    fn frontier_brain_precedence_over_every_ordinary_challenge_band() {
        // tests/factoryAiMaskSelection.test.ts:44-54.
        for streak in [0u32, 7, 14, 21, 28, 0xffff] {
            let result = select_factory_ai_mask(input(
                FACTORY_LEVEL_MODE_50,
                FACTORY_BATTLE_MODE_SINGLES,
                streak,
                TRAINER_FRONTIER_BRAIN,
            ))
            .unwrap();
            assert_eq!(result.mask, 7, "streak={streak}");
            assert_eq!(
                result.receipt.branch,
                FactoryAiPolicyBranchId::FrontierBrain,
                "streak={streak}"
            );
            assert_eq!(result.receipt.evaluation_count, 2, "streak={streak}");
            assert!(!result.receipt.evaluations[0].matched);
            assert!(result.receipt.evaluations[1].matched);
        }
    }

    #[test]
    fn streak_maps_to_challenge_and_mask() {
        // tests/factoryAiMaskSelection.test.ts:56-78.
        const ORDINARY_TRAINER: u32 = 299;
        let cases: [(u32, u32, u8, FactoryAiPolicyBranchId); 10] = [
            (0, 0, 0, FactoryAiPolicyBranchId::ChallengeBelow2),
            (6, 0, 0, FactoryAiPolicyBranchId::ChallengeBelow2),
            (7, 1, 0, FactoryAiPolicyBranchId::ChallengeBelow2),
            (13, 1, 0, FactoryAiPolicyBranchId::ChallengeBelow2),
            (14, 2, 1, FactoryAiPolicyBranchId::ChallengeBelow4),
            (20, 2, 1, FactoryAiPolicyBranchId::ChallengeBelow4),
            (21, 3, 1, FactoryAiPolicyBranchId::ChallengeBelow4),
            (27, 3, 1, FactoryAiPolicyBranchId::ChallengeBelow4),
            (28, 4, 7, FactoryAiPolicyBranchId::ChallengeAtLeast4),
            (0xffff, 9362, 7, FactoryAiPolicyBranchId::ChallengeAtLeast4),
        ];
        for (streak, challenge, mask, branch) in cases {
            let result = select_factory_ai_mask(input(
                FACTORY_LEVEL_MODE_50,
                FACTORY_BATTLE_MODE_SINGLES,
                streak,
                ORDINARY_TRAINER,
            ))
            .unwrap();
            assert_eq!(result.mask, mask, "streak={streak}");
            assert_eq!(
                result.receipt.challenge_number,
                Some(challenge),
                "streak={streak}"
            );
            assert_eq!(result.receipt.branch, branch, "streak={streak}");
            assert_eq!(result.receipt.frontier_stages_per_challenge, 7);
        }
    }

    #[test]
    fn evaluates_all_five_source_branches_in_order_when_none_match_early() {
        // tests/factoryAiMaskSelection.test.ts:80-98.
        const ORDINARY_TRAINER: u32 = 299;
        let result = select_factory_ai_mask(input(
            FACTORY_LEVEL_MODE_50,
            FACTORY_BATTLE_MODE_SINGLES,
            28,
            ORDINARY_TRAINER,
        ))
        .unwrap();
        assert_eq!(result.receipt.evaluation_count, 5);
        let expected_matched = [false, false, false, false, true];
        for (i, expected) in expected_matched.into_iter().enumerate() {
            assert_eq!(
                result.receipt.evaluations[i].matched, expected,
                "evaluation {i}"
            );
        }
        assert_eq!(
            result.receipt.branch,
            FactoryAiPolicyBranchId::ChallengeAtLeast4
        );
        assert_eq!(result.mask, 7);
    }

    #[test]
    fn same_source_bands_in_level_mode_50_and_open() {
        // tests/factoryAiMaskSelection.test.ts:100-107.
        const ORDINARY_TRAINER: u32 = 299;
        for level_mode in [FACTORY_LEVEL_MODE_50, FACTORY_LEVEL_MODE_OPEN] {
            assert_eq!(
                select_factory_ai_mask(input(
                    level_mode,
                    FACTORY_BATTLE_MODE_SINGLES,
                    0,
                    ORDINARY_TRAINER
                ))
                .unwrap()
                .mask,
                0
            );
            assert_eq!(
                select_factory_ai_mask(input(
                    level_mode,
                    FACTORY_BATTLE_MODE_SINGLES,
                    14,
                    ORDINARY_TRAINER
                ))
                .unwrap()
                .mask,
                1
            );
            assert_eq!(
                select_factory_ai_mask(input(
                    level_mode,
                    FACTORY_BATTLE_MODE_SINGLES,
                    28,
                    ORDINARY_TRAINER
                ))
                .unwrap()
                .mask,
                7
            );
        }
    }

    #[test]
    fn battle_mode_does_not_affect_selection() {
        // tests/factoryAiMaskSelection.test.ts:109-116.
        const ORDINARY_TRAINER: u32 = 299;
        for battle_mode in [FACTORY_BATTLE_MODE_SINGLES, FACTORY_BATTLE_MODE_DOUBLES] {
            let result = select_factory_ai_mask(input(
                FACTORY_LEVEL_MODE_50,
                battle_mode,
                14,
                ORDINARY_TRAINER,
            ))
            .unwrap();
            assert_eq!(result.mask, 1);
            assert_eq!(result.receipt.inputs.battle_mode, battle_mode);
        }
    }

    // Directed error cases (tests/factoryAiMaskSelection.test.ts:118-126):
    // only the upper-bound violations are representable by u8/u32 inputs —
    // see the module doc comment ("Error surface (TS quirk 2)").

    #[test]
    fn rejects_level_mode_above_tent() {
        assert_eq!(
            select_factory_ai_mask(input(3, 0, 0, 0)),
            Err(FactoryAiMaskError::LevelModeOutOfRange { value: 3 })
        );
        assert_eq!(
            select_factory_ai_mask(input(255, 0, 0, 0)),
            Err(FactoryAiMaskError::LevelModeOutOfRange { value: 255 })
        );
    }

    #[test]
    fn rejects_battle_mode_above_doubles() {
        assert_eq!(
            select_factory_ai_mask(input(0, 2, 0, 0)),
            Err(FactoryAiMaskError::BattleModeOutOfRange { value: 2 })
        );
        assert_eq!(
            select_factory_ai_mask(input(0, 255, 0, 0)),
            Err(FactoryAiMaskError::BattleModeOutOfRange { value: 255 })
        );
    }

    #[test]
    fn rejects_factory_win_streak_above_u16_max() {
        assert_eq!(
            select_factory_ai_mask(input(0, 0, 0x1_0000, 0)),
            Err(FactoryAiMaskError::FactoryWinStreakOutOfRange { value: 0x1_0000 })
        );
        assert_eq!(
            select_factory_ai_mask(input(0, 0, u32::MAX, 0)),
            Err(FactoryAiMaskError::FactoryWinStreakOutOfRange { value: u32::MAX })
        );
    }

    #[test]
    fn rejects_trainer_opponent_id_above_u16_max() {
        assert_eq!(
            select_factory_ai_mask(input(0, 0, 0, 0x1_0000)),
            Err(FactoryAiMaskError::TrainerOpponentIdOutOfRange { value: 0x1_0000 })
        );
        assert_eq!(
            select_factory_ai_mask(input(0, 0, 0, u32::MAX)),
            Err(FactoryAiMaskError::TrainerOpponentIdOutOfRange { value: u32::MAX })
        );
    }

    #[test]
    fn error_checks_run_level_mode_battle_mode_streak_trainer_in_order() {
        // Site parity: the first offending field in requireIntegerInRange
        // call order (factoryAiMaskSelection.ts:152-155) wins when several
        // fields are simultaneously invalid.
        assert_eq!(
            select_factory_ai_mask(input(3, 2, 0x1_0000, 0x1_0000)),
            Err(FactoryAiMaskError::LevelModeOutOfRange { value: 3 })
        );
        assert_eq!(
            select_factory_ai_mask(input(0, 2, 0x1_0000, 0x1_0000)),
            Err(FactoryAiMaskError::BattleModeOutOfRange { value: 2 })
        );
        assert_eq!(
            select_factory_ai_mask(input(0, 0, 0x1_0000, 0x1_0000)),
            Err(FactoryAiMaskError::FactoryWinStreakOutOfRange { value: 0x1_0000 })
        );
    }
}
