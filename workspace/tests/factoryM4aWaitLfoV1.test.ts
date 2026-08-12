import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayWaitLfoTiming } from "../tools/report/factory-m4a-wait-lfo-v1.ts";

describe("Issue #55 sixth-player MPlay wait/LFO v1", () => {
  it("instruction-counts only the selected nonzero-speed/mod-zero route", () => {
    expect(reduceMPlayWaitLfoTiming({ trackIndex: 0, wait: 1, lfoSpeed: 22, mod: 0 })).toEqual({
      route: "mod-zero",
      sequentialThumbHalfwords: 11,
      pipelineRefills: 1,
      ewramByteAccessPremiumCycles: 0,
      cycles: 28,
      unresolved: null,
    });
    expect(reduceMPlayWaitLfoTiming({ trackIndex: 8, wait: 96, lfoSpeed: 44, mod: 0 })).toMatchObject({ route: "mod-zero", cycles: 28 });
    expect(reduceMPlayWaitLfoTiming({ trackIndex: 0, wait: 1, lfoSpeed: 0, mod: 0 })).toMatchObject({ route: "unresolved-lfo", cycles: null });
    expect(reduceMPlayWaitLfoTiming({ trackIndex: 0, wait: 1, lfoSpeed: 22, mod: 1 })).toMatchObject({ route: "unresolved-lfo", cycles: null });
    expect(() => reduceMPlayWaitLfoTiming({ trackIndex: 0, wait: 0, lfoSpeed: 22, mod: 0 })).toThrow(/wait must be nonzero/);
    expect(() => reduceMPlayWaitLfoTiming({ trackIndex: 0, wait: 1, lfoSpeed: 256, mod: 0 })).toThrow(/u8/);
  });

  it("keeps every captured track row address-free and branch-minimal", () => {
    for (const name of ["anchor", "liliana", "factory-varied"]) {
      const packet = JSON.parse(readFileSync(`tests/fixtures/factory-m4a-wait-lfo-v1/${name}.json`, "utf8")) as {
        observations: Array<{ waitLfoTracks: Array<Record<string, unknown>> | null }>;
      };
      for (const track of packet.observations.flatMap((row) => row.waitLfoTracks ?? [])) {
        expect(Object.keys(track).sort()).toEqual(["lfoSpeed", "mod", "trackIndex", "wait"]);
        expect(track.mod).toBe(0);
      }
    }
  });

  it("closes the wait/LFO component for 108 one-pass rows without completing MPlay", () => {
    const evidence = makeEvidence() as {
      join: { rows: number; onePassRows: number; zeroPassRows: number; ambiguousRows: number; addressFree: boolean };
      coverage: {
        activeTrackVisits: number; modZeroTrackVisits: number;
        exactWaitLfoRowsWithinOnePass: number; nullWaitLfoRowsWithinOnePass: number;
        exactWaitLfoSourceCycleRange: { min: number; max: number; distinct: number };
        knownGateAndWaitLfoSourceCycleRange: { min: number; max: number; distinct: number };
        exactCompleteMPlaySourceCostRows: number; nullCompleteMPlaySourceCostRows: number;
      };
      rows: Array<{ passCount: number; waitLfoSourceCycles: number; completeMPlaySourceCycles: number | null }>;
      closure: { remainingDiscriminator: string; durationFit: boolean; pointerIdentityTable: boolean; serviceCost: null; constructionClock: null };
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toEqual(expect.objectContaining({
      activeTrackVisits: 972,
      modZeroTrackVisits: 972,
      exactWaitLfoRowsWithinOnePass: 108,
      nullWaitLfoRowsWithinOnePass: 0,
      exactWaitLfoSourceCycleRange: { min: 252, max: 252, distinct: 1 },
      knownGateAndWaitLfoSourceCycleRange: { min: 456, max: 865, distinct: 70 },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    }));
    expect(evidence.rows.filter((row) => row.passCount === 1)).toHaveLength(108);
    expect(evidence.rows.filter((row) => row.passCount === 1).every((row) => row.waitLfoSourceCycles === 252 && row.completeMPlaySourceCycles === null)).toBe(true);
    expect(evidence.closure.remainingDiscriminator).toContain("command dispatch and callback");
    expect(evidence.closure).toMatchObject({ durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null });
  }, 30_000);

  it("regenerates the compact evidence and document byte-for-byte", () => {
    const output = mkdtempSync(join(tmpdir(), "pokebench-m4a-wait-lfo-v1-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-wait-lfo-v1.ts", "--out-dir", output]);
    expect(readFileSync(join(output, "factory-m4a-wait-lfo-evidence-v1.json"))).toEqual(readFileSync("tests/fixtures/factory-m4a-wait-lfo-evidence-v1.json"));
    expect(readFileSync(join(output, "issue55-m4a-wait-lfo-v1.md"))).toEqual(readFileSync("docs/issue55-m4a-wait-lfo-v1.md"));
  }, 30_000);
});
