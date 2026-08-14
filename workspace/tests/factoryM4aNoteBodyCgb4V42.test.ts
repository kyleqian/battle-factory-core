import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4FifthTrackVolPitchTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v42.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v42.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v42.md";
const V41_EVIDENCE_SHA256 = "3d2c05c30543c69dd824826993213d6cf692a916c3d800d302cf46fbafbe0963";
const V41_DOC_SHA256 = "b3c1057fafe83de3eb7a17c32355f4a3bd4e83e9c60a1c9640b8b474b62ef36e";
const V41_PACKET_HASHES = {
  anchor: "79baf363f8822c218b0c1e627c9ce033631ad3b3b513e7f54c7c1558b7120cc8",
  liliana: "1938050ae62a1e5465e8025e357fc9ff5c4b4d307f8d3a9e7cfd382d897dd24e",
  "factory-varied": "234edd165872f3b2294185f77ced262a09f9ea3696fe83271444164e63035332",
} as const;
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
const SELECTED = [
  ["2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e", "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken", 6, 966, 0, "mov r9, r2"],
  ["c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902", "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken", 12, 972, 1, "_081DDA62: subs r2, 0x1"],
  ["e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8", "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken", 12, 972, 1, "_081DDA62: subs r2, 0x1"],
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 fifth-track volume/pitch-mask decision v42", () => {
  let evidence: any;

  beforeAll(() => {
    evidence = makeEvidence();
  });

  it("source-prices the observed nonzero and clear mask routes with their distinct refill costs", () => {
    expect(reduceCgb4FifthTrackVolPitchTiming({ fifthTrackFlags: 0x83 })).toEqual({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
      fifthTrackFlags: 0x83,
      volPitchMask: 0x0f,
      sequentialThumbHalfwords: 3,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 6,
      stopsBeforeInstruction: "mov r9, r2",
    });
    expect(reduceCgb4FifthTrackVolPitchTiming({ fifthTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      fifthTrackFlags: 0x80,
      volPitchMask: 0x0f,
      sequentialThumbHalfwords: 3,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 12,
      stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
    });
    expect(6196 + 6 + 12 + 12).toBe(6226);
  });

  it("red-first rejects the missing-refill under-price on the observed clear route", () => {
    const timing = reduceCgb4FifthTrackVolPitchTiming({ fifthTrackFlags: 0x80 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 3 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(6);
    expect(timing!.sourceCycles).toBe(12);
  });

  it("fails closed on malformed, predecessor, runtime, or either-body state", () => {
    for (const value of [
      undefined,
      null,
      {},
      { fifthTrackFlags: -1 },
      { fifthTrackFlags: 0x100 },
      { fifthTrackFlags: 128.5 },
      { fifthTrackFlags: 0x80, sourceStateDigest: "forbidden" },
      { fifthTrackFlags: 0x80, fifthTrackExistDecision: "forbidden" },
      { fifthTrackFlags: 0x80, pointer: "forbidden" },
      { fifthTrackFlags: 0x80, trackPointer: "forbidden" },
      { fifthTrackFlags: 0x80, address: "forbidden" },
      { fifthTrackFlags: 0x80, runtimeAddress: "forbidden" },
      { fifthTrackFlags: 0x80, trackCount: 7 },
      { fifthTrackFlags: 0x80, trackIndex: 4 },
      { fifthTrackFlags: 0x80, trackIdentity: "forbidden" },
      { fifthTrackFlags: 0x80, channel: "forbidden" },
      { fifthTrackFlags: 0x80, frame: 1 },
      { fifthTrackFlags: 0x80, duration: 1 },
      { fifthTrackFlags: 0x80, conditionFlags: "forbidden" },
      { fifthTrackFlags: 0x80, fifthTrackVolPitchMask: "forbidden" },
      { fifthTrackFlags: 0x80, maskNonzeroBody: "forbidden" },
      { fifthTrackFlags: 0x80, decrementExitBody: "forbidden" },
      { fifthTrackFlags: 0x80, continuation: "forbidden" },
      { fifthTrackFlags: 0x80, exitBody: "forbidden" },
      { fifthTrackFlags: 0x80, widerLoop: "forbidden" },
    ]) expect(reduceCgb4FifthTrackVolPitchTiming(value)).toBeNull();
  });

  it("freezes v41 and its inherited evidence while deriving the three sourceStateDigest-only decisions", () => {
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1368-1372, 1443-1444", sha256: "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c" },
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
        clearMaskTakenSuccessor: "0x082dfc9a",
        clearMaskSuccessorFirstInstruction: "_081DDA62: subs r2, 0x1",
        nonzeroMaskSuccessorFirstInstruction: "mov r9, r2",
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
      acceptedV41EvidenceSha256: V41_EVIDENCE_SHA256,
      acceptedV41DocSha256: V41_DOC_SHA256,
      acceptedV41PacketSha256: V41_PACKET_HASHES,
      acceptedInheritedV40EvidenceSha256: V40_EVIDENCE_SHA256,
      acceptedInheritedV40DocSha256: V40_DOC_SHA256,
      acceptedInheritedV39PacketSha256: V39_PACKET_HASHES,
      acceptedInheritedV37PacketSha256: V37_PACKET_HASHES,
      v41EvidenceAndReportRegenerateByteForByte: true,
      v41EvidenceReportPacketsAndInheritedEvidenceRetainedByteForByte: true,
      v42RuntimeCaptureCount: 0,
    });
    expect(evidence.capture).toEqual({
      boundary: "source-only fifth-track _081DD9D0 volume/pitch-mask decision through beq; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "track pointer", "runtime address", "track count", "track index", "track identity",
        "channel", "frame", "duration", "condition flags", "wider state", "fifthTrackFlags serialization",
        "mask-nonzero mov r9, r2 body", "clear-mask _081DDA62 decrement/exit body", "other 75 callbacks",
      ],
    });
    expect(evidence.join).toMatchObject({
      key: "sourceStateDigest",
      frozenV41SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
    });
    expect(evidence.coverage).toMatchObject({
      frozenV41SelectedRows: 3,
      sourceOnlyVolPitchDecisionRows: 3,
      frozenFifthTrackFlagsValues: [0x80, 0x83],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: 2,
      volPitchMaskNonzeroRows: 1,
      postV41FifthTrackVolPitchDecisionSourceCycles: 30,
      acceptedContiguousPrefixThroughFifthTrackExistDecisionSourceCycles: 6196,
      contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles: 6226,
      sequentialThumbHalfwords: 9,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 2,
      sourceRoutePricing: { maskNonzeroSourceCycles: 6, maskClearSourceCycles: 12 },
    });
    expect(evidence.rows).toHaveLength(3);
    for (const [
      sourceStateDigest,
      fifthTrackVolPitchMaskDecision,
      postV41FifthTrackVolPitchDecisionSourceCycles,
      contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles,
      beqTakenControlTransferRefills,
      stopsBeforeV42Instruction,
    ] of SELECTED) {
      expect(evidence.rows.find((row: any) => row.sourceStateDigest === sourceStateDigest)).toEqual({
        sourceStateDigest,
        fifthTrackVolPitchMaskDecision,
        postV41FifthTrackVolPitchDecisionSourceCycles,
        contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles,
        beqTakenControlTransferRefills,
        stopsBeforeV42Instruction,
      });
    }
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles",
        "fifthTrackVolPitchMaskDecision",
        "postV41FifthTrackVolPitchDecisionSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV42Instruction",
      ]);
      expect(row.fifthTrackFlags).toBeUndefined();
      expect(row.pointer).toBeUndefined();
      expect(row.trackPointer).toBeUndefined();
      expect(row.runtimeAddress).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
      expect(row.maskNonzeroBody).toBeUndefined();
      expect(row.decrementExitBody).toBeUndefined();
      expect(row.exitBody).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV41ArtifactsReadOnly: true,
      v41PacketsRetainedReadOnly: true,
      inheritedV40ArtifactsRetainedReadOnly: true,
      inheritedV39PacketsRetainedReadOnly: true,
      inheritedV37PacketsRetainedReadOnly: true,
      frozenV41ArtifactsAreNotProductionImports: true,
      v42RuntimeCaptureCount: 0,
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
      fifthTrackFlags: null,
      maskNonzeroBody: null,
      decrementExitBody: null,
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

  it("retains v41 packets and inherited evidence byte-for-byte without another capture", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v41.json")).toBe(V41_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v41.md")).toBe(V41_DOC_SHA256);
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v40.json")).toBe(V40_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v40.md")).toBe(V40_DOC_SHA256);
    for (const [name, hash] of Object.entries(V41_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v41", name + ".json");
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(sha256(path)).toBe(hash);
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["fifthTrackFlags", "sourceStateDigest"]);
    }
    for (const [name, hash] of Object.entries(V39_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v39", name + ".json");
      expect(sha256(path)).toBe(hash);
    }
    for (const [name, hash] of Object.entries(V37_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v37", name + ".json");
      expect(sha256(path)).toBe(hash);
    }
  });

  it("regenerates v42 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v42-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v42-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v42.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v42.json", "issue55-m4a-note-body-cgb4-v42.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v42.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v42.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
