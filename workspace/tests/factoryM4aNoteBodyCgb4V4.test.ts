import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayTrkVolPitSetTiming } from "../tools/report/factory-m4a-note-body-cgb4-v4.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v4.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v4.md";
const observedVolume = { vol: 47, volX: 64, pan: 63, panX: 0, modT: 0 } as const;

describe("Issue #55 ply_note CGB-channel-4 TrkVolPitSet helper v4", () => {
  it("source-counts only the two observed helper routes", () => {
    expect(reduceMPlayTrkVolPitSetTiming({ flags: 0x80 })).toEqual({
      route: "flags-clear",
      flagsBefore: 0x80,
      flagsAfter: 0x80,
      volumeOperands: null,
      sequentialThumbHalfwords: 19,
      pipelineRefills: 3,
      dataAccessPremiumCycles: 0,
      cycles: 56,
    });
    expect(reduceMPlayTrkVolPitSetTiming({ flags: 0x83, volume: observedVolume })).toEqual({
      route: "volume-and-clear-observed",
      flagsBefore: 0x83,
      flagsAfter: 0x82,
      volumeOperands: observedVolume,
      sequentialThumbHalfwords: 51,
      pipelineRefills: 6,
      dataAccessPremiumCycles: 0,
      cycles: 138,
    });
  });

  it("fails closed outside the proved source routes and rejects malformed operands", () => {
    expect(reduceMPlayTrkVolPitSetTiming({ flags: 0x81 })).toBeNull();
    expect(reduceMPlayTrkVolPitSetTiming({ flags: 0x80, volume: observedVolume })).toBeNull();
    expect(reduceMPlayTrkVolPitSetTiming({ flags: 0x83 })).toBeNull();
    expect(reduceMPlayTrkVolPitSetTiming({ flags: 0x83, volume: { ...observedVolume, modT: 1 } })).toBeNull();
    expect(reduceMPlayTrkVolPitSetTiming({ flags: 0x83, volume: { ...observedVolume, pan: 64 } })).toBeNull();
    expect(() => reduceMPlayTrkVolPitSetTiming({ flags: 0x83, volume: { ...observedVolume, vol: 256 } })).toThrow(/volume\.vol must be u8/);
    expect(() => reduceMPlayTrkVolPitSetTiming(null)).toThrow(/state must be an object/);
    expect(() => reduceMPlayTrkVolPitSetTiming({ flags: "0x80" })).toThrow(/flags must be u8/);
  });

  it("preserves the frozen v3 join and closes seven post-prologue helper components", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      trkVolPitSetRouteCounts: { "flags-clear": 5, "volume-and-clear-observed": 2 },
      exactTrkVolPitSetCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
      trkVolPitSetSourceCycleRange: { min: 56, max: 138, distinct: 2 },
      trkVolPitSetSourceCycles: 556,
      acceptedPrefixThroughAllocationBodySourceCycles: 1413,
      knownComponentSumIncludingTrkVolPitSetSourceCycles: 1969,
      contiguousPrefixThroughTrkVolPitSetSourceCycles: null,
    });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.sourceAndElf.sourceCycleAccounting).toMatchObject({
      flagsClear: { sequentialThumbHalfwords: 19, pipelineRefills: 3, totalCycles: 56 },
      volumeAndClearObserved: { sequentialThumbHalfwords: 51, pipelineRefills: 6, totalCycles: 138 },
      callerBlHelperPrologueAndPostHelperAllocationFields: null,
    });
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
    expect(readFileSync(DOC, "utf8")).toContain("**556 cycles**");
    expect(readFileSync(DOC, "utf8")).toContain("this is not a contiguous prefix");
  });

  it("regenerates the v4 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v4-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v4.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v4.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v4.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
