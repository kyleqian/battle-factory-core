import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeBendEvidence } from "./factory-m4a-bend-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "35b9e20c2c08186b22d7443d606de7fda8eac0f17a01a3720fbb125a1995ecb5",
  liliana: "1089ace572cfd2bcaf561c5508b34ca13a887e6445d27e5a8436d00622119dd0",
  "factory-varied": "1eee75f00bcc5e55138d7e6b33fa6cede9833a12183ab14cc812f7282e5bdb79",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-pan-v1");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-pan-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-pan-v1.md");
const ROM_BASE = 0x0800_0000;
const PAN_START = 0x082d_f984;
const PAN_END = 0x082d_f998;
const CHK_START = 0x082d_f866;
const CHK_END = 0x082d_f87c;
const THUMB_FETCH_CYCLES = 2;
const PIPELINE_REFILL_CYCLES = 6;
const EWRAM_WORD_PREMIUM_CYCLES = 2;
const ROM_BYTE_TOTAL_CYCLES = 9;
const SONG_ROLE = /^battle-factory-bgm-track-[1-9]$/;
const SONG_ROLE_BYTES: Readonly<Record<string, number>> = Object.freeze({
  "battle-factory-bgm-track-1": 316, "battle-factory-bgm-track-2": 910,
  "battle-factory-bgm-track-3": 933, "battle-factory-bgm-track-4": 117,
  "battle-factory-bgm-track-5": 1576, "battle-factory-bgm-track-6": 1634,
  "battle-factory-bgm-track-7": 1328, "battle-factory-bgm-track-8": 647,
  "battle-factory-bgm-track-9": 347,
});

type SourcePointer = Readonly<{ role: string; offset: number }>;
export type PanCallback = Readonly<{
  trackIndex: number;
  commandPointer: SourcePointer;
  parameter: number;
  flagsBefore: number;
}>;
type Observation = { sourceStateDigest: string; callbackFamilies: string[] | null; panCallbacks: PanCallback[] | null };
type Packet = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; observations: Observation[] };
type PriorRow = { sourceStateDigest: string; case: CaseName; passCount: number; knownComponentsSourceCycles: number; completeMPlaySourceCycles: number | null };

export type PanTiming = Readonly<{
  route: "gamepak-command-byte-fast-accept";
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  ewramWordAccesses: number;
  ewramWordAccessPremiumCycles: number;
  romCommandByteReads: number;
  romCommandBytePremiumCycles: number;
  cycles: number;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-pan-v1: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireSourcePointer(value: SourcePointer, label: string): SourcePointer {
  if (!value || !SONG_ROLE.test(value.role) || !Number.isInteger(value.offset) || value.offset < 0) {
    fail(`${label} must be a normalized Battle Factory song offset`);
  }
  if (value.offset >= SONG_ROLE_BYTES[value.role]!) fail(`${label} exceeds its pinned source role`);
  return value;
}

function requireU8(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be u8`);
  return value;
}

/** Instruction-count the complete observed ply_pan route, including ld_r3_tp_adr_i/chk_adr_r2. */
export function reduceMPlayPanTiming(entry: PanCallback): PanTiming {
  if (!Number.isInteger(entry.trackIndex) || entry.trackIndex < 0 || entry.trackIndex > 9) fail("trackIndex must be 0..9");
  const commandPointer = requireSourcePointer(entry.commandPointer, "commandPointer");
  requireU8(entry.parameter, "parameter");
  requireU8(entry.flagsBefore, "flagsBefore");
  if (commandPointer.offset + 1 > SONG_ROLE_BYTES[commandPointer.role]!) fail("command byte exceeds its pinned song role");

  // ply_pan is ten halfwords; ld_r3_tp_adr_i is five; the observed GamePak
  // pointer selects chk_adr_r2's five-halfword high-address fast accept.
  const sequentialThumbHalfwords = 10 + 5 + 5;
  const pipelineRefills = 5; // BL, helper B, taken BNE, helper BX, callback BX
  const ewramWordAccesses = 2; // track cmdPtr load/store
  const ewramWordAccessPremiumCycles = ewramWordAccesses * EWRAM_WORD_PREMIUM_CYCLES;
  const romCommandByteReads = 1;
  const romCommandBytePremiumCycles = romCommandByteReads * (ROM_BYTE_TOTAL_CYCLES - THUMB_FETCH_CYCLES);
  const cycles = sequentialThumbHalfwords * THUMB_FETCH_CYCLES
    + pipelineRefills * PIPELINE_REFILL_CYCLES
    + ewramWordAccessPremiumCycles + romCommandBytePremiumCycles;
  return Object.freeze({
    route: "gamepak-command-byte-fast-accept", sequentialThumbHalfwords, pipelineRefills,
    ewramWordAccesses, ewramWordAccessPremiumCycles, romCommandByteReads,
    romCommandBytePremiumCycles, cycles,
  });
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of ["ply_pan:", "bl ld_r3_tp_adr_i", "subs r3, C_V", "strb r3, [r1, o_MusicPlayerTrack_pan]", "movs r2, MPT_FLG_VOLCHG"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const regions = [
    { role: "ply_pan callback", start: PAN_START, end: PAN_END, sha256: "68a4e0b54f0eb4c2b49158921dd7ddf4d04c225ecf84df794ec351e30680d6db" },
    { role: "transitive chk_adr_r2", start: CHK_START, end: CHK_END, sha256: "dd3e100af89b39dcaacbb89ba15c4f6458c374e4a238d4117c84f918e773d4c1" },
  ];
  for (const region of regions) if (sha256(romSlice(region.start, region.end)) !== region.sha256) fail(`${region.role} ELF/ROM bytes changed`);
  return {
    source: [
      { path: "reference/pokeemerald/src/m4a_1.s", lines: "981-992", sha256: sha256(assembly) },
    ],
    compiledRegions: regions.map((region) => ({ ...region, bytes: region.end - region.start })),
    songRoleBytes: SONG_ROLE_BYTES,
    timingClasses: {
      sequentialRomThumbHalfword: THUMB_FETCH_CYCLES, takenPipelineRefillPremium: PIPELINE_REFILL_CYCLES,
      alignedEwramWordPremium: EWRAM_WORD_PREMIUM_CYCLES, gamepakByteReadTotal: ROM_BYTE_TOTAL_CYCLES,
    },
  };
}

function loadPacket(name: CaseName): Packet {
  const bytes = readFileSync(join(PACKETS, `${name}.json`));
  if (sha256(bytes) !== PACKET_HASHES[name]) fail(`${name} packet hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as Packet;
  if (packet.schema !== "factory-m4a-pan-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} packet identity changed`);
  if (packet.captureBoundary !== "sixth-MPlayMain-ply_pan-entry" || packet.observations.length !== COUNTS[name]) fail(`${name} boundary/count changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const prior = makeBendEvidence() as { rows: PriorRow[] };
  const priorByDigest = new Map(prior.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; callbackRows: number; callbacks: number }> = {};
  const callbackTimings: PanTiming[] = [];
  const familyCounts: Record<string, number> = {};
  for (const packet of CASES.map(loadPacket)) {
    const summary = { rows: packet.observations.length, onePass: 0, zeroPass: 0, callbackRows: 0, callbacks: 0 };
    for (const observation of packet.observations) {
      const priorRow = priorByDigest.get(observation.sourceStateDigest);
      if (!priorRow || priorRow.case !== packet.case) fail(`${packet.case} row does not join VOICE evidence`);
      if (priorRow.passCount === 0) {
        if (observation.callbackFamilies !== null || observation.panCallbacks !== null || priorRow.completeMPlaySourceCycles !== 864) fail(`${packet.case} zero-pass row reached ply_pan capture`);
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 0, panCallbackCount: 0, panSourceCycles: 0, knownComponentsSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      if (observation.callbackFamilies === null || observation.panCallbacks === null) fail(`${packet.case} one-pass row lacks ply_pan capture`);
      for (const family of observation.callbackFamilies) familyCounts[family] = (familyCounts[family] ?? 0) + 1;
      const timings = observation.panCallbacks.map(reduceMPlayPanTiming);
      callbackTimings.push(...timings);
      const panSourceCycles = timings.reduce((sum, timing) => sum + timing.cycles, 0);
      summary.callbacks += timings.length;
      if (timings.length > 0) summary.callbackRows += 1;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 1,
        panCallbackCount: timings.length, panRoutes: timings.map((timing) => timing.route), panSourceCycles,
        priorKnownComponentsSourceCycles: priorRow.knownComponentsSourceCycles,
        knownComponentsSourceCycles: priorRow.knownComponentsSourceCycles + panSourceCycles,
        completeMPlaySourceCycles: null,
      });
    }
    byCase[packet.case] = summary;
  }
  const onePass = rows.filter((row) => row.passCount === 1);
  const zeroPass = rows.filter((row) => row.passCount === 0);
  const callbackRows = onePass.filter((row) => (row.panCallbackCount as number) > 0);
  if (rows.length !== 113 || onePass.length !== 108 || zeroPass.length !== 5 || callbackRows.length !== 9 || callbackTimings.length !== 13) fail("coverage partition changed");
  if (callbackTimings.some((timing) => timing.route !== "gamepak-command-byte-fast-accept" || timing.cycles !== 81)) fail("observed ply_pan route changed");
  const expectedFamilyCounts = { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 };
  if (JSON.stringify(Object.fromEntries(Object.entries(familyCounts).sort(([a], [b]) => a.localeCompare(b)))) !== JSON.stringify(expectedFamilyCounts)) fail("callback-family selection census changed");
  const familyCycles = onePass.map((row) => row.panSourceCycles as number);
  const knownCycles = onePass.map((row) => row.knownComponentsSourceCycles as number);
  return {
    schema: "factory-m4a-pan-evidence/v1", oracleProfile: "battle-scene-off", sourceAndElf,
    capture: { boundary: "ply_pan entry", exactCaller: "MPlayMain._081DD90C jump-table dispatch", runtimeCompiledPc: "0x082df986", state: "track index, normalized command source, parameter byte, and flags byte", freshRunsPerCase: 2, repeatability: "byte-identical full packet" },
    frozenInputs: { packets: PACKET_HASHES, bendEvidence: "tests/fixtures/factory-m4a-bend-evidence-v1.json" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase, rowsWithPanCallbacks: callbackRows.length, panCallbacks: callbackTimings.length,
      callbackFamilySelectionCensus: expectedFamilyCounts,
      callbackRouteCounts: { "gamepak-command-byte-fast-accept": 13 },
      exactPanRowsWithinOnePass: onePass.length, nullPanRowsWithinOnePass: 0,
      exactPanSourceCycleRange: { min: Math.min(...familyCycles), max: Math.max(...familyCycles), distinct: new Set(familyCycles).size },
      knownComponentSourceCycleRange: { min: Math.min(...knownCycles), max: Math.max(...knownCycles), distinct: new Set(knownCycles).size },
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "All 13 ply_pan callbacks and zero-callback contribution for every other one-pass row are source-timed from exact normalized entry state.",
      remainingDiscriminator: "MPlayMain command decode/jump-table dispatch plus ply_vol and note callback families remain unresolved.",
      durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null,
    },
    verdict: "The ply_pan callback family is source-exact for 13/13 callbacks and 108/108 one-pass rows; complete MPlay costs remain 5 exact / 108 null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as {
    byCase: Record<string, { onePass: number; zeroPass: number; callbackRows: number; callbacks: number }>;
    callbackFamilySelectionCensus: Record<string, number>;
    knownComponentSourceCycleRange: { min: number; max: number; distinct: number };
  };
  return [
    "# Issue #55 — sixth-MPlayMain `ply_pan` callback v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-pan-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. The exact compiled `ply_pan` entry retains only address-free track index, normalized command source, parameter byte, and pre-callback track flags.", "",
    `The pinned callback census remains \`${JSON.stringify(coverage.callbackFamilySelectionCensus)}\`. Anchor contributes **5** callbacks across four rows, LILIANA **4** across three, and legal-varied **4** across two. Their parameters cover 0, 1, 32, 64, 95, and 127. Rows without \`ply_pan\` contribute zero, closing this family for **108/108** one-pass rows.`, "",
    "| case | one pass | zero pass | rows with `ply_pan` | callbacks |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.byCase[name]!; return `| ${name} | ${row.onePass} | ${row.zeroPass} | ${row.callbackRows} | ${row.callbacks} |`; }), "",
    "All 13 observations select the same complete route: the 20-byte `ply_pan` body, the 10-byte `ld_r3_tp_adr_i` loader, and the high-address fast-accept route through the pinned `chk_adr_r2` body. The count is 20 WS0 Thumb halfwords, five refills, two aligned EWRAM word premiums, and one 9-cycle GamePak command byte: **81 cycles per callback**. Malformed song offsets and non-u8 source fields fail closed.", "",
    `Joined with channel gate, wait/LFO, \`ply_pend\`, \`ply_patt\`, \`ply_voice\`, and \`ply_bend\`, known per-pass components now total **${coverage.knownComponentSourceCycleRange.min}–${coverage.knownComponentSourceCycleRange.max}** cycles (${coverage.knownComponentSourceCycleRange.distinct} totals). Complete MPlay costs remain **5 exact / 108 null** because dispatch, \`ply_vol\`, and note callbacks remain unresolved. No observed duration, pointer identity, service cost, or clock wiring is used.`, "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-pan-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-pan-v1.md") };
  fail("usage: factory-m4a-pan-v1.ts [--out-dir PATH]");
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
