import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayPattTiming } from "../tools/report/factory-m4a-patt-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-patt-evidence-v1.json";
const DOC = "docs/issue55-m4a-patt-v1.md";
const callback = (patternLevel: number) => ({
  trackIndex: 6,
  patternLevel,
  commandPointer: { role: "battle-factory-bgm-track-7", offset: 1032 },
  returnTarget: { role: "battle-factory-bgm-track-7", offset: 1036 },
  patternTarget: { role: "battle-factory-bgm-track-7", offset: 1020 },
});

describe("Issue #55 sixth-player ply_patt callback v1", () => {
  it("instruction-counts every successful source stack-depth route", () => {
    expect(reduceMPlayPattTiming(callback(0))).toEqual({
      route: "push-pattern-and-goto-depth-0",
      sequentialThumbHalfwords: 34,
      pipelineRefills: 5,
      ewramWordAccesses: 4,
      ewramWordAccessPremiumCycles: 8,
      romCommandByteReads: 4,
      romCommandBytePremiumCycles: 28,
      cycles: 134,
    });
    expect(reduceMPlayPattTiming(callback(1))).toMatchObject({ route: "push-pattern-and-goto-depth-1", cycles: 134 });
    expect(reduceMPlayPattTiming(callback(2))).toMatchObject({ route: "push-pattern-and-goto-depth-2", cycles: 134 });
  });

  it("fails closed on malformed inputs and the unselected ply_fine route", () => {
    expect(() => reduceMPlayPattTiming({ ...callback(0), trackIndex: 10 })).toThrow(/trackIndex/);
    expect(() => reduceMPlayPattTiming(callback(4))).toThrow(/three-slot/);
    expect(() => reduceMPlayPattTiming(callback(3))).toThrow(/ply_fine/);
    expect(() => reduceMPlayPattTiming({ ...callback(0), commandPointer: null })).toThrow(/commandPointer/);
    expect(() => reduceMPlayPattTiming({ ...callback(0), patternTarget: { role: "absolute-pointer", offset: 0 } })).toThrow(/patternTarget/);
    expect(() => reduceMPlayPattTiming({ ...callback(0), patternTarget: { role: "battle-factory-bgm-track-7", offset: 1328 } })).toThrow(/pinned source role/);
    expect(() => reduceMPlayPattTiming({ ...callback(0), returnTarget: { role: "battle-factory-bgm-track-7", offset: 1037 } })).toThrow(/four-byte/);
  });

  it("closes the sole live callback while preserving complete MPlay nulls", () => {
    const evidence = makeEvidence() as {
      join: Record<string, unknown>;
      coverage: Record<string, unknown> & { byCase: Record<string, unknown> };
      closure: Record<string, unknown>;
      verdict: string;
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      byCase: {
        anchor: { rows: 52, onePass: 49, zeroPass: 3, callbackRows: 1, callbacks: 1 },
        liliana: { rows: 31, onePass: 30, zeroPass: 1, callbackRows: 0, callbacks: 0 },
        "factory-varied": { rows: 30, onePass: 29, zeroPass: 1, callbackRows: 0, callbacks: 0 },
      },
      rowsWithPattCallbacks: 1,
      pattCallbacks: 1,
      callbackFamilySelectionCensus: { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 },
      callbackRouteCounts: { "push-pattern-and-goto-depth-0": 1, "push-pattern-and-goto-depth-1": 0, "push-pattern-and-goto-depth-2": 0 },
      exactPattRowsWithinOnePass: 108,
      nullPattRowsWithinOnePass: 0,
      exactPattSourceCycleRange: { min: 0, max: 134, distinct: 2 },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.closure).toMatchObject({ durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null });
    expect(evidence.verdict).toContain("1/1 callbacks");
    expect(evidence.verdict).toContain("5 exact / 108 null");
  });

  it("regenerates the committed evidence and receipt byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-patt-v1-"));
    execFileSync("node", ["--experimental-strip-types", "tools/report/factory-m4a-patt-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-patt-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-patt-v1.md"))).toEqual(readFileSync(DOC));
  });
});
