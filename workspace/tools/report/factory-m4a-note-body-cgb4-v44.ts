import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CLEAR_ROUTE = "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken" as const;
const NONZERO_ROUTE = "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-nonzero-beq-not-taken" as const;
const V37_EVIDENCE_SHA256 = "59c5f83c2e70f21cb96076fd04e0b3d4829c8d50e3f2988e437063eabc36861c";
const V37_DOC_SHA256 = "5cf3314ae5beb43203e81e59970235141862dda3fff4d314d01f9e6ca5aec601";
const V38_EVIDENCE_SHA256 = "374076dfde52abfb519edd9e121c851ea55cd1f1ac13bf4675613f2e26d0b8ce";
const V38_DOC_SHA256 = "420b7b300d44302213b6c7ffe48f3ee2a5d63c8d3c8a3ede741839e56d266090";
const V39_EVIDENCE_SHA256 = "86286add231fea7b33ddbd0b667dd53efd4831582d8aed6e3b87e3a70dcdc626";
const V39_DOC_SHA256 = "14fd2f23976dca78ce5f23f4bf3a9b0ae5ef13d050707239d1c90b5363b414e1";
const V40_EVIDENCE_SHA256 = "2bd6f1b5d6e94d09d333c4937c2588b6f6aa4f4191c3654d27f8567d71ecfb2a";
const V40_DOC_SHA256 = "459acae2f4df10cf86072b96dbfef292b34c2a5aeaa55e783fa3f45bba67f0e3";
const V41_EVIDENCE_SHA256 = "3d2c05c30543c69dd824826993213d6cf692a916c3d800d302cf46fbafbe0963";
const V41_DOC_SHA256 = "b3c1057fafe83de3eb7a17c32355f4a3bd4e83e9c60a1c9640b8b474b62ef36e";
const V42_EVIDENCE_SHA256 = "b18d54cc288cb3f99df8de3f059ce499ac7254e2758f7770cf4a43deef6873c6";
const V42_DOC_SHA256 = "07e866c8fd5d98e5ddb277e9a7fd0dbef9dda24f06c910e62b90c6f9a0c194d4";
const V43_EVIDENCE_SHA256 = "856457b15dc9e2424d92685bac2a96469c5d3cefffd9bce4b04e8008b3fcb5e7";
const V43_DOC_SHA256 = "709625f702cf00b7c5055a908fd6c8e44a36fa693fe3119764fc07e29b580c07";
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
const V41_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "79baf363f8822c218b0c1e627c9ce033631ad3b3b513e7f54c7c1558b7120cc8",
  liliana: "1938050ae62a1e5465e8025e357fc9ff5c4b4d307f8d3a9e7cfd382d897dd24e",
  "factory-varied": "234edd165872f3b2294185f77ced262a09f9ea3696fe83271444164e63035332",
};
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;
const CLEAR_DIGESTS = new Set<string>(SELECTED_DIGESTS.slice(1));
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const M4A_CONSTANTS_SHA256 = "36a0f4b5be5a777886350810b1aec40364557f2e021352d67d8ae604a6a0a9fd";
const DEFINES_SHA256 = "528c5983bf23f3b12036e9f7ed20e482b1dbe15e0198ec6bb10292d413f68644";
const LINKER_SHA256 = "ea3df8331ffacc75e1377b2d2f2d8ec6530f6436788b812603ba3af1a964cfb0";
const PLAYER_TABLE_SHA256 = "babb0eb8acce75ada42c2747ca0ef09825135d1c85b46254b1f44520b1a57a36";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const FIFTH_CONTINUATION_SHA256 = "05a30c0a17fafc028ce3218c1ad9921ce4ffd3efc591503956f4793a4c43b993";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V37_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v37.json");
const V37_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v37.md");
const V38_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v38.json");
const V38_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v38.md");
const V39_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v39.json");
const V39_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v39.md");
const V40_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v40.json");
const V40_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v40.md");
const V41_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v41.json");
const V41_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v41.md");
const V42_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v42.json");
const V42_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v42.md");
const V43_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v43.json");
const V43_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v43.md");
const V37_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v37");
const V39_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v39");
const V41_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v41");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v44.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v44.md");
const ROM_BASE = 0x0800_0000;
const FIFTH_CONTINUATION_START = 0x082d_fc9e;
const FIFTH_CONTINUATION_END = 0x082d_fca4;
const IWRAM_START = 0x0300_0000;
const IWRAM_END = 0x0300_8000;
const TRACK_BYTES = 80;

function fail(message: string): never {
  throw new Error("factory-m4a-note-body-cgb4-v44: " + message);
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
  if (sha256(bytes) !== hash) fail(path + " changed");
  return bytes;
}

function checkedJson(path: string, hash: string): unknown {
  return JSON.parse(checkedBytes(path, hash).toString("utf8"));
}

function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(label + " must be a SHA-256 digest");
  return value;
}

function requireU32(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 0xffff_ffff) fail(label + " must be a u32");
  return value;
}

export type Cgb4FifthTrackPositiveContinuationTiming = Readonly<{
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
 * Price only the shared positive continuation reached by the two selected
 * fifth-track clear rows. Empty input deliberately strips every predecessor
 * scalar and forbids inventing any sixth-track observation.
 */
export function reduceCgb4FifthTrackPositiveContinuationTiming(state: unknown): Cgb4FifthTrackPositiveContinuationTiming | null {
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

function checkedRegion(rom: Buffer, start: number, end: number, bytes: readonly number[], hash: string, label: string): Buffer {
  const region = rom.subarray(start - ROM_BASE, end - ROM_BASE);
  const expected = Buffer.from(bytes);
  if (!region.equals(expected) || sha256(region) !== hash) fail("compiled " + label + " changed");
  return region;
}

function decodeConditionalBranch(start: number, instruction: number, opcode: number, target: number, label: string): void {
  const signedImm8 = (instruction & 0x80) === 0 ? instruction & 0xff : (instruction & 0xff) - 0x100;
  const decodedTarget = start + 4 + signedImm8 * 2;
  if ((instruction & 0xff00) !== opcode || decodedTarget !== target) fail("compiled " + label + " branch changed");
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

/** Proves the shared body and its source-only taken branch without naming a runtime sixth track. */
function assertContinuationSourceElfRom(): Record<string, unknown> {
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
  const sharedContinuation = [
    "_081DDA62:",
    "\tsubs r2, 0x1",
    "\tble _081DDA6C",
    "\tmovs r0, MusicPlayerTrack_size",
    "\tadds r5, r0",
    "\tbgt _081DD9C8",
    "_081DDA6C:",
  ].join("\n");
  const sixthTrackStop = [
    "_081DD9C8:",
    "\tldrb r0, [r5, o_MusicPlayerTrack_flags]",
    "\tmovs r1, 0x80",
    "\ttst r1, r0",
    "\tbeq _081DDA62",
  ].join("\n");
  const ordinaryTracks = [
    "music_player gMPlayInfo_BGM, gMPlayTrack_BGM, NUM_TRACKS_BGM, 0",
    "music_player gMPlayInfo_SE1, gMPlayTrack_SE1, NUM_TRACKS_SE1, 1",
    "music_player gMPlayInfo_SE2, gMPlayTrack_SE2, NUM_TRACKS_SE2, 1",
    "music_player gMPlayInfo_SE3, gMPlayTrack_SE3, NUM_TRACKS_SE3, 0",
  ];
  if (
    !assembly.includes(r5LoadAndLoopHead) || !assembly.includes(sharedContinuation) || !assembly.includes(sixthTrackStop) ||
    !assembly.includes('.include "constants/m4a_constants.inc"') ||
    !internal.includes("    struct MusicPlayerTrack *tracks;") || !internal.includes("#define MAX_POKEMON_CRIES 2") ||
    !m4aC.includes("    mplayInfo->tracks = tracks;") ||
    !m4aC.includes("MPlayOpen(mplayInfo, gMPlayTable[i].track, gMPlayTable[i].numTracks);") ||
    !m4aC.includes("MPlayOpen(mplayInfo, track, 2);") ||
    !m4aC.includes("        struct MusicPlayerTrack *track = &gPokemonCryTracks[i * 2];") ||
    (m4aC.match(/\bMPlayOpen\s*\(/g) ?? []).length !== 3 ||
    !playerTable.includes("\t.equiv TRACK_SIZE, 0x50") || !ordinaryTracks.every((line) => playerTable.includes(line)) ||
    !defines.includes('#define COMMON_DATA __attribute__((section("common_data")))') ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") ||
    !linker.includes("data/*.o(.bss);") || !linker.includes("src/*.o(COMMON);")
  ) fail("shared continuation, complete MPlay/cry storage, or IWRAM provenance changed");
  if (parseTrackLayoutBytes(constants) !== TRACK_BYTES) fail("MusicPlayerTrack_size changed");

  const body = checkedRegion(rom, FIFTH_CONTINUATION_START, FIFTH_CONTINUATION_END, [0x50, 0x20, 0x2d, 0x18, 0xad, 0xdc], FIFTH_CONTINUATION_SHA256, "fifth-track positive continuation");
  decodeConditionalBranch(FIFTH_CONTINUATION_START + 4, body.readUInt16LE(4), 0xdc00, 0x082d_fc00, "fifth-track positive continuation bgt");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of ["082dfc00 t _081DD9C8", "082dfc9a t _081DDA62", "082dfca4 t _081DDA6C"]) {
    if (!symbols.includes(symbol)) fail("ELF code symbol " + symbol + " changed");
  }
  assertTrackSymbolsAreIwram(symbols);

  return {
    source: {
      assembly: {
        path: "reference/pokeemerald/src/m4a_1.s",
        lines: "1360-1367, 1443-1450",
        continuationSourceAddress: "_081DDA66",
        predecessorSourceAddress: "_081DDA62",
        sixthTrackStop: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
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
      sha256: FIFTH_CONTINUATION_SHA256,
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

function assertReportRegenerates(script: string, evidenceName: string, docName: string, expectedEvidence: Buffer, expectedDoc: Buffer, label: string): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v44-" + label + "-"));
  execFileSync(process.execPath, ["--experimental-strip-types", script, "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, evidenceName)).equals(expectedEvidence)) fail(label + " evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, docName)).equals(expectedDoc)) fail(label + " report does not regenerate byte-for-byte");
}

function assertFrozenArtifactsAndReportsRegenerate(): void {
  checkedBytes(V37_EVIDENCE, V37_EVIDENCE_SHA256);
  checkedBytes(V37_DOC, V37_DOC_SHA256);
  checkedBytes(V38_EVIDENCE, V38_EVIDENCE_SHA256);
  checkedBytes(V38_DOC, V38_DOC_SHA256);
  checkedBytes(V39_EVIDENCE, V39_EVIDENCE_SHA256);
  checkedBytes(V39_DOC, V39_DOC_SHA256);
  checkedBytes(V40_EVIDENCE, V40_EVIDENCE_SHA256);
  checkedBytes(V40_DOC, V40_DOC_SHA256);
  checkedBytes(V41_EVIDENCE, V41_EVIDENCE_SHA256);
  checkedBytes(V41_DOC, V41_DOC_SHA256);
  checkedBytes(V42_EVIDENCE, V42_EVIDENCE_SHA256);
  checkedBytes(V42_DOC, V42_DOC_SHA256);
  const v43Evidence = checkedBytes(V43_EVIDENCE, V43_EVIDENCE_SHA256);
  const v43Doc = checkedBytes(V43_DOC, V43_DOC_SHA256);
  for (const name of CASES) {
    checkedBytes(join(V37_PACKETS, name + ".json"), V37_PACKET_HASHES[name]);
    checkedBytes(join(V39_PACKETS, name + ".json"), V39_PACKET_HASHES[name]);
    checkedBytes(join(V41_PACKETS, name + ".json"), V41_PACKET_HASHES[name]);
  }
  // v43 recursively regenerates v42, v41, v40, v39, and their predecessors.
  // Running only the immediate predecessor preserves the established recipe:
  // it proves retained ancestry without widening this source-only slice.
  assertReportRegenerates("tools/report/factory-m4a-note-body-cgb4-v43.ts", "factory-m4a-note-body-cgb4-evidence-v43.json", "issue55-m4a-note-body-cgb4-v43.md", v43Evidence, v43Doc, "v43");
}

type FrozenV42Row = {
  sourceStateDigest: string;
  route: typeof CLEAR_ROUTE | typeof NONZERO_ROUTE;
  contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles: 966 | 972;
  stopsBeforeV42Instruction: "mov r9, r2" | "_081DDA62: subs r2, 0x1";
};

type FrozenV43Row = {
  sourceStateDigest: string;
  contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles: 976;
  stopsBeforeV43Instruction: "movs r0, MusicPlayerTrack_size";
};

function frozenV43ClearRows(frozenV43: unknown): Map<string, FrozenV43Row> {
  if (!isRecord(frozenV43) || frozenV43.schema !== "factory-m4a-note-body-cgb4-evidence/v43" || frozenV43.oracleProfile !== "battle-scene-off" || frozenV43.addressFree !== true || !Array.isArray(frozenV43.rows)) {
    fail("frozen v43 evidence identity changed");
  }
  const result = new Map<string, FrozenV43Row>();
  for (const [index, row] of frozenV43.rows.entries()) {
    const expected = [
      "sourceStateDigest", "r2BeforeFifthTrackClearDecrement", "r2AfterFifthTrackClearDecrement",
      "fifthTrackClearDecrementDecision", "postV42FifthTrackClearDecrementDecisionSourceCycles",
      "contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles", "bleTakenControlTransferRefills", "stopsBeforeV43Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail("frozen v43 row " + index + " carries an unsupported field");
    const sourceStateDigest = requireDigest(row.sourceStateDigest, "frozen v43 row " + index + " digest");
    if (
      !CLEAR_DIGESTS.has(sourceStateDigest) || result.has(sourceStateDigest) ||
      requireU32(row.r2BeforeFifthTrackClearDecrement, "frozen v43 row " + index + " r2 before") !== 6 ||
      requireU32(row.r2AfterFifthTrackClearDecrement, "frozen v43 row " + index + " r2 after") !== 5 ||
      row.fifthTrackClearDecrementDecision !== "subs-r2-1; ble-not-taken" ||
      row.postV42FifthTrackClearDecrementDecisionSourceCycles !== 4 ||
      row.contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles !== 976 ||
      row.bleTakenControlTransferRefills !== 0 || row.stopsBeforeV43Instruction !== "movs r0, MusicPlayerTrack_size"
    ) fail("frozen v43 row " + index + " no longer selects the positive fifth-track continuation");
    result.set(sourceStateDigest, {
      sourceStateDigest,
      contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles: 976,
      stopsBeforeV43Instruction: "movs r0, MusicPlayerTrack_size",
    });
  }
  if (result.size !== CLEAR_DIGESTS.size || ![...CLEAR_DIGESTS].every((digest) => result.has(digest))) {
    fail("frozen v43 sourceStateDigest join is missing, duplicate, ambiguous, or extra");
  }
  return result;
}

function frozenV42Rows(frozenV42: unknown): FrozenV42Row[] {
  if (!isRecord(frozenV42) || frozenV42.schema !== "factory-m4a-note-body-cgb4-evidence/v42" || frozenV42.oracleProfile !== "battle-scene-off" || frozenV42.addressFree !== true || !Array.isArray(frozenV42.rows)) {
    fail("frozen v42 evidence identity changed");
  }
  const result: FrozenV42Row[] = [];
  const seen = new Set<string>();
  for (const [index, row] of frozenV42.rows.entries()) {
    const expected = [
      "sourceStateDigest", "fifthTrackVolPitchMaskDecision", "postV41FifthTrackVolPitchDecisionSourceCycles",
      "contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles", "beqTakenControlTransferRefills", "stopsBeforeV42Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expected)) fail("frozen v42 row " + index + " carries an unsupported field");
    const sourceStateDigest = requireDigest(row.sourceStateDigest, "frozen v42 row " + index + " digest");
    if (!SELECTED_DIGESTS.includes(sourceStateDigest as typeof SELECTED_DIGESTS[number]) || seen.has(sourceStateDigest)) {
      fail("frozen v42 sourceStateDigest join is missing, duplicate, ambiguous, or extra");
    }
    const clear = CLEAR_DIGESTS.has(sourceStateDigest);
    const expectedRoute = clear ? CLEAR_ROUTE : NONZERO_ROUTE;
    const expectedCycles = clear ? 12 : 6;
    const expectedPrefix = clear ? 972 : 966;
    const expectedRefills = clear ? 1 : 0;
    const expectedStop = clear ? "_081DDA62: subs r2, 0x1" : "mov r9, r2";
    if (
      row.fifthTrackVolPitchMaskDecision !== expectedRoute ||
      row.postV41FifthTrackVolPitchDecisionSourceCycles !== expectedCycles ||
      row.contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles !== expectedPrefix ||
      row.beqTakenControlTransferRefills !== expectedRefills || row.stopsBeforeV42Instruction !== expectedStop
    ) fail("frozen v42 row " + index + " no longer selects its frozen volume/pitch boundary");
    seen.add(sourceStateDigest);
    result.push({
      sourceStateDigest,
      route: expectedRoute,
      contiguousPrefixThroughFifthTrackVolPitchDecisionSourceCycles: expectedPrefix as 966 | 972,
      stopsBeforeV42Instruction: expectedStop as "mov r9, r2" | "_081DDA62: subs r2, 0x1",
    });
  }
  if (result.length !== SELECTED_DIGESTS.length || seen.size !== SELECTED_DIGESTS.length || !SELECTED_DIGESTS.every((digest) => seen.has(digest))) {
    fail("frozen v42 rows are incomplete or reordered outside the accepted source-state set");
  }
  return result;
}

function productionReceiptContainment(): boolean {
  const fragments = Array.from({ length: 8 }, (_, index) => 37 + index).flatMap((version) => [
    "factory-m4a-note-body-cgb4-evidence-v" + version,
    "issue55-m4a-note-body-cgb4-v" + version,
    "factory-m4a-note-body-cgb4-v" + version,
  ]);
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  const hits = visit(join(ROOT, "src")).filter((path) => fragments.some((fragment) => readFileSync(path, "utf8").includes(fragment)));
  if (hits.length !== 0) fail("production imports frozen evidence or packets: " + hits.join(", "));
  return true;
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV42 = checkedJson(V42_EVIDENCE, V42_EVIDENCE_SHA256);
  const frozenV43 = checkedJson(V43_EVIDENCE, V43_EVIDENCE_SHA256);
  assertFrozenArtifactsAndReportsRegenerate();
  const sourceAndElf = assertContinuationSourceElfRom();
  const v42Rows = frozenV42Rows(frozenV42);
  const v43BySourceStateDigest = frozenV43ClearRows(frozenV43);
  const clearV42Rows = v42Rows.filter((row) => row.route === CLEAR_ROUTE);
  const nonzeroV42Rows = v42Rows.filter((row) => row.route === NONZERO_ROUTE);
  const timing = reduceCgb4FifthTrackPositiveContinuationTiming({});
  if (!timing) fail("source-only fifth-track positive continuation timing became malformed");
  const rows = [...v43BySourceStateDigest.values()].map((prior) => {
    const v42 = clearV42Rows.find((row) => row.sourceStateDigest === prior.sourceStateDigest);
    if (!v42 || v42.stopsBeforeV42Instruction !== "_081DDA62: subs r2, 0x1") fail("frozen v43 row lost its clear v42 sourceStateDigest predecessor");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      fifthTrackPositiveContinuation: timing.route,
      postV43FifthTrackPositiveContinuationSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFifthTrackPositiveContinuationSourceCycles: prior.contiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles + timing.sourceCycles,
      bgtTakenControlTransferRefills: timing.bgtTakenControlTransferRefills,
      stopsBeforeV44Instruction: timing.stopsBeforeInstruction,
    };
  });
  const rowsBySourceStateDigest = new Map(rows.map((row) => [row.sourceStateDigest, row]));
  const added = rows.reduce((sum, row) => sum + row.postV43FifthTrackPositiveContinuationSourceCycles, 0);
  const contiguous = 6234 + added;
  if (
    v42Rows.length !== 3 || clearV42Rows.length !== 2 || nonzeroV42Rows.length !== 1 ||
    nonzeroV42Rows[0]!.sourceStateDigest !== SELECTED_DIGESTS[0] || nonzeroV42Rows[0]!.stopsBeforeV42Instruction !== "mov r9, r2" ||
    v43BySourceStateDigest.size !== CLEAR_DIGESTS.size || rows.length !== 2 || rowsBySourceStateDigest.size !== CLEAR_DIGESTS.size ||
    ![...CLEAR_DIGESTS].every((digest) => {
      const row = rowsBySourceStateDigest.get(digest);
      return row?.fifthTrackPositiveContinuation === "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8" &&
        row.postV43FifthTrackPositiveContinuationSourceCycles === 12 &&
        row.contiguousPrefixThroughFifthTrackPositiveContinuationSourceCycles === 988 &&
        row.bgtTakenControlTransferRefills === 1 &&
        row.stopsBeforeV44Instruction === "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]";
    }) ||
    added !== 24 || contiguous !== 6258
  ) fail("frozen v43/v42 source-state join or fifth positive-continuation pricing changed; refuse to enter the sixth-track flags load/decision");
  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v44",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: {
      acceptedV43EvidenceSha256: V43_EVIDENCE_SHA256,
      acceptedV43DocSha256: V43_DOC_SHA256,
      acceptedV42EvidenceSha256: V42_EVIDENCE_SHA256,
      acceptedV42DocSha256: V42_DOC_SHA256,
      acceptedV41EvidenceSha256: V41_EVIDENCE_SHA256,
      acceptedV41DocSha256: V41_DOC_SHA256,
      acceptedV41PacketSha256: V41_PACKET_HASHES,
      acceptedInheritedV40EvidenceSha256: V40_EVIDENCE_SHA256,
      acceptedInheritedV40DocSha256: V40_DOC_SHA256,
      acceptedInheritedV39EvidenceSha256: V39_EVIDENCE_SHA256,
      acceptedInheritedV39DocSha256: V39_DOC_SHA256,
      acceptedInheritedV39PacketSha256: V39_PACKET_HASHES,
      acceptedInheritedV38EvidenceSha256: V38_EVIDENCE_SHA256,
      acceptedInheritedV38DocSha256: V38_DOC_SHA256,
      acceptedInheritedV37EvidenceSha256: V37_EVIDENCE_SHA256,
      acceptedInheritedV37DocSha256: V37_DOC_SHA256,
      acceptedInheritedV37PacketSha256: V37_PACKET_HASHES,
      v43HasNoPacket: true,
      v42HasNoPacket: true,
      v43RegenerationTransitivelyVerifiesV42AndInheritedEvidenceReportsByteForByte: true,
      v43V42PacketsAndInheritedEvidenceRetainedByteForByte: true,
      v44RuntimeCaptureCount: 0,
    },
    capture: {
      boundary: "source-only fifth-track positive continuation at _081DDA66 through bgt _081DD9C8; stop immediately before the sixth-track MPT_FLG_EXIST flags load/decision",
      scalars: [],
      derivedFromFrozenPredecessorOnly: ["sourceStateDigest", "frozen v43 clear-route decrement/exit decision", "source-proven shared positive continuation and static IWRAM storage class"],
      excluded: [
        "new runtime or oracle fields", "new r2 capture", "track pointer", "runtime address", "track count", "track index", "track identity",
        "channel", "frame", "duration", "condition flags", "wider state", "fifthTrackFlags serialization", "v42 nonzero-mask mov r9, r2 body",
        "sixth-track flags serialization", "sixth-track MPT_FLG_EXIST decision", "sixth-track body", "exit body at _081DDA6C: ldr r0, lt2_ID_NUMBER",
        "later loop work", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV43ClearRows: v43BySourceStateDigest.size,
      frozenV42Rows: v42Rows.length,
      selectedClearV42Rows: clearV42Rows.length,
      frozenNonzeroMaskV42Rows: nonzeroV42Rows.length,
      joinedRows: rows.length,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing", "duplicate", "ambiguous", "extra", "non-v43-clear-row", "non-v42-clear-row",
        "unsupported-runtime-field", "unexpected-frozen-v43-route-or-stop", "unexpected-frozen-v42-route", "unexpected-continuation-boundary",
      ],
    },
    coverage: {
      frozenV43ClearDecrementRows: v43BySourceStateDigest.size,
      frozenV42Rows: v42Rows.length,
      frozenV42ClearMaskRows: clearV42Rows.length,
      frozenV42NonzeroMaskRows: nonzeroV42Rows.length,
      sourceOnlyPositiveContinuationRows: rows.length,
      bgtTakenRows: rows.length,
      bgtNotTakenRows: 0,
      postV43FifthTrackPositiveContinuationSourceCycles: added,
      acceptedContiguousPrefixThroughFifthTrackClearDecrementDecisionSourceCycles: 6234,
      contiguousPrefixThroughFifthTrackPositiveContinuationSourceCycles: contiguous,
      sequentialThumbHalfwords: rows.length * timing.sequentialThumbHalfwords,
      registerDataAccesses: 0,
      dataAccessPremiumCycles: 0,
      takenControlTransferRefills: rows.length * timing.bgtTakenControlTransferRefills,
      frozenNonzeroMaskRowRemainsAtV42Stop: true,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV43ArtifactsReadOnly: true,
      frozenV42ArtifactsReadOnly: true,
      frozenV41ArtifactsAndPacketsReadOnly: true,
      inheritedV40ArtifactsReadOnly: true,
      inheritedV39ArtifactsAndPacketsReadOnly: true,
      inheritedV38ArtifactsReadOnly: true,
      inheritedV37ArtifactsAndPacketsReadOnly: true,
      frozenArtifactsAreNotProductionImports: noProductionImports,
      v44RuntimeCaptureCount: 0,
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
      fifthTrackFlags: null,
      newRuntimeR2Scalar: null,
      v42NonzeroMaskBody: null,
      positiveContinuationBody: "source-only fifth-track movs/adds/taken-bgt body",
      exitBody: null,
      sixthTrackFlags: null,
      sixthTrackExistDecision: null,
      sixthTrackBody: null,
      laterLoop: null,
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
    verdict: "Source-only v44 freezes v43/v42 evidence/reports plus v41 packets and inherited v37-v40 artifacts byte-for-byte, regenerates v43 transitively, and joins only its two clear rows to frozen v42 by sourceStateDigest. Pinned source/ELF/ROM prove the exact shared body movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8 (50 20 2d 18 ad dc). The complete static MPlay/cry allocation set is IWRAM, so the source-only add is signed-positive and the bgt is taken: 3 Thumb halfwords × 2 plus one 6-cycle refill = 12 cycles per row. The two rows add 24 cycles, advancing 6234 to 6258. The frozen 0x83 nonzero-mask row remains at v42 before mov r9, r2; both extended clear rows stop immediately before _081DD9C8's sixth-track MPT_FLG_EXIST flags load/decision, with no sixth-track scalar or exit/later-loop claim.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, unknown>;
  const rows = evidence.rows as Array<Record<string, unknown>>;
  return [
    "# Issue #55 — CGB4 fifth-track positive continuation v44",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v44.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, address-free, and source-only. v44 freezes v43/v42 evidence and reports, v41 packets, and inherited v37-v40 artifacts byte-for-byte; it regenerates v43 (and thus its retained ancestry) byte-for-byte. It joins only the two frozen v43 clear rows to v42 by `sourceStateDigest`, performs no oracle capture, and accepts no runtime scalar.",
    "",
    "v43 stops both selected clear rows directly before the shared `movs r0, MusicPlayerTrack_size` continuation. v44 keeps neither the predecessor `r2` values nor an actual pointer, address, count, index, identity, flag, channel, frame, duration, condition, or sixth-track scalar. The frozen `0x83` nonzero-mask row is read only from v42 and remains exactly at its v42 stop before `mov r9, r2`.",
    "",
    "Pinned source proves `r5` originates at `MusicPlayerInfo.tracks`. The complete static MPlay table plus cry initialization assign that field only to five backing track allocations; source/linker and ELF independently place every candidate allocation in IWRAM. The assembler layout and compiled immediate prove `MusicPlayerTrack_size = 80`. Therefore the source-only `adds r5, r0` is signed-positive and non-overflowing, and its `bgt` is taken, without identifying an actual fifth or sixth track address.",
    "",
    "Source/ELF/exact-ROM close exactly shared source `_081DDA66.._081DDA6C` / linked `0x082dfc9e..0x082dfca4`: `movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8`. Exact ROM bytes are `50 20 2d 18 ad dc`; decoded `GT` targets `_081DD9C8` at `0x082dfc00`. Three register-only Thumb halfwords cost **3×2 = 6 cycles** and the taken branch contributes one **6-cycle** refill: **12 cycles per clear row**. No data-access premium applies.",
    "",
    "| frozen clear sourceStateDigest | source-only continuation | cycles | stop boundary |",
    "| --- | --- | ---: | --- |",
    ...rows.map((row) => "| `" + String(row.sourceStateDigest).slice(0, 12) + "…` | `" + String(row.fifthTrackPositiveContinuation) + "` | " + String(row.postV43FifthTrackPositiveContinuationSourceCycles) + " | `" + String(row.stopsBeforeV44Instruction) + "` |"),
    "",
    "The two selected rows add " + String(coverage.postV43FifthTrackPositiveContinuationSourceCycles) + " cycles, advancing the mixed selected-row source prefix from **6,234** to **" + String(coverage.contiguousPrefixThroughFifthTrackPositiveContinuationSourceCycles) + " cycles**. Both stop immediately before `_081DD9C8`'s **sixth-track** `MPT_FLG_EXIST` flags load/decision. No sixth-track scalar, flags serialization, decision/body, exit body, later loop work, broader MPlay/service/arbitration, construction-clock wiring, production, presentation, animation, Rust, ROADMAP/DEFERRED, or canonical Battle-2 work is claimed.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v44.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v44.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v44.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
