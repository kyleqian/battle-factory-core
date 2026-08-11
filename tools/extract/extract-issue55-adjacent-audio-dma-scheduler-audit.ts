// Source/receipt reducer for Issue #55's adjacent Timer 0 / Audio Sample
// scheduler boundary. This evidence does not emit a construction-clock input
// or claim a live LILIANA callback order.
//
// Reproduce:
// node --experimental-strip-types tools/extract/extract-issue55-adjacent-audio-dma-scheduler-audit.ts
//   --source /path/to/mgba-0.10.5 --archive /path/to/mgba-0.10.5.tar.gz

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const DEFAULT_OUTPUT = join(ROOT, "tests", "fixtures", "issue55-adjacent-audio-dma-scheduler-audit-v1.json");
const EXPECTED_ARCHIVE_SHA256 = "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14";

const SOURCE_HASHES = {
  "src/core/timing.c": "f1290a60ea28cce32ef54c383397b2e2beff852dc02f8d44a69ef78ca7989d51",
  "src/gba/gba.c": "92b0fd214bfa563a1694921661c4413ffd96871cd6162cd762542fb5c2a2c098",
  "src/gba/timer.c": "318054f31c767090b907fe2a32f65f878a702e339468c727a54c6f2b865b83f2",
  "src/gba/audio.c": "32f8067d09c80b3e77bedc16d52f16a3b4ee7ba099a6cd24e8d5cc8579729a7c",
  "src/gba/dma.c": "83f1ff180942907d274208284d3d5d9148bbcb9e60ab51302bf59933d1ccdb41",
  "include/mgba/internal/gba/memory.h": "bc959b786218da4ce1a8215be66fb907aa25d32bd7c76a0493b9def4f9992ad6",
  "src/gba/memory.c": "3cb9a1595e36f11cd712407c559064dda781ab85cce7e5e3e3b9883b1f2ba19a",
} as const;

const SOURCE_ANCHORS = [
  { id: "timing-insert", file: "src/core/timing.c", lines: "36-59" },
  { id: "timing-due-dispatch", file: "src/core/timing.c", lines: "96-117" },
  { id: "timer0-callback", file: "src/gba/timer.c", lines: "13-43" },
  { id: "timer0-corrected-reschedule", file: "src/gba/timer.c", lines: "86-114" },
  { id: "audio-fifo-request", file: "src/gba/audio.c", lines: "327-374" },
  { id: "audio-sample-corrected-reschedule", file: "src/gba/audio.c", lines: "439-482" },
  { id: "dma-event-registration", file: "src/gba/dma.c", lines: "19-24" },
  { id: "dma-custom-schedule", file: "src/gba/dma.c", lines: "112-137" },
  { id: "dma-event-and-selection", file: "src/gba/dma.c", lines: "185-241" },
  { id: "dma-per-word-service", file: "src/gba/dma.c", lines: "243-334" },
  { id: "cpu-blocked-event-loop", file: "src/gba/gba.c", lines: "293-339" },
  { id: "memory-regions", file: "include/mgba/internal/gba/memory.h", lines: "23-49" },
  { id: "default-waitstates", file: "src/gba/memory.c", lines: "35-75" },
] as const;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(name + " needs a path");
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
    if (!source.includes(snippet)) throw new Error(path + " is missing audited snippet: " + snippet);
  }
}

type QueueEvent = { name: string; priority: number; due: boolean; whenDelta: number };
type Fifo = { fifoWordLevel: number; internalRemaining: number; dmaSource: number };
type Dma = { channel: number; internalNextCount: number };
type Crossing = {
  label: string;
  component: string;
  ordinal: number;
  fifoRefillObserved: boolean;
  observedEdgeCycles: number;
  coDueEventNames: string[];
  crossedEventNames: string[];
  before: { fifo: { a: Fifo; b: Fifo }; dma: Dma[]; queue: QueueEvent[] };
  after: { fifo: { a: Fifo; b: Fifo }; dma: Dma[]; queue: QueueEvent[] };
};
type FifoReceipt = { schema: string; oracleProfile: string; crossings: Crossing[] };
type RuntimeDma = {
  channel: number;
  enabled: boolean;
  timing: number;
  count: number;
  nextCount: number;
  source: number;
  destination: number;
};
type RuntimeWindow = {
  kind: string;
  exactCoDueCallbacksBeforeTimer0: Array<{ name: string; priority: number }>;
  timer0CurrentEvent: { name: string; priority: number; cyclesLate: number };
  timer0Entry: {
    scheduler: { currentTime: number };
    audio: { enabled: boolean; mixer: { present: boolean; externalMixing: boolean } };
    fifo: { a: Fifo; b: Fifo };
    dma: RuntimeDma[];
    activeDma: number;
    cpuBlocked: boolean;
    queue: Array<{ name: string; due: boolean }>;
  };
  requestOrder: Array<{ fifo: string; dmaChannel: number }>;
  dmaCallbacks: Array<{ activeDma: number }>;
  completionOrder: number[];
  afterCompletion: { scheduler: { currentTime: number } };
};
type RuntimeReceipt = { schema: string; oracleProfile: string; windows: RuntimeWindow[] };

function readInput(path: string): { path: string; bytes: Buffer; value: unknown } {
  const bytes = readFileSync(join(ROOT, path));
  return { path, bytes, value: JSON.parse(bytes.toString("utf8")) as unknown };
}

function event(queue: readonly QueueEvent[], name: string, label: string): QueueEvent {
  const matches = queue.filter((candidate) => candidate.name === name);
  requireCondition(matches.length === 1, label + ": expected one " + name);
  return matches[0]!;
}

function fifoDmas(dma: readonly Dma[], label: string): number[] {
  const selected = dma.filter((candidate) => candidate.channel === 1 || candidate.channel === 2)
    .sort((left, right) => left.channel - right.channel);
  requireCondition(selected.map((candidate) => candidate.channel).join(",") === "1,2", label + ": expected DMA1/DMA2");
  return selected.map((candidate) => candidate.internalNextCount);
}

function freshDualPair(fifo: { a: Fifo; b: Fifo }, dma: readonly RuntimeDma[], label: string): void {
  requireCondition(
    fifo.a.fifoWordLevel === 3 && fifo.b.fifoWordLevel === 3
      && fifo.a.internalRemaining === 3 && fifo.b.internalRemaining === 3
      && fifo.a.dmaSource === 1 && fifo.b.dmaSource === 2,
    label + ": wrong paired FIFO entry state",
  );
  const pair = dma.filter((candidate) => candidate.channel === 1 || candidate.channel === 2);
  requireCondition(pair.map((candidate) => candidate.channel).join(",") === "1,2", label + ": missing DMA1/DMA2");
  requireCondition(
    pair.every((candidate) => candidate.enabled && candidate.timing === 3 && candidate.count === 4 && candidate.nextCount === 0),
    label + ": wrong fresh custom DMA entry state",
  );
  requireCondition(
    pair.every((candidate) => (candidate.source >>> 24) === 3 && (candidate.destination >>> 24) === 4),
    label + ": expected IWRAM-to-IO FIFO pair",
  );
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
    throw new Error("mGBA 0.10.5 archive SHA-256 mismatch: " + archiveDigest);
  }
}

const sources = new Map<string, string>();
for (const [path, expectedDigest] of Object.entries(SOURCE_HASHES)) {
  const bytes = readFileSync(join(SOURCE, path));
  const actualDigest = sha256(bytes);
  if (actualDigest !== expectedDigest) {
    throw new Error("stale source file: " + path + "; expected " + expectedDigest + ", got " + actualDigest);
  }
  sources.set(path, bytes.toString("utf8"));
}

const timing = sources.get("src/core/timing.c")!;
const timer = sources.get("src/gba/timer.c")!;
const audio = sources.get("src/gba/audio.c")!;
const dma = sources.get("src/gba/dma.c")!;
const gba = sources.get("src/gba/gba.c")!;
const memory = sources.get("src/gba/memory.c")!;

requireSnippets("src/core/timing.c", timing, [
  "if (nextWhen > nextEvent || (nextWhen == nextEvent && next->priority > priority)) {",
  "if (nextWhen > 0) {",
  "next->callback(timing, next->context, -nextWhen);",
]);
requireSnippets("src/gba/timer.c", timer, [
  "GBATimerUpdateRegister(gba, timerId, cyclesLate);",
  "GBAAudioSampleFIFO(&gba->audio, 0, cyclesLate);",
  "GBAAudioSampleFIFO(&gba->audio, 1, cyclesLate);",
  "int32_t currentTime = mTimingCurrentTime(&gba->timing) - cyclesLate;",
]);
requireSnippets("src/gba/audio.c", audio, [
  "dma->when = mTimingCurrentTime(&audio->p->timing) - cycles;",
  "dma->nextCount = 4;",
  "GBADMASchedule(audio->p, channel->dmaSource, dma);",
  "GBAAudioSample(audio, mTimingCurrentTime(&audio->p->timing) - cyclesLate);",
  "mTimingSchedule(timing, &audio->sampleEvent, SAMPLE_INTERVAL - cyclesLate);",
]);
requireSnippets("src/gba/dma.c", dma, [
  "gba->memory.dmaEvent.priority = 0x40;",
  "case GBA_DMA_TIMING_CUSTOM:",
  "if (dma->nextCount == dma->count) {",
  "dma->when = mTimingCurrentTime(&gba->timing);",
  "gba->cpuBlocked = true;",
  "info->when += cycles;",
  "int32_t time = dma->when - info->when;",
  "dma->when = info->when;",
  "info->nextCount |= 0x80000000;",
  "info->when += 2;",
  "GBADMAUpdate(gba);",
]);
requireSnippets("src/gba/gba.c", gba, [
  "} while (gba->cpuBlocked && !gba->earlyExit);",
  "if (gba->cpuBlocked) {",
  "cpu->cycles = cpu->nextEvent;",
]);
requireSnippets("src/gba/memory.c", memory, [
  "static const char GBA_BASE_WAITSTATES_32",
  "static const char GBA_BASE_WAITSTATES_SEQ_32",
  "gba->memory.waitstatesNonseq32[i] = GBA_BASE_WAITSTATES_32[i];",
]);

const lilianaInput = readInput("tests/fixtures/factory-construction-timer0-fifo-v1/liliana.json");
const variedInput = readInput("tests/fixtures/factory-construction-timer0-fifo-v1/factory-varied.json");
const runtimeInput = readInput("tests/fixtures/factory-timer0-scheduler-runtime-v1.json");

const selectedRows: Array<{ caseName: string; row: Crossing }> = [];
for (const { caseName, packet } of [
  { caseName: "liliana", packet: lilianaInput },
  { caseName: "factory-varied", packet: variedInput },
] as const) {
  const receipt = packet.value as FifoReceipt;
  requireCondition(receipt.schema === "factory-construction-timer0-fifo-crossings/v1", caseName + ": wrong FIFO receipt schema");
  requireCondition(receipt.oracleProfile === "battle-scene-off", caseName + ": wrong FIFO receipt profile");
  selectedRows.push(...receipt.crossings
    .filter((row) => row.label === "member" && row.fifoRefillObserved && row.coDueEventNames.includes("GBA Audio Sample"))
    .map((row) => ({ caseName, row })));
}
requireCondition(selectedRows.length === 3, "expected exactly three committed adjacent Audio rows");

const rows = selectedRows.map(({ caseName, row }) => {
  const label = caseName + "/" + row.component + "/" + row.ordinal;
  const timerBefore = event(row.before.queue, "GBA Timer 0", label + " before");
  const audioBefore = event(row.before.queue, "GBA Audio Sample", label + " before");
  const videoBefore = event(row.before.queue, "GBA Video", label + " before");
  const timerAfter = event(row.after.queue, "GBA Timer 0", label + " after");
  const audioAfter = event(row.after.queue, "GBA Audio Sample", label + " after");
  requireCondition(timerBefore.due && audioBefore.due, label + ": Timer 0 and Audio Sample must both be due");
  requireCondition(audioBefore.whenDelta - timerBefore.whenDelta === 1, label + ": Audio deadline must be D + 1");
  requireCondition(timerBefore.priority === 32 && audioBefore.priority === 24, label + ": unexpected priorities");
  requireCondition(row.observedEdgeCycles === 20, label + ": expected the committed 20-cycle edge");
  requireCondition(
    row.before.fifo.a.fifoWordLevel === 3 && row.before.fifo.b.fifoWordLevel === 3
      && row.before.fifo.a.internalRemaining === 3 && row.before.fifo.b.internalRemaining === 3,
    label + ": wrong FIFO entry state",
  );
  requireCondition(
    row.after.fifo.a.fifoWordLevel === 7 && row.after.fifo.b.fifoWordLevel === 7
      && row.after.fifo.a.internalRemaining === 2 && row.after.fifo.b.internalRemaining === 2,
    label + ": wrong FIFO exit state",
  );
  requireCondition(fifoDmas(row.before.dma, label + " before").every((count) => count === 0), label + ": pending DMA before");
  requireCondition(fifoDmas(row.after.dma, label + " after").every((count) => count === 0), label + ": pending DMA after");
  requireCondition(timerAfter.whenDelta === timerBefore.whenDelta + 1254 - row.observedEdgeCycles, label + ": Timer 0 cadence mismatch");
  requireCondition(audioAfter.whenDelta === audioBefore.whenDelta + 1024 - row.observedEdgeCycles, label + ": Audio Sample cadence mismatch");
  return {
    case: caseName,
    component: row.component,
    ordinal: row.ordinal,
    observedEdgeCycles: row.observedEdgeCycles,
    crossedEventNames: row.crossedEventNames,
    coDueEventNames: row.coDueEventNames,
    preInstructionDueRootsByDeadlineThenPriority: [...row.before.queue]
      .filter((candidate) => candidate.due)
      .sort((left, right) => left.whenDelta - right.whenDelta || left.priority - right.priority)
      .map((candidate) => candidate.name),
    timer0: { priority: timerBefore.priority, whenDelta: timerBefore.whenDelta },
    audioSample: { priority: audioBefore.priority, whenDelta: audioBefore.whenDelta, deadlineMinusTimer0: audioBefore.whenDelta - timerBefore.whenDelta },
    video: { priority: videoBefore.priority, due: videoBefore.due, whenDelta: videoBefore.whenDelta },
    pairedFifoDmaBoundary: {
      fifoWordLevels: [row.before.fifo.a.fifoWordLevel, row.before.fifo.b.fifoWordLevel],
      fifoWordLevelsAfter: [row.after.fifo.a.fifoWordLevel, row.after.fifo.b.fifoWordLevel],
      internalRemaining: [row.before.fifo.a.internalRemaining, row.before.fifo.b.internalRemaining],
      internalRemainingAfter: [row.after.fifo.a.internalRemaining, row.after.fifo.b.internalRemaining],
      dmaNextCountsBefore: fifoDmas(row.before.dma, label + " before"),
      dmaNextCountsAfter: fifoDmas(row.after.dma, label + " after"),
    },
  } as const;
});

const runtime = runtimeInput.value as RuntimeReceipt;
requireCondition(runtime.schema === "factory-timer0-scheduler-runtime/v1", "wrong runtime receipt schema");
requireCondition(runtime.oracleProfile === "battle-scene-off", "wrong runtime receipt profile");
requireCondition(runtime.windows.map((window) => window.kind).join(",") === "isolated-dual-refill,video-co-due-dual-refill", "runtime receipt must keep isolated/Video pair");

const priorRuntimeWindows = runtime.windows.map((window) => {
  requireCondition(window.timer0CurrentEvent.name === "GBA Timer 0" && window.timer0CurrentEvent.priority === 32, window.kind + ": wrong Timer 0 event");
  requireCondition(window.timer0CurrentEvent.cyclesLate === 0, window.kind + ": expected on-time Timer 0");
  requireCondition(window.timer0Entry.audio.enabled, window.kind + ": expected audio enabled");
  requireCondition(!window.timer0Entry.audio.mixer.present && !window.timer0Entry.audio.mixer.externalMixing, window.kind + ": wrong mixer state");
  freshDualPair(window.timer0Entry.fifo, window.timer0Entry.dma, window.kind);
  const audioEvent = window.timer0Entry.queue.filter((candidate) => candidate.name === "GBA Audio Sample");
  requireCondition(audioEvent.length === 1 && audioEvent[0]!.due === false, window.kind + ": Audio Sample unexpectedly due before Timer 0");
  requireCondition(window.requestOrder.map((request) => request.fifo + ":" + request.dmaChannel).join(",") === "a:1,b:2", window.kind + ": wrong FIFO request order");
  requireCondition(window.completionOrder.join(",") === "1,2", window.kind + ": wrong completion order");
  requireCondition(window.afterCompletion.scheduler.currentTime - window.timer0Entry.scheduler.currentTime === 18, window.kind + ": wrong live makespan");
  return {
    kind: window.kind,
    timer0OnTime: true,
    exactCoDueCallbacksBeforeTimer0: window.exactCoDueCallbacksBeforeTimer0.map((event) => ({ name: event.name, priority: event.priority })),
    audioDueBeforeTimer0: false,
    freshDualEntry: {
      fifoWordLevels: [window.timer0Entry.fifo.a.fifoWordLevel, window.timer0Entry.fifo.b.fifoWordLevel],
      internalRemaining: [window.timer0Entry.fifo.a.internalRemaining, window.timer0Entry.fifo.b.internalRemaining],
      dmaNextCounts: window.timer0Entry.dma.filter((candidate) => candidate.channel === 1 || candidate.channel === 2).map((candidate) => candidate.nextCount),
      activeDma: window.timer0Entry.activeDma,
      cpuBlocked: window.timer0Entry.cpuBlocked,
    },
    requestOrder: window.requestOrder,
    dmaActiveOrder: window.dmaCallbacks.map((callback) => callback.activeDma),
    completionOrder: window.completionOrder,
    completionAfterTimerEntryCycles: 18,
  } as const;
});

const receipt = {
  schema: "issue55-adjacent-audio-dma-scheduler-audit/v1",
  scope: "mGBA 0.10.5 source mechanics plus the three committed Battle Scene OFF Timer 0=D, Audio Sample=D+1 rows and existing on-time isolated/Video dual-refill runtime receipt; no selected-row callback trace or duration claim",
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
  inputReceipts: [lilianaInput, variedInput, runtimeInput].map((packet) => ({ path: packet.path, sha256: sha256(packet.bytes) })),
  dPlusOneSourceMechanics: {
    eventPriorities: { "GBA Audio Sample": 24, "GBA Timer 0": 32, "GBA DMA": 64 },
    rootOrdering: "mTimingSchedule orders absolute deadlines first; lower numeric priority breaks only an equal-deadline tie, and equal priorities preserve insertion order.",
    correctedDeadlines: {
      timer0: "At Timer 0 original deadline D, GBATimerUpdateRegister uses currentTime minus cyclesLate, so its next normal overflow is D + 1254 rather than callback-arrival time plus 1254.",
      fifoDma: "For each routed FIFO passing its occupancy/custom-DMA gate, GBAAudioSampleFIFO stores dma.when = currentTime minus cyclesLate = D and dma.nextCount = 4 before GBADMASchedule.",
      audioSample: "At Audio Sample original deadline D + 1, _sample mixes at currentTime minus cyclesLate = D + 1 and schedules only its next sample event at D + 1025.",
    },
    immediateQueueRule: "If Timer 0 at D enqueues FIFO DMA and Audio Sample remains due at D + 1, the generated GBA DMA root has deadline D and is before Audio Sample by deadline despite DMA priority 64. This is conditional on Timer FIFO gates producing work.",
    fifoRequestOrder: "Timer 0 calls FIFO A then FIFO B; Emerald committed paired route maps those calls to DMA1 then DMA2.",
    dmaArbitration: {
      selection: "GBADMAUpdate scans DMA0 through DMA3 and replaces its choice only for a strictly earlier deadline; equal newly requested DMA1/DMA2 deadlines therefore choose DMA1.",
      firstEventCorrection: "When a fresh DMA event enters _dmaEvent, nextCount == count resets that selected dma.when to mTimingCurrentTime before its first word is serviced.",
      cpuBlocking: "GBADMAService sets gba.cpuBlocked, and GBAProcessEvents continues timing ticks while that flag remains set; CPU instruction execution is held at the next event until DMA work clears.",
      perWord: "Each word adds base 2 plus first-word non-sequential or later-word sequential source/destination waitstates to selected deadline, transfers one word, decrements nextCount, updates next source/destination, and reruns GBADMAUpdate.",
      overdueCoalescing: "After a word, every enabled pending DMA whose deadline is earlier than new selected deadline is moved forward to that deadline before arbitration resumes.",
      completion: "Final word stores completion marker in nextCount and adds terminal +2 when either endpoint is below REGION_CART0; later DMA event clears nextCount to zero, applies repeat/IRQ rules, and reruns selection.",
      pinnedIwrToIoFourWordDeadlineWork: {
        wordServiceMasterCycles: [2, 2, 2, 2],
        terminalCompletionMasterCycles: 2,
        perChannelScheduledDeadlineWork: 10,
        twoChannelWorkSum: 20,
      },
    },
    narrowZeroLateDPlusOneTransition: "With Timer 0 on time at D, only fresh DMA1/DMA2 work, and no other roots, first DMA1 word moves and coalesces both DMA deadlines to D + 2; Audio Sample at D + 1 then precedes next DMA root. It is source-only conditional transition, not a LILIANA execution trace.",
    audioInterleavingBoundary: "Source defines queue comparisons, corrected deadlines, and DMA state transitions, but does not turn compact selected-row before/after snapshots into callback-entry log. It cannot establish which LILIANA callbacks ran between Timer 0 entry and final aggregate edge, their host/mixer outcomes, or selected-row elapsed scheduler span.",
  },
  committedAdjacentRows: rows,
  priorRuntimeReceipt: {
    windows: priorRuntimeWindows,
    applicabilityBoundary: "Two committed windows prove fresh on-time dual DMA graph and 18-master-cycle makespan with no Audio Sample due before Timer 0; one has exact prior Video callback. They do not observe Audio Sample at D + 1 and do not supply a LILIANA Audio/DMA order or duration.",
  },
  smallestRequiredRuntimeObservation: {
    target: "LILIANA encrypted-accessor ordinal 23, repeated twice fresh",
    captureInterval: "from Timer 0 callback entry through first Audio Sample callback after it and until both DMA1/DMA2 nextCount values are zero",
    callbackEntryFields: [
      "event name, priority, relative scheduled deadline, scheduler current time, and cyclesLate",
      "activeDMA, cpuBlocked, and DMA1/DMA2 nextCount plus relative deadlines",
      "FIFO A/B word level and internalRemaining at Timer 0 entry and after interval",
    ],
    acceptance: "Two packets must agree on contiguous Timer 0 / GBA DMA / GBA Audio Sample callback-entry sequence and scheduler span from Timer 0 entry to both DMA completions; only then may selected row receive interleaving or duration statement.",
    prohibitedInference: "Do not borrow isolated/Video 18-cycle makespan, synthesize LILIANA order from aggregate FIFO endpoints, or wire construction-clock cost.",
  },
  explicitBoundary: [
    "Three committed rows are adjacent deadlines: Audio Sample is exactly one master cycle after Timer 0, not equal-deadline priority observation.",
    "LILIANA row records only 20-cycle instruction-edge endpoints; it is not a runtime callback trace.",
    "Source-only zero-late D/D+1 transition is conditional and deliberately not named as LILIANA runtime order.",
    "This receipt contains no absolute selected-row scheduler timestamp, no pixel lookup, no production import, and no construction-clock behavior.",
  ],
} as const;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(receipt, null, 2) + "\n");
console.log("verified mGBA 0.10.5 source and wrote " + OUTPUT);
