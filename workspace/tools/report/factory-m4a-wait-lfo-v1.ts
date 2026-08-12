import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeClearChainEvidence } from "./factory-m4a-clearchain-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "b050933545a80dd7b24290bf3c672587bbab6059dafc91251ce203fdd7641709",
  liliana: "acf844d6f14bb33cfff17af7e53aac80758e0669b72d30f4c16d4ea2f766d8ee",
  "factory-varied": "1ff1a5243498791699ffbd884912211d6b0db4edf5cfc665b02968a7d8cb0c7e",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-wait-lfo-v1");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-wait-lfo-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-wait-lfo-v1.md");
const ROM_BASE = 0x0800_0000;
const WAIT_LFO_START = 0x082d_fb70;
const WAIT_LFO_MOD_ZERO_END = 0x082d_fb86;
const THUMB_FETCH_CYCLES = 2;
const PIPELINE_REFILL_CYCLES = 6;

export type WaitLfoTrack = Readonly<{
  trackIndex: number;
  wait: number;
  mod: number;
  lfoSpeed: number;
}>;
type Observation = { sourceStateDigest: string; waitLfoTracks: WaitLfoTrack[] | null };
type Packet = {
  schema: string;
  case: CaseName;
  oracleProfile: string;
  captureBoundary: string;
  observations: Observation[];
};
type PriorRow = {
  sourceStateDigest: string;
  case: CaseName;
  passCount: number;
  channelGateWithClearChainSourceCycles: number;
  completeMPlaySourceCycles: number | null;
};

export type WaitLfoTiming = Readonly<{
  route: "mod-zero" | "unresolved-lfo";
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  ewramByteAccessPremiumCycles: 0;
  cycles: number | null;
  unresolved: string | null;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-wait-lfo-v1: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireU8(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be u8`);
  return value;
}

/**
 * Count `_081DD938` through the selected exit at `_081DD994`.
 *
 * A final wait must be nonzero at this boundary. The exact route decrements
 * it, passes nonzero lfoSpeed, then exits on mod==0. Later delay/oscillator
 * state is deliberately neither captured nor priced.
 */
export function reduceMPlayWaitLfoTiming(track: WaitLfoTrack): WaitLfoTiming {
  const wait = requireU8(track.wait, "wait");
  const lfoSpeed = requireU8(track.lfoSpeed, "lfoSpeed");
  const mod = requireU8(track.mod, "mod");
  if (wait === 0) fail("wait must be nonzero at the final wait/LFO visit");
  if (lfoSpeed === 0) {
    return Object.freeze({ route: "unresolved-lfo", sequentialThumbHalfwords: 8, pipelineRefills: 1, ewramByteAccessPremiumCycles: 0, cycles: null, unresolved: "this increment selects only the nonzero-lfoSpeed/mod-zero branch" });
  }
  if (mod !== 0) {
    return Object.freeze({ route: "unresolved-lfo", sequentialThumbHalfwords: 11, pipelineRefills: 0, ewramByteAccessPremiumCycles: 0, cycles: null, unresolved: "nonzero modulation requires later lfoDelayC/lfoSpeedC/modM/modT state" });
  }
  const sequentialThumbHalfwords = 11;
  const pipelineRefills = 1;
  return Object.freeze({
    route: "mod-zero",
    sequentialThumbHalfwords,
    pipelineRefills,
    ewramByteAccessPremiumCycles: 0,
    cycles: sequentialThumbHalfwords * THUMB_FETCH_CYCLES + pipelineRefills * PIPELINE_REFILL_CYCLES,
    unresolved: null,
  });
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  for (const anchor of ["_081DD938:", "ldrb r1, [r5, o_MusicPlayerTrack_lfoSpeed]", "ldrb r0, [r5, o_MusicPlayerTrack_mod]", "beq _081DD994", "_081DD95A:"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  const compiledHash = sha256(romSlice(WAIT_LFO_START, WAIT_LFO_MOD_ZERO_END));
  if (compiledHash !== "8152500e62aec6117cc35efa9bd99e4283d52f5ab679e99a1db4d9659acf0479") fail("wait/LFO mod-zero ELF/ROM bytes changed");
  return {
    source: [{ path: "reference/pokeemerald/src/m4a_1.s", lines: "1279-1290", sha256: sha256(assembly) }],
    compiledRegions: [{ role: "MPlayMain final-wait through mod-zero exit", start: WAIT_LFO_START, end: WAIT_LFO_MOD_ZERO_END, bytes: WAIT_LFO_MOD_ZERO_END - WAIT_LFO_START, sha256: compiledHash }],
    timingClasses: { sequentialRomThumbHalfword: THUMB_FETCH_CYCLES, takenPipelineRefillPremium: PIPELINE_REFILL_CYCLES, ewramByteAccessPremium: 0 },
  };
}

function loadPacket(name: CaseName): Packet {
  const bytes = readFileSync(join(PACKETS, `${name}.json`));
  if (sha256(bytes) !== PACKET_HASHES[name]) fail(`${name} packet hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as Packet;
  if (packet.schema !== "factory-m4a-wait-lfo-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} packet identity changed`);
  if (packet.captureBoundary !== "sixth-MPlayMain-per-track-wait-lfo" || packet.observations.length !== COUNTS[name]) fail(`${name} boundary/count changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const prior = makeClearChainEvidence() as { rows: PriorRow[] };
  const priorByDigest = new Map(prior.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; trackVisits: number }> = {};

  for (const packet of CASES.map(loadPacket)) {
    const summary = { rows: packet.observations.length, onePass: 0, zeroPass: 0, trackVisits: 0 };
    for (const observation of packet.observations) {
      const priorRow = priorByDigest.get(observation.sourceStateDigest);
      if (!priorRow || priorRow.case !== packet.case) fail(`${packet.case} row does not join ClearChain evidence`);
      if (priorRow.passCount === 0) {
        if (observation.waitLfoTracks !== null || priorRow.completeMPlaySourceCycles !== 864) fail(`${packet.case} zero-pass row reached wait/LFO capture`);
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount: 0, activeTrackVisits: 0, waitLfoSourceCycles: 0, knownGateAndWaitLfoSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      const tracks = observation.waitLfoTracks;
      if (tracks === null || tracks.length !== 9 || tracks.some((track, index) => track.trackIndex !== index)) fail(`${packet.case} one-pass wait/LFO track shape changed`);
      const timings = tracks.map(reduceMPlayWaitLfoTiming);
      if (timings.some((timing) => timing.cycles === null)) fail(`${packet.case} observed a route outside the selected mod-zero branch`);
      const waitLfoSourceCycles = timings.reduce((sum, timing) => sum + timing.cycles!, 0);
      summary.trackVisits += tracks.length;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest,
        case: packet.case,
        passCount: 1,
        activeTrackVisits: tracks.length,
        waitLfoRoutes: timings.map((timing) => timing.route),
        waitLfoSourceCycles,
        channelGateWithClearChainSourceCycles: priorRow.channelGateWithClearChainSourceCycles,
        knownGateAndWaitLfoSourceCycles: priorRow.channelGateWithClearChainSourceCycles + waitLfoSourceCycles,
        completeMPlaySourceCycles: null,
      });
    }
    byCase[packet.case] = summary;
  }

  const onePass = rows.filter((row) => row.passCount === 1);
  const zeroPass = rows.filter((row) => row.passCount === 0);
  const trackVisits = onePass.reduce((sum, row) => sum + (row.activeTrackVisits as number), 0);
  if (rows.length !== 113 || onePass.length !== 108 || zeroPass.length !== 5 || trackVisits !== 972) fail("coverage partition changed");
  const componentCycles = onePass.map((row) => row.waitLfoSourceCycles as number);
  const knownCycles = onePass.map((row) => row.knownGateAndWaitLfoSourceCycles as number);
  return {
    schema: "factory-m4a-wait-lfo-evidence/v1",
    oracleProfile: "battle-scene-off",
    sourceAndElf,
    capture: { boundary: "MPlayMain._081DD938", runtimeCompiledPc: "0x082dfb72", state: "trackIndex plus wait/lfoSpeed/mod u8 inputs", freshRunsPerCase: 2, repeatability: "byte-identical full packet" },
    frozenInputs: { packets: PACKET_HASHES, clearChainEvidence: "tests/fixtures/factory-m4a-clearchain-evidence-v1.json" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase,
      activeTrackVisits: trackVisits,
      modZeroTrackVisits: trackVisits,
      exactWaitLfoRowsWithinOnePass: onePass.length,
      nullWaitLfoRowsWithinOnePass: 0,
      exactWaitLfoSourceCycleRange: { min: Math.min(...componentCycles), max: Math.max(...componentCycles), distinct: new Set(componentCycles).size },
      knownGateAndWaitLfoSourceCycleRange: { min: Math.min(...knownCycles), max: Math.max(...knownCycles), distinct: new Set(knownCycles).size },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "All 972 active-track final waits in the 108 one-pass rows select the source's nonzero-lfoSpeed/mod-zero exit; the wait/LFO component is exact for all one-pass rows.",
      remainingDiscriminator: "Bounded command dispatch and callback instruction paths remain unresolved for all 108 one-pass rows.",
      durationFit: false,
      pointerIdentityTable: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "The wait/LFO component is source-exact for 108/108 one-pass rows; complete MPlay costs remain 5 exact / 108 null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as {
    byCase: Record<string, { onePass: number; zeroPass: number; trackVisits: number }>;
    activeTrackVisits: number;
    exactWaitLfoSourceCycleRange: { min: number; max: number; distinct: number };
    knownGateAndWaitLfoSourceCycleRange: { min: number; max: number; distinct: number };
  };
  return [
    "# Issue #55 — sixth-MPlayMain wait/LFO v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-wait-lfo-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. At the sixth player's exact compiled `_081DD938` boundary, the packet retains only address-free track index plus the mutable `wait`, `lfoSpeed`, and `mod` bytes consumed by the selected branch.", "",
    `All **${coverage.activeTrackVisits}/${coverage.activeTrackVisits}** active-track visits across **108/108** one-pass rows have a nonzero final wait, nonzero \`lfoSpeed\`, and \`mod == 0\`. They therefore take one compiled route: decrement wait, test LFO speed, test modulation, and branch to \`_081DD994\`. The route is **28 cycles per track**, or **${coverage.exactWaitLfoSourceCycleRange.min} cycles per one-pass row**.`, "",
    "| case | one pass | zero pass | active-track visits |", "| --- | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.byCase[name]!; return `| ${name} | ${row.onePass} | ${row.zeroPass} | ${row.trackVisits} |`; }), "",
    `The reducer instruction-counts the pinned 22-byte ELF route at \`0x082dfb70..0x082dfb86\`: 11 ordinary WS0 Thumb halfwords plus one taken-branch refill. EWRAM byte reads/writes add no bus premium in the established timing class. Joined with the already-closed channel gate, known per-pass components total **${coverage.knownGateAndWaitLfoSourceCycleRange.min}–${coverage.knownGateAndWaitLfoSourceCycleRange.max}** cycles (${coverage.knownGateAndWaitLfoSourceCycleRange.distinct} totals).`, "",
    "Complete MPlay costs remain **5 exact / 108 null** because bounded command dispatch/callback instruction paths are still unresolved. Later nonzero-modulation inputs remain uncaptured and null, no observed duration or pointer identity was used, no service cost was assigned, and `runFactoryConstructionClock` remains unwired.", "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-wait-lfo-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-wait-lfo-v1.md") };
  fail("usage: factory-m4a-wait-lfo-v1.ts [--out-dir PATH]");
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
