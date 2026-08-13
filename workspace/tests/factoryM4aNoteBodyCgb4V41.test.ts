import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4FifthTrackFlagsTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v41.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v41.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v41.md";
const V40_EVIDENCE_SHA256 = "2bd6f1b5d6e94d09d333c4937c2588b6f6aa4f4191c3654d27f8567d71ecfb2a";
const V40_DOC_SHA256 = "459acae2f4df10cf86072b96dbfef292b34c2a5aeaa55e783fa3f45bba67f0e3";
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
const V41_PACKET_HASHES = {
  anchor: "79baf363f8822c218b0c1e627c9ce033631ad3b3b513e7f54c7c1558b7120cc8",
  liliana: "1938050ae62a1e5465e8025e357fc9ff5c4b4d307f8d3a9e7cfd382d897dd24e",
  "factory-varied": "234edd165872f3b2294185f77ced262a09f9ea3696fe83271444164e63035332",
} as const;
const SELECTED = [
  ["2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e", 0x83],
  ["c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902", 0x80],
  ["e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8", 0x80],
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Issue #55 CGB4 fifth-track MPT_FLG_EXIST decision v41", () => {
  let evidence: any;

  beforeAll(() => {
    evidence = makeEvidence();
  });

  it("source-prices the selected EXIST-set route and the fail-closed clear alternative", () => {
    expect(reduceCgb4FifthTrackFlagsTiming({ fifthTrackFlags: 0x83 })).toEqual({
      route: "MPT_FLG_EXIST-set-beq-not-taken",
      fifthTrackFlags: 0x83,
      sequentialThumbHalfwords: 4,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 8,
      stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    });
    expect(reduceCgb4FifthTrackFlagsTiming({ fifthTrackFlags: 0x00 })).toEqual({
      route: "MPT_FLG_EXIST-clear-beq-taken",
      fifthTrackFlags: 0x00,
      sequentialThumbHalfwords: 4,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 14,
      stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
    });
    expect(6172 + 3 * 8).toBe(6196);
  });

  it("red-first rejects a clear-route price that omits the taken-branch refill", () => {
    const timing = reduceCgb4FifthTrackFlagsTiming({ fifthTrackFlags: 0x00 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 4 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(8);
    expect(timing!.sourceCycles).toBe(14);
  });

  it("fails closed on malformed, predecessor, pointer, mask/body, successor, or later-loop state", () => {
    for (const value of [
      undefined,
      null,
      {},
      { fifthTrackFlags: -1 },
      { fifthTrackFlags: 0x100 },
      { fifthTrackFlags: 128.5 },
      { fifthTrackFlags: 0x80, pointer: "forbidden" },
      { fifthTrackFlags: 0x80, trackPointer: "forbidden" },
      { fifthTrackFlags: 0x80, address: "forbidden" },
      { fifthTrackFlags: 0x80, runtimeAddress: "forbidden" },
      { fifthTrackFlags: 0x80, trackCount: 7 },
      { fifthTrackFlags: 0x80, trackIndex: 4 },
      { fifthTrackFlags: 0x80, trackIdentity: "forbidden" },
      { fifthTrackFlags: 0x80, fourthTrackFlags: 0x80 },
      { fifthTrackFlags: 0x80, fifthTrackVolPitchMask: "forbidden" },
      { fifthTrackFlags: 0x80, fifthTrackBody: "forbidden" },
      { fifthTrackFlags: 0x80, absentSuccessorBody: "forbidden" },
      { fifthTrackFlags: 0x80, fifthTrackDecrement: "forbidden" },
      { fifthTrackFlags: 0x80, continuation: "forbidden" },
      { fifthTrackFlags: 0x80, exitBody: "forbidden" },
      { fifthTrackFlags: 0x80, widerLoop: "forbidden" },
      { fifthTrackFlags: 0x80, channel: "forbidden" },
      { fifthTrackFlags: 0x80, frame: 1 },
      { fifthTrackFlags: 0x80, duration: 1 },
      { fifthTrackFlags: 0x80, conditionFlags: "forbidden" },
    ]) expect(reduceCgb4FifthTrackFlagsTiming(value)).toBeNull();
  });

  it("freezes v40 and inherited OFF packets while pinning the fifth-loop source/ELF/ROM decision", () => {
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1360-1367, 1443-1450", loopHead: "_081DD9C8", sha256: "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c" },
        musicPlayerInfo: { tracks: { offset: 44, width: "pointer", runtimeValue: null }, r5Origin: "MusicPlayerInfo.tracks" },
        musicPlayerTrack: { flagsOffset: 0, existMask: 0x80, assemblerSize: { bytes: 80 }, staticTableStride: { bytes: 80 } },
        staticMplayAndCryTrackStorage: { allCandidateStorageClass: "IWRAM", selectedRuntimeTrack: null, runtimePointerOrAddress: null },
      },
      elf: { flagsEntry: "0x082dfc00", stopBoundary: "0x082dfc08", existClearSuccessor: "0x082dfc9a", selectedRuntimeTrack: null, runtimePointerOrAddress: null, allCandidateTrackStorageClass: "IWRAM" },
      compiledRegions: [{
        role: "ldrb flags; movs MPT_FLG_EXIST; tst; beq _081DDA62",
        sourceAddress: "_081DD9C8",
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
        fifthTrackPointerBound: "r5 = MusicPlayerInfo.tracks + 4 * MusicPlayerTrack_size; selector only",
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV40EvidenceSha256: V40_EVIDENCE_SHA256,
      acceptedV40DocSha256: V40_DOC_SHA256,
      acceptedInheritedV39PacketSha256: V39_PACKET_HASHES,
      acceptedInheritedV37PacketSha256: V37_PACKET_HASHES,
      v40EvidenceAndReportRegenerateByteForByte: true,
      v40EvidenceReportAndAllInheritedOffPacketsRetainedByteForByte: true,
      v41PacketSha256: V41_PACKET_HASHES,
      v41PacketRepeatSha256: V41_PACKET_HASHES,
      v41PacketRepeatIdentity: true,
      v41FreshSerialRunsPerCase: 2,
    });
    expect(evidence.capture).toEqual({
      boundary: "fifth-track loop post-_081DD9C8 ldrb r0 flags, before movs r1, MPT_FLG_EXIST",
      scalars: ["fifthTrackFlags"],
      packetObservationExactKeys: ["sourceStateDigest", "fifthTrackFlags"],
      excluded: [
        "pointer", "address", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration",
        "condition flags", "wider state", "fourth-track state", "fifth-track volume/pitch mask or body", "absent-track successor body",
        "fifth-track decrement or continuation", "exit body", "later loop work", "other 75 callbacks",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV40SelectedRows: 3,
      packetRowsByCase: { anchor: 0, liliana: 1, "factory-varied": 2 },
      fifthTrackFlagsRows: 3,
      fifthTrackFlagsValues: [0x80, 0x83],
      existSetRows: 3,
      existClearRows: 0,
      postV40FifthTrackExistDecisionSourceCycles: 24,
      acceptedContiguousPrefixThroughFourthTrackContinuationSourceCycles: 6172,
      contiguousPrefixThroughFifthTrackExistDecisionSourceCycles: 6196,
      sequentialThumbHalfwords: 12,
      iwramByteLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      sourceRoutePricing: { existSetSourceCycles: 8, existClearSourceCycles: 14 },
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toEqual(SELECTED.map(([sourceStateDigest, fifthTrackFlags]) => ({
      sourceStateDigest,
      fifthTrackFlags,
      fifthTrackExistDecision: "MPT_FLG_EXIST-set-beq-not-taken",
      postV40FifthTrackExistDecisionSourceCycles: 8,
      contiguousPrefixThroughFifthTrackExistDecisionSourceCycles: 960,
      beqTakenControlTransferRefills: 0,
      stopsBeforeV41Instruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughFifthTrackExistDecisionSourceCycles",
        "fifthTrackExistDecision",
        "fifthTrackFlags",
        "postV40FifthTrackExistDecisionSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV41Instruction",
      ]);
      expect(row.pointer).toBeUndefined();
      expect(row.trackPointer).toBeUndefined();
      expect(row.address).toBeUndefined();
      expect(row.runtimeAddress).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.fourthTrackFlags).toBeUndefined();
      expect(row.fifthTrackVolPitchMask).toBeUndefined();
      expect(row.fifthTrackBody).toBeUndefined();
      expect(row.absentSuccessorBody).toBeUndefined();
      expect(row.fifthTrackDecrement).toBeUndefined();
      expect(row.fifthTrackContinuation).toBeUndefined();
      expect(row.exitBody).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV40ArtifactsReadOnly: true,
      inheritedV39PacketsRetainedReadOnly: true,
      inheritedV37PacketsRetainedReadOnly: true,
      frozenV40ArtifactsAreNotProductionImports: true,
      v41FreshPacketsAddressFree: true,
      v41RuntimeCaptureCount: 3,
      fifthTrackFlags: "address-free scalar only",
      pointer: null,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      fifthTrackVolPitchMask: null,
      fifthTrackBody: null,
      absentSuccessorBody: null,
      fifthTrackDecrement: null,
      fifthTrackContinuation: null,
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

  it("retains v40, all inherited OFF packets, and v41's compact packets byte-for-byte", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v40.json")).toBe(V40_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v40.md")).toBe(V40_DOC_SHA256);
    for (const [name, hash] of Object.entries(V39_PACKET_HASHES)) {
      const packet = JSON.parse(readFileSync(join("tests/fixtures/factory-m4a-note-body-cgb4-v39", `${name}.json`), "utf8"));
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v39", `${name}.json`))).toBe(hash);
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["r2BeforeDecrement", "sourceStateDigest"]);
    }
    for (const [name, hash] of Object.entries(V37_PACKET_HASHES)) {
      const packet = JSON.parse(readFileSync(join("tests/fixtures/factory-m4a-note-body-cgb4-v37", `${name}.json`), "utf8"));
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v37", `${name}.json`))).toBe(hash);
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["fourthTrackFlags", "sourceStateDigest"]);
    }
    for (const [name, hash] of Object.entries(V41_PACKET_HASHES)) {
      const packet = JSON.parse(readFileSync(join("tests/fixtures/factory-m4a-note-body-cgb4-v41", `${name}.json`), "utf8"));
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v41", `${name}.json`))).toBe(hash);
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["fifthTrackFlags", "sourceStateDigest"]);
    }
  });

  it("regenerates v41 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v41-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v41-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v41.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v41.json", "issue55-m4a-note-body-cgb4-v41.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v41.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v41.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
