import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayPendTiming } from "../tools/report/factory-m4a-pend-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-pend-evidence-v1.json";
const DOC = "docs/issue55-m4a-pend-v1.md";

describe("Issue #55 sixth-player ply_pend callback v1", () => {
  it("instruction-counts both complete source routes from callback ABI state", () => {
    expect(reduceMPlayPendTiming({ trackIndex: 6, patternLevel: 0, returnTarget: null })).toEqual({
      route: "empty-pattern-stack",
      sequentialThumbHalfwords: 4,
      pipelineRefills: 2,
      ewramWordAccesses: 0,
      ewramWordAccessPremiumCycles: 0,
      cycles: 20,
    });
    expect(reduceMPlayPendTiming({ trackIndex: 0, patternLevel: 2, returnTarget: { role: "battle-factory-bgm-track-1", offset: 42 } })).toEqual({
      route: "pop-pattern-return",
      sequentialThumbHalfwords: 10,
      pipelineRefills: 1,
      ewramWordAccesses: 2,
      ewramWordAccessPremiumCycles: 4,
      cycles: 30,
    });
  });

  it("fails closed on state that cannot select a compiled ply_pend route", () => {
    expect(() => reduceMPlayPendTiming({ trackIndex: 10, patternLevel: 0, returnTarget: null })).toThrow(/trackIndex/);
    expect(() => reduceMPlayPendTiming({ trackIndex: 0, patternLevel: 4, returnTarget: null })).toThrow(/three-slot/);
    expect(() => reduceMPlayPendTiming({ trackIndex: 0, patternLevel: 0, returnTarget: { role: "battle-factory-bgm-track-1", offset: 0 } })).toThrow(/empty pattern stack/);
    expect(() => reduceMPlayPendTiming({ trackIndex: 0, patternLevel: 1, returnTarget: null })).toThrow(/normalized song/);
    expect(() => reduceMPlayPendTiming({ trackIndex: 0, patternLevel: 1, returnTarget: { role: "absolute-pointer", offset: 0 } })).toThrow(/normalized song/);
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
      rowsWithPendCallbacks: 1,
      pendCallbacks: 1,
      callbackFamilySelectionCensus: { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 },
      callbackRouteCounts: { "empty-pattern-stack": 1, "pop-pattern-return": 0 },
      exactPendRowsWithinOnePass: 108,
      nullPendRowsWithinOnePass: 0,
      exactPendSourceCycleRange: { min: 0, max: 20, distinct: 2 },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.closure).toMatchObject({ durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null });
    expect(evidence.verdict).toContain("1/1 callbacks");
    expect(evidence.verdict).toContain("5 exact / 108 null");
  });

  it("regenerates the committed evidence and receipt byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-pend-v1-"));
    execFileSync("node", ["--experimental-strip-types", "tools/report/factory-m4a-pend-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-pend-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-pend-v1.md"))).toEqual(readFileSync(DOC));
  });
});
