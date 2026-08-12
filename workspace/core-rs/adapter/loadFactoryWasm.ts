// Hand-written Node ESM loader for the factory-wasm ABI v1 boundary
// (see ../README.md "Boundary (ABI v1)" and ../RUST_PROGRESS.md R2).
// No dependencies. Node-only for now (fs.readFileSync + WebAssembly.instantiate);
// the browser/Vite path will be added at the seam later without changing
// this module's exported API (loadFactoryWasm / assertAbiVersion stay the
// same shape, only the byte-loading step differs).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The fw_ ABI v1 export surface, plus the instance's linear memory. */
export interface FactoryWasmExports {
  fw_abi_version(): number;
  fw_rng_advance(rng_value: number): number;
  fw_rng_output(rng_value: number): number;
  fw_alloc(len: number): number;
  fw_free(ptr: number, len: number): void;
  /**
   * Runs the initial-rental generator and returns an `fw_alloc`'d buffer
   * pointer; see the doc comment over the Rust export
   * (`crates/factory-wasm/src/lib.rs`) for the exact layout, and
   * `adapter/factoryEngine.ts` for the decoder. `has_construction_rng` is a
   * 0/1 flag gating `construction_rng_value` (no native `Option` on the
   * WASM ABI).
   */
  fw_generate_initial_rentals(
    rng_value: number,
    factory_win_streak: number,
    rents_count: number,
    player_trainer_id: number,
    has_construction_rng: number,
    construction_rng_value: number,
  ): number;
  /**
   * Runs the mon-construction path and returns an `fw_alloc`'d buffer
   * pointer; see the doc comment over the Rust export
   * (`crates/factory-wasm/src/lib.rs`) for the exact layout, and
   * `adapter/factoryEngine.ts` for the decoder. `ability_slot` must be 0 or
   * 1 (see that export's caller contract).
   */
  fw_create_factory_party_member(
    set_id: number,
    personality: number,
    fixed_iv: number,
    ability_slot: number,
    ot_id: number,
  ): number;
  /** `IS_TYPE_PHYSICAL(moveType)`; `move_type` truncates to u8 (0..17). Returns 0/1. */
  fw_is_type_physical(move_type: number): number;
  /** `IS_TYPE_SPECIAL(moveType)`; same `move_type` contract. Returns 0/1. */
  fw_is_type_special(move_type: number): number;
  /** `APPLY_STAT_MOD`. `stage` must be 0..12 (traps otherwise). */
  fw_apply_stat_stage_mod(stat: number, stage: number): number;
  /**
   * `CalculateBaseDamage`. Reads a fixed 117-byte `DamageCalcInput` buffer
   * at `input_ptr` (layout: `crates/factory-wasm/src/lib.rs`'s
   * `decode_damage_calc_input` doc comment; encoder:
   * `adapter/damageEngine.ts`) and returns the damage directly.
   */
  fw_calculate_base_damage(input_ptr: number): number;
  /**
   * `Cmd_critcalc`'s crit-chance stage. `move_effect` uses the 0..4
   * discriminant mapping documented on the Rust `crit_move_effect_from_u32`
   * helper. Booleans are 0/1. Returns 0..4.
   */
  fw_get_critical_hit_chance_stage(
    focus_energy: number,
    move_effect: number,
    attacker_hold_effect: number,
    is_chansey: number,
    is_farfetchd: number,
  ): number;
  /** `Cmd_critcalc`'s final roll. `crit_chance_stage` must be 0..4 (traps otherwise). Returns 0/1. */
  fw_roll_is_critical_hit(crit_chance_stage: number, rng_roll: number, target_immune: number): number;
  /** `Cmd_typecalc`'s STAB step. Type fields truncate to u8 (0..17). */
  fw_apply_stab(damage: number, attacker_type_a: number, attacker_type_b: number, move_type: number): number;
  /**
   * `ModulateDmgByType`, using the `TYPE_EFFECTIVENESS_TABLE` embedded in
   * factory-core (not passed across the ABI). Returns an `fw_alloc`'d
   * fixed 8-byte buffer (`damage: i32`, `multiplier_tenths: i32`, no
   * status byte — this function cannot fail); the caller must
   * `fw_free(ptr, 8)`.
   */
  fw_apply_type_effectiveness(
    damage: number,
    move_type: number,
    defender_type_a: number,
    defender_type_b: number,
  ): number;
  /** `Cmd_setdamagetohealthdifference`'s raw HP-diff, clamped to 0. */
  fw_calculate_endeavor_damage(target_hp: number, user_hp: number): number;
  /** EFFECT_ENDEAVOR's full resolution (the type multiplier only gates immunity, never scales). */
  fw_resolve_endeavor_damage(target_hp: number, user_hp: number, type_multiplier_tenths: number): number;
  /** `ApplyRandomDmgMultiplier`. `rng_roll` truncates to u16. */
  fw_apply_random_damage_multiplier(damage: number, rng_roll: number): number;
  /**
   * `Cmd_accuracycheck`'s `calc` value. Reads a fixed 26-byte
   * `AccuracyCalcInput` buffer at `input_ptr` (layout:
   * `crates/factory-wasm/src/lib.rs`'s `decode_accuracy_calc_input` doc
   * comment; encoder: `adapter/damageEngine.ts`) and returns `calc` directly.
   */
  fw_calculate_accuracy(input_ptr: number): number;
  /** `Cmd_accuracycheck`'s final roll. `rng_roll` truncates to u16. Returns 0/1. */
  fw_roll_accuracy_hits(calc: number, rng_roll: number): number;
  /**
   * `effectiveSpeed`. Reads a fixed 18-byte `TurnOrderBattler` buffer at
   * `battler_ptr` (layout: `crates/factory-wasm/src/lib.rs`'s
   * `decode_turn_order_battler` doc comment; encoder: `adapter/turnEngine.ts`)
   * and returns the effective speed directly. `random_turn_number` truncates
   * to u16.
   */
  fw_effective_speed(
    battler_ptr: number,
    is_raining: number,
    is_sunny: number,
    random_turn_number: number,
  ): number;
  /**
   * `GetWhoStrikesFirst`. Reads two fixed 18-byte `TurnOrderBattler` buffers
   * (same layout/encoder as `fw_effective_speed`). Returns 0/1/2.
   */
  fw_get_who_strikes_first(
    battler1_ptr: number,
    battler2_ptr: number,
    speed_tie_rng_roll: number,
    is_raining: number,
    is_sunny: number,
    random_turn_number: number,
  ): number;
  /**
   * `sortBattlersByTurnOrder`. Reads the self-describing input buffer at
   * `input_ptr` (`input_len` bytes; layout:
   * `crates/factory-wasm/src/lib.rs`'s `fw_sort_battlers_by_turn_order` doc
   * comment; encoder: `adapter/turnEngine.ts`) and returns an `fw_alloc`'d
   * `battler_count * 4`-byte buffer of little-endian sorted battler ids (no
   * length prefix — the caller already knows `battler_count`); the caller
   * must `fw_free(ptr, battler_count * 4)`.
   */
  fw_sort_battlers_by_turn_order(input_ptr: number, input_len: number): number;
  /**
   * `runTurn1RngLedger`. Returns an `fw_alloc`'d fixed 133-byte buffer (7
   * steps x 19 bytes each: `rng_value_before: u32`, `rng_value_after: u32`,
   * `roll_count: u8`, `rolls: u16 x 5`; layout:
   * `crates/factory-wasm/src/lib.rs`'s `fw_run_turn1_rng_ledger` doc
   * comment; decoder: `adapter/turnEngine.ts`); the caller must
   * `fw_free(ptr, 133)`.
   */
  fw_run_turn1_rng_ledger(starting_rng_value: number): number;
  /**
   * `GetAiScriptsInBattleFactory`. Scalar args (booleans/enums cross as u32
   * per the ABI convention; `level_mode`/`battle_mode` are validated against
   * their full range here, not truncated first). Returns an `fw_alloc`'d
   * buffer (layout: `crates/factory-wasm/src/lib.rs`'s
   * `fw_select_factory_ai_mask` doc comment; decoder:
   * `adapter/factoryAiEngine.ts`); the caller must `fw_free(ptr, total_len)`.
   */
  fw_select_factory_ai_mask(
    level_mode: number,
    battle_mode: number,
    factory_win_streak: number,
    trainer_opponent_id: number,
  ): number;
  /**
   * `AI_CheckBadMove` for one move slot against one target. Reads a fixed
   * 132-byte `CheckBadMovePreambleInput` buffer at `input_ptr` (layout:
   * `crates/factory-wasm/src/lib.rs`'s `fw_run_check_bad_move_preamble` doc
   * comment; encoder/decoder: `adapter/factoryAiEngine.ts`) and returns an
   * `fw_alloc`'d buffer; the caller must `fw_free(ptr, total_len)`.
   */
  fw_run_check_bad_move_preamble(input_ptr: number): number;
  /**
   * `AI_CheckViability` for one move slot. Reads the self-describing
   * `CheckViabilityInput` buffer at `input_ptr` (`input_len` bytes; layout:
   * `crates/factory-wasm/src/lib.rs`'s `fw_run_check_viability` doc comment;
   * encoder/decoder: `adapter/factoryAiEngine.ts`) and returns an `fw_alloc`'d
   * length-prefixed buffer. The caller must `fw_free(ptr, total_len)`.
   */
  fw_run_check_viability(input_ptr: number, input_len: number): number;
  /** Complete native mask-zero DecisionPolicy chooser; see the Rust export for its variable input and complete result layouts. */
  fw_choose_factory_ai_mask_zero_decision(input_ptr: number, input_len: number): number;
  /** Complete native mask-1/mask-7 DecisionPolicy chooser; see the Rust export for its variable input and complete result layouts. */
  fw_choose_factory_ai_scored_decision(input_ptr: number, input_len: number): number;
  /** Plain-singles GetMostSuitableMonToSwitchInto; exact 114-byte input and length-prefixed typed output are documented on the Rust export. */
  fw_get_most_suitable_mon_to_switch_into(input_ptr: number, input_len: number): number;
  /** Combined RNG-free precheck plus full switch-policy evaluation; exact 401-byte input and complete typed output are documented on the Rust export. */
  fw_evaluate_factory_ai_switch_policy(input_ptr: number, input_len: number): number;
  memory: WebAssembly.Memory;
}

function defaultArtifactPath(): string {
  // adapter/loadFactoryWasm.ts -> core-rs/ -> <workspace-root>/artifacts/wasm/...
  return fileURLToPath(new URL('../../artifacts/wasm/factory_wasm.wasm', import.meta.url));
}

/**
 * Loads the factory-wasm artifact and returns its typed export surface.
 *
 * Path resolution, highest precedence first: the `artifactPath` argument,
 * then the `POKEBENCH_WASM_ARTIFACT` env var, then the default path
 * (`<workspace-root>/artifacts/wasm/factory_wasm.wasm`, resolved relative
 * to this module).
 */
export async function loadFactoryWasm(artifactPath?: string): Promise<FactoryWasmExports> {
  const path = artifactPath ?? process.env.POKEBENCH_WASM_ARTIFACT ?? defaultArtifactPath();

  let bytes: Buffer;
  try {
    bytes = readFileSync(path);
  } catch (err) {
    throw new Error(
      `factory-wasm artifact not found at ${path}. Build it with: core-rs/build-wasm.sh`,
      { cause: err },
    );
  }

  const { instance } = await WebAssembly.instantiate(bytes, {});
  return instance.exports as unknown as FactoryWasmExports;
}

/** Throws if `exports.fw_abi_version()` does not equal `expected` (default 1). */
export function assertAbiVersion(exports: FactoryWasmExports, expected = 1): void {
  const actual = exports.fw_abi_version();
  if (actual !== expected) {
    throw new Error(`factory-wasm ABI version mismatch: expected ${expected}, got ${actual}`);
  }
}
