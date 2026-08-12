import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4FirstTrackDecrementTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v27.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v27.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v27.md";
const V26_EVIDENCE_SHA256 = "a4cff030582607369f63bd70cb1ed6a3c5afad4d36997d0f3626684a9122bae1";
const V26_DOC_SHA256 = "2eb2f9e4ccb12149145a881d24d63e552caf05515d73fc1eb95ccf206803636c";
const V25_PACKET_HASHES = {
  anchor: "3ac4e4a8797b7e459c15019e7f847dce592643f604cdc437e74074dfc8d6d1a7",
  liliana: "ce74203999ee3d5492f060ef879483403002c06ab501776e7063b0fa1421d4da",
  "factory-varied": "bd289cb97eaafe49b63ce41c9b1546037b899394d7cdaf25998efcc6427646b5",
} as const;
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

describe("Issue #55 CGB4 first-track decrement/exit decision v27", () => {
  it("derives the observed non-exit route from r2 alone", () => {
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 10 })).toEqual({
      route: "subs-r2-1; ble-not-taken",
      r2BeforeDecrement: 10,
      sequentialThumbHalfwords: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      bleTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 4,
      stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size",
    });
    expect(5800 + 3 * 4).toBe(5812);
  });

  it("source-prices the schema-consistent exit route including its refill without claiming it observed", () => {
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 1 })).toEqual({
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

  it("red-first rejects the missing-refill six-cycle under-price for the source-priced exit", () => {
    const timing = reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 1 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 2 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(4);
    expect(timing!.sourceCycles).toBe(10);
  });

  it("fails closed for invalid r2 operands or a widened packet", () => {
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: -1 })).toBeNull();
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 0x1_0000_0000 })).toBeNull();
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 10.5 })).toBeNull();
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 10, trackPointer: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 10, trackCount: 10 })).toBeNull();
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 10, channel: "forbidden" })).toBeNull();
    expect(reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 10, frame: 1 })).toBeNull();
    expect(reduceCgb4FirstTrackDecrementTiming(undefined)).toBeNull();
  });

  it("freezes v26 plus inherited v25 packets, joins only its three rows, and preserves the strip-back", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: { assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1443-1450" } },
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
      acceptedV26EvidenceSha256: V26_EVIDENCE_SHA256,
      acceptedV26DocSha256: V26_DOC_SHA256,
      acceptedV25PacketSha256: V25_PACKET_HASHES,
      v26EvidenceAndReportRegenerateByteForByte: true,
      v26EvidenceReportAndInheritedV25PacketsRetainedByteForByte: true,
      v27PacketSha256: V27_PACKET_HASHES,
      v27PacketRepeatSha256: V27_PACKET_HASHES,
      v27PacketRepeatIdentity: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v26.json")).toBe(V26_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v26.md")).toBe(V26_DOC_SHA256);
    for (const [name, hash] of Object.entries(V25_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v25", `${name}.json`))).toBe(hash);
    }
    expect(evidence.capture).toEqual({
      boundary: "immediately before _081DDA62: subs r2, 0x1",
      scalars: ["r2BeforeDecrement"],
      excluded: [
        "track pointer", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration",
        "condition flags", "wider state", "subtraction result serialization", "_081DDA6C body",
        "movs r0, MusicPlayerTrack_size continuation body", "later loop work", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV26SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v26-selected-row",
        "unsupported-packet-field", "source-operand-out-of-range", "unexpected-successor-boundary",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV26SelectedRows: 3,
      packetRowsByCase: { anchor: 0, liliana: 1, "factory-varied": 2 },
      r2BeforeDecrementRows: 3,
      r2BeforeDecrementValues: [10],
      bleNotTakenRows: 3,
      bleTakenRows: 0,
      postV26FirstTrackDecrementDecisionSourceCycles: 12,
      acceptedContiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles: 5800,
      contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles: 5812,
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
      r2BeforeDecrement: 10,
      decrementDecision: "subs-r2-1; ble-not-taken",
      postV26FirstTrackDecrementDecisionSourceCycles: 4,
      contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles: 832,
      bleTakenControlTransferRefills: 0,
      stopsBeforeV27Instruction: "movs r0, MusicPlayerTrack_size",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bleTakenControlTransferRefills",
        "contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles",
        "decrementDecision",
        "postV26FirstTrackDecrementDecisionSourceCycles",
        "r2BeforeDecrement",
        "sourceStateDigest",
        "stopsBeforeV27Instruction",
      ]);
      expect(row.trackPointer).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
      expect(row.subtractionResult).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV26ArtifactsReadOnly: true,
      inheritedV25PacketsReadOnly: true,
      v27PacketStripBackPreserved: true,
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
      continuationBody: null,
      exitBody: null,
      laterLoopWork: null,
      serviceCost: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("keeps every captured packet to exactly the digest and r2 scalar", () => {
    for (const [name, hash] of Object.entries(V27_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v27", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      for (const observation of packet.observations) {
        expect(Object.keys(observation).sort()).toEqual(["r2BeforeDecrement", "sourceStateDigest"]);
        expect(observation.r2BeforeDecrement).toBe(10);
      }
    }
  });

  it("regenerates v27 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v27-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v27-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v27.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v27.json", "issue55-m4a-note-body-cgb4-v27.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v27.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v27.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
