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
  coDueEventNames: string[];
  observedEdgeCycles: number;
  dueOrderByDeadlineThenPriority: string[];
  audioTimerDeadlineDelta: number;
  audioReschedule: { beforeWhenDelta: number; afterWhenDelta: number; expectedAfterWhenDelta: number };
  timerReschedule: { beforeWhenDelta: number; afterWhenDelta: number; expectedAfterWhenDelta: number };
  fifoAndDma: {
    wordLevels: number[];
    wordLevelsAfter: number[];
    internalRemaining: number[];
    internalRemainingAfter: number[];
    dmaNextCounts: number[];
    dmaNextCountsAfter: number[];
  };
};
type Receipt = {
  schema: string;
  release: { sha256: string; oracleProfile: string };
  source: { files: Array<{ path: string; sha256: string }>; anchors: Array<{ id: string }> };
  inputReceipts: Array<{ path: string; sha256: string }>;
  exactSourceFacts: {
    registration: { audioSample: { priority: number; intervalMasterCycles: number }; timer0: { priority: number; periodMasterCycles: number }; equalDeadlineOrder: string };
    callback: { directTimingEffect: string; noDirectFifoDmaOrIrq: string };
    mixingBranches: { mixerPointer: string; externalMixing: string; optionalBuiltinHle: string; indirectBoundary: string };
  };
  constructionEpochState: {
    priorExactRuntimeWindows: { count: number; audioEnabled: boolean; mixerPresent: boolean; externalMixing: boolean };
    scopedExclusions: { mixerPresent: string; audioDisabled: string; externalMixing: string };
    perRowBoundary: string;
  };
  naturalAudioCoDueRows: Row[];
  explicitBoundary: string[];
};

const PATH = "tests/fixtures/issue55-audio-sample-callback-audit-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8")) as Receipt;

describe("Issue #55 mGBA Audio Sample callback source audit", () => {
  it("keeps the pinned archive, source provenance, and generated receipt canonical", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("7cac58640ee0fe59ffda435044d4a984216b9240024a9b6d8816f5f1a7bc1381");
    expect(receipt.schema).toBe("issue55-audio-sample-callback-audit/v1");
    expect(receipt.release).toMatchObject({
      sha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
      oracleProfile: "battle-scene-off",
    });
    expect(receipt.source.files).toHaveLength(6);
    expect(receipt.source.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
    expect(receipt.source.anchors.map((anchor) => anchor.id)).toContain("audio-sample-callback");
    expect(receipt.inputReceipts.map((input) => input.path)).toEqual([
      "tests/fixtures/factory-construction-timer0-fifo-v1/anchor.json",
      "tests/fixtures/factory-construction-timer0-fifo-v1/liliana.json",
      "tests/fixtures/factory-construction-timer0-fifo-v1/factory-varied.json",
      "tests/fixtures/factory-timer0-reachability-audit-v1.json",
    ]);
  });

  it("separates source equal-deadline order from the three adjacent-deadline observations", () => {
    expect(receipt.exactSourceFacts.registration).toMatchObject({
      audioSample: { priority: 24, intervalMasterCycles: 1024 },
      timer0: { priority: 32, periodMasterCycles: 1254 },
    });
    expect(receipt.exactSourceFacts.registration.equalDeadlineOrder).toContain("Audio Sample precedes Timer 0");
    expect(receipt.naturalAudioCoDueRows.map((row) => [row.case, row.component, row.ordinal])).toEqual([
      ["liliana", "encrypted-accessor", 23],
      ["factory-varied", "get-nature", 12],
      ["factory-varied", "nature-attempt", 63],
    ]);
    expect(receipt.naturalAudioCoDueRows.every((row) => row.audioTimerDeadlineDelta === 1)).toBe(true);
    expect(receipt.naturalAudioCoDueRows.map((row) => row.dueOrderByDeadlineThenPriority)).toEqual([
      ["GBA Timer 0", "GBA Audio Sample"],
      ["GBA Timer 0", "GBA Audio Sample"],
      ["GBA Video", "GBA Timer 0", "GBA Audio Sample"],
    ]);
    expect(receipt.explicitBoundary[0]).toContain("one master cycle after Timer 0");
  });

  it("pins only the callback's own cadence and the committed paired FIFO/DMA boundary", () => {
    for (const row of receipt.naturalAudioCoDueRows) {
      expect(row.observedEdgeCycles).toBe(20);
      expect(row.audioReschedule.afterWhenDelta).toBe(row.audioReschedule.expectedAfterWhenDelta);
      expect(row.timerReschedule.afterWhenDelta).toBe(row.timerReschedule.expectedAfterWhenDelta);
      expect(row.fifoAndDma).toEqual({
        wordLevels: [3, 3],
        wordLevelsAfter: [7, 7],
        internalRemaining: [3, 3],
        internalRemainingAfter: [2, 2],
        dmaNextCounts: [0, 0],
        dmaNextCountsAfter: [0, 0],
      });
    }
    expect(receipt.exactSourceFacts.callback.directTimingEffect).toContain("D + 1024");
    expect(receipt.exactSourceFacts.callback.noDirectFifoDmaOrIrq).toContain("does not directly call");
    expect(receipt.explicitBoundary.join(" ")).toContain("do not expose a per-callback execution graph");
  });

  it("uses construction state only at its recorded scope and leaves indirect branches unobserved", () => {
    expect(receipt.constructionEpochState.priorExactRuntimeWindows).toEqual({
      count: 2,
      audioEnabled: true,
      mixerPresent: false,
      externalMixing: false,
    });
    expect(receipt.constructionEpochState.scopedExclusions.mixerPresent).toContain("optional emulator gba.audioHle");
    expect(receipt.constructionEpochState.scopedExclusions.audioDisabled).toContain("not reachable");
    expect(receipt.constructionEpochState.scopedExclusions.externalMixing).toContain("excluded");
    expect(receipt.constructionEpochState.perRowBoundary).toContain("do not capture");
    expect(receipt.exactSourceFacts.mixingBranches.mixerPointer).toContain("mixer->step");
    expect(receipt.exactSourceFacts.mixingBranches.externalMixing).toContain("skips");
    expect(receipt.exactSourceFacts.mixingBranches.optionalBuiltinHle).toContain("no mTimingSchedule");
    expect(receipt.exactSourceFacts.mixingBranches.indirectBoundary).toContain("does not claim");
  });

  it("contains no absolute scheduler receipt or production lookup surface", () => {
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toMatch(/masterCycles|globalCycles|scheduledWhen|cpuCycles/);
    expect(serialized).not.toMatch(/"(?:source|destination)"\s*:\s*(?:-?\d|"0x)/);
    expect(serialized).not.toMatch(/0x[0-9a-f]{8}/i);
    expect(receipt.explicitBoundary.join(" ")).toContain("must not wire the construction clock");
  });

  it("rejects stale archived source before it can write a replacement receipt", () => {
    const directory = mkdtempSync(join(tmpdir(), "issue55-audio-sample-callback-stale-"));
    const coreDirectory = join(directory, "src", "core");
    mkdirSync(coreDirectory, { recursive: true });
    writeFileSync(join(coreDirectory, "timing.c"), "// deliberately stale source\n");
    const output = join(directory, "receipt.json");
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/extract/extract-issue55-audio-sample-callback-audit.ts"),
      "--source", directory,
      "--out", output,
    ], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("stale source file: src/core/timing.c");
    expect(result.stdout).toBe("");
  });
});
