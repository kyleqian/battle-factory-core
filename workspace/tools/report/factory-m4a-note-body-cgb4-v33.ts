import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";

const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };
const V32_EVIDENCE_SHA256 = "6301f67aef178a4284bf3f9f70cbf984d4fbe7d2a4cfbfe2f14f2fa93961b989";
const V32_DOC_SHA256 = "e818d931a21902a3d2b02a3a6ce280410dffb9a75997d841894f6daeaeaccbd2";
const V31_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "6a4af5ecbaa256b17914231e77d962b01ae45c91bc0ed64a2ddf6bdc949dee3d",
  liliana: "4b13624cda5a688270c3ac3cabc6228adad78eb83f7322152ca2cccc4d3e8bb3",
  "factory-varied": "ad82e79e6af5b3627775762d28463eaa91256477ce54cc698b8761673476d5e7",
};
const V33_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "5b200f46ea9182f5f1ba1f349b07f012b282f2d96157c2b49c0cee0e163b88c9",
  liliana: "edb093d86fd4deffdc39f2802d545d2422d3ca94ece18883d6d8dd2522c3bc13",
  "factory-varied": "a6e227b52726b060268a24d01aa404bcf54b576d3640cbdb85d76d9ffe4a4411",
};
const V33_PACKET_REPEAT_HASHES = V33_PACKET_HASHES;
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
const V32_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v32.json");
const V32_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v32.md");
const V31_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v31");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v33");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v33.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v33.md");
const ROM_BASE = 0x0800_0000;
const FLAGS_START = 0x082d_fc00;
const FLAGS_END = 0x082d_fc08;
const IWRAM_START = 0x0300_0000;
const IWRAM_END = 0x0300_8000;
const TRACK_BYTES = 80;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v33: ${message}`);
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

export type Cgb4ThirdTrackFlagsTiming = Readonly<{
  route: "MPT_FLG_EXIST-set-beq-not-taken" | "MPT_FLG_EXIST-clear-beq-taken";
  thirdTrackFlags: number;
  sequentialThumbHalfwords: 4;
  iwramByteLoads: 1;
  iwramDataAccessPremiumCycles: 0;
  beqTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 8 | 14;
  stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG" | "_081DDA62: first instruction";
}>;

/** Price only the third-track EXIST test; all other state is rejected. */
export function reduceCgb4ThirdTrackFlagsTiming(state: unknown): Cgb4ThirdTrackFlagsTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["thirdTrackFlags"])) return null;
  let thirdTrackFlags: number;
  try {
    thirdTrackFlags = requireU8(state.thirdTrackFlags, "thirdTrackFlags");
  } catch {
    return null;
  }
  const existSet = (thirdTrackFlags & 0x80) !== 0;
  return Object.freeze(existSet ? {
    route: "MPT_FLG_EXIST-set-beq-not-taken",
    thirdTrackFlags,
    sequentialThumbHalfwords: 4,
    iwramByteLoads: 1,
    iwramDataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 0,
    takenControlTransferRefills: 0,
    sourceCycles: 8,
    stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
  } : {
    route: "MPT_FLG_EXIST-clear-beq-taken",
    thirdTrackFlags,
    sequentialThumbHalfwords: 4,
    iwramByteLoads: 1,
    iwramDataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 14,
    stopsBeforeInstruction: "_081DDA62: first instruction",
  }) as Cgb4ThirdTrackFlagsTiming;
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
  const ordinaryOpen = "MPlayOpen(mplayInfo, gMPlayTable[i].track, gMPlayTable[i].numTracks);";
  const cryOpen = "MPlayOpen(mplayInfo, track, 2);";
  const ordinaryTracks = [
    "music_player gMPlayInfo_BGM, gMPlayTrack_BGM, NUM_TRACKS_BGM, 0",
    "music_player gMPlayInfo_SE1, gMPlayTrack_SE1, NUM_TRACKS_SE1, 1",
    "music_player gMPlayInfo_SE2, gMPlayTrack_SE2, NUM_TRACKS_SE2, 1",
    "music_player gMPlayInfo_SE3, gMPlayTrack_SE3, NUM_TRACKS_SE3, 0",
  ];
  if (
    !assembly.includes(flagsRoute) || !assembly.includes(r5Load) ||
    !assembly.includes('.include "constants/m4a_constants.inc"') ||
    !internal.includes("    struct MusicPlayerTrack *tracks;") ||
    !internal.includes("#define MPT_FLG_EXIST  0x80") ||
    !m4aC.includes("    mplayInfo->tracks = tracks;") ||
    !m4aC.includes(ordinaryOpen) || !m4aC.includes(cryOpen) ||
    !m4aC.includes("        struct MusicPlayerTrack *track = &gPokemonCryTracks[i * 2];") ||
    (m4aC.match(/\bMPlayOpen\s*\(/g) ?? []).length !== 3 ||
    !playerTable.includes("\t.equiv TRACK_SIZE, 0x50") || !ordinaryTracks.every((line) => playerTable.includes(line)) ||
    !defines.includes('#define COMMON_DATA __attribute__((section("common_data")))') ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") ||
    !linker.includes("data/*.o(.bss);") || !linker.includes("src/*.o(COMMON);") ||
    parseTrackLayoutBytes(constants) !== TRACK_BYTES
  ) fail("third-track flags route, storage provenance, or MusicPlayerTrack layout changed");

  const body = rom.subarray(FLAGS_START - ROM_BASE, FLAGS_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x28, 0x78, 0x80, 0x21, 0x01, 0x42, 0x48, 0xd0]);
  if (!body.equals(expectedBytes) || sha256(body) !== FLAGS_BODY_SHA256) fail("compiled third-track flags route changed");
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
      thirdTrackPointerBound: "r5 = MusicPlayerInfo.tracks + (captured track index + 2) * MusicPlayerTrack_size; selector only",
    },
  };
}

function assertV32Frozen(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v33-v32-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v32.ts", "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v32.json")).equals(checkedBytes(V32_EVIDENCE, V32_EVIDENCE_SHA256))) fail("v32 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v32.md")).equals(checkedBytes(V32_DOC, V32_DOC_SHA256))) fail("v32 report does not regenerate byte-for-byte");
  for (const name of CASES) checkedBytes(join(V31_PACKETS, `${name}.json`), V31_PACKET_HASHES[name]);
}

function frozenRows(): Array<{ sourceStateDigest: string; contiguous: number }> {
  const evidence = checkedJson<unknown>(V32_EVIDENCE, V32_EVIDENCE_SHA256);
  if (!isRecord(evidence) || evidence.schema !== "factory-m4a-note-body-cgb4-evidence/v32" || evidence.oracleProfile !== "battle-scene-off" || evidence.addressFree !== true || !Array.isArray(evidence.rows)) fail("frozen v32 identity changed");
  const rows = evidence.rows.map((row, index) => {
    const expectedKeys = [
      "sourceStateDigest", "continuationDecision", "postV31SecondTrackContinuationSourceCycles",
      "contiguousPrefixThroughSecondTrackContinuationSourceCycles", "bgtTakenControlTransferRefills", "stopsBeforeV32Instruction",
    ];
    if (!isRecord(row) || !exactKeys(row, expectedKeys)) fail(`frozen v32 row ${index} carries an unsupported field`);
    if (
      row.continuationDecision !== "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8" ||
      row.postV31SecondTrackContinuationSourceCycles !== 12 ||
      row.contiguousPrefixThroughSecondTrackContinuationSourceCycles !== 880 ||
      row.bgtTakenControlTransferRefills !== 1 ||
      row.stopsBeforeV32Instruction !== "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]"
    ) fail(`frozen v32 row ${index} boundary changed`);
    return { sourceStateDigest: requireDigest(row.sourceStateDigest, `v32 row ${index}`), contiguous: 880 };
  });
  if (rows.length !== 3 || new Set(rows.map((row) => row.sourceStateDigest)).size !== rows.length) fail("frozen v32 source-state join changed");
  return rows;
}

function loadPackets(selected: ReadonlySet<string>): Map<string, number> {
  const result = new Map<string, number>();
  for (const name of CASES) {
    const packet = checkedJson<unknown>(join(PACKETS, `${name}.json`), V33_PACKET_HASHES[name]);
    if (
      !isRecord(packet) ||
      !exactKeys(packet, ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"]) ||
      packet.schema !== "factory-m4a-note-body-cgb4-probe/v33" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" ||
      typeof packet.sourceFunction !== "string" || packet.sourceFunction.length === 0 || packet.joinKey !== "sourceStateDigest" ||
      packet.captureBoundary !== "third-track-loop-post-_081DD9C8-ldrb-r0-before-movs-MPT_FLG_EXIST-decision" ||
      packet.addressFree !== true || !Array.isArray(packet.observations) || packet.observations.length !== COUNTS[name]
    ) fail(`${name} packet identity changed`);
    if (V33_PACKET_HASHES[name] !== V33_PACKET_REPEAT_HASHES[name]) fail(`${name} packet serial repeat changed`);
    for (const [index, row] of packet.observations.entries()) {
      if (!isRecord(row) || !exactKeys(row, ["sourceStateDigest", "thirdTrackFlags"])) fail(`${name} packet row ${index} widened`);
      const key = requireDigest(row.sourceStateDigest, `${name} row ${index}`);
      const scalar = requireU8(row.thirdTrackFlags, `${name} row ${index} thirdTrackFlags`);
      if (!selected.has(key) || result.has(key)) fail(`${name} packet key mismatched, duplicated, or extra`);
      result.set(key, scalar);
    }
  }
  if (result.size !== selected.size) fail("packets missed or ambiguously joined a v32 row");
  return result;
}

function productionContainment(): boolean {
  const fragments = [
    "factory-m4a-note-body-cgb4-evidence-v31", "issue55-m4a-note-body-cgb4-v31", "factory-m4a-note-body-cgb4-v31",
    "factory-m4a-note-body-cgb4-evidence-v32", "issue55-m4a-note-body-cgb4-v32", "factory-m4a-note-body-cgb4-v32",
    "factory-m4a-note-body-cgb4-evidence-v33", "issue55-m4a-note-body-cgb4-v33", "factory-m4a-note-body-cgb4-v33",
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
  assertV32Frozen();
  const prior = frozenRows();
  const packetValues = loadPackets(new Set(prior.map((row) => row.sourceStateDigest)));
  const rows = prior.map((row) => {
    const timing = reduceCgb4ThirdTrackFlagsTiming({ thirdTrackFlags: packetValues.get(row.sourceStateDigest) });
    if (!timing || timing.thirdTrackFlags !== 0x80 || timing.route !== "MPT_FLG_EXIST-set-beq-not-taken" || timing.sourceCycles !== 8) fail("observed third-track EXIST route changed");
    return {
      sourceStateDigest: row.sourceStateDigest,
      thirdTrackFlags: timing.thirdTrackFlags,
      thirdTrackExistDecision: timing.route,
      postV32ThirdTrackExistDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughThirdTrackExistDecisionSourceCycles: row.contiguous + timing.sourceCycles,
      beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
      stopsBeforeV33Instruction: timing.stopsBeforeInstruction,
    };
  });
  const added = rows.reduce((sum, row) => sum + row.postV32ThirdTrackExistDecisionSourceCycles, 0);
  const contiguous = 5956 + added;
  if (added !== 24 || contiguous !== 5980 || !rows.every((row) => row.contiguousPrefixThroughThirdTrackExistDecisionSourceCycles === 888)) fail("v33 pricing changed");
  productionContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v33",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV32EvidenceSha256: V32_EVIDENCE_SHA256,
      acceptedV32DocSha256: V32_DOC_SHA256,
      acceptedInheritedV31PacketSha256: V31_PACKET_HASHES,
      v32EvidenceAndReportRegenerateByteForByte: true,
      v32EvidenceReportAndInheritedV31PacketsRetainedByteForByte: true,
      v33PacketSha256: V33_PACKET_HASHES,
      v33PacketRepeatSha256: V33_PACKET_REPEAT_HASHES,
      v33PacketRepeatIdentity: true,
    },
    capture: {
      boundary: "third-track loop iteration post-_081DD9C8 ldrb r0 flags, before movs r1, MPT_FLG_EXIST",
      scalars: ["thirdTrackFlags"],
      packetObservationExactKeys: ["sourceStateDigest", "thirdTrackFlags"],
      excluded: ["pointer", "address", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration", "body", "condition flags", "wider state", "first-track flags", "second-track flags", "volume/pitch mask", "successor body", "other 75 callbacks"],
    },
    join: {
      key: "sourceStateDigest",
      frozenV32SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v32-selected-row", "unsupported-packet-field", "unexpected-observed-route"],
    },
    coverage: {
      frozenV32SelectedRows: 3,
      packetRowsByCase: COUNTS,
      thirdTrackFlagsRows: 3,
      thirdTrackFlagsValues: [0x80],
      existSetRows: 3,
      existClearRows: 0,
      postV32ThirdTrackExistDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughSecondTrackContinuationSourceCycles: 5956,
      contiguousPrefixThroughThirdTrackExistDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: 12,
      iwramByteLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
      failClosedUnobservedExistClearSourceCycles: 14,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV32ArtifactsReadOnly: true,
      inheritedV31PacketsReadOnly: true,
      v33PacketStripBackPreserved: true,
      v33RuntimeCaptureCount: 3,
      thirdTrackFlags: "address-free scalar only",
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      channel: null,
      frame: null,
      duration: null,
      conditionFlags: null,
      body: null,
      volumePitchMaskBody: null,
      successorBody: null,
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
    verdict: `Two fresh, serially repeated Battle Scene OFF packet sets retain only sourceStateDigest and thirdTrackFlags for the same three v32 rows; all three flags are 0x80. Source/ELF/exact-ROM close ldrb; movs MPT_FLG_EXIST; tst; non-taken beq at 8 cycles per row with no refill. The aggregate prefix advances from 5956 to ${contiguous} cycles and stops before the volume/pitch-mask body.`,
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as Record<string, any>;
  const rows = evidence.rows as Array<Record<string, any>>;
  return [
    "# Issue #55 — CGB4 third-track MPT_FLG_EXIST decision v33",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v33.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive evidence. v33 freezes v32 evidence/report and inherited v31 packets byte-for-byte, verifies the v32 receipt regenerates byte-for-byte, and joins only the same three selected `sourceStateDigest` rows. Two fresh serial packet sets are byte-identical: anchor `5b200f46…`, LILIANA `edb093d8…`, and legal-varied `a6e227b5…`. Every observation contains exactly `sourceStateDigest` plus the address-free `thirdTrackFlags` scalar.",
    "",
    "The v32 stop is the pre-`_081DD9C8` flags load. The fresh probe uses that established callback association and a live-only two-stride `r7/r5` check to select the third track; neither pointer nor stride selector is emitted. The third-track flags byte is captured after `ldrb r0, [r5, o_MusicPlayerTrack_flags]` and before `movs r1, MPT_FLG_EXIST`.",
    "",
    "All three observed flags bytes are **0x80**, so `MPT_FLG_EXIST` is set and `beq _081DDA62` is not taken. Source/ELF/exact-ROM close `_081DD9C8.._081DD9D0`: `ldrb r0,[r5,flags]; movs r1,0x80; tst r1,r0; beq _081DDA62`, exact bytes `28 78 80 21 01 42 48 d0`. The flags byte is an IWRAM load with no data-access premium.",
    "",
    "Four sequential Thumb halfwords cost **8 cycles per row**, with no control-transfer refill (**24 aggregate**). The fail-closed flags-absent route costs **14 cycles** including one 6-cycle refill and is not claimed observed.",
    "",
    "| frozen selected sourceStateDigest | third-track flags | route | cycles/row | stop boundary |",
    "| --- | ---: | --- | ---: | --- |",
    ...rows.map((row) => `| \`${row.sourceStateDigest.slice(0, 12)}…\` | 0x${Number(row.thirdTrackFlags).toString(16).padStart(2, "0")} | \`${row.thirdTrackExistDecision}\` | ${row.postV32ThirdTrackExistDecisionSourceCycles} | \`${row.stopsBeforeV33Instruction}\` |`),
    "",
    `The aggregate source prefix advances from **5,956** to **${coverage.contiguousPrefixThroughThirdTrackExistDecisionSourceCycles} cycles** (**${coverage.postV32ThirdTrackExistDecisionSourceCycles}** added). It stops before \`_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG\`; mask body and successors, pointer/address/count/index/identity/channel/frame/duration/condition/body state, broader MPlay/service/arbitration, and construction-clock wiring remain null.`,
    "",
    "Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v33.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v33.md") };
  fail("usage: factory-m4a-note-body-cgb4-v33.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
