// Uniform browser adapter for the default-Gen-3-RNG surface of
// src/engine/factoryTrainerSchedule.ts. The TS implementation remains the
// default spec engine; POKEBENCH_ENGINE=wasm encodes and invokes the two
// additive ABI-v1 exports directly. The injectable scripted RNG port is
// intentionally native-only test infrastructure and is not part of this API.

import {
  generateFactoryTrainerSchedule as tsGenerateFactoryTrainerSchedule,
  selectFactoryTrainer as tsSelectFactoryTrainer,
  type FactoryTrainerDrawLedgerEntry,
  type FactoryTrainerScheduleResult,
  type FactoryTrainerSelectionResult,
} from "../../src/engine/factoryTrainerSchedule.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";
import { defaultEngineId } from "./rngEngine.ts";

export interface FactoryTrainerScheduleEngine {
  readonly id: "ts" | "wasm";
  selectFactoryTrainer(
    factoryWinStreak: number,
    battleIndex: number,
    storedTrainerIds: readonly number[],
    rngValue: number,
  ): FactoryTrainerSelectionResult;
  generateFactoryTrainerSchedule(
    factoryWinStreak: number,
    rngValue: number,
  ): FactoryTrainerScheduleResult;
}

export function tsFactoryTrainerScheduleEngine(): FactoryTrainerScheduleEngine {
  return {
    id: "ts",
    selectFactoryTrainer: tsSelectFactoryTrainer,
    generateFactoryTrainerSchedule: tsGenerateFactoryTrainerSchedule,
  };
}

class Writer {
  private readonly view: DataView;
  private offset = 0;

  constructor(size: number) {
    this.view = new DataView(new ArrayBuffer(size));
  }

  f64(value: number): void {
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }

  u32(value: number): void {
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  finish(): ArrayBuffer {
    if (this.offset !== this.view.byteLength) {
      throw new Error(
        `factory-wasm factoryTrainerScheduleEngine: wrote ${this.offset} of ${this.view.byteLength} input bytes`,
      );
    }
    return this.view.buffer;
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

  u8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  u16(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  u32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  i64(): number {
    const value = Number(this.view.getBigInt64(this.offset, true));
    this.offset += 8;
    return value;
  }

  f64(): number {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  utf8(length: number): string {
    const value = new TextDecoder().decode(this.bytes.subarray(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  finish(): void {
    if (this.offset !== this.bytes.byteLength) {
      throw new Error(
        `factory-wasm factoryTrainerScheduleEngine: decoded ${this.offset} of ${this.bytes.byteLength} output bytes`,
      );
    }
  }
}

function encodeSelectionInput(
  factoryWinStreak: number,
  battleIndex: number,
  storedTrainerIds: readonly number[],
  rngValue: number,
): ArrayBuffer {
  const writer = new Writer(28 + storedTrainerIds.length * 8);
  writer.f64(factoryWinStreak);
  writer.f64(battleIndex);
  writer.f64(rngValue);
  writer.u32(storedTrainerIds.length);
  for (const trainerId of storedTrainerIds) writer.f64(trainerId);
  return writer.finish();
}

function encodeScheduleInput(factoryWinStreak: number, rngValue: number): ArrayBuffer {
  const writer = new Writer(16);
  writer.f64(factoryWinStreak);
  writer.f64(rngValue);
  return writer.finish();
}

function throwTypedError(reader: Reader): never {
  const kind = reader.u8();
  const context = reader.u8();
  switch (kind) {
    case 0:
      throw new Error("battleIndex must be an integer in [0, 6]");
    case 1:
      throw new Error("rngValue must be a uint32");
    case 2:
      throw new Error(`storedTrainerIds must contain the ${context} prior battle selections`);
    case 3:
      throw new Error("factoryWinStreak must be a non-negative safe integer");
    case 4:
      throw new Error("rngPort.draw(...).rngValue must be a uint32");
    case 5:
      throw new Error("rngPort.draw(...).value must be a uint16");
    default:
      throw new Error(`factory-wasm factoryTrainerScheduleEngine: unknown typed error ${kind}`);
  }
}

function readOk(reader: Reader): void {
  const status = reader.u8();
  if (status === 1) throwTypedError(reader);
  if (status === 2) throw new Error(reader.utf8(reader.u16()));
  if (status !== 0) {
    throw new Error(`factory-wasm factoryTrainerScheduleEngine: unknown status ${status}`);
  }
}

function decodeLedger(reader: Reader, count: number): readonly FactoryTrainerDrawLedgerEntry[] {
  const ledger: FactoryTrainerDrawLedgerEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    const battleIndex = reader.u8();
    const attempt = reader.u32();
    const challenge = reader.i64();
    const rangeIndex = reader.u32();
    const rangeKindByte = reader.u8();
    if (rangeKindByte > 1) {
      throw new Error(
        `factory-wasm factoryTrainerScheduleEngine: unknown range kind ${rangeKindByte}`,
      );
    }
    ledger.push({
      battleIndex: battleIndex as FactoryTrainerDrawLedgerEntry["battleIndex"],
      attempt,
      challenge,
      rangeIndex,
      rangeKind: rangeKindByte === 0 ? "normal" : "hard",
      rangeStart: reader.u16(),
      rangeEnd: reader.u16(),
      rngBefore: reader.u32(),
      rngAfter: reader.u32(),
      raw: reader.u16(),
      trainerId: reader.u16(),
      accepted: reader.u8() !== 0,
    });
  }
  return ledger;
}

function decodeSelection(bytes: Uint8Array): FactoryTrainerSelectionResult {
  const reader = new Reader(bytes);
  reader.u32(); // total_len
  readOk(reader);
  const trainerId = reader.u16();
  const storedCount = reader.u32();
  const storedTrainerIds = Array.from({ length: storedCount }, () => reader.f64());
  const rngValue = reader.u32();
  const drawCount = reader.u32();
  const ledgerCount = reader.u32();
  const ledger = decodeLedger(reader, ledgerCount);
  reader.finish();
  return { trainerId, storedTrainerIds, rngValue, drawCount, ledger };
}

function decodeSchedule(bytes: Uint8Array): FactoryTrainerScheduleResult {
  const reader = new Reader(bytes);
  reader.u32(); // total_len
  readOk(reader);
  const trainerCount = reader.u8();
  const trainerIds = Array.from({ length: trainerCount }, () => reader.u16());
  if (trainerIds.length !== 7) {
    throw new Error(
      `factory-wasm factoryTrainerScheduleEngine: expected 7 trainers, got ${trainerIds.length}`,
    );
  }
  const storedCount = reader.u32();
  const storedTrainerIds = Array.from({ length: storedCount }, () => reader.f64());
  const rngValue = reader.u32();
  const drawCount = reader.u32();
  const ledgerCount = reader.u32();
  const ledger = decodeLedger(reader, ledgerCount);
  reader.finish();
  return {
    trainerIds: trainerIds as unknown as FactoryTrainerScheduleResult["trainerIds"],
    storedTrainerIds,
    rngValue,
    drawCount,
    ledger,
  };
}

export async function wasmFactoryTrainerScheduleEngine(): Promise<FactoryTrainerScheduleEngine> {
  const wasm = await loadFactoryWasm();

  function invoke(
    encoded: ArrayBuffer,
    exportFn: (inputPtr: number, inputLen: number) => number,
  ): Uint8Array {
    const inputPtr = wasm.fw_alloc(encoded.byteLength);
    let outputPtr: number;
    try {
      new Uint8Array(wasm.memory.buffer, inputPtr, encoded.byteLength).set(new Uint8Array(encoded));
      outputPtr = exportFn(inputPtr, encoded.byteLength);
    } finally {
      wasm.fw_free(inputPtr, encoded.byteLength);
    }
    const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
    const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
    wasm.fw_free(outputPtr, totalLength);
    return output;
  }

  return {
    id: "wasm",
    selectFactoryTrainer(factoryWinStreak, battleIndex, storedTrainerIds, rngValue) {
      return decodeSelection(invoke(
        encodeSelectionInput(factoryWinStreak, battleIndex, storedTrainerIds, rngValue),
        wasm.fw_select_factory_trainer,
      ));
    },
    generateFactoryTrainerSchedule(factoryWinStreak, rngValue) {
      return decodeSchedule(invoke(
        encodeScheduleInput(factoryWinStreak, rngValue),
        wasm.fw_generate_factory_trainer_schedule,
      ));
    },
  };
}

export async function factoryTrainerScheduleEngine(): Promise<FactoryTrainerScheduleEngine> {
  return defaultEngineId() === "wasm"
    ? wasmFactoryTrainerScheduleEngine()
    : tsFactoryTrainerScheduleEngine();
}
