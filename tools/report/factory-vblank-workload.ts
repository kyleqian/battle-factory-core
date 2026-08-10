#!/usr/bin/env node
/**
 * Issue #55 VBlank workload receipt.
 *
 * This is deliberately an evidence generator, not a timing reducer. It turns
 * the compact mGBA observations in tests/fixtures/factory-vblank-workload-v1
 * into an exact distribution/report whose classifications are constrained by
 * the pinned pokeemerald source.  It never reads construction identities from
 * the v2 receipts, and it does not produce a lookup surface for live code.
 *
 * Rerun:
 *   node --experimental-strip-types tools/report/factory-vblank-workload.ts
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CallbackState = {
  callback2: string | null;
  vblankCallback: string | null;
  hblankCallback: string | null;
  vcountCallback: string | null;
  serialCallback: string | null;
  oamLoadDisabled: boolean;
  inBattle: boolean;
  trainerHillVBlankCounterActive: boolean;
};

type LinkState = {
  wirelessCommType: number;
  linkVSyncDisabled: boolean;
};

type GpuState = {
  bufferLocked: boolean;
  queuedRegisterOffsets: number[];
  spriteCopyPending: boolean;
  spriteCopyRequestCount: number;
  paletteTransferPending: number;
  paletteFadeControl: number;
  scanline: { state: number; sourceBuffer: number; dmaControl: number };
};

type Dma3State = {
  locked: boolean;
  cursor: number;
  queuedRequests: Array<{ size: number; mode: number }>;
  queuedBytes: number;
};

type SoundChannel = {
  statusFlags: number;
  type: number;
  gateTime: number;
  envelopeVolume: number;
  count: number;
};

type MusicTrack = {
  flags: number;
  wait: number;
  runningStatus: number;
  mod: number;
  lfoSpeed: number;
  lfoDelayCounter: number;
};

type MusicPlayer = {
  status: number;
  trackCount: number;
  tempoCounter: number;
  tracks: MusicTrack[];
};

type SoundState = {
  ident: number;
  pcmDmaCounter: number;
  pcmDmaPeriod: number;
  pcmSamplesPerVBlank: number;
  reverb: number;
  maxChans: number;
  maxLines: number;
  frequency: number;
  c15: number;
  musicPlayers: MusicPlayer[];
  directChannels: SoundChannel[];
  cgbChannelStatusFlags: number[];
  dma1Control: number;
  dma2Control: number;
};

type ObservationState = {
  main: CallbackState;
  link: LinkState;
  gpu: GpuState;
  dma3: Dma3State;
  sound: SoundState;
};

type Stage = { kind: string; cyclesSinceVBlankEntry: number; isr?: string };

type Observation = {
  state: ObservationState;
  vblankEntryToReturnCycles: number;
  returnToResumeCycles: number;
  resumeFunction: string | null;
  stages: Stage[];
};

type ProbeReceipt = {
  schema: "factory-vblank-workload-probe/v1";
  case: "anchor" | "liliana" | "factory-varied";
  oracleProfile: string;
  sourceFunction: string;
  interrupts: Observation[];
};

type Distribution = {
  count: number;
  min: number;
  max: number;
  distinct: number;
  histogram: Array<{ value: number; count: number }>;
};

type SourceReference = {
  source: string;
  lines: string;
  anchors: string[];
};

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const INPUT_DIR = join(REPO_ROOT, "tests/fixtures/factory-vblank-workload-v1");
const DEFAULT_EVIDENCE_PATH = join(REPO_ROOT, "tests/fixtures/factory-vblank-workload-evidence-v1.json");
const DEFAULT_DOC_PATH = join(REPO_ROOT, "docs/issue55-vblank-workload-receipt.md");

const RECEIPT_NAMES = ["anchor", "liliana", "factory-varied"] as const;
const BODY_STAGE_NAMES = [
  "preCallback",
  "vblankCallback",
  "callbackToGpuCall",
  "copyBufferedGpuRegs",
  "processDma3Requests",
  "dma3ToSoundCall",
  "m4aSoundMain",
  "tryReceiveLinkBattleData",
  "linkToAmbientRandomCall",
  "ambientRandom",
  "updateWirelessStatus",
  "vblankTail",
] as const;

const SOURCE_REFERENCES: SourceReference[] = [
  {
    source: "reference/pokeemerald/src/main.c",
    lines: "340-372",
    anchors: [
      "static void VBlankIntr(void)",
      "gMain.vblankCallback();",
      "CopyBufferedValuesToGpuRegs();",
      "ProcessDma3Requests();",
      "m4aSoundMain();",
      "TryReceiveLinkBattleData();",
      "UpdateWirelessStatusIndicatorSprite();",
    ],
  },
  {
    source: "reference/pokeemerald/src/battle_factory_screen.c",
    lines: "1101-1106",
    anchors: ["static void VBlankCB_SelectScreen(void)", "LoadOam();", "ProcessSpriteCopyRequests();", "TransferPlttBuffer();"],
  },
  {
    source: "reference/pokeemerald/src/overworld.c",
    lines: "1784-1792",
    anchors: [
      "static void VBlankCB_Field(void)",
      "ScanlineEffect_InitHBlankDmaTransfer();",
      "FieldUpdateBgTilemapScroll();",
      "TransferTilesetAnimsBuffer();",
    ],
  },
  {
    source: "reference/pokeemerald/src/gpu_regs.c",
    lines: "49-64",
    anchors: ["void CopyBufferedValuesToGpuRegs(void)", "sGpuRegWaitingList"],
  },
  {
    source: "reference/pokeemerald/src/dma3_manager.c",
    lines: "42-96",
    anchors: ["void ProcessDma3Requests(void)", "sDma3Requests[sDma3RequestCursor].size", "bytesTransferred > 40 * 1024"],
  },
  {
    source: "reference/pokeemerald/src/m4a.c",
    lines: "102-105",
    anchors: ["void m4aSoundMain(void)", "SoundMain();"],
  },
  {
    source: "reference/pokeemerald/src/m4a_1.s",
    lines: "20-180",
    anchors: ["SoundMain:", "SoundMainRAM:", "SoundMainRAM_ChanLoop:"],
  },
  {
    source: "reference/pokeemerald/include/gba/m4a_internal.h",
    lines: "185-349",
    anchors: ["struct SoundInfo", "struct MusicPlayerTrack", "struct MusicPlayerInfo"],
  },
  {
    source: "reference/pokeemerald/src/main.c",
    lines: "379-409",
    anchors: ["static void HBlankIntr(void)", "static void VCountIntr(void)", "static void SerialIntr(void)", "static void IntrDummy(void)"],
  },
];

function fail(message: string): never {
  throw new Error(`factory-vblank-workload: ${message}`);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function stableJson(value: unknown): string {
  // Every object originates in a probe written with deterministic insertion
  // order. The report only uses this for set membership, never for timing
  // lookup, so an address-free source-state signature is sufficient here.
  return JSON.stringify(value);
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values.map(stableJson))].sort().map((serialized) => JSON.parse(serialized) as T);
}

function distribution(values: number[]): Distribution {
  if (values.length === 0) fail("cannot calculate a distribution for zero observations");
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const histogram = [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([value, count]) => ({ value, count }));
  return {
    count: values.length,
    min: histogram[0]!.value,
    max: histogram.at(-1)!.value,
    distinct: histogram.length,
    histogram,
  };
}

function stageCycles(observation: Observation, stageName: string): number {
  const stage = observation.stages.find(({ kind }) => kind === stageName);
  if (!stage) fail(`missing ${stageName} stage`);
  return stage.cyclesSinceVBlankEntry;
}

function bodyStageCycles(observation: Observation): Record<(typeof BODY_STAGE_NAMES)[number], number> {
  const callbackCall = stageCycles(observation, "vblank-callback-call");
  const callbackReturn = stageCycles(observation, "vblank-callback-return");
  const gpuCall = stageCycles(observation, "copy-buffered-gpu-regs-call");
  const gpuReturnAndDmaCall = stageCycles(observation, "copy-buffered-gpu-regs-return/process-dma3-call");
  const dmaReturn = stageCycles(observation, "process-dma3-return");
  const soundCall = stageCycles(observation, "m4a-sound-main-call");
  const soundReturnAndLinkCall = stageCycles(observation, "m4a-sound-main-return/try-receive-link-call");
  const linkReturn = stageCycles(observation, "try-receive-link-return");
  const randomCall = stageCycles(observation, "ambient-random-call");
  const randomReturnAndWirelessCall = stageCycles(observation, "ambient-random-return/update-wireless-call");
  const wirelessReturn = stageCycles(observation, "update-wireless-return");

  const stages = {
    preCallback: callbackCall,
    vblankCallback: callbackReturn - callbackCall,
    callbackToGpuCall: gpuCall - callbackReturn,
    copyBufferedGpuRegs: gpuReturnAndDmaCall - gpuCall,
    processDma3Requests: dmaReturn - gpuReturnAndDmaCall,
    dma3ToSoundCall: soundCall - dmaReturn,
    m4aSoundMain: soundReturnAndLinkCall - soundCall,
    tryReceiveLinkBattleData: linkReturn - soundReturnAndLinkCall,
    linkToAmbientRandomCall: randomCall - linkReturn,
    ambientRandom: randomReturnAndWirelessCall - randomCall,
    updateWirelessStatus: wirelessReturn - randomReturnAndWirelessCall,
    vblankTail: observation.vblankEntryToReturnCycles - wirelessReturn,
  };
  const total = Object.values(stages).reduce((sum, value) => sum + value, 0);
  if (total !== observation.vblankEntryToReturnCycles) {
    fail(`body stages do not add up: ${total}`);
  }
  return stages;
}

function activeDirectSoundChannels(sound: SoundState): number {
  // SoundMainRAM's channel loop tests SOUND_CHANNEL_SF_ON, rather than merely
  // asking whether a channel record is nonzero. SOUND_CHANNEL_SF_ON is the
  // source's START | STOP | IEC | ENV mask (0xC7), not just START (0x80).
  return sound.directChannels.filter(({ statusFlags }) => (statusFlags & 0xC7) !== 0).length;
}

function routeState(observation: Observation): object {
  const { main, link } = observation.state;
  return {
    callback2: main.callback2,
    vblankCallback: main.vblankCallback,
    hblankCallback: main.hblankCallback,
    vcountCallback: main.vcountCallback,
    serialCallback: main.serialCallback,
    oamLoadDisabled: main.oamLoadDisabled,
    inBattle: main.inBattle,
    trainerHillVBlankCounterActive: main.trainerHillVBlankCounterActive,
    wirelessCommType: link.wirelessCommType,
    linkVSyncDisabled: link.linkVSyncDisabled,
  };
}

function musicPlayerSnapshot(sound: SoundState): object {
  return sound.musicPlayers.map((player) => ({
    status: player.status,
    trackCount: player.trackCount,
    tempoCounter: player.tempoCounter,
    tracks: player.tracks,
  }));
}

function assertSourceAnchors(): void {
  for (const reference of SOURCE_REFERENCES) {
    const source = readFileSync(join(REPO_ROOT, reference.source), "utf8");
    for (const anchor of reference.anchors) {
      if (!source.includes(anchor)) {
        fail(`${reference.source}:${reference.lines} no longer contains ${JSON.stringify(anchor)}`);
      }
    }
  }
}

function loadReceipts(): ProbeReceipt[] {
  const receipts = RECEIPT_NAMES.map((name) => readJson<ProbeReceipt>(join(INPUT_DIR, `${name}.json`)));
  for (const [index, receipt] of receipts.entries()) {
    if (receipt.schema !== "factory-vblank-workload-probe/v1") fail(`${RECEIPT_NAMES[index]} has an unknown schema`);
    if (receipt.case !== RECEIPT_NAMES[index]) fail(`${RECEIPT_NAMES[index]} is mislabeled as ${receipt.case}`);
    if (receipt.oracleProfile !== "battle-scene-off") fail(`${receipt.case} must be battle-scene-off`);
  }
  return receipts;
}

function summarizeReceipt(receipt: ProbeReceipt): object {
  const observations = receipt.interrupts;
  if (observations.length === 0) fail(`${receipt.case} has no source-epoch VBlank observations`);
  const stageRows = observations.map(bodyStageCycles);
  const stageDistributions = Object.fromEntries(BODY_STAGE_NAMES.map((name) => [
    name,
    distribution(stageRows.map((stages) => stages[name])),
  ]));
  const body = observations.map(({ vblankEntryToReturnCycles }) => vblankEntryToReturnCycles);
  const resume = observations.map(({ returnToResumeCycles }) => returnToResumeCycles);
  const total = observations.map(({ vblankEntryToReturnCycles, returnToResumeCycles }) => (
    vblankEntryToReturnCycles + returnToResumeCycles
  ));
  const m4a = stageRows.map((stages) => stages.m4aSoundMain);
  const fixedBodyStageNames = BODY_STAGE_NAMES.filter((name) => name !== "m4aSoundMain");
  const nonFixed = fixedBodyStageNames.filter((name) => stageDistributions[name]!.distinct !== 1);
  if (nonFixed.length > 0) fail(`${receipt.case} unexpectedly varies outside m4aSoundMain: ${nonFixed.join(", ")}`);
  const sourceVisibleNonVBlankIsrs = observations.flatMap((observation) => (
    observation.stages
      .filter(({ kind }) => kind === "non-vblank-isr-entry")
      .map(({ isr }) => isr ?? "unknown")
  ));
  const routeValues = uniqueValues(observations.map(routeState));
  const gpuValues = uniqueValues(observations.map(({ state }) => state.gpu));
  const dma3Values = uniqueValues(observations.map(({ state }) => state.dma3));
  const capturedMusicPlayerStateDistinct = uniqueValues(observations.map(({ state }) => musicPlayerSnapshot(state.sound))).length;
  const capturedSoundStateDistinct = uniqueValues(observations.map(({ state }) => state.sound)).length;
  const stateInventory = {
    route: { distinct: routeValues.length, values: routeValues },
    gpu: { distinct: gpuValues.length, values: gpuValues },
    dma3: { distinct: dma3Values.length, values: dma3Values },
    audio: {
      pcmDmaCounter: distribution(observations.map(({ state }) => state.sound.pcmDmaCounter)),
      activeDirectSoundChannels: distribution(observations.map(({ state }) => activeDirectSoundChannels(state.sound))),
      capturedMusicPlayerStateDistinct,
      capturedSoundStateDistinct,
    },
  };
  return {
    receipt: receipt.case,
    sourceFunction: receipt.sourceFunction,
    sourceEpochObservationCount: observations.length,
    stateInventory,
    distributions: {
      entryToResume: distribution(total),
      vblankEntryToReturn: distribution(body),
      returnToResume: distribution(resume),
      bodyMinusM4aSoundMain: distribution(body.map((cycles, index) => cycles - m4a[index]!)),
      bodyStages: stageDistributions,
    },
    classification: {
      allBodyVariationIsMeasuredInsideM4aSoundMain: true,
      bodyStagesFixedWithinReceipt: fixedBodyStageNames,
      sourceVisibleNonVBlankIsrEntries: sourceVisibleNonVBlankIsrs,
      returnToResumeIsOutsideVBlankIntr: true,
      capturedAudioStateIsOnlyAnInventoryNotAnExactReducerInput: true,
    },
  };
}

function makeEvidence(): object {
  assertSourceAnchors();
  const cases = loadReceipts().map(summarizeReceipt);
  return {
    schema: "factory-vblank-workload-evidence/v1",
    oracleProfile: "battle-scene-off",
    measurement: {
      unit: "mGBA master cycles",
      entry: "VBlankIntr entry (reference/pokeemerald/src/main.c:340)",
      return: "VBlankIntr terminal return (reference/pokeemerald/src/main.c:372)",
      resume: "first interrupted ROM instruction observed after the VBlank return",
      inclusion: "Only VBlank entries within each source-function entry-to-return epoch are distributed.",
    },
    sourceReferences: SOURCE_REFERENCES,
    sourceClassification: {
      VBlankIntr: "The measured body is decomposed at direct call/return boundaries in main.c; every named component sums to entry-to-return exactly.",
      callbacks: "Select screen and field callbacks are separate source routines. Their observed cost is constant within each receipt, but their general cost remains state-dependent.",
      gpuAndDma3: "The buffered-register and DMA3 queue snapshots are source-visible inputs. Both are constant within each receipt, so neither explains its observed variation.",
      audio: "m4aSoundMain is the only measured VBlank-body stage with within-receipt variation. The captured audio state inventory covaries, but does not prove a field-minimal or causal reducer.",
      resume: "return-to-resume sits after VBlankIntr. One 59-cycle sample has no observed HBlank/VCount/Serial/Timer3 ROM ISR entry, so its additional 18 cycles remain an external event/resume-policy residual.",
    },
    futureReducerInputContract: {
      status: "smallest defensible source-state category contract; not a proof of field minimality",
      required: [
        "VBlank route: gMain callback pointers/flags, link-vsync controls, and the Random() guard state.",
        "Callback work state: OAM/sprite-copy/palette work plus field scanline, tilemap-scroll, and tileset-animation state when VBlankCB_Field is active.",
        "GPU buffered-register queue and DMA3 manager lock/cursor/ordered request sizes and modes.",
        "m4a state actually dereferenced by SoundMain/SoundMainRAM/MPlayMain: SoundInfo controls, linked player/track mutable state and command/tone/wave data, direct-sound channels, CGB state, and DMA1/DMA2 hardware state.",
        "Hardware timing/event state: VCOUNT and the interrupt entry/return/resume arbitration needed to account for the observed post-return residual.",
      ],
      expresslyExcluded: [
        "receipt name, trainer identity, rental set identity, battle number, construction index, RNG cursor, frame number, absolute tick, and UI cursor",
      ],
      unresolved: [
        "No complete audio state repeats in these samples, and the probe intentionally omits dereferenced command/tone/wave contents; the inventory cannot justify an exact audio-cycle function.",
        "The single +18-cycle return-to-resume residual has no observed ROM non-VBlank ISR entry, so source state alone cannot yet explain that event boundary.",
      ],
    },
    cases,
    verdict: "Evidence-only checkpoint: exact distributions and VBlankIntr stage accounting are reproducible, but no live reducer is licensed by this receipt.",
  };
}

function histogramText(distributionValue: Distribution): string {
  return distributionValue.histogram.map(({ value, count }) => `${value}${count === 1 ? "" : `×${count}`}`).join(", ");
}

function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function makeMarkdown(evidence: object): string {
  const root = asRecord(evidence);
  const cases = root.cases as Array<Record<string, unknown>>;
  const rows = cases.map((caseEvidence) => {
    const distributions = caseEvidence.distributions as Record<string, unknown>;
    const stages = (distributions.bodyStages as Record<string, Distribution>);
    const route = ((caseEvidence.stateInventory as Record<string, unknown>).route as Record<string, unknown>);
    const routeValue = (route.values as Array<Record<string, unknown>>)[0]!;
    const entryToResume = distributions.entryToResume as Distribution;
    const body = distributions.vblankEntryToReturn as Distribution;
    const m4a = stages.m4aSoundMain!;
    const resume = distributions.returnToResume as Distribution;
    return [
      String(caseEvidence.receipt),
      String(routeValue.vblankCallback),
      String(caseEvidence.sourceEpochObservationCount),
      `${entryToResume.min}–${entryToResume.max} (${entryToResume.distinct} distinct)`,
      `${body.min}–${body.max} (${body.distinct} distinct)`,
      `${m4a.min}–${m4a.max} (${m4a.distinct} distinct)`,
      histogramText(resume),
    ];
  });
  const detailBlocks = cases.map((caseEvidence) => {
    const distributions = caseEvidence.distributions as Record<string, unknown>;
    const stages = distributions.bodyStages as Record<string, Distribution>;
    const audio = ((caseEvidence.stateInventory as Record<string, unknown>).audio as Record<string, unknown>);
    return [
      `### ${caseEvidence.receipt}`,
      "",
      `- Entry→resume: ${histogramText(distributions.entryToResume as Distribution)}.`,
      `- Entry→return: ${histogramText(distributions.vblankEntryToReturn as Distribution)}.`,
      `- m4aSoundMain: ${histogramText(stages.m4aSoundMain!)}.`,
      `- Return→resume: ${histogramText(distributions.returnToResume as Distribution)}.`,
      `- Captured audio-state variants: music-player ${audio.capturedMusicPlayerStateDistinct}, full sound ${audio.capturedSoundStateDistinct}; PCM-DMA counter ${histogramText(audio.pcmDmaCounter as Distribution)}; active Direct Sound channels ${histogramText(audio.activeDirectSoundChannels as Distribution)}.`,
      "",
    ].join("\n");
  });
  return [
    "# Issue #55 — VBlank workload receipt",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-vblank-workload.ts`; do not hand-edit.",
    "",
    "This is an evidence-only source extraction for Battle Scene OFF Factory construction. It does not authorize a live timing lookup or claim that the observed audio snapshots constitute an exact timing reducer.",
    "",
    "## Exact source-epoch distributions",
    "",
    "All values are mGBA master cycles. The final column is an exact histogram, not a range.",
    "",
    "| receipt | VBlank callback | n | entry→resume | entry→return | m4aSoundMain | return→resume |",
    "| --- | --- | ---: | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    ...detailBlocks,
    "## Source accounting",
    "",
    "`VBlankIntr` is decomposed at its direct call/return boundaries in `reference/pokeemerald/src/main.c:340-372`. Every observed entry→return body sums exactly from these named stages. Within every receipt, every measured stage except `m4aSoundMain` is constant: the active callback, `CopyBufferedValuesToGpuRegs`, `ProcessDma3Requests`, link receive, ambient `Random`, wireless update, and ROM glue. The callback is 4,749 cycles for `VBlankCB_SelectScreen` in anchor and 5,876 cycles for `VBlankCB_Field` in LILIANA/factory-varied; that is an observed receipt-local fact, not a universal callback constant.",
    "",
    "The GPU queue / DMA3 queue shapes are individually constant within each receipt. The m4a inventory varies across every source-epoch observation (captured full audio-state distinct counts equal `n`), so it establishes where the variation is executed but cannot establish a deterministic mapping from the incomplete snapshot to cycle count.",
    "",
    "The one 59-cycle factory-varied return→resume observation is 18 cycles above the 41-cycle baseline. The probe watched HBlank, VCount, Serial, Timer3, and shared IntrDummy ROM ISR entries and observed none between VBlank return and resumed source execution. That residual therefore remains outside the VBlank body and unresolved by this source receipt.",
    "",
    "## Reducer boundary",
    "",
    "A future reducer must take source state, not receipt identity: the callback route and its OAM/sprite/palette/field state; GPU and DMA3 queues; the complete dereferenced m4a state (including command/tone/wave data not captured here); and hardware VCOUNT/interrupt-resume arbitration. It must not take trainer, rental set, battle number, construction index, RNG cursor, frame, tick, or cursor identity. No reducer is implemented by this increment.",
    "",
  ].join("\n");
}

function outputPaths(): { evidencePath: string; docPath: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { evidencePath: DEFAULT_EVIDENCE_PATH, docPath: DEFAULT_DOC_PATH };
  if (args.length === 2 && args[0] === "--out-dir") {
    const outDir = resolve(args[1]!);
    return {
      evidencePath: join(outDir, "factory-vblank-workload-evidence-v1.json"),
      docPath: join(outDir, "issue55-vblank-workload-receipt.md"),
    };
  }
  fail("usage: factory-vblank-workload.ts [--out-dir PATH]");
}

function main(): void {
  const evidence = makeEvidence();
  const { evidencePath, docPath } = outputPaths();
  mkdirSync(dirname(evidencePath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(docPath, makeMarkdown(evidence));
  process.stdout.write(`wrote ${evidencePath}\nwrote ${docPath}\n`);
}

main();
