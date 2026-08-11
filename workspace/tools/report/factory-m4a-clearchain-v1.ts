import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvidence as makeGateEvidence, reduceMPlayChannelGateTiming } from "./factory-m4a-channel-gate-v1.ts";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const CLEAR_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "6c1cbae434ecd5e63344518fd7e9cac27593f262896a08dab034a393093bfb4d",
  liliana: "002f134d1c190cc06452af67465f5083c4ea53f18d56f4c60469bbcdbc67f398",
  "factory-varied": "fd54090696b6acdb683db1b12ae164a5e912deed1352e4b3e57475c2dd62e663",
};
const GATE_PACKET_HASHES: Record<CaseName, string> = {
  anchor: "6f0884ff885207a4256106293dbf972c5f11c0fd5b4420a0f9cbb67ed4686c16",
  liliana: "6650f3fbe8396235203747454ee11ae84b716a6e998c69933852b26668b78133",
  "factory-varied": "6e371fa2094059c2d7da3ec4f9e1d9f6b6ac2cd964bcc1cfbe3b431b738ab7d2",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLEAR_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-clearchain-v1");
const GATE_PACKETS = join(ROOT, "tests/fixtures/factory-m4a-channel-gate-v1");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-clearchain-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-clearchain-v1.md");
const ROM_BASE = 0x0800_0000;

type LinkRole = string | null;
export type ClearChainEntry = Readonly<{
  currentRole: string;
  trackRole: LinkRole;
  previousRole: LinkRole;
  nextRole: LinkRole;
}>;
type ClearObservation = { sourceStateDigest: string; clearChainEntries: ClearChainEntry[] | null };
type ClearPacket = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; observations: ClearObservation[] };
type Channel = { role: string; statusFlags: number; gateTime: number };
type Track = { trackIndex: number; flags: number; channels: Channel[] };
type GateObservation = { sourceStateDigest: string; channelGate: null | { tracks: Track[] } };
type GatePacket = { schema: string; case: CaseName; oracleProfile: string; observations: GateObservation[] };

const THUMB_FETCH_CYCLES = 2;
const PIPELINE_REFILL_CYCLES = 6;
const ROM_LITERAL_PREMIUM_CYCLES = 9;
const CHANNEL_ROLE = /^(direct-channel-(?:[0-9]|1[01])|cgb-channel-[0-3])$/;
const TRACK_ROLE = /^music-player-5-track-[0-9]$/;

export type ClearChainTiming = Readonly<{
  route: "track-null" | "previous-null-next-null" | "previous-null-next-linked" | "previous-linked-next-null" | "previous-linked-next-linked";
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  romLiteralLoads: number;
  ewramWordAccesses: number;
  ewramWordAccessPremiumCycles: 0;
  cycles: number;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-clearchain-v1: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireChannelRole(role: LinkRole, label: string, nullable = true): void {
  if (role === null) {
    if (!nullable) fail(`${label} must name a channel`);
    return;
  }
  if (!CHANNEL_ROLE.test(role)) fail(`${label} is not source-normalized`);
}

/**
 * Instruction-count the compiled ClearChain -> _call_via_r1 ->
 * RealClearChain route, beginning at the wrapper entry and ending after its
 * return to MPlayMain.  MPlayMain's own BL instruction/refill already belongs
 * to the channel-gate reducer and is deliberately excluded here.
 */
export function reduceMPlayClearChainTiming(entry: ClearChainEntry): ClearChainTiming {
  requireChannelRole(entry.currentRole, "currentRole", false);
  requireChannelRole(entry.previousRole, "previousRole");
  requireChannelRole(entry.nextRole, "nextRole");
  if (entry.trackRole !== null && !TRACK_ROLE.test(entry.trackRole)) fail("trackRole is not source-normalized");

  // ClearChain wrapper through indirect trampoline, excluding MPlayMain's BL.
  let sequentialThumbHalfwords = 6; // push, literal ldr, target ldr, BL(2), trampoline bx
  let pipelineRefills = 2; // wrapper BL and trampoline bx
  let romLiteralLoads = 1;
  let ewramWordAccesses = 0;

  // RealClearChain's track test.
  sequentialThumbHalfwords += 3; // ldr track, cmp, beq
  ewramWordAccesses += 1;
  let route: ClearChainTiming["route"];
  if (entry.trackRole === null) {
    pipelineRefills += 1; // taken track-null beq
    route = "track-null";
  } else {
    sequentialThumbHalfwords += 4; // ldr next, ldr previous, cmp, beq
    ewramWordAccesses += 2;
    if (entry.previousRole === null) {
      pipelineRefills += 1; // taken previous-null beq
      sequentialThumbHalfwords += 1; // track->chan = next
      ewramWordAccesses += 1;
    } else {
      sequentialThumbHalfwords += 2; // previous->next = next; b join
      pipelineRefills += 1;
      ewramWordAccesses += 1;
    }
    sequentialThumbHalfwords += 2; // cmp next; beq
    if (entry.nextRole === null) {
      pipelineRefills += 1;
    } else {
      sequentialThumbHalfwords += 1; // next->previous = previous
      ewramWordAccesses += 1;
    }
    sequentialThumbHalfwords += 2; // mov 0; current->track = 0
    ewramWordAccesses += 1;
    route = entry.previousRole === null
      ? (entry.nextRole === null ? "previous-null-next-null" : "previous-null-next-linked")
      : (entry.nextRole === null ? "previous-linked-next-null" : "previous-linked-next-linked");
  }

  sequentialThumbHalfwords += 1; // RealClearChain bx lr
  pipelineRefills += 1;
  sequentialThumbHalfwords += 2; // wrapper pop; bx saved lr
  pipelineRefills += 1;
  const cycles = sequentialThumbHalfwords * THUMB_FETCH_CYCLES
    + pipelineRefills * PIPELINE_REFILL_CYCLES
    + romLiteralLoads * ROM_LITERAL_PREMIUM_CYCLES;
  return Object.freeze({ route, sequentialThumbHalfwords, pipelineRefills, romLiteralLoads, ewramWordAccesses, ewramWordAccessPremiumCycles: 0, cycles });
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const cSource = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  for (const anchor of ["RealClearChain:", "beq _081DD5D6", "str r1, [r3, o_MusicPlayerTrack_chan]", "str r2, [r1, o_SoundChannel_prevChannelPointer]"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  for (const anchor of ["void ClearChain(void *x)", "gMPlayJumpTable[34]"]) if (!cSource.includes(anchor)) fail(`m4a.c lost ${anchor}`);
  const regions = [
    { role: "MPlayMain gate callsite", start: 0x082d_fae6, end: 0x082d_faec, sha256: "eac6b6ad91ef7261ca410e4935897c75e95fdc06776ee0c9b742208571c9d128" },
    { role: "ClearChain wrapper", start: 0x082e_04b4, end: 0x082e_04c8, sha256: "a3981c79c0e6fe3f4604c6f9cb5b2d948ff8c6f20aa99606a8ea99f26bcff207" },
    { role: "_call_via_r1 trampoline", start: 0x082e_70d4, end: 0x082e_70d6, sha256: "bac8ca6ee9f77b46c7ab5824c7c59d99fd0ca53ae998ea2872b78bb6a5189cc5" },
    { role: "RealClearChain", start: 0x082d_f7fc, end: 0x082d_f81c, sha256: "c3d23903d0b87a7b19fcd84aa0234c674e3014a9a2835853727defeaad3422dc" },
  ];
  for (const region of regions) if (sha256(romSlice(region.start, region.end)) !== region.sha256) fail(`${region.role} bytes changed`);
  return {
    source: [
      { path: "reference/pokeemerald/src/m4a_1.s", lines: "726-748", sha256: sha256(assembly) },
      { path: "reference/pokeemerald/src/m4a.c", lines: "333-341", sha256: sha256(cSource) },
    ],
    compiledRegions: regions.map((region) => ({ ...region, bytes: region.end - region.start })),
    timingClasses: { sequentialRomThumbHalfword: 2, takenPipelineRefillPremium: 6, romLiteralPremiumOverInstruction: 9, callbackDataAccessPremium: 0 },
  };
}

function loadPacket<T extends ClearPacket | GatePacket>(directory: string, name: CaseName, expectedHash: string, schema: string): T {
  const bytes = readFileSync(join(directory, `${name}.json`));
  if (sha256(bytes) !== expectedHash) fail(`${name} ${schema} packet hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as T;
  if (packet.schema !== schema || packet.case !== name || packet.oracleProfile !== "battle-scene-off" || packet.observations.length !== COUNTS[name]) fail(`${name} ${schema} identity changed`);
  return packet;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const prior = makeGateEvidence() as { rows: Array<{ sourceStateDigest: string; passCount: number; clearMembers?: number; channelGateSourceCycles: number | null }> };
  const priorByDigest = new Map(prior.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const routeCounts: Record<string, number> = {};
  const callbackCosts: number[] = [];
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; rowsWithCallbacks: number; callbacks: number }> = {};

  for (const name of CASES) {
    const clear = loadPacket<ClearPacket>(CLEAR_PACKETS, name, CLEAR_PACKET_HASHES[name], "factory-m4a-clearchain-probe/v1");
    const gate = loadPacket<GatePacket>(GATE_PACKETS, name, GATE_PACKET_HASHES[name], "factory-m4a-channel-gate-probe/v1");
    const gateByDigest = new Map(gate.observations.map((row) => [row.sourceStateDigest, row]));
    const summary = { rows: clear.observations.length, onePass: 0, zeroPass: 0, rowsWithCallbacks: 0, callbacks: 0 };
    for (const observation of clear.observations) {
      const priorRow = priorByDigest.get(observation.sourceStateDigest);
      const gateRow = gateByDigest.get(observation.sourceStateDigest);
      if (!priorRow || !gateRow) fail(`${name} row does not join frozen channel evidence`);
      if (priorRow.passCount === 0) {
        if (observation.clearChainEntries !== null || gateRow.channelGate !== null || priorRow.channelGateSourceCycles !== 0) fail(`${name} zero-pass row reached ClearChain capture`);
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: name, passCount: 0, callbackCount: 0, channelGateWithClearChainSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      if (observation.clearChainEntries === null || gateRow.channelGate === null) fail(`${name} one-pass state missing`);
      const timings = gateRow.channelGate.tracks.filter((track) => (track.flags & 0x80) !== 0).map((track) => reduceMPlayChannelGateTiming(track.channels));
      const expectedCallbacks = timings.reduce((sum, timing) => sum + timing.clearChainChannels, 0);
      if (observation.clearChainEntries.length !== expectedCallbacks || priorRow.clearMembers !== expectedCallbacks) fail(`${name} callback census does not match gate selection`);
      const callbackTimings = observation.clearChainEntries.map(reduceMPlayClearChainTiming);
      for (const timing of callbackTimings) {
        routeCounts[timing.route] = (routeCounts[timing.route] ?? 0) + 1;
        callbackCosts.push(timing.cycles);
      }
      const baseGateCycles = timings.reduce((sum, timing) => sum
        + timing.sequentialThumbHalfwords * THUMB_FETCH_CYCLES
        + timing.pipelineRefills * PIPELINE_REFILL_CYCLES
        + timing.ewramWordLoadPremiumCycles, 0);
      const callbackCycles = callbackTimings.reduce((sum, timing) => sum + timing.cycles, 0);
      summary.callbacks += expectedCallbacks;
      if (expectedCallbacks > 0) summary.rowsWithCallbacks += 1;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest,
        case: name,
        passCount: 1,
        callbackCount: expectedCallbacks,
        callbackRoutes: callbackTimings.map((timing) => timing.route),
        clearChainSourceCycles: callbackCycles,
        channelGateWithClearChainSourceCycles: baseGateCycles + callbackCycles,
        completeMPlaySourceCycles: null,
      });
    }
    byCase[name] = summary;
  }

  const onePass = rows.filter((row) => row.passCount === 1);
  const rowsWithCallbacks = onePass.filter((row) => (row.callbackCount as number) > 0);
  const callbackRows = rowsWithCallbacks.flatMap((row) => row.callbackRoutes as string[]);
  if (rows.length !== 113 || onePass.length !== 108 || rowsWithCallbacks.length !== 39 || callbackRows.length !== 47) fail("coverage partition changed");
  if (Object.values(routeCounts).reduce((sum, value) => sum + value, 0) !== 47) fail("callback routes do not total 47");
  const exactGateCycles = onePass.map((row) => row.channelGateWithClearChainSourceCycles as number);
  return {
    schema: "factory-m4a-clearchain-evidence/v1",
    oracleProfile: "battle-scene-off",
    sourceAndElf,
    capture: { boundary: "ClearChain wrapper entry", exactCaller: "MPlayMain._081DD8AE", runtimeCompiledPc: "0x082e04b6", state: "address-free current/track/previous/next roles", freshRunsPerCase: 2, repeatability: "byte-identical full packet" },
    frozenInputs: { clearChainPackets: CLEAR_PACKET_HASHES, channelGatePackets: GATE_PACKET_HASHES },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase,
      rowsWithClearChainCallbacks: rowsWithCallbacks.length,
      clearChainCallbacks: callbackRows.length,
      callbackRouteCounts: routeCounts,
      callbackSourceCycleRange: { min: Math.min(...callbackCosts), max: Math.max(...callbackCosts), distinct: new Set(callbackCosts).size },
      exactChannelGateRowsWithinOnePass: onePass.length,
      nullChannelGateRowsWithinOnePass: 0,
      exactChannelGateSourceCycleRange: { min: Math.min(...exactGateCycles), max: Math.max(...exactGateCycles), distinct: new Set(exactGateCycles).size },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "All 47 ClearChain calls in the 39 previously-null channel-gate rows are source-timed from captured link state; the channel-gate component is exact for all 108 one-pass rows.",
      remainingDiscriminator: "The earlier per-track wait/LFO and bounded command-callback components remain unresolved for all 108 one-pass rows.",
      durationFit: false,
      pointerIdentityTable: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "ClearChain closes the remaining 39 channel-gate rows, while complete MPlay costs remain 5 exact / 108 null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as {
    byCase: Record<string, { onePass: number; zeroPass: number; rowsWithCallbacks: number; callbacks: number }>;
    callbackRouteCounts: Record<string, number>;
    exactChannelGateSourceCycleRange: { min: number; max: number; distinct: number };
  };
  return [
    "# Issue #55 — sixth-MPlayMain ClearChain v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-clearchain-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. The packet accepts only `ClearChain` wrapper entries whose caller is MPlayMain's compiled `_081DD8AE` gate callsite and retains address-free current/track/previous/next roles.", "",
    "All **47/47** selected callbacks across the previously-null **39/108** one-pass rows are source-closed. The observed source-route partition is **23** previous-null/next-null (**87** cycles), **19** previous-linked/next-null (**89**), and **5** previous-linked/next-linked (**85**); no track-null or previous-null/next-linked call occurs.", "",
    "| case | one pass | zero pass | callback rows | callbacks |", "| --- | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.byCase[name]!; return `| ${name} | ${row.onePass} | ${row.zeroPass} | ${row.rowsWithCallbacks} | ${row.callbacks} |`; }), "",
    `The full channel-gate component is now exact for **108/108** one-pass rows (${coverage.exactChannelGateSourceCycleRange.min}–${coverage.exactChannelGateSourceCycleRange.max} cycles, ${coverage.exactChannelGateSourceCycleRange.distinct} totals). The reducer instruction-counts the pinned ClearChain wrapper, indirect \`_call_via_r1\` trampoline, and every RealClearChain link branch; MPlayMain's BL remains counted exactly once by the earlier gate reducer. As in the established ROM-prefetch timing class, callback data accesses are hidden beneath instruction fetch and add zero elapsed premium. No observed duration or pointer identity is used.`, "",
    "Complete MPlay costs remain **5 exact / 108 null** because per-track wait/LFO and bounded command-callback components are still unresolved for every one-pass row. No service cost was assigned and `runFactoryConstructionClock` remains unwired.", "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-clearchain-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-clearchain-v1.md") };
  fail("usage: factory-m4a-clearchain-v1.ts [--out-dir PATH]");
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
