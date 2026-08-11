import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PATH = "tests/fixtures/factory-timer0-selected-adjacent-runtime-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8"));

describe("Issue #55 selected LILIANA adjacent-deadline runtime receipt", () => {
  it("pins a canonical twice-fresh Battle Scene OFF packet", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "a0cdb0c1952b77580bfe1e3dd4834af98c40d579484931a3bd657061f117e5fc",
    );
    expect(receipt).toMatchObject({
      schema: "factory-timer0-selected-adjacent-runtime/v1",
      case: "liliana",
      oracleProfile: "battle-scene-off",
      sourceFunction: "FillFactoryFrontierTrainerParty",
      selection: {
        component: "encrypted-accessor",
        ordinal: 23,
        returnClass: "0x0806a51a->0x08068db2",
        edge: "0x082e7c3e->0x082e7c40",
        instructionOccurrence: 27,
        deadlineOrder: ["GBA Timer 0", "GBA Audio Sample"],
        audioTimerDeadlineDelta: 1,
      },
    });
  });

  it("installs wrappers while both deadlines are future and arms only on the selected edge", () => {
    const relevant = receipt.runtime.installState.queue.filter((event: any) => (
      event.name === "GBA Timer 0" || event.name === "GBA Audio Sample"
    ));
    expect(relevant.map((event: any) => [event.name, event.due, event.deadlineDelta])).toEqual([
      ["GBA Audio Sample", false, 529],
      ["GBA Timer 0", false, 1092],
    ]);
    expect(receipt.runtime.wrappersRestoredAfterSequence).toBe(11);
  });

  it("retains Timer@D then Audio@D+1 without substituting equal-deadline priority", () => {
    const timeline = receipt.runtime.timeline;
    expect(timeline.map((event: any) => event.name)).toEqual([
      "GBA Timer 0", "GBA DMA", "GBA Audio Sample",
      "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA",
      "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA", "GBA DMA",
    ]);
    const timer = timeline[0];
    const audio = timeline[2];
    expect(timer).toMatchObject({ priority: 32, cyclesLate: 1 });
    expect(audio).toMatchObject({ priority: 24, cyclesLate: 0 });
    expect(audio.scheduledWhen - timer.scheduledWhen).toBe(1);
    expect(timer.schedulerCurrentTime).toBe(audio.schedulerCurrentTime);
    expect(receipt.runtime.deadlineOrder).toEqual(["GBA Timer 0", "GBA Audio Sample"]);
    expect(receipt.runtime.audioTimerDeadlineDelta).toBe(1);
  });

  it("pins actual DMA1/2 arbitration, completion, and full boundary hardware", () => {
    const timeline = receipt.runtime.timeline;
    expect(receipt.runtime.requestOrder).toEqual([
      { fifo: "a", dmaChannel: 1 },
      { fifo: "b", dmaChannel: 2 },
    ]);
    expect(receipt.runtime.completionOrder).toEqual([1, 2]);
    expect(timeline[0].entry.dmaNextCounts).toEqual([0, 0, 0, 0]);
    expect(timeline[0].exit.dmaNextCounts).toEqual([0, 4, 4, 0]);
    expect(timeline[1].entry.activeDma).toBe(1);
    expect(timeline[2].entry).toMatchObject({
      dmaNextCounts: [0, 3, 4, 0], activeDma: 1, cpuBlocked: true,
    });
    expect(timeline.at(-1).exit).toEqual({
      dmaNextCounts: [0, 0, 0, 0], activeDma: -1,
      performingDma: 0, cpuBlocked: false,
    });

    const states = receipt.runtime.hardwareStates;
    expect(states.timer0Entry.audio).toEqual({
      enabled: true,
      mixer: { present: false, externalMixing: false },
    });
    expect(states.timer0Entry.fifo).toMatchObject({
      a: { fifoWordLevel: 3, internalRemaining: 3, dmaSource: 1 },
      b: { fifoWordLevel: 3, internalRemaining: 3, dmaSource: 2 },
    });
    expect(states.timer0Entry.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
    expect(states.audioEntry.dma.map((dma: any) => dma.nextCount)).toEqual([0, 3, 4, 0]);
    expect(states.afterCompletion.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
    expect(states.afterCompletion).toMatchObject({
      activeDma: -1, performingDma: 0, cpuBlocked: false,
    });
  });

  it("records evidence only and exposes no construction-clock price", () => {
    expect(JSON.stringify(receipt)).not.toMatch(/serviceCostMasterCycles|runFactoryConstructionClock/);
  });
});
