import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayInlineToneSelectionTiming, reduceMPlayRhythmToneSelectionTiming, type NoteCallback } from "../tools/report/factory-m4a-note-census-v1.ts";

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
const inline = {
  trackIndex: 5, noteCode: 5,
  commandPointer: { role: "battle-factory-bgm-track-6", offset: 1381 }, commandBytes: [62, 140, 191],
  acceptedParameters: 1, keyBefore: 74, velocityBefore: 112, keyAfter: 62, velocityAfter: 112,
  toneType: 10, toneTable: null, selectedTone: null,
  derivedSelector: "inline", observedSelector: "inline",
} satisfies NoteCallback;

describe("Issue #55 sixth-player ply_note selector prefixes v1", () => {
  it("instruction-counts all three observed inline parameter routes", () => {
    expect(reduceMPlayInlineToneSelectionTiming({
      ...inline, trackIndex: 1, noteCode: 1,
      commandPointer: { role: "battle-factory-bgm-track-2", offset: 649 }, commandBytes: [134, 52, 134],
      acceptedParameters: 0, keyBefore: 40, keyAfter: 40, toneType: 11,
    })).toMatchObject({ route: "inline-track-tone", acceptedParameters: 0, sequentialThumbHalfwords: 30,
      pipelineRefills: 2, romLiteralLoads: 2, ewramWordAccesses: 2, gamepakByteReads: 2,
      cycles: 108, selectedMidiKey: 40, selectedToneType: 11 });
    expect(reduceMPlayInlineToneSelectionTiming(inline)).toMatchObject({ route: "inline-track-tone",
      acceptedParameters: 1, sequentialThumbHalfwords: 36, pipelineRefills: 2, romLiteralLoads: 2,
      ewramWordAccesses: 3, gamepakByteReads: 3, cycles: 129, selectedMidiKey: 62, selectedToneType: 10 });
    expect(reduceMPlayInlineToneSelectionTiming({
      ...inline, trackIndex: 2, noteCode: 6,
      commandPointer: { role: "battle-factory-bgm-track-3", offset: 734 }, commandBytes: [54, 112, 134],
      acceptedParameters: 2, keyBefore: 40, velocityBefore: 80, keyAfter: 54, velocityAfter: 112, toneType: 0,
    })).toMatchObject({ route: "inline-track-tone", acceptedParameters: 2, sequentialThumbHalfwords: 41,
      pipelineRefills: 2, romLiteralLoads: 2, ewramWordAccesses: 3, gamepakByteReads: 4,
      cycles: 146, selectedMidiKey: 54, selectedToneType: 0 });
  });

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
    expect(() => reduceMPlayInlineToneSelectionTiming({ ...inline, observedSelector: "rhythm" })).toThrow(/inline selector/);
    expect(() => reduceMPlayInlineToneSelectionTiming({ ...inline, toneType: 0x40 })).toThrow(/inline selector/);
    expect(() => reduceMPlayInlineToneSelectionTiming({ ...inline, commandBytes: [63, 140, 191] })).toThrow(/pinned song/);
    expect(() => reduceMPlayInlineToneSelectionTiming({ ...inline, acceptedParameters: 2 })).toThrow(/parameter result/);
    expect(() => reduceMPlayInlineToneSelectionTiming({ ...inline, toneTable: { role: "unexpected", offset: 0 } })).toThrow(/retain/);
    expect(() => reduceMPlayInlineToneSelectionTiming({ ...inline, selectedTone: { index: 62, scalarBytes: [] } })).toThrow(/retain/);
  });

  it("pins the full callback census and closes only the selector prefixes", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      byCase: {
        anchor: { onePass: 49, zeroPass: 3, callbackRows: 12, callbacks: 33, routes: { inline: 30, rhythm: 3, keysplit: 0 } },
        liliana: { onePass: 30, zeroPass: 1, callbackRows: 10, callbacks: 24, routes: { inline: 13, rhythm: 11, keysplit: 0 } },
        "factory-varied": { onePass: 29, zeroPass: 1, callbackRows: 12, callbacks: 25, routes: { inline: 14, rhythm: 11, keysplit: 0 } },
      },
      noteCallbacks: 82, noteRouteCounts: { inline: 57, rhythm: 25, keysplit: 0 },
      smallestObservedRoute: "rhythm", inlineCallbacksSourceClosed: 57, rhythmCallbacksSourceClosed: 25,
      inlineParameterCounts: { "0": 3, "1": 41, "2": 13 }, inlineCallbackSourceCycleCounts: { "108": 3, "129": 41, "146": 13 }, inlineToneSelectionSourceCycles: 7511,
      rhythmParameterCounts: { "0": 2, "2": 23 }, rhythmCallbackSourceCycleCounts: { "193": 2, "231": 23 }, rhythmToneSelectionSourceCycles: 5699,
      exactToneSelectionPrefixRowsWithinOnePass: 108, nullCompleteNoteRowsWithinOnePass: 108,
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows.filter((row: any) => row.passCount === 1).every((row: any) => row.completeNoteCallbacksSourceCycles === null && row.completeMPlaySourceCycles === null)).toBe(true);
    expect(evidence.closure).toMatchObject({
      remainingDiscriminator: expect.stringContaining("remainder of every note callback after tone selection"),
      durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null,
    });
  });

  it("regenerates evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-census-v1-"));
    execFileSync("node", ["--experimental-strip-types", "tools/report/factory-m4a-note-census-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-census-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-note-census-v1.md"))).toEqual(readFileSync(DOC));
  });
});
