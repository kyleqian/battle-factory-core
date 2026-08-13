import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4FourthTrackContinuationTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v40.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v40.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v40.md";
const V39_EVIDENCE_SHA256 = "86286add231fea7b33ddbd0b667dd53efd4831582d8aed6e3b87e3a70dcdc626";
const V39_DOC_SHA256 = "14fd2f23976dca78ce5f23f4bf3a9b0ae5ef13d050707239d1c90b5363b414e1";
const V39_PACKET_HASHES = {
  anchor: "317c223e01b3907b2016af6e5c4294db06d0f53872fcbdf38d7086bf25244ceb",
  liliana: "496c24229d1e9a542f3763cd26cb0959d0c6320d431b1453e0bb72988f790c74",
  "factory-varied": "68c43a7e757d47f32a383d3d09c03c33f8a92dd82a51b4fdfef8f861f880b343",
} as const;
const V37_PACKET_HASHES = {
  anchor: "4dad511aee6b508723c2ddd5ca283756ca17435c23388ecf374273bbcf86a8c4",
  liliana: "8afcc0bad8bd77c9ae28d442a9a496101af1321c4b71e54b5bb49160197d7a9d",
  "factory-varied": "6f202501970fd31eddb94f489d2e3360fde3ec78d90df6ab4cbdba64f5d81e67",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 fourth-track positive continuation v40", () => {
  it("source-prices only the positive _081DDA66 continuation with its taken refill", () => {
    expect(reduceCgb4FourthTrackContinuationTiming({})).toEqual({
      route: "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8",
      sequentialThumbHalfwords: 3,
      musicPlayerTrackSizeBytes: 80,
      r5Origin: "MusicPlayerInfo.tracks",
      r5CandidateStorageClass: "IWRAM",
      addResultSignedPositive: true,
      addSignedOverflow: false,
      bgtTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 12,
      stopsBeforeInstruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    });
    expect(6136 + 3 * 12).toBe(6172);
  });

  it("red-first rejects the missing six-cycle taken-branch refill", () => {
    const timing = reduceCgb4FourthTrackContinuationTiming({});
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 3 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(6);
    expect(timing!.sourceCycles).toBe(12);
  });

  it("fails closed if any predecessor scalar, runtime data, fifth-track state, or body widens the source-only receipt", () => {
    for (const value of [
      undefined,
      null,
      { r2BeforeDecrement: 7 },
      { pointer: "forbidden" },
      { trackPointer: "forbidden" },
      { address: "forbidden" },
      { runtimeAddress: "forbidden" },
      { trackCount: 7 },
      { trackIndex: 4 },
      { trackIdentity: "forbidden" },
      { fifthTrackFlags: 0x80 },
      { fifthTrackDecision: "forbidden" },
      { fifthTrackBody: "forbidden" },
      { channel: "forbidden" },
      { frame: 1 },
      { duration: 1 },
      { conditionFlags: "forbidden" },
      { body: "forbidden" },
      { exitSuccessor: "forbidden" },
      { widerLoop: "forbidden" },
      { widerState: "forbidden" },
    ]) expect(reduceCgb4FourthTrackContinuationTiming(value)).toBeNull();
  });

  it("freezes v39, strips its scalar, and pins the exact source/ELF/ROM body through the fifth-track stop", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: {
          path: "reference/pokeemerald/src/m4a_1.s",
          lines: "1360-1362, 1443-1450",
          continuationSourceAddress: "_081DDA66",
          predecessorSourceAddress: "_081DDA62",
          sha256: "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c",
        },
        musicPlayerInfo: {
          tracks: { offset: 44, width: "pointer", runtimeValue: null },
          r5Origin: "MusicPlayerInfo.tracks",
        },
        musicPlayerTrack: {
          assemblerSize: { symbol: "MusicPlayerTrack_size", bytes: 80 },
          staticTableStride: { symbol: "TRACK_SIZE", bytes: 80 },
        },
        staticMplayAndCryTrackStorage: {
          allCandidateStorageClass: "IWRAM",
          selectedRuntimeTrack: null,
          runtimePointerOrAddress: null,
        },
      },
      elf: {
        continuationSourceAddress: "_081DDA66",
        continuationEntry: "0x082dfc9e",
        loopHead: "0x082dfc00",
        stopBoundary: "0x082dfc00",
        selectedRuntimeTrack: null,
        runtimePointerOrAddress: null,
        allCandidateTrackStorageClass: "IWRAM",
      },
      compiledRegions: [{
        role: "movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8",
        sourceAddress: "_081DDA66",
        start: "0x082dfc9e",
        endExclusive: "0x082dfca4",
        bytes: 6,
        bytesHex: "50 20 2d 18 ad dc",
        sha256: "05a30c0a17fafc028ce3218c1ad9921ce4ffd3efc591503956f4793a4c43b993",
        decodedBgt: { condition: "GT", target: "_081DD9C8", targetAddress: "0x082dfc00" },
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        registerDataAccesses: 0,
        dataAccessPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
        signedAddProof: {
          inputClass: "IWRAM MusicPlayerInfo.tracks candidate",
          trackStrideBytes: 80,
          resultSignedPositive: true,
          signedOverflow: false,
          bgtTaken: true,
          runtimePointerOrAddress: null,
        },
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV39EvidenceSha256: V39_EVIDENCE_SHA256,
      acceptedV39DocSha256: V39_DOC_SHA256,
      acceptedV39PacketSha256: V39_PACKET_HASHES,
      acceptedInheritedV37PacketSha256: V37_PACKET_HASHES,
      v39EvidenceAndReportRegenerateByteForByte: true,
      v39EvidenceReportAndAllOffPacketsRetainedByteForByte: true,
    });
    expect(evidence.capture).toEqual({
      boundary: "source-only fourth-track positive continuation _081DDA66.._081DDA6C through bgt _081DD9C8; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "r2BeforeDecrement serialization", "track pointer", "pointer", "address", "runtime address",
        "track count", "track index", "track identity", "fifth-track flags load", "any fifth-track decision or body",
        "channel", "frame", "duration", "condition flags", "wider loop work", "_081DDA6C exit successor body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV39SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v39-selected-row",
        "unexpected-frozen-v39-r2-or-route", "unsupported-runtime-field", "unexpected-continuation-boundary",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV39SelectedRows: 3,
      sourceOnlyContinuationRows: 3,
      bgtTakenRows: 3,
      bgtNotTakenRows: 0,
      postV39FourthTrackContinuationSourceCycles: 36,
      acceptedContiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles: 6136,
      contiguousPrefixThroughFourthTrackContinuationSourceCycles: 6172,
      sequentialThumbHalfwords: 9,
      registerDataAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      continuationDecision: "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8",
      postV39FourthTrackContinuationSourceCycles: 12,
      contiguousPrefixThroughFourthTrackContinuationSourceCycles: 952,
      bgtTakenControlTransferRefills: 1,
      stopsBeforeV40Instruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bgtTakenControlTransferRefills",
        "contiguousPrefixThroughFourthTrackContinuationSourceCycles",
        "continuationDecision",
        "postV39FourthTrackContinuationSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV40Instruction",
      ]);
      expect(row.r2BeforeDecrement).toBeUndefined();
      expect(row.pointer).toBeUndefined();
      expect(row.trackPointer).toBeUndefined();
      expect(row.address).toBeUndefined();
      expect(row.runtimeAddress).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.fifthTrackFlags).toBeUndefined();
      expect(row.fifthTrackDecision).toBeUndefined();
      expect(row.fifthTrackBody).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
      expect(row.body).toBeUndefined();
      expect(row.exitSuccessor).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV39ArtifactsReadOnly: true,
      inheritedV37PacketsRetainedReadOnly: true,
      frozenV39ArtifactsAreNotProductionImports: true,
      v40RuntimeCaptureCount: 0,
      r2BeforeDecrement: null,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      fifthTrackFlags: null,
      fifthTrackDecision: null,
      fifthTrackBody: null,
      exitSuccessor: null,
      exitBody: null,
      widerLoop: null,
      completeMPlay: null,
      serviceCost: null,
      arbitration: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      animation: null,
      rust: null,
      canonicalBattle2: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("retains v39 and its inherited Battle Scene OFF packets byte-for-byte", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v39.json")).toBe(V39_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v39.md")).toBe(V39_DOC_SHA256);
    for (const [name, hash] of Object.entries(V39_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v39", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const observation of packet.observations) expect(Object.keys(observation).sort()).toEqual(["r2BeforeDecrement", "sourceStateDigest"]);
    }
    for (const [name, hash] of Object.entries(V37_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v37", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const observation of packet.observations) expect(Object.keys(observation).sort()).toEqual(["fourthTrackFlags", "sourceStateDigest"]);
    }
  });

  it("regenerates v40 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v40-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v40-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v40.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v40.json", "issue55-m4a-note-body-cgb4-v40.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v40.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v40.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
