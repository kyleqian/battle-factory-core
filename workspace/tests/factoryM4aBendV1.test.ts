import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayBendTiming } from "../tools/report/factory-m4a-bend-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-bend-evidence-v1.json";
const DOC = "docs/issue55-m4a-bend-v1.md";
const callback = {
  trackIndex: 0,
  commandPointer: { role: "battle-factory-bgm-track-1", offset: 143 },
  parameter: 66,
  flagsBefore: 128,
} as const;

describe("Issue #55 sixth-player ply_bend callback v1", () => {
  it("instruction-counts the complete observed GamePak command-byte route", () => {
    expect(reduceMPlayBendTiming(callback)).toEqual({
      route: "gamepak-command-byte-fast-accept",
      sequentialThumbHalfwords: 20,
      pipelineRefills: 5,
      ewramWordAccesses: 2,
      ewramWordAccessPremiumCycles: 4,
      romCommandByteReads: 1,
      romCommandBytePremiumCycles: 7,
      cycles: 81,
    });
    expect(reduceMPlayBendTiming({
      ...callback,
      trackIndex: 2,
      commandPointer: { role: "battle-factory-bgm-track-3", offset: 731 },
      parameter: 64,
      flagsBefore: 131,
    })).toMatchObject({ route: "gamepak-command-byte-fast-accept", cycles: 81 });
  });

  it("fails closed outside the source-proven command route", () => {
    expect(() => reduceMPlayBendTiming({ ...callback, trackIndex: 10 })).toThrow(/trackIndex/);
    expect(() => reduceMPlayBendTiming({ ...callback, commandPointer: { role: "absolute-pointer", offset: 657 } })).toThrow(/commandPointer/);
    expect(() => reduceMPlayBendTiming({ ...callback, commandPointer: { role: "battle-factory-bgm-track-2", offset: 910 } })).toThrow(/pinned source role/);
    expect(() => reduceMPlayBendTiming({ ...callback, parameter: -1 })).toThrow(/parameter/);
    expect(() => reduceMPlayBendTiming({ ...callback, parameter: 256 })).toThrow(/parameter/);
    expect(() => reduceMPlayBendTiming({ ...callback, flagsBefore: 256 })).toThrow(/flagsBefore/);
  });

  it("closes all four live callbacks while preserving complete MPlay nulls", () => {
    const evidence = makeEvidence() as {
      join: Record<string, unknown>;
      coverage: Record<string, unknown> & { byCase: Record<string, unknown> };
      closure: Record<string, unknown>;
      verdict: string;
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      byCase: {
        anchor: { rows: 52, onePass: 49, zeroPass: 3, callbackRows: 2, callbacks: 4 },
        liliana: { rows: 31, onePass: 30, zeroPass: 1, callbackRows: 0, callbacks: 0 },
        "factory-varied": { rows: 30, onePass: 29, zeroPass: 1, callbackRows: 0, callbacks: 0 },
      },
      rowsWithBendCallbacks: 2,
      bendCallbacks: 4,
      callbackFamilySelectionCensus: { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 },
      callbackRouteCounts: { "gamepak-command-byte-fast-accept": 4 },
      exactBendRowsWithinOnePass: 108,
      nullBendRowsWithinOnePass: 0,
      exactBendSourceCycleRange: { min: 0, max: 243, distinct: 3 },
      knownComponentSourceCycleRange: { min: 456, max: 1093, distinct: 71 },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.closure).toMatchObject({ durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null });
    expect(evidence.verdict).toContain("4/4 callbacks");
    expect(evidence.verdict).toContain("5 exact / 108 null");
  });

  it("regenerates the committed evidence and receipt byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-bend-v1-"));
    execFileSync("node", ["--experimental-strip-types", "tools/report/factory-m4a-bend-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-bend-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-bend-v1.md"))).toEqual(readFileSync(DOC));
  });
});
