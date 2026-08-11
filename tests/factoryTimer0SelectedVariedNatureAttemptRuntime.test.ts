import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PATH = "tests/fixtures/factory-timer0-selected-adjacent-runtime-varied-nature-attempt-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8"));

describe("Issue #55 selected legal-varied nature-attempt Video/Audio runtime receipt", () => {
  it("pins the byte-identical twice-fresh Battle Scene OFF packet", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "d32aa8d8abe0f0bb507a84e41c921bec046d849802f549c4a1e7408f35f684a1",
    );
    expect(receipt).toMatchObject({
      schema: "factory-timer0-selected-adjacent-runtime/v1",
      case: "factory-varied",
      oracleProfile: "battle-scene-off",
      sourceFunction: "FillFactoryFrontierTrainerParty",
      selection: {
        component: "nature-attempt",
        ordinal: 63,
        returnClass: "0x0806d08a->0x0806f5ce",
        edge: "0x082e7c10->0x082e7c12",
        instructionOccurrence: 0,
        deadlineOrder: ["GBA Video", "GBA Timer 0", "GBA Audio Sample"],
        audioTimerDeadlineDelta: 1,
      },
    });
  });

  it("installs while all selected roots are future, then pins exact deadlines and callbacks", () => {
    const selected = new Set(["GBA Video", "GBA Timer 0", "GBA Audio Sample"]);
    const relevant = receipt.runtime.installState.queue.filter((event: any) => selected.has(event.name));
    expect(relevant.map((event: any) => [event.name, event.deadlineDelta, event.due])).toEqual([
      ["GBA Video", 232, false],
      ["GBA Timer 0", 232, false],
      ["GBA Audio Sample", 233, false],
    ]);

    const timeline = receipt.runtime.timeline;
    expect(timeline.map((event: any) => event.name)).toEqual([
      "GBA Video", "GBA Timer 0", "GBA DMA", "GBA Audio Sample",
      "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA",
      "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA",
    ]);
    expect(timeline.map((event: any) => [
      event.scheduledWhen, event.cyclesLate, event.schedulerCurrentTime,
    ])).toEqual([
      [2231112703, 6, 2231112709],
      [2231112703, 6, 2231112709],
      [2231112703, 6, 2231112709],
      [2231112704, 5, 2231112709],
      [2231112711, 0, 2231112711],
      [2231112713, 0, 2231112713],
      [2231112715, 0, 2231112715],
      [2231112717, 0, 2231112717],
      [2231112719, 0, 2231112719],
      [2231112719, 0, 2231112719],
      [2231112721, 0, 2231112721],
      [2231112723, 0, 2231112723],
      [2231112727, 0, 2231112727],
    ]);
    expect(receipt.runtime.deadlineOrder).toEqual([
      "GBA Video", "GBA Timer 0", "GBA Audio Sample",
    ]);
    expect(receipt.runtime.audioTimerDeadlineDelta).toBe(1);
    expect(receipt.runtime.wrappersRestoredAfterSequence).toBe(12);
  });

  it("pins Video as DMA-inert before Timer and the complete DMA graph", () => {
    const timeline = receipt.runtime.timeline;
    expect(timeline[0]).toMatchObject({ name: "GBA Video", priority: 8, cyclesLate: 6 });
    expect(timeline[0].entry).toEqual(timeline[0].exit);
    expect(timeline[0].exit.dmaNextCounts).toEqual([0, 0, 0, 0]);
    expect(receipt.runtime.requestOrder).toEqual([
      { fifo: "a", dmaChannel: 1 },
      { fifo: "b", dmaChannel: 2 },
    ]);
    expect(receipt.runtime.completionOrder).toEqual([1, 2]);
    expect(timeline.filter((event: any) => event.name === "GBA DMA")
      .map((event: any) => event.entry.activeDma)).toEqual([
      1, 1, 1, 1, 2, 1, 2, 2, 2, 2,
    ]);
    expect(timeline.at(-1).schedulerCurrentTime - timeline[1].schedulerCurrentTime).toBe(18);
  });

  it("pins full Video/Timer/Audio/completion boundary hardware", () => {
    const states = receipt.runtime.hardwareStates;
    expect(states.videoEntry).toMatchObject({
      scheduler: { currentTime: 2231112709 },
      activeDma: -1, performingDma: 0, cpuBlocked: false,
    });
    expect(states.videoEntry.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
    expect(states.videoExit.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
    expect(states.videoExit.queue.find((event: any) => event.name === "GBA Video"))
      .toMatchObject({ when: 2231112927, deadlineDelta: 218, due: false });
    expect(states.timer0Entry).toMatchObject({
      scheduler: { currentTime: 2231112709 },
      audio: { enabled: true, mixer: { present: false, externalMixing: false } },
      fifo: {
        a: { fifoWordLevel: 3, internalRemaining: 3, dmaSource: 1 },
        b: { fifoWordLevel: 3, internalRemaining: 3, dmaSource: 2 },
      },
      activeDma: -1, performingDma: 0, cpuBlocked: false,
    });
    expect(states.timer0Exit.dma.map((dma: any) => dma.nextCount)).toEqual([0, 4, 4, 0]);
    expect(states.audioEntry).toMatchObject({
      scheduler: { currentTime: 2231112709 },
      activeDma: 1, performingDma: 0, cpuBlocked: true,
    });
    expect(states.audioEntry.dma.map((dma: any) => dma.nextCount)).toEqual([0, 3, 4, 0]);
    expect(states.afterCompletion).toMatchObject({
      scheduler: { currentTime: 2231112727 },
      activeDma: -1, performingDma: 0, cpuBlocked: false,
    });
    expect(states.afterCompletion.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
  });

  it("records evidence only and exposes no construction-clock price", () => {
    expect(JSON.stringify(receipt)).not.toMatch(/serviceCostMasterCycles|runFactoryConstructionClock/);
  });
});
