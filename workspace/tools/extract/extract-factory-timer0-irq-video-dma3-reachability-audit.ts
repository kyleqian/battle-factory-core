// Source/census reducer for Issue #55's remaining IRQ, Video-DMA, and DMA3
// scheduler classes. It deliberately produces an evidence boundary, not a
// service-cost model or construction-clock input.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a path`);
  return resolve(value);
}

function source(path: string): string {
  return readFileSync(path, "utf8");
}

function requireAnchors(label: string, text: string, anchors: readonly string[]): void {
  for (const anchor of anchors) {
    if (!text.includes(anchor)) {
      throw new Error(`${label} is stale: missing audited anchor ${JSON.stringify(anchor)}`);
    }
  }
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function countBy<T>(values: readonly T[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) {
    const key = String(value);
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

const emeraldRoot = argument("--pokeemerald-source");
const mgbaRoot = argument("--mgba-source");
const output = argument("--out");

const sourceFiles = {
  "pokeemerald/src/m4a.c": source(join(emeraldRoot, "src", "m4a.c")),
  "pokeemerald/src/main.c": source(join(emeraldRoot, "src", "main.c")),
  "pokeemerald/src/dma3_manager.c": source(join(emeraldRoot, "src", "dma3_manager.c")),
  "pokeemerald/src/battle_factory_screen.c": source(join(emeraldRoot, "src", "battle_factory_screen.c")),
  "pokeemerald/src/overworld.c": source(join(emeraldRoot, "src", "overworld.c")),
  "pokeemerald/src/scanline_effect.c": source(join(emeraldRoot, "src", "scanline_effect.c")),
  "pokeemerald/src/battle_transition.c": source(join(emeraldRoot, "src", "battle_transition.c")),
  "pokeemerald/include/gba/io_reg.h": source(join(emeraldRoot, "include", "gba", "io_reg.h")),
  "pokeemerald/include/gba/macro.h": source(join(emeraldRoot, "include", "gba", "macro.h")),
  "pokeemerald/include/scanline_effect.h": source(join(emeraldRoot, "include", "scanline_effect.h")),
  "mgba/src/gba/timer.c": source(join(mgbaRoot, "src", "gba", "timer.c")),
  "mgba/src/gba/gba.c": source(join(mgbaRoot, "src", "gba", "gba.c")),
  "mgba/src/gba/dma.c": source(join(mgbaRoot, "src", "gba", "dma.c")),
  "mgba/src/gba/video.c": source(join(mgbaRoot, "src", "gba", "video.c")),
} as const;

const auditedAnchors = {
  "pokeemerald/src/m4a.c": [
    "REG_TM0CNT_H = 0;",
    "REG_TM0CNT_L = -(280896 / soundInfo->pcmSamplesPerVBlank);",
    "REG_TM0CNT_H = TIMER_ENABLE | TIMER_1CLK;",
    "REG_DMA1CNT_H = DMA_ENABLE | DMA_START_SPECIAL | DMA_32BIT | DMA_REPEAT;",
    "REG_DMA2CNT_H = DMA_ENABLE | DMA_START_SPECIAL | DMA_32BIT | DMA_REPEAT;",
  ],
  "pokeemerald/src/main.c": [
    "if (gMain.vblankCallback)",
    "gMain.vblankCallback();",
    "ProcessDma3Requests();",
    "m4aSoundMain();",
  ],
  "pokeemerald/src/dma3_manager.c": [
    "void ProcessDma3Requests(void)",
    "if (bytesTransferred > 40 * 1024)",
    "if (*(u8 *)REG_ADDR_VCOUNT > 224)",
    "Dma3CopyLarge32_",
    "Dma3FillLarge32_",
    "s16 RequestDma3Copy",
    "s16 RequestDma3Fill",
  ],
  "pokeemerald/src/battle_factory_screen.c": [
    "static void VBlankCB_SelectScreen(void)",
    "LoadOam();",
    "ProcessSpriteCopyRequests();",
    "TransferPlttBuffer();",
  ],
  "pokeemerald/src/overworld.c": [
    "static void VBlankCB_Field(void)",
    "ScanlineEffect_InitHBlankDmaTransfer();",
  ],
  "pokeemerald/src/scanline_effect.c": [
    "void ScanlineEffect_InitHBlankDmaTransfer(void)",
    "if (gScanlineEffect.state == 0)",
    "DmaSet(0, gScanlineEffect.dmaSrcBuffers[gScanlineEffect.srcBuffer], gScanlineEffect.dmaDest, gScanlineEffect.dmaControl);",
  ],
  "pokeemerald/src/battle_transition.c": [
    "#define B_TRANS_DMA_FLAGS",
    "DMA_START_HBLANK",
    "DmaSet(0, gScanlineEffectRegBuffers[1], &REG_BG0HOFS, B_TRANS_DMA_FLAGS);",
  ],
  "pokeemerald/include/gba/io_reg.h": [
    "#define DMA_START_NOW     0x0000",
    "#define DMA_START_VBLANK  0x1000",
    "#define DMA_START_HBLANK  0x2000",
    "#define DMA_START_SPECIAL 0x3000",
    "#define TIMER_INTR_ENABLE 0x40",
    "#define TIMER_ENABLE      0x80",
  ],
  "pokeemerald/include/gba/macro.h": [
    "dmaRegs[2] = (vu32)(control);",
    "DMA_START_NOW | DMA_##bit##BIT | DMA_SRC_INC | DMA_DEST_INC",
    "#define DmaCopyLarge32(dmaNum, src, dest, size, block)",
  ],
  "pokeemerald/include/scanline_effect.h": [
    "SCANLINE_EFFECT_DMACNT_16BIT",
    "DMA_START_HBLANK",
    "SCANLINE_EFFECT_DMACNT_32BIT",
  ],
  "mgba/src/gba/timer.c": [
    "if (GBATimerFlagsIsDoIrq(timer->flags))",
    "GBARaiseIRQ(gba, GBA_IRQ_TIMER0 + timerId, cyclesLate);",
    "GBATimerFlagsTestFillDoIrq(currentTimer->flags, control & 0x0040);",
  ],
  "mgba/src/gba/gba.c": [
    "#define GBA_IRQ_DELAY 7",
    "gba->irqEvent.name = \"GBA IRQ Event\";",
    "gba->irqEvent.priority = 0;",
    "if (gba->memory.io[REG_IE >> 1] & gba->memory.io[REG_IF >> 1])",
    "mTimingSchedule(&gba->timing, &gba->irqEvent, GBA_IRQ_DELAY - cyclesLate);",
    "while (gba->cpuBlocked && !gba->earlyExit);",
  ],
  "mgba/src/gba/dma.c": [
    "case GBA_DMA_TIMING_NOW:",
    "info->when = mTimingCurrentTime(&gba->timing) + 3;",
    "info->nextCount = info->count;",
    "case GBA_DMA_TIMING_HBLANK:",
    "case GBA_DMA_TIMING_VBLANK:",
    "// Handled implicitly",
    "void GBADMARunHblank",
    "void GBADMARunVblank",
    "GBADMARegisterGetTiming(dma->reg) == GBA_DMA_TIMING_HBLANK && !dma->nextCount",
    "GBADMARegisterGetTiming(dma->reg) == GBA_DMA_TIMING_VBLANK && !dma->nextCount",
  ],
  "mgba/src/gba/video.c": [
    "GBADMARunVblank(video->p, -cyclesLate);",
    "GBADMARunHblank(video->p, -cyclesLate);",
  ],
} as const;

for (const [name, anchors] of Object.entries(auditedAnchors)) {
  requireAnchors(name, sourceFiles[name as keyof typeof sourceFiles], anchors);
}

type TimerCrossing = {
  crossedEventNames: string[];
  coDueEventNames: string[];
  before: {
    timer0: { tm0cntH: number };
    cpu: { activeDma: number; cpuBlocked: boolean; performingDma: number };
    dma: Array<{ channel: number; timing: number; internalNextCount: number }>;
    queue: Array<{ name: string }>;
  };
  after: { queue: Array<{ name: string }> };
};

type VBlankObservation = {
  state: {
    main: { vblankCallback: string | null; hblankCallback: string | null };
    gpu: { scanline: { dmaControl: number } };
    dma3: { locked: boolean; queuedBytes: number; queuedRequests: unknown[] };
  };
};

type RuntimeDma = { channel: number; control: number; enabled: boolean; timing: number; nextCount: number };
type RuntimeWindow = {
  kind: string;
  timer0Entry: { dma: RuntimeDma[]; activeDma: number; performingDma: number; cpuBlocked: boolean };
  exactCoDueCallbacksBeforeTimer0: Array<{ name: string; priority: number; dmaNextCounts: number[]; dmaNextCountsAfter: number[]; activeDma: number }>;
};

const cases = ["anchor", "liliana", "factory-varied"] as const;
const timerCases: Record<string, Record<string, number>> = {};
const allTimerCrossings: TimerCrossing[] = [];
for (const name of cases) {
  const packet = JSON.parse(source(join(ROOT, "tests", "fixtures", "factory-construction-timer0-fifo-v1", `${name}.json`))) as {
    schema: string;
    oracleProfile: string;
    crossings: TimerCrossing[];
  };
  requireCondition(packet.schema === "factory-construction-timer0-fifo-crossings/v1", `${name}: wrong Timer 0 census schema`);
  requireCondition(packet.oracleProfile === "battle-scene-off", `${name}: wrong Timer 0 census profile`);
  requireCondition(packet.crossings.length > 0, `${name}: no Timer 0 crossings`);
  timerCases[name] = { crossings: packet.crossings.length };
  allTimerCrossings.push(...packet.crossings);
}

const vblankCases: Record<string, Record<string, number>> = {};
const allVBlankObservations: VBlankObservation[] = [];
for (const name of cases) {
  const packet = JSON.parse(source(join(ROOT, "tests", "fixtures", "factory-vblank-workload-v1", `${name}.json`))) as {
    schema: string;
    oracleProfile: string;
    interrupts: VBlankObservation[];
  };
  requireCondition(packet.schema === "factory-vblank-workload-probe/v1", `${name}: wrong VBlank workload schema`);
  requireCondition(packet.oracleProfile === "battle-scene-off", `${name}: wrong VBlank workload profile`);
  requireCondition(packet.interrupts.length > 0, `${name}: no VBlank observations`);
  vblankCases[name] = { entries: packet.interrupts.length };
  allVBlankObservations.push(...packet.interrupts);
}

const runtime = JSON.parse(source(join(ROOT, "tests", "fixtures", "factory-timer0-scheduler-runtime-v1.json"))) as {
  schema: string;
  oracleProfile: string;
  windows: RuntimeWindow[];
};
requireCondition(runtime.schema === "factory-timer0-scheduler-runtime/v1", "wrong full-scheduler runtime schema");
requireCondition(runtime.oracleProfile === "battle-scene-off", "wrong full-scheduler runtime profile");
requireCondition(runtime.windows.map((window) => window.kind).join(",") === "isolated-dual-refill,video-co-due-dual-refill", "unexpected runtime windows");
for (const window of runtime.windows) {
  requireCondition(window.timer0Entry.dma.map((dma) => dma.channel).join(",") === "0,1,2,3", `${window.kind}: incomplete all-channel DMA state`);
}
const videoCoDueWindow = runtime.windows[1];
const videoCallbacks = videoCoDueWindow.exactCoDueCallbacksBeforeTimer0;
requireCondition(videoCallbacks.map((event) => `${event.name}:${event.priority}`).join(",") === "GBA Video:8", "runtime Video co-due callback changed");

const timerControlValues = [...new Set(allTimerCrossings.map((row) => row.before.timer0.tm0cntH))].sort((left, right) => left - right);
const timerDmaRows = allTimerCrossings.flatMap((row) => row.before.dma);
const timerQueueSnapshots = allTimerCrossings.flatMap((row) => [row.before.queue, row.after.queue]);
const timerQueueNames = timerQueueSnapshots.flatMap((queue) => queue.map((event) => event.name));
const allChannelRuntimeShapes = runtime.windows.map((window) => ({
  kind: window.kind,
  channels: window.timer0Entry.dma.map((dma) => ({
    channel: dma.channel,
    enabled: dma.enabled,
    timing: dma.timing,
    nextCount: dma.nextCount,
  })),
  activeDma: window.timer0Entry.activeDma,
  performingDma: window.timer0Entry.performingDma,
  cpuBlocked: window.timer0Entry.cpuBlocked,
}));

const receipt = {
  schema: "factory-timer0-irq-video-dma3-reachability-audit/v1",
  release: {
    pokeemerald: "repository-pinned pret/pokeemerald",
    mgbaVersion: "0.10.5",
    mgbaArchiveSha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
    oracleProfile: "battle-scene-off",
  },
  auditedAnchors,
  sourceFacts: {
    timer0Irq: {
      mp2kTimer0Control: "SampleFreqSet writes TIMER_ENABLE | TIMER_1CLK, excluding TIMER_INTR_ENABLE",
      timerInterruptMask: "TIMER_INTR_ENABLE is 0x40 while TIMER_ENABLE is 0x80",
      mgbaOverflowGate: "GBATimerUpdate calls GBARaiseIRQ only when the control-derived DoIrq flag is true",
      mgbaIrqEventGate: "GBATestIRQ schedules priority-0 GBA IRQ Event only when IE intersects IF; its requested delay is 7 minus cyclesLate",
    },
    videoDma: {
      videoHooks: "mGBA Video invokes GBADMARunVblank at VBlank and GBADMARunHblank during visible HBlank",
      startGate: "each hook starts only an enabled matching VBlank/HBlank DMA with nextCount == 0, then gives it a deadline and nextCount",
      mp2kRoutes: "MP2K configures DMA1/DMA2 as special FIFO DMA, not VBlank or HBlank DMA",
      sourceGeneralCaveat: "Scanline and battle-transition source can configure DMA0 HBlank, so Video-started DMA remains source-reachable outside this construction epoch",
    },
    immediateDma3: {
      producer: "RequestDma3Copy/Fill queues a CPU-side request; VBlankIntr calls ProcessDma3Requests after its optional VBlank callback",
      execution: "the queue manager invokes Dma3CopyLarge/Dma3FillLarge, whose macro writes DMA3 with DMA_START_NOW",
      mgbaScheduling: "a newly enabled NOW DMA receives current scheduler time plus 3 and nextCount=count; it is not a Video-started HBlank/VBlank DMA",
      sourceGeneralCaveat: "No source rule drains a NOW DMA before every unrelated Timer 0 deadline; pending immediate DMA3 remains a source-general scheduler class",
    },
  },
  constructionCensus: {
    timer0Crossings: {
      cases: timerCases,
      total: allTimerCrossings.length,
      timer0ControlValues: timerControlValues,
      timer0IrqEnableBitSet: allTimerCrossings.filter((row) => (row.before.timer0.tm0cntH & 0x40) !== 0).length,
      inactiveSchedulerState: {
        activeDmaNonIdle: allTimerCrossings.filter((row) => row.before.cpu.activeDma !== -1).length,
        cpuBlocked: allTimerCrossings.filter((row) => row.before.cpu.cpuBlocked).length,
        performingDmaNonzero: allTimerCrossings.filter((row) => row.before.cpu.performingDma !== 0).length,
      },
      observedDmaChannels: [...new Set(timerDmaRows.map((dma) => dma.channel))].sort((left, right) => left - right),
      observedDmaTimingCounts: countBy(timerDmaRows.map((dma) => dma.timing)),
      observedDmaPendingCount: timerDmaRows.filter((dma) => dma.internalNextCount !== 0).length,
      crossedEventCounts: countBy(allTimerCrossings.flatMap((row) => row.crossedEventNames)),
      coDueEventCounts: countBy(allTimerCrossings.flatMap((row) => row.coDueEventNames)),
      queueSnapshots: timerQueueSnapshots.length,
      queuedIrqEventOccurrences: timerQueueNames.filter((name) => name === "GBA IRQ Event").length,
      captureBoundary: "The all-crossing packet records CPU state and DMA1/DMA2 FIFO state only; it is not an all-channel DMA register census.",
    },
    vblankEntryObservations: {
      cases: vblankCases,
      total: allVBlankObservations.length,
      callbackCounts: countBy(allVBlankObservations.map((row) => row.state.main.vblankCallback)),
      hblankCallbackNonNull: allVBlankObservations.filter((row) => row.state.main.hblankCallback !== null).length,
      scanlineDmaControlNonzero: allVBlankObservations.filter((row) => row.state.gpu.scanline.dmaControl !== 0).length,
      dma3Locked: allVBlankObservations.filter((row) => row.state.dma3.locked).length,
      dma3QueuedBytesNonzero: allVBlankObservations.filter((row) => row.state.dma3.queuedBytes !== 0).length,
      dma3QueuedRequestsNonempty: allVBlankObservations.filter((row) => row.state.dma3.queuedRequests.length !== 0).length,
      captureBoundary: "These are VBlank-entry snapshots before the callback and ProcessDma3Requests; they do not observe every later instruction in that interrupt.",
    },
    exactAllChannelRuntimeWindows: {
      windows: allChannelRuntimeShapes,
      videoCoDueCallbacks: videoCallbacks.map((event) => ({
        name: event.name,
        priority: event.priority,
        activeDma: event.activeDma,
        dmaNextCountsBefore: event.dmaNextCounts,
        dmaNextCountsAfter: event.dmaNextCountsAfter,
      })),
    },
  },
  constructionReachability: {
    timer0Irq: "excluded for the audited post-boot MP2K Timer 0 path: the source write omits 0x40 and all 256 recorded controls are 0x80; this does not exclude IRQs from other devices or a later Timer 0 reconfiguration",
    videoStartedDma: "excluded in the exact full-state Video-co-due window: Video leaves all four nextCount values zero and the Timer entry observes timings 0,3,3,0; the finite 113 VBlank entries also have zero scanline DMA control, but the 256-crossing packet is not an all-channel DMA census",
    immediateDma3: "absent in the two exact all-channel Timer entries (DMA3 disabled, timing 0, nextCount 0) and no VBlank-entry queue is pending in 113 observations; source-general immediate DMA3 can still overlap a Timer edge after other CPU work arms it",
  },
  explicitBoundary: [
    "No Timer 0 service cost, completion timestamp, or construction-clock behavior is derived here.",
    "The Timer 0 IRQ conclusion concerns MP2K's normal Timer 0 control write; it does not erase IRQ delivery from VBlank, serial, Timer 3, DMA completion, or externally changed IE/IF/control state.",
    "Video can start matching HBlank/VBlank transfers in mGBA, and Emerald has source paths that configure them; the exclusion is scoped to the recorded ordinary Factory construction epoch and exact full-state window.",
    "ProcessDma3Requests is CPU-triggered immediate work inside VBlankIntr, not work created by mGBA's Video callback. Empty queue snapshots are finite entry observations, not a proof about every later VBlank instruction.",
  ],
} as const;

writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`wrote ${output}`);
