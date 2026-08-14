import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  CGB4_POST_CHN_VOL_SET_STATE,
  makeEvidence,
  reduceMPlayCgb4PostChnVolSetTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v8.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v8.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v8.md";

describeCgb4Evidence("Issue #55 CGB4 post-ChnVolSetAsm caller slice v8", () => {
  it("source-counts the observed key-plus-keyM CGB route to the pan_sweep boundary", () => {
    expect(reduceMPlayCgb4PostChnVolSetTiming(CGB4_POST_CHN_VOL_SET_STATE)).toEqual({
      route: "post-ChnVolSetAsm-key-plus-keyM-to-pan-sweep-boundary",
      channelKey: 64,
      keyM: 0,
      keyPlusKeyM: 64,
      toneType: 12,
      toneTypeCgbBits: 4,
      keyPlusKeyMBranch: "bpl-taken",
      cgbBranch: "beq-not-taken",
      firstUnresolvedBranch: "bne-pan-sweep",
      sequentialThumbHalfwords: 14,
      pipelineRefills: 1,
      iwramByteReads: 1,
      iwramWordReads: 1,
      iwramByteStores: 1,
      ewramByteReads: 3,
      ewramDataAccessPremiumCycles: 6,
      cycles: 40,
    });
  });

  it("fails closed for branch, source, storage, and malformed mutations", () => {
    expect(reduceMPlayCgb4PostChnVolSetTiming({ ...CGB4_POST_CHN_VOL_SET_STATE, keyM: -1 })).toBeNull();
    expect(reduceMPlayCgb4PostChnVolSetTiming({ ...CGB4_POST_CHN_VOL_SET_STATE, keyAfter: 65 })).toBeNull();
    expect(reduceMPlayCgb4PostChnVolSetTiming({ ...CGB4_POST_CHN_VOL_SET_STATE, toneType: 4 } as any)).toBeNull();
    expect(reduceMPlayCgb4PostChnVolSetTiming({ ...CGB4_POST_CHN_VOL_SET_STATE, route: "after-pan-sweep" } as any)).toBeNull();
    expect(reduceMPlayCgb4PostChnVolSetTiming({ ...CGB4_POST_CHN_VOL_SET_STATE, trackMemory: "iwram" } as any)).toBeNull();
    expect(reduceMPlayCgb4PostChnVolSetTiming({ ...CGB4_POST_CHN_VOL_SET_STATE, toneMemory: "rom" } as any)).toBeNull();
    expect(reduceMPlayCgb4PostChnVolSetTiming({ ...CGB4_POST_CHN_VOL_SET_STATE, extra: 1 } as any)).toBeNull();
    expect(() => reduceMPlayCgb4PostChnVolSetTiming(null)).toThrow(/state must be an object/);
  });

  it("joins only 7/82 callbacks and keeps pan_sweep and all broader costs null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      exactPostChnVolSetAsmCallbacks: 7,
      postChnVolSetAsmSourceCycleRange: { min: 40, max: 40, distinct: 1 },
      postChnVolSetAsmSourceCycles: 280,
      acceptedContiguousPrefixThroughChnVolSetAsmReturnSourceCycles: 2935,
      contiguousPrefixThroughPanSweepBranchSourceCycles: 3215,
      observedKeyMValues: { "0": 7 },
      keyPlusKeyMBranchCounts: { bplTaken: 7, movsZeroExecuted: 0 },
      cgbBranchCounts: { beqTaken: 0, beqNotTaken: 7 },
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.postChnVolSetAsmSourceCycles === 40)).toBe(true);
    expect(evidence.rows.every((row: any) => row.firstUnresolvedBranch === "0x082dfeea:bne-pan-sweep")).toBe(true);
    expect(evidence.rows.every((row: any) => row.laterAllocationFieldsSourceCycles === null && row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.branchCoverage.panSweepRoutes).toBeNull();
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
    expect(readFileSync(DOC, "utf8")).toContain("**3215 aggregate cycles**");
  });

  it("regenerates the v8 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v8-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v8.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v8.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v8.md")).equals(readFileSync(DOC))).toBe(true);
  }, 30_000);
});
