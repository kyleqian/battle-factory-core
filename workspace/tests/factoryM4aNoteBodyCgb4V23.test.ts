import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4SubtractionResultTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v23.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v23.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v23.md";
const V21_PACKET_HASHES = {
  anchor: "f13515a24c83091558deacba966a4454b536d6ee06c8e82a37ef848763f576df",
  liliana: "11d4dab534db89ffdae18b9fa910594417f0535a69eb67fe739b9eb808d8e8ae",
  "factory-varied": "7adb7dfdbec2e01034c673d6c0480a78fe7165de47eda8b37bd699870d0126d2",
} as const;
const V23_PACKET_HASHES = {
  anchor: "fc84cabe947400f547b75370444f0bb60d9388989b70efe7658dd7fae9521b6e",
  liliana: "f506f1e90308d458047f7cb501399d2b1c884b1d026d57c82f771efb47b2ab7e",
  "factory-varied": "9019c3faebbfa776ba428498f1a41c2a69ff269c1a1e4bba737d80cd91a1a5dc",
} as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 post-subs store/compare/branch v23", () => {
  it("prices the observed bcc-taken route using the scalar alone", () => {
    expect(reduceCgb4SubtractionResultTiming({ subtractionResult: 72 })).toEqual({
      route: "bcc-taken-to-_081DD9C4",
      subtractionResult: 72,
      sequentialThumbHalfwords: 3,
      iwramHalfwordStores: 1,
      iwramDataAccessPremiumCycles: 0,
      bccTakenControlTransferRefills: 1,
      unconditionalBranchTakenControlTransferRefills: 0,
      takenControlTransferRefills: 1,
      sourceCycles: 12,
      stopsBeforeInstruction: "_081DD9C4: ldrb r2, [r7, o_MusicPlayerInfo_trackCount]",
    });
    expect(5692 + 3 * 12).toBe(5728);
  });

  it("includes the immediate unconditional branch when bcc is not taken, then stops before its body", () => {
    expect(reduceCgb4SubtractionResultTiming({ subtractionResult: 150 })).toEqual({
      route: "bcc-not-taken-then-b-to-_081DD874",
      subtractionResult: 150,
      sequentialThumbHalfwords: 4,
      iwramHalfwordStores: 1,
      iwramDataAccessPremiumCycles: 0,
      bccTakenControlTransferRefills: 0,
      unconditionalBranchTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 14,
      stopsBeforeInstruction: "_081DD874: first instruction",
    });
  });

  it("red-first rejects a 6-cycle under-price that omits the required taken-control refill", () => {
    const timing = reduceCgb4SubtractionResultTiming({ subtractionResult: 72 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 3 * 2;
    // This inner expectation is deliberately red: a source count without the
    // one mandatory refill must not be accepted as the observed route price.
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(6);
    expect(timing!.sourceCycles).toBe(12);
  });

  it("fails closed for an invalid scalar or an attempted packet/route widening", () => {
    expect(reduceCgb4SubtractionResultTiming({ subtractionResult: -1 })).toBeNull();
    expect(reduceCgb4SubtractionResultTiming({ subtractionResult: 0x1_0000_0000 })).toBeNull();
    expect(reduceCgb4SubtractionResultTiming({ subtractionResult: 72, originalTempoC: 222 })).toBeNull();
    expect(reduceCgb4SubtractionResultTiming({ subtractionResult: 72, bccDecision: "taken" })).toBeNull();
    expect(reduceCgb4SubtractionResultTiming({ subtractionResult: 72, trackIndex: 8 })).toBeNull();
  });

  it("joins only the three frozen v22 selected-successor digests and leaves all prohibited state null", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        musicPlayerInfoTempoC: { offset: 34, width: "u16" },
        staticPlayerStorage: {
          staticOrder: { ordinaryPlayers: 4, cryPlayers: 2, staticSlots: 6, selectedArrayElement: null },
          linker: { class: "IWRAM", origin: "0x03000000" },
        },
      },
      elf: {
        entry: "0x082dfbf4",
        bccTakenSuccessor: "0x082dfbfc",
        bccNotTakenUnconditionalSuccessor: "0x082dfaac",
        gPokemonCryMusicPlayers: { class: "IWRAM" },
      },
      compiledRegions: [{
        role: "strh r0, [r7, tempoC]; cmp r0, 150; bcc _081DD9C4; b _081DD874",
        start: "0x082dfbf4",
        endExclusive: "0x082dfbfc",
        bytes: 8,
        bytesHex: "78 84 96 28 00 d3 57 e7",
        sha256: "c5a8903b098438110e35e4a08538fb4858edbd65a05f775f35845ab7856ca1cc",
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        iwramHalfwordStorePremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
      },
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      rows: 7,
      cgb4Rows: 7,
      frozenV22SelectedRows: 3,
      selectedRows: 3,
      stoppedExistSetRows: 4,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v22-selected-row", "unsupported-packet-field"],
    });
    expect(evidence.capture).toEqual({
      boundary: "post-subs r0 at _081DD9BC entry before strh; source derives the compare/branch route without independently reading flags",
      scalars: ["subtractionResult"],
      excluded: ["pointer", "runtime address", "frame", "duration", "MusicPlayerInfo.clock scalar", "original MusicPlayerInfo.tempoC scalar", "track identity", "track index", "MusicPlayerInfo.trackCount", "condition flags", "later branch/body", "other 75 callbacks"],
    });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      frozenV22SelectedRows: 3,
      subtractionResultRows: 3,
      subtractionResultValues: [72],
      bccTakenRows: 3,
      bccNotTakenRows: 0,
      nullExistSetRows: 4,
      postV22BccDecisionSourceCycles: 36,
      acceptedContiguousPrefixThroughSelectedSuccessorPrefixSourceCycles: 5692,
      contiguousPrefixThroughBccDecisionSourceCycles: 5728,
      sequentialThumbHalfwords: 9,
      iwramHalfwordStores: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      originalTempoCScalar: null,
      laterBranchOrBodySourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    const selectedRows = evidence.rows.filter((row: any) => row.subtractionResult !== null);
    const existSetRows = evidence.rows.filter((row: any) => row.subtractionResult === null);
    expect(selectedRows).toHaveLength(3);
    expect(existSetRows).toHaveLength(4);
    for (const row of selectedRows) {
      expect(row.selectedSuccessor).toBe("_081DD9B6");
      expect(row.subtractionResult).toBe(72);
      expect(row.tempoCScalar).toBeNull();
      expect(row.postV22BccDecision).toBe("bcc-taken-to-_081DD9C4");
      expect(row.postV22BccDecisionSourceCycles).toBe(12);
      expect(row.contiguousPrefixThroughBccDecisionSourceCycles).toBe(804);
      expect(row.bccTakenControlTransferRefills).toBe(1);
      expect(row.unconditionalBranchTakenControlTransferRefills).toBe(0);
      expect(row.laterBranchOrBodySourceCycles).toBeNull();
      expect(row.stopsBeforeV23Instruction).toBe("_081DD9C4: ldrb r2, [r7, o_MusicPlayerInfo_trackCount]");
    }
    for (const row of existSetRows) {
      expect(row.subtractionResult).toBeNull();
      expect(row.postV22BccDecision).toBeNull();
      expect(row.postV22BccDecisionSourceCycles).toBeNull();
      expect(row.contiguousPrefixThroughBccDecisionSourceCycles).toBeNull();
      expect(row.bccTakenControlTransferRefills).toBeNull();
      expect(row.unconditionalBranchTakenControlTransferRefills).toBeNull();
      expect(row.laterBranchOrBodySourceCycles).toBeNull();
      expect(row.stopsBeforeV23Instruction).toBe("_081DD886");
    }
    expect(evidence.containment).toMatchObject({
      originalTempoCScalar: null,
      trackIdentity: null,
      trackIndex: null,
      trackCount: null,
      laterBranchOrBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
      v23PacketStripBackPreserved: true,
    });
  });

  it("freezes v22 evidence/report and every v21 packet byte/hash while proving v23 packet repeat identity", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.frozenInputs).toEqual({
      acceptedV22EvidenceSha256: "fb345eca1778d2b2f4514f6a0eee33b4749d2ad0e2c3441195d332c8e2282ad0",
      acceptedV22DocSha256: "b9c57628ead648a0426fa0068b24a0dfb0adb0839338d32983133c9d70bf1ea5",
      v22RegeneratesByteForByte: true,
      v22EvidenceAndReportRetainedByteForByte: true,
      allV21PacketsRetainedByteForByte: true,
      v21PacketDirectoryExact: true,
      v21PacketSha256: V21_PACKET_HASHES,
      v23PacketSha256: V23_PACKET_HASHES,
      v23PacketRepeatSha256: V23_PACKET_HASHES,
      v23PacketRepeatIdentity: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v22.json")).toBe(evidence.frozenInputs.acceptedV22EvidenceSha256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v22.md")).toBe(evidence.frozenInputs.acceptedV22DocSha256);
    for (const [name, hash] of Object.entries(V21_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v21", `${name}.json`))).toBe(hash);
    }
    for (const [name, hash] of Object.entries(V23_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v23", `${name}.json`))).toBe(hash);
    }
  });

  it("regenerates v23 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v23-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v23-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v23.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v23.json", "issue55-m4a-note-body-cgb4-v23.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v23.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v23.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
