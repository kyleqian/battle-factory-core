import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV4Evidence } from "./factory-m4a-note-body-cgb4-v4.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V4_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v4.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v5.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v5.md");
const V4_EVIDENCE_SHA256 = "a29476ae5e0f55c2a491513f0e6dad1c4e445f047c9f93a82f7b8723812cc423";
const ROM_BASE = 0x0800_0000;
const CALLER_EDGE_START = 0x082d_fe9e;
const CALLER_EDGE_END = 0x082d_fea6;
const CALLER_EDGE_SHA256 = "84202b0a985448762c0d683663253e945761c43830b79f76102525ee885ee9b3";
const HELPER_PROLOGUE_START = 0x082e_0a80;
const HELPER_PROLOGUE_END = 0x082e_0a82;
const HELPER_PROLOGUE_SHA256 = "45032905ccc19f93939ffc8a27669cc54ac144bd58ce513681f9320712ed9b2c";
const HELPER_START = 0x082e_0a80;
const HELPER_END = 0x082e_0b34;
const HELPER_REGION_SHA256 = "00879cc3e04cd6caf909a6f1763a16ae1ceff8b9f40b83afea83b283b3dc35f5";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";

export type Cgb4CallerHelperGapState = Readonly<{
  caller: "ply_note-cgb4-allocation";
  callsite: "_081DDC66";
  callee: "TrkVolPitSet";
  callerStack: "iwram";
  helperStack: "iwram";
}>;

export type Cgb4CallerHelperGapTiming = Readonly<{
  route: "_081DDC66-call-edge-and-TrkVolPitSet-prologue";
  callerArgumentLoadHalfwords: 1;
  callerArgumentMoveHalfwords: 1;
  callerBlHalfwords: 2;
  callerCallEdgeSequentialThumbHalfwords: 4;
  callerCallEdgePipelineRefills: 1;
  callerStackIwramWordReads: 1;
  callerCallEdgeDataAccessPremiumCycles: 0;
  callerCallEdgeCycles: 14;
  helperPrologueSequentialThumbHalfwords: 1;
  helperProloguePipelineRefills: 0;
  helperPrologueStackIwramWordWrites: 2;
  helperPrologueDataAccessPremiumCycles: 0;
  helperPrologueCycles: 2;
  gapCycles: 16;
}>;

export const CGB4_CALLER_HELPER_GAP_STATE: Cgb4CallerHelperGapState = Object.freeze({
  caller: "ply_note-cgb4-allocation",
  callsite: "_081DDC66",
  callee: "TrkVolPitSet",
  callerStack: "iwram",
  helperStack: "iwram",
});

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v5: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function checkedJson<T>(path: string, expectedHash: string): T {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== expectedHash) fail(`${path} changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

/**
 * Source-count the exact gap from the accepted v3 boundary at _081DDC66 to
 * the existing v4 post-prologue helper component.  The caller's stack load
 * and helper push both use the on-chip IWRAM stack, so neither data access
 * adds a premium to the sequential Thumb fetch count.
 */
export function reduceMPlayCgb4CallerHelperGapTiming(state: unknown): Cgb4CallerHelperGapTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (
    state.caller !== "ply_note-cgb4-allocation" ||
    state.callsite !== "_081DDC66" ||
    state.callee !== "TrkVolPitSet" ||
    state.callerStack !== "iwram" ||
    state.helperStack !== "iwram"
  ) return null;

  return Object.freeze({
    route: "_081DDC66-call-edge-and-TrkVolPitSet-prologue",
    callerArgumentLoadHalfwords: 1,
    callerArgumentMoveHalfwords: 1,
    callerBlHalfwords: 2,
    callerCallEdgeSequentialThumbHalfwords: 4,
    callerCallEdgePipelineRefills: 1,
    callerStackIwramWordReads: 1,
    callerCallEdgeDataAccessPremiumCycles: 0,
    callerCallEdgeCycles: (4 * 2 + 1 * 6) as 14,
    helperPrologueSequentialThumbHalfwords: 1,
    helperProloguePipelineRefills: 0,
    helperPrologueStackIwramWordWrites: 2,
    helperPrologueDataAccessPremiumCycles: 0,
    helperPrologueCycles: 1 * 2 as 2,
    gapCycles: (4 * 2 + 1 * 6 + 1 * 2) as 16,
  } as const);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of [
    "_081DDC66:",
    "ldr r0, [sp]",
    "adds r1, r5, 0",
    "bl TrkVolPitSet",
  ]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const helperSource = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  for (const anchor of [
    "void TrkVolPitSet(struct MusicPlayerInfo *mplayInfo, struct MusicPlayerTrack *track)",
    "track->flags &= ~(MPT_FLG_PITSET | MPT_FLG_VOLSET)",
  ]) {
    if (!helperSource.includes(anchor)) fail(`m4a.c lost ${anchor}`);
  }
  if (sha256(assembly) !== M4A1_SHA256) fail("m4a_1.s source bytes changed");
  if (sha256(helperSource) !== M4A_C_SHA256) fail("m4a.c source bytes changed");

  const symbols = execFileSync(
    "arm-none-eabi-nm",
    ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  for (const symbol of [
    "082dfe9e t _081DDC66",
    "082e0a80 000000b4 T TrkVolPitSet",
  ]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }
  if (sha256(romSlice(CALLER_EDGE_START, CALLER_EDGE_END)) !== CALLER_EDGE_SHA256) fail("caller call-edge bytes changed");
  if (sha256(romSlice(HELPER_PROLOGUE_START, HELPER_PROLOGUE_END)) !== HELPER_PROLOGUE_SHA256) fail("helper prologue bytes changed");
  if (sha256(romSlice(HELPER_START, HELPER_END)) !== HELPER_REGION_SHA256) fail("compiled TrkVolPitSet bytes changed");

  return {
    source: {
      caller: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1738-1741", sha256: sha256(assembly) },
      helper: { path: "reference/pokeemerald/src/m4a.c", lines: "765-808", sha256: sha256(helperSource) },
    },
    elf: {
      callerBoundary: "0x082dfe9e",
      callerCallTarget: "0x082e0a80",
      helperEntry: "0x082e0a80",
      helperReturn: "0x082e0b34",
    },
    compiledRegions: [
      { role: "_081DDC66 caller argument setup and BL", start: "0x082dfe9e", endExclusive: "0x082dfea6", bytes: 8, sha256: CALLER_EDGE_SHA256 },
      { role: "TrkVolPitSet complete prologue", start: "0x082e0a80", endExclusive: "0x082e0a82", bytes: 2, sha256: HELPER_PROLOGUE_SHA256 },
      { role: "TrkVolPitSet complete compiled region", start: "0x082e0a80", endExclusive: "0x082e0b34", bytes: 0xb4, sha256: HELPER_REGION_SHA256 },
    ],
    timingClasses: {
      sequentialThumbFetchCycles: 2,
      takenControlTransferRefillCycles: 6,
      iwramWordDataAccessPremiumCycles: 0,
      callerStackDataAccess: "one IWRAM word read",
      helperPrologueStackDataAccess: "two IWRAM word writes",
    },
    sourceCycleAccounting: {
      callerCallEdge: { sequentialThumbHalfwords: 4, pipelineRefills: 1, iwramWordReads: 1, dataAccessPremiumCycles: 0, cycles: "4*2 + 1*6 + 1*0", totalCycles: 14 },
      helperPrologue: { sequentialThumbHalfwords: 1, pipelineRefills: 0, iwramWordWrites: 2, dataAccessPremiumCycles: 0, cycles: "1*2 + 0*6 + 2*0", totalCycles: 2 },
      callerCallEdgeAndHelperPrologue: { totalCycles: 16 },
      laterAllocationFields: null,
    },
  };
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const acceptedV4 = checkedJson<any>(V4_EVIDENCE, V4_EVIDENCE_SHA256);
  const regeneratedV4 = makeV4Evidence() as any;
  if (JSON.stringify(regeneratedV4) !== JSON.stringify(acceptedV4)) fail("accepted v4 evidence does not regenerate byte-for-byte");
  if (
    acceptedV4.schema !== "factory-m4a-note-body-cgb4-evidence/v4" ||
    acceptedV4.join?.key !== "sourceStateDigest" ||
    acceptedV4.join?.rows !== 113 ||
    acceptedV4.join?.cgb4Rows !== 7 ||
    acceptedV4.coverage?.observedNoteCallbacks !== 82 ||
    acceptedV4.coverage?.knownComponentSumIncludingTrkVolPitSetSourceCycles !== 1969
  ) fail("accepted v4 evidence changed");

  const gap = reduceMPlayCgb4CallerHelperGapTiming(CGB4_CALLER_HELPER_GAP_STATE);
  if (!gap) fail("source-general caller/helper gap became unresolved");
  const rows = (acceptedV4.rows as Array<Record<string, any>>).map((row) => {
    const oldKnown = row.knownComponentSumIncludingTrkVolPitSetSourceCycles;
    if (!Number.isInteger(oldKnown) || row.contiguousPrefixThroughTrkVolPitSetSourceCycles !== null) fail("v4 row boundary changed");
    const contiguousThroughHelperReturn = oldKnown + gap.gapCycles;
    return {
      sourceStateDigest: row.sourceStateDigest,
      case: row.case,
      trackIndex: row.trackIndex,
      allocationBodyState: row.allocationBodyState,
      trkVolPitSetState: row.trkVolPitSetState,
      allocationBodySourceCycles: row.allocationBodySourceCycles,
      trkVolPitSetSourceCycles: row.trkVolPitSetSourceCycles,
      knownComponentSumExcludingCallerGapSourceCycles: oldKnown,
      callerCallEdgeSourceCycles: gap.callerCallEdgeCycles,
      helperPrologueSourceCycles: gap.helperPrologueCycles,
      callerCallEdgeAndHelperPrologueSourceCycles: gap.gapCycles,
      knownComponentSumIncludingCallerGapAndThroughTrkVolPitSetSourceCycles: contiguousThroughHelperReturn,
      contiguousPrefixThroughTrkVolPitSetReturnSourceCycles: contiguousThroughHelperReturn,
      laterAllocationFieldsSourceCycles: null,
      completeNoteCallbackSourceCycles: null,
      postCallbackGlueSourceCycles: null,
    };
  });
  if (rows.length !== 7 || rows.some((row) => row.case === "anchor" || !CGB4_COUNTS[row.case as CaseName])) fail("CGB4 row join changed");

  const knownBeforeGap = rows.reduce((sum, row) => sum + row.knownComponentSumExcludingCallerGapSourceCycles, 0);
  const gapCycles = rows.reduce((sum, row) => sum + row.callerCallEdgeAndHelperPrologueSourceCycles, 0);
  const contiguousThroughHelperReturn = rows.reduce((sum, row) => sum + row.contiguousPrefixThroughTrkVolPitSetReturnSourceCycles, 0);
  if (knownBeforeGap !== 1969 || gapCycles !== 112 || contiguousThroughHelperReturn !== 2081) fail("CGB4 gap totals changed");

  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v5",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: { acceptedV4EvidenceSha256: V4_EVIDENCE_SHA256, acceptedV4FrozenInputs: acceptedV4.frozenInputs },
    acceptedV4Summary: { schema: acceptedV4.schema, join: acceptedV4.join, coverage: acceptedV4.coverage },
    capture: {
      boundary: "accepted-v3-allocation-body -> _081DDC66 caller edge -> TrkVolPitSet prologue -> accepted-v4 helper component",
      state: "address-free source route labels only; no new runtime operand or pointer is captured",
      selectedChannelIndex: 3,
    },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase: acceptedV4.coverage.byCase,
      exactCallerCallEdgeCallbacks: 7,
      exactHelperPrologueCallbacks: 7,
      callerCallEdgeSourceCycleRange: { min: 14, max: 14, distinct: 1 },
      helperPrologueSourceCycleRange: { min: 2, max: 2, distinct: 1 },
      callerCallEdgeAndHelperPrologueSourceCycleRange: { min: 16, max: 16, distinct: 1 },
      knownComponentSumExcludingCallerGapSourceCycles: knownBeforeGap,
      callerCallEdgeAndHelperPrologueSourceCycles: gapCycles,
      knownComponentSumIncludingCallerGapAndThroughTrkVolPitSetSourceCycles: contiguousThroughHelperReturn,
      contiguousPrefixThroughTrkVolPitSetReturnSourceCycles: contiguousThroughHelperReturn,
      nullLaterAllocationFieldsCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    branchCoverage: {
      closed: ["_081DDC66 ldr argument", "_081DDC66 adds argument", "BL TrkVolPitSet", "TrkVolPitSet push {r4,lr}"],
      sourceGeneral: true,
      addressFree: true,
      laterAllocationFields: null,
    },
    rows,
    closure: {
      closed: "The exact caller call edge and complete TrkVolPitSet prologue bridge the accepted v3 allocation-body prefix to the existing v4 post-prologue helper join for all seven observed zero-lfoDelay CGB4 callbacks.",
      contiguousPrefix: "2081 aggregate source cycles through TrkVolPitSet return across the seven observed callbacks; the next later allocation fields remain null.",
      knownComponentTerminology: "1969 is retained as the pre-gap known-component sum; 2081 is the mechanically distinct contiguous prefix after the 112-cycle gap is closed.",
      remainingDiscriminator: "Later allocation fields, clear_modM, nonzero-lfoDelay routes, every unobserved TrkVolPitSet operand/branch, the other 75 post-selection callbacks, complete note callbacks, post-callback glue, complete one-pass MPlay totals, service cost, VBlank/IRQ/audio arbitration, and runFactoryConstructionClock remain null.",
      durationFit: false,
      runtimePointerIdentity: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "Source-exact CGB4 coverage is contiguous through TrkVolPitSet return for 7/82 observed callbacks: 1413 accepted prefix cycles + 112 caller/prologue cycles + 556 helper cycles = 2081 cycles. Later allocation fields and all broader note/MPlay/construction-clock costs remain null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, { cgb4: number; flagsClear: number; volumeAndClear: number }>;
  const rows = evidence.rows as Array<{ case: CaseName; trkVolPitSetSourceCycles: number; knownComponentSumExcludingCallerGapSourceCycles: number; contiguousPrefixThroughTrkVolPitSetReturnSourceCycles: number }>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 caller edge + `TrkVolPitSet` prologue v5",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v5.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive source evidence only. This receipt reuses the frozen v4 packets and joins the same address-free `sourceStateDigest` rows; it captures no new runtime operand.",
    "",
    "The exact `_081DDC66` caller edge is `ldr r0, [sp]` + `adds r1, r5, 0` + the two-halfword `BL TrkVolPitSet`: **4 sequential Thumb halfwords + 1 taken refill = 14 cycles**, with one IWRAM stack-word read and no data-access premium. The complete helper prologue is `push {r4, lr}`: **1 sequential Thumb halfword = 2 cycles**, with two IWRAM stack-word writes and no data-access premium. The closed gap is therefore **16 cycles per callback / 112 cycles across seven callbacks**.",
    "",
    "The existing v4 helper routes remain five flags-clear callbacks at 56 cycles and two observed VOLSET callbacks at 138 cycles, for **556 helper cycles**. The v3 accepted contiguous prefix remains **1413 cycles**; the v4 known-component sum before this gap remains **1969**. After the gap is closed, the mechanically distinct contiguous prefix through the helper return is **2081 cycles** across the seven rows.",
    "",
    "| case | CGB4 callbacks | caller/prologue cycles | v4 helper cycles | contiguous through helper return |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => {
      const cgb4 = byCase[name]?.cgb4 ?? 0;
      const caseRows = rows.filter((row) => row.case === name);
      const helper = caseRows.reduce((sum, row) => sum + row.trkVolPitSetSourceCycles, 0);
      const contiguous = caseRows.reduce((sum, row) => sum + row.contiguousPrefixThroughTrkVolPitSetReturnSourceCycles, 0);
      return `| ${name} | ${cgb4} | ${cgb4 * 16} | ${helper} | ${contiguous} |`;
    }),
    "",
    "The closure stops at the existing helper-component join (the `TrkVolPitSet` return). Later allocation fields, `clear_modM`, nonzero-`lfoDelay` routes, every unobserved helper operand/branch, the other 75 post-selection callbacks, complete note/glue/MPlay costs (**5 exact / 108 null**), service/arbitration, and `runFactoryConstructionClock` remain null.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    const root = resolve(args[1]!);
    return { json: join(root, "factory-m4a-note-body-cgb4-evidence-v5.json"), doc: join(root, "issue55-m4a-note-body-cgb4-v5.md") };
  }
  fail("usage: factory-m4a-note-body-cgb4-v5.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const evidence = makeEvidence();
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
