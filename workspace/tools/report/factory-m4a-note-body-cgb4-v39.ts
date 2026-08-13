import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V38_EVIDENCE_SHA256 = "374076dfde52abfb519edd9e121c851ea55cd1f1ac13bf4675613f2e26d0b8ce";
const V38_DOC_SHA256 = "420b7b300d44302213b6c7ffe48f3ee2a5d63c8d3c8a3ede741839e56d266090";
const V37_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "4dad511aee6b508723c2ddd5ca283756ca17435c23388ecf374273bbcf86a8c4",
  liliana: "8afcc0bad8bd77c9ae28d442a9a496101af1321c4b71e54b5bb49160197d7a9d",
  "factory-varied": "6f202501970fd31eddb94f489d2e3360fde3ec78d90df6ab4cbdba64f5d81e67",
};
const V39_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "317c223e01b3907b2016af6e5c4294db06d0f53872fcbdf38d7086bf25244ceb",
  liliana: "496c24229d1e9a542f3763cd26cb0959d0c6320d431b1453e0bb72988f790c74",
  "factory-varied": "68c43a7e757d47f32a383d3d09c03c33f8a92dd82a51b4fdfef8f861f880b343",
};
const V39_PACKET_REPEAT_HASHES: Record<CaseName, string> = {
  anchor: "317c223e01b3907b2016af6e5c4294db06d0f53872fcbdf38d7086bf25244ceb",
  liliana: "496c24229d1e9a542f3763cd26cb0959d0c6320d431b1453e0bb72988f790c74",
  "factory-varied": "68c43a7e757d47f32a383d3d09c03c33f8a92dd82a51b4fdfef8f861f880b343",
};
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "a70595d17cb12da032e89ea67903bf3fe0b222c4c87bd2375a1c6eef2aa5791a";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V38_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v38.json");
const V38_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v38.md");
const V37_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v37");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v39");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v39.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v39.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc9a;
const BODY_END = 0x082d_fc9e;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v39: ${message}`);
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

function requireU32(value: unknown, label: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 0xffff_ffff) fail(`${label} must be a u32`);
  return value;
}

export type Cgb4FourthTrackDecrementTiming = Readonly<{
  route: "subs-r2-1; ble-not-taken" | "subs-r2-1; ble-taken";
  r2BeforeDecrement: number;
  sequentialThumbHalfwords: 2;
  memoryAccesses: 0;
  dataAccessPremiumCycles: 0;
  bleTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 4 | 10;
  stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size" | "_081DDA6C: ldr r0, lt2_ID_NUMBER";
}>;

function bleTakenAfterSubs(r2BeforeDecrement: number): boolean {
  const result = (r2BeforeDecrement - 1) >>> 0;
  const negative = (result & 0x8000_0000) !== 0;
  const overflow = ((r2BeforeDecrement ^ 1) & (r2BeforeDecrement ^ result) & 0x8000_0000) !== 0;
  return result === 0 || negative !== overflow;
}

/** Price only the fourth-loop `_081DDA62` decrement/exit decision. */
export function reduceCgb4FourthTrackDecrementTiming(state: unknown): Cgb4FourthTrackDecrementTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["r2BeforeDecrement"])) return null;
  let r2BeforeDecrement: number;
  try {
    r2BeforeDecrement = requireU32(state.r2BeforeDecrement, "r2BeforeDecrement");
  } catch {
    return null;
  }
  const branchTaken = bleTakenAfterSubs(r2BeforeDecrement);
  return Object.freeze(branchTaken ? {
    route: "subs-r2-1; ble-taken",
    r2BeforeDecrement,
    sequentialThumbHalfwords: 2,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    bleTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 10,
    stopsBeforeInstruction: "_081DDA6C: ldr r0, lt2_ID_NUMBER",
  } : {
    route: "subs-r2-1; ble-not-taken",
    r2BeforeDecrement,
    sequentialThumbHalfwords: 2,
    memoryAccesses: 0,
    dataAccessPremiumCycles: 0,
    bleTakenControlTransferRefills: 0,
    takenControlTransferRefills: 0,
    sourceCycles: 4,
    stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size",
  }) as Cgb4FourthTrackDecrementTiming;
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256) fail("source, ELF, or ROM changed");
  const boundedRoute = ["_081DDA62:", "\tsubs r2, 0x1", "\tble _081DDA6C"].join("\n");
  const successors = [
    "\tmovs r0, MusicPlayerTrack_size",
    "\tadds r5, r0",
    "\tbgt _081DD9C8",
    "_081DDA6C:",
    "\tldr r0, lt2_ID_NUMBER",
  ].join("\n");
  if (!assembly.includes(boundedRoute) || !assembly.includes(successors)) fail("fourth-track decrement/exit decision or successor boundaries changed");
  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x01, 0x3a, 0x02, 0xdd]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled fourth-track decrement/branch changed");
  const ble = body.readUInt16LE(2);
  const signedImm8 = (ble & 0x80) === 0 ? ble & 0xff : (ble & 0xff) - 0x100;
  const decodedTarget = BODY_START + 2 + 4 + signedImm8 * 2;
  if ((ble & 0xff00) !== 0xdd00 || decodedTarget !== 0x082d_fcA4) fail("compiled fourth-track ble target changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62", "082dfca4 t _081DDA6C"]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }
  return {
    source: { assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1443-1450", sha256: sha256(assembly) } },
    elf: {
      containingEntry: "0x082dfc00",
      instructionStart: "0x082dfc9a",
      endExclusive: "0x082dfc9e",
      takenSuccessor: "0x082dfca4",
      nextSequentialInstruction: "0x082dfc9e",
      takenSuccessorFirstInstruction: "_081DDA6C: ldr r0, lt2_ID_NUMBER",
      nonTakenSuccessorFirstInstruction: "movs r0, MusicPlayerTrack_size",
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "subs r2, 0x1; ble _081DDA6C",
      start: "0x082dfc9a",
      endExclusive: "0x082dfc9e",
      bytes: body.length,
      bytesHex: "01 3a 02 dd",
      sha256: BODY_SHA256,
      decodedBle: { condition: "LE", target: "_081DDA6C", targetAddress: "0x082dfca4" },
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefillCycles: 6,
      bleNotTakenModel: "subs; non-taken ble = 2 halfwords * 2 + zero refill = 4",
      bleTakenModel: "subs; taken ble = 2 halfwords * 2 + one 6-cycle refill = 10",
    },
  };
}

function assertV38Frozen(): void {
  const expectedEvidence = checkedBytes(V38_EVIDENCE, V38_EVIDENCE_SHA256);
  const expectedDoc = checkedBytes(V38_DOC, V38_DOC_SHA256);
  for (const name of CASES) checkedBytes(join(V37_PACKETS, `${name}.json`), V37_PACKET_HASHES[name]);
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v39-v38-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v38.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v38.json")).equals(expectedEvidence)) fail("v38 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v38.md")).equals(expectedDoc)) fail("v38 report does not regenerate byte-for-byte");
}

type FrozenV38Row = {
  sourceStateDigest: string;
  contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles: number;
};

function frozenV38SelectedRows(frozenV38: unknown): FrozenV38Row[] {
  if (
    !isRecord(frozenV38) || frozenV38.schema !== "factory-m4a-note-body-cgb4-evidence/v38" ||
    frozenV38.oracleProfile !== "battle-scene-off" || frozenV38.addressFree !== true || !Array.isArray(frozenV38.rows)
  ) fail("frozen v38 evidence identity changed");
  const rows = frozenV38.rows.map((row, index) => {
    const expected = [
      "sourceStateDigest", "fourthTrackVolPitchMaskDecision", "postV37FourthTrackVolPitchDecisionSourceCycles",
      "contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles", "beqTakenControlTransferRefills", "stopsBeforeV38Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail(`frozen v38 row ${index} carries an unsupported field`);
    const result: FrozenV38Row = {
      sourceStateDigest: requireDigest(row.sourceStateDigest, `frozen v38 row ${index} digest`),
      contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles:
        row.contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles as number,
    };
    if (
      row.fourthTrackVolPitchMaskDecision !== "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" ||
      row.postV37FourthTrackVolPitchDecisionSourceCycles !== 12 ||
      result.contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles !== 936 ||
      row.beqTakenControlTransferRefills !== 1 ||
      row.stopsBeforeV38Instruction !== "_081DDA62: subs r2, 0x1"
    ) fail(`frozen v38 row ${index} boundary changed`);
    return result;
  });
  if (
    rows.length !== SELECTED_DIGESTS.length ||
    !rows.every((row, index) => row.sourceStateDigest === SELECTED_DIGESTS[index])
  ) fail("frozen v38 source-state join is missing, reordered, duplicate, ambiguous, or extra");
  return rows;
}

function loadPackets(selected: ReadonlySet<string>): Map<string, number> {
  const result = new Map<string, number>();
  for (const name of CASES) {
    const packet = checkedJson(join(PACKETS, `${name}.json`), V39_PACKET_HASHES[name]);
    if (
      !isRecord(packet) ||
      !exactKeys(packet, ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"]) ||
      packet.schema !== "factory-m4a-note-body-cgb4-probe/v39" || packet.case !== name ||
      packet.oracleProfile !== "battle-scene-off" || typeof packet.sourceFunction !== "string" || packet.sourceFunction.length === 0 ||
      packet.joinKey !== "sourceStateDigest" ||
      packet.captureBoundary !== "fourth-track-immediately-before-_081DDA62-subs-r2-0x1" ||
      packet.addressFree !== true || !Array.isArray(packet.observations) || packet.observations.length !== COUNTS[name]
    ) fail(`${name} packet identity changed`);
    if (V39_PACKET_HASHES[name] !== V39_PACKET_REPEAT_HASHES[name]) fail(`${name} packet serial repeat changed`);
    for (const [index, row] of packet.observations.entries()) {
      if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "r2BeforeDecrement"])) fail(`${name} packet row ${index} widened`);
      const key = requireDigest(row.sourceStateDigest, `${name} row ${index}`);
      const scalar = requireU32(row.r2BeforeDecrement, `${name} row ${index} r2 scalar`);
      if (!selected.has(key) || result.has(key)) fail(`${name} packet key mismatched, duplicated, or extra`);
      result.set(key, scalar);
    }
  }
  if (result.size !== selected.size) fail("packets missed or ambiguously joined a v38 row");
  return result;
}

function productionContainment(): boolean {
  const fragments = [
    "factory-m4a-note-body-cgb4-evidence-v37", "issue55-m4a-note-body-cgb4-v37", "factory-m4a-note-body-cgb4-v37",
    "factory-m4a-note-body-cgb4-evidence-v38", "issue55-m4a-note-body-cgb4-v38", "factory-m4a-note-body-cgb4-v38",
    "factory-m4a-note-body-cgb4-evidence-v39", "issue55-m4a-note-body-cgb4-v39", "factory-m4a-note-body-cgb4-v39",
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
  const frozenV38 = checkedJson(V38_EVIDENCE, V38_EVIDENCE_SHA256);
  assertV38Frozen();
  const frozenRows = frozenV38SelectedRows(frozenV38);
  const packetValues = loadPackets(new Set(frozenRows.map((row) => row.sourceStateDigest)));
  const rows = frozenRows.map((prior) => {
    const timing = reduceCgb4FourthTrackDecrementTiming({ r2BeforeDecrement: packetValues.get(prior.sourceStateDigest) });
    if (!timing || timing.r2BeforeDecrement !== 7 || timing.route !== "subs-r2-1; ble-not-taken" || timing.sourceCycles !== 4) {
      fail("observed fourth-track decrement route changed");
    }
    return {
      sourceStateDigest: prior.sourceStateDigest,
      r2BeforeDecrement: timing.r2BeforeDecrement,
      fourthTrackDecrementDecision: timing.route,
      postV38FourthTrackDecrementDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles:
        prior.contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles + timing.sourceCycles,
      bleTakenControlTransferRefills: timing.bleTakenControlTransferRefills,
      stopsBeforeV39Instruction: timing.stopsBeforeInstruction,
    };
  });
  const added = rows.reduce((sum, row) => sum + row.postV38FourthTrackDecrementDecisionSourceCycles, 0);
  const contiguous = 6124 + added;
  if (
    rows.length !== 3 || added !== 12 || contiguous !== 6136 ||
    !rows.every((row) =>
      row.postV38FourthTrackDecrementDecisionSourceCycles === 4 &&
      row.contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles === 940 &&
      row.bleTakenControlTransferRefills === 0 &&
      row.stopsBeforeV39Instruction === "movs r0, MusicPlayerTrack_size",
    )
  ) fail("v38 frozen state or v39 pricing changed; refuse to fit a different route");
  const noProductionImports = productionContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v39",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV38EvidenceSha256: V38_EVIDENCE_SHA256,
      acceptedV38DocSha256: V38_DOC_SHA256,
      acceptedInheritedV37PacketSha256: V37_PACKET_HASHES,
      v38EvidenceAndReportRegenerateByteForByte: true,
      v38EvidenceReportAndInheritedV37PacketsRetainedByteForByte: true,
      v39PacketSha256: V39_PACKET_HASHES,
      v39PacketRepeatSha256: V39_PACKET_REPEAT_HASHES,
      v39PacketRepeatIdentity: true,
      v39FreshSerialRunsPerCase: 2,
    },
    capture: {
      boundary: "fourth-track immediately before _081DDA62: subs r2, 0x1; ble _081DDA6C",
      scalars: ["r2BeforeDecrement"],
      packetObservationExactKeys: ["sourceStateDigest", "r2BeforeDecrement"],
      excluded: [
        "pointer", "address", "runtime address", "track count", "track index", "track identity", "trainer", "battle index",
        "canonical tick", "receipt schedule", "unrelated future state", "channel", "frame", "duration", "condition flags",
        "wider state", "subtraction result serialization", "_081DDA6C exit successor body",
        "movs r0, MusicPlayerTrack_size continuation successor body", "fourth-track flags", "volume/pitch mask", "later loop work",
        "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV38SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v38-selected-row", "packet-key-mismatch",
        "unsupported-packet-field", "source-operand-out-of-range", "unexpected-observed-route",
      ],
    },
    coverage: {
      frozenV38SelectedRows: 3,
      packetRowsByCase: COUNTS,
      r2BeforeDecrementRows: 3,
      r2BeforeDecrementValues: [7],
      bleNotTakenRows: 3,
      bleTakenRows: 0,
      postV38FourthTrackDecrementDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles: 6124,
      contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: 6,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      failClosedSchemaConsistentUnobservedExitSourceCycles: 10,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV38ArtifactsReadOnly: true,
      inheritedV37PacketsRetainedReadOnly: true,
      v39FreshPacketsAddressFree: true,
      v39ArtifactsAreNotProductionImports: noProductionImports,
      v39RuntimeCaptureCount: 3,
      trainer: null,
      battleIndex: null,
      canonicalTick: null,
      receiptSchedule: null,
      unrelatedFutureState: null,
      trackPointer: null,
      pointer: null,
      address: null,
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
      volumePitchMask: null,
      subtractionResult: null,
      continuationBody: null,
      exitBody: null,
      laterLoopWork: null,
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
    verdict: "Fresh twice-byte-stable v39 Battle Scene OFF packets join only v38's three selected sourceStateDigest rows and retain exactly r2BeforeDecrement. All three observed operands are 7, so subs r2, 0x1 leaves positive 6 and ble _081DDA6C is not taken. Source/ELF/exact-ROM price the pair at four cycles per row with no refill, advancing the aggregate prefix from 6124 to 6136 and stopping before both successor bodies. The exit route is source-priced fail-closed at ten cycles and is not claimed observed; no live construction-clock wiring or fitted residual is claimed.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  return [
    "# Issue #55 — CGB4 fourth-track decrement/exit decision v39",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v39.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive evidence. v39 freezes v38 evidence/report and all inherited v37 address-free packets byte-for-byte, verifies v38 regeneration, and captures two fresh serial packet sets. Each packet contains exactly `sourceStateDigest` plus the minimum address-free `r2BeforeDecrement` scalar for the same three selected rows.",
    "",
    "All three observed r2 operands are **7**. Source/ELF/exact-ROM close only `_081DDA62..0x082dfc9e`: `subs r2, 0x1; ble _081DDA6C`, exact bytes `01 3a 02 dd`; the decoded `ble` target is `_081DDA6C` at `0x082dfca4`. The decrement leaves positive **6**, so the observed `ble` is not taken; v39 stops before both the non-exit continuation body and `_081DDA6C`'s exit successor body.",
    "",
    "The observed route executes two Thumb halfwords at **2** cycles each with no control-transfer refill: **2×2 = 4 cycles per row**, **12 aggregate**. The schema-consistent exit route is source-priced fail-closed at **10 cycles** including one **6-cycle** refill, but no exit row is claimed.",
    "",
    "| frozen selected sourceStateDigest rows | r2 before decrement | observed route | cycles per row | aggregate cycles |",
    "| ---: | ---: | --- | ---: | ---: |",
    "| 3 | 7 | `ble _081DDA6C` not taken | 4 | 12 |",
    "",
    `The aggregate source prefix advances from **6,124** to **${coverage.contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles} cycles**. Trainer, battle index, canonical tick, receipt schedule, unrelated future state, pointer/address/count/index/identity/channel/frame/duration/condition flags, serialized subtraction result, wider state, either successor body, later loop work, broader MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain null or untouched.`,
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v39.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v39.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v39.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
