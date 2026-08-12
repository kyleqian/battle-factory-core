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
}
