import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4FirstTrackContinuationTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v28.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v28.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v28.md";
const V27_EVIDENCE_SHA256 = "5e730d95829b186df347d6bfa2f4bc703e3b1e19f369397fb68efffae3026a85";
const V27_DOC_SHA256 = "827fe735000ead669189f29826b8a95003e80a407b44cbe9b1c9b94ea6fdcf54";
const V27_PACKET_HASHES = {
  anchor: "af43b96726ecbab87348608a4da6c85bb798648e0e7a6d39a6d62aecd5f3f930",
  liliana: "9078aa6611250012a1654f05b6ea6f8f30190117f7db0f6d2713f1ab71447626",
  "factory-varied": "6a5a1424b507c62bed61d7da753502965f0de47924425f52ba36152d7132be68",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 first-track non-exit continuation v28", () => {
  it("source-prices the frozen v27 non-exit continuation, including bgt's taken refill", () => {
    expect(reduceCgb4FirstTrackContinuationTiming({})).toEqual({
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
    expect(5812 + 3 * 12).toBe(5848);
  });

  it("fails closed if a runtime scalar, pointer, identity, successor flag, or channel attempts to widen source-only state", () => {
    expect(reduceCgb4FirstTrackContinuationTiming({ r2BeforeDecrement: 10 })).toBeNull();
    expect(reduceCgb4FirstTrackContinuationTiming({ trackPointer: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackContinuationTiming({ runtimeAddress: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackContinuationTiming({ trackCount: 10 })).toBeNull();
    expect(reduceCgb4FirstTrackContinuationTiming({ trackIndex: 9 })).toBeNull();
    expect(reduceCgb4FirstTrackContinuationTiming({ trackIdentity: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackContinuationTiming({ nextTrackFlags: 0x80 })).toBeNull();
    expect(reduceCgb4FirstTrackContinuationTiming({ channel: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackContinuationTiming(undefined)).toBeNull();
  });

  it("freezes v27 evidence, report, and packets, then joins only its three source-state digests", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1360-1362, 1443-1450" },
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
      acceptedV27EvidenceSha256: V27_EVIDENCE_SHA256,
      acceptedV27DocSha256: V27_DOC_SHA256,
      acceptedV27PacketSha256: V27_PACKET_HASHES,
      v27EvidenceAndReportRegenerateByteForByte: true,
      v27EvidenceReportAndPacketsRetainedByteForByte: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v27.json")).toBe(V27_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v27.md")).toBe(V27_DOC_SHA256);
    for (const [name, hash] of Object.entries(V27_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v27", `${name}.json`))).toBe(hash);
    }
    expect(evidence.capture).toEqual({
      boundary: "source-only _081DDA62 non-exit continuation through bgt _081DD9C8; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "r2BeforeDecrement serialization", "track pointer", "runtime address", "track count",
        "track index", "track identity", "next-track flags", "channel", "frame", "duration", "condition flags",
        "wider state", "_081DD9C8 ldrb and subsequent body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV27SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v27-selected-row",
        "unexpected-frozen-v27-r2-or-route", "unsupported-runtime-field", "unexpected-continuation-boundary",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV27SelectedRows: 3,
      sourceOnlyContinuationRows: 3,
      bgtTakenRows: 3,
      bgtNotTakenRows: 0,
      postV27FirstTrackContinuationSourceCycles: 36,
      acceptedContiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles: 5812,
      contiguousPrefixThroughFirstTrackContinuationSourceCycles: 5848,
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
      postV27FirstTrackContinuationSourceCycles: 12,
      contiguousPrefixThroughFirstTrackContinuationSourceCycles: 844,
      bgtTakenControlTransferRefills: 1,
      stopsBeforeV28Instruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bgtTakenControlTransferRefills",
        "contiguousPrefixThroughFirstTrackContinuationSourceCycles",
        "continuationDecision",
        "postV27FirstTrackContinuationSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV28Instruction",
      ]);
      expect(row.r2BeforeDecrement).toBeUndefined();
      expect(row.trackPointer).toBeUndefined();
      expect(row.runtimeAddress).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.nextTrackFlags).toBeUndefined();
      expect(row.channel).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV27ArtifactsReadOnly: true,
      v28RuntimeCaptureCount: 0,
      r2BeforeDecrement: null,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      nextTrackFlags: null,
      channel: null,
      nextTrackBody: null,
      subsequentLoopWork: null,
      serviceCost: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("regenerates v28 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v28-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v28-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v28.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v28.json", "issue55-m4a-note-body-cgb4-v28.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v28.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v28.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
