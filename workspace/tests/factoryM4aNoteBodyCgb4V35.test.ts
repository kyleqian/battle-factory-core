import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4ThirdTrackDecrementTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v35.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v35.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v35.md";
const V34_EVIDENCE_SHA256 = "49a6bd712f69f16f92f51c2058be7a1fe2d5b54fe277afec2be68b54df06690c";
const V34_DOC_SHA256 = "c7133ef394e44089521e318f461f89ea11ef097bdf00710fbc9b5ad7d20e01d1";
const V33_PACKET_HASHES = {
  anchor: "5b200f46ea9182f5f1ba1f349b07f012b282f2d96157c2b49c0cee0e163b88c9",
  liliana: "edb093d86fd4deffdc39f2802d545d2422d3ca94ece18883d6d8dd2522c3bc13",
  "factory-varied": "a6e227b52726b060268a24d01aa404bcf54b576d3640cbdb85d76d9ffe4a4411",
} as const;
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

describe("Issue #55 CGB4 third-track decrement/exit decision v35", () => {
  it("derives the observed positive third-track route from r2 alone", () => {
    expect(reduceCgb4ThirdTrackDecrementTiming({ r2BeforeDecrement: 8 })).toEqual({
      route: "subs-r2-1; ble-not-taken",
      r2BeforeDecrement: 8,
      sequentialThumbHalfwords: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      bleTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 4,
      stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size",
    });
  });

  it("source-prices the schema-consistent exit route including its refill without claiming it observed", () => {
    expect(reduceCgb4ThirdTrackDecrementTiming({ r2BeforeDecrement: 1 })).toEqual({
      route: "subs-r2-1; ble-taken",
      r2BeforeDecrement: 1,
      sequentialThumbHalfwords: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      bleTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 10,
      stopsBeforeInstruction: "_081DDA6C: first instruction",
    });
  });

  it("red-first rejects the missing-refill four-cycle under-price for the exit", () => {
    const timing = reduceCgb4ThirdTrackDecrementTiming({ r2BeforeDecrement: 1 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 2 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(4);
    expect(timing!.sourceCycles).toBe(10);
  });

  it("fails closed on invalid r2 scalars, key mismatch, or packet widening", () => {
    for (const value of [
      undefined,
      {},
      { r2BeforeDecrement: -1 },
      { r2BeforeDecrement: 0x1_0000_0000 },
      { r2BeforeDecrement: 8.5 },
      { r2BeforeDecrement: 8, pointer: "forbidden" },
      { r2BeforeDecrement: 8, address: "forbidden" },
      { r2BeforeDecrement: 8, runtimeAddress: "forbidden" },
      { r2BeforeDecrement: 8, trackCount: 3 },
      { r2BeforeDecrement: 8, trackIndex: 2 },
      { r2BeforeDecrement: 8, trackIdentity: "forbidden" },
      { r2BeforeDecrement: 8, channel: "forbidden" },
      { r2BeforeDecrement: 8, frame: 1 },
      { r2BeforeDecrement: 8, duration: 1 },
      { r2BeforeDecrement: 8, conditionFlags: "forbidden" },
      { r2BeforeDecrement: 8, body: "forbidden" },
      { r2BeforeDecrement: 8, widerState: "forbidden" },
      { r2BeforeDecrement: 8, subtractionResult: 7 },
      { r2BeforeDecrement: 8, successor: "forbidden" },
      { thirdTrackFlags: 0x80 },
    ]) expect(reduceCgb4ThirdTrackDecrementTiming(value)).toBeNull();
  });

  it("pins fresh packets, frozen v34, exact source/ELF/ROM bytes, route, and cycles", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: { assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1443-1450", sha256: "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c" } },
      elf: {
        containingEntry: "0x082dfc00",
        instructionStart: "0x082dfc9a",
        endExclusive: "0x082dfc9e",
        takenSuccessor: "0x082dfca4",
        nextSequentialInstruction: "0x082dfc9e",
      },
      compiledRegions: [{
        role: "subs r2, 0x1; ble _081DDA6C",
        start: "0x082dfc9a",
        endExclusive: "0x082dfc9e",
        bytes: 4,
        bytesHex: "01 3a 02 dd",
        sha256: "a70595d17cb12da032e89ea67903bf3fe0b222c4c87bd2375a1c6eef2aa5791a",
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        memoryAccesses: 0,
        dataAccessPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV34EvidenceSha256: V34_EVIDENCE_SHA256,
      acceptedV34DocSha256: V34_DOC_SHA256,
      acceptedInheritedV33PacketSha256: V33_PACKET_HASHES,
      v34EvidenceAndReportRegenerateByteForByte: true,
      v34EvidenceReportAndInheritedV33PacketsRetainedByteForByte: true,
      v35PacketSha256: V35_PACKET_HASHES,
      v35PacketRepeatSha256: V35_PACKET_HASHES,
      v35PacketRepeatIdentity: true,
      v35FreshSerialRunsPerCase: 2,
    });
    expect(evidence.capture).toEqual({
      boundary: "third-track immediately before _081DDA62: subs r2, 0x1; ble _081DDA6C",
      scalars: ["r2BeforeDecrement"],
      packetObservationExactKeys: ["sourceStateDigest", "r2BeforeDecrement"],
      excluded: [
        "pointer", "address", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration",
        "condition flags", "wider state", "subtraction result serialization", "_081DDA6C exit successor body",
        "movs r0, MusicPlayerTrack_size continuation successor body", "third-track flags", "volume/pitch mask", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV34SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v34-selected-row", "packet-key-mismatch", "unsupported-packet-field", "source-operand-out-of-range", "unexpected-observed-route"],
    });
    expect(evidence.coverage).toEqual({
      frozenV34SelectedRows: 3,
      packetRowsByCase: { anchor: 0, liliana: 1, "factory-varied": 2 },
      r2BeforeDecrementRows: 3,
      r2BeforeDecrementValues: [8],
      bleNotTakenRows: 3,
      bleTakenRows: 0,
      postV34ThirdTrackDecrementDecisionSourceCycles: 12,
      acceptedContiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles: 6016,
      contiguousPrefixThroughThirdTrackDecrementDecisionSourceCycles: 6028,
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
      r2BeforeDecrement: 8,
      thirdTrackDecrementDecision: "subs-r2-1; ble-not-taken",
      postV34ThirdTrackDecrementDecisionSourceCycles: 4,
      contiguousPrefixThroughThirdTrackDecrementDecisionSourceCycles: 904,
      bleTakenControlTransferRefills: 0,
      stopsBeforeV35Instruction: "movs r0, MusicPlayerTrack_size",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bleTakenControlTransferRefills",
        "contiguousPrefixThroughThirdTrackDecrementDecisionSourceCycles",
        "postV34ThirdTrackDecrementDecisionSourceCycles",
        "r2BeforeDecrement",
        "sourceStateDigest",
        "stopsBeforeV35Instruction",
        "thirdTrackDecrementDecision",
      ]);
      expect(row.trackPointer).toBeUndefined();
      expect(row.runtimeAddress).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
      expect(row.subtractionResult).toBeUndefined();
      expect(row.body).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV34ArtifactsReadOnly: true,
      inheritedV33PacketsRetainedReadOnly: true,
      v35FreshPacketsAddressFree: true,
      v35RuntimeCaptureCount: 3,
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
      subtractionResult: null,
      continuationBody: null,
      exitBody: null,
      constructionClock: null,
      presentation: null,
      animation: null,
      rust: null,
      canonicalBattle2: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("keeps every fresh packet to exactly the digest and r2 scalar", () => {
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

  it("retains v34 evidence/report and inherited v33 packets byte-for-byte", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v34.json")).toBe(V34_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v34.md")).toBe(V34_DOC_SHA256);
    for (const [name, hash] of Object.entries(V33_PACKET_HASHES)) expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v33", `${name}.json`))).toBe(hash);
  });

  it("regenerates v35 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v35-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v35-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v35.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v35.json", "issue55-m4a-note-body-cgb4-v35.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v35.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v35.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
