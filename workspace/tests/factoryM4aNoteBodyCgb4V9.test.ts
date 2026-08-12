import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CGB4_PAN_SWEEP_STATE,
  makeEvidence,
  reduceMPlayCgb4PanSweepToCallR3Timing,
} from "../tools/report/factory-m4a-note-body-cgb4-v9.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v9.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v9.md";

describe("Issue #55 CGB4 pan_sweep caller slice v9", () => {
  it("source-counts the observed zero pan_sweep route through call_r3 entry", () => {
    expect(reduceMPlayCgb4PanSweepToCallR3Timing(CGB4_PAN_SWEEP_STATE)).toEqual({
      route: "pan-sweep-zero-to-call-r3-entry",
      panSweep: 0,
      panSweep80Branch: "bne-not-taken",
      panSweep70Branch: "bne-not-taken",
      sweepValue: 8,
      dynamicHelperBoundary: "call-r3-entry",
      sequentialThumbHalfwords: 13,
      pipelineRefills: 1,
      iwramByteStores: 1,
      ewramByteReads: 1,
      iwramWordReads: 3,
      ewramDataAccessPremiumCycles: 2,
      cycles: 34,
    });
  });

  it("fails closed for pan_sweep branch, source-class, and malformed mutations", () => {
    expect(reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, panSweep: 0x80 })).toBeNull();
    expect(reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, panSweep: 0x70 })).toBeNull();
    expect(reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, panSweep: 1 })).toBeNull();
    expect(reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, route: "after-call-r3" } as any)).toBeNull();
    expect(reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, toneMemory: "iwram" } as any)).toBeNull();
    expect(reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, soundInfoMemory: "ewram" } as any)).toBeNull();
    expect(reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, extra: 1 } as any)).toBeNull();
    expect(() => reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, panSweep: 256 })).toThrow(/panSweep must be u8/);
    expect(() => reduceMPlayCgb4PanSweepToCallR3Timing(null)).toThrow(/state must be an object/);
  });

  it("joins only 7/82 callbacks, preserves v8, and leaves the dynamic helper null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.frozenInputs.acceptedV8EvidenceSha256).toBe("9c0f6c687dab444970e50d11079b401da35e966a5f7f08e3e819dcf25871a8db");
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      exactPanSweepToCallR3Callbacks: 7,
      panSweepToCallR3SourceCycleRange: { min: 34, max: 34, distinct: 1 },
      panSweepToCallR3SourceCycles: 238,
      acceptedContiguousPrefixThroughPanSweepBranchSourceCycles: 3215,
      contiguousPrefixThroughCallR3EntrySourceCycles: 3453,
      observedPanSweepValues: { "0": 7 },
      panSweep80BranchCounts: { bneTaken: 0, bneNotTaken: 7 },
      panSweep70BranchCounts: { bneTaken: 0, bneNotTaken: 7 },
      sweepStoreValues: { "8": 7 },
      sweepStores: 7,
      pitMReads: 7,
      stackArgumentLoads: 14,
      functionPointerLoads: 7,
      callR3CallerEdges: 7,
      nullDynamicCallR3HelperCallbacks: 7,
      nullDynamicMidiKeyToCgbFreqCallbacks: 7,
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.sourceAndElf.compiledRegions).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "observed pan_sweep branches through BL call_r3 edge", start: "0x082dfeea", endExclusive: "0x082dff04", bytes: 0x1a }),
      expect.objectContaining({ role: "dynamic call_r3 entry, explicitly not priced", start: "0x082dfcb4", endExclusive: "0x082dfcb6", bytes: 2 }),
    ]));
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.panSweep === 0 && row.panSweepToCallR3SourceCycles === 34)).toBe(true);
    expect(evidence.rows.every((row: any) => row.dynamicCallR3HelperSourceCycles === null && row.dynamicMidiKeyToCgbFreqSourceCycles === null && row.laterAllocationFieldsSourceCycles === null && row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.branchCoverage).toMatchObject({
      unobservedPanSweep80TakenRoute: null,
      unobservedPanSweep70TakenRoute: null,
      dynamicCallR3Body: null,
      dynamicMidiKeyToCgbFreqBodyAndResult: null,
    });
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
    expect(readFileSync(DOC, "utf8")).toContain("**3453 aggregate cycles**");
  });

  it("regenerates the v9 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v9-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v9.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v9.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v9.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
