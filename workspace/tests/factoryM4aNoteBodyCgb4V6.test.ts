import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE,
  makeEvidence,
  reduceMPlayCgb4PostTrkVolPitSetAllocationTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v6.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v6.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v6.md";

describe("Issue #55 CGB4 post-TrkVolPitSet allocation fields v6", () => {
  it("source-counts the straight-line field copies and ChnVolSetAsm caller edge", () => {
    expect(reduceMPlayCgb4PostTrkVolPitSetAllocationTiming(CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE)).toEqual({
      route: "post-TrkVolPitSet-allocation-fields-to-ChnVolSetAsm-entry",
      fieldCopySequentialThumbHalfwords: 17,
      fieldCopyPipelineRefills: 0,
      fieldCopyEwramByteReads: 1,
      fieldCopyEwramHalfwordReads: 1,
      fieldCopyEwramWordReads: 3,
      fieldCopyIwramWordReads: 3,
      fieldCopyIwramByteStores: 4,
      fieldCopyIwramHalfwordStores: 1,
      fieldCopyIwramWordStores: 3,
      fieldCopyEwramDataAccessPremiumCycles: 10,
      fieldCopyIwramDataAccessPremiumCycles: 0,
      fieldCopyCycles: 44,
      callerBlSequentialThumbHalfwords: 2,
      callerBlPipelineRefills: 1,
      callerBlCycles: 10,
      cycles: 54,
    });
  });

  it("fails closed on source-route, storage-class, and malformed input mutations", () => {
    expect(reduceMPlayCgb4PostTrkVolPitSetAllocationTiming({ ...CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE, route: "post-helper" } as any)).toBeNull();
    expect(reduceMPlayCgb4PostTrkVolPitSetAllocationTiming({ ...CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE, nextHelper: "ChnVolSetAsmBody" } as any)).toBeNull();
    expect(reduceMPlayCgb4PostTrkVolPitSetAllocationTiming({ ...CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE, trackMemory: "iwram" } as any)).toBeNull();
    expect(reduceMPlayCgb4PostTrkVolPitSetAllocationTiming({ ...CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE, toneMemory: "rom" } as any)).toBeNull();
    expect(reduceMPlayCgb4PostTrkVolPitSetAllocationTiming({ ...CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE, channelMemory: "ewram" } as any)).toBeNull();
    expect(reduceMPlayCgb4PostTrkVolPitSetAllocationTiming({ ...CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE, stackMemory: "ewram" } as any)).toBeNull();
    expect(() => reduceMPlayCgb4PostTrkVolPitSetAllocationTiming(null)).toThrow(/state must be an object/);
  });

  it("joins the same seven callbacks and keeps the helper body and later fields null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      exactPostTrkVolPitSetAllocationFieldCallbacks: 7,
      exactChnVolSetAsmCallerEdgeCallbacks: 7,
      postTrkVolPitSetAllocationFieldSourceCycleRange: { min: 44, max: 44, distinct: 1 },
      chnVolSetAsmCallerEdgeSourceCycleRange: { min: 10, max: 10, distinct: 1 },
      postTrkVolPitSetAllocationSliceSourceCycleRange: { min: 54, max: 54, distinct: 1 },
      acceptedContiguousPrefixThroughTrkVolPitSetReturnSourceCycles: 2081,
      postTrkVolPitSetAllocationFieldSourceCycles: 308,
      chnVolSetAsmCallerEdgeSourceCycles: 70,
      postTrkVolPitSetAllocationSliceSourceCycles: 378,
      contiguousPrefixThroughChnVolSetAsmEntrySourceCycles: 2459,
      nullLaterAllocationFieldsCallbacks: 7,
      nullChnVolSetAsmBodyCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.postTrkVolPitSetAllocationSliceSourceCycles === 54)).toBe(true);
    expect(evidence.rows.every((row: any) => row.laterAllocationFieldsSourceCycles === null && row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.branchCoverage.chnVolSetAsmBody).toBeNull();
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
    expect(readFileSync(DOC, "utf8")).toContain("**2459 cycles**");
  });

  it("regenerates the v6 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v6-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v6.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v6.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v6.md")).equals(readFileSync(DOC))).toBe(true);
  }, 30_000);
});
