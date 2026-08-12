import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4NextTrackExistTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v19.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v19.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v19.md";
const V18_EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v18.json";
const V18_DOC = "docs/issue55-m4a-note-body-cgb4-v18.md";
const V17_PACKET_HASHES = {
  anchor: "5dca04f71abce9fd90bbe8737eb656b2d28d1e22612e0ec66b75e11ec22fdd11",
  liliana: "68fb3aa3ffe2252711528a0d17d4697ea66a6c1a13246f8091e43d0b7c7ffe31",
  "factory-varied": "e5e3ce1a0795710e921161fe4046e81627afc822fd6562c3d15a1cd233aac808",
} as const;
const V19_PACKET_HASHES = {
  anchor: "1862007858854d9b2a82220d097b3d16922fe74c426b98a13fcce7fc1297341b",
  liliana: "1d31dfc0a133556999f05fa5cdda7dac6f4be15cd8d03067a0d7f9c08a83ac0e",
  "factory-varied": "7c9978e54f814caee00d196d432c3c479981dfe9a6f5a706b583e4e8609e073d",
} as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const takenState = {
  flags: 0x80,
  directBranchEvidence: {
    branchInstruction: "MPlayMain._081DD884:bne _081DD886",
    r0AfterFlagsLoad: 0x80,
    r1ExistMask: 0x80,
    tstZero: false,
    branchRoute: "bne-taken-to-_081DD886",
    selectedSuccessor: "_081DD886",
  },
} as const;

const clearState = {
  flags: 0,
  directBranchEvidence: {
    branchInstruction: "MPlayMain._081DD884:bne _081DD886",
    r0AfterFlagsLoad: 0,
    r1ExistMask: 0x80,
    tstZero: true,
    branchRoute: "bne-not-taken-then-b-_081DD998",
    selectedSuccessor: "_081DD998",
  },
} as const;

describe("Issue #55 CGB4 next-track MPT_FLG_EXIST v19", () => {
  it("prices exactly the two direct branch routes and the red-first aggregate", () => {
    expect(reduceCgb4NextTrackExistTiming(takenState)).toEqual({
      route: "exist-set-bne-taken",
      flags: 0x80,
      sequentialThumbHalfwords: 3,
      takenControlTransferRefills: 1,
      sourceCycles: 12,
      stopsBeforeSelectedSuccessor: "_081DD886",
    });
    expect(reduceCgb4NextTrackExistTiming(clearState)).toEqual({
      route: "exist-clear-bne-not-taken-then-unconditional",
      flags: 0,
      sequentialThumbHalfwords: 4,
      takenControlTransferRefills: 1,
      sourceCycles: 14,
      stopsBeforeSelectedSuccessor: "_081DD998",
    });
    expect(5492 + 4 * 12 + 3 * 14).toBe(5582);
  });

  it("fails closed on malformed, reordered-field, or identity-bearing branch state", () => {
    expect(reduceCgb4NextTrackExistTiming({ ...takenState, trackIndex: 8 })).toBeNull();
    expect(reduceCgb4NextTrackExistTiming({
      ...takenState,
      directBranchEvidence: { ...takenState.directBranchEvidence, r5: 0x03000000 },
    })).toBeNull();
    expect(reduceCgb4NextTrackExistTiming({
      ...clearState,
      directBranchEvidence: { ...clearState.directBranchEvidence, tstZero: false },
    })).toBeNull();
  });

  it("joins only the frozen seven v18 continuation rows by sourceStateDigest", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      rows: 7,
      cgb4Rows: 7,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra"],
    });
    expect(evidence.sourceAndElf).toMatchObject({
      elf: { loopHead: "0x082dfab4", existSetSuccessor: "0x082dfabe", existClearSuccessor: "0x082dfbd0" },
      compiledRegions: [{
        role: "ldrb flags; movs MPT_FLG_EXIST; tst; bne _081DD886; b _081DD998",
        start: "0x082dfab4",
        endExclusive: "0x082dfabe",
        bytes: 10,
        sha256: "8b3d8e5e87469159a1db98d7c5a67f9092b318082356dc422b6655faa673796a",
      }],
      timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6, iwramDataAccessPremiumCycles: 0 },
    });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      nextTrackFlagsHistogram: { "0": 3, "128": 4 },
      existSetRouteRows: 4,
      existClearRouteRows: 3,
      postV18NextTrackExistDecisionSourceCycles: 90,
      acceptedContiguousPrefixThroughTrackLoopContinuationSourceCycles: 5492,
      contiguousPrefixThroughNextTrackExistDecisionSourceCycles: 5582,
      sequentialThumbHalfwords: 24,
      takenControlTransferRefills: 7,
      unobservedV17ExitSuccessorSourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.frozenInputs).toMatchObject({
      acceptedV18EvidenceSha256: "812f3f497a7842f9d57e4c8bb54f89c0fcae5fae943faa1e0c59c9a39fe960b3",
      acceptedV18DocSha256: "9e10b6d559a2d5764ce6e59ec0e9b2621671ba7ab6d41bfd829cd7169f0e0a01",
      v18RegeneratesByteForByte: true,
      frozenV17PacketSha256: V17_PACKET_HASHES,
      packetSha256: V19_PACKET_HASHES,
      packetRepeatSha256: V19_PACKET_HASHES,
      packetsByteIdenticalAcrossFreshRuns: true,
    });
    for (const row of evidence.rows) {
      expect(row.nextTrackFlags === 0 || row.nextTrackFlags === 0x80).toBe(true);
      expect(["exist-set-bne-taken", "exist-clear-bne-not-taken-then-unconditional"]).toContain(row.nextTrackExistBranchRoute);
      expect(["_081DD886", "_081DD998"]).toContain(row.stopsBeforeNextTrackSelectedSuccessor);
      expect(row.completeMPlaySourceCycles).toBeNull();
    }
    expect(evidence.capture.excluded).toEqual(expect.arrayContaining([
      "next-track identity", "MusicPlayerInfo.trackCount", "r5", "channel pointer", "channel status", "gateTime", "start flag", "command pointer", "later loop body", "unobserved v17 exit successor",
    ]));
  });

  it("keeps frozen v18 evidence/report and v17 packets byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v18-retain-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v18.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v18.json")).equals(readFileSync(V18_EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v18.md")).equals(readFileSync(V18_DOC))).toBe(true);
    for (const [name, hash] of Object.entries(V17_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v17", `${name}.json`))).toBe(hash);
    }
  });

  it("regenerates v19 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v19-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v19.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v19.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v19.md")).equals(readFileSync(DOC))).toBe(true);
    for (const [name, hash] of Object.entries(V19_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v19", `${name}.json`))).toBe(hash);
    }
  });
});
