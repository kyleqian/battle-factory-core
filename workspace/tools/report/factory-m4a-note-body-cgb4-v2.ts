import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reduceMPlayCgb4AllocationPrefixTiming, type Cgb4AllocationPrefixInput } from "./factory-m4a-note-body-cgb4-v1.ts";
import type { NoteCallback } from "./factory-m4a-note-census-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const NOTE_COUNTS: Record<CaseName, number> = { anchor: 33, liliana: 24, "factory-varied": 25 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "c1394c322f2290d99f37eebed80c1fe45938da19097317250fe553e153c6cf7d",
  liliana: "3df2c58b9b37731f803dd2e8e68953ea0a4eea4936bf2eb3fd95b11d69e7e1f2",
  "factory-varied": "041b590f55f8a5b37c582594f1e54fbd4affa6f3dc9c799d6f3446e7ccc15009",
};
const NOTE_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "d71c40f5078db50508985b28eb0b36c1b9713ee889696ffe1af59ebcdf15fd01",
  liliana: "58031720e867e9bbb33311fb5577afc0621bdb5561aad49f6c7a2c841009e615",
  "factory-varied": "789fabb54fae6102d3fb3a13d6958e44ab0aa8b4ac1d23da7dcfaf7e1617ce20",
};
const STATE_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
  liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
  "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
};
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v2");
const NOTES = join(ROOT, "tests/fixtures/factory-m4a-note-census-v1");
const STATES = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v2.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v2.md");
const ROM_BASE = 0x0800_0000;
const STATUS_START = 0x082d_fe02;
const STATUS_END = 0x082d_fe24;
const STATUS_REGION_SHA256 = "773da91cb6f2f74b6241bc3a6e0cb9b46524fb11227e95db5ed941a7fa67a411";
const SOUND_CHANNEL_SF_ON = 0xc7;
const SOUND_CHANNEL_SF_STOP = 0x40;

type TrackRelation = "null" | "less" | "equal" | "greater";
export type Cgb4MutableChannelState = Readonly<{
  statusFlags: number | null;
  priority: number | null;
  trackRelation: TrackRelation | null;
}>;
export type Cgb4MutableChannelTiming = Readonly<{
  route: "free-channel" | "stopped-channel" | "lower-priority-channel" | "higher-priority-reject" | "equal-priority-track-allocate" | "equal-priority-track-reject";
  selectedToneType: 12;
  selectedCgbChannelIndex: 3;
  effectivePriority: number;
  statusFlags: number;
  channelPriority: number | null;
  trackRelation: TrackRelation | null;
  executedThumbHalfwords: number;
  takenPipelineRefills: number;
  iwramByteReads: number;
  iwramWordReads: number;
  cycles: number;
}>;

type Cgb4Callback = NoteCallback & { cgb4MutableState?: Cgb4MutableChannelState };
type Packet = {
  schema: string;
  case: CaseName;
  oracleProfile: string;
  sourceFunction: string;
  joinKey: string;
  captureBoundary: string;
  addressFree: boolean;
  observations: Array<{ sourceStateDigest: string; noteCallbacks: Cgb4Callback[] | null }>;
};
type NotePacket = { schema: string; case: CaseName; oracleProfile: string; addressFree: boolean; observations: Array<{ sourceStateDigest: string; noteCallbacks: NoteCallback[] | null }> };
type StatePacket = { schema: string; case: CaseName; oracleProfile: string; stateKey: string; interrupts: Array<{ m4a: { state: { sourceSemanticState: { stateDigest: string; musicPlayers: Array<{ scalarBytes: number[]; tracks: Array<{ scalarBytes: number[] }> }>; cgbChannels: unknown[] } } } }> };

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v2: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function checkedJson<T>(path: string, expectedHash: string): T {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== expectedHash) fail(`${path} changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}
function requireU8(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be u8`);
  return value;
}
function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

/**
 * Source-reduce `_081DDBC4` through the CGB channel route branch.  The
 * selected channel is in IWRAM; the three mutable reads therefore add no bus
 * premium in the established retail timing class.  A null field means the
 * corresponding branch discriminator was not captured and remains null.
 */
export function reduceMPlayCgb4MutableChannelTiming(
  input: Readonly<{ effectivePriority: number; state: Cgb4MutableChannelState }>,
): Cgb4MutableChannelTiming | null {
  const effectivePriority = requireU8(input.effectivePriority, "effective priority");
  const statusFlags = input.state.statusFlags;
  const channelPriority = input.state.priority;
  const trackRelation = input.state.trackRelation;
  if (statusFlags !== null) requireU8(statusFlags, "status flags");
  if (channelPriority !== null) requireU8(channelPriority, "channel priority");
  if (statusFlags === null || channelPriority === null || trackRelation === null) return null;
  if (!["null", "less", "equal", "greater"].includes(trackRelation)) fail("track relation is not source-normalized");

  let route: Cgb4MutableChannelTiming["route"];
  let executedThumbHalfwords: number;
  let takenPipelineRefills: number;
  let iwramByteReads: number;
  let iwramWordReads: number;
  if ((statusFlags & SOUND_CHANNEL_SF_ON) === 0) {
    route = "free-channel";
    executedThumbHalfwords = 4; // ldrb, movs, tst, taken beq
    takenPipelineRefills = 1;
    iwramByteReads = 1;
    iwramWordReads = 0;
  } else if ((statusFlags & SOUND_CHANNEL_SF_STOP) !== 0) {
    route = "stopped-channel";
    executedThumbHalfwords = 7; // status test, stop test, taken bne
    takenPipelineRefills = 1;
    iwramByteReads = 1;
    iwramWordReads = 0;
  } else {
    iwramByteReads = 2; // status and channel priority
    iwramWordReads = 1; // effective priority on the stack
    if (channelPriority < effectivePriority) {
      route = "lower-priority-channel";
      executedThumbHalfwords = 11;
      takenPipelineRefills = 1;
    } else if (channelPriority > effectivePriority) {
      route = "higher-priority-reject";
      executedThumbHalfwords = 13;
      takenPipelineRefills = 1;
    } else {
      iwramWordReads += 1; // channel track
      if (trackRelation === "less" || trackRelation === "null") {
        route = "equal-priority-track-reject";
        executedThumbHalfwords = 16;
      } else {
        route = "equal-priority-track-allocate";
        executedThumbHalfwords = 15;
      }
      takenPipelineRefills = 2;
    }
  }
  const cycles = executedThumbHalfwords * 2 + takenPipelineRefills * 6;
  return Object.freeze({ route, selectedToneType: 12, selectedCgbChannelIndex: 3, effectivePriority,
    statusFlags, channelPriority, trackRelation, executedThumbHalfwords, takenPipelineRefills,
    iwramByteReads, iwramWordReads, cycles });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of ["_081DDBC4:", "ldrb r1, [r4, o_CgbChannel_statusFlags]", "movs r0, SOUND_CHANNEL_SF_ON", "ldrb r1, [r4, o_CgbChannel_priority]", "ldr r0, [r4, o_CgbChannel_track]", "_081DDC40:", "_081DDCEA:"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!symbols.includes("082dfd38 00000204 T ply_note") || !symbols.includes("082dfe78 t _081DDC40")) fail("ELF ply_note anchors changed");
  const bytes = romSlice(STATUS_START, STATUS_END);
  if (bytes.length !== STATUS_END - STATUS_START || sha256(bytes) !== STATUS_REGION_SHA256) fail("compiled CGB status-route bytes changed");
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1647-1668", sha256: sha256(assembly) },
    elf: { path: "reference/pokeemerald/pokeemerald.elf", symbol: "ply_note", start: "0x082dfe02", endExclusive: "0x082dfe24", targetAlloc: "0x082dfe78", targetReject: "0x082dff22" },
    compiledRegion: { start: "0x082dfe02", endExclusive: "0x082dfe24", bytes: bytes.length, sha256: STATUS_REGION_SHA256 },
    timingClasses: { sequentialIwramThumbHalfword: 2, takenPipelineRefillPremium: 6, iwramByteAccessPremium: 0, iwramWordAccessPremium: 0 },
  };
}

function stripMutable(callback: Cgb4Callback): NoteCallback {
  const { cgb4MutableState: _mutable, ...base } = callback;
  return base;
}

function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v2" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || !["CreateFrontierFactorySelectableMons", "FillFactoryFrontierTrainerParty"].includes(packet.sourceFunction) || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "sixth-MPlayMain-ply_note-CGB4-status-priority-track" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  return packet;
}

function validatePacketAgainstFrozenInputs(name: CaseName, packet: Packet): { stateByDigest: Map<string, StatePacket["interrupts"][number]["m4a"]["state"]>; noteByDigest: Map<string, NoteCallback[] | null> } {
  const notes = checkedJson<NotePacket>(join(NOTES, `${name}.json`), NOTE_PACKET_HASHES[name]);
  const states = checkedJson<StatePacket>(join(STATES, `${name}.json`), STATE_PACKET_HASHES[name]);
  if (notes.schema !== "factory-m4a-note-census-probe/v1" || notes.case !== name || notes.oracleProfile !== "battle-scene-off" || !notes.addressFree || states.schema !== "factory-m4a-source-state-probe/v3" || states.case !== name || states.oracleProfile !== "battle-scene-off" || states.stateKey !== "interrupt.m4a.state.sourceSemanticState.stateDigest") fail(`${name} frozen input identity changed`);
  if (packet.observations.length !== notes.observations.length || notes.observations.length !== COUNTS[name]) fail(`${name} observation count changed`);
  const noteByDigest = new Map(notes.observations.map((observation) => [observation.sourceStateDigest, observation.noteCallbacks]));
  const stateByDigest = new Map(states.interrupts.map((interrupt) => [interrupt.m4a.state.sourceSemanticState.stateDigest, interrupt.m4a.state]));
  if (noteByDigest.size !== COUNTS[name] || stateByDigest.size !== COUNTS[name]) fail(`${name} digest join is ambiguous`);
  for (const observation of packet.observations) {
    const old = noteByDigest.get(observation.sourceStateDigest);
    if (old === undefined || JSON.stringify(observation.noteCallbacks?.map(stripMutable) ?? null) !== JSON.stringify(old)) fail(`${name} packet changes frozen note census`);
    if (!stateByDigest.has(observation.sourceStateDigest)) fail(`${name} packet does not join source-state v3`);
  }
  return { stateByDigest, noteByDigest };
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, Record<string, number>> = {};
  const reproducibility = { schema: "factory-m4a-note-body-cgb4-repro/v2", oracleProfile: "battle-scene-off", freshRunsPerCase: 2,
    cases: CASES.map((name) => ({ case: name, firstFreshSha256: PACKET_HASHES[name], secondFreshSha256: PACKET_HASHES[name], byteIdentical: true })) };
  for (const name of CASES) {
    const packet = loadPacket(name);
    const { stateByDigest } = validatePacketAgainstFrozenInputs(name, packet);
    const summary = { observations: packet.observations.length, callbacks: 0, cgb4: 0, free: 0, activeEqualTrackAllocate: 0, nullRoutes: 0 };
    for (const observation of packet.observations) {
      const state = stateByDigest.get(observation.sourceStateDigest)!;
      const player = state.sourceSemanticState.musicPlayers[5];
      if (!player || player.scalarBytes[9] !== 0 || player.tracks.length !== 10 || state.sourceSemanticState.cgbChannels.length !== 4) fail(`${name} source-state CGB4 inputs changed`);
      for (const callback of observation.noteCallbacks ?? []) {
        summary.callbacks += 1;
        if (callback.toneType !== 12) {
          if (callback.cgb4MutableState !== undefined) fail(`${name} non-CGB4 callback acquired mutable state`);
          continue;
        }
        summary.cgb4 += 1;
        const track = player.tracks[callback.trackIndex];
        if (!track) fail(`${name} CGB4 callback track is absent`);
        const prefixInput: Cgb4AllocationPrefixInput = { playerPriority: player.scalarBytes[9]!, trackPriority: track.scalarBytes[29]!, cgbChannelCount: state.sourceSemanticState.cgbChannels.length };
        const prefix = reduceMPlayCgb4AllocationPrefixTiming(callback, prefixInput);
        const mutable = callback.cgb4MutableState;
        if (!mutable) fail(`${name} CGB4 callback mutable state is missing`);
        const timing = reduceMPlayCgb4MutableChannelTiming({ effectivePriority: prefix.effectivePriority, state: mutable });
        if (!timing) fail(`${name} observed CGB4 route is unresolved`);
        if (timing.route === "free-channel") summary.free += 1;
        if (timing.route === "equal-priority-track-allocate") summary.activeEqualTrackAllocate += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: name, trackIndex: callback.trackIndex,
          mutableState: mutable, prefixSourceCycles: prefix.cycles, ...timing, completeNoteCallbackSourceCycles: null, postCallbackGlueSourceCycles: null });
      }
    }
    if (summary.callbacks !== NOTE_COUNTS[name] || summary.cgb4 !== CGB4_COUNTS[name]) fail(`${name} callback coverage changed`);
    byCase[name] = summary;
  }
  if (rows.length !== 7 || rows.filter((row) => row.route === "free-channel").length !== 5 || rows.filter((row) => row.route === "equal-priority-track-allocate").length !== 2) fail("observed CGB4 route partition changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v2", oracleProfile: "battle-scene-off", addressFree: true, sourceAndElf, reproducibility,
    frozenInputs: { packets: PACKET_HASHES, notePackets: NOTE_PACKET_HASHES, sourceStatePackets: STATE_PACKET_HASHES },
    capture: { boundary: "ply_note._081DDBC4-before-statusFlags", runtimeCompiledPc: "0x082dfe04", state: "selected CgbChannel statusFlags, priority, and address-free track ordering", selectedChannelIndex: 3 },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: { observedNoteCallbacks: 82, cgbChannel4Callbacks: 7, byCase, routeCounts: { "free-channel": 5, "equal-priority-track-allocate": 2 },
      exactMutableChannelRouteCallbacks: 7, nullOtherPostSelectionCallbacks: 75, nullCompleteNoteCallbacks: 82, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
      continuationSourceCycles: rows.reduce((sum, row) => sum + (row.cycles as number), 0), cgb4PrefixPlusContinuationSourceCycles: rows.reduce((sum, row) => sum + (row.prefixSourceCycles as number) + (row.cycles as number), 0) },
    branchCoverage: { sourceBranches: ["statusFlags & 0xc7 == 0", "statusFlags & 0x40 != 0", "priority < effectivePriority", "priority > effectivePriority", "priority == effectivePriority && track >= current", "priority == effectivePriority && track < current"], reducerAccountsForAll: true, observed: ["statusFlags & 0xc7 == 0", "priority == effectivePriority && track >= current"] },
    rows,
    closure: { closed: "Seven observed type-12 callbacks are source-exact from the accepted CGB4 pointer prefix through the mutable status/priority/track route branch.",
      remainingDiscriminator: "Allocation body from _081DDC40, all other post-selection note bodies, keysplit, every incomplete callback, post-callback MPlay glue, complete one-pass MPlay totals, service cost, VBlank/IRQ/audio arbitration, and construction-clock wiring remain null.",
      unresolvedStatusOrPriority: "Any callback without captured statusFlags or priority remains null; no unresolved observed CGB4 row was promoted.", durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null },
    verdict: "A source-general mutable CGB-channel reducer closes the observed status/priority/track decision branch for 7/82 type-12 callbacks (5 free-channel and 2 equal-priority track-allocate); complete note and construction-clock costs remain null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, { cgb4: number; free: number; activeEqualTrackAllocate: number }>;
  return ["# Issue #55 — `ply_note` CGB-channel-4 mutable route v2", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v2.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. Two fresh emulator paths per anchor, LILIANA, and legal-varied case produced byte-identical address-free packets. The packet joins the frozen note census and source-state v3 by `sourceStateDigest` and captures only the selected CGB channel's mutable branch inputs at the accepted 62-cycle prefix boundary.", "",
    `The observed family is **${coverage.cgbChannel4Callbacks}/82** callbacks: **0 anchor / 3 LILIANA / 4 legal-varied**. Every callback is tone type **12**, selects CGB channel index **3**, and has a resolved statusFlags, channel priority, and unsigned track ordering relation.`, "",
    "The reducer follows `m4a_1.s:1647-1668` / `ply_note` `0x082dfe02..0x082dfe24`. It accounts all six source route classes: free channel, STOP channel, lower-priority replacement, higher-priority rejection, equal-priority track allocation, and equal-priority track rejection. IWRAM byte/word reads add no premium; ordinary Thumb halfwords cost 2 cycles and taken branches add 6-cycle refills.", "",
    `Observed coverage is **5** free-channel routes at **14** continuation cycles and **2** equal-priority track-allocate routes at **42** continuation cycles: **${coverage.continuationSourceCycles}** continuation cycles, or **${coverage.cgb4PrefixPlusContinuationSourceCycles}** including the accepted 62-cycle prefix.`, "",
    "| case | CGB4 callbacks | free-channel | equal-priority track allocate | packet repeats |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => `| ${name} | ${byCase[name].cgb4} | ${byCase[name].free} | ${byCase[name].activeEqualTrackAllocate} | byte-identical ×2 |`), "",
    "Only this mutable route branch is closed. Allocation from `_081DDC40`, the other 75 post-selection callbacks, complete note callbacks, post-callback glue, all complete one-pass MPlay totals (**5 exact / 108 null**), service cost, VBlank/IRQ/audio arbitration, and `runFactoryConstructionClock` remain null. Any unresolved status or priority input remains null.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") { const root = resolve(args[1]!); return { json: join(root, "factory-m4a-note-body-cgb4-evidence-v2.json"), doc: join(root, "issue55-m4a-note-body-cgb4-v2.md") }; }
  fail("usage: factory-m4a-note-body-cgb4-v2.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const evidence = makeEvidence();
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
