import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  makeEvidence,
  reduceCgb4FourthTrackVolPitchTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v38.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v38.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v38.md";
const V37_EVIDENCE_SHA256 = "59c5f83c2e70f21cb96076fd04e0b3d4829c8d50e3f2988e437063eabc36861c";
const V37_DOC_SHA256 = "5cf3314ae5beb43203e81e59970235141862dda3fff4d314d01f9e6ca5aec601";
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

describe("Issue #55 CGB4 fourth-track volume/pitch-mask decision v38", () => {
  it("prices the frozen mask-clear route, prices the unobserved alternate, and rejects widened input", () => {
    expect(reduceCgb4FourthTrackVolPitchTiming({ fourthTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      fourthTrackFlags: 0x80,
      volPitchMask: 0x0f,
      sequentialThumbHalfwords: 3,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 12,
      stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
    });
    expect(reduceCgb4FourthTrackVolPitchTiming({ fourthTrackFlags: 0x8f })).toMatchObject({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
      sourceCycles: 6,
      beqTakenControlTransferRefills: 0,
      stopsBeforeInstruction: "mov r9, r2",
    });
    for (const value of [
      undefined,
      {},
      { fourthTrackFlags: -1 },
      { fourthTrackFlags: 0x100 },
      { fourthTrackFlags: 0x80, pointer: "forbidden" },
      { fourthTrackFlags: 0x80, address: "forbidden" },
      { fourthTrackFlags: 0x80, runtimeAddress: "forbidden" },
      { fourthTrackFlags: 0x80, trackCount: 4 },
      { fourthTrackFlags: 0x80, trackIndex: 3 },
      { fourthTrackFlags: 0x80, trackIdentity: "forbidden" },
      { fourthTrackFlags: 0x80, trainer: 9 },
      { fourthTrackFlags: 0x80, battleIndex: 2 },
      { fourthTrackFlags: 0x80, canonicalTick: 33331 },
      { fourthTrackFlags: 0x80, receiptSchedule: "forbidden" },
      { fourthTrackFlags: 0x80, unrelatedFutureState: "forbidden" },
      { fourthTrackFlags: 0x80, channel: "forbidden" },
      { fourthTrackFlags: 0x80, frame: 1 },
      { fourthTrackFlags: 0x80, duration: 1 },
      { fourthTrackFlags: 0x80, conditionFlags: "forbidden" },
      { fourthTrackFlags: 0x80, body: "forbidden" },
      { fourthTrackFlags: 0x80, successor: "forbidden" },
      { fourthTrackFlags: 0x80, volumePitchMask: "forbidden" },
      { firstTrackFlags: 0x80 },
      { secondTrackFlags: 0x80 },
      { thirdTrackFlags: 0x80 },
    ]) expect(reduceCgb4FourthTrackVolPitchTiming(value)).toBeNull();
  });

  it("red-first rejects the missing-refill six-cycle under-price", () => {
    const timing = reduceCgb4FourthTrackVolPitchTiming({ fourthTrackFlags: 0x80 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 3 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(6);
    expect(timing!.sourceCycles).toBe(12);
  });

  it("freezes v37 evidence, report, and packets then derives only the fourth-track mask decision", () => {
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
      acceptedV37EvidenceSha256: V37_EVIDENCE_SHA256,
      acceptedV37DocSha256: V37_DOC_SHA256,
      acceptedV37PacketSha256: V37_PACKET_HASHES,
      v37EvidenceAndReportRegenerateByteForByte: true,
      v37EvidenceReportAndPacketsRetainedByteForByte: true,
      v37FreshSerialRunsPerCase: 2,
      v38RuntimeCaptureCount: 0,
    });
    expect(evidence.capture).toEqual({
      boundary: "source-only fourth-track _081DD9D0 volume/pitch-mask decision through beq; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "track pointer", "runtime address", "track count", "track index", "track identity",
        "trainer", "battle index", "canonical tick", "receipt schedule", "unrelated future state", "channel", "frame", "duration",
        "condition flags", "wider state", "fourthTrackFlags serialization", "selected _081DDA62 decrement/exit body",
        "alternate nonselected mov r9, r2 body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toMatchObject({
      key: "sourceStateDigest",
      frozenV37SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
    });
    expect(evidence.coverage).toMatchObject({
      frozenV37SelectedRows: 3,
      sourceOnlyVolPitchDecisionRows: 3,
      frozenFourthTrackFlagsValues: [0x80],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: 3,
      volPitchMaskNonzeroRows: 0,
      postV37FourthTrackVolPitchDecisionSourceCycles: 36,
      acceptedContiguousPrefixThroughFourthTrackExistDecisionSourceCycles: 6088,
      contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles: 6124,
      sequentialThumbHalfwords: 9,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      failClosedUnobservedVolPitchMaskNonzeroSourceCycles: 6,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      fourthTrackVolPitchMaskDecision: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      postV37FourthTrackVolPitchDecisionSourceCycles: 12,
      contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles: 936,
      beqTakenControlTransferRefills: 1,
      stopsBeforeV38Instruction: "_081DDA62: subs r2, 0x1",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles",
        "fourthTrackVolPitchMaskDecision",
        "postV37FourthTrackVolPitchDecisionSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV38Instruction",
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
      expect(row.fourthTrackFlags).toBeUndefined();
      expect(row.body).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV37ArtifactsReadOnly: true,
      v37PacketsRetainedReadOnly: true,
      v38RuntimeCaptureCount: 0,
      trainer: null,
      battleIndex: null,
      canonicalTick: null,
      receiptSchedule: null,
      unrelatedFutureState: null,
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
      fourthTrackFlags: null,
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

  it("retains v37 bytes and exact-key packet schemas without taking another capture", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v37.json")).toBe(V37_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v37.md")).toBe(V37_DOC_SHA256);
    for (const [name, hash] of Object.entries(V37_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v37", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["fourthTrackFlags", "sourceStateDigest"]);
    }
  });

  it("regenerates v38 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v38-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v38-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v38.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v38.json", "issue55-m4a-note-body-cgb4-v38.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v38.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v38.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
