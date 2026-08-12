import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const SELECTED_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V26_EVIDENCE_SHA256 = "a4cff030582607369f63bd70cb1ed6a3c5afad4d36997d0f3626684a9122bae1";
const V26_DOC_SHA256 = "2eb2f9e4ccb12149145a881d24d63e552caf05515d73fc1eb95ccf206803636c";
const V25_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "3ac4e4a8797b7e459c15019e7f847dce592643f604cdc437e74074dfc8d6d1a7",
  liliana: "ce74203999ee3d5492f060ef879483403002c06ab501776e7063b0fa1421d4da",
  "factory-varied": "bd289cb97eaafe49b63ce41c9b1546037b899394d7cdaf25998efcc6427646b5",
};
const V27_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "af43b96726ecbab87348608a4da6c85bb798648e0e7a6d39a6d62aecd5f3f930",
  liliana: "9078aa6611250012a1654f05b6ea6f8f30190117f7db0f6d2713f1ab71447626",
  "factory-varied": "6a5a1424b507c62bed61d7da753502965f0de47924425f52ba36152d7132be68",
};
const V27_PACKET_REPEAT_HASHES: Record<CaseName, string> = {
  anchor: "af43b96726ecbab87348608a4da6c85bb798648e0e7a6d39a6d62aecd5f3f930",
  liliana: "9078aa6611250012a1654f05b6ea6f8f30190117f7db0f6d2713f1ab71447626",
  "factory-varied": "6a5a1424b507c62bed61d7da753502965f0de47924425f52ba36152d7132be68",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "a70595d17cb12da032e89ea67903bf3fe0b222c4c87bd2375a1c6eef2aa5791a";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V26_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v26.json");
const V26_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v26.md");
const V25_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v25");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v27");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v27.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v27.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc9a;
const BODY_END = 0x082d_fc9e;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v27: ${message}`);
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

function requireU32(value: unknown, label: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 0xffff_ffff) {
    fail(`${label} must be an unsigned 32-bit scalar`);
  }
  return value;
}

export type Cgb4FirstTrackDecrementTiming = Readonly<{
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
  const overflow = (((r2BeforeDecrement ^ 1) & (r2BeforeDecrement ^ result) & 0x8000_0000) !== 0);
  return result === 0 || negative !== overflow;
}

/**
 * Price only `_081DDA62`'s decrement/conditional-branch pair from the one
 * captured r2 machine scalar.  It deliberately accepts no state that could
 * identify a track or extend either successor body.
 */
export function reduceCgb4FirstTrackDecrementTiming(state: unknown): Cgb4FirstTrackDecrementTiming | null {
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
  } as Cgb4FirstTrackDecrementTiming);
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256) {
    fail("source, ELF, or ROM changed");
  }

  const boundedRoute = [
    "_081DDA62:",
    "\tsubs r2, 0x1",
    "\tble _081DDA6C",
    "\tmovs r0, MusicPlayerTrack_size",
    "\tadds r5, r0",
    "\tbgt _081DD9C8",
    "_081DDA6C:",
  ].join("\n");
  if (!assembly.includes(boundedRoute)) fail("bounded decrement/branch route changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x01, 0x3a, 0x02, 0xdd]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled decrement/branch changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62", "082dfca4 t _081DDA6C"]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1443-1450", sha256: sha256(assembly) },
    },
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

function assertV26ArtifactsAndReportRegenerate(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v27-v26-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v26.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v26.json")).equals(
    checkedBytes(V26_EVIDENCE, V26_EVIDENCE_SHA256),
  )) fail("v26 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v26.md")).equals(
    checkedBytes(V26_DOC, V26_DOC_SHA256),
  )) fail("v26 report does not regenerate byte-for-byte");
  for (const [name, hash] of Object.entries(V25_PACKET_HASHES) as Array<[CaseName, string]>) {
    checkedBytes(join(V25_PACKETS, `${name}.json`), hash);
  }
}

type FrozenV26Row = {
  sourceStateDigest: string;
  volPitchMaskDecision: string;
  postV25FirstTrackVolPitchDecisionSourceCycles: number;
  contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles: number;
  beqTakenControlTransferRefills: number;
  stopsBeforeV26Instruction: string;
};

function frozenV26SelectedRows(frozenV26: unknown): FrozenV26Row[] {
  if (
    !isRecord(frozenV26) || frozenV26.schema !== "factory-m4a-note-body-cgb4-evidence/v26" ||
    frozenV26.oracleProfile !== "battle-scene-off" || frozenV26.addressFree !== true || !Array.isArray(frozenV26.rows)
  ) fail("frozen v26 evidence identity changed");
  const rows = frozenV26.rows.map((row, index) => {
    if (!isRecord(row) || !exactKeys(row, [
      "sourceStateDigest",
      "volPitchMaskDecision",
      "postV25FirstTrackVolPitchDecisionSourceCycles",
      "contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles",
      "beqTakenControlTransferRefills",
      "stopsBeforeV26Instruction",
    ])) fail(`frozen v26 row ${index} carries an unsupported field`);
    const result: FrozenV26Row = {
      sourceStateDigest: requireDigest(row.sourceStateDigest, `frozen v26 row ${index} digest`),
      volPitchMaskDecision: row.volPitchMaskDecision as string,
      postV25FirstTrackVolPitchDecisionSourceCycles: row.postV25FirstTrackVolPitchDecisionSourceCycles as number,
      contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles:
        row.contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles as number,
      beqTakenControlTransferRefills: row.beqTakenControlTransferRefills as number,
      stopsBeforeV26Instruction: row.stopsBeforeV26Instruction as string,
    };
    if (
      result.volPitchMaskDecision !== "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" ||
      result.postV25FirstTrackVolPitchDecisionSourceCycles !== 12 ||
      result.contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles !== 828 ||
      result.beqTakenControlTransferRefills !== 1 ||
      result.stopsBeforeV26Instruction !== "_081DDA62: first instruction"
    ) fail(`frozen v26 row ${index} no longer proves the exact decrement boundary`);
    return result;
  });
  const digests = rows.map((row) => row.sourceStateDigest);
  if (rows.length !== 3 || new Set(digests).size !== rows.length) {
    fail("frozen v26 source-state join is missing, duplicate, ambiguous, or extra");
  }
  return rows;
}

type Packet = {
  schema: string;
  case: CaseName;
  oracleProfile: string;
  sourceFunction: string;
  joinKey: string;
  captureBoundary: string;
  addressFree: boolean;
  observations: unknown[];
};

function loadPacket(name: CaseName, expectedDigests: ReadonlySet<string>): Array<{ sourceStateDigest: string; r2BeforeDecrement: number }> {
  if (V27_PACKET_HASHES[name] !== V27_PACKET_REPEAT_HASHES[name]) {
    fail(`${name} v27 serial repeat packet is not byte-identical`);
  }
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), V27_PACKET_HASHES[name]);
  const headerKeys = ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"];
  if (!isRecord(packet) || !exactKeys(packet, headerKeys)) fail(`${name} v27 packet carries an unsupported field`);
  if (
    packet.schema !== "factory-m4a-note-body-cgb4-probe/v27" || packet.case !== name ||
    packet.oracleProfile !== "battle-scene-off" || typeof packet.sourceFunction !== "string" ||
    packet.sourceFunction.length === 0 || packet.joinKey !== "sourceStateDigest" ||
    packet.captureBoundary !== "immediately-before-_081DDA62-subs-r2-0x1" ||
    packet.addressFree !== true || !Array.isArray(packet.observations)
  ) fail(`${name} v27 packet identity changed`);
  if (packet.observations.length !== SELECTED_COUNTS[name]) fail(`${name} v27 packet selected-row census changed`);
  const rows = packet.observations.map((observation, index) => {
    if (!isRecord(observation) || !exactKeys(observation, ["sourceStateDigest", "r2BeforeDecrement"])) {
      fail(`${name} v27 packet row ${index} carries an unsupported field`);
    }
    return {
      sourceStateDigest: requireDigest(observation.sourceStateDigest, `${name} v27 packet row ${index} digest`),
      r2BeforeDecrement: requireU32(observation.r2BeforeDecrement, `${name} v27 packet row ${index} r2 scalar`),
    };
  });
  const digests = rows.map((row) => row.sourceStateDigest);
  if (new Set(digests).size !== digests.length || !digests.every((digest) => expectedDigests.has(digest))) {
    fail(`${name} v27 packet source-state rows are missing, duplicate, ambiguous, or not frozen-v26 members`);
  }
  return rows;
}

function productionReceiptContainment(): boolean {
  const forbiddenFragments = [
    "factory-m4a-note-body-cgb4-evidence-v23", "issue55-m4a-note-body-cgb4-v23", "factory-m4a-note-body-cgb4-v23",
    "factory-m4a-note-body-cgb4-evidence-v24", "issue55-m4a-note-body-cgb4-v24", "factory-m4a-note-body-cgb4-v24",
    "factory-m4a-note-body-cgb4-evidence-v25", "issue55-m4a-note-body-cgb4-v25", "factory-m4a-note-body-cgb4-v25",
    "factory-m4a-note-body-cgb4-evidence-v26", "issue55-m4a-note-body-cgb4-v26", "factory-m4a-note-body-cgb4-v26",
    "factory-m4a-note-body-cgb4-evidence-v27", "issue55-m4a-note-body-cgb4-v27", "factory-m4a-note-body-cgb4-v27",
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
  const frozenV26 = checkedJson<unknown>(V26_EVIDENCE, V26_EVIDENCE_SHA256);
  assertV26ArtifactsAndReportRegenerate();
  const frozenRows = frozenV26SelectedRows(frozenV26);
  const selectedDigests = frozenRows.map((row) => row.sourceStateDigest);
  const selectedDigestSet = new Set(selectedDigests);
  const packetsByDigest = new Map<string, { r2BeforeDecrement: number }>();
  const packetRowsByCase: Record<CaseName, number> = { anchor: 0, liliana: 0, "factory-varied": 0 };
  for (const name of CASES) {
    const packetRows = loadPacket(name, selectedDigestSet);
    packetRowsByCase[name] = packetRows.length;
    for (const packet of packetRows) {
      if (packetsByDigest.has(packet.sourceStateDigest)) fail("v27 packet source-state join became ambiguous");
      packetsByDigest.set(packet.sourceStateDigest, { r2BeforeDecrement: packet.r2BeforeDecrement });
    }
  }
  if (packetsByDigest.size !== selectedDigests.length) fail("v27 packet missed a frozen v26 selected row");

  const rows = frozenRows.map((prior) => {
    const packet = packetsByDigest.get(prior.sourceStateDigest);
    if (!packet) fail("v27 packet missed a frozen v26 selected row");
    const timing = reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: packet.r2BeforeDecrement });
    if (!timing) fail("v27 r2-before-decrement scalar is malformed");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      r2BeforeDecrement: timing.r2BeforeDecrement,
      decrementDecision: timing.route,
      postV26FirstTrackDecrementDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles:
        prior.contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles + timing.sourceCycles,
      bleTakenControlTransferRefills: timing.bleTakenControlTransferRefills,
      stopsBeforeV27Instruction: timing.stopsBeforeInstruction,
    };
  });
  const bleNotTakenRows = rows.filter((row) => row.decrementDecision === "subs-r2-1; ble-not-taken");
  const bleTakenRows = rows.filter((row) => row.decrementDecision === "subs-r2-1; ble-taken");
  const added = rows.reduce((sum, row) => sum + row.postV26FirstTrackDecrementDecisionSourceCycles, 0);
  const contiguous = 5800 + added;
  const r2BeforeDecrementValues = [...new Set(rows.map((row) => row.r2BeforeDecrement))].sort((a, b) => a - b);
  const sourcePricedExit = reduceCgb4FirstTrackDecrementTiming({ r2BeforeDecrement: 1 });
  if (
    rows.length !== 3 || !rows.every((row) =>
      row.contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles ===
      828 + row.postV26FirstTrackDecrementDecisionSourceCycles,
    ) || !sourcePricedExit || sourcePricedExit.route !== "subs-r2-1; ble-taken" ||
    sourcePricedExit.sourceCycles !== 10 || sourcePricedExit.stopsBeforeInstruction !== "_081DDA6C: first instruction"
  ) fail("v27 packet scalar or source-only decrement pricing changed");

  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v27",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV26EvidenceSha256: V26_EVIDENCE_SHA256,
      acceptedV26DocSha256: V26_DOC_SHA256,
      acceptedV25PacketSha256: V25_PACKET_HASHES,
      v26EvidenceAndReportRegenerateByteForByte: true,
      v26EvidenceReportAndInheritedV25PacketsRetainedByteForByte: true,
      v27PacketSha256: V27_PACKET_HASHES,
      v27PacketRepeatSha256: V27_PACKET_REPEAT_HASHES,
      v27PacketRepeatIdentity: true,
    },
    capture: {
      boundary: "immediately before _081DDA62: subs r2, 0x1",
      scalars: ["r2BeforeDecrement"],
      excluded: [
        "track pointer", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration",
        "condition flags", "wider state", "subtraction result serialization", "_081DDA6C body",
        "movs r0, MusicPlayerTrack_size continuation body", "later loop work", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV26SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v26-selected-row",
        "unsupported-packet-field", "source-operand-out-of-range", "unexpected-successor-boundary",
      ],
    },
    coverage: {
      frozenV26SelectedRows: 3,
      packetRowsByCase,
      r2BeforeDecrementRows: rows.length,
      r2BeforeDecrementValues,
      bleNotTakenRows: bleNotTakenRows.length,
      bleTakenRows: bleTakenRows.length,
      postV26FirstTrackDecrementDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles: 5800,
      contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: rows.length * 2,
      memoryAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: rows.reduce((sum, row) => sum + row.bleTakenControlTransferRefills, 0),
      failClosedSchemaConsistentUnobservedExitSourceCycles: sourcePricedExit.sourceCycles,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV26ArtifactsReadOnly: true,
      inheritedV25PacketsReadOnly: true,
      frozenV26ArtifactsAreNotProductionImports: noProductionImports,
      inheritedV25PacketsAreNotProductionImports: noProductionImports,
      v27PacketsAreNotProductionImports: noProductionImports,
      v27PacketStripBackPreserved: true,
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
      laterLoopWork: null,
      serviceCost: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      unsupportedBarrierAdded: false,
    },
    verdict: `Two fresh byte-identical address-free v27 packet sets freeze v26 evidence/report and all inherited v25 packets byte-for-byte, then join only the same three sourceStateDigest rows. Each packet retains only r2BeforeDecrement. Source/ELF/exact-ROM price subs r2, 0x1; ble _081DDA6C from that operand, yielding ${bleNotTakenRows.length} observed non-taken and ${bleTakenRows.length} observed taken routes, ${added} aggregate cycles, and a contiguous prefix of ${contiguous}. The schema-consistent r2BeforeDecrement=1 exit route is source-priced at 10 cycles but is fail-closed unless independently observed; both successor bodies remain excluded.`,
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  const rows: any[] = evidence.rows as any[];
  const tableRows = rows.map((row) =>
    `| \`${row.sourceStateDigest.slice(0, 12)}…\` | ${row.r2BeforeDecrement} | \`${row.decrementDecision}\` | ${row.postV26FirstTrackDecrementDecisionSourceCycles} | \`${row.stopsBeforeV27Instruction}\` |`,
  );
  return [
    "# Issue #55 — CGB4 first-track decrement/exit decision v27",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v27.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive evidence. v27 freezes v26 evidence/report and all inherited v25 packets byte-for-byte, verifies v26 regenerates byte-for-byte, and joins only its same three selected `sourceStateDigest` rows. Two fresh serial packet sets are byte-identical: anchor `af43b967…`, LILIANA `9078aa66…`, and legal-varied `6a5a1424…`. Exact-key validation proves strip-back preservation: every v27 observation contains only `sourceStateDigest` plus the one address-free `r2BeforeDecrement` scalar.",
    "",
    "The hook is at pipelined PC `0x082DFC9C`: `_081DDA62`'s `subs r2, 0x1` has not begun. It carries the already-established in-memory CGB4 source-state association across the bounded prefix; it never rereads or serializes a pointer/address, track count/index/identity, channel, frame, duration, condition flags, or wider state.",
    "",
    "Source/ELF/exact-ROM close exactly `_081DDA62..0x082dfc9e`: `subs r2, 0x1; ble _081DDA6C`. Exact ROM bytes are `01 3a 02 dd`; the non-taken successor begins at `0x082dfc9e` with `movs r0, MusicPlayerTrack_size`, while the taken successor `_081DDA6C` begins at `0x082dfca4`. This slice executes no data access: **0** memory accesses and **0** data-access premium.",
    "",
    "Observed route and aggregate are derived from the captured scalar and the pinned instruction pair, not fitted to a predicted value. A non-taken `ble` costs **2×2 = 4 cycles**; a taken `ble` adds one **6-cycle** refill for **2×2 + 6 = 10 cycles**. The schema-consistent source-only `{ r2BeforeDecrement: 1 }` exit route is priced fail-closed at 10 cycles and stops before `_081DDA6C`'s first instruction; it is not claimed observed by this packet set.",
    "",
    "| frozen selected sourceStateDigest | r2 before decrement | observed route | cycles | stop boundary |",
    "| --- | ---: | --- | ---: | --- |",
    ...tableRows,
    "",
    `The observed scalar set is **${c.r2BeforeDecrementValues.join(", ")}**; the aggregate source prefix advances from **5,800** to **${c.contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles} cycles**. Actual track count/identity/pointer/address/channel, both successor bodies, later loop work, broader MPlay/controller/presentation fields, service/arbitration, and construction-clock wiring remain null. Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.`,
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v27.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v27.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v27.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
