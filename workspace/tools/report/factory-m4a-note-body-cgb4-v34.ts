import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const V33_EVIDENCE_SHA256 = "806b5582ceaca2c20fcf2f9d12e49d74fd20203a1e9cf796ee2e012d0fac9339";
const V33_DOC_SHA256 = "61fe1034995051f904ddaf2ea1860c44f072350a69314584d6f019aa6224759f";
const V33_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "5b200f46ea9182f5f1ba1f349b07f012b282f2d96157c2b49c0cee0e163b88c9",
  liliana: "edb093d86fd4deffdc39f2802d545d2422d3ca94ece18883d6d8dd2522c3bc13",
  "factory-varied": "a6e227b52726b060268a24d01aa404bcf54b576d3640cbdb85d76d9ffe4a4411",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V33_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v33.json");
const V33_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v33.md");
const V33_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v33");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v34.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v34.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc08;
const BODY_END = 0x082d_fc0e;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v34: ${message}`);
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
  if (sha256(bytes) !== hash) fail(`${path} changed`);
  return bytes;
}

function checkedJson(path: string, hash: string): unknown {
  return JSON.parse(checkedBytes(path, hash).toString("utf8"));
}

function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} must be a SHA-256 digest`);
  return value;
}

function requireU8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 0xff) fail(`${label} must be a u8`);
  return value;
}

export type Cgb4ThirdTrackVolPitchTiming = Readonly<{
  route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" | "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken";
  thirdTrackFlags: number;
  volPitchMask: 0x0f;
  sequentialThumbHalfwords: 3;
  memoryAccesses: 0;
  dataAccessPremiumCycles: 0;
  beqTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 6 | 12;
  stopsBeforeInstruction: "_081DDA62: subs r2, 0x1" | "mov r9, r2";
}>;

/** Price only the third-loop `_081DD9D0` volume/pitch-mask decision. */
export function reduceCgb4ThirdTrackVolPitchTiming(state: unknown): Cgb4ThirdTrackVolPitchTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["thirdTrackFlags"])) return null;
  let thirdTrackFlags: number;
  try {
    thirdTrackFlags = requireU8(state.thirdTrackFlags, "thirdTrackFlags");
  } catch {
    return null;
  }
  const volPitchMask = 0x0f as const;
  const maskNonzero = (thirdTrackFlags & volPitchMask) !== 0;
  return Object.freeze(maskNonzero ? {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
    thirdTrackFlags,
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
    thirdTrackFlags,
    volPitchMask,
    sequentialThumbHalfwords: 3,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 12,
    stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
  }) as Cgb4ThirdTrackVolPitchTiming;
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
  const decrement = ["_081DDA62:", "\tsubs r2, 0x1"].join("\n");
  if (
    !assembly.includes(decision) || !assembly.includes(decrement) ||
    !internal.includes("#define MPT_FLG_VOLCHG 0x03") || !internal.includes("#define MPT_FLG_PITCHG 0x0C")
  ) fail("third-track volume/pitch decision, mask, or selected stop changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x0f, 0x21, 0x01, 0x42, 0x45, 0xd0]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled third-track volume/pitch decision changed");
  const beq = body.readUInt16LE(4);
  const signedImm8 = (beq & 0x80) === 0 ? beq & 0xff : (beq & 0xff) - 0x100;
  const decodedTarget = BODY_START + 8 + signedImm8 * 2;
  if ((beq & 0xff00) !== 0xd000 || decodedTarget !== 0x082d_fc9a) fail("compiled third-track beq target changed");

  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62"]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1368-1370, 1443-1444", sha256: sha256(assembly) },
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
      takenSuccessor: "0x082dfc9a",
      selectedSuccessorFirstInstruction: "_081DDA62: subs r2, 0x1",
      alternateNonselectedFirstInstruction: "mov r9, r2",
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

function assertV33Frozen(): void {
  const expectedEvidence = checkedBytes(V33_EVIDENCE, V33_EVIDENCE_SHA256);
  const expectedDoc = checkedBytes(V33_DOC, V33_DOC_SHA256);
  for (const name of CASES) checkedBytes(join(V33_PACKETS, `${name}.json`), V33_PACKET_HASHES[name]);
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v34-v33-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v33.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v33.json")).equals(expectedEvidence)) fail("v33 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v33.md")).equals(expectedDoc)) fail("v33 report does not regenerate byte-for-byte");
}

type FrozenV33Row = {
  sourceStateDigest: string;
  thirdTrackFlags: number;
  contiguousPrefixThroughThirdTrackExistDecisionSourceCycles: number;
};

function frozenV33SelectedRows(frozenV33: unknown): FrozenV33Row[] {
  if (
    !isRecord(frozenV33) || frozenV33.schema !== "factory-m4a-note-body-cgb4-evidence/v33" ||
    frozenV33.oracleProfile !== "battle-scene-off" || frozenV33.addressFree !== true || !Array.isArray(frozenV33.rows)
  ) fail("frozen v33 evidence identity changed");
  const rows = frozenV33.rows.map((row, index) => {
    const expected = [
      "sourceStateDigest", "thirdTrackFlags", "thirdTrackExistDecision",
      "postV32ThirdTrackExistDecisionSourceCycles", "contiguousPrefixThroughThirdTrackExistDecisionSourceCycles",
      "beqTakenControlTransferRefills", "stopsBeforeV33Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail(`frozen v33 row ${index} carries an unsupported field`);
    const result: FrozenV33Row = {
      sourceStateDigest: requireDigest(row.sourceStateDigest, `frozen v33 row ${index} digest`),
      thirdTrackFlags: requireU8(row.thirdTrackFlags, `frozen v33 row ${index} thirdTrackFlags`),
      contiguousPrefixThroughThirdTrackExistDecisionSourceCycles: row.contiguousPrefixThroughThirdTrackExistDecisionSourceCycles as number,
    };
    if (
      result.thirdTrackFlags !== 0x80 ||
      row.thirdTrackExistDecision !== "MPT_FLG_EXIST-set-beq-not-taken" ||
      row.postV32ThirdTrackExistDecisionSourceCycles !== 8 ||
      result.contiguousPrefixThroughThirdTrackExistDecisionSourceCycles !== 888 ||
      row.beqTakenControlTransferRefills !== 0 ||
      row.stopsBeforeV33Instruction !== "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG"
    ) fail(`frozen v33 row ${index} boundary changed`);
    return result;
  });
  const digests = rows.map((row) => row.sourceStateDigest);
  if (rows.length !== 3 || new Set(digests).size !== rows.length) fail("frozen v33 source-state join is missing, duplicate, ambiguous, or extra");
  return rows;
}

function productionContainment(): boolean {
  const fragments = [
    "factory-m4a-note-body-cgb4-evidence-v31", "issue55-m4a-note-body-cgb4-v31", "factory-m4a-note-body-cgb4-v31",
    "factory-m4a-note-body-cgb4-evidence-v32", "issue55-m4a-note-body-cgb4-v32", "factory-m4a-note-body-cgb4-v32",
    "factory-m4a-note-body-cgb4-evidence-v33", "issue55-m4a-note-body-cgb4-v33", "factory-m4a-note-body-cgb4-v33",
    "factory-m4a-note-body-cgb4-evidence-v34", "issue55-m4a-note-body-cgb4-v34", "factory-m4a-note-body-cgb4-v34",
  ];
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  const hits = visit(join(ROOT, "src")).filter((path) => fragments.some((fragment) => readFileSync(path, "utf8").includes(fragment)));
  if (hits.length !== 0) fail(`production imports frozen evidence or packets: ${hits.join(", ")}`);
  return true;
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV33 = checkedJson(V33_EVIDENCE, V33_EVIDENCE_SHA256);
  assertV33Frozen();
  const frozenRows = frozenV33SelectedRows(frozenV33);
  const rows = frozenRows.map((prior) => {
    const timing = reduceCgb4ThirdTrackVolPitchTiming({ thirdTrackFlags: prior.thirdTrackFlags });
    if (!timing) fail("frozen v33 thirdTrackFlags scalar is malformed");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      thirdTrackVolPitchMaskDecision: timing.route,
      postV33ThirdTrackVolPitchDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles:
        prior.contiguousPrefixThroughThirdTrackExistDecisionSourceCycles + timing.sourceCycles,
      beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
      stopsBeforeV34Instruction: timing.stopsBeforeInstruction,
    };
  });
  const maskClearRows = rows.filter((row) => row.thirdTrackVolPitchMaskDecision === "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken");
  const maskNonzeroRows = rows.filter((row) => row.thirdTrackVolPitchMaskDecision === "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken");
  const added = rows.reduce((sum, row) => sum + row.postV33ThirdTrackVolPitchDecisionSourceCycles, 0);
  const contiguous = 5980 + added;
  if (
    rows.length !== 3 || maskClearRows.length !== 3 || maskNonzeroRows.length !== 0 || added !== 36 || contiguous !== 6016 ||
    !rows.every((row) =>
      row.postV33ThirdTrackVolPitchDecisionSourceCycles === 12 &&
      row.contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles === 900 &&
      row.beqTakenControlTransferRefills === 1 &&
      row.stopsBeforeV34Instruction === "_081DDA62: subs r2, 0x1",
    )
  ) fail("v33 frozen flags or source-only third-track volume/pitch pricing changed; refuse to fit a different route");

  const noProductionImports = productionContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v34",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV33EvidenceSha256: V33_EVIDENCE_SHA256,
      acceptedV33DocSha256: V33_DOC_SHA256,
      acceptedV33PacketSha256: V33_PACKET_HASHES,
      v33EvidenceAndReportRegenerateByteForByte: true,
      v33EvidenceReportAndPacketsRetainedByteForByte: true,
      v34RuntimeCaptureCount: 0,
    },
    capture: {
      boundary: "source-only third-track _081DD9D0 volume/pitch-mask decision through beq; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "track pointer", "runtime address", "track count", "track index", "track identity",
        "channel", "frame", "duration", "condition flags", "wider state", "thirdTrackFlags serialization",
        "selected _081DDA62 decrement/exit body", "alternate nonselected mov r9, r2 body", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV33SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v33-selected-row",
        "unsupported-runtime-field", "unexpected-frozen-v33-flags", "unexpected-observed-route",
      ],
    },
    coverage: {
      frozenV33SelectedRows: 3,
      sourceOnlyVolPitchDecisionRows: 3,
      frozenThirdTrackFlagsValues: [0x80],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: maskClearRows.length,
      volPitchMaskNonzeroRows: maskNonzeroRows.length,
      postV33ThirdTrackVolPitchDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughThirdTrackExistDecisionSourceCycles: 5980,
      contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: 9,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      failClosedUnobservedVolPitchMaskNonzeroSourceCycles: 6,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV33ArtifactsReadOnly: true,
      v33PacketsRetainedReadOnly: true,
      frozenV33ArtifactsAreNotProductionImports: noProductionImports,
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
    verdict: "Source-only v34 freezes v33 evidence, report, and all three packets byte-for-byte, then derives each decision only from its frozen thirdTrackFlags value. Every frozen value is 0x80; source-defined MPT_FLG_VOLCHG|MPT_FLG_PITCHG is 0x0f, so each mask test is clear and takes beq _081DDA62. Source/ELF/exact-ROM price movs; tst; taken beq at twelve cycles per row, advancing the aggregate prefix from 5980 to 6016 and stopping before _081DDA62: subs r2, 0x1. The mask-nonzero route is source-priced at six cycles but is fail-closed and not claimed observed.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  return [
    "# Issue #55 — CGB4 third-track volume/pitch-mask decision v34",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v34.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, and source-only. v34 freezes v33 evidence, report, and all three address-free packets byte-for-byte, verifies the predecessor regenerates byte-for-byte, and joins only its same three selected `sourceStateDigest` rows. It performs no oracle capture and accepts no new runtime scalar or packet field.",
    "",
    "Frozen v33 proves every selected `thirdTrackFlags` value is `0x80`. Pinned source defines `MPT_FLG_VOLCHG = 0x03` and `MPT_FLG_PITCHG = 0x0c`, so the exact `0x0f` mask is clear for every frozen row. v34 derives the result directly from each frozen scalar and does not serialize that predecessor scalar again.",
    "",
    "Source/ELF/exact-ROM close exactly `_081DD9D0..0x082dfc0e`: `movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62` (the commutative `tst r0, r1` predicate), exact bytes `0f 21 01 42 45 d0`. The selected branch lands at `_081DDA62: subs r2, 0x1`; v34 stops before that decrement/exit body. This slice executes no data access: **0** memory accesses and **0** data-access premium.",
    "",
    "The observed clear-mask route executes three Thumb halfwords at **2** cycles each and takes the `beq`, adding one **6-cycle** pipeline refill: **3×2 + 6 = 12 cycles per row**. The unobserved mask-nonzero route is source-priced fail-closed at **3×2 = 6 cycles**, stops before `mov r9, r2`, and is not claimed observed.",
    "",
    "| frozen selected sourceStateDigest rows | frozen flags | mask | observed route | cycles per row | aggregate cycles |",
    "| ---: | ---: | ---: | --- | ---: | ---: |",
    "| 3 | 0x80 | 0x0f clear | `beq _081DDA62` taken | 12 | 36 |",
    "",
    `The aggregate source prefix advances from **5,980** to **${coverage.contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles} cycles**. Track pointer/address/count/index/identity/channel/frame/duration/condition flags, wider/decrement/alternate bodies, broader MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.`,
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v34.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v34.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v34.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
