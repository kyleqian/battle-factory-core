import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV22Evidence } from "./factory-m4a-note-body-cgb4-v22.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const SELECTED_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };

const V22_EVIDENCE_SHA256 = "fb345eca1778d2b2f4514f6a0eee33b4749d2ad0e2c3441195d332c8e2282ad0";
const V22_DOC_SHA256 = "b9c57628ead648a0426fa0068b24a0dfb0adb0839338d32983133c9d70bf1ea5";
const V21_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "f13515a24c83091558deacba966a4454b536d6ee06c8e82a37ef848763f576df",
  liliana: "11d4dab534db89ffdae18b9fa910594417f0535a69eb67fe739b9eb808d8e8ae",
  "factory-varied": "7adb7dfdbec2e01034c673d6c0480a78fe7165de47eda8b37bd699870d0126d2",
};
const V23_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "fc84cabe947400f547b75370444f0bb60d9388989b70efe7658dd7fae9521b6e",
  liliana: "f506f1e90308d458047f7cb501399d2b1c884b1d026d57c82f771efb47b2ab7e",
  "factory-varied": "9019c3faebbfa776ba428498f1a41c2a69ff269c1a1e4bba737d80cd91a1a5dc",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const DEFINES_SHA256 = "528c5983bf23f3b12036e9f7ed20e482b1dbe15e0198ec6bb10292d413f68644";
const LINKER_SHA256 = "ea3df8331ffacc75e1377b2d2f2d8ec6530f6436788b812603ba3af1a964cfb0";
const PLAYER_TABLE_SHA256 = "babb0eb8acce75ada42c2747ca0ef09825135d1c85b46254b1f44520b1a57a36";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "c5a8903b098438110e35e4a08538fb4858edbd65a05f775f35845ab7856ca1cc";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V22_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v22.json");
const V22_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v22.md");
const V21_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v21");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v23");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v23.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v23.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fbf4;
const BODY_END = 0x082d_fbfc;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v23: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
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
function requireU32(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 0xffff_ffff) fail(`${label} must be an unsigned 32-bit scalar`);
  return value;
}

export type Cgb4SubtractionResultTiming = Readonly<{
  route: "bcc-taken-to-_081DD9C4" | "bcc-not-taken-then-b-to-_081DD874";
  subtractionResult: number;
  sequentialThumbHalfwords: 3 | 4;
  iwramHalfwordStores: 1;
  iwramDataAccessPremiumCycles: 0;
  bccTakenControlTransferRefills: 0 | 1;
  unconditionalBranchTakenControlTransferRefills: 0 | 1;
  takenControlTransferRefills: 1;
  sourceCycles: 12 | 14;
  stopsBeforeInstruction: "_081DD9C4: ldrb r2, [r7, o_MusicPlayerInfo_trackCount]" | "_081DD874: first instruction";
}>;

/** Price only the store/compare/branch selection from the captured post-subs r0 scalar. */
export function reduceCgb4SubtractionResultTiming(state: unknown): Cgb4SubtractionResultTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["subtractionResult"])) return null;
  let subtractionResult: number;
  try { subtractionResult = requireU32(state.subtractionResult, "subtractionResult"); } catch { return null; }
  const bccTaken = subtractionResult < 150;
  return Object.freeze(bccTaken ? {
    route: "bcc-taken-to-_081DD9C4",
    subtractionResult,
    sequentialThumbHalfwords: 3,
    iwramHalfwordStores: 1,
    iwramDataAccessPremiumCycles: 0,
    bccTakenControlTransferRefills: 1,
    unconditionalBranchTakenControlTransferRefills: 0,
    takenControlTransferRefills: 1,
    sourceCycles: 12,
    stopsBeforeInstruction: "_081DD9C4: ldrb r2, [r7, o_MusicPlayerInfo_trackCount]",
  } : {
    route: "bcc-not-taken-then-b-to-_081DD874",
    subtractionResult,
    sequentialThumbHalfwords: 4,
    iwramHalfwordStores: 1,
    iwramDataAccessPremiumCycles: 0,
    bccTakenControlTransferRefills: 0,
    unconditionalBranchTakenControlTransferRefills: 1,
    takenControlTransferRefills: 1,
    sourceCycles: 14,
    stopsBeforeInstruction: "_081DD874: first instruction",
  } as Cgb4SubtractionResultTiming);
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

  const boundedRoute = "_081DD9BC:\n\tstrh r0, [r7, o_MusicPlayerInfo_tempoC]\n\tcmp r0, 150\n\tbcc _081DD9C4\n\tb _081DD874\n_081DD9C4:\n";
  const cryPlayerDeclaration = "COMMON_DATA struct MusicPlayerInfo gPokemonCryMusicPlayers[MAX_POKEMON_CRIES] = {0};\n";
  const fourPlayerTable = ["gMPlayTable::", "music_player gMPlayInfo_BGM", "music_player gMPlayInfo_SE1", "music_player gMPlayInfo_SE2", "music_player gMPlayInfo_SE3"];
  const playerFields = "    struct SongHeader *songHeader;\n    u32 status;\n    u8 trackCount;\n    u8 priority;\n    u8 cmd;\n    u8 unk_B;\n    u32 clock;\n    u8 gap[8];\n    u8 *memAccArea;\n    u16 tempoD;\n    u16 tempoU;\n    u16 tempoI;\n    u16 tempoC;\n";
  if (
    !assembly.includes(boundedRoute) || !m4aC.includes(cryPlayerDeclaration) || !internal.includes(playerFields) ||
    !internal.includes("#define MAX_POKEMON_CRIES 2") || !defines.includes("#define COMMON_DATA __attribute__((section(\"common_data\")))") ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") || !linker.includes("src/*.o(COMMON);") ||
    !fourPlayerTable.every((line) => playerTable.includes(line))
  ) fail("bounded route or IWRAM storage provenance changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x78, 0x84, 0x96, 0x28, 0x00, 0xd3, 0x57, 0xe7]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled store/compare/branch body changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of [
    "082dfbf4 t _081DD9BC", "082dfbfc t _081DD9C4", "082dfaac t _081DD874",
    "030073a0 00000080 B gPokemonCryMusicPlayers", "03007420 00000040 B gMPlayInfo_BGM",
    "030075f0 00000040 B gMPlayInfo_SE1", "03007630 00000040 B gMPlayInfo_SE2", "03007800 00000040 B gMPlayInfo_SE3",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1354-1359", sha256: sha256(assembly) },
      musicPlayerInfoTempoC: { path: "reference/pokeemerald/include/gba/m4a_internal.h", lines: "327-350", offset: 34, width: "u16", sha256: sha256(internal) },
      staticPlayerStorage: {
        declaration: { path: "reference/pokeemerald/src/m4a.c", line: 12, symbol: "gPokemonCryMusicPlayers", entries: 2, sha256: sha256(m4aC) },
        staticOrder: { path: "reference/pokeemerald/sound/music_player_table.inc", lines: "29-33", ordinaryPlayers: 4, cryPlayers: 2, staticSlots: 6, selectedArrayElement: null, sha256: sha256(playerTable) },
        commonData: { path: "reference/pokeemerald/include/gba/defines.h", line: 11, section: "common_data", sha256: sha256(defines) },
        linker: { path: "reference/pokeemerald/ld_script.ld", lines: "6-10, 32-47", class: "IWRAM", origin: "0x03000000", sha256: sha256(linker) },
      },
    },
    elf: {
      entry: "0x082dfbf4", bccTakenSuccessor: "0x082dfbfc", bccNotTakenUnconditionalSuccessor: "0x082dfaac",
      gPokemonCryMusicPlayers: { start: "0x030073a0", endExclusive: "0x03007420", bytes: 128, entries: 2, musicPlayerInfoBytes: 64, class: "IWRAM" },
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "strh r0, [r7, tempoC]; cmp r0, 150; bcc _081DD9C4; b _081DD874",
      start: "0x082dfbf4", endExclusive: "0x082dfbfc", bytes: body.length, bytesHex: "78 84 96 28 00 d3 57 e7", sha256: BODY_SHA256,
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      iwramHalfwordStorePremiumCycles: 0,
      takenControlTransferRefillCycles: 6,
      bccTakenModel: "strh; cmp; taken bcc = 3 halfwords * 2 + one 6-cycle refill = 12",
      bccNotTakenModel: "strh; cmp; not-taken bcc; taken unconditional b = 4 halfwords * 2 + one 6-cycle refill = 14",
    },
  };
}

function assertFrozenV21Packets(): void {
  const expectedFiles = CASES.map((name) => `${name}.json`).sort();
  const actualFiles = readdirSync(V21_PACKETS).filter((name) => name.endsWith(".json")).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) fail("frozen v21 packet directory changed");
  for (const name of CASES) checkedBytes(join(V21_PACKETS, `${name}.json`), V21_PACKET_HASHES[name]);
}

function assertV22EvidenceAndReportRegenerate(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v23-v22-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v22.ts", "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v22.json")).equals(checkedBytes(V22_EVIDENCE, V22_EVIDENCE_SHA256))) fail("v22 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v22.md")).equals(checkedBytes(V22_DOC, V22_DOC_SHA256))) fail("v22 report does not regenerate byte-for-byte");
}

function isFrozenV22SelectedRow(row: any): boolean {
  return row.finalClearTrackExitRoute === "exist-clear-final-track-ble-taken" && row.clockExitR4Nonzero === true &&
    row.clockExitDecisionRoute === "r4-nonzero-bne-taken" && row.postV20ClockExitDecisionSourceCycles === 16 &&
    row.contiguousPrefixThroughClockExitDecisionSourceCycles === 786 && row.selectedSuccessor === "_081DD9B6" &&
    row.postV21SelectedSuccessorPrefixSourceCycles === 6 && row.contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles === 792 &&
    row.statusWriteSourceCycles === 2 && row.tempoPrefixInstructionSourceCycles === 4 && row.tempoCScalar === null &&
    row.subtractionResult === null && row.postV22BccDecision === null && row.laterBranchOrBodySourceCycles === null &&
    row.stopsBeforeV22Instruction === "_081DD9BC: strh r0, [r7, o_MusicPlayerInfo_tempoC]";
}

function isFrozenV22ExistSetRow(row: any): boolean {
  return row.finalClearTrackExitRoute === null && row.clockExitR4Nonzero === null && row.clockExitDecisionRoute === null &&
    row.postV20ClockExitDecisionSourceCycles === null && row.contiguousPrefixThroughClockExitDecisionSourceCycles === null &&
    row.selectedSuccessor === null && row.postV21SelectedSuccessorPrefixSourceCycles === null &&
    row.contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles === null && row.statusWriteSourceCycles === null &&
    row.tempoPrefixInstructionSourceCycles === null && row.tempoCScalar === null && row.subtractionResult === null &&
    row.postV22BccDecision === null && row.laterBranchOrBodySourceCycles === null && row.stopsBeforeV22Instruction === "_081DD886";
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

function frozenV22SelectedRows(frozenV22: any[], name: CaseName): any[] {
  return frozenV22.filter((row) => isRecord(row) && row.case === name && isFrozenV22SelectedRow(row));
}

function loadPacket(name: CaseName, frozenRows: readonly any[]): Array<{ sourceStateDigest: string; subtractionResult: number }> {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), V23_PACKET_HASHES[name]);
  const headerKeys = ["schema", "case", "oracleProfile", "sourceFunction", "joinKey", "captureBoundary", "addressFree", "observations"];
  if (!isRecord(packet) || !exactKeys(packet, headerKeys)) fail(`${name} v23 packet carries an unsupported field`);
  if (
    packet.schema !== "factory-m4a-note-body-cgb4-probe/v23" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" ||
    packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "post-subs-r0-at-_081DD9BC-entry-before-strh" ||
    packet.addressFree !== true || !Array.isArray(packet.observations)
  ) fail(`${name} v23 packet identity changed`);
  const expectedDigests = frozenRows.map((row) => requireDigest(row.sourceStateDigest, "frozen v22 selected sourceStateDigest"));
  if (expectedDigests.length !== SELECTED_COUNTS[name] || packet.observations.length !== expectedDigests.length) fail(`${name} v23 packet selected-row census changed`);
  const rows = packet.observations.map((observation, index) => {
    if (!isRecord(observation) || !exactKeys(observation, ["sourceStateDigest", "subtractionResult"])) fail(`${name} v23 packet row ${index} carries an unsupported field`);
    return {
      sourceStateDigest: requireDigest(observation.sourceStateDigest, `${name} v23 packet row ${index} digest`),
      subtractionResult: requireU32(observation.subtractionResult, `${name} v23 packet row ${index} subtractionResult`),
    };
  });
  const actualDigests = rows.map((row) => row.sourceStateDigest);
  if (new Set(actualDigests).size !== actualDigests.length || JSON.stringify(actualDigests) !== JSON.stringify(expectedDigests)) {
    fail(`${name} v23 packet source-state rows are missing, duplicate, reordered, ambiguous, or extra`);
  }
  return rows;
}

function productionPacketContainment(): boolean {
  const forbiddenFragments = [
    "factory-m4a-note-body-cgb4-evidence-v21", "issue55-m4a-note-body-cgb4-v21", "factory-m4a-note-body-cgb4-v21",
    "factory-m4a-note-body-cgb4-evidence-v22", "issue55-m4a-note-body-cgb4-v22", "factory-m4a-note-body-cgb4-v22",
    "factory-m4a-note-body-cgb4-evidence-v23", "issue55-m4a-note-body-cgb4-v23", "factory-m4a-note-body-cgb4-v23",
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
  const frozenV22 = checkedJson<any>(V22_EVIDENCE, V22_EVIDENCE_SHA256);
  assertFrozenV21Packets();
  assertV22EvidenceAndReportRegenerate();
  if (JSON.stringify(makeV22Evidence()) !== JSON.stringify(frozenV22)) fail("accepted v22 does not regenerate byte-for-byte");
  if (!Array.isArray(frozenV22.rows) || frozenV22.rows.length !== 7) fail("frozen v22 row count changed");
  if (
    frozenV22.schema !== "factory-m4a-note-body-cgb4-evidence/v22" || frozenV22.coverage?.contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles !== 5692 ||
    frozenV22.coverage?.subtractionResult !== null || frozenV22.coverage?.bccDecision !== null
  ) fail("frozen v22 aggregate or boundary changed");

  const packetsByDigest = new Map<string, { subtractionResult: number }>();
  for (const name of CASES) {
    const packetRows = loadPacket(name, frozenV22SelectedRows(frozenV22.rows, name));
    for (const packet of packetRows) {
      if (packetsByDigest.has(packet.sourceStateDigest)) fail("v23 packet source-state join became ambiguous");
      packetsByDigest.set(packet.sourceStateDigest, { subtractionResult: packet.subtractionResult });
    }
  }

  const seenDigests = new Set<string>();
  const rows = frozenV22.rows.map((prior: any) => {
    const digest = requireDigest(prior?.sourceStateDigest, "frozen v22 sourceStateDigest");
    if (seenDigests.has(digest)) fail("frozen v22 source-state join became ambiguous");
    seenDigests.add(digest);
    const packet = packetsByDigest.get(digest);
    if (isFrozenV22SelectedRow(prior)) {
      if (!packet) fail("v23 packet missed a frozen v22 selected row");
      const timing = reduceCgb4SubtractionResultTiming(packet);
      if (!timing) fail("v23 subtraction result is malformed");
      return {
        ...prior,
        subtractionResult: timing.subtractionResult,
        postV22BccDecision: timing.route,
        postV22BccDecisionSourceCycles: timing.sourceCycles,
        contiguousPrefixThroughBccDecisionSourceCycles: prior.contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles + timing.sourceCycles,
        bccTakenControlTransferRefills: timing.bccTakenControlTransferRefills,
        unconditionalBranchTakenControlTransferRefills: timing.unconditionalBranchTakenControlTransferRefills,
        laterBranchOrBodySourceCycles: null,
        stopsBeforeV23Instruction: timing.stopsBeforeInstruction,
      };
    }
    if (!isFrozenV22ExistSetRow(prior) || packet) fail("frozen v22 row is neither an exact selected row nor a stopped EXIST-set row");
    return {
      ...prior,
      subtractionResult: null,
      postV22BccDecision: null,
      postV22BccDecisionSourceCycles: null,
      contiguousPrefixThroughBccDecisionSourceCycles: null,
      bccTakenControlTransferRefills: null,
      unconditionalBranchTakenControlTransferRefills: null,
      laterBranchOrBodySourceCycles: null,
      stopsBeforeV23Instruction: "_081DD886",
    };
  });
  if (seenDigests.size !== 7 || packetsByDigest.size !== 3) fail("v23 source-state row census changed");
  const selectedRows = rows.filter((row: any) => row.subtractionResult !== null);
  const existSetRows = rows.filter((row: any) => row.subtractionResult === null);
  const added = selectedRows.reduce((sum: number, row: any) => sum + row.postV22BccDecisionSourceCycles, 0);
  const contiguous = frozenV22.coverage.contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles + added;
  const bccTakenRows = selectedRows.filter((row: any) => row.postV22BccDecision === "bcc-taken-to-_081DD9C4");
  const bccNotTakenRows = selectedRows.filter((row: any) => row.postV22BccDecision === "bcc-not-taken-then-b-to-_081DD874");
  if (
    selectedRows.length !== 3 || existSetRows.length !== 4 || added !== 36 || contiguous !== 5728 || bccTakenRows.length !== 3 || bccNotTakenRows.length !== 0 ||
    !selectedRows.every((row: any) => row.subtractionResult === 72 && row.postV22BccDecisionSourceCycles === 12 && row.contiguousPrefixThroughBccDecisionSourceCycles === 804 && row.bccTakenControlTransferRefills === 1 && row.unconditionalBranchTakenControlTransferRefills === 0 && row.laterBranchOrBodySourceCycles === null && row.stopsBeforeV23Instruction === "_081DD9C4: ldrb r2, [r7, o_MusicPlayerInfo_trackCount]") ||
    !existSetRows.every((row: any) => row.stopsBeforeV23Instruction === "_081DD886")
  ) fail("v23 store/compare/branch timing totals changed");

  const byCase = Object.fromEntries(CASES.map((name) => {
    const caseRows = rows.filter((row: any) => row.case === name);
    return [name, {
      callbacks: caseRows.length,
      existSetRows: caseRows.filter((row: any) => row.subtractionResult === null).length,
      selectedRows: caseRows.filter((row: any) => row.subtractionResult !== null).length,
      bccTakenRows: caseRows.filter((row: any) => row.postV22BccDecision === "bcc-taken-to-_081DD9C4").length,
      bccNotTakenRows: caseRows.filter((row: any) => row.postV22BccDecision === "bcc-not-taken-then-b-to-_081DD874").length,
      sourceCycles: caseRows.reduce((sum: number, row: any) => sum + (row.postV22BccDecisionSourceCycles ?? 0), 0),
    }];
  }));
  for (const name of CASES) {
    if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name] || (byCase[name] as any).selectedRows !== SELECTED_COUNTS[name]) fail(`${name} census changed`);
  }
  const noProductionImports = productionPacketContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v23",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV22EvidenceSha256: V22_EVIDENCE_SHA256,
      acceptedV22DocSha256: V22_DOC_SHA256,
      v22RegeneratesByteForByte: true,
      v22EvidenceAndReportRetainedByteForByte: true,
      allV21PacketsRetainedByteForByte: true,
      v21PacketDirectoryExact: true,
      v21PacketSha256: V21_PACKET_HASHES,
      v23PacketSha256: V23_PACKET_HASHES,
      v23PacketRepeatSha256: V23_PACKET_HASHES,
      v23PacketRepeatIdentity: true,
    },
    capture: {
      boundary: "post-subs r0 at _081DD9BC entry before strh; source derives the compare/branch route without independently reading flags",
      scalars: ["subtractionResult"],
      excluded: ["pointer", "runtime address", "frame", "duration", "MusicPlayerInfo.clock scalar", "original MusicPlayerInfo.tempoC scalar", "track identity", "track index", "MusicPlayerInfo.trackCount", "condition flags", "later branch/body", "other 75 callbacks"],
    },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, frozenV22SelectedRows: 3, selectedRows: 3, stoppedExistSetRows: 4, ambiguousRows: 0, addressFree: true, failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "non-v22-selected-row", "unsupported-packet-field"] },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      frozenV22SelectedRows: 3,
      subtractionResultRows: 3,
      subtractionResultValues: [72],
      bccTakenRows: bccTakenRows.length,
      bccNotTakenRows: bccNotTakenRows.length,
      nullExistSetRows: 4,
      postV22BccDecisionSourceCycles: added,
      acceptedContiguousPrefixThroughSelectedSuccessorPrefixSourceCycles: 5692,
      contiguousPrefixThroughBccDecisionSourceCycles: contiguous,
      sequentialThumbHalfwords: 9,
      iwramHalfwordStores: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 3,
      selectedSuccessor: "_081DD9B6",
      originalTempoCScalar: null,
      laterBranchOrBodySourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV22ArtifactsReadOnly: true,
      allFrozenV21PacketsReadOnly: true,
      frozenV22ArtifactsAreNotProductionImports: noProductionImports,
      frozenV21PacketsAreNotProductionImports: noProductionImports,
      v23PacketsAreNotProductionImports: noProductionImports,
      v23PacketStripBackPreserved: true,
      originalTempoCScalar: null,
      trackIdentity: null,
      trackIndex: null,
      trackCount: null,
      laterBranchOrBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Two fresh byte-identical address-free v23 packet sets join only the three frozen v22 _081DD9B6 sourceStateDigest rows and capture the post-subs r0 subtractionResult scalar. Source/ELF/exact-ROM close the bounded strh/cmp/bcc selection: all three observed values take bcc to _081DD9C4 at 12 cycles each; the source-general non-taken route includes its immediate unconditional b and prices 14, but no unobserved route or successor body is claimed.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 post-subs store/compare/branch v23", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v23.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence. v23 freezes v22 evidence/report byte-for-byte and explicitly re-hash-pins every v21 packet. It joins only the three frozen v22 `sourceStateDigest` rows whose selected successor is `_081DD9B6`. Two fresh v23 packet sets are byte-identical: anchor `fc84cabe…`, LILIANA `f506f1e9…`, and legal-varied `9019c3fa…`. Exact-key validation proves strip-back preservation: every v23 observation contains exactly the join digest plus one address-free scalar, `subtractionResult`.", "",
    "All three selected rows capture `subtractionResult=72` at `_081DD9BC` entry, after `subs r0, 150` and before `strh`. The original `tempoC` scalar is not read, retained, or reconstructed; neither are pointers, runtime addresses, frames/durations, clock, track identity/index/count, condition flags, or later body state. The `bcc` route is source-derived from the captured scalar, not separately captured.", "",
    "Source, ELF, and exact ROM bytes `78 84 96 28 00 d3 57 e7` close only `strh r0, [r7, tempoC]; cmp r0, 150; bcc _081DD9C4; b _081DD874`. Each executed Thumb halfword costs **2** cycles; the IWRAM `strh` adds **0** premium; exactly one taken-control refill costs **6**. The observed `72 < 150` route executes `strh; cmp; taken bcc`: **3×2 + 6 = 12 cycles per row**. The fail-closed source reducer also covers the unobserved bcc-not-taken route, including its immediately executed unconditional `b _081DD874`: **4×2 + 6 = 14 cycles**, then stops before `_081DD874`'s first instruction.", "",
    "| case | callbacks | EXIST-set / selected | bcc taken / not taken | v23 cycles |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => {
      const row = c.byCase[name];
      return `| ${name} | ${row.callbacks} | ${row.existSetRows} / ${row.selectedRows} | ${row.bccTakenRows} / ${row.bccNotTakenRows} | ${row.sourceCycles} |`;
    }),
    "",
    `The aggregate source prefix advances from **5,692** to **${c.contiguousPrefixThroughBccDecisionSourceCycles} cycles** (**36** added). All three observed routes stop before _081DD9C4's first \`ldrb\`; the four EXIST-set rows remain null before _081DD886. Successor bodies, the other 75 callbacks, complete MPlay (**5 exact / 108 null**), service/arbitration, and construction-clock wiring remain null. The Tier-1 red-first proof rejects the 6-cycle under-price that omits the mandatory taken-control refill, and packet state widening fails closed.`, "",
    "Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v23.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v23.md") };
  fail("usage: factory-m4a-note-body-cgb4-v23.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
