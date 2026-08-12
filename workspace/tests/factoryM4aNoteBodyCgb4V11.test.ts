import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4PlyNoteReturnTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v11.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v11.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v11.md";

const state = () => ({
  route: "midi-key-to-cgb-freq-return-through-ply-note-return",
  helperReturn: "MidiKeyToCgbFreq",
  callerContinuation: "_081DDCDC",
  channelStorage: "iwram",
  trackStorage: "iwram",
  stackStorage: "iwram",
} as const);

describe("Issue #55 CGB4 ply_note return slice v11", () => {
  it("source-counts the fixed continuation and complete ply_note epilogue", () => {
    expect(reduceCgb4PlyNoteReturnTiming(state())).toEqual({
      route: "midi-key-to-cgb-freq-return-through-ply-note-return",
      helperReturn: "MidiKeyToCgbFreq",
      callerContinuation: "_081DDCDC",
      channelStorage: "iwram",
      trackStorage: "iwram",
      stackStorage: "iwram",
      returnBranchSequentialThumbHalfwords: 1,
      returnBranchTakenControlTransferRefills: 1,
      returnBranchSourceCycles: 8,
      finalWriteSequentialThumbHalfwords: 7,
      frequencyIwramWordStores: 1,
      statusFlagsIwramByteStores: 1,
      trackFlagsIwramByteReads: 1,
      trackFlagsIwramByteStores: 1,
      finalWriteDataAccessPremiumCycles: 0,
      finalWriteSourceCycles: 14,
      epilogueSequentialThumbHalfwords: 8,
      stackAdjustThumbHalfwords: 1,
      popR0R7MultipleIwramWordReads: 8,
      highRegisterRestoreThumbHalfwords: 4,
      finalPopR0SingleIwramWordReads: 1,
      bxReturnThumbHalfwords: 1,
      epilogueTakenControlTransferRefills: 1,
      epilogueDataAccessPremiumCycles: 0,
      epilogueSourceCycles: 22,
      continuationThroughPlyNoteReturnSourceCycles: 44,
    });
  });

  it("fails closed for route, helper, continuation, storage, and source-state mutations", () => {
    expect(reduceCgb4PlyNoteReturnTiming({ ...state(), route: "duration-fit" })).toBeNull();
    expect(reduceCgb4PlyNoteReturnTiming({ ...state(), helperReturn: "runtime-pointer" })).toBeNull();
    expect(reduceCgb4PlyNoteReturnTiming({ ...state(), callerContinuation: "after-ply-note" })).toBeNull();
    expect(reduceCgb4PlyNoteReturnTiming({ ...state(), channelStorage: "ewram" })).toBeNull();
    expect(reduceCgb4PlyNoteReturnTiming({ ...state(), trackStorage: "runtime" })).toBeNull();
    expect(reduceCgb4PlyNoteReturnTiming({ ...state(), stackStorage: "rom" })).toBeNull();
    expect(reduceCgb4PlyNoteReturnTiming({ ...state(), extra: 1 })).toBeNull();
    expect(() => reduceCgb4PlyNoteReturnTiming(null)).toThrow(/state must be an object/);
  });

  it("joins frozen v10 only and closes the same 7/82 rows through ply_note return", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.frozenInputs).toEqual({
      acceptedV10EvidenceSha256: "3e3af127e2010c95189fde78aa2b77999c76b8026b48c65080a8da3b50bbb3b0",
      v10RegeneratesByteForByte: true,
    });
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      exactMidiKeyToCgbFreqReturnCallbacks: 7,
      exactPlyNoteReturnCallbacks: 7,
      continuationThroughPlyNoteReturnSourceCyclesPerCallback: 44,
      continuationThroughPlyNoteReturnSourceCycles: 308,
      contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles: 4127,
      contiguousPrefixThroughPlyNoteReturnSourceCycles: 4435,
      exactCompleteNoteCallbacks: 7,
      exactCompleteNoteCallbackSourceCycles: 4435,
      frequencyIwramWordStores: 7,
      statusFlagsIwramByteStores: 7,
      trackFlagsIwramByteReads: 7,
      trackFlagsIwramByteStores: 7,
      popR0R7MultipleIwramWordReads: 56,
      highRegisterRestoreThumbHalfwords: 28,
      finalPopR0SingleIwramWordReads: 7,
      nullCompleteNoteCallbacks: 75,
      nullPostCallbackGlueCallbacks: 82,
    });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.continuationThroughPlyNoteReturnSourceCycles === 44
      && row.contiguousPrefixThroughPlyNoteReturnSourceCycles > row.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles
      && row.completeNoteCallbackSourceCycles === row.contiguousPrefixThroughPlyNoteReturnSourceCycles
      && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.sourceAndElf.memoryClassClosure).toMatchObject({
      completeMPlayOpenAllocationCensus: true,
      trackStorage: "iwram",
      channelStorage: "iwram",
      stackStorage: "iwram",
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
    });
    expect(evidence.sourceAndElf.elf).toMatchObject({
      plyNote: "0x082dfd38+0x204",
      finalContinuationLabel: "0x082dff14",
      sha256: "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b",
    });
    expect(evidence.sourceAndElf.compiledRegions).toEqual([
      { role: "post-MidiKeyToCgbFreq return branch", start: "0x82dff04", endExclusive: "0x82dff06", bytes: 2, sha256: "23edb5b5af45e9490920bc4d068ce5836ebe10c64d6134b01ce11a831e358b87" },
      { role: "_081DDCDC frequency/status/track-flag writes", start: "0x82dff14", endExclusive: "0x82dff22", bytes: 14, sha256: "762979e69c1f5331dbdda90edcb0a598306c5b3bf3abc1631ca852c05643b336" },
      { role: "ply_note stack/high-register/bx epilogue", start: "0x82dff22", endExclusive: "0x82dff32", bytes: 16, sha256: "2920edd5012189df801a00c1e0704e2793fd6f7ef797baad4082e39d9b7645b2" },
    ]);
    expect(evidence.sourceAndElf.timingClasses).toMatchObject({
      sequentialThumbFetchCycles: 2,
      takenControlTransferRefillCycles: 6,
      iwramSingleByteOrWordAccessPremiumCycles: 0,
      iwramMultipleWordAccessPremiumCycles: 0,
      ewramAccessesInThisSlice: 0,
    });
    expect(evidence.closure).toMatchObject({
      durationFit: false,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
      serviceCost: null,
      constructionClock: null,
    });
    expect(readFileSync(DOC, "utf8")).toContain("**4435 aggregate cycles**");
  });

  it("regenerates v11 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v11-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v11.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v11.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v11.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
