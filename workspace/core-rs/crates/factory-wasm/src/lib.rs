//! factory-wasm — the WASM boundary crate. Keep this a THIN wrapper:
//! all logic lives in factory-core; this crate only exposes it.
//!
//! ABI v1 (see `../../RUST_PROGRESS.md` R2): every export is prefixed
//! `fw_`; scalars cross as `u32`; structured data (future milestones)
//! crosses as caller-allocated length-prefixed little-endian byte
//! buffers via `fw_alloc`/`fw_free`. Hand-rolled C ABI, zero
//! dependencies — no wasm-bindgen.

use factory_core::damage_calc::{
    self, AccuracyCalcInput, CritChanceInput, CritMoveEffect, DamageBattler, DamageCalcInput,
    StatStages,
};
use factory_core::factory_ai_check_bad_move::{
    self, BattleRngState, CheckBadMovePreambleInput, CheckBadMoveResult,
    FactoryAiCheckBadMoveAttacker, FactoryAiCheckBadMoveRoarTarget, FactoryAiCheckBadMoveTarget,
    FactoryAiMonGender,
};
use factory_core::factory_ai_mask::{self, FactoryAiMaskError, FactoryAiMaskSelectionInput};
use factory_core::gen_tables;
use factory_core::gender::MonGender;
use factory_core::mon_construction::{
    self, FactoryCorpusPartyInstance, FactoryCorpusPartyMemberState, PartyMemberError,
};
use factory_core::rental_generation::{self, GenerationError, GenerationInput, GenerationResult};
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
/// 5       2      message_len (u16)
/// 7       message_len   message (utf8 bytes)
///                total_len == 7 + message_len
///
/// --- status == 0 (ok) ---
/// 5       4      challenge_num (u32)
/// 9       1      rental_rank (u8)
/// 10      4      selection_rng_value (u32)
/// 14      4      rng_value (u32)
/// 18      138    rentals: 6 fixed-width 23-byte records, back to back
///                (offsets below are relative to each record's start):
///                  0   2   set_id (u16)
///                  2   4   personality (u32)
///                  6   1   fixed_iv (u8)
///                  7   1   ability_slot (u8)
///                  8   4   ot_id (u32)
///                  12  2   species_id (u16)
///                  14  2   item_id (u16)
///                  16  1   nature (u8)
///                  17  2   selection_draw_position (u16)
///                  19  2   personality_draw_positions[0] (u16)
///                  21  2   personality_draw_positions[1] (u16)
/// 156     4      ledger_count (u32)
/// 160     ledger_count * 26   draw_ledger: fixed-width 26-byte entries,
///                back to back (offsets below are relative to each entry's
///                start). Every entry carries all fields; fields the TS
///                engine leaves absent for that entry's `phase` are
///                encoded as 0 and MUST be ignored by the decoder (it
///                already knows which fields apply from `phase`):
///                  0   1   phase (u8) — 0 = set-selection, 1 = personality
///                  1   1   purpose (u8) — 0 = set-candidate,
///                          1 = personality-low, 2 = personality-high
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
///                total_len == 160 + 26 * ledger_count
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
fn encode_generation_result(result: Result<GenerationResult, GenerationError>) -> Vec<u8> {
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
        Ok(r) => {
            buf.push(0); // status: ok
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
        }
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

        let ledger_count = read_u32(&snapshot, 156);
        assert_eq!(ledger_count, 198, "ledger_count");
        assert_eq!(
            total_len,
            160 + 26 * ledger_count,
            "total_len == 160 + 26 * ledger_count"
        );
        assert_eq!(snapshot.len() as u32, total_len);

        // ledger[0]: set-selection / set-candidate, rngBefore 0, accepted.
        let e0 = 160;
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
    fn generate_initial_rentals_error_buffer_names_the_0_7_constraint() {
        // factoryWinStreak 56 / 7 == 8, same as
        // factory-core::rental_generation::tests::rejects_challenge_8_with_the_0_7_rationale.
        let ptr = fw_generate_initial_rentals(0, 56, 0, 0, 0, 0);
        // SAFETY: see generate_initial_rentals_ok_buffer_matches_the_seed_0_fixture.
        let (total_len, snapshot) = unsafe {
            let total_len = read_u32(std::slice::from_raw_parts(ptr, 4), 0);
            let snapshot = std::slice::from_raw_parts(ptr, total_len as usize).to_vec();
            (total_len, snapshot)
        };

        assert_eq!(snapshot[4], 1, "status: error");
        let message_len = read_u16(&snapshot, 5) as usize;
        let message = std::str::from_utf8(&snapshot[7..7 + message_len]).unwrap();
        assert_eq!(
            message,
            "Level-50 initial rental generation supports source challenges 0..7, got 8"
        );
        assert_eq!(total_len as usize, 7 + message_len);

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
}
