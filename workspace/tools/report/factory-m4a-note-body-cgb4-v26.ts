import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const V25_EVIDENCE_SHA256 = "26a2f0c9dfb5442f95c5813cf0f359c3e01ca389ad3f415118b480889a0900ab";
const V25_DOC_SHA256 = "4bd41b232aa24ec2b309aaac30bf07573abf73a614c62d44843a0fca603282bf";
const V25_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "3ac4e4a8797b7e459c15019e7f847dce592643f604cdc437e74074dfc8d6d1a7",
  liliana: "ce74203999ee3d5492f060ef879483403002c06ab501776e7063b0fa1421d4da",
  "factory-varied": "bd289cb97eaafe49b63ce41c9b1546037b899394d7cdaf25998efcc6427646b5",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V25_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v25.json");
const V25_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v25.md");
const V25_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v25");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v26.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v26.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc08;
const BODY_END = 0x082d_fc0e;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v26: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function checkedBytes(path: string, hash: string): Buffer {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(`${path} changed`);
  return bytes;
}

function checkedJson<T>(path: string, hash: string): T {
  return JSON.parse(checkedBytes(path, hash).toString("utf8")) as T;
}

function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} must be a SHA-256 digest`);
  return value;
}

function requireU8(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 0xff) {
    fail(`${label} must be an unsigned 8-bit scalar`);
  }
  return value;
}

export type Cgb4FirstTrackVolPitchTiming = Readonly<{
  route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" | "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken";
  firstTrackFlags: number;
  volPitchMask: 0x0f;
  sequentialThumbHalfwords: 3;
  memoryAccesses: 0;
  dataAccessPremiumCycles: 0;
  beqTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 6 | 12;
  stopsBeforeInstruction: "_081DDA62: first instruction" | "mov r9, r2";
}>;

/**
 * Price only `_081DD9D0`'s volume/pitch-mask decision from the already frozen
 * v25 flags byte. This accepts no pointer, identity, channel, or later-body
 * state and makes the unobserved nonzero route explicit but unusable as
 * observed coverage without a different frozen predecessor.
 */
export function reduceCgb4FirstTrackVolPitchTiming(state: unknown): Cgb4FirstTrackVolPitchTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["firstTrackFlags"])) return null;
  let firstTrackFlags: number;
  try {
    firstTrackFlags = requireU8(state.firstTrackFlags, "firstTrackFlags");
  } catch {
    return null;
  }
  const volPitchMask = 0x0f as const;
  const maskNonzero = (firstTrackFlags & volPitchMask) !== 0;
  return Object.freeze(maskNonzero ? {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
    firstTrackFlags,
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
    firstTrackFlags,
    volPitchMask,
    sequentialThumbHalfwords: 3,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 12,
    stopsBeforeInstruction: "_081DDA62: first instruction",
  } as Cgb4FirstTrackVolPitchTiming);
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

  const boundedRoute = [
    "\tbeq _081DDA62",
    "\tmovs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    "\ttst r1, r0",
    "\tbeq _081DDA62",
    "\tmov r9, r2",
  ].join("\n");
  if (
    !assembly.includes(boundedRoute) ||
    !internal.includes("#define MPT_FLG_VOLCHG 0x03") ||
    !internal.includes("#define MPT_FLG_PITCHG 0x0C")
  ) fail("bounded volume/pitch-mask route or source mask changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x0f, 0x21, 0x01, 0x42, 0x45, 0xd0]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled volume/pitch-mask decision changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62"]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1368-1371", sha256: sha256(assembly) },
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
      nextSequentialInstruction: "0x082dfc0e",
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62",
      start: "0x082dfc08",
      endExclusive: "0x082dfc0e",
      bytes: body.length,
      bytesHex: "0f 21 01 42 45 d0",
      sha256: BODY_SHA256,
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

function assertV25ArtifactsAndReportRegenerate(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v26-v25-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v25.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v25.json")).equals(
    checkedBytes(V25_EVIDENCE, V25_EVIDENCE_SHA256),
  )) fail("v25 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v25.md")).equals(
    checkedBytes(V25_DOC, V25_DOC_SHA256),
  )) fail("v25 report does not regenerate byte-for-byte");
  for (const [name, hash] of Object.entries(V25_PACKET_HASHES) as Array<[CaseName, string]>) {
    checkedBytes(join(V25_PACKETS, `${name}.json`), hash);
  }
}

type FrozenV25Row = {
  sourceStateDigest: string;
  firstTrackFlags: number;
  firstTrackExistDecision: string;
  postV24FirstTrackExistDecisionSourceCycles: number;
  contiguousPrefixThroughFirstTrackExistDecisionSourceCycles: number;
  beqTakenControlTransferRefills: number;
  stopsBeforeV25Instruction: string;
};

function frozenV25SelectedRows(frozenV25: unknown): FrozenV25Row[] {
  if (
    !isRecord(frozenV25) || frozenV25.schema !== "factory-m4a-note-body-cgb4-evidence/v25" ||
    frozenV25.oracleProfile !== "battle-scene-off" || frozenV25.addressFree !== true || !Array.isArray(frozenV25.rows)
  ) fail("frozen v25 evidence identity changed");
  const rows = frozenV25.rows.map((row, index) => {
    if (!isRecord(row) || !exactKeys(row, [
      "sourceStateDigest",
      "firstTrackFlags",
      "firstTrackExistDecision",
      "postV24FirstTrackExistDecisionSourceCycles",
      "contiguousPrefixThroughFirstTrackExistDecisionSourceCycles",
      "beqTakenControlTransferRefills",
      "stopsBeforeV25Instruction",
    ])) fail(`frozen v25 row ${index} carries an unsupported field`);
    const result: FrozenV25Row = {
      sourceStateDigest: requireDigest(row.sourceStateDigest, `frozen v25 row ${index} digest`),
      firstTrackFlags: requireU8(row.firstTrackFlags, `frozen v25 row ${index} firstTrackFlags`),
      firstTrackExistDecision: row.firstTrackExistDecision as string,
      postV24FirstTrackExistDecisionSourceCycles: row.postV24FirstTrackExistDecisionSourceCycles as number,
      contiguousPrefixThroughFirstTrackExistDecisionSourceCycles: row.contiguousPrefixThroughFirstTrackExistDecisionSourceCycles as number,
      beqTakenControlTransferRefills: row.beqTakenControlTransferRefills as number,
      stopsBeforeV25Instruction: row.stopsBeforeV25Instruction as string,
    };
    if (
      result.firstTrackFlags !== 0x80 ||
      result.firstTrackExistDecision !== "MPT_FLG_EXIST-set-beq-not-taken" ||
      result.postV24FirstTrackExistDecisionSourceCycles !== 8 ||
      result.contiguousPrefixThroughFirstTrackExistDecisionSourceCycles !== 816 ||
      result.beqTakenControlTransferRefills !== 0 ||
      result.stopsBeforeV25Instruction !== "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG"
    ) fail(`frozen v25 row ${index} no longer proves the observed mask-clear route`);
    return result;
  });
  const digests = rows.map((row) => row.sourceStateDigest);
  if (rows.length !== 3 || new Set(digests).size !== rows.length) {
    fail("frozen v25 source-state join is missing, duplicate, ambiguous, or extra");
  }
  return rows;
}

function productionReceiptContainment(): boolean {
  const forbiddenFragments = [
    "factory-m4a-note-body-cgb4-evidence-v23", "issue55-m4a-note-body-cgb4-v23", "factory-m4a-note-body-cgb4-v23",
    "factory-m4a-note-body-cgb4-evidence-v24", "issue55-m4a-note-body-cgb4-v24", "factory-m4a-note-body-cgb4-v24",
    "factory-m4a-note-body-cgb4-evidence-v25", "issue55-m4a-note-body-cgb4-v25", "factory-m4a-note-body-cgb4-v25",
    "factory-m4a-note-body-cgb4-evidence-v26", "issue55-m4a-note-body-cgb4-v26", "factory-m4a-note-body-cgb4-v26",
  ];
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  const hits = visit(join(ROOT, "src")).filter((path) => {
    const text = readFileSync(path, "utf8");
    return forbiddenFragments.some((fragment) => text.includes(fragment));
  });
  if (hits.length !== 0) fail(`production imports frozen evidence or packets: ${hits.join(", ")}`);
  return true;
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV25 = checkedJson<unknown>(V25_EVIDENCE, V25_EVIDENCE_SHA256);
  assertV25ArtifactsAndReportRegenerate();
  const frozenRows = frozenV25SelectedRows(frozenV25);
  const rows = frozenRows.map((prior) => {
    const timing = reduceCgb4FirstTrackVolPitchTiming({ firstTrackFlags: prior.firstTrackFlags });
    if (!timing) fail("frozen v25 flags scalar is malformed");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      volPitchMaskDecision: timing.route,
      postV25FirstTrackVolPitchDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles:
        prior.contiguousPrefixThroughFirstTrackExistDecisionSourceCycles + timing.sourceCycles,
      beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
      stopsBeforeV26Instruction: timing.stopsBeforeInstruction,
    };
  });
  const maskClearRows = rows.filter((row) => row.volPitchMaskDecision === "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken");
  const maskNonzeroRows = rows.filter((row) => row.volPitchMaskDecision === "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken");
  const added = rows.reduce((sum, row) => sum + row.postV25FirstTrackVolPitchDecisionSourceCycles, 0);
  const contiguous = 5764 + added;
  if (
    rows.length !== 3 || maskClearRows.length !== 3 || maskNonzeroRows.length !== 0 || added !== 36 || contiguous !== 5800 ||
    !rows.every((row) =>
      row.postV25FirstTrackVolPitchDecisionSourceCycles === 12 &&
      row.contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles === 828 &&
      row.beqTakenControlTransferRefills === 1 &&
      row.stopsBeforeV26Instruction === "_081DDA62: first instruction",
    )
  ) fail("v25 frozen flags or source-only volume/pitch pricing changed; refuse to fit a different route");

  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v26",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV25EvidenceSha256: V25_EVIDENCE_SHA256,
      acceptedV25DocSha256: V25_DOC_SHA256,
      acceptedV25PacketSha256: V25_PACKET_HASHES,
      v25EvidenceAndReportRegenerateByteForByte: true,
      v25EvidenceReportAndPacketsRetainedByteForByte: true,
    },
    capture: {
      boundary: "source-only _081DD9D0 volume/pitch-mask decision through beq; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "track pointer", "runtime address", "track count", "track index", "track identity",
        "channel", "frame", "duration", "condition flags", "wider state", "firstTrackFlags serialization",
        "mov r9, r2 and later body", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV25SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v25-selected-row",
        "unsupported-runtime-field", "unexpected-frozen-v25-flags", "unexpected-observed-route",
      ],
    },
    coverage: {
      frozenV25SelectedRows: 3,
      sourceOnlyVolPitchDecisionRows: 3,
      frozenFirstTrackFlagsValues: [0x80],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: maskClearRows.length,
      volPitchMaskNonzeroRows: maskNonzeroRows.length,
      postV25FirstTrackVolPitchDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughFirstTrackExistDecisionSourceCycles: 5764,
      contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles: contiguous,
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
      frozenV25ArtifactsReadOnly: true,
      frozenV25ArtifactsAreNotProductionImports: noProductionImports,
      v25PacketsAreNotProductionImports: noProductionImports,
      v26RuntimeCaptureCount: 0,
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
      firstTrackFlags: null,
      laterBody: null,
      serviceCost: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Source-only v26 freezes v25 evidence, report, and all three packets byte-for-byte, then joins only the same three sourceStateDigest rows. Frozen firstTrackFlags is 0x80 for every row; source-defined MPT_FLG_VOLCHG|MPT_FLG_PITCHG is 0x0f, so each observed mask test is clear and takes beq _081DDA62. Source/ELF/exact-ROM price movs; tst; taken beq at twelve cycles per row, advancing the aggregate prefix from 5764 to 5800 and stopping before _081DDA62's first instruction. The mask-nonzero route is source-priced at six cycles but is fail-closed and not claimed observed.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 first-track volume/pitch-mask decision v26",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v26.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, and source-only. v26 freezes v25 evidence, report, and all three address-free packets byte-for-byte, verifies the predecessor regenerates byte-for-byte, and joins only its same three selected `sourceStateDigest` rows. It performs no oracle capture and accepts no new runtime scalar or packet field.",
    "",
    "Frozen v25 proves every selected `firstTrackFlags` value is `0x80`. Pinned source defines `MPT_FLG_VOLCHG = 0x03` and `MPT_FLG_PITCHG = 0x0c`, so the exact `0x0f` mask is clear for every frozen row. v26 does not serialize that predecessor scalar again; it retains only the established digest join.",
    "",
    "Source/ELF/exact-ROM close exactly `_081DD9D0..0x082dfc0e`: `movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62`. Exact ROM bytes are `0f 21 01 42 45 d0`; the containing ELF entry is `_081DD9C8` and its taken successor is `_081DDA62` at `0x082dfc9a`. This slice executes no data access: **0** memory accesses and **0** data-access premium.",
    "",
    "The observed clear-mask route executes three Thumb halfwords at **2** cycles each and takes the `beq`, adding one **6-cycle** pipeline refill: **3×2 + 6 = 12 cycles per row**. It stops before `_081DDA62`'s first instruction. The unobserved mask-nonzero route is source-priced fail-closed at **3×2 = 6 cycles**, stops before `mov r9, r2`, and is not claimed observed.",
    "",
    "| frozen selected sourceStateDigest rows | frozen flags | mask | observed route | cycles per row | aggregate cycles |",
    "| ---: | ---: | ---: | --- | ---: | ---: |",
    "| 3 | 0x80 | 0x0f clear | `beq _081DDA62` taken | 12 | 36 |",
    "",
    `The aggregate source prefix advances from **5,764** to **${c.contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles} cycles**. Actual track identity/count/pointer/address/channel, later body, all broader MPlay/controller/presentation fields, service/arbitration, and construction-clock wiring remain null. Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.`,
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v26.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v26.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v26.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
