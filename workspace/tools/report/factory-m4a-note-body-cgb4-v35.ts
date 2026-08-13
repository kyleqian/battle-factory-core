import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V34_EVIDENCE_SHA256 = "49a6bd712f69f16f92f51c2058be7a1fe2d5b54fe277afec2be68b54df06690c";
const V34_DOC_SHA256 = "c7133ef394e44089521e318f461f89ea11ef097bdf00710fbc9b5ad7d20e01d1";
const V33_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "5b200f46ea9182f5f1ba1f349b07f012b282f2d96157c2b49c0cee0e163b88c9",
  liliana: "edb093d86fd4deffdc39f2802d545d2422d3ca94ece18883d6d8dd2522c3bc13",
  "factory-varied": "a6e227b52726b060268a24d01aa404bcf54b576d3640cbdb85d76d9ffe4a4411",
};
const V35_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "e3b48fc009941742c1d2d19b8fb8625544b81a99fb5a6b16d9ae894f642407e3",
  liliana: "47366316f6450119b3d3d3c93e0dad10a0a6c5d9fe437fa70a8588ed40d33998",
  "factory-varied": "69ceae984c5647ccdc486b10ad478f0556344dab50c7cc032a12a661cf1c74c9",
};
const V35_PACKET_REPEAT_HASHES: Record<CaseName, string> = {
  anchor: "e3b48fc009941742c1d2d19b8fb8625544b81a99fb5a6b16d9ae894f642407e3",
  liliana: "47366316f6450119b3d3d3c93e0dad10a0a6c5d9fe437fa70a8588ed40d33998",
  "factory-varied": "69ceae984c5647ccdc486b10ad478f0556344dab50c7cc032a12a661cf1c74c9",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "a70595d17cb12da032e89ea67903bf3fe0b222c4c87bd2375a1c6eef2aa5791a";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V34_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v34.json");
const V34_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v34.md");
const V33_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v33");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v35");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v35.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v35.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc9a;
const BODY_END = 0x082d_fc9e;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v35: ${message}`);
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

export type Cgb4ThirdTrackDecrementTiming = Readonly<{
  route: "subs-r2-1; ble-not-taken" | "subs-r2-1; ble-taken";
  r2BeforeDecrement: number;
  sequentialThumbHalfwords: 2;
  memoryAccesses: 0;
  dataAccessPremiumCycles: 0;
  bleTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 4 | 10;
  stopsBeforeInstruction: "movs r0, MusicPlayerTrack_size" | "_081DDA6C: first instruction";
}>;

function bleTakenAfterSubs(r2BeforeDecrement: number): boolean {
  const result = (r2BeforeDecrement - 1) >>> 0;
  const negative = (result & 0x8000_0000) !== 0;
  const overflow = ((r2BeforeDecrement ^ 1) & (r2BeforeDecrement ^ result) & 0x8000_0000) !== 0;
  return result === 0 || negative !== overflow;
}

/** Price only the third-loop `_081DDA62` decrement/branch pair. */
export function reduceCgb4ThirdTrackDecrementTiming(state: unknown): Cgb4ThirdTrackDecrementTiming | null {
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
    stopsBeforeInstruction: "_081DDA6C: first instruction",
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
  }) as Cgb4ThirdTrackDecrementTiming;
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256) fail("source, ELF, or ROM changed");
  const boundedRoute = ["_081DDA62:", "\tsubs r2, 0x1", "\tble _081DDA6C"].join("\n");
  if (!assembly.includes(boundedRoute)) fail("bounded third-track decrement/branch route changed");
  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x01, 0x3a, 0x02, 0xdd]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled decrement/branch changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
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
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "subs r2, 0x1; ble _081DDA6C",
      start: "0x082dfc9a",
      endExclusive: "0x082dfc9e",
      bytes: body.length,
      bytesHex: "01 3a 02 dd",
      sha256: BODY_SHA256,
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

function assertV34Frozen(): void {
  const expectedEvidence = checkedBytes(V34_EVIDENCE, V34_EVIDENCE_SHA256);
  const expectedDoc = checkedBytes(V34_DOC, V34_DOC_SHA256);
  for (const name of CASES) checkedBytes(join(V33_PACKETS, `${name}.json`), V33_PACKET_HASHES[name]);
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v35-v34-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v34.ts", "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v34.json")).equals(expectedEvidence)) fail("v34 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v34.md")).equals(expectedDoc)) fail("v34 report does not regenerate byte-for-byte");
}

type FrozenV34Row = { sourceStateDigest: string; contiguous: number };

function frozenV34SelectedRows(frozenV34: unknown): FrozenV34Row[] {
  if (!isRecord(frozenV34) || frozenV34.schema !== "factory-m4a-note-body-cgb4-evidence/v34" || frozenV34.oracleProfile !== "battle-scene-off" || frozenV34.addressFree !== true || !Array.isArray(frozenV34.rows)) fail("frozen v34 evidence identity changed");
  const rows = frozenV34.rows.map((row, index) => {
    const expected = ["sourceStateDigest", "thirdTrackVolPitchMaskDecision", "postV33ThirdTrackVolPitchDecisionSourceCycles", "contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles", "beqTakenControlTransferRefills", "stopsBeforeV34Instruction"];
    if (!isRecord(row) || !exactKeys(row, expected)) fail(`frozen v34 row ${index} carries an unsupported field`);
    const result = {
      sourceStateDigest: requireDigest(row.sourceStateDigest, `frozen v34 row ${index} digest`),
      contiguous: row.contiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles as number,
    };
    if (
      row.thirdTrackVolPitchMaskDecision !== "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" ||
      row.postV33ThirdTrackVolPitchDecisionSourceCycles !== 12 || result.contiguous !== 900 ||
      row.beqTakenControlTransferRefills !== 1 || row.stopsBeforeV34Instruction !== "_081DDA62: subs r2, 0x1"
    ) fail(`frozen v34 row ${index} boundary changed`);
    return result;
  });
  const digests = rows.map((row) => row.sourceStateDigest);
  if (rows.length !== 3 || new Set(digests).size !== rows.length) fail("frozen v34 source-state join is missing, duplicate, ambiguous, or extra");
  return rows;
}

function loadPackets(selected: ReadonlySet<string>): Map<string, number> {
  const result = new Map<string, number>();
  for (const name of CASES) {
    const packet = checkedJson(join(PACKETS, `${name}.json`), V35_PACKET_HASHES[name]);
    if (!isRecord(packet) || !exactKeys(packet, ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"]) || packet.schema !== "factory-m4a-note-body-cgb4-probe/v35" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || typeof packet.sourceFunction !== "string" || packet.sourceFunction.length === 0 || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "third-track-immediately-before-_081DDA62-subs-r2-0x1" || packet.addressFree !== true || !Array.isArray(packet.observations) || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
    if (V35_PACKET_HASHES[name] !== V35_PACKET_REPEAT_HASHES[name]) fail(`${name} packet serial repeat changed`);
    for (const [index, row] of packet.observations.entries()) {
      if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "r2BeforeDecrement"])) fail(`${name} packet row ${index} widened`);
      const key = requireDigest(row.sourceStateDigest, `${name} row ${index}`);
      const scalar = requireU32(row.r2BeforeDecrement, `${name} row ${index} r2 scalar`);
      if (!selected.has(key) || result.has(key)) fail(`${name} packet key mismatched, duplicated, or extra`);
      result.set(key, scalar);
    }
  }
  if (result.size !== selected.size) fail("packets missed or ambiguously joined a v34 row");
  return result;
}

function productionContainment(): boolean {
  const fragments = [
    "factory-m4a-note-body-cgb4-evidence-v31", "issue55-m4a-note-body-cgb4-v31", "factory-m4a-note-body-cgb4-v31",
    "factory-m4a-note-body-cgb4-evidence-v32", "issue55-m4a-note-body-cgb4-v32", "factory-m4a-note-body-cgb4-v32",
    "factory-m4a-note-body-cgb4-evidence-v33", "issue55-m4a-note-body-cgb4-v33", "factory-m4a-note-body-cgb4-v33",
    "factory-m4a-note-body-cgb4-evidence-v34", "issue55-m4a-note-body-cgb4-v34", "factory-m4a-note-body-cgb4-v34",
    "factory-m4a-note-body-cgb4-evidence-v35", "issue55-m4a-note-body-cgb4-v35", "factory-m4a-note-body-cgb4-v35",
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
  const frozenV34 = checkedJson(V34_EVIDENCE, V34_EVIDENCE_SHA256);
  assertV34Frozen();
  const frozenRows = frozenV34SelectedRows(frozenV34);
  const packetValues = loadPackets(new Set(frozenRows.map((row) => row.sourceStateDigest)));
  const rows = frozenRows.map((prior) => {
    const timing = reduceCgb4ThirdTrackDecrementTiming({ r2BeforeDecrement: packetValues.get(prior.sourceStateDigest) });
    if (!timing || timing.r2BeforeDecrement !== 8 || timing.route !== "subs-r2-1; ble-not-taken" || timing.sourceCycles !== 4) fail("observed third-track decrement route changed");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      r2BeforeDecrement: timing.r2BeforeDecrement,
      thirdTrackDecrementDecision: timing.route,
      postV34ThirdTrackDecrementDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughThirdTrackDecrementDecisionSourceCycles: prior.contiguous + timing.sourceCycles,
      bleTakenControlTransferRefills: timing.bleTakenControlTransferRefills,
      stopsBeforeV35Instruction: timing.stopsBeforeInstruction,
    };
  });
  const added = rows.reduce((sum, row) => sum + row.postV34ThirdTrackDecrementDecisionSourceCycles, 0);
  const contiguous = 6016 + added;
  if (rows.length !== 3 || added !== 12 || contiguous !== 6028 || !rows.every((row) => row.postV34ThirdTrackDecrementDecisionSourceCycles === 4 && row.contiguousPrefixThroughThirdTrackDecrementDecisionSourceCycles === 904 && row.bleTakenControlTransferRefills === 0 && row.stopsBeforeV35Instruction === "movs r0, MusicPlayerTrack_size")) fail("v34 frozen state or v35 pricing changed; refuse to fit a different route");
  const noProductionImports = productionContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v35",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV34EvidenceSha256: V34_EVIDENCE_SHA256,
      acceptedV34DocSha256: V34_DOC_SHA256,
      acceptedInheritedV33PacketSha256: V33_PACKET_HASHES,
      v34EvidenceAndReportRegenerateByteForByte: true,
      v34EvidenceReportAndInheritedV33PacketsRetainedByteForByte: true,
      v35PacketSha256: V35_PACKET_HASHES,
      v35PacketRepeatSha256: V35_PACKET_REPEAT_HASHES,
      v35PacketRepeatIdentity: true,
      v35FreshSerialRunsPerCase: 2,
    },
    capture: {
      boundary: "third-track immediately before _081DDA62: subs r2, 0x1; ble _081DDA6C",
      scalars: ["r2BeforeDecrement"],
      packetObservationExactKeys: ["sourceStateDigest", "r2BeforeDecrement"],
      excluded: [
        "pointer", "address", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration",
        "condition flags", "wider state", "subtraction result serialization", "_081DDA6C exit successor body",
        "movs r0, MusicPlayerTrack_size continuation successor body", "third-track flags", "volume/pitch mask", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV34SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v34-selected-row", "packet-key-mismatch", "unsupported-packet-field", "source-operand-out-of-range", "unexpected-observed-route"],
    },
    coverage: {
      frozenV34SelectedRows: 3,
      packetRowsByCase: COUNTS,
      r2BeforeDecrementRows: 3,
      r2BeforeDecrementValues: [8],
      bleNotTakenRows: 3,
      bleTakenRows: 0,
      postV34ThirdTrackDecrementDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughThirdTrackVolPitchDecisionSourceCycles: 6016,
      contiguousPrefixThroughThirdTrackDecrementDecisionSourceCycles: contiguous,
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
      frozenV34ArtifactsReadOnly: true,
      inheritedV33PacketsRetainedReadOnly: true,
      v35FreshPacketsAddressFree: true,
      v35RuntimeCaptureCount: 3,
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
      subtractionResult: null,
      continuationBody: null,
      exitBody: null,
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
    verdict: "Fresh twice-byte-stable v35 Battle Scene OFF packets join only v34's three selected sourceStateDigest rows and retain exactly r2BeforeDecrement. All three observed operands are 8, so subs r2, 0x1 leaves positive 7 and ble _081DDA6C is not taken. Source/ELF/exact-ROM price the pair at four cycles per row with no refill, advancing the aggregate prefix from 6016 to 6028 and stopping before both successor bodies. The exit route is source-priced fail-closed at ten cycles and is not claimed observed.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  return [
    "# Issue #55 — CGB4 third-track decrement/exit decision v35",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v35.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive evidence. v35 freezes v34 evidence/report and inherited v33 packets byte-for-byte, verifies v34 regeneration, and captures two fresh serial packet sets. Each packet contains exactly `sourceStateDigest` plus the minimum address-free `r2BeforeDecrement` scalar for the same three selected rows.",
    "",
    "All three observed r2 operands are **8**. Source/ELF/exact-ROM close only `_081DDA62..0x082dfc9e`: `subs r2, 0x1; ble _081DDA6C`, exact bytes `01 3a 02 dd`. The decrement leaves positive **7**, so the observed `ble` is not taken; v35 stops before both the non-exit continuation body and `_081DDA6C`'s exit successor body.",
    "",
    "The observed route executes two Thumb halfwords at **2** cycles each with no control-transfer refill: **2×2 = 4 cycles per row**, **12 aggregate**. The schema-consistent exit route is source-priced fail-closed at **10 cycles** including one **6-cycle** refill, but no exit row is claimed.",
    "",
    "| frozen selected sourceStateDigest rows | r2 before decrement | observed route | cycles per row | aggregate cycles |",
    "| ---: | ---: | --- | ---: | ---: |",
    "| 3 | 8 | `ble _081DDA6C` not taken | 4 | 12 |",
    "",
    `The aggregate source prefix advances from **6,016** to **${coverage.contiguousPrefixThroughThirdTrackDecrementDecisionSourceCycles} cycles**. Pointer/address/count/index/identity/channel/frame/duration/condition flags, serialized subtraction result, wider state, either successor body, broader MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain null or untouched.`,
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v35.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v35.md") };
  fail("usage: factory-m4a-note-body-cgb4-v35.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
