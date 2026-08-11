import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Receipt = {
  schema: string;
  runtime: {
    oracleProfile: string;
    binding: string;
    library: string;
    version: string;
    gitRevision: string | null;
  };
  release: { url: string; sha256: string };
  source: {
    version: string;
    files: Array<{ path: string; sha256: string }>;
    anchors: Array<{ id: string; file: string; lines: string }>;
  };
  scheduler: {
    eventPriorityOrder: string[];
    eventPriorities: Record<string, number>;
    dueRule: string;
    insertRule: string;
    equalTimeRule: string;
    callbackCostRule: string;
    sameDueDispatchRule: string;
  };
  video: {
    hdrawMasterCycles: number;
    hblankMasterCycles: number;
    scanlineMasterCycles: number;
    frameMasterCycles: number;
  };
  audioSample: {
    arm7Frequency: number;
    sampleIntervalFormula: string;
    sampleIntervalMasterCycles: number;
    directSoundRelation: string;
  };
  timer0: {
    reload: number;
    periodMasterCycles: number;
    callbackOrder: string[];
    coDueOrderWithDefaultEvents: string[];
  };
  directSoundDma: {
    fifoDmaStartDelayMasterCycles: number;
    activeSelection: string;
    sameDueDmaOrder: string;
    freshIwrToIoFourWordRefill: {
      sourceRegion: number;
      destinationRegion: number;
      nonSequentialWaitstates: { source: number; destination: number };
      sequentialWaitstates: { source: number; destination: number };
      wordServiceMasterCycles: number[];
      terminalCompletionMasterCycles: number;
      totalScheduledMasterCycles: number;
    };
    dualFreshRefills: {
      scheduledMasterCycles: number;
      notTimer0CallbackCost: boolean;
    };
  };
  reductionBoundary: {
    directSoundFifoProgressionCanReduceIndependently: boolean;
    requires: string[];
    mustRemainExternal: string[];
    negativeBoundary: string;
    nextObservable: string;
  };
};

const PATH = "tests/fixtures/mgba-timer0-scheduler-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8")) as Receipt;

describe("Issue #55 mGBA 0.10.5 Timer 0 co-due scheduler receipt", () => {
  it("keeps the pinned release, runtime, source hashes, and anchors explicit", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "a818b9d5380b373a5f5091e99fbc417a07858bec3ce9cc2a96c9f92cace22f00",
    );
    expect(receipt.schema).toBe("mgba-timer0-scheduler/v1");
    expect(receipt.runtime).toEqual({
      oracleProfile: "battle-scene-off",
      binding: "vendored libmgba-py CFFI",
      library: "libmgba.0.10.5.dylib",
      version: "0.10.5",
      gitRevision: null,
    });
    expect(receipt.release).toEqual({
      homebrewFormula: "homebrew/core/Formula/m/mgba.rb",
      url: "https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz",
      sha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
    });
    expect(receipt.source.version).toBe("0.10.5");
    expect(receipt.source.files).toHaveLength(12);
    expect(receipt.source.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
    expect(receipt.source.anchors).toHaveLength(21);
    expect(receipt.source.anchors.find((anchor) => anchor.id === "timing-insert")).toEqual({
      id: "timing-insert",
      file: "src/core/timing.c",
      lines: "36-59",
    });
  });

  it("pins priority ordering, equal-time insertion, and callback scheduling", () => {
    expect(receipt.scheduler.eventPriorityOrder).toEqual([
      "GBA IRQ Event",
      "GBA Video",
      "GBA Audio Sample",
      "GBA Timer 0",
      "GBA DMA",
    ]);
    expect(receipt.scheduler.eventPriorities).toEqual({
      "GBA IRQ Event": 0,
      "GBA Video": 8,
      "GBA Audio Sample": 24,
      "GBA Timer 0": 32,
      "GBA DMA": 64,
    });
    expect(receipt.scheduler.dueRule).toContain("<= 0");
    expect(receipt.scheduler.insertRule).toContain("numerically greater");
    expect(receipt.scheduler.equalTimeRule).toContain("insertion order");
    expect(receipt.scheduler.callbackCostRule).toContain("callbacks do not receive an automatic emulated-cycle charge");
    expect(receipt.scheduler.sameDueDispatchRule).toContain("same mTimingTick due loop");
  });

  it("derives the independent video/audio/timer cadence arithmetic", () => {
    expect(receipt.video.hdrawMasterCycles + receipt.video.hblankMasterCycles).toBe(
      receipt.video.scanlineMasterCycles,
    );
    expect(receipt.video.scanlineMasterCycles * 228).toBe(receipt.video.frameMasterCycles);
    expect(receipt.audioSample.sampleIntervalFormula).toBe("GBA_ARM7TDMI_FREQUENCY / 0x4000");
    expect(receipt.audioSample.arm7Frequency / 0x4000).toBe(
      receipt.audioSample.sampleIntervalMasterCycles,
    );
    expect(receipt.timer0.periodMasterCycles).toBe(0x10000 - receipt.timer0.reload);
    expect(receipt.timer0.callbackOrder).toEqual([
      "reschedule normal timer from currentTime minus cyclesLate",
      "raise timer IRQ only if its IRQ flag is set",
      "sample routed FIFO A",
      "sample routed FIFO B",
      "cascade an enabled count-up successor",
    ]);
  });

  it("closes only fresh FIFO DMA progression, never a Timer 0 callback price", () => {
    const refill = receipt.directSoundDma.freshIwrToIoFourWordRefill;
    const first = 2 + refill.nonSequentialWaitstates.source + refill.nonSequentialWaitstates.destination;
    const later = 2 + refill.sequentialWaitstates.source + refill.sequentialWaitstates.destination;
    expect(refill.sourceRegion).toBe(3);
    expect(refill.destinationRegion).toBe(4);
    expect(refill.wordServiceMasterCycles).toEqual([first, later, later, later]);
    expect(refill.terminalCompletionMasterCycles).toBe(2);
    expect(refill.totalScheduledMasterCycles).toBe(first + later * 3 + 2);
    expect(refill.totalScheduledMasterCycles).toBe(10);
    expect(receipt.directSoundDma.fifoDmaStartDelayMasterCycles).toBe(0);
    expect(receipt.directSoundDma.dualFreshRefills).toEqual({
      formula: "10 + 10",
      scheduledMasterCycles: 20,
      notTimer0CallbackCost: true,
    });
    expect(receipt.directSoundDma.activeSelection).toContain("strictly earlier");
    expect(receipt.directSoundDma.sameDueDmaOrder).toContain("DMA1 wins");
  });

  it("banks the exact negative boundary and next observable", () => {
    const boundary = receipt.reductionBoundary;
    expect(boundary.directSoundFifoProgressionCanReduceIndependently).toBe(true);
    expect(boundary.requires).toHaveLength(5);
    expect(boundary.mustRemainExternal).toHaveLength(4);
    expect(boundary.negativeBoundary).toContain("No source-closed");
    expect(boundary.negativeBoundary).toContain("Do not wire a fixed callback cost");
    expect(boundary.nextObservable).toContain("FIFO A/B pointers");
    expect(boundary.nextObservable).toContain("cyclesLate");
    expect(receipt.audioSample.directSoundRelation).toContain("does not call GBAAudioSampleFIFO");
    expect(receipt.timer0.coDueOrderWithDefaultEvents).toEqual([
      "GBA IRQ Event if already due (priority 0)",
      "GBA Video (priority 8)",
      "GBA Audio Sample (priority 24)",
      "GBA Timer 0 (priority 32)",
      "GBA DMA (priority 64)",
    ]);
  });
});
