import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV9Evidence } from "./factory-m4a-note-body-cgb4-v9.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const KEY_COUNTS = { 64: 4, 91: 3 } as const;
const V9_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "13d6526138359b145d707c0fdf55d074527e93e5e6d6b37d52bdd61c8414bedd",
  liliana: "86d4d2c5dfc6d63a74d5708fb50b8eb84d02b3218bedde9b066f30c278ce934e",
  "factory-varied": "87a32977d6d69546e4720f2715ccf1315efebbee5d4826783cc35cbeca161fb2",
};
const V9_EVIDENCE_SHA256 = "2dd867648aa3ecb307a041a4868a2f06f934097dded180bc21c5afd1d8f52e4b";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_TABLES_SHA256 = "6d407283c29e707f8dfb85be4eaee3111af4b393d8f2fb370e2390c87ddf09c6";
const M4A_INTERNAL_H_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const MAP_SHA256 = "27c5f864f0f985637a3934946f256d64064977e2a240efd1ffe2c20b0dd11aa6";
const CALL_R3_ENTRY_SHA256 = "477db9ac7ca5efc12e37f882656b8fe5a363ffeb99b2e565a953d10c3c91ab21";
const MIDI_KEY_TO_CGB_FREQ_SHA256 = "4377844ebb1d188dd92436bbe784237a330026867f4cda5ab8345cdf2ec08aee";
const MIDI_KEY_NOISE_LITERAL_SHA256 = "7041c777c797e870148eed38ae6c6688244a17635b827def6ca4693227cb2056";
const NOISE_TABLE_SHA256 = "197f0679262884d48dd459dcfe690c0a41e8a73cf76cb62838119fc9cb0e7ab6";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v9");
const V9_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v9.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v10.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v10.md");
const ROM_BASE = 0x0800_0000;
const CALL_R3_ENTRY = 0x082d_fcb4;
const CALL_R3_ENTRY_END = 0x082d_fcb6;
const MIDI_START = 0x082e_0b34;
const MIDI_END = 0x082e_0bdc;
const MIDI_NOISE_LITERAL = 0x082e_0b68;
const NOISE_TABLE_START = 0x0867_5c18;
const NOISE_TABLE_END = 0x0867_5c54;

const THUMB_FETCH_CYCLES = 2;
const TAKEN_REFILL_CYCLES = 6;
const IWRAM_ACCESS_PREMIUM_CYCLES = 0;
const ROM_BYTE_TOTAL_CYCLES = 9;
const ROM_WORD_TOTAL_CYCLES = 11;

export type Cgb4MidiKeyToCgbFreqState = Readonly<{
  route: "call-r3-midi-key-to-cgb-freq-type4";
  target: "source-init-midi-key-to-cgb-freq";
  toneType: 12;
  keyAfter: 64 | 91;
  keyM: 0;
}>;

export type Cgb4MidiKeyToCgbFreqTiming = Readonly<{
  route: "cgb4-type4-noise-table";
  target: "MidiKeyToCgbFreq";
  toneType: 12;
  channelNumber: 4;
  keyAfter: 64 | 91;
  keyM: 0;
  keyPassedToHelper: 64 | 91;
  keyAfterSubtract21: 43 | 70;
  clampBranch: "bls-taken-no-clamp" | "bls-not-taken-clamp-to-59";
  noiseTableIndex: 43 | 59;
  midiKeyToCgbFreqResult: 0x34 | 0x04;
  callR3BxEdgeSequentialThumbHalfwords: 1;
  callR3BxEdgePipelineRefills: 1;
  callR3BxEdgeSourceCycles: 8;
  sequentialThumbHalfwords: 26 | 27;
  pipelineRefills: 4 | 5;
  iwramStackWordWrites: 5;
  iwramStackWordReads: 5;
  iwramDataAccessPremiumCycles: 0;
  romLiteralWordReads: 1;
  romLiteralWordTotalCycles: 11;
  romLiteralWordPremiumCycles: 9;
  romNoiseTableByteReads: 1;
  romNoiseTableByteTotalCycles: 9;
  romNoiseTableBytePremiumCycles: 7;
  multiplyInstructions: 0;
  multiplyInternalCycles: 0;
  multiplyInternalPremiumCycles: 0;
  midiKeyToCgbFreqSourceCycles: 94 | 98;
  callR3ToReturnSourceCycles: 102 | 106;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v10: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkedJson<T>(path: string, expectedHash: string): T {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== expectedHash) fail(`${path} changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}

function requireU8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 0xff) fail(`${label} must be u8`);
  return value as number;
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

/**
 * Reduce only the two source-proven type-4 key routes present in frozen v9.
 * The third argument (pitM/fineAdjust) is intentionally absent: the source's
 * chanNum == 4 branch never reads it after the ABI normalization.
 */
export function reduceMPlayCgb4MidiKeyToCgbFreqTiming(state: unknown): Cgb4MidiKeyToCgbFreqTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (Object.keys(state).sort().join(",") !== "keyAfter,keyM,route,target,toneType"
    || state.route !== "call-r3-midi-key-to-cgb-freq-type4"
    || state.target !== "source-init-midi-key-to-cgb-freq"
    || state.toneType !== 12
    || state.keyM !== 0) return null;

  const keyAfter = requireU8(state.keyAfter, "keyAfter");
  if (keyAfter !== 64 && keyAfter !== 91) return null;

  const keyAfterSubtract21 = keyAfter - 21;
  const clamped = keyAfterSubtract21 > 59;
  const noiseTableIndex = clamped ? 59 : keyAfterSubtract21;
  const midiKeyToCgbFreqResult = clamped ? 0x04 : 0x34;
  const sequentialThumbHalfwords = clamped ? 27 : 26;
  const pipelineRefills = clamped ? 4 : 5;
  const midiKeyToCgbFreqSourceCycles = sequentialThumbHalfwords * THUMB_FETCH_CYCLES
    + pipelineRefills * TAKEN_REFILL_CYCLES
    + (ROM_WORD_TOTAL_CYCLES - THUMB_FETCH_CYCLES)
    + (ROM_BYTE_TOTAL_CYCLES - THUMB_FETCH_CYCLES);
  const callR3BxEdgeSourceCycles = THUMB_FETCH_CYCLES + TAKEN_REFILL_CYCLES;
  return Object.freeze({
    route: "cgb4-type4-noise-table",
    target: "MidiKeyToCgbFreq",
    toneType: 12,
    channelNumber: 4,
    keyAfter: keyAfter as 64 | 91,
    keyM: 0,
    keyPassedToHelper: keyAfter as 64 | 91,
    keyAfterSubtract21: keyAfterSubtract21 as 43 | 70,
    clampBranch: clamped ? "bls-not-taken-clamp-to-59" : "bls-taken-no-clamp",
    noiseTableIndex: noiseTableIndex as 43 | 59,
    midiKeyToCgbFreqResult: midiKeyToCgbFreqResult as 0x34 | 0x04,
    callR3BxEdgeSequentialThumbHalfwords: 1,
    callR3BxEdgePipelineRefills: 1,
    callR3BxEdgeSourceCycles,
    sequentialThumbHalfwords: sequentialThumbHalfwords as 26 | 27,
    pipelineRefills: pipelineRefills as 4 | 5,
    iwramStackWordWrites: 5,
    iwramStackWordReads: 5,
    iwramDataAccessPremiumCycles: IWRAM_ACCESS_PREMIUM_CYCLES,
    romLiteralWordReads: 1,
    romLiteralWordTotalCycles: ROM_WORD_TOTAL_CYCLES,
    romLiteralWordPremiumCycles: ROM_WORD_TOTAL_CYCLES - THUMB_FETCH_CYCLES,
    romNoiseTableByteReads: 1,
    romNoiseTableByteTotalCycles: ROM_BYTE_TOTAL_CYCLES,
    romNoiseTableBytePremiumCycles: ROM_BYTE_TOTAL_CYCLES - THUMB_FETCH_CYCLES,
    multiplyInstructions: 0,
    multiplyInternalCycles: 0,
    multiplyInternalPremiumCycles: 0,
    midiKeyToCgbFreqSourceCycles: midiKeyToCgbFreqSourceCycles as 94 | 98,
    callR3ToReturnSourceCycles: (callR3BxEdgeSourceCycles + midiKeyToCgbFreqSourceCycles) as 102 | 106,
  });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const m4aC = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  const tables = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_tables.c"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const map = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.map"), "utf8");
  for (const anchor of [
    "ldr r3, [r3, o_SoundInfo_MidiKeyToCgbFreq]",
    "bl call_r3",
    "call_r3:",
    "bx r3",
  ]) if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  for (const anchor of [
    "SoundInit(&gSoundInfo);",
    "MPlayExtender(gCgbChans);",
    "soundInfo->MidiKeyToCgbFreq = (MidiKeyToCgbFreqFunc)DummyFunc;",
    "soundInfo->MidiKeyToCgbFreq = MidiKeyToCgbFreq;",
    "u32 MidiKeyToCgbFreq(u8 chanNum, u8 key, u8 fineAdjust)",
    "if (chanNum == 4)",
    "if (key <= 20)",
    "key -= 21;",
    "if (key > 59)",
    "return gNoiseTable[key];",
  ]) if (!m4aC.includes(anchor)) fail(`m4a.c lost ${anchor}`);
  if ((m4aC.match(/soundInfo->MidiKeyToCgbFreq\s*=/g) ?? []).length !== 2) fail("MidiKeyToCgbFreq field write count changed");
  if (m4aC.indexOf("SoundInit(&gSoundInfo);") > m4aC.indexOf("MPlayExtender(gCgbChans);")) fail("m4aSoundInit initialization order changed");
  for (const anchor of ["const u8 gNoiseTable[]", "0x37, 0x36, 0x35, 0x34", "0x03, 0x02, 0x01, 0x00"]) {
    if (!tables.includes(anchor)) fail(`m4a_tables.c lost ${anchor}`);
  }
  if (sha256(assembly) !== M4A1_SHA256) fail("m4a_1.s source bytes changed");
  if (sha256(m4aC) !== M4A_C_SHA256) fail("m4a.c source bytes changed");
  if (sha256(tables) !== M4A_TABLES_SHA256) fail("m4a_tables.c source bytes changed");
  if (sha256(internal) !== M4A_INTERNAL_H_SHA256) fail("m4a_internal.h source bytes changed");
  if (sha256(map) !== MAP_SHA256) fail("map bytes changed");

  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of [
    "082dfcb4 t call_r3",
    "082e0b34 000000a8 T MidiKeyToCgbFreq",
    "08675c18 0000003c R gNoiseTable",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  if (!map.includes("0x03006380") || !map.includes("gSoundInfo = .") || !map.includes("0x030074f0") || !map.includes("gCgbChans = .")) fail("map lost IWRAM sound anchors");

  if (romSlice(CALL_R3_ENTRY, CALL_R3_ENTRY_END).length !== 2 || sha256(romSlice(CALL_R3_ENTRY, CALL_R3_ENTRY_END)) !== CALL_R3_ENTRY_SHA256) fail("call_r3 entry bytes changed");
  if (romSlice(MIDI_START, MIDI_END).length !== 0xa8 || sha256(romSlice(MIDI_START, MIDI_END)) !== MIDI_KEY_TO_CGB_FREQ_SHA256) fail("MidiKeyToCgbFreq bytes changed");
  if (romSlice(MIDI_NOISE_LITERAL, MIDI_NOISE_LITERAL + 4).length !== 4 || sha256(romSlice(MIDI_NOISE_LITERAL, MIDI_NOISE_LITERAL + 4)) !== MIDI_KEY_NOISE_LITERAL_SHA256) fail("MidiKeyToCgbFreq noise literal changed");
  if (romSlice(NOISE_TABLE_START, NOISE_TABLE_END).length !== 0x3c || sha256(romSlice(NOISE_TABLE_START, NOISE_TABLE_END)) !== NOISE_TABLE_SHA256) fail("gNoiseTable bytes changed");

  return {
    source: {
      caller: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1784-1789", sha256: sha256(assembly) },
      initialization: { path: "reference/pokeemerald/src/m4a.c", lines: "70-77,308-311,353-398", sha256: sha256(m4aC) },
      helper: { path: "reference/pokeemerald/src/m4a.c", lines: "810-825", sha256: sha256(m4aC) },
      tables: { path: "reference/pokeemerald/src/m4a_tables.c", lines: "149-162", sha256: sha256(tables) },
      soundInfo: { path: "reference/pokeemerald/include/gba/m4a_internal.h", lines: "181-216", sha256: sha256(internal) },
      map: { path: "reference/pokeemerald/pokeemerald.map", sha256: sha256(map) },
    },
    targetResolution: {
      proof: "source-init-midi-key-to-cgb-freq",
      m4aSoundInitOrder: ["SoundInit(&gSoundInfo)", "MPlayExtender(gCgbChans)"],
      soundInitInitialTarget: "DummyFunc",
      mplayExtenderTarget: "MidiKeyToCgbFreq",
      fieldWritesInPinnedSource: 2,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
    },
    elf: {
      callR3Entry: "0x082dfcb4",
      midiKeyToCgbFreq: "0x082e0b34",
      midiKeyToCgbFreqSize: "0xa8",
      gNoiseTable: "0x08675c18",
    },
    compiledRegions: [
      { role: "call_r3 bx r3 edge", start: "0x082dfcb4", endExclusive: "0x082dfcb6", bytes: 2, sha256: CALL_R3_ENTRY_SHA256 },
      { role: "complete MidiKeyToCgbFreq body and literal pool", start: "0x082e0b34", endExclusive: "0x082e0bdc", bytes: 0xa8, sha256: MIDI_KEY_TO_CGB_FREQ_SHA256 },
      { role: "MidiKeyToCgbFreq gNoiseTable literal", start: "0x082e0b68", endExclusive: "0x082e0b6c", bytes: 4, sha256: MIDI_KEY_NOISE_LITERAL_SHA256 },
      { role: "gNoiseTable", start: "0x08675c18", endExclusive: "0x08675c54", bytes: 0x3c, sha256: NOISE_TABLE_SHA256 },
    ],
    timingClasses: {
      sequentialThumbFetchCycles: THUMB_FETCH_CYCLES,
      takenControlTransferRefillCycles: TAKEN_REFILL_CYCLES,
      notTakenConditionalBranchRefillCycles: 0,
      iwramStackAccessPremiumCycles: IWRAM_ACCESS_PREMIUM_CYCLES,
      romLiteralWordReadTotalCycles: ROM_WORD_TOTAL_CYCLES,
      romLiteralWordReadPremiumCycles: ROM_WORD_TOTAL_CYCLES - THUMB_FETCH_CYCLES,
      romNoiseTableByteReadTotalCycles: ROM_BYTE_TOTAL_CYCLES,
      romNoiseTableByteReadPremiumCycles: ROM_BYTE_TOTAL_CYCLES - THUMB_FETCH_CYCLES,
      multiplyInternalCycles: 0,
      multiplyInternalPremiumCycles: 0,
      dynamicTarget: "resolved only from pinned source initialization; no runtime pointer value or address lookup",
    },
    sourceCycleAccounting: {
      callR3BxEdge: { sequentialThumbHalfwords: 1, takenControlTransferRefills: 1, cycles: 8 },
      key64: {
        sourceRoute: "chanNum==4, key>20, key-21=43, bls taken",
        sequentialThumbHalfwords: 26, pipelineRefills: 5,
        iwramStackWordWrites: 5, iwramStackWordReads: 5,
        romLiteralWordReads: 1, romNoiseTableByteReads: 1,
        multiplyInstructions: 0, multiplyInternalCycles: 0,
        cycles: "26*2 + 5*6 + (11-2) + (9-2) = 98",
        callR3ToReturnCycles: "8 + 98 = 106",
      },
      key91: {
        sourceRoute: "chanNum==4, key>20, key-21=70, bls not taken, clamp=59",
        sequentialThumbHalfwords: 27, pipelineRefills: 4,
        iwramStackWordWrites: 5, iwramStackWordReads: 5,
        romLiteralWordReads: 1, romNoiseTableByteReads: 1,
        multiplyInstructions: 0, multiplyInternalCycles: 0,
        cycles: "27*2 + 4*6 + (11-2) + (9-2) = 94",
        callR3ToReturnCycles: "8 + 94 = 102",
      },
    },
  };
}

type Packet = { schema: string; case: CaseName; oracleProfile: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: any[] };

function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), V9_PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v9" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "sixth-MPlayMain-ply_note-CGB4-pan-sweep-at-bne" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} v9 packet identity changed`);
  return packet;
}

function callbackRows(): Array<{ sourceStateDigest: string; case: CaseName; callback: any }> {
  return CASES.flatMap((name) => loadPacket(name).observations.flatMap((observation: any) =>
    (observation.noteCallbacks ?? []).filter((callback: any) => callback.toneType === 12)
      .map((callback: any) => ({ sourceStateDigest: observation.sourceStateDigest, case: name, callback }))));
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const frozenV9 = checkedJson<any>(V9_EVIDENCE, V9_EVIDENCE_SHA256);
  if (JSON.stringify(makeV9Evidence()) !== JSON.stringify(frozenV9)) fail("accepted v9 evidence does not regenerate byte-for-byte");
  if (frozenV9.coverage?.contiguousPrefixThroughCallR3EntrySourceCycles !== 3453) fail("accepted v9 boundary changed");

  const callbacks = callbackRows();
  if (callbacks.length !== 7) fail("CGB4 callback count changed");
  const byDigest = new Map(callbacks.map((row) => [row.sourceStateDigest, row]));
  if (byDigest.size !== 7) fail("CGB4 source-state join became ambiguous");
  const v9Rows = new Map((frozenV9.rows as any[]).map((row) => [row.sourceStateDigest, row]));
  const rows = callbacks.map(({ sourceStateDigest, case: caseName, callback }) => {
    const prior = v9Rows.get(sourceStateDigest);
    if (!prior || prior.case !== caseName) fail("v10 packet missed a frozen v9 row");
    const post = callback.cgb4PostChnVolSetState;
    const timing = reduceMPlayCgb4MidiKeyToCgbFreqTiming({
      route: "call-r3-midi-key-to-cgb-freq-type4",
      target: "source-init-midi-key-to-cgb-freq",
      toneType: callback.toneType,
      keyAfter: callback.keyAfter,
      keyM: post?.keyM,
    });
    if (!timing) fail(`${caseName} observed MidiKeyToCgbFreq route became unresolved`);
    return {
      sourceStateDigest,
      case: prior.case,
      trackIndex: prior.trackIndex,
      acceptedContiguousPrefixThroughCallR3EntrySourceCycles: prior.contiguousPrefixThroughCallR3EntrySourceCycles,
      targetResolution: timing.target,
      toneType: timing.toneType,
      channelNumber: timing.channelNumber,
      keyAfter: timing.keyAfter,
      keyM: timing.keyM,
      keyPassedToHelper: timing.keyPassedToHelper,
      keyAfterSubtract21: timing.keyAfterSubtract21,
      clampBranch: timing.clampBranch,
      noiseTableIndex: timing.noiseTableIndex,
      midiKeyToCgbFreqResult: timing.midiKeyToCgbFreqResult,
      callR3BxEdgeSourceCycles: timing.callR3BxEdgeSourceCycles,
      midiKeyToCgbFreqSourceCycles: timing.midiKeyToCgbFreqSourceCycles,
      dynamicCallR3HelperSourceCycles: timing.callR3ToReturnSourceCycles,
      dynamicMidiKeyToCgbFreqSourceCycles: timing.midiKeyToCgbFreqSourceCycles,
      contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles: prior.contiguousPrefixThroughCallR3EntrySourceCycles + timing.callR3ToReturnSourceCycles,
      laterAllocationFieldsSourceCycles: null,
      completeNoteCallbackSourceCycles: null,
      postCallbackGlueSourceCycles: null,
    };
  });
  if (rows.length !== 7) fail("v10 evidence contains an unjoined CGB4 row");

  const byCase = Object.fromEntries(CASES.map((name) => {
    const caseRows = rows.filter((row: any) => row.case === name);
    return [name, {
      callbacks: caseRows.length,
      exactCallR3ToReturnRoutes: caseRows.length,
      key64Callbacks: caseRows.filter((row: any) => row.keyAfter === 64).length,
      key91Callbacks: caseRows.filter((row: any) => row.keyAfter === 91).length,
      callR3ToReturnSourceCycles: caseRows.reduce((sum: number, row: any) => sum + row.dynamicCallR3HelperSourceCycles, 0),
    }];
  })) as Record<CaseName, any>;
  for (const name of CASES) if (byCase[name].callbacks !== CGB4_COUNTS[name]) fail(`${name} CGB4 coverage changed`);
  const key64Rows = rows.filter((row: any) => row.keyAfter === 64);
  const key91Rows = rows.filter((row: any) => row.keyAfter === 91);
  if (key64Rows.length !== KEY_COUNTS[64] || key91Rows.length !== KEY_COUNTS[91]) fail("observed key census changed");
  const bxCycles = rows.reduce((sum: number, row: any) => sum + row.callR3BxEdgeSourceCycles, 0);
  const helperCycles = rows.reduce((sum: number, row: any) => sum + row.dynamicMidiKeyToCgbFreqSourceCycles, 0);
  const dynamicCycles = rows.reduce((sum: number, row: any) => sum + row.dynamicCallR3HelperSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles, 0);
  if (bxCycles !== 56 || helperCycles !== 674 || dynamicCycles !== 730 || contiguous !== 4183) fail("v10 timing totals changed");

  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v10",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: { acceptedV9EvidenceSha256: V9_EVIDENCE_SHA256, packetSha256: V9_PACKET_HASHES, packetRepeatSha256: V9_PACKET_HASHES },
    capture: {
      boundary: "frozen v9 call_r3 entry through source-proven MidiKeyToCgbFreq return",
      scalars: ["none; keyAfter/keyM/toneType are reused from frozen v9 state"],
      excluded: ["pointer", "runtime address", "frame", "duration", "callback identity", "pitM/fineAdjust value", "later allocation fields", "result bytes from runtime"],
      targetProof: "SoundInit installs DummyFunc, then MPlayExtender source-initializes MidiKeyToCgbFreq before the observed MPlay callbacks; no runtime pointer identity is used",
    },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      exactCallR3BxEdgeCallbacks: 7,
      callR3BxEdgeSourceCycleRange: { min: 8, max: 8, distinct: 1 },
      callR3BxEdgeSourceCycles: bxCycles,
      exactMidiKeyToCgbFreqCallbacks: 7,
      midiKeyToCgbFreqSourceCycleRange: { min: 94, max: 98, distinct: 2 },
      midiKeyToCgbFreqSourceCycles: helperCycles,
      dynamicCallR3ToReturnSourceCycleRange: { min: 102, max: 106, distinct: 2 },
      dynamicCallR3ToReturnSourceCycles: dynamicCycles,
      acceptedContiguousPrefixThroughCallR3EntrySourceCycles: 3453,
      contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles: contiguous,
      observedKeyAfterValues: { "64": key64Rows.length, "91": key91Rows.length },
      observedKeyMValues: { "0": 7 },
      keyPassedToHelperValues: { "64": key64Rows.length, "91": key91Rows.length },
      keyAfterSubtract21Values: { "43": key64Rows.length, "70": key91Rows.length },
      noiseTableIndices: { "43": key64Rows.length, "59": key91Rows.length },
      midiKeyToCgbFreqResults: { "52": key64Rows.length, "4": key91Rows.length },
      clampBranchCounts: { blsTakenNoClamp: key64Rows.length, blsNotTakenClampTo59: key91Rows.length, clampMovExecuted: key91Rows.length },
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    branchCoverage: {
      observed: {
        sourceInitializedTarget: 7,
        chanNum4BneNotTaken: 7,
        keyAtMost20BhiTaken: 7,
        key64BlsTaken: key64Rows.length,
        key91BlsNotTaken: key91Rows.length,
        key91ClampMovExecuted: key91Rows.length,
        callR3BxEdges: 7,
        noiseTableReturns: 7,
      },
      unobservedNonType4Route: null,
      unobservedKeyAtMost20Route: null,
      unobservedType4KeyRoutes: null,
      runtimePointerIdentity: null,
    },
    rows,
    closure: {
      closed: "Pinned source initialization resolves the SoundInfo target; the call_r3 bx edge and both observed type-4 MidiKeyToCgbFreq routes are source/ROM/ELF exact through bx return, including gNoiseTable results.",
      contiguousPrefix: "4183 aggregate source cycles through MidiKeyToCgbFreq return across seven callbacks (3453 accepted through call_r3 entry + 730 new).",
      remainingDiscriminator: "Later allocation fields, unobserved type-4 keys and non-type-4 helper routes, clear_modM, nonzero-lfoDelay routes, other 75 callbacks, complete note/glue/MPlay, service/arbitration, and construction clock remain null.",
      durationFit: false,
      runtimePointerIdentity: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "The source-initialized SoundInfo target is fail-closed without runtime pointer identity. The same 7/82 callbacks split into four key=64 no-clamp routes (106 cycles from call_r3 entry through return) and three key=91 clamp-to-59 routes (102 cycles); the exact aggregate prefix is 4183 cycles through MidiKeyToCgbFreq return.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, any>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 `MidiKeyToCgbFreq` v10", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v10.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. The v10 receipt preserves frozen v9 packets and evidence byte-for-byte and joins solely by `sourceStateDigest`; no new oracle packet or runtime pointer identity is used.", "",
    "The pinned source initialization is sufficient to fail closed: `m4aSoundInit` calls `SoundInit(&gSoundInfo)` and then `MPlayExtender(gCgbChans)`; `SoundInit` installs `DummyFunc`, while `MPlayExtender` assigns `MidiKeyToCgbFreq`. The pinned source contains exactly those two field writes, in that order, so the observed callback target is source-proven without looking up a runtime pointer.", "",
    `The same **${coverage.cgbChannel4Callbacks}/82** callbacks are covered: **0 anchor / 3 LILIANA / 4 legal-varied**. Frozen v9 state has four key=64 rows and three key=91 rows; all have type 12 (channel 4), keyM=0, and the type-4 helper ignores the uncaptured fineAdjust/pitM value.`, "",
    "The fixed `call_r3` edge is `bx r3`: one sequential Thumb halfword plus one taken refill, **8 cycles** per callback. `MidiKeyToCgbFreq` then executes the complete type-4 route. Key 64 subtracts 21 to index 43 with the `bls` no-clamp branch and returns `gNoiseTable[43] = 0x34`; key 91 subtracts 21 to 70, takes the clamp branch to index 59, and returns `gNoiseTable[59] = 0x04`.", "",
    "All timing classes are explicit: sequential Thumb fetches are 2 cycles, taken refills are 6, IWRAM stack accesses have zero premium, the ROM literal word read is 11 total (9 premium over the load's 2-cycle instruction class), the ROM noise-table byte read is 9 total (7 premium), and this route executes no multiply or multiply-internal cycles. The helper is **98 cycles** for key 64 (26 halfwords/5 refills) and **94 cycles** for key 91 (27 halfwords/4 refills); including `bx r3`, the dynamic edge-to-return costs are **106/102**.", "",
    `The new slice adds **${coverage.dynamicCallR3ToReturnSourceCycles} cycles** across seven callbacks, extending the accepted **3453-cycle** call_r3-entry prefix to **${coverage.contiguousPrefixThroughMidiKeyToCgbFreqReturnSourceCycles} aggregate cycles** through the helper return.`, "",
    "| case | callbacks | key=64 | key=91 | edge-to-return cycles |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => `| ${name} | ${byCase[name].callbacks} | ${byCase[name].key64Callbacks} | ${byCase[name].key91Callbacks} | ${byCase[name].callR3ToReturnSourceCycles} |`), "",
    "Later allocation fields, unobserved type-4 keys/non-type-4 helper routes, `clear_modM`, nonzero-LFO routes, the other 75 callbacks, complete note/glue/MPlay (**5 exact / 108 null**), service/arbitration, and `runFactoryConstructionClock` remain null. No duration fit, runtime address lookup, production recording import, unsupported barrier, or canonical Battle-2 branch is present.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v10.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v10.md") };
  fail("usage: factory-m4a-note-body-cgb4-v10.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
