import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const SELECTED_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };

const V24_EVIDENCE_SHA256 = "288bb342ff0e321c1d09646998bb30fde48b564015f487b9ea293dd21245e491";
const V24_DOC_SHA256 = "be4b6a319ca0ac082b46629daf928640670e7e19ec4e5247c8d1b8b9d618e8ab";
const V25_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "3ac4e4a8797b7e459c15019e7f847dce592643f604cdc437e74074dfc8d6d1a7",
  liliana: "ce74203999ee3d5492f060ef879483403002c06ab501776e7063b0fa1421d4da",
  "factory-varied": "bd289cb97eaafe49b63ce41c9b1546037b899394d7cdaf25998efcc6427646b5",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const DEFINES_SHA256 = "528c5983bf23f3b12036e9f7ed20e482b1dbe15e0198ec6bb10292d413f68644";
const LINKER_SHA256 = "ea3df8331ffacc75e1377b2d2f2d8ec6530f6436788b812603ba3af1a964cfb0";
const PLAYER_TABLE_SHA256 = "babb0eb8acce75ada42c2747ca0ef09825135d1c85b46254b1f44520b1a57a36";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "3a41edf45b6169cf3cdcf4ee298a61c576e224d16df2d3f31aa2dba9ec8e6c66";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V24_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v24.json");
const V24_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v24.md");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v25");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v25.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v25.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fc00;
const BODY_END = 0x082d_fc08;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v25: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
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
function checkedJson<T>(path: string, hash: string): T { return JSON.parse(checkedBytes(path, hash).toString("utf8")) as T; }
function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} must be a SHA-256 digest`);
  return value;
}
function requireU8(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be an unsigned 8-bit scalar`);
  return value;
}

export type Cgb4FirstTrackFlagsTiming = Readonly<{
  route: "MPT_FLG_EXIST-set-beq-not-taken" | "MPT_FLG_EXIST-clear-beq-taken";
  firstTrackFlags: number;
  sequentialThumbHalfwords: 4;
  iwramByteLoads: 1;
  iwramDataAccessPremiumCycles: 0;
  beqTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 8 | 14;
  stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG" | "_081DDA62: first instruction";
}>;

/** Price only `_081DD9C8` through its first MPT_FLG_EXIST decision. */
export function reduceCgb4FirstTrackFlagsTiming(state: unknown): Cgb4FirstTrackFlagsTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["firstTrackFlags"])) return null;
  let firstTrackFlags: number;
  try { firstTrackFlags = requireU8(state.firstTrackFlags, "firstTrackFlags"); } catch { return null; }
  const existSet = (firstTrackFlags & 0x80) !== 0;
  return Object.freeze(existSet ? {
    route: "MPT_FLG_EXIST-set-beq-not-taken",
    firstTrackFlags,
    sequentialThumbHalfwords: 4,
    iwramByteLoads: 1,
    iwramDataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 0,
    takenControlTransferRefills: 0,
    sourceCycles: 8,
    stopsBeforeInstruction: "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
  } : {
    route: "MPT_FLG_EXIST-clear-beq-taken",
    firstTrackFlags,
    sequentialThumbHalfwords: 4,
    iwramByteLoads: 1,
    iwramDataAccessPremiumCycles: 0,
    beqTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 14,
    stopsBeforeInstruction: "_081DDA62: first instruction",
  } as Cgb4FirstTrackFlagsTiming);
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const m4aC = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const defines = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/defines.h"), "utf8");
  const linker = readFileSync(join(ROOT, "reference/pokeemerald/ld_script.ld"), "utf8");
  const playerTable = readFileSync(join(ROOT, "reference/pokeemerald/sound/music_player_table.inc"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (
    sha256(assembly) !== M4A1_SHA256 || sha256(m4aC) !== M4A_C_SHA256 || sha256(internal) !== M4A_INTERNAL_SHA256 ||
    sha256(defines) !== DEFINES_SHA256 || sha256(linker) !== LINKER_SHA256 || sha256(playerTable) !== PLAYER_TABLE_SHA256 ||
    sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256
  ) fail("source, linker, ELF, or ROM changed");

  const boundedRoute = [
    "_081DD9C8:",
    "\tldrb r0, [r5, o_MusicPlayerTrack_flags]",
    "\tmovs r1, 0x80",
    "\ttst r1, r0",
    "\tbeq _081DDA62",
    "\tmovs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
  ].join("\n");
  const trackLayout = "struct MusicPlayerTrack\n{\n    u8 flags;\n";
  const cryTrackDeclaration = "COMMON_DATA struct MusicPlayerTrack gPokemonCryTracks[MAX_POKEMON_CRIES * 2] = {0};\n";
  const staticOpenRoute = [
    "for (i = 0; i < NUM_MUSIC_PLAYERS; i++)",
    "MPlayOpen(mplayInfo, gMPlayTable[i].track, gMPlayTable[i].numTracks);",
    "for (i = 0; i < MAX_POKEMON_CRIES; i++)",
    "struct MusicPlayerTrack *track = &gPokemonCryTracks[i * 2];",
    "MPlayOpen(mplayInfo, track, 2);",
  ];
  const ordinaryTrackTable = [
    "music_player gMPlayInfo_BGM, gMPlayTrack_BGM, NUM_TRACKS_BGM, 0",
    "music_player gMPlayInfo_SE1, gMPlayTrack_SE1, NUM_TRACKS_SE1, 1",
    "music_player gMPlayInfo_SE2, gMPlayTrack_SE2, NUM_TRACKS_SE2, 1",
    "music_player gMPlayInfo_SE3, gMPlayTrack_SE3, NUM_TRACKS_SE3, 0",
  ];
  if (
    !assembly.includes(boundedRoute) || !internal.includes(trackLayout) || !internal.includes("#define MPT_FLG_EXIST  0x80") ||
    !m4aC.includes(cryTrackDeclaration) || !staticOpenRoute.every((line) => m4aC.includes(line)) ||
    !ordinaryTrackTable.every((line) => playerTable.includes(line)) ||
    !defines.includes("#define COMMON_DATA __attribute__((section(\"common_data\")))") ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") || !linker.includes("src/*.o(COMMON);")
  ) fail("bounded first-track flags route or IWRAM provenance changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x28, 0x78, 0x80, 0x21, 0x01, 0x42, 0x48, 0xd0]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled first-track flags decision changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of [
    "082dfc00 t _081DD9C8", "082dfc9a t _081DDA62",
    "03001340 00000320 B gMPlayTrack_BGM", "03001660 000000f0 B gMPlayTrack_SE1",
    "03001750 000002d0 B gMPlayTrack_SE2", "03001a20 00000050 B gMPlayTrack_SE3",
    "03007670 00000140 B gPokemonCryTracks",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1362-1368", sha256: sha256(assembly) },
      musicPlayerTrack: {
        flags: {
          path: "reference/pokeemerald/include/gba/m4a_internal.h",
          lines: "264-274",
          offset: 0,
          width: "u8",
          runtimeValue: null,
        },
        existMask: { name: "MPT_FLG_EXIST", value: "0x80", sha256: sha256(internal) },
      },
      staticTrackStorage: {
        ordinaryPlayers: 4,
        cryPlayers: 2,
        selectedStorage: null,
        mPlayOpen: {
          path: "reference/pokeemerald/src/m4a.c",
          lines: "83-99",
          allCandidateTrackStorage: "IWRAM",
          sha256: sha256(m4aC),
        },
        ordinaryTable: { path: "reference/pokeemerald/sound/music_player_table.inc", lines: "29-33", sha256: sha256(playerTable) },
        cryTracks: { path: "reference/pokeemerald/src/m4a.c", line: 18, entries: 4, sha256: sha256(m4aC) },
        commonData: { path: "reference/pokeemerald/include/gba/defines.h", line: 11, section: "common_data", sha256: sha256(defines) },
        linker: { path: "reference/pokeemerald/ld_script.ld", lines: "6-10, 32-47", class: "IWRAM", origin: "0x03000000", sha256: sha256(linker) },
      },
    },
    elf: {
      entry: "0x082dfc00",
      endExclusive: "0x082dfc08",
      existClearSuccessor: "0x082dfc9a",
      tracks: {
        gMPlayTrack_BGM: { start: "0x03001340", bytes: 800, class: "IWRAM" },
        gMPlayTrack_SE1: { start: "0x03001660", bytes: 240, class: "IWRAM" },
        gMPlayTrack_SE2: { start: "0x03001750", bytes: 720, class: "IWRAM" },
        gMPlayTrack_SE3: { start: "0x03001a20", bytes: 80, class: "IWRAM" },
        gPokemonCryTracks: { start: "0x03007670", bytes: 320, entries: 4, class: "IWRAM" },
        selectedRuntimeTrack: null,
      },
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "ldrb r0, [r5, flags]; movs r1, MPT_FLG_EXIST; tst r1, r0; beq _081DDA62",
      start: "0x082dfc00",
      endExclusive: "0x082dfc08",
      bytes: body.length,
      bytesHex: "28 78 80 21 01 42 48 d0",
      sha256: BODY_SHA256,
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      iwramByteLoadPremiumCycles: 0,
      takenControlTransferRefillCycles: 6,
      existSetModel: "ldrb; movs; tst; non-taken beq = 4 halfwords * 2 + zero IWRAM data premium = 8",
      existClearModel: "ldrb; movs; tst; taken beq = 4 halfwords * 2 + one 6-cycle refill = 14",
    },
  };
}

function assertV24EvidenceAndReportRegenerate(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v25-v24-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v24.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v24.json")).equals(
    checkedBytes(V24_EVIDENCE, V24_EVIDENCE_SHA256),
  )) fail("v24 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v24.md")).equals(
    checkedBytes(V24_DOC, V24_DOC_SHA256),
  )) fail("v24 report does not regenerate byte-for-byte");
}

type FrozenV24Row = {
  sourceStateDigest: string;
  postV23SourceOnlySuccessorPrefixSourceCycles: number;
  contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles: number;
  stopsBeforeV24Instruction: string;
};

function frozenV24SelectedRows(frozenV24: unknown): FrozenV24Row[] {
  if (!isRecord(frozenV24) || frozenV24.schema !== "factory-m4a-note-body-cgb4-evidence/v24" || !Array.isArray(frozenV24.rows)) {
    fail("frozen v24 evidence identity changed");
  }
  const rows = frozenV24.rows.map((row, index) => {
    if (!isRecord(row) || !exactKeys(row, [
      "sourceStateDigest",
      "postV23SourceOnlySuccessorPrefixSourceCycles",
      "contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles",
      "stopsBeforeV24Instruction",
    ])) fail(`frozen v24 row ${index} carries an unsupported field`);
    const result: FrozenV24Row = {
      sourceStateDigest: requireDigest(row.sourceStateDigest, `frozen v24 row ${index} digest`),
      postV23SourceOnlySuccessorPrefixSourceCycles: row.postV23SourceOnlySuccessorPrefixSourceCycles as number,
      contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles: row.contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles as number,
      stopsBeforeV24Instruction: row.stopsBeforeV24Instruction as string,
    };
    if (
      result.postV23SourceOnlySuccessorPrefixSourceCycles !== 4 ||
      result.contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles !== 808 ||
      result.stopsBeforeV24Instruction !== "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]"
    ) fail(`frozen v24 row ${index} boundary changed`);
    return result;
  });
  const digests = rows.map((row) => row.sourceStateDigest);
  if (rows.length !== 3 || new Set(digests).size !== rows.length) fail("frozen v24 source-state join is missing, duplicate, ambiguous, or extra");
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

function loadPacket(name: CaseName, expectedDigests: ReadonlySet<string>): Array<{ sourceStateDigest: string; firstTrackFlags: number }> {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), V25_PACKET_HASHES[name]);
  const headerKeys = ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"];
  if (!isRecord(packet) || !exactKeys(packet, headerKeys)) fail(`${name} v25 packet carries an unsupported field`);
  if (
    packet.schema !== "factory-m4a-note-body-cgb4-probe/v25" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" ||
    typeof packet.sourceFunction !== "string" || packet.sourceFunction.length === 0 || packet.joinKey !== "sourceStateDigest" ||
    packet.captureBoundary !== "post-_081DD9C8-ldrb-r0-before-movs-MPT_FLG_EXIST-decision" || packet.addressFree !== true || !Array.isArray(packet.observations)
  ) fail(`${name} v25 packet identity changed`);
  if (packet.observations.length !== SELECTED_COUNTS[name]) fail(`${name} v25 packet selected-row census changed`);
  const rows = packet.observations.map((observation, index) => {
    if (!isRecord(observation) || !exactKeys(observation, ["sourceStateDigest", "firstTrackFlags"])) {
      fail(`${name} v25 packet row ${index} carries an unsupported field`);
    }
    return {
      sourceStateDigest: requireDigest(observation.sourceStateDigest, `${name} v25 packet row ${index} digest`),
      firstTrackFlags: requireU8(observation.firstTrackFlags, `${name} v25 packet row ${index} firstTrackFlags`),
    };
  });
  const digests = rows.map((row) => row.sourceStateDigest);
  if (new Set(digests).size !== digests.length || !digests.every((digest) => expectedDigests.has(digest))) {
    fail(`${name} v25 packet source-state rows are missing, duplicate, ambiguous, or not frozen-v24 members`);
  }
  return rows;
}

function productionReceiptContainment(): boolean {
  const forbiddenFragments = [
    "factory-m4a-note-body-cgb4-evidence-v23", "issue55-m4a-note-body-cgb4-v23", "factory-m4a-note-body-cgb4-v23",
    "factory-m4a-note-body-cgb4-evidence-v24", "issue55-m4a-note-body-cgb4-v24", "factory-m4a-note-body-cgb4-v24",
    "factory-m4a-note-body-cgb4-evidence-v25", "issue55-m4a-note-body-cgb4-v25", "factory-m4a-note-body-cgb4-v25",
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
  const frozenV24 = checkedJson<unknown>(V24_EVIDENCE, V24_EVIDENCE_SHA256);
  assertV24EvidenceAndReportRegenerate();
  const frozenRows = frozenV24SelectedRows(frozenV24);
  const selectedDigests = frozenRows.map((row) => row.sourceStateDigest);
  const selectedDigestSet = new Set(selectedDigests);
  const packetsByDigest = new Map<string, { firstTrackFlags: number }>();
  const packetRowsByCase: Record<CaseName, number> = { anchor: 0, liliana: 0, "factory-varied": 0 };
  for (const name of CASES) {
    const packetRows = loadPacket(name, selectedDigestSet);
    packetRowsByCase[name] = packetRows.length;
    for (const packet of packetRows) {
      if (packetsByDigest.has(packet.sourceStateDigest)) fail("v25 packet source-state join became ambiguous");
      packetsByDigest.set(packet.sourceStateDigest, { firstTrackFlags: packet.firstTrackFlags });
    }
  }
  if (packetsByDigest.size !== selectedDigests.length) fail("v25 packet missed a frozen v24 selected row");

  const rows = frozenRows.map((prior) => {
    const packet = packetsByDigest.get(prior.sourceStateDigest);
    if (!packet) fail("v25 packet missed a frozen v24 selected row");
    const timing = reduceCgb4FirstTrackFlagsTiming(packet);
    if (!timing) fail("v25 first-track flags scalar is malformed");
    return {
      sourceStateDigest: prior.sourceStateDigest,
      firstTrackFlags: timing.firstTrackFlags,
      firstTrackExistDecision: timing.route,
      postV24FirstTrackExistDecisionSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughFirstTrackExistDecisionSourceCycles: prior.contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles + timing.sourceCycles,
      beqTakenControlTransferRefills: timing.beqTakenControlTransferRefills,
      stopsBeforeV25Instruction: timing.stopsBeforeInstruction,
    };
  });
  const existSetRows = rows.filter((row) => row.firstTrackExistDecision === "MPT_FLG_EXIST-set-beq-not-taken");
  const existClearRows = rows.filter((row) => row.firstTrackExistDecision === "MPT_FLG_EXIST-clear-beq-taken");
  const added = rows.reduce((sum, row) => sum + row.postV24FirstTrackExistDecisionSourceCycles, 0);
  const contiguous = 5740 + added;
  if (
    rows.length !== 3 || existSetRows.length !== 3 || existClearRows.length !== 0 || added !== 24 || contiguous !== 5764 ||
    !rows.every((row) =>
      row.firstTrackFlags === 0x80 && row.postV24FirstTrackExistDecisionSourceCycles === 8 &&
      row.contiguousPrefixThroughFirstTrackExistDecisionSourceCycles === 816 && row.beqTakenControlTransferRefills === 0 &&
      row.stopsBeforeV25Instruction === "_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG",
    )
  ) fail("v25 first-track flags capture or source pricing changed; refuse to fit a different route");

  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v25",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV24EvidenceSha256: V24_EVIDENCE_SHA256,
      acceptedV24DocSha256: V24_DOC_SHA256,
      v24RegeneratesByteForByte: true,
      v24EvidenceAndReportRetainedByteForByte: true,
      v25PacketSha256: V25_PACKET_HASHES,
      v25PacketRepeatSha256: V25_PACKET_HASHES,
      v25PacketRepeatIdentity: true,
    },
    capture: {
      boundary: "post-_081DD9C8 ldrb r0 flags, before movs r1, MPT_FLG_EXIST",
      scalars: ["firstTrackFlags"],
      excluded: [
        "pointer", "runtime address", "track count", "track index", "track identity", "channel", "frame", "duration",
        "condition flags", "wider state", "MPT_FLG_VOLCHG|MPT_FLG_PITCHG decision", "successor loop body", "other 75 callbacks",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV24SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v24-selected-row", "unsupported-packet-field", "unexpected-observed-route"],
    },
    coverage: {
      frozenV24SelectedRows: 3,
      packetRowsByCase,
      firstTrackFlagsRows: 3,
      firstTrackFlagsValues: [0x80],
      existSetRows: existSetRows.length,
      existClearRows: existClearRows.length,
      priorExistSetRowsRemainNull: 4,
      postV24FirstTrackExistDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles: 5740,
      contiguousPrefixThroughFirstTrackExistDecisionSourceCycles: contiguous,
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
      frozenV24ArtifactsReadOnly: true,
      frozenV24ArtifactsAreNotProductionImports: noProductionImports,
      v25PacketsAreNotProductionImports: noProductionImports,
      v25PacketStripBackPreserved: true,
      trackPointer: null,
      runtimeAddress: null,
      trackCount: null,
      trackIndex: null,
      trackIdentity: null,
      channel: null,
      frame: null,
      duration: null,
      widerState: null,
      priorExistSetRows: null,
      successorLoopBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Two fresh byte-identical address-free v25 packet sets freeze v24 evidence/report byte-for-byte and join only its same three sourceStateDigest rows. Each captures only firstTrackFlags after _081DD9C8's ldrb and before movs; all observed values are 0x80, so source/ELF/exact-ROM price ldrb; movs; tst; non-taken beq at eight cycles per row. The receipt stops before _081DD9D0's volume/pitch mask; the flags-absent taken-beq route is fail-closed at fourteen cycles and is not claimed observed.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 first-track MPT_FLG_EXIST decision v25",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v25.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive evidence. v25 freezes v24 evidence/report byte-for-byte and joins only its same three selected `sourceStateDigest` rows. Two fresh serial packet sets are byte-identical: anchor `3ac4e4a8…`, LILIANA `ce742039…`, and legal-varied `bd289cb9…`. Exact-key validation proves strip-back preservation: every v25 observation contains exactly `sourceStateDigest` plus the one address-free `firstTrackFlags` scalar.",
    "",
    "The hook is at pipelined PC `0x082DFC04`: `_081DD9C8`'s `ldrb r0, [r5, flags]` has completed, and `movs r1, 0x80` has not begun. It carries the prior v23 in-memory digest association across the selected successor prefix when callback ownership may already have advanced; it never rereads or serializes r5, a pointer/address, identity, count/index, channel, frame, duration, condition flags, or wider state.",
    "",
    "Source/ELF/exact-ROM close exactly `_081DD9C8.._081DD9D0`: `ldrb r0, [r5, flags]; movs r1, 0x80; tst r1, r0; beq _081DDA62`. `MusicPlayerTrack.flags` is offset 0. The complete static MPlay/cry track census is IWRAM without selecting a runtime track, so the byte load adds **0** premium. Exact ROM bytes are `28 78 80 21 01 42 48 d0`.",
    "",
    "All three observed scalars are `0x80`, so `MPT_FLG_EXIST` is set and `beq` is not taken. Four sequential Thumb halfwords cost **2** cycles each: **4×2 = 8 cycles per row**, no refill, **24 aggregate**. The fail-closed flags-absent route is also source-priced as **8 + 6 = 14 cycles** for the taken `beq`, but is not claimed observed and stops before `_081DDA62`'s first instruction.",
    "",
    "| frozen selected sourceStateDigest rows | flags | observed route | cycles per row | aggregate cycles |",
    "| ---: | ---: | --- | ---: | ---: |",
    "| 3 | 0x80 | EXIST set / `beq` not taken | 8 | 24 |",
    "",
    `The aggregate source prefix advances from **5,740** to **${c.contiguousPrefixThroughFirstTrackExistDecisionSourceCycles} cycles**. It stops before \`_081DD9D0\`'s \`movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG\`; the four prior EXIST-set rows remain null, as do the other 75 callbacks, complete MPlay (**5 exact / 108 null**), service/arbitration, and construction-clock wiring. The Tier-1 red-first proof rejects the missing-refill/wrong-route 8-cycle under-price for an absent flag, and packet widening fails closed.`,
    "",
    "Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v25.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v25.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v25.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
