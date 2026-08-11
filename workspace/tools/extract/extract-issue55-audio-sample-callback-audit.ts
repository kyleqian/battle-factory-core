// Source/receipt reducer for Issue #55's mGBA 0.10.5 GBA Audio Sample
// callback. This is evidence only: it neither models callback duration nor
// creates a construction-clock input.
//
// Reproduce from the pinned archive root:
// node --experimental-strip-types tools/extract/extract-issue55-audio-sample-callback-audit.ts \
//   --source /path/to/mgba-0.10.5 --archive /path/to/mgba-0.10.5.tar.gz

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const DEFAULT_OUTPUT = join(ROOT, "tests", "fixtures", "issue55-audio-sample-callback-audit-v1.json");
const EXPECTED_ARCHIVE_SHA256 = "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14";

const SOURCE_HASHES = {
  "src/core/timing.c": "f1290a60ea28cce32ef54c383397b2e2beff852dc02f8d44a69ef78ca7989d51",
  "src/gba/gba.c": "92b0fd214bfa563a1694921661c4413ffd96871cd6162cd762542fb5c2a2c098",
  "src/gba/timer.c": "318054f31c767090b907fe2a32f65f878a702e339468c727a54c6f2b865b83f2",
  "src/gba/audio.c": "32f8067d09c80b3e77bedc16d52f16a3b4ee7ba099a6cd24e8d5cc8579729a7c",
  "src/gba/core.c": "57cc9ac807357a5bf27a5e44aec83e3e0696e7be41bddf26ac4f653aa23fc723",
  "src/gba/extra/audio-mixer.c": "3bb8ab8b95f07545c6d91cf2a995410b73cb92ab7ccecc677b032c0bc6247f48",
} as const;

const SOURCE_ANCHORS = [
  { id: "timing-order", file: "src/core/timing.c", lines: "36-59" },
  { id: "timing-dispatch", file: "src/core/timing.c", lines: "96-117" },
  { id: "timer0-registration", file: "src/gba/timer.c", lines: "66-84" },
  { id: "timer0-fifo-owner", file: "src/gba/timer.c", lines: "13-43" },
  { id: "audio-registration", file: "src/gba/audio.c", lines: "26-38" },
  { id: "audio-fifo-helper", file: "src/gba/audio.c", lines: "327-374" },
  { id: "audio-mixer-branches", file: "src/gba/audio.c", lines: "386-437" },
  { id: "audio-sample-callback", file: "src/gba/audio.c", lines: "439-482" },
  { id: "optional-hle-config", file: "src/gba/core.c", lines: "634-642" },
  { id: "builtin-mixer-registration", file: "src/gba/extra/audio-mixer.c", lines: "21-27" },
  { id: "builtin-mixer-step", file: "src/gba/extra/audio-mixer.c", lines: "256-297" },
] as const;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a path`);
  return value;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function requireSnippets(path: string, source: string, snippets: readonly string[]): void {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) throw new Error(`${path} is missing audited snippet: ${snippet}`);
  }
}

const sourceArg = argument("--source");
if (sourceArg === undefined) throw new Error("--source /path/to/mgba-0.10.5 is required");
const SOURCE = resolve(sourceArg);
const archiveArg = argument("--archive");
const outputArg = argument("--out");
const OUTPUT = outputArg === undefined ? DEFAULT_OUTPUT : resolve(outputArg);

if (archiveArg !== undefined) {
  const archiveDigest = sha256(readFileSync(resolve(archiveArg)));
  if (archiveDigest !== EXPECTED_ARCHIVE_SHA256) {
    throw new Error(`mGBA 0.10.5 archive SHA-256 mismatch: ${archiveDigest}`);
  }
}

const sources = new Map<string, string>();
for (const [path, expectedDigest] of Object.entries(SOURCE_HASHES)) {
  const bytes = readFileSync(join(SOURCE, path));
  const actualDigest = sha256(bytes);
  if (actualDigest !== expectedDigest) {
    throw new Error(`stale source file: ${path}; expected ${expectedDigest}, got ${actualDigest}`);
  }
  sources.set(path, bytes.toString("utf8"));
}

const timing = sources.get("src/core/timing.c")!;
const timer = sources.get("src/gba/timer.c")!;
const audio = sources.get("src/gba/audio.c")!;
const core = sources.get("src/gba/core.c")!;
const mixer = sources.get("src/gba/extra/audio-mixer.c")!;
const gba = sources.get("src/gba/gba.c")!;

requireSnippets("src/core/timing.c", timing, [
  "event->when = nextEvent + timing->masterCycles;",
  "if (nextWhen > nextEvent || (nextWhen == nextEvent && next->priority > priority)) {",
  "next->callback(timing, next->context, -nextWhen);",
]);
requireSnippets("src/gba/timer.c", timer, [
  "gba->timers[0].event.name = \"GBA Timer 0\";",
  "gba->timers[0].event.priority = 0x20;",
  "if (gba->audio.enable && timerId < 2)",
  "GBAAudioSampleFIFO(&gba->audio, 0, cyclesLate);",
  "GBAAudioSampleFIFO(&gba->audio, 1, cyclesLate);",
]);
requireSnippets("src/gba/audio.c", audio, [
  "const int SAMPLE_INTERVAL = GBA_ARM7TDMI_FREQUENCY / 0x4000;",
  "audio->sampleEvent.name = \"GBA Audio Sample\";",
  "audio->sampleEvent.priority = 0x18;",
  "void GBAAudioSampleFIFO(struct GBAAudio* audio, int fifoId, int32_t cycles) {",
  "GBADMASchedule(audio->p, channel->dmaSource, dma);",
  "if (audio->mixer) {",
  "audio->mixer->step(audio->mixer);",
  "if (!audio->externalMixing) {",
  "GBAAudioSample(audio, mTimingCurrentTime(&audio->p->timing) - cyclesLate);",
  "audio->p->earlyExit = true;",
  "mTimingSchedule(timing, &audio->sampleEvent, SAMPLE_INTERVAL - cyclesLate);",
]);
requireSnippets("src/gba/core.c", core, [
  "mCoreConfigGetIntValue(&core->config, \"gba.audioHle\", &useAudioMixer) && useAudioMixer",
  "GBAAudioMixerCreate(gbacore->audioMixer);",
  "ARMHotplugAttach(core->cpu, CPU_COMPONENT_AUDIO_MIXER);",
]);
requireSnippets("src/gba/extra/audio-mixer.c", mixer, [
  "mixer->step = _mp2kStep;",
  "void _mp2kStep(struct GBAAudioMixer* mixer) {",
  "if (mixer->p->externalMixing) {",
]);
requireSnippets("src/gba/gba.c", gba, [
  "} while (gba->cpuBlocked && !gba->earlyExit);",
  "if (gba->earlyExit) {",
]);
for (const forbidden of ["mTimingSchedule", "GBADMASchedule", "GBAAudioSampleFIFO", "GBARaiseIRQ"]) {
  requireCondition(!mixer.includes(forbidden), `built-in MP2K mixer unexpectedly contains ${forbidden}`);
}

type QueueEvent = { name: string; priority: number; due: boolean; whenDelta: number };
type Dma = { channel: number; internalNextCount: number };
type Crossing = {
  label: string;
  component: string;
  ordinal: number;
  fifoRefillObserved: boolean;
  observedEdgeCycles: number;
  coDueEventNames: string[];
  crossedEventNames: string[];
  before: {
    fifo: {
      a: { fifoWordLevel: number; internalRemaining: number };
      b: { fifoWordLevel: number; internalRemaining: number };
    };
    dma: Dma[];
    queue: QueueEvent[];
  };
  after: {
    fifo: {
      a: { fifoWordLevel: number; internalRemaining: number };
      b: { fifoWordLevel: number; internalRemaining: number };
    };
    dma: Dma[];
    queue: QueueEvent[];
  };
};
type FifoReceipt = { schema: string; oracleProfile: string; crossings: Crossing[] };
type ReachabilityReceipt = {
  schema: string;
  release: { oracleProfile: string; mgbaVersion: string; mgbaArchiveSha256: string };
  constructionCensus: {
    runtimeWindowClasses: Array<{ audioEnabled: boolean; mixerPresent: boolean; externalMixing: boolean }>;
  };
  constructionReachability: { mixerPresent: string; audioDisabled: string };
};

function input(path: string): { path: string; bytes: Buffer; value: unknown } {
  const bytes = readFileSync(join(ROOT, path));
  return { path, bytes, value: JSON.parse(bytes.toString("utf8")) as unknown };
}

function event(queue: readonly QueueEvent[], name: string, label: string): QueueEvent {
  const matches = queue.filter((candidate) => candidate.name === name);
  requireCondition(matches.length === 1, `${label}: expected exactly one ${name} event`);
  return matches[0]!;
}

function fifoDmaNextCounts(dma: readonly Dma[], label: string): number[] {
  const selected = dma.filter((channel) => channel.channel === 1 || channel.channel === 2)
    .sort((left, right) => left.channel - right.channel);
  requireCondition(selected.map((channel) => channel.channel).join(",") === "1,2", `${label}: expected DMA1/DMA2`);
  return selected.map((channel) => channel.internalNextCount);
}

const CASES = ["anchor", "liliana", "factory-varied"] as const;
const fifoInputs = CASES.map((name) => input(`tests/fixtures/factory-construction-timer0-fifo-v1/${name}.json`));
const reachabilityInput = input("tests/fixtures/factory-timer0-reachability-audit-v1.json");
const allInputs = [...fifoInputs, reachabilityInput];

const selectedRows: Array<{ caseName: typeof CASES[number]; row: Crossing }> = [];
for (const [index, packet] of fifoInputs.entries()) {
  const value = packet.value as FifoReceipt;
  const caseName = CASES[index]!;
  requireCondition(value.schema === "factory-construction-timer0-fifo-crossings/v1", `${caseName}: wrong FIFO receipt schema`);
  requireCondition(value.oracleProfile === "battle-scene-off", `${caseName}: wrong FIFO receipt profile`);
  selectedRows.push(...value.crossings
    .filter((row) => row.label === "member" && row.fifoRefillObserved && row.coDueEventNames.includes("GBA Audio Sample"))
    .map((row) => ({ caseName, row })));
}
requireCondition(selectedRows.length === 3, `expected exactly three natural Audio co-due rows, got ${selectedRows.length}`);

const reachability = reachabilityInput.value as ReachabilityReceipt;
requireCondition(reachability.schema === "factory-timer0-reachability-audit/v1", "wrong construction reachability schema");
requireCondition(reachability.release.oracleProfile === "battle-scene-off", "wrong construction reachability profile");
requireCondition(reachability.release.mgbaVersion === "0.10.5", "wrong construction reachability mGBA version");
requireCondition(reachability.release.mgbaArchiveSha256 === EXPECTED_ARCHIVE_SHA256, "wrong construction reachability archive hash");
const runtimeWindowClasses = reachability.constructionCensus.runtimeWindowClasses;
requireCondition(runtimeWindowClasses.length === 2, "expected two prior exact runtime windows");
requireCondition(runtimeWindowClasses.every((window) => window.audioEnabled && !window.mixerPresent && !window.externalMixing),
  "prior exact runtime windows no longer exclude disabled/mixer/external state");

const rows = selectedRows.map(({ caseName, row }) => {
  const label = `${caseName}/${row.component}/${row.ordinal}`;
  const timerBefore = event(row.before.queue, "GBA Timer 0", `${label} before`);
  const audioBefore = event(row.before.queue, "GBA Audio Sample", `${label} before`);
  const audioAfter = event(row.after.queue, "GBA Audio Sample", `${label} after`);
  const timerAfter = event(row.after.queue, "GBA Timer 0", `${label} after`);
  requireCondition(timerBefore.due && audioBefore.due, `${label}: Timer 0 and Audio Sample must both be due`);
  requireCondition(audioBefore.priority === 24 && timerBefore.priority === 32, `${label}: unexpected Audio/Timer priorities`);
  const audioMinusTimerWhenDelta = audioBefore.whenDelta - timerBefore.whenDelta;
  requireCondition(audioMinusTimerWhenDelta === 1, `${label}: Audio Sample must be one cycle later than Timer 0`);
  requireCondition(audioAfter.whenDelta === audioBefore.whenDelta + 1024 - row.observedEdgeCycles,
    `${label}: Audio Sample reschedule does not preserve its 1024-cycle cadence`);
  requireCondition(timerAfter.whenDelta === timerBefore.whenDelta + 1254 - row.observedEdgeCycles,
    `${label}: Timer 0 reschedule does not preserve its 1254-cycle cadence`);
  requireCondition(row.crossedEventNames.includes("GBA Timer 0") && row.crossedEventNames.includes("GBA Audio Sample"),
    `${label}: missing crossed callback`);
  const dueOrder = [...row.before.queue].filter((candidate) => candidate.due)
    .sort((left, right) => left.whenDelta - right.whenDelta || left.priority - right.priority)
    .map((candidate) => candidate.name);
  return {
    case: caseName,
    component: row.component,
    ordinal: row.ordinal,
    coDueEventNames: row.coDueEventNames,
    observedEdgeCycles: row.observedEdgeCycles,
    dueOrderByDeadlineThenPriority: dueOrder,
    audioTimerDeadlineDelta: audioMinusTimerWhenDelta,
    audioReschedule: {
      beforeWhenDelta: audioBefore.whenDelta,
      afterWhenDelta: audioAfter.whenDelta,
      expectedAfterWhenDelta: audioBefore.whenDelta + 1024 - row.observedEdgeCycles,
    },
    timerReschedule: {
      beforeWhenDelta: timerBefore.whenDelta,
      afterWhenDelta: timerAfter.whenDelta,
      expectedAfterWhenDelta: timerBefore.whenDelta + 1254 - row.observedEdgeCycles,
    },
    fifoAndDma: {
      wordLevels: [row.before.fifo.a.fifoWordLevel, row.before.fifo.b.fifoWordLevel],
      wordLevelsAfter: [row.after.fifo.a.fifoWordLevel, row.after.fifo.b.fifoWordLevel],
      internalRemaining: [row.before.fifo.a.internalRemaining, row.before.fifo.b.internalRemaining],
      internalRemainingAfter: [row.after.fifo.a.internalRemaining, row.after.fifo.b.internalRemaining],
      dmaNextCounts: fifoDmaNextCounts(row.before.dma, `${label} before`),
      dmaNextCountsAfter: fifoDmaNextCounts(row.after.dma, `${label} after`),
    },
  } as const;
});

const receipt = {
  schema: "issue55-audio-sample-callback-audit/v1",
  scope: "mGBA 0.10.5 source and three committed Battle Scene OFF Audio-co-due Timer 0 rows; no callback-duration or runtime-graph claim",
  release: {
    url: "https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz",
    sha256: EXPECTED_ARCHIVE_SHA256,
    archiveRoot: "mgba-0.10.5",
    oracleProfile: "battle-scene-off",
  },
  source: {
    files: Object.entries(SOURCE_HASHES).map(([path, digest]) => ({ path, sha256: digest })),
    anchors: SOURCE_ANCHORS,
  },
  inputReceipts: allInputs.map((packet) => ({ path: packet.path, sha256: sha256(packet.bytes) })),
  exactSourceFacts: {
    registration: {
      audioSample: { name: "GBA Audio Sample", priority: 24, intervalMasterCycles: 1024 },
      timer0: { name: "GBA Timer 0", priority: 32, periodMasterCycles: 1254 },
      equalDeadlineOrder: "lower numeric priority runs first; therefore Audio Sample precedes Timer 0 when their absolute deadlines are equal",
    },
    callback: {
      correctedDeadline: "_sample calls GBAAudioSample at mTimingCurrentTime - cyclesLate, the callback's original due time D",
      directMutation: [
        "mixes PSG and current direct-sound staging into currentSamples",
        "fills both FIFO staging sample arrays from their final current value",
        "updates blip/output state and may set earlyExit when mCoreSyncProduceAudio reports interruption",
      ],
      directTimingEffect: "_sample directly schedules only its own GBA Audio Sample event with SAMPLE_INTERVAL - cyclesLate, preserving D + 1024",
      noDirectFifoDmaOrIrq: "_sample does not directly call GBAAudioSampleFIFO, GBADMASchedule, or GBARaiseIRQ; Timer 0 owns FIFO consumption and custom FIFO-DMA requests",
    },
    mixingBranches: {
      mixerPointer: "GBAAudioSample calls mixer->step only when audio->mixer is non-null",
      externalMixing: "when externalMixing is false, direct-sound A/B contributions are added subject to their force-disable/output flags; true skips those additions",
      optionalBuiltinHle: "mGBA constructs the built-in MP2K mixer only for nonzero gba.audioHle; its _mp2kStep source contains no mTimingSchedule, GBADMASchedule, GBAAudioSampleFIFO, or GBARaiseIRQ call",
      indirectBoundary: "mixer->step and stream postAudioFrame/postAudioBuffer are function-pointer paths; this receipt does not claim their transitive behavior for unobserved host configuration",
    },
  },
  constructionEpochState: {
    priorExactRuntimeWindows: {
      count: runtimeWindowClasses.length,
      audioEnabled: true,
      mixerPresent: false,
      externalMixing: false,
    },
    scopedExclusions: {
      mixerPresent: reachability.constructionReachability.mixerPresent,
      audioDisabled: reachability.constructionReachability.audioDisabled,
      externalMixing: "with the audited oracle mixer absent, the optional external-mixing bypass is excluded for the construction epoch",
    },
    perRowBoundary: "The three compact FIFO rows do not capture audio.mixer, externalMixing, stream, sync, PSG, or output-route fields; their callback duration and those row-specific branch outcomes remain unobserved.",
  },
  naturalAudioCoDueRows: rows,
  explicitBoundary: [
    "Co-due means the events crossed within one observed instruction edge. In all three rows Audio Sample is due one master cycle after Timer 0, so none is an exact Audio/Timer equal-deadline observation.",
    "The source equal-deadline priority rule is conditional only: it proves Audio Sample would precede Timer 0 at one exact shared deadline, not that it did so in these three adjacent-deadline rows.",
    "The before/after receipts validate both periodic reschedules and paired FIFO/DMA end state, but do not expose a per-callback execution graph, callback duration, mixer state per row, or host callback outcome.",
    "This audit supplies no service-cost constant, does not use an absolute fixture lookup, and must not wire the construction clock.",
  ],
} as const;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`verified mGBA 0.10.5 source and wrote ${OUTPUT}`);
