import { describe, expect, it } from "vitest";
import {
  generateFactoryTrainerSchedule,
  selectFactoryTrainer,
  type FactoryTrainerRngPort,
} from "../src/engine/factoryTrainerSchedule.ts";

function scriptedRng(values: readonly number[]): FactoryTrainerRngPort {
  let index = 0;
  return {
    draw(rngValue) {
      const value = values[index++];
      if (value === undefined) throw new Error("scripted RNG exhausted");
      return { rngValue: (rngValue + 1) >>> 0, value };
    },
  };
}

describe("source-exact Factory trainer selection", () => {
  it("uses the extracted normal range boundaries for battle indexes 0..5", () => {
    expect(selectFactoryTrainer(0, 0, [], 10, scriptedRng([0])).ledger[0])
      .toMatchObject({ rangeKind: "normal", rangeIndex: 0, rangeStart: 0, rangeEnd: 99, trainerId: 0 });
    expect(selectFactoryTrainer(0, 5, [1, 2, 3, 4, 5], 10, scriptedRng([99])).ledger[0])
      .toMatchObject({ rangeKind: "normal", rangeIndex: 0, rangeStart: 0, rangeEnd: 99, trainerId: 99 });
    expect(selectFactoryTrainer(14, 3, [200, 201, 202], 10, scriptedRng([0])).ledger[0])
      .toMatchObject({ rangeKind: "normal", rangeIndex: 2, rangeStart: 100, rangeEnd: 139, trainerId: 100 });
    expect(selectFactoryTrainer(14, 3, [200, 201, 202], 10, scriptedRng([39])).trainerId)
      .toBe(139);
  });

  it("uses the hard range only for battle index 6 and clamps challenge >7 to row 7", () => {
    const final = selectFactoryTrainer(0, 6, [0, 1, 2, 3, 4, 5], 0, scriptedRng([0]));
    expect(final.ledger[0]).toMatchObject({
      challenge: 0,
      rangeKind: "hard",
      rangeIndex: 0,
      rangeStart: 100,
      rangeEnd: 119,
      trainerId: 100,
    });

    const clamped = selectFactoryTrainer(8 * 7, 6, [1, 2, 3, 4, 5, 6], 0, scriptedRng([99]));
    expect(clamped.ledger[0]).toMatchObject({
      challenge: 8,
      rangeKind: "normal",
      rangeIndex: 7,
      rangeStart: 200,
      rangeEnd: 299,
      trainerId: 299,
    });
  });

  it("retries every prior trainer with one Random() draw per attempt and omits final history write", () => {
    const result = selectFactoryTrainer(
      0,
      6,
      [100, 101, 102, 103, 104, 105],
      0x1000,
      scriptedRng([0, 1, 2, 6]),
    );
    expect(result.trainerId).toBe(106);
    expect(result.drawCount).toBe(4);
    expect(result.rngValue).toBe(0x1004);
    expect(result.storedTrainerIds).toEqual([100, 101, 102, 103, 104, 105]);
    expect(result.ledger.map(({ trainerId, accepted }) => ({ trainerId, accepted }))).toEqual([
      { trainerId: 100, accepted: false },
      { trainerId: 101, accepted: false },
      { trainerId: 102, accepted: false },
      { trainerId: 106, accepted: true },
    ]);
  });

  it("pins a deterministic seven-trainer GBA schedule, final RNG, and no repeats", () => {
    const first = generateFactoryTrainerSchedule(0, 0x12345678);
    const second = generateFactoryTrainerSchedule(0, 0x12345678);
    expect(first).toEqual(second);
    expect(first.trainerIds).toEqual([29, 26, 90, 88, 60, 67, 112]);
    expect(new Set(first.trainerIds).size).toBe(7);
    expect(first.storedTrainerIds).toEqual(first.trainerIds.slice(0, 6));
    expect(first.drawCount).toBe(7);
    expect(first.rngValue).toBe(2443977505);
  });
});
