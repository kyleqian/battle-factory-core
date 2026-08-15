import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4FinalClearExitTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v20.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v20.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v20.md";
const V19_EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v19.json";
const V19_DOC = "docs/issue55-m4a-note-body-cgb4-v19.md";
const V19_PACKET_HASHES = {
  anchor: "1862007858854d9b2a82220d097b3d16922fe74c426b98a13fcce7fc1297341b",
  liliana: "1d31dfc0a133556999f05fa5cdda7dac6f4be15cd8d03067a0d7f9c08a83ac0e",
  "factory-varied": "7c9978e54f814caee00d196d432c3c479981dfe9a6f5a706b583e4e8609e073d",
} as const;

const clearState = {
  r6BeforeDecrement: 2,
  postDecrementR6: 1,
  trackLoopRoute: "continue-to-next-track",
  postV16RouteSourceCycles: 4,
  nextTrackLoopSuccessorInstruction: "movs r0, MusicPlayerTrack_size",
  postV17ContinuationSourceCycles: 14,
  nextTrackLoopBodyInstruction: "ldrb r0, [r5, o_MusicPlayerTrack_flags]",
  nextTrackFlags: 0,
  nextTrackExistBranchRoute: "exist-clear-bne-not-taken-then-unconditional",
  postV18NextTrackExistDecisionSourceCycles: 16,
  stopsBeforeNextTrackSelectedSuccessor: "_081DD998",
} as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 final clear-track exit pair v20", () => {
  it("prices the second decrement and taken branch, including its branch halfword", () => {
    const timing = reduceCgb4FinalClearExitTiming(clearState);
    expect(timing).toEqual({
      route: "exist-clear-final-track-ble-taken",
      r6BeforeSecondDecrement: 1,
      postSecondDecrementR6: 0,
      sequentialThumbHalfwords: 2,
      takenControlTransferRefills: 1,
      sourceCycles: 10,
      stopsBeforeExitInstruction: "ldr r0, [r7, o_MusicPlayerInfo_clock]",
    });
    expect(5596 + 3 * timing!.sourceCycles).toBe(5626);
  });

  it("fails closed if the frozen v17/v18/v19 path is malformed or is not clear", () => {
    expect(reduceCgb4FinalClearExitTiming({ ...clearState, trackIndex: 8 })).toBeNull();
    expect(reduceCgb4FinalClearExitTiming({ ...clearState, postDecrementR6: 2 })).toBeNull();
    expect(reduceCgb4FinalClearExitTiming({ ...clearState, nextTrackFlags: 0x80 })).toBeNull();
    expect(reduceCgb4FinalClearExitTiming({ ...clearState, stopsBeforeNextTrackSelectedSuccessor: "_081DD886" })).toBeNull();
  });

  it("joins only frozen v19 source-state rows and leaves EXIST-set rows null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      rows: 7,
      cgb4Rows: 7,
      clearRows: 3,
      stoppedExistSetRows: 4,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra"],
    });
    expect(evidence.sourceAndElf).toMatchObject({
      source: { r6Preservation: { exactRoutePreservesR6: true, v18Continuation: { modifiesR6: false }, v19ClearDecision: { modifiesR6: false } } },
      elf: { loopHead: "0x082dfab4", existSetSuccessor: "0x082dfabe", existClearSuccessor: "0x082dfbd0", exit: "0x082dfbdc" },
      timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6, iwramDataAccessPremiumCycles: 0 },
      timingCrossCheck: {
        v17: { executedThumbHalfwords: 2, takenControlTransferRefills: 0, sourceCycles: 4 },
        v18: { executedThumbHalfwords: 4, takenControlTransferRefills: 1, sourceCycles: 14 },
        v19Clear: { executedThumbHalfwords: 5, takenControlTransferRefills: 1, sourceCycles: 16 },
        v20: { executedThumbHalfwords: 2, takenControlTransferRefills: 1, sourceCycles: 10 },
      },
    });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      existClearFinalExitRows: 3,
      nullExistSetRows: 4,
      r6BeforeDecrementForClearRows: 2,
      postDecrementR6ForClearRows: 1,
      postSecondDecrementR6ForClearRows: 0,
      postV19FinalClearTrackExitSourceCycles: 30,
      acceptedContiguousPrefixThroughNextTrackExistDecisionSourceCycles: 5596,
      contiguousPrefixThroughFinalClearTrackExitSourceCycles: 5626,
      sequentialThumbHalfwords: 6,
      takenControlTransferRefills: 3,
      unobservedV17ExitSuccessorSourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    const clearRows = evidence.rows.filter((row: any) => row.finalClearTrackExitRoute !== null);
    const existSetRows = evidence.rows.filter((row: any) => row.finalClearTrackExitRoute === null);
    expect(clearRows).toHaveLength(3);
    expect(existSetRows).toHaveLength(4);
    for (const row of clearRows) {
      expect(row.r6BeforeDecrement).toBe(2);
      expect(row.postDecrementR6).toBe(1);
      expect(row.r6PreservedThroughV18AndV19ClearRoute).toBe(true);
      expect(row.r6BeforeSecondDecrement).toBe(1);
      expect(row.postSecondDecrementR6).toBe(0);
      expect(row.postV19FinalClearTrackExitSourceCycles).toBe(10);
      expect(row.stopsBeforeV20SelectedSuccessor).toBe("_081DD9A4");
    }
    for (const row of existSetRows) {
      expect(row.postV19FinalClearTrackExitSourceCycles).toBeNull();
      expect(row.stopsBeforeV20SelectedSuccessor).toBe("_081DD886");
    }
    expect(evidence.capture.excluded).toEqual(expect.arrayContaining([
      "oracle data", "MusicPlayerInfo.clock", "track identity", "track index", "MusicPlayerInfo.trackCount", "channel state", "exit body",
    ]));
  });

  it("keeps frozen v19 evidence, report, and packets byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v19-retain-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v19.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v19.json")).equals(readFileSync(V19_EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v19.md")).equals(readFileSync(V19_DOC))).toBe(true);
    for (const [name, hash] of Object.entries(V19_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v19", `${name}.json`))).toBe(hash);
    }
  });

  it("regenerates v20 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v20-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v20.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v20.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v20.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
