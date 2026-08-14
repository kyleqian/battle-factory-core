import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4FourthTrackDecrementTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v39.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v39.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v39.md";
const V38_EVIDENCE_SHA256 = "374076dfde52abfb519edd9e121c851ea55cd1f1ac13bf4675613f2e26d0b8ce";
const V38_DOC_SHA256 = "420b7b300d44302213b6c7ffe48f3ee2a5d63c8d3c8a3ede741839e56d266090";
const V37_PACKET_HASHES = {
  anchor: "4dad511aee6b508723c2ddd5ca283756ca17435c23388ecf374273bbcf86a8c4",
  liliana: "8afcc0bad8bd77c9ae28d442a9a496101af1321c4b71e54b5bb49160197d7a9d",
  "factory-varied": "6f202501970fd31eddb94f489d2e3360fde3ec78d90df6ab4cbdba64f5d81e67",
} as const;
const V39_PACKET_HASHES = {
  anchor: "317c223e01b3907b2016af6e5c4294db06d0f53872fcbdf38d7086bf25244ceb",
  liliana: "496c24229d1e9a542f3763cd26cb0959d0c6320d431b1453e0bb72988f790c74",
  "factory-varied": "68c43a7e757d47f32a383d3d09c03c33f8a92dd82a51b4fdfef8f861f880b343",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 fourth-track decrement/exit decision v39", () => {
  it("derives the observed fourth-track continuation decision from r2 alone", () => {
    expect(reduceCgb4FourthTrackDecrementTiming({ r2BeforeDecrement: 7 })).toEqual({
      route: "subs-r2-1; ble-not-taken",
      r2BeforeDecrement: 7,
      sequentialThumbHalfwords: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      bleTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 4,
      stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size",
    });
  });

  it("source-prices the schema-consistent exit decision including its refill without claiming it observed", () => {
    expect(reduceCgb4FourthTrackDecrementTiming({ r2BeforeDecrement: 1 })).toEqual({
      route: "subs-r2-1; ble-taken",
      r2BeforeDecrement: 1,
      sequentialThumbHalfwords: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      bleTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 10,
      stopsBeforeInstruction: "_081DDA6C: ldr r0, lt2_ID_NUMBER",
    });
  });

  it("red-first rejects the missing-refill four-cycle under-price for the exit", () => {
    const timing = reduceCgb4FourthTrackDecrementTiming({ r2BeforeDecrement: 1 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 2 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(4);
    expect(timing!.sourceCycles).toBe(10);
  });

  it("fails closed on invalid r2 scalars, key mismatch, and prohibited provenance", () => {
    for (const value of [
      undefined,
      {},
      { r2BeforeDecrement: -1 },
      { r2BeforeDecrement: 0x1_0000_0000 },
      { r2BeforeDecrement: 7.5 },
      { r2BeforeDecrement: 7, pointer: "forbidden" },
      { r2BeforeDecrement: 7, address: "forbidden" },
      { r2BeforeDecrement: 7, runtimeAddress: "forbidden" },
      { r2BeforeDecrement: 7, trackCount: 4 },
      { r2BeforeDecrement: 7, trackIndex: 3 },
      { r2BeforeDecrement: 7, trackIdentity: "forbidden" },
      { r2BeforeDecrement: 7, trainer: 9 },
      { r2BeforeDecrement: 7, battleIndex: 2 },
      { r2BeforeDecrement: 7, canonicalTick: 33331 },
      { r2BeforeDecrement: 7, receiptSchedule: "forbidden" },
      { r2BeforeDecrement: 7, unrelatedFutureState: "forbidden" },
      { r2BeforeDecrement: 7, channel: "forbidden" },
      { r2BeforeDecrement: 7, frame: 1 },
      { r2BeforeDecrement: 7, duration: 1 },
      { r2BeforeDecrement: 7, conditionFlags: "forbidden" },
      { r2BeforeDecrement: 7, body: "forbidden" },
      { r2BeforeDecrement: 7, widerState: "forbidden" },
      { r2BeforeDecrement: 7, subtractionResult: 6 },
      { r2BeforeDecrement: 7, successor: "forbidden" },
      { fourthTrackFlags: 0x80 },
    ]) expect(reduceCgb4FourthTrackDecrementTiming(value)).toBeNull();
  });

  it("pins fresh packets, frozen v38/v37 artifacts, exact source/ELF/ROM bytes, branch target, and cycles", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: { assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1443-1450", sha256: "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c" } },
      elf: {
        containingEntry: "0x082dfc00",
        instructionStart: "0x082dfc9a",
        endExclusive: "0x082dfc9e",
        takenSuccessor: "0x082dfca4",
        nextSequentialInstruction: "0x082dfc9e",
        takenSuccessorFirstInstruction: "_081DDA6C: ldr r0, lt2_ID_NUMBER",
        nonTakenSuccessorFirstInstruction: "movs r0, MusicPlayerTrack_size",
      },
      compiledRegions: [{
        role: "subs r2, 0x1; ble _081DDA6C",
        start: "0x082dfc9a",
        endExclusive: "0x082dfc9e",
        bytes: 4,
        bytesHex: "01 3a 02 dd",
        sha256: "a70595d17cb12da032e89ea67903bf3fe0b222c4c87bd2375a1c6eef2aa5791a",
        decodedBle: { condition: "LE", target: "_081DDA6C", targetAddress: "0x082dfca4" },
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        memoryAccesses: 0,
        dataAccessPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
        bleNotTakenModel: "subs; non-taken ble = 2 halfwords * 2 + zero refill = 4",
        bleTakenModel: "subs; taken ble = 2 halfwords * 2 + one 6-cycle refill = 10",
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV38EvidenceSha256: V38_EVIDENCE_SHA256,
      acceptedV38DocSha256: V38_DOC_SHA256,
      acceptedInheritedV37PacketSha256: V37_PACKET_HASHES,
      v38EvidenceAndReportRegenerateByteForByte: true,
      v38EvidenceReportAndInheritedV37PacketsRetainedByteForByte: true,
      v39PacketSha256: V39_PACKET_HASHES,
      v39PacketRepeatSha256: V39_PACKET_HASHES,
      v39PacketRepeatIdentity: true,
      v39FreshSerialRunsPerCase: 2,
    });
    expect(evidence.capture).toEqual({
      boundary: "fourth-track immediately before _081DDA62: subs r2, 0x1; ble _081DDA6C",
      scalars: ["r2BeforeDecrement"],
      packetObservationExactKeys: ["sourceStateDigest", "r2BeforeDecrement"],
      excluded: [
        "pointer", "address", "runtime address", "track count", "track index", "track identity", "trainer", "battle index",
        "canonical tick", "receipt schedule", "unrelated future state", "channel", "frame", "duration", "condition flags",
        "wider state", "subtraction result serialization", "_081DDA6C exit successor body",
        "movs r0, MusicPlayerTrack_size continuation successor body", "fourth-track flags", "volume/pitch mask", "later loop work",
        "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV38SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v38-selected-row", "packet-key-mismatch",
        "unsupported-packet-field", "source-operand-out-of-range", "unexpected-observed-route",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV38SelectedRows: 3,
      packetRowsByCase: { anchor: 0, liliana: 1, "factory-varied": 2 },
      r2BeforeDecrementRows: 3,
      r2BeforeDecrementValues: [7],
      bleNotTakenRows: 3,
      bleTakenRows: 0,
      postV38FourthTrackDecrementDecisionSourceCycles: 12,
      acceptedContiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles: 6124,
      contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles: 6136,
      sequentialThumbHalfwords: 6,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      failClosedSchemaConsistentUnobservedExitSourceCycles: 10,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      r2BeforeDecrement: 7,
      fourthTrackDecrementDecision: "subs-r2-1; ble-not-taken",
      postV38FourthTrackDecrementDecisionSourceCycles: 4,
      contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles: 940,
      bleTakenControlTransferRefills: 0,
      stopsBeforeV39Instruction: "movs r0, MusicPlayerTrack_size",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bleTakenControlTransferRefills",
        "contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles",
        "fourthTrackDecrementDecision",
        "postV38FourthTrackDecrementDecisionSourceCycles",
        "r2BeforeDecrement",
        "sourceStateDigest",
        "stopsBeforeV39Instruction",
      ]);
      expect(row.pointer).toBeUndefined();
      expect(row.address).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.trainer).toBeUndefined();
      expect(row.battleIndex).toBeUndefined();
      expect(row.canonicalTick).toBeUndefined();
      expect(row.receiptSchedule).toBeUndefined();
      expect(row.unrelatedFutureState).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
      expect(row.subtractionResult).toBeUndefined();
      expect(row.body).toBeUndefined();
      expect(row.successor).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV38ArtifactsReadOnly: true,
      inheritedV37PacketsRetainedReadOnly: true,
      v39FreshPacketsAddressFree: true,
      v39RuntimeCaptureCount: 3,
      trainer: null,
      battleIndex: null,
      canonicalTick: null,
      receiptSchedule: null,
      unrelatedFutureState: null,
      trackPointer: null,
      pointer: null,
      address: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      widerState: null,
      fourthTrackFlags: null,
      volumePitchMask: null,
      subtractionResult: null,
      continuationBody: null,
      exitBody: null,
      laterLoopWork: null,
      constructionClock: null,
      presentation: null,
      animation: null,
      rust: null,
      canonicalBattle2: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("keeps every fresh packet to exactly the digest and r2 scalar", () => {
    for (const [name, hash] of Object.entries(V39_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v39", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const observation of packet.observations) {
        expect(Object.keys(observation).sort()).toEqual(["r2BeforeDecrement", "sourceStateDigest"]);
        expect(observation.r2BeforeDecrement).toBe(7);
      }
    }
  });

  it("retains v38 evidence/report and all inherited v37 packets byte-for-byte", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v38.json")).toBe(V38_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v38.md")).toBe(V38_DOC_SHA256);
    for (const [name, hash] of Object.entries(V37_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v37", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const observation of packet.observations) expect(Object.keys(observation).sort()).toEqual(["fourthTrackFlags", "sourceStateDigest"]);
    }
  });

  it("regenerates v39 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v39-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v39-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v39.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v39.json", "issue55-m4a-note-body-cgb4-v39.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v39.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v39.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
