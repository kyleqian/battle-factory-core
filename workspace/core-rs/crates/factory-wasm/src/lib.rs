//! factory-wasm — the WASM boundary crate. Keep this a THIN wrapper:
//! all logic lives in factory-core; this crate only exposes it.
//!
//! ABI v1 (see `../../RUST_PROGRESS.md` R2): every export is prefixed
//! `fw_`; scalars cross as `u32`; structured data (future milestones)
//! crosses as caller-allocated length-prefixed little-endian byte
//! buffers via `fw_alloc`/`fw_free`. Hand-rolled C ABI, zero
//! dependencies — no wasm-bindgen.

use factory_core::rental_generation::{self, GenerationError, GenerationInput, GenerationResult};
use factory_core::rng;

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
}
