import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const V39_EVIDENCE_SHA256 = "86286add231fea7b33ddbd0b667dd53efd4831582d8aed6e3b87e3a70dcdc626";
const V39_DOC_SHA256 = "14fd2f23976dca78ce5f23f4bf3a9b0ae5ef13d050707239d1c90b5363b414e1";
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
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;
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
const V39_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v39.json");
const V39_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v39.md");
const V39_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v39");
const V37_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v37");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v40.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v40.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc9e;
const BODY_END = 0x082d_fca4;
const IWRAM_START = 0x0300_0000;
const IWRAM_END = 0x0300_8000;
const TRACK_BYTES = 80;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v40: ${message}`);
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

export type Cgb4FourthTrackContinuationTiming = Readonly<{
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
 * Price only v39's fixed positive successor. Empty input deliberately strips
 * the predecessor r2 scalar and rejects any runtime state for this source-only
 * continuation receipt.
 */
export function reduceCgb4FourthTrackContinuationTiming(state: unknown): Cgb4FourthTrackContinuationTiming | null {
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
  let bytes = 0;
  for (const field of constants.slice(start, end).matchAll(/^\tstruct_field [^,]+, (\d+)$/gm)) bytes += Number(field[1]);
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

  const r5LoadAndLoopHead = [
    "_081DD9C4:",
    "\tldrb r2, [r7, o_MusicPlayerInfo_trackCount]",
    "\tldr r5, [r7, o_MusicPlayerInfo_tracks]",
    "_081DD9C8:",
  ].join("\n");
  const sourceContinuation = [
    "_081DDA62:",
    "\tsubs r2, 0x1",
    "\tble _081DDA6C",
    "\tmovs r0, MusicPlayerTrack_size",
    "\tadds r5, r0",
    "\tbgt _081DD9C8",
    "_081DDA6C:",
  ].join("\n");
  const ordinaryTracks = [
    "music_player gMPlayInfo_BGM, gMPlayTrack_BGM, NUM_TRACKS_BGM, 0",
    "music_player gMPlayInfo_SE1, gMPlayTrack_SE1, NUM_TRACKS_SE1, 1",
    "music_player gMPlayInfo_SE2, gMPlayTrack_SE2, NUM_TRACKS_SE2, 1",
    "music_player gMPlayInfo_SE3, gMPlayTrack_SE3, NUM_TRACKS_SE3, 0",
  ];
  if (
    !assembly.includes(r5LoadAndLoopHead) || !assembly.includes(sourceContinuation) ||
    !assembly.includes('.include "constants/m4a_constants.inc"') ||
    !internal.includes("    struct MusicPlayerTrack *tracks;") ||
    !internal.includes("#define MAX_POKEMON_CRIES 2") ||
    !m4aC.includes("    mplayInfo->tracks = tracks;") ||
    !m4aC.includes("MPlayOpen(mplayInfo, gMPlayTable[i].track, gMPlayTable[i].numTracks);") ||
    !m4aC.includes("MPlayOpen(mplayInfo, track, 2);") ||
    !m4aC.includes("        struct MusicPlayerTrack *track = &gPokemonCryTracks[i * 2];") ||
    (m4aC.match(/\bMPlayOpen\s*\(/g) ?? []).length !== 3 ||
    !playerTable.includes("\t.equiv TRACK_SIZE, 0x50") || !ordinaryTracks.every((line) => playerTable.includes(line)) ||
    !defines.includes('#define COMMON_DATA __attribute__((section("common_data")))') ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") ||
    !linker.includes("data/*.o(.bss);") || !linker.includes("src/*.o(COMMON);")
  ) fail("fourth-track continuation, complete MPlay/cry storage, or IWRAM provenance changed");
  if (parseTrackLayoutBytes(constants) !== TRACK_BYTES) fail("MusicPlayerTrack_size changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x50, 0x20, 0x2d, 0x18, 0xad, 0xdc]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled fourth-track continuation changed");
  const bgt = body.readUInt16LE(4);
  const signedImm8 = (bgt & 0x80) === 0 ? bgt & 0xff : (bgt & 0xff) - 0x100;
  const decodedTarget = BODY_START + 4 + 4 + signedImm8 * 2;
  if ((bgt & 0xff00) !== 0xdc00 || decodedTarget !== 0x082d_fc00) fail("compiled bgt loop target changed");

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
      assembly: {
        path: "reference/pokeemerald/src/m4a_1.s",
        lines: "1360-1362, 1443-1450",
        continuationSourceAddress: "_081DDA66",
        predecessorSourceAddress: "_081DDA62",
        sha256: sha256(assembly),
      },
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
      continuationSourceAddress: "_081DDA66",
      continuationEntry: "0x082dfc9e",
      loopHead: "0x082dfc00",
      stopBoundary: "0x082dfc00",
      selectedRuntimeTrack: null,
      runtimePointerOrAddress: null,
      allCandidateTrackStorageClass: "IWRAM",
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8",
      sourceAddress: "_081DDA66",
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

function assertV39ArtifactsAndReportRegenerate(): void {
  const expectedEvidence = checkedBytes(V39_EVIDENCE, V39_EVIDENCE_SHA256);
  const expectedDoc = checkedBytes(V39_DOC, V39_DOC_SHA256);
  for (const name of CASES) {
    checkedBytes(join(V39_PACKETS, `${name}.json`), V39_PACKET_HASHES[name]);
    checkedBytes(join(V37_PACKETS, `${name}.json`), V37_PACKET_HASHES[name]);
  }
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v40-v39-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v39.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v39.json")).equals(expectedEvidence)) {
    fail("v39 evidence does not regenerate byte-for-byte");
  }
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v39.md")).equals(expectedDoc)) {
    fail("v39 report does not regenerate byte-for-byte");
  }
}

type FrozenV39Row = { sourceStateDigest: string };

function frozenV39SelectedRows(frozenV39: unknown): FrozenV39Row[] {
  if (
    !isRecord(frozenV39) || frozenV39.schema !== "factory-m4a-note-body-cgb4-evidence/v39" ||
    frozenV39.oracleProfile !== "battle-scene-off" || frozenV39.addressFree !== true || !Array.isArray(frozenV39.rows)
  ) fail("frozen v39 evidence identity changed");
  const rows = frozenV39.rows.map((row, index) => {
    const expected = [
      "sourceStateDigest", "r2BeforeDecrement", "fourthTrackDecrementDecision",
      "postV38FourthTrackDecrementDecisionSourceCycles", "contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles",
      "bleTakenControlTransferRefills", "stopsBeforeV39Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail(`frozen v39 row ${index} carries an unsupported field`);
    const sourceStateDigest = requireDigest(row.sourceStateDigest, `frozen v39 row ${index} digest`);
    if (
      requireU32(row.r2BeforeDecrement, `frozen v39 row ${index} r2`) !== 7 ||
      row.fourthTrackDecrementDecision !== "subs-r2-1; ble-not-taken" ||
      row.postV38FourthTrackDecrementDecisionSourceCycles !== 4 ||
      row.contiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles !== 940 ||
      row.bleTakenControlTransferRefills !== 0 ||
      row.stopsBeforeV39Instruction !== "movs r0, MusicPlayerTrack_size"
    ) fail(`frozen v39 row ${index} no longer selects the positive fourth-track continuation`);
    return { sourceStateDigest };
  });
  if (
    rows.length !== SELECTED_DIGESTS.length ||
    !rows.every((row, index) => row.sourceStateDigest === SELECTED_DIGESTS[index])
  ) fail("frozen v39 source-state join is missing, reordered, duplicate, ambiguous, or extra");
  return rows;
}

function productionReceiptContainment(): boolean {
  const fragments = [
    "factory-m4a-note-body-cgb4-evidence-v37", "issue55-m4a-note-body-cgb4-v37", "factory-m4a-note-body-cgb4-v37",
    "factory-m4a-note-body-cgb4-evidence-v38", "issue55-m4a-note-body-cgb4-v38", "factory-m4a-note-body-cgb4-v38",
    "factory-m4a-note-body-cgb4-evidence-v39", "issue55-m4a-note-body-cgb4-v39", "factory-m4a-note-body-cgb4-v39",
    "factory-m4a-note-body-cgb4-evidence-v40", "issue55-m4a-note-body-cgb4-v40", "factory-m4a-note-body-cgb4-v40",
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
  const frozenV39 = checkedJson(V39_EVIDENCE, V39_EVIDENCE_SHA256);
  assertV39ArtifactsAndReportRegenerate();
  const frozenRows = frozenV39SelectedRows(frozenV39);
  const timing = reduceCgb4FourthTrackContinuationTiming({});
  if (!timing) fail("source-only fourth-track continuation timing became malformed");
  const rows = frozenRows.map((prior) => ({
    sourceStateDigest: prior.sourceStateDigest,
    continuationDecision: timing.route,
    postV39FourthTrackContinuationSourceCycles: timing.sourceCycles,
    contiguousPrefixThroughFourthTrackContinuationSourceCycles: 940 + timing.sourceCycles,
    bgtTakenControlTransferRefills: timing.bgtTakenControlTransferRefills,
    stopsBeforeV40Instruction: timing.stopsBeforeInstruction,
  }));
  const added = rows.reduce((sum, row) => sum + row.postV39FourthTrackContinuationSourceCycles, 0);
  const contiguous = 6136 + added;
  if (
    rows.length !== 3 || added !== 36 || contiguous !== 6172 ||
    !rows.every((row) =>
      row.contiguousPrefixThroughFourthTrackContinuationSourceCycles === 952 &&
      row.bgtTakenControlTransferRefills === 1 &&
      row.stopsBeforeV40Instruction === "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    )
  ) fail("v39 frozen state or v40 continuation pricing changed; refuse to fit a different route");

  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v40",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV39EvidenceSha256: V39_EVIDENCE_SHA256,
      acceptedV39DocSha256: V39_DOC_SHA256,
      acceptedV39PacketSha256: V39_PACKET_HASHES,
      acceptedInheritedV37PacketSha256: V37_PACKET_HASHES,
      v39EvidenceAndReportRegenerateByteForByte: true,
      v39EvidenceReportAndAllOffPacketsRetainedByteForByte: true,
    },
    capture: {
      boundary: "source-only fourth-track positive continuation _081DDA66.._081DDA6C through bgt _081DD9C8; no new runtime capture",
      scalars: [],
      excluded: [
        "new runtime or oracle fields", "r2BeforeDecrement serialization", "track pointer", "pointer", "address", "runtime address",
        "track count", "track index", "track identity", "fifth-track flags load", "any fifth-track decision or body",
        "channel", "frame", "duration", "condition flags", "wider loop work", "_081DDA6C exit successor body", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV39SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "reordered", "ambiguous", "extra", "non-v39-selected-row",
        "unexpected-frozen-v39-r2-or-route", "unsupported-runtime-field", "unexpected-continuation-boundary",
      ],
    },
    coverage: {
      frozenV39SelectedRows: 3,
      sourceOnlyContinuationRows: rows.length,
      bgtTakenRows: rows.length,
      bgtNotTakenRows: 0,
      postV39FourthTrackContinuationSourceCycles: added,
      acceptedContiguousPrefixThroughFourthTrackDecrementDecisionSourceCycles: 6136,
      contiguousPrefixThroughFourthTrackContinuationSourceCycles: contiguous,
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
      frozenV39ArtifactsReadOnly: true,
      inheritedV37PacketsRetainedReadOnly: true,
      frozenV39ArtifactsAreNotProductionImports: noProductionImports,
      v40RuntimeCaptureCount: 0,
      r2BeforeDecrement: null,
      pointer: null,
      trackPointer: null,
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
      fifthTrackFlags: null,
      fifthTrackDecision: null,
      fifthTrackBody: null,
      exitSuccessor: null,
      exitBody: null,
      widerLoop: null,
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
    verdict: `Source-only v40 freezes v39 evidence/report, its fresh OFF packets, and inherited v37 OFF packets byte-for-byte, then joins only the same three sourceStateDigest rows. It strips v39's r2 scalar. Pinned source/ELF/exact-ROM prove the positive fourth-track _081DDA66 continuation adds MusicPlayerTrack_size to IWRAM r5 and takes bgt _081DD9C8. Three halfwords plus the taken refill cost ${timing.sourceCycles} cycles per row, ${added} aggregate, advancing the bounded prefix from 6136 to ${contiguous}; it stops before the fifth-track flags load.`,
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  const rows = evidence.rows as Array<Record<string, unknown>>;
  return [
    "# Issue #55 — CGB4 fourth-track positive continuation v40",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v40.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, and source-only. v40 freezes v39 evidence/report, all three v39 OFF packets, and the inherited v37 OFF packets byte-for-byte; it also verifies v39 regenerates byte-for-byte. It joins only the same three selected `sourceStateDigest` rows, captures no oracle/runtime field, and strips v39's `r2` scalar.",
    "",
    "Frozen v39 has exactly three selected fourth-track non-exit rows. v40 retains neither the predecessor scalar nor an actual pointer, address, count, index, identity, flag, channel, frame, duration, condition, or body. It prices only the fixed positive successor, source-relative `_081DDA66.._081DDA6C`, through its branch back to the loop head.",
    "",
    "Pinned source proves `r5` comes from `MusicPlayerInfo.tracks`. The complete static MPlay table plus cry initialization assign that field only to five backing track allocations; source/linker and ELF independently place every candidate allocation in IWRAM. The assembler layout and compiled immediate both prove `MusicPlayerTrack_size = 80`. Therefore `adds r5, r0` stays signed-positive and non-overflowing, sets the taken `bgt` condition, and does so without identifying an actual track address.",
    "",
    "Source/ELF/exact-ROM close exactly source `_081DDA66.._081DDA6C` / linked `0x082dfc9e..0x082dfca4`: `movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8`. Exact ROM bytes are `50 20 2d 18 ad dc`; decoded `GT` targets `_081DD9C8` at `0x082dfc00`. The three register-only Thumb halfwords cost **3×2 = 6 cycles** and the taken branch adds one **6-cycle** refill: **12 cycles per row**. No data-access premium applies.",
    "",
    "| frozen selected sourceStateDigest | source-only continuation | cycles | stop boundary |",
    "| --- | --- | ---: | --- |",
    ...rows.map((row) => `| \`${String(row.sourceStateDigest).slice(0, 12)}…\` | \`${row.continuationDecision}\` | ${row.postV39FourthTrackContinuationSourceCycles} | \`${row.stopsBeforeV40Instruction}\` |`),
    "",
    `The aggregate source prefix advances from **6,136** to **${coverage.contiguousPrefixThroughFourthTrackContinuationSourceCycles} cycles** (**${coverage.postV39FourthTrackContinuationSourceCycles}** added). It stops before \`_081DD9C8\`'s fifth-track \`ldrb r0, [r5, o_MusicPlayerTrack_flags]\`; no fifth-track flag load, decision, or body is claimed. Exit body, wider loop, MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain null or untouched.`,
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v40.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v40.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v40.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
