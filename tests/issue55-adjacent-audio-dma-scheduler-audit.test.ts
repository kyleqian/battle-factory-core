import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Row = {
  case: string;
  component: string;
  ordinal: number;
  observedEdgeCycles: number;
  preInstructionDueRootsByDeadlineThenPriority: string[];
  timer0: { priority: number; whenDelta: number };
  audioSample: { priority: number; whenDelta: number; deadlineMinusTimer0: number };
  pairedFifoDmaBoundary: {
    fifoWordLevels: number[];
    fifoWordLevelsAfter: number[];
    internalRemaining: number[];
    internalRemainingAfter: number[];
    dmaNextCountsBefore: number[];
    dmaNextCountsAfter: number[];
  };
};
type RuntimeWindow = {
  kind: string;
  timer0OnTime: boolean;
  exactCoDueCallbacksBeforeTimer0: Array<{ name: string; priority: number }>;
  audioDueBeforeTimer0: boolean;
  freshDualEntry: { fifoWordLevels: number[]; internalRemaining: number[]; dmaNextCounts: number[]; activeDma: number; cpuBlocked: boolean };
  requestOrder: Array<{ fifo: string; dmaChannel: number }>;
  dmaActiveOrder: number[];
  completionOrder: number[];
  completionAfterTimerEntryCycles: number;
};
type CompactHardwareBoundary = {
  fifoWordLevels: number[];
  internalRemaining: number[];
  dmaNextCounts: number[];
  activeDma: number;
  performingDma: number;
  cpuBlocked: boolean;
};
type SelectedLilianaRuntimeReceipt = {
  selection: {
    case: string;
    component: string;
    ordinal: number;
    sourceFunction: string;
    deadlineOrder: string[];
    audioTimerDeadlineDelta: number;
  };
  observedCallbackGraph: {
    prefix: Array<{ name: string; priority: number; cyclesLate: number; activeDma?: number; cpuBlocked?: boolean }>;
    remainingDmaCallbacks: Array<{ cyclesLate: number; activeDma: number }>;
    requestOrder: Array<{ fifo: string; dmaChannel: number }>;
    completionOrder: number[];
    wrappersRestoredAfterSequence: number;
  };
  hardwareBoundary: {
    audioAtTimerEntry: { enabled: boolean; mixer: { present: boolean; externalMixing: boolean } };
    timer0Entry: CompactHardwareBoundary;
    timer0Exit: CompactHardwareBoundary;
    audioEntry: CompactHardwareBoundary;
    afterCompletion: CompactHardwareBoundary;
  };
  applicabilityBoundary: string;
};
type Receipt = {
  schema: string;
  release: { sha256: string; oracleProfile: string };
  source: { files: Array<{ path: string; sha256: string }>; anchors: Array<{ id: string }> };
  inputReceipts: Array<{ path: string; sha256: string }>;
  dPlusOneSourceMechanics: {
    eventPriorities: Record<string, number>;
    rootOrdering: string;
    correctedDeadlines: Record<string, string>;
    immediateQueueRule: string;
    dmaArbitration: {
      selection: string;
      firstEventCorrection: string;
      cpuBlocking: string;
      perWord: string;
      overdueCoalescing: string;
      completion: string;
      pinnedIwrToIoFourWordDeadlineWork: {
        wordServiceMasterCycles: number[];
        terminalCompletionMasterCycles: number;
        perChannelScheduledDeadlineWork: number;
        twoChannelWorkSum: number;
      };
    };
    narrowZeroLateDPlusOneTransition: string;
    audioInterleavingBoundary: string;
  };
  committedAdjacentRows: Row[];
  priorRuntimeReceipt: { windows: RuntimeWindow[]; applicabilityBoundary: string };
  selectedLilianaRuntimeReceipt: SelectedLilianaRuntimeReceipt;
  remainingFactoryVariedRuntimeRows: {
    rows: Array<{ case: string; component: string; ordinal: number; preInstructionDueRootsByDeadlineThenPriority: string[] }>;
    observationStillNeeded: string;
  };
  explicitBoundary: string[];
};

const PATH = "tests/fixtures/issue55-adjacent-audio-dma-scheduler-audit-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8")) as Receipt;

describe("Issue #55 adjacent Audio Sample / DMA scheduler source audit", () => {
  it("pins canonical archive provenance and all committed input receipts", () => {
    expect(bytes.toString("utf8")).toBe(JSON.stringify(receipt, null, 2) + "\n");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("e95efec65846359cff0435843ec2061dcb7bc75fc4eb28d789ac056abd437ff3");
    expect(receipt.schema).toBe("issue55-adjacent-audio-dma-scheduler-audit/v1");
    expect(receipt.release).toEqual({
      url: "https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz",
      sha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
      archiveRoot: "mgba-0.10.5",
      oracleProfile: "battle-scene-off",
    });
    expect(receipt.source.files).toHaveLength(7);
    expect(receipt.source.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
    expect(receipt.source.anchors.map((anchor) => anchor.id)).toEqual(expect.arrayContaining([
      "timing-insert", "timer0-callback", "audio-fifo-request", "dma-per-word-service", "cpu-blocked-event-loop",
    ]));
    expect(receipt.inputReceipts.map((input) => input.path)).toEqual([
      "tests/fixtures/factory-construction-timer0-fifo-v1/liliana.json",
      "tests/fixtures/factory-construction-timer0-fifo-v1/factory-varied.json",
      "tests/fixtures/factory-timer0-scheduler-runtime-v1.json",
      "tests/fixtures/factory-timer0-selected-adjacent-runtime-v1.json",
    ]);
    expect(receipt.inputReceipts.at(-1)).toEqual({
      path: "tests/fixtures/factory-timer0-selected-adjacent-runtime-v1.json",
      sha256: "a0cdb0c1952b77580bfe1e3dd4834af98c40d579484931a3bd657061f117e5fc",
    });
  });

  it("keeps adjacent D/D+1 source-row facts separate from the LILIANA callback trace", () => {
    expect(receipt.committedAdjacentRows.map((row) => [row.case, row.component, row.ordinal])).toEqual([
      ["liliana", "encrypted-accessor", 23],
      ["factory-varied", "get-nature", 12],
      ["factory-varied", "nature-attempt", 63],
    ]);
    expect(receipt.committedAdjacentRows.map((row) => [row.timer0.whenDelta, row.audioSample.whenDelta])).toEqual([
      [-1, 0], [-5, -4], [-6, -5],
    ]);
    expect(receipt.committedAdjacentRows.every((row) => row.audioSample.deadlineMinusTimer0 === 1)).toBe(true);
    expect(receipt.committedAdjacentRows.map((row) => row.preInstructionDueRootsByDeadlineThenPriority)).toEqual([
      ["GBA Timer 0", "GBA Audio Sample"],
      ["GBA Timer 0", "GBA Audio Sample"],
      ["GBA Video", "GBA Timer 0", "GBA Audio Sample"],
    ]);
    for (const row of receipt.committedAdjacentRows) {
      expect(row.observedEdgeCycles).toBe(20);
      expect(row.pairedFifoDmaBoundary).toEqual({
        fifoWordLevels: [3, 3],
        fifoWordLevelsAfter: [7, 7],
        internalRemaining: [3, 3],
        internalRemainingAfter: [2, 2],
        dmaNextCountsBefore: [0, 0],
        dmaNextCountsAfter: [0, 0],
      });
    }
    expect(receipt.explicitBoundary.join(" ")).toContain("aggregate instruction-edge endpoints");
    expect(receipt.explicitBoundary.join(" ")).toContain("not transferred to either factory-varied row");
  });

  it("pins deadline-first scheduling, corrected FIFO requests, CPU blocking, and per-word DMA mechanics", () => {
    const mechanics = receipt.dPlusOneSourceMechanics;
    expect(mechanics.eventPriorities).toEqual({
      "GBA Audio Sample": 24,
      "GBA Timer 0": 32,
      "GBA DMA": 64,
    });
    expect(mechanics.rootOrdering).toContain("absolute deadlines first");
    expect(mechanics.correctedDeadlines.timer0).toContain("D + 1254");
    expect(mechanics.correctedDeadlines.fifoDma).toContain("dma.when");
    expect(mechanics.correctedDeadlines.audioSample).toContain("D + 1025");
    expect(mechanics.immediateQueueRule).toContain("before Audio Sample by deadline");
    expect(mechanics.dmaArbitration.selection).toContain("DMA1");
    expect(mechanics.dmaArbitration.firstEventCorrection).toContain("mTimingCurrentTime");
    expect(mechanics.dmaArbitration.cpuBlocking).toContain("cpuBlocked");
    expect(mechanics.dmaArbitration.perWord).toContain("waitstates");
    expect(mechanics.dmaArbitration.overdueCoalescing).toContain("moved forward");
    expect(mechanics.dmaArbitration.completion).toContain("nextCount");
    expect(mechanics.dmaArbitration.pinnedIwrToIoFourWordDeadlineWork).toEqual({
      wordServiceMasterCycles: [2, 2, 2, 2],
      terminalCompletionMasterCycles: 2,
      perChannelScheduledDeadlineWork: 10,
      twoChannelWorkSum: 20,
    });
    expect(mechanics.narrowZeroLateDPlusOneTransition).toContain("not a LILIANA execution trace");
    expect(mechanics.audioInterleavingBoundary).toContain("does not");
  });

  it("uses the isolated/Video receipt narrowly", () => {
    expect(receipt.priorRuntimeReceipt.windows.map((window) => window.kind)).toEqual([
      "isolated-dual-refill",
      "video-co-due-dual-refill",
    ]);
    for (const window of receipt.priorRuntimeReceipt.windows) {
      expect(window.timer0OnTime).toBe(true);
      expect(window.audioDueBeforeTimer0).toBe(false);
      expect(window.freshDualEntry).toEqual({
        fifoWordLevels: [3, 3],
        internalRemaining: [3, 3],
        dmaNextCounts: [0, 0],
        activeDma: -1,
        cpuBlocked: false,
      });
      expect(window.requestOrder).toEqual([{ fifo: "a", dmaChannel: 1 }, { fifo: "b", dmaChannel: 2 }]);
      expect(window.dmaActiveOrder).toEqual([1, 1, 1, 1, 2, 1, 2, 2, 2, 2]);
      expect(window.completionOrder).toEqual([1, 2]);
      expect(window.completionAfterTimerEntryCycles).toBe(18);
    }
    expect(receipt.priorRuntimeReceipt.windows[1]!.exactCoDueCallbacksBeforeTimer0).toEqual([{ name: "GBA Video", priority: 8 }]);
    expect(receipt.priorRuntimeReceipt.applicabilityBoundary).toContain("do not supply a LILIANA");
  });

  it("mechanically carries the selected LILIANA late-Timer/DMA1/Audio graph without pricing it", () => {
    const selected = receipt.selectedLilianaRuntimeReceipt;
    expect(selected.selection).toEqual({
      case: "liliana",
      component: "encrypted-accessor",
      ordinal: 23,
      sourceFunction: "FillFactoryFrontierTrainerParty",
      deadlineOrder: ["GBA Timer 0", "GBA Audio Sample"],
      audioTimerDeadlineDelta: 1,
    });
    expect(selected.observedCallbackGraph.prefix).toEqual([
      { name: "GBA Timer 0", priority: 32, cyclesLate: 1 },
      { name: "GBA DMA", priority: 64, cyclesLate: 1, activeDma: 1 },
      { name: "GBA Audio Sample", priority: 24, cyclesLate: 0, activeDma: 1, cpuBlocked: true },
    ]);
    expect(selected.observedCallbackGraph.remainingDmaCallbacks).toEqual([
      { cyclesLate: 0, activeDma: 1 },
      { cyclesLate: 0, activeDma: 1 },
      { cyclesLate: 0, activeDma: 1 },
      { cyclesLate: 0, activeDma: 2 },
      { cyclesLate: 0, activeDma: 1 },
      { cyclesLate: 0, activeDma: 2 },
      { cyclesLate: 0, activeDma: 2 },
      { cyclesLate: 0, activeDma: 2 },
      { cyclesLate: 0, activeDma: 2 },
    ]);
    expect(selected.observedCallbackGraph.requestOrder).toEqual([{ fifo: "a", dmaChannel: 1 }, { fifo: "b", dmaChannel: 2 }]);
    expect(selected.observedCallbackGraph.completionOrder).toEqual([1, 2]);
    expect(selected.observedCallbackGraph.wrappersRestoredAfterSequence).toBe(11);
    expect(selected.hardwareBoundary).toEqual({
      audioAtTimerEntry: { enabled: true, mixer: { present: false, externalMixing: false } },
      timer0Entry: { fifoWordLevels: [3, 3], internalRemaining: [3, 3], dmaNextCounts: [0, 0, 0, 0], activeDma: -1, performingDma: 0, cpuBlocked: false },
      timer0Exit: { fifoWordLevels: [3, 3], internalRemaining: [2, 2], dmaNextCounts: [0, 4, 4, 0], activeDma: 1, performingDma: 0, cpuBlocked: false },
      audioEntry: { fifoWordLevels: [4, 3], internalRemaining: [2, 2], dmaNextCounts: [0, 3, 4, 0], activeDma: 1, performingDma: 0, cpuBlocked: true },
      afterCompletion: { fifoWordLevels: [7, 7], internalRemaining: [2, 2], dmaNextCounts: [0, 0, 0, 0], activeDma: -1, performingDma: 0, cpuBlocked: false },
    });
    expect(selected.applicabilityBoundary).toContain("no callback price");
    expect(JSON.stringify(selected)).not.toMatch(/schedulerCurrentTime|scheduledWhen|serviceCostMasterCycles|runFactoryConstructionClock/);
  });

  it("names only the two legal factory-varied rows as remaining and does not transplant LILIANA order", () => {
    expect(receipt.remainingFactoryVariedRuntimeRows.rows).toEqual([
      {
        case: "factory-varied",
        component: "get-nature",
        ordinal: 12,
        preInstructionDueRootsByDeadlineThenPriority: ["GBA Timer 0", "GBA Audio Sample"],
      },
      {
        case: "factory-varied",
        component: "nature-attempt",
        ordinal: 63,
        preInstructionDueRootsByDeadlineThenPriority: ["GBA Video", "GBA Timer 0", "GBA Audio Sample"],
      },
    ]);
    expect(receipt.remainingFactoryVariedRuntimeRows.observationStillNeeded).toContain("not transferred");
    expect(receipt.remainingFactoryVariedRuntimeRows.observationStillNeeded).toContain("Video-co-due");
  });

  it("contains no absolute selected-row timing or production lookup surface", () => {
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toMatch(/scheduledWhen|masterCycles|globalCycles/);
    expect(serialized).not.toMatch(/0x[0-9a-f]{8}/i);
    expect(receipt.explicitBoundary.join(" ")).toContain("no production import");
  });

  it("rejects stale archived source before it can write a receipt", () => {
    const directory = mkdtempSync(join(tmpdir(), "issue55-adjacent-audio-dma-stale-"));
    const coreDirectory = join(directory, "src", "core");
    mkdirSync(coreDirectory, { recursive: true });
    writeFileSync(join(coreDirectory, "timing.c"), "// deliberately stale source\n");
    const output = join(directory, "receipt.json");
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/extract/extract-issue55-adjacent-audio-dma-scheduler-audit.ts"),
      "--source", directory,
      "--out", output,
    ], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("stale source file: src/core/timing.c");
    expect(result.stdout).toBe("");
  });
});
