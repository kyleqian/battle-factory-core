import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PATH = "tests/fixtures/factory-timer0-scheduler-runtime-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8"));

describe("Issue #55 absolute Timer 0 scheduler runtime receipt", () => {
  it("pins a twice-fresh, compact Battle Scene OFF receipt", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "475f47317b032f6914fceb6d25d625a2dce73fdcbb9f29aed5af982799b1b2c1",
    );
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(receipt.schema).toBe("factory-timer0-scheduler-runtime/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.windows.map((window: any) => window.kind)).toEqual([
      "isolated-dual-refill",
      "video-co-due-dual-refill",
    ]);
  });

  it("records exact callback entry time, lateness, due order, audio, FIFO, and complete DMA0-3 state", () => {
    const [isolated, coDue] = receipt.windows;
    expect(isolated.timer0CurrentEvent).toEqual({
      name: "GBA Timer 0", priority: 32, scheduledWhen: 1880434111,
      cyclesLate: 0, schedulerCurrentTime: 1880434111,
    });
    expect(coDue.timer0CurrentEvent).toEqual({
      name: "GBA Timer 0", priority: 32, scheduledWhen: 1880414047,
      cyclesLate: 0, schedulerCurrentTime: 1880414047,
    });
    expect(isolated.exactCoDueCallbacksBeforeTimer0).toEqual([]);
    expect(coDue.exactCoDueCallbacksBeforeTimer0.map((event: any) => [event.name, event.priority, event.cyclesLate])).toEqual([
      ["GBA Video", 8, 0],
    ]);
    for (const window of receipt.windows) {
      expect(window.timer0Entry.audio).toEqual({
        enabled: true,
        mixer: { present: false, externalMixing: false },
      });
      expect(window.timer0Entry.fifo.a).toMatchObject({ fifoWordLevel: 3, internalRemaining: 3, dmaSource: 1 });
      expect(window.timer0Entry.fifo.b).toMatchObject({ fifoWordLevel: 3, internalRemaining: 3, dmaSource: 2 });
      expect(window.timer0Entry.dma.map((dma: any) => dma.channel)).toEqual([0, 1, 2, 3]);
      expect(window.timer0Entry.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
      expect(window.timer0Entry.dma.map((dma: any) => [dma.enabled, dma.timing, dma.count])).toEqual([
        [false, 0, 1], [true, 3, 4], [true, 3, 4], [false, 0, 512],
      ]);
      expect(window.timer0Entry).toMatchObject({ activeDma: -1, performingDma: 0, cpuBlocked: false });
    }
    expect(coDue.exactCoDueCallbacksBeforeTimer0[0]).toMatchObject({
      dmaNextCounts: [0, 0, 0, 0],
      dmaNextCountsAfter: [0, 0, 0, 0],
      activeDma: -1,
    });
  });

  it("pins request/arbitration/completion order and the 18-cycle live graph without inventing a callback cost", () => {
    for (const window of receipt.windows) {
      const entryTime = window.timer0Entry.scheduler.currentTime;
      expect(window.requestOrder).toEqual([
        { fifo: "a", dmaChannel: 1 },
        { fifo: "b", dmaChannel: 2 },
      ]);
      expect(window.timer0Exit.dma.map((dma: any) => dma.nextCount)).toEqual([0, 4, 4, 0]);
      expect(window.timer0Exit.dma.slice(1, 3).map((dma: any) => [dma.when, dma.deadlineDelta])).toEqual([
        [entryTime, 0], [entryTime, 0],
      ]);
      expect(window.dmaCallbacks.map((callback: any) => callback.activeDma)).toEqual([
        1, 1, 1, 1, 2, 1, 2, 2, 2, 2,
      ]);
      expect(window.completionOrder).toEqual([1, 2]);
      expect(window.afterCompletion.scheduler.currentTime - entryTime).toBe(18);
      expect(window.afterCompletion.dma.map((dma: any) => dma.nextCount)).toEqual([0, 0, 0, 0]);
      expect(window.afterCompletion.activeDma).toBe(-1);
    }
  });

  it("regenerates the canonical receipt hermetically", () => {
    const directory = mkdtempSync(join(tmpdir(), "timer0-scheduler-runtime-"));
    const output = join(directory, "receipt.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/extract/extract-factory-timer0-scheduler-runtime.ts",
      "--input", PATH,
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(bytes);
  });
});
