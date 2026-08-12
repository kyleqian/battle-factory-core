import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeWaitLfoEvidence } from "./factory-m4a-wait-lfo-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "ccaf8b53186aac1bf0e35bfc9615cece944fb5791dbdefaa30792d01f73a91c4",
  liliana: "eb925d3a88f16a0aad7845a65b2c87e6191fdfebf0b731e6bf87362bbcf747b2",
  "factory-varied": "c22d9302b328b8a589560e79024c13bfcf62e9ac9f1a76c0e10525b7cec4d989",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-pend-v1");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-pend-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-pend-v1.md");
const ROM_BASE = 0x0800_0000;
const PEND_START = 0x082d_f8c8;
const PEND_END = 0x082d_f8dc;
const PATT_START = 0x082d_f8ac;
const PATT_END = 0x082d_f8c6;
const THUMB_FETCH_CYCLES = 2;
const PIPELINE_REFILL_CYCLES = 6;
const EWRAM_WORD_PREMIUM_CYCLES = 2;
const SONG_ROLE = /^battle-factory-bgm-track-[1-9]$/;

export type PendCallback = Readonly<{
  trackIndex: number;
  patternLevel: number;
  returnTarget: null | Readonly<{ role: string; offset: number }>;
}>;
type Observation = { sourceStateDigest: string; callbackFamilies: string[] | null; pendCallbacks: PendCallback[] | null };
type Packet = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; observations: Observation[] };
type PriorRow = { sourceStateDigest: string; case: CaseName; passCount: number; knownGateAndWaitLfoSourceCycles: number; completeMPlaySourceCycles: number | null };

export type PendTiming = Readonly<{
  route: "empty-pattern-stack" | "pop-pattern-return";
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  ewramWordAccesses: number;
  ewramWordAccessPremiumCycles: number;
  cycles: number;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-pend-v1: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireU8(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be u8`);
  return value;
}

/** Instruction-count the complete compiled ply_pend callback body. */
export function reduceMPlayPendTiming(entry: PendCallback): PendTiming {
  if (!Number.isInteger(entry.trackIndex) || entry.trackIndex < 0 || entry.trackIndex > 9) fail("trackIndex must be 0..9");
  const patternLevel = requireU8(entry.patternLevel, "patternLevel");
  if (patternLevel > 3) fail("patternLevel exceeds the three-slot source stack");
  if (patternLevel === 0) {
    if (entry.returnTarget !== null) fail("empty pattern stack cannot carry a return target");
    const sequentialThumbHalfwords = 4; // ldrb, cmp, taken beq, bx lr
    const pipelineRefills = 2;
    return Object.freeze({
      route: "empty-pattern-stack",
      sequentialThumbHalfwords,
      pipelineRefills,
      ewramWordAccesses: 0,
      ewramWordAccessPremiumCycles: 0,
      cycles: sequentialThumbHalfwords * THUMB_FETCH_CYCLES + pipelineRefills * PIPELINE_REFILL_CYCLES,
    });
  }
  if (!entry.returnTarget || !SONG_ROLE.test(entry.returnTarget.role)
    || !Number.isInteger(entry.returnTarget.offset) || entry.returnTarget.offset < 0) {
    fail("nonempty pattern stack requires a normalized song return target");
  }
  const sequentialThumbHalfwords = 10;
  const pipelineRefills = 1; // bx lr; the zero-test branch falls through
  const ewramWordAccesses = 2; // patternStack load and cmdPtr store
  const ewramWordAccessPremiumCycles = ewramWordAccesses * EWRAM_WORD_PREMIUM_CYCLES;
  return Object.freeze({
    route: "pop-pattern-return",
    sequentialThumbHalfwords,
    pipelineRefills,
    ewramWordAccesses,
    ewramWordAccessPremiumCycles,
    cycles: sequentialThumbHalfwords * THUMB_FETCH_CYCLES + pipelineRefills * PIPELINE_REFILL_CYCLES + ewramWordAccessPremiumCycles,
  });
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of ["ply_pend:", "ldrb r2, [r1, o_MusicPlayerTrack_patternLevel]", "ldr r2, [r3, o_MusicPlayerTrack_patternStack]", "str r2, [r1, o_MusicPlayerTrack_cmdPtr]", "ply_pend_done:"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const compiledHash = sha256(romSlice(PEND_START, PEND_END));
  if (compiledHash !== "ef262893b794449af48fcfa195da908bfb53beaa56c74bcf0b4da5ca3747a84b") fail("ply_pend ELF/ROM bytes changed");
  const tiedPeerHash = sha256(romSlice(PATT_START, PATT_END));
  if (tiedPeerHash !== "fe24bd249877601e9cbeb96dd62edb2b1e5d24a3abe6dc020b2136b80fa40856") fail("ply_patt ELF/ROM bytes changed");
  return {
    source: [{ path: "reference/pokeemerald/src/m4a_1.s", lines: "869-882", sha256: sha256(assembly) }],
    compiledRegions: [
      { role: "ply_pend callback", start: PEND_START, end: PEND_END, bytes: PEND_END - PEND_START, sha256: compiledHash },
      { role: "tied one-call selection peer ply_patt", start: PATT_START, end: PATT_END, bytes: PATT_END - PATT_START, sha256: tiedPeerHash, priced: false },
    ],
    timingClasses: { sequentialRomThumbHalfword: THUMB_FETCH_CYCLES, takenPipelineRefillPremium: PIPELINE_REFILL_CYCLES, alignedEwramWordPremium: EWRAM_WORD_PREMIUM_CYCLES },
  };
}

function loadPacket(name: CaseName): Packet {
  const bytes = readFileSync(join(PACKETS, `${name}.json`));
  if (sha256(bytes) !== PACKET_HASHES[name]) fail(`${name} packet hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as Packet;
  if (packet.schema !== "factory-m4a-pend-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} packet identity changed`);
  if (packet.captureBoundary !== "sixth-MPlayMain-ply_pend-entry" || packet.observations.length !== COUNTS[name]) fail(`${name} boundary/count changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const prior = makeWaitLfoEvidence() as { rows: PriorRow[] };
  const priorByDigest = new Map(prior.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; callbackRows: number; callbacks: number }> = {};
  const callbackTimings: PendTiming[] = [];
  const familyCounts: Record<string, number> = {};

  for (const packet of CASES.map(loadPacket)) {
    const summary = { rows: packet.observations.length, onePass: 0, zeroPass: 0, callbackRows: 0, callbacks: 0 };
    for (const observation of packet.observations) {
      const priorRow = priorByDigest.get(observation.sourceStateDigest);
      if (!priorRow || priorRow.case !== packet.case) fail(`${packet.case} row does not join wait/LFO evidence`);
      if (priorRow.passCount === 0) {
        if (observation.callbackFamilies !== null || observation.pendCallbacks !== null || priorRow.completeMPlaySourceCycles !== 864) fail(`${packet.case} zero-pass row reached ply_pend capture`);
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 0, pendCallbackCount: 0, pendSourceCycles: 0, knownComponentsSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      if (observation.callbackFamilies === null || observation.pendCallbacks === null) fail(`${packet.case} one-pass row lacks ply_pend capture`);
      for (const family of observation.callbackFamilies) familyCounts[family] = (familyCounts[family] ?? 0) + 1;
      const timings = observation.pendCallbacks.map(reduceMPlayPendTiming);
      callbackTimings.push(...timings);
      const pendSourceCycles = timings.reduce((sum, timing) => sum + timing.cycles, 0);
      summary.callbacks += timings.length;
      if (timings.length > 0) summary.callbackRows += 1;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest,
        case: packet.case,
        passCount: 1,
        pendCallbackCount: timings.length,
        pendRoutes: timings.map((timing) => timing.route),
        pendSourceCycles,
        knownGateAndWaitLfoSourceCycles: priorRow.knownGateAndWaitLfoSourceCycles,
        knownComponentsSourceCycles: priorRow.knownGateAndWaitLfoSourceCycles + pendSourceCycles,
        completeMPlaySourceCycles: null,
      });
    }
    byCase[packet.case] = summary;
  }

  const onePass = rows.filter((row) => row.passCount === 1);
  const zeroPass = rows.filter((row) => row.passCount === 0);
  const callbackRows = onePass.filter((row) => (row.pendCallbackCount as number) > 0);
  if (rows.length !== 113 || onePass.length !== 108 || zeroPass.length !== 5 || callbackRows.length !== 1 || callbackTimings.length !== 1) fail("coverage partition changed");
  if (callbackTimings[0]!.route !== "empty-pattern-stack" || callbackTimings[0]!.cycles !== 20) fail("observed ply_pend route changed");
  const expectedFamilyCounts = { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 };
  if (JSON.stringify(Object.fromEntries(Object.entries(familyCounts).sort(([a], [b]) => a.localeCompare(b)))) !== JSON.stringify(expectedFamilyCounts)) fail("callback-family selection census changed");
  const familyCycles = onePass.map((row) => row.pendSourceCycles as number);
  const knownCycles = onePass.map((row) => row.knownComponentsSourceCycles as number);
  return {
    schema: "factory-m4a-pend-evidence/v1",
    oracleProfile: "battle-scene-off",
    sourceAndElf,
    capture: { boundary: "ply_pend entry", exactCaller: "MPlayMain._081DD90C jump-table dispatch", runtimeCompiledPc: "0x082df8ca", state: "trackIndex plus patternLevel and normalized return-target role/offset", freshRunsPerCase: 2, repeatability: "byte-identical full packet" },
    frozenInputs: { packets: PACKET_HASHES, waitLfoEvidence: "tests/fixtures/factory-m4a-wait-lfo-evidence-v1.json" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase,
      rowsWithPendCallbacks: callbackRows.length,
      pendCallbacks: callbackTimings.length,
      callbackFamilySelectionCensus: expectedFamilyCounts,
      callbackRouteCounts: { "empty-pattern-stack": 1, "pop-pattern-return": 0 },
      exactPendRowsWithinOnePass: onePass.length,
      nullPendRowsWithinOnePass: 0,
      exactPendSourceCycleRange: { min: Math.min(...familyCycles), max: Math.max(...familyCycles), distinct: new Set(familyCycles).size },
      knownComponentSourceCycleRange: { min: Math.min(...knownCycles), max: Math.max(...knownCycles), distinct: new Set(knownCycles).size },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The sole ply_pend callback in the 108 one-pass rows is source-timed from its exact entry state; rows without this callback contribute zero to this family.",
      remainingDiscriminator: "MPlayMain command decode/jump-table dispatch plus ply_patt, ply_voice, ply_vol, ply_pan, ply_bend, and note callback families remain unresolved.",
      durationFit: false,
      pointerIdentityTable: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "The ply_pend callback family is source-exact for 1/1 callbacks and 108/108 one-pass rows; complete MPlay costs remain 5 exact / 108 null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as {
    byCase: Record<string, { onePass: number; zeroPass: number; callbackRows: number; callbacks: number }>;
    pendCallbacks: number;
    callbackFamilySelectionCensus: Record<string, number>;
    knownComponentSourceCycleRange: { min: number; max: number; distinct: number };
  };
  return [
    "# Issue #55 — sixth-MPlayMain `ply_pend` callback v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-pend-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. The exact compiled `ply_pend` entry retains only address-free track index, `patternLevel`, and (when nonzero) the pattern-return source role/offset.", "",
    `The exact jump-table-entry census is \`${JSON.stringify(coverage.callbackFamilySelectionCensus)}\`. \`ply_patt\` and \`ply_pend\` tie at one callback; \`ply_pend\` is the smaller compiled family (20-byte body versus the pinned 26-byte \`ply_patt\` body), so it is the selected increment. Anchor track 6 enters with \`patternLevel == 0\`; LILIANA and legal-varied contain none. The callback therefore takes the complete empty-stack route at **20 cycles**. Rows without \`ply_pend\` contribute exactly zero, closing this family for **108/108** one-pass rows.`, "",
    "| case | one pass | zero pass | rows with `ply_pend` | callbacks |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.byCase[name]!; return `| ${name} | ${row.onePass} | ${row.zeroPass} | ${row.callbackRows} | ${row.callbacks} |`; }), "",
    "The reducer pins the complete 20-byte ELF body at `0x082df8c8..0x082df8dc`. The observed empty-stack path is four WS0 Thumb halfwords plus the taken zero-test and `bx lr` refills. Its source-general nonempty route is also instruction-counted from a normalized pattern target (10 halfwords, one refill, two aligned EWRAM word premiums = 30 cycles), but is not claimed as observed here.", "",
    `Joined with channel gate and wait/LFO, known per-pass components now total **${coverage.knownComponentSourceCycleRange.min}–${coverage.knownComponentSourceCycleRange.max}** cycles (${coverage.knownComponentSourceCycleRange.distinct} totals). Complete MPlay costs remain **5 exact / 108 null** because command decode/jump-table dispatch and every other live callback family remain unresolved. No observed duration, pointer identity, service cost, or clock wiring is used.`, "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-pend-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-pend-v1.md") };
  fail("usage: factory-m4a-pend-v1.ts [--out-dir PATH]");
}

export function main(): void {
  const evidence = makeEvidence();
  const output = outputs();
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
  process.stdout.write(`wrote ${output.json}\nwrote ${output.doc}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
