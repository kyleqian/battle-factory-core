import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { describeCgb4Evidence } from "./factoryM4aNoteBodyCgb4Gate.ts";
import {
  makeEvidence,
  reduceCgb4SourceOnlySuccessorPrefixTiming,
} from "../tools/report/factory-m4a-note-body-cgb4-v24.ts";

const EVIDENCE = "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v24.json";
const DOC = "docs/issue55-m4a-note-body-cgb4-v24.md";
const V23_EVIDENCE_SHA256 = "4ae623c81d7a0d0345a672807a6ba20e1ac3bae812450e45824f26d5ee3346e4";
const V23_DOC_SHA256 = "1c28507bf165e6960a1293764cf192c6decd7619fd756610629edbef8c1011af";
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describeCgb4Evidence("Issue #55 CGB4 source-only successor prefix v24", () => {
  it("prices the fixed two-halfword successor prefix without a runtime operand", () => {
    expect(reduceCgb4SourceOnlySuccessorPrefixTiming({})).toEqual({
      sequentialThumbHalfwords: 2,
      iwramByteLoads: 1,
      iwramWordLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      sourceCycles: 4,
      stopsBeforeInstruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    });
    expect(5728 + 3 * 4).toBe(5740);
  });

  it("red-first rejects an intentional two-cycle under-price", () => {
    const timing = reduceCgb4SourceOnlySuccessorPrefixTiming({});
    expect(timing).not.toBeNull();
    const intentionallyUnderpriced = 2;
    expect(() => expect(intentionallyUnderpriced).toBe(timing!.sourceCycles)).toThrow();
    expect(intentionallyUnderpriced).toBe(2);
    expect(timing!.sourceCycles).toBe(4);
  });

  it("fails closed when a source-only receipt is widened with runtime state", () => {
    expect(reduceCgb4SourceOnlySuccessorPrefixTiming(undefined)).toBeNull();
    expect(reduceCgb4SourceOnlySuccessorPrefixTiming({ trackCount: "forbidden" })).toBeNull();
    expect(reduceCgb4SourceOnlySuccessorPrefixTiming({ tracksPointer: "forbidden" })).toBeNull();
    expect(reduceCgb4SourceOnlySuccessorPrefixTiming({ trackFlags: "forbidden" })).toBeNull();
    expect(reduceCgb4SourceOnlySuccessorPrefixTiming({ trackIndex: "forbidden" })).toBeNull();
  });

  it("freezes v23 and joins only its three selected digests through _081DD9C4", () => {
    const evidence = makeEvidence() as any;
    expect(evidence.sourceAndElf).toMatchObject({
      source: {
        assembly: {
          path: "reference/pokeemerald/src/m4a_1.s",
          lines: "1360-1362",
        },
        musicPlayerInfo: {
          trackCount: { offset: 8, width: "u8", runtimeValue: null },
          tracks: { offset: 44, width: "pointer", runtimeValue: null },
        },
        staticPlayerStorage: {
          staticOrder: {
            ordinaryPlayers: 4,
            cryPlayers: 2,
            staticSlots: 6,
            selectedArrayElement: null,
          },
          linker: { class: "IWRAM", origin: "0x03000000" },
        },
      },
      elf: {
        entry: "0x082dfbfc",
        endExclusive: "0x082dfc00",
        gPokemonCryMusicPlayers: { class: "IWRAM" },
      },
      compiledRegions: [{
        role: "ldrb r2, [r7, trackCount]; ldr r5, [r7, tracks]",
        start: "0x082dfbfc",
        endExclusive: "0x082dfc00",
        bytes: 4,
        bytesHex: "3a 7a fd 6a",
        sha256: "7819a0d1d7a2513e6f9f8802939f4acc59c4733ebb6ec021ba1e3396dd77706f",
      }],
      timingClasses: {
        sequentialThumbHalfwordCycles: 2,
        iwramByteLoadPremiumCycles: 0,
        iwramWordLoadPremiumCycles: 0,
        takenControlTransferRefillCycles: 6,
      },
    });
    expect(evidence.frozenInputs).toEqual({
      acceptedV23EvidenceSha256: V23_EVIDENCE_SHA256,
      acceptedV23DocSha256: V23_DOC_SHA256,
      v23RegeneratesByteForByte: true,
      v23EvidenceAndReportRetainedByteForByte: true,
    });
    expect(sha256("tests/fixtures/factory-m4a-note-body-cgb4-evidence-v23.json")).toBe(V23_EVIDENCE_SHA256);
    expect(sha256("docs/issue55-m4a-note-body-cgb4-v23.md")).toBe(V23_DOC_SHA256);
    expect(evidence.capture).toEqual({
      boundary: "source-only _081DD9C4 successor prefix through ldr r5, before _081DD9C8",
      scalars: [],
      excluded: [
        "trackCount",
        "tracks pointer",
        "tracks identity",
        "tracks address",
        "track flags",
        "track index",
        "successor loop body",
        "runtime address",
        "frame",
        "duration",
      ],
    });
    expect(evidence.join).toEqual({
      key: "sourceStateDigest",
      frozenV23SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing",
        "duplicate",
        "reordered",
        "ambiguous",
        "extra",
        "non-v23-selected-row",
        "unsupported-runtime-field",
      ],
    });
    expect(evidence.coverage).toEqual({
      frozenV23SelectedRows: 3,
      sourceOnlySuccessorPrefixRows: 3,
      postV23SourceOnlySuccessorPrefixSourceCycles: 12,
      acceptedContiguousPrefixThroughBccDecisionSourceCycles: 5728,
      contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles: 5740,
      sequentialThumbHalfwords: 6,
      iwramByteLoads: 3,
      iwramWordLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
    });
    expect(evidence.rows).toEqual(SELECTED_DIGESTS.map((sourceStateDigest) => ({
      sourceStateDigest,
      postV23SourceOnlySuccessorPrefixSourceCycles: 4,
      contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles: 808,
      stopsBeforeV24Instruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    })));
    for (const row of evidence.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles",
        "postV23SourceOnlySuccessorPrefixSourceCycles",
        "sourceStateDigest",
        "stopsBeforeV24Instruction",
      ]);
      expect(row.trackCount).toBeUndefined();
      expect(row.tracksPointer).toBeUndefined();
      expect(row.trackFlags).toBeUndefined();
      expect(row.trackIndex).toBeUndefined();
    }
    expect(evidence.containment).toMatchObject({
      frozenV23ArtifactsReadOnly: true,
      frozenV23ArtifactsAreNotProductionImports: true,
      v24RuntimeCaptureCount: 0,
      trackCount: null,
      tracksPointer: null,
      tracksIdentity: null,
      tracksAddress: null,
      trackFlags: null,
      trackIndex: null,
      successorLoopBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    });
  });

  it("regenerates v24 evidence and report twice byte-for-byte", () => {
    const directoryA = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v24-a-"));
    const directoryB = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v24-b-"));
    const args = [
      "--experimental-strip-types",
      "tools/report/factory-m4a-note-body-cgb4-v24.ts",
      "--out-dir",
    ];
    execFileSync(process.execPath, [...args, directoryA], { cwd: process.cwd() });
    execFileSync(process.execPath, [...args, directoryB], { cwd: process.cwd() });
    for (const name of [
      "factory-m4a-note-body-cgb4-evidence-v24.json",
      "issue55-m4a-note-body-cgb4-v24.md",
    ] as const) {
      expect(readFileSync(join(directoryA, name)).equals(readFileSync(join(directoryB, name)))).toBe(true);
    }
    expect(readFileSync(join(directoryA, "factory-m4a-note-body-cgb4-evidence-v24.json")).equals(readFileSync(EVIDENCE))).toBe(true);
    expect(readFileSync(join(directoryA, "issue55-m4a-note-body-cgb4-v24.md")).equals(readFileSync(DOC))).toBe(true);
  });
});
