import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

type Receipt = {
  schema: string;
  release: { url: string; sha256: string; archiveRoot: string };
  source: {
    version: string;
    files: Array<{ path: string; sha256: string }>;
    anchors: Array<{ id: string; file: string; lines: string }>;
  };
  scheduler: {
    clock: {
      eventWhenFormula: string;
      currentTimeFormula: string;
      absoluteScheduleFormula: string;
      callbackLateFormula: string;
      correctedDueFormula: string;
    };
    equalDeadlineOrdering: {
      insertionRule: string;
      priorityRule: string;
      equalPriorityRule: string;
      callbackInsertionRule: string;
      registeredPriorities: Array<{ event: string; priority: number }>;
    };
  };
  callbacks: {
    irq: { priority: number; delayMasterCycles: number; propagation: string };
    video: { priority: number; propagation: string; dmaDeadlines: string; irqDeadlines: string };
    audioSample: { priority: number; intervalMasterCycles: number; propagation: string; relationToTimer0: string };
    timer0: { priority: number; callbackOrder: string[]; normalReschedule: string; fifoDmaDeadline: string; irqDeadline: string };
    dma: { priority: number; activeSelection: string; timer0SameDeadline: string; freshDispatch: string; continuation: string };
  };
  absoluteTimer0Receipt: {
    canTranslate: string[];
    cannotTranslate: string[];
    minimumRuntimeFields: string[];
  };
};

const PATH = "tests/fixtures/mgba-timer0-scheduler-cycleslate-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8")) as Receipt;

describe("Issue #55 mGBA 0.10.5 Timer 0 cyclesLate source receipt", () => {
  it("pins the exact archive, source files, and line anchors", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("9f7a908846f162e10291e1a0623af4d1c3aca26b2d11864bdab544511dedda8b");
    expect(receipt.schema).toBe("mgba-timer0-scheduler-cycleslate/v1");
    expect(receipt.release).toEqual({
      url: "https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz",
      sha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
      archiveRoot: "mgba-0.10.5",
    });
    expect(receipt.source.version).toBe("0.10.5");
    expect(receipt.source.files).toHaveLength(7);
    expect(receipt.source.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
    expect(receipt.source.anchors).toHaveLength(24);
    expect(receipt.source.anchors.find((anchor) => anchor.id === "timing-schedule")).toEqual({
      id: "timing-schedule",
      file: "src/core/timing.c",
      lines: "36-59",
    });
    expect(receipt.source.anchors.find((anchor) => anchor.id === "dma-callback")).toEqual({
      id: "dma-callback",
      file: "src/gba/dma.c",
      lines: "185-215",
    });
  });

  it("derives absolute due time and cyclesLate rather than a relative service price", () => {
    const clock = receipt.scheduler.clock;
    expect(clock.eventWhenFormula).toContain("masterCycles + relativeCycles + delta");
    expect(clock.currentTimeFormula).toContain("masterCycles + relativeCycles");
    expect(clock.absoluteScheduleFormula).toContain("event.when = W");
    expect(clock.callbackLateFormula).toContain("dispatchCurrentTime - event.when");
    expect(clock.correctedDueFormula).toContain("mTimingCurrentTime - cyclesLate = event.when");
    expect(receipt.callbacks.timer0.normalReschedule).toContain("mTimingCurrentTime - cyclesLate = D");
    expect(receipt.callbacks.timer0.fifoDmaDeadline).toContain("currentTime - cyclesLate = D");
    expect(receipt.callbacks.timer0.irqDeadline).toContain("D + 7");
    expect(receipt.callbacks.video.propagation).toContain("interval - cyclesLate");
    expect(receipt.callbacks.video.dmaDeadlines).toContain("D + 3");
    expect(receipt.callbacks.audioSample.intervalMasterCycles).toBe(1024);
    expect(receipt.callbacks.audioSample.propagation).toContain("1024 - cyclesLate");
  });

  it("pins equal-deadline queue and channel ordering across the audited callbacks", () => {
    const ordering = receipt.scheduler.equalDeadlineOrdering;
    expect(ordering.insertionRule).toContain("numerically greater priority");
    expect(ordering.priorityRule).toContain("lower numeric priority");
    expect(ordering.equalPriorityRule).toContain("preserving existing insertion order");
    expect(ordering.callbackInsertionRule).toContain("cannot rerun callbacks already removed");
    expect(ordering.registeredPriorities).toEqual([
      { event: "GBA IRQ Event", priority: 0 },
      { event: "GBA Video", priority: 8 },
      { event: "GBA Audio Sample", priority: 24 },
      { event: "GBA Timer 0", priority: 32 },
      { event: "GBA DMA", priority: 64 },
    ]);
    expect(receipt.callbacks.timer0.callbackOrder).toEqual([
      "reschedule the normal timer from currentTime - cyclesLate",
      "raise a Timer 0 IRQ if its IRQ flag is set",
      "sample routed FIFO A",
      "sample routed FIFO B",
      "cascade a qualifying count-up successor",
    ]);
    expect(receipt.callbacks.dma.activeSelection).toContain("strictly earlier");
    expect(receipt.callbacks.dma.timer0SameDeadline).toContain("DMA1 wins");
  });

  it("keeps the DMA late-dispatch discontinuity and receipt boundary explicit", () => {
    expect(receipt.callbacks.dma.freshDispatch).toContain("ignores cyclesLate");
    expect(receipt.callbacks.dma.freshDispatch).toContain("actual mTimingCurrentTime");
    expect(receipt.callbacks.dma.continuation).toContain("partially serviced DMA");
    expect(receipt.absoluteTimer0Receipt.canTranslate).toHaveLength(4);
    expect(receipt.absoluteTimer0Receipt.cannotTranslate).toHaveLength(4);
    expect(receipt.absoluteTimer0Receipt.cannotTranslate.join(" ")).toContain("fixed Timer 0 callback/service constant");
    expect(receipt.absoluteTimer0Receipt.minimumRuntimeFields).toHaveLength(5);
  });

  it("rejects a stale source tree before it can write a receipt", () => {
    const staleRoot = mkdtempSync(join(tmpdir(), "mgba-timer0-cycleslate-stale-"));
    const coreDirectory = join(staleRoot, "src", "core");
    mkdirSync(coreDirectory, { recursive: true });
    writeFileSync(join(coreDirectory, "timing.c"), "// deliberately stale source\n");

    const extractor = resolve("tools/extract/extract-mgba-timer0-scheduler-cycleslate-audit.ts");
    const output = join(staleRoot, "receipt.json");
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", extractor, "--source", staleRoot, "--out", output],
      { encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("stale source file: src/core/timing.c");
    expect(result.stdout).toBe("");
  });
});
