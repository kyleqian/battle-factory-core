import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4FifthTrackClearDecrementTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v43.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v43.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v43.md";
const V42_EVIDENCE_SHA256 = "b18d54cc288cb3f99df8de3f059ce499ac7254e2758f7770cf4a43deef6873c6";
const V42_DOC_SHA256 = "07e866c8fd5d98e5ddb277e9a7fd0dbef9dda24f06c910e62b90c6f9a0c194d4";
const V41_EVIDENCE_SHA256 = "3d2c05c30543c69dd824826993213d6cf692a916c3d800d302cf46fbafbe0963";
const V41_DOC_SHA256 = "b3c1057fafe83de3eb7a17c32355f4a3bd4e83e9c60a1c9640b8b474b62ef36e";
const V41_PACKET_HASHES = {
  anchor: "79baf363f8822c218b0c1e627c9ce033631ad3b3b513e7f54c7c1558b7120cc8",
  liliana: "1938050ae62a1e5465e8025e357fc9ff5c4b4d307f8d3a9e7cfd382d897dd24e",
  "factory-varied": "234edd165872f3b2294185f77ced262a09f9ea3696fe83271444164e63035332",
} as const;
const INHERITED_HASHES = {
  "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v37.json": "59c5f83c2e70f21cb96076fd04e0b3d4829c8d50e3f2988e437063eabc36861c",
  "docs/issue55-m4a-note-body-cgb4-v37.md": "5cf3314ae5beb43203e81e59970235141862dda3fff4d314d01f9e6ca5aec601",
  "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v38.json": "374076dfde52abfb519edd9e121c851ea55cd1f1ac13bf4675613f2e26d0b8ce",
  "docs/issue55-m4a-note-body-cgb4-v38.md": "420b7b300d44302213b6c7ffe48f3ee2a5d63c8d3c8a3ede741839e56d266090",
  "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v39.json": "86286add231fea7b33ddbd0b667dd53efd4831582d8aed6e3b87e3a70dcdc626",
  "docs/issue55-m4a-note-body-cgb4-v39.md": "14fd2f23976dca78ce5f23f4bf3a9b0ae5ef13d050707239d1c90b5363b414e1",
  "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v40.json": "2bd6f1b5d6e94d09d333c4937c2588b6f6aa4f4191c3654d27f8567d71ecfb2a",
  "docs/issue55-m4a-note-body-cgb4-v40.md": "459acae2f4df10cf86072b96dbfef292b34c2a5aeaa55e783fa3f45bba67f0e3",
} as const;
const INHERITED_PACKET_HASHES = {
  37: {
    anchor: "4dad511aee6b508723c2ddd5ca283756ca17435c23388ecf374273bbcf86a8c4",
    liliana: "8afcc0bad8bd77c9ae28d442a9a496101af1321c4b71e54b5bb49160197d7a9d",
    "factory-varied": "6f202501970fd31eddb94f489d2e3360fde3ec78d90df6ab4cbdba64f5d81e67",
  },
  39: {
    anchor: "317c223e01b3907b2016af6e5c4294db06d0f53872fcbdf38d7086bf25244ceb",
    liliana: "496c24229d1e9a542f3763cd26cb0959d0c6320d431b1453e0bb72988f790c74",
    "factory-varied": "68c43a7e757d47f32a383d3d09c03c33f8a92dd82a51b4fdfef8f861f880b343",
  },
} as const;
const SELECTED_CLEAR = [
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 fifth-track clear-route decrement/exit decision v43", () => {
  let evidence: any;

  beforeAll(() => {
    evidence = makeEvidence();
  });

  it("source-prices the retained-r2 clear-route decrement with no branch refill", () => {
    expect(reduceCgb4FifthTrackClearDecrementTiming({ r2BeforeFifthTrackClearDecrement: 6 })).toEqual({
      route: "subs-r2-1; ble-not-taken",
      r2BeforeFifthTrackClearDecrement: 6,
      r2AfterFifthTrackClearDecrement: 5,
      sequentialThumbHalfwords: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      bleTakenControlTransferRefills: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 4,
      stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size",
    });
    expect(6226 + 4 + 4).toBe(6234);
  });

  it("red-first rejects an invented taken-branch refill on the positive result", () => {
    const timing = reduceCgb4FifthTrackClearDecrementTiming({ r2BeforeFifthTrackClearDecrement: 6 });
    expect(timing).not.toBeNull();
    const intentionallyOverpriced = 2 * 2 + 6;
    expect(() => expect(intentionallyOverpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyOverpriced).toBe(10);
    expect(timing!.sourceCycles).toBe(4);
  });

  it("fails closed outside the exact source-derived r2 state and body boundary", () => {
    for (const value of [
      undefined,
      null,
      {},
      { r2BeforeFifthTrackClearDecrement: -1 },
      { r2BeforeFifthTrackClearDecrement: 0 },
      { r2BeforeFifthTrackClearDecrement: 5 },
      { r2BeforeFifthTrackClearDecrement: 7 },
      { r2BeforeFifthTrackClearDecrement: 6.5 },
      { r2BeforeFifthTrackClearDecrement: 0x1_0000_0000 },
      { r2BeforeFifthTrackClearDecrement: 6, sourceStateDigest: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, fifthTrackFlags: 0x80 },
      { r2BeforeFifthTrackClearDecrement: 6, trackPointer: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, runtimeAddress: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, trackCount: 7 },
      { r2BeforeFifthTrackClearDecrement: 6, trackIndex: 4 },
      { r2BeforeFifthTrackClearDecrement: 6, trackIdentity: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, channel: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, frame: 1 },
      { r2BeforeFifthTrackClearDecrement: 6, duration: 1 },
      { r2BeforeFifthTrackClearDecrement: 6, conditionFlags: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, v42NonzeroMaskBody: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, positiveContinuationBody: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, exitBody: "forbidden" },
      { r2BeforeFifthTrackClearDecrement: 6, laterLoop: "forbidden" },
    ]) expect(reduceCgb4FifthTrackClearDecrementTiming(value)).toBeNull();
  });

  it("proves exact source/ELF/ROM bytes, sourceStateDigest containment, and the retained r2 path", () => {
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1363-1372, 1443-1450", sha256: "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c" },
        r2PreservationPath: [
          "frozen v39 fourth-track subs r2, 0x1 leaves 6 and ble is not taken",
          "v40 movs/adds/bgt continuation writes r0/r5 and branches, not r2",
          "v41 fifth-track EXIST load/test/beq writes r0/r1 and flags, not r2",
          "v42 clear volume/pitch movs/test/taken beq writes r0/r1 and flags, not r2",
        ],
      },
      elf: {
        containingEntry: "0x082dfc00",
        instructionStart: "0x082dfc9a",
        endExclusive: "0x082dfc9e",
        clearMaskTakenSuccessor: "0x082dfc9a",
        takenSuccessor: "0x082dfca4",
        nonTakenSuccessorFirstInstruction: "movs r0, MusicPlayerTrack_size",
        takenSuccessorFirstInstruction: "_081DDA6C: ldr r0, lt2_ID_NUMBER",
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
      predecessorR2PreservationRegions: [
        { role: "fourth-track positive continuation", start: "0x082dfc9e", endExclusive: "0x082dfca4", bytesHex: "50 20 2d 18 ad dc", writesR2: false },
        { role: "fifth-track EXIST decision", start: "0x082dfc00", endExclusive: "0x082dfc08", bytesHex: "28 78 80 21 01 42 48 d0", writesR2: false },
        { role: "fifth-track volume/pitch decision", start: "0x082dfc08", endExclusive: "0x082dfc0e", bytesHex: "0f 21 01 42 45 d0", writesR2: false },
      ],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        memoryAccesses: 0,
        dataAccessPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
        bleNotTakenModel: "subs; non-taken ble = 2 halfwords * 2 + zero refill = 4",
        bleTakenModel: "subs; taken ble = 2 halfwords * 2 + one 6-cycle refill = 10",
      },
    });
    expect(evidence.frozenInputs).toMatchObject({
      acceptedV42EvidenceSha256: V42_EVIDENCE_SHA256,
      acceptedV42DocSha256: V42_DOC_SHA256,
      acceptedV41EvidenceSha256: V41_EVIDENCE_SHA256,
      acceptedV41DocSha256: V41_DOC_SHA256,
      acceptedV41PacketSha256: V41_PACKET_HASHES,
      v42HasNoPacket: true,
      v42RegenerationTransitivelyVerifiesV41AndInheritedEvidenceReportsByteForByte: true,
      v42V41PacketsAndInheritedEvidenceRetainedByteForByte: true,
      v43RuntimeCaptureCount: 0,
    });
    expect(evidence.join).toMatchObject({
      key: "sourceStateDigest",
      frozenV42Rows: 3,
      selectedClearV42Rows: 2,
      frozenNonzeroMaskV42Rows: 1,
      retainedV39Rows: 3,
      joinedRows: 2,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
    });
    expect(evidence.predecessorRegisterProof).toEqual({
      key: "sourceStateDigest",
      frozenV39R2BeforeFourthTrackDecrement: 7,
      fourthTrackPostDecrementR2: 6,
      v40V41V42R2Writes: false,
      r2BeforeFifthTrackClearDecrement: 6,
      r2AfterFifthTrackClearDecrement: 5,
      noNewRuntimeScalar: true,
    });
    expect(evidence.coverage).toMatchObject({
      frozenV42Rows: 3,
      frozenV42ClearMaskRows: 2,
      frozenV42NonzeroMaskRows: 1,
      sourceOnlyClearDecrementRows: 2,
      postV42FifthTrackClearDecrementDecisionSourceCycles: 8,
      acceptedContiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles: 6226,
      contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles: 6234,
      sequentialThumbHalfwords: 4,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      frozenNonzeroMaskRowRemainsAtV42Stop: true,
    });
    expect(evidence.rows).toHaveLength(2);
    for (const sourceStateDigest of SELECTED_CLEAR) {
      expect(evidence.rows.find((row: any) => row.sourceStateDigest === sourceStateDigest)).toEqual({
        sourceStateDigest,
        r2BeforeFifthTrackClearDecrement: 6,
        r2AfterFifthTrackClearDecrement: 5,
        fifthTrackClearDecrementDecision: "subs-r2-1; ble-not-taken",
        postV42FifthTrackClearDecrementDecisionSourceCycles: 4,
        contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles: 976,
        bleTakenControlTransferRefills: 0,
        stopsBeforeV43Instruction: "movs r0, MusicPlayerTrack_size",
      });
    }
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "bleTakenControlTransferRefills",
        "contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles",
        "fifthTrackClearDecrementDecision",
        "postV42FifthTrackClearDecrementDecisionSourceCycles",
        "r2AfterFifthTrackClearDecrement",
        "r2BeforeFifthTrackClearDecrement",
        "sourceStateDigest",
        "stopsBeforeV43Instruction",
      ]);
      expect(row.fifthTrackFlags).toBeUndefined();
      expect(row.trackPointer).toBeUndefined();
      expect(row.runtimeAddress).toBeUndefined();
      expect(row.trackCount).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
      expect(row.trackIdentity).toBeUndefined();
      expect(row.channel).toBeUndefined();
      expect(row.frame).toBeUndefined();
      expect(row.duration).toBeUndefined();
      expect(row.conditionFlags).toBeUndefined();
      expect(row.v42NonzeroMaskBody).toBeUndefined();
      expect(row.positiveContinuationBody).toBeUndefined();
      expect(row.exitBody).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV42ArtifactsReadOnly: true,
      frozenV41ArtifactsAndPacketsReadOnly: true,
      inheritedV40ArtifactsReadOnly: true,
      inheritedV39ArtifactsAndPacketsReadOnly: true,
      inheritedV38ArtifactsReadOnly: true,
      inheritedV37ArtifactsAndPacketsReadOnly: true,
      frozenArtifactsAreNotProductionImports: true,
      v43RuntimeCaptureCount: 0,
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
      newRuntimeR2Scalar: null,
      v42NonzeroMaskBody: null,
      positiveContinuationBody: null,
      exitBody: null,
      laterLoop: null,
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

  it("keeps v42, v41 packets, and every inherited artifact byte-for-byte", () => {
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v42.json")).toBe(V42_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v42.md")).toBe(V42_DOC_SHA256);
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v41.json")).toBe(V41_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v41.md")).toBe(V41_DOC_SHA256);
    for (const [path, hash] of Object.entries(INHERITED_HASHES)) expect(sha256(path)).toBe(hash);
    for (const [name, hash] of Object.entries(V41_PACKET_HASHES)) {
      const path = join("tests/fixtures/factory-m4a-note-body-cgb4-v41", name + ".json");
      const packet = JSON.parse(readFileSync(path, "utf8"));
      expect(sha256(path)).toBe(hash);
      expect(Object.keys(packet).sort()).toEqual(["addressFree", "captureBoundary", "case", "joinKey", "observations", "oracleProfile", "schema", "sourceFunction"]);
      for (const row of packet.observations) expect(Object.keys(row).sort()).toEqual(["fifthTrackFlags", "sourceStateDigest"]);
    }
    for (const [version, hashes] of Object.entries(INHERITED_PACKET_HASHES)) {
      for (const [name, hash] of Object.entries(hashes)) {
        expect(sha256(join("tests/fixtures", "factory-m4a-note-body-cgb4-v" + version, name + ".json"))).toBe(hash);
      }
    }
  });

  it("regenerates v43 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v43-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v43-b-"));
    const args = ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v43.ts", "--out-dir"];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of ["factory-m4a-note-body-cgb4-evidence-v43.json", "issue55-m4a-note-body-cgb4-v43.md"] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v43.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v43.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
