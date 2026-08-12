// The turn-order/turn-RNG engine adapter: a uniform TurnEngine interface
// over the TS spec engine (src/engine/turnOrder.ts + src/engine/turnRng.ts)
// and the factory-wasm boundary's turn_order/turn_rng surface
// (fw_effective_speed et al., ./loadFactoryWasm.ts), so
// tests/turnOrderParity.test.ts can run identical inputs against either
// without knowing which one it's holding. Sibling to ./damageEngine.ts
// (same M2 opt-in pattern via defaultEngineId/resolveWasmArtifactPath,
// reused directly from ./rngEngine.ts).
//
// Strings stay TS-side: abilities/hold-effects cross the ABI as the
// numeric ids from src/data/gen/ability-item-hooks.json `.universes` (the
// same ids turn_order.rs and damage_calc.rs use), resolved back to TS's
// string identifiers on neither side (turnOrder.ts's TurnOrderBattler
// fields are already just used for equality checks against a handful of
// named abilities/hold-effects, never displayed).
//
// Buffer layouts mirror the doc comments over the corresponding fw_
// exports (crates/factory-wasm/src/lib.rs): fw_effective_speed's/
// fw_get_who_strikes_first's fixed 18-byte TurnOrderBattler,
// fw_sort_battlers_by_turn_order's self-describing input buffer,
// fw_run_turn1_rng_ledger's fixed 133-byte (7 x 19-byte step) output.

import abilityItemHooksData from "../../src/data/gen/ability-item-hooks.json" with { type: "json" };
import type {
  StrikesFirstResult,
  TurnOrderBattler,
  WeatherState,
} from "../../src/engine/turnOrder.ts";
import {
  effectiveSpeed as tsEffectiveSpeed,
  getWhoStrikesFirst as tsGetWhoStrikesFirst,
  sortBattlersByTurnOrder as tsSortBattlersByTurnOrder,
} from "../../src/engine/turnOrder.ts";
import { TURN1_RNG_STEPS, type Turn1RngStepResult } from "../../src/engine/turnRng.ts";
import { runTurn1RngLedger as tsRunTurn1RngLedger } from "../../src/engine/turnRng.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";

/**
 * Ability/hold-effect ids (`src/data/gen/ability-item-hooks.json`
 * `.universes`, verified at adapter time, not recalled — same ids
 * `damageEngine.ts`, `turn_order.rs`, and `gen_tables.rs` use — a fourth
 * independent citation).
 */
type SymbolIdRow = Readonly<{ name: string; id: number }>;
const ABILITY_ID_BY_NAME = new Map(
  (abilityItemHooksData as { universes: { abilities: SymbolIdRow[] } }).universes.abilities.map(
    (row) => [row.name, row.id],
  ),
);
const HOLD_EFFECT_ID_BY_NAME = new Map(
  (abilityItemHooksData as { universes: { holdEffects: SymbolIdRow[] } }).universes.holdEffects.map(
    (row) => [row.name, row.id],
  ),
);

function abilityId(name: string | null | undefined): number {
  if (name === null || name === undefined) return 0; // ABILITY_NONE
  const id = ABILITY_ID_BY_NAME.get(name);
  if (id === undefined) throw new Error(`factory-wasm turnEngine: unknown ability ${name}`);
  return id;
}

function holdEffectId(name: string | null | undefined): number {
  if (name === null || name === undefined) return 0; // HOLD_EFFECT_NONE
  const id = HOLD_EFFECT_ID_BY_NAME.get(name);
  if (id === undefined) throw new Error(`factory-wasm turnEngine: unknown hold effect ${name}`);
  return id;
}

// --- fixed-width buffer encoding (mirrors crates/factory-wasm/src/lib.rs's
// decode_turn_order_battler doc comment field-for-field) -------------------

const TURN_ORDER_BATTLER_WIDTH = 18;

function writeTurnOrderBattler(view: DataView, offset: number, battler: TurnOrderBattler): void {
  view.setUint32(offset + 0, battler.speed >>> 0, true);
  view.setUint8(offset + 4, battler.speedStage);
  view.setInt32(offset + 5, battler.movePriority, true);
  view.setUint8(offset + 9, battler.isParalyzed ? 1 : 0);
  view.setUint16(offset + 10, abilityId(battler.ability), true);
  view.setUint16(offset + 12, holdEffectId(battler.holdEffect), true);
  view.setUint32(offset + 14, (battler.holdEffectParam ?? 0) >>> 0, true);
}

export type TurnEngineId = "ts" | "wasm";

export interface TurnEngine {
  readonly id: TurnEngineId;
  effectiveSpeed(battler: TurnOrderBattler, weather?: WeatherState, randomTurnNumber?: number): number;
  getWhoStrikesFirst(
    battler1: TurnOrderBattler,
    battler2: TurnOrderBattler,
    speedTieRngRoll: number,
    weather?: WeatherState,
    randomTurnNumber?: number,
  ): StrikesFirstResult;
  sortBattlersByTurnOrder(
    battlerIds: readonly number[],
    battlers: ReadonlyMap<number, TurnOrderBattler>,
    speedTieRngRolls?: readonly number[],
    weather?: WeatherState,
    randomTurnNumber?: number,
  ): number[];
  runTurn1RngLedger(startingRngValue: number): Turn1RngStepResult[];
}

/** Thin wrapper over the TS spec engine — the default, always-available engine. */
export function tsTurnEngine(): TurnEngine {
  return {
    id: "ts",
    effectiveSpeed: tsEffectiveSpeed,
    getWhoStrikesFirst: tsGetWhoStrikesFirst,
    sortBattlersByTurnOrder: tsSortBattlersByTurnOrder,
    runTurn1RngLedger: tsRunTurn1RngLedger,
  };
}

/**
 * Wraps the factory-wasm boundary's turn_order/turn_rng surface as a
 * `TurnEngine`. Per-call: scratch buffers are carved out of wasm linear
 * memory via `fw_alloc` and freed again once the (synchronous) call
 * returns — wasm memory may grow between calls, so every `DataView` is
 * created fresh each time, never cached (same discipline as
 * `damageEngine.ts`'s `wasmDamageEngine`).
 */
export async function wasmTurnEngine(): Promise<TurnEngine> {
  const exports = await loadFactoryWasm();

  function withBattlerBuffer<T>(battler: TurnOrderBattler, run: (ptr: number) => T): T {
    const ptr = exports.fw_alloc(TURN_ORDER_BATTLER_WIDTH);
    try {
      const view = new DataView(exports.memory.buffer, ptr, TURN_ORDER_BATTLER_WIDTH);
      writeTurnOrderBattler(view, 0, battler);
      return run(ptr);
    } finally {
      exports.fw_free(ptr, TURN_ORDER_BATTLER_WIDTH);
    }
  }

  return {
    id: "wasm",
    effectiveSpeed(battler, weather = {}, randomTurnNumber = 0xffff) {
      return withBattlerBuffer(battler, (ptr) =>
        exports.fw_effective_speed(ptr, weather.isRaining ? 1 : 0, weather.isSunny ? 1 : 0, randomTurnNumber),
      ) >>> 0;
    },
    getWhoStrikesFirst(battler1, battler2, speedTieRngRoll, weather = {}, randomTurnNumber = 0xffff) {
      const ptr1 = exports.fw_alloc(TURN_ORDER_BATTLER_WIDTH);
      const ptr2 = exports.fw_alloc(TURN_ORDER_BATTLER_WIDTH);
      try {
        writeTurnOrderBattler(new DataView(exports.memory.buffer, ptr1, TURN_ORDER_BATTLER_WIDTH), 0, battler1);
        writeTurnOrderBattler(new DataView(exports.memory.buffer, ptr2, TURN_ORDER_BATTLER_WIDTH), 0, battler2);
        const result = exports.fw_get_who_strikes_first(
          ptr1,
          ptr2,
          speedTieRngRoll,
          weather.isRaining ? 1 : 0,
          weather.isSunny ? 1 : 0,
          randomTurnNumber,
        );
        return result as StrikesFirstResult;
      } finally {
        exports.fw_free(ptr1, TURN_ORDER_BATTLER_WIDTH);
        exports.fw_free(ptr2, TURN_ORDER_BATTLER_WIDTH);
      }
    },
    sortBattlersByTurnOrder(battlerIds, battlers, speedTieRngRolls = [], weather = {}, randomTurnNumber = 0xffff) {
      const n = battlerIds.length;
      const r = speedTieRngRolls.length;
      const inputLen = 8 + n * 4 + n * TURN_ORDER_BATTLER_WIDTH + r * 2 + 6;
      const inputPtr = exports.fw_alloc(inputLen);
      const outputLen = n * 4;
      try {
        const view = new DataView(exports.memory.buffer, inputPtr, inputLen);
        view.setUint32(0, n, true);
        view.setUint32(4, r, true);
        let offset = 8;
        for (const id of battlerIds) {
          view.setUint32(offset, id, true);
          offset += 4;
        }
        for (const id of battlerIds) {
          const battler = battlers.get(id);
          if (battler === undefined) {
            throw new Error(`factory-wasm turnEngine: unknown battler id ${id}`);
          }
          writeTurnOrderBattler(view, offset, battler);
          offset += TURN_ORDER_BATTLER_WIDTH;
        }
        for (const roll of speedTieRngRolls) {
          view.setUint16(offset, roll, true);
          offset += 2;
        }
        view.setUint8(offset, weather.isRaining ? 1 : 0);
        view.setUint8(offset + 1, weather.isSunny ? 1 : 0);
        view.setUint32(offset + 2, randomTurnNumber, true);

        const outputPtr = exports.fw_sort_battlers_by_turn_order(inputPtr, inputLen);
        try {
          const outView = new DataView(exports.memory.buffer, outputPtr, outputLen);
          const order: number[] = [];
          for (let i = 0; i < n; i++) order.push(outView.getUint32(i * 4, true));
          return order;
        } finally {
          exports.fw_free(outputPtr, outputLen);
        }
      } finally {
        exports.fw_free(inputPtr, inputLen);
      }
    },
    runTurn1RngLedger(startingRngValue) {
      const STEP_WIDTH = 19;
      const STEP_COUNT = TURN1_RNG_STEPS.length;
      const ptr = exports.fw_run_turn1_rng_ledger(startingRngValue);
      try {
        const view = new DataView(exports.memory.buffer, ptr, STEP_WIDTH * STEP_COUNT);
        const results: Turn1RngStepResult[] = [];
        for (let i = 0; i < STEP_COUNT; i++) {
          const off = i * STEP_WIDTH;
          const rngValueBefore = view.getUint32(off, true);
          const rngValueAfter = view.getUint32(off + 4, true);
          const rollCount = view.getUint8(off + 8);
          const rolls: number[] = [];
          for (let r = 0; r < rollCount; r++) rolls.push(view.getUint16(off + 9 + r * 2, true));
          results.push({ name: TURN1_RNG_STEPS[i]!.name, rngValueBefore, rngValueAfter, rolls });
        }
        return results;
      } finally {
        exports.fw_free(ptr, STEP_WIDTH * STEP_COUNT);
      }
    },
  };
}
