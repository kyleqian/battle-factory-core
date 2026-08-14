import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4ThirdTrackVolPitchTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v34.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v34.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v34.md";
const V33_EVIDENCE_SHA256 = "806b5582ceaca2c20fcf2f9d12e49d74fd20203a1e9cf796ee2e012d0fac9339";
const V33_DOC_SHA256 = "61fe1034995051f904ddaf2ea1860c44f072350a69314584d6f019aa6224759f";
const V33_PACKET_HASHES = {
  anchor: "5b200f46ea9182f5f1ba1f349b07f012b282f2d96157c2b49c0cee0e163b88c9",
  liliana: "edb093d86fd4deffdc39f2802d545d2422d3ca94ece18883d6d8dd2522c3bc13",
  "factory-varied": "a6e227b52726b060268a24d01aa404bcf54b576d3640cbdb85d76d9ffe4a4411",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 third-track volume/pitch-mask decision v34", () => {
  it("prices the frozen mask-clear route, prices the unobserved alternate, and rejects widened input", () => {
    expect(reduceCgb4ThirdTrackVolPitchTiming({ thirdTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      thirdTrackFlags: 0x80,
      volPitchMask: 0x0f,
      sequentialThumbHalfwords: 3,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 12,
      stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
    });
    expect(reduceCgb4ThirdTrackVolPitchTiming({ thirdTrackFlags: 0x8f })).toMatchObject({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
      sourceCycles: 6,
      beqTakenControlTransferRefills: 0,
      stopsBeforeInstruction: "mov r9, r2",
    });
    for (const value of [
      undefined,
      {},
      { thirdTrackFlags: -1 },
      { thirdTrackFlags: 0x100 },
      { thirdTrackFlags: 0x80, pointer: "forbidden" },
      { thirdTrackFlags: 0x80, address: "forbidden" },
      { thirdTrackFlags: 0x80, runtimeAddress: "forbidden" },
      { thirdTrackFlags: 0x80, trackCount: 3 },
      { thirdTrackFlags: 0x80, trackIndex: 2 },
      { thirdTrackFlags: 0x80, trackIdentity: "forbidden" },
      { thirdTrackFlags: 0x80, channel: "forbidden" },
      { thirdTrackFlags: 0x80, frame: 1 },
      { thirdTrackFlags: 0x80, duration: 1 },
      { thirdTrackFlags: 0x80, conditionFlags: "forbidden" },
      { thirdTrackFlags: 0x80, body: "forbidden" },
      { thirdTrackFlags: 0x80, successor: "forbidden" },
      { thirdTrackFlags: 0x80, volumePitchMask: "forbidden" },
      { firstTrackFlags: 0x80 },
      { secondTrackFlags: 0x80 },
    ]) expect(reduceCgb4ThirdTrackVolPitchTiming(value)).toBeNull();
  });

  it("red-first rejects the missing-refill six-cycle under-price", () => {
    const timing = reduceCgb4ThirdTrackVolPitchTiming({ thirdTrackFlags: 0x80 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 3 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(6);
    expect(timing!.sourceCycles).toBe(12);
  });

  it("freezes v33 evidence, report, and packets then derives only the third-track mask decision", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1368-1370, 1443-1444" },
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
        selectedSuccessorFirstInstruction: "_081DDA62: subs r2, 0x1",
        alternateNonselectedFirstInstruction: "mov r9, r2",
      },
      compiledRegions: [{
        role: "movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62",
        start: "0x082dfc08",
        endExclusive: "0x082dfc0e",
        bytes: 6,
        bytesHex: "0f 21 01 42 45 d0",
        sha256: "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4",
        decodedBeq: { condition: "EQ", target: "_081DDA62", targetAddress: "0x082dfc9a" },
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        memoryAccesses: 0,
        dataAccessPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
        volPitchMaskClearModel: "movs; tst; taken beq = 3 halfwords * 2 + one 6-cycle refill = 12",
        volPitchMaskNonzeroModel: "movs; tst; non-taken beq = 3 halfwords * 2 + zero refill = 6",
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV33EvidenceSha256: V33_EVIDENCE_SHA256,
      acceptedV33DocSha256: V33_DOC_SHA256,
      acceptedV33PacketSha256: V33_PACKET_HASHES,
      v33EvidenceAndReportRegenerateByteForByte: true,
      v33EvidenceReportAndPacketsRetainedByteForByte: true,
      v34RuntimeCaptureCount: 0,
    });
    expect(evidence.capture).toEqual({
      boundary: "source-only third-track _081DD9D0 volume/pitch-mask decision through beq; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "track pointer", "runtime address", "track count", "track index", "track identity",
        "channel", "frame", "duration", "condition flags", "wider state", "thirdTrackFlags serialization",
        "selected _081DDA62 decrement/exit body", "alternate nonselected mov r9, r2 body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toMatchObject({
      key: "sourceStateDigest",
      frozenV33SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
    });
    expect(evidence.coverage).toMatchObject({
      frozenV33SelectedRows: 3,
      sourceOnlyVolPitchDecisionRows: 3,
      frozenThirdTrackFlagsValues: [0x80],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: 3,
      volPitchMaskNonzeroRows: 0,
      postV33ThirdTrackVolPitchDecisionSourceCycles: 36,
      acceptedContiguousPrefixThroughThirdTrackExistDecisionSourceCycles: 5980,
      contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles: 6016,
      sequentialThumbHalfwords: 9,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      failClosedUnobservedVolPitchMaskNonzeroSourceCycles: 6,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      thirdTrackVolPitchMaskDecision: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      postV33ThirdTrackVolPitchDecisionSourceCycles: 12,
      contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles: 900,
      beqTakenControlTransferRefills: 1,
      stopsBeforeV34Instruction: "_081DDA62: subs r2, 0x1",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles",
        "postV33ThirdTrackVolPitchDecisionSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV34Instruction",
        "thirdTrackVolPitchMaskDecision",
      ]);
      expect(row.pointer).toBeUndefined();
      expect(row.address).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
      expect(row.thirdTrackFlags).toBeUndefined();
      expect(row.body).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV33ArtifactsReadOnly: true,
      v33PacketsRetainedReadOnly: true,
      v34RuntimeCaptureCount: 0,
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
      thirdTrackFlags: null,
      decrementExitBody: null,
      alternateNonselectedBody: null,
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

  it("retains v33 bytes and exact-key packet schemas without taking another capture", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v33.json")).toBe(V33_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v33.md")).toBe(V33_DOC_SHA256);
    for (const [name, hash] of Object.entries(V33_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v33", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["sourceStateDigest", "thirdTrackFlags"]);
    }
  });

  it("regenerates v34 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v34-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v34-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v34.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v34.json", "issue55-m4a-note-body-cgb4-v34.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v34.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v34.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
