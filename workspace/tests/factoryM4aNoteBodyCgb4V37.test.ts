import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4FourthTrackFlagsTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v37.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v37.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v37.md";
const V36_EVIDENCE_SHA256 = "58dc2bc3a5b9973684c6c9bf015e3c2e449d15da6fa446c6c09c555b88938410";
const V36_DOC_SHA256 = "847569d4455a7410eb879db3770b2eb5cac61300f00f9b02036ed068703b188e";
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

describe("Issue #55 CGB4 fourth-track MPT_FLG_EXIST decision v37", () => {
  let evidence: any;

  beforeAll(() => {
    evidence = makeEvidence();
  });

  it("prices the observed EXIST-set route and the source-consistent absent route", () => {
    expect(reduceCgb4FourthTrackFlagsTiming({ fourthTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_EXIST-set-beq-not-taken",
      fourthTrackFlags: 0x80,
      sequentialThumbHalfwords: 4,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 8,
      stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    });
    expect(reduceCgb4FourthTrackFlagsTiming({ fourthTrackFlags: 0x00 })).toEqual({
      route: "MPT_FLG_EXIST-clear-beq-taken",
      fourthTrackFlags: 0x00,
      sequentialThumbHalfwords: 4,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 14,
      stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
    });
  });

  it("red-first rejects the missing six-cycle refill on the clear route", () => {
    const timing = reduceCgb4FourthTrackFlagsTiming({ fourthTrackFlags: 0x00 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 4 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(8);
    expect(timing!.sourceCycles).toBe(14);
  });

  it("fails closed on malformed or widened fourth-track state", () => {
    for (const value of [
      undefined,
      null,
      {},
      { fourthTrackFlags: -1 },
      { fourthTrackFlags: 0x100 },
      { fourthTrackFlags: 128.5 },
      { fourthTrackFlags: 0x80, pointer: "forbidden" },
      { fourthTrackFlags: 0x80, address: "forbidden" },
      { fourthTrackFlags: 0x80, runtimeAddress: "forbidden" },
      { fourthTrackFlags: 0x80, trackCount: 4 },
      { fourthTrackFlags: 0x80, trackIndex: 3 },
      { fourthTrackFlags: 0x80, trackIdentity: "forbidden" },
      { fourthTrackFlags: 0x80, channel: "forbidden" },
      { fourthTrackFlags: 0x80, frame: 1 },
      { fourthTrackFlags: 0x80, duration: 1 },
      { fourthTrackFlags: 0x80, conditionFlags: "forbidden" },
      { fourthTrackFlags: 0x80, maskBody: "forbidden" },
      { fourthTrackFlags: 0x80, absentSuccessor: "forbidden" },
      { thirdTrackFlags: 0x80 },
    ]) expect(reduceCgb4FourthTrackFlagsTiming(value)).toBeNull();
  });

  it("pins fresh packet joins, exact source/ELF/ROM pricing, and the bounded rows", () => {
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1360-1367, 1443-1448", sha256: "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c" },
        musicPlayerInfo: { tracks: { offset: 44, width: "pointer", runtimeValue: null }, r5Origin: "MusicPlayerInfo.tracks" },
        musicPlayerTrack: { flagsOffset: 0, existMask: 0x80, assemblerSize: { bytes: 80 }, staticTableStride: { bytes: 80 } },
        staticMplayAndCryTrackStorage: { allCandidateStorageClass: "IWRAM", selectedRuntimeTrack: null, runtimePointerOrAddress: null },
      },
      elf: { flagsEntry: "0x082dfc00", stopBoundary: "0x082dfc08", absentSuccessor: "0x082dfc9a", selectedRuntimeTrack: null, runtimePointerOrAddress: null, allCandidateTrackStorageClass: "IWRAM" },
      compiledRegions: [{
        role: "ldrb flags; movs MPT_FLG_EXIST; tst; beq _081DDA62",
        start: "0x082dfc00",
        endExclusive: "0x082dfc08",
        bytes: 8,
        bytesHex: "28 78 80 21 01 42 48 d0",
        sha256: "3a41edf45b6169cf3cdcf4ee298a61c576e224d16df2d3f31aa2dba9ec8e6c66",
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
      acceptedV36EvidenceSha256: V36_EVIDENCE_SHA256,
      acceptedV36DocSha256: V36_DOC_SHA256,
      v36EvidenceAndReportRegenerateByteForByte: true,
      v36EvidenceAndReportRetainedByteForByte: true,
      v37PacketSha256: V37_PACKET_HASHES,
      v37PacketRepeatSha256: V37_PACKET_HASHES,
      v37PacketRepeatIdentity: true,
      v37FreshSerialRunsPerCase: 2,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v36.json")).toBe(V36_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v36.md")).toBe(V36_DOC_SHA256);
    expect(sha256(EVIDENCE)).toBe("59c5f83c2e70f21cb96076fd04e0b3d4829c8d50e3f2988e437063eabc36861c");
    expect(sha256(DOC)).toBe("5cf3314ae5beb43203e81e59970235141862dda3fff4d314d01f9e6ca5aec601");
    for (const [name, hash] of Object.entries(V37_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v37", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      expect(packet.oracleProfile).toBe("battle-scene-off");
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["fourthTrackFlags", "sourceStateDigest"]);
    }
    expect(evidence.coverage).toEqual({
      frozenV36SelectedRows: 3,
      packetRowsByCase: { anchor: 0, liliana: 1, "factory-varied": 2 },
      fourthTrackFlagsRows: 3,
      fourthTrackFlagsValues: [0x80],
      existSetRows: 3,
      existClearRows: 0,
      postV36FourthTrackExistDecisionSourceCycles: 24,
      acceptedContiguousPrefixThroughThirdTrackContinuationSourceCycles: 6064,
      contiguousPrefixThroughFourthTrackExistDecisionSourceCycles: 6088,
      sequentialThumbHalfwords: 12,
      iwramByteLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      sourceRoutePricing: { existSetSourceCycles: 8, existClearSourceCycles: 14 },
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      fourthTrackFlags: 0x80,
      fourthTrackExistDecision: "MPT_FLG_EXIST-set-beq-not-taken",
      postV36FourthTrackExistDecisionSourceCycles: 8,
      contiguousPrefixThroughFourthTrackExistDecisionSourceCycles: 924,
      beqTakenControlTransferRefills: 0,
      stopsBeforeV37Instruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughFourthTrackExistDecisionSourceCycles",
        "fourthTrackExistDecision",
        "fourthTrackFlags",
        "postV36FourthTrackExistDecisionSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV37Instruction",
      ]);
      expect(row.pointer).toBeUndefined();
      expect(row.trackPointer).toBeUndefined();
      expect(row.runtimeAddress).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.nextTrackFlags).toBeUndefined();
      expect(row.maskBody).toBeUndefined();
      expect(row.absentSuccessor).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV36ArtifactsReadOnly: true,
      frozenV36ArtifactsAreNotProductionImports: true,
      v37FreshPacketsAddressFree: true,
      v37RuntimeCaptureCount: 3,
      fourthTrackFlags: "address-free scalar only",
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      maskBody: null,
      absentSuccessorBody: null,
      completeMPlay: null,
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

  it("regenerates v37 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v37-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v37-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v37.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v37.json", "issue55-m4a-note-body-cgb4-v37.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v37.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v37.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
