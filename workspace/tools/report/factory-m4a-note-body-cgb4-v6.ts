import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV5Evidence } from "./factory-m4a-note-body-cgb4-v5.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V5_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v5.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v6.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v6.md");
const V5_EVIDENCE_SHA256 = "9a36fadbcc65cc6e31c173510a20081e0ce500380a6001ddde6e033fda2fd3b5";
const ROM_BASE = 0x0800_0000;
const POST_HELPER_FIELDS_START = 0x082d_fea6;
const POST_HELPER_FIELDS_END = 0x082d_fec8;
const CHN_VOL_SET_CALL_END = 0x082d_fecc;
const POST_HELPER_FIELDS_SHA256 = "10bf357a60a0d4863a9a8bc46defeb0d709d2d58c0763743b8563cdb5e2a171d";
const CHN_VOL_SET_CALL_SHA256 = "d46e3d9bcf957b9d9435415e3a98393cdf108f1dc82a1655daf2228cd85c7f1f";
const POST_HELPER_SLICE_SHA256 = "ba89374e447e47c7bd627ac19180ce58725ebaf33f228a4c9b5e8a6c31bb9241";
const CHN_VOL_SET_START = 0x082d_fd08;
const CHN_VOL_SET_END = 0x082d_fd38;
const CHN_VOL_SET_SHA256 = "04988bf8e911a12b477d9aafa24342b68e83960a06796e555869cc67b24bd4d2";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";

export type Cgb4PostTrkVolPitSetAllocationState = Readonly<{
  route: "post-TrkVolPitSet-allocation-fields";
  resume: "TrkVolPitSet-return";
  nextHelper: "ChnVolSetAsm";
  trackMemory: "ewram";
  toneMemory: "ewram";
  channelMemory: "iwram";
  stackMemory: "iwram";
}>;

export const CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE: Cgb4PostTrkVolPitSetAllocationState = Object.freeze({
  route: "post-TrkVolPitSet-allocation-fields",
  resume: "TrkVolPitSet-return",
  nextHelper: "ChnVolSetAsm",
  trackMemory: "ewram",
  toneMemory: "ewram",
  channelMemory: "iwram",
  stackMemory: "iwram",
});

export type Cgb4PostTrkVolPitSetAllocationTiming = Readonly<{
  route: "post-TrkVolPitSet-allocation-fields-to-ChnVolSetAsm-entry";
  fieldCopySequentialThumbHalfwords: 17;
  fieldCopyPipelineRefills: 0;
  fieldCopyEwramByteReads: 1;
  fieldCopyEwramHalfwordReads: 1;
  fieldCopyEwramWordReads: 3;
  fieldCopyIwramWordReads: 3;
  fieldCopyIwramByteStores: 4;
  fieldCopyIwramHalfwordStores: 1;
  fieldCopyIwramWordStores: 3;
  fieldCopyEwramDataAccessPremiumCycles: 10;
  fieldCopyIwramDataAccessPremiumCycles: 0;
  fieldCopyCycles: 44;
  callerBlSequentialThumbHalfwords: 2;
  callerBlPipelineRefills: 1;
  callerBlCycles: 10;
  cycles: 54;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v6: ${message}`);
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
 * Source-count the straight-line field copies after TrkVolPitSet and the
 * caller-side BL edge to the next helper.  The field sequence has no branch,
 * so the frozen v5 source-state join supplies all required route evidence and
 * no new mutable runtime scalar is captured here.
 */
export function reduceMPlayCgb4PostTrkVolPitSetAllocationTiming(
  state: unknown,
): Cgb4PostTrkVolPitSetAllocationTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (
    state.route !== "post-TrkVolPitSet-allocation-fields" ||
    state.resume !== "TrkVolPitSet-return" ||
    state.nextHelper !== "ChnVolSetAsm" ||
    state.trackMemory !== "ewram" ||
    state.toneMemory !== "ewram" ||
    state.channelMemory !== "iwram" ||
    state.stackMemory !== "iwram"
  ) return null;

  return Object.freeze({
    route: "post-TrkVolPitSet-allocation-fields-to-ChnVolSetAsm-entry",
    fieldCopySequentialThumbHalfwords: 17,
    fieldCopyPipelineRefills: 0,
    fieldCopyEwramByteReads: 1,
    fieldCopyEwramHalfwordReads: 1,
    fieldCopyEwramWordReads: 3,
    fieldCopyIwramWordReads: 3,
    fieldCopyIwramByteStores: 4,
    fieldCopyIwramHalfwordStores: 1,
    fieldCopyIwramWordStores: 3,
    fieldCopyEwramDataAccessPremiumCycles: 5 * 2 as 10,
    fieldCopyIwramDataAccessPremiumCycles: 0,
    fieldCopyCycles: (17 * 2 + 0 * 6 + 5 * 2) as 44,
    callerBlSequentialThumbHalfwords: 2,
    callerBlPipelineRefills: 1,
    callerBlCycles: (2 * 2 + 1 * 6) as 10,
    cycles: (17 * 2 + 0 * 6 + 5 * 2 + 2 * 2 + 1 * 6) as 54,
  } as const);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of [
    "_081DDC66:",
    "ldr r0, [r5, o_MusicPlayerTrack_gateTime]",
    "str r0, [r4, o_SoundChannel_gateTime]",
    "ldrb r0, [r6, o_ToneData_type]",
    "ldr r7, [r6, o_ToneData_wav]",
    "ldr r0, [r6, o_ToneData_attack]",
    "ldrh r0, [r5, o_MusicPlayerTrack_pseudoEchoVolume]",
    "bl ChnVolSetAsm",
  ]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  if (sha256(assembly) !== M4A1_SHA256) fail("m4a_1.s source bytes changed");

  const symbols = execFileSync(
    "arm-none-eabi-nm",
    ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  for (const symbol of [
    "082dfe9e t _081DDC66",
    "082dfd08 00000030 T ChnVolSetAsm",
  ]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }

  if (romSlice(POST_HELPER_FIELDS_START, POST_HELPER_FIELDS_END).length !== 0x22) fail("post-helper field region length changed");
  if (sha256(romSlice(POST_HELPER_FIELDS_START, POST_HELPER_FIELDS_END)) !== POST_HELPER_FIELDS_SHA256) fail("post-helper field bytes changed");
  if (romSlice(POST_HELPER_FIELDS_END, CHN_VOL_SET_CALL_END).length !== 4) fail("ChnVolSetAsm caller BL length changed");
  if (sha256(romSlice(POST_HELPER_FIELDS_END, CHN_VOL_SET_CALL_END)) !== CHN_VOL_SET_CALL_SHA256) fail("ChnVolSetAsm caller BL bytes changed");
  if (romSlice(POST_HELPER_FIELDS_START, CHN_VOL_SET_CALL_END).length !== 0x26) fail("post-helper slice length changed");
  if (sha256(romSlice(POST_HELPER_FIELDS_START, CHN_VOL_SET_CALL_END)) !== POST_HELPER_SLICE_SHA256) fail("post-helper slice bytes changed");
  if (romSlice(CHN_VOL_SET_START, CHN_VOL_SET_END).length !== 0x30) fail("ChnVolSetAsm region length changed");
  if (sha256(romSlice(CHN_VOL_SET_START, CHN_VOL_SET_END)) !== CHN_VOL_SET_SHA256) fail("ChnVolSetAsm bytes changed");

  return {
    source: {
      caller: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1738-1759", sha256: sha256(assembly) },
    },
    elf: {
      callerResume: "0x082dfea6",
      fieldCopyEnd: "0x082dfec8",
      chnVolSetAsmCallTarget: "0x082dfd08",
      chnVolSetAsmEntry: "0x082dfecc",
      chnVolSetAsmBodyEnd: "0x082dfd38",
    },
    compiledRegions: [
      { role: "post-TrkVolPitSet allocation field copies", start: "0x082dfea6", endExclusive: "0x082dfec8", bytes: 0x22, sha256: POST_HELPER_FIELDS_SHA256 },
      { role: "ChnVolSetAsm caller BL", start: "0x082dfec8", endExclusive: "0x082dfecc", bytes: 4, sha256: CHN_VOL_SET_CALL_SHA256 },
      { role: "post-TrkVolPitSet allocation fields + caller BL through ChnVolSetAsm entry", start: "0x082dfea6", endExclusive: "0x082dfecc", bytes: 0x26, sha256: POST_HELPER_SLICE_SHA256 },
      { role: "ChnVolSetAsm unresolved helper body", start: "0x082dfd08", endExclusive: "0x082dfd38", bytes: 0x30, sha256: CHN_VOL_SET_SHA256 },
    ],
    timingClasses: {
      sequentialThumbFetchCycles: 2,
      takenControlTransferRefillCycles: 6,
      ewramDataAccessPremiumCyclesPerAccess: 2,
      iwramDataAccessPremiumCyclesPerAccess: 0,
      trackAndToneDataClass: "EWRAM",
      channelAndStackDataClass: "IWRAM",
    },
    sourceCycleAccounting: {
      fieldCopies: {
        sequentialThumbHalfwords: 17,
        pipelineRefills: 0,
        ewramByteReads: 1,
        ewramHalfwordReads: 1,
        ewramWordReads: 3,
        iwramWordReads: 3,
        iwramByteStores: 4,
        iwramHalfwordStores: 1,
        iwramWordStores: 3,
        ewramDataAccessPremiumCycles: 10,
        iwramDataAccessPremiumCycles: 0,
        cycles: "17*2 + 0*6 + 5*2 + 0",
        totalCycles: 44,
      },
      chnVolSetAsmCallerEdge: {
        sequentialThumbHalfwords: 2,
        pipelineRefills: 1,
        dataAccessPremiumCycles: 0,
        cycles: "2*2 + 1*6 + 0",
        totalCycles: 10,
      },
      postTrkVolPitSetAllocationSlice: {
        sequentialThumbHalfwords: 19,
        pipelineRefills: 1,
        ewramDataAccessPremiumCycles: 10,
        cycles: "17*2 + 0*6 + 5*2 + 2*2 + 1*6",
        totalCycles: 54,
      },
      laterAllocationFields: null,
      chnVolSetAsmBody: null,
    },
  };
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const acceptedV5 = checkedJson<any>(V5_EVIDENCE, V5_EVIDENCE_SHA256);
  const regeneratedV5 = makeV5Evidence() as any;
  if (JSON.stringify(regeneratedV5) !== JSON.stringify(acceptedV5)) fail("accepted v5 evidence does not regenerate byte-for-byte");
  if (
    acceptedV5.schema !== "factory-m4a-note-body-cgb4-evidence/v5" ||
    acceptedV5.join?.key !== "sourceStateDigest" ||
    acceptedV5.join?.rows !== 113 ||
    acceptedV5.join?.cgb4Rows !== 7 ||
    acceptedV5.coverage?.observedNoteCallbacks !== 82 ||
    acceptedV5.coverage?.contiguousPrefixThroughTrkVolPitSetReturnSourceCycles !== 2081 ||
    acceptedV5.coverage?.nullLaterAllocationFieldsCallbacks !== 7
  ) fail("accepted v5 boundary changed");

  const timing = reduceMPlayCgb4PostTrkVolPitSetAllocationTiming(CGB4_POST_TRKVOLPITSET_ALLOCATION_STATE);
  if (!timing) fail("source-general post-helper field route became unresolved");
  const v5Rows = acceptedV5.rows as Array<Record<string, any>>;
  if (v5Rows.length !== 7 || v5Rows.some((row) => row.case === "anchor" || !CGB4_COUNTS[row.case as CaseName])) fail("CGB4 row join changed");

  const rows = v5Rows.map((row) => {
    const priorPrefix = row.contiguousPrefixThroughTrkVolPitSetReturnSourceCycles;
    if (!Number.isInteger(priorPrefix) || row.laterAllocationFieldsSourceCycles !== null) fail("v5 row boundary changed");
    const allocationState = row.allocationBodyState;
    if (!isRecord(allocationState) || allocationState.lfoDelay !== 0) fail("nonzero-lfoDelay row entered v6");
    return {
      sourceStateDigest: row.sourceStateDigest,
      case: row.case,
      trackIndex: row.trackIndex,
      acceptedContiguousPrefixThroughTrkVolPitSetReturnSourceCycles: priorPrefix,
      postTrkVolPitSetAllocationFieldSourceCycles: timing.fieldCopyCycles,
      chnVolSetAsmCallerEdgeSourceCycles: timing.callerBlCycles,
      postTrkVolPitSetAllocationSliceSourceCycles: timing.cycles,
      knownComponentSumIncludingPostTrkVolPitSetAllocationSliceSourceCycles: priorPrefix + timing.cycles,
      contiguousPrefixThroughChnVolSetAsmEntrySourceCycles: priorPrefix + timing.cycles,
      laterAllocationFieldsSourceCycles: null,
      completeNoteCallbackSourceCycles: null,
      postCallbackGlueSourceCycles: null,
    };
  });

  const byCase = Object.fromEntries(CASES.map((name) => [name, {
    callbacks: rows.filter((row) => row.case === name).length,
    exactPostTrkVolPitSetAllocationSlices: rows.filter((row) => row.case === name).length,
  }])) as Record<CaseName, { callbacks: number; exactPostTrkVolPitSetAllocationSlices: number }>;
  if (JSON.stringify(byCase) !== JSON.stringify({
    anchor: { callbacks: 0, exactPostTrkVolPitSetAllocationSlices: 0 },
    liliana: { callbacks: 3, exactPostTrkVolPitSetAllocationSlices: 3 },
    "factory-varied": { callbacks: 4, exactPostTrkVolPitSetAllocationSlices: 4 },
  })) fail("CGB4 case coverage changed");

  const priorPrefixCycles = rows.reduce((sum, row) => sum + row.acceptedContiguousPrefixThroughTrkVolPitSetReturnSourceCycles, 0);
  const fieldCycles = rows.reduce((sum, row) => sum + row.postTrkVolPitSetAllocationFieldSourceCycles, 0);
  const callerEdgeCycles = rows.reduce((sum, row) => sum + row.chnVolSetAsmCallerEdgeSourceCycles, 0);
  const sliceCycles = rows.reduce((sum, row) => sum + row.postTrkVolPitSetAllocationSliceSourceCycles, 0);
  const contiguousPrefixCycles = rows.reduce((sum, row) => sum + row.contiguousPrefixThroughChnVolSetAsmEntrySourceCycles, 0);
  if (priorPrefixCycles !== 2081 || fieldCycles !== 308 || callerEdgeCycles !== 70 || sliceCycles !== 378 || contiguousPrefixCycles !== 2459) fail("post-helper timing totals changed");

  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v6",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: {
      acceptedV5EvidenceSha256: V5_EVIDENCE_SHA256,
      acceptedV5FrozenInputs: acceptedV5.frozenInputs,
    },
    acceptedV5Summary: {
      schema: acceptedV5.schema,
      join: acceptedV5.join,
      coverage: acceptedV5.coverage,
    },
    capture: {
      boundary: "v5 TrkVolPitSet return -> _081DDC66 post-helper allocation fields -> ChnVolSetAsm caller edge -> callee entry",
      state: "address-free source route and storage classes only; no new runtime operand or pointer is captured",
      selectedChannelIndex: 3,
    },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      exactPostTrkVolPitSetAllocationFieldCallbacks: 7,
      exactChnVolSetAsmCallerEdgeCallbacks: 7,
      postTrkVolPitSetAllocationFieldSourceCycleRange: { min: 44, max: 44, distinct: 1 },
      chnVolSetAsmCallerEdgeSourceCycleRange: { min: 10, max: 10, distinct: 1 },
      postTrkVolPitSetAllocationSliceSourceCycleRange: { min: 54, max: 54, distinct: 1 },
      acceptedContiguousPrefixThroughTrkVolPitSetReturnSourceCycles: priorPrefixCycles,
      postTrkVolPitSetAllocationFieldSourceCycles: fieldCycles,
      chnVolSetAsmCallerEdgeSourceCycles: callerEdgeCycles,
      postTrkVolPitSetAllocationSliceSourceCycles: sliceCycles,
      contiguousPrefixThroughChnVolSetAsmEntrySourceCycles: contiguousPrefixCycles,
      nullLaterAllocationFieldsCallbacks: 7,
      nullChnVolSetAsmBodyCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    branchCoverage: {
      closed: [
        "_081DDC66 post-TrkVolPitSet gateTime/priority/key/rhythmPan copies",
        "_081DDC66 ToneData type/wav/attack copies",
        "_081DDC66 pseudoEchoVolume copy",
        "BL ChnVolSetAsm caller edge",
      ],
      sourceGeneral: true,
      addressFree: true,
      laterAllocationFields: null,
      chnVolSetAsmBody: null,
    },
    rows,
    closure: {
      closed: "The straight-line post-TrkVolPitSet allocation-field copies and exact ChnVolSetAsm caller BL edge are source-counted for the same seven zero-lfoDelay CGB4 callbacks, ending at ChnVolSetAsm entry.",
      contiguousPrefix: "2459 aggregate source cycles through ChnVolSetAsm entry across the seven observed callbacks; the helper body and later allocation fields remain null.",
      knownComponentTerminology: "2081 is retained as the accepted contiguous prefix through TrkVolPitSet return; 2459 is the contiguous prefix after 378 source cycles of post-helper field/call-edge closure.",
      remainingDiscriminator: "The ChnVolSetAsm body, later allocation fields, clear_modM, nonzero-lfoDelay routes, every unobserved TrkVolPitSet operand/branch, the other 75 post-selection callbacks, complete note callbacks, post-callback glue, complete one-pass MPlay totals, service cost, VBlank/IRQ/audio arbitration, and runFactoryConstructionClock remain null.",
      durationFit: false,
      runtimePointerIdentity: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "Source-exact CGB4 coverage is contiguous through ChnVolSetAsm entry for 7/82 observed callbacks: 2081 accepted prefix cycles + 308 post-helper field-copy cycles + 70 caller-edge cycles = 2459 cycles. ChnVolSetAsm's body and all broader note/MPlay/construction-clock costs remain null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, { callbacks: number; exactPostTrkVolPitSetAllocationSlices: number }>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 post-helper allocation fields v6",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v6.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive source evidence only. This receipt independently regenerates and reuses the frozen v5 evidence by its byte hash; it captures no new runtime operand or pointer.",
    "",
    `The same smallest observed family is **${coverage.exactPostTrkVolPitSetAllocationFieldCallbacks}/82** callbacks: **0 anchor / 3 LILIANA / 4 legal-varied**. All seven are the already-closed zero-lfoDelay CGB4 route, so this straight-line continuation needs no new mutable scalar state.`,
    "",
    "Starting at caller resume `0x082dfea6`, the source copies gateTime, priority, key, rhythmPan, ToneData type/wav/attack, and pseudoEchoVolume. The region through the `ChnVolSetAsm` call edge is pinned at `0x082dfea6..0x082dfecc`: **17** field-copy halfwords plus **5 EWRAM reads** cost **44 cycles**, and the two-halfword BL plus one taken refill costs **10 cycles**. The helper body begins at `ChnVolSetAsm` and is not priced.",
    "",
    `The continuation contributes **${coverage.postTrkVolPitSetAllocationSliceSourceCycles} cycles** across seven callbacks (**54 each**): **${coverage.postTrkVolPitSetAllocationFieldSourceCycles}** field-copy cycles plus **${coverage.chnVolSetAsmCallerEdgeSourceCycles}** caller-edge cycles. Added to the accepted **2081** contiguous prefix, the new boundary is **${coverage.contiguousPrefixThroughChnVolSetAsmEntrySourceCycles} cycles** through \`ChnVolSetAsm\` entry.`,
    "",
    "| case | CGB4 callbacks | post-helper slices | slice cycles |",
    "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => `| ${name} | ${byCase[name].callbacks} | ${byCase[name].exactPostTrkVolPitSetAllocationSlices} | ${byCase[name].exactPostTrkVolPitSetAllocationSlices * 54} |`),
    "",
    "The closure stops at the smallest source-semantic join before the unresolved `ChnVolSetAsm` helper body. Later allocation fields, `clear_modM`, nonzero-`lfoDelay` routes, every unobserved `TrkVolPitSet` operand/branch, the other 75 post-selection callbacks, complete note/glue/MPlay costs (**5 exact / 108 null**), service/arbitration, and `runFactoryConstructionClock` remain null.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    const root = resolve(args[1]!);
    return { json: join(root, "factory-m4a-note-body-cgb4-evidence-v6.json"), doc: join(root, "issue55-m4a-note-body-cgb4-v6.md") };
  }
  fail("usage: factory-m4a-note-body-cgb4-v6.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const evidence = makeEvidence();
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
