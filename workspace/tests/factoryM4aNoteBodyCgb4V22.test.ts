import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4R4TakenSuccessorPrefixTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v22.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v22.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v22.md";
const V21_PACKET_HASHES = {
  anchor: "f13515a24c83091558deacba966a4454b536d6ee06c8e82a37ef848763f576df",
  liliana: "11d4dab534db89ffdae18b9fa910594417f0535a69eb67fe739b9eb808d8e8ae",
  "factory-varied": "7adb7dfdbec2e01034c673d6c0480a78fe7165de47eda8b37bd699870d0126d2",
} as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 r4-taken successor prefix v22", () => {
  it("prices every fixed successor-prefix halfword without a control-transfer or IWRAM premium", () => {
    const timing = reduceCgb4R4TakenSuccessorPrefixTiming({ r4Nonzero: true });
    expect(timing).toEqual({
      route: "r4-nonzero-bne-taken-successor-prefix",
      selectedSuccessor: "_081DD9B6",
      sequentialThumbHalfwords: 3,
      iwramWordStores: 1,
      iwramHalfwordLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      statusWriteSourceCycles: 2,
      tempoPrefixInstructionSourceCycles: 4,
      sourceCycles: 6,
      stopsBeforeInstruction: "_081DD9BC: strh r0, [r7, o_MusicPlayerInfo_tempoC]",
    });
    expect(5674 + 3 * timing!.sourceCycles).toBe(5692);
  });

  it("fails closed for a non-taken row or any scalar widened beyond frozen r4 evidence", () => {
    expect(reduceCgb4R4TakenSuccessorPrefixTiming({ r4Nonzero: false })).toBeNull();
    expect(reduceCgb4R4TakenSuccessorPrefixTiming({ r4Nonzero: true, tempoC: 0 })).toBeNull();
    expect(reduceCgb4R4TakenSuccessorPrefixTiming({ r4Nonzero: true, subtractionResult: 0 })).toBeNull();
  });

  it("joins only the three frozen v21 r4-taken digests and stops before the first strh", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        musicPlayerInfoOffsets: { status: { offset: 4, width: "u32" }, tempoC: { offset: 34, width: "u16" } },
        sixthPlayerProvenance: {
          declaration: { symbol: "gPokemonCryMusicPlayers", entries: 2 },
          staticPlayerOrder: { ordinaryPlayers: 4, cryPlayers: 2, staticSlots: 6, sixthPlayerStorageSymbol: "gPokemonCryMusicPlayers", selectedArrayElement: null },
          linker: { class: "IWRAM", origin: "0x03000000" },
        },
      },
      elf: {
        successorLabel: "0x082dfbee",
        firstUnpricedInstruction: "0x082dfbf4",
        gPokemonCryMusicPlayers: { start: "0x030073a0", endExclusive: "0x03007420", bytes: 128, entries: 2, musicPlayerInfoBytes: 64, class: "IWRAM" },
      },
      compiledRegions: [{
        role: "str r4, [r7, status]; ldrh r0, [r7, tempoC]; subs r0, 150",
        start: "0x082dfbee",
        endExclusive: "0x082dfbf4",
        bytes: 6,
        bytesHex: "7c 60 78 8c 96 38",
        sha256: "3ab19dde983c5c91bf32301508da96527e812c6cf5e5eea2cad4fc133f6e7599",
      }],
      timingClasses: { sequentialThumbHalfwordCycles: 2, iwramDataAccessPremiumCycles: 0 },
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      rows: 7,
      cgb4Rows: 7,
      frozenV21R4TakenRows: 3,
      selectedSuccessorRows: 3,
      stoppedExistSetRows: 4,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "r4-zero", "non-v21-row"],
    });
    expect(evidence.capture).toEqual({
      boundary: "source-only successor prefix after v21's frozen r4-nonzero taken branch and before _081DD9BC strh",
      scalars: [],
      excluded: ["pointer", "runtime address", "frame", "duration", "MusicPlayerInfo.clock scalar", "MusicPlayerInfo.tempoC scalar", "subtraction result", "bcc decision", "later branch/body", "track identity", "track index", "MusicPlayerInfo.trackCount", "other 75 callbacks"],
    });
    expect(evidence.coverage).toMatchObject({
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      frozenV21R4NonzeroRows: 3,
      nullExistSetRows: 4,
      postV21SelectedSuccessorPrefixSourceCycles: 18,
      acceptedContiguousPrefixThroughClockExitDecisionSourceCycles: 5674,
      contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles: 5692,
      sequentialThumbHalfwords: 9,
      iwramWordStores: 3,
      iwramHalfwordLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      selectedSuccessor: "_081DD9B6",
      tempoCScalar: null,
      subtractionResult: null,
      bccDecision: null,
      laterBranchOrBodySourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    const selectedRows = evidence.rows.filter((row: any) => row.selectedSuccessor !== null);
    const existSetRows = evidence.rows.filter((row: any) => row.selectedSuccessor === null);
    expect(selectedRows).toHaveLength(3);
    expect(existSetRows).toHaveLength(4);
    for (const row of selectedRows) {
      expect(row.clockExitR4Nonzero).toBe(true);
      expect(row.selectedSuccessor).toBe("_081DD9B6");
      expect(row.postV21SelectedSuccessorPrefixSourceCycles).toBe(6);
      expect(row.contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles).toBe(792);
      expect(row.statusWriteSourceCycles).toBe(2);
      expect(row.tempoPrefixInstructionSourceCycles).toBe(4);
      expect(row.tempoCScalar).toBeNull();
      expect(row.subtractionResult).toBeNull();
      expect(row.postV22BccDecision).toBeNull();
      expect(row.laterBranchOrBodySourceCycles).toBeNull();
      expect(row.stopsBeforeV22Instruction).toBe("_081DD9BC: strh r0, [r7, o_MusicPlayerInfo_tempoC]");
    }
    for (const row of existSetRows) {
      expect(row.clockExitR4Nonzero).toBeNull();
      expect(row.selectedSuccessor).toBeNull();
      expect(row.postV21SelectedSuccessorPrefixSourceCycles).toBeNull();
      expect(row.statusWriteSourceCycles).toBeNull();
      expect(row.tempoPrefixInstructionSourceCycles).toBeNull();
      expect(row.tempoCScalar).toBeNull();
      expect(row.subtractionResult).toBeNull();
      expect(row.postV22BccDecision).toBeNull();
      expect(row.laterBranchOrBodySourceCycles).toBeNull();
      expect(row.stopsBeforeV22Instruction).toBe("_081DD886");
    }
  });

  it("freezes and byte-regenerates v21 evidence/report while pinning its exact packet set", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.frozenInputs).toEqual({
      acceptedV21EvidenceSha256: "769bb40e135cea0fff5f450a844e7da1b9f63f9ba385785823d815350ae08586",
      acceptedV21DocSha256: "297333080fac72fc87c8d44ff3252c0ece106d97c2bcf84bdff1c771dd5742b0",
      v21RegeneratesByteForByte: true,
      v21EvidenceAndReportRetainedByteForByte: true,
      allV21PacketsRetainedByteForByte: true,
      v21PacketDirectoryExact: true,
      packetSha256: V21_PACKET_HASHES,
      packetRepeatSha256: V21_PACKET_HASHES,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v21.json")).toBe(evidence.frozenInputs.acceptedV21EvidenceSha256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v21.md")).toBe(evidence.frozenInputs.acceptedV21DocSha256);
    for (const [name, hash] of Object.entries(V21_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v21", `${name}.json`))).toBe(hash);
    }
  });

  it("regenerates v22 evidence and report byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v22-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v22.ts", "--out-dir", directory], { cwd: process.cwd() });
    expect(readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v22.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v22.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
