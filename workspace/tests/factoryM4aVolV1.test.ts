import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayVolTiming } from "../tools/report/factory-m4a-vol-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-vol-evidence-v1.json";
const DOC = "docs/issue55-m4a-vol-v1.md";
const callback = {
  trackIndex: 2,
  commandPointer: { role: "battle-factory-bgm-track-3", offset: 714 },
  parameter: 0,
  flagsBefore: 128,
} as const;

describe("Issue #55 sixth-player ply_vol callback v1", () => {
  it("instruction-counts the complete observed GamePak command-byte route", () => {
    expect(reduceMPlayVolTiming(callback)).toEqual({
      route: "gamepak-command-byte-fast-accept",
      sequentialThumbHalfwords: 19,
      pipelineRefills: 5,
      ewramWordAccesses: 2,
      ewramWordAccessPremiumCycles: 4,
      romCommandByteReads: 1,
      romCommandBytePremiumCycles: 7,
      cycles: 79,
    });
    expect(reduceMPlayVolTiming({
      ...callback,
      trackIndex: 8,
      commandPointer: { role: "battle-factory-bgm-track-9", offset: 56 },
      parameter: 0,
    })).toMatchObject({ route: "gamepak-command-byte-fast-accept", cycles: 79 });
  });

  it("fails closed outside the source-proven command route", () => {
    expect(() => reduceMPlayVolTiming({ ...callback, trackIndex: 10 })).toThrow(/trackIndex/);
    expect(() => reduceMPlayVolTiming({ ...callback, commandPointer: { role: "absolute-pointer", offset: 657 } })).toThrow(/commandPointer/);
    expect(() => reduceMPlayVolTiming({ ...callback, commandPointer: { role: "battle-factory-bgm-track-2", offset: 910 } })).toThrow(/pinned source role/);
    expect(() => reduceMPlayVolTiming({ ...callback, parameter: -1 })).toThrow(/parameter/);
    expect(() => reduceMPlayVolTiming({ ...callback, parameter: 256 })).toThrow(/parameter/);
    expect(() => reduceMPlayVolTiming({ ...callback, flagsBefore: 256 })).toThrow(/flagsBefore/);
  });

  it("closes all 16 live callbacks while preserving complete MPlay nulls", () => {
    const evidence = makeEvidence() as {
      join: Record<string, unknown>;
      coverage: Record<string, unknown> & { byCase: Record<string, unknown> };
      closure: Record<string, unknown>;
      verdict: string;
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      byCase: {
        anchor: { rows: 52, onePass: 49, zeroPass: 3, callbackRows: 1, callbacks: 2 },
        liliana: { rows: 31, onePass: 30, zeroPass: 1, callbackRows: 11, callbacks: 13 },
        "factory-varied": { rows: 30, onePass: 29, zeroPass: 1, callbackRows: 1, callbacks: 1 },
      },
      rowsWithVolCallbacks: 13,
      volCallbacks: 16,
      callbackFamilySelectionCensus: { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 },
      callbackRouteCounts: { "gamepak-command-byte-fast-accept": 16 },
      exactVolRowsWithinOnePass: 108,
      nullVolRowsWithinOnePass: 0,
      exactVolSourceCycleRange: { min: 0, max: 158, distinct: 3 },
      knownComponentSourceCycleRange: { min: 456, max: 1413, distinct: 73 },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.closure).toMatchObject({ durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null });
    expect(evidence.verdict).toContain("16/16 callbacks");
    expect(evidence.verdict).toContain("5 exact / 108 null");
  });

  it("regenerates the committed evidence and receipt byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-vol-v1-"));
    execFileSync("node", ["--experimental-strip-types", "tools/report/factory-m4a-vol-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-vol-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-vol-v1.md"))).toEqual(readFileSync(DOC));
  });
});
