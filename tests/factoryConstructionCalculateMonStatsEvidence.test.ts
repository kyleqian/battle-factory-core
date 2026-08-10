import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  reduceFactoryCalculateMonStatsParentTiming,
  reduceFactoryModifyStatByNatureTiming,
} from "../src/engine/factoryConstructionClock.ts";

type DirectCall = {
  monIndex: number;
  operation: string;
  target: string;
  callPc: string;
  entryPc: string;
  returnPc: string;
  entryMasterCycles: number;
  returnMasterCycles: number;
  returnPcObserved: string;
  arguments: Record<string, number>;
  result?: number;
};

type StatsReceipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceFunction: string;
  mons: Array<{ monIndex: number; targetNature: number; acceptedPersonality: number }>;
  spans: Array<{
    monIndex: number;
    entryMasterCycles: number;
    entryPc: string;
    returnMasterCycles: number;
    returnPc: string;
  }>;
  interruptPauses: Array<{ entryMasterCycles: number; resumeMasterCycles: number }>;
  directCalls: DirectCall[];
};

const ROOT = "tests/fixtures/factory-calculate-mon-stats-v1";
const CASES = [
  {
    name: "anchor",
    hash: "cde88e8f2a6ab3602793648120b9d687e42ad96c6d0ad6d554f74e032e82d603",
    sourceCycles: [147_225, 154_160, 144_082, 150_824, 152_353, 145_526],
    directCycles: [146_142, 153_077, 142_999, 149_741, 151_270, 144_443],
    interstitialCycles: [1_083, 1_083, 1_083, 1_083, 1_083, 1_083],
    pauses: [49_093, 0, 0, 41_394, 0, 47_590],
  },
  {
    name: "liliana",
    hash: "d338edc6bfc4e57f505dcdb3886612f0fa6be64bd02ca9971ae79874eaf84750",
    sourceCycles: [147_417, 148_749, 152_011],
    directCycles: [146_334, 147_668, 150_928],
    interstitialCycles: [1_083, 1_081, 1_083],
    pauses: [38_205, 44_449, 48_911],
  },
  {
    name: "factory-varied",
    hash: "e0d10a1cb2d668ecac33282b8031e4fd1c9cbbc5cc180fad4c56cc561e7f15b3",
    sourceCycles: [147_488, 140_999, 150_849],
    directCycles: [146_407, 139_916, 149_766],
    interstitialCycles: [1_081, 1_083, 1_083],
    pauses: [36_923, 0, 0],
  },
] as const;

const probes = CASES.map((expected) => {
  const bytes = readFileSync(`${ROOT}/${expected.name}.json`);
  return {
    expected,
    bytes,
    value: JSON.parse(bytes.toString("utf8")) as StatsReceipt,
  };
});

const DIRECT_CALL_SHAPE = [
  ["get-mon-data", "old-max-hp", "0x08068d1e", "0x0806a51a", "0x08068d22", 58],
  ["get-mon-data", "current-hp", "0x08068d2a", "0x0806a51a", "0x08068d2e", 57],
  ["get-mon-data", "hp-iv", "0x08068d36", "0x0806a51a", "0x08068d3a", 39],
  ["get-mon-data", "hp-ev", "0x08068d42", "0x0806a51a", "0x08068d46", 26],
  ["get-mon-data", "attack-iv", "0x08068d4e", "0x0806a51a", "0x08068d52", 40],
  ["get-mon-data", "attack-ev", "0x08068d5a", "0x0806a51a", "0x08068d5e", 27],
  ["get-mon-data", "defense-iv", "0x08068d66", "0x0806a51a", "0x08068d6a", 41],
  ["get-mon-data", "defense-ev", "0x08068d72", "0x0806a51a", "0x08068d76", 28],
  ["get-mon-data", "speed-iv", "0x08068d7e", "0x0806a51a", "0x08068d82", 42],
  ["get-mon-data", "speed-ev", "0x08068d8a", "0x0806a51a", "0x08068d8e", 29],
  ["get-mon-data", "sp-attack-iv", "0x08068d96", "0x0806a51a", "0x08068d9a", 43],
  ["get-mon-data", "sp-attack-ev", "0x08068da2", "0x0806a51a", "0x08068da6", 30],
  ["get-mon-data", "sp-defense-iv", "0x08068dae", "0x0806a51a", "0x08068db2", 44],
  ["get-mon-data", "sp-defense-ev", "0x08068dba", "0x0806a51a", "0x08068dbe", 31],
  ["get-mon-data", "species", "0x08068dc6", "0x0806a51a", "0x08068dca", 11],
  ["get-level-from-exp", "level", "0x08068dd0", "0x08069056", "0x08068dd4", null],
  ["set-mon-data", "level", "0x08068de0", "0x0806acae", "0x08068de4", 56],
  ["divide", "max-hp", "0x08068e1c", "0x082e7542", "0x08068e20", null],
  ["set-mon-data", "max-hp", "0x08068e42", "0x0806acae", "0x08068e46", 58],
  ["divide", "attack", "0x08068e68", "0x082e7542", "0x08068e6c", null],
  ["get-nature", "attack", "0x08068e72", "0x0806d072", "0x08068e76", null],
  ["modify-stat-by-nature", "attack", "0x08068e80", "0x0806d8d6", "0x08068e84", null],
  ["set-mon-data", "attack", "0x08068e90", "0x0806acae", "0x08068e94", 59],
  ["divide", "defense", "0x08068eae", "0x082e7542", "0x08068eb2", null],
  ["get-nature", "defense", "0x08068eb8", "0x0806d072", "0x08068ebc", null],
  ["modify-stat-by-nature", "defense", "0x08068ec6", "0x0806d8d6", "0x08068eca", null],
  ["set-mon-data", "defense", "0x08068ed6", "0x0806acae", "0x08068eda", 60],
  ["divide", "speed", "0x08068ef4", "0x082e7542", "0x08068ef8", null],
  ["get-nature", "speed", "0x08068efe", "0x0806d072", "0x08068f02", null],
  ["modify-stat-by-nature", "speed", "0x08068f0c", "0x0806d8d6", "0x08068f10", null],
  ["set-mon-data", "speed", "0x08068f1c", "0x0806acae", "0x08068f20", 61],
  ["divide", "sp-attack", "0x08068f3a", "0x082e7542", "0x08068f3e", null],
  ["get-nature", "sp-attack", "0x08068f44", "0x0806d072", "0x08068f48", null],
  ["modify-stat-by-nature", "sp-attack", "0x08068f52", "0x0806d8d6", "0x08068f56", null],
  ["set-mon-data", "sp-attack", "0x08068f62", "0x0806acae", "0x08068f66", 62],
  ["divide", "sp-defense", "0x08068f80", "0x082e7542", "0x08068f84", null],
  ["get-nature", "sp-defense", "0x08068f8a", "0x0806d072", "0x08068f8e", null],
  ["modify-stat-by-nature", "sp-defense", "0x08068f98", "0x0806d8d6", "0x08068f9c", null],
  ["set-mon-data", "sp-defense", "0x08068fa8", "0x0806acae", "0x08068fac", 63],
  ["set-mon-data", "current-hp", "0x08068ff0", "0x0806acae", "0x08068ff4", 57],
] as const;

function sourceCycles(
  start: number,
  end: number,
  pauses: readonly { entryMasterCycles: number; resumeMasterCycles: number }[],
): number {
  return end - start - pauses.reduce((total, pause) => (
    start <= pause.entryMasterCycles && pause.resumeMasterCycles <= end
      ? total + pause.resumeMasterCycles - pause.entryMasterCycles
      : total
  ), 0);
}

function afterPc(pc: string): string {
  return `0x${(Number.parseInt(pc, 16) + 2).toString(16).padStart(8, "0")}`;
}

describe("Factory CalculateMonStats v1 source-call receipt", () => {
  it("is three fresh, byte-stable Scene-OFF packets", () => {
    for (const { expected, bytes, value } of probes) {
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected.hash);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(value, null, 2)}\n`);
      expect(value.schema).toBe("factory-calculate-mon-stats-direct-calls/v1");
      expect(value.oracleProfile).toBe("battle-scene-off");
      expect(value.directCalls).toHaveLength(value.mons.length * DIRECT_CALL_SHAPE.length);
    }
  });

  it("pins all twelve complete boundaries, their VBlank pauses, and the direct-call residual", () => {
    for (const { expected, value } of probes) {
      const whole: number[] = [];
      const direct: number[] = [];
      const residual: number[] = [];
      const pauses: number[] = [];

      for (const span of value.spans) {
        const contained = value.interruptPauses.filter((pause) => (
          span.entryMasterCycles <= pause.entryMasterCycles
          && pause.resumeMasterCycles <= span.returnMasterCycles
        ));
        const rows = value.directCalls.filter((call) => call.monIndex === span.monIndex);
        const source = sourceCycles(
          span.entryMasterCycles,
          span.returnMasterCycles,
          value.interruptPauses,
        );
        const calls = rows.reduce((total, call) => (
          total + sourceCycles(call.entryMasterCycles, call.returnMasterCycles, value.interruptPauses)
        ), 0);
        whole.push(source);
        direct.push(calls);
        residual.push(source - calls);
        pauses.push(contained.reduce((total, pause) => (
          total + pause.resumeMasterCycles - pause.entryMasterCycles
        ), 0));
        expect([span.entryPc, span.returnPc]).toEqual(["0x08068d0e", "0x080686ec"]);
      }

      expect(whole).toEqual(expected.sourceCycles);
      expect(direct).toEqual(expected.directCycles);
      expect(residual).toEqual(expected.interstitialCycles);
      expect(pauses).toEqual(expected.pauses);
    }
  });

  it("captures the compiled direct-call order and all observed source branch inputs", () => {
    for (const { value } of probes) {
      for (const mon of value.mons) {
        const rows = value.directCalls.filter((call) => call.monIndex === mon.monIndex);
        expect(rows.map((call) => [
          call.operation,
          call.target,
          call.callPc,
          call.entryPc,
          call.returnPc,
          call.arguments.field ?? null,
        ])).toEqual(DIRECT_CALL_SHAPE);
        expect(rows.map((call) => call.returnPcObserved)).toEqual(rows.map((call) => afterPc(call.returnPc)));

        const divides = rows.filter((call) => call.operation === "divide");
        expect(divides.map((call) => call.arguments.divisor)).toEqual([100, 100, 100, 100, 100, 100]);
        expect(divides.every((call) => call.arguments.dividend! > 0 && call.result !== undefined)).toBe(true);

        const natures = rows.filter((call) => call.operation === "get-nature");
        expect(natures.map((call) => call.result)).toEqual(Array(5).fill(mon.acceptedPersonality % 25));
        const modifications = rows.filter((call) => call.operation === "modify-stat-by-nature");
        expect(modifications.map((call) => call.arguments.nature)).toEqual(Array(5).fill(mon.acceptedPersonality % 25));
        expect(modifications.map((call) => call.arguments.statIndex)).toEqual([1, 2, 3, 4, 5]);
      }
    }
  });

  it("source-reduces every direct ModifyStatByNature span from its ABI inputs", () => {
    const reductions: Array<{
      natureModifier: -1 | 0 | 1 | null;
      cycles: number;
      result: number;
    }> = [];

    for (const { value } of probes) {
      for (const call of value.directCalls.filter((row) => row.operation === "modify-stat-by-nature")) {
        const timing = reduceFactoryModifyStatByNatureTiming({
          nature: call.arguments.nature!,
          stat: call.arguments.stat!,
          statIndex: call.arguments.statIndex!,
        });
        expect(timing.entryPc).toBe(0x0806_d8d4);
        expect(timing.result).toBe(call.result);
        expect(timing.cycles).toBe(sourceCycles(
          call.entryMasterCycles,
          call.returnMasterCycles,
          value.interruptPauses,
        ));
        reductions.push(timing);
      }
    }

    expect(reductions).toHaveLength(60);
    expect(reductions.filter((timing) => timing.natureModifier === 0)).toHaveLength(52);
    expect(reductions.filter((timing) => timing.natureModifier === 1)).toHaveLength(4);
    expect(reductions.filter((timing) => timing.natureModifier === -1)).toHaveLength(4);
    expect(reductions.reduce((total, timing) => total + timing.cycles, 0)).toBe(8_396);
    expect(new Set(reductions.map((timing) => timing.cycles))).toEqual(new Set([98, 408, 410, 416, 418]));
  });

  it("follows ModifyStatByNature's guard, table, u16-product, and multiply-width branches", () => {
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 1,
      stat: 68,
      statIndex: 1,
    })).toMatchObject({
      route: "raise",
      natureModifier: 1,
      multiplier: 110,
      scaledStat: 7_480,
      result: 74,
      multiplyInternalCycles: 1,
      cycles: 418,
    });
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 1,
      stat: 85,
      statIndex: 2,
    })).toMatchObject({
      route: "lower",
      natureModifier: -1,
      multiplier: 90,
      scaledStat: 7_650,
      result: 76,
      multiplyInternalCycles: 1,
      cycles: 408,
    });
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 0,
      stat: 400,
      statIndex: 1,
    })).toMatchObject({
      route: "neutral",
      natureModifier: 0,
      multiplier: null,
      scaledStat: 400,
      result: 400,
      multiplyInternalCycles: 0,
      cycles: 98,
    });
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 1,
      stat: 256,
      statIndex: 1,
    })).toMatchObject({
      route: "raise",
      natureModifier: 1,
      multiplier: 110,
      scaledStat: 28_160,
      result: 281,
      multiplyInternalCycles: 2,
      cycles: 497,
    });
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 1,
      stat: 65_535,
      statIndex: 1,
    })).toMatchObject({
      route: "raise",
      multiplier: 110,
      scaledStat: 65_426,
      result: 654,
      multiplyInternalCycles: 2,
      cycles: 503,
    });
    for (const statIndex of [0, 6, 255]) {
      expect(reduceFactoryModifyStatByNatureTiming({
        nature: 24,
        stat: 65535,
        statIndex,
      })).toMatchObject({
        route: "unaffected-stat-index",
        natureModifier: null,
        multiplier: null,
        scaledStat: 65535,
        result: 65535,
        multiplyInternalCycles: 0,
        romLiteralLoads: 0,
        romTableLoads: 0,
        cycles: 48,
      });
    }
    expect(() => reduceFactoryModifyStatByNatureTiming({ nature: 25, stat: 1, statIndex: 1 }))
      .toThrow("nature must be a GetNature result in [0, 24]");
    expect(() => reduceFactoryModifyStatByNatureTiming({ nature: 1, stat: 65_536, statIndex: 1 }))
      .toThrow("stat must be a source u16");
    expect(() => reduceFactoryModifyStatByNatureTiming({ nature: 1, stat: 1, statIndex: 256 }))
      .toThrow("statIndex must be a source u8");
  });

  it("source-reduces all twelve parent-only residuals and identifies the u8 level-up-HP branch", () => {
    const branches: Array<{ rawLevelUpHp: number; cycles: number }> = [];
    for (const { expected, value } of probes) {
      value.spans.forEach((span, spanIndex) => {
        const rows = value.directCalls.filter((call) => call.monIndex === span.monIndex);
        const result = (operation: string, target: string): number => {
          const row = rows.find((call) => call.operation === operation && call.target === target);
          if (row?.result === undefined) throw new Error(`missing ${operation}/${target} result`);
          return row.result;
        };
        const oldMaxHp = result("get-mon-data", "old-max-hp");
        const currentHp = result("get-mon-data", "current-hp");
        const level = result("get-level-from-exp", "level");
        const newMaxHp = result("divide", "max-hp") + level + 10;
        const timing = reduceFactoryCalculateMonStatsParentTiming({
          speciesId: result("get-mon-data", "species"),
          oldMaxHp,
          currentHp,
          newMaxHp,
        });

        expect(timing.cycles).toBe(expected.interstitialCycles[spanIndex]);
        expect(timing.currentHpPath).toBe("normal-adjust");
        expect(timing.directCallCount).toBe(rows.length);
        branches.push({ rawLevelUpHp: timing.rawLevelUpHp, cycles: timing.cycles });
      });
    }

    expect(branches.filter((branch) => branch.rawLevelUpHp === 0)).toEqual([
      { rawLevelUpHp: 0, cycles: 1_081 },
      { rawLevelUpHp: 0, cycles: 1_081 },
    ]);
    expect(branches.filter((branch) => branch.rawLevelUpHp !== 0)).toHaveLength(10);
    expect(new Set(branches.filter((branch) => branch.rawLevelUpHp !== 0).map((branch) => branch.cycles)))
      .toEqual(new Set([1_083]));
  });

  it("follows the compiled level-up, Shedinja, and final-current-HP branch variants", () => {
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 1,
      oldMaxHp: 100,
      currentHp: 100,
      newMaxHp: 101,
    })).toMatchObject({
      rawLevelUpHp: 1,
      storedLevelUpHp: 1,
      currentHpPath: "normal-adjust",
      writesCurrentHp: true,
      directCallCount: 40,
      sequentialThumbHalfwords: 345,
      pipelineRefills: 51,
      romLiteralLoads: 5,
      romTableLoads: 6,
      cycles: 1_083,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 1,
      oldMaxHp: 100,
      currentHp: 100,
      newMaxHp: 100,
    })).toMatchObject({
      rawLevelUpHp: 0,
      storedLevelUpHp: 1,
      sequentialThumbHalfwords: 347,
      pipelineRefills: 50,
      cycles: 1_081,
    });
    // The source field is u8: a delta of 256 selects the same zero branch.
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 1,
      oldMaxHp: 100,
      currentHp: 0,
      newMaxHp: 356,
    })).toMatchObject({
      rawLevelUpHp: 0,
      currentHpPath: "return-without-write",
      writesCurrentHp: false,
      directCallCount: 39,
      cycles: 1_061,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 1,
      oldMaxHp: 0,
      currentHp: 0,
      newMaxHp: 45,
    })).toMatchObject({
      currentHpPath: "normal-initialize",
      writesCurrentHp: true,
      directCallCount: 40,
      cycles: 1_085,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 303,
      oldMaxHp: 1,
      currentHp: 1,
      newMaxHp: 1,
    })).toMatchObject({
      shedinja: true,
      currentHpPath: "shedinja-set-one",
      directCallCount: 39,
      romTableLoads: 5,
      cycles: 1_013,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 303,
      oldMaxHp: 0,
      currentHp: 0,
      newMaxHp: 1,
    })).toMatchObject({
      currentHpPath: "shedinja-set-one",
      writesCurrentHp: true,
      directCallCount: 39,
      cycles: 1_015,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 303,
      oldMaxHp: 1,
      currentHp: 0,
      newMaxHp: 1,
    })).toMatchObject({
      currentHpPath: "return-without-write",
      writesCurrentHp: false,
      directCallCount: 38,
      cycles: 991,
    });
  });
});
