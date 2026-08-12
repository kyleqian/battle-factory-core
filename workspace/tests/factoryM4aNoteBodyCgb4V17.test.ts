import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4TrackLoopDecrementTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v17.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v17.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v17.md";

describe("Issue #55 CGB4 track-loop decrement and decision v17", () => {
  it("prices the exact continuation and exit instruction-pair routes", () => {
    expect(reduceCgb4TrackLoopDecrementTiming({ r6BeforeDecrement: 3 })).toEqual({
      route: "continue-to-next-track",
      r6BeforeDecrement: 3,
      postDecrementR6: 2,
      sequentialThumbHalfwords: 2,
      takenControlTransferRefills: 0,
      sourceCycles: 4,
      nextUnresolvedInstruction: "movs r0, MusicPlayerTrack_size",
    });
    expect(reduceCgb4TrackLoopDecrementTiming({ r6BeforeDecrement: 1 })).toEqual({
      route: "exit-after-final-track",
      r6BeforeDecrement: 1,
      postDecrementR6: 0,
      sequentialThumbHalfwords: 2,
      takenControlTransferRefills: 1,
      sourceCycles: 10,
      nextUnresolvedInstruction: "ldr r0, [r7, o_MusicPlayerInfo_clock]",
    });
  });

  it("fails closed on malformed or identity-bearing counter state", () => {
    expect(() => reduceCgb4TrackLoopDecrementTiming({ r6BeforeDecrement: 0x100 })).toThrow("r6BeforeDecrement must be u8");
    expect(reduceCgb4TrackLoopDecrementTiming({ r6BeforeDecrement: 2, trackIndex: 8 })).toBeNull();
  });

  it("joins only the frozen seven v16 source-state rows", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      r6BeforeDecrementHistogram: { "2": 3, "3": 4 },
      postDecrementR6Histogram: { "1": 3, "2": 4 },
      continuationRouteRows: 7,
      exitRouteRows: 0,
      postV16RouteSourceCycles: 28,
      contiguousPrefixThroughTrackLoopDecrementSourceCycles: 5394,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.frozenInputs).toMatchObject({
      acceptedV16EvidenceSha256: "f9d539accd76f00a489c0854c175db91269bf853764f4a7e8fd7a88c9219ec2c",
      acceptedV16DocSha256: "3fbb25e2cabf12f9841d7821953630512306b2fc753629c5246e2537f9a53763",
      v16RegeneratesByteForByte: true,
    });
    for (const row of evidence.rows) {
      expect(row.trackLoopRoute).toBe("continue-to-next-track");
      expect(row.postV16RouteSourceCycles).toBe(4);
      expect(row.nextTrackLoopSuccessorInstruction).toBe("movs r0, MusicPlayerTrack_size");
      expect(row.completeMPlaySourceCycles).toBeNull();
    }
  });

  it("regenerates v17 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v17-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v17.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v17.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v17.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
