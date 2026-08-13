import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const V37_EVIDENCE_SHA256 = "59c5f83c2e70f21cb96076fd04e0b3d4829c8d50e3f2988e437063eabc36861c";
const V37_DOC_SHA256 = "5cf3314ae5beb43203e81e59970235141862dda3fff4d314d01f9e6ca5aec601";
const V37_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "4dad511aee6b508723c2ddd5ca283756ca17435c23388ecf374273bbcf86a8c4",
  liliana: "8afcc0bad8bd77c9ae28d442a9a496101af1321c4b71e54b5bb49160197d7a9d",
  "factory-varied": "6f202501970fd31eddb94f489d2e3360fde3ec78d90df6ab4cbdba64f5d81e67",
};
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "8f6cc54a0a1866eaa559291e5fcc4103996f67168b30353a0eb15f44ed9c3fd4";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V37_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v37.json");
const V37_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v37.md");
const V37_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v37");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v38.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v38.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc08;
const BODY_END = 0x082d_fc0e;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v38: ${message}`);
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

export type Cgb4FourthTrackVolPitchTiming = Readonly<{
  route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" | "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken";
  fourthTrackFlags: number;
  volPitchMask: 0x0f;
  sequentialThumbHalfwords: 3;
  memoryAccesses: 0;
  dataAccessPremiumCycles: 0;
  beqTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 6 | 12;
  stopsBeforeInstruction: "_081DDA62: subs r2, 0x1" | "mov r9, r2";
}>;

/** Price only the fourth-loop `_081DD9D0` volume/pitch-mask decision. */
export function reduceCgb4FourthTrackVolPitchTiming(state: unknown): Cgb4FourthTrackVolPitchTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["fourthTrackFlags"])) return null;
  let fourthTrackFlags: number;
  try {
    fourthTrackFlags = requireU8(state.fourthTrackFlags, "fourthTrackFlags");
  } catch {
    return null;
  }
  const volPitchMask = 0x0f as const;
  const maskNonzero = (fourthTrackFlags & volPitchMask) !== 0;
  return Object.freeze(maskNonzero ? {
    route: "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken",
    fourthTrackFlags,
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
    fourthTrackFlags,
    volPitchMask,
    sequentialThumbHalfwords: 3,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 12,
    stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
  }) as Cgb4FourthTrackVolPitchTiming;
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
  ) fail("fourth-track volume/pitch decision, mask, or selected stop changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x0f, 0x21, 0x01, 0x42, 0x45, 0xd0]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled fourth-track volume/pitch decision changed");
  const beq = body.readUInt16LE(4);
  const signedImm8 = (beq & 0x80) === 0 ? beq & 0xff : (beq & 0xff) - 0x100;
  const decodedTarget = BODY_START + 8 + signedImm8 * 2;
  if ((beq & 0xff00) !== 0xd000 || decodedTarget !== 0x082d_fc9a) fail("compiled fourth-track beq target changed");

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

function assertV37Frozen(): void {
  const expectedEvidence = checkedBytes(V37_EVIDENCE, V37_EVIDENCE_SHA256);
  const expectedDoc = checkedBytes(V37_DOC, V37_DOC_SHA256);
  for (const name of CASES) checkedBytes(join(V37_PACKETS, `${name}.json`), V37_PACKET_HASHES[name]);
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v38-v37-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v37.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v37.json")).equals(expectedEvidence)) fail("v37 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v37.md")).equals(expectedDoc)) fail("v37 report does not regenerate byte-for-byte");
}

type FrozenV37Row = {
  sourceStateDigest: string;
  fourthTrackFlags: number;
  contiguousPrefixThroughFourthTrackExistDecisionSourceCycles: number;
};

function frozenV37SelectedRows(frozenV37: unknown): FrozenV37Row[] {
  if (
    !isRecord(frozenV37) || frozenV37.schema !== "factory-m4a-note-body-cgb4-evidence/v37" ||
    frozenV37.oracleProfile !== "battle-scene-off" || frozenV37.addressFree !== true || !Array.isArray(frozenV37.rows)
  ) fail("frozen v37 evidence identity changed");
  const rows = frozenV37.rows.map((row, index) => {
    const expected = [
      "sourceStateDigest", "fourthTrackFlags", "fourthTrackExistDecision",
      "postV36FourthTrackExistDecisionSourceCycles", "contiguousPrefixThroughFourthTrackExistDecisionSourceCycles",
      "beqTakenControlTransferRefills", "stopsBeforeV37Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail(`frozen v37 row ${index} carries an unsupported field`);
    const result: FrozenV37Row = {
      sourceStateDigest: requireDigest(row.sourceStateDigest, `frozen v37 row ${index} digest`),
      fourthTrackFlags: requireU8(row.fourthTrackFlags, `frozen v37 row ${index} fourthTrackFlags`),
      contiguousPrefixThroughFourthTrackExistDecisionSourceCycles: row.contiguousPrefixThroughFourthTrackExistDecisionSourceCycles as number,
    };
    if (
      result.fourthTrackFlags !== 0x80 ||
      row.fourthTrackExistDecision !== "MPT_FLG_EXIST-set-beq-not-taken" ||
      row.postV36FourthTrackExistDecisionSourceCycles !== 8 ||
      result.contiguousPrefixThroughFourthTrackExistDecisionSourceCycles !== 924 ||
      row.beqTakenControlTransferRefills !== 0 ||
      row.stopsBeforeV37Instruction !== "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG"
    ) fail(`frozen v37 row ${index} boundary changed`);
    return result;
  });
  if (
    rows.length !== SELECTED_DIGESTS.length ||
    !rows.every((row, index) => row.sourceStateDigest === SELECTED_DIGESTS[index])
  ) fail("frozen v37 source-state join is missing, reordered, duplicate, ambiguous, or extra");
  return rows;
}

function productionContainment(): boolean {
  const fragments = [
    "factory-m4a-note-body-cgb4-evidence-v36", "issue55-m4a-note-body-cgb4-v36", "factory-m4a-note-body-cgb4-v36",
    "factory-m4a-note-body-cgb4-evidence-v37", "issue55-m4a-note-body-cgb4-v37", "factory-m4a-note-body-cgb4-v37",
    "factory-m4a-note-body-cgb4-evidence-v38", "issue55-m4a-note-body-cgb4-v38", "factory-m4a-note-body-cgb4-v38",
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
  const frozenV37 = checkedJson(V37_EVIDENCE, V37_EVIDENCE_SHA256);
  assertV37Frozen();
  const frozenRows = frozenV37SelectedRows(frozenV37);
  const rows = frozenRows.map((prior) => {
    const timing = reduceCgb4FourthTrackVolPitchTiming({ fourthTrackFlags: prior.fourthTrackFlags });
    if (!timing) fail("frozen v37 fourthTrackFlags scalar is malformed");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      fourthTrackVolPitchMaskDecision: timing.route,
      postV37FourthTrackVolPitchDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles:
        prior.contiguousPrefixThroughFourthTrackExistDecisionSourceCycles + timing.sourceCycles,
      beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
      stopsBeforeV38Instruction: timing.stopsBeforeInstruction,
    };
  });
  const maskClearRows = rows.filter((row) => row.fourthTrackVolPitchMaskDecision === "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken");
  const maskNonzeroRows = rows.filter((row) => row.fourthTrackVolPitchMaskDecision === "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken");
  const added = rows.reduce((sum, row) => sum + row.postV37FourthTrackVolPitchDecisionSourceCycles, 0);
  const contiguous = 6088 + added;
  if (
    rows.length !== 3 || maskClearRows.length !== 3 || maskNonzeroRows.length !== 0 || added !== 36 || contiguous !== 6124 ||
    !rows.every((row) =>
      row.postV37FourthTrackVolPitchDecisionSourceCycles === 12 &&
      row.contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles === 936 &&
      row.beqTakenControlTransferRefills === 1 &&
      row.stopsBeforeV38Instruction === "_081DDA62: subs r2, 0x1",
    )
  ) fail("v37 frozen flags or source-only fourth-track volume/pitch pricing changed; refuse to fit a different route");

  const noProductionImports = productionContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v38",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV37EvidenceSha256: V37_EVIDENCE_SHA256,
      acceptedV37DocSha256: V37_DOC_SHA256,
      acceptedV37PacketSha256: V37_PACKET_HASHES,
      v37EvidenceAndReportRegenerateByteForByte: true,
      v37EvidenceReportAndPacketsRetainedByteForByte: true,
      v37FreshSerialRunsPerCase: 2,
      v38RuntimeCaptureCount: 0,
    },
    capture: {
      boundary: "source-only fourth-track _081DD9D0 volume/pitch-mask decision through beq; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "track pointer", "runtime address", "track count", "track index", "track identity",
        "trainer", "battle index", "canonical tick", "receipt schedule", "unrelated future state", "channel", "frame", "duration",
        "condition flags", "wider state", "fourthTrackFlags serialization", "selected _081DDA62 decrement/exit body",
        "alternate nonselected mov r9, r2 body", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV37SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v37-selected-row",
        "unsupported-runtime-field", "unexpected-frozen-v37-flags", "unexpected-observed-route",
      ],
    },
    coverage: {
      frozenV37SelectedRows: 3,
      sourceOnlyVolPitchDecisionRows: 3,
      frozenFourthTrackFlagsValues: [0x80],
      volPitchMask: "0x0f",
      volPitchMaskClearRows: maskClearRows.length,
      volPitchMaskNonzeroRows: maskNonzeroRows.length,
      postV37FourthTrackVolPitchDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughFourthTrackExistDecisionSourceCycles: 6088,
      contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles: contiguous,
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
      frozenV37ArtifactsReadOnly: true,
      v37PacketsRetainedReadOnly: true,
      frozenV37ArtifactsAreNotProductionImports: noProductionImports,
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
    verdict: "Source-only v38 freezes v37 evidence, report, and all three fresh Battle Scene OFF packets byte-for-byte, then derives each decision only from its frozen fourthTrackFlags value. Every frozen value is 0x80; source-defined MPT_FLG_VOLCHG|MPT_FLG_PITCHG is 0x0f, so each mask test is clear and takes beq _081DDA62. Source/ELF/exact-ROM price movs; tst; taken beq at twelve cycles per row, advancing the aggregate prefix from 6088 to 6124 and stopping before _081DDA62: subs r2, 0x1. The mask-nonzero route is source-priced at six cycles but is fail-closed and not claimed observed. No live construction-clock wiring or fitted residual is claimed.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  return [
    "# Issue #55 — CGB4 fourth-track volume/pitch-mask decision v38",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v38.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, and source-only. v38 freezes v37 evidence, report, and all three fresh address-free packets byte-for-byte, verifies the predecessor regenerates byte-for-byte, and joins only its same three selected `sourceStateDigest` rows. It performs no oracle capture and accepts no new runtime scalar or packet field.",
    "",
    "Frozen v37 proves every selected `fourthTrackFlags` value is `0x80`. Pinned source defines `MPT_FLG_VOLCHG = 0x03` and `MPT_FLG_PITCHG = 0x0c`, so the exact `0x0f` mask is clear for every frozen row. v38 derives the result directly from each frozen scalar and does not serialize that predecessor scalar again.",
    "",
    "Source/ELF/exact-ROM close exactly `_081DD9D0..0x082dfc0e`: `movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG; tst r1, r0; beq _081DDA62` (the commutative `tst r0, r1` predicate), exact bytes `0f 21 01 42 45 d0`. The selected branch lands at `_081DDA62: subs r2, 0x1`; v38 stops before that decrement/exit body. This slice executes no data access: **0** memory accesses and **0** data-access premium.",
    "",
    "The observed clear-mask route executes three Thumb halfwords at **2** cycles each and takes the `beq`, adding one **6-cycle** pipeline refill: **3×2 + 6 = 12 cycles per row**. The unobserved mask-nonzero route is source-priced fail-closed at **3×2 = 6 cycles**, stops before `mov r9, r2`, and is not claimed observed.",
    "",
    "| frozen selected sourceStateDigest rows | frozen flags | mask | observed route | cycles per row | aggregate cycles |",
    "| ---: | ---: | ---: | --- | ---: | ---: |",
    "| 3 | 0x80 | 0x0f clear | `beq _081DDA62` taken | 12 | 36 |",
    "",
    `The aggregate source prefix advances from **6,088** to **${coverage.contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles} cycles**. Trainer, battle index, canonical tick, receipt schedule, unrelated future state, track pointer/address/count/index/identity/channel/frame/duration/condition flags, wider/decrement/alternate bodies, broader MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.`,
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v38.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v38.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v38.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
