import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const V41_EVIDENCE_SHA256 = "3d2c05c30543c69dd824826993213d6cf692a916c3d800d302cf46fbafbe0963";
const V41_DOC_SHA256 = "b3c1057fafe83de3eb7a17c32355f4a3bd4e83e9c60a1c9640b8b474b62ef36e";
const V41_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "79baf363f8822c218b0c1e627c9ce033631ad3b3b513e7f54c7c1558b7120cc8",
  liliana: "1938050ae62a1e5465e8025e357fc9ff5c4b4d307f8d3a9e7cfd382d897dd24e",
  "factory-varied": "234edd165872f3b2294185f77ced262a09f9ea3696fe83271444164e63035332",
};
const V40_EVIDENCE_SHA256 = "2bd6f1b5d6e94d09d333c4937c2588b6f6aa4f4191c3654d27f8567d71ecfb2a";
const V40_DOC_SHA256 = "459acae2f4df10cf86072b96dbfef292b34c2a5aeaa55e783fa3f45bba67f0e3";
const V39_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "317c223e01b3907b2016af6e5c4294db06d0f53872fcbdf38d7086bf25244ceb",
  liliana: "496c24229d1e9a542f3763cd26cb0959d0c6320d431b1453e0bb72988f790c74",
  "factory-varied": "68c43a7e757d47f32a383d3d09c03c33f8a92dd82a51b4fdfef8f861f880b343",
};
const V37_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "4dad511aee6b508723c2ddd5ca283756ca17435c23388ecf374273bbcf86a8c4",
  liliana: "8afcc0bad8bd77c9ae28d442a9a496101af1321c4b71e54b5bb49160197d7a9d",
  "factory-varied": "6f202501970fd31eddb94f489d2e3360fde3ec78d90df6ab4cbdba64f5d81e67",
};
const V41_SELECTED_FLAGS = new Map<string, number>([
  ["2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e", 0x83],
  ["c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902", 0x80],
  ["e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8", 0x80],
]);
const V42_EXPECTED_ROWS = new Map([
  ["2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e", {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
    sourceCycles: 6,
    contiguousCycles: 966,
    refills: 0,
    stop: "mov r9, r2",
  }],
  ["c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902", {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
    sourceCycles: 12,
    contiguousCycles: 972,
    refills: 1,
    stop: "_081DDA62: subs r2, 0x1",
  }],
  ["e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8", {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
    sourceCycles: 12,
    contiguousCycles: 972,
    refills: 1,
    stop: "_081DDA62: subs r2, 0x1",
  }],
]);
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V41_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v41.json");
const V41_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v41.md");
const V41_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v41");
const V40_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v40.json");
const V40_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v40.md");
const V39_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v39");
const V37_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v37");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v42.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v42.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc08;
const BODY_END = 0x082d_fc0e;

function fail(message: string): never {
  throw new Error("factory-m4a-note-body-cgb4-v42: " + message);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function checkedBytes(path: string, hash: string): Buffer {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(path + " changed");
  return bytes;
}

function checkedJson(path: string, hash: string): unknown {
  return JSON.parse(checkedBytes(path, hash).toString("utf8"));
}

function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(label + " must be a SHA-256 digest");
  return value;
}

function requireU8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 0xff) fail(label + " must be a u8");
  return value;
}

export type Cgb4FifthTrackVolPitchTiming = Readonly<{
  route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" | "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken";
  fifthTrackFlags: number;
  volPitchMask: 0x0f;
  sequentialThumbHalfwords: 3;
  memoryAccesses: 0;
  dataAccessPremiumCycles: 0;
  beqTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 6 | 12;
  stopsBeforeInstruction: "_081DDA62: subs r2, 0x1" | "mov r9, r2";
}>;

/** Price only the fifth-loop _081DD9D0 volume/pitch-mask decision. */
export function reduceCgb4FifthTrackVolPitchTiming(state: unknown): Cgb4FifthTrackVolPitchTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["fifthTrackFlags"])) return null;
  let fifthTrackFlags: number;
  try {
    fifthTrackFlags = requireU8(state.fifthTrackFlags, "fifthTrackFlags");
  } catch {
    return null;
  }
  const volPitchMask = 0x0f as const;
  const maskNonzero = (fifthTrackFlags & volPitchMask) !== 0;
  return Object.freeze(maskNonzero ? {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
    fifthTrackFlags,
    volPitchMask,
    sequentialThumbHalfwords: 3,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 0,
    takenControlTransferRefills: 0,
    sourceCycles: 6,
    stopsBeforeInstruction: "mov r9, r2",
  } : {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken",
    fifthTrackFlags,
    volPitchMask,
    sequentialThumbHalfwords: 3,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 12,
    stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
  }) as Cgb4FifthTrackVolPitchTiming;
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (
    sha256(assembly) !== M4A1_SHA256 || sha256(internal) !== M4A_INTERNAL_SHA256 ||
    sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256
  ) fail("source, ELF, or ROM changed");

  const decision = [
    "\tmovs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    "\ttst r1, r0",
    "\tbeq _081DDA62",
  ].join("\n");
  const nonzeroBody = ["\tmov r9, r2", "\tadds r0, r7, 0"].join("\n");
  const decrement = ["_081DDA62:", "\tsubs r2, 0x1"].join("\n");
  if (
    !assembly.includes(decision) || !assembly.includes(nonzeroBody) || !assembly.includes(decrement) ||
    !internal.includes("#define MPT_FLG_VOLCHG 0x03") || !internal.includes("#define MPT_FLG_PITCHG 0x0C")
  ) fail("fifth-track volume/pitch decision, mask, or body boundary changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x0f, 0x21, 0x01, 0x42, 0x45, 0xd0]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled fifth-track volume/pitch decision changed");
  const beq = body.readUInt16LE(4);
  const signedImm8 = (beq & 0x80) === 0 ? beq & 0xff : (beq & 0xff) - 0x100;
  const decodedTarget = BODY_START + 8 + signedImm8 * 2;
  if ((beq & 0xff00) !== 0xd000 || decodedTarget !== 0x082d_fc9a) fail("compiled fifth-track beq target changed");

  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62", "082dfca4 t _081DDA6C"]) {
    if (!symbols.includes(symbol)) fail("ELF symbol " + symbol + " changed");
  }

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1368-1372, 1443-1444", sha256: sha256(assembly) },
      musicPlayerTrack: {
        volumePitchMask: {
          path: "reference/pokeemerald/include/gba/m4a_internal.h",
          lines: "265-270",
          volumeChange: { name: "MPT_FLG_VOLCHG", value: "0x03" },
          pitchChange: { name: "MPT_FLG_PITCHG", value: "0x0c" },
          orMask: "0x0f",
          runtimeValue: null,
          sha256: sha256(internal),
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
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62",
      start: "0x082dfc08",
      endExclusive: "0x082dfc0e",
      bytes: body.length,
      bytesHex: "0f 21 01 42 45 d0",
      sha256: BODY_SHA256,
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
  };
}

function assertV41ArtifactsAndReportRegenerate(): void {
  const expectedEvidence = checkedBytes(V41_EVIDENCE, V41_EVIDENCE_SHA256);
  const expectedDoc = checkedBytes(V41_DOC, V41_DOC_SHA256);
  checkedBytes(V40_EVIDENCE, V40_EVIDENCE_SHA256);
  checkedBytes(V40_DOC, V40_DOC_SHA256);
  for (const name of CASES) {
    checkedBytes(join(V41_PACKETS, name + ".json"), V41_PACKET_HASHES[name]);
    checkedBytes(join(V39_PACKETS, name + ".json"), V39_PACKET_HASHES[name]);
    checkedBytes(join(V37_PACKETS, name + ".json"), V37_PACKET_HASHES[name]);
  }
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v42-v41-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v41.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v41.json")).equals(expectedEvidence)) fail("v41 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v41.md")).equals(expectedDoc)) fail("v41 report does not regenerate byte-for-byte");
}

type FrozenV41Row = {
  sourceStateDigest: string;
  fifthTrackFlags: number;
  contiguousPrefixThroughFifthTrackExistDecisionSourceCycles: number;
};

function frozenV41SelectedRows(frozenV41: unknown): FrozenV41Row[] {
  if (
    !isRecord(frozenV41) || frozenV41.schema !== "factory-m4a-note-body-cgb4-evidence/v41" ||
    frozenV41.oracleProfile !== "battle-scene-off" || frozenV41.addressFree !== true || !Array.isArray(frozenV41.rows)
  ) fail("frozen v41 evidence identity changed");
  const seen = new Set<string>();
  const rows = frozenV41.rows.map((row, index) => {
    const expected = [
      "sourceStateDigest", "fifthTrackFlags", "fifthTrackExistDecision",
      "postV40FifthTrackExistDecisionSourceCycles", "contiguousPrefixThroughFifthTrackExistDecisionSourceCycles",
      "beqTakenControlTransferRefills", "stopsBeforeV41Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail("frozen v41 row " + index + " carries an unsupported field");
    const sourceStateDigest = requireDigest(row.sourceStateDigest, "frozen v41 row " + index + " digest");
    const fifthTrackFlags = requireU8(row.fifthTrackFlags, "frozen v41 row " + index + " fifthTrackFlags");
    const expectedFlags = V41_SELECTED_FLAGS.get(sourceStateDigest);
    if (
      expectedFlags === undefined || seen.has(sourceStateDigest) || fifthTrackFlags !== expectedFlags ||
      row.fifthTrackExistDecision !== "MPT_FLG_EXIST-set-beq-not-taken" ||
      row.postV40FifthTrackExistDecisionSourceCycles !== 8 ||
      row.contiguousPrefixThroughFifthTrackExistDecisionSourceCycles !== 960 ||
      row.beqTakenControlTransferRefills !== 0 ||
      row.stopsBeforeV41Instruction !== "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG"
    ) fail("frozen v41 row " + index + " no longer selects the fifth-track volume/pitch decision");
    seen.add(sourceStateDigest);
    return {
      sourceStateDigest,
      fifthTrackFlags,
      contiguousPrefixThroughFifthTrackExistDecisionSourceCycles:
        row.contiguousPrefixThroughFifthTrackExistDecisionSourceCycles,
    };
  });
  if (rows.length !== V41_SELECTED_FLAGS.size || seen.size !== V41_SELECTED_FLAGS.size) {
    fail("v41 sourceStateDigest join is missing, duplicate, ambiguous, or extra");
  }
  return rows;
}

function productionReceiptContainment(): boolean {
  const fragments = [
    "factory-m4a-note-body-cgb4-evidence-v37", "issue55-m4a-note-body-cgb4-v37", "factory-m4a-note-body-cgb4-v37",
    "factory-m4a-note-body-cgb4-evidence-v39", "issue55-m4a-note-body-cgb4-v39", "factory-m4a-note-body-cgb4-v39",
    "factory-m4a-note-body-cgb4-evidence-v40", "issue55-m4a-note-body-cgb4-v40", "factory-m4a-note-body-cgb4-v40",
    "factory-m4a-note-body-cgb4-evidence-v41", "issue55-m4a-note-body-cgb4-v41", "factory-m4a-note-body-cgb4-v41",
    "factory-m4a-note-body-cgb4-evidence-v42", "issue55-m4a-note-body-cgb4-v42", "factory-m4a-note-body-cgb4-v42",
  ];
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  const hits = visit(join(ROOT, "src")).filter((path) => fragments.some((fragment) => readFileSync(path, "utf8").includes(fragment)));
  if (hits.length !== 0) fail("production imports frozen evidence or packets: " + hits.join(", "));
  return true;
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV41 = checkedJson(V41_EVIDENCE, V41_EVIDENCE_SHA256);
  assertV41ArtifactsAndReportRegenerate();
  const frozenRows = frozenV41SelectedRows(frozenV41);
  const rows = frozenRows.map((prior) => {
    const timing = reduceCgb4FifthTrackVolPitchTiming({ fifthTrackFlags: prior.fifthTrackFlags });
    if (!timing) fail("frozen v41 fifthTrackFlags scalar is malformed");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      fifthTrackVolPitchMaskDecision: timing.route,
      postV41FifthTrackVolPitchDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles:
        prior.contiguousPrefixThroughFifthTrackExistDecisionSourceCycles + timing.sourceCycles,
      beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
      stopsBeforeV42Instruction: timing.stopsBeforeInstruction,
    };
  });
  const maskClearRows = rows.filter((row) => row.fifthTrackVolPitchMaskDecision === "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken");
  const maskNonzeroRows = rows.filter((row) => row.fifthTrackVolPitchMaskDecision === "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken");
  const added = rows.reduce((sum, row) => sum + row.postV41FifthTrackVolPitchDecisionSourceCycles, 0);
  const contiguous = 6196 + added;
  const rowsBySourceStateDigest = new Map(rows.map((row) => [row.sourceStateDigest, row]));
  const sourceRoutePricing = {
    maskNonzeroSourceCycles: reduceCgb4FifthTrackVolPitchTiming({ fifthTrackFlags: 0x83 })!.sourceCycles,
    maskClearSourceCycles: reduceCgb4FifthTrackVolPitchTiming({ fifthTrackFlags: 0x80 })!.sourceCycles,
  };
  if (
    rows.length !== 3 || maskClearRows.length !== 2 || maskNonzeroRows.length !== 1 || added !== 30 || contiguous !== 6226 ||
    sourceRoutePricing.maskNonzeroSourceCycles !== 6 || sourceRoutePricing.maskClearSourceCycles !== 12 ||
    rowsBySourceStateDigest.size !== V42_EXPECTED_ROWS.size ||
    ![...V42_EXPECTED_ROWS].every(([sourceStateDigest, expected]) => {
      const row = rowsBySourceStateDigest.get(sourceStateDigest);
      return row?.fifthTrackVolPitchMaskDecision === expected.route &&
        row.postV41FifthTrackVolPitchDecisionSourceCycles === expected.sourceCycles &&
        row.contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles === expected.contiguousCycles &&
        row.beqTakenControlTransferRefills === expected.refills &&
        row.stopsBeforeV42Instruction === expected.stop;
    })
  ) fail("v41 frozen flags or fifth-track volume/pitch pricing changed; refuse to fit a different route");

  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v42",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
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
    },
    capture: {
      boundary: "source-only fifth-track _081DD9D0 volume/pitch-mask decision through beq; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "track pointer", "runtime address", "track count", "track index", "track identity",
        "channel", "frame", "duration", "condition flags", "wider state", "fifthTrackFlags serialization",
        "mask-nonzero mov r9, r2 body", "clear-mask _081DDA62 decrement/exit body", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV41SelectedRows: 3,
      joinedRows: rows.length,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "ambiguous", "extra", "non-v41-selected-row",
        "unsupported-runtime-field", "unexpected-frozen-v41-flags", "unexpected-observed-route",
      ],
    },
    coverage: {
      frozenV41SelectedRows: 3,
      sourceOnlyVolPitchDecisionRows: 3,
      frozenFifthTrackFlagsValues: [0x80, 0x83],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: maskClearRows.length,
      volPitchMaskNonzeroRows: maskNonzeroRows.length,
      postV41FifthTrackVolPitchDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughFifthTrackExistDecisionSourceCycles: 6196,
      contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: rows.length * 3,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: rows.reduce((sum, row) => sum + row.beqTakenControlTransferRefills, 0),
      sourceRoutePricing,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV41ArtifactsReadOnly: true,
      v41PacketsRetainedReadOnly: true,
      inheritedV40ArtifactsRetainedReadOnly: true,
      inheritedV39PacketsRetainedReadOnly: true,
      inheritedV37PacketsRetainedReadOnly: true,
      frozenV41ArtifactsAreNotProductionImports: noProductionImports,
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
      otherPostSelectionCallbacks: null,
      completeMPlay: null,
      serviceCost: null,
      arbitration: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      animation: null,
      rust: null,
      canonicalBattle2: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Source-only v42 freezes v41 evidence, report, packets, and inherited evidence byte-for-byte, then joins only the same three sourceStateDigest rows. Frozen fifthTrackFlags values 0x83, 0x80, and 0x80 derive one nonzero mask route and two clear mask routes under MPT_FLG_VOLCHG|MPT_FLG_PITCHG = 0x0f. Source/ELF/exact-ROM price the nonzero non-taken route at 6 cycles and each clear taken route at 12 cycles with a 6-cycle refill, advancing the aggregate prefix from 6196 to 6226. It stops before mov r9, r2 on the nonzero route and before _081DDA62: subs r2, 0x1 on clear routes.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  const rows = evidence.rows as Array<Record<string, unknown>>;
  const frozenFlags = new Map<string, number>(V41_SELECTED_FLAGS);
  const flagsText = (value: number): string => "0x" + value.toString(16).padStart(2, "0");
  const maskText = (value: number): string => {
    const result = value & 0x0f;
    return "0x" + result.toString(16).padStart(2, "0") + (result === 0 ? " clear" : " nonzero");
  };
  return [
    "# Issue #55 — CGB4 fifth-track volume/pitch-mask decision v42",
    "",
    "Generated by node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v42.ts; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, and source-only. v42 freezes v41 evidence, report, packets, and inherited evidence byte-for-byte, verifies the predecessor regenerates byte-for-byte, and joins only its same three selected sourceStateDigest rows. It performs no oracle capture and accepts no new runtime scalar or packet field.",
    "",
    "Frozen v41 supplies fifthTrackFlags 0x83, 0x80, and 0x80 by sourceStateDigest only. Pinned source defines MPT_FLG_VOLCHG = 0x03 and MPT_FLG_PITCHG = 0x0c, yielding exact mask 0x0f. v42 derives each route from that frozen scalar and does not serialize the scalar again.",
    "",
    "Source/ELF/exact-ROM close exactly _081DD9D0..0x082dfc0e: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62, exact bytes 0f 21 01 42 45 d0. This slice executes no data access: 0 memory accesses and 0 data-access premium.",
    "",
    "A nonzero mask does not take beq and costs 3 Thumb halfwords x 2 = 6 cycles with no refill; v42 stops before the mask-nonzero body at mov r9, r2. A clear mask takes beq _081DDA62 and costs 3 x 2 + one 6-cycle pipeline refill = 12 cycles; v42 stops before the decrement/exit body at _081DDA62: subs r2, 0x1.",
    "",
    "| frozen selected sourceStateDigest | frozen flags | mask | accepted route | cycles/row | stop boundary |",
    "| --- | ---: | --- | --- | ---: | --- |",
    ...rows.map((row) => {
      const digest = String(row.sourceStateDigest);
      const flags = frozenFlags.get(digest);
      if (flags === undefined) fail("markdown row lost sourceStateDigest join");
      return "| " + digest.slice(0, 12) + "… | " + flagsText(flags) + " | " + maskText(flags) + " | " +
        String(row.fifthTrackVolPitchMaskDecision) + " | " + String(row.postV41FifthTrackVolPitchDecisionSourceCycles) +
        " | " + String(row.stopsBeforeV42Instruction) + " |";
    }),
    "",
    "The aggregate source prefix advances from 6,196 to " + String(coverage.contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles) +
      " cycles (" + String(coverage.postV41FifthTrackVolPitchDecisionSourceCycles) + " added). It does not enter either successor body. Track pointer/address/count/index/identity/channel/frame/duration/condition flags, wider state, broader MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, ROADMAP/DEFERRED, and canonical Battle-2 work remain untouched.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v42.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v42.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v42.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
