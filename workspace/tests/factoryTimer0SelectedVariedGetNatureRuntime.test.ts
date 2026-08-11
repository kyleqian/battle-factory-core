import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PATH = "tests/fixtures/factory-timer0-selected-adjacent-runtime-varied-get-nature-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8"));

describe("Issue #55 selected legal-varied get-nature adjacent runtime receipt", () => {
  it("pins the byte-identical twice-fresh Battle Scene OFF packet", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "21ea415896100b66283f94b4eb5dc7cbc59c40d06b5e4495040b24a1a7910040",
    );
    expect(receipt).toMatchObject({
      schema: "factory-timer0-selected-adjacent-runtime/v1",
      case: "factory-varied",
      oracleProfile: "battle-scene-off",
      sourceFunction: "FillFactoryFrontierTrainerParty",
      selection: {
        component: "get-nature",
        ordinal: 12,
        returnClass: "0x0806d072->0x08068f02",
        edge: "0x082e7bf2->0x082e7bf4",
        instructionOccurrence: 4,
        deadlineOrder: ["GBA Timer 0", "GBA Audio Sample"],
        audioTimerDeadlineDelta: 1,
      },
    });
  });

  it("installs while both roots are future, then retains exact late deadlines and callbacks", () => {
    const relevant = receipt.runtime.installState.queue.filter((event: any) => (
      event.name === "GBA Timer 0" || event.name === "GBA Audio Sample"
    ));
    expect(relevant.map((event: any) => [event.name, event.deadlineDelta, event.due])).toEqual([
      ["GBA Timer 0", 305, false],
      ["GBA Audio Sample", 306, false],
    ]);

    const timeline = receipt.runtime.timeline;
    expect(timeline.map((event: any) => event.name)).toEqual([
      "GBA Timer 0", "GBA DMA", "GBA Audio Sample",
      "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA",
      "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA",
    ]);
    expect(timeline.map((event: any) => [
      event.scheduledWhen, event.cyclesLate, event.schedulerCurrentTime,
    ])).toEqual([
      [2236249087, 5, 2236249092],
      [2236249087, 5, 2236249092],
      [2236249088, 4, 2236249092],
      [2236249094, 0, 2236249094],
      [2236249096, 0, 2236249096],
      [2236249098, 0, 2236249098],
      [2236249100, 0, 2236249100],
      [2236249102, 0, 2236249102],
      [2236249102, 0, 2236249102],
      [2236249104, 0, 2236249104],
      [2236249106, 0, 2236249106],
      [2236249110, 0, 2236249110],
    ]);
    expect(receipt.runtime.deadlineOrder).toEqual(["GBA Timer 0", "GBA Audio Sample"]);
    expect(receipt.runtime.audioTimerDeadlineDelta).toBe(1);
    expect(receipt.runtime.wrappersRestoredAfterSequence).toBe(11);
  });

  it("pins DMA request, arbitration, completion, and 18-cycle live graph", () => {
    const timeline = receipt.runtime.timeline;
    expect(receipt.runtime.requestOrder).toEqual([
      { fifo: "a", dmaChannel: 1 },
      { fifo: "b", dmaChannel: 2 },
    ]);
    expect(receipt.runtime.completionOrder).toEqual([1, 2]);
    expect(timeline.filter((event: any) => event.name === "GBA DMA")
      .map((event: any) => event.entry.activeDma)).toEqual([
      1, 1, 1, 1, 2, 1, 2, 2, 2, 2,
    ]);
    expect(timeline.at(-1).schedulerCurrentTime - timeline[0].schedulerCurrentTime).toBe(18);
    expect(timeline.at(-1).exit).toEqual({
      dmaNextCounts: [0, 0, 0, 0], activeDma: -1,
      performingDma: 0, cpuBlocked: false,
    });
  });

  it("pins full Timer/Audio/completion boundary hardware", () => {
    const states = receipt.runtime.hardwareStates;
    expect(states.timer0Entry).toMatchObject({
      scheduler: { currentTime: 2236249092 },
      audio: { enabled: true, mixer: { present: false, externalMixing: false } },
      fifo: {
        a: { fifoWordLevel: 3, internalRemaining: 3, dmaSource: 1 },
        b: { fifoWordLevel: 3, internalRemaining: 3, dmaSource: 2 },
      },
      activeDma: -1, performingDma: 0, cpuBlocked: false,
    });
    expect(states.timer0Entry.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
    expect(states.timer0Exit.dma.map((dma: any) => dma.nextCount)).toEqual([0, 4, 4, 0]);
    expect(states.audioEntry).toMatchObject({
      scheduler: { currentTime: 2236249092 },
      activeDma: 1, performingDma: 0, cpuBlocked: true,
    });
    expect(states.audioEntry.dma.map((dma: any) => dma.nextCount)).toEqual([0, 3, 4, 0]);
    expect(states.afterCompletion).toMatchObject({
      scheduler: { currentTime: 2236249110 },
      activeDma: -1, performingDma: 0, cpuBlocked: false,
    });
    expect(states.afterCompletion.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
  });

  it("records evidence only and exposes no construction-clock price", () => {
    expect(JSON.stringify(receipt)).not.toMatch(/serviceCostMasterCycles|runFactoryConstructionClock/);
  });
});
