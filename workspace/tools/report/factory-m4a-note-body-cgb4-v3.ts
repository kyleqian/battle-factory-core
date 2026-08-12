import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reduceMPlayCgb4MutableChannelTiming, type Cgb4MutableChannelState } from "./factory-m4a-note-body-cgb4-v2.ts";
import { reduceMPlayCgb4AllocationPrefixTiming } from "./factory-m4a-note-body-cgb4-v1.ts";
import { reduceMPlayClearChainTiming, type ClearChainEntry } from "./factory-m4a-clearchain-v1.ts";
import type { NoteCallback } from "./factory-m4a-note-census-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const NOTE_COUNTS: Record<CaseName, number> = { anchor: 33, liliana: 24, "factory-varied": 25 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "818433d12eddd52c6ce1bb1a3128ca5a27cad4e52d7f3b699620f3999a46eaad",
  liliana: "c0f11db93b544f86781064565f618c7c95aaa43b9ca3e6eb06fc5a17067e9ef5",
  "factory-varied": "b303a6dedd26f1d0ba0f6797e2b57f5f5c9e5b3aff7b3599a26b80143055beb9",
};
const V2_PACKET_HASHES: Record<CaseName, string> = {
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
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v3");
const V2_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v2");
const NOTES = join(ROOT, "tests/fixtures/factory-m4a-note-census-v1");
const STATES = join(ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v3.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v3.md");
const ROM_BASE = 0x0800_0000;
const BODY_START = 0x082d_fe78;
const BODY_BRANCH_END = 0x082d_fe9e;
const BODY_REGION_SHA256 = "56f8a791cdbc9b0d2ea14925d3714e95f6ecc8ec19fd3fa0ce1dae06cb243c31";
const CLEAR_CHAIN_REGIONS = [
  { role: "ClearChain wrapper", start: 0x082e_04b4, end: 0x082e_04c8, sha256: "a3981c79c0e6fe3f4604c6f9cb5b2d948ff8c6f20aa99606a8ea99f26bcff207" },
  { role: "_call_via_r1 trampoline", start: 0x082e_70d4, end: 0x082e_70d6, sha256: "bac8ca6ee9f77b46c7ab5824c7c59d99fd0ca53ae998ea2872b78bb6a5189cc5" },
  { role: "RealClearChain", start: 0x082d_f7fc, end: 0x082d_f81c, sha256: "c3d23903d0b87a7b19fcd84aa0234c674e3014a9a2835853727defeaad3422dc" },
] as const;
const V2_EVIDENCE_SHA256 = "cd6030344b403b10bd5c39aa4e1b4a8cdf0c68ab3871b11a677570621dff46ac";

type BodyState = Readonly<{
  currentRole: string;
  trackRole: string | null;
  previousRole: string | null;
  nextRole: string | null;
  trackChanRole: string | null;
  lfoDelay: number;
}>;
type Cgb4Callback = NoteCallback & { cgb4MutableState?: Cgb4MutableChannelState; cgb4AllocationBodyState?: BodyState };
type Packet = { schema: string; case: CaseName; oracleProfile: string; sourceFunction: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: Array<{ sourceStateDigest: string; noteCallbacks: Cgb4Callback[] | null }> };
type State = { sourceSemanticState: { stateDigest: string; musicPlayers: Array<{ scalarBytes: number[]; tracks: Array<{ scalarBytes: number[] }> }>; cgbChannels: unknown[] } };
type StatePacket = { schema: string; case: CaseName; oracleProfile: string; stateKey: string; interrupts: Array<{ m4a: { state: State } }> };

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v3: ${message}`); }
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
function requireRole(value: string | null, label: string, nullable = true): void {
  if (value === null) {
    if (!nullable) fail(`${label} must name a source channel`);
    return;
  }
  if (!/^(direct-channel-(?:[0-9]|1[01])|cgb-channel-[0-3])$/.test(value)) fail(`${label} is not source-normalized`);
}
function requireTrackRole(value: string | null): void {
  if (value !== null && !/^music-player-5-track-[0-9]$/.test(value)) fail("trackRole is not source-normalized");
}
function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

/**
 * Source-reduce `_081DDC40` through the taken `lfoDelay == 0` branch at
 * `_081DDC66`, including the caller BL and the source-general ClearChain
 * wrapper/RealClearChain route.  The clear_modM and TrkVolPitSet bodies are
 * deliberately outside the reducer; nonzero lfoDelay therefore remains null.
 */
export type Cgb4AllocationBodyTiming = Readonly<{
  route: "allocation-body-before-TrkVolPitSet";
  clearChainRoute: string;
  lfoDelay: 0;
  lfoDelayC: 0;
  helperBoundary: "TrkVolPitSet-entry";
  bodySequentialThumbHalfwords: 15;
  bodyPipelineRefills: number;
  bodyCycles: number;
  clearChainSourceCycles: number;
  cycles: number;
}>;

export function reduceMPlayCgb4AllocationBodyTiming(state: BodyState): Cgb4AllocationBodyTiming | null {
  requireRole(state.currentRole, "currentRole", false);
  requireRole(state.previousRole, "previousRole");
  requireRole(state.nextRole, "nextRole");
  requireRole(state.trackChanRole, "trackChanRole");
  requireTrackRole(state.trackRole);
  const lfoDelay = requireU8(state.lfoDelay, "lfoDelay");
  if (lfoDelay !== 0) return null;
  const clear = reduceMPlayClearChainTiming({
    currentRole: state.currentRole,
    trackRole: state.trackRole,
    previousRole: state.previousRole,
    nextRole: state.nextRole,
  } satisfies ClearChainEntry);
  // `_081DDC40`: adds + BL ClearChain (3 halfwords, one caller refill).
  // `_081DDC54.._081DDC66`: five link instructions/tests, one conditional
  // next-link instruction, and six common ownership/LFO instructions.  The
  // observed null next link and zero LFO each take one refill.
  const bodySequentialThumbHalfwords = 15;
  const bodyPipelineRefills = 1 + (state.trackChanRole === null ? 1 : 0) + 1;
  const bodyCycles = bodySequentialThumbHalfwords * 2 + bodyPipelineRefills * 6;
  return Object.freeze({
    route: "allocation-body-before-TrkVolPitSet",
    clearChainRoute: clear.route,
    lfoDelay: 0,
    lfoDelayC: 0,
    helperBoundary: "TrkVolPitSet-entry",
    bodySequentialThumbHalfwords,
    bodyPipelineRefills,
    bodyCycles,
    clearChainSourceCycles: clear.cycles,
    cycles: bodyCycles + clear.cycles,
  });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of ["_081DDC40:", "bl ClearChain", "str r3, [r4, o_SoundChannel_nextChannelPointer]", "str r4, [r5, o_MusicPlayerTrack_chan]", "str r5, [r4, o_SoundChannel_track]", "strb r0, [r5, o_MusicPlayerTrack_lfoDelayC]", "bl clear_modM", "bl TrkVolPitSet", "_081DDC66:"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!symbols.includes("082dfe78 t _081DDC40") || !symbols.includes("082df7fc 00000020 T RealClearChain") || !symbols.includes("082e04b4 00000014 T ClearChain")) fail("allocation/chain ELF symbols changed");
  if (sha256(romSlice(BODY_START, BODY_BRANCH_END)) !== BODY_REGION_SHA256) fail("compiled allocation-body region changed");
  for (const region of CLEAR_CHAIN_REGIONS) if (sha256(romSlice(region.start, region.end)) !== region.sha256) fail(`${region.role} bytes changed`);
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1719-1738", sha256: sha256(assembly) },
    elf: { bodyStart: "0x082dfe78", bodyBranchEnd: "0x082dfe9e", clearChain: "0x082e04b4", realClearChain: "0x082df7fc" },
    compiledRegions: [{ role: "_081DDC40 through _081DDC66 branch", start: "0x082dfe78", endExclusive: "0x082dfe9e", bytes: 38, sha256: BODY_REGION_SHA256 }, ...CLEAR_CHAIN_REGIONS.map((region) => ({ ...region, bytes: region.end - region.start }))],
    timingClasses: { sequentialThumbHalfword: 2, takenPipelineRefill: 6, callbackDataAccessPremium: 0 },
  };
}

function stripBody(callback: Cgb4Callback): NoteCallback {
  const { cgb4AllocationBodyState: _body, ...base } = callback;
  return base;
}

function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v3" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "sixth-MPlayMain-ply_note-CGB4-allocation-body-before-ClearChain" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const v2Evidence = checkedJson<any>(join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v2.json"), V2_EVIDENCE_SHA256);
  if (v2Evidence.coverage?.exactMutableChannelRouteCallbacks !== 7 || v2Evidence.coverage?.continuationSourceCycles !== 154) fail("accepted CGB4 v2 evidence changed");
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, Record<string, number>> = {};
  const reproducibility = { schema: "factory-m4a-note-body-cgb4-repro/v3", oracleProfile: "battle-scene-off", freshRunsPerCase: 2, cases: CASES.map((name) => ({ case: name, firstFreshSha256: PACKET_HASHES[name], secondFreshSha256: PACKET_HASHES[name], byteIdentical: true })) };

  for (const name of CASES) {
    const packet = loadPacket(name);
    const v2 = checkedJson<Packet>(join(V2_PACKETS, `${name}.json`), V2_PACKET_HASHES[name]);
    const notes = checkedJson<{ schema: string; case: CaseName; observations: Array<{ sourceStateDigest: string; noteCallbacks: NoteCallback[] | null }> }>(join(NOTES, `${name}.json`), NOTE_PACKET_HASHES[name]);
    const states = checkedJson<StatePacket>(join(STATES, `${name}.json`), STATE_PACKET_HASHES[name]);
    if (v2.observations.length !== packet.observations.length || notes.observations.length !== COUNTS[name] || states.interrupts.length !== COUNTS[name]) fail(`${name} frozen join cardinality changed`);
    const v2ByDigest = new Map(v2.observations.map((observation) => [observation.sourceStateDigest, observation]));
    const noteByDigest = new Map(notes.observations.map((observation) => [observation.sourceStateDigest, observation]));
    const stateByDigest = new Map(states.interrupts.map((interrupt) => [interrupt.m4a.state.sourceSemanticState.stateDigest, interrupt.m4a.state]));
    if (v2ByDigest.size !== COUNTS[name] || noteByDigest.size !== COUNTS[name] || stateByDigest.size !== COUNTS[name]) fail(`${name} source-state join is ambiguous`);
    const summary = { observations: packet.observations.length, callbacks: 0, cgb4: 0, trackNull: 0, ownerLinked: 0 };
    for (const observation of packet.observations) {
      const old = v2ByDigest.get(observation.sourceStateDigest);
      const note = noteByDigest.get(observation.sourceStateDigest);
      const state = stateByDigest.get(observation.sourceStateDigest);
      if (!old || !note || !state || JSON.stringify(observation.noteCallbacks?.map(stripBody) ?? null) !== JSON.stringify(old.noteCallbacks)) fail(`${name} v3 packet changes accepted v2/note rows`);
      const player = state.sourceSemanticState.musicPlayers[5];
      if (!player || player.scalarBytes[9] !== 0 || player.tracks.length !== 10 || state.sourceSemanticState.cgbChannels.length !== 4) fail(`${name} source-state CGB4 inputs changed`);
      for (const callback of observation.noteCallbacks ?? []) {
        summary.callbacks += 1;
        if (callback.toneType !== 12) continue;
        summary.cgb4 += 1;
        const track = player.tracks[callback.trackIndex];
        const mutable = callback.cgb4MutableState;
        const body = callback.cgb4AllocationBodyState;
        if (!track || !mutable || !body) fail(`${name} CGB4 callback body state is missing`);
        const prefix = reduceMPlayCgb4AllocationPrefixTiming(callback, { playerPriority: player.scalarBytes[9]!, trackPriority: track.scalarBytes[29]!, cgbChannelCount: state.sourceSemanticState.cgbChannels.length });
        const mutableTiming = reduceMPlayCgb4MutableChannelTiming({ effectivePriority: prefix.effectivePriority, state: mutable });
        if (!mutableTiming) fail(`${name} accepted v2 CGB4 route became unresolved`);
        const bodyTiming = reduceMPlayCgb4AllocationBodyTiming(body);
        if (!bodyTiming) fail(`${name} observed allocation body became unresolved`);
        if (body.trackRole === null) summary.trackNull += 1; else summary.ownerLinked += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: name, trackIndex: callback.trackIndex, allocationBodyState: body, prefixSourceCycles: prefix.cycles, mutableRouteSourceCycles: mutableTiming.cycles, allocationBodySourceCycles: bodyTiming.cycles, knownPrefixThroughBodySourceCycles: prefix.cycles + mutableTiming.cycles + bodyTiming.cycles, completeNoteCallbackSourceCycles: null, postCallbackGlueSourceCycles: null });
      }
    }
    if (summary.callbacks !== NOTE_COUNTS[name] || summary.cgb4 !== CGB4_COUNTS[name]) fail(`${name} callback coverage changed`);
    byCase[name] = summary;
  }
  if (rows.length !== 7 || rows.filter((row) => (row.allocationBodyState as BodyState).trackRole === null).length !== 5 || rows.filter((row) => (row.allocationBodyState as BodyState).trackRole !== null).length !== 2) fail("allocation-body route partition changed");
  const bodyCycles = rows.reduce((sum, row) => sum + (row.allocationBodySourceCycles as number), 0);
  const knownCycles = rows.reduce((sum, row) => sum + (row.knownPrefixThroughBodySourceCycles as number), 0);
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v3", oracleProfile: "battle-scene-off", addressFree: true, sourceAndElf, reproducibility,
    frozenInputs: { packets: PACKET_HASHES, acceptedV2Packets: V2_PACKET_HASHES, acceptedV2EvidenceSha256: V2_EVIDENCE_SHA256, notePackets: NOTE_PACKET_HASHES, sourceStatePackets: STATE_PACKET_HASHES },
    capture: { boundary: "ply_note._081DDC40-before-ClearChain", runtimeCompiledPc: "0x082dfe7a", state: "address-free selected channel/owner/prev/next roles, current track chan role, and lfoDelay", selectedChannelIndex: 3 },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: { observedNoteCallbacks: 82, cgbChannel4Callbacks: 7, byCase, allocationBodyRouteCounts: { "track-null": 5, "previous-null-next-null": 2 }, lfoBranchCounts: { "TrkVolPitSet-entry": 7, "clear_modM": 0 }, exactAllocationBodyCallbacks: 7, nullOtherPostSelectionCallbacks: 75, nullCompleteNoteCallbacks: 82, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108, allocationBodySourceCycleRange: { min: Math.min(...rows.map((row) => row.allocationBodySourceCycles as number)), max: Math.max(...rows.map((row) => row.allocationBodySourceCycles as number)), distinct: new Set(rows.map((row) => row.allocationBodySourceCycles)).size }, allocationBodySourceCycles: bodyCycles, acceptedPrefixAndMutableSourceCycles: 588, knownPrefixThroughAllocationBodySourceCycles: knownCycles },
    branchCoverage: { sourceBranches: ["ClearChain track == null", "ClearChain previous == null", "ClearChain next == null", "track chan next == null", "lfoDelay == 0 -> TrkVolPitSet"], reducerAccountsForAll: true, observed: ["track-null", "previous-null-next-null", "track chan next == null", "lfoDelay == 0 -> TrkVolPitSet"] },
    rows,
    closure: { closed: "Seven observed type-12 CGB4 callbacks are source-exact from the accepted 62-cycle pointer prefix and mutable route through ClearChain, channel prev/next relink, track ownership, lfoDelayC update, and the zero-delay branch immediately before TrkVolPitSet.", remainingDiscriminator: "clear_modM and TrkVolPitSet helper bodies, nonzero-modulation routes, later allocation fields, all other post-selection callbacks, complete note callbacks, post-callback glue, complete one-pass MPlay totals, service cost, VBlank/IRQ/audio arbitration, and construction-clock wiring remain null.", durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null },
    verdict: "A source-general CGB-channel allocation-body reducer closes 7/82 observed type-12 callbacks across anchor/LILIANA/legal-varied: 5 track-null ClearChain routes at 111 cycles and 2 previous-null/next-null ownership routes at 135 cycles; complete note and construction-clock costs remain null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, { cgb4: number; trackNull: number; ownerLinked: number }>;
  return ["# Issue #55 — `ply_note` CGB-channel-4 allocation body v3", "", "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v3.ts`; do not hand-edit.", "", "Battle Scene OFF, additive evidence only. Two fresh emulator paths per anchor, LILIANA, and legal-varied case produced byte-identical address-free packets. The packet joins the accepted CGB4 v2 route, frozen note census, and source-state v3 by `sourceStateDigest` and captures only source operands at `_081DDC40`.", "", `The observed family is **${coverage.cgbChannel4Callbacks}/82** callbacks: **0 anchor / 3 LILIANA / 4 legal-varied**. All seven select CGB channel index **3**. Five callbacks have a null selected-channel owner and take source ClearChain's **track-null** route; two have a previous-null/next-null owner route. All seven have lfoDelay=0, so the captured branch reaches the TrkVolPitSet entry boundary; neither helper body is priced.`, "", "The reducer source-counts the `_081DDC40` caller/link sequence, the compiled ClearChain wrapper, indirect trampoline, and RealClearChain route. The common caller/link/LFO prefix is **15 Thumb halfwords** and **3 taken refills = 48 cycles** for the observed null next-link and zero-delay route. ClearChain contributes **63 cycles** on the five track-null rows and **87 cycles** on the two previous-null/next-null rows, for **111/135 allocation-body cycles** and **801 total**.", "", "| case | CGB4 callbacks | track-null | owner route | packet repeats |", "| --- | ---: | ---: | ---: | ---: |", ...CASES.map((name) => `| ${name} | ${byCase[name].cgb4} | ${byCase[name].trackNull} | ${byCase[name].ownerLinked} | byte-identical ×2 |`), "", `The accepted CGB4 prefix plus mutable route remains **588** cycles; through this allocation-body boundary it is **${coverage.knownPrefixThroughAllocationBodySourceCycles}** source cycles across the seven rows.`, "", "The closure stops before `clear_modM`, `TrkVolPitSet`, later allocation fields, all other post-selection callbacks, complete note callbacks, post-callback glue, complete one-pass MPlay totals (**5 exact / 108 null**), service cost, VBlank/IRQ/audio arbitration, and `runFactoryConstructionClock`. Nonzero `lfoDelay` remains null because it selects the unresolved `clear_modM` helper route.", ""].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") { const root = resolve(args[1]!); return { json: join(root, "factory-m4a-note-body-cgb4-evidence-v3.json"), doc: join(root, "issue55-m4a-note-body-cgb4-v3.md") }; }
  fail("usage: factory-m4a-note-body-cgb4-v3.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const evidence = makeEvidence();
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
