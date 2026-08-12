import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV16Evidence } from "./factory-m4a-note-body-cgb4-v16.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "5dca04f71abce9fd90bbe8737eb656b2d28d1e22612e0ec66b75e11ec22fdd11",
  liliana: "68fb3aa3ffe2252711528a0d17d4697ea66a6c1a13246f8091e43d0b7c7ffe31",
  "factory-varied": "e5e3ce1a0795710e921161fe4046e81627afc822fd6562c3d15a1cd233aac808",
};
const V15_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "0700a3f31e7415f672144c00f9f1d25382d9f392bbf498084e59aaa8e5a7c9b6",
  liliana: "4375e86db707db06650c008d995c5bb08927c4dbb281cb42bb9318bf56761d16",
  "factory-varied": "6c903177581e7ab06b9778db1580606c7d9ee96f0e398c177a94534f8e0ab0af",
};
const V16_EVIDENCE_SHA256 = "f9d539accd76f00a489c0854c175db91269bf853764f4a7e8fd7a88c9219ec2c";
const V16_DOC_SHA256 = "3fbb25e2cabf12f9841d7821953630512306b2fc753629c5246e2537f9a53763";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROUTE_SHA256 = "99b5bf87e6e7757d3cb855bd05d4a5abefd2f083567c8083d3050fe3606a7adf";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v17");
const V15_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v15");
const V16_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v16.json");
const V16_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v16.md");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v17.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v17.md");
const ROM_BASE = 0x0800_0000;
const ROUTE_START = 0x082d_fbd0;
const ROUTE_END = 0x082d_fbd4;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v17: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function checkedJson<T>(path: string, hash: string): T {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(`${path} changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}
function requireU8(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 0xff) fail(`${label} must be u8`);
  return value as number;
}

export type TrackLoopDecrementTiming = Readonly<{
  route: "continue-to-next-track" | "exit-after-final-track";
  r6BeforeDecrement: number;
  postDecrementR6: number;
  sequentialThumbHalfwords: 2;
  takenControlTransferRefills: 0 | 1;
  sourceCycles: 4 | 10;
  nextUnresolvedInstruction: "movs r0, MusicPlayerTrack_size" | "ldr r0, [r7, o_MusicPlayerInfo_clock]";
}>;

/** Price only `subs r6, 0x1; ble _081DD9A4`, never either successor. */
export function reduceCgb4TrackLoopDecrementTiming(state: unknown): TrackLoopDecrementTiming | null {
  if (!isRecord(state)) fail("state must be an object");
  if (Object.keys(state).sort().join(",") !== "r6BeforeDecrement") return null;
  const r6BeforeDecrement = requireU8(state.r6BeforeDecrement, "r6BeforeDecrement");
  const postDecrementR6 = r6BeforeDecrement === 0 ? 0xffff_ffff : r6BeforeDecrement - 1;
  const exit = r6BeforeDecrement <= 1;
  return Object.freeze(exit ? {
    route: "exit-after-final-track",
    r6BeforeDecrement,
    postDecrementR6,
    sequentialThumbHalfwords: 2,
    takenControlTransferRefills: 1,
    sourceCycles: 10,
    nextUnresolvedInstruction: "ldr r0, [r7, o_MusicPlayerInfo_clock]",
  } : {
    route: "continue-to-next-track",
    r6BeforeDecrement,
    postDecrementR6,
    sequentialThumbHalfwords: 2,
    takenControlTransferRefills: 0,
    sourceCycles: 4,
    nextUnresolvedInstruction: "movs r0, MusicPlayerTrack_size",
  });
}

type Packet = { schema: string; case: CaseName; oracleProfile: string; sourceFunction: string; joinKey: string; captureBoundary: string; addressFree: boolean; observations: any[] };
function stripTrackLoopState(packet: Packet): Packet {
  return {
    ...packet,
    schema: "factory-m4a-note-body-cgb4-probe/v15",
    captureBoundary: "sixth-MPlayMain-post-ply_note-mod-decision",
    observations: packet.observations.map((observation) => ({
      ...observation,
      noteCallbacks: observation.noteCallbacks?.map((callback: any) => {
        const { cgb4TrackLoopState: _, ...base } = callback;
        return base;
      }) ?? null,
    })),
  };
}
function loadPacket(name: CaseName): Packet {
  const packet = checkedJson<Packet>(join(PACKETS, `${name}.json`), PACKET_HASHES[name]);
  if (packet.schema !== "factory-m4a-note-body-cgb4-probe/v17" || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.joinKey !== "sourceStateDigest" || !packet.addressFree || packet.observations.length !== COUNTS[name]) fail(`${name} packet identity changed`);
  const v15 = checkedJson<Packet>(join(V15_PACKETS, `${name}.json`), V15_PACKET_HASHES[name]);
  if (JSON.stringify(stripTrackLoopState(packet)) !== JSON.stringify(v15)) fail(`${name} packet no longer adds cleanly to frozen v15`);
  return packet;
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256) fail("source/ELF changed");
  const sourceRoute = "_081DD998:\n\tsubs r6, 0x1\n\tble _081DD9A4\n\tmovs r0, MusicPlayerTrack_size\n";
  if (!assembly.includes(sourceRoute) || !assembly.includes("_081DD9A4:\n\tldr r0, [r7, o_MusicPlayerInfo_clock]\n")) fail("m4a_1.s track-loop decrement route changed");
  const route = rom.subarray(ROUTE_START - ROM_BASE, ROUTE_END - ROM_BASE);
  if (sha256(route) !== ROUTE_SHA256) fail("compiled track-loop decrement route changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfbd0 t _081DD998", "082dfbdc t _081DD9A4"]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1333-1343", sha256: sha256(assembly) },
    elf: { decrement: "0x082dfbd0", continuation: "0x082dfbd4", exit: "0x082dfbdc", sha256: sha256(elf) },
    compiledRegions: [{ role: "subs r6, 0x1; ble _081DD9A4", start: "0x082dfbd0", endExclusive: "0x082dfbd4", bytes: route.length, sha256: ROUTE_SHA256 }],
    timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6, iwramDataAccessPremiumCycles: 0 },
  };
}

function histogram(values: readonly number[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[String(value)] = (result[String(value)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV16 = checkedJson<any>(V16_EVIDENCE, V16_EVIDENCE_SHA256);
  const v16Doc = readFileSync(V16_DOC);
  if (sha256(v16Doc) !== V16_DOC_SHA256) fail("v16 doc changed");
  if (JSON.stringify(makeV16Evidence()) !== JSON.stringify(frozenV16)) fail("accepted v16 does not regenerate byte-for-byte");
  const sourceAndElf = assertSourceElfRom();
  const callbacks = CASES.flatMap((name) => loadPacket(name).observations.flatMap((observation: any) =>
    (observation.noteCallbacks ?? []).filter((callback: any) => callback.toneType === 12).map((callback: any) => ({ ...callback, sourceStateDigest: observation.sourceStateDigest }))));
  if (callbacks.length !== 7) fail("CGB4 callback count changed");
  const byDigest = new Map<string, any>();
  for (const callback of callbacks) {
    if (typeof callback.sourceStateDigest !== "string" || byDigest.has(callback.sourceStateDigest)) fail("packet source-state join became ambiguous");
    byDigest.set(callback.sourceStateDigest, callback);
  }
  const rows = frozenV16.rows.map((prior: any) => {
    const callback = byDigest.get(prior.sourceStateDigest);
    if (!callback || !isRecord(callback.cgb4TrackLoopState)) fail("packet missed frozen v16 row");
    const timing = reduceCgb4TrackLoopDecrementTiming(callback.cgb4TrackLoopState);
    if (!timing) fail("observed track-loop route became unresolved");
    return {
      ...prior,
      r6BeforeDecrement: timing.r6BeforeDecrement,
      postDecrementR6: timing.postDecrementR6,
      trackLoopRoute: timing.route,
      postV16RouteSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughTrackLoopDecrementSourceCycles: prior.contiguousPrefixThroughTrackLoopExitMovesSourceCycles + timing.sourceCycles,
      nextTrackLoopSuccessorInstruction: timing.nextUnresolvedInstruction,
    };
  });
  if (byDigest.size !== rows.length) fail("packet contains unjoined CGB4 row");
  const byCase = Object.fromEntries(CASES.map((name) => [name, {
    callbacks: rows.filter((row: any) => row.case === name).length,
    sourceCycles: rows.filter((row: any) => row.case === name).reduce((sum: number, row: any) => sum + row.postV16RouteSourceCycles, 0),
  }]));
  for (const name of CASES) if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name]) fail(`${name} census changed`);
  const added = rows.reduce((sum: number, row: any) => sum + row.postV16RouteSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughTrackLoopDecrementSourceCycles, 0);
  const continuationRows = rows.filter((row: any) => row.trackLoopRoute === "continue-to-next-track").length;
  const exitRows = rows.filter((row: any) => row.trackLoopRoute === "exit-after-final-track").length;
  if (added !== 28 || contiguous !== 5394 || continuationRows !== 7 || exitRows !== 0) fail("v17 timing totals changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v17",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf,
    frozenInputs: { acceptedV16EvidenceSha256: V16_EVIDENCE_SHA256, acceptedV16DocSha256: V16_DOC_SHA256, v16RegeneratesByteForByte: true, packetSha256: PACKET_HASHES, packetRepeatSha256: PACKET_HASHES },
    capture: { boundary: "r6 immediately before subs r6, 0x1 after each observed CGB4 post-note route", scalars: ["r6BeforeDecrement"], excluded: ["pointer", "runtime address", "frame", "duration", "MusicPlayerInfo.trackCount", "track-count inference from trackIndex", "movs r0, MusicPlayerTrack_size", "ldr r0, [r7, o_MusicPlayerInfo_clock]", "later track-loop work", "other 75 callbacks"] },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      r6BeforeDecrementHistogram: histogram(rows.map((row: any) => row.r6BeforeDecrement)),
      postDecrementR6Histogram: histogram(rows.map((row: any) => row.postDecrementR6)),
      continuationRouteRows: continuationRows,
      exitRouteRows: exitRows,
      postV16RouteSourceCycles: added,
      acceptedContiguousPrefixThroughTrackLoopExitMovesSourceCycles: 5366,
      contiguousPrefixThroughTrackLoopDecrementSourceCycles: contiguous,
      sequentialThumbHalfwords: 14,
      takenControlTransferRefills: 0,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The captured r6 values immediately before subs r6, 0x1 and their seven observed not-taken ble routes.",
      contiguousPrefix: "5394 aggregate source cycles through subs r6, 0x1; ble _081DD9A4 across the seven callbacks (5366 frozen v16 + 28 v17).",
      remainingDiscriminator: "Stop before movs r0, MusicPlayerTrack_size on the observed continuation; ldr r0, [r7, o_MusicPlayerInfo_clock] is likewise excluded on the unobserved exit.",
      r6Inferred: false,
      trackCountInferredFromTrackIndex: false,
      durationFit: false,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Twice-fresh address-free packets prove r6=3 for four rows and r6=2 for three at the exact decrement boundary; all seven execute the four-cycle not-taken route and stop before the continuation successor.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const c: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 track-loop decrement and decision v17", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v17.ts`; do not hand-edit.", "",
    "Battle Scene OFF, additive evidence only. v17 preserves frozen v16 evidence and report byte-for-byte, and joins solely by `sourceStateDigest`. Two fresh address-free packet sets capture exactly one new scalar — live `r6BeforeDecrement` — at the pipelined `subs r6, 0x1` boundary for the same **7/82** callbacks (**0 anchor / 3 LILIANA / 4 legal-varied**). Packet SHA256: anchor `5dca04f7…`, LILIANA `68fb3aa3…`, legal-varied `e5e3ce1a…`; each independent repeat is byte-identical.", "",
    "The captured `r6` values are `3` for four rows and `2` for three. Source applies the immediate subtraction, producing positive `2`/`1`; every observed `ble _081DD9A4` is therefore not taken. This is a captured register fact, not a track-count relation inferred from `trackIndex`.", "",
    "Source, ELF symbols, and the exact four compiled bytes `01 3e 03 dd` at `0x082dfbd0..0x082dfbd4` guard only `subs r6, 0x1; ble _081DD9A4`. Each observed route is two sequential Thumb halfwords with no taken-flow refill: **2×2 = 4 cycles each / 28 aggregate**. The generic reducer also prices a captured taken route at **10 cycles** (the same two halfwords plus a 6-cycle refill), but no exit route is observed in this frozen seven-row slice.", "",
    `The contiguous boundary advances from **5,366** to **${c.contiguousPrefixThroughTrackLoopDecrementSourceCycles} aggregate cycles**. It stops before \`movs r0, MusicPlayerTrack_size\` on the observed continuation; \`ldr r0, [r7, o_MusicPlayerInfo_clock]\` on the unobserved exit is likewise excluded.`, "",
    "The later loop body, other 75 note callbacks, complete MPlay totals (**5 exact / 108 null**), service/arbitration, construction-clock wiring, production, presentation, animation/Rust, and canonical Battle-2 work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v17.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v17.md") };
  fail("usage: factory-m4a-note-body-cgb4-v17.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
