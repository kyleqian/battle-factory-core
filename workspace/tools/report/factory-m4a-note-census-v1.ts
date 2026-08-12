import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeVolEvidence } from "./factory-m4a-vol-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "d71c40f5078db50508985b28eb0b36c1b9713ee889696ffe1af59ebcdf15fd01",
  liliana: "58031720e867e9bbb33311fb5577afc0621bdb5561aad49f6c7a2c841009e615",
  "factory-varied": "789fabb54fae6102d3fb3a13d6958e44ab0aa8b4ac1d23da7dcfaf7e1617ce20",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-census-v1");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-census-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-census-v1.md");
const ROM_BASE = 0x0800_0000;
const PLY_NOTE_START = 0x082d_fd38;
const RHYTHM_PREFIX_END = 0x082d_fdd0;
const DRUMSET_START = 0x0867_6148;
const SONG_STARTS = [0x0895_8848, 0x0895_8984, 0x0895_8d12, 0x0895_90b7, 0x0895_912c, 0x0895_9754, 0x0895_9db6, 0x0895_a2e6, 0x0895_a56d, 0x0895_a6c8] as const;
const THUMB_FETCH_CYCLES = 2;
const PIPELINE_REFILL_CYCLES = 6;
const ROM_LITERAL_PREMIUM_CYCLES = 9;
const EWRAM_WORD_PREMIUM_CYCLES = 2;
const ROM_BYTE_PREMIUM_CYCLES = 7;

type SourcePointer = Readonly<{ role: string; offset: number }>;
export type NoteCallback = Readonly<{
  trackIndex: number; noteCode: number; commandPointer: SourcePointer; commandBytes: number[];
  acceptedParameters: number; keyBefore: number; velocityBefore: number; keyAfter: number; velocityAfter: number;
  toneType: number; toneTable: SourcePointer | null; selectedTone: { index: number; scalarBytes: number[] } | null;
  derivedSelector: string; observedSelector: string;
}>;
type Observation = { sourceStateDigest: string; noteCallbacks: NoteCallback[] | null };
type Packet = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; addressFree: boolean; observations: Observation[] };
type PriorRow = { sourceStateDigest: string; case: CaseName; passCount: number; knownComponentsSourceCycles: number; completeMPlaySourceCycles: number | null };

export type RhythmToneSelectionTiming = Readonly<{
  route: "rhythm-midi-key-drumset"; acceptedParameters: number; sequentialThumbHalfwords: number;
  pipelineRefills: number; romLiteralLoads: number; ewramWordAccesses: number; gamepakByteReads: number;
  cycles: number; selectedMidiKey: number; selectedToneType: number; rhythmPan: number;
}>;

function fail(message: string): never { throw new Error(`factory-m4a-note-census-v1: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function u8(value: number, label: string): number { if (!Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be u8`); return value; }
function roleIndex(role: string): number {
  const match = /^battle-factory-bgm-track-([1-9])$/.exec(role);
  if (!match) fail("commandPointer must name a Battle Factory song track");
  return Number(match[1]) - 1;
}
function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}
function sourceSongBytes(pointer: SourcePointer): number[] {
  const index = roleIndex(pointer.role);
  const length = SONG_STARTS[index + 1]! - SONG_STARTS[index]!;
  if (!Number.isInteger(pointer.offset) || pointer.offset < 0 || pointer.offset + 3 > length) fail("commandPointer escapes its compiled song role");
  return [...romSlice(SONG_STARTS[index]! + pointer.offset, SONG_STARTS[index]! + pointer.offset + 3)];
}
function parseParameters(entry: NoteCallback): { accepted: number; key: number; velocity: number } {
  if (entry.commandBytes.length !== 3 || entry.commandBytes.some((value) => !Number.isInteger(value) || value < 0 || value > 0xff)) fail("commandBytes must contain three u8 values");
  let accepted = 0, key = u8(entry.keyBefore, "keyBefore"), velocity = u8(entry.velocityBefore, "velocityBefore");
  if (entry.commandBytes[0]! < 0x80) {
    key = entry.commandBytes[0]!; accepted = 1;
    if (entry.commandBytes[1]! < 0x80) {
      velocity = entry.commandBytes[1]!; accepted = 2;
      if (entry.commandBytes[2]! < 0x80) accepted = 3;
    }
  }
  return { accepted, key, velocity };
}

/** Count the exact compiled entry-through-`_081DDB9C` rhythm selection prefix. */
export function reduceMPlayRhythmToneSelectionTiming(entry: NoteCallback): RhythmToneSelectionTiming {
  if (!Number.isInteger(entry.trackIndex) || entry.trackIndex < 0 || entry.trackIndex > 9) fail("trackIndex must be 0..9");
  if (!Number.isInteger(entry.noteCode) || entry.noteCode < 0 || entry.noteCode >= 49) fail("noteCode must index gClockTable");
  const sourceBytes = sourceSongBytes(entry.commandPointer);
  if (JSON.stringify(sourceBytes) !== JSON.stringify(entry.commandBytes)) fail("commandBytes disagree with the pinned song");
  const parsed = parseParameters(entry);
  if (entry.acceptedParameters !== parsed.accepted || entry.keyAfter !== parsed.key || entry.velocityAfter !== parsed.velocity) fail("captured parameter result disagrees with source replay");
  if (entry.toneType !== 0x80 || entry.derivedSelector !== "rhythm" || entry.observedSelector !== "rhythm") fail("entry is not the source-derived rhythm selector");
  if (entry.toneTable?.role !== "voicegroup_frlg_drumset-midi-index-base" || entry.toneTable.offset !== 0) fail("rhythm table role changed");
  if (!entry.selectedTone || entry.selectedTone.index !== parsed.key || entry.selectedTone.scalarBytes.length !== 8) fail("selected tone does not equal the MIDI-key index");
  const selectedBytes = [...romSlice(DRUMSET_START + parsed.key * 12, DRUMSET_START + parsed.key * 12 + 12)];
  const selectedScalar = [selectedBytes[0]!, selectedBytes[1]!, selectedBytes[2]!, selectedBytes[3]!, selectedBytes[8]!, selectedBytes[9]!, selectedBytes[10]!, selectedBytes[11]!];
  if (JSON.stringify(selectedScalar) !== JSON.stringify(entry.selectedTone.scalarBytes)) fail("selected tone scalar disagrees with the pinned drumset");
  const selectedToneType = selectedScalar[0]!;
  if ((selectedToneType & 0xc0) !== 0) fail("selected nested tone takes the unsupported early-exit route");
  const rhythmPan = (selectedScalar[3]! & 0x80) !== 0 ? (selectedScalar[3]! - 0xc0) * 2 : 0;
  const prefixHalfwords = [28, 34, 39, 43][parsed.accepted]!;
  const sequentialThumbHalfwords = prefixHalfwords + 28;
  const pipelineRefills = (parsed.accepted < 3 ? 1 : 0) + 3;
  const romLiteralLoads = 2;
  const ewramWordAccesses = 2 + (parsed.accepted > 0 ? 1 : 0);
  const gamepakByteReads = 1 + Math.min(parsed.accepted + 1, 3) + 3;
  const cycles = sequentialThumbHalfwords * THUMB_FETCH_CYCLES + pipelineRefills * PIPELINE_REFILL_CYCLES
    + romLiteralLoads * ROM_LITERAL_PREMIUM_CYCLES + ewramWordAccesses * EWRAM_WORD_PREMIUM_CYCLES
    + gamepakByteReads * ROM_BYTE_PREMIUM_CYCLES;
  return Object.freeze({ route: "rhythm-midi-key-drumset", acceptedParameters: parsed.accepted, sequentialThumbHalfwords,
    pipelineRefills, romLiteralLoads, ewramWordAccesses, gamepakByteReads, cycles, selectedMidiKey: parsed.key,
    selectedToneType, rhythmPan });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const drumset = readFileSync(join(ROOT, "reference/pokeemerald/sound/voicegroups/drumsets/frlg.inc"), "utf8");
  for (const anchor of ["ply_note:", "tst r0, r2", "adds r0, r3, 0", "ldrb r1, [r6, o_ToneData_pan_sweep]"]) if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  for (const anchor of ["voice_group frlg_drumset, 36", "DirectSoundWaveData_drum_and_percussion_kick", "DirectSoundWaveData_sc88pro_tambourine"]) if (!drumset.includes(anchor)) fail(`frlg.inc lost ${anchor}`);
  const prefix = romSlice(PLY_NOTE_START, RHYTHM_PREFIX_END);
  if (sha256(prefix) !== "f78e1a8e4582e30bc9e2e795048faaecf5edc7e4e935223d80f8bfc0583cfc98") fail("compiled ply_note selector prefix changed");
  return { source: [
    { path: "reference/pokeemerald/src/m4a_1.s", lines: "1538-1619", sha256: sha256(assembly) },
    { path: "reference/pokeemerald/sound/voicegroups/drumsets/frlg.inc", lines: "1-56", sha256: sha256(drumset) },
  ], compiledRegion: { symbol: "ply_note", start: "0x082dfd38", endExclusive: "0x082dfdd0", bytes: prefix.length, sha256: sha256(prefix) },
  selectors: { inline: "!(toneType & 0xc0)", rhythm: "(toneType & 0x80) && !(toneType & 0x40)", keysplit: "toneType & 0x40" },
  timingClasses: { sequentialRomThumbHalfword: 2, takenPipelineRefillPremium: 6, romLiteralPremium: 9, alignedEwramWordPremium: 2, gamepakBytePremium: 7 } };
}

function loadPacket(name: CaseName): Packet {
  const bytes = readFileSync(join(PACKETS, `${name}.json`));
  if (sha256(bytes) !== PACKET_HASHES[name]) fail(`${name} packet hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as Packet;
  if (packet.schema !== "factory-m4a-note-census-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || !packet.addressFree || packet.captureBoundary !== "sixth-MPlayMain-ply_note-entry-and-selector" || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const prior = makeVolEvidence() as { rows: PriorRow[] };
  const priorByDigest = new Map(prior.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [], rhythmTimings: RhythmToneSelectionTiming[] = [];
  const routeCounts: Record<string, number> = { inline: 0, rhythm: 0, keysplit: 0 };
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; callbackRows: number; callbacks: number; routes: Record<string, number> }> = {};
  for (const packet of CASES.map(loadPacket)) {
    const summary = { rows: packet.observations.length, onePass: 0, zeroPass: 0, callbackRows: 0, callbacks: 0, routes: { inline: 0, rhythm: 0, keysplit: 0 } };
    for (const observation of packet.observations) {
      const priorRow = priorByDigest.get(observation.sourceStateDigest);
      if (!priorRow || priorRow.case !== packet.case) fail(`${packet.case} row does not join VOL evidence`);
      if (priorRow.passCount === 0) {
        if (observation.noteCallbacks !== null) fail("zero-pass row reached ply_note");
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 0, noteCallbackCount: 0, rhythmToneSelectionSourceCycles: 0, knownComponentsSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      if (observation.noteCallbacks === null) fail("one-pass row lacks note census");
      if (observation.noteCallbacks.length > 0) summary.callbackRows += 1;
      summary.callbacks += observation.noteCallbacks.length;
      for (const callback of observation.noteCallbacks) {
        if (callback.derivedSelector !== callback.observedSelector || !(callback.observedSelector in routeCounts)) fail("derived/executed selector mismatch");
        routeCounts[callback.observedSelector] += 1;
        summary.routes[callback.observedSelector as keyof typeof summary.routes] += 1;
      }
      const timings = observation.noteCallbacks.filter((callback) => callback.observedSelector === "rhythm").map(reduceMPlayRhythmToneSelectionTiming);
      rhythmTimings.push(...timings);
      const rhythmCycles = timings.reduce((sum, timing) => sum + timing.cycles, 0);
      rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 1,
        noteCallbackCount: observation.noteCallbacks.length, noteRouteCensus: observation.noteCallbacks.map((callback) => callback.observedSelector),
        rhythmCallbackCount: timings.length, rhythmToneSelectionCycles: timings.map((timing) => timing.cycles), rhythmToneSelectionSourceCycles: rhythmCycles,
        priorKnownComponentsSourceCycles: priorRow.knownComponentsSourceCycles, knownComponentsSourceCycles: priorRow.knownComponentsSourceCycles + rhythmCycles,
        completeNoteCallbacksSourceCycles: null, completeMPlaySourceCycles: null });
    }
    byCase[packet.case] = summary;
  }
  const onePass = rows.filter((row) => row.passCount === 1), callbacks = Object.values(routeCounts).reduce((sum, count) => sum + count, 0);
  if (rows.length !== 113 || onePass.length !== 108 || callbacks !== 82 || JSON.stringify(routeCounts) !== JSON.stringify({ inline: 57, rhythm: 25, keysplit: 0 })) fail("note route census changed");
  if (rhythmTimings.length !== 25 || rhythmTimings.some((timing) => ![193, 231].includes(timing.cycles))) fail("rhythm route timing changed");
  const known = onePass.map((row) => row.knownComponentsSourceCycles as number);
  return { schema: "factory-m4a-note-census-evidence/v1", oracleProfile: "battle-scene-off", sourceAndElf,
    capture: { boundary: "exact compiled ply_note entry plus selector", runtimeCompiledPc: "0x082dfd3a", freshRunsPerCase: 2, repeatability: "byte-identical full packet", addressFree: true },
    frozenInputs: { packets: PACKET_HASHES, volEvidence: "tests/fixtures/factory-m4a-vol-evidence-v1.json" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: { byCase, noteCallbacks: callbacks, noteRouteCounts: routeCounts, smallestObservedRoute: "rhythm", rhythmCallbacksSourceClosed: 25,
      rhythmParameterCounts: { "0": 2, "2": 23 }, rhythmCallbackSourceCycleCounts: { "193": 2, "231": 23 },
      exactRhythmPrefixRowsWithinOnePass: 108, nullCompleteNoteRowsWithinOnePass: 108,
      knownComponentSourceCycleRange: { min: Math.min(...known), max: Math.max(...known), distinct: new Set(known).size },
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108 }, rows,
    closure: { closed: "The smallest observed ply_note selector family (rhythm) is source-exact from entry through the tone-selection join for all 25 callbacks; zero rhythm contribution is exact in every other one-pass row.",
      remainingDiscriminator: "The 57 inline selectors, the remainder of every note callback after tone selection, command decode/jump-table dispatch, and complete one-pass MPlay totals remain null.",
      durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null },
    verdict: "The ply_note census is 82 callbacks (57 inline / 25 rhythm / 0 keysplit); the 25-callback rhythm tone-selection prefix is source-closed while complete MPlay remains 5 exact / 108 null." };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  return ["# Issue #55 — sixth-MPlayMain `ply_note` census and rhythm prefix v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-census-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. At the exact compiled `ply_note` entry, the address-free packets retain only track index, note code, normalized song source/bytes, scalar key/velocity/tone inputs, and normalized nested-tone state; the three executed selector hooks independently agree with the source bit tests for every callback.", "",
    `The complete census is **${coverage.noteCallbacks}** callbacks: **57 inline / 25 rhythm / 0 keysplit**. Anchor is **33** (30/3/0), LILIANA **24** (13/11/0), and legal-varied **25** (14/11/0). Rhythm is the smallest observed family and is the only family priced here.`, "",
    "All 25 rhythm callbacks are track 6 with `toneType=0x80`. The source selector uses the post-parameter MIDI key directly: keys **36/54** select the pinned `voicegroup_frlg_drumset` entries, whose nested types pass the `0xc0` rejection and whose pan/sweep high bit takes the same source route. Two callbacks accept zero parameter bytes and cost **193 cycles**; 23 accept key+velocity and cost **231 cycles**.", "",
    "The reducer counts the exact `0x082dfd38..0x082dfdd0` entry-to-join instructions, taken refills, ROM literals, aligned EWRAM words, `gClockTable`/song/drumset GamePak byte reads, and independently replays parameter parsing and MIDI-key selection from pinned ROM bytes. It uses no observed duration or runtime pointer identity.", "",
    `Known one-pass components now span **${coverage.knownComponentSourceCycleRange.min}–${coverage.knownComponentSourceCycleRange.max}** cycles (${coverage.knownComponentSourceCycleRange.distinct} totals). The 57 inline selectors, every post-selection note route, command decode/jump-table dispatch, all complete note costs, and all complete one-pass MPlay totals remain null (**5 exact / 108 null**). No service cost or construction-clock wiring is introduced.`, "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-census-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-census-v1.md") };
  fail("usage: factory-m4a-note-census-v1.ts [--out-dir PATH]");
}
export function main(): void { const evidence = makeEvidence(), output = outputs(); mkdirSync(dirname(output.json), { recursive: true }); mkdirSync(dirname(output.doc), { recursive: true }); writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`); writeFileSync(output.doc, markdown(evidence)); }
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
