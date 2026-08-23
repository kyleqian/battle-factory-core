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
//! 3. Immediately after a rental's personality is ACCEPTED, that same
//!    `CreateMonWithEVSpreadNatureOTID` call runs
//!    `CreateMon` -> `CreateBoxMon` with the slot's fixed IV
//!    (`reference/pokeemerald/src/pokemon.c:2562-2575`, `:2195-2204`). The
//!    fixed personality draws nothing and `OT_ID_PRESET` draws nothing
//!    (`:2205-2231`), so when the fixed IV is >= `USE_RANDOM_IVS` (32) the
//!    next two `Random()` calls in the same stream are that rental's IV
//!    words (`:2265-2295`) — the first supplying HP/ATK/DEF and the second
//!    SPEED/SPATK/SPDEF as consecutive 5-bit fields. They land between this
//!    rental's accepted personality pair and the next rental's first
//!    personality attempt. A fixed IV below 32 draws nothing and gives all
//!    six stats that same value.
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

/// `USE_RANDOM_IVS` (`reference/pokeemerald/include/constants/pokemon.h:202`,
/// `MAX_PER_STAT_IVS + 1`): a fixed-IV argument at or above this makes
/// `CreateBoxMon` roll the two random IV words instead
/// (`reference/pokeemerald/src/pokemon.c:2265-2295`).
const USE_RANDOM_IVS: u8 = 32;

/// `MAX_IV_MASK` (`reference/pokeemerald/include/constants/pokemon.h:201`).
const MAX_IV_MASK: u16 = 31;

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
    /// `CreateBoxMon`'s two random-IV words
    /// (`reference/pokeemerald/src/pokemon.c:2277-2294`), drawn only when
    /// the slot's fixed IV is >= `USE_RANDOM_IVS`.
    RandomIvs = 2,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Purpose {
    SetCandidate = 0,
    PersonalityLow = 1,
    PersonalityHigh = 2,
    /// First `Random()` of the random-IV branch: HP, ATK, DEF
    /// (`reference/pokeemerald/src/pokemon.c:2277-2284`).
    RandomIvsLow = 3,
    /// Second `Random()` of the random-IV branch: SPEED, SPATK, SPDEF
    /// (`reference/pokeemerald/src/pokemon.c:2286-2293`).
    RandomIvsHigh = 4,
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
/// leave the selection fields `None`; random-IV draws populate NEITHER
/// group (every optional field is `None` — the drawn word itself is the
/// whole payload) — exactly the TS type's optional-field split
/// (present-or-absent, not zero-filled).
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
    /// The saved `RentalMon.ivs`, which retail reads back as the ATK IV of
    /// the constructed mon, not as the fixed-IV argument
    /// (`reference/pokeemerald/src/battle_factory_screen.c:1824`
    /// `MON_DATA_ATK_IV`). Always equal to `ivs[1]`; identical to the
    /// fixed-IV argument whenever that argument is < `USE_RANDOM_IVS`,
    /// because then all six IVs are that value.
    pub fixed_iv: u8,
    /// `[hp, attack, defense, speed, sp_attack, sp_defense]` — the spread
    /// `CreateBoxMon` actually wrote (`reference/pokeemerald/src/pokemon.c:2265-2295`).
    pub ivs: [u8; 6],
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

struct SelectedRental {
    set_id: u16,
    species_id: u16,
    item_id: u16,
    better_range: bool,
    selection_draw_position: u32,
}

/// Ports `generateInitialFactoryRentals`
/// (`src/engine/factoryRentalGeneration.ts`).
///
/// Total: every `factory_win_streak` generates. Range selection pins
/// challenge >= 7 to range row 7 (`battle_factory.c:829-866`) and fixed-IV
/// selection carries retail's own clamp including the
/// `sFixedIVTable[8]` overread (`get_level50_initial_rental_fixed_iv`), so
/// there is no challenge this function cannot answer for.
pub fn generate_initial_factory_rentals(input: GenerationInput) -> GenerationResult {
    let mut rng_value = input.rng_value;
    let challenge_num = input.factory_win_streak / STAGES_PER_CHALLENGE;
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

        // battle_factory_screen.c:1762-1764: slots below the rental rank use
        // GetFactoryMonFixedIV(challengeNum + 1), the rest challengeNum.
        let fixed_iv = get_level50_initial_rental_fixed_iv(challenge_num, selection.better_range)
            .expect("get_level50_initial_rental_fixed_iv is total (retail clamp + overread row)");
        let ivs = if fixed_iv < USE_RANDOM_IVS {
            [fixed_iv; 6]
        } else {
            // pokemon.c:2277-2293. The accepted personality is passed in
            // (no draw) and OT_ID_PRESET reads fixedOtId (no draw), so
            // these two words follow the accepted personality pair
            // immediately in the same stream.
            let low_iv_position = ledger.len() as u32;
            let low_iv_before = rng_value;
            let (next_low_iv, low_iv_word) = random_u16(rng_value);
            rng_value = next_low_iv;
            ledger.push(DrawLedgerEntry {
                position: low_iv_position,
                phase: Phase::RandomIvs,
                rental_index: rental_index as u8,
                purpose: Purpose::RandomIvsLow,
                rng_before: low_iv_before,
                rng_after: next_low_iv,
                random_u16: low_iv_word,
                range: None,
                better_range: None,
                candidate_set_id: None,
                selection_outcome: None,
                personality: None,
                personality_outcome: None,
            });
            let high_iv_position = ledger.len() as u32;
            let high_iv_before = rng_value;
            let (next_high_iv, high_iv_word) = random_u16(rng_value);
            rng_value = next_high_iv;
            ledger.push(DrawLedgerEntry {
                position: high_iv_position,
                phase: Phase::RandomIvs,
                rental_index: rental_index as u8,
                purpose: Purpose::RandomIvsHigh,
                rng_before: high_iv_before,
                rng_after: next_high_iv,
                random_u16: high_iv_word,
                range: None,
                better_range: None,
                candidate_set_id: None,
                selection_outcome: None,
                personality: None,
                personality_outcome: None,
            });
            [
                (low_iv_word & MAX_IV_MASK) as u8,
                ((low_iv_word >> 5) & MAX_IV_MASK) as u8,
                ((low_iv_word >> 10) & MAX_IV_MASK) as u8,
                (high_iv_word & MAX_IV_MASK) as u8,
                ((high_iv_word >> 5) & MAX_IV_MASK) as u8,
                ((high_iv_word >> 10) & MAX_IV_MASK) as u8,
            ]
        };
        rentals.push(RentalRecord {
            set_id: selection.set_id,
            personality,
            // battle_factory_screen.c:1824 saves MON_DATA_ATK_IV.
            fixed_iv: ivs[1],
            ivs,
            ability_slot: ability_slot_for_personality(selection.species_id, personality),
            ot_id,
            species_id: selection.species_id,
            item_id: selection.item_id,
            nature: target_nature,
            selection_draw_position: selection.selection_draw_position as u16,
            personality_draw_positions: [low_position as u16, high_position as u16],
        });
    }

    GenerationResult {
        challenge_num,
        rental_rank,
        rentals: rentals.try_into().expect(
            "the selection loop above always accepts exactly SELECTABLE_MONS_COUNT rentals",
        ),
        selection_rng_value,
        rng_value,
        draw_ledger: ledger,
    }
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
        ivs: [u8; 6],
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
            assert_eq!(actual.ivs, exp.ivs, "rental {i} ivs");
            // battle_factory_screen.c:1824 — the saved RentalMon.ivs is the
            // constructed mon's ATK IV, for every rental, always.
            assert_eq!(
                actual.fixed_iv, actual.ivs[1],
                "rental {i} fixed_iv == ivs[1]"
            );
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
        });

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
                ivs: [3; 6],
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
                ivs: [3; 6],
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
                ivs: [3; 6],
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
                ivs: [3; 6],
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
                ivs: [3; 6],
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
                ivs: [3; 6],
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
        });

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
                ivs: [15; 6],
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
                ivs: [15; 6],
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
                ivs: [15; 6],
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
                ivs: [15; 6],
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
                ivs: [15; 6],
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
                ivs: [12; 6],
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

    /// Every rental's ledger tail, for a rental whose fixed IV rolled
    /// random: the accepted personality pair is immediately followed by the
    /// two random-IV words, in low-then-high order (pokemon.c:2277-2293).
    fn construction_purposes_for(result: &GenerationResult, rental_index: u8) -> Vec<Purpose> {
        result
            .draw_ledger
            .iter()
            .filter(|d| d.phase != Phase::SetSelection && d.rental_index == rental_index)
            .map(|d| d.purpose)
            .collect()
    }

    fn random_iv_words(result: &GenerationResult, rental_index: u8) -> Vec<(u32, Purpose, u16)> {
        result
            .draw_ledger
            .iter()
            .filter(|d| d.phase == Phase::RandomIvs && d.rental_index == rental_index)
            .map(|d| (d.position, d.purpose, d.random_u16))
            .collect()
    }

    #[test]
    fn challenge_8_rolls_random_ivs_for_all_six_rentals() {
        // factoryWinStreak 56 / 7 == 8. IV argument 8 for every ordinary
        // slot (rentsCount 0 -> rank 0 -> better_range false everywhere),
        // which retail's strictly-greater bound check leaves UNCLAMPED:
        // it reads sFixedIVTable[8] == {110, 0} (battle_factory.c:739-757,
        // non-BUGFIX branch; FIXED_IVS' ninth row). 110 >= USE_RANDOM_IVS
        // (32), so CreateBoxMon rolls two Random() words per rental
        // (pokemon.c:2265-2295). This used to be the
        // GenerationError::ChallengeOutOfRange case.
        let result = generate_initial_factory_rentals(GenerationInput {
            rng_value: 0,
            factory_win_streak: 56,
            rents_count: 0,
            player_trainer_id: PLAYER_TRAINER_ID,
            construction_rng_value: None,
        });

        assert_eq!(result.challenge_num, 8);
        assert_eq!(result.rental_rank, 0);
        assert_eq!(
            get_level50_initial_rental_fixed_iv(8, false),
            Some(110),
            "IV argument 8 is the retail overread row"
        );

        // Total draw count: 7 set-selection draws, 286 personality draws
        // (143 Random32 attempts across the six slots), 12 random-IV draws
        // (2 per rental x 6).
        assert_eq!(result.draw_ledger.len(), 305, "total Random() calls");
        assert_eq!(
            result
                .draw_ledger
                .iter()
                .filter(|d| d.phase == Phase::SetSelection)
                .count(),
            7
        );
        assert_eq!(
            result
                .draw_ledger
                .iter()
                .filter(|d| d.phase == Phase::Personality)
                .count(),
            286
        );
        assert_eq!(
            result
                .draw_ledger
                .iter()
                .filter(|d| d.phase == Phase::RandomIvs)
                .count(),
            12,
            "two random-IV words per rental, all six rentals"
        );
        assert_eq!(result.selection_rng_value, 2_948_958_921);
        assert_eq!(result.rng_value, 926_855_395);

        // Per-rental ledger ordering: rental 0 spends 41 rejected
        // Random32 personality attempts (low, high) before its accepted
        // 42nd, then the two IV words -- 86 construction draws in slot
        // order, with nothing interleaved from another rental.
        let purposes = construction_purposes_for(&result, 0);
        assert_eq!(purposes.len(), 86);
        let mut expected_purposes: Vec<Purpose> = Vec::with_capacity(86);
        for _ in 0..42 {
            expected_purposes.push(Purpose::PersonalityLow);
            expected_purposes.push(Purpose::PersonalityHigh);
        }
        expected_purposes.push(Purpose::RandomIvsLow);
        expected_purposes.push(Purpose::RandomIvsHigh);
        assert_eq!(purposes, expected_purposes);

        // ...and the two IV words sit immediately after every rental's
        // ACCEPTED personality pair, for all six rentals.
        for (index, rental) in result.rentals.iter().enumerate() {
            let words = random_iv_words(&result, index as u8);
            let accepted_high = u32::from(rental.personality_draw_positions[1]);
            assert_eq!(
                words
                    .iter()
                    .map(|&(position, purpose, _)| (position, purpose))
                    .collect::<Vec<_>>(),
                vec![
                    (accepted_high + 1, Purpose::RandomIvsLow),
                    (accepted_high + 2, Purpose::RandomIvsHigh),
                ],
                "rental {index} random-IV draws follow its accepted personality pair"
            );
            assert_eq!(
                rental.fixed_iv, rental.ivs[1],
                "rental {index} fixed_iv == ivs[1]"
            );
        }

        // Every random-IV ledger entry carries the drawn word and nothing
        // else -- the selection AND personality option groups are absent.
        for entry in result
            .draw_ledger
            .iter()
            .filter(|d| d.phase == Phase::RandomIvs)
        {
            assert_eq!(entry.range, None);
            assert_eq!(entry.better_range, None);
            assert_eq!(entry.candidate_set_id, None);
            assert_eq!(entry.selection_outcome, None);
            assert_eq!(entry.personality, None);
            assert_eq!(entry.personality_outcome, None);
        }

        // Rental 0's spread, derived BY HAND from its two drawn words
        // (pokemon.c:2277-2293 -- MAX_IV_MASK is 31, i.e. five bits):
        //   low  word 41538 = 0b1010_0010_0100_0010
        //     hp      =  41538        & 31 = 41538 - 32*1298 =  2
        //     attack  = (41538 >>  5) & 31 =  1298 - 32*40   = 18
        //     defense = (41538 >> 10) & 31 =    40 - 32*1    =  8
        //   high word 34362 = 0b1000_0110_0011_1010
        //     speed      =  34362        & 31 = 34362 - 32*1073 = 26
        //     sp_attack  = (34362 >>  5) & 31 =  1073 - 32*33   = 17
        //     sp_defense = (34362 >> 10) & 31 =    33 - 32*1    =  1
        let rental0_words = random_iv_words(&result, 0);
        assert_eq!(
            rental0_words
                .iter()
                .map(|&(_, _, word)| word)
                .collect::<Vec<_>>(),
            vec![41538, 34362],
            "rental 0 random-IV words"
        );
        assert_eq!(result.rentals[0].ivs, [2, 18, 8, 26, 17, 1]);
        assert_eq!(result.rentals[0].fixed_iv, 18, "the ATK IV, not 110");

        assert_contiguous_random_ledger(&result);
    }

    #[test]
    fn challenge_7_better_range_slots_take_the_overread_row() {
        // Was GenerationError::FixedIvUndefined. factoryWinStreak 49 ->
        // challengeNum 7; rentsCount 100 -> rank 5, so slots 0..4 are the
        // "elevated" rentals that ask for GetFactoryMonFixedIV(challengeNum
        // + 1) == argument 8 (battle_factory_screen.c:1762-1764) and get the
        // overread row's 110 -> random IVs. Slot 5 asks for argument 7 and
        // gets the ordinary 31 -> a uniform spread and no draws at all.
        let result = generate_initial_factory_rentals(GenerationInput {
            rng_value: 0,
            factory_win_streak: 49,
            rents_count: 100,
            player_trainer_id: PLAYER_TRAINER_ID,
            construction_rng_value: None,
        });

        assert_eq!(result.challenge_num, 7);
        assert_eq!(result.rental_rank, 5);
        assert_eq!(get_level50_initial_rental_fixed_iv(7, true), Some(110));
        assert_eq!(get_level50_initial_rental_fixed_iv(7, false), Some(31));
        assert_eq!(result.draw_ledger.len(), 303);
        assert_eq!(
            result
                .draw_ledger
                .iter()
                .filter(|d| d.phase == Phase::RandomIvs)
                .count(),
            10,
            "2 random-IV draws per better-range rental, 5 of them"
        );

        for index in 0..5u8 {
            assert_eq!(
                random_iv_words(&result, index).len(),
                2,
                "better-range rental {index} draws exactly 2 random-IV words"
            );
            let rental = &result.rentals[index as usize];
            assert_eq!(
                rental.fixed_iv, rental.ivs[1],
                "rental {index} fixed_iv == ivs[1]"
            );
        }
        assert_eq!(
            random_iv_words(&result, 5).len(),
            0,
            "the ordinary rental draws no random-IV words"
        );
        assert_eq!(
            result.rentals[5].ivs, [31; 6],
            "ordinary rental is uniform 31"
        );
        assert_eq!(result.rentals[5].fixed_iv, 31);

        // Same seed, same challenge, same stream position as
        // challenge_8_rolls_random_ivs_for_all_six_rentals' rentals 0..4:
        // the set-selection loop pins challenge >= 7 to range row 7
        // regardless of better_range (battle_factory.c:829-866), so only the
        // IV argument differs between the two cases.
        assert_eq!(result.rentals[0].ivs, [2, 18, 8, 26, 17, 1]);
        assert_contiguous_random_ledger(&result);
    }

    #[test]
    fn challenge_7_without_better_range_slots_draws_no_random_ivs() {
        // rentsCount 0 -> rank 0 -> every slot asks for IV argument 7 -> 31.
        let result = generate_initial_factory_rentals(GenerationInput {
            rng_value: 0,
            factory_win_streak: 49,
            rents_count: 0,
            player_trainer_id: PLAYER_TRAINER_ID,
            construction_rng_value: None,
        });
        assert_eq!(result.challenge_num, 7);
        assert_eq!(result.rental_rank, 0);
        assert!(result
            .draw_ledger
            .iter()
            .all(|d| d.phase != Phase::RandomIvs));
        for (index, rental) in result.rentals.iter().enumerate() {
            assert_eq!(rental.ivs, [31; 6], "rental {index} ivs");
            assert_eq!(
                rental.fixed_iv, rental.ivs[1],
                "rental {index} fixed_iv == ivs[1]"
            );
        }
        assert_contiguous_random_ledger(&result);
    }
}
