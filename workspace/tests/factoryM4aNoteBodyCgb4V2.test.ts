import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import { makeEvidence, reduceMPlayCgb4MutableChannelTiming } from "../tools/report/factory-m4a-note-body-cgb4-v2.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v2.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v2.md";
const base = { statusFlags: 1, priority: 0, trackRelation: "greater" as const };

describeCgb4Evidence("Issue #55 ply_note CGB-channel-4 mutable route v2", () => {
  it("source-counts every status/priority/track branch", () => {
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, statusFlags: 0 } })).toMatchObject({ route: "free-channel", executedThumbHalfwords: 4, takenPipelineRefills: 1, iwramByteReads: 1, iwramWordReads: 0, cycles: 14 });
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, statusFlags: 0x40 } })).toMatchObject({ route: "stopped-channel", executedThumbHalfwords: 7, takenPipelineRefills: 1, cycles: 20 });
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 1, state: { ...base, priority: 0 } })).toMatchObject({ route: "lower-priority-channel", executedThumbHalfwords: 11, takenPipelineRefills: 1, cycles: 28 });
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 1, state: { ...base, priority: 2 } })).toMatchObject({ route: "higher-priority-reject", executedThumbHalfwords: 13, takenPipelineRefills: 1, cycles: 32 });
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, trackRelation: "equal" } })).toMatchObject({ route: "equal-priority-track-allocate", executedThumbHalfwords: 15, takenPipelineRefills: 2, iwramByteReads: 2, iwramWordReads: 2, cycles: 42 });
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, trackRelation: "less" } })).toMatchObject({ route: "equal-priority-track-reject", executedThumbHalfwords: 16, takenPipelineRefills: 2, cycles: 44 });
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, trackRelation: "null" } })).toMatchObject({ route: "equal-priority-track-reject", cycles: 44 });
  });

  it("keeps unresolved status, priority, and track state null", () => {
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, statusFlags: null } })).toBeNull();
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, priority: null } })).toBeNull();
    expect(reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, trackRelation: null } })).toBeNull();
    expect(() => reduceMPlayCgb4MutableChannelTiming({ effectivePriority: 0, state: { ...base, statusFlags: 0x100 } })).toThrow(/status flags/);
  });

  it("closes only the seven observed callbacks and preserves complete-cost nulls", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({ observedNoteCallbacks: 82, cgbChannel4Callbacks: 7, routeCounts: { "free-channel": 5, "equal-priority-track-allocate": 2 }, exactMutableChannelRouteCallbacks: 7, nullOtherPostSelectionCallbacks: 75, nullCompleteNoteCallbacks: 82, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108, continuationSourceCycles: 154, cgb4PrefixPlusContinuationSourceCycles: 588 });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.completeNoteCallbackSourceCycles === null && row.postCallbackGlueSourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
  });

  it("regenerates the v2 receipt byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v2-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v2.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v2.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v2.md"))).toEqual(readFileSync(DOC));
  });
});
