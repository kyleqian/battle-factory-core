import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4FirstTrackFlagsTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v25.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v25.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v25.md";
const V24_EVIDENCE_SHA256 = "288bb342ff0e321c1d09646998bb30fde48b564015f487b9ea293dd21245e491";
const V24_DOC_SHA256 = "be4b6a319ca0ac082b46629daf928640670e7e19ec4e5247c8d1b8b9d618e8ab";
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

describe("Issue #55 CGB4 first-track MPT_FLG_EXIST decision v25", () => {
  it("prices the observed EXIST-set route from the one flags scalar", () => {
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_EXIST-set-beq-not-taken",
      firstTrackFlags: 0x80,
      sequentialThumbHalfwords: 4,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 8,
      stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    });
    expect(5740 + 3 * 8).toBe(5764);
  });

  it("source-prices the flags-absent taken-beq route but stops before its target body", () => {
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0 })).toEqual({
      route: "MPT_FLG_EXIST-clear-beq-taken",
      firstTrackFlags: 0,
      sequentialThumbHalfwords: 4,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 14,
      stopsBeforeInstruction: "_081DDA62: first instruction",
    });
  });

  it("red-first rejects the missing-refill, wrong-route eight-cycle under-price for an absent flag", () => {
    const timing = reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 4 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(8);
    expect(timing!.sourceCycles).toBe(14);
  });

  it("fails closed for invalid flags or an attempted packet widening", () => {
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: -1 })).toBeNull();
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0x100 })).toBeNull();
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0x80, trackPointer: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0x80, trackCount: 2 })).toBeNull();
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0x80, trackIndex: 0 })).toBeNull();
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0x80, channel: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackFlagsTiming({ firstTrackFlags: 0x80, frame: 1 })).toBeNull();
  });

  it("freezes v24, joins only its three rows, and preserves the address-free strip-back", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1362-1368" },
        musicPlayerTrack: {
          flags: { offset: 0, width: "u8", runtimeValue: null },
          existMask: { name: "MPT_FLG_EXIST", value: "0x80" },
        },
        staticTrackStorage: {
          ordinaryPlayers: 4,
          cryPlayers: 2,
          selectedStorage: null,
          mPlayOpen: { allCandidateTrackStorage: "IWRAM" },
          linker: { class: "IWRAM", origin: "0x03000000" },
        },
      },
      elf: {
        entry: "0x082dfc00",
        endExclusive: "0x082dfc08",
        existClearSuccessor: "0x082dfc9a",
        tracks: { selectedRuntimeTrack: null, gPokemonCryTracks: { class: "IWRAM" } },
      },
      compiledRegions: [{
        role: "ldrb r0, [r5, flags]; movs r1, MPT_FLG_EXIST; tst r1, r0; beq _081DDA62",
        start: "0x082dfc00",
        endExclusive: "0x082dfc08",
        bytes: 8,
        bytesHex: "28 78 80 21 01 42 48 d0",
        sha256: "3a41edf45b6169cf3cdcf4ee298a61c576e224d16df2d3f31aa2dba9ec8e6c66",
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        iwramByteLoadPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV24EvidenceSha256: V24_EVIDENCE_SHA256,
      acceptedV24DocSha256: V24_DOC_SHA256,
      v24RegeneratesByteForByte: true,
      v24EvidenceAndReportRetainedByteForByte: true,
      v25PacketSha256: V25_PACKET_HASHES,
      v25PacketRepeatSha256: V25_PACKET_HASHES,
      v25PacketRepeatIdentity: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v24.json")).toBe(V24_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v24.md")).toBe(V24_DOC_SHA256);
    expect(evidence.capture).toEqual({
      boundary: "post-_081DD9C8 ldrb r0 flags, before movs r1, MPT_FLG_EXIST",
      scalars: ["firstTrackFlags"],
      excluded: [
        "pointer", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration",
        "condition flags", "wider state", "MPT_FLG_VOLCHG|MPT_FLG_PITCHG decision", "successor loop body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV24SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v24-selected-row", "unsupported-packet-field", "unexpected-observed-route"],
    });
    expect(evidence.coverage).toEqual({
      frozenV24SelectedRows: 3,
      packetRowsByCase: { anchor: 0, liliana: 1, "factory-varied": 2 },
      firstTrackFlagsRows: 3,
      firstTrackFlagsValues: [0x80],
      existSetRows: 3,
      existClearRows: 0,
      priorExistSetRowsRemainNull: 4,
      postV24FirstTrackExistDecisionSourceCycles: 24,
      acceptedContiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles: 5740,
      contiguousPrefixThroughFirstTrackExistDecisionSourceCycles: 5764,
      sequentialThumbHalfwords: 12,
      iwramByteLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      failClosedUnobservedExistClearSourceCycles: 14,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      firstTrackFlags: 0x80,
      firstTrackExistDecision: "MPT_FLG_EXIST-set-beq-not-taken",
      postV24FirstTrackExistDecisionSourceCycles: 8,
      contiguousPrefixThroughFirstTrackExistDecisionSourceCycles: 816,
      beqTakenControlTransferRefills: 0,
      stopsBeforeV25Instruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughFirstTrackExistDecisionSourceCycles",
        "firstTrackExistDecision",
        "firstTrackFlags",
        "postV24FirstTrackExistDecisionSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV25Instruction",
      ]);
      expect(row.trackPointer).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      v25PacketStripBackPreserved: true,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      channel: null,
      frame: null,
      duration: null,
      widerState: null,
      priorExistSetRows: null,
      successorLoopBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("keeps every captured packet to exactly the digest and first-track flags scalar", () => {
    for (const [name, hash] of Object.entries(V25_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v25", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      for (const observation of packet.observations) {
        expect(Object.keys(observation).sort()).toEqual(["firstTrackFlags", "sourceStateDigest"]);
        expect(observation.firstTrackFlags).toBe(0x80);
      }
    }
  });

  it("regenerates v25 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v25-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v25-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v25.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v25.json", "issue55-m4a-note-body-cgb4-v25.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v25.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v25.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
