import { describe, expect, it } from "vitest";
import {
  factoryTrainerScheduleEngine,
  tsFactoryTrainerScheduleEngine,
  wasmFactoryTrainerScheduleEngine,
  type FactoryTrainerScheduleEngine,
} from "../core-rs/adapter/factoryTrainerScheduleEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";
import {
  generateFactoryTrainerSchedule,
  selectFactoryTrainer,
} from "../src/engine/factoryTrainerSchedule.ts";

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

async function engines(): Promise<readonly FactoryTrainerScheduleEngine[]> {
  return [tsFactoryTrainerScheduleEngine(), await wasmFactoryTrainerScheduleEngine()];
}

function capture(operation: () => unknown): unknown | Error {
  try {
    return operation();
  } catch (error) {
    return error as Error;
  }
}

describe("Factory trainer schedule ABI-v1 parity", () => {
  it("matches complete focused and deterministic-sweep objects and ratchets the ledger census", async () => {
    const adapters = await engines();
    const rangeKinds = new Set<string>();
    const outcomes = new Set<string>();
    let selectionCases = 0;
    let scheduleCases = 0;

    function observe(result: ReturnType<typeof selectFactoryTrainer> | ReturnType<typeof generateFactoryTrainerSchedule>): void {
      result.ledger.forEach((draw) => {
        rangeKinds.add(draw.rangeKind);
        outcomes.add(draw.accepted ? "accepted" : "rejected");
      });
    }

    function compareSelection(
      streak: number,
      battle: number,
      history: readonly number[],
      seed: number,
    ): void {
      const expected = selectFactoryTrainer(streak, battle, history, seed);
      observe(expected);
      for (const adapter of adapters) {
        expect(adapter.selectFactoryTrainer(streak, battle, history, seed)).toEqual(expected);
      }
      selectionCases += 1;
    }

    function compareSchedule(streak: number, seed: number): void {
      const expected = generateFactoryTrainerSchedule(streak, seed);
      observe(expected);
      for (const adapter of adapters) {
        expect(adapter.generateFactoryTrainerSchedule(streak, seed)).toEqual(expected);
      }
      scheduleCases += 1;
    }

    // Focused boundaries: first/final battle, hard range, post-challenge
    // normal-range clamp, MAX_SAFE_INTEGER streak, retained excess history,
    // and real default-GBA duplicate retries (seed 31: battles 1 and 5).
    compareSelection(0, 0, [], 0);
    compareSelection(0, 6, [100, 101, 102, 103, 104, 105], 0x1234_5678);
    compareSelection(56, 6, [1, 2, 3, 4, 5, 6], 0);
    compareSelection(MAX_SAFE_INTEGER, 3, [Number.NaN, 100.5, 999_999], 0xffff_ffff);
    compareSelection(0, 6, [Number.NaN, 100.5, Number.POSITIVE_INFINITY, -0, 999_999, 105, 777], 1);
    compareSchedule(0, 31);
    compareSchedule(0, 0x1234_5678);
    compareSchedule(56, 0);
    compareSchedule(MAX_SAFE_INTEGER, 0xffff_ffff);

    const streaks = [0, 6, 7, 13, 14, 48, 49, 55, 56, MAX_SAFE_INTEGER] as const;
    const seeds = [0, 1, 13, 31, 0x1234_5678, 0xffff_ffff] as const;
    for (const streak of streaks) {
      for (const seed of seeds) {
        const schedule = generateFactoryTrainerSchedule(streak, seed);
        compareSchedule(streak, seed);
        for (let battle = 0; battle < 7; battle += 1) {
          compareSelection(streak, battle, schedule.trainerIds.slice(0, battle), seed);
        }
      }
    }

    expect({
      selectionCases,
      scheduleCases,
      rangeKinds: [...rangeKinds].sort(),
      outcomes: [...outcomes].sort(),
    }).toEqual({
      selectionCases: 425,
      scheduleCases: 64,
      rangeKinds: ["hard", "normal"],
      outcomes: ["accepted", "rejected"],
    });
    const retry = generateFactoryTrainerSchedule(0, 31);
    expect(retry.drawCount).toBe(9);
    expect(retry.ledger.filter((draw) => !draw.accepted).map((draw) => draw.battleIndex)).toEqual([1, 5]);
    expect(retry.storedTrainerIds).toEqual(retry.trainerIds.slice(0, 6));
  });

  it("matches every production-reachable validation error and its ordering", async () => {
    const adapters = await engines();
    const selectionInputs = [
      [0, -1, [], 0], [0, 7, [], 0], [0, 0.5, [], 0], [0, Number.NaN, [], 0],
      [0, 0, [], -1], [0, 0, [], 0x1_0000_0000], [0, 0, [], 0.5], [0, 0, [], Number.NaN],
      [0, 3, [1, 2], 0],
      [-1, 0, [], 0], [MAX_SAFE_INTEGER + 1, 0, [], 0], [0.5, 0, [], 0], [Number.NaN, 0, [], 0],
      [-1, 7, [], -1], // battle wins validation ordering
      [-1, 0, [], -1], // rng wins validation ordering
      [-1, 1, [], 0], // history wins validation ordering
    ] as const;
    for (const input of selectionInputs) {
      const expected = capture(() => selectFactoryTrainer(input[0], input[1], input[2], input[3]));
      expect(expected).toBeInstanceOf(Error);
      for (const adapter of adapters) {
        expect(() => adapter.selectFactoryTrainer(input[0], input[1], input[2], input[3])).toThrow(
          (expected as Error).message,
        );
      }
    }

    const scheduleInputs = [
      [0, -1], [0, 0x1_0000_0000], [0, 0.5], [0, Number.NaN],
      [-1, 0], [MAX_SAFE_INTEGER + 1, 0], [0.5, 0], [Number.NaN, 0],
      [-1, -1], // schedule's first select validates rng before streak
    ] as const;
    for (const input of scheduleInputs) {
      const expected = capture(() => generateFactoryTrainerSchedule(input[0], input[1]));
      expect(expected).toBeInstanceOf(Error);
      for (const adapter of adapters) {
        expect(() => adapter.generateFactoryTrainerSchedule(input[0], input[1])).toThrow(
          (expected as Error).message,
        );
      }
    }
    expect({ selectionErrors: selectionInputs.length, scheduleErrors: scheduleInputs.length }).toEqual({
      selectionErrors: 16,
      scheduleErrors: 9,
    });
  });

  it("selects the requested engine and rejects malformed input lengths without trapping", async () => {
    expect((await factoryTrainerScheduleEngine()).id).toBe(
      process.env.POKEBENCH_ENGINE === "wasm" ? "wasm" : "ts",
    );
    const wasm = await loadFactoryWasm();

    function boundaryMessage(
      width: number,
      invoke: (ptr: number, len: number) => number,
      historyCount?: number,
    ): string {
      const inputPtr = wasm.fw_alloc(width);
      let outputPtr: number;
      try {
        if (historyCount !== undefined && width >= 28) {
          new DataView(wasm.memory.buffer, inputPtr, width).setUint32(24, historyCount, true);
        }
        outputPtr = invoke(inputPtr, width);
      } finally {
        wasm.fw_free(inputPtr, width);
      }
      const view = new DataView(wasm.memory.buffer, outputPtr, 7);
      const totalLength = view.getUint32(0, true);
      expect(view.getUint8(4)).toBe(2);
      const messageLength = view.getUint16(5, true);
      const message = new TextDecoder().decode(
        new Uint8Array(wasm.memory.buffer, outputPtr + 7, messageLength).slice(),
      );
      wasm.fw_free(outputPtr, totalLength);
      return message;
    }

    for (const width of [1, 27]) {
      expect(boundaryMessage(width, wasm.fw_select_factory_trainer)).toBe(
        "factory-wasm factoryTrainerScheduleEngine: select input must be at least 28 bytes",
      );
    }
    for (const [width, count] of [[28, 1], [29, 0], [35, 1], [37, 1]] as const) {
      expect(boundaryMessage(width, wasm.fw_select_factory_trainer, count)).toBe(
        "factory-wasm factoryTrainerScheduleEngine: malformed select history length",
      );
    }
    for (const width of [1, 15, 17]) {
      expect(boundaryMessage(width, wasm.fw_generate_factory_trainer_schedule)).toBe(
        "factory-wasm factoryTrainerScheduleEngine: schedule input must be exactly 16 bytes",
      );
    }
  });
});
