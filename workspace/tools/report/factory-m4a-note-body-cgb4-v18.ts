import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV17Evidence } from "./factory-m4a-note-body-cgb4-v17.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const CGB4_COUNTS: Record<CaseName, number> = { anchor: 0, liliana: 3, "factory-varied": 4 };
const V17_EVIDENCE_SHA256 = "e4ff5796f16be7304f7deb35daaf1a6aea753332d6ae450b08e7dfce5277d34a";
const V17_DOC_SHA256 = "884ad63d4b51300ea76d316943c927b4e91fbc10f5e025017632f3df93c20649";
const V17_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "5dca04f71abce9fd90bbe8737eb656b2d28d1e22612e0ec66b75e11ec22fdd11",
  liliana: "68fb3aa3ffe2252711528a0d17d4697ea66a6c1a13246f8091e43d0b7c7ffe31",
  "factory-varied": "e5e3ce1a0795710e921161fe4046e81627afc822fd6562c3d15a1cd233aac808",
};
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROUTE_SHA256 = "86e616250404bcccacf8a51a7a2bbac36d5eb6a5dbb12cfdd075dba82993efd2";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V17_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v17.json");
const V17_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v17.md");
const V17_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-v17");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v18.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v18.md");
const ROM_BASE = 0x0800_0000;
const ROUTE_START = 0x082d_fbd4;
const ROUTE_END = 0x082d_fbdc;
const ROUTE_BYTES = Buffer.from([0x50, 0x20, 0x2d, 0x18, 0x5b, 0x00, 0x6b, 0xe7]);

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v18: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function checkedBytes(path: string, hash: string): Buffer {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(`${path} changed`);
  return bytes;
}
function checkedJson<T>(path: string, hash: string): T {
  return JSON.parse(checkedBytes(path, hash).toString("utf8")) as T;
}

export type TrackLoopContinuationTiming = Readonly<{
  route: "advance-track-and-reenter-loop";
  sequentialThumbHalfwords: 4;
  takenControlTransferRefills: 1;
  sourceCycles: 14;
  nextUnresolvedInstruction: "ldrb r0, [r5, o_MusicPlayerTrack_flags]";
}>;

/** Price only v17's fixed continuation successor body, never the loop-head load. */
export function reduceCgb4TrackLoopContinuationTiming(): TrackLoopContinuationTiming {
  return Object.freeze({
    route: "advance-track-and-reenter-loop",
    sequentialThumbHalfwords: 4,
    takenControlTransferRefills: 1,
    sourceCycles: 14,
    nextUnresolvedInstruction: "ldrb r0, [r5, o_MusicPlayerTrack_flags]",
  });
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256) fail("source/ELF changed");
  const sourceRoute = "_081DD998:\n\tsubs r6, 0x1\n\tble _081DD9A4\n\tmovs r0, MusicPlayerTrack_size\n\tadds r5, r0\n\tlsls r3, 1\n\tb _081DD87C\n_081DD9A4:\n";
  if (!assembly.includes(sourceRoute)) fail("m4a_1.s continuation body changed");
  if (!assembly.includes("_081DD87C:\n\tldrb r0, [r5, o_MusicPlayerTrack_flags]\n")) fail("m4a_1.s loop-head boundary changed");
  const route = rom.subarray(ROUTE_START - ROM_BASE, ROUTE_END - ROM_BASE);
  if (!route.equals(ROUTE_BYTES) || sha256(route) !== ROUTE_SHA256) fail("compiled continuation body changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfab4 t _081DD87C", "082dfbd0 t _081DD998", "082dfbdc t _081DD9A4"]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1334-1342", sha256: sha256(assembly) },
    elf: { loopHead: "0x082dfab4", predecessor: "0x082dfbd0", continuationStart: "0x082dfbd4", exit: "0x082dfbdc", sha256: sha256(elf) },
    compiledRegions: [{ role: "movs r0, MusicPlayerTrack_size; adds r5, r0; lsls r3, 1; b _081DD87C", start: "0x082dfbd4", endExclusive: "0x082dfbdc", bytes: route.length, sha256: ROUTE_SHA256 }],
    timingClasses: { sequentialThumbHalfwordCycles: 2, takenControlTransferRefillCycles: 6, iwramDataAccessPremiumCycles: 0 },
  };
}

function assertFrozenV17Packets(): void {
  for (const name of CASES) checkedBytes(join(V17_PACKETS, `${name}.json`), V17_PACKET_HASHES[name]);
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV17 = checkedJson<any>(V17_EVIDENCE, V17_EVIDENCE_SHA256);
  checkedBytes(V17_DOC, V17_DOC_SHA256);
  assertFrozenV17Packets();
  if (JSON.stringify(makeV17Evidence()) !== JSON.stringify(frozenV17)) fail("accepted v17 does not regenerate byte-for-byte");
  if (!Array.isArray(frozenV17.rows) || frozenV17.rows.length !== 7) fail("frozen v17 row count changed");
  const timing = reduceCgb4TrackLoopContinuationTiming();
  const digests = new Set<string>();
  const rows = frozenV17.rows.map((prior: any) => {
    if (typeof prior.sourceStateDigest !== "string" || digests.has(prior.sourceStateDigest)) fail("frozen v17 source-state join is invalid");
    if (prior.trackLoopRoute !== "continue-to-next-track" || prior.nextTrackLoopSuccessorInstruction !== "movs r0, MusicPlayerTrack_size") fail("frozen v17 row is not the observed continuation");
    digests.add(prior.sourceStateDigest);
    return {
      ...prior,
      postV17ContinuationSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughTrackLoopContinuationSourceCycles: prior.contiguousPrefixThroughTrackLoopDecrementSourceCycles + timing.sourceCycles,
      nextTrackLoopBodyInstruction: timing.nextUnresolvedInstruction,
      unobservedV17ExitSuccessorSourceCycles: null,
    };
  });
  const added = rows.reduce((sum: number, row: any) => sum + row.postV17ContinuationSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughTrackLoopContinuationSourceCycles, 0);
  if (added !== 98 || contiguous !== 5492) fail("v18 timing totals changed");
  const byCase = Object.fromEntries(CASES.map((name) => [name, {
    callbacks: rows.filter((row: any) => row.case === name).length,
    sourceCycles: rows.filter((row: any) => row.case === name).reduce((sum: number, row: any) => sum + row.postV17ContinuationSourceCycles, 0),
  }]));
  for (const name of CASES) if ((byCase[name] as any).callbacks !== CGB4_COUNTS[name]) fail(`${name} census changed`);
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v18",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: {
      acceptedV17EvidenceSha256: V17_EVIDENCE_SHA256,
      acceptedV17DocSha256: V17_DOC_SHA256,
      acceptedV17PacketSha256: V17_PACKET_HASHES,
      v17RegeneratesByteForByte: true,
      v17EvidenceAndReportRetainedByteForByte: true,
      v17PacketsRetainedByteForByte: true,
    },
    capture: {
      boundary: "none: source-only fixed continuation body after v17's seven observed not-taken ble routes",
      scalars: [],
      excluded: ["oracle data", "next-track flags", "next-track identity", "MusicPlayerInfo.trackCount", "track-count inference from trackIndex", "v17 exit successor", "ldrb r0, [r5, o_MusicPlayerTrack_flags]", "later track-loop body", "other 75 callbacks"],
    },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      continuationRouteRows: 7,
      exitRouteRows: 0,
      postV17ContinuationSourceCyclesPerCallback: timing.sourceCycles,
      postV17ContinuationSourceCycles: added,
      acceptedContiguousPrefixThroughTrackLoopDecrementSourceCycles: 5394,
      contiguousPrefixThroughTrackLoopContinuationSourceCycles: contiguous,
      sequentialThumbHalfwords: rows.length * timing.sequentialThumbHalfwords,
      takenControlTransferRefills: rows.length * timing.takenControlTransferRefills,
      unobservedV17ExitSuccessorSourceCycles: null,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The fixed four-instruction continuation body after v17's observed not-taken ble route, through the branch back to _081DD87C.",
      contiguousPrefix: "5492 aggregate source cycles through movs r0, MusicPlayerTrack_size; adds r5, r0; lsls r3, 1; b _081DD87C across the seven observed continuation rows (5394 frozen v17 + 98 v18).",
      remainingDiscriminator: "Stop before _081DD87C's first ldrb r0, [r5, o_MusicPlayerTrack_flags]; next-track flags, identity, trackCount, and later loop body are unobserved and unpriced.",
      exitSuccessorSourceCycles: null,
      oracleCapture: false,
      nextTrackFlagsCaptured: false,
      trackIdentityInferred: false,
      trackCountInferred: false,
      durationFit: false,
      runtimePointerIdentity: false,
      runtimeAddressLookup: false,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Frozen v17 plus source/ELF/exact-ROM guards close only the seven fixed continuation bodies; the unobserved exit successor remains null and the loop head is not entered.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 observed continuation body v18", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v18.ts`; do not hand-edit.", "",
    "Battle Scene OFF contract, source-only additive evidence. v18 preserves frozen v17 evidence, report, and all three address-free packets byte-for-byte, verifies v17 regeneration, and joins only its seven `sourceStateDigest` rows (**0 anchor / 3 LILIANA / 4 legal-varied**). It captures no oracle data.", "",
    "Every frozen v17 row is the observed not-taken continuation successor. Source, ELF symbols, and exact ROM bytes `50 20 2d 18 5b 00 6b e7` at `0x082dfbd4..0x082dfbdc` close exactly `movs r0, MusicPlayerTrack_size; adds r5, r0; lsls r3, 1; b _081DD87C`. Four sequential Thumb halfwords plus the final taken branch refill are **4×2 + 6 = 14 cycles per row / 98 aggregate**.", "",
    `The contiguous boundary advances from **5,394** to **${coverage.contiguousPrefixThroughTrackLoopContinuationSourceCycles} aggregate cycles**. It stops before _081DD87C's first \`ldrb r0, [r5, o_MusicPlayerTrack_flags]\`; next-track flags, identity, trackCount, and later loop body stay unobserved. The v17 exit successor remains **null**.`, "",
    "The other 75 note callbacks, complete MPlay totals (**5 exact / 108 null**), service/arbitration, construction-clock wiring, production, presentation, animation/Rust, and canonical Battle-2 work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v18.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v18.md") };
  fail("usage: factory-m4a-note-body-cgb4-v18.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
