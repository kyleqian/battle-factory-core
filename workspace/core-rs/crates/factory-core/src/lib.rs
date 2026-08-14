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

pub mod battle_ai_switch_into;
pub mod battle_ai_switch_into_vectors_gen;
pub mod battle_script_ai_reveal;
pub mod battle_script_ai_reveal_vectors_gen;
pub mod battle_script_battler_positions;
pub mod battle_script_battler_positions_vectors_gen;
pub mod battle_script_gender;
pub mod battle_script_gender_vectors_gen;
pub mod battle_script_negativedamage;
pub mod battle_script_negativedamage_vectors_gen;
pub mod battle_script_setalwayshitflag;
pub mod battle_script_setalwayshitflag_vectors_gen;
pub mod battle_script_setdestinybond;
pub mod battle_script_setdestinybond_vectors_gen;
pub mod battle_script_setminimize;
pub mod battle_script_setminimize_vectors_gen;
pub mod battle_script_settaunt;
pub mod battle_script_settaunt_vectors_gen;
pub mod battle_script_setyawn;
pub mod battle_script_setyawn_vectors_gen;
pub mod damage_calc;
pub mod damage_vectors_gen;
pub mod factory_ai_battle_history;
pub mod factory_ai_battle_history_vectors_gen;
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
pub mod factory_ai_decision_policy;
pub mod factory_ai_decision_policy_vectors_gen;
pub mod factory_ai_live_decision_bridge;
pub mod factory_ai_live_decision_bridge_vectors_gen;
pub mod factory_ai_live_planner;
pub mod factory_ai_live_planner_vectors_gen;
pub mod factory_ai_live_replay;
pub mod factory_ai_live_replay_vectors_gen;
pub mod factory_ai_live_view;
pub mod factory_ai_live_view_constructor_vectors_gen;
pub mod factory_ai_live_view_vectors_gen;
pub mod factory_ai_mask;
pub mod factory_ai_mask_vectors_gen;
pub mod factory_ai_scored_decision_vectors_gen;
pub mod factory_ai_switch_policy;
pub mod factory_ai_switch_policy_vectors_gen;
pub mod factory_ai_try_to_faint;
pub mod factory_ai_try_to_faint_vectors_gen;
pub mod factory_draft_selection;
pub mod factory_draft_selection_vectors_gen;
pub mod factory_swap;
pub mod factory_swap_vectors_gen;
pub mod factory_trainer_schedule;
pub mod factory_trainer_schedule_vectors_gen;
pub mod gen_tables;
pub mod gender;
pub mod key_repeat;
pub mod key_repeat_vectors_gen;
pub mod mon_construction;
pub mod rental_data;
pub mod rental_generation;
pub mod rng;
pub mod species_gender_ratios_gen;
pub mod stats;
pub mod turn_order;
pub mod turn_rng;
pub mod turn_vectors_gen;
