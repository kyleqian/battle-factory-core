import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayChannelGateTiming } from "../tools/report/factory-m4a-channel-gate-v1.ts";

describe("Issue #55 sixth-player MPlay channel gate v1", () => {
  it("instruction-counts every non-callback gate route from source state", () => {
    expect(reduceMPlayChannelGateTiming([])).toMatchObject({
      route: "exact-no-ClearChain", channelCount: 0, sequentialThumbHalfwords: 3,
      pipelineRefills: 1, ewramWordLoads: 1, cycles: 14, unresolved: null,
    });
    expect(reduceMPlayChannelGateTiming([{ role: "direct-channel-0", statusFlags: 1, gateTime: 0 }])).toMatchObject({
      route: "exact-no-ClearChain", gateZeroChannels: 1, sequentialThumbHalfwords: 13,
      pipelineRefills: 1, ewramWordLoads: 2, cycles: 36,
    });
    expect(reduceMPlayChannelGateTiming([{ role: "cgb-channel-1", statusFlags: 2, gateTime: 1 }])).toMatchObject({
      route: "exact-no-ClearChain", gateOneChannels: 1, sequentialThumbHalfwords: 20,
      pipelineRefills: 1, ewramWordLoads: 2, cycles: 50,
    });
    expect(reduceMPlayChannelGateTiming([{ role: "direct-channel-4", statusFlags: 0x52, gateTime: 8 }])).toMatchObject({
      route: "exact-no-ClearChain", gateLargerChannels: 1, sequentialThumbHalfwords: 16,
      pipelineRefills: 1, ewramWordLoads: 2, cycles: 42,
    });
    expect(reduceMPlayChannelGateTiming([
      { role: "direct-channel-0", statusFlags: 1, gateTime: 0 },
      { role: "cgb-channel-0", statusFlags: 2, gateTime: 0 },
    ])).toMatchObject({ sequentialThumbHalfwords: 23, pipelineRefills: 3, ewramWordLoads: 3, cycles: 70 });
  });

  it("leaves ClearChain paths null rather than pricing missing link state", () => {
    expect(reduceMPlayChannelGateTiming([{ role: "direct-channel-2", statusFlags: 0, gateTime: 0 }])).toEqual(expect.objectContaining({
      route: "unresolved-ClearChain", clearChainChannels: 1, cycles: null,
      unresolved: expect.stringContaining("track/previous/next"),
    }));
    expect(() => reduceMPlayChannelGateTiming([{ role: "raw-0x02000000", statusFlags: 1, gateTime: 0 }])).toThrow(/source-normalized/);
    expect(() => reduceMPlayChannelGateTiming([{ role: "direct-channel-0", statusFlags: 256, gateTime: 0 }])).toThrow(/u8/);
  });

  it("closes a real 69-row subset while complete MPlay costs stay null", () => {
    const evidence = makeEvidence() as {
      join: { rows: number; onePassRows: number; zeroPassRows: number; ambiguousRows: number; addressFree: boolean };
      coverage: {
        channelMembers: number; clearChainMembers: number;
        exactChannelGateRowsWithinOnePass: number; unresolvedClearChainRowsWithinOnePass: number;
        exactChannelGateComponentRowsIncludingSkipped: number; nullChannelGateComponentRows: number;
        exactChannelGateSourceCycleRange: { min: number; max: number; distinct: number };
        exactCompleteMPlaySourceCostRows: number; nullCompleteMPlaySourceCostRows: number;
      };
      rows: Array<{ passCount: number; channelGateSourceCycles: number | null; completeMPlaySourceCycles: number | null }>;
      closure: { remainingDiscriminator: string; durationFit: boolean; serviceCost: null; constructionClock: null };
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toEqual(expect.objectContaining({
      channelMembers: 768, clearChainMembers: 47,
      exactChannelGateRowsWithinOnePass: 69, unresolvedClearChainRowsWithinOnePass: 39,
      exactChannelGateComponentRowsIncludingSkipped: 74, nullChannelGateComponentRows: 39,
      exactChannelGateSourceCycleRange: { min: 204, max: 398, distinct: 36 },
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    }));
    expect(evidence.rows.filter((row) => row.passCount === 1 && row.channelGateSourceCycles !== null)).toHaveLength(69);
    expect(evidence.rows.filter((row) => row.passCount === 1).every((row) => row.completeMPlaySourceCycles === null)).toBe(true);
    expect(evidence.closure.remainingDiscriminator).toContain("39/108");
    expect(evidence.closure.remainingDiscriminator).toContain("47 ClearChain");
    expect(evidence.closure.durationFit).toBe(false);
    expect(evidence.closure.serviceCost).toBeNull();
    expect(evidence.closure.constructionClock).toBeNull();
  }, 30_000);

  it("regenerates the compact evidence and receipt byte-for-byte", () => {
    const output = mkdtempSync(join(tmpdir(), "pokebench-m4a-channel-gate-v1-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-channel-gate-v1.ts", "--out-dir", output]);
    expect(readFileSync(join(output, "factory-m4a-channel-gate-evidence-v1.json"))).toEqual(readFileSync("tests/fixtures/factory-m4a-channel-gate-evidence-v1.json"));
    expect(readFileSync(join(output, "issue55-m4a-channel-gate-v1.md"))).toEqual(readFileSync("docs/issue55-m4a-channel-gate-v1.md"));
  }, 30_000);
});
