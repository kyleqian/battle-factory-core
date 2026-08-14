import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4PostPlyNoteWaitTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v13.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v13.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v13.md";

describeCgb4Evidence("Issue #55 CGB4 post-ply_note command discriminator v13", () => {
  it("prices the observed GamePak wait-command route through wait decrement", () => {
    expect(reduceCgb4PostPlyNoteWaitTiming({ commandByte: 0x86, storageClass: "gamepak-ws0" })).toEqual({
      route: "encoded-wait-through-decrement",
      commandByte: 0x86,
      storageClass: "gamepak-ws0",
      waitValueBeforeDecrement: 6,
      waitValueAfterDecrement: 5,
      sequentialThumbHalfwords: 21,
      takenControlTransferRefills: 4,
      gamePakByteReads: 2,
      gamePakLiteralWordReads: 1,
      iwramWordStores: 1,
      iwramByteReads: 1,
      iwramByteStores: 2,
      sourceCycles: 89,
      nextUnresolvedInstruction: "ldrb r1, [r5, o_MusicPlayerTrack_lfoSpeed]",
    });
  });

  it("fails closed on malformed storage, non-wait commands, and packet mutation", () => {
    expect(reduceCgb4PostPlyNoteWaitTiming({ commandByte: 0x86, storageClass: "ewram" })).toBeNull();
    expect(reduceCgb4PostPlyNoteWaitTiming({ commandByte: 0xb1, storageClass: "gamepak-ws0" })).toBeNull();
    expect(reduceCgb4PostPlyNoteWaitTiming({ commandByte: 0x86, storageClass: "gamepak-ws0", address: 0x08000000 })).toBeNull();
  });

  it("joins exactly the frozen seven callbacks and stops before lfoSpeed", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({ key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      commandByteHistogram: { "134": 2, "140": 3, "146": 2 },
      storageClassHistogram: { "gamepak-ws0": 7 },
      postV12RouteSourceCyclesPerCallback: 89,
      postV12RouteSourceCycles: 623,
      contiguousPrefixThroughWaitDecrementSourceCycles: 5212,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    for (const row of evidence.rows) {
      expect(row.nextLfoSpeed).toBeNull();
      expect(row.completeMPlaySourceCycles).toBeNull();
    }
  });

  it("regenerates v13 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v13-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v13.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v13.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v13.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
