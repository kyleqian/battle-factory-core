import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV10Evidence } from "./factory-m4a-note-body-cgb4-v10.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V10_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v10.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v11.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v11.md");
const ROM_BASE = 0x0800_0000;
const IWRAM_START = 0x0300_0000;
const IWRAM_END = 0x0300_8000;
const RETURN_BRANCH_START = 0x082d_ff04;
const RETURN_BRANCH_END = 0x082d_ff06;
const FINAL_WRITES_START = 0x082d_ff14;
const FINAL_WRITES_END = 0x082d_ff22;
const EPILOGUE_START = 0x082d_ff22;
const EPILOGUE_END = 0x082d_ff32;
const V10_EVIDENCE_SHA256 = "3e3af127e2010c95189fde78aa2b77999c76b8026b48c65080a8da3b50bbb3b0";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const MUSIC_PLAYER_TABLE_SHA256 = "babb0eb8acce75ada42c2747ca0ef09825135d1c85b46254b1f44520b1a57a36";
const CRT0_SHA256 = "6dc9dfef60aa316388551796cbd812b98726c33c7b8f7cdf42ba20574fec658c";
const DEFINES_SHA256 = "528c5983bf23f3b12036e9f7ed20e482b1dbe15e0198ec6bb10292d413f68644";
const LD_SCRIPT_SHA256 = "ea3df8331ffacc75e1377b2d2f2d8ec6530f6436788b812603ba3af1a964cfb0";
const MAP_SHA256 = "27c5f864f0f985637a3934946f256d64064977e2a240efd1ffe2c20b0dd11aa6";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const RETURN_BRANCH_SHA256 = "23edb5b5af45e9490920bc4d068ce5836ebe10c64d6134b01ce11a831e358b87";
const FINAL_WRITES_SHA256 = "762979e69c1f5331dbdda90edcb0a598306c5b3bf3abc1631ca852c05643b336";
const EPILOGUE_SHA256 = "2920edd5012189df801a00c1e0704e2793fd6f7ef797baad4082e39d9b7645b2";
const THUMB_FETCH_CYCLES = 2;
const TAKEN_REFILL_CYCLES = 6;
const IWRAM_ACCESS_PREMIUM_CYCLES = 0;

export type Cgb4PlyNoteReturnState = Readonly<{
  route: "midi-key-to-cgb-freq-return-through-ply-note-return";
  helperReturn: "MidiKeyToCgbFreq";
  callerContinuation: "_081DDCDC";
  channelStorage: "iwram";
  trackStorage: "iwram";
  stackStorage: "iwram";
}>;

export type Cgb4PlyNoteReturnTiming = Readonly<{
  route: "midi-key-to-cgb-freq-return-through-ply-note-return";
  helperReturn: "MidiKeyToCgbFreq";
  callerContinuation: "_081DDCDC";
  channelStorage: "iwram";
  trackStorage: "iwram";
  stackStorage: "iwram";
  returnBranchSequentialThumbHalfwords: 1;
  returnBranchTakenControlTransferRefills: 1;
  returnBranchSourceCycles: 8;
  finalWriteSequentialThumbHalfwords: 7;
  frequencyIwramWordStores: 1;
  statusFlagsIwramByteStores: 1;
  trackFlagsIwramByteReads: 1;
  trackFlagsIwramByteStores: 1;
  finalWriteDataAccessPremiumCycles: 0;
  finalWriteSourceCycles: 14;
  epilogueSequentialThumbHalfwords: 8;
  stackAdjustThumbHalfwords: 1;
  popR0R7MultipleIwramWordReads: 8;
  highRegisterRestoreThumbHalfwords: 4;
  finalPopR0SingleIwramWordReads: 1;
  bxReturnThumbHalfwords: 1;
  epilogueTakenControlTransferRefills: 1;
  epilogueDataAccessPremiumCycles: 0;
  epilogueSourceCycles: 22;
  continuationThroughPlyNoteReturnSourceCycles: 44;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v11: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkedBytes(path: string, expectedHash: string): Buffer {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== expectedHash) fail(`${path} changed`);
  return bytes;
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

type SourceReference = Readonly<{ path: string; line: number; text: string }>;

function sourceReferences(token: string): SourceReference[] {
  const sourceRoot = join(ROOT, "reference/pokeemerald");
  const extensions = new Set([".c", ".h", ".s", ".inc"]);
  const rows: SourceReference[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (extensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) {
        readFileSync(path, "utf8").split("\n").forEach((text, index) => {
          if (text.includes(token)) rows.push({ path: path.slice(sourceRoot.length + 1), line: index + 1, text: text.trim() });
        });
      }
    }
  };
  visit(sourceRoot);
  return rows.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

/**
 * This starts at the helper's return PC. The helper's bx return is already
 * charged by frozen v10, so the fixed caller continuation deliberately has
 * no dynamic target, key, LFO, or runtime-address input.
 */
export function reduceCgb4PlyNoteReturnTiming(state: unknown): Cgb4PlyNoteReturnTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (Object.keys(state).sort().join(",") !== "callerContinuation,channelStorage,helperReturn,route,stackStorage,trackStorage"
    || state.route !== "midi-key-to-cgb-freq-return-through-ply-note-return"
    || state.helperReturn !== "MidiKeyToCgbFreq"
    || state.callerContinuation !== "_081DDCDC"
    || state.channelStorage !== "iwram"
    || state.trackStorage !== "iwram"
    || state.stackStorage !== "iwram") return null;

  const returnBranchSourceCycles: 8 = (THUMB_FETCH_CYCLES + TAKEN_REFILL_CYCLES) as 8;
  const finalWriteSourceCycles: 14 = (7 * THUMB_FETCH_CYCLES + IWRAM_ACCESS_PREMIUM_CYCLES) as 14;
  const epilogueSourceCycles: 22 = (8 * THUMB_FETCH_CYCLES + TAKEN_REFILL_CYCLES + IWRAM_ACCESS_PREMIUM_CYCLES) as 22;
  const continuationThroughPlyNoteReturnSourceCycles: 44 = (returnBranchSourceCycles + finalWriteSourceCycles + epilogueSourceCycles) as 44;
  return Object.freeze({
    route: "midi-key-to-cgb-freq-return-through-ply-note-return",
    helperReturn: "MidiKeyToCgbFreq",
    callerContinuation: "_081DDCDC",
    channelStorage: "iwram",
    trackStorage: "iwram",
    stackStorage: "iwram",
    returnBranchSequentialThumbHalfwords: 1,
    returnBranchTakenControlTransferRefills: 1,
    returnBranchSourceCycles,
    finalWriteSequentialThumbHalfwords: 7,
    frequencyIwramWordStores: 1,
    statusFlagsIwramByteStores: 1,
    trackFlagsIwramByteReads: 1,
    trackFlagsIwramByteStores: 1,
    finalWriteDataAccessPremiumCycles: IWRAM_ACCESS_PREMIUM_CYCLES,
    finalWriteSourceCycles,
    epilogueSequentialThumbHalfwords: 8,
    stackAdjustThumbHalfwords: 1,
    popR0R7MultipleIwramWordReads: 8,
    highRegisterRestoreThumbHalfwords: 4,
    finalPopR0SingleIwramWordReads: 1,
    bxReturnThumbHalfwords: 1,
    epilogueTakenControlTransferRefills: 1,
    epilogueDataAccessPremiumCycles: IWRAM_ACCESS_PREMIUM_CYCLES,
    epilogueSourceCycles,
    continuationThroughPlyNoteReturnSourceCycles,
  });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const m4aC = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  const musicPlayerTable = readFileSync(join(ROOT, "reference/pokeemerald/sound/music_player_table.inc"), "utf8");
  const crt0 = readFileSync(join(ROOT, "reference/pokeemerald/src/crt0.s"), "utf8");
  const defines = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/defines.h"), "utf8");
  const ldScript = readFileSync(join(ROOT, "reference/pokeemerald/ld_script.ld"), "utf8");
  const map = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.map"), "utf8");
  for (const anchor of [
    "bl call_r3",
    "b _081DDCDC",
    "_081DDCDC:",
    "str r0, [r4, o_SoundChannel_frequency]",
    "movs r0, SOUND_CHANNEL_SF_START",
    "strb r0, [r4, o_SoundChannel_statusFlags]",
    "ldrb r1, [r5, o_MusicPlayerTrack_flags]",
    "movs r0, 0xF0",
    "ands r0, r1",
    "strb r0, [r5, o_MusicPlayerTrack_flags]",
    "_081DDCEA:",
    "add sp, 0x18",
    "pop {r0-r7}",
    "mov r8, r0",
    "mov r9, r1",
    "mov r10, r2",
    "mov r11, r3",
    "pop {r0}",
    "bx r0",
    "thumb_func_end ply_note",
  ]) if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  for (const anchor of [
    "MPlayExtender(gCgbChans);",
    "MPlayOpen(mplayInfo, gMPlayTable[i].track, gMPlayTable[i].numTracks);",
    "struct MusicPlayerTrack *track = &gPokemonCryTracks[i * 2];",
    "MPlayOpen(mplayInfo, track, 2);",
    "soundInfo->cgbChans = cgbChans;",
    "CpuFill32(0, cgbChans, sizeof(struct CgbChannel) * 4);",
  ]) if (!m4aC.includes(anchor)) fail(`m4a.c lost ${anchor}`);
  for (const anchor of [
    ".bss",
    "gMPlayTrack_BGM::",
    "gMPlayTrack_SE1::",
    "gMPlayTrack_SE2::",
    "gMPlayTrack_SE3::",
    "music_player gMPlayInfo_BGM, gMPlayTrack_BGM, NUM_TRACKS_BGM, 0",
    "music_player gMPlayInfo_SE1, gMPlayTrack_SE1, NUM_TRACKS_SE1, 1",
    "music_player gMPlayInfo_SE2, gMPlayTrack_SE2, NUM_TRACKS_SE2, 1",
    "music_player gMPlayInfo_SE3, gMPlayTrack_SE3, NUM_TRACKS_SE3, 0",
  ]) if (!musicPlayerTable.includes(anchor)) fail(`music_player_table.inc lost ${anchor}`);
  for (const anchor of ["#define IWRAM_START 0x03000000", "#define IWRAM_END   (IWRAM_START + 0x8000)"]) {
    if (!defines.includes(anchor)) fail(`defines.h lost ${anchor}`);
  }
  if (!crt0.includes("sp_sys: .word IWRAM_END - 0x1c0")) fail("crt0.s lost the IWRAM system stack");
  if (!ldScript.includes("IWRAM (rwx) : ORIGIN = 0x3000000, LENGTH = 32K")) fail("ld_script.ld lost IWRAM region");
  if (sha256(assembly) !== M4A1_SHA256) fail("m4a_1.s source bytes changed");
  if (sha256(m4aC) !== M4A_C_SHA256) fail("m4a.c source bytes changed");
  if (sha256(musicPlayerTable) !== MUSIC_PLAYER_TABLE_SHA256) fail("music_player_table.inc source bytes changed");
  if (sha256(crt0) !== CRT0_SHA256) fail("crt0.s source bytes changed");
  if (sha256(defines) !== DEFINES_SHA256) fail("defines.h source bytes changed");
  if (sha256(ldScript) !== LD_SCRIPT_SHA256) fail("ld_script.ld source bytes changed");
  if (sha256(map) !== MAP_SHA256) fail("map bytes changed");

  const openReferences = sourceReferences("MPlayOpen(");
  const expectedOpenReferences = [
    "include/gba/m4a_internal.h:430:void MPlayOpen(struct MusicPlayerInfo *mplayInfo, struct MusicPlayerTrack *tracks, u8 trackCount);",
    "src/m4a.c:86:MPlayOpen(mplayInfo, gMPlayTable[i].track, gMPlayTable[i].numTracks);",
    "src/m4a.c:97:MPlayOpen(mplayInfo, track, 2);",
    "src/m4a.c:565:void MPlayOpen(struct MusicPlayerInfo *mplayInfo, struct MusicPlayerTrack *tracks, u8 trackCount)",
  ];
  const extenderReferences = sourceReferences("MPlayExtender(");
  const expectedExtenderReferences = [
    "include/gba/m4a_internal.h:428:void MPlayExtender(struct CgbChannel *cgbChans);",
    "src/m4a.c:77:MPlayExtender(gCgbChans);",
    "src/m4a.c:257:void MPlayExtender(struct CgbChannel *cgbChans)",
  ];
  const normalize = (rows: SourceReference[]) => rows.map((row) => `${row.path}:${row.line}:${row.text}`);
  if (JSON.stringify(normalize(openReferences)) !== JSON.stringify(expectedOpenReferences)) fail("complete MPlayOpen source-reference census changed");
  if (JSON.stringify(normalize(extenderReferences)) !== JSON.stringify(expectedExtenderReferences)) fail("complete MPlayExtender source-reference census changed");

  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elfBytes = readFileSync(elfPath);
  if (sha256(elfBytes) !== ELF_SHA256) fail("pokeemerald.elf bytes changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const iwramSymbols = [
    "03001340 00000320 B gMPlayTrack_BGM",
    "03001660 000000f0 B gMPlayTrack_SE1",
    "03001750 000002d0 B gMPlayTrack_SE2",
    "03001a20 00000050 B gMPlayTrack_SE3",
    "030074f0 00000100 B gCgbChans",
    "03007670 00000140 B gPokemonCryTracks",
  ];
  for (const symbol of [
    ...iwramSymbols,
    "082dfd38 00000204 T ply_note",
    "082dff14 t _081DDCDC",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  if (!map.includes("gMPlayTrack_BGM") || !map.includes("gMPlayTrack_SE3") || !map.includes("gCgbChans = .") || !map.includes("gPokemonCryTracks = .")) fail("map lost static MPlay/CGB storage anchors");
  for (const symbol of iwramSymbols) {
    const start = Number.parseInt(symbol.slice(0, 8), 16);
    const size = Number.parseInt(symbol.slice(9, 17), 16);
    if (!(start >= IWRAM_START && start + size <= IWRAM_END)) fail(`ELF symbol escaped IWRAM: ${symbol}`);
  }

  const regions = [
    { role: "post-MidiKeyToCgbFreq return branch", start: RETURN_BRANCH_START, end: RETURN_BRANCH_END, bytes: 2, hash: RETURN_BRANCH_SHA256 },
    { role: "_081DDCDC frequency/status/track-flag writes", start: FINAL_WRITES_START, end: FINAL_WRITES_END, bytes: 14, hash: FINAL_WRITES_SHA256 },
    { role: "ply_note stack/high-register/bx epilogue", start: EPILOGUE_START, end: EPILOGUE_END, bytes: 16, hash: EPILOGUE_SHA256 },
  ];
  for (const region of regions) {
    const bytes = romSlice(region.start, region.end);
    if (bytes.length !== region.bytes || sha256(bytes) !== region.hash) fail(`${region.role} ROM bytes changed`);
  }

  return {
    source: {
      continuation: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1789-1812", sha256: sha256(assembly) },
      mplayRegistration: { path: "reference/pokeemerald/src/m4a.c", lines: "70-99,257-321,565-612", sha256: sha256(m4aC) },
      staticTrackStorage: { path: "reference/pokeemerald/sound/music_player_table.inc", lines: "1-36", sha256: sha256(musicPlayerTable) },
      stack: { path: "reference/pokeemerald/src/crt0.s", line: 28, sha256: sha256(crt0) },
      iwramDefinition: { path: "reference/pokeemerald/include/gba/defines.h", lines: "27-29", sha256: sha256(defines) },
      linker: { path: "reference/pokeemerald/ld_script.ld", line: 9, sha256: sha256(ldScript) },
      map: { path: "reference/pokeemerald/pokeemerald.map", sha256: sha256(map) },
    },
    elf: {
      plyNote: "0x082dfd38+0x204",
      finalContinuationLabel: "0x082dff14",
      sha256: sha256(elfBytes),
      iwramSymbols,
    },
    compiledRegions: regions.map((region) => ({
      role: region.role,
      start: `0x${region.start.toString(16)}`,
      endExclusive: `0x${region.end.toString(16)}`,
      bytes: region.bytes,
      sha256: region.hash,
    })),
    memoryClassClosure: {
      completeMPlayOpenAllocationCensus: true,
      mplayOpenReferenceCensus: openReferences,
      mplayExtenderReferenceCensus: extenderReferences,
      registeredTrackAllocations: ["gMPlayTrack_BGM", "gMPlayTrack_SE1", "gMPlayTrack_SE2", "gMPlayTrack_SE3", "gPokemonCryTracks"],
      trackStorage: "iwram",
      channelStorage: "iwram",
      stackStorage: "iwram",
      channelProof: "m4aSoundInit passes gCgbChans to MPlayExtender, which assigns soundInfo->cgbChans before callbacks",
      stackProof: "crt0 sp_sys is IWRAM_END - 0x1c0",
      iwramRange: ["0x03000000", "0x03008000"],
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
    },
    timingClasses: {
      sequentialThumbFetchCycles: THUMB_FETCH_CYCLES,
      takenControlTransferRefillCycles: TAKEN_REFILL_CYCLES,
      iwramSingleByteOrWordAccessPremiumCycles: IWRAM_ACCESS_PREMIUM_CYCLES,
      iwramMultipleWordAccessPremiumCycles: IWRAM_ACCESS_PREMIUM_CYCLES,
      ewramAccessesInThisSlice: 0,
      model: "one 2-cycle sequential Thumb halfword per executed instruction; taken b/bx adds one 6-cycle refill; IWRAM single and multiple data accesses add zero premium",
    },
    sourceCycleAccounting: {
      returnBranch: "1*2 + 1*6 = 8",
      finalWrites: "7*2 + 0 IWRAM premiums = 14",
      epilogue: "8*2 + 1*6 + 0 IWRAM premiums = 22",
      fullContinuation: "8 + 14 + 22 = 44",
    },
  };
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const frozenV10Bytes = checkedBytes(V10_EVIDENCE, V10_EVIDENCE_SHA256);
  const frozenV10 = JSON.parse(frozenV10Bytes.toString("utf8")) as any;
  const regeneratedV10Bytes = Buffer.from(`${JSON.stringify(makeV10Evidence(), null, 2)}\n`);
  if (!regeneratedV10Bytes.equals(frozenV10Bytes)) fail("accepted v10 evidence does not regenerate byte-for-byte");
  if (frozenV10.schema !== "factory-m4a-note-body-cgb4-evidence/v10" || frozenV10.oracleProfile !== "battle-scene-off" || !frozenV10.addressFree) fail("frozen v10 identity changed");
  if (frozenV10.coverage?.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles !== 4127) fail("accepted v10 boundary changed");
  if (!Array.isArray(frozenV10.rows) || frozenV10.rows.length !== 7) fail("frozen v10 CGB4 row count changed");
  const priorByDigest = new Map<string, any>();
  for (const prior of frozenV10.rows) {
    if (!isRecord(prior) || typeof prior.sourceStateDigest !== "string" || priorByDigest.has(prior.sourceStateDigest)) fail("v10 sourceStateDigest join became ambiguous");
    if (prior.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles === undefined || prior.completeNoteCallbackSourceCycles !== null || prior.postCallbackGlueSourceCycles !== null) fail("v10 continuation boundary changed");
    priorByDigest.set(prior.sourceStateDigest, prior);
  }

  const timing = reduceCgb4PlyNoteReturnTiming({
    route: "midi-key-to-cgb-freq-return-through-ply-note-return",
    helperReturn: "MidiKeyToCgbFreq",
    callerContinuation: "_081DDCDC",
    channelStorage: "iwram",
    trackStorage: "iwram",
    stackStorage: "iwram",
  });
  if (!timing) fail("fixed ply_note continuation became unresolved");
  const rows = [...priorByDigest.values()].map((prior) => ({
    sourceStateDigest: prior.sourceStateDigest,
    case: prior.case,
    trackIndex: prior.trackIndex,
    contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles: prior.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles,
    helperReturn: timing.helperReturn,
    callerContinuation: timing.callerContinuation,
    continuationThroughPlyNoteReturnSourceCycles: timing.continuationThroughPlyNoteReturnSourceCycles,
    contiguousPrefixThroughPlyNoteReturnSourceCycles: prior.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles + timing.continuationThroughPlyNoteReturnSourceCycles,
    frequencyStorage: "CgbChannel.frequency/iwram",
    frequencyIwramWordStores: timing.frequencyIwramWordStores,
    statusFlagsValue: 0x80,
    statusFlagsIwramByteStores: timing.statusFlagsIwramByteStores,
    trackFlagsMask: 0xf0,
    trackFlagsIwramByteReads: timing.trackFlagsIwramByteReads,
    trackFlagsIwramByteStores: timing.trackFlagsIwramByteStores,
    popR0R7MultipleIwramWordReads: timing.popR0R7MultipleIwramWordReads,
    highRegisterRestoreThumbHalfwords: timing.highRegisterRestoreThumbHalfwords,
    finalPopR0SingleIwramWordReads: timing.finalPopR0SingleIwramWordReads,
    completeNoteCallbackSourceCycles: prior.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles + timing.continuationThroughPlyNoteReturnSourceCycles,
    postCallbackGlueSourceCycles: null,
  }));
  const byCase = Object.fromEntries(["anchor", "liliana", "factory-varied"].map((caseName) => {
    const caseRows = rows.filter((row) => row.case === caseName);
    return [caseName, { callbacks: caseRows.length, continuationCycles: caseRows.length * timing.continuationThroughPlyNoteReturnSourceCycles }];
  }));
  if (JSON.stringify(Object.fromEntries(Object.entries(byCase).map(([name, value]: [string, any]) => [name, value.callbacks]))) !== JSON.stringify({ anchor: 0, liliana: 3, "factory-varied": 4 })) fail("frozen v10 CGB4 case census changed");
  const throughMidiReturn = rows.reduce((sum, row) => sum + row.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles, 0);
  const continuationCycles = rows.reduce((sum, row) => sum + row.continuationThroughPlyNoteReturnSourceCycles, 0);
  const throughPlyReturn = rows.reduce((sum, row) => sum + row.contiguousPrefixThroughPlyNoteReturnSourceCycles, 0);
  const completeNoteCycles = rows.reduce((sum, row) => sum + row.completeNoteCallbackSourceCycles, 0);
  if (throughMidiReturn !== 4127 || continuationCycles !== 308 || throughPlyReturn !== 4435 || completeNoteCycles !== throughPlyReturn) fail("v11 timing totals changed");

  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v11",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: { acceptedV10EvidenceSha256: V10_EVIDENCE_SHA256, v10RegeneratesByteForByte: true },
    capture: {
      boundary: "frozen v10 MidiKeyToCgbFreq return through the fixed ply_note bx r0 return",
      scalars: ["none; the continuation is fixed after frozen v10's helper return"],
      excluded: ["oracle recapture", "runtime pointer", "runtime address", "frame", "duration", "callback identity", "post-callback dispatcher/glue"],
    },
    join: { key: "sourceStateDigest", rows: rows.length, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: rows.length,
      byCase,
      exactMidiKeyToCgbFreqReturnCallbacks: rows.length,
      exactPlyNoteReturnCallbacks: rows.length,
      continuationThroughPlyNoteReturnSourceCyclesPerCallback: timing.continuationThroughPlyNoteReturnSourceCycles,
      continuationThroughPlyNoteReturnSourceCycles: continuationCycles,
      contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles: throughMidiReturn,
      contiguousPrefixThroughPlyNoteReturnSourceCycles: throughPlyReturn,
      exactCompleteNoteCallbacks: rows.length,
      exactCompleteNoteCallbackSourceCycles: completeNoteCycles,
      returnBranches: rows.length,
      frequencyIwramWordStores: rows.length * timing.frequencyIwramWordStores,
      statusFlagsIwramByteStores: rows.length * timing.statusFlagsIwramByteStores,
      trackFlagsIwramByteReads: rows.length * timing.trackFlagsIwramByteReads,
      trackFlagsIwramByteStores: rows.length * timing.trackFlagsIwramByteStores,
      popR0R7MultipleIwramWordReads: rows.length * timing.popR0R7MultipleIwramWordReads,
      highRegisterRestoreThumbHalfwords: rows.length * timing.highRegisterRestoreThumbHalfwords,
      finalPopR0SingleIwramWordReads: rows.length * timing.finalPopR0SingleIwramWordReads,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 75,
      nullPostCallbackGlueCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The same seven sourceStateDigest-joined CGB4 callbacks are exact from the frozen MidiKeyToCgbFreq return PC, through b _081DDCDC, the frequency/status/track-flag writes, and ply_note's final bx r0 return.",
      contiguousPrefix: "4435 aggregate source cycles through ply_note return across seven callbacks (4127 frozen v10 + 308 v11).",
      remainingDiscriminator: "Post-callback MPlay dispatcher/glue, the other 75 note callbacks, unobserved helper/key/nonzero-LFO routes, all complete-MPlay totals, service/arbitration, and construction clock remain null.",
      durationFit: false,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Frozen v10 is byte-identical and joined only by sourceStateDigest. Static source/ELF/ROM proof closes seven complete ply_note callbacks: the fixed 44-cycle continuation yields 4435 aggregate cycles through bx r0 return without touching post-callback glue.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<string, { callbacks: number; continuationCycles: number }>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 return continuation v11", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v11.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. v11 reads only the frozen v10 receipt, verifies it regenerates byte-for-byte, and joins solely by `sourceStateDigest`. It captures no new oracle data and uses neither runtime pointer identity nor runtime-address lookup.", "",
    "The v10 helper already charges its final `MidiKeyToCgbFreq` `bx` return. This slice starts at its caller return PC `0x082dff04`: the compiled `b _081DDCDC` is one sequential Thumb halfword plus a taken-refill (**8 cycles**). It then executes the fixed `_081DDCDC` block: `str frequency`, `movs 0x80`/`strb statusFlags`, `ldrb flags`, `movs 0xf0`, `ands`, and `strb flags`—seven sequential halfwords, **14 cycles**.", "",
    "Every newly charged memory access is source/ELF-proven IWRAM. `m4aSoundInit` passes static `gCgbChans` to `MPlayExtender`, which assigns `soundInfo->cgbChans`; the four `gMPlayTrack_*` arrays and `gPokemonCryTracks` exhaust the two `MPlayOpen` allocation callsites and all lie in the IWRAM ELF range. `crt0` installs `sp_sys` at `IWRAM_END - 0x1c0`. Thus the frequency word store, status byte store, track-flags byte load/store, `pop {r0-r7}`'s eight-word **multiple** IWRAM read, and final `pop {r0}`'s one-word **single** IWRAM read all have zero data-access premium.", "",
    "The complete `ply_note` epilogue is counted exactly: `add sp, 0x18`; `pop {r0-r7}`; four high-register restores (`mov r8/r9/r10/r11`); final `pop {r0}`; and `bx r0`. That is eight sequential halfwords plus the final taken `bx` refill, **22 cycles**. ARM7TDMI accounting is therefore `1*2 + 1*6 = 8`, `7*2 = 14`, and `8*2 + 1*6 = 22`: **44 cycles per callback**. Source hashes, exact ELF symbols, and three separately hashed ROM regions guard every counted instruction range.", "",
    `Across the frozen **${coverage.cgbChannel4Callbacks}/82** callbacks, this adds **${coverage.continuationThroughPlyNoteReturnSourceCycles} cycles** to v10's **${coverage.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles} aggregate cycles**, yielding **${coverage.contiguousPrefixThroughPlyNoteReturnSourceCycles} aggregate cycles** through ply_note's final return.`, "",
    "| case | callbacks | continuation cycles |", "| --- | ---: | ---: |",
    ...["anchor", "liliana", "factory-varied"].map((name) => `| ${name} | ${byCase[name].callbacks} | ${byCase[name].continuationCycles} |`), "",
    "This closes complete `ply_note` costs only for the same seven callbacks. Post-callback MPlay dispatcher/glue, the other 75 note callbacks, unobserved helper/key/nonzero-LFO routes, all complete-MPlay totals, service/arbitration, and `runFactoryConstructionClock` remain null. No duration fit, production recording import, runtime address lookup, unsupported barrier, animation/Rust work, or canonical Battle-2 branch is present.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v11.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v11.md") };
  fail("usage: factory-m4a-note-body-cgb4-v11.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
