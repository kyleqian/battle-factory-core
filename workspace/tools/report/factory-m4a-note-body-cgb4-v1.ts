import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reduceMPlayInlineToneSelectionTiming, type NoteCallback } from "./factory-m4a-note-census-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
type SourcePointer = Readonly<{ role: string; offset: number }>;
type NotePacket = { schema: string; case: CaseName; oracleProfile: string; addressFree: boolean; observations: Array<{ sourceStateDigest: string; noteCallbacks: NoteCallback[] | null }> };
type SourcePacket = { schema: string; case: CaseName; oracleProfile: string; stateKey: string; interrupts: Array<{ m4a: { state: { sourceSemanticState: { stateDigest: string; musicPlayers: Array<{ scalarBytes: number[]; tracks: Array<{ scalarBytes: number[] }> }>; cgbChannels: unknown[] } } } }> };

export type Cgb4AllocationPrefixInput = Readonly<{
  playerPriority: number;
  trackPriority: number;
  cgbChannelCount: number;
}>;

export type Cgb4AllocationPrefixTiming = Readonly<{
  route: "cgb-channel-4-allocation-prefix";
  selectedToneType: 12;
  selectedCgbChannelIndex: 3;
  effectivePriority: number;
  executedThumbHalfwords: number;
  takenPipelineRefills: number;
  iwramWordReads: number;
  iwramWordStores: number;
  ewramByteReads: number;
  ewramWordReads: number;
  gamepakDataReads: number;
  cycles: number;
}>;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const NOTE_ROOT = join(ROOT, "tests/fixtures/factory-m4a-note-census-v1");
const STATE_ROOT = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v1.md");
const ROM_BASE = 0x0800_0000;
const PREFIX_START = 0x082d_fdd4;
const PREFIX_END = 0x082d_fe02;
const PACKET_HASHES = {
  note: {
    anchor: "d71c40f5078db50508985b28eb0b36c1b9713ee889696ffe1af59ebcdf15fd01",
    liliana: "58031720e867e9bbb33311fb5577afc0621bdb5561aad49f6c7a2c841009e615",
    "factory-varied": "789fabb54fae6102d3fb3a13d6958e44ab0aa8b4ac1d23da7dcfaf7e1617ce20",
  },
  state: {
    anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
    liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
    "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
  },
  dispatch: "dea14f5904f32bc3a67fd073198447fbd75500b0b04b075feadc9dc1d18ffcfe",
  mixerEntryProvenance: "67c9ee1b70cebd44ea82bc8483f167b81473901a45074604f6a545ef892d7450",
} as const;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v1: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function checkedJson<T>(path: string, expectedHash: string): T {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== expectedHash) fail(`${path} changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}
function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

/** Count `_081DDB9C` through CGB channel-4 pointer selection, before mutable channel status is read. */
export function reduceMPlayCgb4AllocationPrefixTiming(entry: NoteCallback, input: Cgb4AllocationPrefixInput): Cgb4AllocationPrefixTiming {
  const selector = reduceMPlayInlineToneSelectionTiming(entry);
  if (selector.selectedToneType !== 12) fail("selected tone must be the observed type-12 CGB channel-4 route");
  if (input.playerPriority !== 0 || input.trackPriority !== 0) fail("priority inputs leave the captured unsaturated route");
  if (input.cgbChannelCount !== 4) fail("normalized SoundInfo.cgbChans must contain four channels");
  const executedThumbHalfwords = 21;
  const takenPipelineRefills = 2;
  const iwramWordReads = 2;
  const iwramWordStores = 3;
  const ewramByteReads = 3;
  const ewramWordReads = 1;
  const gamepakDataReads = 0;
  const cycles = executedThumbHalfwords * 2 + takenPipelineRefills * 6 + (ewramByteReads + ewramWordReads) * 2;
  return Object.freeze({ route: "cgb-channel-4-allocation-prefix", selectedToneType: 12, selectedCgbChannelIndex: 3,
    effectivePriority: 0, executedThumbHalfwords, takenPipelineRefills, iwramWordReads, iwramWordStores,
    ewramByteReads, ewramWordReads, gamepakDataReads, cycles });
}

function assertSource(): Record<string, unknown> {
  const source = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of ["_081DDB9C:", "ldrb r1, [r6, o_MusicPlayerInfo_priority]", "ands r6, r0", "ldr r4, [r0, o_SoundInfo_cgbChans]", "adds r4, r0", "ldrb r1, [r4, o_CgbChannel_statusFlags]"]) {
    if (!source.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const bytes = romSlice(PREFIX_START, PREFIX_END);
  if (bytes.length !== 46 || sha256(bytes) !== "b30d41be9e1eaac1d3dd495bbe936cfd7d24cab89ce772fa580ebdf4428f1088") fail("compiled CGB4 prefix changed");
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1626-1655", sha256: sha256(source) },
    compiledRegion: { symbol: "ply_note", start: "0x082dfdd4", endExclusive: "0x082dfe02", bytes: 46, compiledHalfwords: 23, executedHalfwords: 21, sha256: sha256(bytes) },
    timingClasses: { sequentialGamePakThumbHalfword: 2, takenPipelineRefillPremium: 6, iwramWordAccessPremium: 0, ewramAccessPremium: 2 },
  };
}

export function makeEvidence(): Record<string, unknown> {
  const source = assertSource();
  const dispatch = checkedJson<any>(join(ROOT, "tests/fixtures/factory-m4a-dispatch-evidence-v1.json"), PACKET_HASHES.dispatch);
  if (dispatch.schema !== "factory-m4a-dispatch-evidence/v1" || dispatch.coverage.targetCounts.ply_note !== 82 || "ply_prio" in dispatch.coverage.targetCounts) fail("dispatch no-priority-write proof changed");
  const mixer = checkedJson<any>(join(ROOT, "tests/fixtures/factory-m4a-mixer-entry-provenance-evidence-v2.json"), PACKET_HASHES.mixerEntryProvenance);
  if (mixer.schema !== "factory-m4a-mixer-entry-provenance-evidence/v2" || mixer.coverage.runtimeTargetProvenanceComplete !== true || mixer.closure.durationLicensed !== false) fail("mixer-entry provenance boundary changed");

  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, number> = {};
  let joinedRows = 0;
  for (const name of CASES) {
    const notes = checkedJson<NotePacket>(join(NOTE_ROOT, `${name}.json`), PACKET_HASHES.note[name]);
    const states = checkedJson<SourcePacket>(join(STATE_ROOT, `${name}.json`), PACKET_HASHES.state[name]);
    if (notes.schema !== "factory-m4a-note-census-probe/v1" || states.schema !== "factory-m4a-source-state-probe/v3" || notes.case !== name || states.case !== name || notes.oracleProfile !== "battle-scene-off" || states.oracleProfile !== "battle-scene-off" || !notes.addressFree || states.stateKey !== "interrupt.m4a.state.sourceSemanticState.stateDigest") fail(`${name} input contract changed`);
    const stateByDigest = new Map(states.interrupts.map((interrupt) => [interrupt.m4a.state.sourceSemanticState.stateDigest, interrupt.m4a.state]));
    if (stateByDigest.size !== notes.observations.length) fail(`${name} state join cardinality changed`);
    let callbacks = 0;
    for (const observation of notes.observations) {
      const state = stateByDigest.get(observation.sourceStateDigest);
      if (!state) fail(`${name} note row does not join source-state v3`);
      joinedRows += 1;
      const player = state.sourceSemanticState.musicPlayers[5];
      if (!player || player.scalarBytes[9] !== 0 || player.tracks.length !== 10 || state.sourceSemanticState.cgbChannels.length !== 4) fail(`${name} sixth-player allocation inputs changed`);
      for (const callback of observation.noteCallbacks ?? []) {
        if (callback.toneType !== 12) continue;
        const track = player.tracks[callback.trackIndex];
        if (!track) fail(`${name} callback track is absent`);
        const timing = reduceMPlayCgb4AllocationPrefixTiming(callback, { playerPriority: player.scalarBytes[9]!, trackPriority: track.scalarBytes[29]!, cgbChannelCount: state.sourceSemanticState.cgbChannels.length });
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: name, trackIndex: callback.trackIndex,
          selector: "selectedToneType&7==4", ...timing, completeNoteCallbackSourceCycles: null });
        callbacks += 1;
      }
    }
    byCase[name] = callbacks;
  }
  if (joinedRows !== 113 || rows.length !== 7 || JSON.stringify(byCase) !== JSON.stringify({ anchor: 0, liliana: 3, "factory-varied": 4 })) fail("CGB4 route census changed");
  if (rows.some((row) => row.cycles !== 62 || row.completeNoteCallbackSourceCycles !== null)) fail("CGB4 timing/null boundary changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v1", oracleProfile: "battle-scene-off", addressFree: true, source,
    frozenInputs: PACKET_HASHES,
    join: { key: "sourceStateDigest", rows: 113, ambiguousRows: 0, sixthPlayerIndex: 5 },
    coverage: { observedNoteCallbacks: 82, cgbChannel4PrefixCallbacks: 7, byCase, selectedToneTypes: [12], selectedCgbChannelIndices: [3], sourceCyclesPerCallback: 62, sourceCycles: 434,
      exactPostSelectionPrefixCallbacks: 7, nullOtherPostSelectionCallbacks: 75, nullCompleteNoteCallbacks: 82, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108 },
    rows,
    closure: { closed: "Seven type-12 callbacks are source-exact from the common tone-selection join through CGB channel-4 pointer selection, before the first mutable CgbChannel status read.",
      selectorProof: "The note packet supplies selected tone type 12; source-state v3 supplies player/track priority 0 and four normalized CGB channels; exact dispatch proves no intervening ply_prio callback.",
      remainingDiscriminator: "All other post-selection routes, the CGB status/priority body, every complete note callback, post-callback MPlay glue, all complete one-pass MPlay totals, and the construction clock remain null.",
      durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null },
    mixerEntryBoundary: { frozenClassifiedTargets: 13, changed: false, noteBodyCostLicensedByFinalTarget: false },
    verdict: "The smallest observed post-selection family is 7/82 type-12 CGB-channel-4 prefixes at 62 cycles each (434 total); no complete note cost or construction-clock wiring is licensed." };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  return ["# Issue #55 — `ply_note` CGB-channel-4 allocation prefix v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v1.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. The committed address-free note packets join the full source-state v3 packets by `sourceStateDigest`; exact dispatcher evidence proves no `ply_prio` callback can alter the captured priorities before any note callback. Existing mixer-entry provenance remains frozen and does not license a note-body duration.", "",
    `The smallest observed post-selection family is **${coverage.cgbChannel4PrefixCallbacks}/82** callbacks: **0 anchor / 3 LILIANA / 4 legal-varied**. Every callback has selected tone type **12**, so the compiled \`type & 7\` selector chooses CGB channel index **3** (channel 4). Player and track priorities are both **0**, and normalized \`SoundInfo.cgbChans\` contains four channels.`, "",
    "The closed region is `0x082dfdd4..0x082dfe02`: the common `_081DDB9C` priority calculation, unsaturated branch, tone-kind test, non-null CGB array branch, and channel-index arithmetic. It stops before `ldrb statusFlags`, because earlier note callbacks may mutate that channel and no per-callback transient channel snapshot is committed.", "",
    "Each callback executes **21** sequential Thumb halfwords, **2** taken pipeline refills, **2 IWRAM word reads + 3 IWRAM word stores**, **3 EWRAM byte reads + 1 EWRAM word read**, and **0 GamePak data reads**: **62 cycles** each, **434 cycles** total. The compiled 46-byte region contains 23 halfwords; the overflow clamp and null-CGB early-exit instructions are proved unexecuted.", "",
    "Mutation guards reject another tone type, nonzero player/track priority, a non-four-channel normalized CGB array, changed ROM bytes/source anchors, any `ply_prio` dispatch, and changed note/source-state/provenance packets.", "",
    "Only this allocation prefix is closed. The other **75** post-selection callbacks, the CGB status/priority body after the selected pointer, all **82** complete note callback costs, post-callback MPlay glue, every complete one-pass MPlay total (**5 exact / 108 null**), service cost, and `runFactoryConstructionClock` remain null.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") { const root = resolve(args[1]!); return { json: join(root, "factory-m4a-note-body-cgb4-evidence-v1.json"), doc: join(root, "issue55-m4a-note-body-cgb4-v1.md") }; }
  fail("usage: factory-m4a-note-body-cgb4-v1.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const evidence = makeEvidence();
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
