import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type AuditReceipt = {
  schema: string;
  runtime: {
    oracleProfile: string;
    binding: string;
    library: string;
    version: string;
    gitRevision: string | null;
  };
  release: { url: string; sha256: string };
  timer0: {
    eventName: string;
    priority: number;
    overflowOrder: string[];
    emeraldDefault: { reload: number; reloadHex: string; control: number; periodMasterCycles: number; routes: string[] };
  };
  fifoRefill: {
    capacityWords: number;
    maxQueuedWordsThatCanRequest: number;
    requestWords: number;
    customDmaChannels: number[];
  };
  scheduler: { dmaEventName: string; dmaPriority: number };
  freshIwrToIoFourWordRefill: {
    baseCyclesPerWord: number;
    nonSequentialWaitstates: { source: number; destination: number };
    sequentialWaitstates: { source: number; destination: number };
    wordServiceMasterCycles: number[];
    terminalCompletionMasterCycles: number;
    totalScheduledMasterCycles: number;
  };
  conditional18MasterCycleEdge: {
    timerServiceCostMasterCycles: number | null;
    status: string;
    knownNonMatch: string;
    bothFreshRefillsScheduledMasterCycles: number;
    twoCycleControlMasterCycles: number;
    conditionalIncrementMasterCycles: number;
    formula: string;
    requiredBranch: string[];
    observedEdgeAttribution: string;
    stateStillRequired: string[];
  };
};

const PATH = "tests/fixtures/mgba-timer0-direct-sound-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8")) as AuditReceipt;

describe("Issue #55 mGBA 0.10.5 Timer 0 Direct Sound source receipt", () => {
  it("keeps the audited release and locally bound runtime explicit", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "6d6c78be9a0f3826b4572f6daba3f61732545774215305d796ae651dce4f5150",
    );
    expect(receipt.schema).toBe("mgba-timer0-direct-sound/v1");
    expect(receipt.runtime).toEqual({
      oracleProfile: "battle-scene-off",
      binding: "vendored libmgba-py CFFI",
      library: "libmgba.0.10.5.dylib",
      version: "0.10.5",
      gitRevision: null,
    });
    expect(receipt.release).toMatchObject({
      url: "https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz",
      sha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
    });
  });

  it("pins Timer 0 callback order, FIFO threshold, and queue priorities", () => {
    expect(receipt.timer0.eventName).toBe("GBA Timer 0");
    expect(receipt.timer0.priority).toBe(32);
    expect(receipt.timer0.overflowOrder).toEqual([
      "reschedule normal timer from currentTime minus cyclesLate",
      "raise timer IRQ only when its IRQ flag is set",
      "sample routed FIFO A",
      "sample routed FIFO B",
      "cascade an enabled count-up successor",
    ]);
    expect(receipt.timer0.emeraldDefault).toMatchObject({
      reload: 0xfb1a,
      reloadHex: "0xfb1a",
      control: 0x80,
      periodMasterCycles: 1_254,
    });
    expect(receipt.timer0.emeraldDefault.routes).toEqual([
      "FIFO A: Timer 0, right output, DMA1",
      "FIFO B: Timer 0, left output, DMA2",
    ]);
    expect(receipt.fifoRefill).toMatchObject({
      capacityWords: 8,
      maxQueuedWordsThatCanRequest: 3,
      requestWords: 4,
      customDmaChannels: [1, 2],
    });
    expect(receipt.scheduler).toMatchObject({ dmaEventName: "GBA DMA", dmaPriority: 64 });
  });

  it("closes only the fresh one-channel IWRAM-to-IO DMA arithmetic", () => {
    const refill = receipt.freshIwrToIoFourWordRefill;
    const firstWord = refill.baseCyclesPerWord
      + refill.nonSequentialWaitstates.source + refill.nonSequentialWaitstates.destination;
    const laterWord = refill.baseCyclesPerWord
      + refill.sequentialWaitstates.source + refill.sequentialWaitstates.destination;
    expect(refill.wordServiceMasterCycles).toEqual([firstWord, laterWord, laterWord, laterWord]);
    expect(refill.terminalCompletionMasterCycles).toBe(2);
    expect(refill.totalScheduledMasterCycles).toBe(
      firstWord + laterWord * 3 + refill.terminalCompletionMasterCycles,
    );
    expect(refill.totalScheduledMasterCycles).toBe(10);
  });

  it("closes the conditional dual-refill +18 difference without pricing Timer 0 unconditionally", () => {
    const edge = receipt.conditional18MasterCycleEdge;
    expect(edge.timerServiceCostMasterCycles).toBeNull();
    expect(edge.status).toBe("conditional-dual-refill-arithmetic-closed");
    expect(edge.bothFreshRefillsScheduledMasterCycles).toBe(
      receipt.freshIwrToIoFourWordRefill.totalScheduledMasterCycles * 2,
    );
    expect(edge.conditionalIncrementMasterCycles).toBe(
      edge.bothFreshRefillsScheduledMasterCycles - edge.twoCycleControlMasterCycles,
    );
    expect(edge.conditionalIncrementMasterCycles).toBe(18);
    expect(edge.formula).toBe("2 * 10 - 2");
    expect(edge.requiredBranch).toHaveLength(3);
    expect(edge.observedEdgeAttribution).toContain("open");
    expect(edge.knownNonMatch).toContain("10 scheduled master cycles");
    expect(edge.stateStillRequired).toHaveLength(5);
  });
});
