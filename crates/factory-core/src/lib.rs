//! factory-core — the deterministic engine core of pokeemerald-factory,
//! ported from the test-pinned TypeScript implementation in `../../src/`.
//!
//! Ground rules (mirroring the TS engine's evidence discipline):
//! - Pure logic only: no I/O, no clocks, no randomness beyond the ported
//!   Gen-3 LCG, no platform calls. Everything is a function of its inputs.
//! - The TS engine + vitest suite is the spec. A module is ported by
//!   reproducing its pinned fixtures, not by re-deriving behavior from the
//!   C source alone.
//! - No fitted constants. Every magic number cites its origin
//!   (reference/pokeemerald path or a TS module that already carries the
//!   citation).

pub mod rng;
