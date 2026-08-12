//! Pure Battle Factory trainer selection and seven-battle scheduling, ported
//! from `src/engine/factoryTrainerSchedule.ts`.
//!
//! `GetRandomScaledFrontierTrainerId` chooses exactly one candidate per
//! `Random()` call (`reference/pokeemerald/src/battle_tower.c:1104-1129`).
//! `GenerateOpponentMons` retries every trainer already selected in the
//! current challenge without an attempt cap, and deliberately does not write
//! battle index 6 to save history (`reference/pokeemerald/src/battle_factory.c:
//! 303-329`).  The source-derived ranges and history policy are generated in
//! `gen_tables.rs` from `src/data/gen/factory-round-policy.json`; this module
//! owns only the pure control flow and retained per-draw receipt.

use crate::gen_tables::{
    FactoryTrainerRange, FACTORY_TRAINER_AFTER_CHALLENGE_INDEX,
    FACTORY_TRAINER_AFTER_CHALLENGE_RANGE_INDEX, FACTORY_TRAINER_HARD_BATTLE_INDEX,
    FACTORY_TRAINER_HARD_RANGES, FACTORY_TRAINER_HISTORY_OMIT_FINAL_BATTLE_INDEX,
    FACTORY_TRAINER_HISTORY_WRITE_BATTLE_INDEXES, FACTORY_TRAINER_NORMAL_RANGES,
    FACTORY_TRAINER_STAGES_PER_CHALLENGE,
};
use crate::rng::advance_rng_value;

/// JavaScript's `Number.MAX_SAFE_INTEGER`, retained at the typed Rust input
/// boundary because the canonical source validates `factoryWinStreak` with
/// `Number.isSafeInteger` before deriving its challenge.
pub const MAX_SAFE_INTEGER: i64 = 9_007_199_254_740_991;

/// The source policy's regular Factory schedule width.  This is an alias to
/// generated policy data rather than a hand-fitted seven; it preserves the
/// TS result's fixed seven-slot tuple under the current canonical policy.
pub const FACTORY_TRAINER_SCHEDULE_LEN: usize = FACTORY_TRAINER_STAGES_PER_CHALLENGE as usize;

/// One raw result returned by an injectable trainer RNG port.  Its signed
/// fields intentionally retain the pre-validation domain so native callers
/// can test the same invalid-port-output errors as the TypeScript boundary;
/// accepted ledger values are narrowed to `u32`/`u16` below.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryTrainerRandomDraw {
    pub rng_value: i64,
    pub value: i64,
}

/// Injectable equivalent of TypeScript's `FactoryTrainerRngPort`.  A port is
/// called exactly once for every candidate attempt, including a duplicate
/// retry.  The input has already passed the `rngValue` uint32 validation;
/// output values are validated by this module before use.
pub trait FactoryTrainerRngPort {
    fn draw(&mut self, rng_value: u32) -> FactoryTrainerRandomDraw;
}

/// Source-exact Gen-3 `Random()` implementation used when no scripted port
/// is required.  This is a stateless port object: its cursor is the explicit
/// `rng_value` argument, matching the TS surface.
#[derive(Debug, Clone, Copy, Default)]
pub struct GbaFactoryTrainerRng;

/// Rust's named equivalent of the TS module's default
/// `GBA_FACTORY_TRAINER_RNG` port.  Pass a mutable local copy to the
/// injectable functions, or use the `_gba` convenience wrappers.
pub const GBA_FACTORY_TRAINER_RNG: GbaFactoryTrainerRng = GbaFactoryTrainerRng;

impl FactoryTrainerRngPort for GbaFactoryTrainerRng {
    fn draw(&mut self, rng_value: u32) -> FactoryTrainerRandomDraw {
        let next_rng_value = advance_rng_value(rng_value);
        FactoryTrainerRandomDraw {
            rng_value: i64::from(next_rng_value),
            value: i64::from((next_rng_value >> 16) as u16),
        }
    }
}

/// Source-visible range family retained in each draw receipt.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryTrainerRangeKind {
    Normal,
    Hard,
}

/// One `Random()` candidate, including rejected duplicates.  This mirrors
/// every `FactoryTrainerDrawLedgerEntry` field from the TS surface, with
/// native snake-case names and bounded numeric types after validation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FactoryTrainerDrawLedgerEntry {
    pub battle_index: u8,
    pub attempt: usize,
    pub challenge: i64,
    pub range_index: usize,
    pub range_kind: FactoryTrainerRangeKind,
    pub range_start: u16,
    pub range_end: u16,
    pub rng_before: u32,
    pub rng_after: u32,
    pub raw: u16,
    pub trainer_id: u16,
    pub accepted: bool,
}

/// Result of one source trainer selection.  `stored_trainer_ids` stays
/// `i64` rather than `u16` because TS does not validate history entry values;
/// only its length and equality with generated trainer ids are observable.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FactoryTrainerSelectionResult {
    pub trainer_id: u16,
    pub stored_trainer_ids: Vec<i64>,
    pub rng_value: u32,
    pub draw_count: usize,
    pub ledger: Vec<FactoryTrainerDrawLedgerEntry>,
}

/// Result of the seven regular Factory trainer selections back-to-back from
/// one seed.  The generated stage count drives the vector length; canonical
/// policy data currently supplies seven entries.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FactoryTrainerScheduleResult {
    pub trainer_ids: [u16; FACTORY_TRAINER_SCHEDULE_LEN],
    pub stored_trainer_ids: Vec<i64>,
    pub rng_value: u32,
    pub draw_count: usize,
    pub ledger: Vec<FactoryTrainerDrawLedgerEntry>,
}

/// Typed errors corresponding to every validation throw owned by
/// `factoryTrainerSchedule.ts`.  Rust's `i64` boundary already excludes
/// fractional/NaN values, while preserving negative and over-safe-integer
/// representatives for the source's error classes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryTrainerScheduleError {
    InvalidBattleIndex,
    InvalidRngValue,
    HistoryTooShort { battle_index: u8 },
    InvalidFactoryWinStreak,
    InvalidRngPortRngValue,
    InvalidRngPortValue,
}

impl core::fmt::Display for FactoryTrainerScheduleError {
    fn fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::InvalidBattleIndex => write!(
                formatter,
                "battleIndex must be an integer in [0, {}]",
                FACTORY_TRAINER_STAGES_PER_CHALLENGE - 1
            ),
            Self::InvalidRngValue => formatter.write_str("rngValue must be a uint32"),
            Self::HistoryTooShort { battle_index } => write!(
                formatter,
                "storedTrainerIds must contain the {battle_index} prior battle selections"
            ),
            Self::InvalidFactoryWinStreak => {
                formatter.write_str("factoryWinStreak must be a non-negative safe integer")
            }
            Self::InvalidRngPortRngValue => {
                formatter.write_str("rngPort.draw(...).rngValue must be a uint32")
            }
            Self::InvalidRngPortValue => {
                formatter.write_str("rngPort.draw(...).value must be a uint16")
            }
        }
    }
}

impl std::error::Error for FactoryTrainerScheduleError {}

#[derive(Debug, Clone, Copy)]
struct SelectedTrainerRange {
    challenge: i64,
    range_index: usize,
    range_kind: FactoryTrainerRangeKind,
    range: FactoryTrainerRange,
}

fn checked_battle_index(value: i64) -> Result<u8, FactoryTrainerScheduleError> {
    if value < 0 || value >= i64::from(FACTORY_TRAINER_STAGES_PER_CHALLENGE) {
        return Err(FactoryTrainerScheduleError::InvalidBattleIndex);
    }
    Ok(value as u8)
}

fn checked_input_rng_value(value: i64) -> Result<u32, FactoryTrainerScheduleError> {
    if !(0..=i64::from(u32::MAX)).contains(&value) {
        return Err(FactoryTrainerScheduleError::InvalidRngValue);
    }
    Ok(value as u32)
}

fn checked_port_rng_value(value: i64) -> Result<u32, FactoryTrainerScheduleError> {
    if !(0..=i64::from(u32::MAX)).contains(&value) {
        return Err(FactoryTrainerScheduleError::InvalidRngPortRngValue);
    }
    Ok(value as u32)
}

fn checked_port_value(value: i64) -> Result<u16, FactoryTrainerScheduleError> {
    if !(0..=i64::from(u16::MAX)).contains(&value) {
        return Err(FactoryTrainerScheduleError::InvalidRngPortValue);
    }
    Ok(value as u16)
}

fn trainer_range(
    factory_win_streak: i64,
    battle_index: u8,
) -> Result<SelectedTrainerRange, FactoryTrainerScheduleError> {
    if !(0..=MAX_SAFE_INTEGER).contains(&factory_win_streak) {
        return Err(FactoryTrainerScheduleError::InvalidFactoryWinStreak);
    }
    let challenge = factory_win_streak / i64::from(FACTORY_TRAINER_STAGES_PER_CHALLENGE);
    if challenge > FACTORY_TRAINER_AFTER_CHALLENGE_INDEX {
        let range_index = FACTORY_TRAINER_AFTER_CHALLENGE_RANGE_INDEX;
        return Ok(SelectedTrainerRange {
            challenge,
            range_index,
            range_kind: FactoryTrainerRangeKind::Normal,
            range: FACTORY_TRAINER_NORMAL_RANGES[range_index],
        });
    }

    let range_kind = if battle_index == FACTORY_TRAINER_HARD_BATTLE_INDEX {
        FactoryTrainerRangeKind::Hard
    } else {
        FactoryTrainerRangeKind::Normal
    };
    // `gen-data.mjs` verifies that every raw pre-clamp challenge index names
    // a row in both generated tables.  Challenge is bounded by that same
    // validated policy constant in this arm, so this conversion cannot lose.
    let range_index = usize::try_from(challenge)
        .expect("generated trainer afterChallengeIndex bounds the table index");
    let range = match range_kind {
        FactoryTrainerRangeKind::Normal => FACTORY_TRAINER_NORMAL_RANGES[range_index],
        FactoryTrainerRangeKind::Hard => FACTORY_TRAINER_HARD_RANGES[range_index],
    };
    Ok(SelectedTrainerRange { challenge, range_index, range_kind, range })
}

fn trainer_id_from_raw(range: FactoryTrainerRange, raw: u16) -> u16 {
    let range_size = u32::from(range.end) - u32::from(range.start) + 1;
    let candidate = u32::from(range.start) + (u32::from(raw) % range_size);
    u16::try_from(candidate)
        .expect("generated Factory trainer range endpoints and modulo result fit u16")
}

/// Native injected-port form of `selectFactoryTrainer`.  Validation order
/// deliberately follows the TS function: battle index, input RNG cursor,
/// history length, then source streak/range policy.
pub fn select_factory_trainer<R: FactoryTrainerRngPort + ?Sized>(
    factory_win_streak: i64,
    battle_index_value: i64,
    stored_trainer_ids: &[i64],
    rng_value: i64,
    rng_port: &mut R,
) -> Result<FactoryTrainerSelectionResult, FactoryTrainerScheduleError> {
    let battle_index = checked_battle_index(battle_index_value)?;
    let mut state = checked_input_rng_value(rng_value)?;
    let history_len = usize::from(battle_index);
    if stored_trainer_ids.len() < history_len {
        return Err(FactoryTrainerScheduleError::HistoryTooShort { battle_index });
    }
    let active_history = &stored_trainer_ids[..history_len];
    let selected_range = trainer_range(factory_win_streak, battle_index)?;
    let mut ledger = Vec::new();

    let trainer_id = loop {
        let rng_before = state;
        let draw = rng_port.draw(state);
        let rng_after = checked_port_rng_value(draw.rng_value)?;
        let raw = checked_port_value(draw.value)?;
        state = rng_after;
        let trainer_id = trainer_id_from_raw(selected_range.range, raw);
        let accepted = !active_history.contains(&i64::from(trainer_id));
        ledger.push(FactoryTrainerDrawLedgerEntry {
            battle_index,
            attempt: ledger.len() + 1,
            challenge: selected_range.challenge,
            range_index: selected_range.range_index,
            range_kind: selected_range.range_kind,
            range_start: selected_range.range.start,
            range_end: selected_range.range.end,
            rng_before,
            rng_after,
            raw,
            trainer_id,
            accepted,
        });
        if accepted {
            break trainer_id;
        }
    };

    let should_store = battle_index != FACTORY_TRAINER_HISTORY_OMIT_FINAL_BATTLE_INDEX
        && FACTORY_TRAINER_HISTORY_WRITE_BATTLE_INDEXES.contains(&battle_index);
    let stored_trainer_ids = if should_store {
        let mut history = stored_trainer_ids[..history_len].to_vec();
        history.push(i64::from(trainer_id));
        history
    } else {
        stored_trainer_ids.to_vec()
    };
    Ok(FactoryTrainerSelectionResult {
        trainer_id,
        stored_trainer_ids,
        rng_value: state,
        draw_count: ledger.len(),
        ledger,
    })
}

/// Default Gen-3 RNG convenience form of `selectFactoryTrainer`.
pub fn select_factory_trainer_gba(
    factory_win_streak: i64,
    battle_index_value: i64,
    stored_trainer_ids: &[i64],
    rng_value: i64,
) -> Result<FactoryTrainerSelectionResult, FactoryTrainerScheduleError> {
    let mut rng_port = GBA_FACTORY_TRAINER_RNG;
    select_factory_trainer(
        factory_win_streak,
        battle_index_value,
        stored_trainer_ids,
        rng_value,
        &mut rng_port,
    )
}

/// Native injected-port form of `generateFactoryTrainerSchedule`.  Its seven
/// calls share one source cursor and carry only indexes 0 through 5 into the
/// next selection's duplicate history.
pub fn generate_factory_trainer_schedule<R: FactoryTrainerRngPort + ?Sized>(
    factory_win_streak: i64,
    rng_value: i64,
    rng_port: &mut R,
) -> Result<FactoryTrainerScheduleResult, FactoryTrainerScheduleError> {
    let mut trainer_ids = Vec::with_capacity(usize::from(FACTORY_TRAINER_STAGES_PER_CHALLENGE));
    let mut ledger = Vec::new();
    let mut stored_trainer_ids = Vec::new();
    let mut state = rng_value;

    for battle_index in 0..i64::from(FACTORY_TRAINER_STAGES_PER_CHALLENGE) {
        let selection = select_factory_trainer(
            factory_win_streak,
            battle_index,
            &stored_trainer_ids,
            state,
            rng_port,
        )?;
        trainer_ids.push(selection.trainer_id);
        stored_trainer_ids = selection.stored_trainer_ids;
        state = i64::from(selection.rng_value);
        ledger.extend(selection.ledger);
    }

    Ok(FactoryTrainerScheduleResult {
        trainer_ids: trainer_ids
            .try_into()
            .expect("the generated stages-per-challenge loop fills the fixed schedule tuple"),
        stored_trainer_ids,
        rng_value: state as u32,
        draw_count: ledger.len(),
        ledger,
    })
}

/// Default Gen-3 RNG convenience form of `generateFactoryTrainerSchedule`.
pub fn generate_factory_trainer_schedule_gba(
    factory_win_streak: i64,
    rng_value: i64,
) -> Result<FactoryTrainerScheduleResult, FactoryTrainerScheduleError> {
    let mut rng_port = GBA_FACTORY_TRAINER_RNG;
    generate_factory_trainer_schedule(factory_win_streak, rng_value, &mut rng_port)
}

#[cfg(test)]
mod tests {
    use super::*;

    struct ScriptedRng {
        draws: Vec<FactoryTrainerRandomDraw>,
        index: usize,
    }

    impl ScriptedRng {
        fn new(draws: Vec<FactoryTrainerRandomDraw>) -> Self {
            Self { draws, index: 0 }
        }
    }

    impl FactoryTrainerRngPort for ScriptedRng {
        fn draw(&mut self, _rng_value: u32) -> FactoryTrainerRandomDraw {
            let draw = self.draws[self.index];
            self.index += 1;
            draw
        }
    }

    #[test]
    fn gba_schedule_matches_the_canonical_seeded_fixture() {
        let result = generate_factory_trainer_schedule_gba(0, 0x1234_5678).unwrap();
        assert_eq!(result.trainer_ids, [29, 26, 90, 88, 60, 67, 112]);
        assert_eq!(result.stored_trainer_ids, [29, 26, 90, 88, 60, 67]);
        assert_eq!(result.rng_value, 2_443_977_505);
        assert_eq!(result.draw_count, 7);
        assert!(result.ledger.iter().all(|draw| draw.accepted));
    }

    #[test]
    fn retries_each_prior_trainer_and_does_not_write_final_history() {
        let mut rng = ScriptedRng::new(
            (0..7)
                .map(|value| FactoryTrainerRandomDraw { rng_value: 0x1001 + value, value })
                .collect(),
        );
        let result =
            select_factory_trainer(0, 6, &[100, 101, 102, 103, 104, 105], 0x1000, &mut rng)
                .unwrap();
        assert_eq!(result.trainer_id, 106);
        assert_eq!(result.draw_count, 7);
        assert_eq!(result.rng_value, 0x1007);
        assert_eq!(result.stored_trainer_ids, [100, 101, 102, 103, 104, 105]);
        assert_eq!(
            result
                .ledger
                .iter()
                .map(|draw| draw.accepted)
                .collect::<Vec<_>>(),
            [false, false, false, false, false, false, true]
        );
    }

    #[test]
    fn final_hard_range_and_post_challenge_clamp_are_generated_policy_rows() {
        let mut hard_rng =
            ScriptedRng::new(vec![FactoryTrainerRandomDraw { rng_value: 1, value: 19 }]);
        let hard = select_factory_trainer(0, 6, &[400, 401, 402, 403, 404, 405], 0, &mut hard_rng)
            .unwrap();
        assert_eq!(hard.ledger[0].range_kind, FactoryTrainerRangeKind::Hard);
        assert_eq!(
            (hard.ledger[0].range_start, hard.ledger[0].range_end),
            (100, 119)
        );
        assert_eq!(hard.trainer_id, 119);

        let mut clamp_rng =
            ScriptedRng::new(vec![FactoryTrainerRandomDraw { rng_value: 1, value: 99 }]);
        let clamped =
            select_factory_trainer(8 * 7, 6, &[1, 2, 3, 4, 5, 6], 0, &mut clamp_rng).unwrap();
        assert_eq!(
            clamped.ledger[0].range_kind,
            FactoryTrainerRangeKind::Normal
        );
        assert_eq!(clamped.ledger[0].range_index, 7);
        assert_eq!(
            (clamped.ledger[0].range_start, clamped.ledger[0].range_end),
            (200, 299)
        );
        assert_eq!(clamped.trainer_id, 299);
    }

    #[test]
    fn validation_order_and_port_output_errors_match_typescript() {
        let mut rng = GBA_FACTORY_TRAINER_RNG;
        assert_eq!(
            select_factory_trainer(0, 7, &[], -1, &mut rng)
                .unwrap_err()
                .to_string(),
            "battleIndex must be an integer in [0, 6]"
        );
        assert_eq!(
            select_factory_trainer(0, 1, &[], 0, &mut rng)
                .unwrap_err()
                .to_string(),
            "storedTrainerIds must contain the 1 prior battle selections"
        );
        assert_eq!(
            select_factory_trainer(MAX_SAFE_INTEGER + 1, 0, &[], 0, &mut rng)
                .unwrap_err()
                .to_string(),
            "factoryWinStreak must be a non-negative safe integer"
        );

        let mut bad_rng_value =
            ScriptedRng::new(vec![FactoryTrainerRandomDraw { rng_value: -1, value: 0 }]);
        assert_eq!(
            select_factory_trainer(0, 0, &[], 0, &mut bad_rng_value)
                .unwrap_err()
                .to_string(),
            "rngPort.draw(...).rngValue must be a uint32"
        );
        let mut bad_value = ScriptedRng::new(vec![FactoryTrainerRandomDraw {
            rng_value: 0,
            value: 65_536,
        }]);
        assert_eq!(
            select_factory_trainer(0, 0, &[], 0, &mut bad_value)
                .unwrap_err()
                .to_string(),
            "rngPort.draw(...).value must be a uint16"
        );
    }
}
