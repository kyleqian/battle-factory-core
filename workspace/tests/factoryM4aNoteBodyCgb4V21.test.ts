import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4ClockExitDecisionTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v21.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v21.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v21.md";
const PACKET_HASHES = {
  anchor: "f13515a24c83091558deacba966a4454b536d6ee06c8e82a37ef848763f576df",
  liliana: "11d4dab534db89ffdae18b9fa910594417f0535a69eb67fe739b9eb808d8e8ae",
  "factory-varied": "7adb7dfdbec2e01034c673d6c0480a78fe7165de47eda8b37bd699870d0126d2",
} as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 clock-exit r4 decision v21", () => {
  it("prices the fixed clock load/add/store/cmp/taken-branch slice without either successor", () => {
    const timing = reduceCgb4ClockExitDecisionTiming({ r4Nonzero: true });
    expect(timing).toEqual({
      route: "r4-nonzero-bne-taken",
      r4Nonzero: true,
      sequentialThumbHalfwords: 5,
      iwramWordAccesses: 2,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 1,
      sourceCycles: 16,
      selectedSuccessor: null,
    });
    expect(5626 + 3 * timing!.sourceCycles).toBe(5674);
  });

  it("retains the generic zero route but fails closed for malformed capture", () => {
    expect(reduceCgb4ClockExitDecisionTiming({ r4Nonzero: false })).toMatchObject({
      route: "r4-zero-bne-not-taken",
      sourceCycles: 10,
      takenControlTransferRefills: 0,
      selectedSuccessor: null,
    });
    expect(reduceCgb4ClockExitDecisionTiming({ r4Nonzero: 1 })).toBeNull();
    expect(reduceCgb4ClockExitDecisionTiming({ r4Nonzero: true, clock: 1 })).toBeNull();
  });

  it("joins only the three frozen v20 clear digests and leaves every successor/body field null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: { clockOffset: { offset: 12 }, storage: { class: "IWRAM COMMON_DATA MusicPlayerInfo" } },
      elf: { exit: "0x082dfbdc", successorLabel: "0x082dfbee", musicPlayerInfoClass: "IWRAM" },
      compiledRegions: [{
        role: "clock ldr; add; clock str; cmp r4, 0; bne",
        start: "0x082dfbdc",
        endExclusive: "0x082dfbe6",
        bytes: 10,
        sha256: "af8665646b46932411187a4f7a3d4a4a7a651984fa72a6c16275f626f21476cb",
      }],
      timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6, iwramWordDataAccessPremiumCycles: 0 },
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      rows: 7,
      cgb4Rows: 7,
      clockExitRows: 3,
      stoppedExistSetRows: 4,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra"],
    });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      clockExitR4NonzeroRows: 3,
      clockExitR4ZeroRows: 0,
      nullExistSetRows: 4,
      postV20ClockExitDecisionSourceCycles: 48,
      acceptedContiguousPrefixThroughFinalClearTrackExitSourceCycles: 5626,
      contiguousPrefixThroughClockExitDecisionSourceCycles: 5674,
      sequentialThumbHalfwords: 15,
      iwramWordAccesses: 6,
      takenControlTransferRefills: 3,
      selectedSuccessor: null,
      statusWriteSourceCycles: null,
      tempoOrBodySourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.containment).toEqual({
      frozenV20ArtifactsReadOnly: true,
      livePacketsAreNotProductionImports: true,
      frozenV20ArtifactsAreNotProductionImports: true,
      selectedSuccessor: null,
      statusWrite: null,
      tempoOrBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    });
    const clockRows = evidence.rows.filter((row: any) => row.clockExitDecisionRoute !== null);
    const existSetRows = evidence.rows.filter((row: any) => row.clockExitDecisionRoute === null);
    expect(clockRows).toHaveLength(3);
    expect(existSetRows).toHaveLength(4);
    for (const row of clockRows) {
      expect(row.clockExitR4Nonzero).toBe(true);
      expect(row.postV20ClockExitDecisionSourceCycles).toBe(16);
      expect(row.contiguousPrefixThroughClockExitDecisionSourceCycles).toBe(786);
      expect(row.selectedSuccessor).toBeNull();
      expect(row.statusWriteSourceCycles).toBeNull();
      expect(row.tempoOrBodySourceCycles).toBeNull();
    }
    for (const row of existSetRows) {
      expect(row.clockExitR4Nonzero).toBeNull();
      expect(row.postV20ClockExitDecisionSourceCycles).toBeNull();
      expect(row.selectedSuccessor).toBeNull();
      expect(row.statusWriteSourceCycles).toBeNull();
      expect(row.tempoOrBodySourceCycles).toBeNull();
    }
  });

  it("preserves frozen v20 artifacts and pins the paired fresh address-free packets", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.frozenInputs).toMatchObject({
      acceptedV20EvidenceSha256: "ba5fa1b0e0010ffeb65f77cbd91a6b136992f47d82300bed51dc36a4bd2014cc",
      acceptedV20DocSha256: "741d8ab64f95019fd35188aa4661b1cc3777ff5802d313445d40d95788d42c41",
      v20RegeneratesByteForByte: true,
      v20EvidenceAndReportRetainedByteForByte: true,
      packetSha256: PACKET_HASHES,
      packetRepeatSha256: PACKET_HASHES,
    });
    for (const [name, hash] of Object.entries(PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v21", `${name}.json`))).toBe(hash);
    }
  });

  it("regenerates v21 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v21-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v21.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v21.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v21.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
