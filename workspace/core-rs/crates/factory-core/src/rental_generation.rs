//! Battle Factory initial-rental generation and instance construction,
//! ported from `src/engine/factoryRentalGeneration.ts` (the TS engine is
//! the spec — see that module's header comment for the two-phase
//! source-order explanation this port reproduces exactly).
//!
//! Source order (mirrors the TS module's `drawLedger` ordering):
//! 1. `GenerateInitialRentalMons` selects all six set ids
//!    (`reference/pokeemerald/src/battle_factory.c:509-601`). Its
//!    `while (i != PARTY_SIZE)` has no attempt cap. Every attempt calls
//!    `GetFactoryMonId` exactly once, and that helper consumes exactly one
//!    `Random()` (`:829-866`).
//! 2. The draft screen later constructs the six selectable mons in slot
//!    order (`reference/pokeemerald/src/battle_factory_screen.c:1736-1777`).
//!    Each personality attempt is one `Random32()`
//!    (`reference/pokeemerald/src/pokemon.c:2569-2575`), i.e. two ordered
//!    `Random()` calls (`reference/pokeemerald/include/random.h:7-16`).
//!
//! In the ROM those phases are separated by presentation time; callers may
//! provide `construction_rng_value` to reconcile a live receipt. Omitting
//! it runs the two source loops back-to-back — the pure-generation
//! contract; see `GenerationInput::construction_rng_value`.

use crate::gen_tables::{self, RentalRange};
use crate::rental_data::{
    ability_slot_for_personality, get_factory_rental_rank, get_level50_factory_rental_range,
    get_level50_initial_rental_fixed_iv, nature_from_personality,
};
use crate::rng::advance_rng_value;

const SELECTABLE_MONS_COUNT: usize = 6;
const STAGES_PER_CHALLENGE: u32 = 7;

/// One Random() call: advances gRngValue, returns it plus its upper 16
/// bits. Mirrors `randomU16` (`src/engine/opponentGen.ts`).
fn random_u16(rng_value: u32) -> (u32, u16) {
    let next = advance_rng_value(rng_value);
    (next, (next >> 16) as u16)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Phase {
    SetSelection = 0,
    Personality = 1,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Purpose {
    SetCandidate = 0,
    PersonalityLow = 1,
    PersonalityHigh = 2,
}

/// Mirrors `FactoryRentalSelectionRejection` plus the accepted case
/// (`src/engine/factoryRentalGeneration.ts`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum SelectionOutcome {
    Accepted = 0,
    Unown = 1,
    DuplicateSet = 2,
    DuplicateSpecies = 3,
    DuplicateItem = 4,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum PersonalityOutcome {
    Accepted = 0,
    WrongNature = 1,
}

/// Mirrors `FactoryRentalDrawLedgerEntry`. Fields are grouped by phase:
/// selection draws populate `range`/`better_range`/`candidate_set_id`/
/// `selection_outcome` and leave the personality fields `None`;
/// personality draws populate `personality`/`personality_outcome` and
/// leave the selection fields `None` — exactly the TS type's
/// optional-field split (present-or-absent, not zero-filled).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DrawLedgerEntry {
    pub position: u32,
    pub phase: Phase,
    pub rental_index: u8,
    pub purpose: Purpose,
    pub rng_before: u32,
    pub rng_after: u32,
    pub random_u16: u16,
    /// Present on selection draws.
    pub range: Option<RentalRange>,
    pub better_range: Option<bool>,
    pub candidate_set_id: Option<u16>,
    pub selection_outcome: Option<SelectionOutcome>,
    /// Present on both words of a completed Random32() personality attempt.
    pub personality: Option<u32>,
    pub personality_outcome: Option<PersonalityOutcome>,
}

/// Mirrors `FactoryInitialRentalRecord`'s scalar identity fields. The TS
/// type also mixes in `FactoryCorpusPartyInstance`'s shape for downstream
/// party construction (`src/engine/factoryCorpusParty.ts`), which is out
/// of scope for this port — species/item resolution to names lives in the
/// TS-side wasm decoder (`core-rs/adapter/factoryEngine.ts`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RentalRecord {
    pub set_id: u16,
    pub personality: u32,
    pub fixed_iv: u8,
    pub ability_slot: u8,
    pub ot_id: u32,
    pub species_id: u16,
    pub item_id: u16,
    pub nature: u8,
    pub selection_draw_position: u16,
    pub personality_draw_positions: [u16; 2],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GenerationResult {
    pub challenge_num: u32,
    pub rental_rank: u8,
    pub rentals: [RentalRecord; SELECTABLE_MONS_COUNT],
    /// Cursor immediately after the six set ids have been accepted.
    pub selection_rng_value: u32,
    /// Cursor immediately after all six personalities have been accepted
    /// (or, on error, the last successfully advanced cursor).
    pub rng_value: u32,
    pub draw_ledger: Vec<DrawLedgerEntry>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GenerationInput {
    pub rng_value: u32,
    /// Source factoryWinStreak / FRONTIER_STAGES_PER_CHALLENGE.
    pub factory_win_streak: u32,
    /// Source factoryRentsCount for the already-selected battle/level mode.
    pub rents_count: u32,
    /// T1_READ_32(gSaveBlock2Ptr->playerTrainerId), used as OT_ID_PRESET.
    pub player_trainer_id: u32,
    /// Optional source checkpoint at CreateFrontierFactorySelectableMons.
    /// When absent, construction starts at `selection_rng_value`.
    pub construction_rng_value: Option<u32>,
}

/// Mirrors the two `Error` throws in `generateInitialFactoryRentals`
/// (`src/engine/factoryRentalGeneration.ts`). Set/item table lookups are
/// impossible-by-construction against the generated tables (see
/// `gen_tables.rs` / `core-rs/tools/gen-data.mjs`) and panic via `.expect`
/// instead of returning an error variant here.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GenerationError {
    /// `challenge_num = factory_win_streak / 7` exceeded the source-defined
    /// 0..=7 row range (`battle_factory.c:829-866`).
    ChallengeOutOfRange { challenge_num: u32 },
    /// `get_level50_initial_rental_fixed_iv` has no row for
    /// `challenge_num + better_range`
    /// (`battle_factory_screen.c:1757-1771`). Reachable at
    /// `challenge_num == 7` whenever the accepted rental's positional
    /// `better_range` is true (i.e. `rental_rank > 0`) — this is a genuine
    /// TS-engine throw, not a data-table gap; confirmed against the TS
    /// engine via `node --experimental-strip-types` (see
    /// `tests/factoryRentalParity.test.ts`).
    FixedIvUndefined {
        challenge_num: u32,
        better_range: bool,
    },
}

impl std::fmt::Display for GenerationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GenerationError::ChallengeOutOfRange { challenge_num } => write!(
                f,
                "Level-50 initial rental generation supports source challenges 0..7, got {challenge_num}"
            ),
            GenerationError::FixedIvUndefined { challenge_num, better_range } => write!(
                f,
                "initial-rental fixed IV is undefined for challenge {challenge_num}{}",
                if *better_range { " better range" } else { "" }
            ),
        }
    }
}

struct SelectedRental {
    set_id: u16,
    species_id: u16,
    item_id: u16,
    better_range: bool,
    selection_draw_position: u32,
}

/// Ports `generateInitialFactoryRentals`
/// (`src/engine/factoryRentalGeneration.ts`).
pub fn generate_initial_factory_rentals(
    input: GenerationInput,
) -> Result<GenerationResult, GenerationError> {
    let mut rng_value = input.rng_value;
    let challenge_num = input.factory_win_streak / STAGES_PER_CHALLENGE;
    // See get_level50_initial_rental_fixed_iv's doc comment: avoid
    // pretending the retail OOB read for challenge 8+ is a stable rule.
    if challenge_num > 7 {
        return Err(GenerationError::ChallengeOutOfRange { challenge_num });
    }
    let rental_rank = get_factory_rental_rank(input.rents_count);
    let ot_id = input.player_trainer_id;
    let mut ledger: Vec<DrawLedgerEntry> = Vec::new();
    let mut selected: Vec<SelectedRental> = Vec::with_capacity(SELECTABLE_MONS_COUNT);

    // `curr_species` is intentionally global to the loop, reproducing the
    // source's unusual stateful species retry exactly
    // (`battle_factory.c:553-589`). Do not simplify this to a set: the C
    // can provisionally allow the first same-species candidate, and resets
    // curr_species only on its same-item rejection path.
    let mut curr_species: Option<u16> = None;
    while selected.len() != SELECTABLE_MONS_COUNT {
        let rental_index = selected.len();
        let better_range = (rental_index as u8) < rental_rank;
        let (range_start, range_end) =
            get_level50_factory_rental_range(challenge_num, better_range);
        let range = RentalRange { start: range_start, end: range_end };
        let draw_position = ledger.len() as u32;
        let rng_before = rng_value;
        let (next_rng, draw_value) = random_u16(rng_value);
        rng_value = next_rng;
        let set_id = range_start + (draw_value % (range_end - range_start + 1));
        let candidate = gen_tables::FRONTIER_MONS.get(set_id as usize).expect(
            "rental ranges are bounds-checked against FRONTIER_MONS by core-rs/tools/gen-data.mjs",
        );
        let item_id = *gen_tables::HELD_ITEM_BY_TABLE_ID
            .get(candidate.item_table_id as usize)
            .expect(
                "battle-frontier-mons.json itemTableId values are validated dense against \
                 battle-frontier-held-items.json by core-rs/tools/gen-data.mjs",
            );

        let mut outcome = SelectionOutcome::Accepted;
        if candidate.species_id == gen_tables::SPECIES_UNOWN_ID {
            // battle_factory.c:562-563; no further draw before the next attempt.
            outcome = SelectionOutcome::Unown;
        } else {
            // Exact set rejection is the first condition in the species loop
            // (battle_factory.c:565-580). The rejected attempt has already
            // spent its sole GetFactoryMonId draw.
            for existing in &selected {
                if existing.set_id == set_id {
                    outcome = SelectionOutcome::DuplicateSet;
                    break;
                }
                if existing.species_id == candidate.species_id {
                    if curr_species.is_none() {
                        curr_species = Some(candidate.species_id);
                    } else {
                        outcome = SelectionOutcome::DuplicateSpecies;
                        break;
                    }
                }
            }

            // Item rejection runs only after the species loop accepts
            // (battle_factory.c:582-593). ITEM_NONE (0) never clashes. A
            // rejected same-species candidate resets curr_species before
            // the next one.
            if outcome == SelectionOutcome::Accepted {
                for existing in &selected {
                    if existing.item_id != 0 && existing.item_id == item_id {
                        if curr_species == Some(candidate.species_id) {
                            curr_species = None;
                        }
                        outcome = SelectionOutcome::DuplicateItem;
                        break;
                    }
                }
            }
        }

        ledger.push(DrawLedgerEntry {
            position: draw_position,
            phase: Phase::SetSelection,
            rental_index: rental_index as u8,
            purpose: Purpose::SetCandidate,
            rng_before,
            rng_after: rng_value,
            random_u16: draw_value,
            range: Some(range),
            better_range: Some(better_range),
            candidate_set_id: Some(set_id),
            selection_outcome: Some(outcome),
            personality: None,
            personality_outcome: None,
        });
        if outcome == SelectionOutcome::Accepted {
            selected.push(SelectedRental {
                set_id,
                species_id: candidate.species_id,
                item_id,
                better_range,
                selection_draw_position: draw_position,
            });
        }
    }

    let selection_rng_value = rng_value;
    rng_value = input.construction_rng_value.unwrap_or(selection_rng_value);
    let mut rentals: Vec<RentalRecord> = Vec::with_capacity(SELECTABLE_MONS_COUNT);

    for (rental_index, selection) in selected.iter().enumerate() {
        let set = gen_tables::FRONTIER_MONS
            .get(selection.set_id as usize)
            .expect(
                "selection.set_id was accepted from FRONTIER_MONS during the selection loop above",
            );
        let target_nature = set.nature;

        let mut personality: u32;
        let mut low_position: u32;
        let mut high_position: u32;
        loop {
            // Random32() is `(Random() | Random() << 16)`: low word first,
            // then high, as independently RAM-pinned by opponentGen.ts.
            low_position = ledger.len() as u32;
            let low_before = rng_value;
            let (next_low, low_value) = random_u16(rng_value);
            rng_value = next_low;
            high_position = low_position + 1;
            let high_before = rng_value;
            let (next_high, high_value) = random_u16(rng_value);
            rng_value = next_high;
            personality = u32::from(low_value) | (u32::from(high_value) << 16);
            let personality_outcome = if nature_from_personality(personality) == target_nature {
                PersonalityOutcome::Accepted
            } else {
                PersonalityOutcome::WrongNature
            };
            ledger.push(DrawLedgerEntry {
                position: low_position,
                phase: Phase::Personality,
                rental_index: rental_index as u8,
                purpose: Purpose::PersonalityLow,
                rng_before: low_before,
                rng_after: next_low,
                random_u16: low_value,
                range: None,
                better_range: None,
                candidate_set_id: None,
                selection_outcome: None,
                personality: Some(personality),
                personality_outcome: Some(personality_outcome),
            });
            ledger.push(DrawLedgerEntry {
                position: high_position,
                phase: Phase::Personality,
                rental_index: rental_index as u8,
                purpose: Purpose::PersonalityHigh,
                rng_before: high_before,
                rng_after: next_high,
                random_u16: high_value,
                range: None,
                better_range: None,
                candidate_set_id: None,
                selection_outcome: None,
                personality: Some(personality),
                personality_outcome: Some(personality_outcome),
            });
            if personality_outcome == PersonalityOutcome::Accepted {
                break;
            }
        }

        let fixed_iv = get_level50_initial_rental_fixed_iv(challenge_num, selection.better_range)
            .ok_or(GenerationError::FixedIvUndefined {
            challenge_num,
            better_range: selection.better_range,
        })?;
        rentals.push(RentalRecord {
            set_id: selection.set_id,
            personality,
            fixed_iv,
            ability_slot: ability_slot_for_personality(selection.species_id, personality),
            ot_id,
            species_id: selection.species_id,
            item_id: selection.item_id,
            nature: target_nature,
            selection_draw_position: selection.selection_draw_position as u16,
            personality_draw_positions: [low_position as u16, high_position as u16],
        });
    }

    Ok(GenerationResult {
        challenge_num,
        rental_rank,
        rentals: rentals.try_into().expect(
            "the selection loop above always accepts exactly SELECTABLE_MONS_COUNT rentals",
        ),
        selection_rng_value,
        rng_value,
        draw_ledger: ledger,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const PLAYER_TRAINER_ID: u32 = 0x1234_5678;

    fn assert_contiguous_random_ledger(result: &GenerationResult) {
        // Ports tests/factoryRentalGeneration.test.ts's
        // expectContiguousRandomLedger: every ledger position is dense and
        // rngAfter/randomU16 are self-consistent with rngBefore, and every
        // draw's rngBefore continues the prior draw's rngAfter EXCEPT the
        // one construction checkpoint seam (set-selection -> personality
        // with a supplied constructionRngValue).
        for (i, entry) in result.draw_ledger.iter().enumerate() {
            assert_eq!(entry.position, i as u32, "draw {i} position");
            assert_eq!(
                entry.rng_after,
                advance_rng_value(entry.rng_before),
                "draw {i} LCG"
            );
            assert_eq!(
                entry.random_u16,
                (entry.rng_after >> 16) as u16,
                "draw {i} Random() return"
            );
            if i > 0 {
                let previous = &result.draw_ledger[i - 1];
                let is_construction_checkpoint = previous.phase == Phase::SetSelection
                    && entry.phase == Phase::Personality
                    && entry.rng_before != previous.rng_after;
                if !is_construction_checkpoint {
                    assert_eq!(
                        entry.rng_before, previous.rng_after,
                        "draw {i} consumes prior cursor"
                    );
                }
            }
        }
    }

    #[allow(clippy::type_complexity)]
    struct ExpectedRental {
        set_id: u16,
        personality: u32,
        fixed_iv: u8,
        ability_slot: u8,
        species_id: u16,
        item_id: u16,
        nature: u8,
        selection_draw_position: u16,
        personality_draw_positions: [u16; 2],
    }

    fn assert_rentals_match(
        rentals: &[RentalRecord; SELECTABLE_MONS_COUNT],
        expected: &[ExpectedRental; 6],
    ) {
        for (i, (actual, exp)) in rentals.iter().zip(expected.iter()).enumerate() {
            assert_eq!(actual.set_id, exp.set_id, "rental {i} set_id");
            assert_eq!(
                actual.personality, exp.personality,
                "rental {i} personality"
            );
            assert_eq!(actual.fixed_iv, exp.fixed_iv, "rental {i} fixed_iv");
            assert_eq!(
                actual.ability_slot, exp.ability_slot,
                "rental {i} ability_slot"
            );
            assert_eq!(actual.ot_id, PLAYER_TRAINER_ID, "rental {i} ot_id");
            assert_eq!(actual.species_id, exp.species_id, "rental {i} species_id");
            assert_eq!(actual.item_id, exp.item_id, "rental {i} item_id");
            assert_eq!(actual.nature, exp.nature, "rental {i} nature");
            assert_eq!(
                actual.selection_draw_position, exp.selection_draw_position,
                "rental {i} selection_draw_position"
            );
            assert_eq!(
                actual.personality_draw_positions, exp.personality_draw_positions,
                "rental {i} personality_draw_positions"
            );
        }
    }

    #[test]
    fn pins_seed_0_challenge_0_fixture_from_ts_test() {
        // tests/factoryRentalGeneration.test.ts "pins the challenge-0 six
        // full records and every one of 198 Random() calls for seed 0".
        // Species ids resolved from src/data/gen/species-stats.json:
        // GRIMER=88, POLIWHIRL=61, LILEEP=388, PORYGON=137, RATICATE=20,
        // NIDORINO=33.
        let result = generate_initial_factory_rentals(GenerationInput {
            rng_value: 0,
            factory_win_streak: 0,
            rents_count: 0,
            player_trainer_id: PLAYER_TRAINER_ID,
            construction_rng_value: None,
        })
        .expect("challenge 0 with rank 0 never reaches FixedIvUndefined");

        assert_eq!(result.challenge_num, 0);
        assert_eq!(result.rental_rank, 0);
        assert_eq!(result.selection_rng_value, 1_742_452_232);
        assert_eq!(result.rng_value, 4_158_915_758);
        assert_eq!(result.draw_ledger.len(), 198);
        assert_eq!(
            result
                .draw_ledger
                .iter()
                .filter(|d| d.phase == Phase::SetSelection)
                .count(),
            8
        );

        let expected = [
            ExpectedRental {
                set_id: 110,
                personality: 813_709_149,
                fixed_iv: 3,
                ability_slot: 1,
                species_id: 88,
                item_id: 135,
                nature: 24,
                selection_draw_position: 0,
                personality_draw_positions: [22, 23],
            },
            ExpectedRental {
                set_id: 155,
                personality: 4_276_564_499,
                fixed_iv: 3,
                ability_slot: 1,
                species_id: 61,
                item_id: 171,
                nature: 24,
                selection_draw_position: 2,
                personality_draw_positions: [26, 27],
            },
            ExpectedRental {
                set_id: 140,
                personality: 3_187_899_706,
                fixed_iv: 3,
                ability_slot: 0,
                species_id: 388,
                item_id: 221,
                nature: 6,
                selection_draw_position: 3,
                personality_draw_positions: [124, 125],
            },
            ExpectedRental {
                set_id: 168,
                personality: 2_276_043_732,
                fixed_iv: 3,
                ability_slot: 0,
                species_id: 137,
                item_id: 142,
                nature: 7,
                selection_draw_position: 4,
                personality_draw_positions: [136, 137],
            },
            ExpectedRental {
                set_id: 197,
                personality: 4_249_714_839,
                fixed_iv: 3,
                ability_slot: 1,
                species_id: 20,
                item_id: 217,
                nature: 14,
                selection_draw_position: 6,
                personality_draw_positions: [160, 161],
            },
            ExpectedRental {
                set_id: 147,
                personality: 4_158_934_324,
                fixed_iv: 3,
                ability_slot: 0,
                species_id: 33,
                item_id: 196,
                nature: 24,
                selection_draw_position: 7,
                personality_draw_positions: [196, 197],
            },
        ];
        assert_rentals_match(&result.rentals, &expected);
        assert_contiguous_random_ledger(&result);
    }

    #[test]
    fn pins_a_challenge_3_rank_5_construction_checkpoint_fixture_from_ts_engine() {
        // Generated (not hand-computed) from the TS engine, 2026-08-11, via:
        //   node --experimental-strip-types -e '
        //     import("./src/engine/factoryRentalGeneration.ts").then((m) => {
        //       const r = m.generateInitialFactoryRentals({
        //         rngValue: 12345, factoryWinStreak: 21, rentsCount: 43,
        //         playerTrainerId: 0x1234_5678, constructionRngValue: 0x7399e3ae,
        //       });
        //       console.log(r.challengeNum, r.rentalRank, r.selectionRngValue,
        //         r.rngValue, r.drawLedger.length,
        //         r.drawLedger.filter(d => d.phase === "set-selection").length);
        //       console.log(JSON.stringify(r.rentals));
        //     });
        //   '
        // factoryWinStreak 21 -> challengeNum 3 (>0); rentsCount 43 -> rank 5
        // (>0, the maximum); constructionRngValue supplies the presentation
        // checkpoint the ledger invariant treats as a seam. Species ids from
        // src/data/gen/species-stats.json: ARCANINE=59, GRANBULL=210,
        // HARIYAMA=336, SHIFTRY=300, CROBAT=169, SCIZOR=212.
        let result = generate_initial_factory_rentals(GenerationInput {
            rng_value: 12345,
            factory_win_streak: 21,
            rents_count: 43,
            player_trainer_id: PLAYER_TRAINER_ID,
            construction_rng_value: Some(0x7399_e3ae),
        })
        .expect("challenge 3 rank 5 never reaches FixedIvUndefined (only challenge 7 does)");

        assert_eq!(result.challenge_num, 3);
        assert_eq!(result.rental_rank, 5);
        assert_eq!(result.selection_rng_value, 1_840_454_592);
        assert_eq!(result.rng_value, 197_620_562);
        assert_eq!(result.draw_ledger.len(), 1005);
        assert_eq!(
            result
                .draw_ledger
                .iter()
                .filter(|d| d.phase == Phase::SetSelection)
                .count(),
            9
        );

        let expected = [
            ExpectedRental {
                set_id: 560,
                personality: 270_079_256,
                fixed_iv: 15,
                ability_slot: 0,
                species_id: 59,
                item_id: 141,
                nature: 6,
                selection_draw_position: 0,
                personality_draw_positions: [433, 434],
            },
            ExpectedRental {
                set_id: 474,
                personality: 1_634_387_542,
                fixed_iv: 15,
                ability_slot: 0,
                species_id: 210,
                item_id: 180,
                nature: 17,
                selection_draw_position: 1,
                personality_draw_positions: [529, 530],
            },
            ExpectedRental {
                set_id: 486,
                personality: 1_676_140_992,
                fixed_iv: 15,
                ability_slot: 0,
                species_id: 336,
                item_id: 183,
                nature: 17,
                selection_draw_position: 2,
                personality_draw_positions: [707, 708],
            },
            ExpectedRental {
                set_id: 494,
                personality: 2_793_715_033,
                fixed_iv: 15,
                ability_slot: 1,
                species_id: 300,
                item_id: 134,
                nature: 8,
                selection_draw_position: 5,
                personality_draw_positions: [887, 888],
            },
            ExpectedRental {
                set_id: 553,
                personality: 198_810_745,
                fixed_iv: 15,
                ability_slot: 0,
                species_id: 169,
                item_id: 200,
                nature: 20,
                selection_draw_position: 6,
                personality_draw_positions: [925, 926],
            },
            ExpectedRental {
                set_id: 423,
                personality: 197_613_828,
                fixed_iv: 12,
                ability_slot: 0,
                species_id: 212,
                item_id: 196,
                nature: 3,
                selection_draw_position: 8,
                personality_draw_positions: [1003, 1004],
            },
        ];
        assert_rentals_match(&result.rentals, &expected);
        assert_contiguous_random_ledger(&result);
    }

    #[test]
    fn rejects_challenge_8_with_the_0_7_rationale() {
        // factoryWinStreak 56 / 7 == 8; mirrors
        // src/engine/factoryRentalGeneration.ts's `challengeNum > 7` throw.
        let err = generate_initial_factory_rentals(GenerationInput {
            rng_value: 0,
            factory_win_streak: 56,
            rents_count: 0,
            player_trainer_id: PLAYER_TRAINER_ID,
            construction_rng_value: None,
        })
        .unwrap_err();
        assert_eq!(
            err,
            GenerationError::ChallengeOutOfRange { challenge_num: 8 }
        );
        assert_eq!(
            err.to_string(),
            "Level-50 initial rental generation supports source challenges 0..7, got 8"
        );
    }

    #[test]
    fn rejects_challenge_7_with_a_better_range_slot() {
        // Not called out by the porting brief, but confirmed against the TS
        // engine (2026-08-11): factoryWinStreak 49 -> challengeNum 7, and
        // any rentsCount giving rentalRank > 0 puts betterRange=true on the
        // first accepted slot, which getLevel50InitialRentalFixedIv(7, true)
        // has no row for (fixedIvs has only 8 rows, index 0..7). The TS
        // engine itself throws here — this is a genuine reachable error
        // state, not a data gap, so it must round-trip as Err rather than
        // panic. See tests/factoryRentalParity.test.ts for the differential
        // coverage this induces across the matrix.
        let err = generate_initial_factory_rentals(GenerationInput {
            rng_value: 0,
            factory_win_streak: 49,
            rents_count: 100,
            player_trainer_id: PLAYER_TRAINER_ID,
            construction_rng_value: None,
        })
        .unwrap_err();
        assert_eq!(
            err,
            GenerationError::FixedIvUndefined { challenge_num: 7, better_range: true }
        );
        assert_eq!(
            err.to_string(),
            "initial-rental fixed IV is undefined for challenge 7 better range"
        );
    }
}
