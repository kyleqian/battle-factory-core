import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4SecondTrackDecrementTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v31.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v31.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v31.md";
const V30_EVIDENCE_SHA256 = "dad6dbec1ab4956cecbe6041535f387ffd1d14107267504b70afaaf472242477";
const V30_DOC_SHA256 = "7651955909d56f707091baef60b1cd5cfb0f81b4b8d28d75a979fab9da940977";
const V30_PACKET_HASHES = {
  anchor: "77ce80af100e6fd8d46fcf8e6359019f65ec03935f4702cf956a02c76a3910a2",
  liliana: "b6c53e5fc7385036ebf4b9a9985ddb49c83c77856bcfdc1e2c0f54df0bd1e8fa",
  "factory-varied": "53fabb3e0cf7663015c25c8d67dad04c2c1685756aef1b682df8707579076485",
} as const;
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

describe("Issue #55 CGB4 second-track decrement/exit decision v31", () => {
  it("derives the expected non-exit route from the one r2 operand", () => {
    expect(reduceCgb4SecondTrackDecrementTiming({ r2BeforeDecrement: 9 })).toEqual({
      route: "subs-r2-1; ble-not-taken",
      r2BeforeDecrement: 9,
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
    expect(reduceCgb4SecondTrackDecrementTiming({ r2BeforeDecrement: 1 })).toEqual({
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

  it("red-first rejects the missing-refill six-cycle under-price for the exit", () => {
    const timing = reduceCgb4SecondTrackDecrementTiming({ r2BeforeDecrement: 1 });
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
      { r2BeforeDecrement: 9.5 },
      { r2BeforeDecrement: 9, trackPointer: "forbidden" },
      { r2BeforeDecrement: 9, trackIndex: 1 },
      { r2BeforeDecrement: 9, channel: "forbidden" },
      { secondTrackFlags: 0x80 },
    ]) {
      expect(reduceCgb4SecondTrackDecrementTiming(value)).toBeNull();
    }
  });

  it("freezes v30, joins only its three rows, and stops before either successor body", () => {
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
      acceptedV30EvidenceSha256: V30_EVIDENCE_SHA256,
      acceptedV30DocSha256: V30_DOC_SHA256,
      acceptedV30PacketSha256: V30_PACKET_HASHES,
      v30RegeneratesByteForByte: true,
      v30EvidenceReportAndPacketsRetainedByteForByte: true,
      v31PacketSha256: V31_PACKET_HASHES,
      v31PacketRepeatSha256: V31_PACKET_HASHES,
      v31PacketRepeatIdentity: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v30.json")).toBe(V30_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v30.md")).toBe(V30_DOC_SHA256);
    for (const [name, hash] of Object.entries(V30_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v30", `${name}.json`))).toBe(hash);
    }
    expect(evidence.capture).toEqual({
      boundary: "immediately before second-track _081DDA62: subs r2, 0x1",
      scalars: ["r2BeforeDecrement"],
      packetObservationExactKeys: ["sourceStateDigest", "r2BeforeDecrement"],
      excluded: [
        "pointer", "runtime address", "track count", "track index", "track identity", "iteration count", "channel", "frame", "duration",
        "condition flags", "wider state", "subtraction result serialization", "_081DDA6C exit body",
        "movs r0, MusicPlayerTrack_size continuation body", "later loop work", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV30SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v30-selected-row", "packet-key-mismatch",
        "unsupported-packet-field", "source-operand-out-of-range", "unexpected-observed-route",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV30SelectedRows: 3,
      packetRowsByCase: { anchor: 0, liliana: 1, "factory-varied": 2 },
      r2BeforeDecrementRows: 3,
      r2BeforeDecrementValues: [9],
      bleNotTakenRows: 3,
      bleTakenRows: 0,
      postV30SecondTrackDecrementDecisionSourceCycles: 12,
      acceptedContiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles: 5908,
      contiguousPrefixThroughSecondTrackDecrementDecisionSourceCycles: 5920,
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
      r2BeforeDecrement: 9,
      secondTrackDecrementDecision: "subs-r2-1; ble-not-taken",
      postV30SecondTrackDecrementDecisionSourceCycles: 4,
      contiguousPrefixThroughSecondTrackDecrementDecisionSourceCycles: 868,
      bleTakenControlTransferRefills: 0,
      stopsBeforeV31Instruction: "movs r0, MusicPlayerTrack_size",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bleTakenControlTransferRefills",
        "contiguousPrefixThroughSecondTrackDecrementDecisionSourceCycles",
        "postV30SecondTrackDecrementDecisionSourceCycles",
        "r2BeforeDecrement",
        "secondTrackDecrementDecision",
        "sourceStateDigest",
        "stopsBeforeV31Instruction",
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
      frozenV30ArtifactsReadOnly: true,
      v30PacketStripBackPreserved: true,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      iterationCount: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      widerState: null,
      subtractionResult: null,
      continuationBody: null,
      exitBody: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("keeps every freshly captured packet to exactly the digest and r2 scalar", () => {
    for (const [name, hash] of Object.entries(V31_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v31", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      for (const observation of packet.observations) {
        expect(Object.keys(observation).sort()).toEqual(["r2BeforeDecrement", "sourceStateDigest"]);
        expect(observation.r2BeforeDecrement).toBe(9);
      }
    }
  });

  it("retains v30 evidence, report, and packets byte-for-byte", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v30.json")).toBe(V30_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v30.md")).toBe(V30_DOC_SHA256);
    for (const [name, hash] of Object.entries(V30_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v30", `${name}.json`))).toBe(hash);
    }
  });

  it("regenerates v31 evidence and report twice byte-for-byte", () => {
    const a = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v31-a-"));
    const b = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v31-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v31.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, a], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, b], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v31.json", "issue55-m4a-note-body-cgb4-v31.md"]) {
      expect(readFileSync(join(a, name)).equals(readFileSync(join(b, name)))).toBe(true);
      expect(readFileSync(join(a, name)).equals(readFileSync(name.startsWith("factory") ? EVIDENCE : DOC))).toBe(true);
    }
  });
});
