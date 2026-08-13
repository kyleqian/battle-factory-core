import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V30_EVIDENCE_SHA256 = "dad6dbec1ab4956cecbe6041535f387ffd1d14107267504b70afaaf472242477";
const V30_DOC_SHA256 = "7651955909d56f707091baef60b1cd5cfb0f81b4b8d28d75a979fab9da940977";
const V30_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "77ce80af100e6fd8d46fcf8e6359019f65ec03935f4702cf956a02c76a3910a2",
  liliana: "b6c53e5fc7385036ebf4b9a9985ddb49c83c77856bcfdc1e2c0f54df0bd1e8fa",
  "factory-varied": "53fabb3e0cf7663015c25c8d67dad04c2c1685756aef1b682df8707579076485",
};
const V31_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "6a4af5ecbaa256b17914231e77d962b01ae45c91bc0ed64a2ddf6bdc949dee3d",
  liliana: "4b13624cda5a688270c3ac3cabc6228adad78eb83f7322152ca2cccc4d3e8bb3",
  "factory-varied": "ad82e79e6af5b3627775762d28463eaa91256477ce54cc698b8761673476d5e7",
};
const V31_PACKET_REPEAT_HASHES: Record<CaseName, string> = {
  anchor: "6a4af5ecbaa256b17914231e77d962b01ae45c91bc0ed64a2ddf6bdc949dee3d",
  liliana: "4b13624cda5a688270c3ac3cabc6228adad78eb83f7322152ca2cccc4d3e8bb3",
  "factory-varied": "ad82e79e6af5b3627775762d28463eaa91256477ce54cc698b8761673476d5e7",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "a70595d17cb12da032e89ea67903bf3fe0b222c4c87bd2375a1c6eef2aa5791a";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V30_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v30.json");
const V30_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v30.md");
const V30_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v30");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v31");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v31.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v31.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc9a;
const BODY_END = 0x082d_fc9e;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v31: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
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
function checkedJson(path: string, hash: string): unknown { return JSON.parse(checkedBytes(path, hash).toString("utf8")); }
function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} is not a digest`);
  return value;
}
function u32(value: unknown, label: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 0xffff_ffff) fail(`${label} is not a u32`);
  return value;
}

export type Cgb4SecondTrackDecrementTiming = Readonly<{
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

/** Price only the selected second-loop `_081DDA62` decrement/branch pair. */
export function reduceCgb4SecondTrackDecrementTiming(state: unknown): Cgb4SecondTrackDecrementTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["r2BeforeDecrement"])) return null;
  let r2BeforeDecrement: number;
  try { r2BeforeDecrement = u32(state.r2BeforeDecrement, "r2BeforeDecrement"); } catch { return null; }
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
  } as Cgb4SecondTrackDecrementTiming);
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256) fail("source, ELF, or ROM changed");
  const boundedRoute = ["_081DDA62:", "\tsubs r2, 0x1", "\tble _081DDA6C"].join("\n");
  if (!assembly.includes(boundedRoute)) fail("bounded second-track decrement/branch route changed");
  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x01, 0x3a, 0x02, 0xdd]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled second-track decrement/branch changed");
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

function assertV30Frozen(): void {
  checkedBytes(V30_DOC, V30_DOC_SHA256);
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v31-v30-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v30.ts", "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v30.json")).equals(checkedBytes(V30_EVIDENCE, V30_EVIDENCE_SHA256)) || !readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v30.md")).equals(checkedBytes(V30_DOC, V30_DOC_SHA256))) fail("v30 does not regenerate byte-for-byte");
  for (const name of CASES) checkedBytes(join(V30_PACKETS, `${name}.json`), V30_PACKET_HASHES[name]);
}

function frozenRows(): Array<{ sourceStateDigest: string; contiguous: number }> {
  const evidence = checkedJson(V30_EVIDENCE, V30_EVIDENCE_SHA256);
  if (!isRecord(evidence) || evidence.schema !== "factory-m4a-note-body-cgb4-evidence/v30" || evidence.oracleProfile !== "battle-scene-off" || evidence.addressFree !== true || !Array.isArray(evidence.rows)) fail("frozen v30 identity changed");
  const rows = evidence.rows.map((row, index) => {
    if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "secondTrackFlags", "secondTrackVolPitchMaskDecision", "postV29SecondTrackVolPitchDecisionSourceCycles", "contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles", "beqTakenControlTransferRefills", "stopsBeforeV30Instruction"])) fail(`frozen v30 row ${index} widened`);
    if (row.secondTrackFlags !== 0x80 || row.secondTrackVolPitchMaskDecision !== "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" || row.postV29SecondTrackVolPitchDecisionSourceCycles !== 12 || row.contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles !== 864 || row.beqTakenControlTransferRefills !== 1 || row.stopsBeforeV30Instruction !== "_081DDA62: first instruction") fail(`frozen v30 row ${index} boundary changed`);
    return { sourceStateDigest: digest(row.sourceStateDigest, `v30 row ${index}`), contiguous: 864 };
  });
  if (rows.length !== 3 || new Set(rows.map((row) => row.sourceStateDigest)).size !== 3) fail("frozen v30 census changed");
  return rows;
}

function loadPackets(selected: ReadonlySet<string>): Map<string, number> {
  const result = new Map<string, number>();
  for (const name of CASES) {
    const packet = checkedJson(join(PACKETS, `${name}.json`), V31_PACKET_HASHES[name]);
    if (!isRecord(packet) || !exactKeys(packet, ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"]) || packet.schema !== "factory-m4a-note-body-cgb4-probe/v31" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || typeof packet.sourceFunction !== "string" || packet.sourceFunction.length === 0 || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "second-track-immediately-before-_081DDA62-subs-r2-0x1" || packet.addressFree !== true || !Array.isArray(packet.observations) || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
    if (V31_PACKET_HASHES[name] !== V31_PACKET_REPEAT_HASHES[name]) fail(`${name} packet serial repeat changed`);
    for (const [index, row] of packet.observations.entries()) {
      if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "r2BeforeDecrement"])) fail(`${name} packet row ${index} widened`);
      const key = digest(row.sourceStateDigest, `${name} row ${index}`);
      const scalar = u32(row.r2BeforeDecrement, `${name} row ${index} r2 scalar`);
      if (!selected.has(key) || result.has(key)) fail(`${name} packet key mismatched, duplicated, or extra`);
      result.set(key, scalar);
    }
  }
  if (result.size !== selected.size) fail("packets missed or ambiguously joined a v30 row");
  return result;
}

function productionContainment(): boolean {
  const fragments = ["factory-m4a-note-body-cgb4-evidence-v30", "issue55-m4a-note-body-cgb4-v30", "factory-m4a-note-body-cgb4-v30", "factory-m4a-note-body-cgb4-evidence-v31", "issue55-m4a-note-body-cgb4-v31", "factory-m4a-note-body-cgb4-v31"];
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  if (visit(join(ROOT, "src")).some((path) => fragments.some((fragment) => readFileSync(path, "utf8").includes(fragment)))) fail("production imports v30 or v31 evidence");
  return true;
}

export function makeEvidence(): Record<string, any> {
  assertV30Frozen();
  const prior = frozenRows();
  const packetValues = loadPackets(new Set(prior.map((row) => row.sourceStateDigest)));
  const rows = prior.map((row) => {
    const timing = reduceCgb4SecondTrackDecrementTiming({ r2BeforeDecrement: packetValues.get(row.sourceStateDigest) });
    if (!timing || timing.r2BeforeDecrement !== 9 || timing.route !== "subs-r2-1; ble-not-taken" || timing.sourceCycles !== 4) fail("observed second-track decrement route changed");
    return {
      sourceStateDigest: row.sourceStateDigest,
      r2BeforeDecrement: timing.r2BeforeDecrement,
      secondTrackDecrementDecision: timing.route,
      postV30SecondTrackDecrementDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughSecondTrackDecrementDecisionSourceCycles: row.contiguous + timing.sourceCycles,
      bleTakenControlTransferRefills: timing.bleTakenControlTransferRefills,
      stopsBeforeV31Instruction: timing.stopsBeforeInstruction,
    };
  });
  const added = rows.reduce((sum, row) => sum + row.postV30SecondTrackDecrementDecisionSourceCycles, 0);
  if (added !== 12 || !rows.every((row) => row.contiguousPrefixThroughSecondTrackDecrementDecisionSourceCycles === 868)) fail("v31 pricing changed");
  const noImports = productionContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v31",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV30EvidenceSha256: V30_EVIDENCE_SHA256,
      acceptedV30DocSha256: V30_DOC_SHA256,
      acceptedV30PacketSha256: V30_PACKET_HASHES,
      v30RegeneratesByteForByte: true,
      v30EvidenceReportAndPacketsRetainedByteForByte: true,
      v31PacketSha256: V31_PACKET_HASHES,
      v31PacketRepeatSha256: V31_PACKET_REPEAT_HASHES,
      v31PacketRepeatIdentity: true,
    },
    capture: {
      boundary: "immediately before second-track _081DDA62: subs r2, 0x1",
      scalars: ["r2BeforeDecrement"],
      packetObservationExactKeys: ["sourceStateDigest", "r2BeforeDecrement"],
      excluded: ["pointer", "runtime address", "track count", "track index", "track identity", "iteration count", "channel", "frame", "duration", "condition flags", "wider state", "subtraction result serialization", "_081DDA6C exit body", "movs r0, MusicPlayerTrack_size continuation body", "later loop work", "other 75 callbacks"],
    },
    join: {
      key: "sourceStateDigest",
      frozenV30SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v30-selected-row", "packet-key-mismatch", "unsupported-packet-field", "source-operand-out-of-range", "unexpected-observed-route"],
    },
    coverage: {
      frozenV30SelectedRows: 3,
      packetRowsByCase: COUNTS,
      r2BeforeDecrementRows: 3,
      r2BeforeDecrementValues: [9],
      bleNotTakenRows: 3,
      bleTakenRows: 0,
      postV30SecondTrackDecrementDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles: 5908,
      contiguousPrefixThroughSecondTrackDecrementDecisionSourceCycles: 5908 + added,
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
      frozenV30ArtifactsReadOnly: true,
      v30PacketStripBackPreserved: true,
      v30AndV31ArtifactsAreNotProductionImports: noImports,
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
      subtractionResult: null,
      continuationBody: null,
      exitBody: null,
      laterLoopWork: null,
      serviceCost: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Two fresh byte-identical OFF packet sets retain only sourceStateDigest and r2BeforeDecrement. All three r2 values are 9, so subs r2, 0x1 leaves positive 8 and ble is not taken at 4 cycles per row / 12 aggregate. The prefix advances 5908 to 5920 cycles and stops before either successor body.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  return [
    "# Issue #55 — CGB4 second-track decrement/exit decision v31", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v31.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence. v31 freezes v30 evidence, report, and all three packets byte-for-byte. Two fresh serial packet sets are byte-identical: anchor `6a4af5ec…`, LILIANA `4b13624c…`, and legal-varied `ad82e79e…`. Every observation contains exactly `sourceStateDigest` plus the address-free `r2BeforeDecrement` scalar.", "",
    "All three observed r2 operands are **9**. Source/ELF/exact-ROM close only `_081DDA62.._081DDA66`: `subs r2, 0x1; ble _081DDA6C`, bytes `01 3a 02 dd`. The decrement leaves positive 8, so the observed `ble` is not taken.", "",
    "Two Thumb halfwords cost **4 cycles per row** with no control-transfer refill, **12 cycles aggregate**. The fail-closed source-priced exit route costs **10 cycles** (including one 6-cycle refill) and is not claimed observed.", "",
    "| selected rows | r2 before `subs` | `ble` route | cycles/row | aggregate |", "| ---: | ---: | --- | ---: | ---: |", "| 3 | 9 | not taken → `movs r0, MusicPlayerTrack_size` | 4 | 12 |", "",
    `The aggregate prefix advances from **5,908** to **${evidence.coverage.contiguousPrefixThroughSecondTrackDecrementDecisionSourceCycles} cycles**. It stops before the selected continuation body and before the _081DDA6C exit body; pointer/address/count/index/identity/iteration/channel/frame/duration/condition flags/wider state, subtraction-result serialization, complete MPlay, service/arbitration, and construction-clock wiring remain null.`, "",
    "Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v31.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v31.md") };
  fail("usage: factory-m4a-note-body-cgb4-v31.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
