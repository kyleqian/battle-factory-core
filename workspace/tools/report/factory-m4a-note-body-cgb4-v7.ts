import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV6Evidence } from "./factory-m4a-note-body-cgb4-v6.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "a2f62e3b7ea01cccfe19b41f7cef7ab45cde50400c74eb4285491e1987479566",
  liliana: "53db7226067890c8996ddc5c045ee8afd45bb1f2f469a82be5f5a9dc9d278624",
  "factory-varied": "406586b9fc00ddc24aba5984ed8a4b5a40f952ba72789d455549165c589a6784",
};
const V4_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "fbe6a35f48861ab7408b55d81da17d307ac2a6254ccba474c730fe3e51a7599f",
  liliana: "4f2e86fe6c1725e0f2e8d96c1416dfb79c927fd8cbd33db51bb93191248cc442",
  "factory-varied": "64ea0a16a0817f49b27f13fed096c43f16c9ecf40ab17b0d0b560dceea03df08",
};
const V6_EVIDENCE_SHA256 = "341be83906b17cd9ad972886a11e6f91270fc1eb3d66dc7cad4ff644daec468f";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const CHN_VOL_SET_SHA256 = "04988bf8e911a12b477d9aafa24342b68e83960a06796e555869cc67b24bd4d2";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v7");
const V4_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v4");
const V6_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v6.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v7.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v7.md");
const ROM_BASE = 0x0800_0000;
const HELPER_START = 0x082d_fd08;
const HELPER_END = 0x082d_fd38;

export type ChnVolSetAsmState = Readonly<{ velocity: number; rhythmPan: number; volMR: number; volML: number }>;
export type ChnVolSetAsmTiming = Readonly<{
  route: "both-unclamped-observed";
  operands: ChnVolSetAsmState;
  rightVolume: number;
  leftVolume: number;
  sequentialThumbHalfwords: 22;
  pipelineRefills: 3;
  iwramByteReads: 2;
  iwramByteStores: 2;
  ewramByteReads: 2;
  ewramDataAccessPremiumCycles: 4;
  multiplyInternalCycles: 6;
  multiplyInternalPremiumCycles: 2;
  cycles: 68;
}>;

const OBSERVED_OPERANDS = new Set([
  "64,0,93,0", "32,0,93,0", "64,0,0,131", "64,0,99,0", "64,0,0,99",
]);

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v7: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
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

/** Reduce only the five scalar tuples observed twice at the exact helper entry. */
export function reduceMPlayChnVolSetAsmTiming(state: unknown): ChnVolSetAsmTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (Object.keys(state).sort().join(",") !== "rhythmPan,velocity,volML,volMR") return null;
  const operands = Object.freeze({
    velocity: requireU8(state.velocity, "velocity"),
    rhythmPan: requireS8(state.rhythmPan, "rhythmPan"),
    volMR: requireU8(state.volMR, "volMR"),
    volML: requireU8(state.volML, "volML"),
  });
  if (!OBSERVED_OPERANDS.has(`${operands.velocity},${operands.rhythmPan},${operands.volMR},${operands.volML}`)) return null;
  const rightVolume = (operands.volMR * (0x80 + operands.rhythmPan) * operands.velocity) >> 14;
  const leftVolume = (operands.volML * (0x7f - operands.rhythmPan) * operands.velocity) >> 14;
  if (rightVolume > 0xff || leftVolume > 0xff) return null;
  return Object.freeze({
    route: "both-unclamped-observed", operands, rightVolume, leftVolume,
    sequentialThumbHalfwords: 22, pipelineRefills: 3,
    iwramByteReads: 2, iwramByteStores: 2, ewramByteReads: 2,
    ewramDataAccessPremiumCycles: 4,
    // Each velocity multiplier terminates in 1I; each 12–14-bit pan×velocity
    // multiplier terminates in 2I. The ordinary instruction class includes
    // one I, leaving two additional internal cycles across four MULS.
    multiplyInternalCycles: 6, multiplyInternalPremiumCycles: 2,
    cycles: 68,
  });
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of [
    "ChnVolSetAsm:", "ldrb r1, [r4, o_SoundChannel_velocity]", "ldrsb r2, [r4, r0]",
    "ldrb r0, [r5, o_MusicPlayerTrack_volMR]", "bls _081DDAE8",
    "ldrb r0, [r5, o_MusicPlayerTrack_volML]", "bls _081DDAFC", "bx lr",
  ]) if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  if (sha256(assembly) !== M4A1_SHA256) fail("m4a_1.s source bytes changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", join(ROOT, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!symbols.includes("082dfd08 00000030 T ChnVolSetAsm")) fail("ELF ChnVolSetAsm symbol changed");
  if (romSlice(HELPER_START, HELPER_END).length !== 0x30 || sha256(romSlice(HELPER_START, HELPER_END)) !== CHN_VOL_SET_SHA256) fail("compiled ChnVolSetAsm bytes changed");
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1508-1538", sha256: sha256(assembly) },
    elf: { helperEntry: "0x082dfd08", helperSize: "0x30", helperReturn: "0x082dfd38" },
    compiledRegions: [{ role: "complete ChnVolSetAsm", start: "0x082dfd08", endExclusive: "0x082dfd38", bytes: 0x30, sha256: CHN_VOL_SET_SHA256 }],
    timingClasses: {
      sequentialThumbFetchCycles: 2, takenControlTransferRefillCycles: 6,
      ewramDataAccessPremiumCyclesPerAccess: 2, iwramDataAccessPremiumCyclesPerAccess: 0,
      arm7tdmiMultiply: "1I for captured u8 velocity operands; 2I for captured 12-14-bit pan*velocity operands; ordinary class already contains 1I",
    },
    sourceCycleAccounting: {
      bothUnclampedObserved: {
        sequentialThumbHalfwords: 22, pipelineRefills: 3, iwramByteReads: 2, iwramByteStores: 2,
        ewramByteReads: 2, ewramDataAccessPremiumCycles: 4,
        multiplyInternalCycles: 6, multiplyInternalPremiumCycles: 2,
        cycles: "22*2 + 3*6 + 2*2 + 2", totalCycles: 68,
      },
      clampRoutes: null,
    },
  };
}

type Packet = { schema: string; case: CaseName; oracleProfile: string; sourceFunction: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: any[] };
function stripEntryState(packet: Packet): Packet {
  return {
    ...packet,
    schema: "factory-m4a-note-body-cgb4-probe/v4",
    captureBoundary: "sixth-MPlayMain-ply_note-CGB4-TrkVolPitSet-entry",
    observations: packet.observations.map((observation) => ({
      ...observation,
      noteCallbacks: observation.noteCallbacks?.map((callback: any) => {
        const { cgb4ChnVolSetState: _entry, ...base } = callback;
        return base;
      }) ?? null,
    })),
  };
}
function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v7" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || packet.captureBoundary !== "sixth-MPlayMain-ply_note-CGB4-ChnVolSetAsm-entry-scalars" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  const v4 = checkedJson<Packet>(join(V4_PACKETS, `${name}.json`), V4_PACKET_HASHES[name]);
  if (JSON.stringify(stripEntryState(packet)) !== JSON.stringify(v4)) fail(`${name} packet no longer adds cleanly to frozen v4`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const frozenV6 = checkedJson<any>(V6_EVIDENCE, V6_EVIDENCE_SHA256);
  if (JSON.stringify(makeV6Evidence()) !== JSON.stringify(frozenV6)) fail("accepted v6 evidence does not regenerate byte-for-byte");
  if (frozenV6.coverage?.contiguousPrefixThroughChnVolSetAsmEntrySourceCycles !== 2459) fail("accepted v6 boundary changed");

  const callbacks = CASES.flatMap((name) => loadPacket(name).observations.flatMap((observation: any) =>
    (observation.noteCallbacks ?? []).filter((callback: any) => callback.toneType === 12)
      .map((callback: any) => ({ ...callback, sourceStateDigest: observation.sourceStateDigest }))));
  if (callbacks.length !== 7) fail("CGB4 callback count changed");
  const byDigest = new Map(callbacks.map((callback: any) => [callback.sourceStateDigest, callback]));
  if (byDigest.size !== 7) fail("CGB4 source-state join became ambiguous");
  const rows = frozenV6.rows.map((row: any) => {
    const callback = byDigest.get(row.sourceStateDigest);
    if (!callback || !isRecord(callback.cgb4ChnVolSetState)) fail("v7 packet missed a frozen v6 row");
    const timing = reduceMPlayChnVolSetAsmTiming(callback.cgb4ChnVolSetState);
    if (!timing) fail("observed ChnVolSetAsm route became unresolved");
    return {
      sourceStateDigest: row.sourceStateDigest, case: row.case, trackIndex: row.trackIndex,
      acceptedContiguousPrefixThroughChnVolSetAsmEntrySourceCycles: row.contiguousPrefixThroughChnVolSetAsmEntrySourceCycles,
      chnVolSetAsmState: timing.operands,
      chnVolSetAsmRoute: timing.route,
      rightVolume: timing.rightVolume, leftVolume: timing.leftVolume,
      chnVolSetAsmBodySourceCycles: timing.cycles,
      contiguousPrefixThroughChnVolSetAsmReturnSourceCycles: row.contiguousPrefixThroughChnVolSetAsmEntrySourceCycles + timing.cycles,
      laterAllocationFieldsSourceCycles: null,
      completeNoteCallbackSourceCycles: null,
      postCallbackGlueSourceCycles: null,
    };
  });
  if (byDigest.size !== rows.length) fail("v7 packet contains an unjoined CGB4 row");
  const byCase = Object.fromEntries(CASES.map((name) => [name, { callbacks: rows.filter((row: any) => row.case === name).length, exactHelperBodies: rows.filter((row: any) => row.case === name).length }])) as Record<CaseName, any>;
  for (const name of CASES) if (byCase[name].callbacks !== CGB4_COUNTS[name]) fail(`${name} CGB4 coverage changed`);
  const helperCycles = rows.reduce((sum: number, row: any) => sum + row.chnVolSetAsmBodySourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughChnVolSetAsmReturnSourceCycles, 0);
  if (helperCycles !== 476 || contiguous !== 2935) fail("v7 timing totals changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v7", oracleProfile: "battle-scene-off", addressFree: true,
    sourceAndElf,
    frozenInputs: { acceptedV6EvidenceSha256: V6_EVIDENCE_SHA256, packetSha256: PACKET_HASHES, packetRepeatSha256: PACKET_HASHES },
    capture: { boundary: "ChnVolSetAsm entry before first ldrb", scalars: ["velocity", "signed rhythmPan", "volMR", "volML"], excluded: ["pointer", "frame", "duration", "callback identity", "result bytes"] },
    join: { key: "sourceStateDigest", rows: 113, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82, cgbChannel4Callbacks: 7, byCase,
      exactChnVolSetAsmBodyCallbacks: 7,
      chnVolSetAsmBodySourceCycleRange: { min: 68, max: 68, distinct: 1 },
      chnVolSetAsmBodySourceCycles: helperCycles,
      acceptedContiguousPrefixThroughChnVolSetAsmEntrySourceCycles: 2459,
      contiguousPrefixThroughChnVolSetAsmReturnSourceCycles: contiguous,
      nullLaterAllocationFieldsCallbacks: 7, nullOtherPostSelectionCallbacks: 75,
      nullCompleteNoteCallbacks: 82, exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    },
    branchCoverage: { observed: { rightClampBlsTaken: 7, leftClampBlsTaken: 7, clampMovExecuted: 0 }, completeObservedHelperRoutes: true, unobservedClampRoutes: null, nonzeroLfoRoutes: null },
    rows,
    closure: {
      closed: "The complete both-unclamped observed ChnVolSetAsm route through bx lr for the same seven callbacks.",
      contiguousPrefix: "2935 aggregate source cycles through ChnVolSetAsm return across the seven observed callbacks.",
      remainingDiscriminator: "Later allocation fields, clamp routes not observed here, clear_modM, nonzero-lfoDelay routes, other helper operands, 75 callbacks, complete note/glue/MPlay, service/arbitration, and construction clock remain null.",
      durationFit: false, runtimePointerIdentity: false, serviceCost: null, constructionClock: null,
    },
    verdict: "All 7/82 observed zero-lfoDelay CGB4 callbacks take both unsigned unclamped branches. The 68-cycle complete helper adds 476 cycles, extending the contiguous prefix from 2459 at entry to 2935 through return.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as any;
  const byCase = coverage.byCase as Record<CaseName, any>;
  return [
    "# Issue #55 — `ply_note` CGB-channel-4 `ChnVolSetAsm` v7", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v7.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. Path B was required: frozen v3–v6 state lacked `velocity`, signed `rhythmPan`, `volMR`, and `volML`, so a smallest address-free entry packet captured exactly those four scalars. Two fresh runs per case were byte-identical: anchor `a2f62e3b…`, LILIANA `53db7226…`, and legal-varied `406586b9…`.", "",
    `The packet joins the frozen v6 rows solely by \`sourceStateDigest\`. The same **${coverage.cgbChannel4Callbacks}/82** callbacks are covered: **0 anchor / 3 LILIANA / 4 legal-varied**. All seven derive right/left volumes at or below 255 and take both unsigned \`bls\` branches; neither clamp \`movs\` executes.`, "",
    "The complete pinned `0x082dfd08..0x082dfd38` route executes **22** Thumb halfwords, **3** taken refills (two `bls`, one `bx lr`), two IWRAM byte reads, two IWRAM byte stores, and two EWRAM byte reads. Four multiplies take 6I total: the ordinary instruction class contains 4I, so the ARM7TDMI early-termination premium is 2 cycles. Thus each observed helper costs **22×2 + 3×6 + 2×2 + 2 = 68 cycles**.", "",
    `The helper adds **${coverage.chnVolSetAsmBodySourceCycles} cycles** across seven callbacks, extending the accepted **2459-cycle** entry prefix to **${coverage.contiguousPrefixThroughChnVolSetAsmReturnSourceCycles} contiguous cycles** through helper return.`, "",
    "| case | callbacks | exact helper bodies | cycles |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => `| ${name} | ${byCase[name].callbacks} | ${byCase[name].exactHelperBodies} | ${byCase[name].exactHelperBodies * 68} |`), "",
    "Later caller fields, unobserved clamp routes, `clear_modM`, nonzero-LFO routes, other 75 callbacks, complete note/glue/MPlay (**5 exact / 108 null**), service/arbitration, and `runFactoryConstructionClock` remain null. No duration fit, pointer identity, unsupported barrier, production import, or canonical Battle-2 branch is present.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v7.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v7.md") };
  fail("usage: factory-m4a-note-body-cgb4-v7.ts [--out-dir PATH]");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true }); mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`); writeFileSync(output.doc, markdown(evidence));
}
