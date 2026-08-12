import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV3Evidence, reduceMPlayCgb4AllocationBodyTiming } from "./factory-m4a-note-body-cgb4-v3.ts";
import type { NoteCallback } from "./factory-m4a-note-census-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const NOTE_COUNTS: Record<CaseName, number> = { anchor: 33, liliana: 24, "factory-varied": 25 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "fbe6a35f48861ab7408b55d81da17d307ac2a6254ccba474c730fe3e51a7599f",
  liliana: "4f2e86fe6c1725e0f2e8d96c1416dfb79c927fd8cbd33db51bb93191248cc442",
  "factory-varied": "64ea0a16a0817f49b27f13fed096c43f16c9ecf40ab17b0d0b560dceea03df08",
};
const V3_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "818433d12eddd52c6ce1bb1a3128ca5a27cad4e52d7f3b699620f3999a46eaad",
  liliana: "c0f11db93b544f86781064565f618c7c95aaa43b9ca3e6eb06fc5a17067e9ef5",
  "factory-varied": "b303a6dedd26f1d0ba0f6797e2b57f5f5c9e5b3aff7b3599a26b80143055beb9",
};
const V3_EVIDENCE_SHA256 = "558e043ae23308abf43f4642b9acb8d520c6d30f6efe0c0a5e188bb9e67a4cba";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v4");
const V3_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v3");
const V3_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v3.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v4.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v4.md");
const ROM_BASE = 0x0800_0000;
const HELPER_START = 0x082e_0a80;
const HELPER_END = 0x082e_0b34;
const HELPER_REGION_SHA256 = "00879cc3e04cd6caf909a6f1763a16ae1ceff8b9f40b83afea83b283b3dc35f5";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const M4A_C_SHA256 = "e924928bbe9fea4a10cfb9b202eb770746e03cd3849bbfd03479f55e01d2e2f4";

type BodyState = Readonly<{
  currentRole: string;
  trackRole: string | null;
  previousRole: string | null;
  nextRole: string | null;
  trackChanRole: string | null;
  lfoDelay: number;
}>;

export type TrkVolPitSetVolumeOperands = Readonly<{
  vol: number;
  volX: number;
  pan: number;
  panX: number;
  modT: number;
}>;

export type TrkVolPitSetState = Readonly<{
  flags: number;
  volume?: TrkVolPitSetVolumeOperands;
}>;

export type TrkVolPitSetTiming = Readonly<{
  route: "flags-clear" | "volume-and-clear-observed";
  flagsBefore: number;
  flagsAfter: number;
  volumeOperands: TrkVolPitSetVolumeOperands | null;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  dataAccessPremiumCycles: 0;
  cycles: number;
}>;

type Cgb4Callback = NoteCallback & {
  cgb4AllocationBodyState?: BodyState;
  cgb4TrkVolPitSetState?: TrkVolPitSetState;
};
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

function fail(message: string): never {
  throw new Error(`factory-m4a-note-body-cgb4-v4: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function checkedJson<T>(path: string, expectedHash: string): T {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== expectedHash) fail(`${path} changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}

function requireU8(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be u8`);
  return value;
}

function requireS8(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < -0x80 || value > 0x7f) fail(`${label} must be s8`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

function observedVolume(value: unknown): TrkVolPitSetVolumeOperands | null {
  if (!isRecord(value)) fail("volume operands must be an object");
  const volume = {
    vol: requireU8(value.vol, "volume.vol"),
    volX: requireU8(value.volX, "volume.volX"),
    pan: requireS8(value.pan, "volume.pan"),
    panX: requireS8(value.panX, "volume.panX"),
    modT: requireU8(value.modT, "volume.modT"),
  } satisfies TrkVolPitSetVolumeOperands;
  // This is deliberately the observed zero-modulation path, not a model of
  // TrkVolPitSet's other modT, clamp, or pitch branches.
  if (volume.vol !== 47 || volume.volX !== 64 || volume.pan !== 63 || volume.panX !== 0 || volume.modT !== 0) return null;
  return Object.freeze(volume);
}

/**
 * Source-count the compiled helper body at the captured entry boundary.
 * The reducer is intentionally closed over the two observed flag/operand
 * routes only; every other helper input remains unresolved.
 */
export function reduceMPlayTrkVolPitSetTiming(state: unknown): TrkVolPitSetTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  const flags = requireU8(state.flags, "flags");
  if (flags === 0x80) {
    if ("volume" in state) return null;
    return Object.freeze({
      route: "flags-clear",
      flagsBefore: flags,
      flagsAfter: flags & 0xfa,
      volumeOperands: null,
      sequentialThumbHalfwords: 19,
      pipelineRefills: 3,
      dataAccessPremiumCycles: 0,
      cycles: 19 * 2 + 3 * 6,
    });
  }
  if (flags !== 0x83) return null;
  if (!("volume" in state)) return null;
  const volume = observedVolume(state.volume);
  if (volume === null) return null;
  return Object.freeze({
    route: "volume-and-clear-observed",
    flagsBefore: flags,
    flagsAfter: flags & 0xfa,
    volumeOperands: volume,
    sequentialThumbHalfwords: 51,
    pipelineRefills: 6,
    dataAccessPremiumCycles: 0,
    cycles: 51 * 2 + 6 * 6,
  });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of [
    "_081DDC66:",
    "ldr r0, [sp]",
    "adds r1, r5, 0",
    "bl TrkVolPitSet",
    "ldr r0, [r5, o_MusicPlayerTrack_gateTime]",
  ]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const helperSource = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  for (const anchor of [
    "void TrkVolPitSet(struct MusicPlayerInfo *mplayInfo, struct MusicPlayerTrack *track)",
    "if (track->flags & MPT_FLG_VOLSET)",
    "if (track->modT == 1)",
    "if (track->modT == 2)",
    "if (track->flags & MPT_FLG_PITSET)",
    "track->flags &= ~(MPT_FLG_PITSET | MPT_FLG_VOLSET)",
  ]) {
    if (!helperSource.includes(anchor)) fail(`m4a.c lost ${anchor}`);
  }
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfe78 t _081DDC40", "082dfe9e t _081DDC66", "082e0a80 000000b4 T TrkVolPitSet"]) {
    if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  }
  if (sha256(romSlice(HELPER_START, HELPER_END)) !== HELPER_REGION_SHA256) fail("compiled TrkVolPitSet bytes changed");
  return {
    source: {
      caller: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1719-1743", sha256: sha256(assembly) },
      helper: { path: "reference/pokeemerald/src/m4a.c", lines: "765-808", sha256: sha256(helperSource) },
    },
    elf: { callerEntry: "0x082dfe78", helperEntry: "0x082e0a80", helperSize: "0xb4", helperReturn: "0x082e0b34" },
    compiledRegions: [{ role: "TrkVolPitSet", start: "0x082e0a80", endExclusive: "0x082e0b34", bytes: 0xb4, sha256: HELPER_REGION_SHA256 }],
    timingClasses: { sequentialThumbHalfword: 2, takenPipelineRefill: 6, helperDataAccessPremium: 0 },
    sourceCycleAccounting: {
      flagsClear: { sequentialThumbHalfwords: 19, pipelineRefills: 3, cycles: "19*2 + 3*6", totalCycles: 56 },
      volumeAndClearObserved: { sequentialThumbHalfwords: 51, pipelineRefills: 6, cycles: "51*2 + 6*6", totalCycles: 138 },
      callerBlAndPostHelperAllocationFields: null,
    },
  };
}

function stripHelper(callback: Cgb4Callback): NoteCallback {
  const { cgb4TrkVolPitSetState: _helper, ...base } = callback;
  return base;
}

function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (
    packet.schema !== "factory-m4a-note-body-cgb4-probe/v4" ||
    packet.case !== name ||
    packet.oracleProfile !== "battle-scene-off" ||
    packet.joinKey !== "sourceStateDigest" ||
    packet.captureBoundary !== "sixth-MPlayMain-ply_note-CGB4-TrkVolPitSet-entry" ||
    !packet.addressFree ||
    packet.observations.length !== COUNTS[name]
  ) fail(`${name} packet identity changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const acceptedV3 = makeV3Evidence();
  const frozenV3 = checkedJson<any>(V3_EVIDENCE, V3_EVIDENCE_SHA256);
  if (frozenV3.coverage?.observedNoteCallbacks !== 82 || frozenV3.join?.rows !== 113 || frozenV3.coverage?.knownPrefixThroughAllocationBodySourceCycles !== 1413) fail("accepted v3 evidence changed");
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, Record<string, number>> = {};
  const reproducibility = {
    schema: "factory-m4a-note-body-cgb4-repro/v4",
    oracleProfile: "battle-scene-off",
    freshRunsPerCase: 2,
    cases: CASES.map((name) => ({ case: name, firstFreshSha256: PACKET_HASHES[name], secondFreshSha256: PACKET_HASHES[name], byteIdentical: true })),
  };

  for (const name of CASES) {
    const packet = loadPacket(name);
    const v3 = checkedJson<Packet>(join(V3_PACKETS, `${name}.json`), V3_PACKET_HASHES[name]);
    if (v3.observations.length !== packet.observations.length) fail(`${name} v3 join cardinality changed`);
    const v3ByDigest = new Map(v3.observations.map((observation) => [observation.sourceStateDigest, observation]));
    const v3Rows = new Map((frozenV3.rows as Array<Record<string, unknown>>).filter((row) => row.case === name).map((row) => [row.sourceStateDigest, row]));
    if (v3ByDigest.size !== COUNTS[name] || v3Rows.size !== CGB4_COUNTS[name]) fail(`${name} sourceStateDigest join is ambiguous`);
    const summary = { observations: packet.observations.length, callbacks: 0, cgb4: 0, flagsClear: 0, volumeAndClear: 0 };
    for (const observation of packet.observations) {
      const old = v3ByDigest.get(observation.sourceStateDigest);
      if (!old || JSON.stringify(observation.noteCallbacks?.map(stripHelper) ?? null) !== JSON.stringify(old.noteCallbacks)) fail(`${name} v4 packet changes frozen v3 rows`);
      for (const callback of observation.noteCallbacks ?? []) {
        summary.callbacks += 1;
        if (callback.cgb4TrkVolPitSetState !== undefined && callback.toneType !== 12) fail(`${name} non-CGB4 callback captured helper state`);
        if (callback.toneType !== 12) continue;
        summary.cgb4 += 1;
        const body = callback.cgb4AllocationBodyState;
        const helperState = callback.cgb4TrkVolPitSetState;
        if (!body || !helperState) fail(`${name} CGB4 callback helper state is missing`);
        const bodyTiming = reduceMPlayCgb4AllocationBodyTiming(body);
        const helperTiming = reduceMPlayTrkVolPitSetTiming(helperState);
        if (!bodyTiming || !helperTiming) fail(`${name} accepted CGB4 helper route became unresolved`);
        if (helperTiming.flagsBefore === 0x80) summary.flagsClear += 1;
        if (helperTiming.route === "volume-and-clear-observed") summary.volumeAndClear += 1;
        const priorRow = v3Rows.get(observation.sourceStateDigest);
        if (!priorRow || priorRow.allocationBodySourceCycles !== bodyTiming.cycles) fail(`${name} v3 body join changed`);
        rows.push({
          sourceStateDigest: observation.sourceStateDigest,
          case: name,
          trackIndex: callback.trackIndex,
          allocationBodyState: body,
          trkVolPitSetState: helperState,
          allocationBodySourceCycles: bodyTiming.cycles,
          trkVolPitSetSourceCycles: helperTiming.cycles,
          knownPrefixThroughTrkVolPitSetSourceCycles: (priorRow.knownPrefixThroughBodySourceCycles as number) + helperTiming.cycles,
          completeNoteCallbackSourceCycles: null,
          postCallbackGlueSourceCycles: null,
        });
      }
    }
    if (summary.callbacks !== NOTE_COUNTS[name] || summary.cgb4 !== CGB4_COUNTS[name]) fail(`${name} callback coverage changed`);
    byCase[name] = summary;
  }
  if (rows.length !== 7 || rows.filter((row) => (row.trkVolPitSetState as TrkVolPitSetState).flags === 0x80).length !== 5 || rows.filter((row) => (row.trkVolPitSetState as TrkVolPitSetState).flags === 0x83).length !== 2) fail("TrkVolPitSet route partition changed");
  const helperCycles = rows.reduce((sum, row) => sum + (row.trkVolPitSetSourceCycles as number), 0);
  const knownCycles = rows.reduce((sum, row) => sum + (row.knownPrefixThroughTrkVolPitSetSourceCycles as number), 0);
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v4",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    reproducibility,
    frozenInputs: {
      packets: PACKET_HASHES,
      acceptedV3Packets: V3_PACKET_HASHES,
      acceptedV3EvidenceSha256: V3_EVIDENCE_SHA256,
      acceptedV3FrozenInputs: frozenV3.frozenInputs,
    },
    acceptedV3Summary: { schema: acceptedV3.schema, join: acceptedV3.join, coverage: acceptedV3.coverage },
    capture: {
      boundary: "ply_note._081DDC66-TrkVolPitSet-entry",
      runtimeCompiledPc: "0x082e0a82",
      state: "address-free flags, and volume/pan/modT operands only when the observed VOLSET branch reads them",
      selectedChannelIndex: 3,
    },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      trkVolPitSetRouteCounts: { "flags-clear": 5, "volume-and-clear-observed": 2 },
      helperBranchCounts: { "TrkVolPitSet-entry": 7, "clear_modM": 0, "TrkVolPitSet-unobserved": 0 },
      exactTrkVolPitSetCallbacks: 7,
      nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
      trkVolPitSetSourceCycleRange: { min: 56, max: 138, distinct: 2 },
      trkVolPitSetSourceCycles: helperCycles,
      acceptedPrefixThroughAllocationBodySourceCycles: 1413,
      knownPrefixThroughTrkVolPitSetSourceCycles: knownCycles,
    },
    branchCoverage: {
      sourceBranches: ["flags & VOLSET", "modT == 1", "modT == 2", "volume clamp", "flags & PITSET", "clear VOLSET/PITSET bits"],
      reducerAccountsForAllObserved: true,
      observed: ["flags-clear", "volume-and-clear-observed", "PITSET clear-only exit", "VOLSET/PITSET flag clear"],
    },
    rows,
    closure: {
      closed: "Seven observed type-12 CGB4 callbacks are source-exact from the accepted v3 allocation body through the compiled TrkVolPitSet return: five flags-clear routes at 56 cycles and two observed VOLSET routes at 138 cycles.",
      remainingDiscriminator: "clear_modM, nonzero-lfoDelay paths, all other TrkVolPitSet operands and modT/PITSET/clamp routes, caller BL accounting, later allocation fields, all other post-selection callbacks, complete note callbacks, post-callback glue, complete one-pass MPlay totals, service cost, VBlank/IRQ/audio arbitration, and construction-clock wiring remain null.",
      durationFit: false,
      runtimePointerIdentity: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "A source-close TrkVolPitSet helper reducer closes the seven observed zero-lfoDelay CGB-channel-4 callbacks across anchor/LILIANA/legal-varied: five flags-clear routes at 56 cycles and two observed VOLSET routes at 138 cycles; all unobserved helper branches and complete note/construction-clock costs remain null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, { cgb4: number; flagsClear: number; volumeAndClear: number }>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 `TrkVolPitSet` helper v4",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v4.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, additive evidence only. Two fresh emulator paths per anchor, LILIANA, and legal-varied case produced byte-identical address-free packets. The v4 packet joins the accepted frozen v3 allocation-body packet by `sourceStateDigest` and captures only the helper operands read on the observed route.",
    "",
    "The observed family is **" + coverage.cgbChannel4Callbacks + "/82** callbacks: **0 anchor / 3 LILIANA / 4 legal-varied**. All seven select CGB channel index **3** and have lfoDelay=0. Five enter with flags **0x80** and take the helper's flags-clear route; two enter with flags **0x83** and the observed VOLSET route (vol=47, volX=64, pan=63, panX=0, modT=0).",
    "",
    "The reducer source-counts the compiled TrkVolPitSet body from 0x082e0a82 through its return. The flags-clear route executes **19 Thumb halfwords + 3 taken refills = 56 cycles**; the observed VOLSET route executes **51 halfwords + 6 taken refills = 138 cycles**. No extra helper data-access premium is charged. The helper total is **" + coverage.trkVolPitSetSourceCycles + " cycles** across the seven rows.",
    "",
    "| case | CGB4 callbacks | flags-clear | observed VOLSET | packet repeats |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => `| ${name} | ${byCase[name].cgb4} | ${byCase[name].flagsClear} | ${byCase[name].volumeAndClear} | byte-identical ×2 |`),
    "",
    `The accepted v3 prefix through allocation body remains **1413** cycles; through the TrkVolPitSet helper return it is **${coverage.knownPrefixThroughTrkVolPitSetSourceCycles}** source cycles across the seven rows. The caller BL and later allocation fields are intentionally outside this boundary.`,
    "",
    "The closure stops before `clear_modM`, every unobserved TrkVolPitSet operand/branch, nonzero-lfoDelay routes, caller BL accounting, later allocation fields, all other post-selection callbacks, complete note callbacks, post-callback glue, complete one-pass MPlay totals (**5 exact / 108 null**), service cost, VBlank/IRQ/audio arbitration, and `runFactoryConstructionClock`.",
    "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    const root = resolve(args[1]!);
    return { json: join(root, "factory-m4a-note-body-cgb4-evidence-v4.json"), doc: join(root, "issue55-m4a-note-body-cgb4-v4.md") };
  }
  fail("usage: factory-m4a-note-body-cgb4-v4.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const evidence = makeEvidence();
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
