import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4PostPlyNoteLfoSpeedTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v14.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v14.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v14.md";

describe("Issue #55 CGB4 post-ply_note lfoSpeed discriminator v14", () => {
  it("prices the observed nonzero-lfoSpeed decision without reading mod", () => {
    expect(reduceCgb4PostPlyNoteLfoSpeedTiming({ lfoSpeed: 0x2c })).toEqual({
      route: "nonzero-lfo-speed-continues",
      lfoSpeed: 0x2c,
      sequentialThumbHalfwords: 3,
      takenControlTransferRefills: 0,
      iwramByteReads: 1,
      sourceCycles: 6,
      nextUnresolvedInstruction: "ldrb r0, [r5, o_MusicPlayerTrack_mod]",
      nextMissingScalar: "MusicPlayerTrack.mod",
    });
    expect(reduceCgb4PostPlyNoteLfoSpeedTiming({ lfoSpeed: 1 })?.sourceCycles).toBe(6);
  });

  it("fails closed on zero, malformed, and identity-bearing lfoSpeed states", () => {
    expect(reduceCgb4PostPlyNoteLfoSpeedTiming({ lfoSpeed: 0 })).toBeNull();
    expect(() => reduceCgb4PostPlyNoteLfoSpeedTiming({ lfoSpeed: 0x100 })).toThrow("lfoSpeed must be u8");
    expect(reduceCgb4PostPlyNoteLfoSpeedTiming({ lfoSpeed: 0x16, address: 0x03000000 })).toBeNull();
  });

  it("joins exactly the frozen seven callbacks and stops before mod", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      lfoSpeedHistogram: { "44": 7 },
      postV13RouteSourceCyclesPerCallback: 6,
      postV13RouteSourceCycles: 42,
      contiguousPrefixThroughLfoSpeedDecisionSourceCycles: 5254,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    for (const row of evidence.rows) {
      expect(row.lfoSpeed).toBeGreaterThan(0);
      expect(row.nextMod).toBeNull();
      expect(row.completeMPlaySourceCycles).toBeNull();
    }
  });

  it("regenerates v14 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v14-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v14.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v14.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v14.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
