//! factory-wasm — the WASM boundary crate. Keep this a THIN wrapper:
//! all logic lives in factory-core; this crate only exposes it.
//!
//! ABI v1 (see `../../RUST_PROGRESS.md` R2): every export is prefixed
//! `fw_`; scalars cross as `u32`; structured data (future milestones)
//! crosses as caller-allocated length-prefixed little-endian byte
//! buffers via `fw_alloc`/`fw_free`. Hand-rolled C ABI, zero
//! dependencies — no wasm-bindgen.

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
}
