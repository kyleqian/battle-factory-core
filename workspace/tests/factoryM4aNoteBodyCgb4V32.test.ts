import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4SecondTrackContinuationTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v32.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v32.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v32.md";
const V31_EVIDENCE_SHA256 = "ee0a10bb68685509c961d7b92edb8cfb8c1b22651fc6d97fa72784d65ba025af";
const V31_DOC_SHA256 = "57abe28a522d3ba643427a690184018be3252abb7fa9ef14b7ce4571317b30d8";
const V31_PACKET_HASHES = {
  anchor: "6a4af5ecbaa256b17914231e77d962b01ae45c91bc0ed64a2ddf6bdc949dee3d",
  liliana: "4b13624cda5a688270c3ac3cabc6228adad78eb83f7322152ca2cccc4d3e8bb3",
  "factory-varied": "ad82e79e6af5b3627775762d28463eaa91256477ce54cc698b8761673476d5e7",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 second-track non-exit continuation v32", () => {
  it("source-prices the frozen v31 continuation, including bgt's taken refill", () => {
    expect(reduceCgb4SecondTrackContinuationTiming({})).toEqual({
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
    expect(5920 + 3 * 12).toBe(5956);
  });

  it("fails closed if a frozen scalar, runtime field, or successor state attempts to widen source-only state", () => {
    expect(reduceCgb4SecondTrackContinuationTiming({ r2BeforeDecrement: 9 })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming({ trackPointer: "forbidden" })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming({ runtimeAddress: "forbidden" })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming({ trackCount: 9 })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming({ trackIndex: 1 })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming({ trackIdentity: "forbidden" })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming({ nextTrackFlags: 0x80 })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming({ channel: "forbidden" })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming({ conditionFlags: "forbidden" })).toBeNull();
    expect(reduceCgb4SecondTrackContinuationTiming(undefined)).toBeNull();
  });

  it("freezes v31 evidence, report, and packets, then joins only its three source-state digests", () => {
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
      acceptedV31EvidenceSha256: V31_EVIDENCE_SHA256,
      acceptedV31DocSha256: V31_DOC_SHA256,
      acceptedV31PacketSha256: V31_PACKET_HASHES,
      v31EvidenceAndReportRegenerateByteForByte: true,
      v31EvidenceReportAndPacketsRetainedByteForByte: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v31.json")).toBe(V31_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v31.md")).toBe(V31_DOC_SHA256);
    for (const [name, hash] of Object.entries(V31_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v31", `${name}.json`))).toBe(hash);
    }
    expect(evidence.capture).toEqual({
      boundary: "source-only second-track non-exit continuation through bgt _081DD9C8; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "r2BeforeDecrement serialization", "track pointer", "runtime address", "track count",
        "track index", "track identity", "next-track flags", "channel", "frame", "duration", "condition flags",
        "wider state", "_081DD9C8 ldrb and subsequent body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV31SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v31-selected-row",
        "unexpected-frozen-v31-r2-or-route", "unsupported-runtime-field", "unexpected-continuation-boundary",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV31SelectedRows: 3,
      sourceOnlyContinuationRows: 3,
      bgtTakenRows: 3,
      bgtNotTakenRows: 0,
      postV31SecondTrackContinuationSourceCycles: 36,
      acceptedContiguousPrefixThroughSecondTrackDecrementDecisionSourceCycles: 5920,
      contiguousPrefixThroughSecondTrackContinuationSourceCycles: 5956,
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
      postV31SecondTrackContinuationSourceCycles: 12,
      contiguousPrefixThroughSecondTrackContinuationSourceCycles: 880,
      bgtTakenControlTransferRefills: 1,
      stopsBeforeV32Instruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bgtTakenControlTransferRefills",
        "contiguousPrefixThroughSecondTrackContinuationSourceCycles",
        "continuationDecision",
        "postV31SecondTrackContinuationSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV32Instruction",
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
      frozenV31ArtifactsReadOnly: true,
      v32RuntimeCaptureCount: 0,
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

  it("regenerates v32 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v32-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v32-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v32.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v32.json", "issue55-m4a-note-body-cgb4-v32.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v32.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v32.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
