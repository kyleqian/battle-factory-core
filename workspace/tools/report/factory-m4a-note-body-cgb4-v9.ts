import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV8Evidence } from "./factory-m4a-note-body-cgb4-v8.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "13d6526138359b145d707c0fdf55d074527e93e5e6d6b37d52bdd61c8414bedd",
  liliana: "86d4d2c5dfc6d63a74d5708fb50b8eb84d02b3218bedde9b066f30c278ce934e",
  "factory-varied": "87a32977d6d69546e4720f2715ccf1315efebbee5d4826783cc35cbeca161fb2",
};
const V8_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "e9c6769519eb43252fd7caef11268661f35fe5b967c44f28c966c4827d8c068b",
  liliana: "804509102c5d47e78d141dfd1c613dc0abe0e844b5d8b1b7fcb41a4db5a0ba90",
  "factory-varied": "ff77f6e124feb87902e0ba588f3a27a03f6630c6cbbd8102946ffde4254d57e8",
};
const V8_EVIDENCE_SHA256 = "9c0f6c687dab444970e50d11079b401da35e966a5f7f08e3e819dcf25871a8db";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const M4A_INTERNAL_H_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const MAP_SHA256 = "27c5f864f0f985637a3934946f256d64064977e2a240efd1ffe2c20b0dd11aa6";
const PAN_SWEEP_TO_CALL_R3_SHA256 = "5d1d00835d0ae7e606894606bb2ac9643e9234434a930bc17b04998348a8e83c";
const PAN_SWEEP_BRANCH_SHA256 = "260fec2056d7e4bb1b8ca16084b7c0c53b0ef5519d515e02bbcb613273f1e4aa";
const CALL_R3_ENTRY_SHA256 = "477db9ac7ca5efc12e37f882656b8fe5a363ffeb99b2e565a953d10c3c91ab21";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v9");
const V8_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v8");
const V8_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v8.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v9.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v9.md");
const ROM_BASE = 0x0800_0000;
const PAN_SWEEP_START = 0x082d_feea;
const CALL_R3_EDGE_END = 0x082d_ff04;
const CALL_R3_ENTRY = 0x082d_fcb4;
const CALL_R3_ENTRY_END = 0x082d_fcb6;

export type Cgb4PanSweepToCallR3State = Readonly<{
  route: "pan-sweep-zero-to-call-r3-entry";
  panSweep: number;
  toneMemory: "ewram";
  trackMemory: "ewram";
  channelMemory: "iwram";
  stackMemory: "iwram";
  soundInfoMemory: "iwram";
}>;

export const CGB4_PAN_SWEEP_STATE: Cgb4PanSweepToCallR3State = Object.freeze({
  route: "pan-sweep-zero-to-call-r3-entry",
  panSweep: 0,
  toneMemory: "ewram",
  trackMemory: "ewram",
  channelMemory: "iwram",
  stackMemory: "iwram",
  soundInfoMemory: "iwram",
});

export type Cgb4PanSweepToCallR3Timing = Readonly<{
  route: "pan-sweep-zero-to-call-r3-entry";
  panSweep: 0;
  panSweep80Branch: "bne-not-taken";
  panSweep70Branch: "bne-not-taken";
  sweepValue: 8;
  dynamicHelperBoundary: "call-r3-entry";
  sequentialThumbHalfwords: 13;
  pipelineRefills: 1;
  iwramByteStores: 1;
  ewramByteReads: 1;
  iwramWordReads: 3;
  ewramDataAccessPremiumCycles: 2;
  cycles: 34;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v9: ${message}`);
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
  return readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba")).subarray(start - ROM_BASE, end - ROM_BASE);
}

/** Reduce only the observed zero-pan_sweep caller route through call_r3 entry. */
export function reduceMPlayCgb4PanSweepToCallR3Timing(state: unknown): Cgb4PanSweepToCallR3Timing | null {
  if (!isRecord(state)) fail("state must be an object");
  if (
    Object.keys(state).sort().join(",") !== "channelMemory,panSweep,route,soundInfoMemory,stackMemory,toneMemory,trackMemory" ||
    state.route !== "pan-sweep-zero-to-call-r3-entry" ||
    state.toneMemory !== "ewram" ||
    state.trackMemory !== "ewram" ||
    state.channelMemory !== "iwram" ||
    state.stackMemory !== "iwram" ||
    state.soundInfoMemory !== "iwram"
  ) return null;

  const panSweep = requireU8(state.panSweep, "panSweep");
  if (panSweep !== 0) return null;

  return Object.freeze({
    route: "pan-sweep-zero-to-call-r3-entry",
    panSweep: 0,
    panSweep80Branch: "bne-not-taken",
    panSweep70Branch: "bne-not-taken",
    sweepValue: 8,
    dynamicHelperBoundary: "call-r3-entry",
    sequentialThumbHalfwords: 13,
    pipelineRefills: 1,
    iwramByteStores: 1,
    ewramByteReads: 1,
    iwramWordReads: 3,
    ewramDataAccessPremiumCycles: 2,
    cycles: 34,
  });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const m4aC = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const map = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.map"), "utf8");
  for (const anchor of [
    "ldrb r1, [r6, o_ToneData_pan_sweep]",
    "movs r0, 0x80",
    "tst r0, r1",
    "bne _081DDCBA",
    "movs r0, 0x70",
    "bne _081DDCBC",
    "_081DDCBA:",
    "movs r1, 0x8",
    "_081DDCBC:",
    "strb r1, [r4, o_CgbChannel_sweep]",
    "ldrb r2, [r5, o_MusicPlayerTrack_pitM]",
    "adds r1, r3, 0",
    "ldr r0, [sp, 0xC]",
    "ldr r3, [sp, 0x4]",
    "ldr r3, [r3, o_SoundInfo_MidiKeyToCgbFreq]",
    "bl call_r3",
    "call_r3:",
    "bx r3",
  ]) if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  if (sha256(assembly) !== M4A1_SHA256) fail("m4a_1.s source bytes changed");
  if (!m4aC.includes("soundInfo->MidiKeyToCgbFreq = MidiKeyToCgbFreq;")) fail("m4a.c lost MidiKeyToCgbFreq setup");
  if (sha256(m4aC) !== M4A_C_SHA256) fail("m4a.c source bytes changed");
  if (!internal.includes("MidiKeyToCgbFreqFunc MidiKeyToCgbFreq;")) fail("m4a_internal.h lost SoundInfo MidiKeyToCgbFreq field");
  if (sha256(internal) !== M4A_INTERNAL_H_SHA256) fail("m4a_internal.h source bytes changed");
  if (!map.includes("0x03006380") || !map.includes("gSoundInfo = .") || !map.includes("0x030074f0") || !map.includes("gCgbChans = .")) fail("map lost IWRAM sound anchors");
  if (sha256(map) !== MAP_SHA256) fail("map bytes changed");

  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of [
    "082dfcb4 t call_r3",
    "082dfe9e t _081DDC66",
    "082dfd38 00000204 T ply_note",
    "082e0b34 000000a8 T MidiKeyToCgbFreq",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);

  if (romSlice(PAN_SWEEP_START, CALL_R3_EDGE_END).length !== 0x1a || sha256(romSlice(PAN_SWEEP_START, CALL_R3_EDGE_END)) !== PAN_SWEEP_TO_CALL_R3_SHA256) fail("pan_sweep caller-to-call_r3 bytes changed");
  if (romSlice(PAN_SWEEP_START, PAN_SWEEP_START + 2).length !== 2 || sha256(romSlice(PAN_SWEEP_START, PAN_SWEEP_START + 2)) !== PAN_SWEEP_BRANCH_SHA256) fail("pan_sweep branch bytes changed");
  if (romSlice(CALL_R3_ENTRY, CALL_R3_ENTRY_END).length !== 2 || sha256(romSlice(CALL_R3_ENTRY, CALL_R3_ENTRY_END)) !== CALL_R3_ENTRY_SHA256) fail("call_r3 entry bytes changed");

  return {
    source: {
      caller: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1773-1789", sha256: sha256(assembly) },
      soundSetup: { path: "reference/pokeemerald/src/m4a.c", lines: "308-311", sha256: sha256(m4aC) },
      soundInfo: { path: "reference/pokeemerald/include/gba/m4a_internal.h", lines: "185-216", sha256: sha256(internal) },
      map: { path: "reference/pokeemerald/pokeemerald.map", sha256: sha256(map) },
    },
    elf: {
      callerResume: "0x082dfecc",
      panSweepBranch: "0x082dfeea",
      callR3Entry: "0x082dfcb4",
      dynamicMidiKeyToCgbFreq: "0x082e0b34",
    },
    compiledRegions: [
      { role: "observed pan_sweep branches through BL call_r3 edge", start: "0x082dfeea", endExclusive: "0x082dff04", bytes: 0x1a, sha256: PAN_SWEEP_TO_CALL_R3_SHA256 },
      { role: "first pan_sweep branch", start: "0x082dfeea", endExclusive: "0x082dfeec", bytes: 2, sha256: PAN_SWEEP_BRANCH_SHA256 },
      { role: "dynamic call_r3 entry, explicitly not priced", start: "0x082dfcb4", endExclusive: "0x082dfcb6", bytes: 2, sha256: CALL_R3_ENTRY_SHA256 },
    ],
    timingClasses: {
      sequentialThumbFetchCycles: 2,
      takenControlTransferRefillCycles: 6,
      notTakenConditionalBranchRefillCycles: 0,
      ewramDataAccessPremiumCyclesPerByteRead: 2,
      iwramDataAccessPremiumCyclesPerByteOrWord: 0,
      toneAndTrackDataClass: "EWRAM",
      channelStackAndSoundInfoDataClass: "IWRAM",
      dynamicTarget: "the IWRAM SoundInfo function-pointer load is priced as a load only; its value and bx r3 execution are excluded",
    },
    sourceCycleAccounting: {
      observedPanSweepZeroRoute: {
        panSweep80Branch: { branches: 1, route: "not-taken", sequentialThumbHalfwords: 1, refills: 0 },
        panSweep70Branch: { branches: 1, route: "not-taken", sequentialThumbHalfwords: 1, refills: 0 },
        sweepSetup: { sequentialThumbHalfwords: 3, includes: ["movs 0x70", "tst", "movs sweep=8"] },
        sweepStore: { sequentialThumbHalfwords: 1, iwramByteStores: 1 },
        pitchRead: { sequentialThumbHalfwords: 1, ewramByteReads: 1, field: "MusicPlayerTrack.pitM" },
        argumentAndFunctionPointerLoads: {
          sequentialThumbHalfwords: 5,
          iwramWordReads: 3,
          includes: ["ToneData argument from stack", "SoundInfo argument from stack", "SoundInfo.MidiKeyToCgbFreq function-pointer load"],
        },
        callR3CallerEdge: { sequentialThumbHalfwords: 2, takenControlTransferRefills: 1, destination: "0x082dfcb4" },
        cycles: "13*2 + 1*6 + 1*2",
        totalCycles: 34,
      },
    },
  };
}

type Packet = { schema: string; case: CaseName; oracleProfile: string; sourceFunction: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: any[] };

function stripPanSweepState(packet: Packet): Packet {
  return {
    ...packet,
    schema: "factory-m4a-note-body-cgb4-probe/v8",
    captureBoundary: "sixth-MPlayMain-ply_note-CGB4-post-ChnVolSetAsm-keyM-at-bpl",
    observations: packet.observations.map((observation) => ({
      ...observation,
      noteCallbacks: observation.noteCallbacks?.map((callback: any) => {
        const { cgb4PanSweepState: _panSweep, ...base } = callback;
        return base;
      }) ?? null,
    })),
  };
}

function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v9" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "sixth-MPlayMain-ply_note-CGB4-pan-sweep-at-bne" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  const v8 = checkedJson<Packet>(join(V8_PACKETS, `${name}.json`), V8_PACKET_HASHES[name]);
  if (JSON.stringify(stripPanSweepState(packet)) !== JSON.stringify(v8)) fail(`${name} packet no longer adds cleanly to frozen v8`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const frozenV8 = checkedJson<any>(V8_EVIDENCE, V8_EVIDENCE_SHA256);
  if (JSON.stringify(makeV8Evidence()) !== JSON.stringify(frozenV8)) fail("accepted v8 evidence does not regenerate byte-for-byte");
  if (frozenV8.coverage?.contiguousPrefixThroughPanSweepBranchSourceCycles !== 3215) fail("accepted v8 boundary changed");

  const callbacks = CASES.flatMap((name) => loadPacket(name).observations.flatMap((observation: any) =>
    (observation.noteCallbacks ?? []).filter((callback: any) => callback.toneType === 12)
      .map((callback: any) => ({ ...callback, sourceStateDigest: observation.sourceStateDigest }))));
  if (callbacks.length !== 7) fail("CGB4 callback count changed");
  const byDigest = new Map(callbacks.map((callback: any) => [callback.sourceStateDigest, callback]));
  if (byDigest.size !== 7) fail("CGB4 source-state join became ambiguous");

  const v8Rows = new Map((frozenV8.rows as any[]).map((row) => [row.sourceStateDigest, row]));
  const rows = [...byDigest.entries()].map(([sourceStateDigest, callback]: [string, any]) => {
    const prior = v8Rows.get(sourceStateDigest);
    if (!prior || !isRecord(callback.cgb4PanSweepState) || Object.keys(callback.cgb4PanSweepState).sort().join(",") !== "panSweep") fail("v9 packet missed a frozen v8 row or captured more than pan_sweep");
    const timing = reduceMPlayCgb4PanSweepToCallR3Timing({ ...CGB4_PAN_SWEEP_STATE, panSweep: callback.cgb4PanSweepState.panSweep });
    if (!timing) fail("observed pan_sweep route became unresolved");
    return {
      sourceStateDigest,
      case: prior.case,
      trackIndex: prior.trackIndex,
      acceptedContiguousPrefixThroughPanSweepBranchSourceCycles: prior.contiguousPrefixThroughPanSweepBranchSourceCycles,
      panSweep: timing.panSweep,
      panSweepToCallR3Route: timing.route,
      panSweepToCallR3SourceCycles: timing.cycles,
      contiguousPrefixThroughCallR3EntrySourceCycles: prior.contiguousPrefixThroughPanSweepBranchSourceCycles + timing.cycles,
      dynamicCallR3HelperSourceCycles: null,
      dynamicMidiKeyToCgbFreqSourceCycles: null,
      laterAllocationFieldsSourceCycles: null,
      completeNoteCallbackSourceCycles: null,
      postCallbackGlueSourceCycles: null,
    };
  });
  if (rows.length !== 7) fail("v9 packet contains an unjoined CGB4 row");

  const byCase = Object.fromEntries(CASES.map((name) => [name, {
    callbacks: rows.filter((row: any) => row.case === name).length,
    exactPanSweepToCallR3Slices: rows.filter((row: any) => row.case === name).length,
  }])) as Record<CaseName, any>;
  for (const name of CASES) if (byCase[name].callbacks !== CGB4_COUNTS[name]) fail(`${name} CGB4 coverage changed`);
  const sliceCycles = rows.reduce((sum: number, row: any) => sum + row.panSweepToCallR3SourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughCallR3EntrySourceCycles, 0);
  if (sliceCycles !== 238 || contiguous !== 3453) fail("v9 timing totals changed");

  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v9",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: { acceptedV8EvidenceSha256: V8_EVIDENCE_SHA256, packetSha256: PACKET_HASHES, packetRepeatSha256: PACKET_HASHES },
    capture: {
      boundary: "pipelined 0x082dfeec at bne 0x082dfeea after the frozen ChnVolSetAsm-return route",
      scalars: ["ToneData.pan_sweep only"],
      excluded: ["pointer", "frame", "duration", "callback identity", "pitM value", "stack argument values", "function-pointer value", "call_r3 body", "MidiKeyToCgbFreq body", "result bytes"],
    },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      exactPanSweepToCallR3Callbacks: 7,
      panSweepToCallR3SourceCycleRange: { min: 34, max: 34, distinct: 1 },
      panSweepToCallR3SourceCycles: sliceCycles,
      acceptedContiguousPrefixThroughPanSweepBranchSourceCycles: 3215,
      contiguousPrefixThroughCallR3EntrySourceCycles: contiguous,
      observedPanSweepValues: { "0": 7 },
      panSweep80BranchCounts: { bneTaken: 0, bneNotTaken: 7 },
      panSweep70BranchCounts: { bneTaken: 0, bneNotTaken: 7 },
      sweepStoreValues: { "8": 7 },
      sweepStores: 7,
      pitMReads: 7,
      stackArgumentLoads: 2 * 7,
      functionPointerLoads: 7,
      callR3CallerEdges: 7,
      nullDynamicCallR3HelperCallbacks: 7,
      nullDynamicMidiKeyToCgbFreqCallbacks: 7,
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    branchCoverage: {
      observed: {
        panSweepReads: 7,
        panSweep80BneNotTaken: 7,
        panSweep70BneNotTaken: 7,
        sweepStores: 7,
        pitMReads: 7,
        toneDataStackArgumentLoads: 7,
        soundInfoStackArgumentLoads: 7,
        midiKeyToCgbFreqFunctionPointerLoads: 7,
        callR3CallerEdges: 7,
      },
      unobservedPanSweep80TakenRoute: null,
      unobservedPanSweep70TakenRoute: null,
      dynamicCallR3Body: null,
      dynamicMidiKeyToCgbFreqBodyAndResult: null,
    },
    rows,
    closure: {
      closed: "The observed zero ToneData.pan_sweep branch route, CGB sweep store, pitM and argument/function-pointer loads, and BL call_r3 caller edge through fixed call_r3 entry for the same seven callbacks.",
      contiguousPrefix: "3453 aggregate source cycles through call_r3 entry across seven callbacks (3215 accepted through the pan_sweep read/tst boundary + 238 new).",
      remainingDiscriminator: "The dynamic call_r3 bx r3 execution, MidiKeyToCgbFreq target/body/result, all later allocation fields, unobserved pan_sweep/keyM/helper/clamp routes, clear_modM, nonzero-lfoDelay routes, other 75 callbacks, complete note/glue/MPlay, service/arbitration, and construction clock remain null.",
      durationFit: false,
      runtimePointerIdentity: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "All 7/82 observed zero-lfoDelay CGB4 callbacks have ToneData.pan_sweep=0, so both 0x80 and 0x70 bne branches are not taken and sweep=8 is stored. The 34-cycle caller-only route includes the pitM EWRAM read, three IWRAM argument/function-pointer loads, and fixed BL call_r3 edge; dynamic helper execution and its result remain null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, any>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 pan-sweep caller v9", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v9.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. The v9 packet preserves frozen v8 packets byte-for-byte and captures only `ToneData.pan_sweep` at the exact pipelined `0x082dfeec` boundary for the first `bne` at `0x082dfeea`; the live ChnVolSetAsm return LR gates the callsite and no pointer or identity is serialized.", "",
    `The same **${coverage.cgbChannel4Callbacks}/82** callbacks are covered: **0 anchor / 3 LILIANA / 4 legal-varied**. All seven have \`pan_sweep=0\`, so the source's \`0x80\` and \`0x70\` tests each take their not-taken route and \`sweep=8\` is stored.`, "",
    "From `0x082dfeea`, the pinned caller route performs 13 sequential Thumb halfwords, one taken refill for the fixed `BL call_r3`, one IWRAM sweep-byte store, one EWRAM `pitM` byte read, and three IWRAM word reads (two stack arguments plus the `SoundInfo.MidiKeyToCgbFreq` function-pointer load). The ARM7TDMI classes give **13×2 + 1×6 + 1×2 = 34 cycles** per callback. The caller edge reaches `call_r3` at `0x082dfcb4`; its dynamic `bx r3`, target/body, and result are intentionally not priced.", "",
    `The slice adds **${coverage.panSweepToCallR3SourceCycles} cycles** across seven callbacks, extending the accepted **3215-cycle** pan_sweep boundary to **${coverage.contiguousPrefixThroughCallR3EntrySourceCycles} aggregate cycles** through fixed \`call_r3\` entry.`, "",
    "| case | callbacks | exact caller slices | cycles |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => `| ${name} | ${byCase[name].callbacks} | ${byCase[name].exactPanSweepToCallR3Slices} | ${byCase[name].exactPanSweepToCallR3Slices * 34} |`), "",
    "The dynamic `call_r3`/`MidiKeyToCgbFreq` helper and result, later fields, unobserved pan_sweep/keyM/helper/clamp routes, clear_modM, nonzero-LFO routes, other 75 callbacks, complete note/glue/MPlay (**5 exact / 108 null**), service/arbitration, and `runFactoryConstructionClock` remain null. No duration fit, runtime identity lookup, production recording import, unsupported barrier, or canonical Battle-2 branch is present.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v9.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v9.md") };
  fail("usage: factory-m4a-note-body-cgb4-v9.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
