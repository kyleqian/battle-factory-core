import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV11Evidence } from "./factory-m4a-note-body-cgb4-v11.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V11_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v11.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v12.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v12.md");
const ROM_BASE = 0x0800_0000;
const V11_EVIDENCE_SHA256 = "1ad73dc86d0f8b887b1050090f9384bb231858eea39c309209cd73f4686d8f6e";
const V11_DOC_SHA256 = "57eeed8e00d5efb5997e2d211d9b7df1d4634c3dd3fbea8952fa6b4a372998f8";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const NOTE_CALLSITE_START = 0x082d_fb32;
const NOTE_CALLSITE_END = 0x082d_fb44;
const NOTE_CALLSITE_SHA256 = "225db9954708ed26ff054bf9573f3750a6ae9076eb3a65865ccb2eca9ab19238";
const CALL_R3_START = 0x082d_fcb4;
const CALL_R3_END = 0x082d_fcb6;
const CALL_R3_SHA256 = "477db9ac7ca5efc12e37f882656b8fe5a363ffeb99b2e565a953d10c3c91ab21";
const RETURN_BRANCH_START = 0x082d_fb42;
const RETURN_BRANCH_END = 0x082d_fb44;
const RETURN_BRANCH_SHA256 = "97c0d0bc789f834ac316da12278bd3e49cf92be17147c2cc0968be04eaccf31b";
const WAIT_ZERO_START = 0x082d_fb70;
const WAIT_ZERO_END = 0x082d_fb76;
const WAIT_ZERO_SHA256 = "ca345c16f6c4253a81e51a65a6626fa3f090b4ac7bf08e035c1a6266d053a214";
const COMMAND_POINTER_LOAD_START = 0x082d_fb18;
const COMMAND_POINTER_LOAD_END = 0x082d_fb1a;
const COMMAND_POINTER_LOAD_SHA256 = "5a5faa3732cc1f76e9c6955aad91496527f767c6385005e62846cd1375f2fe9e";
const THUMB_FETCH_CYCLES = 2;
const TAKEN_REFILL_CYCLES = 6;
const IWRAM_ACCESS_PREMIUM_CYCLES = 0;

export type Cgb4PostPlyNoteDispatcherState = Readonly<{
  route: "ply-note-return-to-next-command-pointer";
  callback: "ply_note";
  caller: "MPlayMain";
  callSite: "dedicated-note-call";
  trackStorage: "iwram";
  waitAtCallbackEntry: 0;
}>;

export type Cgb4PostPlyNoteDispatcherTiming = Readonly<{
  route: "ply-note-return-to-next-command-pointer";
  callback: "ply_note";
  caller: "MPlayMain";
  callSite: "dedicated-note-call";
  callbackReturnTarget: "0x082dfb42";
  callbackReturnTargetOwnership: "MPlayMain dedicated note BL via call_r3";
  trackStorage: "iwram";
  waitAtCallbackEntry: 0;
  returnTargetBranchSequentialThumbHalfwords: 1;
  returnTargetBranchTakenControlTransferRefills: 1;
  returnTargetBranchSourceCycles: 8;
  waitLoopSequentialThumbHalfwords: 3;
  waitIwramByteReads: 1;
  waitZeroTakenControlTransferRefills: 1;
  waitLoopSourceCycles: 12;
  commandPointerLoadSequentialThumbHalfwords: 1;
  commandPointerIwramWordReads: 1;
  commandPointerLoadSourceCycles: 2;
  postCallbackGlueThroughCommandPointerLoadSourceCycles: 22;
  nextUnresolvedInstruction: "ldrb r1, [r2]";
  nextMissingScalar: "current command byte";
  nextMissingMemoryClass: "MusicPlayerTrack.cmdPtr target storage";
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v12: ${message}`);
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

export function reduceCgb4PostPlyNoteDispatcherTiming(state: unknown): Cgb4PostPlyNoteDispatcherTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (Object.keys(state).sort().join(",") !== "callSite,callback,caller,route,trackStorage,waitAtCallbackEntry"
    || state.route !== "ply-note-return-to-next-command-pointer"
    || state.callback !== "ply_note"
    || state.caller !== "MPlayMain"
    || state.callSite !== "dedicated-note-call"
    || state.trackStorage !== "iwram"
    || state.waitAtCallbackEntry !== 0) return null;

  const returnTargetBranchSourceCycles: 8 = (THUMB_FETCH_CYCLES + TAKEN_REFILL_CYCLES) as 8;
  const waitLoopSourceCycles: 12 = (3 * THUMB_FETCH_CYCLES + TAKEN_REFILL_CYCLES + IWRAM_ACCESS_PREMIUM_CYCLES) as 12;
  const commandPointerLoadSourceCycles: 2 = (THUMB_FETCH_CYCLES + IWRAM_ACCESS_PREMIUM_CYCLES) as 2;
  const postCallbackGlueThroughCommandPointerLoadSourceCycles: 22 = (returnTargetBranchSourceCycles + waitLoopSourceCycles + commandPointerLoadSourceCycles) as 22;
  return Object.freeze({
    route: "ply-note-return-to-next-command-pointer",
    callback: "ply_note",
    caller: "MPlayMain",
    callSite: "dedicated-note-call",
    callbackReturnTarget: "0x082dfb42",
    callbackReturnTargetOwnership: "MPlayMain dedicated note BL via call_r3",
    trackStorage: "iwram",
    waitAtCallbackEntry: 0,
    returnTargetBranchSequentialThumbHalfwords: 1,
    returnTargetBranchTakenControlTransferRefills: 1,
    returnTargetBranchSourceCycles,
    waitLoopSequentialThumbHalfwords: 3,
    waitIwramByteReads: 1,
    waitZeroTakenControlTransferRefills: 1,
    waitLoopSourceCycles,
    commandPointerLoadSequentialThumbHalfwords: 1,
    commandPointerIwramWordReads: 1,
    commandPointerLoadSourceCycles,
    postCallbackGlueThroughCommandPointerLoadSourceCycles,
    nextUnresolvedInstruction: "ldrb r1, [r2]",
    nextMissingScalar: "current command byte",
    nextMissingMemoryClass: "MusicPlayerTrack.cmdPtr target storage",
  });
}

function assertSourceElfAndRom(frozenV11: any): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const m4aC = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elfBytes = readFileSync(elfPath);
  if (sha256(assembly) !== M4A1_SHA256) fail("m4a_1.s source bytes changed");
  if (sha256(m4aC) !== M4A_C_SHA256) fail("m4a.c source bytes changed");
  if (sha256(elfBytes) !== ELF_SHA256) fail("pokeemerald.elf bytes changed");

  const noteDispatch = [
    "mov r0, r8",
    "ldr r3, [r0, o_SoundInfo_plynote]",
    "adds r0, r1, 0",
    "subs r0, 0xCF",
    "adds r1, r7, 0",
    "adds r2, r5, 0",
    "bl call_r3",
    "b _081DD938",
  ];
  const waitLoop = [
    "_081DD938:",
    "ldrb r0, [r5, o_MusicPlayerTrack_wait]",
    "cmp r0, 0",
    "beq _081DD8E0",
  ];
  const commandLoop = [
    "_081DD8E0:",
    "ldr r2, [r5, o_MusicPlayerTrack_cmdPtr]",
    "ldrb r1, [r2]",
  ];
  for (const anchor of [...noteDispatch, ...waitLoop, ...commandLoop, "call_r3:", "bx r3"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  if ((assembly.match(/ldr r3, \[r0, o_SoundInfo_plynote\]/g) ?? []).length !== 1) fail("dedicated note-dispatch callsite census changed");
  if (!m4aC.includes("soundInfo->plynote = ply_note;")) fail("MPlayExtender lost ply_note registration");
  const plyNoteBody = assembly.slice(assembly.indexOf("thumb_func_start ply_note"), assembly.indexOf("thumb_func_end ply_note"));
  if (plyNoteBody.includes("o_MusicPlayerTrack_wait")) fail("ply_note gained a wait-field access");
  if (frozenV11.sourceAndElf?.memoryClassClosure?.trackStorage !== "iwram") fail("frozen v11 track-storage proof changed");

  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of [
    "082dfa5c 00000268 T MPlayMain",
    "082dfb18 t _081DD8E0",
    "082dfb70 t _081DD938",
    "082dfcb4 t call_r3",
    "082dfd38 00000204 T ply_note",
  ]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);

  const regions = [
    { role: "dedicated note dispatch through caller return target", start: NOTE_CALLSITE_START, end: NOTE_CALLSITE_END, bytes: 18, hash: NOTE_CALLSITE_SHA256 },
    { role: "call_r3 indirect trampoline", start: CALL_R3_START, end: CALL_R3_END, bytes: 2, hash: CALL_R3_SHA256 },
    { role: "post-ply_note return branch", start: RETURN_BRANCH_START, end: RETURN_BRANCH_END, bytes: 2, hash: RETURN_BRANCH_SHA256 },
    { role: "wait-zero command-loop branch", start: WAIT_ZERO_START, end: WAIT_ZERO_END, bytes: 6, hash: WAIT_ZERO_SHA256 },
    { role: "next command-pointer load", start: COMMAND_POINTER_LOAD_START, end: COMMAND_POINTER_LOAD_END, bytes: 2, hash: COMMAND_POINTER_LOAD_SHA256 },
  ];
  for (const region of regions) {
    const bytes = romSlice(region.start, region.end);
    if (bytes.length !== region.bytes || sha256(bytes) !== region.hash) fail(`${region.role} ROM bytes changed`);
  }

  return {
    source: {
      dispatcher: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1232-1282,1459-1460", sha256: sha256(assembly) },
      registration: { path: "reference/pokeemerald/src/m4a.c", line: 385, sha256: sha256(m4aC) },
    },
    elf: {
      mPlayMain: "0x082dfa5c+0x268",
      dedicatedNoteBl: "0x082dfb3e",
      callbackReturnTarget: "0x082dfb42",
      commandLoop: "0x082dfb18",
      waitLoop: "0x082dfb70",
      callR3: "0x082dfcb4",
      plyNote: "0x082dfd38+0x204",
      sha256: sha256(elfBytes),
    },
    compiledRegions: regions.map((region) => ({
      role: region.role,
      start: `0x${region.start.toString(16)}`,
      endExclusive: `0x${region.end.toString(16)}`,
      bytes: region.bytes,
      sha256: region.hash,
    })),
    returnOwnership: {
      registeredCallback: "MPlayExtender assigns SoundInfo.plynote = ply_note",
      uniqueCompiledLoad: "MPlayMain has one o_SoundInfo_plynote load",
      bl: "BL at 0x082dfb3e writes Thumb LR 0x082dfb43",
      trampoline: "call_r3 bx r3 preserves LR while transferring to ply_note",
      callbackReturn: "ply_note restores 0x082dfb43 and bx aligns execution to 0x082dfb42",
      targetInstruction: "b _081DD938",
      runtimeReturnAddressLookup: false,
    },
    waitZeroProof: "MPlayMain can reach the dedicated note call only from _081DD8E0 after _081DD938 observed wait == 0; ply_note has no wait-field access",
    memoryClassClosure: {
      trackStorage: "iwram",
      inheritedFromFrozenV11: true,
      waitRead: "MusicPlayerTrack.wait/IWRAM",
      commandPointerRead: "MusicPlayerTrack.cmdPtr/IWRAM",
      commandByteTargetStorage: null,
    },
    timingClasses: {
      sequentialThumbFetchCycles: THUMB_FETCH_CYCLES,
      takenControlTransferRefillCycles: TAKEN_REFILL_CYCLES,
      iwramSingleByteOrWordAccessPremiumCycles: IWRAM_ACCESS_PREMIUM_CYCLES,
      model: "one 2-cycle sequential Thumb halfword per executed instruction; each taken b/beq adds one 6-cycle refill; IWRAM byte/word data accesses add zero premium",
    },
  };
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV11Bytes = checkedBytes(V11_EVIDENCE, V11_EVIDENCE_SHA256);
  checkedBytes(join(ROOT, "docs/issue55-m4a-note-body-cgb4-v11.md"), V11_DOC_SHA256);
  const frozenV11 = JSON.parse(frozenV11Bytes.toString("utf8")) as any;
  const regeneratedV11Bytes = Buffer.from(`${JSON.stringify(makeV11Evidence(), null, 2)}\n`);
  if (!regeneratedV11Bytes.equals(frozenV11Bytes)) fail("accepted v11 evidence does not regenerate byte-for-byte");
  if (frozenV11.schema !== "factory-m4a-note-body-cgb4-evidence/v11" || frozenV11.oracleProfile !== "battle-scene-off" || !frozenV11.addressFree) fail("frozen v11 identity changed");
  if (!Array.isArray(frozenV11.rows) || frozenV11.rows.length !== 7) fail("frozen v11 CGB4 row count changed");
  const sourceAndElf = assertSourceElfAndRom(frozenV11);

  const priorByDigest = new Map<string, any>();
  for (const prior of frozenV11.rows) {
    if (!isRecord(prior) || typeof prior.sourceStateDigest !== "string" || priorByDigest.has(prior.sourceStateDigest)) fail("v11 sourceStateDigest join became ambiguous");
    if (typeof prior.completeNoteCallbackSourceCycles !== "number" || prior.postCallbackGlueSourceCycles !== null) fail("v11 callback boundary changed");
    priorByDigest.set(prior.sourceStateDigest, prior);
  }
  const timing = reduceCgb4PostPlyNoteDispatcherTiming({
    route: "ply-note-return-to-next-command-pointer",
    callback: "ply_note",
    caller: "MPlayMain",
    callSite: "dedicated-note-call",
    trackStorage: "iwram",
    waitAtCallbackEntry: 0,
  });
  if (!timing) fail("fixed post-ply_note dispatcher route became unresolved");

  const rows = [...priorByDigest.values()].map((prior) => ({
    sourceStateDigest: prior.sourceStateDigest,
    case: prior.case,
    trackIndex: prior.trackIndex,
    completeNoteCallbackSourceCycles: prior.completeNoteCallbackSourceCycles,
    callbackReturnTarget: timing.callbackReturnTarget,
    callbackReturnTargetOwnership: timing.callbackReturnTargetOwnership,
    waitAtCallbackEntry: timing.waitAtCallbackEntry,
    postCallbackGlueSourceCycles: timing.postCallbackGlueThroughCommandPointerLoadSourceCycles,
    contiguousPrefixThroughNextCommandPointerLoadSourceCycles: prior.completeNoteCallbackSourceCycles + timing.postCallbackGlueThroughCommandPointerLoadSourceCycles,
    nextCommandByte: null,
    nextCommandByteStorage: null,
    completeMPlaySourceCycles: null,
  }));
  const byCase = Object.fromEntries(["anchor", "liliana", "factory-varied"].map((caseName) => {
    const callbacks = rows.filter((row) => row.case === caseName).length;
    return [caseName, { callbacks, postCallbackGlueCycles: callbacks * timing.postCallbackGlueThroughCommandPointerLoadSourceCycles }];
  }));
  if (JSON.stringify(Object.fromEntries(Object.entries(byCase).map(([name, value]: [string, any]) => [name, value.callbacks]))) !== JSON.stringify({ anchor: 0, liliana: 3, "factory-varied": 4 })) fail("frozen v11 CGB4 case census changed");
  const completeNoteCycles = rows.reduce((sum, row) => sum + row.completeNoteCallbackSourceCycles, 0);
  const postCallbackGlueCycles = rows.reduce((sum, row) => sum + row.postCallbackGlueSourceCycles, 0);
  const throughCommandPointer = rows.reduce((sum, row) => sum + row.contiguousPrefixThroughNextCommandPointerLoadSourceCycles, 0);
  if (completeNoteCycles !== 4435 || postCallbackGlueCycles !== 154 || throughCommandPointer !== 4589) fail("v12 timing totals changed");

  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v12",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: {
      acceptedV11EvidenceSha256: V11_EVIDENCE_SHA256,
      acceptedV11DocSha256: V11_DOC_SHA256,
      v11RegeneratesByteForByte: true,
      onlyInputReceipt: "factory-m4a-note-body-cgb4-evidence/v11",
    },
    capture: {
      boundary: "frozen v11 final ply_note bx r0 return through MPlayMain's next command-pointer load",
      scalars: ["none beyond source-proven waitAtCallbackEntry=0 and frozen v11 trackStorage=iwram"],
      excluded: ["oracle recapture", "runtime pointer", "runtime address", "frame", "duration", "command byte", "command-byte target storage", "later command dispatch"],
    },
    join: { key: "sourceStateDigest", rows: rows.length, cgb4Rows: rows.length, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: rows.length,
      byCase,
      exactCompleteNoteCallbacks: rows.length,
      exactCompleteNoteCallbackSourceCycles: completeNoteCycles,
      postCallbackGlueSourceCyclesPerCallback: timing.postCallbackGlueThroughCommandPointerLoadSourceCycles,
      exactPostCallbackGlueCallbacks: rows.length,
      postCallbackGlueSourceCycles: postCallbackGlueCycles,
      contiguousPrefixThroughNextCommandPointerLoadSourceCycles: throughCommandPointer,
      returnTargetBranches: rows.length,
      waitIwramByteReads: rows.length * timing.waitIwramByteReads,
      waitZeroBranches: rows.length,
      commandPointerIwramWordReads: rows.length * timing.commandPointerIwramWordReads,
      sequentialThumbHalfwords: rows.length * (timing.returnTargetBranchSequentialThumbHalfwords + timing.waitLoopSequentialThumbHalfwords + timing.commandPointerLoadSequentialThumbHalfwords),
      takenControlTransferRefills: rows.length * (timing.returnTargetBranchTakenControlTransferRefills + timing.waitZeroTakenControlTransferRefills),
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 75,
      nullPostCallbackGlueCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The same seven sourceStateDigest-joined CGB4 callbacks return to MPlayMain's dedicated note continuation, branch through wait==0, and load the next command pointer from IWRAM.",
      contiguousPrefix: "4589 aggregate source cycles through the next command-pointer load across seven callbacks (4435 unchanged complete ply_note cycles + 154 v12 post-callback glue).",
      remainingDiscriminator: "The next ldrb needs the current command byte and MusicPlayerTrack.cmdPtr target storage class, neither retained by frozen v11 nor source-general statically; stop before it.",
      nextMissingScalar: timing.nextMissingScalar,
      nextMissingMemoryClass: timing.nextMissingMemoryClass,
      durationFit: false,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Frozen v11 regenerates byte-for-byte and joins only by sourceStateDigest. Source/ELF/ROM ownership proves a fixed 22-cycle post-ply_note continuation for the same seven callbacks, ending before the unproved next command-byte dereference.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<string, { callbacks: number; postCallbackGlueCycles: number }>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 dispatcher continuation v12", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v12.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. v12 reads only frozen v11, verifies its evidence regenerates byte-for-byte, preserves all seven rows and complete `ply_note` costs, and joins solely by `sourceStateDigest`. It captures no oracle data and uses no runtime pointer/address identity.", "",
    "The return owner is now proved rather than assumed. `MPlayExtender` installs `ply_note` in `SoundInfo.plynote`; MPlayMain's unique dedicated note load reaches `bl call_r3` at `0x082dfb3e`. That BL writes Thumb LR `0x082dfb43`; `call_r3` transfers with `bx r3` without changing LR; and `ply_note` restores that value before its frozen-v11 final `bx`. Execution therefore resumes at aligned `0x082dfb42`, the caller-owned `b _081DD938`—not at the generic jump-table callback tail.", "",
    "The post-return path is fixed through the next command-pointer load. The return-target branch is **8 cycles** (one sequential Thumb halfword plus one taken refill). At `_081DD938`, the IWRAM `wait` read, compare, and taken `beq _081DD8E0` are **12 cycles**. `wait` is source-proven zero: the command loop was entered only from that same zero test, and `ply_note` contains no wait-field access. At `_081DD8E0`, the IWRAM `MusicPlayerTrack.cmdPtr` word load is **2 cycles**. Total: **22 cycles per callback**. Exact source hashes, ELF symbols, and five separately hashed ROM regions guard ownership and every counted instruction/data class.", "",
    "The next instruction is `ldrb r1, [r2]`. Frozen v11 does not retain either its current command byte or the storage class targeted by `MusicPlayerTrack.cmdPtr`, and neither is source-general statically. v12 stops before that dereference instead of borrowing older evidence or fitting a route.", "",
    `Across the same **${coverage.cgbChannel4Callbacks}/82** callbacks, v12 adds **${coverage.postCallbackGlueSourceCycles} cycles** to the unchanged **${coverage.exactCompleteNoteCallbackSourceCycles} aggregate complete-ply_note cycles**, yielding **${coverage.contiguousPrefixThroughNextCommandPointerLoadSourceCycles} aggregate cycles** through the command-pointer load.`, "",
    "| case | callbacks | post-callback glue cycles |", "| --- | ---: | ---: |",
    ...["anchor", "liliana", "factory-varied"].map((name) => `| ${name} | ${byCase[name].callbacks} | ${byCase[name].postCallbackGlueCycles} |`), "",
    "The other 75 note callbacks, their post-callback routes, the next command byte/storage class, unobserved helper/key/nonzero-LFO routes, all complete-MPlay totals, service/arbitration, and `runFactoryConstructionClock` remain null. No duration fit, production recording import, runtime address lookup, unsupported barrier, animation/Rust work, or canonical Battle-2 branch is present.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v12.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v12.md") };
  fail("usage: factory-m4a-note-body-cgb4-v12.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
