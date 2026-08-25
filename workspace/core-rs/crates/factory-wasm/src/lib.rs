//! factory-wasm — the WASM boundary crate. Keep this a THIN wrapper:
//! all logic lives in factory-core; this crate only exposes it.
//!
//! ABI v1 (see `../../RUST_PROGRESS.md` R2): every export is prefixed
//! `fw_`; scalars cross as `u32`; structured data (future milestones)
//! crosses as caller-allocated length-prefixed little-endian byte
//! buffers via `fw_alloc`/`fw_free`. Hand-rolled C ABI, zero
//! dependencies — no wasm-bindgen.

use factory_core::battle_ai_switch_into::{
    self, BattleAiSwitchBench, BattleAiSwitchBenchMember, BattleAiSwitchDamageFallback,
    BattleAiSwitchIntoResult,
};
use factory_core::damage_calc::{
    self, AccuracyCalcInput, CritChanceInput, CritMoveEffect, DamageBattler, DamageCalcInput,
    StatStages,
};
use factory_core::factory_ai_battle_history::{
    self, FactoryAiBattleHistory, FactoryAiBattleHistoryBattler, FactoryAiBattleHistoryLiveInput,
};
use factory_core::factory_ai_check_bad_move::{
    self, BattleRngState, CheckBadMovePreambleInput, CheckBadMoveResult,
    FactoryAiCheckBadMoveAttacker, FactoryAiCheckBadMoveRoarTarget, FactoryAiCheckBadMoveTarget,
    FactoryAiMonGender, EFFECT_LEECH_SEED, EFFECT_TOXIC,
};
use factory_core::factory_ai_check_viability::{
    self, CheckViabilityDraw, CheckViabilityResult, CvDrawKind, FactoryAiCheckViabilityBattler,
    RunCheckViabilityInput,
};
use factory_core::factory_ai_decision_policy::{
    self, FactoryAiDecisionSide, FactoryAiLegalDecision, FactoryAiMaskZeroDecisionChoice,
    FactoryAiMaskZeroDecisionInput, FactoryAiMoveDecision, FactoryAiMovePolicyRequest,
    FactoryAiMovePolicyView, FactoryAiMoveSlot, FactoryAiRequestKind, FactoryAiScoredBattlerView,
    FactoryAiScoredChoice, FactoryAiScoredDecisionInput, FactoryAiScoredDraw,
    FactoryAiScoredTargetView, FactoryAiScoredView, FactoryAiTurnStartRandomNumber,
};
use factory_core::factory_ai_live_decision_bridge::{
    self as live_decision_bridge, FactoryAiLiveDecisionChoice, FactoryAiLiveDecisionInput,
};
use factory_core::factory_ai_live_planner::{
    self, FactoryAiLivePlannerBoundary, FactoryAiLivePlannerInput, FactoryAiLivePlannerMoveTrace,
    FactoryAiLivePlannerResult, FactoryAiLivePlannerRulesContext,
};
use factory_core::factory_ai_live_view::{
    self, FactoryAiChallengePolicy, FactoryAiLiveRulesBattler, FactoryAiLiveRulesContext,
    FactoryAiLiveViewInput, FactoryAiScoredBattlerView as LiveScoredBattlerView,
    FactoryAiScoredTargetView as LiveScoredTargetView,
};
use factory_core::factory_ai_mask::{self, FactoryAiMaskError, FactoryAiMaskSelectionInput};
use factory_core::factory_ai_switch_policy::{
    self, FactoryAiSwitchBattler, FactoryAiSwitchChoice, FactoryAiSwitchPartyMember,
    FactoryAiSwitchPolicyInput, FactoryAiSwitchPolicyResult, FactoryAiSwitchRules,
};
use factory_core::factory_draft_selection::{
    self as factory_draft_selection, FactoryDraftCursorRedrawState, FactoryDraftDirection,
    FactoryDraftMenuHighlightRedrawState, FactoryDraftRentConfirmRedrawState,
    FactoryDraftSelectedIds, FactoryDraftSelectionChange, FACTORY_DRAFT_SLOT_COUNT,
};
use factory_core::factory_swap::{
    self as factory_swap, FactoryRentalMon, FactorySwapBattleStatus, FactorySwapInput,
    FactorySwapMon, FactorySwapPartyIndex, FactorySwapPhase, FactorySwapQuitReturnPhase,
    FactorySwapResult, FactorySwapRoundDecision, FactorySwapState, FACTORY_SWAP_PARTY_SIZE,
    FACTORY_SWAP_RENTAL_ROSTER_SIZE,
};
use factory_core::factory_trainer_schedule::{
    self, FactoryTrainerDrawLedgerEntry, FactoryTrainerRangeKind, FactoryTrainerScheduleError,
};
use factory_core::gen_tables;
use factory_core::gender::MonGender;
use factory_core::key_repeat::{
    self as key_repeat, GbaButton, GbaButtonMask, KeyFrame, KeyRepeatCounter, KeyRepeatState,
};
use factory_core::mon_construction::{
    self, FactoryCorpusPartyInstance, FactoryCorpusPartyMemberState, PartyMemberError,
};
use factory_core::rental_generation::{self, GenerationInput, GenerationResult};
use factory_core::rng;
use factory_core::turn_order::{self, TurnOrderBattler, WeatherState};
use factory_core::turn_rng;

/// ABI version this build implements. Bumps on any breaking layout change.
#[no_mangle]
pub extern "C" fn fw_abi_version() -> u32 {
    1
}

/// One LCG step: returns the next raw gRngValue.
#[no_mangle]
pub extern "C" fn fw_rng_advance(rng_value: u32) -> u32 {
    rng::advance_rng_value(rng_value)
}

/// Random()'s u16 output for a just-advanced gRngValue (upper 16 bits),
/// returned widened to u32 per the ABI's scalar convention.
#[no_mangle]
pub extern "C" fn fw_rng_output(rng_value: u32) -> u32 {
    rng_value >> 16
}

/// Allocates `len` bytes inside WASM linear memory and returns the pointer.
///
/// # Safety contract
/// The caller must pass the exact same `(ptr, len)` pair to `fw_free` —
/// this crate does not track allocation sizes itself. `fw_alloc(0)`
/// performs no allocation and returns a null pointer; callers must treat
/// a null return as "no buffer", never dereference it.
#[no_mangle]
pub extern "C" fn fw_alloc(len: u32) -> *mut u8 {
    if len == 0 {
        return std::ptr::null_mut();
    }
    let layout = std::alloc::Layout::array::<u8>(len as usize).expect("fw_alloc: layout overflow");
    // SAFETY: `layout` has non-zero size (len != 0 checked above).
    unsafe { std::alloc::alloc(layout) }
}

/// Frees a buffer previously returned by `fw_alloc`.
///
/// # Safety contract
/// `ptr` and `len` must be exactly the pair returned by / passed to the
/// matching `fw_alloc` call. A null `ptr` or zero `len` is a no-op (this
/// mirrors `fw_alloc(0)`'s null return, so callers never need to
/// special-case the empty-buffer case).
///
/// # Safety
/// `ptr` must either be null or a pointer previously returned by
/// `fw_alloc(len)` for this exact `len`, not already freed.
#[no_mangle]
pub unsafe extern "C" fn fw_free(ptr: *mut u8, len: u32) {
    if ptr.is_null() || len == 0 {
        return;
    }
    let layout = std::alloc::Layout::array::<u8>(len as usize).expect("fw_free: layout overflow");
    // SAFETY: caller contract (see above) guarantees `ptr` was returned by
    // `fw_alloc` with this exact `len`, and is being freed exactly once.
    unsafe { std::alloc::dealloc(ptr, layout) }
}

/// Runs `factory_core::rental_generation::generate_initial_factory_rentals`
/// and returns an `fw_alloc`'d little-endian buffer encoding the result.
/// The caller must `fw_free(ptr, total_len)`, where `total_len` is read
/// from the first 4 bytes of the buffer.
///
/// `has_construction_rng` is a boolean flag (0/1) gating
/// `construction_rng_value`, since the WASM ABI has no native `Option`.
///
/// # Buffer layout (all integers little-endian)
///
/// ```text
/// offset  width  field
/// 0       4      total_len (u32) — the whole buffer's length, including
///                these 4 bytes; pass this to fw_free.
/// 4       1      status (u8) — 0 = ok, 1 = error.
///
/// --- status == 1 (error) ---
/// UNREACHABLE for this export: rental generation is total (see
/// `factory_core::rental_generation::generate_initial_factory_rentals`).
/// The status byte is kept so this buffer's preamble stays identical to
/// `fw_create_factory_party_member`'s, which does still fail.
///
/// --- status == 0 (ok) ---
/// 5       4      challenge_num (u32)
/// 9       1      rental_rank (u8)
/// 10      4      selection_rng_value (u32)
/// 14      4      rng_value (u32)
/// 18      174    rentals: 6 fixed-width 29-byte records, back to back
///                (offsets below are relative to each record's start):
///                  0   2   set_id (u16)
///                  2   4   personality (u32)
///                  6   1   fixed_iv (u8) — the ATK IV, i.e. always
///                          ivs[1] (battle_factory_screen.c:1824 saves
///                          MON_DATA_ATK_IV as RentalMon.ivs)
///                  7   1   ability_slot (u8)
///                  8   4   ot_id (u32)
///                  12  2   species_id (u16)
///                  14  2   item_id (u16)
///                  16  1   nature (u8)
///                  17  2   selection_draw_position (u16)
///                  19  2   personality_draw_positions[0] (u16)
///                  21  2   personality_draw_positions[1] (u16)
///                  23  6   ivs (u8 x 6: hp, attack, defense, speed,
///                          sp_attack, sp_defense) — appended at the END so
///                          every pre-existing in-record offset is
///                          unchanged
/// 192     4      ledger_count (u32)
/// 196     ledger_count * 26   draw_ledger: fixed-width 26-byte entries,
///                back to back (offsets below are relative to each entry's
///                start). Every entry carries all fields; fields the TS
///                engine leaves absent for that entry's `phase` are
///                encoded as 0 and MUST be ignored by the decoder (it
///                already knows which fields apply from `phase`):
///                  0   1   phase (u8) — 0 = set-selection, 1 = personality,
///                          2 = random-ivs
///                  1   1   purpose (u8) — 0 = set-candidate,
///                          1 = personality-low, 2 = personality-high,
///                          3 = random-ivs-low, 4 = random-ivs-high
///                  2   1   rental_index (u8)
///                  3   4   rng_before (u32)
///                  7   4   rng_after (u32)
///                  11  2   random_u16 (u16)
///                  13  2   range_start (u16)        [selection only]
///                  15  2   range_end (u16)           [selection only]
///                  17  1   better_range (u8, 0/1)    [selection only]
///                  18  2   candidate_set_id (u16)    [selection only]
///                  20  1   selection_outcome (u8)    [selection only]
///                          0 = accepted, 1 = unown, 2 = duplicate-set,
///                          3 = duplicate-species, 4 = duplicate-item
///                  21  4   personality (u32)         [personality only]
///                  25  1   personality_outcome (u8)  [personality only]
///                          0 = accepted, 1 = wrong-nature
///                A random-ivs entry (phase 2) populates NEITHER optional
///                group: the drawn word is its whole payload, and its six
///                5-bit IV fields are what the rental record's `ivs` above
///                already decodes to (pokemon.c:2277-2293).
///                total_len == 196 + 26 * ledger_count
/// ```
#[no_mangle]
pub extern "C" fn fw_generate_initial_rentals(
    rng_value: u32,
    factory_win_streak: u32,
    rents_count: u32,
    player_trainer_id: u32,
    has_construction_rng: u32,
    construction_rng_value: u32,
) -> *mut u8 {
    let input = GenerationInput {
        rng_value,
        factory_win_streak,
        rents_count,
        player_trainer_id,
        construction_rng_value: (has_construction_rng != 0).then_some(construction_rng_value),
    };
    let bytes =
        encode_generation_result(rental_generation::generate_initial_factory_rentals(input));
    let ptr = fw_alloc(bytes.len() as u32);
    // SAFETY: `ptr` was just allocated by fw_alloc for exactly `bytes.len()`
    // bytes (fw_alloc's contract), and `bytes` is a distinct, non-overlapping
    // source buffer.
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
    }
    ptr
}

/// Pure encoding — no logic beyond the byte layout documented on
/// `fw_generate_initial_rentals`. All logic lives in
/// `factory_core::rental_generation`.
fn encode_generation_result(r: GenerationResult) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();
    buf.extend_from_slice(&0u32.to_le_bytes()); // total_len placeholder, patched below
    buf.push(0); // status: ok (this export cannot fail)
    buf.extend_from_slice(&r.challenge_num.to_le_bytes());
    buf.push(r.rental_rank);
    buf.extend_from_slice(&r.selection_rng_value.to_le_bytes());
    buf.extend_from_slice(&r.rng_value.to_le_bytes());
    for rental in &r.rentals {
        buf.extend_from_slice(&rental.set_id.to_le_bytes());
        buf.extend_from_slice(&rental.personality.to_le_bytes());
        buf.push(rental.fixed_iv);
        buf.push(rental.ability_slot);
        buf.extend_from_slice(&rental.ot_id.to_le_bytes());
        buf.extend_from_slice(&rental.species_id.to_le_bytes());
        buf.extend_from_slice(&rental.item_id.to_le_bytes());
        buf.push(rental.nature);
        buf.extend_from_slice(&rental.selection_draw_position.to_le_bytes());
        buf.extend_from_slice(&rental.personality_draw_positions[0].to_le_bytes());
        buf.extend_from_slice(&rental.personality_draw_positions[1].to_le_bytes());
        buf.extend_from_slice(&rental.ivs);
    }
    buf.extend_from_slice(&(r.draw_ledger.len() as u32).to_le_bytes());
    for entry in &r.draw_ledger {
        buf.push(entry.phase as u8);
        buf.push(entry.purpose as u8);
        buf.push(entry.rental_index);
        buf.extend_from_slice(&entry.rng_before.to_le_bytes());
        buf.extend_from_slice(&entry.rng_after.to_le_bytes());
        buf.extend_from_slice(&entry.random_u16.to_le_bytes());
        buf.extend_from_slice(&entry.range.map_or(0u16, |range| range.start).to_le_bytes());
        buf.extend_from_slice(&entry.range.map_or(0u16, |range| range.end).to_le_bytes());
        buf.push(u8::from(entry.better_range.unwrap_or(false)));
        buf.extend_from_slice(&entry.candidate_set_id.unwrap_or(0).to_le_bytes());
        buf.push(entry.selection_outcome.map_or(0, |outcome| outcome as u8));
        buf.extend_from_slice(&entry.personality.unwrap_or(0).to_le_bytes());
        buf.push(entry.personality_outcome.map_or(0, |outcome| outcome as u8));
    }
    let total_len = buf.len() as u32;
    buf[0..4].copy_from_slice(&total_len.to_le_bytes());
    buf
}

/// Runs `factory_core::mon_construction::create_factory_corpus_party_member`
/// and returns an `fw_alloc`'d little-endian buffer encoding the result.
/// The caller must `fw_free(ptr, total_len)`, where `total_len` is read
/// from the first 4 bytes of the buffer.
///
/// # Caller contract
/// `ability_slot` must be 0 or 1 (mirrors the TS `FactoryCorpusPartyInstance`
/// type's `0 | 1` domain, which is not runtime-validated on the TS side
/// either — see `mon_construction::FactoryCorpusPartyInstance`'s doc
/// comment). Every real caller (this crate's own decoder included) only
/// ever passes 0 or 1.
///
/// # Buffer layout (all integers little-endian)
///
/// ```text
/// offset  width  field
/// 0       4      total_len (u32) — the whole buffer's length, including
///                these 4 bytes; pass this to fw_free.
/// 4       1      status (u8) — 0 = ok, 1 = error.
///
/// --- status == 1 (error) ---
/// 5       2      message_len (u16)
/// 7       message_len   message (utf8 bytes)
///                total_len == 7 + message_len
///
/// --- status == 0 (ok) --- (fields in FactoryCorpusPartyMemberState's
/// TS return-statement order, with the name fields elided — names are
/// resolved decoder-side, see core-rs/adapter/factoryEngine.ts)
/// 5       2      set_id (u16)
/// 7       2      species_id (u16)
/// 9       1      is_egg (u8, 0/1) — always 0
/// 10      1      ability_num (u8)
/// 11      1      ability_slot (u8)
/// 12      2      ability (u16)
/// 14      6      ivs (u8 x 6: hp, attack, defense, speed, sp_attack,
///                sp_defense)
/// 20      4      personality (u32)
/// 24      4      experience (u32)
/// 28      1      level (u8) — always 50
/// 29      1      friendship (u8) — always 0
/// 30      4      max_hp (u32)
/// 34      4      attack (u32)
/// 38      4      defense (u32)
/// 42      4      speed (u32)
/// 46      4      sp_attack (u32)
/// 50      4      sp_defense (u32)
/// 54      4      hp (u32) — always equal to max_hp
/// 58      1      status1 (u8) — always 0
/// 59      2      item_id (u16)
/// 61      2      hold_effect (u16)
/// 63      1      hold_effect_param (u8)
/// 64      8      moves (u16 x 4)
/// 72      4      pp (u8 x 4)
/// 76      1      pp_bonuses (u8) — always 0
/// 77      4      pp_ups (u8 x 4) — always [0, 0, 0, 0]
/// 81      1      nature (u8)
/// 82      12     evs (u16 x 6: hp, attack, defense, speed, sp_attack,
///                sp_defense)
/// 94      1      gender (u8) — 0 = male, 1 = female, 2 = genderless
/// 95      1      shiny (u8, 0/1)
///                total_len == 5 + 91 == 96
/// ```
#[no_mangle]
pub extern "C" fn fw_create_factory_party_member(
    set_id: u32,
    personality: u32,
    fixed_iv: u32,
    ability_slot: u32,
    ot_id: u32,
) -> *mut u8 {
    let instance = FactoryCorpusPartyInstance {
        set_id,
        personality,
        fixed_iv,
        ability_slot: ability_slot as u8,
        ot_id,
    };
    let bytes = encode_party_member_result(mon_construction::create_factory_corpus_party_member(
        instance,
    ));
    let ptr = fw_alloc(bytes.len() as u32);
    // SAFETY: `ptr` was just allocated by fw_alloc for exactly `bytes.len()`
    // bytes (fw_alloc's contract), and `bytes` is a distinct, non-overlapping
    // source buffer.
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
    }
    ptr
}

/// `fw_create_factory_party_member` with an explicit six-IV spread instead
/// of one uniform fixed IV — the shape `CreateBoxMon`'s random-IV branch
/// produces (`reference/pokeemerald/src/pokemon.c:2273-2294`). Additive:
/// `fw_create_factory_party_member` is unchanged, and this export returns
/// the SAME 96-byte member payload documented on it.
///
/// `ivs_packed` is the GBA's own packed IV word, `MON_DATA_IVS`
/// (`reference/pokeemerald/src/pokemon.c:3997-4004` reading it,
/// `:4398-4407` writing it):
///
/// ```text
/// hp | attack << 5 | defense << 10 | speed << 15 | sp_attack << 20
///    | sp_defense << 25
/// ```
///
/// Each field is masked to five bits (`MAX_IV_MASK`,
/// `reference/pokeemerald/include/constants/pokemon.h:201`) on unpack, so
/// bits 30-31 are ignored and no field can be out of range.
///
/// # Caller contract
/// `ability_slot` must be 0 or 1 — see `fw_create_factory_party_member`.
#[no_mangle]
pub extern "C" fn fw_create_factory_party_member_with_ivs(
    set_id: u32,
    personality: u32,
    ivs_packed: u32,
    ability_slot: u32,
    ot_id: u32,
) -> *mut u8 {
    let field = |shift: u32| ((ivs_packed >> shift) & u32::from(MAX_IV_MASK)) as u8;
    let ivs = [
        field(0),
        field(5),
        field(10),
        field(15),
        field(20),
        field(25),
    ];
    let instance = FactoryCorpusPartyInstance {
        set_id,
        personality,
        // Ignored by create_factory_corpus_party_member_with_ivs; carried
        // as the ATK IV so the struct stays self-consistent with the
        // `RentalRecord.fixed_iv == ivs[1]` rule
        // (battle_factory_screen.c:1824).
        fixed_iv: u32::from(ivs[1]),
        ability_slot: ability_slot as u8,
        ot_id,
    };
    let bytes = encode_party_member_result(
        mon_construction::create_factory_corpus_party_member_with_ivs(instance, ivs),
    );
    let ptr = fw_alloc(bytes.len() as u32);
    // SAFETY: `ptr` was just allocated by fw_alloc for exactly `bytes.len()`
    // bytes (fw_alloc's contract), and `bytes` is a distinct, non-overlapping
    // source buffer.
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
    }
    ptr
}

/// `MAX_IV_MASK` (`reference/pokeemerald/include/constants/pokemon.h:201`),
/// the five-bit field width of the packed `MON_DATA_IVS` word.
const MAX_IV_MASK: u16 = 31;

fn mon_gender_byte(gender: MonGender) -> u8 {
    match gender {
        MonGender::Male => 0,
        MonGender::Female => 1,
        MonGender::Genderless => 2,
    }
}

/// Pure encoding — no logic beyond the byte layout documented on
/// `fw_create_factory_party_member`. All logic lives in
/// `factory_core::mon_construction`.
fn encode_party_member_result(
    result: Result<FactoryCorpusPartyMemberState, PartyMemberError>,
) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();
    buf.extend_from_slice(&0u32.to_le_bytes()); // total_len placeholder, patched below
    match result {
        Err(err) => {
            buf.push(1); // status: error
            let message = err.to_string();
            let message_bytes = message.as_bytes();
            buf.extend_from_slice(&(message_bytes.len() as u16).to_le_bytes());
            buf.extend_from_slice(message_bytes);
        }
        Ok(m) => {
            buf.push(0); // status: ok
            buf.extend_from_slice(&m.set_id.to_le_bytes());
            buf.extend_from_slice(&m.species_id.to_le_bytes());
            buf.push(u8::from(m.is_egg));
            buf.push(m.ability_num);
            buf.push(m.ability_slot);
            buf.extend_from_slice(&m.ability.to_le_bytes());
            buf.extend_from_slice(&m.ivs);
            buf.extend_from_slice(&m.personality.to_le_bytes());
            buf.extend_from_slice(&m.experience.to_le_bytes());
            buf.push(m.level);
            buf.push(m.friendship);
            buf.extend_from_slice(&m.max_hp.to_le_bytes());
            buf.extend_from_slice(&m.attack.to_le_bytes());
            buf.extend_from_slice(&m.defense.to_le_bytes());
            buf.extend_from_slice(&m.speed.to_le_bytes());
            buf.extend_from_slice(&m.sp_attack.to_le_bytes());
            buf.extend_from_slice(&m.sp_defense.to_le_bytes());
            buf.extend_from_slice(&m.hp.to_le_bytes());
            buf.push(m.status1);
            buf.extend_from_slice(&m.item_id.to_le_bytes());
            buf.extend_from_slice(&m.hold_effect.to_le_bytes());
            buf.push(m.hold_effect_param);
            for mv in m.moves {
                buf.extend_from_slice(&mv.to_le_bytes());
            }
            buf.extend_from_slice(&m.pp);
            buf.push(m.pp_bonuses);
            buf.extend_from_slice(&m.pp_ups);
            buf.push(m.nature);
            for ev in m.evs {
                buf.extend_from_slice(&ev.to_le_bytes());
            }
            buf.push(mon_gender_byte(m.gender));
            buf.push(u8::from(m.shiny));
        }
    }
    let total_len = buf.len() as u32;
    buf[0..4].copy_from_slice(&total_len.to_le_bytes());
    buf
}

// === damage_calc surface (M4b) ==============================================
//
// Every export below is a thin scalar/buffer wrapper over
// `factory_core::damage_calc`'s pure functions (see that module's doc
// comment for the numeric id spaces: TYPE_* u8 0..17, ability/hold-effect
// ids from src/data/gen/ability-item-hooks.json .universes, the weather
// bitfield). Booleans cross as u32 0/1 (mirrors `has_construction_rng`
// above). `apply_type_effectiveness` uses the `gen_tables::TYPE_EFFECTIVENESS_TABLE`
// embedded in factory-core (promoted there this same step - see that
// table's doc comment) instead of taking the 110-row table as a parameter.
//
// `active_battler_abilities` (the Plus/Minus multi-battler field scan,
// `DamageCalcInput`'s only non-scalar-shaped field besides the two
// battlers) is NOT exposed at this boundary: `fw_calculate_base_damage`
// always passes `None`, i.e. the TS engine's own default
// `[attacker.ability, defender.ability]` pairing - the full field in the
// singles battles this engine exclusively models (see `DamageCalcInput`'s
// own doc comment). The doubles-only override is exercised directly by
// `damage_calc.rs`'s own Rust-native unit tests, not by this boundary or
// by gen-damage-vectors.mjs's directed cases either.

/// `CritMoveEffect` discriminant mapping: 0 = Other (also the fallback for
/// any other value - a defensive default rather than a WASM trap, since
/// every real caller only ever sends 0..4), 1 = HighCritical, 2 =
/// SkyAttack, 3 = BlazeKick, 4 = PoisonTail. Matches the enum's own
/// declaration order in `damage_calc.rs` (`#[default] Other` first).
fn crit_move_effect_from_u32(value: u32) -> CritMoveEffect {
    match value {
        1 => CritMoveEffect::HighCritical,
        2 => CritMoveEffect::SkyAttack,
        3 => CritMoveEffect::BlazeKick,
        4 => CritMoveEffect::PoisonTail,
        _ => CritMoveEffect::Other,
    }
}

/// `IS_TYPE_PHYSICAL(moveType)`. `move_type` is truncated to `u8` (caller
/// contract: 0..17, the real `TYPE_*` domain).
#[no_mangle]
pub extern "C" fn fw_is_type_physical(move_type: u32) -> u32 {
    u32::from(damage_calc::is_type_physical(move_type as u8))
}

/// `IS_TYPE_SPECIAL(moveType)`. Same `move_type` contract as `fw_is_type_physical`.
#[no_mangle]
pub extern "C" fn fw_is_type_special(move_type: u32) -> u32 {
    u32::from(damage_calc::is_type_special(move_type as u8))
}

/// `APPLY_STAT_MOD`. Caller contract: `stage` must be `0..=12` (indexes
/// `STAT_STAGE_RATIOS` directly) - out of range traps, same as the native
/// Rust panic this wraps.
#[no_mangle]
pub extern "C" fn fw_apply_stat_stage_mod(stat: i32, stage: u32) -> i32 {
    damage_calc::apply_stat_stage_mod(stat, stage as u8)
}

/// Fixed-width `DamageBattler` encoding (all integers little-endian),
/// shared by `fw_calculate_base_damage`'s attacker/defender fields.
///
/// ```text
/// offset  width  field
/// 0       4      attack (i32)
/// 4       4      defense (i32)
/// 8       4      sp_attack (i32)
/// 12      4      sp_defense (i32)
/// 16      4      level (i32)
/// 20      1      types[0] (u8)
/// 21      1      types[1] (u8)
/// 22      1      stat_stages.atk (u8)
/// 23      1      stat_stages.def (u8)
/// 24      1      stat_stages.sp_atk (u8)
/// 25      1      stat_stages.sp_def (u8)
/// 26      1      is_burned (u8, 0/1)
/// 27      1      has_status1 (u8, 0/1)
/// 28      1      has_hp (u8, 0/1) - gates the `hp` field below (no native
///                Option on the WASM ABI)
/// 29      4      hp (i32) - ignored (any value) when has_hp == 0
/// 33      1      has_max_hp (u8, 0/1) - gates `max_hp` below
/// 34      4      max_hp (i32) - ignored when has_max_hp == 0
/// 38      2      ability (u16, ABILITY_NONE == 0)
/// 40      2      species (u16, 0 == unset)
/// 42      2      hold_effect (u16, HOLD_EFFECT_NONE == 0)
/// 44      4      hold_effect_param (i32)
///                width == 48
/// ```
const DAMAGE_BATTLER_WIDTH: usize = 48;

fn decode_damage_battler(bytes: &[u8]) -> DamageBattler {
    let hp = i32::from_le_bytes(bytes[29..33].try_into().unwrap());
    let max_hp = i32::from_le_bytes(bytes[34..38].try_into().unwrap());
    DamageBattler {
        attack: i32::from_le_bytes(bytes[0..4].try_into().unwrap()),
        defense: i32::from_le_bytes(bytes[4..8].try_into().unwrap()),
        sp_attack: i32::from_le_bytes(bytes[8..12].try_into().unwrap()),
        sp_defense: i32::from_le_bytes(bytes[12..16].try_into().unwrap()),
        level: i32::from_le_bytes(bytes[16..20].try_into().unwrap()),
        types: [bytes[20], bytes[21]],
        stat_stages: StatStages {
            atk: bytes[22],
            def: bytes[23],
            sp_atk: bytes[24],
            sp_def: bytes[25],
        },
        is_burned: bytes[26] != 0,
        has_status1: bytes[27] != 0,
        hp: (bytes[28] != 0).then_some(hp),
        max_hp: (bytes[33] != 0).then_some(max_hp),
        ability: u16::from_le_bytes(bytes[38..40].try_into().unwrap()),
        species: u16::from_le_bytes(bytes[40..42].try_into().unwrap()),
        hold_effect: u16::from_le_bytes(bytes[42..44].try_into().unwrap()),
        hold_effect_param: i32::from_le_bytes(bytes[44..48].try_into().unwrap()),
    }
}

/// Fixed-width `DamageCalcInput` encoding (all integers little-endian).
/// Not length-prefixed: the width is a compile-time constant on both sides
/// (`DAMAGE_CALC_INPUT_WIDTH`), unlike the variable-length rental/party
/// buffers above.
///
/// ```text
/// offset  width  field
/// 0       48     attacker (DamageBattler, see decode_damage_battler's layout)
/// 48      48     defender (DamageBattler)
/// 96      4      move_power (i32)
/// 100     1      move_type (u8)
/// 101     1      is_critical_hit (u8, 0/1)
/// 102     1      side_status_reflect (u8, 0/1)
/// 103     1      side_status_light_screen (u8, 0/1)
/// 104     1      is_double_battle_spread_move (u8, 0/1)
/// 105     1      is_explosion_effect (u8, 0/1)
/// 106     4      weather (u32)
/// 110     1      weather_has_effect (u8, 0/1)
/// 111     4      current_move (u32)
/// 115     1      is_frontier_battle (u8, 0/1)
/// 116     1      flash_fire_boosted (u8, 0/1)
///                width == 117
/// ```
const DAMAGE_CALC_INPUT_WIDTH: usize = 117;

fn decode_damage_calc_input(bytes: &[u8]) -> DamageCalcInput {
    DamageCalcInput {
        attacker: decode_damage_battler(&bytes[0..DAMAGE_BATTLER_WIDTH]),
        defender: decode_damage_battler(&bytes[DAMAGE_BATTLER_WIDTH..2 * DAMAGE_BATTLER_WIDTH]),
        move_power: i32::from_le_bytes(bytes[96..100].try_into().unwrap()),
        move_type: bytes[100],
        is_critical_hit: bytes[101] != 0,
        side_status_reflect: bytes[102] != 0,
        side_status_light_screen: bytes[103] != 0,
        is_double_battle_spread_move: bytes[104] != 0,
        is_explosion_effect: bytes[105] != 0,
        weather: u32::from_le_bytes(bytes[106..110].try_into().unwrap()),
        weather_has_effect: bytes[110] != 0,
        current_move: u32::from_le_bytes(bytes[111..115].try_into().unwrap()),
        active_battler_abilities: None,
        is_frontier_battle: bytes[115] != 0,
        flash_fire_boosted: bytes[116] != 0,
    }
}

/// `CalculateBaseDamage`. Reads a fixed `DAMAGE_CALC_INPUT_WIDTH`-byte
/// buffer at `input_ptr` (layout documented on `decode_damage_calc_input`)
/// and returns the computed damage directly (this function cannot fail).
///
/// # Safety
/// `input_ptr` must point to at least `DAMAGE_CALC_INPUT_WIDTH` (117)
/// readable, initialized bytes encoding a `DamageCalcInput` per the
/// documented layout. Typically a buffer the caller `fw_alloc`'d, wrote
/// into, and will `fw_free` itself after this call returns (this function
/// does not take ownership of it).
#[no_mangle]
pub unsafe extern "C" fn fw_calculate_base_damage(input_ptr: *const u8) -> i32 {
    // SAFETY: caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, DAMAGE_CALC_INPUT_WIDTH) };
    let input = decode_damage_calc_input(bytes);
    damage_calc::calculate_base_damage(&input)
}

/// `Cmd_critcalc`'s `critChance` stage computation. Booleans cross as u32
/// 0/1; `move_effect` uses `crit_move_effect_from_u32`'s discriminant
/// mapping; `attacker_hold_effect` is the `HOLD_EFFECT_*` id
/// (`HOLD_EFFECT_NONE` == 0). Returns `0..=4` (an index into
/// `CRITICAL_HIT_CHANCE_ONE_IN`).
#[no_mangle]
pub extern "C" fn fw_get_critical_hit_chance_stage(
    focus_energy: u32,
    move_effect: u32,
    attacker_hold_effect: u32,
    is_chansey: u32,
    is_farfetchd: u32,
) -> u32 {
    let input = CritChanceInput {
        focus_energy: focus_energy != 0,
        move_effect: crit_move_effect_from_u32(move_effect),
        attacker_hold_effect: attacker_hold_effect as u16,
        is_chansey: is_chansey != 0,
        is_farfetchd: is_farfetchd != 0,
    };
    damage_calc::get_critical_hit_chance_stage(&input) as u32
}

/// `Cmd_critcalc`'s final roll. Caller contract: `crit_chance_stage` must
/// be `0..=4` (the range `fw_get_critical_hit_chance_stage` itself always
/// returns) - out of range traps, same as the native Rust panic this
/// wraps. `rng_roll` is truncated to `u16` (the real `Random()` output
/// domain). Returns 0/1.
#[no_mangle]
pub extern "C" fn fw_roll_is_critical_hit(
    crit_chance_stage: u32,
    rng_roll: u32,
    target_immune: u32,
) -> u32 {
    u32::from(damage_calc::roll_is_critical_hit(
        crit_chance_stage as usize,
        rng_roll as u16,
        target_immune != 0,
    ))
}

/// `Cmd_typecalc`'s STAB step. `attacker_type_a`/`attacker_type_b`/`move_type`
/// truncate to `u8` (caller contract: 0..17).
#[no_mangle]
pub extern "C" fn fw_apply_stab(
    damage: i32,
    attacker_type_a: u32,
    attacker_type_b: u32,
    move_type: u32,
) -> i32 {
    damage_calc::apply_stab(
        damage,
        [attacker_type_a as u8, attacker_type_b as u8],
        move_type as u8,
    )
}

/// `ModulateDmgByType`. Uses the `gen_tables::TYPE_EFFECTIVENESS_TABLE`
/// embedded in factory-core (not passed across the ABI). Returns an
/// `fw_alloc`'d 8-byte buffer (no status/error byte - this function cannot
/// fail): the caller must `fw_free(ptr, 8)`.
///
/// ```text
/// offset  width  field
/// 0       4      damage (i32)
/// 4       4      multiplier_tenths (i32)
///                width == 8 (fixed, not length-prefixed)
/// ```
#[no_mangle]
pub extern "C" fn fw_apply_type_effectiveness(
    damage: i32,
    move_type: u32,
    defender_type_a: u32,
    defender_type_b: u32,
) -> *mut u8 {
    let result = damage_calc::apply_type_effectiveness(
        damage,
        move_type as u8,
        [defender_type_a as u8, defender_type_b as u8],
        &gen_tables::TYPE_EFFECTIVENESS_TABLE,
    );
    let mut buf = [0u8; 8];
    buf[0..4].copy_from_slice(&result.damage.to_le_bytes());
    buf[4..8].copy_from_slice(&result.multiplier_tenths.to_le_bytes());
    let ptr = fw_alloc(8);
    // SAFETY: `ptr` was just allocated by fw_alloc for exactly 8 bytes, and
    // `buf` is a distinct, non-overlapping 8-byte source buffer.
    unsafe {
        std::ptr::copy_nonoverlapping(buf.as_ptr(), ptr, 8);
    }
    ptr
}

/// `Cmd_setdamagetohealthdifference` (EFFECT_ENDEAVOR's raw HP-diff, clamped
/// to 0).
#[no_mangle]
pub extern "C" fn fw_calculate_endeavor_damage(target_hp: i32, user_hp: i32) -> i32 {
    damage_calc::calculate_endeavor_damage(target_hp, user_hp)
}

/// EFFECT_ENDEAVOR's full damage resolution (the type-multiplier only
/// gates immunity, never scales the dealt HP-diff - see
/// `resolve_endeavor_damage`'s own doc comment).
#[no_mangle]
pub extern "C" fn fw_resolve_endeavor_damage(
    target_hp: i32,
    user_hp: i32,
    type_multiplier_tenths: i32,
) -> i32 {
    damage_calc::resolve_endeavor_damage(target_hp, user_hp, type_multiplier_tenths)
}

/// `ApplyRandomDmgMultiplier`. `rng_roll` is truncated to `u16` (the real
/// `Random()` output domain).
#[no_mangle]
pub extern "C" fn fw_apply_random_damage_multiplier(damage: i32, rng_roll: u32) -> i32 {
    damage_calc::apply_random_damage_multiplier(damage, rng_roll as u16)
}

/// Fixed-width `AccuracyCalcInput` encoding (all integers little-endian).
/// Not length-prefixed, same rationale as `DamageCalcInput`'s encoding.
///
/// ```text
/// offset  width  field
/// 0       4      move_accuracy (i32)
/// 4       4      attacker_accuracy_stage (i32)
/// 8       4      target_evasion_stage (i32)
/// 12      1      target_has_foresight (u8, 0/1)
/// 13      2      attacker_ability (u16, ABILITY_NONE == 0)
/// 15      2      target_ability (u16, ABILITY_NONE == 0)
/// 17      1      is_sandstorm (u8, 0/1)
/// 18      1      has_move_type (u8, 0/1) - gates `move_type` below (no
///                native Option on the WASM ABI)
/// 19      1      move_type (u8) - ignored when has_move_type == 0
/// 20      2      target_hold_effect (u16, HOLD_EFFECT_NONE == 0)
/// 22      4      target_hold_effect_param (i32)
///                width == 26
/// ```
const ACCURACY_CALC_INPUT_WIDTH: usize = 26;

fn decode_accuracy_calc_input(bytes: &[u8]) -> AccuracyCalcInput {
    AccuracyCalcInput {
        move_accuracy: i32::from_le_bytes(bytes[0..4].try_into().unwrap()),
        attacker_accuracy_stage: i32::from_le_bytes(bytes[4..8].try_into().unwrap()),
        target_evasion_stage: i32::from_le_bytes(bytes[8..12].try_into().unwrap()),
        target_has_foresight: bytes[12] != 0,
        attacker_ability: u16::from_le_bytes(bytes[13..15].try_into().unwrap()),
        target_ability: u16::from_le_bytes(bytes[15..17].try_into().unwrap()),
        is_sandstorm: bytes[17] != 0,
        move_type: (bytes[18] != 0).then_some(bytes[19]),
        target_hold_effect: u16::from_le_bytes(bytes[20..22].try_into().unwrap()),
        target_hold_effect_param: i32::from_le_bytes(bytes[22..26].try_into().unwrap()),
    }
}

/// `Cmd_accuracycheck`'s `calc` value. Reads a fixed
/// `ACCURACY_CALC_INPUT_WIDTH`-byte buffer at `input_ptr` (layout
/// documented on `decode_accuracy_calc_input`) and returns `calc` directly
/// (this function cannot fail).
///
/// # Safety
/// `input_ptr` must point to at least `ACCURACY_CALC_INPUT_WIDTH` (26)
/// readable, initialized bytes encoding an `AccuracyCalcInput` per the
/// documented layout. Same ownership contract as `fw_calculate_base_damage`.
#[no_mangle]
pub unsafe extern "C" fn fw_calculate_accuracy(input_ptr: *const u8) -> i32 {
    // SAFETY: caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, ACCURACY_CALC_INPUT_WIDTH) };
    let input = decode_accuracy_calc_input(bytes);
    damage_calc::calculate_accuracy(&input)
}

/// `Cmd_accuracycheck`'s final roll. `rng_roll` is truncated to `u16` (the
/// real `Random()` output domain). Returns 0/1.
#[no_mangle]
pub extern "C" fn fw_roll_accuracy_hits(calc: i32, rng_roll: u32) -> u32 {
    u32::from(damage_calc::roll_accuracy_hits(calc, rng_roll as u16))
}

// === turn_order / turn_rng surface (M4c) ====================================
//
// Every export below is a thin scalar/buffer wrapper over
// `factory_core::turn_order`/`factory_core::turn_rng`'s pure functions (see
// those modules' doc comments for the numeric id spaces: ability/hold-effect
// ids from src/data/gen/ability-item-hooks.json .universes, same ids
// damage_calc.rs's own boundary above uses). Booleans cross as u32 0/1.

/// Fixed-width `TurnOrderBattler` encoding (all integers little-endian).
///
/// ```text
/// offset  width  field
/// 0       4      speed (u32)
/// 4       1      speed_stage (u8)
/// 5       4      move_priority (i32)
/// 9       1      is_paralyzed (u8, 0/1)
/// 10      2      ability (u16, ABILITY_NONE == 0)
/// 12      2      hold_effect (u16, HOLD_EFFECT_NONE == 0)
/// 14      4      hold_effect_param (u32)
///                width == 18
/// ```
const TURN_ORDER_BATTLER_WIDTH: usize = 18;

fn decode_turn_order_battler(bytes: &[u8]) -> TurnOrderBattler {
    TurnOrderBattler {
        speed: u32::from_le_bytes(bytes[0..4].try_into().unwrap()),
        speed_stage: bytes[4],
        move_priority: i32::from_le_bytes(bytes[5..9].try_into().unwrap()),
        is_paralyzed: bytes[9] != 0,
        ability: u16::from_le_bytes(bytes[10..12].try_into().unwrap()),
        hold_effect: u16::from_le_bytes(bytes[12..14].try_into().unwrap()),
        hold_effect_param: u32::from_le_bytes(bytes[14..18].try_into().unwrap()),
    }
}

fn weather_from_flags(is_raining: u32, is_sunny: u32) -> WeatherState {
    WeatherState { is_raining: is_raining != 0, is_sunny: is_sunny != 0 }
}

/// `effectiveSpeed`. Reads a fixed `TURN_ORDER_BATTLER_WIDTH`-byte buffer at
/// `battler_ptr` (layout documented on `decode_turn_order_battler`) and
/// returns the effective speed directly (this function cannot fail).
///
/// # Safety
/// `battler_ptr` must point to at least `TURN_ORDER_BATTLER_WIDTH` (18)
/// readable, initialized bytes encoding a `TurnOrderBattler` per the
/// documented layout. Same ownership contract as `fw_calculate_base_damage`.
#[no_mangle]
pub unsafe extern "C" fn fw_effective_speed(
    battler_ptr: *const u8,
    is_raining: u32,
    is_sunny: u32,
    random_turn_number: u32,
) -> u32 {
    // SAFETY: caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(battler_ptr, TURN_ORDER_BATTLER_WIDTH) };
    let battler = decode_turn_order_battler(bytes);
    turn_order::effective_speed(
        &battler,
        weather_from_flags(is_raining, is_sunny),
        random_turn_number as u16,
    )
}

/// `GetWhoStrikesFirst`. Reads two fixed `TURN_ORDER_BATTLER_WIDTH`-byte
/// buffers (layout documented on `decode_turn_order_battler`) and returns
/// `0`/`1`/`2` directly (this function cannot fail).
///
/// # Safety
/// `battler1_ptr`/`battler2_ptr` must each point to at least
/// `TURN_ORDER_BATTLER_WIDTH` (18) readable, initialized bytes encoding a
/// `TurnOrderBattler` per the documented layout.
#[no_mangle]
pub unsafe extern "C" fn fw_get_who_strikes_first(
    battler1_ptr: *const u8,
    battler2_ptr: *const u8,
    speed_tie_rng_roll: u32,
    is_raining: u32,
    is_sunny: u32,
    random_turn_number: u32,
) -> u32 {
    // SAFETY: caller contract above.
    let (b1, b2) = unsafe {
        let bytes1 = std::slice::from_raw_parts(battler1_ptr, TURN_ORDER_BATTLER_WIDTH);
        let bytes2 = std::slice::from_raw_parts(battler2_ptr, TURN_ORDER_BATTLER_WIDTH);
        (
            decode_turn_order_battler(bytes1),
            decode_turn_order_battler(bytes2),
        )
    };
    u32::from(turn_order::get_who_strikes_first(
        &b1,
        &b2,
        speed_tie_rng_roll as u16,
        weather_from_flags(is_raining, is_sunny),
        random_turn_number as u16,
    ))
}

/// `sortBattlersByTurnOrder`. Reads a single input buffer at `input_ptr`
/// (`input_len` bytes) and returns an `fw_alloc`'d buffer of `battler_count
/// * 4` little-endian `u32` battler ids (the sorted order) — no length
/// prefix, since the caller already knows `battler_count`. The caller must
/// `fw_free(ptr, battler_count * 4)`.
///
/// # Input buffer layout (all integers little-endian)
///
/// ```text
/// offset          width                field
/// 0               4                    battler_count (u32) N
/// 4               4                    roll_count (u32) R
/// 8               N * 4                battler_ids (u32 each)
/// 8 + N*4         N * 18               battlers (TurnOrderBattler, 18
///                                      bytes each — see
///                                      decode_turn_order_battler — same
///                                      order as battler_ids)
/// 8 + N*22        R * 2                speed_tie_rng_rolls (u16 each)
/// 8 + N*22 + R*2  1                    is_raining (u8)
/// +1              1                    is_sunny (u8)
/// +1              4                    random_turn_number (u32)
///                 total: 8 + N*22 + R*2 + 6
/// ```
///
/// # Safety
/// `input_ptr` must point to at least `input_len` readable, initialized
/// bytes encoding the layout above (`input_len` must equal the buffer's own
/// self-described total width, i.e. `8 + N*22 + R*2 + 6` for its own
/// embedded `N`/`R` — an undersized `input_len` may cause an out-of-bounds
/// slice panic, same failure mode as every other fixed-width decoder in
/// this crate).
#[no_mangle]
pub unsafe extern "C" fn fw_sort_battlers_by_turn_order(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    // SAFETY: caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len as usize) };
    let battler_count = u32::from_le_bytes(bytes[0..4].try_into().unwrap()) as usize;
    let roll_count = u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize;

    let ids_start = 8;
    let ids_end = ids_start + battler_count * 4;
    let mut battler_ids: Vec<u32> = Vec::with_capacity(battler_count);
    for i in 0..battler_count {
        let off = ids_start + i * 4;
        battler_ids.push(u32::from_le_bytes(bytes[off..off + 4].try_into().unwrap()));
    }

    let battlers_start = ids_end;
    let mut battlers: std::collections::HashMap<u32, TurnOrderBattler> =
        std::collections::HashMap::new();
    for (i, &id) in battler_ids.iter().enumerate() {
        let off = battlers_start + i * TURN_ORDER_BATTLER_WIDTH;
        let battler = decode_turn_order_battler(&bytes[off..off + TURN_ORDER_BATTLER_WIDTH]);
        battlers.insert(id, battler);
    }

    let rolls_start = battlers_start + battler_count * TURN_ORDER_BATTLER_WIDTH;
    let mut rolls: Vec<u16> = Vec::with_capacity(roll_count);
    for i in 0..roll_count {
        let off = rolls_start + i * 2;
        rolls.push(u16::from_le_bytes(bytes[off..off + 2].try_into().unwrap()));
    }

    let flags_start = rolls_start + roll_count * 2;
    let weather = weather_from_flags(
        u32::from(bytes[flags_start]),
        u32::from(bytes[flags_start + 1]),
    );
    let random_turn_number =
        u32::from_le_bytes(bytes[flags_start + 2..flags_start + 6].try_into().unwrap()) as u16;

    let order = turn_order::sort_battlers_by_turn_order(
        &battler_ids,
        &battlers,
        &rolls,
        weather,
        random_turn_number,
    );

    let mut out = Vec::with_capacity(order.len() * 4);
    for id in &order {
        out.extend_from_slice(&id.to_le_bytes());
    }
    let ptr = fw_alloc(out.len() as u32);
    // SAFETY: `ptr` was just allocated by fw_alloc for exactly `out.len()`
    // bytes, and `out` is a distinct, non-overlapping source buffer.
    unsafe {
        std::ptr::copy_nonoverlapping(out.as_ptr(), ptr, out.len());
    }
    ptr
}

/// One `run_turn1_rng_ledger` step's fixed-width encoding (all integers
/// little-endian), repeated 7 times back to back in
/// `fw_run_turn1_rng_ledger`'s output buffer.
///
/// ```text
/// offset  width  field
/// 0       4      rng_value_before (u32)
/// 4       4      rng_value_after (u32)
/// 8       1      roll_count (u8)
/// 9       10     rolls (u16 x 5, only the first roll_count are meaningful)
///                width == 19
/// ```
const TURN_RNG_STEP_WIDTH: usize = 19;
/// `TURN1_RNG_STEPS.len()` (7) — see `factory_core::turn_rng`.
const TURN_RNG_STEP_COUNT: usize = 7;

/// `runTurn1RngLedger`. Returns an `fw_alloc`'d fixed
/// `TURN_RNG_STEP_WIDTH * TURN_RNG_STEP_COUNT` (133)-byte buffer (no status
/// byte or length prefix — this function cannot fail, and the width is a
/// compile-time constant on both sides); the caller must `fw_free(ptr,
/// 133)`.
#[no_mangle]
pub extern "C" fn fw_run_turn1_rng_ledger(starting_rng_value: u32) -> *mut u8 {
    let results = turn_rng::run_turn1_rng_ledger(starting_rng_value);
    let mut buf = [0u8; TURN_RNG_STEP_WIDTH * TURN_RNG_STEP_COUNT];
    for (i, step) in results.iter().enumerate() {
        let off = i * TURN_RNG_STEP_WIDTH;
        buf[off..off + 4].copy_from_slice(&step.rng_value_before.to_le_bytes());
        buf[off + 4..off + 8].copy_from_slice(&step.rng_value_after.to_le_bytes());
        buf[off + 8] = step.roll_count as u8;
        for (r, roll) in step.rolls.iter().enumerate() {
            let roff = off + 9 + r * 2;
            buf[roff..roff + 2].copy_from_slice(&roll.to_le_bytes());
        }
    }
    let ptr = fw_alloc(buf.len() as u32);
    // SAFETY: `ptr` was just allocated by fw_alloc for exactly `buf.len()`
    // bytes, and `buf` is a distinct, non-overlapping source buffer.
    unsafe {
        std::ptr::copy_nonoverlapping(buf.as_ptr(), ptr, buf.len());
    }
    ptr
}

// === factory_ai_mask / factory_ai_check_bad_move surface (M5c) ==============
//
// Two entry points, matching exactly the two module APIs
// `src/engine/factoryAiDecisionPolicy.ts` consumes (`selectFactoryAiMask`,
// `runCheckBadMovePreamble`) -- not the vestigial direct-test handlers
// (`runCbmAccUp`/`runCbmSpAtkDown`) or the shared infra (`nextGetAbilityDraw`
// et al.), whose own coverage lives in factory-core's native tests and
// checked-in vectors already (docs/rust-m5-scout.md "Boundary sketch").
//
// Both exports return an `fw_alloc`'d, length-prefixed little-endian buffer
// (the `fw_generate_initial_rentals`/`fw_create_factory_party_member`
// pattern above); the caller must `fw_free(ptr, total_len)`.

fn alloc_and_copy(bytes: &[u8]) -> *mut u8 {
    let ptr = fw_alloc(bytes.len() as u32);
    // SAFETY: `ptr` was just allocated by fw_alloc for exactly `bytes.len()`
    // bytes (fw_alloc's contract), and `bytes` is a distinct, non-overlapping
    // source buffer.
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
    }
    ptr
}

fn patch_total_len(buf: &mut [u8]) {
    let total_len = buf.len() as u32;
    buf[0..4].copy_from_slice(&total_len.to_le_bytes());
}

// --- fw_select_factory_ai_mask ------------------------------------------

const FACTORY_AI_MASK_ERROR_LEVEL_MODE: u8 = 0;
const FACTORY_AI_MASK_ERROR_BATTLE_MODE: u8 = 1;
const FACTORY_AI_MASK_ERROR_FACTORY_WIN_STREAK: u8 = 2;
const FACTORY_AI_MASK_ERROR_TRAINER_OPPONENT_ID: u8 = 3;

fn encode_factory_ai_mask_error(kind: u8, value: u32) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();
    buf.extend_from_slice(&0u32.to_le_bytes());
    buf.push(1); // status: error
    buf.push(kind);
    buf.extend_from_slice(&value.to_le_bytes());
    patch_total_len(&mut buf);
    buf
}

fn encode_factory_ai_mask_selection(selection: factory_ai_mask::FactoryAiMaskSelection) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();
    buf.extend_from_slice(&0u32.to_le_bytes());
    buf.push(0); // status: ok
    let r = &selection.receipt;
    buf.push(selection.mask);
    buf.push(u8::from(r.is_frontier_brain));
    buf.extend_from_slice(&r.frontier_stages_per_challenge.to_le_bytes());
    buf.push(u8::from(r.challenge_number.is_some()));
    buf.extend_from_slice(&r.challenge_number.unwrap_or(0).to_le_bytes());
    buf.push(r.evaluation_count);
    for i in 0..r.evaluations.len() {
        if i < r.evaluation_count as usize {
            let e = r.evaluations[i];
            buf.push(e.branch as u8);
            buf.push(u8::from(e.matched));
        } else {
            buf.push(0);
            buf.push(0);
        }
    }
    buf.push(r.branch as u8);
    patch_total_len(&mut buf);
    buf
}

/// `GetAiScriptsInBattleFactory` via `factory_ai_mask::select_factory_ai_mask`.
/// Scalar-args input (the whole input is 4 small integers -- the cheapest
/// faithful shape, no buffer needed): booleans/enums cross as `u32` per the
/// ABI's scalar convention; `level_mode`/`battle_mode` are validated against
/// their full `u32` range here (not truncated to `u8` first) so an
/// out-of-range caller value is reported exactly, mirroring TS's
/// `requireIntegerInRange` reading the untruncated JS number -- truncating
/// first would let e.g. `level_mode = 256` wrap to `0` and silently validate.
/// `factory_win_streak`/`trainer_opponent_id` are already `u32` on both
/// sides, so `factory_ai_mask::select_factory_ai_mask` itself reports their
/// out-of-range cases. Returns an `fw_alloc`'d buffer; the caller must
/// `fw_free(ptr, total_len)`.
///
/// # Buffer layout (all integers little-endian)
///
/// ```text
/// offset  width  field
/// 0       4      total_len (u32) -- the whole buffer's length, including
///                these 4 bytes; pass this to fw_free.
/// 4       1      status (u8) -- 0 = ok, 1 = error.
///
/// --- status == 1 (error) ---
/// 5       1      error_kind (u8) -- 0 = LevelModeOutOfRange,
///                1 = BattleModeOutOfRange, 2 = FactoryWinStreakOutOfRange,
///                3 = TrainerOpponentIdOutOfRange (FactoryAiMaskError's four
///                variants, `factory_ai_mask.rs` doc comment "Error surface").
/// 6       4      value (u32) -- the offending input value, untruncated.
///                total_len == 10
///
/// --- status == 0 (ok) ---
/// 5       1      mask (u8) -- 0, 1, or 7.
/// 6       1      is_frontier_brain (u8, 0/1)
/// 7       4      frontier_stages_per_challenge (u32)
/// 11      1      has_challenge_number (u8, 0/1) -- gates challenge_number
///                below (`None` in Tent mode; no native Option on the WASM
///                ABI, same convention as `has_construction_rng` above).
/// 12      4      challenge_number (u32) -- ignored when has_challenge_number == 0
/// 16      1      evaluation_count (u8, 1..=5) -- the source loop breaks at
///                the first match, so not always 5.
/// 17      10     evaluations: 5 fixed-width 2-byte records, back to back
///                (only the first evaluation_count are meaningful; the rest
///                are zero-filled and MUST be ignored by the decoder):
///                  0   1   branch (u8) -- FactoryAiPolicyBranchId's
///                          discriminant: 0=Tent, 1=FrontierBrain,
///                          2=ChallengeBelow2, 3=ChallengeBelow4,
///                          4=ChallengeAtLeast4 (BRANCH_ORDER's index order,
///                          `factory_ai_mask.rs`).
///                  1   1   matched (u8, 0/1)
/// 27      1      branch (u8) -- the selected branch, same discriminant as above.
///                total_len == 28
/// ```
#[no_mangle]
pub extern "C" fn fw_select_factory_ai_mask(
    level_mode: u32,
    battle_mode: u32,
    factory_win_streak: u32,
    trainer_opponent_id: u32,
) -> *mut u8 {
    if level_mode > factory_ai_mask::FACTORY_LEVEL_MODE_TENT as u32 {
        return alloc_and_copy(&encode_factory_ai_mask_error(
            FACTORY_AI_MASK_ERROR_LEVEL_MODE,
            level_mode,
        ));
    }
    if battle_mode > factory_ai_mask::FACTORY_BATTLE_MODE_DOUBLES as u32 {
        return alloc_and_copy(&encode_factory_ai_mask_error(
            FACTORY_AI_MASK_ERROR_BATTLE_MODE,
            battle_mode,
        ));
    }
    let input = FactoryAiMaskSelectionInput {
        level_mode: level_mode as u8,
        battle_mode: battle_mode as u8,
        factory_win_streak,
        trainer_opponent_id,
    };
    let bytes = match factory_ai_mask::select_factory_ai_mask(input) {
        Ok(selection) => encode_factory_ai_mask_selection(selection),
        Err(FactoryAiMaskError::LevelModeOutOfRange { value }) => {
            encode_factory_ai_mask_error(FACTORY_AI_MASK_ERROR_LEVEL_MODE, value as u32)
        }
        Err(FactoryAiMaskError::BattleModeOutOfRange { value }) => {
            encode_factory_ai_mask_error(FACTORY_AI_MASK_ERROR_BATTLE_MODE, value as u32)
        }
        Err(FactoryAiMaskError::FactoryWinStreakOutOfRange { value }) => {
            encode_factory_ai_mask_error(FACTORY_AI_MASK_ERROR_FACTORY_WIN_STREAK, value)
        }
        Err(FactoryAiMaskError::TrainerOpponentIdOutOfRange { value }) => {
            encode_factory_ai_mask_error(FACTORY_AI_MASK_ERROR_TRAINER_OPPONENT_ID, value)
        }
    };
    alloc_and_copy(&bytes)
}

// --- fw_run_check_bad_move_preamble --------------------------------------

/// Minimal little-endian byte cursor for `CheckBadMovePreambleInput`'s ~60
/// scalar/optional fields -- a sequential reader (rather than the
/// hardcoded-offset-literal style `decode_damage_battler` et al. use above)
/// because at this field count, hand-transcribed offset literals on both the
/// Rust and TS sides are the real correctness risk, not the offsets
/// themselves; the doc comment below documents the field order and each
/// one's derived offset for readers, generated by summing this exact field
/// list once. `opt_*` methods decode the presence-preserving convention
/// point 2 of the M5c brief requires: one leading `bool` presence byte
/// (`0`/`1`) followed by a value slot that MUST be ignored when the presence
/// byte is `0` (mirrors `decode_damage_battler`'s `has_hp`/`hp` gate, scaled
/// to ~30 optional fields per struct instead of two).
struct ByteReader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> ByteReader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }
    fn u8(&mut self) -> u8 {
        let v = self.bytes[self.offset];
        self.offset += 1;
        v
    }
    fn bool_(&mut self) -> bool {
        self.u8() != 0
    }
    fn u16(&mut self) -> u16 {
        let v = u16::from_le_bytes(self.bytes[self.offset..self.offset + 2].try_into().unwrap());
        self.offset += 2;
        v
    }
    fn u32(&mut self) -> u32 {
        let v = u32::from_le_bytes(self.bytes[self.offset..self.offset + 4].try_into().unwrap());
        self.offset += 4;
        v
    }
    fn i32(&mut self) -> i32 {
        let v = i32::from_le_bytes(self.bytes[self.offset..self.offset + 4].try_into().unwrap());
        self.offset += 4;
        v
    }
    fn opt_u8(&mut self) -> Option<u8> {
        let present = self.bool_();
        let v = self.u8();
        present.then_some(v)
    }
    fn opt_bool(&mut self) -> Option<bool> {
        let present = self.bool_();
        let v = self.bool_();
        present.then_some(v)
    }
    fn opt_u16(&mut self) -> Option<u16> {
        let present = self.bool_();
        let v = self.u16();
        present.then_some(v)
    }
    fn opt_i32(&mut self) -> Option<i32> {
        let present = self.bool_();
        let v = self.i32();
        present.then_some(v)
    }
    fn opt_u32(&mut self) -> Option<u32> {
        let present = self.bool_();
        let v = self.u32();
        present.then_some(v)
    }
    fn opt_u16x4(&mut self) -> Option<[u16; 4]> {
        let present = self.bool_();
        let values = [self.u16(), self.u16(), self.u16(), self.u16()];
        present.then_some(values)
    }
    fn opt_u16x2(&mut self) -> Option<[u16; 2]> {
        let present = self.bool_();
        let values = [self.u16(), self.u16()];
        present.then_some(values)
    }
    fn bytes(&mut self, len: usize) -> &'a [u8] {
        let result = &self.bytes[self.offset..self.offset + len];
        self.offset += len;
        result
    }
}

fn gender_from_byte(b: u8) -> FactoryAiMonGender {
    match b {
        0 => FactoryAiMonGender::Male,
        1 => FactoryAiMonGender::Female,
        _ => FactoryAiMonGender::Genderless,
    }
}

/// Decodes `FactoryAiCheckBadMoveTarget`'s 28 fields (offsets 14..67 of the
/// full `CheckBadMovePreambleInput` buffer -- see `fw_run_check_bad_move_preamble`'s
/// doc comment for the complete field-by-field offset table), in exactly the
/// Rust struct's declaration order (`factory_ai_check_bad_move.rs`).
fn decode_cbm_target(r: &mut ByteReader) -> FactoryAiCheckBadMoveTarget {
    let species = r.u16();
    let types = [r.u8(), r.u8()];
    let known_ability = r.opt_u16();
    let real_ability = r.u16();
    let speed_stage = r.u8();
    let atk_stage = r.u8();
    let def_stage = r.u8();
    let sp_def_stage = r.u8();
    let acc_stage = r.opt_u8();
    let evasion_stage = r.opt_u8();
    let has_any_status = r.opt_bool();
    let safeguard_up = r.opt_bool();
    let is_confused = r.opt_bool();
    let is_leech_seeded = r.opt_bool();
    let is_asleep = r.opt_bool();
    let is_escape_prevented = r.opt_bool();
    let is_tormented = r.opt_bool();
    let has_perish_song = r.opt_bool();
    let is_nightmared = r.opt_bool();
    let is_foresighted = r.opt_bool();
    let spikes_up = r.opt_bool();
    let target_future_attack_up = r.opt_bool();
    let level = r.opt_u8();
    let sp_atk_stage = r.opt_u8();
    let is_infatuated = r.opt_bool();
    let any_move_disabled = r.opt_bool();
    let any_move_encored = r.opt_bool();
    let gender = r.opt_u8().map(gender_from_byte);
    FactoryAiCheckBadMoveTarget {
        species,
        types,
        known_ability,
        real_ability,
        speed_stage,
        atk_stage,
        def_stage,
        sp_def_stage,
        acc_stage,
        evasion_stage,
        has_any_status,
        safeguard_up,
        is_confused,
        is_leech_seeded,
        is_asleep,
        is_escape_prevented,
        is_tormented,
        has_perish_song,
        is_nightmared,
        is_foresighted,
        spikes_up,
        target_future_attack_up,
        level,
        sp_atk_stage,
        is_infatuated,
        any_move_disabled,
        any_move_encored,
        gender,
    }
}

/// Decodes `FactoryAiCheckBadMoveAttacker`'s 29 fields (offsets 69..132 of
/// the full `CheckBadMovePreambleInput` buffer), in exactly the Rust
/// struct's declaration order.
fn decode_cbm_attacker(r: &mut ByteReader) -> FactoryAiCheckBadMoveAttacker {
    let atk_stage = r.u8();
    let def_stage = r.u8();
    let speed_stage = r.opt_u8();
    let sp_atk_stage = r.opt_u8();
    let sp_def_stage = r.opt_u8();
    let light_screen_up = r.opt_bool();
    let reflect_up = r.opt_bool();
    let evasion_stage = r.opt_u8();
    let attacker_future_attack_up = r.opt_bool();
    let has_focus_energy = r.opt_bool();
    let has_curable_status = r.opt_bool();
    let current_weather = r.opt_u8();
    let level = r.opt_u8();
    let is_first_turn = r.opt_u8();
    let safeguard_up = r.opt_bool();
    let is_asleep = r.opt_bool();
    let usable_party_mons = r.opt_u8();
    let has_substitute = r.opt_bool();
    let hp = r.opt_i32();
    let max_hp = r.opt_i32();
    let is_rooted = r.opt_bool();
    let acc_stage = r.opt_u8();
    let mist_up = r.opt_bool();
    let gender = r.opt_u8().map(gender_from_byte);
    let imprisoned_others = r.opt_bool();
    let mud_sport_up = r.opt_bool();
    let water_sport_up = r.opt_bool();
    let used_held_item_id = r.opt_u16();
    let stockpile_count = r.opt_u8();
    FactoryAiCheckBadMoveAttacker {
        atk_stage,
        def_stage,
        speed_stage,
        sp_atk_stage,
        sp_def_stage,
        light_screen_up,
        reflect_up,
        evasion_stage,
        attacker_future_attack_up,
        has_focus_energy,
        has_curable_status,
        current_weather,
        level,
        is_first_turn,
        safeguard_up,
        is_asleep,
        usable_party_mons,
        has_substitute,
        hp,
        max_hp,
        is_rooted,
        acc_stage,
        mist_up,
        gender,
        imprisoned_others,
        mud_sport_up,
        water_sport_up,
        used_held_item_id,
        stockpile_count,
    }
}

/// Decodes the 42-field, 108-byte `FactoryAiCheckViabilityBattler` record
/// used by `fw_run_check_viability`. The field order and derived offsets are
/// documented on that export; keeping this sequential cursor next to the
/// existing CBM cursor makes optional presence (especially false/zero values)
/// impossible to accidentally pre-resolve in the boundary.
fn decode_cv_battler(r: &mut ByteReader) -> FactoryAiCheckViabilityBattler {
    FactoryAiCheckViabilityBattler {
        speed: r.u32(),
        speed_stage: r.u8(),
        types: [r.u8(), r.u8()],
        is_first_turn: r.u8(),
        evasion_stage: r.u8(),
        acc_stage: r.u8(),
        atk_stage: r.u8(),
        def_stage: r.u8(),
        sp_def_stage: r.u8(),
        hp: r.i32(),
        max_hp: r.i32(),
        sp_atk_stage: r.opt_u8(),
        last_used_move_id: r.opt_u16(),
        is_toxic_poisoned: r.opt_bool(),
        is_leech_seeded: r.opt_bool(),
        is_rooted: r.opt_bool(),
        is_cursed: r.opt_bool(),
        ability: r.opt_u16(),
        current_weather: r.opt_u8(),
        moves: r.opt_u16x4(),
        battle_turn_count: r.opt_u32(),
        known_moves: r.opt_u16x4(),
        known_moves_tail: None,
        is_infatuated: r.opt_bool(),
        is_asleep: r.opt_bool(),
        is_confused: r.opt_bool(),
        is_taunted: r.opt_bool(),
        has_yawn: r.opt_bool(),
        has_perish_song: r.opt_bool(),
        protect_uses: r.opt_u8(),
        has_side_reflect: r.opt_bool(),
        is_poisoned: r.opt_bool(),
        is_burned: r.opt_bool(),
        is_paralyzed: r.opt_bool(),
        has_substitute: r.opt_bool(),
        any_move_disabled: r.opt_bool(),
        has_any_status: r.opt_bool(),
        target_party_status_equals_any: r.opt_bool(),
        hold_effect: r.opt_u16(),
        species_abilities: r.opt_u16x2(),
        known_ability: r.opt_u16(),
        used_held_item_id: r.opt_u16(),
        stockpile_count: r.opt_u8(),
    }
}

/// Total width of the `CheckBadMovePreambleInput` buffer
/// `fw_run_check_bad_move_preamble` reads -- see that export's doc comment
/// for the full field-by-field offset table this constant is summed from.
const CBM_PREAMBLE_INPUT_WIDTH: usize = 132;

fn encode_cbm_result(result: CheckBadMoveResult) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();
    buf.extend_from_slice(&0u32.to_le_bytes());
    match result {
        CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta } => {
            buf.push(0); // status: scored
            buf.extend_from_slice(&rng.value.to_le_bytes());
            buf.extend_from_slice(&rng.calls.to_le_bytes());
            buf.push(draw_count);
            for draw in draws.iter() {
                buf.extend_from_slice(&draw.ordinal.to_le_bytes());
                buf.push(draw.site as u8);
                buf.extend_from_slice(&draw.before.value.to_le_bytes());
                buf.extend_from_slice(&draw.before.calls.to_le_bytes());
                buf.extend_from_slice(&draw.after.value.to_le_bytes());
                buf.extend_from_slice(&draw.after.calls.to_le_bytes());
                buf.extend_from_slice(&draw.raw_rng_value.to_le_bytes());
                buf.extend_from_slice(&draw.random_value.to_le_bytes());
                buf.extend_from_slice(&draw.guessed_ability.to_le_bytes());
            }
            buf.extend_from_slice(&score_delta.to_le_bytes());
        }
        CheckBadMoveResult::NotYetPorted { effect, move_id } => {
            buf.push(1); // status: not-yet-ported
            buf.extend_from_slice(&effect.to_le_bytes());
            buf.extend_from_slice(&move_id.to_le_bytes());
        }
    }
    patch_total_len(&mut buf);
    buf
}

fn encode_cbm_error(message: &str) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();
    buf.extend_from_slice(&0u32.to_le_bytes());
    buf.push(2); // status: error
    let message_bytes = message.as_bytes();
    buf.extend_from_slice(&(message_bytes.len() as u16).to_le_bytes());
    buf.extend_from_slice(message_bytes);
    patch_total_len(&mut buf);
    buf
}

// --- fw_run_check_viability -------------------------------------------------

const CV_DRAW_STRIKES_FIRST: u8 = 1;
const CV_DRAW_JUMPED: u8 = 2;
const CV_DRAW_JUMPED_TO_END: u8 = 3;
const CV_DRAW_SUCCEEDED: u8 = 4;
const CV_DRAW_GUESSED_ABILITY: u8 = 5;

/// Converts `CvDrawKind`'s intentionally TS-mirrored Rust identifier into
/// its dashed literal. Every enum variant is a draw site and therefore takes
/// `-roll`; a trailing ordinal belongs after that word (`SpAtkDown2` becomes
/// `sp-atk-down-roll-2`). Keeping this derivation here avoids maintaining a
/// second 101-row hand transcription at the ABI seam.
fn cv_draw_kind_name(kind: CvDrawKind) -> String {
    let raw = format!("{kind:?}");
    let chars: Vec<char> = raw.chars().collect();
    let mut dashed = String::with_capacity(raw.len() + 8);
    for (i, ch) in chars.iter().copied().enumerate() {
        let previous = i.checked_sub(1).and_then(|index| chars.get(index)).copied();
        let next = chars.get(i + 1).copied();
        if ch.is_ascii_uppercase()
            && i != 0
            && (previous.is_some_and(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
                || (previous.is_some_and(|c| c.is_ascii_uppercase())
                    && next.is_some_and(|c| c.is_ascii_lowercase())))
        {
            dashed.push('-');
        }
        dashed.push(ch.to_ascii_lowercase());
    }
    let trailing_digits = dashed.bytes().rev().take_while(u8::is_ascii_digit).count();
    if trailing_digits == 0 {
        format!("{dashed}-roll")
    } else {
        let split = dashed.len() - trailing_digits;
        format!("{}-roll-{}", &dashed[..split], &dashed[split..])
    }
}

/// `nextDraw`'s reason text is mostly its public `kind`; only handlers whose
/// original TS port labels a script-local site (`draw1`, `roll`, etc.) differ.
/// This is receipt formatting only: all scoring/RNG logic remains in
/// `factory_core::factory_ai_check_viability`.
fn cv_reason_suffix(kind: &str) -> &str {
    match kind {
        "high-crit-fallthrough-roll" => "fallthrough-roll",
        "vital-throw-midband-roll" => "midband-roll",
        "high-crit-roll" | "always-hit-roll" | "vital-throw-roll" | "speed-down-roll"
        | "speed-up-roll" | "defense-down-roll" | "sp-def-down-roll" | "evasion-down-roll"
        | "light-screen-roll" | "reflect-roll" => "roll",
        _ => {
            let site_groups = [
                "attack-down-roll-",
                "attack-up-roll-",
                "sp-atk-up-roll-",
                "defense-up-roll-",
                "sp-def-up-roll-",
                "accuracy-down-roll-",
                "evasion-up-roll-",
                "sp-atk-down-roll-",
            ];
            for group in site_groups {
                if let Some(site) = kind.strip_prefix(group) {
                    return match site {
                        "1" => "draw1",
                        "2" => "draw2",
                        "3" => "draw3",
                        "4" => "draw4",
                        "5" => "draw5",
                        "6" => "draw6",
                        "7" => "draw7",
                        "8" => "draw8",
                        _ => kind,
                    };
                }
            }
            kind
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn append_cv_draw(
    buf: &mut Vec<u8>,
    reason_prefix: &str,
    kind: &str,
    ordinal: u32,
    before: BattleRngState,
    after: BattleRngState,
    raw_rng_value: u32,
    random_value: u16,
    extra_tag: u8,
    extra_value: u16,
) {
    let reason = format!("{reason_prefix}-{}", cv_reason_suffix(kind));
    buf.extend_from_slice(&ordinal.to_le_bytes());
    buf.extend_from_slice(&before.value.to_le_bytes());
    buf.extend_from_slice(&before.calls.to_le_bytes());
    buf.extend_from_slice(&after.value.to_le_bytes());
    buf.extend_from_slice(&after.calls.to_le_bytes());
    buf.extend_from_slice(&raw_rng_value.to_le_bytes());
    buf.extend_from_slice(&random_value.to_le_bytes());
    buf.extend_from_slice(&(kind.len() as u32).to_le_bytes());
    buf.extend_from_slice(kind.as_bytes());
    buf.extend_from_slice(&(reason.len() as u32).to_le_bytes());
    buf.extend_from_slice(reason.as_bytes());
    buf.push(extra_tag);
    buf.extend_from_slice(&extra_value.to_le_bytes());
}

fn cv_draw_base(draw: &CheckViabilityDraw) -> (u32, BattleRngState, BattleRngState, u32, u16) {
    match draw {
        CheckViabilityDraw::TargetFasterTie {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::ConfuseRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SwaggerRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::UserFasterTie {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SpeedDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::PursuitSleepRoarParalyzeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::RestRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::AbsorbRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::EndureRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::CounterRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::HighCritFallthroughRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::HighCritRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::AlwaysHitRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::VitalThrowMidbandRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::VitalThrowRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::AttackDownRoll1 {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::AttackDownRoll2 {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::DefenseDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SpDefDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::EvasionDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::AttackUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SpeedUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SpAtkUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::DefenseUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SpDefUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::ScreenRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::ToxicRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::ProtectRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::AccuracyDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::EvasionUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::HealRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::TrapRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SemiInvulnerableRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::FlailRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::DestinyBondRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SelfKoRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::CurseRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::PsychUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::MirrorCoatRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::DragonDanceRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::BatonPassRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::FocusPunchKnockOffRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::RevengeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::MagicCoatRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::ForesightRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::EncoreRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::ChangeSelfAbilityRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::TrickRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SubstituteRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::AccuracyUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::DisableRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::FlatterRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::LockOnImprisonRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::ConversionRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::ThiefRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::HazeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::RecycleRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SpitUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::MirrorMoveRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SpAtkDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::SnatchRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        }
        | CheckViabilityDraw::GetAbility {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            ..
        } => (*ordinal, *before, *after, *raw_rng_value, *random_value),
    }
}

#[allow(unused_variables)] // the common receipt fields are read once by cv_draw_base above.
fn append_encoded_cv_draw(buf: &mut Vec<u8>, reason_prefix: &str, draw: CheckViabilityDraw) {
    let (base_ordinal, base_before, base_after, base_raw_rng_value, base_random_value) =
        cv_draw_base(&draw);
    macro_rules! emit {
        ($kind:expr, $tag:expr, $value:expr) => {
            append_cv_draw(
                buf,
                reason_prefix,
                $kind,
                base_ordinal,
                base_before,
                base_after,
                base_raw_rng_value,
                base_random_value,
                $tag,
                $value,
            )
        };
    }

    match draw {
        CheckViabilityDraw::TargetFasterTie {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            strikes_first,
        } => emit!(
            "target-faster-tie",
            CV_DRAW_STRIKES_FIRST,
            strikes_first as u16
        ),
        CheckViabilityDraw::ConfuseRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("confuse-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::SwaggerRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("swagger-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::UserFasterTie {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            strikes_first,
        } => emit!(
            "user-faster-tie",
            CV_DRAW_STRIKES_FIRST,
            strikes_first as u16
        ),
        CheckViabilityDraw::SpeedDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("speed-down-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::PursuitSleepRoarParalyzeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::RestRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::AbsorbRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("absorb-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::EndureRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("endure-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::CounterRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::HighCritFallthroughRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped_to_end,
        } => emit!(
            "high-crit-fallthrough-roll",
            CV_DRAW_JUMPED_TO_END,
            u16::from(jumped_to_end)
        ),
        CheckViabilityDraw::HighCritRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("high-crit-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::AlwaysHitRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("always-hit-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::VitalThrowMidbandRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped_to_end,
        } => emit!(
            "vital-throw-midband-roll",
            CV_DRAW_JUMPED_TO_END,
            u16::from(jumped_to_end)
        ),
        CheckViabilityDraw::VitalThrowRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("vital-throw-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::AttackDownRoll1 {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!(
            "attack-down-roll-1",
            CV_DRAW_SUCCEEDED,
            u16::from(succeeded)
        ),
        CheckViabilityDraw::AttackDownRoll2 {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!(
            "attack-down-roll-2",
            CV_DRAW_SUCCEEDED,
            u16::from(succeeded)
        ),
        CheckViabilityDraw::DefenseDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("defense-down-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::SpDefDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("sp-def-down-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::EvasionDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("evasion-down-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::AttackUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::SpeedUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("speed-up-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::SpAtkUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::DefenseUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::SpDefUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::ScreenRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::ToxicRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::ProtectRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::AccuracyDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
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
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::HealRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::TrapRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("trap-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::SemiInvulnerableRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("semi-invulnerable-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::FlailRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("flail-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::DestinyBondRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::SelfKoRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::CurseRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::PsychUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("psych-up-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::MirrorCoatRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::DragonDanceRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::BatonPassRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            succeeded,
        } => emit!("baton-pass-roll", CV_DRAW_SUCCEEDED, u16::from(succeeded)),
        CheckViabilityDraw::FocusPunchKnockOffRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::RevengeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("revenge-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::MagicCoatRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::ForesightRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::EncoreRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("encore-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::ChangeSelfAbilityRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!(
            "change-self-ability-roll",
            CV_DRAW_JUMPED,
            u16::from(jumped)
        ),
        CheckViabilityDraw::TrickRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("trick-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::SubstituteRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::AccuracyUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("accuracy-up-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::DisableRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("disable-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::FlatterRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("flatter-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::LockOnImprisonRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::ConversionRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("conversion-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::ThiefRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("thief-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::HazeRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::RecycleRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("recycle-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::SpitUpRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            jumped,
        } => emit!("spit-up-roll", CV_DRAW_JUMPED, u16::from(jumped)),
        CheckViabilityDraw::MirrorMoveRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::SpAtkDownRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            succeeded,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_SUCCEEDED, u16::from(succeeded));
        }
        CheckViabilityDraw::SnatchRoll {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            kind,
            jumped,
        } => {
            let kind = cv_draw_kind_name(kind);
            emit!(&kind, CV_DRAW_JUMPED, u16::from(jumped));
        }
        CheckViabilityDraw::GetAbility {
            ordinal,
            before,
            after,
            raw_rng_value,
            random_value,
            guessed_ability,
        } => emit!("get-ability", CV_DRAW_GUESSED_ABILITY, guessed_ability),
    }
}

fn encode_cv_result(result: CheckViabilityResult, reason_prefix: &str) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();
    buf.extend_from_slice(&0u32.to_le_bytes());
    match result {
        CheckViabilityResult::Scored { rng, draws, draw_count, score_delta, func_result_after } => {
            buf.push(0); // status: scored
            buf.extend_from_slice(&rng.value.to_le_bytes());
            buf.extend_from_slice(&rng.calls.to_le_bytes());
            buf.extend_from_slice(&score_delta.to_le_bytes());
            buf.push(u8::from(func_result_after.is_some()));
            buf.push(func_result_after.unwrap_or(0));
            buf.push(draw_count);
            for draw in draws.iter().take(draw_count as usize) {
                append_encoded_cv_draw(&mut buf, reason_prefix, *draw);
            }
        }
        CheckViabilityResult::NotYetPorted { effect, move_id } => {
            buf.push(1); // status: unsupported-branch / not-yet-ported
            buf.extend_from_slice(&effect.to_le_bytes());
            buf.extend_from_slice(&move_id.to_le_bytes());
        }
    }
    patch_total_len(&mut buf);
    buf
}

fn encode_cv_error(message: &str) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();
    buf.extend_from_slice(&0u32.to_le_bytes());
    buf.push(2); // status: error
    buf.extend_from_slice(&(message.len() as u32).to_le_bytes());
    buf.extend_from_slice(message.as_bytes());
    patch_total_len(&mut buf);
    buf
}

/// `AI_CheckBadMove` for one move slot against one target, via
/// `factory_ai_check_bad_move::run_check_bad_move_preamble`. Reads a fixed
/// `CBM_PREAMBLE_INPUT_WIDTH`-byte buffer at `input_ptr` and returns an
/// `fw_alloc`'d buffer; the caller must `fw_free(ptr, total_len)`.
///
/// The unknown-move-id panic site (`factory_ai_check_bad_move.rs`'s
/// `run_check_bad_move_preamble`, mirroring TS's own `throw` at
/// `factoryAiCheckBadMove.ts:1269`) is checked here, BEFORE calling into
/// factory-core, and crosses as status 2 -- not a WASM trap. The
/// unknown-species panic inside `next_get_ability_draw` is NOT re-checked
/// here: `factory_ai_check_bad_move.rs`'s own doc comment establishes it is
/// unreachable by construction against `gen_tables::SPECIES` (the Factory
/// rental corpus this boundary's callers exclusively draw `target.species`
/// from), the same "impossible against generated gen_tables" class
/// `mon_construction.rs`/`factory_ai_mask.rs` already document -- not a
/// second TS-observable error site.
///
/// # Buffer layout -- input (all integers little-endian, no length prefix:
/// the width is the compile-time constant `CBM_PREAMBLE_INPUT_WIDTH`, same
/// convention as `fw_calculate_base_damage`'s `DamageCalcInput`). Every
/// `opt_*`-decoded field below is one presence byte (`0`/`1`) followed by
/// its value slot, ignored when the presence byte is `0` (point 2 of the
/// M5c brief: presence-preserving, so the Rust side's own default paths are
/// what parity exercises, not TS-side pre-resolved defaults).
///
/// ```text
/// offset  width  field
/// 0       4      rng.value (u32)
/// 4       4      rng.calls (u32)
/// 8       2      move_id (u16)
/// 10      4      draw_ordinal_start (u32)
/// -- target: FactoryAiCheckBadMoveTarget, 14..67 --
/// 14      2      target.species (u16)
/// 16      1      target.types[0] (u8, damage_calc::TYPE_*)
/// 17      1      target.types[1] (u8)
/// 18      3      target.known_ability (opt_u16 -- presence byte + u16;
///                required-but-nullable in TS, modeled the same as every
///                other optional field here)
/// 21      2      target.real_ability (u16)
/// 23      1      target.speed_stage (u8)
/// 24      1      target.atk_stage (u8)
/// 25      1      target.def_stage (u8)
/// 26      1      target.sp_def_stage (u8)
/// 27      2      target.acc_stage (opt_u8)
/// 29      2      target.evasion_stage (opt_u8)
/// 31      2      target.has_any_status (opt_bool)
/// 33      2      target.safeguard_up (opt_bool)
/// 35      2      target.is_confused (opt_bool)
/// 37      2      target.is_leech_seeded (opt_bool)
/// 39      2      target.is_asleep (opt_bool)
/// 41      2      target.is_escape_prevented (opt_bool)
/// 43      2      target.is_tormented (opt_bool)
/// 45      2      target.has_perish_song (opt_bool)
/// 47      2      target.is_nightmared (opt_bool)
/// 49      2      target.is_foresighted (opt_bool)
/// 51      2      target.spikes_up (opt_bool)
/// 53      2      target.target_future_attack_up (opt_bool)
/// 55      2      target.level (opt_u8)
/// 57      2      target.sp_atk_stage (opt_u8)
/// 59      2      target.is_infatuated (opt_bool)
/// 61      2      target.any_move_disabled (opt_bool)
/// 63      2      target.any_move_encored (opt_bool)
/// 65      2      target.gender (opt_u8 -- 0=Male, 1=Female, 2=Genderless)
/// -- roar target extra field, 67..69 --
/// 67      2      target.usable_party_mons (opt_u8 -- Roar/Explosion's own
///                target-side bench count; part of
///                FactoryAiCheckBadMoveRoarTarget, not the base Target)
/// -- attacker: FactoryAiCheckBadMoveAttacker, 69..132 --
/// 69      1      attacker.atk_stage (u8)
/// 70      1      attacker.def_stage (u8)
/// 71      2      attacker.speed_stage (opt_u8)
/// 73      2      attacker.sp_atk_stage (opt_u8)
/// 75      2      attacker.sp_def_stage (opt_u8)
/// 77      2      attacker.light_screen_up (opt_bool)
/// 79      2      attacker.reflect_up (opt_bool)
/// 81      2      attacker.evasion_stage (opt_u8)
/// 83      2      attacker.attacker_future_attack_up (opt_bool)
/// 85      2      attacker.has_focus_energy (opt_bool)
/// 87      2      attacker.has_curable_status (opt_bool)
/// 89      2      attacker.current_weather (opt_u8, AI_WEATHER_*)
/// 91      2      attacker.level (opt_u8)
/// 93      2      attacker.is_first_turn (opt_u8)
/// 95      2      attacker.safeguard_up (opt_bool)
/// 97      2      attacker.is_asleep (opt_bool)
/// 99      2      attacker.usable_party_mons (opt_u8)
/// 101     2      attacker.has_substitute (opt_bool)
/// 103     5      attacker.hp (opt_i32 -- presence byte + i32)
/// 108     5      attacker.max_hp (opt_i32)
/// 113     2      attacker.is_rooted (opt_bool)
/// 115     2      attacker.acc_stage (opt_u8)
/// 117     2      attacker.mist_up (opt_bool)
/// 119     2      attacker.gender (opt_u8 -- 0=Male, 1=Female, 2=Genderless)
/// 121     2      attacker.imprisoned_others (opt_bool)
/// 123     2      attacker.mud_sport_up (opt_bool)
/// 125     2      attacker.water_sport_up (opt_bool)
/// 127     3      attacker.used_held_item_id (opt_u16)
/// 130     2      attacker.stockpile_count (opt_u8)
///                width == 132 (CBM_PREAMBLE_INPUT_WIDTH)
/// ```
///
/// # Buffer layout -- output (all integers little-endian)
///
/// ```text
/// offset  width  field
/// 0       4      total_len (u32)
/// 4       1      status (u8) -- 0 = scored, 1 = not-yet-ported, 2 = error.
///
/// --- status == 0 (scored) ---
/// 5       4      rng.value (u32)
/// 9       4      rng.calls (u32)
/// 13      1      draw_count (u8, 0..=3 -- MAX_CHECK_BAD_MOVE_DRAWS)
/// 14      87     draws: 3 fixed-width 29-byte records, back to back (only
///                the first draw_count are meaningful; the rest are
///                zero-filled and MUST be ignored by the decoder):
///                  0   4   ordinal (u32)
///                  4   1   site (u8 -- CheckBadMoveDrawSite's discriminant,
///                          `factory_ai_check_bad_move.rs`)
///                  5   4   before.value (u32)
///                  9   4   before.calls (u32)
///                  13  4   after.value (u32)
///                  17  4   after.calls (u32)
///                  21  4   raw_rng_value (u32)
///                  25  2   random_value (u16)
///                  27  2   guessed_ability (u16)
/// 101     4      score_delta (i32)
///                total_len == 105
///
/// --- status == 1 (not-yet-ported) ---
/// 5       2      effect (u16)
/// 7       2      move_id (u16)
///                total_len == 9
///
/// --- status == 2 (error) ---
/// 5       2      message_len (u16)
/// 7       message_len   message (utf8 bytes)
///                total_len == 7 + message_len
/// ```
///
/// # Safety
/// `input_ptr` must point to at least `CBM_PREAMBLE_INPUT_WIDTH` (132)
/// readable, initialized bytes encoding a `CheckBadMovePreambleInput` per
/// the documented layout. Same ownership contract as
/// `fw_calculate_base_damage`.
#[no_mangle]
pub unsafe extern "C" fn fw_run_check_bad_move_preamble(input_ptr: *const u8) -> *mut u8 {
    // SAFETY: caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, CBM_PREAMBLE_INPUT_WIDTH) };
    let mut r = ByteReader::new(bytes);
    let rng = BattleRngState { value: r.u32(), calls: r.u32() };
    let move_id = r.u16();
    let draw_ordinal_start = r.u32();
    let target = decode_cbm_target(&mut r);
    let roar_usable_party_mons = r.opt_u8();
    let attacker = decode_cbm_attacker(&mut r);
    debug_assert_eq!(r.offset, CBM_PREAMBLE_INPUT_WIDTH);

    if gen_tables::MOVES.get(move_id as usize).is_none() {
        // Message text matches factoryAiCheckBadMove.ts:1269's throw exactly
        // (`factory-ai-check-bad-move: unknown move ${input.moveId}`) --
        // error-message parity, the factoryPartyMemberParity.test.ts
        // precedent (PartyMemberError's Display is written to match TS text
        // exactly for the same reason).
        return alloc_and_copy(&encode_cbm_error(&format!(
            "factory-ai-check-bad-move: unknown move {move_id}"
        )));
    }

    let input = CheckBadMovePreambleInput {
        rng,
        move_id,
        target: FactoryAiCheckBadMoveRoarTarget {
            target,
            usable_party_mons: roar_usable_party_mons,
        },
        attacker,
        draw_ordinal_start,
    };
    let result = factory_ai_check_bad_move::run_check_bad_move_preamble(input);
    alloc_and_copy(&encode_cbm_result(result))
}

/// `AI_CheckViability` for one move slot, via
/// `factory_ai_check_viability::run_check_viability`. Reads a
/// caller-allocated self-describing buffer and returns an `fw_alloc`'d,
/// length-prefixed result buffer; free the returned pointer with its leading
/// `total_len`.
///
/// `reasonPrefix` is encoded even though factory-core correctly drops it from
/// scoring input: it is part of the public TS call shape and the boundary uses
/// it only to restore every draw receipt's exact TS `reason` string. No AI
/// branch, random draw, or default is duplicated here.
///
/// # Input layout (all integers little-endian)
///
/// ```text
/// offset  width  field
/// 0       4      rng.value (u32)
/// 4       4      rng.calls (u32)
/// 8       2      move_id (u16)
/// 10      2      stale_func_result_fallback (opt_u8: presence + value)
/// 12      4      draw_ordinal_start (u32)
/// 16      108    attacker: FactoryAiCheckViabilityBattler
/// 124     108    target: FactoryAiCheckViabilityBattler
/// 232     4      reason_prefix UTF-8 byte length (u32)
/// 236     N      reason_prefix UTF-8 bytes; input_len == 236 + N
/// ```
///
/// Each battler is exactly 108 bytes, in
/// `FactoryAiCheckViabilityBattler` declaration order. `opt_T` is a u8
/// presence flag followed by a T-valued slot ignored when absent, preserving
/// omitted vs present false/zero input. Relative offsets: `speed` 0/u32,
/// `speed_stage` 4/u8, `types` 5/[u8;2], `is_first_turn` 7/u8,
/// `evasion_stage`/`acc_stage`/`atk_stage`/`def_stage`/`sp_def_stage` 8..12,
/// `hp` 13/i32, `max_hp` 17/i32, `sp_atk_stage` 21/opt_u8,
/// `last_used_move_id` 23/opt_u16, `is_toxic_poisoned` 26/opt_bool,
/// `is_leech_seeded` 28/opt_bool, `is_rooted` 30/opt_bool,
/// `is_cursed` 32/opt_bool, `ability` 34/opt_u16,
/// `current_weather` 37/opt_u8, `moves` 39/opt_[u16;4],
/// `battle_turn_count` 48/opt_u32, `known_moves` 53/opt_[u16;4], then
/// `is_infatuated`, `is_asleep`, `is_confused`, `is_taunted`, `has_yawn`,
/// `has_perish_song`, `protect_uses`, `has_side_reflect`, `is_poisoned`,
/// `is_burned`, `is_paralyzed`, `has_substitute`, `any_move_disabled`,
/// `has_any_status`, and `target_party_status_equals_any` at relative
/// offsets 62,64,66,68,70,72,74,76,78,80,82,84,86,88,90 respectively (all
/// opt_bool except `protect_uses`: opt_u8). Finally `hold_effect` 92/opt_u16,
/// `species_abilities` 95/opt_[u16;2], `known_ability` 100/opt_u16,
/// `used_held_item_id` 103/opt_u16, and `stockpile_count` 106/opt_u8.
///
/// # Output layout (all integers little-endian)
///
/// ```text
/// offset  width  field
/// 0       4      total_len (u32)
/// 4       1      status: 0=scored, 1=not-yet-ported, 2=error
///
/// --- scored ---
/// 5       4      rng.value (u32)
/// 9       4      rng.calls (u32)
/// 13      4      score_delta (i32)
/// 17      1      has_func_result_after (u8 0/1)
/// 18      1      func_result_after (u8; ignored when absent)
/// 19      1      draw_count (u8, 0..=8)
/// 20      var    draw_count records, each:
///                  ordinal u32; before.value/calls u32/u32;
///                  after.value/calls u32/u32; raw_rng_value u32;
///                  random_value u16; kind_len u32 + UTF-8 kind;
///                  reason_len u32 + UTF-8 reason; extra_tag u8 +
///                  extra_value u16. extra_tag is 1=strikesFirst,
///                  2=jumped, 3=jumpedToEnd, 4=succeeded, or
///                  5=guessedAbility; tags 1..4 use 0/1 (or 0..2 for
///                  strikesFirst) in extra_value.
///
/// --- not-yet-ported ---
/// 5       2      effect (u16)
/// 7       2      move_id (u16)
///
/// --- error ---
/// 5       4      message_len (u32)
/// 9       N      UTF-8 message
/// ```
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes following
/// the layout above. Passing a smaller or structurally malformed length yields
/// a normal error buffer before factory-core is called.
#[no_mangle]
pub unsafe extern "C" fn fw_run_check_viability(input_ptr: *const u8, input_len: u32) -> *mut u8 {
    const CV_INPUT_FIXED_WIDTH: usize = 236;
    let input_len = input_len as usize;
    if input_len < CV_INPUT_FIXED_WIDTH {
        return alloc_and_copy(&encode_cv_error(
            "factory-wasm factoryAiEngine: CheckViability input shorter than 236 bytes",
        ));
    }
    // SAFETY: caller contract above, and the preceding length check establishes
    // the fixed cursor prefix exists before any field decoder reads it.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len) };
    let mut r = ByteReader::new(bytes);
    let rng = BattleRngState { value: r.u32(), calls: r.u32() };
    let move_id = r.u16();
    let stale_func_result_fallback = r.opt_u8();
    let draw_ordinal_start = r.u32();
    let attacker = decode_cv_battler(&mut r);
    let target = decode_cv_battler(&mut r);
    let reason_len = r.u32() as usize;
    if r.offset.checked_add(reason_len) != Some(input_len) {
        return alloc_and_copy(&encode_cv_error(
            "factory-wasm factoryAiEngine: malformed CheckViability reasonPrefix length",
        ));
    }
    let reason_prefix = match std::str::from_utf8(r.bytes(reason_len)) {
        Ok(value) => value,
        Err(_) => {
            return alloc_and_copy(&encode_cv_error(
                "factory-wasm factoryAiEngine: CheckViability reasonPrefix is not UTF-8",
            ));
        }
    };
    debug_assert_eq!(r.offset, input_len);

    let Some(move_data) = gen_tables::MOVES.get(move_id as usize) else {
        return alloc_and_copy(&encode_cv_error(&format!(
            "factory-ai-check-viability: unknown move {move_id}"
        )));
    };
    // `AI_CV_Toxic` (shared by Toxic and Leech Seed) is the only native CV
    // leaf which deliberately models TS's missing optional input as a throw.
    // Native factory-core uses `expect` so its unit tests can pin that source
    // error directly; a WASM boundary must never turn caller input into an
    // abort, so preserve the TS Error surface before entering the reused core
    // scorer. This is validation only, not a duplicate scoring branch.
    if (move_data.effect == EFFECT_TOXIC || move_data.effect == EFFECT_LEECH_SEED)
        && attacker.moves.is_none()
    {
        return alloc_and_copy(&encode_cv_error(
            "factory-ai-check-viability: AI_CV_Toxic requires AI_USER moves",
        ));
    }

    let result = factory_ai_check_viability::run_check_viability(RunCheckViabilityInput {
        rng,
        move_id,
        attacker,
        target,
        stale_func_result_fallback,
        draw_ordinal_start,
    });
    alloc_and_copy(&encode_cv_result(result, reason_prefix))
}

// === complete Factory DecisionPolicy boundary (M5f-3) ======================

const FACTORY_AI_MASK_ZERO_INPUT_FIXED_WIDTH: usize = 40;
const FACTORY_AI_SCORED_INPUT_FIXED_WIDTH: usize = 332;

fn decode_policy_factory(r: &mut ByteReader) -> FactoryAiMaskSelectionInput {
    let level_mode = r.u32();
    let battle_mode = r.u32();
    FactoryAiMaskSelectionInput {
        // Preserve the canonical error branch instead of wrapping a wide ABI
        // scalar through u8 before factory-core validates it.
        level_mode: if level_mode > 2 { 3 } else { level_mode as u8 },
        battle_mode: if battle_mode > 1 {
            2
        } else {
            battle_mode as u8
        },
        factory_win_streak: r.u32(),
        trainer_opponent_id: r.u32(),
    }
}

fn policy_move_slot(value: u8) -> Result<FactoryAiMoveSlot, String> {
    FactoryAiMoveSlot::from_index(value as usize)
        .ok_or_else(|| format!("factory-wasm factoryAiEngine: invalid move slot {value}"))
}

fn decode_policy_request(
    r: &mut ByteReader,
) -> Result<
    (
        FactoryAiRequestKind,
        u32,
        FactoryAiDecisionSide,
        u8,
        Vec<FactoryAiLegalDecision>,
    ),
    String,
> {
    let kind = match r.u8() {
        0 => FactoryAiRequestKind::Command,
        1 => FactoryAiRequestKind::ForcedSwitch,
        value => {
            return Err(format!(
                "factory-wasm factoryAiEngine: invalid request kind {value}"
            ))
        }
    };
    let request_id = r.u32();
    let side = match r.u8() {
        0 => FactoryAiDecisionSide::Player,
        1 => FactoryAiDecisionSide::Trainer,
        value => {
            return Err(format!(
                "factory-wasm factoryAiEngine: invalid request side {value}"
            ))
        }
    };
    let battler = r.u8();
    let legal_count = r.u8() as usize;
    let mut legal_decisions = Vec::with_capacity(legal_count);
    for _ in 0..legal_count {
        let tag = r.u8();
        let first = r.u8();
        let second = r.u8();
        legal_decisions.push(match tag {
            0 => FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
                move_slot: policy_move_slot(first)?,
                target_battler: second,
            }),
            1 => FactoryAiLegalDecision::Switch { party_index: first },
            value => {
                return Err(format!(
                    "factory-wasm factoryAiEngine: invalid legal decision tag {value}"
                ));
            }
        });
    }
    Ok((kind, request_id, side, battler, legal_decisions))
}

fn decode_scored_battler(r: &mut ByteReader) -> FactoryAiScoredBattlerView {
    FactoryAiScoredBattlerView {
        types: [r.u8(), r.u8()],
        attack: r.i32(),
        defense: r.i32(),
        sp_attack: r.i32(),
        sp_defense: r.i32(),
        speed: r.u32(),
        level: r.u8(),
        stat_stages: StatStages { atk: r.u8(), def: r.u8(), sp_atk: r.u8(), sp_def: r.u8() },
        speed_stage: r.u8(),
        acc_stage: r.u8(),
        evasion_stage: r.u8(),
        is_first_turn: r.u8(),
        hp: r.i32(),
        max_hp: r.i32(),
        last_used_move_id: r.opt_u16(),
        is_toxic_poisoned: r.opt_bool(),
        has_any_status: r.opt_bool(),
        is_confused: r.opt_bool(),
        is_asleep: r.opt_bool(),
        is_taunted: r.opt_bool(),
        is_leech_seeded: r.opt_bool(),
        is_infatuated: r.opt_bool(),
        has_yawn: r.opt_bool(),
        has_perish_song: r.opt_bool(),
        is_nightmared: r.opt_bool(),
        is_foresighted: r.opt_bool(),
        spikes_up: r.opt_bool(),
        target_future_attack_up: r.opt_bool(),
        protect_uses: r.opt_u8(),
        battle_turn_count: r.opt_u32(),
        is_rooted: r.opt_bool(),
        attacker_future_attack_up: r.opt_bool(),
        has_focus_energy: r.opt_bool(),
        has_curable_status: r.opt_bool(),
        is_poisoned: r.opt_bool(),
        is_burned: r.opt_bool(),
        is_paralyzed: r.opt_bool(),
        is_cursed: r.opt_bool(),
        is_escape_prevented: r.opt_bool(),
        is_tormented: r.opt_bool(),
        light_screen_up: r.opt_bool(),
        reflect_up: r.opt_bool(),
        target_side_reflect_up: r.opt_bool(),
        target_party_status_equals_any: r.opt_bool(),
        safeguard_up: r.opt_bool(),
        ability: r.u16(),
        hold_effect: r.opt_u16(),
        current_weather: r.opt_u8(),
        usable_party_mons: r.opt_u8(),
        has_substitute: r.opt_bool(),
        any_move_disabled: r.opt_bool(),
        any_move_encored: r.opt_bool(),
        mist_up: r.opt_bool(),
        gender: r.opt_u8().map(gender_from_byte),
        imprisoned_others: r.opt_bool(),
        mud_sport_up: r.opt_bool(),
        water_sport_up: r.opt_bool(),
        used_held_item_id: r.opt_u16(),
        stockpile_count: r.opt_u8(),
    }
}

fn encode_policy_error(message: &str) -> Vec<u8> {
    let mut buf = vec![0, 0, 0, 0, 1];
    buf.extend_from_slice(&(message.len() as u32).to_le_bytes());
    buf.extend_from_slice(message.as_bytes());
    patch_total_len(&mut buf);
    buf
}

fn append_policy_selection(buf: &mut Vec<u8>, selection: factory_ai_mask::FactoryAiMaskSelection) {
    let receipt = selection.receipt;
    buf.push(u8::from(receipt.is_frontier_brain));
    buf.extend_from_slice(&receipt.frontier_stages_per_challenge.to_le_bytes());
    buf.push(u8::from(receipt.challenge_number.is_some()));
    buf.extend_from_slice(&receipt.challenge_number.unwrap_or(0).to_le_bytes());
    buf.push(receipt.evaluation_count);
    for index in 0..5 {
        if index < receipt.evaluation_count as usize {
            buf.push(receipt.evaluations[index].branch as u8);
            buf.push(u8::from(receipt.evaluations[index].matched));
        } else {
            buf.extend_from_slice(&[0, 0]);
        }
    }
    buf.push(receipt.branch as u8);
}

#[allow(clippy::too_many_arguments)]
fn append_policy_draw_base(
    buf: &mut Vec<u8>,
    tag: u8,
    move_slot: u8,
    ordinal: u32,
    before: BattleRngState,
    after: BattleRngState,
    raw_rng_value: u32,
    random_value: u16,
) {
    buf.push(tag);
    buf.push(move_slot);
    buf.extend_from_slice(&ordinal.to_le_bytes());
    buf.extend_from_slice(&before.value.to_le_bytes());
    buf.extend_from_slice(&before.calls.to_le_bytes());
    buf.extend_from_slice(&after.value.to_le_bytes());
    buf.extend_from_slice(&after.calls.to_le_bytes());
    buf.extend_from_slice(&raw_rng_value.to_le_bytes());
    buf.extend_from_slice(&random_value.to_le_bytes());
}

fn append_policy_footer(
    buf: &mut Vec<u8>,
    slot_scores: impl IntoIterator<
        Item = (
            u8,
            u16,
            bool,
            i32,
            Option<i32>,
            Option<i32>,
            Option<i32>,
            i32,
        ),
    >,
    best_slots: &[FactoryAiMoveSlot],
    tie_modulus: u8,
    tie_index: u8,
    chosen: FactoryAiMoveDecision,
) {
    for (slot, move_id, legal, initial, cbm, ttf, cv, final_score) in slot_scores {
        buf.push(slot);
        buf.extend_from_slice(&move_id.to_le_bytes());
        buf.push(u8::from(legal));
        buf.extend_from_slice(&initial.to_le_bytes());
        for value in [cbm, ttf, cv] {
            buf.push(u8::from(value.is_some()));
            buf.extend_from_slice(&value.unwrap_or(0).to_le_bytes());
        }
        buf.extend_from_slice(&final_score.to_le_bytes());
    }
    buf.push(best_slots.len() as u8);
    for index in 0..4 {
        buf.push(
            best_slots
                .get(index)
                .copied()
                .unwrap_or(FactoryAiMoveSlot::Slot0) as u8,
        );
    }
    buf.push(tie_modulus);
    buf.push(tie_index);
    buf.push(chosen.move_slot as u8);
    buf.push(chosen.target_battler);
}

fn encode_mask_zero_choice(
    result: Result<
        factory_ai_decision_policy::FactoryAiMaskZeroDecisionChoice,
        factory_ai_decision_policy::FactoryAiDecisionPolicyError,
    >,
) -> Vec<u8> {
    let choice = match result {
        Ok(choice) => choice,
        Err(error) => return encode_policy_error(&error.to_string()),
    };
    let mut buf = vec![0, 0, 0, 0, 0];
    buf.extend_from_slice(&choice.submission.request_id.to_le_bytes());
    buf.push(choice.submission.side as u8);
    buf.push(choice.submission.decision.move_slot as u8);
    buf.push(choice.submission.decision.target_battler);
    buf.extend_from_slice(&choice.rng.value.to_le_bytes());
    buf.extend_from_slice(&choice.rng.calls.to_le_bytes());
    buf.push(choice.trace.mask);
    append_policy_selection(&mut buf, choice.trace.mask_selection);
    buf.extend_from_slice(&[0, 0, 0, 0]); // script count + fixed script slots
    buf.extend_from_slice(&[2, 0, 0, 0]); // legacy-post-boundary + absent value
    buf.push(choice.trace.draws.len() as u8);
    for draw in choice.trace.draws {
        match draw {
            factory_ai_decision_policy::FactoryAiRngDraw::SetupSimulatedRng(draw) => {
                append_policy_draw_base(
                    &mut buf,
                    1,
                    draw.move_slot as u8,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
                buf.push(draw.simulated_rng);
            }
            factory_ai_decision_policy::FactoryAiRngDraw::BestMoveTie(draw) => {
                append_policy_draw_base(
                    &mut buf,
                    5,
                    u8::MAX,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
            }
        }
    }
    let best_count = choice.trace.best_move_slot_count as usize;
    append_policy_footer(
        &mut buf,
        choice.trace.slot_scores.map(|score| {
            (
                score.move_slot as u8,
                score.move_id,
                score.legal,
                score.initial_score,
                None,
                None,
                None,
                score.final_score,
            )
        }),
        &choice.trace.best_move_slots[..best_count],
        choice.trace.tie_modulus,
        choice.trace.tie_index,
        choice.trace.chosen_decision,
    );
    patch_total_len(&mut buf);
    buf
}

fn encode_scored_choice(
    result: Result<FactoryAiScoredChoice, factory_ai_decision_policy::FactoryAiScoredDecisionError>,
) -> Vec<u8> {
    let choice = match result {
        Ok(choice) => choice,
        Err(error) => return encode_policy_error(&error.to_string()),
    };
    let mut buf = vec![0, 0, 0, 0, 0];
    buf.extend_from_slice(&choice.submission.request_id.to_le_bytes());
    buf.push(choice.submission.side as u8);
    buf.push(choice.submission.decision.move_slot as u8);
    buf.push(choice.submission.decision.target_battler);
    buf.extend_from_slice(&choice.rng.value.to_le_bytes());
    buf.extend_from_slice(&choice.rng.calls.to_le_bytes());
    buf.push(choice.trace.mask);
    append_policy_selection(&mut buf, choice.trace.mask_selection);
    buf.push(choice.trace.executed_scoring_script_count);
    for script in choice.trace.executed_scoring_scripts {
        buf.push(script.map_or(0, |value| value as u8));
    }
    buf.push(choice.trace.turn_start_random_number.owner as u8);
    buf.push(u8::from(
        choice.trace.turn_start_random_number.value.is_some(),
    ));
    buf.extend_from_slice(
        &choice
            .trace
            .turn_start_random_number
            .value
            .unwrap_or(0)
            .to_le_bytes(),
    );
    buf.push(choice.trace.draw_count);
    for draw in choice
        .trace
        .draws
        .into_iter()
        .take(choice.trace.draw_count as usize)
        .flatten()
    {
        match draw {
            FactoryAiScoredDraw::TurnStartRandomNumber(draw) => {
                append_policy_draw_base(
                    &mut buf,
                    0,
                    u8::MAX,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
            }
            FactoryAiScoredDraw::SetupSimulatedRng(draw) => {
                append_policy_draw_base(
                    &mut buf,
                    1,
                    draw.move_slot as u8,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
                buf.push(draw.simulated_rng);
            }
            FactoryAiScoredDraw::CheckBadMove { move_slot, draw } => {
                append_policy_draw_base(
                    &mut buf,
                    2,
                    move_slot as u8,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
                buf.push(draw.site as u8);
                buf.extend_from_slice(&draw.guessed_ability.to_le_bytes());
            }
            FactoryAiScoredDraw::TryToFaint { move_slot, draw } => {
                append_policy_draw_base(
                    &mut buf,
                    3,
                    move_slot as u8,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
                buf.push(draw.kind as u8);
                buf.push(u8::from(draw.succeeded));
            }
            FactoryAiScoredDraw::CheckViability { move_slot, draw } => {
                buf.push(4);
                buf.push(move_slot as u8);
                append_encoded_cv_draw(
                    &mut buf,
                    &format!("slot-{}-check-viability", move_slot as u8),
                    draw,
                );
            }
            FactoryAiScoredDraw::BestMoveTie(draw) => {
                append_policy_draw_base(
                    &mut buf,
                    5,
                    u8::MAX,
                    draw.ordinal,
                    draw.before,
                    draw.after,
                    draw.raw_rng_value,
                    draw.random_value,
                );
            }
        }
    }
    let best_count = choice.trace.best_move_slot_count as usize;
    append_policy_footer(
        &mut buf,
        choice.trace.slot_scores.map(|score| {
            (
                score.move_slot as u8,
                score.move_id,
                score.legal,
                score.initial_score,
                score.check_bad_move_delta,
                score.try_to_faint_delta,
                score.check_viability_delta,
                score.final_score,
            )
        }),
        &choice.trace.best_move_slots[..best_count],
        choice.trace.tie_modulus,
        choice.trace.tie_index,
        choice.trace.chosen_decision,
    );
    patch_total_len(&mut buf);
    buf
}

/// Runs the native mask-zero DecisionPolicy chooser. Input has a 40-byte
/// little-endian prefix: rng `{value,calls}` (8); factory level/battle/streak/
/// opponent as four u32s (16); four move ids (8); request kind:u8,
/// request_id:u32, side:u8, battler:u8, legal_count:u8 (8); then variable
/// legal-decision records `{tag,slot_or_party,target}` (3 * legal_count). Tag
/// 0 is a move and tag 1 a switch. The output is the
/// common length-prefixed complete-choice layout documented on
/// `fw_choose_factory_ai_scored_decision`, or status 1 + u32 UTF-8 error.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_choose_factory_ai_mask_zero_decision(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if (input_len as usize) < FACTORY_AI_MASK_ZERO_INPUT_FIXED_WIDTH {
        return alloc_and_copy(&encode_policy_error(
            "factory-wasm factoryAiEngine: mask-zero decision input shorter than 40 bytes",
        ));
    }
    // SAFETY: exact-width check plus caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len as usize) };
    let legal_count = bytes[39] as usize;
    if bytes.len() != FACTORY_AI_MASK_ZERO_INPUT_FIXED_WIDTH + 3 * legal_count {
        return alloc_and_copy(&encode_policy_error(
            "factory-wasm factoryAiEngine: malformed mask-zero legal-decision length",
        ));
    }
    let mut r = ByteReader::new(bytes);
    let rng = BattleRngState { value: r.u32(), calls: r.u32() };
    let factory = decode_policy_factory(&mut r);
    let moves = [r.u16(), r.u16(), r.u16(), r.u16()];
    let (kind, request_id, side, battler, legal) = match decode_policy_request(&mut r) {
        Ok(request) => request,
        Err(message) => return alloc_and_copy(&encode_policy_error(&message)),
    };
    let request =
        FactoryAiMovePolicyRequest { kind, request_id, side, battler, legal_decisions: &legal };
    debug_assert_eq!(r.offset, bytes.len());
    alloc_and_copy(&encode_mask_zero_choice(
        factory_ai_decision_policy::choose_factory_ai_mask_zero_decision(
            FactoryAiMaskZeroDecisionInput {
                view: FactoryAiMovePolicyView { factory, moves },
                request,
                rng,
            },
        ),
    ))
}

/// Runs the native scored mask-1/mask-7 DecisionPolicy chooser.
///
/// Input has a 332-byte fixed portion plus 3 bytes per legal decision. Let
/// `N = legal_count` and `B = 40 + 3*N`:
///
/// ```text
/// 0 rng.value:u32; 4 rng.calls:u32
/// 8 levelMode:u32; 12 battleMode:u32; 16 factoryWinStreak:u32;
/// 20 trainerOpponentId:u32; 24 moves:[u16;4]
/// 32 request kind:u8; 33 requestId:u32; 37 side:u8; 38 battler:u8;
/// 39 legal_count:u8; 40 legal records:[tag:u8,slot_or_party:u8,target:u8;N]
/// B turn owner:u8; B+1 turn value:u16 (owner 0=legacy,1=decision,2=boundary)
/// B+3 attacker:135 bytes; B+138 target battler:135 bytes
/// B+273 target species:u16; B+275 knownAbility:opt_u16;
/// B+278 speciesAbilities:opt_[u16;2]; B+283 knownMoves:opt_[u16;4]
/// total input_len = B+292 = 332+3*N
/// ```
///
/// A 135-byte battler is declaration-order. Relative offsets are: types 0/2;
/// attack 2/i32; defense 6/i32; spAttack 10/i32; spDefense 14/i32; speed
/// 18/u32; level 22; atk/def/spAtk/spDef/speed/acc/evasion stages 23..29;
/// isFirstTurn 30; hp 31/i32; maxHp 35/i32; then lastMove 39/opt_u16;
/// toxic/anyStatus/confused/asleep/taunted/leechSeeded/infatuated/yawn/
/// perishSong/nightmared/foresighted/spikes/futureAttack at 42,44,...,66
/// (opt_bool); protectUses 68/opt_u8; battleTurnCount 70/opt_u32; rooted,
/// attackerFutureAttack, focusEnergy, curableStatus, poisoned, burned,
/// paralyzed, cursed, escapePrevented, tormented, lightScreen, reflect,
/// targetReflect, targetPartyStatus, safeguard at 75,77,...,103 (opt_bool);
/// ability 105/u16; holdEffect 107/opt_u16; weather 110/opt_u8; usableParty
/// 112/opt_u8; substitute/disabled/encored/mist at 114..120 (opt_bool);
/// gender 122/opt_u8; imprisoned/mudSport/waterSport 124..128 (opt_bool);
/// usedHeldItem 130/opt_u16; stockpile 133/opt_u8. `opt_T` is presence:u8
/// plus a fixed T slot ignored when absent, preserving false/zero presence.
///
/// All output begins `total_len:u32,status:u8`. Status 1 is
/// `message_len:u32,message:utf8`. Status 0 is:
///
/// ```text
/// 5 requestId:u32; 9 side:u8; 10 chosenSlot:u8; 11 chosenTarget:u8
/// 12 finalRng.value:u32; 16 finalRng.calls:u32; 20 mask:u8
/// 21 mask receipt: isBrain:u8, stages:u32, challenge:opt_u32,
///    evaluationCount:u8, five [branch:u8,matched:u8], selectedBranch:u8
/// 43 scriptCount:u8; 44 scripts:[u8;3]; 47 turnOwner:u8;
/// 48 turnValue:opt_u16; 51 drawCount:u8; 52 draw records...
/// ```
///
/// Every non-CV draw starts with tag:u8, moveSlot:u8 (255 when not owned by
/// a slot), ordinal:u32, before `{value,calls}` u32x2, after u32x2,
/// rawRng:u32, randomValue:u16 (28 bytes). Tag 0 turn-start and tag 5 tie
/// end there; tag 1 adds simulatedRng:u8; tag 2 adds CBM site:u8 and guessed
/// ability:u16; tag 3 adds TTF kind:u8 and succeeded:u8. Tag 4 starts with
/// tag+slot then the CV record documented by `fw_run_check_viability`
/// (including kind/reason UTF-8 and typed extra tag/value). After the draws,
/// four 27-byte scores carry slot:u8, move:u16, legal:u8, initial:i32, three
/// `opt_i32` deltas, final:i32; then bestCount:u8, four fixed slot bytes,
/// tie modulus/index, and chosen slot/target. Mask zero uses this same output
/// with zero scripts, a legacy/absent turn block, and absent score deltas.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_choose_factory_ai_scored_decision(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if (input_len as usize) < FACTORY_AI_SCORED_INPUT_FIXED_WIDTH {
        return alloc_and_copy(&encode_policy_error(
            "factory-wasm factoryAiEngine: scored decision input shorter than 332 bytes",
        ));
    }
    // SAFETY: exact-width check plus caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len as usize) };
    let legal_count = bytes[39] as usize;
    if bytes.len() != FACTORY_AI_SCORED_INPUT_FIXED_WIDTH + 3 * legal_count {
        return alloc_and_copy(&encode_policy_error(
            "factory-wasm factoryAiEngine: malformed scored legal-decision length",
        ));
    }
    let mut r = ByteReader::new(bytes);
    let rng = BattleRngState { value: r.u32(), calls: r.u32() };
    let factory = decode_policy_factory(&mut r);
    let moves = [r.u16(), r.u16(), r.u16(), r.u16()];
    let (kind, request_id, side, battler, legal) = match decode_policy_request(&mut r) {
        Ok(request) => request,
        Err(message) => return alloc_and_copy(&encode_policy_error(&message)),
    };
    let request =
        FactoryAiMovePolicyRequest { kind, request_id, side, battler, legal_decisions: &legal };
    let turn_start_random_number = match r.u8() {
        0 => None,
        1 => {
            r.u16();
            Some(FactoryAiTurnStartRandomNumber::Decision)
        }
        2 => Some(FactoryAiTurnStartRandomNumber::BattleTurnBoundary { value: r.u16() }),
        value => {
            return alloc_and_copy(&encode_policy_error(&format!(
                "factory-wasm factoryAiEngine: invalid turn-start owner {value}"
            )))
        }
    };
    if turn_start_random_number.is_none() {
        r.u16();
    }
    let attacker = decode_scored_battler(&mut r);
    let target_battler = decode_scored_battler(&mut r);
    let target = FactoryAiScoredTargetView {
        battler: target_battler,
        species: r.u16(),
        known_ability: r.opt_u16(),
        species_abilities: r.opt_u16x2(),
        known_moves: r.opt_u16x4(),
        known_moves_tail: None,
    };
    debug_assert_eq!(r.offset, bytes.len());
    let view = FactoryAiScoredView { factory, moves, attacker, target };
    alloc_and_copy(&encode_scored_choice(
        factory_ai_decision_policy::choose_factory_ai_scored_decision(
            FactoryAiScoredDecisionInput { view, request, rng, turn_start_random_number },
        ),
    ))
}

// --- Factory switch selector and policy (additive ABI v1) -----------------

const SWITCH_INTO_INPUT_WIDTH: usize = 114;
const SWITCH_POLICY_INPUT_WIDTH: usize = 401;

fn decode_switch_fallback(r: &mut ByteReader) -> BattleAiSwitchDamageFallback {
    BattleAiSwitchDamageFallback {
        base_damage: r.i32(),
        active_types: [r.u8(), r.u8()],
        opposing_types: [r.u8(), r.u8()],
        opposing_ability: r.u16(),
        opposing_status2: r.u32(),
    }
}

fn encode_switch_boundary_error(message: &str) -> Vec<u8> {
    let mut buf = vec![0; 4];
    buf.push(2); // status: boundary error
    buf.extend_from_slice(&(message.len() as u16).to_le_bytes());
    buf.extend_from_slice(message.as_bytes());
    patch_total_len(&mut buf);
    buf
}

/// Runs the native plain-singles `GetMostSuitableMonToSwitchInto` selector.
/// This is an additive ABI-v1 export; `fw_abi_version` remains 1.
///
/// Input is exactly 114 little-endian bytes (no prefix): six consecutive
/// 16-byte bench records `{species:u16,hp:i32,types:[u8;2],moves:[u16;4]}`;
/// then `active_party_index:u8`, `opposing_types:[u8;2]`,
/// `has_damage_fallback:u8`, and the always-present 14-byte fallback payload
/// `{base_damage:i32,active_types:[u8;2],opposing_types:[u8;2],
/// opposing_ability:u16,opposing_status2:u32}`. The payload is ignored when
/// its presence byte is zero.
///
/// Output uses the shared length prefix, then status `0 = resolved` followed
/// by `party_index:u8`, `1 = damage-fallback-needed`, or `2 = boundary error`
/// followed by `message_len:u16` and UTF-8 bytes.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_get_most_suitable_mon_to_switch_into(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_len as usize != SWITCH_INTO_INPUT_WIDTH {
        return alloc_and_copy(&encode_switch_boundary_error(
            "factory-wasm factoryAiEngine: switch-into input must be exactly 114 bytes",
        ));
    }
    // SAFETY: exact-width check plus caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, SWITCH_INTO_INPUT_WIDTH) };
    let mut r = ByteReader::new(bytes);
    let bench: BattleAiSwitchBench = std::array::from_fn(|_| BattleAiSwitchBenchMember {
        species: r.u16(),
        hp: r.i32(),
        types: [r.u8(), r.u8()],
        moves: [r.u16(), r.u16(), r.u16(), r.u16()],
    });
    let active_party_index = r.u8();
    let opposing_types = [r.u8(), r.u8()];
    let has_fallback = r.bool_();
    let fallback = decode_switch_fallback(&mut r);
    debug_assert_eq!(r.offset, bytes.len());
    let result = battle_ai_switch_into::get_most_suitable_mon_to_switch_into(
        &bench,
        active_party_index,
        opposing_types,
        has_fallback.then_some(fallback),
    );
    let mut output = vec![0; 4];
    match result {
        BattleAiSwitchIntoResult::Resolved { party_index } => {
            output.push(0);
            output.push(party_index);
        }
        BattleAiSwitchIntoResult::DamageFallbackNeeded => output.push(1),
    }
    patch_total_len(&mut output);
    alloc_and_copy(&output)
}

fn decode_switch_battler(r: &mut ByteReader) -> FactoryAiSwitchBattler {
    FactoryAiSwitchBattler {
        species: r.u16(),
        ability: r.u16(),
        types: [r.u8(), r.u8()],
        hp: r.i32(),
        max_hp: r.i32(),
        moves: [r.u16(), r.u16(), r.u16(), r.u16()],
        status1: r.u32(),
        status2: r.u32(),
        status3: r.u32(),
        stat_stages: std::array::from_fn(|_| r.i32()),
        party_index: r.u8(),
        perish_song_timer: r.u8(),
    }
}

fn decode_switch_party_member(r: &mut ByteReader) -> FactoryAiSwitchPartyMember {
    FactoryAiSwitchPartyMember {
        species: r.u16(),
        is_egg: r.bool_(),
        ability_num: r.u8(),
        hp: r.i32(),
        moves: [r.u16(), r.u16(), r.u16(), r.u16()],
    }
}

fn encode_switch_policy_result(
    precheck_blocked: bool,
    result: Result<
        FactoryAiSwitchPolicyResult,
        factory_ai_switch_policy::FactoryAiSwitchPolicyError,
    >,
) -> Vec<u8> {
    let mut buf = vec![0; 4];
    match result {
        Err(error) => {
            buf.push(1); // status: typed policy error
            buf.push(u8::from(precheck_blocked));
            let message = error.to_string();
            buf.extend_from_slice(&(message.len() as u16).to_le_bytes());
            buf.extend_from_slice(message.as_bytes());
        }
        Ok(result) => {
            buf.push(0);
            buf.push(u8::from(precheck_blocked));
            match result.choice {
                FactoryAiSwitchChoice::Chosen { party_index } => {
                    buf.push(0);
                    buf.push(party_index);
                }
                FactoryAiSwitchChoice::Sentinel => {
                    buf.push(1);
                    buf.push(0);
                }
                FactoryAiSwitchChoice::NoSwitch => {
                    buf.push(2);
                    buf.push(0);
                }
            }
            buf.push(u8::from(result.selected_party_index.is_some()));
            buf.push(result.selected_party_index.unwrap_or(0));
            buf.extend_from_slice(&result.rng.value.to_le_bytes());
            buf.extend_from_slice(&result.rng.calls.to_le_bytes());
            buf.extend_from_slice(&(result.draws.len() as u32).to_le_bytes());
            for draw in result.draws {
                buf.extend_from_slice(&draw.ordinal.to_le_bytes());
                buf.push(draw.kind as u8);
                buf.extend_from_slice(&draw.before.value.to_le_bytes());
                buf.extend_from_slice(&draw.before.calls.to_le_bytes());
                buf.extend_from_slice(&draw.after.value.to_le_bytes());
                buf.extend_from_slice(&draw.after.calls.to_le_bytes());
                buf.extend_from_slice(&draw.raw_rng_value.to_le_bytes());
                buf.extend_from_slice(&draw.random_value.to_le_bytes());
                buf.extend_from_slice(&draw.modulus.to_le_bytes());
                buf.extend_from_slice(&draw.remainder.to_le_bytes());
                buf.push(u8::from(draw.succeeded));
                buf.push(u8::from(draw.party_index.is_some()));
                buf.push(draw.party_index.unwrap_or(0));
                buf.push(u8::from(draw.move_slot.is_some()));
                buf.push(draw.move_slot.unwrap_or(0));
                buf.extend_from_slice(&(draw.reason.len() as u16).to_le_bytes());
                buf.extend_from_slice(draw.reason.as_bytes());
            }
            buf.extend_from_slice(&(result.branches.len() as u32).to_le_bytes());
            for branch in result.branches {
                buf.extend_from_slice(&branch.ordinal.to_le_bytes());
                buf.push(branch.branch as u8);
                buf.push(branch.outcome as u8);
                buf.push(u8::from(branch.party_index.is_some()));
                buf.push(branch.party_index.unwrap_or(0));
            }
        }
    }
    patch_total_len(&mut buf);
    buf
}

/// Runs both the native RNG-free switch precheck and the complete native
/// trainer-singles switch policy through one additive ABI-v1 boundary.
///
/// Input is exactly 401 little-endian bytes (no prefix): four 68-byte battler
/// records in Rust declaration order; six 16-byte party-member records; then
/// `last_landed_move:u16,last_hit_by:u8,reserved_party_index:u8,
/// absent_battler_flags:u8,battlers_count:u8,battle_type_flags:u32`, RNG
/// `{value:u32,calls:u32}`, `has_suitable_damage_fallback:u8`, and the same
/// 14-byte fallback payload documented by
/// `fw_get_most_suitable_mon_to_switch_into`. A battler record is
/// `{species:u16,ability:u16,types:[u8;2],hp:i32,max_hp:i32,moves:[u16;4],
/// status1:u32,status2:u32,status3:u32,stat_stages:[i32;8],party_index:u8,
/// perish_song_timer:u8}`; a party record is
/// `{species:u16,is_egg:u8,ability_num:u8,hp:i32,moves:[u16;4]}`.
///
/// Output starts `total_len:u32,status:u8,precheck_blocked:u8`. Status 1 is
/// the typed policy error `{message_len:u16,message:utf8}`. Status 0 continues
/// with `choice_kind:u8` (0 chosen, 1 sentinel, 2 no-switch), choice value,
/// `selected_party_index:opt_u8`, final RNG, `draw_count:u32`, variable draw
/// records, then `branch_count:u32` and fixed 8-byte branch records. Each draw
/// preserves ordinal/kind, before+after RNG, raw/random/modulus/remainder,
/// success, optional party/move indices, and a u16-length-prefixed UTF-8
/// reason. This crosses every member of the canonical typed result.
/// Boundary-length failures use status 2 plus u16-length-prefixed UTF-8.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_evaluate_factory_ai_switch_policy(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_len as usize != SWITCH_POLICY_INPUT_WIDTH {
        return alloc_and_copy(&encode_switch_boundary_error(
            "factory-wasm factoryAiEngine: switch-policy input must be exactly 401 bytes",
        ));
    }
    // SAFETY: exact-width check plus caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, SWITCH_POLICY_INPUT_WIDTH) };
    let mut r = ByteReader::new(bytes);
    let battlers = std::array::from_fn(|_| decode_switch_battler(&mut r));
    let opponent_party = std::array::from_fn(|_| decode_switch_party_member(&mut r));
    let rules = FactoryAiSwitchRules {
        battlers,
        opponent_party,
        last_landed_move: r.u16(),
        last_hit_by: r.u8(),
        reserved_party_index: r.u8(),
        absent_battler_flags: r.u8(),
        battlers_count: r.u8(),
        battle_type_flags: r.u32(),
    };
    let rng = BattleRngState { value: r.u32(), calls: r.u32() };
    let has_fallback = r.bool_();
    let suitable_damage_fallback = decode_switch_fallback(&mut r);
    debug_assert_eq!(r.offset, bytes.len());
    let precheck_blocked = factory_ai_switch_policy::is_factory_ai_switch_precheck_blocked(&rules);
    let input = FactoryAiSwitchPolicyInput {
        rules,
        rng,
        suitable_damage_fallback: has_fallback.then_some(suitable_damage_fallback),
    };
    alloc_and_copy(&encode_switch_policy_result(
        precheck_blocked,
        factory_ai_switch_policy::evaluate_factory_ai_switch_policy(&input),
    ))
}

// --- Factory trainer selection and seven-battle schedule (ABI v1) --------

const FACTORY_TRAINER_SELECT_PREFIX_WIDTH: usize = 28;
const FACTORY_TRAINER_SCHEDULE_INPUT_WIDTH: usize = 16;

fn read_f64(bytes: &[u8], offset: usize) -> f64 {
    f64::from_le_bytes(bytes[offset..offset + 8].try_into().unwrap())
}

fn encode_factory_trainer_boundary_error(message: &str) -> Vec<u8> {
    let mut buf = vec![0; 4];
    buf.push(2); // status: boundary error
    buf.extend_from_slice(&(message.len() as u16).to_le_bytes());
    buf.extend_from_slice(message.as_bytes());
    patch_total_len(&mut buf);
    buf
}

fn factory_trainer_error_kind(error: FactoryTrainerScheduleError) -> (u8, u8) {
    match error {
        FactoryTrainerScheduleError::InvalidBattleIndex => (0, 0),
        FactoryTrainerScheduleError::InvalidRngValue => (1, 0),
        FactoryTrainerScheduleError::HistoryTooShort { battle_index } => (2, battle_index),
        FactoryTrainerScheduleError::InvalidFactoryWinStreak => (3, 0),
        FactoryTrainerScheduleError::InvalidRngPortRngValue => (4, 0),
        FactoryTrainerScheduleError::InvalidRngPortValue => (5, 0),
    }
}

fn encode_factory_trainer_typed_error(error: FactoryTrainerScheduleError) -> Vec<u8> {
    let (kind, context) = factory_trainer_error_kind(error);
    let mut buf = vec![0; 4];
    buf.push(1); // status: typed production error
    buf.push(kind);
    buf.push(context);
    patch_total_len(&mut buf);
    buf
}

fn checked_js_battle_index(value: f64) -> Result<i64, FactoryTrainerScheduleError> {
    if value.is_finite() && value.fract() == 0.0 && (0.0..7.0).contains(&value) {
        Ok(value as i64)
    } else {
        Err(FactoryTrainerScheduleError::InvalidBattleIndex)
    }
}

fn checked_js_rng_value(value: f64) -> Result<i64, FactoryTrainerScheduleError> {
    if value.is_finite() && value.fract() == 0.0 && (0.0..=f64::from(u32::MAX)).contains(&value) {
        Ok(value as i64)
    } else {
        Err(FactoryTrainerScheduleError::InvalidRngValue)
    }
}

fn checked_js_factory_win_streak(value: f64) -> Result<i64, FactoryTrainerScheduleError> {
    if value.is_finite()
        && value.fract() == 0.0
        && (0.0..=factory_trainer_schedule::MAX_SAFE_INTEGER as f64).contains(&value)
    {
        Ok(value as i64)
    } else {
        Err(FactoryTrainerScheduleError::InvalidFactoryWinStreak)
    }
}

fn history_value_for_native(value: f64) -> i64 {
    // JS `includes` can only reject a generated u16 trainer when the history
    // value is that exact integer. All other IEEE-754 values use a sentinel
    // outside every generated range; the original f64 bits are retained for
    // the successful result below.
    if value.is_finite() && value.fract() == 0.0 && (0.0..=f64::from(u16::MAX)).contains(&value) {
        value as i64
    } else {
        -1
    }
}

fn encode_factory_trainer_ledger(buf: &mut Vec<u8>, ledger: &[FactoryTrainerDrawLedgerEntry]) {
    for draw in ledger {
        buf.push(draw.battle_index);
        buf.extend_from_slice(
            &u32::try_from(draw.attempt)
                .expect("Factory trainer attempt count fits the ABI u32")
                .to_le_bytes(),
        );
        buf.extend_from_slice(&draw.challenge.to_le_bytes());
        buf.extend_from_slice(
            &u32::try_from(draw.range_index)
                .expect("generated Factory trainer range index fits the ABI u32")
                .to_le_bytes(),
        );
        buf.push(match draw.range_kind {
            FactoryTrainerRangeKind::Normal => 0,
            FactoryTrainerRangeKind::Hard => 1,
        });
        buf.extend_from_slice(&draw.range_start.to_le_bytes());
        buf.extend_from_slice(&draw.range_end.to_le_bytes());
        buf.extend_from_slice(&draw.rng_before.to_le_bytes());
        buf.extend_from_slice(&draw.rng_after.to_le_bytes());
        buf.extend_from_slice(&draw.raw.to_le_bytes());
        buf.extend_from_slice(&draw.trainer_id.to_le_bytes());
        buf.push(u8::from(draw.accepted));
    }
}

fn encode_factory_trainer_selection(
    input_history: &[f64],
    battle_index: usize,
    result: factory_trainer_schedule::FactoryTrainerSelectionResult,
) -> Vec<u8> {
    let mut stored_history = if battle_index
        == usize::from(gen_tables::FACTORY_TRAINER_HISTORY_OMIT_FINAL_BATTLE_INDEX)
    {
        input_history.to_vec()
    } else {
        let mut history = input_history[..battle_index].to_vec();
        history.push(f64::from(result.trainer_id));
        history
    };
    debug_assert_eq!(stored_history.len(), result.stored_trainer_ids.len());

    let mut buf = vec![0; 4];
    buf.push(0); // status: ok
    buf.extend_from_slice(&result.trainer_id.to_le_bytes());
    buf.extend_from_slice(&(stored_history.len() as u32).to_le_bytes());
    for trainer_id in stored_history.drain(..) {
        buf.extend_from_slice(&trainer_id.to_le_bytes());
    }
    buf.extend_from_slice(&result.rng_value.to_le_bytes());
    buf.extend_from_slice(&(result.draw_count as u32).to_le_bytes());
    buf.extend_from_slice(&(result.ledger.len() as u32).to_le_bytes());
    encode_factory_trainer_ledger(&mut buf, &result.ledger);
    patch_total_len(&mut buf);
    buf
}

fn encode_factory_trainer_schedule(
    result: factory_trainer_schedule::FactoryTrainerScheduleResult,
) -> Vec<u8> {
    let mut buf = vec![0; 4];
    buf.push(0); // status: ok
    buf.push(result.trainer_ids.len() as u8);
    for trainer_id in result.trainer_ids {
        buf.extend_from_slice(&trainer_id.to_le_bytes());
    }
    buf.extend_from_slice(&(result.stored_trainer_ids.len() as u32).to_le_bytes());
    for trainer_id in result.stored_trainer_ids {
        buf.extend_from_slice(&(trainer_id as f64).to_le_bytes());
    }
    buf.extend_from_slice(&result.rng_value.to_le_bytes());
    buf.extend_from_slice(&(result.draw_count as u32).to_le_bytes());
    buf.extend_from_slice(&(result.ledger.len() as u32).to_le_bytes());
    encode_factory_trainer_ledger(&mut buf, &result.ledger);
    patch_total_len(&mut buf);
    buf
}

/// Selects one default-GBA Factory trainer through an additive ABI-v1
/// boundary. The injectable scripted RNG remains native-only test infra.
///
/// Input is variable-width little-endian bytes (no prefix):
/// `factory_win_streak:f64` at 0, `battle_index:f64` at 8,
/// `rng_value:f64` at 16, `history_count:u32` at 24, then exactly
/// `history_count` IEEE-754 `stored_trainer_ids:f64` records at 28. The f64
/// slots preserve the canonical JS Number validation domain (NaN,
/// fractional and unsafe values reach typed errors rather than truncating).
/// History values themselves are not validated by the canonical function;
/// their original bits are retained in the returned history.
///
/// Output starts `total_len:u32,status:u8`. Status 1 is the typed error
/// `{kind:u8,context:u8}`: battle=0, rng=1, short-history=2 (context is the
/// battle index), streak=3, RNG-port-rng=4, RNG-port-value=5. The last two
/// are complete but unreachable through this default-GBA export. Status 2
/// is `message_len:u16,message:utf8` for malformed binary input. Status 0:
/// `trainer_id:u16,stored_count:u32,stored:f64[],rng_value:u32,
/// draw_count:u32,ledger_count:u32,ledger[]`. Each ledger record is 35 bytes:
/// `battle:u8,attempt:u32,challenge:i64,range_index:u32,range_kind:u8
/// (normal=0,hard=1),range_start:u16,range_end:u16,rng_before:u32,
/// rng_after:u32,raw:u16,trainer_id:u16,accepted:u8`.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_select_factory_trainer(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    let input_len = input_len as usize;
    if input_len < FACTORY_TRAINER_SELECT_PREFIX_WIDTH {
        return alloc_and_copy(&encode_factory_trainer_boundary_error(
            "factory-wasm factoryTrainerScheduleEngine: select input must be at least 28 bytes",
        ));
    }
    // SAFETY: minimum-width check plus caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len) };
    let history_count = u32::from_le_bytes(bytes[24..28].try_into().unwrap()) as usize;
    let expected_len = history_count
        .checked_mul(8)
        .and_then(|width| FACTORY_TRAINER_SELECT_PREFIX_WIDTH.checked_add(width));
    if expected_len != Some(input_len) {
        return alloc_and_copy(&encode_factory_trainer_boundary_error(
            "factory-wasm factoryTrainerScheduleEngine: malformed select history length",
        ));
    }

    // Canonical validation order: battle, rng, history length, streak.
    let battle_index = match checked_js_battle_index(read_f64(bytes, 8)) {
        Ok(value) => value,
        Err(error) => return alloc_and_copy(&encode_factory_trainer_typed_error(error)),
    };
    let rng_value = match checked_js_rng_value(read_f64(bytes, 16)) {
        Ok(value) => value,
        Err(error) => return alloc_and_copy(&encode_factory_trainer_typed_error(error)),
    };
    if history_count < battle_index as usize {
        return alloc_and_copy(&encode_factory_trainer_typed_error(
            FactoryTrainerScheduleError::HistoryTooShort { battle_index: battle_index as u8 },
        ));
    }
    let factory_win_streak = match checked_js_factory_win_streak(read_f64(bytes, 0)) {
        Ok(value) => value,
        Err(error) => return alloc_and_copy(&encode_factory_trainer_typed_error(error)),
    };
    let input_history: Vec<f64> = (0..history_count)
        .map(|index| read_f64(bytes, FACTORY_TRAINER_SELECT_PREFIX_WIDTH + index * 8))
        .collect();
    let native_history: Vec<i64> = input_history
        .iter()
        .copied()
        .map(history_value_for_native)
        .collect();
    match factory_trainer_schedule::select_factory_trainer_gba(
        factory_win_streak,
        battle_index,
        &native_history,
        rng_value,
    ) {
        Ok(result) => alloc_and_copy(&encode_factory_trainer_selection(
            &input_history,
            battle_index as usize,
            result,
        )),
        Err(error) => alloc_and_copy(&encode_factory_trainer_typed_error(error)),
    }
}

/// Generates all seven default-GBA Factory trainers. Input is exactly 16
/// bytes: `factory_win_streak:f64,rng_value:f64`. Output shares the status
/// and 35-byte ledger layouts of `fw_select_factory_trainer`; status 0 is
/// `trainer_count:u8,trainer_ids:u16[],stored_count:u32,stored:f64[],
/// rng_value:u32,draw_count:u32,ledger_count:u32,ledger[]`.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_generate_factory_trainer_schedule(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_len as usize != FACTORY_TRAINER_SCHEDULE_INPUT_WIDTH {
        return alloc_and_copy(&encode_factory_trainer_boundary_error(
            "factory-wasm factoryTrainerScheduleEngine: schedule input must be exactly 16 bytes",
        ));
    }
    // SAFETY: exact-width check plus caller contract above.
    let bytes =
        unsafe { std::slice::from_raw_parts(input_ptr, FACTORY_TRAINER_SCHEDULE_INPUT_WIDTH) };
    // Canonical schedule reaches rng validation before streak validation.
    let rng_value = match checked_js_rng_value(read_f64(bytes, 8)) {
        Ok(value) => value,
        Err(error) => return alloc_and_copy(&encode_factory_trainer_typed_error(error)),
    };
    let factory_win_streak = match checked_js_factory_win_streak(read_f64(bytes, 0)) {
        Ok(value) => value,
        Err(error) => return alloc_and_copy(&encode_factory_trainer_typed_error(error)),
    };
    match factory_trainer_schedule::generate_factory_trainer_schedule_gba(
        factory_win_streak,
        rng_value,
    ) {
        Ok(result) => alloc_and_copy(&encode_factory_trainer_schedule(result)),
        Err(error) => alloc_and_copy(&encode_factory_trainer_typed_error(error)),
    }
}

// --- Factory AI battle history (additive ABI v1) -------------------------

struct CheckedReader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> CheckedReader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn take(&mut self, len: usize) -> Result<&'a [u8], ()> {
        let end = self.offset.checked_add(len).ok_or(())?;
        let value = self.bytes.get(self.offset..end).ok_or(())?;
        self.offset = end;
        Ok(value)
    }

    fn u8(&mut self) -> Result<u8, ()> {
        Ok(self.take(1)?[0])
    }

    fn u16(&mut self) -> Result<u16, ()> {
        Ok(u16::from_le_bytes(self.take(2)?.try_into().unwrap()))
    }

    fn u32(&mut self) -> Result<u32, ()> {
        Ok(u32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }

    fn f64(&mut self) -> Result<f64, ()> {
        Ok(f64::from_le_bytes(self.take(8)?.try_into().unwrap()))
    }

    fn f64x4(&mut self) -> Result<[f64; 4], ()> {
        Ok([self.f64()?, self.f64()?, self.f64()?, self.f64()?])
    }

    fn string(&mut self) -> Result<String, ()> {
        let len = usize::try_from(self.u32()?).map_err(|_| ())?;
        String::from_utf8(self.take(len)?.to_vec()).map_err(|_| ())
    }

    fn finish(self) -> Result<(), ()> {
        (self.offset == self.bytes.len()).then_some(()).ok_or(())
    }
}

fn decode_battle_history_live(
    reader: &mut CheckedReader,
) -> Result<FactoryAiBattleHistoryLiveInput, ()> {
    Ok(FactoryAiBattleHistoryLiveInput {
        party_indexes: reader.f64x4()?,
        target_last_move: reader.f64()?,
        observed_ability_ids: reader.f64x4()?,
        observed_item_effects: reader.f64x4()?,
    })
}

fn decode_battle_history(reader: &mut CheckedReader) -> Result<FactoryAiBattleHistory, ()> {
    fn moves(reader: &mut CheckedReader) -> Result<Vec<f64>, ()> {
        let count = usize::try_from(reader.u32()?).map_err(|_| ())?;
        if count > reader.bytes.len().saturating_sub(reader.offset) / 8 {
            return Err(());
        }
        (0..count).map(|_| reader.f64()).collect()
    }
    fn ability(reader: &mut CheckedReader) -> Result<Option<String>, ()> {
        match reader.u8()? {
            0 => Ok(None),
            1 => Ok(Some(reader.string()?)),
            _ => Err(()),
        }
    }
    let used_moves = [
        moves(reader)?,
        moves(reader)?,
        moves(reader)?,
        moves(reader)?,
    ];
    let known_abilities = [
        ability(reader)?,
        ability(reader)?,
        ability(reader)?,
        ability(reader)?,
    ];
    Ok(FactoryAiBattleHistory {
        used_moves,
        known_abilities,
        known_item_effects: reader.f64x4()?,
        party_indexes: reader.f64x4()?,
    })
}

fn encode_battle_history_payload(buf: &mut Vec<u8>, history: &FactoryAiBattleHistory) {
    for moves in &history.used_moves {
        buf.extend_from_slice(
            &u32::try_from(moves.len())
                .expect("battle-history move count fits ABI u32")
                .to_le_bytes(),
        );
        for move_id in moves {
            buf.extend_from_slice(&move_id.to_le_bytes());
        }
    }
    for ability in &history.known_abilities {
        match ability {
            None => buf.push(0),
            Some(ability) => {
                buf.push(1);
                buf.extend_from_slice(
                    &u32::try_from(ability.len())
                        .expect("battle-history ability name fits ABI u32")
                        .to_le_bytes(),
                );
                buf.extend_from_slice(ability.as_bytes());
            }
        }
    }
    for item_effect in history.known_item_effects {
        buf.extend_from_slice(&item_effect.to_le_bytes());
    }
    for party_index in history.party_indexes {
        buf.extend_from_slice(&party_index.to_le_bytes());
    }
}

fn encode_battle_history_result(
    result: Result<FactoryAiBattleHistory, factory_ai_battle_history::FactoryAiBattleHistoryError>,
) -> Vec<u8> {
    let mut buf = vec![0; 4];
    match result {
        Ok(history) => {
            buf.push(0);
            encode_battle_history_payload(&mut buf, &history);
        }
        Err(error) => {
            let message = error.to_string();
            buf.push(1);
            buf.extend_from_slice(&(message.len() as u16).to_le_bytes());
            buf.extend_from_slice(message.as_bytes());
        }
    }
    patch_total_len(&mut buf);
    buf
}

fn encode_battle_history_boundary_error() -> Vec<u8> {
    let message = "factory-wasm factoryAiBattleHistoryEngine: malformed operation input";
    let mut buf = vec![0; 4];
    buf.push(2);
    buf.extend_from_slice(&(message.len() as u16).to_le_bytes());
    buf.extend_from_slice(message.as_bytes());
    patch_total_len(&mut buf);
    buf
}

fn battle_history_battler(value: u8) -> Result<FactoryAiBattleHistoryBattler, ()> {
    match value {
        0 => Ok(FactoryAiBattleHistoryBattler::Battler0),
        1 => Ok(FactoryAiBattleHistoryBattler::Battler1),
        2 => Ok(FactoryAiBattleHistoryBattler::Battler2),
        3 => Ok(FactoryAiBattleHistoryBattler::Battler3),
        _ => Err(()),
    }
}

/// Applies one pure Factory AI battle-history operation through additive ABI
/// v1. Every JavaScript Number crosses as little-endian IEEE-754 `f64`.
///
/// Input starts with `operation:u8`: 0=create, 1=record ability, 2=record
/// item, 3=sync. A live input is exactly 104 bytes in this order:
/// `party_indexes:f64[4],target_last_move:f64,observed_ability_ids:f64[4],
/// observed_item_effects:f64[4]`. Create is `operation,live`. Record ability
/// is `operation,battler:u8,ability_len:u32,ability:utf8,history`; record item
/// is `operation,battler:u8,item_effect:f64,history`; sync is
/// `operation,live,history`.
///
/// A history is four `move_count:u32,moves:f64[move_count]` rows, then four
/// abilities (`present:u8`, followed when present by `byte_len:u32,utf8`),
/// `known_item_effects:f64[4]`, and `party_indexes:f64[4]`. No count or
/// string may extend beyond `input_len`, presence is exactly 0/1, battler is
/// 0..3, UTF-8 must be valid, and all bytes must be consumed.
///
/// Output is `total_len:u32,status:u8`. Status 0 appends one history in that
/// same layout. Status 1 appends `message_len:u16,message:utf8` for the
/// canonical unknown-ability error. Status 2 uses the same message layout for
/// every malformed wire input. The caller frees the output with
/// `fw_free(ptr,total_len)`.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_apply_factory_ai_battle_history_operation(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_len == 0 {
        return alloc_and_copy(&encode_battle_history_boundary_error());
    }
    // SAFETY: nonzero width plus caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len as usize) };
    let decoded = (|| {
        let mut reader = CheckedReader::new(bytes);
        let operation = reader.u8()?;
        let result = match operation {
            0 => {
                let live = decode_battle_history_live(&mut reader)?;
                Ok(factory_ai_battle_history::create_factory_ai_battle_history(
                    &live,
                ))
            }
            1 => {
                let battler = battle_history_battler(reader.u8()?)?;
                let ability = reader.string()?;
                let history = decode_battle_history(&mut reader)?;
                Ok(factory_ai_battle_history::record_factory_ai_known_ability(
                    &history, battler, ability,
                ))
            }
            2 => {
                let battler = battle_history_battler(reader.u8()?)?;
                let item_effect = reader.f64()?;
                let history = decode_battle_history(&mut reader)?;
                Ok(
                    factory_ai_battle_history::record_factory_ai_known_item_effect(
                        &history,
                        battler,
                        item_effect,
                    ),
                )
            }
            3 => {
                let live = decode_battle_history_live(&mut reader)?;
                let history = decode_battle_history(&mut reader)?;
                factory_ai_battle_history::sync_factory_ai_battle_history(&history, &live)
            }
            _ => return Err(()),
        };
        reader.finish()?;
        Ok(result)
    })();
    match decoded {
        Ok(result) => alloc_and_copy(&encode_battle_history_result(result)),
        Err(()) => alloc_and_copy(&encode_battle_history_boundary_error()),
    }
}

// --- Factory swap operation packet (additive ABI v1) ----------------------

const FACTORY_SWAP_PACKET_VERSION: u8 = 1;
const FACTORY_SWAP_MALFORMED_MESSAGE: &str =
    "factory-wasm factorySwapEngine: malformed operation packet";

#[derive(Debug)]
enum FactorySwapPacket {
    Create {
        player_party: [FactorySwapMon; FACTORY_SWAP_PARTY_SIZE],
        enemy_party: [FactorySwapMon; FACTORY_SWAP_PARTY_SIZE],
        rental_mons: [FactoryRentalMon; FACTORY_SWAP_RENTAL_ROSTER_SIZE],
    },
    Acknowledge(FactorySwapState),
    CopyCursor(FactorySwapState),
    HandleInput(FactorySwapState, FactorySwapInput),
    AlreadyHasSpecies(FactorySwapState, Option<FactorySwapPartyIndex>),
    ApplyMutation(FactorySwapState),
    CommitMutation(FactorySwapState),
    RoundDecision(FactorySwapState),
}

#[derive(Debug)]
enum FactorySwapBoundaryValue {
    State(Box<FactorySwapState>),
    Bool(bool),
    Decision(Option<FactorySwapRoundDecision>),
}

fn encode_factory_swap_message(status: u8, message: &str) -> Vec<u8> {
    let message = message.as_bytes();
    let mut buf = Vec::with_capacity(9 + message.len());
    buf.extend_from_slice(&0u32.to_le_bytes());
    buf.push(status);
    buf.extend_from_slice(
        &u32::try_from(message.len())
            .unwrap_or(u32::MAX)
            .to_le_bytes(),
    );
    buf.extend_from_slice(message);
    patch_total_len(&mut buf);
    buf
}

fn factory_swap_write_string(buf: &mut Vec<u8>, value: &str) -> Result<(), ()> {
    let bytes = value.as_bytes();
    let length = u32::try_from(bytes.len()).map_err(|_| ())?;
    buf.extend_from_slice(&length.to_le_bytes());
    buf.extend_from_slice(bytes);
    Ok(())
}

fn factory_swap_bool(reader: &mut CheckedReader<'_>) -> Result<bool, ()> {
    match reader.u8()? {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err(()),
    }
}

fn factory_swap_phase(value: u8) -> Result<FactorySwapPhase, ()> {
    Ok(match value {
        0 => FactorySwapPhase::PlayerPicker,
        1 => FactorySwapPhase::PlayerOptions,
        2 => FactorySwapPhase::SummaryFade,
        3 => FactorySwapPhase::SummaryReturn,
        4 => FactorySwapPhase::PlayerPickerReturn,
        5 => FactorySwapPhase::EnemySwitch,
        6 => FactorySwapPhase::PlayerSwitch,
        7 => FactorySwapPhase::EnemyPicker,
        8 => FactorySwapPhase::AcceptPrompt,
        9 => FactorySwapPhase::AcceptReturn,
        10 => FactorySwapPhase::AcceptExit,
        11 => FactorySwapPhase::QuitPrompt,
        12 => FactorySwapPhase::QuitReturn,
        13 => FactorySwapPhase::QuitExit,
        14 => FactorySwapPhase::DuplicateSpecies,
        15 => FactorySwapPhase::DuplicateReturn,
        16 => FactorySwapPhase::Complete,
        _ => return Err(()),
    })
}

fn factory_swap_status(value: u8) -> Result<FactorySwapBattleStatus, ()> {
    Ok(match value {
        0 => FactorySwapBattleStatus::None,
        1 => FactorySwapBattleStatus::Sleep,
        2 => FactorySwapBattleStatus::Poison,
        3 => FactorySwapBattleStatus::Burn,
        4 => FactorySwapBattleStatus::Freeze,
        5 => FactorySwapBattleStatus::Paralysis,
        6 => FactorySwapBattleStatus::Toxic,
        _ => return Err(()),
    })
}

fn factory_swap_input(value: u8) -> Result<FactorySwapInput, ()> {
    Ok(match value {
        0 => FactorySwapInput::Left,
        1 => FactorySwapInput::Right,
        2 => FactorySwapInput::Up,
        3 => FactorySwapInput::Down,
        4 => FactorySwapInput::A,
        5 => FactorySwapInput::B,
        _ => return Err(()),
    })
}

fn factory_swap_party_index(value: u8) -> Result<FactorySwapPartyIndex, ()> {
    FactorySwapPartyIndex::from_u8(value).ok_or(())
}

fn factory_swap_cursor(value: u8) -> Result<u8, ()> {
    (value <= 4).then_some(value).ok_or(())
}

fn factory_swap_option_cursor(value: u8) -> Result<u8, ()> {
    (value <= 2).then_some(value).ok_or(())
}

fn factory_swap_yes_no_cursor(value: u8) -> Result<u8, ()> {
    (value <= 1).then_some(value).ok_or(())
}

fn factory_swap_optional_party_index(
    reader: &mut CheckedReader<'_>,
) -> Result<Option<FactorySwapPartyIndex>, ()> {
    match reader.u8()? {
        0 => Ok(None),
        1 => Ok(Some(factory_swap_party_index(reader.u8()?)?)),
        _ => Err(()),
    }
}

fn factory_swap_optional_quit_return_phase(
    reader: &mut CheckedReader<'_>,
) -> Result<Option<FactorySwapQuitReturnPhase>, ()> {
    match reader.u8()? {
        0 => Ok(None),
        1 => Ok(Some(match reader.u8()? {
            0 => FactorySwapQuitReturnPhase::PlayerPicker,
            1 => FactorySwapQuitReturnPhase::EnemyPicker,
            _ => return Err(()),
        })),
        _ => Err(()),
    }
}

fn factory_swap_optional_bool(reader: &mut CheckedReader<'_>) -> Result<Option<bool>, ()> {
    match reader.u8()? {
        0 => Ok(None),
        1 => Ok(Some(factory_swap_bool(reader)?)),
        _ => Err(()),
    }
}

fn factory_swap_optional_result(
    reader: &mut CheckedReader<'_>,
) -> Result<Option<FactorySwapResult>, ()> {
    match reader.u8()? {
        0 => Ok(None),
        1 => Ok(Some(FactorySwapResult::Accepted)),
        2 => Ok(Some(FactorySwapResult::KeptParty)),
        _ => Err(()),
    }
}

fn decode_factory_swap_mon(reader: &mut CheckedReader<'_>) -> Result<FactorySwapMon, ()> {
    Ok(FactorySwapMon {
        id: reader.string()?,
        species: reader.string()?,
        max_hp: reader.u32()?,
        hp: reader.u32()?,
        status: factory_swap_status(reader.u8()?)?,
        personality: reader.u32()?,
        ability_num: reader.u8()?,
        friendship: reader.u8()?,
    })
}

fn decode_factory_swap_party(
    reader: &mut CheckedReader<'_>,
) -> Result<[FactorySwapMon; FACTORY_SWAP_PARTY_SIZE], ()> {
    Ok([
        decode_factory_swap_mon(reader)?,
        decode_factory_swap_mon(reader)?,
        decode_factory_swap_mon(reader)?,
    ])
}

fn decode_factory_swap_rental(reader: &mut CheckedReader<'_>) -> Result<FactoryRentalMon, ()> {
    Ok(FactoryRentalMon {
        mon_id: reader.u32()?,
        personality: reader.u32()?,
        ivs: reader.u32()?,
        ability_num: reader.u8()?,
    })
}

fn decode_factory_swap_rentals(
    reader: &mut CheckedReader<'_>,
) -> Result<[FactoryRentalMon; FACTORY_SWAP_RENTAL_ROSTER_SIZE], ()> {
    Ok([
        decode_factory_swap_rental(reader)?,
        decode_factory_swap_rental(reader)?,
        decode_factory_swap_rental(reader)?,
        decode_factory_swap_rental(reader)?,
        decode_factory_swap_rental(reader)?,
        decode_factory_swap_rental(reader)?,
    ])
}

fn decode_factory_swap_state(reader: &mut CheckedReader<'_>) -> Result<FactorySwapState, ()> {
    let phase = factory_swap_phase(reader.u8()?)?;
    let player_party = decode_factory_swap_party(reader)?;
    let enemy_party = decode_factory_swap_party(reader)?;
    let rental_mons = decode_factory_swap_rentals(reader)?;
    let cursor = factory_swap_cursor(reader.u8()?)?;
    let info_cursor = factory_swap_cursor(reader.u8()?)?;
    let display_cursor = factory_swap_cursor(reader.u8()?)?;
    let arrow_cursor = factory_swap_cursor(reader.u8()?)?;
    let cursor_copy_pending = factory_swap_bool(reader)?;
    let actions_count = match reader.u8()? {
        4 => 4,
        5 => 5,
        _ => return Err(()),
    };
    let player_option_cursor = factory_swap_option_cursor(reader.u8()?)?;
    let player_option_display_cursor = factory_swap_option_cursor(reader.u8()?)?;
    let player_option_cursor_copy_pending = factory_swap_bool(reader)?;
    let yes_no_cursor = factory_swap_yes_no_cursor(reader.u8()?)?;
    let player_mon_id = factory_swap_optional_party_index(reader)?;
    let enemy_mon_id = factory_swap_optional_party_index(reader)?;
    let quit_return_phase = factory_swap_optional_quit_return_phase(reader)?;
    let player_switch_completed = factory_swap_bool(reader)?;
    let input_ready = factory_swap_bool(reader)?;
    let script_result = factory_swap_optional_bool(reader)?;
    let mutation_committed = factory_swap_bool(reader)?;
    let result = factory_swap_optional_result(reader)?;
    Ok(FactorySwapState {
        phase,
        player_party,
        enemy_party,
        rental_mons,
        cursor,
        info_cursor,
        display_cursor,
        arrow_cursor,
        cursor_copy_pending,
        actions_count,
        player_option_cursor,
        player_option_display_cursor,
        player_option_cursor_copy_pending,
        yes_no_cursor,
        player_mon_id,
        enemy_mon_id,
        quit_return_phase,
        player_switch_completed,
        input_ready,
        script_result,
        mutation_committed,
        result,
    })
}

fn decode_factory_swap_packet(bytes: &[u8]) -> Result<FactorySwapPacket, ()> {
    let mut reader = CheckedReader::new(bytes);
    if reader.u8()? != FACTORY_SWAP_PACKET_VERSION {
        return Err(());
    }
    let operation = reader.u8()?;
    let packet = match operation {
        0 => FactorySwapPacket::Create {
            player_party: decode_factory_swap_party(&mut reader)?,
            enemy_party: decode_factory_swap_party(&mut reader)?,
            rental_mons: decode_factory_swap_rentals(&mut reader)?,
        },
        1 => FactorySwapPacket::Acknowledge(decode_factory_swap_state(&mut reader)?),
        2 => FactorySwapPacket::CopyCursor(decode_factory_swap_state(&mut reader)?),
        3 => FactorySwapPacket::HandleInput(
            decode_factory_swap_state(&mut reader)?,
            factory_swap_input(reader.u8()?)?,
        ),
        4 => FactorySwapPacket::AlreadyHasSpecies(
            decode_factory_swap_state(&mut reader)?,
            factory_swap_optional_party_index(&mut reader)?,
        ),
        5 => FactorySwapPacket::ApplyMutation(decode_factory_swap_state(&mut reader)?),
        6 => FactorySwapPacket::CommitMutation(decode_factory_swap_state(&mut reader)?),
        7 => FactorySwapPacket::RoundDecision(decode_factory_swap_state(&mut reader)?),
        _ => return Err(()),
    };
    reader.finish()?;
    Ok(packet)
}

fn factory_swap_execute(packet: FactorySwapPacket) -> Result<FactorySwapBoundaryValue, String> {
    match packet {
        FactorySwapPacket::Create { player_party, enemy_party, rental_mons } => {
            Ok(FactorySwapBoundaryValue::State(Box::new(
                factory_swap::create_factory_swap_state(&player_party, &enemy_party, &rental_mons),
            )))
        }
        FactorySwapPacket::Acknowledge(state) => Ok(FactorySwapBoundaryValue::State(Box::new(
            factory_swap::acknowledge_factory_swap_presentation(&state),
        ))),
        FactorySwapPacket::CopyCursor(state) => Ok(FactorySwapBoundaryValue::State(Box::new(
            factory_swap::copy_factory_swap_cursor(&state),
        ))),
        FactorySwapPacket::HandleInput(state, input) => Ok(FactorySwapBoundaryValue::State(
            Box::new(factory_swap::handle_factory_swap_input(&state, input)),
        )),
        FactorySwapPacket::AlreadyHasSpecies(state, enemy_mon_id) => {
            factory_swap::factory_swap_already_has_species(&state, enemy_mon_id)
                .map(FactorySwapBoundaryValue::Bool)
                .map_err(|error| error.to_string())
        }
        FactorySwapPacket::ApplyMutation(state) => {
            factory_swap::apply_factory_swap_mutation(&state)
                .map(|state| FactorySwapBoundaryValue::State(Box::new(state)))
                .map_err(|error| error.to_string())
        }
        FactorySwapPacket::CommitMutation(state) => {
            factory_swap::commit_factory_swap_mutation(&state)
                .map(|state| FactorySwapBoundaryValue::State(Box::new(state)))
                .map_err(|error| error.to_string())
        }
        FactorySwapPacket::RoundDecision(state) => Ok(FactorySwapBoundaryValue::Decision(
            factory_swap::factory_swap_round_decision(&state),
        )),
    }
}

fn encode_factory_swap_mon(buf: &mut Vec<u8>, mon: &FactorySwapMon) -> Result<(), ()> {
    factory_swap_write_string(buf, &mon.id)?;
    factory_swap_write_string(buf, &mon.species)?;
    buf.extend_from_slice(&mon.max_hp.to_le_bytes());
    buf.extend_from_slice(&mon.hp.to_le_bytes());
    buf.push(match mon.status {
        FactorySwapBattleStatus::None => 0,
        FactorySwapBattleStatus::Sleep => 1,
        FactorySwapBattleStatus::Poison => 2,
        FactorySwapBattleStatus::Burn => 3,
        FactorySwapBattleStatus::Freeze => 4,
        FactorySwapBattleStatus::Paralysis => 5,
        FactorySwapBattleStatus::Toxic => 6,
    });
    buf.extend_from_slice(&mon.personality.to_le_bytes());
    buf.push(mon.ability_num);
    buf.push(mon.friendship);
    Ok(())
}

fn encode_factory_swap_state(buf: &mut Vec<u8>, state: &FactorySwapState) -> Result<(), ()> {
    buf.push(match state.phase {
        FactorySwapPhase::PlayerPicker => 0,
        FactorySwapPhase::PlayerOptions => 1,
        FactorySwapPhase::SummaryFade => 2,
        FactorySwapPhase::SummaryReturn => 3,
        FactorySwapPhase::PlayerPickerReturn => 4,
        FactorySwapPhase::EnemySwitch => 5,
        FactorySwapPhase::PlayerSwitch => 6,
        FactorySwapPhase::EnemyPicker => 7,
        FactorySwapPhase::AcceptPrompt => 8,
        FactorySwapPhase::AcceptReturn => 9,
        FactorySwapPhase::AcceptExit => 10,
        FactorySwapPhase::QuitPrompt => 11,
        FactorySwapPhase::QuitReturn => 12,
        FactorySwapPhase::QuitExit => 13,
        FactorySwapPhase::DuplicateSpecies => 14,
        FactorySwapPhase::DuplicateReturn => 15,
        FactorySwapPhase::Complete => 16,
    });
    for mon in state.player_party.iter().chain(state.enemy_party.iter()) {
        encode_factory_swap_mon(buf, mon)?;
    }
    for rental in &state.rental_mons {
        buf.extend_from_slice(&rental.mon_id.to_le_bytes());
        buf.extend_from_slice(&rental.personality.to_le_bytes());
        buf.extend_from_slice(&rental.ivs.to_le_bytes());
        buf.push(rental.ability_num);
    }
    buf.extend_from_slice(&[
        state.cursor,
        state.info_cursor,
        state.display_cursor,
        state.arrow_cursor,
        u8::from(state.cursor_copy_pending),
        state.actions_count,
        state.player_option_cursor,
        state.player_option_display_cursor,
        u8::from(state.player_option_cursor_copy_pending),
        state.yes_no_cursor,
    ]);
    for value in [state.player_mon_id, state.enemy_mon_id] {
        match value {
            None => buf.push(0),
            Some(value) => {
                buf.push(1);
                buf.push(value as u8);
            }
        }
    }
    match state.quit_return_phase {
        None => buf.push(0),
        Some(FactorySwapQuitReturnPhase::PlayerPicker) => buf.extend_from_slice(&[1, 0]),
        Some(FactorySwapQuitReturnPhase::EnemyPicker) => buf.extend_from_slice(&[1, 1]),
    }
    buf.extend_from_slice(&[
        u8::from(state.player_switch_completed),
        u8::from(state.input_ready),
    ]);
    match state.script_result {
        None => buf.push(0),
        Some(value) => buf.extend_from_slice(&[1, u8::from(value)]),
    }
    buf.push(u8::from(state.mutation_committed));
    match state.result {
        None => buf.push(0),
        Some(FactorySwapResult::Accepted) => buf.push(1),
        Some(FactorySwapResult::KeptParty) => buf.push(2),
    }
    Ok(())
}

fn encode_factory_swap_value(value: FactorySwapBoundaryValue) -> Result<Vec<u8>, ()> {
    let mut buf = vec![0; 6];
    buf[4] = 0;
    match value {
        FactorySwapBoundaryValue::State(state) => {
            buf[5] = 0;
            encode_factory_swap_state(&mut buf, &state)?;
        }
        FactorySwapBoundaryValue::Bool(value) => {
            buf[5] = 1;
            buf.push(u8::from(value));
        }
        FactorySwapBoundaryValue::Decision(decision) => {
            buf[5] = 2;
            match decision {
                None => buf.push(0),
                Some(FactorySwapRoundDecision::Accept {
                    player_party_index,
                    opponent_party_index,
                }) => {
                    buf.push(1);
                    buf.push(player_party_index as u8);
                    buf.push(opponent_party_index as u8);
                }
                Some(FactorySwapRoundDecision::Decline) => buf.push(2),
            }
        }
    }
    patch_total_len(&mut buf);
    Ok(buf)
}

/// Executes one source-shaped Factory swap boundary operation through
/// additive ABI v1. The packet is versioned and little-endian:
/// `version:u8,operation:u8`, with operation tags 0=create, 1=acknowledge,
/// 2=copy-cursor, 3=handle-input, 4=already-has-species, 5=apply-mutation,
/// 6=commit-mutation, and 7=round-decision. Create carries three player mon
/// records, three enemy mon records, and six rental records. Every other
/// operation carries the full state, followed only by its operation-specific
/// suffix: handle-input has `input:u8`; already-has-species has
/// `enemy_mon_id:presence:u8,[party_index:u8]`; all others have no suffix.
///
/// A mon is `id_len:u32,id:utf8,species_len:u32,species:utf8,max_hp:u32,
/// hp:u32,status:u8,personality:u32,ability_num:u8,friendship:u8`. A rental
/// is `mon_id:u32,personality:u32,ivs:u32,ability_num:u8`. The full state then
/// carries all 17 phases, all cursor/pending/option/selection/quit/script/
/// mutation/result fields in source declaration order. Optional values use an
/// exact 0/1 presence tag; all enum/domain tags are checked before execution.
///
/// Output is `total_len:u32,status:u8`. Status 0 carries `value_kind:u8`
/// (0=state, 1=bool, 2=decision) and the complete value. Decisions use
/// `0=null,1=accept,2=decline`, with accept followed by two party indexes.
/// Status 1 carries `message_len:u32,message:utf8` for the two exact native
/// semantic errors. Status 2 carries the same message layout for every
/// structural error. Checked arithmetic, UTF-8 decoding, exact operation
/// suffixes, and full-packet consumption finish before semantic execution.
/// The caller frees the result with `fw_free(ptr,total_len)`.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_apply_factory_swap_operation(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_len == 0 {
        return alloc_and_copy(&encode_factory_swap_message(
            2,
            FACTORY_SWAP_MALFORMED_MESSAGE,
        ));
    }
    // SAFETY: the caller contract supplies exactly input_len readable bytes.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len as usize) };
    let output = match decode_factory_swap_packet(bytes) {
        Err(()) => encode_factory_swap_message(2, FACTORY_SWAP_MALFORMED_MESSAGE),
        Ok(packet) => match factory_swap_execute(packet) {
            Err(message) => encode_factory_swap_message(1, &message),
            Ok(value) => encode_factory_swap_value(value).unwrap_or_else(|()| {
                encode_factory_swap_message(2, FACTORY_SWAP_MALFORMED_MESSAGE)
            }),
        },
    };
    alloc_and_copy(&output)
}

// --- Factory draft-selection operation packet (additive ABI v1) ----------

const FACTORY_DRAFT_SELECTION_PACKET_VERSION: u8 = 1;
const FACTORY_DRAFT_SELECTION_MALFORMED_MESSAGE: &str =
    "factory-wasm factoryDraftSelectionEngine: malformed operation packet";

#[derive(Debug, Clone, PartialEq, Eq)]
struct FactoryDraftRentalSource {
    set_id: u32,
    personality: u32,
    fixed_iv: u32,
    ability_slot: u8,
    ot_id: Option<u32>,
    /// The optional six-IV spread as the GBA's own packed `MON_DATA_IVS`
    /// word (`pokemon.c:3997-4004`), carried verbatim: routing is IV-blind
    /// (`factory_draft_selection::selected_rental_party` is generic over
    /// `T: Clone`), so the boundary only has to round-trip it. Absent means
    /// the instance carries no `ivs` key at all, which is NOT the same as a
    /// uniform spread packed from `fixed_iv`.
    ivs_packed: Option<u32>,
}

#[derive(Debug)]
enum FactoryDraftSelectionPacket {
    SelectMonMessage(u8),
    ApplySelect(FactoryDraftSelectedIds, u8, u8),
    ApplyDeselect(FactoryDraftSelectedIds, u8, u8),
    IsMonsConfirmed(u8),
    ChosenMonSpecies(FactoryDraftSelectedIds, [String; FACTORY_DRAFT_SLOT_COUNT]),
    SelectedRentalParty(
        FactoryDraftSelectedIds,
        [FactoryDraftRentalSource; FACTORY_DRAFT_SLOT_COUNT],
    ),
    CursorMoveStallsBalls(String),
    MoveCursor(u8, FactoryDraftDirection),
    MoveMenuCursor(u8, FactoryDraftDirection),
    AdvanceCursorRedraw(Option<FactoryDraftCursorRedrawState>),
    AdvanceMenuHighlightRedraw(Option<FactoryDraftMenuHighlightRedrawState>),
    AdvanceRentConfirmRedraw(Option<(String, bool, u8)>),
}

#[derive(Debug)]
enum FactoryDraftSelectionValue {
    String(String),
    SelectionChange(FactoryDraftSelectionChange),
    Bool(bool),
    Species(Vec<String>),
    RentalParty([FactoryDraftRentalSource; 3]),
    Cursor(u8),
    CursorRedraw(Option<FactoryDraftCursorRedrawState>),
    MenuHighlightRedraw(Option<FactoryDraftMenuHighlightRedrawState>),
    RentConfirmRedraw(Option<(String, bool, u8)>),
}

fn factory_draft_selection_message(status: u8, message: &str) -> Vec<u8> {
    let mut buf = vec![0; 5];
    buf[4] = status;
    if factory_swap_write_string(&mut buf, message).is_err() {
        return vec![5, 0, 0, 0, 2];
    }
    patch_total_len(&mut buf);
    buf
}

fn factory_draft_bool(reader: &mut CheckedReader<'_>) -> Result<bool, ()> {
    match reader.u8()? {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err(()),
    }
}

fn factory_draft_selected_ids(
    reader: &mut CheckedReader<'_>,
    controller_domain: bool,
) -> Result<FactoryDraftSelectedIds, ()> {
    let mut values = [0; FACTORY_DRAFT_SLOT_COUNT];
    for value in &mut values {
        *value = reader.u8()?;
        if controller_domain && *value > 3 {
            return Err(());
        }
    }
    Ok(values)
}

fn factory_draft_selecting_state(reader: &mut CheckedReader<'_>) -> Result<u8, ()> {
    let value = reader.u8()?;
    (1..=4).contains(&value).then_some(value).ok_or(())
}

fn factory_draft_slot(reader: &mut CheckedReader<'_>) -> Result<u8, ()> {
    let value = reader.u8()?;
    (value < FACTORY_DRAFT_SLOT_COUNT as u8)
        .then_some(value)
        .ok_or(())
}

fn factory_draft_direction(reader: &mut CheckedReader<'_>) -> Result<FactoryDraftDirection, ()> {
    match reader.u8()? {
        0 => Ok(FactoryDraftDirection::Forward),
        1 => Ok(FactoryDraftDirection::Backward),
        _ => Err(()),
    }
}

fn factory_draft_presence(reader: &mut CheckedReader<'_>) -> Result<bool, ()> {
    match reader.u8()? {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err(()),
    }
}

fn decode_factory_draft_rental(
    reader: &mut CheckedReader<'_>,
) -> Result<FactoryDraftRentalSource, ()> {
    let set_id = reader.u32()?;
    let personality = reader.u32()?;
    let fixed_iv = reader.u32()?;
    let ability_slot = reader.u8()?;
    if ability_slot > 1 {
        return Err(());
    }
    let ot_id = if factory_draft_presence(reader)? {
        Some(reader.u32()?)
    } else {
        None
    };
    let ivs_packed = if factory_draft_presence(reader)? {
        Some(reader.u32()?)
    } else {
        None
    };
    Ok(FactoryDraftRentalSource { set_id, personality, fixed_iv, ability_slot, ot_id, ivs_packed })
}

fn decode_factory_draft_packet(bytes: &[u8]) -> Result<FactoryDraftSelectionPacket, ()> {
    let mut reader = CheckedReader::new(bytes);
    if reader.u8()? != FACTORY_DRAFT_SELECTION_PACKET_VERSION {
        return Err(());
    }
    let operation = match reader.u8()? {
        0 => FactoryDraftSelectionPacket::SelectMonMessage(factory_draft_selecting_state(
            &mut reader,
        )?),
        1 => {
            let selected_ids = factory_draft_selected_ids(&mut reader, true)?;
            let selecting_mons_state = factory_draft_selecting_state(&mut reader)?;
            if selecting_mons_state == 4 {
                return Err(());
            }
            FactoryDraftSelectionPacket::ApplySelect(
                selected_ids,
                selecting_mons_state,
                factory_draft_slot(&mut reader)?,
            )
        }
        2 => {
            let selected_ids = factory_draft_selected_ids(&mut reader, true)?;
            let selecting_mons_state = factory_draft_selecting_state(&mut reader)?;
            if selecting_mons_state == 1 {
                return Err(());
            }
            FactoryDraftSelectionPacket::ApplyDeselect(
                selected_ids,
                selecting_mons_state,
                factory_draft_slot(&mut reader)?,
            )
        }
        3 => FactoryDraftSelectionPacket::IsMonsConfirmed(factory_draft_selecting_state(
            &mut reader,
        )?),
        4 => {
            let selected_ids = factory_draft_selected_ids(&mut reader, false)?;
            let species = [
                reader.string()?,
                reader.string()?,
                reader.string()?,
                reader.string()?,
                reader.string()?,
                reader.string()?,
            ];
            FactoryDraftSelectionPacket::ChosenMonSpecies(selected_ids, species)
        }
        5 => {
            let selected_ids = factory_draft_selected_ids(&mut reader, false)?;
            let rentals = [
                decode_factory_draft_rental(&mut reader)?,
                decode_factory_draft_rental(&mut reader)?,
                decode_factory_draft_rental(&mut reader)?,
                decode_factory_draft_rental(&mut reader)?,
                decode_factory_draft_rental(&mut reader)?,
                decode_factory_draft_rental(&mut reader)?,
            ];
            FactoryDraftSelectionPacket::SelectedRentalParty(selected_ids, rentals)
        }
        6 => FactoryDraftSelectionPacket::CursorMoveStallsBalls(reader.string()?),
        7 => FactoryDraftSelectionPacket::MoveCursor(
            factory_draft_slot(&mut reader)?,
            factory_draft_direction(&mut reader)?,
        ),
        8 => {
            let cursor = reader.u8()?;
            if cursor > 2 {
                return Err(());
            }
            FactoryDraftSelectionPacket::MoveMenuCursor(
                cursor,
                factory_draft_direction(&mut reader)?,
            )
        }
        9 => {
            let state = if factory_draft_presence(&mut reader)? {
                let from_cursor_pos = factory_draft_slot(&mut reader)?;
                let elapsed = reader.u8()?;
                let fast = factory_draft_bool(&mut reader)?;
                if elapsed > if fast { 1 } else { 2 } {
                    return Err(());
                }
                Some(FactoryDraftCursorRedrawState { from_cursor_pos, elapsed, fast })
            } else {
                None
            };
            FactoryDraftSelectionPacket::AdvanceCursorRedraw(state)
        }
        10 => {
            let state = if factory_draft_presence(&mut reader)? {
                let from_menu_cursor_pos = reader.u8()?;
                let elapsed = reader.u8()?;
                if from_menu_cursor_pos > 2 || elapsed > 1 {
                    return Err(());
                }
                Some(FactoryDraftMenuHighlightRedrawState { from_menu_cursor_pos, elapsed })
            } else {
                None
            };
            FactoryDraftSelectionPacket::AdvanceMenuHighlightRedraw(state)
        }
        11 => {
            let state = if factory_draft_presence(&mut reader)? {
                let from_message = reader.string()?;
                let from_selected = factory_draft_bool(&mut reader)?;
                let elapsed = reader.u8()?;
                if elapsed > 1 {
                    return Err(());
                }
                Some((from_message, from_selected, elapsed))
            } else {
                None
            };
            FactoryDraftSelectionPacket::AdvanceRentConfirmRedraw(state)
        }
        _ => return Err(()),
    };
    reader.finish()?;
    Ok(operation)
}

fn execute_factory_draft_selection(
    packet: FactoryDraftSelectionPacket,
) -> Result<FactoryDraftSelectionValue, String> {
    Ok(match packet {
        FactoryDraftSelectionPacket::SelectMonMessage(state) => FactoryDraftSelectionValue::String(
            factory_draft_selection::select_mon_message(state).to_owned(),
        ),
        FactoryDraftSelectionPacket::ApplySelect(ids, state, slot) => {
            FactoryDraftSelectionValue::SelectionChange(factory_draft_selection::apply_select(
                &ids, state, slot,
            ))
        }
        FactoryDraftSelectionPacket::ApplyDeselect(ids, state, slot) => {
            FactoryDraftSelectionValue::SelectionChange(factory_draft_selection::apply_deselect(
                &ids, state, slot,
            ))
        }
        FactoryDraftSelectionPacket::IsMonsConfirmed(state) => {
            FactoryDraftSelectionValue::Bool(factory_draft_selection::is_mons_confirmed(state))
        }
        FactoryDraftSelectionPacket::ChosenMonSpecies(ids, species) => {
            let borrowed = std::array::from_fn(|index| species[index].as_str());
            FactoryDraftSelectionValue::Species(
                factory_draft_selection::chosen_mon_species(&ids, &borrowed)
                    .into_iter()
                    .map(str::to_owned)
                    .collect(),
            )
        }
        FactoryDraftSelectionPacket::SelectedRentalParty(ids, rentals) => {
            FactoryDraftSelectionValue::RentalParty(
                factory_draft_selection::selected_rental_party(&ids, &rentals)
                    .map_err(|error| error.to_string())?,
            )
        }
        FactoryDraftSelectionPacket::CursorMoveStallsBalls(species) => {
            FactoryDraftSelectionValue::Bool(factory_draft_selection::cursor_move_stalls_balls(
                &species,
            ))
        }
        FactoryDraftSelectionPacket::MoveCursor(cursor, direction) => {
            FactoryDraftSelectionValue::Cursor(factory_draft_selection::move_cursor(
                cursor, direction,
            ))
        }
        FactoryDraftSelectionPacket::MoveMenuCursor(cursor, direction) => {
            FactoryDraftSelectionValue::Cursor(factory_draft_selection::move_menu_cursor(
                cursor, direction,
            ))
        }
        FactoryDraftSelectionPacket::AdvanceCursorRedraw(state) => {
            FactoryDraftSelectionValue::CursorRedraw(
                factory_draft_selection::advance_cursor_redraw(state),
            )
        }
        FactoryDraftSelectionPacket::AdvanceMenuHighlightRedraw(state) => {
            FactoryDraftSelectionValue::MenuHighlightRedraw(
                factory_draft_selection::advance_menu_highlight_redraw(state),
            )
        }
        FactoryDraftSelectionPacket::AdvanceRentConfirmRedraw(state) => {
            let borrowed = state.as_ref().map(|(message, from_selected, elapsed)| {
                FactoryDraftRentConfirmRedrawState {
                    from_message: message.as_str(),
                    from_selected: *from_selected,
                    elapsed: *elapsed,
                }
            });
            FactoryDraftSelectionValue::RentConfirmRedraw(
                factory_draft_selection::advance_rent_confirm_redraw(borrowed).map(|result| {
                    (
                        result.from_message.to_owned(),
                        result.from_selected,
                        result.elapsed,
                    )
                }),
            )
        }
    })
}

fn encode_factory_draft_rental(buf: &mut Vec<u8>, rental: &FactoryDraftRentalSource) {
    buf.extend_from_slice(&rental.set_id.to_le_bytes());
    buf.extend_from_slice(&rental.personality.to_le_bytes());
    buf.extend_from_slice(&rental.fixed_iv.to_le_bytes());
    buf.push(rental.ability_slot);
    match rental.ot_id {
        None => buf.push(0),
        Some(value) => {
            buf.push(1);
            buf.extend_from_slice(&value.to_le_bytes());
        }
    }
    match rental.ivs_packed {
        None => buf.push(0),
        Some(value) => {
            buf.push(1);
            buf.extend_from_slice(&value.to_le_bytes());
        }
    }
}

fn encode_factory_draft_value(value: FactoryDraftSelectionValue) -> Result<Vec<u8>, ()> {
    let mut buf = vec![0; 6];
    match value {
        FactoryDraftSelectionValue::String(value) => {
            buf[5] = 0;
            factory_swap_write_string(&mut buf, &value)?;
        }
        FactoryDraftSelectionValue::SelectionChange(value) => {
            buf[5] = 1;
            buf.extend_from_slice(&value.selected_ids);
            buf.push(value.selecting_mons_state);
        }
        FactoryDraftSelectionValue::Bool(value) => {
            buf[5] = 2;
            buf.push(u8::from(value));
        }
        FactoryDraftSelectionValue::Species(values) => {
            buf[5] = 3;
            buf.push(u8::try_from(values.len()).map_err(|_| ())?);
            for value in values {
                factory_swap_write_string(&mut buf, &value)?;
            }
        }
        FactoryDraftSelectionValue::RentalParty(values) => {
            buf[5] = 4;
            for value in &values {
                encode_factory_draft_rental(&mut buf, value);
            }
        }
        FactoryDraftSelectionValue::Cursor(value) => {
            buf[5] = 5;
            buf.push(value);
        }
        FactoryDraftSelectionValue::CursorRedraw(value) => {
            buf[5] = 6;
            match value {
                None => buf.push(0),
                Some(value) => buf.extend_from_slice(&[
                    1,
                    value.from_cursor_pos,
                    value.elapsed,
                    u8::from(value.fast),
                ]),
            }
        }
        FactoryDraftSelectionValue::MenuHighlightRedraw(value) => {
            buf[5] = 7;
            match value {
                None => buf.push(0),
                Some(value) => {
                    buf.extend_from_slice(&[1, value.from_menu_cursor_pos, value.elapsed]);
                }
            }
        }
        FactoryDraftSelectionValue::RentConfirmRedraw(value) => {
            buf[5] = 8;
            match value {
                None => buf.push(0),
                Some((message, selected, elapsed)) => {
                    buf.push(1);
                    factory_swap_write_string(&mut buf, &message)?;
                    buf.extend_from_slice(&[u8::from(selected), elapsed]);
                }
            }
        }
    }
    patch_total_len(&mut buf);
    Ok(buf)
}

/// Executes one of the twelve presentation-free Factory draft-selection
/// helpers through one additive ABI-v1 packet. Input begins
/// `version:u8=1,operation:u8`, with tags 0..11 in this order:
/// selectMonMessage, applySelect, applyDeselect, isMonsConfirmed,
/// chosenMonSpecies, selectedRentalParty, cursorMoveStallsBalls, moveCursor,
/// moveMenuCursor, advanceCursorRedraw, advanceMenuHighlightRedraw,
/// advanceRentConfirmRedraw.
///
/// Suffixes are operation-specific: selection changes carry
/// `selected_ids:u8[6],selecting_state:u8,slot:u8`; confirmation/message carry
/// `selecting_state:u8`; chosen species carries `selected_ids:u8[6]` then six
/// strings; selected rentals carries `selected_ids:u8[6]` then six records;
/// stall carries one string; cursor moves carry `cursor:u8,direction:u8`
/// (0=forward,1=backward). Redraws carry `presence:u8`; present cursor redraw
/// is `from_cursor:u8,elapsed:u8,fast:u8`, menu redraw is
/// `from_menu:u8,elapsed:u8`, and rent redraw is
/// `from_message:string,from_selected:u8,elapsed:u8`.
///
/// A string is `byte_len:u32,utf8`. A rental record is
/// `set_id:u32,personality:u32,fixed_iv:u32,ability_slot:u8,
/// ot_id_presence:u8,[ot_id:u32],ivs_presence:u8,[ivs_packed:u32]`,
/// preserving absent versus present zero for both optionals. `ivs_packed` is
/// the GBA's own `MON_DATA_IVS` word (`pokemon.c:3997-4004`,
/// `hp|atk<<5|def<<10|speed<<15|spatk<<20|spdef<<25`) — the same argument
/// `fw_create_factory_party_member_with_ivs` takes — and crosses verbatim,
/// since routing never reads it.
/// Controller ranks/cursors/states/elapsed values, directions, booleans,
/// presence tags, UTF-8, lengths, exact suffixes, and full consumption are
/// checked before execution. Projection rank cells intentionally retain the
/// full u8 domain so native semantic rank errors cross as status 1.
///
/// Output is `total_len:u32,status:u8`. Status 0 adds `value_kind:u8`:
/// 0=string, 1=selection change (`selected_ids:u8[6],state:u8`), 2=bool,
/// 3=species (`count:u8,string[count]`), 4=exactly three rental records,
/// 5=cursor, 6=optional cursor redraw, 7=optional menu redraw, 8=optional
/// rent redraw. Status 1 is an exact native selectedRentalParty semantic
/// error; status 2 is the single stable malformed-packet message. Both error
/// statuses carry `message:string`. The caller frees `(ptr,total_len)`.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn fw_apply_factory_draft_selection_operation(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_len == 0 {
        return alloc_and_copy(&factory_draft_selection_message(
            2,
            FACTORY_DRAFT_SELECTION_MALFORMED_MESSAGE,
        ));
    }
    // SAFETY: the caller contract supplies exactly input_len readable bytes.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len as usize) };
    let output = match decode_factory_draft_packet(bytes) {
        Err(()) => factory_draft_selection_message(2, FACTORY_DRAFT_SELECTION_MALFORMED_MESSAGE),
        Ok(packet) => match execute_factory_draft_selection(packet) {
            Err(message) => factory_draft_selection_message(1, &message),
            Ok(value) => encode_factory_draft_value(value).unwrap_or_else(|()| {
                factory_draft_selection_message(2, FACTORY_DRAFT_SELECTION_MALFORMED_MESSAGE)
            }),
        },
    };
    alloc_and_copy(&output)
}

// --- Key-repeat operation packet (additive ABI v1) -----------------------

const KEY_REPEAT_PACKET_VERSION: u8 = 1;
const KEY_REPEAT_MALFORMED_MESSAGE: &str =
    "factory-wasm keyRepeatEngine: malformed operation packet";

#[derive(Debug)]
enum KeyRepeatPacket {
    ReadKeys {
        buttons: GbaButtonMask,
        previous: KeyRepeatState,
    },
    HasButton {
        keys: GbaButtonMask,
        button: GbaButton,
    },
    InitialState,
}

#[derive(Debug)]
enum KeyRepeatBoundaryValue {
    KeyFrame(KeyFrame),
    Bool(bool),
    State(KeyRepeatState),
}

fn key_repeat_message(status: u8, message: &str) -> Vec<u8> {
    let bytes = message.as_bytes();
    let mut buf = Vec::with_capacity(9 + bytes.len());
    buf.extend_from_slice(&0u32.to_le_bytes());
    buf.push(status);
    buf.extend_from_slice(&u32::try_from(bytes.len()).unwrap_or(u32::MAX).to_le_bytes());
    buf.extend_from_slice(bytes);
    patch_total_len(&mut buf);
    buf
}

fn key_repeat_mask(reader: &mut CheckedReader<'_>) -> Result<GbaButtonMask, ()> {
    GbaButtonMask::try_from(reader.u16()?).map_err(|_| ())
}

fn key_repeat_counter(reader: &mut CheckedReader<'_>) -> Result<KeyRepeatCounter, ()> {
    KeyRepeatCounter::try_from(reader.u8()?).map_err(|_| ())
}

fn key_repeat_button(reader: &mut CheckedReader<'_>) -> Result<GbaButton, ()> {
    GbaButton::try_from(reader.u8()?).map_err(|_| ())
}

fn decode_key_repeat_packet(bytes: &[u8]) -> Result<KeyRepeatPacket, ()> {
    let mut reader = CheckedReader::new(bytes);
    if reader.u8()? != KEY_REPEAT_PACKET_VERSION {
        return Err(());
    }
    let packet = match reader.u8()? {
        // `readKeys(buttons, { heldKeysRaw, keyRepeatCounter })`.
        0 => KeyRepeatPacket::ReadKeys {
            buttons: key_repeat_mask(&mut reader)?,
            previous: KeyRepeatState {
                held_keys_raw: key_repeat_mask(&mut reader)?,
                key_repeat_counter: key_repeat_counter(&mut reader)?,
            },
        },
        // `hasButton(keys, button)`.
        1 => KeyRepeatPacket::HasButton {
            keys: key_repeat_mask(&mut reader)?,
            button: key_repeat_button(&mut reader)?,
        },
        // The complete `INITIAL_KEY_REPEAT_STATE` surface has no suffix.
        2 => KeyRepeatPacket::InitialState,
        _ => return Err(()),
    };
    reader.finish()?;
    Ok(packet)
}

fn execute_key_repeat(packet: KeyRepeatPacket) -> KeyRepeatBoundaryValue {
    match packet {
        KeyRepeatPacket::ReadKeys { buttons, previous } => {
            KeyRepeatBoundaryValue::KeyFrame(key_repeat::read_keys(buttons, previous))
        }
        KeyRepeatPacket::HasButton { keys, button } => {
            KeyRepeatBoundaryValue::Bool(key_repeat::has_button(keys, button))
        }
        KeyRepeatPacket::InitialState => {
            KeyRepeatBoundaryValue::State(key_repeat::INITIAL_KEY_REPEAT_STATE)
        }
    }
}

fn encode_key_repeat_value(value: KeyRepeatBoundaryValue) -> Vec<u8> {
    // total_len:u32, status:u8=0, value_kind:u8
    let mut buf = vec![0; 6];
    match value {
        // kind 0: newKeys, newAndRepeatedKeys, next held mask, next counter.
        KeyRepeatBoundaryValue::KeyFrame(frame) => {
            buf[5] = 0;
            buf.extend_from_slice(&frame.new_keys.bits().to_le_bytes());
            buf.extend_from_slice(&frame.new_and_repeated_keys.bits().to_le_bytes());
            buf.extend_from_slice(&frame.next.held_keys_raw.bits().to_le_bytes());
            buf.push(frame.next.key_repeat_counter.get());
        }
        // kind 1: canonical boolean as exactly 0/1.
        KeyRepeatBoundaryValue::Bool(value) => {
            buf[5] = 1;
            buf.push(u8::from(value));
        }
        // kind 2: `INITIAL_KEY_REPEAT_STATE` / state-shaped result.
        KeyRepeatBoundaryValue::State(state) => {
            buf[5] = 2;
            buf.extend_from_slice(&state.held_keys_raw.bits().to_le_bytes());
            buf.push(state.key_repeat_counter.get());
        }
    }
    patch_total_len(&mut buf);
    buf
}

/// Runs the complete pure `src/engine/keyRepeat.ts` surface through one
/// checked additive ABI-v1 operation packet. Input begins
/// `version:u8=1, operation:u8`; operation 0 is `readKeys`, operation 1 is
/// `hasButton`, and operation 2 returns `INITIAL_KEY_REPEAT_STATE`.
///
/// ```text
/// 0 readKeys: buttons:u16, prev_held_keys_raw:u16, prev_counter:u8
/// 1 hasButton: keys:u16, button:u8 (GBA_BUTTONS index)
/// 2 initial: no suffix
/// ```
///
/// Button masks are exactly the ten low bits in canonical `GBA_BUTTONS`
/// order A, B, SELECT, START, RIGHT, LEFT, UP, DOWN, R, L; any unused u16
/// bit is structural. `prev_counter` is exactly the reachable 1..=40 native
/// controller-state domain, and button indexes are 0..=9. Version, operation,
/// masks, counter, button, truncation, append, suffix shape, and complete
/// consumption are all checked before pure execution.
///
/// Output is `total_len:u32,status:u8`. Status 0 adds `value_kind:u8`:
/// 0=`readKeys` (`new_keys:u16,new_and_repeated_keys:u16,next_held:u16,
/// next_counter:u8`), 1=`hasButton` (`value:u8` exactly 0/1), and 2=initial
/// state (`held_keys_raw:u16,counter:u8`). Status 2 is the one stable
/// malformed-packet message (`message_len:u32,message:utf8`); this surface
/// has no semantic status because every valid packet has a typed result. The
/// caller frees the result with `fw_free(ptr,total_len)`.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes whenever
/// `input_len` is nonzero. Null or empty input is rejected without dereference.
#[no_mangle]
pub unsafe extern "C" fn fw_apply_key_repeat_operation(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_len == 0 || input_ptr.is_null() {
        return alloc_and_copy(&key_repeat_message(2, KEY_REPEAT_MALFORMED_MESSAGE));
    }
    // SAFETY: the non-null/width guards above plus caller contract establish
    // exactly `input_len` readable initialized bytes.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len as usize) };
    let output = match decode_key_repeat_packet(bytes) {
        Err(()) => key_repeat_message(2, KEY_REPEAT_MALFORMED_MESSAGE),
        Ok(packet) => encode_key_repeat_value(execute_key_repeat(packet)),
    };
    alloc_and_copy(&output)
}

// --- Factory AI live-view constructor (additive ABI v1) ------------------

const FACTORY_AI_LIVE_VIEW_MALFORMED_MESSAGE: &str =
    "factory-wasm factoryAiLiveViewEngine: malformed input";

fn encode_live_view_message(status: u8, message: &str) -> Vec<u8> {
    let mut buf = vec![0; 5];
    buf[4] = status;
    let message_len = u32::try_from(message.len()).unwrap_or(u32::MAX);
    buf.extend_from_slice(&message_len.to_le_bytes());
    buf.extend_from_slice(message.as_bytes());
    patch_total_len(&mut buf);
    buf
}

fn encode_live_view_string(buf: &mut Vec<u8>, value: &str) -> Result<(), ()> {
    let length = u32::try_from(value.len()).map_err(|_| ())?;
    buf.extend_from_slice(&length.to_le_bytes());
    buf.extend_from_slice(value.as_bytes());
    Ok(())
}

fn encode_live_view_f64(buf: &mut Vec<u8>, value: f64) {
    buf.extend_from_slice(&value.to_le_bytes());
}

fn encode_live_view_optional_bool(buf: &mut Vec<u8>, value: Option<bool>) {
    match value {
        None => buf.push(0),
        Some(value) => {
            buf.push(1);
            buf.push(u8::from(value));
        }
    }
}

fn encode_live_view_stat_stages(
    buf: &mut Vec<u8>,
    stages: &factory_ai_live_view::FactoryAiStatStages,
) {
    encode_live_view_f64(buf, stages.atk);
    encode_live_view_f64(buf, stages.def);
    encode_live_view_f64(buf, stages.speed);
    encode_live_view_f64(buf, stages.sp_atk);
    encode_live_view_f64(buf, stages.sp_def);
    encode_live_view_f64(buf, stages.acc);
    encode_live_view_f64(buf, stages.evasion);
}

fn encode_live_view_battler(buf: &mut Vec<u8>, battler: &LiveScoredBattlerView) -> Result<(), ()> {
    encode_live_view_string(buf, &battler.types[0])?;
    encode_live_view_string(buf, &battler.types[1])?;
    encode_live_view_f64(buf, battler.attack);
    encode_live_view_f64(buf, battler.defense);
    encode_live_view_f64(buf, battler.sp_attack);
    encode_live_view_f64(buf, battler.sp_defense);
    encode_live_view_f64(buf, battler.speed);
    encode_live_view_f64(buf, battler.level);
    encode_live_view_stat_stages(buf, &battler.stat_stages);
    encode_live_view_f64(buf, battler.is_first_turn);
    encode_live_view_f64(buf, battler.hp);
    encode_live_view_f64(buf, battler.max_hp);
    encode_live_view_string(buf, &battler.ability)?;
    encode_live_view_f64(buf, battler.battle_turn_count);
    buf.push(u8::from(battler.light_screen_up));
    buf.push(u8::from(battler.reflect_up));
    match battler.current_weather {
        None => buf.push(0),
        Some(weather) => {
            buf.push(1);
            buf.push(weather.ai_weather_value());
        }
    }
    buf.push(u8::from(battler.is_rooted));
    encode_live_view_optional_bool(buf, battler.attacker_future_attack_up);
    encode_live_view_optional_bool(buf, battler.is_infatuated);
    encode_live_view_optional_bool(buf, battler.safeguard_up);
    encode_live_view_optional_bool(buf, battler.is_asleep);
    encode_live_view_optional_bool(buf, battler.has_curable_status);
    encode_live_view_optional_bool(buf, battler.has_substitute);
    encode_live_view_optional_bool(buf, battler.has_focus_energy);
    encode_live_view_optional_bool(buf, battler.is_leech_seeded);
    encode_live_view_optional_bool(buf, battler.has_yawn);
    match battler.protect_uses {
        None => buf.push(0),
        Some(value) => {
            buf.push(1);
            encode_live_view_f64(buf, value);
        }
    }
    Ok(())
}

fn encode_live_view_target(buf: &mut Vec<u8>, target: &LiveScoredTargetView) -> Result<(), ()> {
    encode_live_view_f64(buf, target.species);
    encode_live_view_string(buf, &target.types[0])?;
    encode_live_view_string(buf, &target.types[1])?;
    encode_live_view_f64(buf, target.attack);
    encode_live_view_f64(buf, target.defense);
    encode_live_view_f64(buf, target.sp_attack);
    encode_live_view_f64(buf, target.sp_defense);
    encode_live_view_f64(buf, target.speed);
    encode_live_view_f64(buf, target.level);
    encode_live_view_stat_stages(buf, &target.stat_stages);
    encode_live_view_f64(buf, target.is_first_turn);
    encode_live_view_f64(buf, target.hp);
    encode_live_view_f64(buf, target.max_hp);
    encode_live_view_f64(buf, target.last_used_move_id);
    encode_live_view_optional_bool(buf, target.has_any_status);
    encode_live_view_optional_bool(buf, target.is_asleep);
    buf.push(u8::from(target.is_toxic_poisoned));
    buf.push(u8::from(target.is_leech_seeded));
    buf.push(u8::from(target.is_cursed));
    encode_live_view_optional_bool(buf, target.is_confused);
    encode_live_view_optional_bool(buf, target.is_taunted);
    encode_live_view_optional_bool(buf, target.is_infatuated);
    encode_live_view_optional_bool(buf, target.is_escape_prevented);
    encode_live_view_optional_bool(buf, target.is_tormented);
    encode_live_view_optional_bool(buf, target.is_nightmared);
    encode_live_view_optional_bool(buf, target.is_foresighted);
    encode_live_view_optional_bool(buf, target.has_yawn);
    encode_live_view_optional_bool(buf, target.has_perish_song);
    encode_live_view_string(buf, &target.ability)?;
    match &target.known_ability {
        None => buf.push(0),
        Some(value) => {
            buf.push(1);
            encode_live_view_string(buf, value)?;
        }
    }
    encode_live_view_f64(buf, target.known_item_effect);
    match &target.known_move_ids {
        None => buf.push(0),
        Some(moves) => {
            buf.push(1);
            let count = u32::try_from(moves.len()).map_err(|_| ())?;
            buf.extend_from_slice(&count.to_le_bytes());
            for move_id in moves {
                encode_live_view_f64(buf, *move_id);
            }
        }
    }
    encode_live_view_optional_bool(buf, target.safeguard_up);
    encode_live_view_optional_bool(buf, target.spikes_up);
    encode_live_view_optional_bool(buf, target.target_future_attack_up);
    Ok(())
}

fn encode_live_view_success(
    view: factory_ai_live_view::FactoryAiScoredView,
) -> Result<Vec<u8>, ()> {
    let mut buf = vec![0; 5];
    encode_live_view_string(&mut buf, view.schema)?;
    encode_live_view_string(&mut buf, view.mode)?;
    encode_live_view_f64(&mut buf, f64::from(view.active.ai_battler));
    encode_live_view_f64(&mut buf, f64::from(view.active.target_battler));
    encode_live_view_f64(&mut buf, f64::from(view.factory.level_mode));
    encode_live_view_f64(&mut buf, f64::from(view.factory.battle_mode));
    encode_live_view_f64(&mut buf, view.factory.factory_win_streak);
    encode_live_view_f64(&mut buf, view.factory.trainer_opponent_id);
    for move_id in view.moves {
        encode_live_view_f64(&mut buf, move_id);
    }
    encode_live_view_battler(&mut buf, &view.attacker)?;
    encode_live_view_target(&mut buf, &view.target)?;
    buf[4] = 0;
    if buf.len() > u32::MAX as usize {
        return Err(());
    }
    patch_total_len(&mut buf);
    Ok(buf)
}

fn decode_live_view_battler(reader: &mut CheckedReader) -> Result<FactoryAiLiveRulesBattler, ()> {
    Ok(FactoryAiLiveRulesBattler {
        types: [reader.string()?, reader.string()?],
        attack: reader.f64()?,
        defense: reader.f64()?,
        sp_attack: reader.f64()?,
        sp_defense: reader.f64()?,
        speed: reader.f64()?,
        level: reader.f64()?,
        stat_stages: [
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
        ],
        is_first_turn: reader.f64()?,
        hp: reader.f64()?,
        max_hp: reader.f64()?,
        ability: reader.f64()?,
        status1: reader.f64()?,
        status2: reader.f64()?,
        status3: reader.f64()?,
        protect_uses: reader.f64()?,
        taunt_timer: reader.f64()?,
        species: reader.f64()?,
        moves: [reader.f64()?, reader.f64()?, reader.f64()?, reader.f64()?],
    })
}

fn decode_live_view_rules(reader: &mut CheckedReader) -> Result<FactoryAiLiveRulesContext, ()> {
    Ok(FactoryAiLiveRulesContext {
        battlers: [
            decode_live_view_battler(reader)?,
            decode_live_view_battler(reader)?,
            decode_live_view_battler(reader)?,
            decode_live_view_battler(reader)?,
        ],
        weather: reader.f64()?,
        side_statuses: [reader.f64()?, reader.f64()?],
        last_moves: reader.f64x4()?,
    })
}

fn decode_live_view_challenge(reader: &mut CheckedReader) -> Result<FactoryAiChallengePolicy, ()> {
    let factory_win_streak = reader.f64()?;
    let trainer_opponent_id = reader.f64()?;
    let battle_turn_count = match reader.u8()? {
        0 => None,
        1 => Some(reader.f64()?),
        _ => return Err(()),
    };
    Ok(FactoryAiChallengePolicy { factory_win_streak, trainer_opponent_id, battle_turn_count })
}

fn encode_live_view_result(
    result: Result<
        factory_ai_live_view::FactoryAiScoredView,
        factory_ai_live_view::FactoryAiLiveViewError,
    >,
) -> Vec<u8> {
    match result {
        Ok(view) => encode_live_view_success(view).unwrap_or_else(|()| {
            encode_live_view_message(2, FACTORY_AI_LIVE_VIEW_MALFORMED_MESSAGE)
        }),
        Err(error) => encode_live_view_message(1, &error.to_string()),
    }
}

/// Constructs the complete source-shaped Factory AI live view through an
/// additive ABI-v1 packet. The constructor itself is pure: this export does
/// not execute a decision, synchronize history, select a switch, or own a
/// battle clock.
///
/// # Input layout (all integers little-endian)
///
/// The input is variable-width and has no redundant prefix; `input_len` is
/// the caller-provided packet length. A `string` is `byte_len:u32,utf8`.
/// Every JavaScript `number` below is an IEEE-754 `f64`, including history
/// values and challenge fields. The packet is, in order:
///
/// ```text
/// rules.battlers[4]:
///   types:string[2], attack:f64, defense:f64, sp_attack:f64,
///   sp_defense:f64, speed:f64, level:f64, stat_stages:f64[8],
///   is_first_turn:f64, hp:f64, max_hp:f64, ability:f64,
///   status1:f64, status2:f64, status3:f64, protect_uses:f64,
///   taunt_timer:f64, species:f64, moves:f64[4]
/// rules.weather:f64, rules.side_statuses:f64[2], rules.last_moves:f64[4]
/// history.used_moves[4]: move_count:u32, moves:f64[move_count]
/// history.known_abilities[4]: present:u8 (0/1), [if present] string
/// history.known_item_effects:f64[4], history.party_indexes:f64[4]
/// challenge.factory_win_streak:f64, challenge.trainer_opponent_id:f64,
/// challenge.battle_turn_count:present:u8 (0/1), [if present] f64
/// ```
///
/// Counts, string widths, presence tags, UTF-8, and exact packet
/// consumption are checked before the native constructor runs. Output is an
/// `fw_alloc`'d length-prefixed packet, freed with `fw_free(ptr,total_len)`:
///
/// ```text
/// total_len:u32, status:u8
/// status 0: schema:string, mode:string, active.ai_battler:f64,
///   active.target_battler:f64, factory.level_mode:f64,
///   factory.battle_mode:f64, factory.factory_win_streak:f64,
///   factory.trainer_opponent_id:f64, moves:f64[4], attacker, target
/// status 1/2: message_len:u32, message:utf8
/// ```
///
/// The status-0 `attacker` fields are the two type strings, five stat f64s,
/// level, seven stat-stage f64s in `atk,def,speed,sp_atk,sp_def,acc,evasion`
/// order, `is_first_turn`, `hp`, `max_hp`, ability string,
/// `battle_turn_count`, unconditional boolean bytes
/// `light_screen_up,reflect_up`, weather presence plus weather byte,
/// unconditional `is_rooted`, then optional booleans (presence byte followed
/// by value byte when present) in source order:
/// `attacker_future_attack_up,is_infatuated,safeguard_up,is_asleep,
/// has_curable_status,has_substitute,has_focus_energy,is_leech_seeded,
/// has_yawn`, and optional `protect_uses` (presence plus f64). The target is
/// encoded in source property order with species first, the same common stat
/// fields, `last_used_move_id`, optional `has_any_status,is_asleep`,
/// unconditional `is_toxic_poisoned,is_leech_seeded,is_cursed`, optional
/// `is_confused,is_taunted,is_infatuated,is_escape_prevented,is_tormented,
/// is_nightmared,is_foresighted,has_yawn,has_perish_song`, ability string,
/// required-but-nullable `known_ability` presence/string, `known_item_effect`,
/// optional `known_move_ids` presence/count/f64 values, and optional
/// `safeguard_up,spikes_up,target_future_attack_up`. Status 1 is a typed
/// unknown-ability error carrying the exact canonical constructor message;
/// status 2 is the malformed-packet message below.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes. A null
/// pointer is treated as malformed when `input_len` is nonzero as an extra
/// fail-closed guard for boundary callers.
#[no_mangle]
pub unsafe extern "C" fn fw_create_factory_ai_view_from_live_rules(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_ptr.is_null() && input_len != 0 {
        return alloc_and_copy(&encode_live_view_message(
            2,
            FACTORY_AI_LIVE_VIEW_MALFORMED_MESSAGE,
        ));
    }
    let input_len = input_len as usize;
    if input_len == 0 {
        return alloc_and_copy(&encode_live_view_message(
            2,
            FACTORY_AI_LIVE_VIEW_MALFORMED_MESSAGE,
        ));
    }
    // SAFETY: nonzero width, non-null pointer guard, and caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len) };
    let result =
        (|| {
            let mut reader = CheckedReader::new(bytes);
            let rules = decode_live_view_rules(&mut reader)?;
            let history = decode_battle_history(&mut reader)?;
            let challenge = decode_live_view_challenge(&mut reader)?;
            reader.finish()?;
            Ok(
                factory_ai_live_view::create_factory_ai_view_from_live_rules(
                    FactoryAiLiveViewInput { rules_context: &rules, history: &history, challenge },
                ),
            )
        })();
    match result {
        Ok(result) => alloc_and_copy(&encode_live_view_result(result)),
        Err(()) => alloc_and_copy(&encode_live_view_message(
            2,
            FACTORY_AI_LIVE_VIEW_MALFORMED_MESSAGE,
        )),
    }
}

// --- Factory AI live-view -> move chooser (additive ABI v1) -------------

const FACTORY_AI_LIVE_DECISION_MALFORMED_MESSAGE: &str =
    "factory-wasm factoryAiLiveDecisionEngine: malformed input";

#[derive(Debug)]
struct LiveDecisionRequestWire {
    kind: u8,
    request_id: u32,
    side: u8,
    battler: u8,
    legal_decisions: Vec<(u8, u8, u8)>,
}

fn decode_live_decision_request(reader: &mut CheckedReader) -> Result<LiveDecisionRequestWire, ()> {
    let kind = reader.u8()?;
    let request_id = reader.u32()?;
    let side = reader.u8()?;
    let battler = reader.u8()?;
    let legal_count = reader.u8()? as usize;
    let mut legal_decisions = Vec::with_capacity(legal_count);
    for _ in 0..legal_count {
        legal_decisions.push((reader.u8()?, reader.u8()?, reader.u8()?));
    }
    Ok(LiveDecisionRequestWire { kind, request_id, side, battler, legal_decisions })
}

fn validate_live_decision_request(
    wire: LiveDecisionRequestWire,
) -> Result<
    (
        FactoryAiRequestKind,
        u32,
        FactoryAiDecisionSide,
        u8,
        Vec<FactoryAiLegalDecision>,
    ),
    String,
> {
    let kind = match wire.kind {
        0 => FactoryAiRequestKind::Command,
        1 => FactoryAiRequestKind::ForcedSwitch,
        value => {
            return Err(format!(
                "factory-wasm factoryAiEngine: invalid request kind {value}"
            ))
        }
    };
    let side = match wire.side {
        0 => FactoryAiDecisionSide::Player,
        1 => FactoryAiDecisionSide::Trainer,
        value => {
            return Err(format!(
                "factory-wasm factoryAiEngine: invalid request side {value}"
            ))
        }
    };
    if wire.legal_decisions.is_empty() {
        return Err(
            "Battle command request.legalDecisions must be a non-empty array, got ".to_owned(),
        );
    }
    let mut legal_decisions = Vec::with_capacity(wire.legal_decisions.len());
    for (tag, first, second) in wire.legal_decisions {
        legal_decisions.push(match tag {
            0 => FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
                move_slot: policy_move_slot(first)?,
                target_battler: second,
            }),
            1 => FactoryAiLegalDecision::Switch { party_index: first },
            value => {
                return Err(format!(
                    "factory-wasm factoryAiEngine: invalid legal decision tag {value}"
                ))
            }
        });
    }
    Ok((kind, wire.request_id, side, wire.battler, legal_decisions))
}

fn decode_live_decision_turn_start(reader: &mut CheckedReader) -> Result<(u8, u16), ()> {
    Ok((reader.u8()?, reader.u16()?))
}

fn validate_live_decision_turn_start(
    owner: u8,
    value: u16,
) -> Result<Option<FactoryAiTurnStartRandomNumber>, String> {
    match owner {
        0 => Ok(None),
        1 => Ok(Some(FactoryAiTurnStartRandomNumber::Decision)),
        2 => Ok(Some(FactoryAiTurnStartRandomNumber::BattleTurnBoundary {
            value,
        })),
        owner => Err(format!(
            "factory-wasm factoryAiEngine: invalid turn-start owner {owner}"
        )),
    }
}

fn encode_live_decision_choice(choice: FactoryAiLiveDecisionChoice) -> Vec<u8> {
    match choice {
        FactoryAiLiveDecisionChoice::MaskZero(choice) => encode_mask_zero_choice(Ok(choice)),
        FactoryAiLiveDecisionChoice::Scored(choice) => encode_scored_choice(Ok(choice)),
    }
}

/// Runs the complete live Factory AI move chooser through one additive
/// ABI-v1 packet. The source-shaped rules/history/challenge prefix is exactly
/// the `fw_create_factory_ai_view_from_live_rules` input; the suffix adds the
/// authoritative request, RNG cursor, and turn-start ownership. Rust builds
/// the live view, dispatches the existing M8g bridge, and reuses the existing
/// complete mask/scored receipt encoders.
///
/// # Input layout (all integers little-endian)
///
/// The packet has the variable-width live-view constructor layout documented
/// on `fw_create_factory_ai_view_from_live_rules`, followed by:
///
/// ```text
/// rng.value:u32, rng.calls:u32,
/// request.kind:u8 (0=command, 1=forced-switch), request.request_id:u32,
/// request.side:u8 (0=player, 1=trainer), request.battler:u8,
/// request.legal_count:u8,
/// request.legal_decisions[legal_count]: tag:u8, slot_or_party:u8, target:u8
/// turn_start.owner:u8 (0=legacy/absent, 1=decision, 2=battle-boundary),
/// turn_start.value:u16 (ignored for owners 0/1)
/// ```
///
/// Legal decision records use the existing policy tags: 0 is a move
/// (`slot,target`) and 1 is a switch (`party_index,ignored`). The live
/// driver normally supplies only move records; retaining the switch tag keeps
/// the native chooser's exact production guard reachable for malformed or
/// staged callers. The output is the existing complete chooser layout from
/// `fw_choose_factory_ai_mask_zero_decision` or
/// `fw_choose_factory_ai_scored_decision`: status 0 is the full submission,
/// final RNG, mask receipt, ordered draw receipt, scores, tie, scripts, and
/// turn ownership; status 1 is an exact typed production error; status 2 is
/// the fixed malformed-packet message below.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes. Null or
/// empty input is rejected with status 2 and never dereferenced.
#[no_mangle]
pub unsafe extern "C" fn fw_choose_factory_ai_live_decision(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    if input_ptr.is_null() && input_len != 0 {
        return alloc_and_copy(&encode_live_view_message(
            2,
            FACTORY_AI_LIVE_DECISION_MALFORMED_MESSAGE,
        ));
    }
    let input_len = input_len as usize;
    if input_len == 0 {
        return alloc_and_copy(&encode_live_view_message(
            2,
            FACTORY_AI_LIVE_DECISION_MALFORMED_MESSAGE,
        ));
    }
    // SAFETY: nonzero width, non-null pointer guard, and caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len) };
    // Decode and finish the complete packet before evaluating any semantic
    // content. Structural malformation always owns status 2, even when the
    // live prefix would independently fail ability resolution.
    let decoded = (|| {
        let mut reader = CheckedReader::new(bytes);
        let rules = decode_live_view_rules(&mut reader)?;
        let history = decode_battle_history(&mut reader)?;
        let challenge = decode_live_view_challenge(&mut reader)?;
        let rng = BattleRngState { value: reader.u32()?, calls: reader.u32()? };
        let request = decode_live_decision_request(&mut reader)?;
        let turn_start = decode_live_decision_turn_start(&mut reader)?;
        reader.finish()?;
        Ok((rules, history, challenge, rng, request, turn_start))
    })();
    let (rules, history, challenge, rng, request, turn_start) = match decoded {
        Ok(value) => value,
        Err(()) => {
            return alloc_and_copy(&encode_live_view_message(
                2,
                FACTORY_AI_LIVE_DECISION_MALFORMED_MESSAGE,
            ))
        }
    };

    // Canonical semantic order: live constructor, command request, then mask
    // selection/chooser dispatch.
    let view =
        match factory_ai_live_view::create_factory_ai_view_from_live_rules(FactoryAiLiveViewInput {
            rules_context: &rules,
            history: &history,
            challenge,
        }) {
            Ok(view) => view,
            Err(error) => return alloc_and_copy(&encode_live_view_message(1, &error.to_string())),
        };
    let (kind, request_id, side, battler, legal_decisions) =
        match validate_live_decision_request(request) {
            Ok(value) => value,
            Err(message) => return alloc_and_copy(&encode_live_view_message(1, &message)),
        };
    let turn_start_random_number =
        match validate_live_decision_turn_start(turn_start.0, turn_start.1) {
            Ok(value) => value,
            Err(message) => return alloc_and_copy(&encode_live_view_message(1, &message)),
        };

    let result = live_decision_bridge::choose_factory_ai_decision_from_live_view(
        FactoryAiLiveDecisionInput {
            view: &view,
            request: FactoryAiMovePolicyRequest {
                kind,
                request_id,
                side,
                battler,
                legal_decisions: &legal_decisions,
            },
            rng,
            turn_start_random_number,
        },
    );
    match result {
        Ok(choice) => alloc_and_copy(&encode_live_decision_choice(choice)),
        Err(error) => alloc_and_copy(&encode_live_view_message(1, &error.to_string())),
    }
}

// --- Complete live Factory AI pure planner (additive ABI v1) -------------

const FACTORY_AI_LIVE_PLANNER_MALFORMED_MESSAGE: &str =
    "factory-wasm factoryAiLivePlannerEngine: malformed input";

#[derive(Debug, Clone, Copy)]
struct LivePlannerBattlerExtra {
    party_index: f64,
    perish_song_timer: f64,
}

#[derive(Debug, Clone, Copy)]
struct LivePlannerPartyMemberWire {
    species: f64,
    is_egg: bool,
    ability_num: f64,
    hp: f64,
    moves: [f64; 4],
}

fn planner_u8(value: f64, field: &str) -> Result<u8, String> {
    if value.is_finite() && value.fract() == 0.0 && (0.0..=f64::from(u8::MAX)).contains(&value) {
        Ok(value as u8)
    } else {
        Err(format!("{field} must be an integer from 0 through 255"))
    }
}

fn planner_u16(value: f64, field: &str) -> Result<u16, String> {
    if value.is_finite() && value.fract() == 0.0 && (0.0..=f64::from(u16::MAX)).contains(&value) {
        Ok(value as u16)
    } else {
        Err(format!("{field} must be an integer from 0 through 65535"))
    }
}

fn planner_u32(value: f64, field: &str) -> Result<u32, String> {
    if value.is_finite() && value.fract() == 0.0 && (0.0..=f64::from(u32::MAX)).contains(&value) {
        Ok(value as u32)
    } else {
        Err(format!(
            "{field} must be an integer from 0 through 4294967295"
        ))
    }
}

fn planner_i32(value: f64, field: &str) -> Result<i32, String> {
    if value.is_finite()
        && value.fract() == 0.0
        && (f64::from(i32::MIN)..=f64::from(i32::MAX)).contains(&value)
    {
        Ok(value as i32)
    } else {
        Err(format!("{field} must be a signed 32-bit integer"))
    }
}

fn planner_type_id(value: &str) -> Result<u8, String> {
    const TYPES: [&str; 18] = [
        "TYPE_NORMAL",
        "TYPE_FIGHTING",
        "TYPE_FLYING",
        "TYPE_POISON",
        "TYPE_GROUND",
        "TYPE_ROCK",
        "TYPE_BUG",
        "TYPE_GHOST",
        "TYPE_STEEL",
        "TYPE_MYSTERY",
        "TYPE_FIRE",
        "TYPE_WATER",
        "TYPE_GRASS",
        "TYPE_ELECTRIC",
        "TYPE_PSYCHIC",
        "TYPE_ICE",
        "TYPE_DRAGON",
        "TYPE_DARK",
    ];
    TYPES
        .iter()
        .position(|candidate| *candidate == value)
        .map(|index| index as u8)
        .ok_or_else(|| format!("factory-ai-switch-policy: unknown type {value}"))
}

fn planner_switch_battler(
    live: &FactoryAiLiveRulesBattler,
    extra: LivePlannerBattlerExtra,
) -> Result<FactoryAiSwitchBattler, String> {
    Ok(FactoryAiSwitchBattler {
        species: planner_u16(live.species, "battler.species")?,
        ability: planner_u16(live.ability, "battler.ability")?,
        types: [
            planner_type_id(&live.types[0])?,
            planner_type_id(&live.types[1])?,
        ],
        hp: planner_i32(live.hp, "battler.hp")?,
        max_hp: planner_i32(live.max_hp, "battler.maxHP")?,
        moves: live
            .moves
            .map(|value| planner_u16(value, "battler.moves[]"))
            .into_iter()
            .collect::<Result<Vec<_>, _>>()?
            .try_into()
            .expect("four source moves remain four native moves"),
        status1: planner_u32(live.status1, "battler.status1")?,
        status2: planner_u32(live.status2, "battler.status2")?,
        status3: planner_u32(live.status3, "battler.status3")?,
        stat_stages: live
            .stat_stages
            .map(|value| planner_i32(value, "battler.statStages[]"))
            .into_iter()
            .collect::<Result<Vec<_>, _>>()?
            .try_into()
            .expect("eight source stages remain eight native stages"),
        party_index: planner_u8(extra.party_index, "battler.partyIndex")?,
        perish_song_timer: planner_u8(extra.perish_song_timer, "battler.perishSongTimer")?,
    })
}

fn planner_party_member(
    wire: LivePlannerPartyMemberWire,
) -> Result<FactoryAiSwitchPartyMember, String> {
    Ok(FactoryAiSwitchPartyMember {
        species: planner_u16(wire.species, "party.opponent[].species")?,
        is_egg: wire.is_egg,
        ability_num: planner_u8(wire.ability_num, "party.opponent[].abilityNum")?,
        hp: planner_i32(wire.hp, "party.opponent[].hp")?,
        moves: wire
            .moves
            .map(|value| planner_u16(value, "party.opponent[].moves[]"))
            .into_iter()
            .collect::<Result<Vec<_>, _>>()?
            .try_into()
            .expect("four source moves remain four native moves"),
    })
}

fn append_framed(buf: &mut Vec<u8>, packet: &[u8]) {
    buf.extend_from_slice(
        &u32::try_from(packet.len())
            .expect("nested planner packet fits ABI u32")
            .to_le_bytes(),
    );
    buf.extend_from_slice(packet);
}

fn encode_live_planner_result(result: FactoryAiLivePlannerResult) -> Vec<u8> {
    let mut buf = vec![0; 5];
    match result {
        FactoryAiLivePlannerResult::Move(result) => {
            buf.push(0); // phase: move
            append_framed(&mut buf, &encode_battle_history_result(Ok(result.history)));
            append_framed(&mut buf, &encode_live_view_result(Ok(result.view)));
            append_framed(
                &mut buf,
                &encode_switch_policy_result(false, Ok(result.switch_policy)),
            );
            let choice = match result.trace {
                FactoryAiLivePlannerMoveTrace::MaskZero(trace) => {
                    encode_mask_zero_choice(Ok(FactoryAiMaskZeroDecisionChoice {
                        submission: result.submission,
                        rng: result.rng,
                        trace,
                    }))
                }
                FactoryAiLivePlannerMoveTrace::Scored(trace) => {
                    encode_scored_choice(Ok(FactoryAiScoredChoice {
                        submission: result.submission,
                        rng: result.rng,
                        trace,
                    }))
                }
            };
            append_framed(&mut buf, &choice);
        }
        FactoryAiLivePlannerResult::Switch(result) => {
            buf.push(1); // phase: switch
            append_framed(&mut buf, &encode_battle_history_result(Ok(result.history)));
            append_framed(&mut buf, &encode_live_view_result(Ok(result.view)));
            append_framed(
                &mut buf,
                &encode_switch_policy_result(false, Ok(result.switch_policy)),
            );
            buf.extend_from_slice(&result.submission.request_id.to_le_bytes());
            buf.push(result.submission.side as u8);
            buf.push(result.submission.party_index);
            buf.extend_from_slice(&result.rng.value.to_le_bytes());
            buf.extend_from_slice(&result.rng.calls.to_le_bytes());
        }
    }
    patch_total_len(&mut buf);
    buf
}

/// Plans the complete pure switch-or-move prefix of
/// `submitLiveFactoryAiDecision` through one additive ABI-v1 packet. It never
/// calls or ports the generic BattleState reducer.
///
/// The variable-width prefix is exactly the single source-shaped M8e layout
/// documented on `fw_create_factory_ai_view_from_live_rules`: battlers,
/// weather/side/last-move fields, history, and challenge occur once. The
/// following suffix carries only source fields not present in that prefix:
///
/// ```text
/// battler_extras[4]: party_index:f64, perish_song_timer:f64
/// ai_observed_ability_ids:f64[4], ai_observed_item_effects:f64[4]
/// opponent_party[6]: species:f64, is_egg:u8(0/1), ability_num:f64,
///   hp:f64, moves:f64[4]
/// last_landed_move:f64, last_hit_by:f64, reserved_party_index:f64,
/// absent_battler_flags:f64, battlers_count:f64, battle_type_flags:f64,
/// random_turn_number:f64, rng.value:u32, rng.calls:u32,
/// boundary:u8 (0=decision-required,1=other)
/// if boundary=0: request.kind:u8 (0=command,1=forced-switch),
///   request_id:u32, side:u8 (0=player,1=trainer), battler:u8,
///   legal_count:u8, legal[legal_count]:tag:u8,slot_or_party:u8,target:u8
/// ```
///
/// Rust atomically decodes the entire packet, then derives the history/live
/// and M6c switch projections from that one rules representation. In
/// particular, species, abilities, types, HP, moves, statuses, and stages are
/// not duplicated. Status 0 frames the existing complete history, live-view,
/// switch-policy and (for move results) chooser packets. Status 1 is an exact
/// reachable planner/leaf error (`message_len:u32,message:utf8`); status 2 is
/// the same shape and owns every truncation, append, invalid UTF-8, presence,
/// boundary, request, or legal-decision tag before semantic evaluation.
///
/// # Safety
/// `input_ptr` must point to `input_len` readable initialized bytes. Null or
/// empty input is rejected without dereferencing it.
#[no_mangle]
pub unsafe extern "C" fn fw_plan_live_factory_ai_decision(
    input_ptr: *const u8,
    input_len: u32,
) -> *mut u8 {
    let malformed = || {
        alloc_and_copy(&encode_live_view_message(
            2,
            FACTORY_AI_LIVE_PLANNER_MALFORMED_MESSAGE,
        ))
    };
    if input_ptr.is_null() && input_len != 0 {
        return malformed();
    }
    let input_len = input_len as usize;
    if input_len == 0 {
        return malformed();
    }
    // SAFETY: nonzero width, non-null pointer guard, and caller contract above.
    let bytes = unsafe { std::slice::from_raw_parts(input_ptr, input_len) };
    let decoded = (|| {
        let mut reader = CheckedReader::new(bytes);
        let live_rules = decode_live_view_rules(&mut reader)?;
        let history = decode_battle_history(&mut reader)?;
        let challenge = decode_live_view_challenge(&mut reader)?;
        let battler_extras: [Result<LivePlannerBattlerExtra, ()>; 4] = std::array::from_fn(|_| {
            Ok::<_, ()>(LivePlannerBattlerExtra {
                party_index: reader.f64()?,
                perish_song_timer: reader.f64()?,
            })
        });
        let battler_extras = battler_extras.into_iter().collect::<Result<Vec<_>, _>>()?;
        let battler_extras: [LivePlannerBattlerExtra; 4] =
            battler_extras.try_into().map_err(|_| ())?;
        let observed_ability_ids = reader.f64x4()?;
        let observed_item_effects = reader.f64x4()?;
        let opponent_party: [Result<LivePlannerPartyMemberWire, ()>; 6] =
            std::array::from_fn(|_| {
                let species = reader.f64()?;
                let is_egg = match reader.u8()? {
                    0 => false,
                    1 => true,
                    _ => return Err(()),
                };
                Ok::<_, ()>(LivePlannerPartyMemberWire {
                    species,
                    is_egg,
                    ability_num: reader.f64()?,
                    hp: reader.f64()?,
                    moves: reader.f64x4()?,
                })
            });
        let opponent_party = opponent_party.into_iter().collect::<Result<Vec<_>, _>>()?;
        let opponent_party: [LivePlannerPartyMemberWire; 6] =
            opponent_party.try_into().map_err(|_| ())?;
        let switch_scalars = [
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
            reader.f64()?,
        ];
        let rng = BattleRngState { value: reader.u32()?, calls: reader.u32()? };
        let boundary_tag = reader.u8()?;
        let request = if boundary_tag == 0 {
            Some(decode_live_decision_request(&mut reader)?)
        } else if boundary_tag == 1 {
            None
        } else {
            return Err(());
        };
        reader.finish()?;
        Ok((
            live_rules,
            history,
            challenge,
            battler_extras,
            observed_ability_ids,
            observed_item_effects,
            opponent_party,
            switch_scalars,
            rng,
            request,
        ))
    })();
    let (
        live_rules,
        history,
        challenge,
        battler_extras,
        observed_ability_ids,
        observed_item_effects,
        opponent_party,
        switch_scalars,
        rng,
        request,
    ) = match decoded {
        Ok(value) => value,
        Err(()) => return malformed(),
    };

    // Tags are part of structural validity. The source boundary guard remains
    // the first semantic operation: no numeric narrowing or history lookup can
    // precede it.
    let is_decision_boundary = request.is_some();
    let (request_kind, request_id, request_side, request_battler, legal_decisions) = match request {
        None => (
            FactoryAiRequestKind::Command,
            0,
            FactoryAiDecisionSide::Player,
            0,
            Vec::new(),
        ),
        Some(wire) => {
            let kind = match wire.kind {
                0 => FactoryAiRequestKind::Command,
                1 => FactoryAiRequestKind::ForcedSwitch,
                _ => return malformed(),
            };
            let side = match wire.side {
                0 => FactoryAiDecisionSide::Player,
                1 => FactoryAiDecisionSide::Trainer,
                _ => return malformed(),
            };
            let mut decisions = Vec::with_capacity(wire.legal_decisions.len());
            for (tag, first, second) in wire.legal_decisions {
                let decision = match tag {
                    0 => match FactoryAiMoveSlot::from_index(usize::from(first)) {
                        Some(move_slot) => FactoryAiLegalDecision::UseMove(FactoryAiMoveDecision {
                            move_slot,
                            target_battler: second,
                        }),
                        None => return malformed(),
                    },
                    1 => FactoryAiLegalDecision::Switch { party_index: first },
                    _ => return malformed(),
                };
                decisions.push(decision);
            }
            (kind, wire.request_id, side, wire.battler, decisions)
        }
    };
    let boundary = if is_decision_boundary {
        FactoryAiLivePlannerBoundary::DecisionRequired(FactoryAiMovePolicyRequest {
            kind: request_kind,
            request_id,
            side: request_side,
            battler: request_battler,
            legal_decisions: &legal_decisions,
        })
    } else {
        FactoryAiLivePlannerBoundary::NotDecisionRequired
    };
    if !matches!(
        boundary,
        FactoryAiLivePlannerBoundary::DecisionRequired(FactoryAiMovePolicyRequest {
            kind: FactoryAiRequestKind::Command,
            side: FactoryAiDecisionSide::Trainer,
            ..
        })
    ) {
        return alloc_and_copy(&encode_live_view_message(
            1,
            "Factory AI live driver requires a trainer command boundary",
        ));
    }

    let narrowed = (|| {
        let battlers: [Result<FactoryAiSwitchBattler, String>; 4] = std::array::from_fn(|index| {
            planner_switch_battler(&live_rules.battlers[index], battler_extras[index])
        });
        let battlers = battlers
            .into_iter()
            .collect::<Result<Vec<_>, _>>()?
            .try_into()
            .expect("four source battlers remain four switch battlers");
        let opponent_party = opponent_party
            .map(planner_party_member)
            .into_iter()
            .collect::<Result<Vec<_>, _>>()?
            .try_into()
            .expect("six source party members remain six switch members");
        Ok::<_, String>((
            FactoryAiSwitchRules {
                battlers,
                opponent_party,
                last_landed_move: planner_u16(switch_scalars[0], "moveHistory.lastLandedMoves[1]")?,
                last_hit_by: planner_u8(switch_scalars[1], "moveHistory.lastHitBy[1]")?,
                reserved_party_index: planner_u8(switch_scalars[2], "monToSwitchIntoId[1]")?,
                absent_battler_flags: planner_u8(switch_scalars[3], "absentBattlerFlags")?,
                battlers_count: planner_u8(switch_scalars[4], "battleTopology.battlersCount")?,
                battle_type_flags: planner_u32(
                    switch_scalars[5],
                    "battleTopology.battleTypeFlags",
                )?,
            },
            planner_u16(switch_scalars[6], "randomTurnNumber")?,
        ))
    })();
    let (switch_rules, random_turn_number) = match narrowed {
        Ok(value) => value,
        Err(message) => return alloc_and_copy(&encode_live_view_message(1, &message)),
    };

    let result =
        factory_ai_live_planner::plan_live_factory_ai_decision(FactoryAiLivePlannerInput {
            boundary,
            rules_context: FactoryAiLivePlannerRulesContext {
                live_view: &live_rules,
                observed_ability_ids,
                observed_item_effects,
                switch_rules,
                random_turn_number,
            },
            history: &history,
            challenge,
            rng,
        });
    match result {
        Ok(result) => alloc_and_copy(&encode_live_planner_result(result)),
        Err(error) => alloc_and_copy(&encode_live_view_message(1, &error.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn abi_version_is_1() {
        assert_eq!(fw_abi_version(), 1);
    }

    // Expected values generated from the TS implementation on 2026-08-11
    // (node --experimental-strip-types over src/engine/rng.ts), NOT
    // hand-computed — same pinned constants as factory-core/src/rng.rs.

    #[test]
    fn rng_passthrough_matches_ts_stream_from_zero_seed() {
        let mut value = 0x0000_0000u32;
        let mut outputs = Vec::with_capacity(8);
        for _ in 0..8 {
            value = fw_rng_advance(value);
            outputs.push(fw_rng_output(value) as u16);
        }
        assert_eq!(
            outputs,
            [0x0000, 0xe97e, 0x5271, 0x31b0, 0x8e42, 0xe2cc, 0xafc5, 0x67db]
        );
        assert_eq!(value, 0x67db_b608);
    }

    #[test]
    fn rng_passthrough_matches_ts_stream_from_anchor_seed() {
        let mut value = rng::ANCHOR_RNG_VALUE;
        let mut outputs = Vec::with_capacity(8);
        for _ in 0..8 {
            value = fw_rng_advance(value);
            outputs.push(fw_rng_output(value) as u16);
        }
        assert_eq!(
            outputs,
            [0xddef, 0x92b9, 0xfc5d, 0xd492, 0xfc14, 0x74af, 0x49ee, 0xc41f]
        );
        assert_eq!(value, 0xc41f_b5d0);
    }

    #[test]
    fn alloc_free_roundtrip() {
        let len = 16u32;
        let ptr = fw_alloc(len);
        assert!(!ptr.is_null());
        // SAFETY: `ptr` was just allocated by fw_alloc for `len` bytes, and
        // is freed exactly once below with that same `len`.
        unsafe {
            for i in 0..len {
                *ptr.add(i as usize) = i as u8;
            }
            for i in 0..len {
                assert_eq!(*ptr.add(i as usize), i as u8);
            }
            fw_free(ptr, len);
        }
    }

    #[test]
    fn alloc_zero_len_is_null_and_free_is_noop() {
        let ptr = fw_alloc(0);
        assert!(ptr.is_null());
        // SAFETY: both calls are no-ops per fw_free's null/zero-len contract.
        unsafe {
            fw_free(ptr, 0);
            fw_free(std::ptr::null_mut(), 16);
        }
    }

    // Round-trips fw_generate_initial_rentals through its own documented
    // buffer layout before the TS decoder (core-rs/adapter/factoryEngine.ts)
    // depends on it. Not a substitute for tests/factoryRentalParity.test.ts —
    // this only proves the Rust encoder/decoder agree with each other and
    // with factory_core's native fixture (rental_generation.rs), not with
    // the TS spec engine directly.

    fn read_u16(bytes: &[u8], offset: usize) -> u16 {
        u16::from_le_bytes(bytes[offset..offset + 2].try_into().unwrap())
    }

    fn read_u32(bytes: &[u8], offset: usize) -> u32 {
        u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap())
    }

    #[test]
    fn generate_initial_rentals_ok_buffer_matches_the_seed_0_fixture() {
        // Same input as
        // factory-core::rental_generation::tests::pins_seed_0_challenge_0_fixture_from_ts_test.
        let ptr = fw_generate_initial_rentals(0, 0, 0, 0x1234_5678, 0, 0);
        // SAFETY: `ptr` was just returned by fw_generate_initial_rentals;
        // `total_len` is read from the buffer's own first 4 bytes per the
        // documented layout, and the slice is dropped before fw_free below.
        let (total_len, snapshot) = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0);
            let snapshot = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            (total_len, snapshot)
        };

        assert_eq!(snapshot[4], 0, "status: ok");
        assert_eq!(read_u32(&snapshot, 5), 0, "challenge_num");
        assert_eq!(snapshot[9], 0, "rental_rank");
        assert_eq!(
            read_u32(&snapshot, 10),
            1_742_452_232,
            "selection_rng_value"
        );
        assert_eq!(read_u32(&snapshot, 14), 4_158_915_758, "rng_value");

        // rental[0]: set_id 110, personality 813709149, fixedIv 3, abilitySlot 1,
        // otId 0x12345678, speciesId 88, itemId 135, nature 24, selectionDrawPosition 0,
        // personalityDrawPositions [22, 23].
        let r0 = 18;
        assert_eq!(read_u16(&snapshot, r0), 110, "rental[0].set_id");
        assert_eq!(
            read_u32(&snapshot, r0 + 2),
            813_709_149,
            "rental[0].personality"
        );
        assert_eq!(snapshot[r0 + 6], 3, "rental[0].fixed_iv");
        assert_eq!(snapshot[r0 + 7], 1, "rental[0].ability_slot");
        assert_eq!(read_u32(&snapshot, r0 + 8), 0x1234_5678, "rental[0].ot_id");
        assert_eq!(read_u16(&snapshot, r0 + 12), 88, "rental[0].species_id");
        assert_eq!(read_u16(&snapshot, r0 + 14), 135, "rental[0].item_id");
        assert_eq!(snapshot[r0 + 16], 24, "rental[0].nature");
        assert_eq!(
            read_u16(&snapshot, r0 + 17),
            0,
            "rental[0].selection_draw_position"
        );
        assert_eq!(
            read_u16(&snapshot, r0 + 19),
            22,
            "rental[0].personality_draw_positions[0]"
        );
        assert_eq!(
            read_u16(&snapshot, r0 + 21),
            23,
            "rental[0].personality_draw_positions[1]"
        );
        assert_eq!(
            &snapshot[r0 + 23..r0 + 29],
            &[3, 3, 3, 3, 3, 3],
            "rental[0].ivs (uniform: fixed IV 3 is below USE_RANDOM_IVS)"
        );
        // The six 29-byte records run 18..192.
        assert_eq!(18 + 6 * 29, 192, "rentals block");

        let ledger_count = read_u32(&snapshot, 192);
        assert_eq!(ledger_count, 198, "ledger_count");
        assert_eq!(
            total_len,
            196 + 26 * ledger_count,
            "total_len == 196 + 26 * ledger_count"
        );
        assert_eq!(snapshot.len() as u32, total_len);

        // ledger[0]: set-selection / set-candidate, rngBefore 0, accepted.
        let e0 = 196;
        assert_eq!(snapshot[e0], 0, "ledger[0].phase == set-selection");
        assert_eq!(snapshot[e0 + 1], 0, "ledger[0].purpose == set-candidate");
        assert_eq!(snapshot[e0 + 2], 0, "ledger[0].rental_index");
        assert_eq!(read_u32(&snapshot, e0 + 3), 0, "ledger[0].rng_before");
        assert_eq!(read_u16(&snapshot, e0 + 13), 110, "ledger[0].range_start");
        assert_eq!(read_u16(&snapshot, e0 + 15), 199, "ledger[0].range_end");
        assert_eq!(snapshot[e0 + 17], 0, "ledger[0].better_range == false");
        assert_eq!(
            read_u16(&snapshot, e0 + 18),
            110,
            "ledger[0].candidate_set_id"
        );
        assert_eq!(
            snapshot[e0 + 20],
            0,
            "ledger[0].selection_outcome == accepted"
        );

        // SAFETY: `ptr`/`total_len` are exactly the pair fw_generate_initial_rentals
        // returned via fw_alloc, freed exactly once.
        unsafe {
            fw_free(ptr, total_len);
        }
    }

    #[test]
    fn generate_initial_rentals_challenge_8_buffer_carries_random_ivs() {
        // factoryWinStreak 56 / 7 == 8. Same input as
        // factory-core::rental_generation::tests::challenge_8_rolls_random_ivs_for_all_six_rentals,
        // which used to be the GenerationError::ChallengeOutOfRange case
        // this export encoded as status 1.
        let ptr = fw_generate_initial_rentals(0, 56, 0, 0x1234_5678, 0, 0);
        // SAFETY: see generate_initial_rentals_ok_buffer_matches_the_seed_0_fixture.
        let (total_len, snapshot) = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0);
            let snapshot = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            (total_len, snapshot)
        };

        assert_eq!(snapshot[4], 0, "status: ok (no longer an error)");
        assert_eq!(read_u32(&snapshot, 5), 8, "challenge_num");
        let ledger_count = read_u32(&snapshot, 192);
        assert_eq!(ledger_count, 305, "ledger_count");
        assert_eq!(total_len, 196 + 26 * ledger_count);

        // rental[0]'s spread, hand-derived in the factory-core test above.
        let r0 = 18;
        assert_eq!(
            &snapshot[r0 + 23..r0 + 29],
            &[2, 18, 8, 26, 17, 1],
            "rental[0].ivs"
        );
        assert_eq!(
            snapshot[r0 + 6],
            18,
            "rental[0].fixed_iv == ivs[1] (the ATK IV)"
        );

        // The two random-IV ledger entries for rental 0 sit at positions 91
        // and 92 (immediately after its accepted personality pair, 89/90).
        for (position, purpose, word) in [(91usize, 3u8, 41538u16), (92, 4, 34362)] {
            let entry = 196 + 26 * position;
            assert_eq!(snapshot[entry], 2, "ledger[{position}].phase == random-ivs");
            assert_eq!(snapshot[entry + 1], purpose, "ledger[{position}].purpose");
            assert_eq!(snapshot[entry + 2], 0, "ledger[{position}].rental_index");
            assert_eq!(
                read_u16(&snapshot, entry + 11),
                word,
                "ledger[{position}].random_u16"
            );
        }

        // SAFETY: see generate_initial_rentals_ok_buffer_matches_the_seed_0_fixture.
        unsafe {
            fw_free(ptr, total_len);
        }
    }

    #[test]
    fn generate_initial_rentals_challenge_7_better_range_ivs_match_their_ledger_words() {
        // factoryWinStreak 49 -> challengeNum 7; rentsCount 20 -> rank 1, so
        // slot 0 alone is a better-range ("elevated") rental and reaches IV
        // argument 8 (battle_factory_screen.c:1762-1764) -> the overread row
        // -> random IVs. Slots 1..5 take argument 7 -> a uniform 31.
        let ptr = fw_generate_initial_rentals(0, 49, 20, 0x1234_5678, 0, 0);
        // SAFETY: see generate_initial_rentals_ok_buffer_matches_the_seed_0_fixture.
        let (total_len, snapshot) = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0);
            let snapshot = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            (total_len, snapshot)
        };

        assert_eq!(snapshot[4], 0, "status: ok");
        assert_eq!(read_u32(&snapshot, 5), 7, "challenge_num");
        assert_eq!(snapshot[9], 1, "rental_rank");
        let ledger_count = read_u32(&snapshot, 192) as usize;
        assert_eq!(total_len as usize, 196 + 26 * ledger_count);

        // Find slot 0's two random-IV ledger entries by scanning the encoded
        // ledger for phase 2 / rental_index 0 — no offset arithmetic assumed.
        let mut words: Vec<u16> = Vec::new();
        for position in 0..ledger_count {
            let entry = 196 + 26 * position;
            if snapshot[entry] == 2 && snapshot[entry + 2] == 0 {
                assert_eq!(
                    snapshot[entry + 1],
                    3 + words.len() as u8,
                    "random-ivs purposes are low (3) then high (4)"
                );
                words.push(read_u16(&snapshot, entry + 11));
            }
        }
        assert_eq!(words.len(), 2, "exactly two random-IV words for slot 0");

        // The record's six IV bytes ARE those two words' 5-bit fields
        // (pokemon.c:2277-2293): first word -> hp/attack/defense, second ->
        // speed/sp_attack/sp_defense.
        let r0 = 18;
        let expected = [
            (words[0] & 31) as u8,
            ((words[0] >> 5) & 31) as u8,
            ((words[0] >> 10) & 31) as u8,
            (words[1] & 31) as u8,
            ((words[1] >> 5) & 31) as u8,
            ((words[1] >> 10) & 31) as u8,
        ];
        assert_eq!(&snapshot[r0 + 23..r0 + 29], &expected, "rental[0].ivs");
        assert_eq!(
            snapshot[r0 + 6],
            expected[1],
            "rental[0].fixed_iv == ivs[1]"
        );

        // Every ordinary slot is a uniform 31 with no random-IV draws.
        for slot in 1..6usize {
            let record = 18 + 29 * slot;
            assert_eq!(
                &snapshot[record + 23..record + 29],
                &[31u8; 6],
                "rental[{slot}].ivs"
            );
            assert_eq!(snapshot[record + 6], 31, "rental[{slot}].fixed_iv");
        }
        assert_eq!(
            (0..ledger_count)
                .filter(|position| snapshot[196 + 26 * position] == 2)
                .count(),
            2,
            "only the one better-range rental draws random IVs"
        );

        // SAFETY: see generate_initial_rentals_ok_buffer_matches_the_seed_0_fixture.
        unsafe {
            fw_free(ptr, total_len);
        }
    }

    // Round-trips fw_create_factory_party_member through its own documented
    // buffer layout before the TS decoder (core-rs/adapter/factoryEngine.ts)
    // depends on it. Not a substitute for tests/factoryPartyMemberParity.test.ts —
    // this only proves the Rust encoder/decoder agree with each other and
    // with factory_core's native fixture
    // (mon_construction::tests::grimer_dual_ability_slot1_matches_ts), not
    // with the TS spec engine directly.

    fn read_u8(bytes: &[u8], offset: usize) -> u8 {
        bytes[offset]
    }

    #[test]
    fn create_factory_party_member_ok_buffer_matches_the_grimer_fixture() {
        // Same input as
        // factory-core::mon_construction::tests::grimer_dual_ability_slot1_matches_ts.
        let ptr = fw_create_factory_party_member(110, 813_709_149, 3, 1, 0x1234_5678);
        // SAFETY: `ptr` was just returned by fw_create_factory_party_member;
        // `total_len` is read from the buffer's own first 4 bytes per the
        // documented layout, and the slice is dropped before fw_free below.
        let (total_len, snapshot) = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0);
            let snapshot = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            (total_len, snapshot)
        };

        assert_eq!(snapshot[4], 0, "status: ok");
        assert_eq!(read_u16(&snapshot, 5), 110, "set_id");
        assert_eq!(read_u16(&snapshot, 7), 88, "species_id");
        assert_eq!(read_u8(&snapshot, 9), 0, "is_egg");
        assert_eq!(read_u8(&snapshot, 10), 1, "ability_num");
        assert_eq!(read_u8(&snapshot, 11), 1, "ability_slot");
        assert_eq!(read_u16(&snapshot, 12), 60, "ability");
        assert_eq!(&snapshot[14..20], &[3, 3, 3, 3, 3, 3], "ivs");
        assert_eq!(read_u32(&snapshot, 20), 813_709_149, "personality");
        assert_eq!(read_u32(&snapshot, 24), 125_000, "experience");
        assert_eq!(read_u8(&snapshot, 28), 50, "level");
        assert_eq!(read_u8(&snapshot, 29), 0, "friendship");
        assert_eq!(read_u32(&snapshot, 30), 162, "max_hp");
        assert_eq!(read_u32(&snapshot, 34), 86, "attack");
        assert_eq!(read_u32(&snapshot, 38), 77, "defense");
        assert_eq!(read_u32(&snapshot, 42), 31, "speed");
        assert_eq!(read_u32(&snapshot, 46), 46, "sp_attack");
        assert_eq!(read_u32(&snapshot, 50), 77, "sp_defense");
        assert_eq!(read_u32(&snapshot, 54), 162, "hp");
        assert_eq!(read_u8(&snapshot, 58), 0, "status1");
        assert_eq!(read_u16(&snapshot, 59), 135, "item_id");
        assert_eq!(read_u16(&snapshot, 61), 4, "hold_effect");
        assert_eq!(read_u8(&snapshot, 63), 0, "hold_effect_param");
        assert_eq!(
            [
                read_u16(&snapshot, 64),
                read_u16(&snapshot, 66),
                read_u16(&snapshot, 68),
                read_u16(&snapshot, 70),
            ],
            [124, 317, 151, 107],
            "moves"
        );
        assert_eq!(&snapshot[72..76], &[20, 10, 40, 20], "pp");
        assert_eq!(read_u8(&snapshot, 76), 0, "pp_bonuses");
        assert_eq!(&snapshot[77..81], &[0, 0, 0, 0], "pp_ups");
        assert_eq!(read_u8(&snapshot, 81), 24, "nature");
        assert_eq!(
            [
                read_u16(&snapshot, 82),
                read_u16(&snapshot, 84),
                read_u16(&snapshot, 86),
                read_u16(&snapshot, 88),
                read_u16(&snapshot, 90),
                read_u16(&snapshot, 92),
            ],
            [170, 0, 170, 0, 0, 170],
            "evs"
        );
        assert_eq!(read_u8(&snapshot, 94), 1, "gender (female)");
        assert_eq!(read_u8(&snapshot, 95), 0, "shiny");
        assert_eq!(total_len, 96, "total_len == 5 + 91");
        assert_eq!(snapshot.len() as u32, total_len);

        // SAFETY: `ptr`/`total_len` are exactly the pair
        // fw_create_factory_party_member returned via fw_alloc, freed
        // exactly once.
        unsafe {
            fw_free(ptr, total_len);
        }
    }

    #[test]
    fn create_factory_party_member_with_ivs_buffer_matches_the_distinct_spread_fixture() {
        // Same input as
        // factory-core::mon_construction::tests::six_distinct_ivs_produce_calculate_mon_stats_values
        // (GRIMER set 110, QUIRKY, ability slot 1), with the six IVs packed
        // the way MON_DATA_IVS packs them (pokemon.c:3997-4004).
        let ivs = [1u32, 7, 13, 19, 25, 31];
        let ivs_packed = ivs[0]
            | (ivs[1] << 5)
            | (ivs[2] << 10)
            | (ivs[3] << 15)
            | (ivs[4] << 20)
            | (ivs[5] << 25);
        assert_eq!(ivs_packed, 1_067_037_921, "packed MON_DATA_IVS word");

        let ptr =
            fw_create_factory_party_member_with_ivs(110, 813_709_149, ivs_packed, 1, 0x1234_5678);
        // SAFETY: see create_factory_party_member_ok_buffer_matches_the_grimer_fixture.
        let (total_len, snapshot) = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0);
            let snapshot = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            (total_len, snapshot)
        };

        // The SAME 96-byte member payload the existing export returns.
        assert_eq!(total_len, 96, "total_len == 5 + 91");
        assert_eq!(snapshot[4], 0, "status: ok");
        assert_eq!(read_u16(&snapshot, 5), 110, "set_id");
        assert_eq!(read_u16(&snapshot, 7), 88, "species_id");
        assert_eq!(read_u8(&snapshot, 11), 1, "ability_slot");
        assert_eq!(&snapshot[14..20], &[1, 7, 13, 19, 25, 31], "ivs");
        assert_eq!(read_u32(&snapshot, 20), 813_709_149, "personality");
        assert_eq!(read_u32(&snapshot, 30), 161, "max_hp");
        assert_eq!(read_u32(&snapshot, 34), 88, "attack");
        assert_eq!(read_u32(&snapshot, 38), 82, "defense");
        assert_eq!(read_u32(&snapshot, 42), 39, "speed");
        assert_eq!(read_u32(&snapshot, 46), 57, "sp_attack");
        assert_eq!(read_u32(&snapshot, 50), 91, "sp_defense");
        assert_eq!(read_u32(&snapshot, 54), 161, "hp");
        assert_eq!(read_u8(&snapshot, 81), 24, "nature");

        // Bits 30-31 are outside every field and are ignored.
        // SAFETY: see create_factory_party_member_ok_buffer_matches_the_grimer_fixture.
        unsafe {
            fw_free(ptr, total_len);
        }
        let ptr = fw_create_factory_party_member_with_ivs(
            110,
            813_709_149,
            ivs_packed | 0xc000_0000,
            1,
            0x1234_5678,
        );
        // SAFETY: see create_factory_party_member_ok_buffer_matches_the_grimer_fixture.
        let (total_len, high_bits) = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0);
            let high_bits = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            (total_len, high_bits)
        };
        assert_eq!(high_bits, snapshot, "bits 30-31 of ivs_packed are ignored");
        // SAFETY: see create_factory_party_member_ok_buffer_matches_the_grimer_fixture.
        unsafe {
            fw_free(ptr, total_len);
        }
    }

    #[test]
    fn create_factory_party_member_with_ivs_matches_the_uniform_export_for_a_flat_spread() {
        // The additive export is a superset: a flat spread reproduces
        // fw_create_factory_party_member's buffer byte for byte.
        let flat = 3u32 | (3 << 5) | (3 << 10) | (3 << 15) | (3 << 20) | (3 << 25);
        let uniform = fw_create_factory_party_member(110, 813_709_149, 3, 1, 0x1234_5678);
        let spread =
            fw_create_factory_party_member_with_ivs(110, 813_709_149, flat, 1, 0x1234_5678);
        // SAFETY: both pointers were just returned by their exports; each is
        // read through its own total_len and freed exactly once below.
        unsafe {
            let uniform_len = read_u32(std::slice::from_raw_parts(uniform, 4), 0);
            let spread_len = read_u32(std::slice::from_raw_parts(spread, 4), 0);
            assert_eq!(
                std::slice::from_raw_parts(uniform, uniform_len as usize),
                std::slice::from_raw_parts(spread, spread_len as usize)
            );
            fw_free(uniform, uniform_len);
            fw_free(spread, spread_len);
        }
    }

    #[test]
    fn create_factory_party_member_error_buffer_names_the_set_id_range() {
        // Same input as
        // factory-core::mon_construction::tests::set_id_out_of_range_matches_ts_message.
        let ptr = fw_create_factory_party_member(882, 0, 3, 0, 0);
        // SAFETY: see create_factory_party_member_ok_buffer_matches_the_grimer_fixture.
        let (total_len, snapshot) = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0);
            let snapshot = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            (total_len, snapshot)
        };

        assert_eq!(snapshot[4], 1, "status: error");
        let message_len = read_u16(&snapshot, 5) as usize;
        let message = std::str::from_utf8(&snapshot[7..7 + message_len]).unwrap();
        assert_eq!(message, "Frontier set id must be in 0..881, got 882");
        assert_eq!(total_len as usize, 7 + message_len);

        // SAFETY: see create_factory_party_member_ok_buffer_matches_the_grimer_fixture.
        unsafe {
            fw_free(ptr, total_len);
        }
    }

    // --- damage_calc surface (M4b) --------------------------------------
    //
    // Round-trips each fw_ export through its own documented encoding
    // before the TS decoder (core-rs/adapter/damageEngine.ts) depends on
    // it, and pins the same two RAM-verified regression anchors
    // damage_calc.rs's own native tests carry (Rock Slide 32, Fury Cutter
    // corrected 4 - see that module's test comments for the RAM/dump
    // citations). Not a substitute for tests/damageCalcParity.test.ts's
    // exhaustive differential sweep against the TS engine.

    fn encode_damage_battler(b: DamageBattler) -> [u8; DAMAGE_BATTLER_WIDTH] {
        let mut buf = [0u8; DAMAGE_BATTLER_WIDTH];
        buf[0..4].copy_from_slice(&b.attack.to_le_bytes());
        buf[4..8].copy_from_slice(&b.defense.to_le_bytes());
        buf[8..12].copy_from_slice(&b.sp_attack.to_le_bytes());
        buf[12..16].copy_from_slice(&b.sp_defense.to_le_bytes());
        buf[16..20].copy_from_slice(&b.level.to_le_bytes());
        buf[20] = b.types[0];
        buf[21] = b.types[1];
        buf[22] = b.stat_stages.atk;
        buf[23] = b.stat_stages.def;
        buf[24] = b.stat_stages.sp_atk;
        buf[25] = b.stat_stages.sp_def;
        buf[26] = u8::from(b.is_burned);
        buf[27] = u8::from(b.has_status1);
        buf[28] = u8::from(b.hp.is_some());
        buf[29..33].copy_from_slice(&b.hp.unwrap_or(0).to_le_bytes());
        buf[33] = u8::from(b.max_hp.is_some());
        buf[34..38].copy_from_slice(&b.max_hp.unwrap_or(0).to_le_bytes());
        buf[38..40].copy_from_slice(&b.ability.to_le_bytes());
        buf[40..42].copy_from_slice(&b.species.to_le_bytes());
        buf[42..44].copy_from_slice(&b.hold_effect.to_le_bytes());
        buf[44..48].copy_from_slice(&b.hold_effect_param.to_le_bytes());
        buf
    }

    fn encode_damage_calc_input(input: &DamageCalcInput) -> [u8; DAMAGE_CALC_INPUT_WIDTH] {
        assert!(
            input.active_battler_abilities.is_none(),
            "active_battler_abilities is not encodable at this boundary (see module doc comment)"
        );
        let mut buf = [0u8; DAMAGE_CALC_INPUT_WIDTH];
        buf[0..DAMAGE_BATTLER_WIDTH].copy_from_slice(&encode_damage_battler(input.attacker));
        buf[DAMAGE_BATTLER_WIDTH..2 * DAMAGE_BATTLER_WIDTH]
            .copy_from_slice(&encode_damage_battler(input.defender));
        buf[96..100].copy_from_slice(&input.move_power.to_le_bytes());
        buf[100] = input.move_type;
        buf[101] = u8::from(input.is_critical_hit);
        buf[102] = u8::from(input.side_status_reflect);
        buf[103] = u8::from(input.side_status_light_screen);
        buf[104] = u8::from(input.is_double_battle_spread_move);
        buf[105] = u8::from(input.is_explosion_effect);
        buf[106..110].copy_from_slice(&input.weather.to_le_bytes());
        buf[110] = u8::from(input.weather_has_effect);
        buf[111..115].copy_from_slice(&input.current_move.to_le_bytes());
        buf[115] = u8::from(input.is_frontier_battle);
        buf[116] = u8::from(input.flash_fire_boosted);
        buf
    }

    const NEUTRAL_STAGES: StatStages = StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 };

    const ONIX: DamageBattler = DamageBattler {
        attack: 51,
        defense: 187,
        sp_attack: 36,
        sp_defense: 72,
        level: 50,
        types: [damage_calc::TYPE_ROCK, damage_calc::TYPE_GROUND],
        stat_stages: NEUTRAL_STAGES,
        is_burned: false,
        has_status1: false,
        hp: None,
        max_hp: None,
        ability: damage_calc::ABILITY_NONE,
        species: 0,
        hold_effect: damage_calc::HOLD_EFFECT_NONE,
        hold_effect_param: 0,
    };
    const GROVYLE: DamageBattler = DamageBattler {
        attack: 103,
        defense: 56,
        sp_attack: 91,
        sp_defense: 71,
        level: 50,
        types: [damage_calc::TYPE_GRASS, damage_calc::TYPE_GRASS],
        stat_stages: NEUTRAL_STAGES,
        is_burned: false,
        has_status1: false,
        hp: None,
        max_hp: None,
        ability: damage_calc::ABILITY_NONE,
        species: 0,
        hold_effect: damage_calc::HOLD_EFFECT_NONE,
        hold_effect_param: 0,
    };

    fn no_frills_input(
        attacker: DamageBattler,
        defender: DamageBattler,
        move_power: i32,
        move_type: u8,
    ) -> DamageCalcInput {
        DamageCalcInput {
            attacker,
            defender,
            move_power,
            move_type,
            is_critical_hit: false,
            side_status_reflect: false,
            side_status_light_screen: false,
            is_double_battle_spread_move: false,
            is_explosion_effect: false,
            weather: 0,
            weather_has_effect: true,
            current_move: 0,
            active_battler_abilities: None,
            is_frontier_battle: false,
            flash_fire_boosted: false,
        }
    }

    #[test]
    fn fw_is_type_physical_and_special_straddle_type_mystery() {
        assert_eq!(fw_is_type_physical(damage_calc::TYPE_MYSTERY as u32), 0);
        assert_eq!(fw_is_type_special(damage_calc::TYPE_MYSTERY as u32), 0);
        assert_eq!(fw_is_type_physical(damage_calc::TYPE_NORMAL as u32), 1);
        assert_eq!(fw_is_type_special(damage_calc::TYPE_DARK as u32), 1);
    }

    #[test]
    fn fw_apply_stat_stage_mod_matches_native() {
        assert_eq!(
            fw_apply_stat_stage_mod(100, 6),
            damage_calc::apply_stat_stage_mod(100, 6)
        );
        assert_eq!(
            fw_apply_stat_stage_mod(55, 0),
            damage_calc::apply_stat_stage_mod(55, 0)
        );
        assert_eq!(
            fw_apply_stat_stage_mod(55, 12),
            damage_calc::apply_stat_stage_mod(55, 12)
        );
    }

    #[test]
    fn rock_slide_base_damage_via_buffer_locks_to_32() {
        let input = no_frills_input(ONIX, GROVYLE, 75, damage_calc::TYPE_ROCK);
        let buf = encode_damage_calc_input(&input);
        // SAFETY: `buf` is a local 117-byte array matching DAMAGE_CALC_INPUT_WIDTH exactly.
        let damage = unsafe { fw_calculate_base_damage(buf.as_ptr()) };
        assert_eq!(damage, 32);
    }

    #[test]
    fn fury_cutter_corrected_base_damage_via_buffer_locks_to_4() {
        let input = no_frills_input(GROVYLE, ONIX, 10, damage_calc::TYPE_BUG);
        let buf = encode_damage_calc_input(&input);
        // SAFETY: see rock_slide_base_damage_via_buffer_locks_to_32.
        let damage = unsafe { fw_calculate_base_damage(buf.as_ptr()) };
        assert_eq!(damage, 4);
    }

    #[test]
    fn fw_apply_type_effectiveness_buffer_round_trip_is_neutral_for_rock_vs_grass() {
        // ROCK vs GRASS/GRASS has no TYPE_EFFECTIVENESS_TABLE entry (unlike
        // the native rock_slide_type_effectiveness_is_neutral test in
        // damage_calc.rs, which asserts the same neutral outcome against an
        // explicitly EMPTY table - this uses the real embedded 110-row
        // table and gets the same result because ROCK->GRASS truly is
        // absent from it).
        let ptr = fw_apply_type_effectiveness(
            48,
            damage_calc::TYPE_ROCK as u32,
            damage_calc::TYPE_GRASS as u32,
            damage_calc::TYPE_GRASS as u32,
        );
        // SAFETY: `ptr` was just returned by fw_apply_type_effectiveness as
        // an 8-byte fw_alloc'd buffer per its documented fixed layout.
        let (damage, multiplier_tenths) = unsafe {
            let bytes = std::slice::from_raw_parts(ptr, 8);
            (read_u32(bytes, 0) as i32, read_u32(bytes, 4) as i32)
        };
        assert_eq!(damage, 48);
        assert_eq!(multiplier_tenths, 10);
        // SAFETY: freeing the exact (ptr, 8) pair fw_apply_type_effectiveness returned.
        unsafe {
            fw_free(ptr, 8);
        }
    }

    #[test]
    fn fw_crit_chance_stage_and_roll_round_trip() {
        let stage = fw_get_critical_hit_chance_stage(1, 0, 0, 0, 0); // focusEnergy only: +2
        assert_eq!(stage, 2);
        // CRITICAL_HIT_CHANCE_ONE_IN[2] == 4: roll 4 is a hit (4 % 4 == 0), roll 5 is not.
        assert_eq!(fw_roll_is_critical_hit(stage, 4, 0), 1);
        assert_eq!(fw_roll_is_critical_hit(stage, 5, 0), 0);
        assert_eq!(
            fw_roll_is_critical_hit(stage, 4, 1),
            0,
            "target_immune forces a miss"
        );
    }

    #[test]
    fn fw_apply_stab_matches_native() {
        assert_eq!(
            fw_apply_stab(
                32,
                damage_calc::TYPE_ROCK as u32,
                damage_calc::TYPE_GROUND as u32,
                damage_calc::TYPE_ROCK as u32
            ),
            damage_calc::apply_stab(
                32,
                [damage_calc::TYPE_ROCK, damage_calc::TYPE_GROUND],
                damage_calc::TYPE_ROCK
            ),
        );
        assert_eq!(
            damage_calc::apply_stab(
                32,
                [damage_calc::TYPE_ROCK, damage_calc::TYPE_GROUND],
                damage_calc::TYPE_ROCK
            ),
            48
        );
    }

    #[test]
    fn fw_endeavor_and_random_multiplier_match_native() {
        assert_eq!(fw_calculate_endeavor_damage(117, 101), 16);
        assert_eq!(fw_resolve_endeavor_damage(117, 101, 10), 16);
        assert_eq!(fw_resolve_endeavor_damage(117, 101, 0), 0);
        assert_eq!(
            fw_apply_random_damage_multiplier(48, 15),
            damage_calc::apply_random_damage_multiplier(48, 15),
        );
        assert_eq!(fw_apply_random_damage_multiplier(48, 15), 40);
    }

    #[test]
    fn fw_calculate_accuracy_and_roll_round_trip() {
        let input = AccuracyCalcInput {
            move_accuracy: 100,
            attacker_accuracy_stage: 6,
            target_evasion_stage: 6,
            target_has_foresight: false,
            attacker_ability: damage_calc::ABILITY_NONE,
            target_ability: damage_calc::ABILITY_NONE,
            is_sandstorm: false,
            move_type: None,
            target_hold_effect: damage_calc::HOLD_EFFECT_NONE,
            target_hold_effect_param: 0,
        };
        let mut buf = [0u8; ACCURACY_CALC_INPUT_WIDTH];
        buf[0..4].copy_from_slice(&input.move_accuracy.to_le_bytes());
        buf[4..8].copy_from_slice(&input.attacker_accuracy_stage.to_le_bytes());
        buf[8..12].copy_from_slice(&input.target_evasion_stage.to_le_bytes());
        buf[12] = u8::from(input.target_has_foresight);
        buf[13..15].copy_from_slice(&input.attacker_ability.to_le_bytes());
        buf[15..17].copy_from_slice(&input.target_ability.to_le_bytes());
        buf[17] = u8::from(input.is_sandstorm);
        buf[18] = 0;
        buf[19] = 0;
        buf[20..22].copy_from_slice(&input.target_hold_effect.to_le_bytes());
        buf[22..26].copy_from_slice(&input.target_hold_effect_param.to_le_bytes());

        // SAFETY: `buf` is a local 26-byte array matching ACCURACY_CALC_INPUT_WIDTH exactly.
        let calc = unsafe { fw_calculate_accuracy(buf.as_ptr()) };
        assert_eq!(calc, damage_calc::calculate_accuracy(&input));
        assert_eq!(
            calc, 100,
            "neutral stages, no modifiers: calc == moveAccuracy"
        );

        assert_eq!(
            fw_roll_accuracy_hits(calc, 99),
            u32::from(damage_calc::roll_accuracy_hits(calc, 99))
        );
        // `rng_roll % 100` never reaches 100 (100 % 100 == 0), so a hit
        // (roll % 100 < calc) is only unreachable when calc <= 0.
        assert_eq!(fw_roll_accuracy_hits(100, 99), 1);
        assert_eq!(fw_roll_accuracy_hits(0, 0), 0, "calc == 0 always misses");
    }

    // --- turn_order / turn_rng surface (M4c) --------------------------------
    //
    // Round-trips each fw_ export through its own documented encoding
    // before the TS decoder (core-rs/adapter/turnEngine.ts) depends on it,
    // pinning the same battle-1-turn-1 anchor turn_order.rs's own native
    // tests carry. Not a substitute for tests/turnOrderParity.test.ts's
    // exhaustive differential sweep against the TS engine.

    fn encode_turn_order_battler(b: &TurnOrderBattler) -> [u8; TURN_ORDER_BATTLER_WIDTH] {
        let mut buf = [0u8; TURN_ORDER_BATTLER_WIDTH];
        buf[0..4].copy_from_slice(&b.speed.to_le_bytes());
        buf[4] = b.speed_stage;
        buf[5..9].copy_from_slice(&b.move_priority.to_le_bytes());
        buf[9] = u8::from(b.is_paralyzed);
        buf[10..12].copy_from_slice(&b.ability.to_le_bytes());
        buf[12..14].copy_from_slice(&b.hold_effect.to_le_bytes());
        buf[14..18].copy_from_slice(&b.hold_effect_param.to_le_bytes());
        buf
    }

    fn onix_battler() -> TurnOrderBattler {
        TurnOrderBattler {
            speed: 76,
            speed_stage: 6,
            move_priority: 0,
            is_paralyzed: false,
            ability: 0,
            hold_effect: 0,
            hold_effect_param: 0,
        }
    }
    fn grovyle_battler() -> TurnOrderBattler {
        TurnOrderBattler { speed: 90, ..onix_battler() }
    }

    #[test]
    fn fw_effective_speed_matches_native() {
        let onix = onix_battler();
        let buf = encode_turn_order_battler(&onix);
        // SAFETY: `buf` is a local 18-byte array matching TURN_ORDER_BATTLER_WIDTH exactly.
        let speed = unsafe { fw_effective_speed(buf.as_ptr(), 0, 0, 0xffff) };
        assert_eq!(
            speed,
            turn_order::effective_speed(&onix, WeatherState::default(), 0xffff)
        );
        assert_eq!(speed, 76);
    }

    #[test]
    fn fw_get_who_strikes_first_reproduces_battle1_turn1() {
        let onix = encode_turn_order_battler(&onix_battler());
        let grovyle = encode_turn_order_battler(&grovyle_battler());
        // SAFETY: both buffers are local 18-byte arrays matching TURN_ORDER_BATTLER_WIDTH exactly.
        let result =
            unsafe { fw_get_who_strikes_first(onix.as_ptr(), grovyle.as_ptr(), 0, 0, 0, 0xffff) };
        assert_eq!(result, 1, "battler2 (Grovyle, faster) strikes first");
    }

    #[test]
    fn fw_sort_battlers_by_turn_order_reproduces_gbattler_by_turn_order() {
        let ids: [u32; 2] = [0, 1];
        let battlers = [onix_battler(), grovyle_battler()];
        let mut input = Vec::new();
        input.extend_from_slice(&2u32.to_le_bytes()); // battler_count
        input.extend_from_slice(&0u32.to_le_bytes()); // roll_count
        for id in ids {
            input.extend_from_slice(&id.to_le_bytes());
        }
        for b in &battlers {
            input.extend_from_slice(&encode_turn_order_battler(b));
        }
        // no rolls
        input.push(0); // is_raining
        input.push(0); // is_sunny
        input.extend_from_slice(&0xffffu32.to_le_bytes()); // random_turn_number

        // SAFETY: `input` encodes exactly its own declared battler_count/roll_count per the documented layout.
        let ptr = unsafe { fw_sort_battlers_by_turn_order(input.as_ptr(), input.len() as u32) };
        // SAFETY: `ptr` was just returned by fw_sort_battlers_by_turn_order as a `battler_count * 4`-byte fw_alloc'd buffer.
        let order = unsafe {
            let bytes = std::slice::from_raw_parts(ptr, 8);
            [read_u32(bytes, 0), read_u32(bytes, 4)]
        };
        assert_eq!(order, [1, 0], "matches gBattlerByTurnOrder = [1, 0]");
        // SAFETY: freeing the exact (ptr, 8) pair fw_sort_battlers_by_turn_order returned.
        unsafe {
            fw_free(ptr, 8);
        }
    }

    #[test]
    fn fw_run_turn1_rng_ledger_matches_the_ram_anchored_seed() {
        const RAM_ANCHORED_SEED: u32 = 3_485_459_011;
        let ptr = fw_run_turn1_rng_ledger(RAM_ANCHORED_SEED);
        // SAFETY: `ptr` was just returned by fw_run_turn1_rng_ledger as a fixed 133-byte fw_alloc'd buffer.
        let snapshot = unsafe {
            std::slice::from_raw_parts(ptr, TURN_RNG_STEP_WIDTH * TURN_RNG_STEP_COUNT).to_vec()
        };

        let native = turn_rng::run_turn1_rng_ledger(RAM_ANCHORED_SEED);
        for (i, step) in native.iter().enumerate() {
            let off = i * TURN_RNG_STEP_WIDTH;
            assert_eq!(
                read_u32(&snapshot, off),
                step.rng_value_before,
                "step {i} before"
            );
            assert_eq!(
                read_u32(&snapshot, off + 4),
                step.rng_value_after,
                "step {i} after"
            );
            assert_eq!(
                snapshot[off + 8] as usize,
                step.roll_count,
                "step {i} roll_count"
            );
        }
        assert_eq!(
            read_u32(&snapshot, 6 * TURN_RNG_STEP_WIDTH + 4),
            4_098_214_719,
            "final rng value"
        );

        // SAFETY: freeing the exact (ptr, 133) pair fw_run_turn1_rng_ledger returned.
        unsafe {
            fw_free(ptr, (TURN_RNG_STEP_WIDTH * TURN_RNG_STEP_COUNT) as u32);
        }
    }

    // === factory_ai_mask / factory_ai_check_bad_move surface (M5c) ==========

    #[test]
    fn fw_select_factory_ai_mask_matches_native_ok_case() {
        let native = factory_ai_mask::select_factory_ai_mask(FactoryAiMaskSelectionInput {
            level_mode: 0,
            battle_mode: 0,
            factory_win_streak: 21,
            trainer_opponent_id: 299,
        })
        .unwrap();
        let ptr = fw_select_factory_ai_mask(0, 0, 21, 299);
        // SAFETY: `ptr` was just returned by fw_select_factory_ai_mask as an
        // fw_alloc'd buffer; total_len lives in the first 4 bytes.
        let bytes = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0) as usize;
            std::slice::from_raw_parts(ptr, total_len).to_vec()
        };
        assert_eq!(bytes[4], 0, "status: ok");
        assert_eq!(bytes[5], native.mask);
        assert_eq!(bytes[6], u8::from(native.receipt.is_frontier_brain));
        assert_eq!(
            read_u32(&bytes, 7),
            native.receipt.frontier_stages_per_challenge
        );
        assert_eq!(
            bytes[11],
            u8::from(native.receipt.challenge_number.is_some())
        );
        assert_eq!(
            read_u32(&bytes, 12),
            native.receipt.challenge_number.unwrap_or(0)
        );
        assert_eq!(bytes[16], native.receipt.evaluation_count);
        for i in 0..native.receipt.evaluation_count as usize {
            let e = native.receipt.evaluations[i];
            assert_eq!(bytes[17 + i * 2], e.branch as u8, "evaluation {i} branch");
            assert_eq!(
                bytes[18 + i * 2],
                u8::from(e.matched),
                "evaluation {i} matched"
            );
        }
        assert_eq!(bytes[27], native.receipt.branch as u8);
        assert_eq!(bytes.len(), 28);
        // SAFETY: freeing the exact (ptr, total_len) pair returned above.
        unsafe {
            fw_free(ptr, bytes.len() as u32);
        }
    }

    #[test]
    fn fw_select_factory_ai_mask_reports_all_four_error_sites() {
        let cases: [(u32, u32, u32, u32, u8, u32); 4] = [
            (3, 0, 0, 0, FACTORY_AI_MASK_ERROR_LEVEL_MODE, 3),
            (0, 2, 0, 0, FACTORY_AI_MASK_ERROR_BATTLE_MODE, 2),
            (
                0,
                0,
                0x1_0000,
                0,
                FACTORY_AI_MASK_ERROR_FACTORY_WIN_STREAK,
                0x1_0000,
            ),
            (
                0,
                0,
                0,
                0x1_0000,
                FACTORY_AI_MASK_ERROR_TRAINER_OPPONENT_ID,
                0x1_0000,
            ),
        ];
        for (level_mode, battle_mode, factory_win_streak, trainer_opponent_id, kind, value) in cases
        {
            let ptr = fw_select_factory_ai_mask(
                level_mode,
                battle_mode,
                factory_win_streak,
                trainer_opponent_id,
            );
            // SAFETY: fixed 10-byte error buffer per fw_select_factory_ai_mask's doc comment.
            let bytes = unsafe { std::slice::from_raw_parts(ptr, 10).to_vec() };
            assert_eq!(bytes.len(), 10);
            assert_eq!(bytes[4], 1, "status: error, case {kind}");
            assert_eq!(bytes[5], kind, "error_kind, case {kind}");
            assert_eq!(read_u32(&bytes, 6), value, "value, case {kind}");
            // SAFETY: freeing the exact (ptr, 10) pair returned above.
            unsafe {
                fw_free(ptr, 10);
            }
        }
    }

    fn encode_opt_u8(buf: &mut Vec<u8>, v: Option<u8>) {
        buf.push(u8::from(v.is_some()));
        buf.push(v.unwrap_or(0));
    }
    fn encode_opt_bool(buf: &mut Vec<u8>, v: Option<bool>) {
        encode_opt_u8(buf, v.map(u8::from));
    }
    fn encode_opt_u16(buf: &mut Vec<u8>, v: Option<u16>) {
        buf.push(u8::from(v.is_some()));
        buf.extend_from_slice(&v.unwrap_or(0).to_le_bytes());
    }
    fn encode_opt_i32(buf: &mut Vec<u8>, v: Option<i32>) {
        buf.push(u8::from(v.is_some()));
        buf.extend_from_slice(&v.unwrap_or(0).to_le_bytes());
    }
    fn encode_gender_for_test(g: FactoryAiMonGender) -> u8 {
        match g {
            FactoryAiMonGender::Male => 0,
            FactoryAiMonGender::Female => 1,
            FactoryAiMonGender::Genderless => 2,
        }
    }

    fn encode_cbm_target_for_test(buf: &mut Vec<u8>, t: &FactoryAiCheckBadMoveTarget) {
        buf.extend_from_slice(&t.species.to_le_bytes());
        buf.push(t.types[0]);
        buf.push(t.types[1]);
        encode_opt_u16(buf, t.known_ability);
        buf.extend_from_slice(&t.real_ability.to_le_bytes());
        buf.push(t.speed_stage);
        buf.push(t.atk_stage);
        buf.push(t.def_stage);
        buf.push(t.sp_def_stage);
        encode_opt_u8(buf, t.acc_stage);
        encode_opt_u8(buf, t.evasion_stage);
        encode_opt_bool(buf, t.has_any_status);
        encode_opt_bool(buf, t.safeguard_up);
        encode_opt_bool(buf, t.is_confused);
        encode_opt_bool(buf, t.is_leech_seeded);
        encode_opt_bool(buf, t.is_asleep);
        encode_opt_bool(buf, t.is_escape_prevented);
        encode_opt_bool(buf, t.is_tormented);
        encode_opt_bool(buf, t.has_perish_song);
        encode_opt_bool(buf, t.is_nightmared);
        encode_opt_bool(buf, t.is_foresighted);
        encode_opt_bool(buf, t.spikes_up);
        encode_opt_bool(buf, t.target_future_attack_up);
        encode_opt_u8(buf, t.level);
        encode_opt_u8(buf, t.sp_atk_stage);
        encode_opt_bool(buf, t.is_infatuated);
        encode_opt_bool(buf, t.any_move_disabled);
        encode_opt_bool(buf, t.any_move_encored);
        encode_opt_u8(buf, t.gender.map(encode_gender_for_test));
    }

    fn encode_cbm_attacker_for_test(buf: &mut Vec<u8>, a: &FactoryAiCheckBadMoveAttacker) {
        buf.push(a.atk_stage);
        buf.push(a.def_stage);
        encode_opt_u8(buf, a.speed_stage);
        encode_opt_u8(buf, a.sp_atk_stage);
        encode_opt_u8(buf, a.sp_def_stage);
        encode_opt_bool(buf, a.light_screen_up);
        encode_opt_bool(buf, a.reflect_up);
        encode_opt_u8(buf, a.evasion_stage);
        encode_opt_bool(buf, a.attacker_future_attack_up);
        encode_opt_bool(buf, a.has_focus_energy);
        encode_opt_bool(buf, a.has_curable_status);
        encode_opt_u8(buf, a.current_weather);
        encode_opt_u8(buf, a.level);
        encode_opt_u8(buf, a.is_first_turn);
        encode_opt_bool(buf, a.safeguard_up);
        encode_opt_bool(buf, a.is_asleep);
        encode_opt_u8(buf, a.usable_party_mons);
        encode_opt_bool(buf, a.has_substitute);
        encode_opt_i32(buf, a.hp);
        encode_opt_i32(buf, a.max_hp);
        encode_opt_bool(buf, a.is_rooted);
        encode_opt_u8(buf, a.acc_stage);
        encode_opt_bool(buf, a.mist_up);
        encode_opt_u8(buf, a.gender.map(encode_gender_for_test));
        encode_opt_bool(buf, a.imprisoned_others);
        encode_opt_bool(buf, a.mud_sport_up);
        encode_opt_bool(buf, a.water_sport_up);
        encode_opt_u16(buf, a.used_held_item_id);
        encode_opt_u8(buf, a.stockpile_count);
    }

    fn encode_cbm_preamble_input_for_test(input: &CheckBadMovePreambleInput) -> Vec<u8> {
        let mut buf: Vec<u8> = Vec::with_capacity(CBM_PREAMBLE_INPUT_WIDTH);
        buf.extend_from_slice(&input.rng.value.to_le_bytes());
        buf.extend_from_slice(&input.rng.calls.to_le_bytes());
        buf.extend_from_slice(&input.move_id.to_le_bytes());
        buf.extend_from_slice(&input.draw_ordinal_start.to_le_bytes());
        encode_cbm_target_for_test(&mut buf, &input.target.target);
        encode_opt_u8(&mut buf, input.target.usable_party_mons);
        encode_cbm_attacker_for_test(&mut buf, &input.attacker);
        assert_eq!(buf.len(), CBM_PREAMBLE_INPUT_WIDTH);
        buf
    }

    fn empty_cbm_target_for_test(
        species: u16,
        types: [u8; 2],
        real_ability: u16,
    ) -> FactoryAiCheckBadMoveTarget {
        FactoryAiCheckBadMoveTarget {
            species,
            types,
            known_ability: None,
            real_ability,
            speed_stage: 6,
            atk_stage: 6,
            def_stage: 6,
            sp_def_stage: 6,
            acc_stage: None,
            evasion_stage: None,
            has_any_status: None,
            safeguard_up: None,
            is_confused: None,
            is_leech_seeded: None,
            is_asleep: None,
            is_escape_prevented: None,
            is_tormented: None,
            has_perish_song: None,
            is_nightmared: None,
            is_foresighted: None,
            spikes_up: None,
            target_future_attack_up: None,
            level: None,
            sp_atk_stage: None,
            is_infatuated: None,
            any_move_disabled: None,
            any_move_encored: None,
            gender: None,
        }
    }

    fn empty_cbm_attacker_for_test() -> FactoryAiCheckBadMoveAttacker {
        FactoryAiCheckBadMoveAttacker {
            atk_stage: 6,
            def_stage: 6,
            speed_stage: None,
            sp_atk_stage: None,
            sp_def_stage: None,
            light_screen_up: None,
            reflect_up: None,
            evasion_stage: None,
            attacker_future_attack_up: None,
            has_focus_energy: None,
            has_curable_status: None,
            current_weather: None,
            level: None,
            is_first_turn: None,
            safeguard_up: None,
            is_asleep: None,
            usable_party_mons: None,
            has_substitute: None,
            hp: None,
            max_hp: None,
            is_rooted: None,
            acc_stage: None,
            mist_up: None,
            gender: None,
            imprisoned_others: None,
            mud_sport_up: None,
            water_sport_up: None,
            used_held_item_id: None,
            stockpile_count: None,
        }
    }

    fn decode_cbm_draw_for_test(
        bytes: &[u8],
        off: usize,
    ) -> (u32, u8, u32, u32, u32, u32, u32, u16, u16) {
        (
            read_u32(bytes, off),
            bytes[off + 4],
            read_u32(bytes, off + 5),
            read_u32(bytes, off + 9),
            read_u32(bytes, off + 13),
            read_u32(bytes, off + 17),
            read_u32(bytes, off + 21),
            u16::from_le_bytes(bytes[off + 25..off + 27].try_into().unwrap()),
            u16::from_le_bytes(bytes[off + 27..off + 29].try_into().unwrap()),
        )
    }

    #[test]
    fn fw_run_check_bad_move_preamble_matches_native_two_draw_case() {
        // Mirrors factory_ai_check_bad_move.rs's own
        // non_immune_no_table_entry_move_draws_exactly_two_and_scores_zero
        // (MOVE_SURF=57 vs MAROWAK [GROUND,GROUND]): MAROWAK's two distinct
        // unknown abilities (69 ROCK_HEAD / 31 LIGHTNING_ROD) force a genuine
        // advance_rng_value draw at both the negates-type and soundproof
        // preamble call sites (module doc comment's "never caches" quirk).
        const MAROWAK: u16 = 105;
        const ABILITY_ROCK_HEAD: u16 = 69;
        const TYPE_GROUND: u8 = 4;
        const RNG_SEED: u32 = 249_678_687;

        let t = empty_cbm_target_for_test(MAROWAK, [TYPE_GROUND, TYPE_GROUND], ABILITY_ROCK_HEAD);
        let input = CheckBadMovePreambleInput {
            rng: BattleRngState { value: RNG_SEED, calls: 0 },
            move_id: 57,
            target: FactoryAiCheckBadMoveRoarTarget { target: t, usable_party_mons: None },
            attacker: empty_cbm_attacker_for_test(),
            draw_ordinal_start: 1,
        };
        let native = factory_ai_check_bad_move::run_check_bad_move_preamble(input);
        let CheckBadMoveResult::Scored {
            rng: native_rng,
            draws: native_draws,
            draw_count: native_draw_count,
            score_delta: native_score_delta,
        } = native
        else {
            panic!("expected Scored");
        };
        assert_eq!(native_draw_count, 2);

        let buf = encode_cbm_preamble_input_for_test(&input);
        // SAFETY: `buf` is exactly CBM_PREAMBLE_INPUT_WIDTH bytes, matching
        // fw_run_check_bad_move_preamble's documented input layout.
        let ptr = unsafe { fw_run_check_bad_move_preamble(buf.as_ptr()) };
        // SAFETY: `ptr` was just returned as an fw_alloc'd buffer; total_len
        // lives in the first 4 bytes.
        let bytes = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0) as usize;
            std::slice::from_raw_parts(ptr, total_len).to_vec()
        };

        assert_eq!(bytes[4], 0, "status: scored");
        assert_eq!(read_u32(&bytes, 5), native_rng.value);
        assert_eq!(read_u32(&bytes, 9), native_rng.calls);
        assert_eq!(bytes[13], native_draw_count);
        for (i, expected) in native_draws
            .iter()
            .enumerate()
            .take(native_draw_count as usize)
        {
            let (ordinal, site, before_v, before_c, after_v, after_c, raw, random, guessed) =
                decode_cbm_draw_for_test(&bytes, 14 + i * 29);
            assert_eq!(ordinal, expected.ordinal, "draw {i} ordinal");
            assert_eq!(site, expected.site as u8, "draw {i} site");
            assert_eq!(before_v, expected.before.value, "draw {i} before.value");
            assert_eq!(before_c, expected.before.calls, "draw {i} before.calls");
            assert_eq!(after_v, expected.after.value, "draw {i} after.value");
            assert_eq!(after_c, expected.after.calls, "draw {i} after.calls");
            assert_eq!(raw, expected.raw_rng_value, "draw {i} raw_rng_value");
            assert_eq!(random, expected.random_value, "draw {i} random_value");
            assert_eq!(
                guessed, expected.guessed_ability,
                "draw {i} guessed_ability"
            );
        }
        assert_eq!(
            i32::from_le_bytes(bytes[101..105].try_into().unwrap()),
            native_score_delta
        );
        assert_eq!(bytes.len(), 105);

        // SAFETY: freeing the exact (ptr, total_len) pair returned above.
        unsafe {
            fw_free(ptr, bytes.len() as u32);
        }
    }

    #[test]
    fn fw_run_check_bad_move_preamble_type_immune_zero_draws_matches_native() {
        // MOVE_THUNDERBOLT=85 vs MAROWAK [GROUND,GROUND]: Electric vs
        // Ground/Ground is 0x, Score_Minus10 before any ability draw.
        const MAROWAK: u16 = 105;
        const ABILITY_ROCK_HEAD: u16 = 69;
        const TYPE_GROUND: u8 = 4;
        const RNG_SEED: u32 = 249_678_687;

        let t = empty_cbm_target_for_test(MAROWAK, [TYPE_GROUND, TYPE_GROUND], ABILITY_ROCK_HEAD);
        let input = CheckBadMovePreambleInput {
            rng: BattleRngState { value: RNG_SEED, calls: 0 },
            move_id: 85,
            target: FactoryAiCheckBadMoveRoarTarget { target: t, usable_party_mons: None },
            attacker: empty_cbm_attacker_for_test(),
            draw_ordinal_start: 1,
        };
        let buf = encode_cbm_preamble_input_for_test(&input);
        // SAFETY: `buf` is exactly CBM_PREAMBLE_INPUT_WIDTH bytes.
        let ptr = unsafe { fw_run_check_bad_move_preamble(buf.as_ptr()) };
        // SAFETY: `ptr` was just returned as an fw_alloc'd buffer.
        let bytes = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0) as usize;
            std::slice::from_raw_parts(ptr, total_len).to_vec()
        };
        assert_eq!(bytes[4], 0, "status: scored");
        assert_eq!(read_u32(&bytes, 5), RNG_SEED, "rng untouched");
        assert_eq!(read_u32(&bytes, 9), 0, "rng.calls untouched");
        assert_eq!(bytes[13], 0, "draw_count");
        assert_eq!(i32::from_le_bytes(bytes[101..105].try_into().unwrap()), -10);
        assert_eq!(bytes.len(), 105);
        // SAFETY: freeing the exact (ptr, total_len) pair returned above.
        unsafe {
            fw_free(ptr, bytes.len() as u32);
        }
    }

    #[test]
    fn fw_run_check_bad_move_preamble_unknown_move_id_is_an_error_not_a_trap() {
        const MAROWAK: u16 = 105;
        const ABILITY_ROCK_HEAD: u16 = 69;
        const TYPE_GROUND: u8 = 4;
        let t = empty_cbm_target_for_test(MAROWAK, [TYPE_GROUND, TYPE_GROUND], ABILITY_ROCK_HEAD);
        let input = CheckBadMovePreambleInput {
            rng: BattleRngState { value: 1, calls: 0 },
            move_id: 9999,
            target: FactoryAiCheckBadMoveRoarTarget { target: t, usable_party_mons: None },
            attacker: empty_cbm_attacker_for_test(),
            draw_ordinal_start: 1,
        };
        let buf = encode_cbm_preamble_input_for_test(&input);
        // SAFETY: `buf` is exactly CBM_PREAMBLE_INPUT_WIDTH bytes.
        let ptr = unsafe { fw_run_check_bad_move_preamble(buf.as_ptr()) };
        // SAFETY: `ptr` was just returned as an fw_alloc'd buffer.
        let bytes = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0) as usize;
            std::slice::from_raw_parts(ptr, total_len).to_vec()
        };
        assert_eq!(bytes[4], 2, "status: error");
        let message_len = u16::from_le_bytes(bytes[5..7].try_into().unwrap()) as usize;
        let message = std::str::from_utf8(&bytes[7..7 + message_len]).unwrap();
        assert_eq!(message, "factory-ai-check-bad-move: unknown move 9999");
        // SAFETY: freeing the exact (ptr, total_len) pair returned above.
        unsafe {
            fw_free(ptr, bytes.len() as u32);
        }
    }

    #[test]
    fn fw_choose_factory_ai_mask_zero_preserves_authoritative_self_target() {
        let mut input = Vec::new();
        input.extend_from_slice(&1u32.to_le_bytes()); // rng.value
        input.extend_from_slice(&7u32.to_le_bytes()); // rng.calls
        input.extend_from_slice(&0u32.to_le_bytes()); // level 50
        input.extend_from_slice(&0u32.to_le_bytes()); // singles
        input.extend_from_slice(&0u32.to_le_bytes()); // streak => mask 0
        input.extend_from_slice(&50u32.to_le_bytes());
        for move_id in [85u16, 86, 69, 273] {
            input.extend_from_slice(&move_id.to_le_bytes());
        }
        input.push(0); // command
        input.extend_from_slice(&77u32.to_le_bytes());
        input.extend_from_slice(&[1, 1, 1]); // trainer, battler 1, one legal
        input.extend_from_slice(&[0, 3, 1]); // use slot 3, authoritative self target
        assert_eq!(input.len(), 43);

        // SAFETY: the vector follows the export's complete documented layout.
        let ptr =
            unsafe { fw_choose_factory_ai_mask_zero_decision(input.as_ptr(), input.len() as u32) };
        // SAFETY: the export returns an fw_alloc'd length-prefixed buffer.
        let bytes = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0) as usize;
            std::slice::from_raw_parts(ptr, total_len).to_vec()
        };
        assert_eq!(bytes[4], 0);
        assert_eq!(read_u32(&bytes, 5), 77);
        assert_eq!(bytes[9], 1);
        assert_eq!(bytes[10], 3);
        assert_eq!(bytes[11], 1);
        assert_eq!(read_u32(&bytes, 16), 12); // incoming 7 + setup 4 + tie 1
        unsafe { fw_free(ptr, bytes.len() as u32) };
    }

    #[test]
    fn fw_choose_factory_ai_scored_returns_a_safe_exact_error_buffer() {
        // A structurally complete zero-filled record selects Player battler 0;
        // native validation rejects it before it can enter any scorer.
        let input = vec![0u8; FACTORY_AI_SCORED_INPUT_FIXED_WIDTH];
        // SAFETY: exact fixed width, with legal_count=0 at byte 39.
        let ptr =
            unsafe { fw_choose_factory_ai_scored_decision(input.as_ptr(), input.len() as u32) };
        // SAFETY: the export returns an fw_alloc'd length-prefixed buffer.
        let bytes = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0) as usize;
            std::slice::from_raw_parts(ptr, total_len).to_vec()
        };
        assert_eq!(bytes[4], 1);
        let message_len = read_u32(&bytes, 5) as usize;
        assert_eq!(
            std::str::from_utf8(&bytes[9..9 + message_len]).unwrap(),
            "Factory AI scored policy requires the current trainer battler-1 request"
        );
        unsafe { fw_free(ptr, bytes.len() as u32) };
    }

    fn copied_boundary_buffer(ptr: *mut u8) -> Vec<u8> {
        // SAFETY: every switch export returns an fw_alloc'd length-prefixed
        // buffer, and callers below retain it until this copy completes.
        unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0) as usize;
            let bytes = std::slice::from_raw_parts(ptr, total_len).to_vec();
            fw_free(ptr, total_len as u32);
            bytes
        }
    }

    #[test]
    fn fw_switch_into_valid_empty_input_returns_typed_fallback_needed() {
        let input = [0u8; SWITCH_INTO_INPUT_WIDTH];
        // SAFETY: exact documented width.
        let ptr =
            unsafe { fw_get_most_suitable_mon_to_switch_into(input.as_ptr(), input.len() as u32) };
        let bytes = copied_boundary_buffer(ptr);
        assert_eq!(&bytes[4..], &[1], "damage-fallback-needed status");
    }

    #[test]
    fn fw_switch_policy_valid_nontrainer_input_returns_typed_policy_error() {
        let input = [0u8; SWITCH_POLICY_INPUT_WIDTH];
        // SAFETY: exact documented width.
        let ptr =
            unsafe { fw_evaluate_factory_ai_switch_policy(input.as_ptr(), input.len() as u32) };
        let bytes = copied_boundary_buffer(ptr);
        assert_eq!(bytes[4], 1, "typed policy error");
        assert_eq!(bytes[5], 0, "precheck is not blocked");
        let message_len = u16::from_le_bytes(bytes[6..8].try_into().unwrap()) as usize;
        assert_eq!(
            std::str::from_utf8(&bytes[8..8 + message_len]).unwrap(),
            "factory-ai-switch-policy supports only trainer singles"
        );
    }

    #[test]
    fn switch_exports_reject_wrong_lengths_without_reading_or_trapping() {
        let input = [0u8];
        for (ptr, expected) in [
            (
                // SAFETY: wrong length is rejected before input_ptr is read.
                unsafe { fw_get_most_suitable_mon_to_switch_into(input.as_ptr(), 1) },
                "factory-wasm factoryAiEngine: switch-into input must be exactly 114 bytes",
            ),
            (
                // SAFETY: wrong length is rejected before input_ptr is read.
                unsafe { fw_evaluate_factory_ai_switch_policy(input.as_ptr(), 1) },
                "factory-wasm factoryAiEngine: switch-policy input must be exactly 401 bytes",
            ),
        ] {
            let bytes = copied_boundary_buffer(ptr);
            assert_eq!(bytes[4], 2, "boundary error");
            let message_len = u16::from_le_bytes(bytes[5..7].try_into().unwrap()) as usize;
            assert_eq!(
                std::str::from_utf8(&bytes[7..7 + message_len]).unwrap(),
                expected
            );
        }
    }
}

#[cfg(test)]
mod factory_swap_boundary_tests {
    use super::fw_apply_factory_swap_operation;
    use super::fw_free;

    fn push_string(packet: &mut Vec<u8>, value: &str) {
        packet.extend_from_slice(&(value.len() as u32).to_le_bytes());
        packet.extend_from_slice(value.as_bytes());
    }

    fn push_mon(packet: &mut Vec<u8>, id: &str, species: &str) {
        push_string(packet, id);
        push_string(packet, species);
        packet.extend_from_slice(&100u32.to_le_bytes());
        packet.extend_from_slice(&100u32.to_le_bytes());
        packet.push(0); // none
        packet.extend_from_slice(&0x0102_0304u32.to_le_bytes());
        packet.push(0);
        packet.push(70);
    }

    fn create_packet() -> Vec<u8> {
        let mut packet = vec![1, 0];
        for index in 0..3 {
            push_mon(
                &mut packet,
                &format!("player-{index}"),
                &format!("PLAYER_{index}"),
            );
        }
        for index in 0..3 {
            push_mon(
                &mut packet,
                &format!("enemy-{index}"),
                &format!("ENEMY_{index}"),
            );
        }
        for index in 0..6u32 {
            packet.extend_from_slice(&(100 + index).to_le_bytes());
            packet.extend_from_slice(&(200 + index).to_le_bytes());
            packet.extend_from_slice(&3u32.to_le_bytes());
            packet.push((index & 1) as u8);
        }
        packet
    }

    fn copy_output(ptr: *mut u8) -> Vec<u8> {
        // SAFETY: every boundary result is allocated by fw_alloc and starts
        // with its own total length.
        unsafe {
            let total_len =
                u32::from_le_bytes(std::slice::from_raw_parts(ptr, 4).try_into().unwrap());
            let bytes = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            fw_free(ptr, total_len);
            bytes
        }
    }

    #[test]
    fn factory_swap_boundary_accepts_a_valid_create_packet() {
        let packet = create_packet();
        // SAFETY: packet is a live, initialized buffer for the documented ABI.
        let bytes = copy_output(unsafe {
            fw_apply_factory_swap_operation(packet.as_ptr(), packet.len() as u32)
        });
        assert_eq!(bytes[4], 0);
        assert_eq!(bytes[5], 0, "state value kind");
        assert_eq!(bytes[6], 0, "created phase is playerPicker");
        assert_eq!(bytes[bytes.len() - 1], 0, "created result is absent");
    }

    #[test]
    fn factory_swap_boundary_preserves_the_exact_semantic_error() {
        let create = create_packet();
        // First obtain the encoded state, then reuse its state payload for an
        // apply packet whose selections are both absent.
        // SAFETY: create is a live, initialized buffer for the documented ABI.
        let created = copy_output(unsafe {
            fw_apply_factory_swap_operation(create.as_ptr(), create.len() as u32)
        });
        let mut apply = vec![1, 5];
        apply.extend_from_slice(&created[6..]);
        // SAFETY: apply is a live, initialized buffer for the documented ABI.
        let bytes = copy_output(unsafe {
            fw_apply_factory_swap_operation(apply.as_ptr(), apply.len() as u32)
        });
        assert_eq!(bytes[4], 1);
        let message_len = u32::from_le_bytes(bytes[5..9].try_into().unwrap()) as usize;
        assert_eq!(
            std::str::from_utf8(&bytes[9..9 + message_len]).unwrap(),
            "accepted Factory swap requires both selected party indexes"
        );
    }

    #[test]
    fn factory_swap_boundary_reports_truncation_append_and_bad_tags_as_status_2() {
        for mut packet in [vec![1, 0], vec![1, 0xff]] {
            // SAFETY: malformed packets are validated before any unchecked
            // semantic access and the pointer remains valid for this call.
            let bytes = copy_output(unsafe {
                fw_apply_factory_swap_operation(packet.as_mut_ptr(), packet.len() as u32)
            });
            assert_eq!(bytes[4], 2);
        }
        let mut appended = create_packet();
        appended.push(0);
        // SAFETY: the appended packet is a live initialized malformed packet.
        let bytes = copy_output(unsafe {
            fw_apply_factory_swap_operation(appended.as_ptr(), appended.len() as u32)
        });
        assert_eq!(bytes[4], 2);
    }
}

#[cfg(test)]
mod factory_draft_boundary_tests {
    use super::fw_apply_factory_draft_selection_operation;
    use super::fw_free;

    fn copy_output(ptr: *mut u8) -> Vec<u8> {
        // SAFETY: every boundary result is allocated by fw_alloc and starts
        // with its own total length.
        unsafe {
            let total_len =
                u32::from_le_bytes(std::slice::from_raw_parts(ptr, 4).try_into().unwrap());
            let bytes = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            fw_free(ptr, total_len);
            bytes
        }
    }

    /// Appends one draft-selection rental record in the exact documented
    /// order: `set_id,personality,fixed_iv,ability_slot,ot_presence,[ot_id],
    /// ivs_presence,[ivs_packed]`.
    fn push_draft_rental(
        buf: &mut Vec<u8>,
        set_id: u32,
        personality: u32,
        fixed_iv: u32,
        ability_slot: u8,
        ot_id: Option<u32>,
        ivs_packed: Option<u32>,
    ) {
        buf.extend_from_slice(&set_id.to_le_bytes());
        buf.extend_from_slice(&personality.to_le_bytes());
        buf.extend_from_slice(&fixed_iv.to_le_bytes());
        buf.push(ability_slot);
        for optional in [ot_id, ivs_packed] {
            match optional {
                None => buf.push(0),
                Some(value) => {
                    buf.push(1);
                    buf.extend_from_slice(&value.to_le_bytes());
                }
            }
        }
    }

    /// The six pool records for the packet below: slot 0 carries the distinct
    /// spread, slot 2 an all-31 spread, and every other slot none.
    fn draft_rental_pool(buf: &mut Vec<u8>) {
        // 1 | 7 << 5 | 13 << 10 | 19 << 15 | 25 << 20 | 31 << 25, the packed
        // word pinned by create_factory_party_member_with_ivs's own test.
        push_draft_rental(
            buf,
            110,
            813_709_149,
            7,
            1,
            Some(0x1234_5678),
            Some(1_067_037_921),
        );
        push_draft_rental(buf, 3, 4, 5, 0, None, None);
        push_draft_rental(buf, 9, 10, 31, 0, None, Some(0x3fff_ffff));
        for slot in 3..6u32 {
            push_draft_rental(buf, slot, 0, 0, 0, None, None);
        }
    }

    #[test]
    fn factory_draft_selected_rental_party_round_trips_the_optional_packed_ivs() {
        // Routing is IV-blind (selected_rental_party is generic over
        // T: Clone), so the boundary's whole job here is to hand back each
        // ranked source record byte-for-byte, absent optionals included.
        let mut packet = vec![1, 5, 2, 1, 3, 0, 0, 0];
        draft_rental_pool(&mut packet);
        // SAFETY: the vector follows the export's complete documented layout.
        let bytes = copy_output(unsafe {
            fw_apply_factory_draft_selection_operation(packet.as_ptr(), packet.len() as u32)
        });
        assert_eq!(bytes[4], 0, "status");
        assert_eq!(bytes[5], 4, "rental-party value kind");

        let mut expected = Vec::new();
        push_draft_rental(&mut expected, 3, 4, 5, 0, None, None);
        push_draft_rental(
            &mut expected,
            110,
            813_709_149,
            7,
            1,
            Some(0x1234_5678),
            Some(1_067_037_921),
        );
        push_draft_rental(&mut expected, 9, 10, 31, 0, None, Some(0x3fff_ffff));
        assert_eq!(&bytes[6..], &expected[..], "ranked records, spreads intact");
    }

    #[test]
    fn factory_draft_rental_rejects_an_out_of_domain_ivs_presence_tag() {
        let mut packet = vec![1, 5, 2, 1, 3, 0, 0, 0];
        draft_rental_pool(&mut packet);
        // Record 0 starts at byte 8 and carries an ot_id, so its ivs presence
        // tag sits at 4+4+4 + 1 + 1+4 = 18 bytes into the record.
        packet[8 + 18] = 2;
        // SAFETY: malformed packets are validated before any semantic access.
        let bytes = copy_output(unsafe {
            fw_apply_factory_draft_selection_operation(packet.as_ptr(), packet.len() as u32)
        });
        assert_eq!(bytes[4], 2, "malformed-packet status");
    }
}
