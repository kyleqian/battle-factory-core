import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeV15Evidence } from "./factory-m4a-note-body-cgb4-v15.ts";

const V15_EVIDENCE_SHA256 = "28ec38e9339a19d576d77f6d0e2f809858757f8dcf23d6439b28543167c625c8";
const V15_DOC_SHA256 = "62038919910f00066dbd2180b14e74ed1bee236e98c8808b540aa50c0e4a653b";
const M4A1_SHA256 = "9980a795dc659663b237ee5000e3b220b5145492db4d463b12f73a473547838c";
const ELF_SHA256 = "cd28ec67b390f42bdb6f40820caf496ee2326c30149d67dd402fdd3930f0097b";
const ROUTE_SHA256 = "ad1569b5c2595cf14bd35576d2aa6a02c2da945075275510d60cf140d4a9ed1e";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V15_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v15.json");
const V15_DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v15.md");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-note-body-cgb4-evidence-v16.json");
const DOC = join(ROOT, "docs/issue55-m4a-note-body-cgb4-v16.md");
const ROM_BASE = 0x0800_0000;
const ROUTE_START = 0x082d_fbcc;
const ROUTE_END = 0x082d_fbd0;

function fail(message: string): never { throw new Error(`factory-m4a-note-body-cgb4-v16: ${message}`); }
function sha256(bytes: Buffer | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function checkedJson<T>(path: string, hash: string): T {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== hash) fail(`${path} changed`);
  return JSON.parse(bytes.toString("utf8")) as T;
}

export type TrackLoopExitMovesTiming = Readonly<{
  route: "restore-track-loop-registers";
  sequentialThumbHalfwords: 2;
  sourceCycles: 4;
  nextUnresolvedInstruction: "subs r6, 0x1";
}>;

/** Count only the fixed register-to-register pair at _081DD994. */
export function reduceCgb4TrackLoopExitMovesTiming(): TrackLoopExitMovesTiming {
  return Object.freeze({
    route: "restore-track-loop-registers",
    sequentialThumbHalfwords: 2,
    sourceCycles: 4,
    nextUnresolvedInstruction: "subs r6, 0x1",
  });
}

function assertSourceElfRom(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const elfPath = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
  const elf = readFileSync(elfPath);
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (sha256(assembly) !== M4A1_SHA256 || sha256(elf) !== ELF_SHA256) fail("source/ELF changed");
  const start = assembly.indexOf("_081DD994:\n\tmov r3, r10\n\tmov r4, r11\n_081DD998:\n\tsubs r6, 0x1");
  if (start < 0) fail("m4a_1.s track-loop exit pair changed");
  const route = rom.subarray(ROUTE_START - ROM_BASE, ROUTE_END - ROM_BASE);
  if (sha256(route) !== ROUTE_SHA256) fail("compiled track-loop exit pair changed");
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", elfPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const symbol of ["082dfbcc t _081DD994", "082dfbd0 t _081DD998"]) if (!symbols.includes(symbol)) fail(`ELF symbol ${symbol} changed`);
  return {
    source: { path: "reference/pokeemerald/src/m4a_1.s", lines: "1331-1335", sha256: sha256(assembly) },
    elf: { start: "0x082dfbcc", stop: "0x082dfbd0", sha256: sha256(elf) },
    compiledRegions: [{ role: "mov r3, sl; mov r4, fp", start: "0x082dfbcc", endExclusive: "0x082dfbd0", bytes: route.length, sha256: ROUTE_SHA256 }],
    timingClasses: { sequentialThumbHalfwordCycles: 2 },
  };
}

export function makeEvidence(): Record<string, unknown> {
  const frozenV15 = checkedJson<any>(V15_EVIDENCE, V15_EVIDENCE_SHA256);
  const v15Doc = readFileSync(V15_DOC);
  if (sha256(v15Doc) !== V15_DOC_SHA256) fail("v15 doc changed");
  if (JSON.stringify(makeV15Evidence()) !== JSON.stringify(frozenV15)) fail("accepted v15 does not regenerate byte-for-byte");
  const timing = reduceCgb4TrackLoopExitMovesTiming();
  if (!Array.isArray(frozenV15.rows) || frozenV15.rows.length !== 7) fail("frozen v15 row count changed");
  const digests = new Set<string>();
  const rows = frozenV15.rows.map((prior: any) => {
    if (typeof prior.sourceStateDigest !== "string" || digests.has(prior.sourceStateDigest)) fail("frozen v15 source-state join is invalid");
    digests.add(prior.sourceStateDigest);
    return {
      ...prior,
      postV15RouteSourceCycles: timing.sourceCycles,
      contiguousPrefixThroughTrackLoopExitMovesSourceCycles: prior.contiguousPrefixThroughModDecisionSourceCycles + timing.sourceCycles,
      nextTrackLoopCount: null,
    };
  });
  const added = rows.reduce((sum: number, row: any) => sum + row.postV15RouteSourceCycles, 0);
  const contiguous = rows.reduce((sum: number, row: any) => sum + row.contiguousPrefixThroughTrackLoopExitMovesSourceCycles, 0);
  if (added !== 28 || contiguous !== 5366) fail("v16 timing totals changed");
  const byCase = Object.fromEntries(["anchor", "liliana", "factory-varied"].map((name) => [name, {
    callbacks: rows.filter((row: any) => row.case === name).length,
    sourceCycles: rows.filter((row: any) => row.case === name).length * timing.sourceCycles,
  }]));
  if ((byCase as any).anchor.callbacks !== 0 || (byCase as any).liliana.callbacks !== 3 || (byCase as any)["factory-varied"].callbacks !== 4) fail("frozen v15 census changed");
  return {
    schema: "factory-m4a-note-body-cgb4-evidence/v16",
    oracleProfile: "battle-scene-off",
    addressFree: true,
    sourceAndElf: assertSourceElfRom(),
    frozenInputs: { acceptedV15EvidenceSha256: V15_EVIDENCE_SHA256, acceptedV15DocSha256: V15_DOC_SHA256, v15RegeneratesByteForByte: true },
    capture: { boundary: "none: source-only fixed instructions at _081DD994", scalars: [], excluded: ["oracle data", "r6", "track count", "subs r6, 0x1", "later track-loop work", "other 75 callbacks"] },
    join: { key: "sourceStateDigest", rows: 7, cgb4Rows: 7, ambiguousRows: 0, addressFree: true },
    coverage: {
      observedNoteCallbacks: 82,
      cgbChannel4Callbacks: 7,
      byCase,
      postV15RouteSourceCyclesPerCallback: 4,
      postV15RouteSourceCycles: added,
      acceptedContiguousPrefixThroughModDecisionSourceCycles: 5338,
      contiguousPrefixThroughTrackLoopExitMovesSourceCycles: contiguous,
      sequentialThumbHalfwords: 14,
      nullOtherPostSelectionCallbacks: 75,
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The fixed mov-r3-from-sl then mov-r4-from-fp pair at _081DD994 for the frozen seven rows.",
      contiguousPrefix: "5366 aggregate source cycles through the two register moves (5338 frozen v15 + 28 v16).",
      remainingDiscriminator: "Stop before subs r6, 0x1; r6 and track count are unobserved and unpriced.",
      oracleCapture: false,
      r6Inferred: false,
      durationFit: false,
      serviceCost: null,
      constructionClock: null,
      unsupportedBarrierAdded: false,
    },
    verdict: "Frozen v15 plus source/ELF/ROM close only the fixed two-instruction register-move pair and stop before the track-count decrement.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage: any = evidence.coverage;
  return [
    "# Issue #55 — CGB4 track-loop exit register moves v16", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-note-body-cgb4-v16.ts`; do not hand-edit.", "",
    "Battle Scene OFF contract, source-only additive evidence. v16 preserves frozen v15 byte-for-byte and joins only its seven `sourceStateDigest` rows (**0 anchor / 3 LILIANA / 4 legal-varied**). It captures no oracle data and does not read or infer `r6` or a track count.", "",
    "Source, ELF symbols, and the exact four ROM bytes `53 46 5c 46` at `0x082dfbcc..0x082dfbd0` close only `mov r3, sl` followed by `mov r4, fp`. These are two sequential Thumb halfwords: **4 cycles per row / 28 aggregate**.", "",
    `The contiguous boundary advances from **5,338** to **${coverage.contiguousPrefixThroughTrackLoopExitMovesSourceCycles} aggregate cycles**. It stops before \`subs r6, 0x1\`; that decrement, loop continuation/exit, later callbacks, and track-count reasoning remain null.`, "",
    "The other 75 note callbacks, complete MPlay totals (**5 exact / 108 null**), service/arbitration, construction-clock wiring, production, animation/Rust, and canonical Battle-2 work remain untouched.", "",
  ].join("\n");
}

function destinations(args: string[]): { json: string; doc: string } {
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-note-body-cgb4-evidence-v16.json"), doc: join(resolve(args[1]!), "issue55-m4a-note-body-cgb4-v16.md") };
  fail("usage: factory-m4a-note-body-cgb4-v16.ts [--out-dir PATH]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = destinations(process.argv.slice(2));
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  const evidence = makeEvidence();
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
}
