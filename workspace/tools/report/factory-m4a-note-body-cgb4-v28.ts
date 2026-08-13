import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";
const V27_EVIDENCE_SHA256 = "5e730d95829b186df347d6bfa2f4bc703e3b1e19f369397fb68efffae3026a85";
const V27_DOC_SHA256 = "827fe735000ead669189f29826b8a95003e80a407b44cbe9b1c9b94ea6fdcf54";
const V27_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "af43b96726ecbab87348608a4da6c85bb798648e0e7a6d39a6d62aecd5f3f930",
  liliana: "9078aa6611250012a1654f05b6ea6f8f30190117f7db0f6d2713f1ab71447626",
  "factory-varied": "6a5a1424b507c62bed61d7da753502965f0de47924425f52ba36152d7132be68",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const M4A_CONSTANTS_SHA256 = "36a0f4b5be5a777886350810b1aec40364557f2e021352d67d8ae604a6a0a9fd";
const DEFINES_SHA256 = "528c5983bf23f3b12036e9f7ed20e482b1dbe15e0198ec6bb10292d413f68644";
const LINKER_SHA256 = "ea3df8331ffacc75e1377b2d2f2d8ec6530f6436788b812603ba3af1a964cfb0";
const PLAYER_TABLE_SHA256 = "babb0eb8acce75ada42c2747ca0ef09825135d1c85b46254b1f44520b1a57a36";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "05a30c0a17fafc028ce3218c1ad9921ce4ffd3efc591503956f4793a4c43b993";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V27_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v27.json");
const V27_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v27.md");
const V27_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v27");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v28.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v28.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc9e;
const BODY_END = 0x082d_fca4;
const IWRAM_START = 0x0300_0000;
const IWRAM_END = 0x0300_8000;
const TRACK_BYTES = 80;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v28: ${message}`);
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

export type Cgb4FirstTrackContinuationTiming = Readonly<{
  route: "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8";
  sequentialThumbHalfwords: 3;
  musicPlayerTrackSizeBytes: 80;
  r5Origin: "MusicPlayerInfo.tracks";
  r5CandidateStorageClass: "IWRAM";
  addResultSignedPositive: true;
  addSignedOverflow: false;
  bgtTakenControlTransferRefills: 1;
  takenControlTransferRefills: 1;
  sourceCycles: 12;
  stopsBeforeInstruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]";
}>;

/**
 * Price only the fixed source continuation selected by frozen v27. The empty
 * input is intentional: pointer, count, identity, flags, and channel data
 * cannot widen this source-only receipt.
 */
export function reduceCgb4FirstTrackContinuationTiming(state: unknown): Cgb4FirstTrackContinuationTiming | null {
  if (!isRecord(state) || !exactKeys(state, [])) return null;
  return Object.freeze({
    route: "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8",
    sequentialThumbHalfwords: 3,
    musicPlayerTrackSizeBytes: 80,
    r5Origin: "MusicPlayerInfo.tracks",
    r5CandidateStorageClass: "IWRAM",
    addResultSignedPositive: true,
    addSignedOverflow: false,
    bgtTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 12,
    stopsBeforeInstruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
  });
}

function parseTrackLayoutBytes(constants: string): number {
  const start = constants.indexOf("\tstruct_begin\n\tstruct_field o_MusicPlayerTrack_flags, 1\n");
  const end = constants.indexOf("\tstruct_field MusicPlayerTrack_size, 0\n", start);
  if (start < 0 || end < 0) fail("MusicPlayerTrack assembler layout changed");
  const fields = constants.slice(start, end).matchAll(/^\tstruct_field [^,]+, (\d+)$/gm);
  let bytes = 0;
  for (const field of fields) bytes += Number(field[1]);
  return bytes;
}

function assertTrackSymbolsAreIwram(symbols: string): void {
  const expected = new Map<string, number>([
    ["gMPlayTrack_BGM", 0x320],
    ["gMPlayTrack_SE1", 0x0f0],
    ["gMPlayTrack_SE2", 0x2d0],
    ["gMPlayTrack_SE3", 0x050],
    ["gPokemonCryTracks", 0x140],
  ]);
  for (const [name, expectedBytes] of expected) {
    const match = symbols.match(new RegExp(`^([0-9a-f]{8})\\s+([0-9a-f]{8})\\s+B\\s+${name}$`, "m"));
    if (!match) fail(`ELF track-storage symbol ${name} changed`);
    const start = Number.parseInt(match[1]!, 16);
    const bytes = Number.parseInt(match[2]!, 16);
    if (bytes !== expectedBytes || bytes % TRACK_BYTES !== 0) fail(`ELF track-storage size ${name} changed`);
    // This proves the class without retaining a selected runtime address.
    if (start < IWRAM_START || start + bytes > IWRAM_END || start + TRACK_BYTES > 0x8000_0000) {
      fail(`ELF track-storage class ${name} is no longer signed-positive IWRAM`);
    }
  }
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const m4aC = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const constants = readFileSync(join(ROOT, "reference/pokeemerald/constants/m4a_constants.inc"), "utf8");
  const defines = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/defines.h"), "utf8");
  const linker = readFileSync(join(ROOT, "reference/pokeemerald/ld_script.ld"), "utf8");
  const playerTable = readFileSync(join(ROOT, "reference/pokeemerald/sound/music_player_table.inc"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (
    sha256(assembly) !== M4A1_SHA256 || sha256(m4aC) !== M4A_C_SHA256 ||
    sha256(internal) !== M4A_INTERNAL_SHA256 || sha256(constants) !== M4A_CONSTANTS_SHA256 ||
    sha256(defines) !== DEFINES_SHA256 || sha256(linker) !== LINKER_SHA256 ||
    sha256(playerTable) !== PLAYER_TABLE_SHA256 || sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256
  ) fail("source, linker, ELF, or ROM changed");

  const r5LoadAndContinuation = [
    "_081DD9C4:",
    "\tldrb r2, [r7, o_MusicPlayerInfo_trackCount]",
    "\tldr r5, [r7, o_MusicPlayerInfo_tracks]",
    "_081DD9C8:",
  ].join("\n");
  const continuation = [
    "_081DDA62:",
    "\tsubs r2, 0x1",
    "\tble _081DDA6C",
    "\tmovs r0, MusicPlayerTrack_size",
    "\tadds r5, r0",
    "\tbgt _081DD9C8",
    "_081DDA6C:",
  ].join("\n");
  const ordinaryOpen = "MPlayOpen(mplayInfo, gMPlayTable[i].track, gMPlayTable[i].numTracks);";
  const cryOpen = "MPlayOpen(mplayInfo, track, 2);";
  const ordinaryTracks = [
    "music_player gMPlayInfo_BGM, gMPlayTrack_BGM, NUM_TRACKS_BGM, 0",
    "music_player gMPlayInfo_SE1, gMPlayTrack_SE1, NUM_TRACKS_SE1, 1",
    "music_player gMPlayInfo_SE2, gMPlayTrack_SE2, NUM_TRACKS_SE2, 1",
    "music_player gMPlayInfo_SE3, gMPlayTrack_SE3, NUM_TRACKS_SE3, 0",
  ];
  if (
    !assembly.includes(r5LoadAndContinuation) || !assembly.includes(continuation) ||
    !assembly.includes('.include "constants/m4a_constants.inc"') ||
    !internal.includes("    struct MusicPlayerTrack *tracks;") ||
    !internal.includes("#define MAX_POKEMON_CRIES 2") ||
    !m4aC.includes("    mplayInfo->tracks = tracks;") ||
    !m4aC.includes(ordinaryOpen) || !m4aC.includes(cryOpen) ||
    !m4aC.includes("        struct MusicPlayerTrack *track = &gPokemonCryTracks[i * 2];") ||
    (m4aC.match(/\bMPlayOpen\s*\(/g) ?? []).length !== 3 ||
    !playerTable.includes("\t.equiv TRACK_SIZE, 0x50") || !ordinaryTracks.every((line) => playerTable.includes(line)) ||
    !defines.includes('#define COMMON_DATA __attribute__((section("common_data")))') ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") ||
    !linker.includes("data/*.o(.bss);") || !linker.includes("src/*.o(COMMON);")
  ) fail("continuation, complete MPlay/cry storage, or IWRAM provenance changed");
  if (parseTrackLayoutBytes(constants) !== TRACK_BYTES) fail("MusicPlayerTrack_size changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x50, 0x20, 0x2d, 0x18, 0xad, 0xdc]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled continuation changed");
  const bgt = body.readUInt16LE(4);
  const signedImm8 = (bgt & 0x80) === 0 ? bgt & 0xff : (bgt & 0xff) - 0x100;
  const decodedTarget = BODY_START + 4 + 4 + signedImm8 * 2;
  if ((bgt & 0xff00) !== 0xdc00 || decodedTarget !== 0x082d_fc00) fail("compiled bgt target changed");

  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62", "082dfca4 t _081DDA6C"]) {
    if (!symbols.includes(symbol)) fail(`ELF code symbol ${symbol} changed`);
  }
  assertTrackSymbolsAreIwram(symbols);

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1360-1362, 1443-1450", sha256: sha256(assembly) },
      musicPlayerInfo: {
        tracks: { path: "reference/pokeemerald/include/gba/m4a_internal.h", offset: 44, width: "pointer", runtimeValue: null, sha256: sha256(internal) },
        r5Origin: "MusicPlayerInfo.tracks",
      },
      musicPlayerTrack: {
        assemblerSize: { path: "reference/pokeemerald/constants/m4a_constants.inc", symbol: "MusicPlayerTrack_size", bytes: TRACK_BYTES, sha256: sha256(constants) },
        staticTableStride: { path: "reference/pokeemerald/sound/music_player_table.inc", symbol: "TRACK_SIZE", bytes: TRACK_BYTES, sha256: sha256(playerTable) },
      },
      staticMplayAndCryTrackStorage: {
        assignment: { path: "reference/pokeemerald/src/m4a.c", lines: "83-98, 565-592", musicPlayerTracksFieldAssignedBy: "MPlayOpen", sha256: sha256(m4aC) },
        allCandidateStorageClass: "IWRAM",
        selectedRuntimeTrack: null,
        runtimePointerOrAddress: null,
        linker: { path: "reference/pokeemerald/ld_script.ld", class: "IWRAM", sha256: sha256(linker) },
        commonData: { path: "reference/pokeemerald/include/gba/defines.h", section: "common_data", sha256: sha256(defines) },
      },
    },
    elf: {
      continuationEntry: "0x082dfc9e",
      stopBoundary: "0x082dfc00",
      selectedRuntimeTrack: null,
      runtimePointerOrAddress: null,
      allCandidateTrackStorageClass: "IWRAM",
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8",
      start: "0x082dfc9e",
      endExclusive: "0x082dfca4",
      bytes: body.length,
      bytesHex: "50 20 2d 18 ad dc",
      sha256: BODY_SHA256,
      decodedBgt: { condition: "GT", target: "_081DD9C8", targetAddress: "0x082dfc00" },
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      registerDataAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefillCycles: 6,
      signedAddProof: {
        inputClass: "IWRAM MusicPlayerInfo.tracks candidate",
        trackStrideBytes: TRACK_BYTES,
        resultSignedPositive: true,
        signedOverflow: false,
        bgtTaken: true,
        runtimePointerOrAddress: null,
      },
      continuationModel: "movs; adds; taken bgt = 3 halfwords * 2 + one 6-cycle refill = 12",
    },
  };
}

function assertV27ArtifactsAndReportRegenerate(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v28-v27-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v27.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v27.json")).equals(
    checkedBytes(V27_EVIDENCE, V27_EVIDENCE_SHA256),
  )) fail("v27 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v27.md")).equals(
    checkedBytes(V27_DOC, V27_DOC_SHA256),
  )) fail("v27 report does not regenerate byte-for-byte");
  for (const [name, hash] of Object.entries(V27_PACKET_HASHES) as Array<[CaseName, string]>) {
    checkedBytes(join(V27_PACKETS, `${name}.json`), hash);
  }
}

type FrozenV27Row = {
  sourceStateDigest: string;
  r2BeforeDecrement: number;
  decrementDecision: string;
  postV26FirstTrackDecrementDecisionSourceCycles: number;
  contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles: number;
  bleTakenControlTransferRefills: number;
  stopsBeforeV27Instruction: string;
};

function frozenV27SelectedRows(frozenV27: unknown): FrozenV27Row[] {
  if (
    !isRecord(frozenV27) || frozenV27.schema !== "factory-m4a-note-body-cgb4-evidence/v27" ||
    frozenV27.oracleProfile !== "battle-scene-off" || frozenV27.addressFree !== true || !Array.isArray(frozenV27.rows)
  ) fail("frozen v27 evidence identity changed");
  const rows = frozenV27.rows.map((row, index) => {
    if (!isRecord(row) || !exactKeys(row, [
      "sourceStateDigest", "r2BeforeDecrement", "decrementDecision",
      "postV26FirstTrackDecrementDecisionSourceCycles", "contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles",
      "bleTakenControlTransferRefills", "stopsBeforeV27Instruction",
    ])) fail(`frozen v27 row ${index} carries an unsupported field`);
    const result: FrozenV27Row = {
      sourceStateDigest: requireDigest(row.sourceStateDigest, `frozen v27 row ${index} digest`),
      r2BeforeDecrement: row.r2BeforeDecrement as number,
      decrementDecision: row.decrementDecision as string,
      postV26FirstTrackDecrementDecisionSourceCycles: row.postV26FirstTrackDecrementDecisionSourceCycles as number,
      contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles: row.contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles as number,
      bleTakenControlTransferRefills: row.bleTakenControlTransferRefills as number,
      stopsBeforeV27Instruction: row.stopsBeforeV27Instruction as string,
    };
    if (
      result.r2BeforeDecrement !== 10 || result.decrementDecision !== "subs-r2-1; ble-not-taken" ||
      result.postV26FirstTrackDecrementDecisionSourceCycles !== 4 ||
      result.contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles !== 832 ||
      result.bleTakenControlTransferRefills !== 0 ||
      result.stopsBeforeV27Instruction !== "movs r0, MusicPlayerTrack_size"
    ) fail(`frozen v27 row ${index} no longer selects the bounded continuation`);
    return result;
  });
  const digests = rows.map((row) => row.sourceStateDigest);
  if (rows.length !== 3 || new Set(digests).size !== rows.length) {
    fail("frozen v27 source-state join is missing, duplicate, ambiguous, or extra");
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
    "factory-m4a-note-body-cgb4-evidence-v28", "issue55-m4a-note-body-cgb4-v28", "factory-m4a-note-body-cgb4-v28",
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
  const frozenV27 = checkedJson<unknown>(V27_EVIDENCE, V27_EVIDENCE_SHA256);
  assertV27ArtifactsAndReportRegenerate();
  const frozenRows = frozenV27SelectedRows(frozenV27);
  const timing = reduceCgb4FirstTrackContinuationTiming({});
  if (!timing) fail("source-only continuation timing became malformed");
  const rows = frozenRows.map((prior) => ({
    sourceStateDigest: prior.sourceStateDigest,
    continuationDecision: timing.route,
    postV27FirstTrackContinuationSourceCycles: timing.sourceCycles,
    contiguousPrefixThroughFirstTrackContinuationSourceCycles:
      prior.contiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles + timing.sourceCycles,
    bgtTakenControlTransferRefills: timing.bgtTakenControlTransferRefills,
    stopsBeforeV28Instruction: timing.stopsBeforeInstruction,
  }));
  const added = rows.reduce((sum, row) => sum + row.postV27FirstTrackContinuationSourceCycles, 0);
  const contiguous = 5812 + added;
  if (
    rows.length !== 3 || !rows.every((row) =>
      row.contiguousPrefixThroughFirstTrackContinuationSourceCycles === 832 + timing.sourceCycles,
    ) || added !== 36 || contiguous !== 5848
  ) fail("v28 continuation coverage or pricing changed");

  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v28",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV27EvidenceSha256: V27_EVIDENCE_SHA256,
      acceptedV27DocSha256: V27_DOC_SHA256,
      acceptedV27PacketSha256: V27_PACKET_HASHES,
      v27EvidenceAndReportRegenerateByteForByte: true,
      v27EvidenceReportAndPacketsRetainedByteForByte: true,
    },
    capture: {
      boundary: "source-only _081DDA62 non-exit continuation through bgt _081DD9C8; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "r2BeforeDecrement serialization", "track pointer", "runtime address", "track count",
        "track index", "track identity", "next-track flags", "channel", "frame", "duration", "condition flags",
        "wider state", "_081DD9C8 ldrb and subsequent body", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV27SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v27-selected-row",
        "unexpected-frozen-v27-r2-or-route", "unsupported-runtime-field", "unexpected-continuation-boundary",
      ],
    },
    coverage: {
      frozenV27SelectedRows: 3,
      sourceOnlyContinuationRows: rows.length,
      bgtTakenRows: rows.length,
      bgtNotTakenRows: 0,
      postV27FirstTrackContinuationSourceCycles: added,
      acceptedContiguousPrefixThroughFirstTrackDecrementDecisionSourceCycles: 5812,
      contiguousPrefixThroughFirstTrackContinuationSourceCycles: contiguous,
      sequentialThumbHalfwords: rows.length * timing.sequentialThumbHalfwords,
      registerDataAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: rows.length * timing.bgtTakenControlTransferRefills,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV27ArtifactsReadOnly: true,
      frozenV27ArtifactsAreNotProductionImports: noProductionImports,
      v28RuntimeCaptureCount: 0,
      r2BeforeDecrement: null,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      nextTrackFlags: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      widerState: null,
      nextTrackBody: null,
      subsequentLoopWork: null,
      serviceCost: null,
      constructionClock: null,
      controller: null,
      presentation: null,
      unsupportedBarrierAdded: false,
    },
    verdict: `Source-only v28 freezes v27 evidence/report/packets byte-for-byte and joins only the same three sourceStateDigest rows. Each frozen row validates the non-exit continuation, but this receipt retains no predecessor scalar. Pinned source/ELF/ROM plus the complete static MPlay/cry IWRAM track-storage class prove movs MusicPlayerTrack_size; adds r5, r0 yields signed-positive, non-overflowing flags and takes bgt _081DD9C8. Three halfwords plus the taken refill cost ${timing.sourceCycles} cycles per row, ${added} aggregate, advancing the bounded prefix to ${contiguous}; it stops before _081DD9C8's ldrb flags.` ,
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  const rows: any[] = evidence.rows as any[];
  const tableRows = rows.map((row) =>
    `| \`${row.sourceStateDigest.slice(0, 12)}…\` | \`${row.continuationDecision}\` | ${row.postV27FirstTrackContinuationSourceCycles} | \`${row.stopsBeforeV28Instruction}\` |`,
  );
  return [
    "# Issue #55 — CGB4 first-track non-exit continuation v28",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v28.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, and source-only. v28 freezes v27 evidence, report, and all three packets byte-for-byte, verifies the v27 receipt regenerates byte-for-byte, and joins only its same three selected `sourceStateDigest` rows. It captures no oracle/runtime field and does not serialize v27's `r2` scalar again.",
    "",
    "Frozen v27 has exactly three selected rows on the pinned non-exit continuation. v28 retains neither the predecessor scalar nor an actual count, pointer, index, identity, flag, or channel. It validates the frozen selection, strips it back to only the digest association, and prices only the fixed successor through the branch.",
    "",
    "Pinned source proves `r5` comes from `MusicPlayerInfo.tracks`. The complete static MPlay table plus cry initialization assign that field only to the five backing track allocations; source/linker and ELF independently place every candidate allocation in IWRAM. The assembler layout and compiled immediate both prove `MusicPlayerTrack_size = 80`. Therefore adding one track stays signed-positive and cannot overflow; `adds r5, r0` sets the taken `bgt` condition without identifying the actual track address.",
    "",
    "Source/ELF/exact-ROM close exactly `0x082dfc9e..0x082dfca4`: `movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8`. Exact ROM bytes are `50 20 2d 18 ad dc`; the decoded `GT` branch targets `_081DD9C8`. The three register-only Thumb halfwords cost **3×2 = 6 cycles** and the taken branch adds one **6-cycle** refill: **12 cycles per row**. No data-access premium applies.",
    "",
    "| frozen selected sourceStateDigest | observed source-only continuation | cycles | stop boundary |",
    "| --- | --- | ---: | --- |",
    ...tableRows,
    "",
    `The aggregate source prefix advances from **5,812** to **${c.contiguousPrefixThroughFirstTrackContinuationSourceCycles} cycles** (**${c.postV27FirstTrackContinuationSourceCycles}** added). It stops before \`_081DD9C8\`'s \`ldrb r0, [r5, o_MusicPlayerTrack_flags]\`; next flags and all subsequent body, broader MPlay/controller/presentation, service/arbitration, and construction-clock wiring remain null. Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.`,
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v28.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v28.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v28.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
