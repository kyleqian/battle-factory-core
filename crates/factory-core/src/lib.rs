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

pub mod damage_calc;
pub mod damage_vectors_gen;
pub mod factory_ai_check_bad_move;
pub mod factory_ai_check_bad_move_m5b1_vectors_gen;
pub mod factory_ai_check_bad_move_m5b2_vectors_gen;
pub mod factory_ai_check_bad_move_m5b3_vectors_gen;
pub mod factory_ai_check_bad_move_vectors_gen;
pub mod factory_ai_check_viability;
pub mod factory_ai_check_viability_m5d1_vectors_gen;
pub mod factory_ai_check_viability_m5d2_vectors_gen;
pub mod factory_ai_check_viability_m5d3_vectors_gen;
pub mod factory_ai_check_viability_m5d4_vectors_gen;
pub mod factory_ai_check_viability_m5d5_vectors_gen;
pub mod factory_ai_check_viability_shell_vectors_gen;
pub mod factory_ai_mask;
pub mod factory_ai_mask_vectors_gen;
pub mod gen_tables;
pub mod gender;
pub mod mon_construction;
pub mod rental_data;
pub mod rental_generation;
pub mod rng;
pub mod stats;
pub mod turn_order;
pub mod turn_rng;
pub mod turn_vectors_gen;
