import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import { makeEvidence, reduceMPlayCgb4AllocationBodyTiming } from "../tools/report/factory-m4a-note-body-cgb4-v3.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v3.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v3.md";
const emptyChannel = { currentRole: "cgb-channel-3", trackRole: null, previousRole: null, nextRole: null, trackChanRole: null, lfoDelay: 0 } as const;

describeCgb4Evidence("Issue #55 ply_note CGB-channel-4 allocation body v3", () => {
  it("source-counts track-null, owned-channel, and linked-next routes while stopping before helpers", () => {
    expect(reduceMPlayCgb4AllocationBodyTiming(emptyChannel)).toMatchObject({ route: "allocation-body-before-TrkVolPitSet", clearChainRoute: "track-null", bodySequentialThumbHalfwords: 15, bodyPipelineRefills: 3, bodyCycles: 48, clearChainSourceCycles: 63, cycles: 111, lfoDelay: 0, lfoDelayC: 0, helperBoundary: "TrkVolPitSet-entry" });
    expect(reduceMPlayCgb4AllocationBodyTiming({ ...emptyChannel, trackRole: "music-player-5-track-8" })).toMatchObject({ clearChainRoute: "previous-null-next-null", bodyCycles: 48, clearChainSourceCycles: 87, cycles: 135 });
    expect(reduceMPlayCgb4AllocationBodyTiming({ ...emptyChannel, trackChanRole: "cgb-channel-0" })).toMatchObject({ bodyPipelineRefills: 2, bodyCycles: 42, cycles: 105 });
    expect(reduceMPlayCgb4AllocationBodyTiming({ ...emptyChannel, lfoDelay: 1 })).toBeNull();
  });

  it("closes only the seven observed callbacks and preserves complete-cost nulls", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({ observedNoteCallbacks: 82, cgbChannel4Callbacks: 7, allocationBodyRouteCounts: { "track-null": 5, "previous-null-next-null": 2 }, lfoBranchCounts: { "TrkVolPitSet-entry": 7, clear_modM: 0 }, exactAllocationBodyCallbacks: 7, nullOtherPostSelectionCallbacks: 75, nullCompleteNoteCallbacks: 82, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108, allocationBodySourceCycleRange: { min: 111, max: 135, distinct: 2 }, allocationBodySourceCycles: 825, acceptedPrefixAndMutableSourceCycles: 588, knownPrefixThroughAllocationBodySourceCycles: 1413 });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
    expect(readFileSync(DOC, "utf8")).toContain(`**${evidence.coverage.allocationBodySourceCycles} total**`);
  });

  it("regenerates the v3 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v3-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v3.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v3.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v3.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
