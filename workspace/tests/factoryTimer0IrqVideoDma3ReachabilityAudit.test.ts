import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const PATH = "tests/fixtures/factory-timer0-irq-video-dma3-reachability-audit-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8"));

function materializeAuditedSources(root: string): { emerald: string; mgba: string } {
  for (const [relative, anchors] of Object.entries(receipt.auditedAnchors) as Array<[string, string[]]>) {
    const path = join(root, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${anchors.join("\n")}\n`);
  }
  return { emerald: join(root, "pokeemerald"), mgba: join(root, "mgba") };
}

function regenerate(sources: ReturnType<typeof materializeAuditedSources>, output: string): void {
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/extract/extract-factory-timer0-irq-video-dma3-reachability-audit.ts",
    "--pokeemerald-source", sources.emerald,
    "--mgba-source", sources.mgba,
    "--out", output,
  ]);
}

describe("Issue #55 Timer 0 IRQ, Video DMA, and immediate DMA3 reachability audit", () => {
  it("keeps a canonical byte-stable Battle Scene OFF receipt", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("01b20005a725151321fbff5643486d9b3c18e014f2de1a659748a951c3cb975c");
    expect(receipt.schema).toBe("factory-timer0-irq-video-dma3-reachability-audit/v1");
    expect(receipt.release).toMatchObject({
      mgbaVersion: "0.10.5",
      mgbaArchiveSha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
      oracleProfile: "battle-scene-off",
    });
  });

  it("separates the MP2K Timer 0 IRQ invariant from finite no-IRQ observations", () => {
    expect(receipt.sourceFacts.timer0Irq.mp2kTimer0Control).toContain("excluding TIMER_INTR_ENABLE");
    expect(receipt.constructionCensus.timer0Crossings).toMatchObject({
      total: 256,
      timer0ControlValues: [128],
      timer0IrqEnableBitSet: 0,
      queueSnapshots: 512,
      queuedIrqEventOccurrences: 0,
    });
    expect(receipt.constructionReachability.timer0Irq).toContain("does not exclude IRQs from other devices");
  });

  it("records the exact Video no-work window without generalizing all-channel coverage", () => {
    expect(receipt.constructionCensus.timer0Crossings.coDueEventCounts).toEqual({
      "GBA Audio Sample": 3,
      "GBA Video": 20,
    });
    expect(receipt.constructionCensus.vblankEntryObservations).toMatchObject({
      total: 113,
      hblankCallbackNonNull: 0,
      scanlineDmaControlNonzero: 0,
    });
    expect(receipt.constructionCensus.exactAllChannelRuntimeWindows.windows).toEqual([
      {
        kind: "isolated-dual-refill",
        channels: [
          { channel: 0, enabled: false, timing: 0, nextCount: 0 },
          { channel: 1, enabled: true, timing: 3, nextCount: 0 },
          { channel: 2, enabled: true, timing: 3, nextCount: 0 },
          { channel: 3, enabled: false, timing: 0, nextCount: 0 },
        ],
        activeDma: -1,
        performingDma: 0,
        cpuBlocked: false,
      },
      {
        kind: "video-co-due-dual-refill",
        channels: [
          { channel: 0, enabled: false, timing: 0, nextCount: 0 },
          { channel: 1, enabled: true, timing: 3, nextCount: 0 },
          { channel: 2, enabled: true, timing: 3, nextCount: 0 },
          { channel: 3, enabled: false, timing: 0, nextCount: 0 },
        ],
        activeDma: -1,
        performingDma: 0,
        cpuBlocked: false,
      },
    ]);
    expect(receipt.constructionCensus.timer0Crossings.captureBoundary).toContain("not an all-channel DMA register census");
  });

  it("keeps CPU-triggered DMA3 distinct from Video-started work", () => {
    expect(receipt.sourceFacts.immediateDma3.execution).toContain("DMA_START_NOW");
    expect(receipt.constructionCensus.vblankEntryObservations).toMatchObject({
      dma3Locked: 0,
      dma3QueuedBytesNonzero: 0,
      dma3QueuedRequestsNonempty: 0,
    });
    expect(receipt.constructionReachability.immediateDma3).toContain("source-general immediate DMA3 can still overlap");
  });

  it("regenerates byte-for-byte without an emulator, oracle, network, or retained source checkout", () => {
    const directory = mkdtempSync(join(tmpdir(), "timer0-irq-video-dma3-audit-"));
    const sources = materializeAuditedSources(directory);
    const output = join(directory, "receipt.json");
    regenerate(sources, output);
    expect(readFileSync(output)).toEqual(bytes);
  });

  it("rejects a stale Timer 0 source anchor", () => {
    const directory = mkdtempSync(join(tmpdir(), "timer0-irq-video-dma3-stale-"));
    const sources = materializeAuditedSources(directory);
    const timerPath = join(sources.emerald, "src", "m4a.c");
    writeFileSync(timerPath, readFileSync(timerPath, "utf8").replace("TIMER_ENABLE | TIMER_1CLK", "TIMER_ENABLE | TIMER_64CLK"));
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      "tools/extract/extract-factory-timer0-irq-video-dma3-reachability-audit.ts",
      "--pokeemerald-source", sources.emerald,
      "--mgba-source", sources.mgba,
      "--out", join(directory, "receipt.json"),
    ], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("is stale: missing audited anchor");
  });
});
