import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4PostPlyNoteDispatcherTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v12.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v12.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v12.md";

const state = () => ({
  route: "ply-note-return-to-next-command-pointer",
  callback: "ply_note",
  caller: "MPlayMain",
  callSite: "dedicated-note-call",
  trackStorage: "iwram",
  waitAtCallbackEntry: 0,
} as const);

describeCgb4Evidence("Issue #55 CGB4 post-ply_note dispatcher slice v12", () => {
  it("proves the dedicated note return route through the next command-pointer load", () => {
    expect(reduceCgb4PostPlyNoteDispatcherTiming(state())).toEqual({
      route: "ply-note-return-to-next-command-pointer",
      callback: "ply_note",
      caller: "MPlayMain",
      callSite: "dedicated-note-call",
      callbackReturnTarget: "0x082dfb42",
      callbackReturnTargetOwnership: "MPlayMain dedicated note BL via call_r3",
      trackStorage: "iwram",
      waitAtCallbackEntry: 0,
      returnTargetBranchSequentialThumbHalfwords: 1,
      returnTargetBranchTakenControlTransferRefills: 1,
      returnTargetBranchSourceCycles: 8,
      waitLoopSequentialThumbHalfwords: 3,
      waitIwramByteReads: 1,
      waitZeroTakenControlTransferRefills: 1,
      waitLoopSourceCycles: 12,
      commandPointerLoadSequentialThumbHalfwords: 1,
      commandPointerIwramWordReads: 1,
      commandPointerLoadSourceCycles: 2,
      postCallbackGlueThroughCommandPointerLoadSourceCycles: 22,
      nextUnresolvedInstruction: "ldrb r1, [r2]",
      nextMissingScalar: "current command byte",
      nextMissingMemoryClass: "MusicPlayerTrack.cmdPtr target storage",
    });
  });

  it("fails closed on return ownership, route, wait, and memory-class mutations", () => {
    const base = state();
    for (const mutation of [
      { ...base, route: "generic-jump-table-return" },
      { ...base, callback: "ply_vol" },
      { ...base, caller: "ply_note" },
      { ...base, callSite: "jump-table-call" },
      { ...base, trackStorage: "ewram" },
      { ...base, waitAtCallbackEntry: 1 },
      { ...base, runtimeReturnAddress: 0x082dfb43 },
    ]) expect(reduceCgb4PostPlyNoteDispatcherTiming(mutation)).toBeNull();
  });

  it("keeps all seven v11 callbacks and their complete ply_note costs unchanged", () => {
    const v11 = JSON.parse(readFileSync("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v11.json", "utf8"));
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.rows.map((row: any) => ({
      sourceStateDigest: row.sourceStateDigest,
      completeNoteCallbackSourceCycles: row.completeNoteCallbackSourceCycles,
    }))).toEqual(v11.rows.map((row: any) => ({
      sourceStateDigest: row.sourceStateDigest,
      completeNoteCallbackSourceCycles: row.completeNoteCallbackSourceCycles,
    })));
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      exactCompleteNoteCallbacks: 7,
      exactCompleteNoteCallbackSourceCycles: 4435,
      postCallbackGlueSourceCyclesPerCallback: 22,
      exactPostCallbackGlueCallbacks: 7,
      postCallbackGlueSourceCycles: 154,
      contiguousPrefixThroughNextCommandPointerLoadSourceCycles: 4589,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 75,
      nullPostCallbackGlueCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
  });

  it("retains the exact seven-row case census and instruction/data counts", () => {
    const coverage = (makeEvidence() as any).coverage;
    expect(coverage.byCase).toEqual({
      anchor: { callbacks: 0, postCallbackGlueCycles: 0 },
      liliana: { callbacks: 3, postCallbackGlueCycles: 66 },
      "factory-varied": { callbacks: 4, postCallbackGlueCycles: 88 },
    });
    expect(coverage).toMatchObject({
      returnTargetBranches: 7,
      waitIwramByteReads: 7,
      waitZeroBranches: 7,
      commandPointerIwramWordReads: 7,
      sequentialThumbHalfwords: 35,
      takenControlTransferRefills: 14,
    });
  });

  it("leaves the first unproved command-byte discriminator and broader costs null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.capture.excluded).toContain("command byte");
    expect(evidence.closure).toMatchObject({
      nextMissingScalar: "current command byte",
      nextMissingMemoryClass: "MusicPlayerTrack.cmdPtr target storage",
      durationFit: false,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    });
    for (const row of evidence.rows) {
      expect(row.nextCommandByte).toBeNull();
      expect(row.nextCommandByteStorage).toBeNull();
      expect(row.completeMPlaySourceCycles).toBeNull();
    }
  });

  it("regenerates v12 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v12-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v12.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v12.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v12.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
