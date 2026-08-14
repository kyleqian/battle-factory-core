import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import { makeEvidence, reduceCgb4TrackLoopExitMovesTiming } from "../tools/report/factory-m4a-note-body-cgb4-v16.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v16.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v16.md";

describeCgb4Evidence("Issue #55 CGB4 track-loop exit moves v16", () => {
  it("prices only mov-r3-from-sl then mov-r4-from-fp", () => {
    expect(reduceCgb4TrackLoopExitMovesTiming()).toEqual({
      route: "restore-track-loop-registers",
      sequentialThumbHalfwords: 2,
      sourceCycles: 4,
      nextUnresolvedInstruction: "subs r6, 0x1",
    });
  });

  it("joins only the frozen seven v15 source-state rows", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      postV15RouteSourceCyclesPerCallback: 4,
      postV15RouteSourceCycles: 28,
      contiguousPrefixThroughTrackLoopExitMovesSourceCycles: 5366,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    for (const row of evidence.rows) {
      expect(row.postV15RouteSourceCycles).toBe(4);
      expect(row.nextTrackLoopCount).toBeNull();
      expect(row.completeMPlaySourceCycles).toBeNull();
    }
  });

  it("regenerates v16 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v16-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v16.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v16.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v16.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
