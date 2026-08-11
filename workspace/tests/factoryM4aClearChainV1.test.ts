import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayClearChainTiming } from "../tools/report/factory-m4a-clearchain-v1.ts";

const direct = (index: number): string => `direct-channel-${index}`;

describe("Issue #55 sixth-player MPlay ClearChain v1", () => {
  it("instruction-counts every RealClearChain link branch plus its compiled wrapper", () => {
    expect(reduceMPlayClearChainTiming({
      currentRole: direct(0), trackRole: null, previousRole: direct(1), nextRole: direct(2),
    })).toEqual({
      route: "track-null", sequentialThumbHalfwords: 12, pipelineRefills: 5,
      romLiteralLoads: 1, ewramWordAccesses: 1, ewramWordAccessPremiumCycles: 0, cycles: 63,
    });
    expect(reduceMPlayClearChainTiming({
      currentRole: direct(0), trackRole: "music-player-5-track-0", previousRole: null, nextRole: null,
    })).toEqual({
      route: "previous-null-next-null", sequentialThumbHalfwords: 21, pipelineRefills: 6,
      romLiteralLoads: 1, ewramWordAccesses: 5, ewramWordAccessPremiumCycles: 0, cycles: 87,
    });
    expect(reduceMPlayClearChainTiming({
      currentRole: direct(0), trackRole: "music-player-5-track-0", previousRole: null, nextRole: direct(1),
    })).toEqual({
      route: "previous-null-next-linked", sequentialThumbHalfwords: 22, pipelineRefills: 5,
      romLiteralLoads: 1, ewramWordAccesses: 6, ewramWordAccessPremiumCycles: 0, cycles: 83,
    });
    expect(reduceMPlayClearChainTiming({
      currentRole: direct(0), trackRole: "music-player-5-track-0", previousRole: direct(1), nextRole: null,
    })).toEqual({
      route: "previous-linked-next-null", sequentialThumbHalfwords: 22, pipelineRefills: 6,
      romLiteralLoads: 1, ewramWordAccesses: 5, ewramWordAccessPremiumCycles: 0, cycles: 89,
    });
    expect(reduceMPlayClearChainTiming({
      currentRole: direct(0), trackRole: "music-player-5-track-0", previousRole: direct(1), nextRole: direct(2),
    })).toEqual({
      route: "previous-linked-next-linked", sequentialThumbHalfwords: 23, pipelineRefills: 5,
      romLiteralLoads: 1, ewramWordAccesses: 6, ewramWordAccessPremiumCycles: 0, cycles: 85,
    });
  });

  it("fails closed on pointer-like or non-source roles", () => {
    expect(() => reduceMPlayClearChainTiming({ currentRole: "0x02000000", trackRole: null, previousRole: null, nextRole: null })).toThrow(/source-normalized/);
    expect(() => reduceMPlayClearChainTiming({ currentRole: direct(0), trackRole: "receipt-track-3", previousRole: null, nextRole: null })).toThrow(/source-normalized/);
    expect(() => reduceMPlayClearChainTiming({ currentRole: direct(0), trackRole: null, previousRole: "raw-channel", nextRole: null })).toThrow(/source-normalized/);
  });

  it("closes all 47 callbacks and all 108 one-pass channel-gate components", () => {
    const evidence = makeEvidence() as {
      join: { rows: number; onePassRows: number; zeroPassRows: number; ambiguousRows: number; addressFree: boolean };
      coverage: {
        rowsWithClearChainCallbacks: number; clearChainCallbacks: number;
        callbackRouteCounts: Record<string, number>;
        callbackSourceCycleRange: { min: number; max: number; distinct: number };
        exactChannelGateRowsWithinOnePass: number; nullChannelGateRowsWithinOnePass: number;
        exactChannelGateSourceCycleRange: { min: number; max: number; distinct: number };
        exactCompleteMPlaySourceCostRows: number; nullCompleteMPlaySourceCostRows: number;
      };
      rows: Array<{ passCount: number; channelGateWithClearChainSourceCycles: number; completeMPlaySourceCycles: number | null }>;
      closure: { remainingDiscriminator: string; durationFit: boolean; pointerIdentityTable: boolean; serviceCost: null; constructionClock: null };
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toEqual(expect.objectContaining({
      rowsWithClearChainCallbacks: 39,
      clearChainCallbacks: 47,
      callbackRouteCounts: {
        "previous-null-next-null": 23,
        "previous-linked-next-null": 19,
        "previous-linked-next-linked": 5,
      },
      callbackSourceCycleRange: { min: 85, max: 89, distinct: 3 },
      exactChannelGateRowsWithinOnePass: 108,
      nullChannelGateRowsWithinOnePass: 0,
      exactChannelGateSourceCycleRange: { min: 204, max: 613, distinct: 70 },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    }));
    expect(evidence.rows.filter((row) => row.passCount === 1).every((row) => Number.isInteger(row.channelGateWithClearChainSourceCycles))).toBe(true);
    expect(evidence.rows.filter((row) => row.passCount === 1).every((row) => row.completeMPlaySourceCycles === null)).toBe(true);
    expect(evidence.closure.remainingDiscriminator).toContain("wait/LFO");
    expect(evidence.closure.remainingDiscriminator).toContain("command-callback");
    expect(evidence.closure.durationFit).toBe(false);
    expect(evidence.closure.pointerIdentityTable).toBe(false);
    expect(evidence.closure.serviceCost).toBeNull();
    expect(evidence.closure.constructionClock).toBeNull();
  }, 30_000);

  it("regenerates the compact evidence and receipt byte-for-byte", () => {
    const output = mkdtempSync(join(tmpdir(), "pokebench-m4a-clearchain-v1-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-clearchain-v1.ts", "--out-dir", output]);
    expect(readFileSync(join(output, "factory-m4a-clearchain-evidence-v1.json"))).toEqual(readFileSync("tests/fixtures/factory-m4a-clearchain-evidence-v1.json"));
    expect(readFileSync(join(output, "issue55-m4a-clearchain-v1.md"))).toEqual(readFileSync("docs/issue55-m4a-clearchain-v1.md"));
  }, 30_000);
});
