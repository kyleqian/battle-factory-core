import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type QueueEvent = {
  name: string;
  priority: number;
  due: boolean;
  whenDelta: number;
};

type Crossing = {
  label: "member" | "control";
  component: string;
  ordinal: number;
  returnClass: string;
  instructionPc: string;
  nextInstructionPc: string;
  observedEdgeCycles: number;
  cleanMinimumEdgeCycles: number | null;
  residualDeltaClass: number | null;
  fifoTransition: string;
  fifoRefillObserved: boolean;
  fifoWriteChanged: string[];
  fifoReadChanged: string[];
  fifoRemainingChanged: string[];
  dmaChannelsChanged: number[];
  crossedEventNames: string[];
  coDueEventNames: string[];
  before: HardwareState;
  after: HardwareState;
};

type HardwareState = {
  deepStateAvailable: boolean;
  cpu: {
    nextEventDistance: number;
    prefetchEnabled: boolean;
    performingDma: number;
    cpuBlocked: boolean;
    activeDma: number;
  };
  timer0: {
    tm0cntL: number;
    tm0cntH: number;
    reload: number;
    flags: number;
    eventWhenDelta: number;
    eventDue: boolean;
  };
  fifo: {
    a: FifoState;
    b: FifoState;
  };
  dma: DmaState[];
  queue: QueueEvent[];
};

type FifoState = {
  fifoWrite: number;
  fifoRead: number;
  fifoWordLevel: number;
  internalRemaining: number;
  dmaSource: number;
};

type DmaState = {
  channel: number;
  control: number;
  enabled: boolean;
  repeat: boolean;
  width: number;
  timing: number;
  destControl: number;
  sourceControl: number;
  internalCount: number;
  internalNextCount: number;
  internalWhenDelta: number | null;
  destinationKind: string;
};

type Baseline = {
  component: string;
  returnClass: string;
  instructionPc: string;
  nextInstructionPc: string;
  cleanMinimumEdgeCycles: number;
  sampleCount: number;
};

type Receipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  crossingCount: number;
  selectedTraceCount: number;
  memberTraceCount: number;
  cleanControlTraceCount: number;
  cleanEdgeBaselines: Baseline[];
  crossings: Crossing[];
};

const ROOT = "tests/fixtures/factory-construction-timer0-fifo-v1";
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const EXPECTED = {
  anchor: {
    sha256: "fec13d6140e667f4389eb29e1a659dc0c807f3b3393b2ce9bf85953a01c31c01",
    crossings: 126,
    traces: [270, 41, 229],
  },
  liliana: {
    sha256: "aa21be0d7b6379a4a0ca0caaca8297dc0f27a9c789f8184b3e61c3bc5e464aff",
    crossings: 57,
    traces: [127, 19, 108],
  },
  "factory-varied": {
    sha256: "0228b67250968d4a02f71bc1ad7670642918be9a6d25e8a166c6aa96a90666cf",
    crossings: 73,
    traces: [176, 25, 151],
  },
} as const;

function readReceipt(name: typeof CASES[number]): { bytes: Buffer; value: Receipt } {
  const bytes = readFileSync(`${ROOT}/${name}.json`);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) as Receipt };
}

function baselineKey(row: Pick<Crossing, "component" | "returnClass" | "instructionPc" | "nextInstructionPc">): string {
  return `${row.component}|${row.returnClass}|${row.instructionPc}|${row.nextInstructionPc}`;
}

describe("Issue #55 Timer 0 conditional FIFO refill receipt", () => {
  const packets = CASES.map((name) => ({ name, ...readReceipt(name) }));

  it("keeps fresh wrapper-mediated OFF packets canonical and compact", () => {
    for (const { name, bytes, value } of packets) {
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(EXPECTED[name].sha256);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(value, null, 2)}\n`);
      expect(value.schema).toBe("factory-construction-timer0-fifo-crossings/v1");
      expect(value.oracleProfile).toBe("battle-scene-off");
      expect(value.crossingCount).toBe(EXPECTED[name].crossings);
      expect(value.crossings).toHaveLength(EXPECTED[name].crossings);
      expect([value.selectedTraceCount, value.memberTraceCount, value.cleanControlTraceCount])
        .toEqual(EXPECTED[name].traces);
      const serialized = bytes.toString("utf8");
      expect(serialized).not.toMatch(/masterCycles|globalCycles|cpuCycles|when"\s*:/);
    }
  });

  it("retains a complete Timer 0/FIFO/DMA/queue edge pair for every crossing", () => {
    for (const { value } of packets) {
      expect(value.crossings.every((row) => (
        row.crossedEventNames.includes("GBA Timer 0")
        && row.before.deepStateAvailable
        && row.after.deepStateAvailable
        && row.before.timer0.tm0cntL === 0xfb1a
        && row.before.timer0.tm0cntH === 0x0080
        && row.after.timer0.tm0cntL === 0xfb1a
        && row.after.timer0.tm0cntH === 0x0080
        && row.before.timer0.reload === 0xfb1a
        && row.after.timer0.reload === 0xfb1a
        && row.before.timer0.eventDue
        && !row.after.timer0.eventDue
        && row.before.queue.some((event) => event.name === "GBA Timer 0" && event.due)
        && row.after.queue.some((event) => event.name === "GBA Timer 0" && !event.due)
        && row.dmaChannelsChanged.join(",") === "1,2"
        && row.before.dma.every((dma) => (
          dma.control === 0xb640
          && dma.enabled
          && dma.repeat
          && dma.width === 32
          && dma.timing === 3
          && dma.destControl === 2
          && dma.sourceControl === 0
        ))
        && row.after.dma.every((dma) => (
          dma.control === 0xb640
          && dma.enabled
          && dma.repeat
          && dma.width === 32
          && dma.timing === 3
          && dma.destControl === 2
          && dma.sourceControl === 0
        ))
        && row.before.dma.map((dma) => dma.destinationKind).join(",") === "fifo-a,fifo-b"
        && row.after.dma.map((dma) => dma.destinationKind).join(",") === "fifo-a,fifo-b"
      ))).toBe(true);
    }
  });

  it("correlates all 85 member refills with FIFO threshold state and DMA channels", () => {
    const refillMembers = packets.flatMap(({ value }) => value.crossings.filter((row) => (
      row.label === "member" && row.fifoRefillObserved
    )));
    expect(refillMembers).toHaveLength(85);
    expect(refillMembers.every((row) => (
      row.fifoTransition === "fifo-write-pointer-changed"
      && row.fifoWriteChanged.join(",") === "a,b"
      && row.fifoReadChanged.length === 0
      && row.before.fifo.a.internalRemaining === 3
      && row.before.fifo.b.internalRemaining === 3
      && row.after.fifo.a.internalRemaining === 2
      && row.after.fifo.b.internalRemaining === 2
      && row.before.fifo.a.dmaSource === 1
      && row.before.fifo.b.dmaSource === 2
      && row.after.fifo.a.dmaSource === 1
      && row.after.fifo.b.dmaSource === 2
    ))).toBe(true);

    const edgeClasses = refillMembers.reduce<Record<string, number>>((counts, row) => {
      const key = String(row.observedEdgeCycles);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
    expect(edgeClasses).toEqual({ "20": 75, "24": 2, "26": 7, "29": 1 });

    const coDueClasses = refillMembers.reduce<Record<string, number>>((counts, row) => {
      const key = row.coDueEventNames.join("+") || "none";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
    expect(coDueClasses).toEqual({
      none: 66,
      "GBA Video": 16,
      "GBA Audio Sample": 2,
      "GBA Video+GBA Audio Sample": 1,
    });
  });

  it("pins the three naturally observed Audio-co-due runtime candidates by canonical census row", () => {
    const audioRows = packets.flatMap(({ name, value }) => value.crossings
      .filter((row) => row.label === "member" && row.fifoRefillObserved
        && row.coDueEventNames.includes("GBA Audio Sample"))
      .map((row) => ({ case: name, component: row.component, ordinal: row.ordinal,
        returnClass: row.returnClass, edge: `${row.instructionPc}->${row.nextInstructionPc}`,
        coDue: row.coDueEventNames })));
    expect(audioRows).toEqual([
      { case: "liliana", component: "encrypted-accessor", ordinal: 23,
        returnClass: "0x0806a51a->0x08068db2", edge: "0x082e7c3e->0x082e7c40",
        coDue: ["GBA Audio Sample"] },
      { case: "factory-varied", component: "get-nature", ordinal: 12,
        returnClass: "0x0806d072->0x08068f02", edge: "0x082e7bf2->0x082e7bf4",
        coDue: ["GBA Audio Sample"] },
      { case: "factory-varied", component: "nature-attempt", ordinal: 63,
        returnClass: "0x0806d08a->0x0806f5ce", edge: "0x082e7c10->0x082e7c12",
        coDue: ["GBA Video", "GBA Audio Sample"] },
    ]);
  });

  it("keeps clean controls and closes the cross-epoch residual join without fitting 18", () => {
    const cleanEdges = new Map<string, number>();
    for (const { value } of packets) {
      for (const baseline of value.cleanEdgeBaselines) {
        const key = baselineKey(baseline);
        const previous = cleanEdges.get(key);
        if (previous === undefined || baseline.cleanMinimumEdgeCycles < previous) {
          cleanEdges.set(key, baseline.cleanMinimumEdgeCycles);
        }
      }
    }
    const refillMembers = packets.flatMap(({ value }) => value.crossings.filter((row) => (
      row.label === "member" && row.fifoRefillObserved
    )));
    const deltas = refillMembers.map((row) => {
      const clean = cleanEdges.get(baselineKey(row));
      return clean === undefined ? null : row.observedEdgeCycles - clean;
    });
    expect(deltas.filter((delta): delta is number => delta !== null)).toHaveLength(83);
    expect(new Set(deltas.filter((delta): delta is number => delta !== null))).toEqual(new Set([18]));
    expect(deltas.filter((delta) => delta === null)).toHaveLength(2);
    expect(refillMembers.filter((row) => row.residualDeltaClass === 18)).toHaveLength(77);
    expect(refillMembers.filter((row) => row.residualDeltaClass === null)).toHaveLength(8);

    const allCrossings = packets.flatMap(({ value }) => value.crossings);
    expect(allCrossings).toHaveLength(256);
    expect(allCrossings.filter((row) => row.fifoTransition === "dma-state-changed-without-fifo-write"))
      .toHaveLength(171);
    expect(allCrossings.filter((row) => row.fifoTransition === "fifo-write-pointer-changed"))
      .toHaveLength(85);
    expect(allCrossings.every((row) => row.before.cpu.prefetchEnabled && !row.before.cpu.cpuBlocked))
      .toBe(true);
  });
});
