import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import { makeEvidence, reduceMPlayCgb4AllocationPrefixTiming } from "../tools/report/factory-m4a-note-body-cgb4-v1.ts";
import type { NoteCallback } from "../tools/report/factory-m4a-note-census-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v1.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v1.md";
const callback = {
  trackIndex: 8, noteCode: 12,
  commandPointer: { role: "battle-factory-bgm-track-9", offset: 52 }, commandBytes: [91, 64, 140],
  acceptedParameters: 2, keyBefore: 91, velocityBefore: 64, keyAfter: 91, velocityAfter: 64,
  toneType: 12, toneTable: null, selectedTone: null, derivedSelector: "inline", observedSelector: "inline",
} satisfies NoteCallback;
const input = { playerPriority: 0, trackPriority: 0, cgbChannelCount: 4 } as const;

describeCgb4Evidence("Issue #55 ply_note CGB-channel-4 allocation prefix v1", () => {
  it("counts the exact post-selection route through channel pointer selection", () => {
    expect(reduceMPlayCgb4AllocationPrefixTiming(callback, input)).toEqual({
      route: "cgb-channel-4-allocation-prefix", selectedToneType: 12, selectedCgbChannelIndex: 3, effectivePriority: 0,
      executedThumbHalfwords: 21, takenPipelineRefills: 2, iwramWordReads: 2, iwramWordStores: 3,
      ewramByteReads: 3, ewramWordReads: 1, gamepakDataReads: 0, cycles: 62,
    });
  });

  it("fails closed at every route boundary", () => {
    expect(() => reduceMPlayCgb4AllocationPrefixTiming({ ...callback, toneType: 11 }, input)).toThrow(/type-12/);
    expect(() => reduceMPlayCgb4AllocationPrefixTiming(callback, { ...input, playerPriority: 1 })).toThrow(/priority/);
    expect(() => reduceMPlayCgb4AllocationPrefixTiming(callback, { ...input, trackPriority: 1 })).toThrow(/priority/);
    expect(() => reduceMPlayCgb4AllocationPrefixTiming(callback, { ...input, cgbChannelCount: 3 })).toThrow(/four channels/);
  });

  it("pins seven prefixes while every complete callback remains null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, ambiguousRows: 0, sixthPlayerIndex: 5 });
    expect(evidence.coverage).toMatchObject({ observedNoteCallbacks: 82, cgbChannel4PrefixCallbacks: 7,
      byCase: { anchor: 0, liliana: 3, "factory-varied": 4 }, sourceCyclesPerCallback: 62, sourceCycles: 434,
      exactPostSelectionPrefixCallbacks: 7, nullOtherPostSelectionCallbacks: 75, nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108 });
    expect(evidence.rows).toHaveLength(7);
    expect(evidence.rows.every((row: any) => row.completeNoteCallbackSourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({ durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null });
    expect(evidence.mixerEntryBoundary).toEqual({ frozenClassifiedTargets: 13, changed: false, noteBodyCostLicensedByFinalTarget: false });
  });

  it("regenerates evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v1-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v1.md"))).toEqual(readFileSync(DOC));
  });
});
