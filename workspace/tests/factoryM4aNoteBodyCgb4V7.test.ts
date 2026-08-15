import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import { makeEvidence, reduceMPlayChnVolSetAsmTiming } from "../tools/report/factory-m4a-note-body-cgb4-v7.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v7.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v7.md";
const observed = { velocity: 64, rhythmPan: 0, volMR: 93, volML: 0 } as const;

describeCgb4Evidence("Issue #55 CGB4 ChnVolSetAsm observed routes v7", () => {
  it("prices the complete observed both-unclamped helper route", () => {
    expect(reduceMPlayChnVolSetAsmTiming(observed)).toEqual({
      route: "both-unclamped-observed",
      operands: observed,
      rightVolume: 46,
      leftVolume: 0,
      sequentialThumbHalfwords: 22,
      pipelineRefills: 3,
      iwramByteReads: 2,
      iwramByteStores: 2,
      ewramByteReads: 2,
      ewramDataAccessPremiumCycles: 4,
      multiplyInternalCycles: 6,
      multiplyInternalPremiumCycles: 2,
      cycles: 68,
    });
  });

  it("fails closed for malformed, mutated, clamped, and unobserved inputs", () => {
    expect(reduceMPlayChnVolSetAsmTiming({ ...observed, velocity: 65 })).toBeNull();
    expect(reduceMPlayChnVolSetAsmTiming({ ...observed, rhythmPan: -1 })).toBeNull();
    expect(reduceMPlayChnVolSetAsmTiming({ ...observed, volMR: 255, volML: 255 })).toBeNull();
    expect(reduceMPlayChnVolSetAsmTiming({ ...observed, extra: 1 })).toBeNull();
    expect(() => reduceMPlayChnVolSetAsmTiming(null)).toThrow(/state must be an object/);
  });

  it("joins only 7/82 callbacks through helper return and preserves all later nulls", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      exactChnVolSetAsmBodyCallbacks: 7,
      chnVolSetAsmBodySourceCycleRange: { min: 68, max: 68, distinct: 1 },
      chnVolSetAsmBodySourceCycles: 476,
      acceptedContiguousPrefixThroughChnVolSetAsmEntrySourceCycles: 2459,
      contiguousPrefixThroughChnVolSetAsmReturnSourceCycles: 2935,
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.chnVolSetAsmBodySourceCycles === 68)).toBe(true);
    expect(evidence.rows.every((row: any) => row.laterAllocationFieldsSourceCycles === null && row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
  });

  it("regenerates the v7 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v7-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v7.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v7.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v7.md")).equals(readFileSync(DOC))).toBe(true);
  }, 30_000);
});
