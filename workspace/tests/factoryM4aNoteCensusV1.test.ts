import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayRhythmToneSelectionTiming, type NoteCallback } from "../tools/report/factory-m4a-note-census-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-census-evidence-v1.json";
const DOC = "docs/issue55-m4a-note-census-v1.md";
const rhythm = {
  trackIndex: 6, noteCode: 12,
  commandPointer: { role: "battle-factory-bgm-track-7", offset: 1029 }, commandBytes: [152, 180, 179],
  acceptedParameters: 0, keyBefore: 36, velocityBefore: 112, keyAfter: 36, velocityAfter: 112,
  toneType: 128, toneTable: { role: "voicegroup_frlg_drumset-midi-index-base", offset: 0 },
  selectedTone: { index: 36, scalarBytes: [8, 64, 0, 192, 255, 0, 255, 0] },
  derivedSelector: "rhythm", observedSelector: "rhythm",
} satisfies NoteCallback;

describe("Issue #55 sixth-player ply_note census and rhythm prefix v1", () => {
  it("instruction-counts both observed rhythm parameter routes", () => {
    expect(reduceMPlayRhythmToneSelectionTiming(rhythm)).toMatchObject({
      route: "rhythm-midi-key-drumset", acceptedParameters: 0, sequentialThumbHalfwords: 56,
      pipelineRefills: 4, romLiteralLoads: 2, ewramWordAccesses: 2, gamepakByteReads: 5,
      cycles: 193, selectedMidiKey: 36, selectedToneType: 8, rhythmPan: 0,
    });
    expect(reduceMPlayRhythmToneSelectionTiming({
      ...rhythm, noteCode: 3, commandPointer: { role: "battle-factory-bgm-track-7", offset: 287 },
      commandBytes: [54, 20, 131], acceptedParameters: 2, keyAfter: 54, velocityAfter: 20,
      selectedTone: { index: 54, scalarBytes: [8, 64, 0, 162, 255, 127, 77, 204] },
    })).toMatchObject({ acceptedParameters: 2, sequentialThumbHalfwords: 67, pipelineRefills: 4,
      ewramWordAccesses: 3, gamepakByteReads: 7, cycles: 231, selectedMidiKey: 54, selectedToneType: 8, rhythmPan: -60 });
  });

  it("fails closed outside pinned source and selector state", () => {
    expect(() => reduceMPlayRhythmToneSelectionTiming({ ...rhythm, observedSelector: "inline" })).toThrow(/rhythm selector/);
    expect(() => reduceMPlayRhythmToneSelectionTiming({ ...rhythm, commandBytes: [36, 112, 152] })).toThrow(/pinned song/);
    expect(() => reduceMPlayRhythmToneSelectionTiming({ ...rhythm, toneTable: { role: "absolute-pointer", offset: 0 } })).toThrow(/table role/);
    expect(() => reduceMPlayRhythmToneSelectionTiming({ ...rhythm, selectedTone: { ...rhythm.selectedTone, index: 54 } })).toThrow(/MIDI-key/);
  });

  it("pins the full callback census and only closes the rhythm prefix", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      byCase: {
        anchor: { onePass: 49, zeroPass: 3, callbackRows: 12, callbacks: 33, routes: { inline: 30, rhythm: 3, keysplit: 0 } },
        liliana: { onePass: 30, zeroPass: 1, callbackRows: 10, callbacks: 24, routes: { inline: 13, rhythm: 11, keysplit: 0 } },
        "factory-varied": { onePass: 29, zeroPass: 1, callbackRows: 12, callbacks: 25, routes: { inline: 14, rhythm: 11, keysplit: 0 } },
      },
      noteCallbacks: 82, noteRouteCounts: { inline: 57, rhythm: 25, keysplit: 0 },
      smallestObservedRoute: "rhythm", rhythmCallbacksSourceClosed: 25,
      rhythmParameterCounts: { "0": 2, "2": 23 }, rhythmCallbackSourceCycleCounts: { "193": 2, "231": 23 },
      exactRhythmPrefixRowsWithinOnePass: 108, nullCompleteNoteRowsWithinOnePass: 108,
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows.filter((row: any) => row.passCount === 1).every((row: any) => row.completeNoteCallbacksSourceCycles === null && row.completeMPlaySourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({ durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null });
  });

  it("regenerates evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-census-v1-"));
    execFileSync("node", ["--experimental-strip-types", "tools/report/factory-m4a-note-census-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-census-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-note-census-v1.md"))).toEqual(readFileSync(DOC));
  });
});
