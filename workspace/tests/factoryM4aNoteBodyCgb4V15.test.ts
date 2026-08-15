import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4PostPlyNoteModTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v15.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v15.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v15.md";

describeCgb4Evidence("Issue #55 CGB4 post-ply_note mod discriminator v15", () => {
  it("prices the observed zero-mod decision without reading lfoDelayC", () => {
    expect(reduceCgb4PostPlyNoteModTiming({ mod: 0 })).toEqual({
      route: "zero-mod-exits",
      mod: 0,
      sequentialThumbHalfwords: 3,
      takenControlTransferRefills: 1,
      iwramByteReads: 1,
      sourceCycles: 12,
      nextUnresolvedInstruction: "mov r3, sl",
      nextMissingScalar: null,
    });
    expect(reduceCgb4PostPlyNoteModTiming({ mod: 1 })).toBeNull();
  });

  it("fails closed on nonzero, malformed, and identity-bearing mod states", () => {
    expect(reduceCgb4PostPlyNoteModTiming({ mod: 1 })).toBeNull();
    expect(() => reduceCgb4PostPlyNoteModTiming({ mod: 0x100 })).toThrow("mod must be u8");
    expect(reduceCgb4PostPlyNoteModTiming({ mod: 0, address: 0x03000000 })).toBeNull();
  });

  it("joins exactly the frozen seven callbacks and skips lfoDelayC", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      modHistogram: { "0": 7 },
      postV14RouteSourceCyclesPerCallback: 12,
      postV14RouteSourceCycles: 84,
      contiguousPrefixThroughModDecisionSourceCycles: 5338,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    for (const row of evidence.rows) {
      expect(row.mod).toBe(0);
      expect(row.nextLfoDelayC).toBeNull();
      expect(row.completeMPlaySourceCycles).toBeNull();
    }
  });

  it("regenerates v15 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v15-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v15.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v15.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v15.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
