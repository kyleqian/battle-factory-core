import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makePanEvidence } from "./factory-m4a-pan-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "0d37f852b4480be03b48ada182d88d5103f08b6d3520e5112ad15ca314513a92",
  liliana: "9638d5f930147adf4dfc6b81528bf0e92ee71bc3bd9727a2661849443e0bc87b",
  "factory-varied": "72fbf17714f20c0f2226dfa9384ac92b2455892c0dfeb62a54a53f8dd52dfa37",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-vol-v1");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-vol-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-vol-v1.md");
const ROM_BASE = 0x0800_0000;
const VOL_START = 0x082d_f970;
const VOL_END = 0x082d_f982;
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
export type VolCallback = Readonly<{
  trackIndex: number;
  commandPointer: SourcePointer;
  parameter: number;
  flagsBefore: number;
}>;
type Observation = { sourceStateDigest: string; callbackFamilies: string[] | null; volCallbacks: VolCallback[] | null };
type Packet = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; observations: Observation[] };
type PriorRow = { sourceStateDigest: string; case: CaseName; passCount: number; knownComponentsSourceCycles: number; completeMPlaySourceCycles: number | null };

export type VolTiming = Readonly<{
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
  throw new Error(`factory-m4a-vol-v1: ${message}`);
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

/** Instruction-count the complete observed ply_vol route, including ld_r3_tp_adr_i/chk_adr_r2. */
export function reduceMPlayVolTiming(entry: VolCallback): VolTiming {
  if (!Number.isInteger(entry.trackIndex) || entry.trackIndex < 0 || entry.trackIndex > 9) fail("trackIndex must be 0..9");
  const commandPointer = requireSourcePointer(entry.commandPointer, "commandPointer");
  requireU8(entry.parameter, "parameter");
  requireU8(entry.flagsBefore, "flagsBefore");
  if (commandPointer.offset + 1 > SONG_ROLE_BYTES[commandPointer.role]!) fail("command byte exceeds its pinned song role");

  // ply_vol is nine halfwords; ld_r3_tp_adr_i is five; the observed GamePak
  // pointer selects chk_adr_r2's five-halfword high-address fast accept.
  const sequentialThumbHalfwords = 9 + 5 + 5;
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
  for (const anchor of ["ply_vol:", "bl ld_r3_tp_adr_i", "strb r3, [r1, o_MusicPlayerTrack_vol]", "movs r2, MPT_FLG_VOLCHG"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const regions = [
    { role: "ply_vol callback", start: VOL_START, end: VOL_END, sha256: "11defa40b26dd10d50fa96d8d32342e53b9a1cefa69eefe025293140837d551c" },
    { role: "transitive chk_adr_r2", start: CHK_START, end: CHK_END, sha256: "dd3e100af89b39dcaacbb89ba15c4f6458c374e4a238d4117c84f918e773d4c1" },
  ];
  for (const region of regions) if (sha256(romSlice(region.start, region.end)) !== region.sha256) fail(`${region.role} ELF/ROM bytes changed`);
  return {
    source: [
      { path: "reference/pokeemerald/src/m4a_1.s", lines: "969-979", sha256: sha256(assembly) },
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
  if (packet.schema !== "factory-m4a-vol-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} packet identity changed`);
  if (packet.captureBoundary !== "sixth-MPlayMain-ply_vol-entry" || packet.observations.length !== COUNTS[name]) fail(`${name} boundary/count changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const prior = makePanEvidence() as { rows: PriorRow[] };
  const priorByDigest = new Map(prior.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; callbackRows: number; callbacks: number }> = {};
  const callbackTimings: VolTiming[] = [];
  const familyCounts: Record<string, number> = {};
  for (const packet of CASES.map(loadPacket)) {
    const summary = { rows: packet.observations.length, onePass: 0, zeroPass: 0, callbackRows: 0, callbacks: 0 };
    for (const observation of packet.observations) {
      const priorRow = priorByDigest.get(observation.sourceStateDigest);
      if (!priorRow || priorRow.case !== packet.case) fail(`${packet.case} row does not join PAN evidence`);
      if (priorRow.passCount === 0) {
        if (observation.callbackFamilies !== null || observation.volCallbacks !== null || priorRow.completeMPlaySourceCycles !== 864) fail(`${packet.case} zero-pass row reached ply_vol capture`);
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 0, volCallbackCount: 0, volSourceCycles: 0, knownComponentsSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      if (observation.callbackFamilies === null || observation.volCallbacks === null) fail(`${packet.case} one-pass row lacks ply_vol capture`);
      for (const family of observation.callbackFamilies) familyCounts[family] = (familyCounts[family] ?? 0) + 1;
      const timings = observation.volCallbacks.map(reduceMPlayVolTiming);
      callbackTimings.push(...timings);
      const volSourceCycles = timings.reduce((sum, timing) => sum + timing.cycles, 0);
      summary.callbacks += timings.length;
      if (timings.length > 0) summary.callbackRows += 1;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 1,
        volCallbackCount: timings.length, volRoutes: timings.map((timing) => timing.route), volSourceCycles,
        priorKnownComponentsSourceCycles: priorRow.knownComponentsSourceCycles,
        knownComponentsSourceCycles: priorRow.knownComponentsSourceCycles + volSourceCycles,
        completeMPlaySourceCycles: null,
      });
    }
    byCase[packet.case] = summary;
  }
  const onePass = rows.filter((row) => row.passCount === 1);
  const zeroPass = rows.filter((row) => row.passCount === 0);
  const callbackRows = onePass.filter((row) => (row.volCallbackCount as number) > 0);
  if (rows.length !== 113 || onePass.length !== 108 || zeroPass.length !== 5 || callbackRows.length !== 13 || callbackTimings.length !== 16) fail("coverage partition changed");
  if (callbackTimings.some((timing) => timing.route !== "gamepak-command-byte-fast-accept" || timing.cycles !== 79)) fail("observed ply_vol route changed");
  const expectedFamilyCounts = { ply_bend: 4, ply_pan: 13, ply_patt: 1, ply_pend: 1, ply_voice: 2, ply_vol: 16 };
  if (JSON.stringify(Object.fromEntries(Object.entries(familyCounts).sort(([a], [b]) => a.localeCompare(b)))) !== JSON.stringify(expectedFamilyCounts)) fail("callback-family selection census changed");
  const familyCycles = onePass.map((row) => row.volSourceCycles as number);
  const knownCycles = onePass.map((row) => row.knownComponentsSourceCycles as number);
  return {
    schema: "factory-m4a-vol-evidence/v1", oracleProfile: "battle-scene-off", sourceAndElf,
    capture: { boundary: "ply_vol entry", exactCaller: "MPlayMain._081DD90C jump-table dispatch", runtimeCompiledPc: "0x082df974", state: "track index, normalized command source, parameter byte, and flags byte", freshRunsPerCase: 2, repeatability: "byte-identical full packet" },
    frozenInputs: { packets: PACKET_HASHES, panEvidence: "tests/fixtures/factory-m4a-pan-evidence-v1.json" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase, rowsWithVolCallbacks: callbackRows.length, volCallbacks: callbackTimings.length,
      callbackFamilySelectionCensus: expectedFamilyCounts,
      callbackRouteCounts: { "gamepak-command-byte-fast-accept": 16 },
      exactVolRowsWithinOnePass: onePass.length, nullVolRowsWithinOnePass: 0,
      exactVolSourceCycleRange: { min: Math.min(...familyCycles), max: Math.max(...familyCycles), distinct: new Set(familyCycles).size },
      knownComponentSourceCycleRange: { min: Math.min(...knownCycles), max: Math.max(...knownCycles), distinct: new Set(knownCycles).size },
      exactCompleteMPlaySourceCostRows: 5, nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "All 16 ply_vol callbacks and zero-callback contribution for every other one-pass row are source-timed from exact normalized entry state.",
      remainingDiscriminator: "MPlayMain command decode/jump-table dispatch plus note callback families remain unresolved.",
      durationFit: false, pointerIdentityTable: false, serviceCost: null, constructionClock: null,
    },
    verdict: "The ply_vol callback family is source-exact for 16/16 callbacks and 108/108 one-pass rows; complete MPlay costs remain 5 exact / 108 null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as {
    byCase: Record<string, { onePass: number; zeroPass: number; callbackRows: number; callbacks: number }>;
    callbackFamilySelectionCensus: Record<string, number>;
    knownComponentSourceCycleRange: { min: number; max: number; distinct: number };
  };
  return [
    "# Issue #55 — sixth-MPlayMain `ply_vol` callback v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-vol-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. The exact compiled `ply_vol` entry retains only address-free track index, normalized command source, parameter byte, and pre-callback track flags.", "",
    `The pinned callback census remains \`${JSON.stringify(coverage.callbackFamilySelectionCensus)}\`. Anchor contributes **2** callbacks in one row, LILIANA **13** across eleven rows, and legal-varied **1** in one row. Their parameters cover 12, 14, 17, 24, 25, 29, 35, 37, 44, 49, 50, 62, and 75. Rows without \`ply_vol\` contribute zero, closing this family for **108/108** one-pass rows.`, "",
    "| case | one pass | zero pass | rows with `ply_vol` | callbacks |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.byCase[name]!; return `| ${name} | ${row.onePass} | ${row.zeroPass} | ${row.callbackRows} | ${row.callbacks} |`; }), "",
    "All 16 observations select the same complete route: the 18-byte `ply_vol` body, the 10-byte `ld_r3_tp_adr_i` loader, and the high-address fast-accept route through the pinned `chk_adr_r2` body. The count is 19 WS0 Thumb halfwords, five refills, two aligned EWRAM word premiums, and one 9-cycle GamePak command byte: **79 cycles per callback**. Malformed song offsets and non-u8 source fields fail closed.", "",
    `Joined with channel gate, wait/LFO, \`ply_pend\`, \`ply_patt\`, \`ply_voice\`, \`ply_bend\`, and \`ply_pan\`, known per-pass components now total **${coverage.knownComponentSourceCycleRange.min}–${coverage.knownComponentSourceCycleRange.max}** cycles (${coverage.knownComponentSourceCycleRange.distinct} totals). Complete MPlay costs remain **5 exact / 108 null** because dispatch and note callbacks remain unresolved. No observed duration, pointer identity, service cost, or clock wiring is used.`, "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-vol-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-vol-v1.md") };
  fail("usage: factory-m4a-vol-v1.ts [--out-dir PATH]");
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
