import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4ThirdTrackFlagsTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v33.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v33.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v33.md";
const V32_EVIDENCE_SHA256 = "6301f67aef178a4284bf3f9f70cbf984d4fbe7d2a4cfbfe2f14f2fa93961b989";
const V32_DOC_SHA256 = "e818d931a21902a3d2b02a3a6ce280410dffb9a75997d841894f6daeaeaccbd2";
const V31_PACKET_HASHES = {
  anchor: "6a4af5ecbaa256b17914231e77d962b01ae45c91bc0ed64a2ddf6bdc949dee3d",
  liliana: "4b13624cda5a688270c3ac3cabc6228adad78eb83f7322152ca2cccc4d3e8bb3",
  "factory-varied": "ad82e79e6af5b3627775762d28463eaa91256477ce54cc698b8761673476d5e7",
} as const;
const V33_PACKET_HASHES = {
  anchor: "5b200f46ea9182f5f1ba1f349b07f012b282f2d96157c2b49c0cee0e163b88c9",
  liliana: "edb093d86fd4deffdc39f2802d545d2422d3ca94ece18883d6d8dd2522c3bc13",
  "factory-varied": "a6e227b52726b060268a24d01aa404bcf54b576d3640cbdb85d76d9ffe4a4411",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 third-track flags v33", () => {
  it("prices EXIST-set and fail-closed EXIST-clear routes exactly", () => {
    expect(reduceCgb4ThirdTrackFlagsTiming({ thirdTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_EXIST-set-beq-not-taken",
      thirdTrackFlags: 0x80,
      sequentialThumbHalfwords: 4,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 8,
      stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    });
    expect(reduceCgb4ThirdTrackFlagsTiming({ thirdTrackFlags: 0 })).toEqual({
      route: "MPT_FLG_EXIST-clear-beq-taken",
      thirdTrackFlags: 0,
      sequentialThumbHalfwords: 4,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 14,
      stopsBeforeInstruction: "_081DDA62: first instruction",
    });
  });

  it("fails closed on every forbidden runtime or successor field", () => {
    const forbidden = [
      undefined,
      {},
      { thirdTrackFlags: -1 },
      { thirdTrackFlags: 0x100 },
      { thirdTrackFlags: 0x80, pointer: "forbidden" },
      { thirdTrackFlags: 0x80, address: "forbidden" },
      { thirdTrackFlags: 0x80, runtimeAddress: "forbidden" },
      { thirdTrackFlags: 0x80, trackCount: 3 },
      { thirdTrackFlags: 0x80, trackIndex: 2 },
      { thirdTrackFlags: 0x80, trackIdentity: "forbidden" },
      { thirdTrackFlags: 0x80, channel: "forbidden" },
      { thirdTrackFlags: 0x80, frame: 1 },
      { thirdTrackFlags: 0x80, duration: 1 },
      { thirdTrackFlags: 0x80, body: "forbidden" },
      { thirdTrackFlags: 0x80, conditionFlags: "forbidden" },
      { thirdTrackFlags: 0x80, firstTrackFlags: 0x80 },
      { thirdTrackFlags: 0x80, secondTrackFlags: 0x80 },
      { thirdTrackFlags: 0x80, volumePitchMask: "forbidden" },
      { thirdTrackFlags: 0x80, successor: "forbidden" },
    ];
    for (const value of forbidden) expect(reduceCgb4ThirdTrackFlagsTiming(value)).toBeNull();
  });

  it("pins fresh packets, the frozen v32 boundary, source/ELF/ROM bytes, and exact branch timing", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1360-1367, 1443-1448" },
        musicPlayerInfo: { tracks: { offset: 44, width: "pointer", runtimeValue: null }, r5Origin: "MusicPlayerInfo.tracks" },
        musicPlayerTrack: {
          flagsOffset: 0,
          existMask: 0x80,
          assemblerSize: { symbol: "MusicPlayerTrack_size", bytes: 80 },
          staticTableStride: { symbol: "TRACK_SIZE", bytes: 80 },
        },
        staticMplayAndCryTrackStorage: { allCandidateStorageClass: "IWRAM", selectedRuntimeTrack: null, runtimePointerOrAddress: null },
      },
      elf: { flagsEntry: "0x082dfc00", stopBoundary: "0x082dfc08", selectedRuntimeTrack: null, runtimePointerOrAddress: null, allCandidateTrackStorageClass: "IWRAM" },
      compiledRegions: [{
        role: "ldrb flags; movs MPT_FLG_EXIST; tst; beq _081DDA62",
        start: "0x082dfc00",
        endExclusive: "0x082dfc08",
        bytes: 8,
        bytesHex: "28 78 80 21 01 42 48 d0",
        sha256: "3a41edf45b6169cf3cdcf4ee298a61c576e224d16df2d3f31aa2dba9ec8e6c66",
        decodedBeq: { condition: "EQ", target: "_081DDA62", targetAddress: "0x082dfc9a" },
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        iwramByteLoads: 1,
        iwramDataAccessPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
        existSetModel: "ldrb; movs; tst; non-taken beq = 4 halfwords * 2 = 8",
        existClearModel: "ldrb; movs; tst; taken beq = 4 halfwords * 2 + one 6-cycle refill = 14",
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV32EvidenceSha256: V32_EVIDENCE_SHA256,
      acceptedV32DocSha256: V32_DOC_SHA256,
      acceptedInheritedV31PacketSha256: V31_PACKET_HASHES,
      v32EvidenceAndReportRegenerateByteForByte: true,
      v32EvidenceReportAndInheritedV31PacketsRetainedByteForByte: true,
      v33PacketSha256: V33_PACKET_HASHES,
      v33PacketRepeatSha256: V33_PACKET_HASHES,
      v33PacketRepeatIdentity: true,
    });
    expect(evidence.capture).toEqual({
      boundary: "third-track loop iteration post-_081DD9C8 ldrb r0 flags, before movs r1, MPT_FLG_EXIST",
      scalars: ["thirdTrackFlags"],
      packetObservationExactKeys: ["sourceStateDigest", "thirdTrackFlags"],
      excluded: ["pointer", "address", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration", "body", "condition flags", "wider state", "first-track flags", "second-track flags", "volume/pitch mask", "successor body", "other 75 callbacks"],
    });
    expect(evidence.join).toMatchObject({ key: "sourceStateDigest", frozenV32SelectedRows: 3, joinedRows: 3, ambiguousRows: 0, addressFree: true });
    expect(evidence.coverage).toMatchObject({
      frozenV32SelectedRows: 3,
      packetRowsByCase: { anchor: 0, liliana: 1, "factory-varied": 2 },
      thirdTrackFlagsRows: 3,
      thirdTrackFlagsValues: [128],
      existSetRows: 3,
      existClearRows: 0,
      postV32ThirdTrackExistDecisionSourceCycles: 24,
      acceptedContiguousPrefixThroughSecondTrackContinuationSourceCycles: 5956,
      contiguousPrefixThroughThirdTrackExistDecisionSourceCycles: 5980,
      sequentialThumbHalfwords: 12,
      iwramByteLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      failClosedUnobservedExistClearSourceCycles: 14,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      thirdTrackFlags: 128,
      thirdTrackExistDecision: "MPT_FLG_EXIST-set-beq-not-taken",
      postV32ThirdTrackExistDecisionSourceCycles: 8,
      contiguousPrefixThroughThirdTrackExistDecisionSourceCycles: 888,
      beqTakenControlTransferRefills: 0,
      stopsBeforeV33Instruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughThirdTrackExistDecisionSourceCycles",
        "postV32ThirdTrackExistDecisionSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV33Instruction",
        "thirdTrackExistDecision",
        "thirdTrackFlags",
      ]);
      expect(row.pointer).toBeUndefined();
      expect(row.address).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.body).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV32ArtifactsReadOnly: true,
      inheritedV31PacketsReadOnly: true,
      v33PacketStripBackPreserved: true,
      v33RuntimeCaptureCount: 3,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      body: null,
      volumePitchMaskBody: null,
      successorBody: null,
      serviceCost: null,
      arbitration: null,
      constructionClock: null,
      presentation: null,
      animation: null,
      rust: null,
      canonicalBattle2: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("retains v32 and inherited v31 bytes, and validates exact-key packet schemas", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v32.json")).toBe(V32_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v32.md")).toBe(V32_DOC_SHA256);
    for (const [name, hash] of Object.entries(V31_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v31", `${name}.json`))).toBe(hash);
    }
    for (const [name, hash] of Object.entries(V33_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v33", `${name}.json`))).toBe(hash);
      const packet = JSON.parse(readFileSync(join("tests/fixtures/factory-m4a-note-body-cgb4-v33", `${name}.json`), "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["sourceStateDigest", "thirdTrackFlags"]);
    }
  });

  it("regenerates the v33 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v33-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v33-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v33.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v33.json", "issue55-m4a-note-body-cgb4-v33.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v33.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v33.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
