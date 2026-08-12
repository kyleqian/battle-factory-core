import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CGB4_CALLER_HELPER_GAP_STATE,
  makeEvidence,
  reduceMPlayCgb4CallerHelperGapTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v5.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v5.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v5.md";

describe("Issue #55 CGB4 caller edge + TrkVolPitSet prologue v5", () => {
  it("source-counts the exact caller edge and complete helper prologue", () => {
    expect(reduceMPlayCgb4CallerHelperGapTiming(CGB4_CALLER_HELPER_GAP_STATE)).toEqual({
      route: "_081DDC66-call-edge-and-TrkVolPitSet-prologue",
      callerArgumentLoadHalfwords: 1,
      callerArgumentMoveHalfwords: 1,
      callerBlHalfwords: 2,
      callerCallEdgeSequentialThumbHalfwords: 4,
      callerCallEdgePipelineRefills: 1,
      callerStackIwramWordReads: 1,
      callerCallEdgeDataAccessPremiumCycles: 0,
      callerCallEdgeCycles: 14,
      helperPrologueSequentialThumbHalfwords: 1,
      helperProloguePipelineRefills: 0,
      helperPrologueStackIwramWordWrites: 2,
      helperPrologueDataAccessPremiumCycles: 0,
      helperPrologueCycles: 2,
      gapCycles: 16,
    });
  });

  it("fails closed when the source route or memory class is mutated", () => {
    expect(reduceMPlayCgb4CallerHelperGapTiming({ ...CGB4_CALLER_HELPER_GAP_STATE, callee: "clear_modM" } as any)).toBeNull();
    expect(reduceMPlayCgb4CallerHelperGapTiming({ ...CGB4_CALLER_HELPER_GAP_STATE, callsite: "_081DDC40" } as any)).toBeNull();
    expect(reduceMPlayCgb4CallerHelperGapTiming({ ...CGB4_CALLER_HELPER_GAP_STATE, callerStack: "ewram" } as any)).toBeNull();
    expect(reduceMPlayCgb4CallerHelperGapTiming({ ...CGB4_CALLER_HELPER_GAP_STATE, helperStack: "rom" } as any)).toBeNull();
    expect(() => reduceMPlayCgb4CallerHelperGapTiming(null)).toThrow(/state must be an object/);
  });

  it("makes the known-component and contiguous-prefix boundaries mechanically distinct", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      exactCallerCallEdgeCallbacks: 7,
      exactHelperPrologueCallbacks: 7,
      callerCallEdgeAndHelperPrologueSourceCycleRange: { min: 16, max: 16, distinct: 1 },
      knownComponentSumExcludingCallerGapSourceCycles: 1969,
      callerCallEdgeAndHelperPrologueSourceCycles: 112,
      knownComponentSumIncludingCallerGapAndThroughTrkVolPitSetSourceCycles: 2081,
      contiguousPrefixThroughTrkVolPitSetReturnSourceCycles: 2081,
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.contiguousPrefixThroughTrkVolPitSetReturnSourceCycles === row.knownComponentSumIncludingCallerGapAndThroughTrkVolPitSetSourceCycles)).toBe(true);
    expect(evidence.rows.every((row: any) => row.laterAllocationFieldsSourceCycles === null && row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
    expect(readFileSync(DOC, "utf8")).toContain("**2081 cycles**");
    expect(readFileSync(DOC, "utf8")).toContain("**1969**");
  });

  it("regenerates the v5 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v5-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v5.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v5.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v5.md")).equals(readFileSync(DOC))).toBe(true);
  }, 30_000);
});
