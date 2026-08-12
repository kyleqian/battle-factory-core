import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const V23_EVIDENCE_SHA256 = "4ae623c81d7a0d0345a672807a6ba20e1ac3bae812450e45824f26d5ee3346e4";
const V23_DOC_SHA256 = "1c28507bf165e6960a1293764cf192c6decd7619fd756610629edbef8c1011af";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const DEFINES_SHA256 = "528c5983bf23f3b12036e9f7ed20e482b1dbe15e0198ec6bb10292d413f68644";
const LINKER_SHA256 = "ea3df8331ffacc75e1377b2d2f2d8ec6530f6436788b812603ba3af1a964cfb0";
const PLAYER_TABLE_SHA256 = "babb0eb8acce75ada42c2747ca0ef09825135d1c85b46254b1f44520b1a57a36";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROM_SHA256 = "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af";
const BODY_SHA256 = "7819a0d1d7a2513e6f9f8802939f4acc59c4733ebb6ec021ba1e3396dd77706f";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V23_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v23.json");
const V23_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v23.md");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v24.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v24.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fbfc;
const BODY_END = 0x082d_fc00;
const SELECTED_DIGESTS = [
  "2cc957521c57b34f4efd579d9d3b3cf2a96925b919f36766c0d7bfdd2c32175e",
  "c31fe070ed62179a6c35e6b5159a0cda21ddc7cb7bb4494a85be9e3c6f2cb902",
  "e8c4ca3b7f0344a7e8d875e749aec2d53a10c31bc14c41689298552dd5af9da8",
] as const;

function fail(message: string): never {
  throw new Error("factory-m4a-note-body-cgb4-v24: " + message);
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
  if (sha256(bytes) !== hash) fail(path + " changed");
  return bytes;
}

function checkedJson<T>(path: string, hash: string): T {
  return JSON.parse(checkedBytes(path, hash).toString("utf8")) as T;
}

function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(label + " must be a SHA-256 digest");
  return value;
}

export type Cgb4SourceOnlySuccessorPrefixTiming = Readonly<{
  sequentialThumbHalfwords: 2;
  iwramByteLoads: 1;
  iwramWordLoads: 1;
  iwramDataAccessPremiumCycles: 0;
  takenControlTransferRefills: 0;
  sourceCycles: 4;
  stopsBeforeInstruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]";
}>;

/**
 * Price only the fixed source prefix after v23's taken successor.  It accepts
 * no runtime observation, so a later loop/body operand cannot widen this
 * receipt accidentally.
 */
export function reduceCgb4SourceOnlySuccessorPrefixTiming(state: unknown): Cgb4SourceOnlySuccessorPrefixTiming | null {
  if (!isRecord(state) || !exactKeys(state, [])) return null;
  return Object.freeze({
    sequentialThumbHalfwords: 2,
    iwramByteLoads: 1,
    iwramWordLoads: 1,
    iwramDataAccessPremiumCycles: 0,
    takenControlTransferRefills: 0,
    sourceCycles: 4,
    stopsBeforeInstruction: "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
  });
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

  const boundedRoute = "_081DD9C4:\n\tldrb r2, [r7, o_MusicPlayerInfo_trackCount]\n\tldr r5, [r7, o_MusicPlayerInfo_tracks]\n_081DD9C8:\n";
  const playerLayout = [
    "    struct SongHeader *songHeader;",
    "    u32 status;",
    "    u8 trackCount;",
    "    u8 priority;",
    "    u8 cmd;",
    "    u8 unk_B;",
    "    u32 clock;",
    "    u8 gap[8];",
    "    u8 *memAccArea;",
    "    u16 tempoD;",
    "    u16 tempoU;",
    "    u16 tempoI;",
    "    u16 tempoC;",
    "    u16 fadeOI;",
    "    u16 fadeOC;",
    "    u16 fadeOV;",
    "    struct MusicPlayerTrack *tracks;",
    "",
  ].join("\n");
  const cryPlayerDeclaration = "COMMON_DATA struct MusicPlayerInfo gPokemonCryMusicPlayers[MAX_POKEMON_CRIES] = {0};\n";
  const fourPlayerTable = [
    "gMPlayTable::",
    "music_player gMPlayInfo_BGM",
    "music_player gMPlayInfo_SE1",
    "music_player gMPlayInfo_SE2",
    "music_player gMPlayInfo_SE3",
  ];
  if (
    !assembly.includes(boundedRoute) || !internal.includes(playerLayout) || !m4aC.includes(cryPlayerDeclaration) ||
    !internal.includes("#define MAX_POKEMON_CRIES 2") ||
    !defines.includes("#define COMMON_DATA __attribute__((section(\"common_data\")))") ||
    !linker.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K") ||
    !linker.includes("src/*.o(COMMON);") || !fourPlayerTable.every((line) => playerTable.includes(line))
  ) fail("bounded prefix or IWRAM storage provenance changed");

  const body = rom.subarray(BODY_START - ROM_BASE, BODY_END - ROM_BASE);
  const expectedBytes = Buffer.from([0x3a, 0x7a, 0xfd, 0x6a]);
  if (!body.equals(expectedBytes) || sha256(body) !== BODY_SHA256) fail("compiled source-only successor prefix changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const symbol of [
    "082dfbfc t _081DD9C4",
    "082dfc00 t _081DD9C8",
    "030073a0 00000080 B gPokemonCryMusicPlayers",
    "03007420 00000040 B gMPlayInfo_BGM",
    "030075f0 00000040 B gMPlayInfo_SE1",
    "03007630 00000040 B gMPlayInfo_SE2",
    "03007800 00000040 B gMPlayInfo_SE3",
  ]) if (!symbols.includes(symbol)) fail("ELF symbol " + symbol + " changed");

  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1360-1362", sha256: sha256(assembly) },
      musicPlayerInfo: {
        trackCount: {
          path: "reference/pokeemerald/include/gba/m4a_internal.h",
          lines: "327-350",
          offset: 8,
          width: "u8",
          runtimeValue: null,
        },
        tracks: {
          path: "reference/pokeemerald/include/gba/m4a_internal.h",
          lines: "327-350",
          offset: 44,
          width: "pointer",
          runtimeValue: null,
        },
        sha256: sha256(internal),
      },
      staticPlayerStorage: {
        declaration: {
          path: "reference/pokeemerald/src/m4a.c",
          line: 12,
          symbol: "gPokemonCryMusicPlayers",
          entries: 2,
          sha256: sha256(m4aC),
        },
        staticOrder: {
          path: "reference/pokeemerald/sound/music_player_table.inc",
          lines: "29-33",
          ordinaryPlayers: 4,
          cryPlayers: 2,
          staticSlots: 6,
          selectedArrayElement: null,
          sha256: sha256(playerTable),
        },
        commonData: {
          path: "reference/pokeemerald/include/gba/defines.h",
          line: 11,
          section: "common_data",
          sha256: sha256(defines),
        },
        linker: {
          path: "reference/pokeemerald/ld_script.ld",
          lines: "6-10, 32-47",
          class: "IWRAM",
          origin: "0x03000000",
          sha256: sha256(linker),
        },
      },
    },
    elf: {
      entry: "0x082dfbfc",
      endExclusive: "0x082dfc00",
      gPokemonCryMusicPlayers: {
        start: "0x030073a0",
        endExclusive: "0x03007420",
        bytes: 128,
        entries: 2,
        musicPlayerInfoBytes: 64,
        class: "IWRAM",
      },
      sha256: sha256(elf),
    },
    compiledRegions: [{
      role: "ldrb r2, [r7, trackCount]; ldr r5, [r7, tracks]",
      start: "0x082dfbfc",
      endExclusive: "0x082dfc00",
      bytes: body.length,
      bytesHex: "3a 7a fd 6a",
      sha256: BODY_SHA256,
    }],
    timingClasses: {
      sequentialThumbHalfwordCycles: 2,
      iwramByteLoadPremiumCycles: 0,
      iwramWordLoadPremiumCycles: 0,
      takenControlTransferRefillCycles: 6,
      fixedPrefixModel: "ldrb; ldr = 2 halfwords * 2 + zero IWRAM data premium + zero control-transfer refill = 4",
    },
  };
}

function assertV23EvidenceAndReportRegenerate(): void {
  const directory = mkdtempSync(join(tmpdir(), "factory-m4a-note-body-cgb4-v24-v23-"));
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/report/factory-m4a-note-body-cgb4-v23.ts",
    "--out-dir",
    directory,
  ], { cwd: ROOT, stdio: "pipe" });
  if (!readFileSync(join(directory, "factory-m4a-note-body-cgb4-evidence-v23.json")).equals(
    checkedBytes(V23_EVIDENCE, V23_EVIDENCE_SHA256),
  )) fail("v23 evidence does not regenerate byte-for-byte");
  if (!readFileSync(join(directory, "issue55-m4a-note-body-cgb4-v23.md")).equals(
    checkedBytes(V23_DOC, V23_DOC_SHA256),
  )) fail("v23 report does not regenerate byte-for-byte");
}

function isFrozenV23SelectedRow(row: unknown): row is Record<string, unknown> {
  return isRecord(row) &&
    row.selectedSuccessor === "_081DD9B6" &&
    row.subtractionResult === 72 &&
    row.postV22BccDecision === "bcc-taken-to-_081DD9C4" &&
    row.postV22BccDecisionSourceCycles === 12 &&
    row.contiguousPrefixThroughBccDecisionSourceCycles === 804 &&
    row.stopsBeforeV23Instruction === "_081DD9C4: ldrb r2, [r7, o_MusicPlayerInfo_trackCount]";
}

function frozenV23SelectedDigests(frozenV23: unknown): string[] {
  if (!isRecord(frozenV23) || frozenV23.schema !== "factory-m4a-note-body-cgb4-evidence/v23" || !Array.isArray(frozenV23.rows)) {
    fail("frozen v23 evidence identity changed");
  }
  const selected = frozenV23.rows.filter(isFrozenV23SelectedRow);
  const digests = selected.map((row, index) => requireDigest(row.sourceStateDigest, "frozen v23 selected digest " + index));
  if (
    digests.length !== SELECTED_DIGESTS.length ||
    new Set(digests).size !== digests.length ||
    JSON.stringify(digests) !== JSON.stringify(SELECTED_DIGESTS)
  ) fail("frozen v23 selected source-state join is missing, duplicate, reordered, ambiguous, or extra");
  return digests;
}

function productionReceiptContainment(): boolean {
  const forbiddenFragments = [
    "factory-m4a-note-body-cgb4-evidence-v23",
    "issue55-m4a-note-body-cgb4-v23",
    "factory-m4a-note-body-cgb4-v23",
    "factory-m4a-note-body-cgb4-evidence-v24",
    "issue55-m4a-note-body-cgb4-v24",
    "factory-m4a-note-body-cgb4-v24",
  ];
  const visit = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
  const hits = visit(join(ROOT, "src")).filter((path) => {
    const text = readFileSync(path, "utf8");
    return forbiddenFragments.some((fragment) => text.includes(fragment));
  });
  if (hits.length !== 0) fail("production imports frozen evidence or receipts: " + hits.join(", "));
  return true;
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV23 = checkedJson<unknown>(V23_EVIDENCE, V23_EVIDENCE_SHA256);
  assertV23EvidenceAndReportRegenerate();
  const digests = frozenV23SelectedDigests(frozenV23);
  const timing = reduceCgb4SourceOnlySuccessorPrefixTiming({});
  if (!timing) fail("fixed source-only successor prefix became malformed");
  const rows = digests.map((sourceStateDigest) => ({
    sourceStateDigest,
    postV23SourceOnlySuccessorPrefixSourceCycles: timing.sourceCycles,
    contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles: 804 + timing.sourceCycles,
    stopsBeforeV24Instruction: timing.stopsBeforeInstruction,
  }));
  const added = rows.reduce((sum, row) => sum + row.postV23SourceOnlySuccessorPrefixSourceCycles, 0);
  const contiguous = 5728 + added;
  if (
    rows.length !== 3 || added !== 12 || contiguous !== 5740 ||
    !rows.every((row) =>
      row.postV23SourceOnlySuccessorPrefixSourceCycles === 4 &&
      row.contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles === 808 &&
      row.stopsBeforeV24Instruction === "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]",
    )
  ) fail("source-only successor prefix totals changed");

  const noProductionImports = productionReceiptContainment();
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v24",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV23EvidenceSha256: V23_EVIDENCE_SHA256,
      acceptedV23DocSha256: V23_DOC_SHA256,
      v23RegeneratesByteForByte: true,
      v23EvidenceAndReportRetainedByteForByte: true,
    },
    capture: {
      boundary: "source-only _081DD9C4 successor prefix through ldr r5, before _081DD9C8",
      scalars: [],
      excluded: [
        "trackCount",
        "tracks pointer",
        "tracks identity",
        "tracks address",
        "track flags",
        "track index",
        "successor loop body",
        "runtime address",
        "frame",
        "duration",
      ],
    },
    join: {
      key: "sourceStateDigest",
      frozenV23SelectedRows: 3,
      joinedRows: 3,
      ambiguousRows: 0,
      addressFree: true,
      sourceOnly: true,
      failClosed: [
        "missing",
        "duplicate",
        "reordered",
        "ambiguous",
        "extra",
        "non-v23-selected-row",
        "unsupported-runtime-field",
      ],
    },
    coverage: {
      frozenV23SelectedRows: 3,
      sourceOnlySuccessorPrefixRows: 3,
      postV23SourceOnlySuccessorPrefixSourceCycles: added,
      acceptedContiguousPrefixThroughBccDecisionSourceCycles: 5728,
      contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles: contiguous,
      sequentialThumbHalfwords: 6,
      iwramByteLoads: 3,
      iwramWordLoads: 3,
      iwramDataAccessPremiumCycles: 0,
      takenControlTransferRefills: 0,
    },
    rows,
    containment: {
      frozenV23ArtifactsReadOnly: true,
      frozenV23ArtifactsAreNotProductionImports: noProductionImports,
      v24RuntimeCaptureCount: 0,
      trackCount: null,
      tracksPointer: null,
      tracksIdentity: null,
      tracksAddress: null,
      trackFlags: null,
      trackIndex: null,
      successorLoopBody: null,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Source-only v24 freezes v23 evidence/report byte-for-byte and joins only the same three frozen selected sourceStateDigest rows. The fixed _081DD9C4 ldrb/ldr prefix costs four cycles per row from source/ELF/exact-ROM evidence, advancing the aggregate prefix from 5728 to 5740 and stopping before the first track-flags ldrb at _081DD9C8.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 source-only successor prefix v24",
    "",
    "Generated by \`node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v24.ts\`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive, and source-only. v24 freezes v23 evidence/report byte-for-byte, then joins only its same three selected \`sourceStateDigest\` rows. It performs no oracle capture and accepts no runtime scalar or other packet field.",
    "",
    "Source/ELF/exact-ROM close exactly \`_081DD9C4.._081DD9C8\`: \`ldrb r2, [r7, trackCount]\` followed by \`ldr r5, [r7, tracks]\`. The pinned source layout puts those fields at MusicPlayerInfo offsets 8 and 44, while the predecessor's static player-storage proof classifies the accesses as IWRAM without selecting a runtime player. Exact ROM bytes are \`3a 7a fd 6a\`.",
    "",
    "Each of the two sequential Thumb halfwords costs **2** cycles. Both IWRAM loads add **0** data premium and this straight-line prefix executes no control transfer, so it costs **2×2 = 4 cycles per selected row**.",
    "",
    "| frozen selected sourceStateDigest rows | cycles per row | aggregate cycles |",
    "| ---: | ---: | ---: |",
    "| 3 | 4 | 12 |",
    "",
    "The aggregate source prefix advances from **5,728** to **" + c.contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles + " cycles** (**12** added). The receipt stops before \`_081DD9C8\`'s first \`ldrb\` of track flags. It does not capture, serialize, infer, or retain any actual track count, tracks pointer/identity/address, track flags/index/identity, or successor-loop state.",
    "",
    "The Tier-1 red-first proof rejects the intentional 2-cycle under-price, and any runtime-field widening fails closed. Production, presentation, animation, Rust, canonical Battle-2, ratchet, and unsupported-barrier work remain untouched.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    return {
      json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v24.json"),
      doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v24.md"),
    };
  }
  fail("usage: factory-m4a-note-body-cgb4-v24.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, JSON.stringify(evidence, null, 2) + "\n");
  writeFileSync(output.doc, markdown(evidence));
}
