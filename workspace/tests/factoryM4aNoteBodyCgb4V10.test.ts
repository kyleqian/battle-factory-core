import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceMPlayCgb4MidiKeyToCgbFreqTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v10.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v10.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v10.md";

const state = (keyAfter: 64 | 91) => ({
  route: "call-r3-midi-key-to-cgb-freq-type4",
  target: "source-init-midi-key-to-cgb-freq",
  toneType: 12,
  keyAfter,
  keyM: 0,
} as const);

describe("Issue #55 CGB4 MidiKeyToCgbFreq slice v10", () => {
  it("source-counts distinct key=64 and key=91 type-4 routes", () => {
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming(state(64))).toEqual({
      route: "cgb4-type4-noise-table",
      target: "MidiKeyToCgbFreq",
      toneType: 12,
      channelNumber: 4,
      keyAfter: 64,
      keyM: 0,
      keyPassedToHelper: 64,
      keyAfterSubtract21: 43,
      clampBranch: "bls-taken-no-clamp",
      noiseTableIndex: 43,
      midiKeyToCgbFreqResult: 0x34,
      callR3BxEdgeSequentialThumbHalfwords: 1,
      callR3BxEdgePipelineRefills: 1,
      callR3BxEdgeSourceCycles: 8,
      sequentialThumbHalfwords: 26,
      pipelineRefills: 5,
      iwramStackWordWrites: 5,
      iwramStackWordReads: 5,
      iwramDataAccessPremiumCycles: 0,
      romLiteralWordReads: 1,
      romLiteralWordTotalCycles: 11,
      romLiteralWordPremiumCycles: 9,
      romNoiseTableByteReads: 1,
      romNoiseTableByteTotalCycles: 9,
      romNoiseTableBytePremiumCycles: 7,
      multiplyInstructions: 0,
      multiplyInternalCycles: 0,
      multiplyInternalPremiumCycles: 0,
      midiKeyToCgbFreqSourceCycles: 98,
      callR3ToReturnSourceCycles: 106,
    });
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming(state(91))).toMatchObject({
      keyAfter: 91,
      keyAfterSubtract21: 70,
      clampBranch: "bls-not-taken-clamp-to-59",
      noiseTableIndex: 59,
      midiKeyToCgbFreqResult: 0x04,
      sequentialThumbHalfwords: 27,
      pipelineRefills: 4,
      midiKeyToCgbFreqSourceCycles: 94,
      callR3ToReturnSourceCycles: 102,
    });
  });

  it("fails closed for target, route, key, and source-state mutations", () => {
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming({ ...state(64), target: "runtime-pointer" })).toBeNull();
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming({ ...state(64), route: "after-call-r3" })).toBeNull();
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming({ ...state(64), toneType: 13 })).toBeNull();
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming({ ...state(64), keyM: 1 })).toBeNull();
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming({ ...state(64), keyAfter: 20 })).toBeNull();
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming({ ...state(64), keyAfter: 92 })).toBeNull();
    expect(reduceMPlayCgb4MidiKeyToCgbFreqTiming({ ...state(64), extra: 1 })).toBeNull();
    expect(() => reduceMPlayCgb4MidiKeyToCgbFreqTiming({ ...state(64), keyAfter: 256 })).toThrow(/keyAfter must be u8/);
    expect(() => reduceMPlayCgb4MidiKeyToCgbFreqTiming(null)).toThrow(/state must be an object/);
  });

  it("joins the same 7/82 frozen v9 rows and closes through return", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.frozenInputs.acceptedV9EvidenceSha256).toBe("2dd867648aa3ecb307a041a4868a2f06f934097dded180bc21c5afd1d8f52e4b");
    expect(evidence.targetResolution).toBeUndefined();
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      exactCallR3BxEdgeCallbacks: 7,
      callR3BxEdgeSourceCycleRange: { min: 8, max: 8, distinct: 1 },
      callR3BxEdgeSourceCycles: 56,
      exactMidiKeyToCgbFreqCallbacks: 7,
      midiKeyToCgbFreqSourceCycleRange: { min: 94, max: 98, distinct: 2 },
      midiKeyToCgbFreqSourceCycles: 674,
      dynamicCallR3ToReturnSourceCycleRange: { min: 102, max: 106, distinct: 2 },
      dynamicCallR3ToReturnSourceCycles: 730,
      acceptedContiguousPrefixThroughCallR3EntrySourceCycles: 3453,
      contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles: 4183,
      observedKeyAfterValues: { "64": 4, "91": 3 },
      keyAfterSubtract21Values: { "43": 4, "70": 3 },
      noiseTableIndices: { "43": 4, "59": 3 },
      midiKeyToCgbFreqResults: { "52": 4, "4": 3 },
      clampBranchCounts: { blsTakenNoClamp: 4, blsNotTakenClampTo59: 3, clampMovExecuted: 3 },
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.sourceAndElf.targetResolution).toMatchObject({
      proof: "source-init-midi-key-to-cgb-freq",
      soundInitInitialTarget: "DummyFunc",
      mplayExtenderTarget: "MidiKeyToCgbFreq",
      fieldWritesInPinnedSource: 2,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
    });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.filter((row: any) => row.keyAfter === 64).every((row: any) => row.midiKeyToCgbFreqResult === 0x34 && row.dynamicCallR3HelperSourceCycles === 106)).toBe(true);
    expect(evidence.rows.filter((row: any) => row.keyAfter === 91).every((row: any) => row.midiKeyToCgbFreqResult === 0x04 && row.dynamicCallR3HelperSourceCycles === 102)).toBe(true);
    expect(evidence.rows.every((row: any) => row.laterAllocationFieldsSourceCycles === null && row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
    expect(readFileSync(DOC, "utf8")).toContain("**4183 aggregate cycles**");
  });

  it("regenerates v10 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v10-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v10.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v10.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v10.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
