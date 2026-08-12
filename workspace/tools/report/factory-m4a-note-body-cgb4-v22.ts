import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV21Evidence } from "./factory-m4a-note-body-cgb4-v21.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const SELECTED_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 1, "factory-varied": 2 };

const V21_EVIDENCE_SHA256 = "769bb40e135cea0fff5f450a844e7da1b9f63f9ba385785823d815350ae08586";
const V21_DOC_SHA256 = "297333080fac72fc87c8d44ff3252c0ece106d97c2bcf84bdff1c771dd5742b0";
const V21_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "f13515a24c83091558deacba966a4454b536d6ee06c8e82a37ef848763f576df",
  liliana: "11d4dab534db89ffdae18b9fa910594417f0535a69eb67fe739b9eb808d8e8ae",
  "factory-varied": "7adb7dfdbec2e01034c673d6c0480a78fe7165de47eda8b37bd699870d0126d2",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const DEFINES_SHA256 = "528c5983bf23f3b12036e9f7ed20e482b1dbe15e0198ec6bb10292d413f68644";
const LINKER_SHA256 = "ea3df8331ffacc75e1377b2d2f2d8ec6530f6436788b812603ba3af1a964cfb0";
const PLAYER_TABLE_SHA256 = "babb0eb8acce75ada42c2747ca0ef09825135d1c85b46254b1f44520b1a57a36";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const PREFIX_SHA256 = "3ab19dde983c5c91bf32301508da96527e812c6cf5e5eea2cad4fc133f6e7599";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V21_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v21.json");
const V21_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v21.md");
const V21_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v21");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v22.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v22.md");
const ROM_BASE = 0x0800_0000;
const PREFIX_START = 0x082d_fbee;
const PREFIX_END = 0x082d_fbf4;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v22: ${message}`); }
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

export type Cgb4R4TakenSuccessorPrefixTiming = Readonly<{
  route: "r4-nonzero-bne-taken-successor-prefix";
  selectedSuccessor: "_081DD9B6";
  sequentialThumbHalfwords: 3;
  iwramWordStores: 1;
  iwramHalfwordLoads: 1;
  iwramDataAccessPremiumCycles: 0;
  takenControlTransferRefills: 0;
  statusWriteSourceCycles: 2;
  tempoPrefixInstructionSourceCycles: 4;
  sourceCycles: 6;
  stopsBeforeInstruction: "_081DD9BC: strh r0, [r7, o_MusicPlayerInfo_tempoC]";
}>;

/** Price only the three fixed instructions after v21's observed taken r4 branch. */
export function reduceCgb4R4TakenSuccessorPrefixTiming(state: unknown): Cgb4R4TakenSuccessorPrefixTiming | null {
  if (!isRecord(state) || !exactKeys(state, ["r4Nonzero"]) || state.r4Nonzero !== true) return null;
  return Object.freeze({
    route: "r4-nonzero-bne-taken-successor-prefix",
    selectedSuccessor: "_081DD9B6",
    sequentialThumbHalfwords: 3,
    iwramWordStores: 1,
    iwramHalfwordLoads: 1,
    iwramDataAccessPremiumCycles: 0,
    takenControlTransferRefills: 0,
    statusWriteSourceCycles: 2,
    tempoPrefixInstructionSourceCycles: 4,
    sourceCycles: 6,
    stopsBeforeInstruction: "_081DD9BC: strh r0, [r7, o_MusicPlayerInfo_tempoC]",
  } as Cgb4R4TakenSuccessorPrefixTiming);
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
    sha256(assembly) !== M4A1_SHA256 || sha256(m4aC) !== M4A_C_SHA256 ||
    sha256(internal) !== M4A_INTERNAL_SHA256 || sha256(defines) !== DEFINES_SHA256 ||
    sha256(linker) !== LINKER_SHA256 || sha256(playerTable) !== PLAYER_TABLE_SHA256 ||
    sha256(elf) !== ELF_SHA256 || sha256(rom) !== ROM_SHA256
  ) fail("source, linker, ELF, or ROM changed");

  const successorPrefix = "_081DD9B6:\n\tstr r4, [r7, o_MusicPlayerInfo_status]\n\tldrh r0, [r7, o_MusicPlayerInfo_tempoC]\n\tsubs r0, 150\n_081DD9BC:\n\tstrh r0, [r7, o_MusicPlayerInfo_tempoC]\n";
  const cryPlayerDeclaration = "COMMON_DATA struct MusicPlayerInfo gPokemonCryMusicPlayers[MAX_POKEMON_CRIES] = {0};\n";
  const cryPlayerInit = "struct MusicPlayerInfo *mplayInfo = &gPokemonCryMusicPlayers[i];";
  const fourPlayerTable = ["gMPlayTable::", "music_player gMPlayInfo_BGM", "music_player gMPlayInfo_SE1", "music_player gMPlayInfo_SE2", "music_player gMPlayInfo_SE3"];
  const playerFields = "    struct SongHeader *songHeader;\n    u32 status;\n    u8 trackCount;\n    u8 priority;\n    u8 cmd;\n    u8 unk_B;\n    u32 clock;\n    u8 gap[8];\n    u8 *memAccArea;\n    u16 tempoD;\n    u16 tempoU;\n    u16 tempoI;\n    u16 tempoC;\n";
  if (
    !assembly.includes(successorPrefix) || !m4aC.includes(cryPlayerDeclaration) || !m4aC.includes(cryPlayerInit) ||
    !internal.includes(playerFields) || !internal.includes("#define MAX_POKEMON_CRIES 2") ||
    !defines.includes("#define COMMON_DATA __attribute__((section(\"common_data\")))") ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") ||
    !linker.includes("src/*.o(COMMON);") || !fourPlayerTable.every((line) => playerTable.includes(line))
  ) fail("successor, field-offset, or sixth-player IWRAM provenance changed");

  const prefix = rom.subarray(PREFIX_START - ROM_BASE, PREFIX_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x7c, 0x60, 0x78, 0x8c, 0x96, 0x38]);
  if (!prefix.equals(expectedBytes) || sha256(prefix) !== PREFIX_SHA256) fail("compiled successor prefix changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of [
    "082dfbdc t _081DD9A4", "082dfbee t _081DD9B6", "082dfbf4 t _081DD9BC",
    "030073a0 00000080 B gPokemonCryMusicPlayers", "03007420 00000040 B gMPlayInfo_BGM",
    "030075f0 00000040 B gMPlayInfo_SE1", "03007630 00000040 B gMPlayInfo_SE2", "03007800 00000040 B gMPlayInfo_SE3",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1351-1356", sha256: sha256(assembly) },
      musicPlayerInfoOffsets: {
        path: "reference/pokeemerald/include/gba/m4a_internal.h", lines: "327-350",
        status: { offset: 4, width: "u32" }, tempoC: { offset: 34, width: "u16" }, sha256: sha256(internal),
      },
      sixthPlayerProvenance: {
        declaration: { path: "reference/pokeemerald/src/m4a.c", line: 12, symbol: "gPokemonCryMusicPlayers", entries: 2, sha256: sha256(m4aC) },
        staticPlayerOrder: { path: "reference/pokeemerald/sound/music_player_table.inc", lines: "29-33", ordinaryPlayers: 4, cryPlayers: 2, staticSlots: 6, sixthPlayerStorageSymbol: "gPokemonCryMusicPlayers", selectedArrayElement: null, sha256: sha256(playerTable) },
        commonData: { path: "reference/pokeemerald/include/gba/defines.h", line: 11, section: "common_data", sha256: sha256(defines) },
        linker: { path: "reference/pokeemerald/ld_script.ld", lines: "6-10, 32-47", class: "IWRAM", origin: "0x03000000", sha256: sha256(linker) },
      },
    },
    elf: {
      exit: "0x082dfbdc", successorLabel: "0x082dfbee", firstUnpricedInstruction: "0x082dfbf4",
      gPokemonCryMusicPlayers: { start: "0x030073a0", endExclusive: "0x03007420", bytes: 128, entries: 2, musicPlayerInfoBytes: 64, class: "IWRAM" },
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "str r4, [r7, status]; ldrh r0, [r7, tempoC]; subs r0, 150",
      start: "0x082dfbee", endExclusive: "0x082dfbf4", bytes: prefix.length, bytesHex: "7c 60 78 8c 96 38", sha256: PREFIX_SHA256,
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      iwramDataAccessPremiumCycles: 0,
      model: "three executed Thumb halfwords; one IWRAM word store and one IWRAM halfword load add no premium; no control transfer executes in this prefix",
    },
  };
}

function assertFrozenV21Packets(): void {
  const expectedFiles = CASES.map((name) => `${name}.json`).sort();
  const actualFiles = readdirSync(V21_PACKETS).filter((name) => name.endsWith(".json")).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) fail("frozen v21 packet directory changed");
  for (const name of CASES) checkedBytes(join(V21_PACKETS, `${name}.json`), V21_PACKET_HASHES[name]);
}

function assertV21EvidenceAndReportRegenerate(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v22-v21-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-note-body-cgb4-v21.ts", "--out-dir", directory], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v21.json")).equals(checkedBytes(V21_EVIDENCE, V21_EVIDENCE_SHA256))) fail("v21 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v21.md")).equals(checkedBytes(V21_DOC, V21_DOC_SHA256))) fail("v21 report does not regenerate byte-for-byte");
}

function isFrozenV21R4TakenRow(row: any): boolean {
  return row.finalClearTrackExitRoute === "exist-clear-final-track-ble-taken" &&
    row.clockExitR4Nonzero === true && row.clockExitDecisionRoute === "r4-nonzero-bne-taken" &&
    row.postV20ClockExitDecisionSourceCycles === 16 && row.contiguousPrefixThroughClockExitDecisionSourceCycles === 786 &&
    row.selectedSuccessor === null && row.statusWriteSourceCycles === null && row.tempoOrBodySourceCycles === null &&
    row.stopsBeforeV20SelectedSuccessor === "_081DD9A4";
}

function isFrozenV21ExistSetRow(row: any): boolean {
  return row.finalClearTrackExitRoute === null && row.clockExitR4Nonzero === null && row.clockExitDecisionRoute === null &&
    row.postV20ClockExitDecisionSourceCycles === null && row.contiguousPrefixThroughClockExitDecisionSourceCycles === null &&
    row.selectedSuccessor === null && row.statusWriteSourceCycles === null && row.tempoOrBodySourceCycles === null &&
    row.stopsBeforeV20SelectedSuccessor === "_081DD886";
}

function productionPacketContainment(): boolean {
  const forbiddenFragments = [
    "factory-m4a-note-body-cgb4-evidence-v21", "issue55-m4a-note-body-cgb4-v21", "factory-m4a-note-body-cgb4-v21",
    "factory-m4a-note-body-cgb4-evidence-v22", "issue55-m4a-note-body-cgb4-v22", "factory-m4a-note-body-cgb4-v22",
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
  const frozenV21 = checkedJson<any>(V21_EVIDENCE, V21_EVIDENCE_SHA256);
  assertFrozenV21Packets();
  assertV21EvidenceAndReportRegenerate();
  if (JSON.stringify(makeV21Evidence()) !== JSON.stringify(frozenV21)) fail("accepted v21 does not regenerate byte-for-byte");
  if (!Array.isArray(frozenV21.rows) || frozenV21.rows.length !== 7) fail("frozen v21 row count changed");
  if (frozenV21.schema !== "factory-m4a-note-body-cgb4-evidence/v21" || frozenV21.coverage?.contiguousPrefixThroughClockExitDecisionSourceCycles !== 5674) fail("frozen v21 aggregate changed");

  const seenDigests = new Set<string>();
  const rows = frozenV21.rows.map((prior: any) => {
    const digest = requireDigest(prior?.sourceStateDigest, "frozen v21 sourceStateDigest");
    if (seenDigests.has(digest)) fail("frozen v21 source-state join became ambiguous");
    seenDigests.add(digest);
    if (isFrozenV21R4TakenRow(prior)) {
      const timing = reduceCgb4R4TakenSuccessorPrefixTiming({ r4Nonzero: prior.clockExitR4Nonzero });
      if (!timing) fail("frozen v21 taken r4 row is malformed");
      return {
        ...prior,
        selectedSuccessor: timing.selectedSuccessor,
        postV21SelectedSuccessorPrefixSourceCycles: timing.sourceCycles,
        contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles: prior.contiguousPrefixThroughClockExitDecisionSourceCycles + timing.sourceCycles,
        statusWriteSourceCycles: timing.statusWriteSourceCycles,
        tempoPrefixInstructionSourceCycles: timing.tempoPrefixInstructionSourceCycles,
        tempoCScalar: null,
        subtractionResult: null,
        postV22BccDecision: null,
        laterBranchOrBodySourceCycles: null,
        stopsBeforeV22Instruction: timing.stopsBeforeInstruction,
      };
    }
    if (!isFrozenV21ExistSetRow(prior)) fail("frozen v21 row is neither an exact r4-taken row nor a stopped EXIST-set row");
    return {
      ...prior,
      selectedSuccessor: null,
      postV21SelectedSuccessorPrefixSourceCycles: null,
      contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles: null,
      statusWriteSourceCycles: null,
      tempoPrefixInstructionSourceCycles: null,
      tempoCScalar: null,
      subtractionResult: null,
      postV22BccDecision: null,
      laterBranchOrBodySourceCycles: null,
      stopsBeforeV22Instruction: "_081DD886",
    };
  });
  if (seenDigests.size !== 7) fail("frozen v21 source-state row census changed");
  const selectedRows = rows.filter((row: any) => row.selectedSuccessor !== null);
  const existSetRows = rows.filter((row: any) => row.selectedSuccessor === null);
  const added = selectedRows.reduce((sum: number, row: any) => sum + row.postV21SelectedSuccessorPrefixSourceCycles, 0);
  const contiguous = frozenV21.coverage.contiguousPrefixThroughClockExitDecisionSourceCycles + added;
  if (
    selectedRows.length !== 3 || existSetRows.length !== 4 || added !== 18 || contiguous !== 5692 ||
    !selectedRows.every((row: any) => row.selectedSuccessor === "_081DD9B6" && row.statusWriteSourceCycles === 2 && row.tempoPrefixInstructionSourceCycles === 4 && row.contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles === 792) ||
    !existSetRows.every((row: any) => row.stopsBeforeV22Instruction === "_081DD886")
  ) fail("v22 selected-successor prefix totals changed");

  const byCase = Object.fromEntries(CASES.map((name) => {
    const caseRows = rows.filter((row: any) => row.case === name);
    return [name, {
      callbacks: caseRows.length,
      existSetRows: caseRows.filter((row: any) => row.selectedSuccessor === null).length,
      r4TakenRows: caseRows.filter((row: any) => row.selectedSuccessor !== null).length,
      sourceCycles: caseRows.reduce((sum: number, row: any) => sum + (row.postV21SelectedSuccessorPrefixSourceCycles ?? 0), 0),
    }];
  }));
  for (const name of CASES) {
    if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name] || (byCase[name] as any).r4TakenRows !== SELECTED_COUNTS[name]) fail(`${name} census changed`);
  }
  const noProductionImports = productionPacketContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v22",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV21EvidenceSha256: V21_EVIDENCE_SHA256,
      acceptedV21DocSha256: V21_DOC_SHA256,
      v21RegeneratesByteForByte: true,
      v21EvidenceAndReportRetainedByteForByte: true,
      allV21PacketsRetainedByteForByte: true,
      v21PacketDirectoryExact: true,
      packetSha256: V21_PACKET_HASHES,
      packetRepeatSha256: V21_PACKET_HASHES,
    },
    capture: {
      boundary: "source-only successor prefix after v21's frozen r4-nonzero taken branch and before _081DD9BC strh",
      scalars: [],
      excluded: ["pointer", "runtime address", "frame", "duration", "MusicPlayerInfo.clock scalar", "MusicPlayerInfo.tempoC scalar", "subtraction result", "bcc decision", "later branch/body", "track identity", "track index", "MusicPlayerInfo.trackCount", "other 75 callbacks"],
    },
    join: {
      key: "sourceStateDigest", rows: 7, cgb4Rows: 7, frozenV21R4TakenRows: 3, selectedSuccessorRows: 3,
      stoppedExistSetRows: 4, ambiguousRows: 0, addressFree: true,
      failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra", "r4-zero", "non-v21-row"],
    },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      frozenV21R4NonzeroRows: 3,
      nullExistSetRows: 4,
      postV21SelectedSuccessorPrefixSourceCycles: added,
      acceptedContiguousPrefixThroughClockExitDecisionSourceCycles: 5674,
      contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles: contiguous,
      sequentialThumbHalfwords: 9,
      iwramWordStores: 3,
      iwramHalfwordLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      selectedSuccessor: "_081DD9B6",
      tempoCScalar: null,
      subtractionResult: null,
      bccDecision: null,
      laterBranchOrBodySourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    containment: {
      frozenV21ArtifactsReadOnly: true,
      allFrozenV21PacketsReadOnly: true,
      frozenV21ArtifactsAreNotProductionImports: noProductionImports,
      frozenV21PacketsAreNotProductionImports: noProductionImports,
      v22PacketsCaptured: false,
      tempoCScalar: null,
      subtractionResult: null,
      bccDecision: null,
      laterBranchOrBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Frozen v21 evidence, report, and all three packet bytes are checked before a source-only join of exactly the three v21 r4Nonzero taken-branch sourceStateDigest rows. Source/ELF/exact-ROM close only _081DD9B6's three-instruction status/tempo prefix at 6 cycles per row; the first strh, every scalar/result/branch after it, and all four EXIST-set rows remain outside the boundary.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 r4-taken successor prefix v22", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v22.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive, and source-only. v22 freezes all v21 artifacts: its evidence and report regenerate byte-for-byte, and the exact three-file v21 packet directory is hash-pinned byte-for-byte. It joins only the three frozen v21 `sourceStateDigest` rows with `r4Nonzero=true` / the already-proven taken branch; no new packet or runtime scalar is read.", "",
    "The selected successor is source-determined as `_081DD9B6`. Source, ELF, the six exact ROM bytes `7c 60 78 8c 96 38`, and strengthened sixth-player `gPokemonCryMusicPlayers` IWRAM provenance close exactly `str r4, [r7, status]`; `ldrh r0, [r7, tempoC]`; and `subs r0, 150`. They execute **3×2 = 6 cycles per row**: one IWRAM word store and one IWRAM halfword load add **0** premium, and no control transfer executes in the prefix. No status value, `tempoC` scalar, subtraction result, or branch decision is captured or inferred.", "",
    "| case | callbacks | EXIST-set / r4-taken | v22 cycles |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => {
      const row = c.byCase[name];
      return `| ${name} | ${row.callbacks} | ${row.existSetRows} / ${row.r4TakenRows} | ${row.sourceCycles} |`;
    }),
    "",
    `The aggregate source prefix advances from **5,674** to **${c.contiguousPrefixThroughSelectedSuccessorPrefixSourceCycles} cycles** (**18** added). The four EXIST-set rows remain null before _081DD886. Every selected row stops before _081DD9BC's first \`strh\`; \`tempoC\`, its subtraction result, the \`bcc\` decision, later body, the other 75 callbacks, complete MPlay, service/arbitration, and construction-clock wiring remain null. Production has no frozen-artifact import.`, "",
    "Production, presentation, animation, Rust, and canonical Battle-2 work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v22.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v22.md") };
  fail("usage: factory-m4a-note-body-cgb4-v22.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
