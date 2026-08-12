import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV19Evidence } from "./factory-m4a-note-body-cgb4-v19.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const V19_EVIDENCE_SHA256 = "b52e6f3b894c3f63c84b49c04ad6a74317370eba13c8421569cc1375850b9ce6";
const V19_DOC_SHA256 = "4bdc08c66f5d8a6296a8e3649944ec64d661a6660126504a0ad0589fa4ce6ccf";
const V19_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "1862007858854d9b2a82220d097b3d16922fe74c426b98a13fcce7fc1297341b",
  liliana: "1d31dfc0a133556999f05fa5cdda7dac6f4be15cd8d03067a0d7f9c08a83ac0e",
  "factory-varied": "7c9978e54f814caee00d196d432c3c479981dfe9a6f5a706b583e4e8609e073d",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_INTERNAL_SHA256 = "40936cbac9a2ad96da8aebd52e5c9d8e3bbee624e6dcb51e0436f29ef65edd74";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const V17_PAIR_SHA256 = "99b5bf87e6e7757d3cb855bd05d4a5abefd2f083567c8083d3050fe3606a7adf";
const V18_CONTINUATION_SHA256 = "86e616250404bcccacf8a51a7a2bbac36d5eb6a5dbb12cfdd075dba82993efd2";
const V19_CLEAR_DECISION_SHA256 = "8b3d8e5e87469159a1db98d7c5a67f9092b318082356dc422b6655faa673796a";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V19_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v19.json");
const V19_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v19.md");
const V19_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v19");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v20.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v20.md");
const ROM_BASE = 0x0800_0000;
const V17_PAIR_START = 0x082d_fbd0;
const V17_PAIR_END = 0x082d_fbd4;
const V18_CONTINUATION_START = 0x082d_fbd4;
const V18_CONTINUATION_END = 0x082d_fbdc;
const V19_CLEAR_DECISION_START = 0x082d_fab4;
const V19_CLEAR_DECISION_END = 0x082d_fabe;
const V17_PAIR_BYTES = Buffer.from([0x01, 0x3e, 0x03, 0xdd]);
const V18_CONTINUATION_BYTES = Buffer.from([0x50, 0x20, 0x2d, 0x18, 0x5b, 0x00, 0x6b, 0xe7]);
const V19_CLEAR_DECISION_BYTES = Buffer.from([0x28, 0x78, 0x80, 0x21, 0x01, 0x42, 0x00, 0xd1, 0x88, 0xe0]);
const MPT_FLG_EXIST = 0x80;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v20: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}
function checkedBytes(path: string, hash: string): Buffer {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(`${path} changed`);
  return bytes;
}
function checkedJson<T>(path: string, hash: string): T { return JSON.parse(checkedBytes(path, hash).toString("utf8")) as T; }
function requireU8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 0xff) fail(`${label} must be u8`);
  return value as number;
}
function requireDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} must be a SHA-256 digest`);
  return value;
}

export type Cgb4FinalClearExitTiming = Readonly<{
  route: "exist-clear-final-track-ble-taken";
  r6BeforeSecondDecrement: 1;
  postSecondDecrementR6: 0;
  sequentialThumbHalfwords: 2;
  takenControlTransferRefills: 1;
  sourceCycles: 10;
  stopsBeforeExitInstruction: "ldr r0, [r7, o_MusicPlayerInfo_clock]";
}>;

type FrozenClearRouteState = Readonly<{
  r6BeforeDecrement: unknown;
  postDecrementR6: unknown;
  trackLoopRoute: unknown;
  postV16RouteSourceCycles: unknown;
  nextTrackLoopSuccessorInstruction: unknown;
  postV17ContinuationSourceCycles: unknown;
  nextTrackLoopBodyInstruction: unknown;
  nextTrackFlags: unknown;
  nextTrackExistBranchRoute: unknown;
  postV18NextTrackExistDecisionSourceCycles: unknown;
  stopsBeforeNextTrackSelectedSuccessor: unknown;
}>;

/** Price only the second clear-route `subs r6, 0x1; ble _081DD9A4` pair. */
export function reduceCgb4FinalClearExitTiming(state: unknown): Cgb4FinalClearExitTiming | null {
  const expectedKeys = [
    "r6BeforeDecrement", "postDecrementR6", "trackLoopRoute", "postV16RouteSourceCycles",
    "nextTrackLoopSuccessorInstruction", "postV17ContinuationSourceCycles", "nextTrackLoopBodyInstruction",
    "nextTrackFlags", "nextTrackExistBranchRoute", "postV18NextTrackExistDecisionSourceCycles",
    "stopsBeforeNextTrackSelectedSuccessor",
  ] as const;
  if (!isRecord(state) || !exactKeys(state, expectedKeys)) return null;
  const r6BeforeDecrement = requireU8(state.r6BeforeDecrement, "r6BeforeDecrement");
  const postDecrementR6 = requireU8(state.postDecrementR6, "postDecrementR6");
  const nextTrackFlags = requireU8(state.nextTrackFlags, "nextTrackFlags");
  if (
    r6BeforeDecrement !== 2 || postDecrementR6 !== 1 ||
    state.trackLoopRoute !== "continue-to-next-track" || state.postV16RouteSourceCycles !== 4 ||
    state.nextTrackLoopSuccessorInstruction !== "movs r0, MusicPlayerTrack_size" ||
    state.postV17ContinuationSourceCycles !== 14 ||
    state.nextTrackLoopBodyInstruction !== "ldrb r0, [r5, o_MusicPlayerTrack_flags]" ||
    nextTrackFlags !== 0 || state.nextTrackExistBranchRoute !== "exist-clear-bne-not-taken-then-unconditional" ||
    state.postV18NextTrackExistDecisionSourceCycles !== 16 ||
    state.stopsBeforeNextTrackSelectedSuccessor !== "_081DD998"
  ) return null;
  return Object.freeze({
    route: "exist-clear-final-track-ble-taken",
    r6BeforeSecondDecrement: 1,
    postSecondDecrementR6: 0,
    sequentialThumbHalfwords: 2,
    takenControlTransferRefills: 1,
    sourceCycles: 10,
    stopsBeforeExitInstruction: "ldr r0, [r7, o_MusicPlayerInfo_clock]",
  });
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const internal = readFileSync(join(ROOT, "reference/pokeemerald/include/gba/m4a_internal.h"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(internal) !== M4A_INTERNAL_SHA256 || sha256(elf) !== ELF_SHA256) fail("source/ELF changed");
  const v18ContinuationSource = "\tmovs r0, MusicPlayerTrack_size\n\tadds r5, r0\n\tlsls r3, 1\n\tb _081DD87C\n";
  const v19ClearDecisionSource = "_081DD87C:\n\tldrb r0, [r5, o_MusicPlayerTrack_flags]\n\tmovs r1, MPT_FLG_EXIST\n\ttst r1, r0\n\tbne _081DD886\n\tb _081DD998\n";
  const v20ExitPairSource = "_081DD998:\n\tsubs r6, 0x1\n\tble _081DD9A4\n\tmovs r0, MusicPlayerTrack_size\n";
  const exitBodyStartSource = "_081DD9A4:\n\tldr r0, [r7, o_MusicPlayerInfo_clock]\n";
  if (
    !assembly.includes(v18ContinuationSource) || !assembly.includes(v19ClearDecisionSource) ||
    !assembly.includes(v20ExitPairSource) || !assembly.includes(exitBodyStartSource) || !internal.includes("#define MPT_FLG_EXIST  0x80") ||
    /\br6\b/.test(v18ContinuationSource) || /\br6\b/.test(v19ClearDecisionSource)
  ) fail("source route or r6-preservation span changed");
  const v17Pair = rom.subarray(V17_PAIR_START - ROM_BASE, V17_PAIR_END - ROM_BASE);
  const v18Continuation = rom.subarray(V18_CONTINUATION_START - ROM_BASE, V18_CONTINUATION_END - ROM_BASE);
  const v19ClearDecision = rom.subarray(V19_CLEAR_DECISION_START - ROM_BASE, V19_CLEAR_DECISION_END - ROM_BASE);
  if (
    !v17Pair.equals(V17_PAIR_BYTES) || sha256(v17Pair) !== V17_PAIR_SHA256 ||
    !v18Continuation.equals(V18_CONTINUATION_BYTES) || sha256(v18Continuation) !== V18_CONTINUATION_SHA256 ||
    !v19ClearDecision.equals(V19_CLEAR_DECISION_BYTES) || sha256(v19ClearDecision) !== V19_CLEAR_DECISION_SHA256
  ) fail("compiled clear-route regions changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfab4 t _081DD87C", "082dfabe t _081DD886", "082dfbd0 t _081DD998", "082dfbdc t _081DD9A4"]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }
  return {
    source: {
      assembly: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1178-1185, 1334-1343", sha256: sha256(assembly) },
      constants: { path: "reference/pokeemerald/include/gba/m4a_internal.h", line: 270, mptFlgExist: MPT_FLG_EXIST, sha256: sha256(internal) },
      r6Preservation: {
        v18Continuation: { lines: "1337-1340", instructions: ["movs r0, MusicPlayerTrack_size", "adds r5, r0", "lsls r3, 1", "b _081DD87C"], modifiesR6: false },
        v19ClearDecision: { lines: "1178-1183", instructions: ["ldrb r0, [r5, o_MusicPlayerTrack_flags]", "movs r1, MPT_FLG_EXIST", "tst r1, r0", "bne _081DD886", "b _081DD998"], modifiesR6: false },
        exactRoutePreservesR6: true,
      },
    },
    elf: { loopHead: "0x082dfab4", existSetSuccessor: "0x082dfabe", existClearSuccessor: "0x082dfbd0", exit: "0x082dfbdc", sha256: sha256(elf) },
    compiledRegions: [
      { role: "subs r6, 0x1; ble _081DD9A4", start: "0x082dfbd0", endExclusive: "0x082dfbd4", bytes: v17Pair.length, sha256: V17_PAIR_SHA256 },
      { role: "movs r0, MusicPlayerTrack_size; adds r5, r0; lsls r3, 1; b _081DD87C", start: "0x082dfbd4", endExclusive: "0x082dfbdc", bytes: v18Continuation.length, sha256: V18_CONTINUATION_SHA256 },
      { role: "ldrb flags; movs MPT_FLG_EXIST; tst; bne _081DD886; b _081DD998", start: "0x082dfab4", endExclusive: "0x082dfabe", bytes: v19ClearDecision.length, sha256: V19_CLEAR_DECISION_SHA256 },
    ],
    timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6, iwramDataAccessPremiumCycles: 0 },
    timingCrossCheck: {
      v17: { route: "subs r6, 0x1; ble _081DD9A4 not taken", executedThumbHalfwords: 2, takenControlTransferRefills: 0, sourceCycles: 4 },
      v18: { route: "four-instruction continuation with b _081DD87C taken", executedThumbHalfwords: 4, takenControlTransferRefills: 1, sourceCycles: 14 },
      v19Clear: { route: "flags decision with bne not taken then b _081DD998 taken", executedThumbHalfwords: 5, takenControlTransferRefills: 1, sourceCycles: 16 },
      v20: { route: "subs r6, 0x1; ble _081DD9A4 taken", executedThumbHalfwords: 2, takenControlTransferRefills: 1, sourceCycles: 10 },
    },
  };
}

function assertFrozenV19Packets(): void {
  for (const name of CASES) checkedBytes(join(V19_PACKETS, `${name}.json`), V19_PACKET_HASHES[name]);
}

function frozenClearRouteState(row: any): FrozenClearRouteState {
  return {
    r6BeforeDecrement: row.r6BeforeDecrement,
    postDecrementR6: row.postDecrementR6,
    trackLoopRoute: row.trackLoopRoute,
    postV16RouteSourceCycles: row.postV16RouteSourceCycles,
    nextTrackLoopSuccessorInstruction: row.nextTrackLoopSuccessorInstruction,
    postV17ContinuationSourceCycles: row.postV17ContinuationSourceCycles,
    nextTrackLoopBodyInstruction: row.nextTrackLoopBodyInstruction,
    nextTrackFlags: row.nextTrackFlags,
    nextTrackExistBranchRoute: row.nextTrackExistBranchRoute,
    postV18NextTrackExistDecisionSourceCycles: row.postV18NextTrackExistDecisionSourceCycles,
    stopsBeforeNextTrackSelectedSuccessor: row.stopsBeforeNextTrackSelectedSuccessor,
  };
}

function isFrozenExistSetRow(row: any): boolean {
  return row.nextTrackFlags === MPT_FLG_EXIST && row.nextTrackExistBranchRoute === "exist-set-bne-taken" && row.stopsBeforeNextTrackSelectedSuccessor === "_081DD886";
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV19 = checkedJson<any>(V19_EVIDENCE, V19_EVIDENCE_SHA256);
  checkedBytes(V19_DOC, V19_DOC_SHA256);
  assertFrozenV19Packets();
  if (JSON.stringify(makeV19Evidence()) !== JSON.stringify(frozenV19)) fail("accepted v19 does not regenerate byte-for-byte");
  if (!Array.isArray(frozenV19.rows) || frozenV19.rows.length !== 7) fail("frozen v19 row count changed");
  if (frozenV19.coverage?.contiguousPrefixThroughNextTrackExistDecisionSourceCycles !== 5596) fail("frozen v19 aggregate changed");
  const digests = new Set<string>();
  const rows = frozenV19.rows.map((prior: any) => {
    const digest = requireDigest(prior?.sourceStateDigest, "frozen v19 sourceStateDigest");
    if (digests.has(digest) || !CASES.includes(prior.case)) fail("frozen v19 source-state join changed");
    digests.add(digest);
    const timing = reduceCgb4FinalClearExitTiming(frozenClearRouteState(prior));
    if (timing) {
      return {
        ...prior,
        r6PreservedThroughV18AndV19ClearRoute: true,
        r6BeforeSecondDecrement: timing.r6BeforeSecondDecrement,
        postSecondDecrementR6: timing.postSecondDecrementR6,
        finalClearTrackExitRoute: timing.route,
        postV19FinalClearTrackExitSourceCycles: timing.sourceCycles,
        contiguousPrefixThroughFinalClearTrackExitSourceCycles: prior.contiguousPrefixThroughNextTrackExistDecisionSourceCycles + timing.sourceCycles,
        stopsBeforeV20SelectedSuccessor: "_081DD9A4",
      };
    }
    if (!isFrozenExistSetRow(prior)) fail("frozen v19 row is neither the exact clear route nor the stopped EXIST-set route");
    return {
      ...prior,
      r6PreservedThroughV18AndV19ClearRoute: null,
      r6BeforeSecondDecrement: null,
      postSecondDecrementR6: null,
      finalClearTrackExitRoute: null,
      postV19FinalClearTrackExitSourceCycles: null,
      contiguousPrefixThroughFinalClearTrackExitSourceCycles: null,
      stopsBeforeV20SelectedSuccessor: "_081DD886",
    };
  });
  const clearRows = rows.filter((row: any) => row.finalClearTrackExitRoute !== null);
  const existSetRows = rows.filter((row: any) => row.finalClearTrackExitRoute === null);
  const added = clearRows.reduce((sum: number, row: any) => sum + row.postV19FinalClearTrackExitSourceCycles, 0);
  const contiguous = frozenV19.coverage.contiguousPrefixThroughNextTrackExistDecisionSourceCycles + added;
  if (clearRows.length !== 3 || existSetRows.length !== 4 || added !== 30 || contiguous !== 5626) fail("v20 clear-route timing totals changed");
  const byCase = Object.fromEntries(CASES.map((name) => {
    const caseRows = rows.filter((row: any) => row.case === name);
    return [name, {
      callbacks: caseRows.length,
      existSetRows: caseRows.filter((row: any) => row.finalClearTrackExitRoute === null).length,
      clearRows: caseRows.filter((row: any) => row.finalClearTrackExitRoute !== null).length,
      sourceCycles: caseRows.reduce((sum: number, row: any) => sum + (row.postV19FinalClearTrackExitSourceCycles ?? 0), 0),
    }];
  }));
  for (const name of CASES) if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name]) fail(`${name} census changed`);
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v20",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV19EvidenceSha256: V19_EVIDENCE_SHA256,
      acceptedV19DocSha256: V19_DOC_SHA256,
      acceptedV19PacketSha256: V19_PACKET_HASHES,
      v19RegeneratesByteForByte: true,
      v19EvidenceAndReportRetainedByteForByte: true,
      v19PacketsRetainedByteForByte: true,
    },
    capture: {
      boundary: "none: source-only second decrement after frozen v19 exist-clear selected successor _081DD998",
      scalars: [],
      excluded: ["oracle data", "runtime pointer", "runtime address", "frame", "duration", "MusicPlayerInfo.clock", "track identity", "track index", "MusicPlayerInfo.trackCount", "channel state", "later EXIST-set body", "exit body", "unobserved v17 exit successor", "other 75 callbacks"],
    },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, clearRows: 3, stoppedExistSetRows: 4, ambiguousRows: 0, addressFree: true, failClosed: ["missing", "duplicate", "reordered", "ambiguous", "extra"] },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      existClearFinalExitRows: clearRows.length,
      nullExistSetRows: existSetRows.length,
      r6BeforeDecrementForClearRows: 2,
      postDecrementR6ForClearRows: 1,
      postSecondDecrementR6ForClearRows: 0,
      postV19FinalClearTrackExitSourceCycles: added,
      acceptedContiguousPrefixThroughNextTrackExistDecisionSourceCycles: 5596,
      contiguousPrefixThroughFinalClearTrackExitSourceCycles: contiguous,
      sequentialThumbHalfwords: clearRows.length * 2,
      takenControlTransferRefills: clearRows.length,
      unobservedV17ExitSuccessorSourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "Only the three frozen v19 flags=0 clear rows that selected _081DD998: source proves r6 remains 1 through v18 and the v19 clear decision, then closes subs r6, 0x1; ble _081DD9A4 through the taken branch refill.",
      contiguousPrefix: "5626 aggregate source cycles through the second decrement/branch pair for only the three clear rows (5596 frozen v19 + 30 v20).",
      remainingDiscriminator: "All four EXIST-set rows remain stopped before _081DD886. Clear rows stop before _081DD9A4's first ldr r0, [r7, o_MusicPlayerInfo_clock]; no clock, exit body, track identity/index/count, channel state, or later loop work is read, inferred, or priced.",
      v19PacketsReadOnly: true,
      oracleCapture: false,
      clockRead: false,
      trackIdentityInferred: false,
      trackIndexInferred: false,
      trackCountInferred: false,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
      durationFit: false,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Frozen v19 sourceStateDigest rows prove exactly three r6=2→1 clear routes. The source/ELF/exact-ROM guarded second pair decrements each to zero and takes ble _081DD9A4 at 10 cycles, while all four EXIST-set rows stay null before _081DD886.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 final clear-track exit pair v20", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v20.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive source-only evidence. v20 preserves frozen v19 evidence, report, and all three address-free packets byte-for-byte, verifies v19 regeneration, and joins only the seven frozen `sourceStateDigest` rows. It captures no oracle data.", "",
    "Only the three frozen v19 EXIST-clear rows (`flags=0`, selected successor `_081DD998`) enter this slice. Their frozen v17 fields say `r6BeforeDecrement=2` and `postDecrementR6=1`. The exact v18 continuation (`movs r0`; `adds r5`; `lsls r3`; branch) and exact v19 clear decision (`ldrb r0`; `movs r1`; `tst`; not-taken `bne`; taken `b`) contain no `r6` write, source-guarded alongside their ROM bytes. Thus `r6` is still 1 at `_081DD998`.", "",
    "Source, ELF symbols, and exact ROM bytes `01 3e 03 dd` at `0x082dfbd0..0x082dfbd4` close only `subs r6, 0x1; ble _081DD9A4`. The second decrement yields zero and `ble` is taken. Both executed Thumb halfwords, including the branch, cost 2 cycles; the taken refill costs 6: **2×2 + 6 = 10 cycles per clear row / 30 aggregate**. The branch stops before `_081DD9A4`'s first `ldr r0, [r7, o_MusicPlayerInfo_clock]`.", "",
    "The branch-halfword accounting is cross-checked with the frozen chain: v17's first `subs; ble` was 2 halfwords/no refill = 4 cycles; v18 was 4 halfwords + refill = 14; v19 clear was 5 halfwords + refill = 16; this v20 taken `subs; ble` is 2 halfwords + refill = 10. No source-only path silently omits an executed branch halfword.", "",
    "| case | callbacks | EXIST-set / clear | v20 cycles |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => {
      const row = c.byCase[name];
      return `| ${name} | ${row.callbacks} | ${row.existSetRows} / ${row.clearRows} | ${row.sourceCycles} |`;
    }),
    "",
    `The aggregate source prefix advances from **5,596** to **${c.contiguousPrefixThroughFinalClearTrackExitSourceCycles} cycles** (**30** added). The four EXIST-set rows receive null v20 cost and remain stopped before _081DD886. No exit body, clock read, track identity/index/count, channel state, later EXIST-set body, originally unobserved v17 exit successor, other 75 callbacks, complete MPlay total, service/arbitration, or construction-clock wiring is claimed.`, "",
    "Production, presentation, animation, Rust, and canonical Battle-2 work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v20.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v20.md") };
  fail("usage: factory-m4a-note-body-cgb4-v20.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
