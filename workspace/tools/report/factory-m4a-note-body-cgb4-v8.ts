import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV7Evidence } from "./factory-m4a-note-body-cgb4-v7.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "e9c6769519eb43252fd7caef11268661f35fe5b967c44f28c966c4827d8c068b",
  liliana: "804509102c5d47e78d141dfd1c613dc0abe0e844b5d8b1b7fcb41a4db5a0ba90",
  "factory-varied": "ff77f6e124feb87902e0ba588f3a27a03f6630c6cbbd8102946ffde4254d57e8",
};
const V7_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "a2f62e3b7ea01cccfe19b41f7cef7ab45cde50400c74eb4285491e1987479566",
  liliana: "53db7226067890c8996ddc5c045ee8afd45bb1f2f469a82be5f5a9dc9d278624",
  "factory-varied": "406586b9fc00ddc24aba5984ed8a4b5a40f952ba72789d455549165c589a6784",
};
const V7_EVIDENCE_SHA256 = "bec89adb6ace334390a8fab6ba6dd839e1383dc78c7817a005067436144d8241";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const POST_CHN_VOL_SET_SHA256 = "a929ad4f85d2bcd90b0b68a16f744954a99828dc78224ecfa1b78c0210b23a7c";
const FIRST_UNRESOLVED_BRANCH_SHA256 = "260fec2056d7e4bb1b8ca16084b7c0c53b0ef5519d515e02bbcb613273f1e4aa";
const CHN_VOL_SET_SHA256 = "04988bf8e911a12b477d9aafa24342b68e83960a06796e555869cc67b24bd4d2";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v8");
const V7_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v7");
const V7_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v7.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v8.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v8.md");
const ROM_BASE = 0x0800_0000;
const POST_START = 0x082d_fecc;
const POST_END = 0x082d_feea;
const FIRST_UNRESOLVED_BRANCH = 0x082d_feea;
const FIRST_UNRESOLVED_BRANCH_END = 0x082d_feec;
const CHN_VOL_SET_START = 0x082d_fd08;
const CHN_VOL_SET_END = 0x082d_fd38;

export type Cgb4PostChnVolSetState = Readonly<{
  route: "post-ChnVolSetAsm-key-plus-keyM-to-pan-sweep-boundary";
  resume: "ChnVolSetAsm-return";
  keyAfter: number;
  keyM: number;
  toneType: 12;
  trackMemory: "ewram";
  channelMemory: "iwram";
  toneMemory: "ewram";
  stackMemory: "iwram";
}>;

export const CGB4_POST_CHN_VOL_SET_STATE: Cgb4PostChnVolSetState = Object.freeze({
  route: "post-ChnVolSetAsm-key-plus-keyM-to-pan-sweep-boundary",
  resume: "ChnVolSetAsm-return",
  keyAfter: 64,
  keyM: 0,
  toneType: 12,
  trackMemory: "ewram",
  channelMemory: "iwram",
  toneMemory: "ewram",
  stackMemory: "iwram",
});

export type Cgb4PostChnVolSetTiming = Readonly<{
  route: "post-ChnVolSetAsm-key-plus-keyM-to-pan-sweep-boundary";
  channelKey: number;
  keyM: number;
  keyPlusKeyM: number;
  toneType: 12;
  toneTypeCgbBits: 4;
  keyPlusKeyMBranch: "bpl-taken";
  cgbBranch: "beq-not-taken";
  firstUnresolvedBranch: "bne-pan-sweep";
  sequentialThumbHalfwords: 14;
  pipelineRefills: 1;
  iwramByteReads: 1;
  iwramWordReads: 1;
  iwramByteStores: 1;
  ewramByteReads: 3;
  ewramDataAccessPremiumCycles: 6;
  cycles: 40;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v8: ${message}`);
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

function requireS8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < -0x80 || (value as number) > 0x7f) fail(`${label} must be s8`);
  return value as number;
}

function romSlice(start: number, end: number): Buffer {
  return readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba")).subarray(start - ROM_BASE, end - ROM_BASE);
}

/** Reduce only the observed post-helper route before the pan_sweep branch. */
export function reduceMPlayCgb4PostChnVolSetTiming(state: unknown): Cgb4PostChnVolSetTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (
    Object.keys(state).sort().join(",") !== "channelMemory,keyAfter,keyM,resume,route,stackMemory,toneMemory,toneType,trackMemory" ||
    state.route !== "post-ChnVolSetAsm-key-plus-keyM-to-pan-sweep-boundary" ||
    state.resume !== "ChnVolSetAsm-return" ||
    state.trackMemory !== "ewram" ||
    state.channelMemory !== "iwram" ||
    state.toneMemory !== "ewram" ||
    state.stackMemory !== "iwram" ||
    state.toneType !== 12
  ) return null;

  const channelKey = requireU8(state.keyAfter, "keyAfter");
  const keyM = requireS8(state.keyM, "keyM");
  if (!new Set(["64,0", "91,0"]).has(`${channelKey},${keyM}`)) return null;
  const keyPlusKeyM = channelKey + keyM;
  if (keyPlusKeyM < 0) return null;

  return Object.freeze({
    route: "post-ChnVolSetAsm-key-plus-keyM-to-pan-sweep-boundary",
    channelKey,
    keyM,
    keyPlusKeyM,
    toneType: 12,
    toneTypeCgbBits: 4,
    keyPlusKeyMBranch: "bpl-taken",
    cgbBranch: "beq-not-taken",
    firstUnresolvedBranch: "bne-pan-sweep",
    sequentialThumbHalfwords: 14,
    pipelineRefills: 1,
    iwramByteReads: 1,
    iwramWordReads: 1,
    iwramByteStores: 1,
    ewramByteReads: 3,
    ewramDataAccessPremiumCycles: 6,
    cycles: 40,
  });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of [
    "_081DDCA0:",
    "ldrb r1, [r4, o_SoundChannel_key]",
    "movs r0, o_MusicPlayerTrack_keyM",
    "ldrsb r0, [r5, r0]",
    "adds r3, r1, r0",
    "bpl _081DDCA0",
    "ldr r6, [sp, 0xC]",
    "beq _081DDCCE",
    "ldrb r0, [r6, o_ToneData_length]",
    "strb r0, [r4, o_CgbChannel_length]",
    "ldrb r1, [r6, o_ToneData_pan_sweep]",
    "tst r0, r1",
  ]) if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  if (sha256(assembly) !== M4A1_SHA256) fail("m4a_1.s source bytes changed");

  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of [
    "082dfe9e t _081DDC66",
    "082dfd08 00000030 T ChnVolSetAsm",
    "082dfd38 00000204 T ply_note",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);

  if (romSlice(POST_START, POST_END).length !== 0x1e || sha256(romSlice(POST_START, POST_END)) !== POST_CHN_VOL_SET_SHA256) fail("post-helper caller slice bytes changed");
  if (romSlice(FIRST_UNRESOLVED_BRANCH, FIRST_UNRESOLVED_BRANCH_END).length !== 2 || sha256(romSlice(FIRST_UNRESOLVED_BRANCH, FIRST_UNRESOLVED_BRANCH_END)) !== FIRST_UNRESOLVED_BRANCH_SHA256) fail("first unresolved branch bytes changed");
  if (romSlice(CHN_VOL_SET_START, CHN_VOL_SET_END).length !== 0x30 || sha256(romSlice(CHN_VOL_SET_START, CHN_VOL_SET_END)) !== CHN_VOL_SET_SHA256) fail("ChnVolSetAsm bytes changed");

  return {
    source: { caller: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1760-1775", sha256: sha256(assembly) } },
    elf: {
      callerResume: "0x082dfecc",
      keyMBranch: "0x082dfed4",
      keyMBranchPipelinedBoundary: "0x082dfed6",
      firstUnresolvedPanSweepBranch: "0x082dfeea",
      chnVolSetAsmEntry: "0x082dfd08",
      chnVolSetAsmReturn: "0x082dfd38",
    },
    compiledRegions: [
      { role: "post-ChnVolSetAsm caller route through pan_sweep read/tst", start: "0x082dfecc", endExclusive: "0x082dfeea", bytes: 0x1e, sha256: POST_CHN_VOL_SET_SHA256 },
      { role: "first unresolved pan_sweep branch", start: "0x082dfeea", endExclusive: "0x082dfeec", bytes: 2, sha256: FIRST_UNRESOLVED_BRANCH_SHA256 },
      { role: "ChnVolSetAsm frozen v7 helper", start: "0x082dfd08", endExclusive: "0x082dfd38", bytes: 0x30, sha256: CHN_VOL_SET_SHA256 },
    ],
    timingClasses: {
      sequentialThumbFetchCycles: 2,
      takenControlTransferRefillCycles: 6,
      ewramDataAccessPremiumCyclesPerByteRead: 2,
      iwramDataAccessPremiumCycles: 0,
      trackAndToneDataClass: "EWRAM",
      channelAndStackDataClass: "IWRAM",
      branchRoute: "bpl taken for key+keyM >= 0; CGB beq not taken for toneType 12",
    },
    sourceCycleAccounting: {
      observedRoute: {
        sequentialThumbHalfwords: 14,
        pipelineRefills: 1,
        iwramByteReads: 1,
        iwramWordReads: 1,
        iwramByteStores: 1,
        ewramByteReads: 3,
        ewramDataAccessPremiumCycles: 6,
        cycles: "14*2 + 1*6 + 3*2",
        totalCycles: 40,
      },
      firstUnresolvedBranch: "0x082dfeea bne _081DDCBA on ToneData.pan_sweep",
    },
  };
}

type Packet = { schema: string; case: CaseName; oracleProfile: string; sourceFunction: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: any[] };

function stripPostState(packet: Packet): Packet {
  return {
    ...packet,
    schema: "factory-m4a-note-body-cgb4-probe/v7",
    captureBoundary: "sixth-MPlayMain-ply_note-CGB4-ChnVolSetAsm-entry-scalars",
    observations: packet.observations.map((observation) => ({
      ...observation,
      noteCallbacks: observation.noteCallbacks?.map((callback: any) => {
        const { cgb4PostChnVolSetState: _post, ...base } = callback;
        return base;
      }) ?? null,
    })),
  };
}

function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v8" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "sixth-MPlayMain-ply_note-CGB4-post-ChnVolSetAsm-keyM-at-bpl" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  const v7 = checkedJson<Packet>(join(V7_PACKETS, `${name}.json`), V7_PACKET_HASHES[name]);
  if (JSON.stringify(stripPostState(packet)) !== JSON.stringify(v7)) fail(`${name} packet no longer adds cleanly to frozen v7`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const frozenV7 = checkedJson<any>(V7_EVIDENCE, V7_EVIDENCE_SHA256);
  if (JSON.stringify(makeV7Evidence()) !== JSON.stringify(frozenV7)) fail("accepted v7 evidence does not regenerate byte-for-byte");
  if (frozenV7.coverage?.contiguousPrefixThroughChnVolSetAsmReturnSourceCycles !== 2935) fail("accepted v7 boundary changed");

  const callbacks = CASES.flatMap((name) => loadPacket(name).observations.flatMap((observation: any) =>
    (observation.noteCallbacks ?? []).filter((callback: any) => callback.toneType === 12)
      .map((callback: any) => ({ ...callback, sourceStateDigest: observation.sourceStateDigest }))));
  if (callbacks.length !== 7) fail("CGB4 callback count changed");
  const byDigest = new Map(callbacks.map((callback: any) => [callback.sourceStateDigest, callback]));
  if (byDigest.size !== 7) fail("CGB4 source-state join became ambiguous");

  const v7Rows = new Map((frozenV7.rows as any[]).map((row) => [row.sourceStateDigest, row]));
  const rows = [...byDigest.entries()].map(([sourceStateDigest, callback]: [string, any]) => {
    const prior = v7Rows.get(sourceStateDigest);
    if (!prior || !isRecord(callback.cgb4PostChnVolSetState)) fail("v8 packet missed a frozen v7 row or keyM state");
    const postState: Cgb4PostChnVolSetState = {
      ...CGB4_POST_CHN_VOL_SET_STATE,
      keyAfter: callback.keyAfter,
      keyM: callback.cgb4PostChnVolSetState.keyM,
    };
    const timing = reduceMPlayCgb4PostChnVolSetTiming(postState);
    if (!timing) fail("observed post-ChnVolSetAsm route became unresolved");
    return {
      sourceStateDigest,
      case: prior.case,
      trackIndex: prior.trackIndex,
      acceptedContiguousPrefixThroughChnVolSetAsmReturnSourceCycles: prior.contiguousPrefixThroughChnVolSetAsmReturnSourceCycles,
      keyAfter: timing.channelKey,
      keyM: timing.keyM,
      keyPlusKeyM: timing.keyPlusKeyM,
      postChnVolSetAsmRoute: timing.route,
      postChnVolSetAsmSourceCycles: timing.cycles,
      contiguousPrefixThroughPanSweepBranchSourceCycles: prior.contiguousPrefixThroughChnVolSetAsmReturnSourceCycles + timing.cycles,
      firstUnresolvedBranch: "0x082dfeea:bne-pan-sweep",
      laterAllocationFieldsSourceCycles: null,
      completeNoteCallbackSourceCycles: null,
      postCallbackGlueSourceCycles: null,
    };
  });
  if (rows.length !== 7) fail("v8 packet contains an unjoined CGB4 row");

  const byCase = Object.fromEntries(CASES.map((name) => [name, {
    callbacks: rows.filter((row: any) => row.case === name).length,
    exactPostChnVolSetAsmSlices: rows.filter((row: any) => row.case === name).length,
  }])) as Record<CaseName, any>;
  for (const name of CASES) if (byCase[name].callbacks !== CGB4_COUNTS[name]) fail(`${name} CGB4 coverage changed`);
  const sliceCycles = rows.reduce((sum: number, row: any) => sum + row.postChnVolSetAsmSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughPanSweepBranchSourceCycles, 0);
  if (sliceCycles !== 280 || contiguous !== 3215) fail("v8 timing totals changed");

  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v8",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: { acceptedV7EvidenceSha256: V7_EVIDENCE_SHA256, packetSha256: PACKET_HASHES, packetRepeatSha256: PACKET_HASHES },
    capture: {
      boundary: "pipelined 0x082dfed6 at bpl 0x082dfed4 after ChnVolSetAsm return",
      scalars: ["signed keyM only"],
      excluded: ["pointer", "frame", "duration", "callback identity", "channel key (reused frozen v7 keyAfter)", "ToneData.pan_sweep", "result bytes"],
    },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      exactPostChnVolSetAsmCallbacks: 7,
      postChnVolSetAsmSourceCycleRange: { min: 40, max: 40, distinct: 1 },
      postChnVolSetAsmSourceCycles: sliceCycles,
      acceptedContiguousPrefixThroughChnVolSetAsmReturnSourceCycles: 2935,
      contiguousPrefixThroughPanSweepBranchSourceCycles: contiguous,
      observedKeyMValues: { "0": 7 },
      keyPlusKeyMBranchCounts: { bplTaken: 7, movsZeroExecuted: 0 },
      cgbBranchCounts: { beqTaken: 0, beqNotTaken: 7 },
      firstUnresolvedBranch: "0x082dfeea bne _081DDCBA on ToneData.pan_sweep",
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    branchCoverage: {
      observed: { keyMReads: 7, keyPlusKeyMNonnegative: 7, bplTaken: 7, cgbToneBitsNonzero: 7, cgbBeqNotTaken: 7 },
      firstUnresolved: "ToneData.pan_sweep at 0x082dfeea",
      unobservedKeyMRoutes: null,
      panSweepRoutes: null,
    },
    rows,
    closure: {
      closed: "The post-ChnVolSetAsm caller route from 0x082dfecc through the CGB length store and pan_sweep read/tst boundary for the same seven observed callbacks.",
      contiguousPrefix: "3215 aggregate source cycles through the first unresolved pan_sweep branch boundary across seven callbacks (2935 accepted through helper return + 280 new).",
      remainingDiscriminator: "The 0x082dfeea pan_sweep branch and all later allocation fields, keyM routes not observed here, clear_modM, nonzero-lfoDelay routes, unobserved helper operands/clamps, other 75 callbacks, complete note/glue/MPlay, service/arbitration, and construction clock remain null.",
      durationFit: false,
      runtimePointerIdentity: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "All 7/82 observed zero-lfoDelay CGB4 callbacks have signed keyM=0; the key+keyM bpl is taken and the toneType=12 CGB beq is not taken. The 40-cycle source-exact post-helper slice adds 280 cycles, extending the contiguous aggregate from 2935 to 3215 before the unresolved pan_sweep branch.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, any>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 post-helper caller v8", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v8.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. The v8 packet preserves the byte-identical v7 packet and captures only signed `keyM` at the exact pipelined boundary `0x082dfed6` for the caller's `bpl` at `0x082dfed4`; the callsite is gated by the live ChnVolSetAsm return LR and no pointer or identity is serialized.", "",
    `The same **${coverage.cgbChannel4Callbacks}/82** callbacks are covered: **0 anchor / 3 LILIANA / 4 legal-varied**. All seven have \`keyM=0\`, frozen v7 channel keys 64/91, and therefore take \`bpl _081DDCA0\`; their frozen \`toneType=12\` also makes the CGB \`beq _081DDCCE\` not taken.`, "",
    "The source-exact route from caller resume `0x082dfecc` executes **14** Thumb halfwords, one taken refill, one IWRAM byte read, one IWRAM word read, one IWRAM byte store, and three EWRAM byte reads. The pinned ARM7TDMI classes give **14×2 + 1×6 + 3×2 = 40 cycles** per callback. The first unresolved branch is `0x082dfeea bne _081DDCBA`, whose `ToneData.pan_sweep` scalar remains intentionally uncaptured.", "",
    `The slice adds **${coverage.postChnVolSetAsmSourceCycles} cycles** across seven callbacks, extending the accepted **2935-cycle** helper-return prefix to **${coverage.contiguousPrefixThroughPanSweepBranchSourceCycles} aggregate cycles** through the pan_sweep read/tst boundary.`, "",
    "| case | callbacks | exact caller slices | cycles |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => `| ${name} | ${byCase[name].callbacks} | ${byCase[name].exactPostChnVolSetAsmSlices} | ${byCase[name].exactPostChnVolSetAsmSlices * 40} |`), "",
    "Later fields, the pan_sweep route, unobserved keyM/helper/clamp routes, clear_modM, nonzero-LFO routes, other 75 callbacks, complete note/glue/MPlay (**5 exact / 108 null**), service/arbitration, and `runFactoryConstructionClock` remain null. No duration fit, runtime identity lookup, production recording import, unsupported barrier, or canonical Battle-2 branch is present.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v8.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v8.md") };
  fail("usage: factory-m4a-note-body-cgb4-v8.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
