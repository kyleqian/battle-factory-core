import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expTablesData from "../src/data/gen/exp-tables.json" with { type: "json" };
import {
  censusFactoryGetBoxMonDataDependency,
  reduceFactoryGetMonDataTiming,
  reduceFactoryGetNatureTiming,
  reduceFactoryNatureAttemptTiming,
  reduceFactoryOuterLoopTiming,
  reduceFactorySignedDivisionTiming,
} from "../src/engine/factoryConstructionClock.ts";

type ExecutionState = {
  cpu: { cycles: number; nextEvent: number };
  gba: { performingDma: number; cpuBlocked: boolean };
  memory: { activeDma: number; prefetchEnabled: boolean };
  interrupt: { if: number };
};

type Boundary = {
  kind: string;
  masterCycles: number;
  cyclePhase: number;
  pc: string;
  returnPc?: string;
  executionState: ExecutionState;
};

type ResidualCall = {
  operation: string;
  callPc: string;
  entryPc: string;
  returnPc: string;
  returnPcObserved: string;
  entryMasterCycles: number;
  returnMasterCycles: number;
  entryCyclePhase: number;
  returnCyclePhase: number;
  entryExecutionState: ExecutionState;
  returnExecutionState: ExecutionState;
  boundaries?: Record<string, Boundary>;
};

type ResidualReceipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceFunction: "CreateFrontierFactorySelectableMons" | "FillFactoryFrontierTrainerParty";
  frameCycles: number;
  sourceBoundaries: Boundary[];
  interruptPauses: Pause[];
  directCalls: ResidualCall[];
};

type Pause = { entryMasterCycles: number; resumeMasterCycles: number };
type StatsCall = {
  monIndex: number;
  operation: string;
  entryMasterCycles: number;
  returnMasterCycles: number;
  arguments: Record<string, number>;
  boundaries?: Record<string, { masterCycles: number; pc: string }>;
};
type StatsReceipt = {
  mons: Array<{ monIndex: number; acceptedPersonality: number }>;
  interruptPauses: Pause[];
  directCalls: StatsCall[];
};
type CycleEvent = {
  kind: string;
  masterCycles: number;
  pc: string;
  monIndex?: number | null;
  interruptIndex?: number;
};
type ConstructionReceipt = {
  sourceFunction: ResidualReceipt["sourceFunction"];
  sequence: Array<{ tag: string; post: number }>;
  monBoundaries: Array<{ monIndex: number; targetNature: number }>;
  cycleEvidence: { events: CycleEvent[] };
};

type CensusRow = {
  component: "encrypted-accessor" | "get-nature" | "signed-divide" | "level-loop"
    | "nature-attempt" | "outer-factory-loop";
  residualCycles: number;
  entryPc: string;
  returnPc: string;
  cyclePhase: number;
  state: ExecutionState;
};

const CASES = ["anchor", "liliana", "factory-varied"] as const;
const ROOT = "tests/fixtures/factory-construction-residual-boundaries-v1";
const HASHES = {
  anchor: "1b645c394858ea51048634ca6ba4ec9e4980125f46bc808293094fa401cfde07",
  liliana: "c9f8f8cdef3c074dc8a47b6621dd6581c2ed29697cc637bc4314ddc705d6d1da",
  "factory-varied": "e6f403e9747ea07386a2697eb0b31db4ec5d43fa99d40e886c448ea989f3fe72",
} as const;
const GROWTH_RATE_NAMES = [
  "GROWTH_MEDIUM_FAST", "GROWTH_ERRATIC", "GROWTH_FLUCTUATING",
  "GROWTH_MEDIUM_SLOW", "GROWTH_FAST", "GROWTH_SLOW",
] as const;

function sourceCycles(start: number, end: number, pauses: readonly Pause[]): number {
  return end - start - pauses.reduce((total, pause) => (
    start <= pause.entryMasterCycles && pause.resumeMasterCycles <= end
      ? total + pause.resumeMasterCycles - pause.entryMasterCycles
      : total
  ), 0);
}

function expectedLevelLoop(growthRate: number, experience: number): number {
  const growthName = GROWTH_RATE_NAMES[growthRate];
  if (growthName === undefined) throw new Error(`unknown growth rate ${growthRate}`);
  const table = expTablesData.growthRates[growthName];
  let cycles = 6;
  for (let level = 2; ; level += 1) {
    cycles += 6;
    if (level > 100) return cycles + 6;
    cycles += 32;
    if (table[level]! > experience) return cycles;
    cycles += 6;
  }
}

function interruptPauses(events: readonly CycleEvent[]): Pause[] {
  const parts = new Map<number, Partial<Pause>>();
  for (const event of events) {
    if (event.interruptIndex === undefined) continue;
    const part = parts.get(event.interruptIndex) ?? {};
    if (event.kind === "vblank-entry") part.entryMasterCycles = event.masterCycles;
    if (event.kind === "vblank-resume") part.resumeMasterCycles = event.masterCycles;
    parts.set(event.interruptIndex, part);
  }
  return [...parts.values()].flatMap((part) => (
    part.entryMasterCycles === undefined || part.resumeMasterCycles === undefined
      ? []
      : [part as Pause]
  ));
}

function readResidual(name: typeof CASES[number]): { bytes: Buffer; value: ResidualReceipt } {
  const bytes = readFileSync(`${ROOT}/${name}.json.gz`);
  return { bytes, value: JSON.parse(gunzipSync(bytes).toString("utf8")) as ResidualReceipt };
}

function stateAt(receipt: ResidualReceipt, event: CycleEvent): Boundary {
  const row = receipt.sourceBoundaries.find((candidate) => (
    candidate.kind === event.kind && candidate.masterCycles === event.masterCycles
  ));
  if (row === undefined) throw new Error(`missing ${event.kind} at ${event.masterCycles}`);
  return row;
}

function pushStatsRows(
  rows: CensusRow[], stats: StatsReceipt, evidence: ResidualReceipt,
): void {
  for (const [index, call] of stats.directCalls.entries()) {
    const observed = evidence.directCalls[index]!;
    const personality = stats.mons.find((mon) => mon.monIndex === call.monIndex)!.acceptedPersonality;
    let residualCycles: number | null = null;
    let component: CensusRow["component"] | null = null;
    let entryPc = observed.entryPc;
    let returnPc = observed.returnPcObserved;
    let cyclePhase = observed.entryCyclePhase;
    let state = observed.entryExecutionState;
    if (call.operation === "get-mon-data" && ![57, 58].includes(call.arguments.field!)) {
      const nested = censusFactoryGetBoxMonDataDependency({
        field: call.arguments.field!, personality, checksumValid: true, isBadEgg: false,
      });
      const wrapper = reduceFactoryGetMonDataTiming({ field: call.arguments.field! });
      residualCycles = sourceCycles(call.entryMasterCycles, call.returnMasterCycles, stats.interruptPauses)
        - wrapper.preDelegateCycles! - nested.composedSynchronousKnownCycles - wrapper.returnShellCycles!;
      component = "encrypted-accessor";
    } else if (call.operation === "get-nature") {
      residualCycles = sourceCycles(call.entryMasterCycles, call.returnMasterCycles, stats.interruptPauses)
        - reduceFactoryGetNatureTiming(personality).cycles;
      component = "get-nature";
    } else if (call.operation === "divide") {
      residualCycles = sourceCycles(call.entryMasterCycles, call.returnMasterCycles, stats.interruptPauses)
        - reduceFactorySignedDivisionTiming({
          dividend: call.arguments.dividend!, divisor: call.arguments.divisor!,
        }).cycles;
      component = "signed-divide";
    } else if (call.operation === "get-level-from-exp") {
      const source = call.boundaries!;
      const observedSource = observed.boundaries!;
      residualCycles = source.loopExit!.masterCycles - source.firstLevelCompare!.masterCycles
        - expectedLevelLoop(call.arguments.growthRate!, call.arguments.experience!);
      component = "level-loop";
      entryPc = source.firstLevelCompare!.pc;
      returnPc = source.loopExit!.pc;
      cyclePhase = observedSource.firstLevelCompare!.cyclePhase;
      state = observedSource.firstLevelCompare!.executionState;
    }
    if (component !== null && residualCycles !== null && [0, 18].includes(residualCycles)) {
      rows.push({ component, residualCycles, entryPc, returnPc, cyclePhase, state });
    }
  }
}

function pushConstructionRows(
  rows: CensusRow[], source: ConstructionReceipt, evidence: ResidualReceipt,
): void {
  const events = source.cycleEvidence.events;
  const pauses = interruptPauses(events);
  const construction = source.sequence.filter((event) => event.tag === "construction");
  let constructionIndex = 0;
  for (const mon of source.monBoundaries) {
    const monEvents = events.filter((event) => event.monIndex === mon.monIndex);
    const randoms = monEvents.filter((event) => event.kind === "personality-random");
    const checks = monEvents.filter((event) => event.kind === "personality-attempt-check");
    const create = monEvents.find((event) => event.kind === "create-mon-entry")!;
    checks.forEach((check, attempt) => {
      const low = construction[constructionIndex++]!;
      const high = construction[constructionIndex++]!;
      const candidate = (((high.post >>> 16) << 16) | (low.post >>> 16)) >>> 0;
      const end = attempt + 1 < checks.length ? randoms[(attempt + 1) * 2]! : create;
      const residualCycles = sourceCycles(check.masterCycles, end.masterCycles, pauses)
        - reduceFactoryNatureAttemptTiming(candidate, mon.targetNature).cycles;
      if ([0, 18].includes(residualCycles)) {
        const observed = stateAt(evidence, check);
        rows.push({
          component: "nature-attempt", residualCycles, entryPc: check.pc,
          returnPc: end.pc, cyclePhase: observed.cyclePhase, state: observed.executionState,
        });
      }
    });
  }
  for (let monIndex = 0; monIndex + 1 < source.monBoundaries.length; monIndex += 1) {
    const start = events.find((event) => event.kind === "factory-post-mon-end" && event.monIndex === monIndex)!;
    const end = events.find((event) => event.kind === "construction-entry" && event.monIndex === monIndex + 1)!;
    const timing = source.sourceFunction === "CreateFrontierFactorySelectableMons"
      ? reduceFactoryOuterLoopTiming({
        sourceFunction: source.sourceFunction, nextMonIndex: monIndex + 1,
        selectableRentalRank: 0, selectableChallengeNum: 0,
      })
      : reduceFactoryOuterLoopTiming({ sourceFunction: source.sourceFunction, nextMonIndex: monIndex + 1 });
    const residualCycles = sourceCycles(start.masterCycles, end.masterCycles, pauses) - timing.cycles;
    const observed = stateAt(evidence, start);
    rows.push({
      component: "outer-factory-loop", residualCycles, entryPc: start.pc,
      returnPc: end.pc, cyclePhase: observed.cyclePhase, state: observed.executionState,
    });
  }
}

describe("Issue #55 recurring +18 source-boundary census", () => {
  const rows: CensusRow[] = [];
  for (const name of CASES) {
    const evidence = readResidual(name);
    const stats = JSON.parse(readFileSync(
      `tests/fixtures/factory-calculate-mon-stats-v1/${name}.json`, "utf8",
    )) as StatsReceipt;
    const construction = JSON.parse(readFileSync(
      `tests/fixtures/factory-construction-cycle-v2/${name}.json`, "utf8",
    )) as ConstructionReceipt;
    pushStatsRows(rows, stats, evidence.value);
    pushConstructionRows(rows, construction, evidence.value);
  }

  it("is wrapper-validated Scene-OFF evidence with deterministic compact archives", () => {
    for (const name of CASES) {
      const { bytes, value } = readResidual(name);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(HASHES[name]);
      expect(value.schema).toBe("factory-construction-residual-boundaries/v1");
      expect(value.oracleProfile).toBe("battle-scene-off");
      expect(value.frameCycles).toBe(280_896);
      expect(value.directCalls).toHaveLength(name === "anchor" ? 240 : 120);
    }
  });

  it("reproduces every +18 member across all six already-exposed source components", () => {
    const members = rows.filter((row) => row.residualCycles === 18);
    expect(Object.fromEntries([...Map.groupBy(members, (row) => row.component)]
      .map(([component, values]) => [component, values.length]))).toEqual({
      "nature-attempt": 11,
      "outer-factory-loop": 1,
      "encrypted-accessor": 67,
      "level-loop": 3,
      "signed-divide": 1,
      "get-nature": 2,
    });
    expect(members).toHaveLength(85);
    expect(new Set(members.map((row) => row.cyclePhase)).size).toBeGreaterThan(75);
    expect(new Set(members.map((row) => row.entryPc))).toEqual(new Set([
      "0x0806d08a", "0x0819b614", "0x0806a51a", "0x08069090",
      "0x082e7542", "0x0806d072",
    ]));
  });

  it("rejects boundary-visible IRQ/DMA/prefetch state as the discriminator", () => {
    const members = rows.filter((row) => row.residualCycles === 18);
    const clean = rows.filter((row) => row.residualCycles === 0);
    expect(clean).toHaveLength(488);
    for (const sample of [members, clean]) {
      expect(new Set(sample.map((row) => row.state.memory.activeDma))).toEqual(new Set([-1]));
      expect(new Set(sample.map((row) => row.state.gba.performingDma))).toEqual(new Set([0]));
      expect(new Set(sample.map((row) => row.state.gba.cpuBlocked))).toEqual(new Set([false]));
      expect(new Set(sample.map((row) => row.state.interrupt.if))).toEqual(new Set([0]));
      expect(new Set(sample.map((row) => row.state.memory.prefetchEnabled))).toEqual(new Set([true]));
    }
    const memberDistances = new Set(members.map((row) => row.state.cpu.nextEvent - row.state.cpu.cycles));
    const cleanDistances = new Set(clean.map((row) => row.state.cpu.nextEvent - row.state.cpu.cycles));
    expect([...memberDistances].some((distance) => cleanDistances.has(distance))).toBe(true);
  });
});
