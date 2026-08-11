//! factory-wasm — the WASM boundary crate. Keep this a THIN wrapper:
//! all logic lives in factory-core; this crate only exposes it.
//!
//! Current surface is a minimal C-ABI proof that the wasm32 pipeline works
//! end to end with zero dependencies (buildable offline). Whether the real
//! boundary uses wasm-bindgen (needs a crates.io fetch) or stays
//! hand-rolled is the Rust lane's first design decision — record it in
//! RUST_PROGRESS.md before widening this surface.

use factory_core::rng;

/// One LCG step: returns the next raw gRngValue.
#[no_mangle]
pub extern "C" fn factory_rng_advance(rng_value: u32) -> u32 {
    rng::advance_rng_value(rng_value)
}

/// Random()'s u16 output for a just-advanced gRngValue (upper 16 bits).
#[no_mangle]
pub extern "C" fn factory_rng_output(rng_value: u32) -> u32 {
    rng_value >> 16
}
