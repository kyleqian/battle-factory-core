// Uniform adapter for the pure battle-history leaf in factoryAiLiveDriver.ts.
// The TS implementation remains canonical/default. POKEBENCH_ENGINE=wasm
// selects the additive ABI-v1 operation packet directly; there is no TS
// fallback in the WASM implementation.

import {
  createFactoryAiBattleHistory as tsCreate,
  recordFactoryAiKnownAbility as tsRecordAbility,
  recordFactoryAiKnownItemEffect as tsRecordItem,
  syncFactoryAiBattleHistory as tsSync,
  type FactoryAiBattleHistory,
} from "../../src/engine/factoryAiLiveDriver.ts";
import type { BattleScriptRulesContext } from "../../src/engine/battleScriptRulesContext.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";
import { defaultEngineId } from "./rngEngine.ts";

type Battler = 0 | 1 | 2 | 3;

export interface FactoryAiBattleHistoryEngine {
  readonly id: "ts" | "wasm";
  createFactoryAiBattleHistory(rules: BattleScriptRulesContext): FactoryAiBattleHistory;
  recordFactoryAiKnownAbility(
    history: FactoryAiBattleHistory,
    battler: Battler,
    ability: string,
  ): FactoryAiBattleHistory;
  recordFactoryAiKnownItemEffect(
    history: FactoryAiBattleHistory,
    battler: Battler,
    itemEffect: number,
  ): FactoryAiBattleHistory;
  syncFactoryAiBattleHistory(
    history: FactoryAiBattleHistory,
    rules: BattleScriptRulesContext,
  ): FactoryAiBattleHistory;
}

export function tsFactoryAiBattleHistoryEngine(): FactoryAiBattleHistoryEngine {
  return {
    id: "ts",
    createFactoryAiBattleHistory: tsCreate,
    recordFactoryAiKnownAbility: tsRecordAbility,
    recordFactoryAiKnownItemEffect: tsRecordItem,
    syncFactoryAiBattleHistory: tsSync,
  };
}

class Writer {
  private readonly view: DataView;
  private readonly bytes: Uint8Array;
  private offset = 0;

  constructor(size: number) {
    this.bytes = new Uint8Array(size);
    this.view = new DataView(this.bytes.buffer);
  }

  u8(value: number): void { this.view.setUint8(this.offset++, value); }
  u32(value: number): void { this.view.setUint32(this.offset, value, true); this.offset += 4; }
  f64(value: number): void { this.view.setFloat64(this.offset, value, true); this.offset += 8; }
  raw(value: Uint8Array): void { this.bytes.set(value, this.offset); this.offset += value.length; }

  finish(): ArrayBuffer {
    if (this.offset !== this.bytes.length) {
      throw new Error(`factory-wasm factoryAiBattleHistoryEngine: wrote ${this.offset} of ${this.bytes.length} input bytes`);
    }
    return this.bytes.buffer;
  }
}

class Reader {
  private readonly view: DataView;
  private readonly bytes: Uint8Array;
  private offset = 0;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  u8(): number { return this.view.getUint8(this.offset++); }
  u16(): number { const value = this.view.getUint16(this.offset, true); this.offset += 2; return value; }
  u32(): number { const value = this.view.getUint32(this.offset, true); this.offset += 4; return value; }
  f64(): number { const value = this.view.getFloat64(this.offset, true); this.offset += 8; return value; }
  utf8(length: number): string {
    const value = new TextDecoder().decode(this.bytes.subarray(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }
  finish(): void {
    if (this.offset !== this.bytes.length) {
      throw new Error(`factory-wasm factoryAiBattleHistoryEngine: decoded ${this.offset} of ${this.bytes.length} output bytes`);
    }
  }
}

function encodedHistorySize(history: FactoryAiBattleHistory): number {
  let size = 4 * 4 + history.usedMoves.reduce((sum, row) => sum + row.length * 8, 0) + 4 + 32 + 32;
  for (const ability of history.knownAbilities) {
    if (ability !== null) size += 4 + new TextEncoder().encode(ability).length;
  }
  return size;
}

function writeHistory(writer: Writer, history: FactoryAiBattleHistory): void {
  for (const row of history.usedMoves) {
    writer.u32(row.length);
    for (const moveId of row) writer.f64(moveId);
  }
  for (const ability of history.knownAbilities) {
    writer.u8(ability === null ? 0 : 1);
    if (ability !== null) {
      const encoded = new TextEncoder().encode(ability);
      writer.u32(encoded.length);
      writer.raw(encoded);
    }
  }
  for (const itemEffect of history.knownItemEffects) writer.f64(itemEffect);
  for (const partyIndex of history.partyIndexes) writer.f64(partyIndex);
}

function writeLive(writer: Writer, rules: BattleScriptRulesContext): void {
  for (const battler of rules.battlers) writer.f64(battler.partyIndex);
  writer.f64(rules.moveHistory.lastMoves[0]);
  for (const abilityId of rules.aiObservedAbilityIds) writer.f64(abilityId);
  for (const itemEffect of rules.aiObservedItemEffects) writer.f64(itemEffect);
}

function encodeCreate(rules: BattleScriptRulesContext): ArrayBuffer {
  const writer = new Writer(1 + 13 * 8);
  writer.u8(0);
  writeLive(writer, rules);
  return writer.finish();
}

function encodeRecordAbility(history: FactoryAiBattleHistory, battler: Battler, ability: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(ability);
  const writer = new Writer(1 + 1 + 4 + encoded.length + encodedHistorySize(history));
  writer.u8(1); writer.u8(battler); writer.u32(encoded.length); writer.raw(encoded);
  writeHistory(writer, history);
  return writer.finish();
}

function encodeRecordItem(history: FactoryAiBattleHistory, battler: Battler, itemEffect: number): ArrayBuffer {
  const writer = new Writer(1 + 1 + 8 + encodedHistorySize(history));
  writer.u8(2); writer.u8(battler); writer.f64(itemEffect);
  writeHistory(writer, history);
  return writer.finish();
}

function encodeSync(history: FactoryAiBattleHistory, rules: BattleScriptRulesContext): ArrayBuffer {
  const writer = new Writer(1 + 13 * 8 + encodedHistorySize(history));
  writer.u8(3); writeLive(writer, rules); writeHistory(writer, history);
  return writer.finish();
}

export function decodeFactoryAiBattleHistory(bytes: Uint8Array): FactoryAiBattleHistory {
  const reader = new Reader(bytes);
  const totalLength = reader.u32();
  if (totalLength !== bytes.length) {
    throw new Error(`factory-wasm factoryAiBattleHistoryEngine: output length ${totalLength} != ${bytes.length}`);
  }
  const status = reader.u8();
  if (status === 1 || status === 2) throw new Error(reader.utf8(reader.u16()));
  if (status !== 0) throw new Error(`factory-wasm factoryAiBattleHistoryEngine: unknown status ${status}`);
  const usedMoves = Array.from({ length: 4 }, () =>
    Array.from({ length: reader.u32() }, () => reader.f64())) as unknown as FactoryAiBattleHistory["usedMoves"];
  const knownAbilities = Array.from({ length: 4 }, () => {
    const present = reader.u8();
    if (present === 0) return null;
    if (present !== 1) throw new Error(`factory-wasm factoryAiBattleHistoryEngine: unknown ability presence ${present}`);
    return reader.utf8(reader.u32());
  }) as unknown as FactoryAiBattleHistory["knownAbilities"];
  const knownItemEffects = Array.from({ length: 4 }, () => reader.f64()) as unknown as FactoryAiBattleHistory["knownItemEffects"];
  const partyIndexes = Array.from({ length: 4 }, () => reader.f64()) as unknown as FactoryAiBattleHistory["partyIndexes"];
  reader.finish();
  return { usedMoves, knownAbilities, knownItemEffects, partyIndexes };
}

export async function wasmFactoryAiBattleHistoryEngine(): Promise<FactoryAiBattleHistoryEngine> {
  const wasm = await loadFactoryWasm();
  function invoke(input: ArrayBuffer): FactoryAiBattleHistory {
    const inputPtr = wasm.fw_alloc(input.byteLength);
    let outputPtr: number;
    try {
      new Uint8Array(wasm.memory.buffer, inputPtr, input.byteLength).set(new Uint8Array(input));
      outputPtr = wasm.fw_apply_factory_ai_battle_history_operation(inputPtr, input.byteLength);
    } finally {
      wasm.fw_free(inputPtr, input.byteLength);
    }
    const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
    const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
    wasm.fw_free(outputPtr, totalLength);
    return decodeFactoryAiBattleHistory(output);
  }
  return {
    id: "wasm",
    createFactoryAiBattleHistory: (rules) => invoke(encodeCreate(rules)),
    recordFactoryAiKnownAbility: (history, battler, ability) => invoke(encodeRecordAbility(history, battler, ability)),
    recordFactoryAiKnownItemEffect: (history, battler, itemEffect) => invoke(encodeRecordItem(history, battler, itemEffect)),
    syncFactoryAiBattleHistory: (history, rules) => invoke(encodeSync(history, rules)),
  };
}

export async function factoryAiBattleHistoryEngine(): Promise<FactoryAiBattleHistoryEngine> {
  return defaultEngineId() === "wasm"
    ? wasmFactoryAiBattleHistoryEngine()
    : tsFactoryAiBattleHistoryEngine();
}
