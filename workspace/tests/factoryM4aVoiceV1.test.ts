import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence, reduceMPlayVoiceTiming } from "../tools/report/factory-m4a-voice-v1.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-voice-evidence-v1.json";
const DOC = "docs/issue55-m4a-voice-v1.md";
const callback = {
  trackIndex: 1,
  commandPointer: { role: "battle-factory-bgm-track-2", offset: 657 },
  voiceIndex: 87,
  toneTable: { role: "voicegroup_b_factory", offset: 0, bytes: 1536 },
  toneEntryOffset: 1044,
} as const;

describe("Issue #55 sixth-player ply_voice callback v1", () => {
  it("instruction-counts the complete observed GamePak tone route", () => {
    expect(reduceMPlayVoiceTiming(callback)).toEqual({
      route: "gamepak-tone-entry-fast-accept",
      sequentialThumbHalfwords: 38,
      pipelineRefills: 10,
      ewramWordAccesses: 6,
      ewramWordAccessPremiumCycles: 12,
      romCommandByteReads: 1,
      romCommandBytePremiumCycles: 7,
      romToneWordReads: 3,
      romToneWordPremiumCycles: 27,
      cycles: 182,
    });
    expect(reduceMPlayVoiceTiming({
      ...callback,
      trackIndex: 4,
      commandPointer: { role: "battle-factory-bgm-track-5", offset: 343 },
      voiceIndex: 93,
      toneEntryOffset: 1116,
    })).toMatchObject({ route: "gamepak-tone-entry-fast-accept", cycles: 182 });
  });

  it("fails closed outside the source-proven voicegroup route", () => {
    expect(() => reduceMPlayVoiceTiming({ ...callback, trackIndex: 10 })).toThrow(/trackIndex/);
    expect(() => reduceMPlayVoiceTiming({ ...callback, commandPointer: { role: "absolute-pointer", offset: 657 } })).toThrow(/commandPointer/);
    expect(() => reduceMPlayVoiceTiming({ ...callback, commandPointer: { role: "battle-factory-bgm-track-2", offset: 910 } })).toThrow(/pinned source role/);
    expect(() => reduceMPlayVoiceTiming({ ...callback, voiceIndex: 128 })).toThrow(/128 ToneData/);
    expect(() => reduceMPlayVoiceTiming({ ...callback, toneTable: { role: "voicegroup_b_pike", offset: 0, bytes: 1536 } })).toThrow(/voicegroup_b_factory/);
    expect(() => reduceMPlayVoiceTiming({ ...callback, toneTable: { role: "voicegroup_b_factory", offset: 12, bytes: 1536 } })).toThrow(/voicegroup_b_factory/);
    expect(() => reduceMPlayVoiceTiming({ ...callback, toneEntryOffset: 1045 })).toThrow(/toneEntryOffset/);
  });

  it("closes both live callbacks while preserving complete MPlay nulls", () => {
    const evidence = makeEvidence() as {
      join: Record<string, unknown>;
      coverage: Record<string, unknown> & { byCase: Record<string, unknown> };
      closure: Record<string, unknown>;
      verdict: string;
    };
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      byCase: {
        anchor: { rows: 52, onePass: 49, zeroPass: 3, callbackRows: 1, callbacks: 1 },
        liliana: { rows: 31, onePass: 30, zeroPass: 1, callbackRows: 0, callbacks: 0 },
        "factory-varied": { rows: 30, onePass: 29, zeroPass: 1, callbackRows: 1, callbacks: 1 },
      },
      rowsWithVoiceCallbacks: 2,
      voiceCallbacks: 2,
      callbackFamilySelectionCensus: { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 },
      callbackRouteCounts: { "gamepak-tone-entry-fast-accept": 2 },
      exactVoiceRowsWithinOnePass: 108,
      nullVoiceRowsWithinOnePass: 0,
      exactVoiceSourceCycleRange: { min: 0, max: 182, distinct: 2 },
      knownComponentSourceCycleRange: { min: 456, max: 865, distinct: 70 },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.closure).toMatchObject({ durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null });
    expect(evidence.verdict).toContain("2/2 callbacks");
    expect(evidence.verdict).toContain("5 exact / 108 null");
  });

  it("regenerates the committed evidence and receipt byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-voice-v1-"));
    execFileSync("node", ["--experimental-strip-types", "tools/report/factory-m4a-voice-v1.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-voice-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(directory, "issue55-m4a-voice-v1.md"))).toEqual(readFileSync(DOC));
  });
});
