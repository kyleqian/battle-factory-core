import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4FirstTrackVolPitchTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v26.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v26.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v26.md";
const V25_EVIDENCE_SHA256 = "26a2f0c9dfb5442f95c5813cf0f359c3e01ca389ad3f415118b480889a0900ab";
const V25_DOC_SHA256 = "4bd41b232aa24ec2b309aaac30bf07573abf73a614c62d44843a0fca603282bf";
const V25_PACKET_HASHES = {
  anchor: "3ac4e4a8797b7e459c15019e7f847dce592643f604cdc437e74074dfc8d6d1a7",
  liliana: "ce74203999ee3d5492f060ef879483403002c06ab501776e7063b0fa1421d4da",
  "factory-varied": "bd289cb97eaafe49b63ce41c9b1546037b899394d7cdaf25998efcc6427646b5",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 first-track volume/pitch-mask decision v26", () => {
  it("prices the frozen v25 mask-clear route including the taken refill", () => {
    expect(reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      firstTrackFlags: 0x80,
      volPitchMask: 0x0f,
      sequentialThumbHalfwords: 3,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 12,
      stopsBeforeInstruction: "_081DDA62: first instruction",
    });
    expect(5764 + 3 * 12).toBe(5800);
  });

  it("source-prices the unobserved mask-nonzero successor without claiming it observed", () => {
    expect(reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: 0x8f })).toEqual({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
      firstTrackFlags: 0x8f,
      volPitchMask: 0x0f,
      sequentialThumbHalfwords: 3,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 6,
      stopsBeforeInstruction: "mov r9, r2",
    });
  });

  it("red-first rejects the missing-refill six-cycle under-price for the observed clear mask", () => {
    const timing = reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: 0x80 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 3 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(6);
    expect(timing!.sourceCycles).toBe(12);
  });

  it("fails closed for invalid flags or a widened source-only input", () => {
    expect(reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: -1 })).toBeNull();
    expect(reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: 0x100 })).toBeNull();
    expect(reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: 0x80, trackPointer: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: 0x80, trackCount: 2 })).toBeNull();
    expect(reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: 0x80, channel: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: 0x80, frame: 1 })).toBeNull();
    expect(reduceCgb4FirstTrackVolPitchTiming(undefined)).toBeNull();
  });

  it("freezes v25 artifacts, joins only its three digests, and preserves all null seams", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1368-1371" },
        musicPlayerTrack: {
          volumePitchMask: {
            volumeChange: { name: "MPT_FLG_VOLCHG", value: "0x03" },
            pitchChange: { name: "MPT_FLG_PITCHG", value: "0x0c" },
            orMask: "0x0f",
            runtimeValue: null,
          },
        },
      },
      elf: {
        containingEntry: "0x082dfc00",
        instructionStart: "0x082dfc08",
        endExclusive: "0x082dfc0e",
        takenSuccessor: "0x082dfc9a",
        nextSequentialInstruction: "0x082dfc0e",
      },
      compiledRegions: [{
        role: "movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62",
        start: "0x082dfc08",
        endExclusive: "0x082dfc0e",
        bytes: 6,
        bytesHex: "0f 21 01 42 45 d0",
        sha256: "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4",
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        memoryAccesses: 0,
        dataAccessPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV25EvidenceSha256: V25_EVIDENCE_SHA256,
      acceptedV25DocSha256: V25_DOC_SHA256,
      acceptedV25PacketSha256: V25_PACKET_HASHES,
      v25EvidenceAndReportRegenerateByteForByte: true,
      v25EvidenceReportAndPacketsRetainedByteForByte: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v25.json")).toBe(V25_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v25.md")).toBe(V25_DOC_SHA256);
    for (const [name, hash] of Object.entries(V25_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v25", `${name}.json`))).toBe(hash);
    }
    expect(evidence.capture).toEqual({
      boundary: "source-only _081DD9D0 volume/pitch-mask decision through beq; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "track pointer", "runtime address", "track count", "track index", "track identity",
        "channel", "frame", "duration", "condition flags", "wider state", "firstTrackFlags serialization",
        "mov r9, r2 and later body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV25SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v25-selected-row",
        "unsupported-runtime-field", "unexpected-frozen-v25-flags", "unexpected-observed-route",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV25SelectedRows: 3,
      sourceOnlyVolPitchDecisionRows: 3,
      frozenFirstTrackFlagsValues: [0x80],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: 3,
      volPitchMaskNonzeroRows: 0,
      postV25FirstTrackVolPitchDecisionSourceCycles: 36,
      acceptedContiguousPrefixThroughFirstTrackExistDecisionSourceCycles: 5764,
      contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles: 5800,
      sequentialThumbHalfwords: 9,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      failClosedUnobservedVolPitchMaskNonzeroSourceCycles: 6,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      volPitchMaskDecision: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      postV25FirstTrackVolPitchDecisionSourceCycles: 12,
      contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles: 828,
      beqTakenControlTransferRefills: 1,
      stopsBeforeV26Instruction: "_081DDA62: first instruction",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles",
        "postV25FirstTrackVolPitchDecisionSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV26Instruction",
        "volPitchMaskDecision",
      ]);
      expect(row.firstTrackFlags).toBeUndefined();
      expect(row.trackPointer).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV25ArtifactsReadOnly: true,
      frozenV25ArtifactsAreNotProductionImports: true,
      v25PacketsAreNotProductionImports: true,
      v26RuntimeCaptureCount: 0,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      widerState: null,
      firstTrackFlags: null,
      laterBody: null,
      serviceCost: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("regenerates v26 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v26-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v26-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v26.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v26.json", "issue55-m4a-note-body-cgb4-v26.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v26.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v26.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
