import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V36_EVIDENCE_SHA256 = "58dc2bc3a5b9973684c6c9bf015e3c2e449d15da6fa446c6c09c555b88938410";
const V36_DOC_SHA256 = "847569d4455a7410eb879db3770b2eb5cac61300f00f9b02036ed068703b188e";
const V37_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "4dad511aee6b508723c2ddd5ca283756ca17435c23388ecf374273bbcf86a8c4",
  liliana: "8afcc0bad8bd77c9ae28d442a9a496101af1321c4b71e54b5bb49160197d7a9d",
  "factory-varied": "6f202501970fd31eddb94f489d2e3360fde3ec78d90df6ab4cbdba64f5d81e67",
};
const V37_PACKET_REPEAT_HASHES = V37_PACKET_HASHES;
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const M4A_CONSTANTS_SHA256 = "36a0f4b5be5a777886350810b1aec40364557f2e021352d67d8ae604a6a0a9fd";
const DEFINES_SHA256 = "528c5983bf23f3b12036e9f7ed20e482b1dbe15e0198ec6bb10292d413f68644";
const LINKER_SHA256 = "ea3df8331ffacc75e1377b2d2f2d8ec6530f6436788b812603ba3af1a964cfb0";
const PLAYER_TABLE_SHA256 = "babb0eb8acce75ada42c2747ca0ef09825135d1c85b46254b1f44520b1a57a36";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const FLAGS_BODY_SHA256 = "3a41edf45b6169cf3cdcf4ee298a61c576e224d16df2d3f31aa2dba9ec8e6c66";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V36_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v36.json");
const V36_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v36.md");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v37");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v37.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v37.md");
const ROM_BASE = 0x0800_0000;
const FLAGS_START = 0x082d_fc00;
const FLAGS_END = 0x082d_fc08;
const IWRAM_START = 0x0300_0000;
const IWRAM_END = 0x0300_8000;
const TRACK_BYTES = 80;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v37: ${message}`);
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

function checkedJson<T>(path: string, hash: string): T {
  return JSON.parse(checkedBytes(path, hash).toString("utf8")) as T;
}

function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} must be a SHA-256 digest`);
  return value;
}

function requireU8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 0xff) fail(`${label} must be a u8`);
  return value;
}

export type Cgb4FourthTrackFlagsTiming = Readonly<{
  route: "MPT_FLG_EXIST-set-beq-not-taken" | "MPT_FLG_EXIST-clear-beq-taken";
  fourthTrackFlags: number;
  sequentialThumbHalfwords: 4;
  iwramByteLoads: 1;
  iwramDataAccessPremiumCycles: 0;
  beqTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 8 | 14;
  stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG" | "_081DDA62: subs r2, 0x1";
}>;

/** Price only the fourth-track EXIST test; all other state is rejected. */
export function reduceCgb4FourthTrackFlagsTiming(state: unknown): Cgb4FourthTrackFlagsTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["fourthTrackFlags"])) return null;
  let fourthTrackFlags: number;
  try {
    fourthTrackFlags = requireU8(state.fourthTrackFlags, "fourthTrackFlags");
  } catch {
    return null;
  }
  const existSet = (fourthTrackFlags & 0x80) !== 0;
  return Object.freeze(existSet ? {
    route: "MPT_FLG_EXIST-set-beq-not-taken",
    fourthTrackFlags,
    sequentialThumbHalfwords: 4,
    iwramByteLoads: 1,
    iwramDataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 0,
    takenControlTransferRefills: 0,
    sourceCycles: 8,
    stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
  } : {
    route: "MPT_FLG_EXIST-clear-beq-taken",
    fourthTrackFlags,
    sequentialThumbHalfwords: 4,
    iwramByteLoads: 1,
    iwramDataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 14,
    stopsBeforeInstruction: "_081DDA62: subs r2, 0x1",
  }) as Cgb4FourthTrackFlagsTiming;
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

  const flagsRoute = [
    "_081DD9C8:",
    "\tldrb r0, [r5, o_MusicPlayerTrack_flags]",
    "\tmovs r1, 0x80",
    "\ttst r1, r0",
    "\tbeq _081DDA62",
  ].join("\n");
  const r5Load = [
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
  const ordinaryTracks = [
    "music_player gMPlayInfo_BGM, gMPlayTrack_BGM, NUM_TRACKS_BGM, 0",
    "music_player gMPlayInfo_SE1, gMPlayTrack_SE1, NUM_TRACKS_SE1, 1",
    "music_player gMPlayInfo_SE2, gMPlayTrack_SE2, NUM_TRACKS_SE2, 1",
    "music_player gMPlayInfo_SE3, gMPlayTrack_SE3, NUM_TRACKS_SE3, 0",
  ];
  if (
    !assembly.includes(flagsRoute) || !assembly.includes(r5Load) || !assembly.includes(continuation) ||
    !assembly.includes('.include "constants/m4a_constants.inc"') ||
    !internal.includes("    struct MusicPlayerTrack *tracks;") || !internal.includes("#define MPT_FLG_EXIST  0x80") ||
    !internal.includes("#define MAX_POKEMON_CRIES 2") || !m4aC.includes("    mplayInfo->tracks = tracks;") ||
    !m4aC.includes("MPlayOpen(mplayInfo, gMPlayTable[i].track, gMPlayTable[i].numTracks);") ||
    !m4aC.includes("MPlayOpen(mplayInfo, track, 2);") ||
    !m4aC.includes("        struct MusicPlayerTrack *track = &gPokemonCryTracks[i * 2];") ||
    (m4aC.match(/\bMPlayOpen\s*\(/g) ?? []).length !== 3 ||
    !playerTable.includes("\t.equiv TRACK_SIZE, 0x50") || !ordinaryTracks.every((line) => playerTable.includes(line)) ||
    !defines.includes('#define COMMON_DATA __attribute__((section("common_data"))') ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") ||
    !linker.includes("data/*.o(.bss);") || !linker.includes("src/*.o(COMMON);") ||
    parseTrackLayoutBytes(constants) !== TRACK_BYTES
  ) fail("fourth-track flags route, storage provenance, or MusicPlayerTrack layout changed");

  const body = rom.subarray(FLAGS_START - ROM_BASE, FLAGS_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x28, 0x78, 0x80, 0x21, 0x01, 0x42, 0x48, 0xd0]);
  if (!body.equals(expectedBytes) || sha256(body) !== FLAGS_BODY_SHA256) fail("compiled fourth-track flags route changed");
  const beq = body.readUInt16LE(6);
  const signedImm8 = (beq & 0x80) === 0 ? beq & 0xff : (beq & 0xff) - 0x100;
  const decodedTarget = FLAGS_START + 6 + 4 + signedImm8 * 2;
  if ((beq & 0xff00) !== 0xd000 || decodedTarget !== 0x082d_fc9a) fail("compiled beq target changed");

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
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1360-1367, 1443-1448", sha256: sha256(assembly) },
      musicPlayerInfo: {
        tracks: { path: "reference/pokeemerald/include/gba/m4a_internal.h", offset: 44, width: "pointer", runtimeValue: null, sha256: sha256(internal) },
        r5Origin: "MusicPlayerInfo.tracks",
      },
      musicPlayerTrack: {
        flagsOffset: 0,
        existMask: 0x80,
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
      flagsEntry: "0x082dfc00",
      stopBoundary: "0x082dfc08",
      absentSuccessor: "0x082dfc9a",
      selectedRuntimeTrack: null,
      runtimePointerOrAddress: null,
      allCandidateTrackStorageClass: "IWRAM",
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "ldrb flags; movs MPT_FLG_EXIST; tst; beq _081DDA62",
      start: "0x082dfc00",
      endExclusive: "0x082dfc08",
      bytes: body.length,
      bytesHex: "28 78 80 21 01 42 48 d0",
      sha256: FLAGS_BODY_SHA256,
      decodedBeq: { condition: "EQ", target: "_081DDA62", targetAddress: "0x082dfc9a" },
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      iwramByteLoads: 1,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefillCycles: 6,
      existSetModel: "ldrb; movs; tst; non-taken beq = 4 halfwords * 2 = 8",
      existClearModel: "ldrb; movs; tst; taken beq = 4 halfwords * 2 + one 6-cycle refill = 14",
      fourthTrackPointerBound: "r5 = MusicPlayerInfo.tracks + (captured track index + 3) * MusicPlayerTrack_size; selector only",
    },
  };
}

function assertV36ArtifactsAndReportRegenerate(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v37-v36-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v36.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v36.json")).equals(checkedBytes(V36_EVIDENCE, V36_EVIDENCE_SHA256))) fail("v36 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v36.md")).equals(checkedBytes(V36_DOC, V36_DOC_SHA256))) fail("v36 report does not regenerate byte-for-byte");
}

function frozenV36SelectedRows(frozenV36: unknown): Array<{ sourceStateDigest: string; contiguous: number }> {
  if (!isRecord(frozenV36) || frozenV36.schema !== "factory-m4a-note-body-cgb4-evidence/v36" || frozenV36.oracleProfile !== "battle-scene-off" || frozenV36.addressFree !== true || !Array.isArray(frozenV36.rows)) fail("frozen v36 evidence identity changed");
  const rows = frozenV36.rows.map((row, index) => {
    const expected = [
      "sourceStateDigest", "continuationDecision", "postV35ThirdTrackContinuationSourceCycles",
      "contiguousPrefixThroughThirdTrackContinuationSourceCycles", "bgtTakenControlTransferRefills", "stopsBeforeV36Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail(`frozen v36 row ${index} carries an unsupported field`);
    const digest = requireDigest(row.sourceStateDigest, `frozen v36 row ${index} digest`);
    if (
      row.continuationDecision !== "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8" ||
      row.postV35ThirdTrackContinuationSourceCycles !== 12 ||
      row.contiguousPrefixThroughThirdTrackContinuationSourceCycles !== 916 ||
      row.bgtTakenControlTransferRefills !== 1 ||
      row.stopsBeforeV36Instruction !== "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]"
    ) fail(`frozen v36 row ${index} boundary changed`);
    return { sourceStateDigest: digest, contiguous: 916 };
  });
  if (rows.length !== 3 || new Set(rows.map((row) => row.sourceStateDigest)).size !== rows.length) fail("frozen v36 source-state join changed");
  return rows;
}

function loadPackets(selected: ReadonlySet<string>): Map<string, number> {
  const result = new Map<string, number>();
  for (const name of CASES) {
    const packet = checkedJson<unknown>(join(PACKETS, `${name}.json`), V37_PACKET_HASHES[name]);
    if (
      !isRecord(packet) || !exactKeys(packet, ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"]) ||
      packet.schema !== "factory-m4a-note-body-cgb4-probe/v37" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" ||
      typeof packet.sourceFunction !== "string" || packet.sourceFunction.length === 0 || packet.joinKey !== "sourceStateDigest" ||
      packet.captureBoundary !== "fourth-track-loop-post-_081DD9C8-ldrb-r0-before-movs-MPT_FLG_EXIST-decision" ||
      packet.addressFree !== true || !Array.isArray(packet.observations) || packet.observations.length !== COUNTS[name]
    ) fail(`${name} packet identity changed`);
    if (V37_PACKET_HASHES[name] !== V37_PACKET_REPEAT_HASHES[name]) fail(`${name} packet serial repeat changed`);
    for (const [index, row] of packet.observations.entries()) {
      if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "fourthTrackFlags"])) fail(`${name} packet row ${index} widened`);
      const key = requireDigest(row.sourceStateDigest, `${name} row ${index}`);
      const scalar = requireU8(row.fourthTrackFlags, `${name} row ${index} fourthTrackFlags`);
      if (!selected.has(key) || result.has(key)) fail(`${name} packet key mismatched, duplicated, or extra`);
      result.set(key, scalar);
    }
  }
  if (result.size !== selected.size) fail("packets missed or ambiguously joined a v36 row");
  return result;
}

function productionContainment(): boolean {
  const fragments = [
    "factory-m4a-note-body-cgb4-evidence-v36", "issue55-m4a-note-body-cgb4-v36", "factory-m4a-note-body-cgb4-v36",
    "factory-m4a-note-body-cgb4-evidence-v37", "issue55-m4a-note-body-cgb4-v37", "factory-m4a-note-body-cgb4-v37",
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
  const frozenV36 = checkedJson<unknown>(V36_EVIDENCE, V36_EVIDENCE_SHA256);
  assertV36ArtifactsAndReportRegenerate();
  const frozenRows = frozenV36SelectedRows(frozenV36);
  const packetValues = loadPackets(new Set(frozenRows.map((row) => row.sourceStateDigest)));
  const rows = frozenRows.map((prior) => {
    const timing = reduceCgb4FourthTrackFlagsTiming({ fourthTrackFlags: packetValues.get(prior.sourceStateDigest) });
    if (!timing) fail("observed fourth-track EXIST route became malformed");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      fourthTrackFlags: timing.fourthTrackFlags,
      fourthTrackExistDecision: timing.route,
      postV36FourthTrackExistDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFourthTrackExistDecisionSourceCycles: prior.contiguous + timing.sourceCycles,
      beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
      stopsBeforeV37Instruction: timing.stopsBeforeInstruction,
    };
  });
  const added = rows.reduce((sum, row) => sum + row.postV36FourthTrackExistDecisionSourceCycles, 0);
  const contiguous = 6064 + added;
  const sourceRoutePricing = {
    existSetSourceCycles: reduceCgb4FourthTrackFlagsTiming({ fourthTrackFlags: 0x80 })!.sourceCycles,
    existClearSourceCycles: reduceCgb4FourthTrackFlagsTiming({ fourthTrackFlags: 0x00 })!.sourceCycles,
  };
  const noProductionImports = productionContainment();
  if (
    rows.length !== 3 || added !== rows.reduce((sum, row) => sum + row.postV36FourthTrackExistDecisionSourceCycles, 0) ||
    !rows.every((row, index) => row.contiguousPrefixThroughFourthTrackExistDecisionSourceCycles === frozenRows[index]!.contiguous + row.postV36FourthTrackExistDecisionSourceCycles) ||
    contiguous !== 6088
  ) fail("v37 fourth-track coverage or pricing changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v37",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV36EvidenceSha256: V36_EVIDENCE_SHA256,
      acceptedV36DocSha256: V36_DOC_SHA256,
      v36EvidenceAndReportRegenerateByteForByte: true,
      v36EvidenceAndReportRetainedByteForByte: true,
      v37PacketSha256: V37_PACKET_HASHES,
      v37PacketRepeatSha256: V37_PACKET_REPEAT_HASHES,
      v37PacketRepeatIdentity: true,
      v37FreshSerialRunsPerCase: 2,
    },
    capture: {
      boundary: "fourth-track loop post-_081DD9C8 ldrb r0 flags, before movs r1, MPT_FLG_EXIST",
      scalars: ["fourthTrackFlags"],
      packetObservationExactKeys: ["sourceStateDigest", "fourthTrackFlags"],
      excluded: [
        "pointer", "address", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration",
        "condition flags", "wider state", "third-track flags", "mask/body after _081DD9D0", "absent successor body", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV36SelectedRows: 3,
      joinedRows: rows.length,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v36-selected-row", "unsupported-packet-field", "source-operand-out-of-range", "unexpected-observed-route", "unexpected-fourth-iteration"],
    },
    coverage: {
      frozenV36SelectedRows: 3,
      packetRowsByCase: COUNTS,
      fourthTrackFlagsRows: rows.length,
      fourthTrackFlagsValues: [...new Set(rows.map((row) => row.fourthTrackFlags))].sort((a, b) => a - b),
      existSetRows: rows.filter((row) => row.fourthTrackExistDecision === "MPT_FLG_EXIST-set-beq-not-taken").length,
      existClearRows: rows.filter((row) => row.fourthTrackExistDecision === "MPT_FLG_EXIST-clear-beq-taken").length,
      postV36FourthTrackExistDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughThirdTrackContinuationSourceCycles: 6064,
      contiguousPrefixThroughFourthTrackExistDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: rows.length * 4,
      iwramByteLoads: rows.length,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: rows.reduce((sum, row) => sum + row.beqTakenControlTransferRefills, 0),
      sourceRoutePricing,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV36ArtifactsReadOnly: true,
      frozenV36ArtifactsAreNotProductionImports: noProductionImports,
      v37FreshPacketsAddressFree: true,
      v37RuntimeCaptureCount: rows.length,
      fourthTrackFlags: "address-free scalar only",
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
      maskBody: null,
      absentSuccessorBody: null,
      subsequentLoopWork: null,
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
    verdict: `Two fresh, serially byte-identical Battle Scene OFF packet sets retain only sourceStateDigest and fourthTrackFlags for v36's three selected rows. The source/ELF/exact-ROM route prices EXIST-set at ${sourceRoutePricing.existSetSourceCycles} cycles and EXIST-clear at ${sourceRoutePricing.existClearSourceCycles} cycles; only the observed selected-row routes are claimed. The aggregate prefix advances from 6064 to ${contiguous} cycles and stops before _081DD9D0's mask/body or the absent successor when selected by a clear flag.`,
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, any>;
  const rows = evidence.rows as Array<Record<string, any>>;
  const pricing = coverage.sourceRoutePricing as Record<string, number>;
  return [
    "# Issue #55 — CGB4 fourth-track MPT_FLG_EXIST decision v37",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v37.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive evidence. v37 freezes v36 evidence and report byte-for-byte, verifies the v36 receipt regenerates byte-for-byte, and joins only v36's same three selected `sourceStateDigest` rows. Two fresh serial packet sets are byte-identical; every observation contains exactly `sourceStateDigest` plus the address-free `fourthTrackFlags` scalar.",
    "",
    "The fresh probe carries the established callback association and uses a live-only pointer-bounded fourth-iteration check (`r7/r5` plus the 80-byte stride). It does not emit the pointer, count, index, identity, or any wider runtime state. The fourth-track flags byte is captured after `ldrb r0, [r5, o_MusicPlayerTrack_flags]` and before `movs r1, MPT_FLG_EXIST`.",
    "",
    `Source/ELF/exact-ROM close \`_081DD9C8.._081DD9D0\`: \`ldrb r0,[r5,flags]; movs r1,0x80; tst r1,r0; beq _081DDA62\`, exact bytes \`28 78 80 21 01 42 48 d0\`. The source-pricer covers both branches: EXIST-set/non-taken \`beq\` is **${pricing.existSetSourceCycles} cycles**; EXIST-clear/taken \`beq\` is **${pricing.existClearSourceCycles} cycles** including the 6-cycle refill. The rows below claim only the observed route for each selected digest.`,
    "",
    "| frozen selected sourceStateDigest | fourth-track flags | route | cycles/row | stop boundary |",
    "| --- | ---: | --- | ---: | --- |",
    ...rows.map((row) => `| \`${row.sourceStateDigest.slice(0, 12)}…\` | 0x${Number(row.fourthTrackFlags).toString(16).padStart(2, "0")} | \`${row.fourthTrackExistDecision}\` | ${row.postV36FourthTrackExistDecisionSourceCycles} | \`${row.stopsBeforeV37Instruction}\` |`),
    "",
    `The aggregate source prefix advances from **6,064** to **${coverage.contiguousPrefixThroughFourthTrackExistDecisionSourceCycles} cycles** (**${coverage.postV36FourthTrackExistDecisionSourceCycles}** added). It stops before \`_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG\`, or before \`_081DDA62: subs r2, 0x1\` if an observed clear flag selects the absent successor. Mask/body, later loop, exit successor body, pointer/address/count/index/identity/channel/frame/duration/condition state, broader MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain null or untouched.`,
    "",
    "Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v37.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v37.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v37.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
