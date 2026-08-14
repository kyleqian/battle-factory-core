import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4SecondTrackVolPitchTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v30.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v30.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v30.md";
const V29_EVIDENCE_SHA256 = "c932813860e8d9dade9d7dd66891971a942c694b48ea75b255f6719eca20c91d";
const V29_DOC_SHA256 = "0bf37691f80c93c8c808e431750e97e2f13393f8a42cc1f805896a340c657d82";
const V29_PACKET_HASHES = {
  anchor: "59c2daf500f773368db0d6fd8756220b0154a4938fe23c7617c758a9982b88cb",
  liliana: "db2a26b30ec3a02b7420e05650025f0f28d0c11e1b6b453b22d368f6695d4f1e",
  "factory-varied": "8190a650678950fab698f06c07c0327df76d108ad2778f08661eddd5b42e8444",
} as const;
const V30_PACKET_HASHES = {
  anchor: "77ce80af100e6fd8d46fcf8e6359019f65ec03935f4702cf956a02c76a3910a2",
  liliana: "b6c53e5fc7385036ebf4b9a9985ddb49c83c77856bcfdc1e2c0f54df0bd1e8fa",
  "factory-varied": "53fabb3e0cf7663015c25c8d67dad04c2c1685756aef1b682df8707579076485",
} as const;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 second-track volume/pitch-mask decision v30", () => {
  it("prices the observed mask-clear route and fails closed on widened input", () => {
    expect(reduceCgb4SecondTrackVolPitchTiming({ secondTrackFlags: 0x80 })).toEqual({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      secondTrackFlags: 0x80,
      volPitchMask: 0x0f,
      sequentialThumbHalfwords: 3,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      beqTakenControlTransferRefills: 1,
      takenControlTransferRefills: 1,
      sourceCycles: 12,
      stopsBeforeInstruction: "_081DDA62: first instruction",
    });
    expect(reduceCgb4SecondTrackVolPitchTiming({ secondTrackFlags: 0x8f })).toMatchObject({
      route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
      sourceCycles: 6,
      beqTakenControlTransferRefills: 0,
      stopsBeforeInstruction: "mov r9, r2",
    });
    for (const value of [
      undefined,
      {},
      { secondTrackFlags: -1 },
      { secondTrackFlags: 0x100 },
      { secondTrackFlags: 0x80, trackIndex: 1 },
      { secondTrackFlags: 0x80, pointer: "forbidden" },
      { firstTrackFlags: 0x80 },
    ]) {
      expect(reduceCgb4SecondTrackVolPitchTiming(value)).toBeNull();
    }
  });

  it("red-first rejects the missing-refill six-cycle under-price", () => {
    const timing = reduceCgb4SecondTrackVolPitchTiming({ secondTrackFlags: 0x80 });
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 3 * 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(6);
    expect(timing!.sourceCycles).toBe(12);
  });

  it("freezes v29, joins only its three rows, and stops before either successor body", () => {
    const evidence = makeEvidence();
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1368-1371" },
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
        nextSequentialInstruction: "0x082dfc0e",
      },
      compiledRegions: [{
        role: "movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62",
        start: "0x082dfc08",
        endExclusive: "0x082dfc0e",
        bytes: 6,
        bytesHex: "0f 21 01 42 45 d0",
        sha256: "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4",
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        memoryAccesses: 0,
        dataAccessPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
      },
    });
    expect(evidence.frozenInputs).toMatchObject({
      acceptedV29EvidenceSha256: V29_EVIDENCE_SHA256,
      acceptedV29DocSha256: V29_DOC_SHA256,
      acceptedV29PacketSha256: V29_PACKET_HASHES,
      v29RegeneratesByteForByte: true,
      v29EvidenceReportAndPacketsRetainedByteForByte: true,
      v30PacketSha256: V30_PACKET_HASHES,
      v30PacketRepeatSha256: V30_PACKET_HASHES,
      v30PacketRepeatIdentity: true,
    });
    expect(evidence.capture).toMatchObject({
      boundary: "second track-loop iteration post-_081DD9C8 ldrb r0 flags, before _081DD9D0 volume/pitch-mask decision",
      scalars: ["secondTrackFlags"],
      packetObservationExactKeys: ["sourceStateDigest", "secondTrackFlags"],
    });
    expect(evidence.join).toMatchObject({
      key: "sourceStateDigest",
      frozenV29SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
    });
    expect(evidence.coverage).toMatchObject({
      secondTrackFlagsRows: 3,
      secondTrackFlagsValues: [0x80],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: 3,
      volPitchMaskNonzeroRows: 0,
      postV29SecondTrackVolPitchDecisionSourceCycles: 36,
      acceptedContiguousPrefixThroughSecondTrackExistDecisionSourceCycles: 5872,
      contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles: 5908,
      sequentialThumbHalfwords: 9,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      failClosedUnobservedVolPitchMaskNonzeroSourceCycles: 6,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      secondTrackFlags: 0x80,
      secondTrackVolPitchMaskDecision: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
      postV29SecondTrackVolPitchDecisionSourceCycles: 12,
      contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles: 864,
      beqTakenControlTransferRefills: 1,
      stopsBeforeV30Instruction: "_081DDA62: first instruction",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "beqTakenControlTransferRefills",
        "contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles",
        "postV29SecondTrackVolPitchDecisionSourceCycles",
        "secondTrackFlags",
        "secondTrackVolPitchMaskDecision",
        "sourceStateDigest",
        "stopsBeforeV30Instruction",
      ]);
    }
    expect(evidence.containment).toMatchObject({
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
      selectedBranchBody: null,
      nextInstructionBeyondDecision: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("keeps every freshly captured packet to exactly the digest and one flags byte", () => {
    for (const [name, hash] of Object.entries(V30_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v30", `${name}.json`);
      expect(sha256(path)).toBe(hash);
      const packet = JSON.parse(readFileSync(path, "utf8"));
      for (const observation of packet.observations) {
        expect(Object.keys(observation).sort()).toEqual(["secondTrackFlags", "sourceStateDigest"]);
        expect(observation.secondTrackFlags).toBe(0x80);
      }
    }
  });

  it("retains v29 evidence, report, and packets byte-for-byte", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v29.json")).toBe(V29_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v29.md")).toBe(V29_DOC_SHA256);
    for (const [name, hash] of Object.entries(V29_PACKET_HASHES)) {
      expect(sha256(join("tests/fixtures/factory-m4a-note-body-cgb4-v29", `${name}.json`))).toBe(hash);
    }
  });

  it("regenerates v30 evidence and report twice byte-for-byte", () => {
    const a = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v30-a-"));
    const b = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v30-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v30.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, a], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, b], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v30.json", "issue55-m4a-note-body-cgb4-v30.md"]) {
      expect(readFileSync(join(a, name)).equals(readFileSync(join(b, name)))).toBe(true);
      expect(readFileSync(join(a, name)).equals(readFileSync(name.startsWith("factory") ? EVIDENCE : DOC))).toBe(true);
    }
  });
});
