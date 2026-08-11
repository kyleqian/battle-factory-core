import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const PACKET_HASHES: Record<CaseName, string> = {
  anchor: "6f0884ff885207a4256106293dbf972c5f11c0fd5b4420a0f9cbb67ed4686c16",
  liliana: "6650f3fbe8396235203747454ee11ae84b716a6e998c69933852b26668b78133",
  "factory-varied": "6e371fa2094059c2d7da3ec4f9e1d9f6b6ac2cd964bcc1cfbe3b431b738ab7d2",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKETS = join(ROOT, "tests/fixtures/factory-m4a-channel-gate-v1");
const EXECUTION = join(ROOT, "tests/fixtures/factory-m4a-mplay-execution-evidence-v1.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-channel-gate-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-channel-gate-v1.md");

const MPLAY_GATE_START = 0x082d_fac4;
const MPLAY_GATE_END = 0x082d_faf2;
const CLEAR_CHAIN_WRAPPER_START = 0x082e_04b4;
const CLEAR_CHAIN_WRAPPER_END = 0x082e_04c8;
const REAL_CLEAR_CHAIN_START = 0x082d_f7fc;
const REAL_CLEAR_CHAIN_END = 0x082d_f81c;
const ROM_BASE = 0x0800_0000;
const THUMB_FETCH_CYCLES = 2;
const PIPELINE_REFILL_CYCLES = 6;
const EWRAM_WORD_PREMIUM_CYCLES = 2;
const SOUND_CHANNEL_SF_ON = 0xc7;

type Channel = { role: string; statusFlags: number; gateTime: number };
type Track = { trackIndex: number; flags: number; channels: Channel[] };
type GateState = { revision: string; playerRole: string; boundary: string; tracks: Track[] };
type Observation = { sourceStateDigest: string; channelGate: GateState | null };
type Packet = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; observations: Observation[] };
type ExecutionRow = {
  sourceStateDigest: string;
  selector: { passCount: number };
  sourceCost: { exact: { sourceCycles: number } | null };
};
type ExecutionEvidence = { schema: string; rows: ExecutionRow[] };

export type MPlayChannelGateTiming = Readonly<{
  route: "exact-no-ClearChain" | "unresolved-ClearChain";
  channelCount: number;
  gateZeroChannels: number;
  gateOneChannels: number;
  gateLargerChannels: number;
  clearChainChannels: number;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  ewramWordLoads: number;
  ewramWordLoadPremiumCycles: number;
  cycles: number | null;
  unresolved: string | null;
}>;

function fail(message: string): never {
  throw new Error(`factory-m4a-channel-gate-v1: ${message}`);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireU8(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) fail(`${label} must be u8`);
  return value;
}

/**
 * Reduce one active track's `_081DD886.._081DD8BA` channel gate.
 *
 * The exact class excludes `ClearChain`: that callback dereferences mutable
 * track/previous/next links not captured in this deliberately small packet.
 * Ordinary ROM Thumb fetches cost two cycles, taken control flow adds six,
 * and each aligned EWRAM word load adds two cycles beyond its instruction
 * baseline. Byte loads/stores have no premium on the retail 16-bit EWRAM bus.
 */
export function reduceMPlayChannelGateTiming(channels: readonly Channel[]): MPlayChannelGateTiming {
  let sequentialThumbHalfwords = 3; // ldr chan; cmp; beq _081DD8BA
  let pipelineRefills = channels.length === 0 ? 1 : 0;
  let ewramWordLoads = 1;
  let gateZeroChannels = 0;
  let gateOneChannels = 0;
  let gateLargerChannels = 0;
  let clearChainChannels = 0;

  channels.forEach((channel, index) => {
    const statusFlags = requireU8(channel.statusFlags, `channel ${index} statusFlags`);
    const gateTime = requireU8(channel.gateTime, `channel ${index} gateTime`);
    if (!/^(direct-channel-(?:[0-9]|1[01])|cgb-channel-[0-3])$/.test(channel.role)) fail(`channel ${index} role is not source-normalized`);
    ewramWordLoads += 1; // nextChannelPointer at `_081DD8B4`
    if ((statusFlags & SOUND_CHANNEL_SF_ON) === 0) {
      clearChainChannels += 1;
      // Status test (4), `adds` (1), BL (2), and common next-link tail (3).
      sequentialThumbHalfwords += 10;
      pipelineRefills += 2; // taken `beq` plus BL; callback/return not claimed
    } else if (gateTime === 0) {
      gateZeroChannels += 1;
      // Status test (4), gate test (3), and common next-link tail (3).
      sequentialThumbHalfwords += 10;
      pipelineRefills += 1; // taken gate-zero `beq`
    } else if (gateTime === 1) {
      gateOneChannels += 1;
      // Status/gate tests (7), decrement/stop tail (7), next-link tail (3).
      sequentialThumbHalfwords += 17;
      pipelineRefills += 1; // unconditional branch after setting STOP
    } else {
      gateLargerChannels += 1;
      // Status/gate tests (7), decrement tail (3), next-link tail (3).
      sequentialThumbHalfwords += 13;
      pipelineRefills += 1; // taken post-decrement `bne`
    }
    if (index + 1 < channels.length) pipelineRefills += 1; // channel back edge
  });

  const ewramWordLoadPremiumCycles = ewramWordLoads * EWRAM_WORD_PREMIUM_CYCLES;
  const sourceCycles = sequentialThumbHalfwords * THUMB_FETCH_CYCLES
    + pipelineRefills * PIPELINE_REFILL_CYCLES
    + ewramWordLoadPremiumCycles;
  const unresolved = clearChainChannels > 0
    ? "ClearChain callback timing requires channel track/previous/next link state at its compiled entry"
    : null;
  return Object.freeze({
    route: unresolved === null ? "exact-no-ClearChain" : "unresolved-ClearChain",
    channelCount: channels.length,
    gateZeroChannels,
    gateOneChannels,
    gateLargerChannels,
    clearChainChannels,
    sequentialThumbHalfwords,
    pipelineRefills,
    ewramWordLoads,
    ewramWordLoadPremiumCycles,
    cycles: unresolved === null ? sourceCycles : null,
    unresolved,
  });
}

function romSlice(start: number, end: number): Buffer {
  const rom = readFileSync(join(ROOT, "reference/pokeemerald/pokeemerald.gba"));
  if (start < ROM_BASE || end <= start || end - ROM_BASE > rom.length) fail("compiled ROM range is invalid");
  return rom.subarray(start - ROM_BASE, end - ROM_BASE);
}

function assertSourceAndElf(): Record<string, unknown> {
  const assembly = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a_1.s"), "utf8");
  const cSource = readFileSync(join(ROOT, "reference/pokeemerald/src/m4a.c"), "utf8");
  for (const anchor of ["_081DD886:", "_081DD892:", "bl ClearChain", "_081DD8B4:", "_081DD8BA:"]) {
    if (!assembly.includes(anchor)) fail(`m4a_1.s lost ${anchor}`);
  }
  for (const anchor of ["void ClearChain(void *x)", "gMPlayJumpTable[34]"]) {
    if (!cSource.includes(anchor)) fail(`m4a.c lost ${anchor}`);
  }
  const regions = [
    { role: "MPlayMain channel gate", start: MPLAY_GATE_START, end: MPLAY_GATE_END, expected: "d8ee9ba572b1b16e1f9f2565dfade26e8e43bec6789c7efed68d7fe750d22a39" },
    { role: "ClearChain wrapper", start: CLEAR_CHAIN_WRAPPER_START, end: CLEAR_CHAIN_WRAPPER_END, expected: "a3981c79c0e6fe3f4604c6f9cb5b2d948ff8c6f20aa99606a8ea99f26bcff207" },
    { role: "RealClearChain target", start: REAL_CLEAR_CHAIN_START, end: REAL_CLEAR_CHAIN_END, expected: "c3d23903d0b87a7b19fcd84aa0234c674e3014a9a2835853727defeaad3422dc" },
  ];
  for (const region of regions) if (sha256(romSlice(region.start, region.end)) !== region.expected) fail(`${region.role} ELF/ROM bytes changed`);
  return {
    source: [
      { path: "reference/pokeemerald/src/m4a_1.s", lines: "1178-1212", sha256: sha256(assembly) },
      { path: "reference/pokeemerald/src/m4a.c", lines: "333-341", sha256: sha256(cSource) },
    ],
    compiledRegions: regions.map(({ expected, ...region }) => ({ ...region, bytes: region.end - region.start, sha256: expected })),
    timingClasses: { sequentialRomThumbHalfword: 2, takenPipelineRefillPremium: 6, alignedEwramWordPremium: 2, alignedEwramBytePremium: 0 },
  };
}

function loadPacket(name: CaseName): Packet {
  const bytes = readFileSync(join(PACKETS, `${name}.json`));
  if (sha256(bytes) !== PACKET_HASHES[name]) fail(`${name} packet hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as Packet;
  if (packet.schema !== "factory-m4a-channel-gate-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} packet identity changed`);
  if (packet.captureBoundary !== "sixth-MPlayMain-one-pass-channel-gate" || packet.observations.length !== COUNTS[name]) fail(`${name} boundary/count changed`);
  return packet;
}

function loadExecution(): ExecutionEvidence {
  const bytes = readFileSync(EXECUTION);
  if (sha256(bytes) !== "81ed2b14a684cb781417a093744ddf5652ef967e9e8c6a117b3e98833af1d9b1") fail("execution evidence hash changed");
  const execution = JSON.parse(bytes.toString("utf8")) as ExecutionEvidence;
  if (execution.schema !== "factory-m4a-mplay-execution-evidence/v1" || execution.rows.length !== 113) fail("execution evidence identity changed");
  return execution;
}

export function makeEvidence(): Record<string, unknown> {
  const sourceAndElf = assertSourceAndElf();
  const execution = loadExecution();
  const executionByDigest = new Map(execution.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, { rows: number; onePass: number; zeroPass: number; exactNoClear: number; unresolvedClear: number; channelMembers: number; clearMembers: number }> = {};

  for (const packet of CASES.map(loadPacket)) {
    const summary = { rows: packet.observations.length, onePass: 0, zeroPass: 0, exactNoClear: 0, unresolvedClear: 0, channelMembers: 0, clearMembers: 0 };
    for (const observation of packet.observations) {
      const executionRow = executionByDigest.get(observation.sourceStateDigest);
      if (!executionRow) fail(`${packet.case} row does not join execution evidence`);
      const passCount = executionRow.selector.passCount;
      if (passCount === 0) {
        if (observation.channelGate !== null || executionRow.sourceCost.exact?.sourceCycles !== 864) fail(`${packet.case} zero-pass boundary mismatch`);
        summary.zeroPass += 1;
        rows.push({ sourceStateDigest: observation.sourceStateDigest, case: packet.case, passCount, componentRoute: "tempo-pass-skipped", channelGateSourceCycles: 0, completeMPlaySourceCycles: 864 });
        continue;
      }
      summary.onePass += 1;
      const gate = observation.channelGate;
      if (gate === null || gate.revision !== "factory-m4a-channel-gate/v1" || gate.playerRole !== "music-player-5" || gate.boundary !== "MPlayMain._081DD874") fail(`${packet.case} one-pass boundary state missing`);
      if (gate.tracks.length !== 10 || gate.tracks.some((track, index) => track.trackIndex !== index)) fail(`${packet.case} track shape changed`);
      if (gate.tracks.map((track) => track.flags).join(",") !== "128,128,128,128,128,128,128,128,128,0") fail(`${packet.case} active-track selector changed`);
      const timings = gate.tracks.filter((track) => (track.flags & 0x80) !== 0).map((track) => reduceMPlayChannelGateTiming(track.channels));
      const channelMembers = timings.reduce((sum, timing) => sum + timing.channelCount, 0);
      const clearMembers = timings.reduce((sum, timing) => sum + timing.clearChainChannels, 0);
      const exact = clearMembers === 0;
      const channelGateSourceCycles = exact ? timings.reduce((sum, timing) => sum + timing.cycles!, 0) : null;
      summary.channelMembers += channelMembers;
      summary.clearMembers += clearMembers;
      summary[exact ? "exactNoClear" : "unresolvedClear"] += 1;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest,
        case: packet.case,
        passCount,
        componentRoute: exact ? "exact-no-ClearChain" : "unresolved-ClearChain",
        activeTracks: timings.length,
        channelMembers,
        clearMembers,
        gateZeroMembers: timings.reduce((sum, timing) => sum + timing.gateZeroChannels, 0),
        gateOneMembers: timings.reduce((sum, timing) => sum + timing.gateOneChannels, 0),
        gateLargerMembers: timings.reduce((sum, timing) => sum + timing.gateLargerChannels, 0),
        channelGateSourceCycles,
        completeMPlaySourceCycles: null,
      });
    }
    byCase[packet.case] = summary;
  }

  if (rows.length !== 113 || new Set(rows.map((row) => row.sourceStateDigest)).size !== 113) fail("expected 113 unique rows");
  const onePass = rows.filter((row) => row.passCount === 1);
  const zeroPass = rows.filter((row) => row.passCount === 0);
  const exactNoClear = onePass.filter((row) => row.channelGateSourceCycles !== null);
  const unresolvedClear = onePass.filter((row) => row.channelGateSourceCycles === null);
  if (onePass.length !== 108 || zeroPass.length !== 5 || exactNoClear.length !== 69 || unresolvedClear.length !== 39) fail("coverage partition changed");
  const exactCycles = exactNoClear.map((row) => row.channelGateSourceCycles as number);
  return {
    schema: "factory-m4a-channel-gate-evidence/v1",
    oracleProfile: "battle-scene-off",
    sourceAndElf,
    capture: { boundary: "MPlayMain._081DD874", runtimeCompiledPc: "0x082dfaac", state: "active Track.flags plus address-free SoundChannel role/statusFlags/gateTime", freshRunsPerCase: 2, repeatability: "byte-identical full packet" },
    frozenInputs: { packets: PACKET_HASHES, executionEvidenceSha256: "81ed2b14a684cb781417a093744ddf5652ef967e9e8c6a117b3e98833af1d9b1" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase,
      channelMembers: onePass.reduce((sum, row) => sum + (row.channelMembers as number), 0),
      clearChainMembers: onePass.reduce((sum, row) => sum + (row.clearMembers as number), 0),
      exactChannelGateRowsWithinOnePass: exactNoClear.length,
      unresolvedClearChainRowsWithinOnePass: unresolvedClear.length,
      exactChannelGateComponentRowsIncludingSkipped: exactNoClear.length + zeroPass.length,
      nullChannelGateComponentRows: unresolvedClear.length,
      exactChannelGateSourceCycleRange: { min: Math.min(...exactCycles), max: Math.max(...exactCycles), distinct: new Set(exactCycles).size },
      exactCompleteMPlaySourceCostRows: 5,
      nullCompleteMPlaySourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The channel gate is source-timed for 69/108 one-pass rows that never select ClearChain; five zero-pass rows skip it.",
      remainingDiscriminator: "39/108 one-pass rows select 47 ClearChain callbacks and require track/previous/next link state at ClearChain entry; wait/LFO and command callback timing remains later for all one-pass rows.",
      durationFit: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "A real 69-row one-pass subset has an exact independently instruction-counted channel-gate component. Complete MPlay costs remain 5 exact / 108 null.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as {
    byCase: Record<string, { onePass: number; zeroPass: number; exactNoClear: number; unresolvedClear: number; channelMembers: number; clearMembers: number }>;
    channelMembers: number;
    clearChainMembers: number;
    exactChannelGateRowsWithinOnePass: number;
    unresolvedClearChainRowsWithinOnePass: number;
    exactChannelGateSourceCycleRange: { min: number; max: number; distinct: number };
  };
  return [
    "# Issue #55 — sixth-MPlayMain channel gate v1", "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-channel-gate-v1.ts`; do not hand-edit.", "",
    "Two fresh serial Battle Scene OFF captures per anchor, LILIANA, and legal-varied epoch were byte-identical. The additive packet joins the frozen source state at the sixth player's compiled `_081DD874` one-pass boundary and retains only active track flags plus address-free channel role, `statusFlags`, and `gateTime`.", "",
    `Across **108** one-pass calls, the gate walks **${coverage.channelMembers}** channel members. **${coverage.exactChannelGateRowsWithinOnePass}/108** rows never select \`ClearChain\` and now have exact source-counted channel-gate components (${coverage.exactChannelGateSourceCycleRange.min}–${coverage.exactChannelGateSourceCycleRange.max} cycles, ${coverage.exactChannelGateSourceCycleRange.distinct} distinct totals). The other **${coverage.unresolvedClearChainRowsWithinOnePass}/108** rows select **${coverage.clearChainMembers}** callbacks and remain null for this component.`, "",
    "| case | one pass | zero pass | exact gate rows | ClearChain rows | channel members | ClearChain members |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...CASES.map((name) => { const row = coverage.byCase[name]!; return `| ${name} | ${row.onePass} | ${row.zeroPass} | ${row.exactNoClear} | ${row.unresolvedClear} | ${row.channelMembers} | ${row.clearMembers} |`; }), "",
    "The reducer follows the pinned ELF route at `0x082dfac4..0x082dfaf2`: ordinary WS0 Thumb fetches are 2 cycles, taken branches add a 6-cycle refill, aligned EWRAM word loads add a 2-cycle bus premium, and byte accesses add none. Empty chains and the three non-callback gate paths (`gateTime` 0, 1, or >1) are accounted separately. The compiled `ClearChain` wrapper and `RealClearChain` target bytes are pinned but deliberately not priced without their mutable link inputs.", "",
    "Complete MPlay costs therefore remain **5 exact / 108 null**. The next discriminator for this slice is the 39-row `ClearChain` entry link state; wait/LFO and bounded command-callback timing remain later. No observed duration was fitted, no service cost was assigned, and `runFactoryConstructionClock` remains unwired.", "",
  ].join("\n");
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-channel-gate-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-channel-gate-v1.md") };
  fail("usage: factory-m4a-channel-gate-v1.ts [--out-dir PATH]");
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
