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
  it("pins every extracted normal range boundary for battle indexes 0..5", () => {
    const ranges = [
      [0, 99], [80, 119], [100, 139], [120, 159],
      [140, 179], [160, 199], [180, 219], [200, 299],
    ] as const;
    ranges.forEach(([start, end], challenge) => {
      const low = selectFactoryTrainer(challenge * 7, challenge % 6, [400, 401, 402, 403, 404].slice(0, challenge % 6), 10, scriptedRng([0]));
      const high = selectFactoryTrainer(challenge * 7, challenge % 6, [400, 401, 402, 403, 404].slice(0, challenge % 6), 10, scriptedRng([end - start]));
      expect(low.ledger[0]).toMatchObject({
        rangeKind: "normal", rangeIndex: challenge, rangeStart: start, rangeEnd: end, trainerId: start,
      });
      expect(high.trainerId).toBe(end);
    });
  });

  it("pins every final-battle hard range and clamps challenge >7 to normal row 7", () => {
    const hardRanges = [
      [100, 119], [120, 139], [140, 159], [160, 179],
      [180, 199], [200, 219], [220, 239], [200, 299],
    ] as const;
    hardRanges.forEach(([start, end], challenge) => {
      const history = [400, 401, 402, 403, 404, 405];
      const low = selectFactoryTrainer(challenge * 7, 6, history, 0, scriptedRng([0]));
      const high = selectFactoryTrainer(challenge * 7, 6, history, 0, scriptedRng([end - start]));
      expect(low.ledger[0]).toMatchObject({
        challenge, rangeKind: "hard", rangeIndex: challenge, rangeStart: start, rangeEnd: end, trainerId: start,
      });
      expect(high.trainerId).toBe(end);
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
      scriptedRng([0, 1, 2, 3, 4, 5, 6]),
    );
    expect(result.trainerId).toBe(106);
    expect(result.drawCount).toBe(7);
    expect(result.rngValue).toBe(0x1007);
    expect(result.storedTrainerIds).toEqual([100, 101, 102, 103, 104, 105]);
    expect(result.ledger.map(({ trainerId, accepted }) => ({ trainerId, accepted }))).toEqual([
      { trainerId: 100, accepted: false },
      { trainerId: 101, accepted: false },
      { trainerId: 102, accepted: false },
      { trainerId: 103, accepted: false },
      { trainerId: 104, accepted: false },
      { trainerId: 105, accepted: false },
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
