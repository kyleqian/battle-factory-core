import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4ThirdTrackContinuationTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v36.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v36.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v36.md";
const V35_EVIDENCE_SHA256 = "f2072d5ca523520f2dfe518bee674f3f69d9c14e528216266f4cebaaf45f260e";
const V35_DOC_SHA256 = "2fb614a5b37fa57f7d731dee132f21b9672184a031b33728aede91481d19f854";
const V35_PACKET_HASHES = {
  anchor: "e3b48fc009941742c1d2d19b8fb8625544b81a99fb5a6b16d9ae894f642407e3",
  liliana: "47366316f6450119b3d3d3c93e0dad10a0a6c5d9fe437fa70a8588ed40d33998",
  "factory-varied": "69ceae984c5647ccdc486b10ad478f0556344dab50c7cc032a12a661cf1c74c9",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 third-track non-exit continuation v36", () => {
  it("source-prices the frozen v35 continuation, including bgt's taken refill", () => {
    expect(reduceCgb4ThirdTrackContinuationTiming({})).toEqual({
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
    expect(6028 + 3 * 12).toBe(6064);
  });

  it("red-first rejects a missing six-cycle taken-branch refill", () => {
    const timing = reduceCgb4ThirdTrackContinuationTiming({});
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 3 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(6);
    expect(timing!.sourceCycles).toBe(12);
  });

  it("fails closed if the predecessor scalar, runtime data, next flags, or body attempts to widen source-only state", () => {
    for (const value of [
      undefined,
      null,
      { r2BeforeDecrement: 8 },
      { pointer: "forbidden" },
      { trackPointer: "forbidden" },
      { address: "forbidden" },
      { runtimeAddress: "forbidden" },
      { trackCount: 8 },
      { trackIndex: 2 },
      { trackIdentity: "forbidden" },
      { channel: "forbidden" },
      { frame: 1 },
      { duration: 1 },
      { conditionFlags: "forbidden" },
      { nextTrackFlags: 0x80 },
      { fourthTrackFlags: 0x80 },
      { body: "forbidden" },
      { nextTrackBody: "forbidden" },
      { exitSuccessor: "forbidden" },
      { widerState: "forbidden" },
    ]) expect(reduceCgb4ThirdTrackContinuationTiming(value)).toBeNull();
  });

  it("freezes v35 evidence, report, and packets, then strips the predecessor scalar at the third-track boundary", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1360-1362, 1443-1450", sha256: "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c" },
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
        continuationEntry: "0x082dfc9e",
        stopBoundary: "0x082dfc00",
        selectedRuntimeTrack: null,
        runtimePointerOrAddress: null,
        allCandidateTrackStorageClass: "IWRAM",
      },
      compiledRegions: [{
        role: "movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8",
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
      acceptedV35EvidenceSha256: V35_EVIDENCE_SHA256,
      acceptedV35DocSha256: V35_DOC_SHA256,
      acceptedV35PacketSha256: V35_PACKET_HASHES,
      v35EvidenceAndReportRegenerateByteForByte: true,
      v35EvidenceReportAndPacketsRetainedByteForByte: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v35.json")).toBe(V35_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v35.md")).toBe(V35_DOC_SHA256);
    for (const [name, hash] of Object.entries(V35_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v35", `${name}.json`))).toBe(hash);
    }
    expect(evidence.capture).toEqual({
      boundary: "source-only third-track non-exit continuation through bgt _081DD9C8; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "r2BeforeDecrement serialization", "track pointer", "pointer", "address", "runtime address",
        "track count", "track index", "track identity", "next-track flags", "channel", "frame", "duration", "condition flags",
        "wider state", "_081DD9C8 fourth-track ldrb flags load and subsequent body", "_081DDA6C exit successor body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV35SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v35-selected-row",
        "unexpected-frozen-v35-r2-or-route", "unsupported-runtime-field", "unexpected-continuation-boundary",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV35SelectedRows: 3,
      sourceOnlyContinuationRows: 3,
      bgtTakenRows: 3,
      bgtNotTakenRows: 0,
      postV35ThirdTrackContinuationSourceCycles: 36,
      acceptedContiguousPrefixThroughThirdTrackDecrementDecisionSourceCycles: 6028,
      contiguousPrefixThroughThirdTrackContinuationSourceCycles: 6064,
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
      postV35ThirdTrackContinuationSourceCycles: 12,
      contiguousPrefixThroughThirdTrackContinuationSourceCycles: 916,
      bgtTakenControlTransferRefills: 1,
      stopsBeforeV36Instruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bgtTakenControlTransferRefills",
        "contiguousPrefixThroughThirdTrackContinuationSourceCycles",
        "continuationDecision",
        "postV35ThirdTrackContinuationSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV36Instruction",
      ]);
      expect(row.r2BeforeDecrement).toBeUndefined();
      expect(row.pointer).toBeUndefined();
      expect(row.trackPointer).toBeUndefined();
      expect(row.runtimeAddress).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.nextTrackFlags).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
      expect(row.body).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV35ArtifactsReadOnly: true,
      frozenV35ArtifactsAreNotProductionImports: true,
      v36RuntimeCaptureCount: 0,
      r2BeforeDecrement: null,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      nextTrackFlags: null,
      nextTrackBody: null,
      fourthTrackFlags: null,
      fourthTrackBody: null,
      exitSuccessor: null,
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

  it("retains every frozen v35 packet with its exact address-free shape", () => {
    for (const [name, hash] of Object.entries(V35_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v35", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const observation of packet.observations) {
        expect(Object.keys(observation).sort()).toEqual(["r2BeforeDecrement", "sourceStateDigest"]);
        expect(observation.r2BeforeDecrement).toBe(8);
      }
    }
  });

  it("regenerates v36 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v36-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v36-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v36.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v36.json", "issue55-m4a-note-body-cgb4-v36.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v36.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v36.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
