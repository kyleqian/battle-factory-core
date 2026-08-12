import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makePendEvidence } from "./factory-m4a-pend-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "442644597c689ac90102797bea3d2aab39f2feb457714cc41d77b300e73565db",
  liliana: "690dc18b446a804965cd036240d276ab4d567778ccce5f5e75c95a4e333707c9",
  "factory-varied": "929365a4dc4fbf3055f0af7331c56ae7376a9468b43a0c3fe7f7fb7b059bf570",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-patt-v1");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-patt-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-patt-v1.md");
const ROM_BASE = 0x0800_0000;
const PATT_START = 0x082d_f8ac;
const PATT_END = 0x082d_f8c6;
const GOTO_START = 0x082d_f88c;
const GOTO_END = 0x082d_f8ac;
const GOTO_READ_GUARD_START = 0x082d_f864;
const GOTO_READ_GUARD_END = 0x082d_f87c;
const THUMB_FETCH_CYCLES = 2;
const PIPELINE_REFILL_CYCLES = 6;
const EWRAM_WORD_PREMIUM_CYCLES = 2;
const ROM_DATA_BYTE_TOTAL_CYCLES = 9;
const SONG_ROLE = /^battle-factory-bgm-track-[1-9]$/;
const SONG_ROLE_BYTES: Readonly<Record<string, number>> = Object.freeze({
  "battle-factory-bgm-track-1": 316,
  "battle-factory-bgm-track-2": 910,
  "battle-factory-bgm-track-3": 933,
  "battle-factory-bgm-track-4": 117,
  "battle-factory-bgm-track-5": 1576,
  "battle-factory-bgm-track-6": 1634,
  "battle-factory-bgm-track-7": 1328,
  "battle-factory-bgm-track-8": 647,
  "battle-factory-bgm-track-9": 347,
});

type SongPointer = null | Readonly<{ role: string; offset: number }>;
export type PattCallback = Readonly<{
  trackIndex: number;
  patternLevel: number;
  commandPointer: SongPointer;
  returnTarget: SongPointer;
  patternTarget: SongPointer;
}>;
type Observation = { sourceStateDigest: string; callbackFamilies: string[] | null; pattCallbacks: PattCallback[] | null };
type Packet = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; observations: Observation[] };
type PriorRow = { sourceStateDigest: string; case: CaseName; passCount: number; knownComponentsSourceCycles: number; completeMPlaySourceCycles: number | null };

export type PattTiming = Readonly<{
  route: "push-pattern-and-goto-depth-0" | "push-pattern-and-goto-depth-1" | "push-pattern-and-goto-depth-2";
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  ewramWordAccesses: number;
  ewramWordAccessPremiumCycles: number;
  romCommandByteReads: number;
  romCommandBytePremiumCycles: number;
  cycles: number;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-patt-v1: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireSongPointer(value: SongPointer, label: string): Readonly<{ role: string; offset: number }> {
  if (!value || !SONG_ROLE.test(value.role) || !Number.isInteger(value.offset) || value.offset < 0) {
    fail(`${label} must be a normalized Battle Factory song offset`);
  }
  if (value.offset >= SONG_ROLE_BYTES[value.role]!) fail(`${label} exceeds its pinned source role`);
  return value;
}

/** Instruction-count the observed source-reachable ply_patt -> ply_goto route. */
export function reduceMPlayPattTiming(entry: PattCallback): PattTiming {
  if (!Number.isInteger(entry.trackIndex) || entry.trackIndex < 0 || entry.trackIndex > 9) fail("trackIndex must be 0..9");
  if (!Number.isInteger(entry.patternLevel) || entry.patternLevel < 0 || entry.patternLevel > 3) fail("patternLevel must fit the three-slot source stack");
  if (entry.patternLevel === 3) fail("full pattern stack routes through unresolved ply_fine channel teardown");
  const commandPointer = requireSongPointer(entry.commandPointer, "commandPointer");
  const returnTarget = requireSongPointer(entry.returnTarget, "returnTarget");
  requireSongPointer(entry.patternTarget, "patternTarget");
  if (commandPointer.role !== returnTarget.role || returnTarget.offset !== commandPointer.offset + 4) {
    fail("returnTarget must be the four-byte PATT payload successor");
  }

  // ply_patt: 12 halfwords through its tail branch. ply_goto plus the
  // ldrb_r3_r2/chk_adr_r2 fast GamePak guard: 22 more halfwords.
  const sequentialThumbHalfwords = 34;
  const pipelineRefills = 5; // patt tail, helper BL, guard bne/bx, final bx
  const ewramWordAccesses = 4; // patt cmdPtr/stack plus goto cmdPtr/store
  const ewramWordAccessPremiumCycles = ewramWordAccesses * EWRAM_WORD_PREMIUM_CYCLES;
  const romCommandByteReads = 4;
  const romCommandBytePremiumCycles = romCommandByteReads * (ROM_DATA_BYTE_TOTAL_CYCLES - THUMB_FETCH_CYCLES);
  const cycles = sequentialThumbHalfwords * THUMB_FETCH_CYCLES
    + pipelineRefills * PIPELINE_REFILL_CYCLES
    + ewramWordAccessPremiumCycles
    + romCommandBytePremiumCycles;
  return Object.freeze({
    route: `push-pattern-and-goto-depth-${entry.patternLevel}` as PattTiming["route"],
    sequentialThumbHalfwords,
    pipelineRefills,
    ewramWordAccesses,
    ewramWordAccessPremiumCycles,
    romCommandByteReads,
    romCommandBytePremiumCycles,
    cycles,
  });
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of ["ply_patt:", "bhs ply_patt_done", "str r2, [r3, o_MusicPlayerTrack_patternStack]", "b ply_goto", "ply_goto:", "bl ldrb_r3_r2", "bne chk_adr_r2_done"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const regions = [
    { role: "ply_patt callback", start: PATT_START, end: PATT_END, sha256: "fe24bd249877601e9cbeb96dd62edb2b1e5d24a3abe6dc020b2136b80fa40856" },
    { role: "transitive ply_goto", start: GOTO_START, end: GOTO_END, sha256: "b4c137a9f8b801e7515565fbc485668d66b21ef58290b1d063fc3714543789df" },
    { role: "transitive ROM-read guard", start: GOTO_READ_GUARD_START, end: GOTO_READ_GUARD_END, sha256: "500d7fd07d078fcca520b41c8d98b9b0b6b4d11f98ca592d989d8d6c49c5746f" },
  ];
  for (const region of regions) if (sha256(romSlice(region.start, region.end)) !== region.sha256) fail(`${region.role} ELF/ROM bytes changed`);
  return {
    source: [{ path: "reference/pokeemerald/src/m4a_1.s", lines: "796-867", sha256: sha256(assembly) }],
    compiledRegions: regions.map((region) => ({ ...region, bytes: region.end - region.start })),
    songRoleBytes: SONG_ROLE_BYTES,
    timingClasses: {
      sequentialRomThumbHalfword: THUMB_FETCH_CYCLES,
      takenPipelineRefillPremium: PIPELINE_REFILL_CYCLES,
      alignedEwramWordPremium: EWRAM_WORD_PREMIUM_CYCLES,
      gamepakCommandByteReadTotal: ROM_DATA_BYTE_TOTAL_CYCLES,
    },
  };
}

function loadPacket(name: CaseName): Packet {
  const bytes = readFileSync(join(PACKETS, `${name}.json`));
  if (sha256(bytes) !== PACKET_HASHES[name]) fail(`${name} packet hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as Packet;
  if (packet.schema !== "factory-m4a-patt-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} packet identity changed`);
  if (packet.captureBoundary !== "sixth-MPlayMain-ply_patt-entry" || packet.observations.length !== COUNTS[name]) fail(`${name} boundary/count changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const prior = makePendEvidence() as { rows: PriorRow[] };
  const priorByDigest = new Map(prior.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; callbackRows: number; callbacks: number }> = {};
  const callbackTimings: PattTiming[] = [];
  const familyCounts: Record<string, number> = {};

  for (const packet of CASES.map(loadPacket)) {
    const summary = { rows: packet.observations.length, onePass: 0, zeroPass: 0, callbackRows: 0, callbacks: 0 };
    for (const observation of packet.observations) {
      const priorRow = priorByDigest.get(observation.sourceStateDigest);
      if (!priorRow || priorRow.case !== packet.case) fail(`${packet.case} row does not join PEND evidence`);
      if (priorRow.passCount === 0) {
        if (observation.callbackFamilies !== null || observation.pattCallbacks !== null || priorRow.completeMPlaySourceCycles !== 864) fail(`${packet.case} zero-pass row reached ply_patt capture`);
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 0, pattCallbackCount: 0, pattSourceCycles: 0, knownComponentsSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      if (observation.callbackFamilies === null || observation.pattCallbacks === null) fail(`${packet.case} one-pass row lacks ply_patt capture`);
      for (const family of observation.callbackFamilies) familyCounts[family] = (familyCounts[family] ?? 0) + 1;
      const timings = observation.pattCallbacks.map(reduceMPlayPattTiming);
      callbackTimings.push(...timings);
      const pattSourceCycles = timings.reduce((sum, timing) => sum + timing.cycles, 0);
      summary.callbacks += timings.length;
      if (timings.length > 0) summary.callbackRows += 1;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest,
        case: packet.case,
        passCount: 1,
        pattCallbackCount: timings.length,
        pattRoutes: timings.map((timing) => timing.route),
        pattSourceCycles,
        priorKnownComponentsSourceCycles: priorRow.knownComponentsSourceCycles,
        knownComponentsSourceCycles: priorRow.knownComponentsSourceCycles + pattSourceCycles,
        completeMPlaySourceCycles: null,
      });
    }
    byCase[packet.case] = summary;
  }

  const onePass = rows.filter((row) => row.passCount === 1);
  const zeroPass = rows.filter((row) => row.passCount === 0);
  const callbackRows = onePass.filter((row) => (row.pattCallbackCount as number) > 0);
  if (rows.length !== 113 || onePass.length !== 108 || zeroPass.length !== 5 || callbackRows.length !== 1 || callbackTimings.length !== 1) fail("coverage partition changed");
  if (callbackTimings[0]!.route !== "push-pattern-and-goto-depth-0" || callbackTimings[0]!.cycles !== 134) fail("observed ply_patt route changed");
  const expectedFamilyCounts = { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 };
  if (JSON.stringify(Object.fromEntries(Object.entries(familyCounts).sort(([a], [b]) => a.localeCompare(b)))) !== JSON.stringify(expectedFamilyCounts)) fail("callback-family selection census changed");
  const familyCycles = onePass.map((row) => row.pattSourceCycles as number);
  const knownCycles = onePass.map((row) => row.knownComponentsSourceCycles as number);
  return {
    schema: "factory-m4a-patt-evidence/v1",
    oracleProfile: "battle-scene-off",
    sourceAndElf,
    capture: { boundary: "ply_patt entry", exactCaller: "MPlayMain._081DD90C jump-table dispatch", runtimeCompiledPc: "0x082df8ae", state: "trackIndex, patternLevel, and normalized command/return/pattern source offsets", freshRunsPerCase: 2, repeatability: "byte-identical full packet" },
    frozenInputs: { packets: PACKET_HASHES, pendEvidence: "tests/fixtures/factory-m4a-pend-evidence-v1.json" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase,
      rowsWithPattCallbacks: callbackRows.length,
      pattCallbacks: callbackTimings.length,
      callbackFamilySelectionCensus: expectedFamilyCounts,
      callbackRouteCounts: { "push-pattern-and-goto-depth-0": 1, "push-pattern-and-goto-depth-1": 0, "push-pattern-and-goto-depth-2": 0 },
      exactPattRowsWithinOnePass: onePass.length,
      nullPattRowsWithinOnePass: 0,
      exactPattSourceCycleRange: { min: Math.min(...familyCycles), max: Math.max(...familyCycles), distinct: new Set(familyCycles).size },
      knownComponentSourceCycleRange: { min: Math.min(...knownCycles), max: Math.max(...knownCycles), distinct: new Set(knownCycles).size },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The sole ply_patt callback in the 108 one-pass rows is source-timed from exact entry state; rows without this callback contribute zero to this family.",
      remainingDiscriminator: "MPlayMain command decode/jump-table dispatcher plus ply_voice, ply_vol, ply_pan, ply_bend, and note callback families remain unresolved.",
      durationFit: false,
      pointerIdentityTable: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "The ply_patt callback family is source-exact for 1/1 callbacks and 108/108 one-pass rows; complete MPlay costs remain 5 exact / 108 null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as {
    byCase: Record<string, { onePass: number; zeroPass: number; callbackRows: number; callbacks: number }>;
    callbackFamilySelectionCensus: Record<string, number>;
    knownComponentSourceCycleRange: { min: number; max: number; distinct: number };
  };
  return [
    "# Issue #55 — sixth-MPlayMain `ply_patt` callback v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-patt-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. The exact compiled `ply_patt` entry retains only address-free track index, `patternLevel`, and normalized command-payload, return, and pattern-target source offsets.", "",
    `The exact jump-table-entry census remains \`${JSON.stringify(coverage.callbackFamilySelectionCensus)}\`. The sole \`ply_patt\` callback is anchor track 6 at pattern depth 0; it saves track-7 offset 1036 and follows the payload at offset 1032 to track-7 offset 1020. LILIANA and legal-varied contain none. Rows without \`ply_patt\` contribute exactly zero, closing this family for **108/108** one-pass rows.`, "",
    "| case | one pass | zero pass | rows with `ply_patt` | callbacks |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.byCase[name]!; return `| ${name} | ${row.onePass} | ${row.zeroPass} | ${row.callbackRows} | ${row.callbacks} |`; }), "",
    "The reducer pins the complete 26-byte `ply_patt`, 32-byte transitive `ply_goto`, and 24-byte `ldrb_r3_r2`/`chk_adr_r2` bodies. The observed route is 34 WS0 Thumb halfwords, five refills, four aligned EWRAM word premiums, and four 9-cycle GamePak command-byte reads: **134 cycles**. Pattern depths 0–2 share that compiled route; malformed source roles/offsets and the full-stack `ply_fine` teardown route fail closed rather than inheriting the observed cost.", "",
    `Joined with channel gate, wait/LFO, and \`ply_pend\`, known per-pass components now total **${coverage.knownComponentSourceCycleRange.min}–${coverage.knownComponentSourceCycleRange.max}** cycles (${coverage.knownComponentSourceCycleRange.distinct} totals). Complete MPlay costs remain **5 exact / 108 null** because command decode/jump-table dispatch and every other live callback family remain unresolved. No observed duration, pointer identity, service cost, or clock wiring is used.`, "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-patt-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-patt-v1.md") };
  fail("usage: factory-m4a-patt-v1.ts [--out-dir PATH]");
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
