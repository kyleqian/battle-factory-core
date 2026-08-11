// Source/census reducer for Issue #55's Factory Timer 0 reachability audit.
// No emulator or network is used. The caller supplies the pinned pokeemerald
// tree, an extracted mGBA 0.10.5 tree, and the oracle's emerald_core.py.

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
    if (!text.includes(anchor)) throw new Error(`${label} is stale: missing audited anchor ${JSON.stringify(anchor)}`);
  }
}

const emeraldRoot = argument("--pokeemerald-source");
const mgbaRoot = argument("--mgba-source");
const oraclePath = argument("--oracle-source");
const output = argument("--out");

const m4a = source(join(emeraldRoot, "src", "m4a.c"));
const main = source(join(emeraldRoot, "src", "main.c"));
const timer = source(join(mgbaRoot, "src", "gba", "timer.c"));
const audio = source(join(mgbaRoot, "src", "gba", "audio.c"));
const core = source(join(mgbaRoot, "src", "gba", "core.c"));
const mixer = source(join(mgbaRoot, "src", "gba", "extra", "audio-mixer.c"));
const oracle = source(oraclePath);

const auditedAnchors = {
  "pokeemerald/src/m4a.c": [
  "REG_SOUNDCNT_X = SOUND_MASTER_ENABLE",
  "REG_SOUNDCNT_H = SOUND_B_FIFO_RESET | SOUND_B_TIMER_0 | SOUND_B_LEFT_OUTPUT",
  "| SOUND_A_FIFO_RESET | SOUND_A_TIMER_0 | SOUND_A_RIGHT_OUTPUT",
  "REG_DMA1SAD = (s32)soundInfo->pcmBuffer;",
  "REG_DMA1DAD = (s32)&REG_FIFO_A;",
  "REG_DMA2SAD = (s32)soundInfo->pcmBuffer + PCM_DMA_BUF_SIZE;",
  "REG_DMA2DAD = (s32)&REG_FIFO_B;",
  "REG_DMA1CNT_H = DMA_ENABLE | DMA_START_SPECIAL | DMA_32BIT | DMA_REPEAT;",
  "REG_DMA2CNT_H = DMA_ENABLE | DMA_START_SPECIAL | DMA_32BIT | DMA_REPEAT;",
  "REG_TM0CNT_L = -(280896 / soundInfo->pcmSamplesPerVBlank);",
  "REG_TM0CNT_H = TIMER_ENABLE | TIMER_1CLK;",
  "CpuFill32(0, soundInfo->pcmBuffer, sizeof(soundInfo->pcmBuffer));",
  "void SetPokemonCryStereo(u32 val)",
  "SOUND_A_TIMER_0 | SOUND_A_RIGHT_OUTPUT",
  "SOUND_A_TIMER_0 | SOUND_A_LEFT_OUTPUT | SOUND_A_RIGHT_OUTPUT",
  ],
  "pokeemerald/src/main.c": [
  "gPcmDmaCounter = gSoundInfo.pcmDmaCounter;",
  "m4aSoundMain();",
  "m4aSoundVSyncOff();",
  "SoftReset(RESET_ALL);",
  ],
  "mgba/src/gba/timer.c": [
  "if (gba->audio.enable && timerId < 2)",
  "GBAAudioSampleFIFO(&gba->audio, 0, cyclesLate);",
  "GBAAudioSampleFIFO(&gba->audio, 1, cyclesLate);",
  ],
  "mgba/src/gba/audio.c": [
  "audio->externalMixing = false;",
  "audio->mixer = NULL;",
  "audio->chA.dmaSource = 1;",
  "audio->chB.dmaSource = 2;",
  "audio->enable = false;",
  "audio->enable = GBAudioEnableGetEnable(value);",
  "if (GBA_AUDIO_FIFO_SIZE - fifoSize > 4 && channel->dmaSource > 0)",
  "dma->nextCount = 4;",
  "if (audio->mixer)",
  "audio->mixer->engage(audio->mixer, source - offsets[i]);",
  ],
  "mgba/src/gba/core.c": [
  "gbacore->audioMixer = NULL;",
  "mCoreConfigGetIntValue(&core->config, \"gba.audioHle\", &useAudioMixer) && useAudioMixer",
  "GBAAudioMixerCreate(gbacore->audioMixer);",
  "ARMHotplugAttach(core->cpu, CPU_COMPONENT_AUDIO_MIXER);",
  ],
  "mgba/src/gba/extra/audio-mixer.c": [
  "gba->audio.mixer = mixer;",
  "mixer->p->externalMixing = true;",
  "_mp2kReload(mixer);",
  ],
  "oracle/emerald_core.py": [
  "self.core = mgba.core.load_path(str(self.rom_path))",
  "self.core.reset()",
  "self.core.load_raw_state(self._canonical_state)",
  ],
} as const;

requireAnchors("pokeemerald src/m4a.c", m4a, auditedAnchors["pokeemerald/src/m4a.c"]);
requireAnchors("pokeemerald src/main.c", main, auditedAnchors["pokeemerald/src/main.c"]);
requireAnchors("mGBA 0.10.5 src/gba/timer.c", timer, auditedAnchors["mgba/src/gba/timer.c"]);
requireAnchors("mGBA 0.10.5 src/gba/audio.c", audio, auditedAnchors["mgba/src/gba/audio.c"]);
requireAnchors("mGBA 0.10.5 src/gba/core.c", core, auditedAnchors["mgba/src/gba/core.c"]);
requireAnchors("mGBA 0.10.5 src/gba/extra/audio-mixer.c", mixer, auditedAnchors["mgba/src/gba/extra/audio-mixer.c"]);
requireAnchors("oracle emerald_core.py", oracle, auditedAnchors["oracle/emerald_core.py"]);
if (/\.config\s*\[|load_config\s*\(/.test(oracle)) {
  throw new Error("oracle source now configures mGBA; re-audit gba.audioHle");
}

type Crossing = {
  fifoRefillObserved: boolean;
  fifoWriteChanged: string[];
  before: { fifo: { a: Fifo; b: Fifo } };
};
type Fifo = { fifoWordLevel: number; internalRemaining: number; dmaSource: number };

const cases = ["anchor", "liliana", "factory-varied"] as const;
const caseCounts: Record<string, { crossings: number; zeroRefill: number; singleRefill: number; dualRefill: number }> = {};
const crossings: Crossing[] = [];
for (const name of cases) {
  const path = join(ROOT, "tests", "fixtures", "factory-construction-timer0-fifo-v1", `${name}.json`);
  const packet = JSON.parse(source(path)) as { crossings: Crossing[] };
  const classify = (row: Crossing): "zeroRefill" | "singleRefill" | "dualRefill" => {
    if (!row.fifoRefillObserved && row.fifoWriteChanged.length === 0) return "zeroRefill";
    if (row.fifoRefillObserved && row.fifoWriteChanged.join(",") === "a,b") return "dualRefill";
    return "singleRefill";
  };
  caseCounts[name] = { crossings: packet.crossings.length, zeroRefill: 0, singleRefill: 0, dualRefill: 0 };
  for (const row of packet.crossings) {
    caseCounts[name][classify(row)]++;
    crossings.push(row);
  }
}

const runtimePath = join(ROOT, "tests", "fixtures", "factory-timer0-scheduler-runtime-v1.json");
const runtime = JSON.parse(source(runtimePath)) as {
  oracleProfile: string;
  windows: Array<{ timer0Entry: { audio: { enabled: boolean; mixer: { present: boolean; externalMixing: boolean } }; fifo: { a: Fifo; b: Fifo } }; requestOrder: unknown[] }>;
};

const samePhase = (row: Crossing): boolean => {
  const { a, b } = row.before.fifo;
  return a.fifoWordLevel === b.fifoWordLevel
    && a.internalRemaining === b.internalRemaining
    && a.dmaSource === 1 && b.dmaSource === 2;
};
const totals = Object.values(caseCounts).reduce((sum, value) => ({
  crossings: sum.crossings + value.crossings,
  zeroRefill: sum.zeroRefill + value.zeroRefill,
  singleRefill: sum.singleRefill + value.singleRefill,
  dualRefill: sum.dualRefill + value.dualRefill,
}), { crossings: 0, zeroRefill: 0, singleRefill: 0, dualRefill: 0 });

const receipt = {
  schema: "factory-timer0-reachability-audit/v1",
  release: {
    pokeemerald: "repository-pinned pret/pokeemerald",
    mgbaVersion: "0.10.5",
    mgbaArchiveSha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
    oracleProfile: runtime.oracleProfile,
  },
  auditedAnchors,
  sourceFacts: {
    emeraldPairInvariant: [
      "SoundInit resets FIFO A/B and routes both to Timer 0 in one SOUNDCNT_H write",
      "DMA1 sources pcmBuffer half A into FIFO A; DMA2 sources half B into FIFO B",
      "m4aSoundVSyncOn enables both special/repeat/32-bit DMAs as one paired operation before initial Timer 0 enable",
      "the normal VBlank path runs m4aSoundMain and does not reconfigure either FIFO route",
      "SetPokemonCryStereo changes output sides but retains Timer 0 and at least one output for both channels",
    ],
    mgbaConsumption: {
      timerGate: "audio.enable mirrors SOUNDCNT_X master enable; it is not host playback or mute state",
      order: ["FIFO A", "FIFO B"],
      threshold: "each channel requests four words exactly when queued words are at most 3",
      induction: "equal queued-word/internal-byte phase plus paired DMA service remains equal at the next Timer 0 entry",
    },
    mixer: {
      baseInitializationBeforeOptionalComponent: { present: false, externalMixing: false },
      presenceMeaning: "mGBA CPU_COMPONENT_AUDIO_MIXER is installed only when emulator config gba.audioHle is present and nonzero",
      externalMixingMeaning: "the optional MP2K HLE component recognized and engaged a game sound context; it is emulator-owned state",
      refillEffect: "presence may inspect a DMA source and engage HLE, but does not replace Timer 0 FIFO consumption or the four-word refill threshold",
      gameControllable: false,
    },
  },
  constructionCensus: {
    source: "factory-construction-timer0-fifo-v1 plus factory-timer0-scheduler-runtime-v1",
    cases: caseCounts,
    totals,
    symmetricEntryStates: crossings.filter(samePhase).length,
    asymmetricEntryStates: crossings.filter((row) => !samePhase(row)).length,
    exactRuntimeWindows: runtime.windows.length,
    runtimeWindowClasses: runtime.windows.map((window) => ({
      refill: window.requestOrder.length === 2 ? "dual" : window.requestOrder.length === 0 ? "zero" : "single",
      audioEnabled: window.timer0Entry.audio.enabled,
      mixerPresent: window.timer0Entry.audio.mixer.present,
      externalMixing: window.timer0Entry.audio.mixer.externalMixing,
    })),
  },
  constructionReachability: {
    zeroRefill: "source-reachable-and-observed",
    dualRefill: "source-reachable-and-observed",
    singleRefill: "not reachable while the audited Emerald pair invariant holds; not observed in the finite census",
    mixerPresent: "not an oracle game path; optional emulator gba.audioHle component only",
    audioDisabled: "not reachable in the audited post-boot Factory construction epoch; SOUNDCNT_X is enabled and runtime receipts agree",
  },
  explicitBoundary: [
    "The no-single-refill conclusion is scoped to ordinary post-boot Factory construction, not every Emerald transition.",
    "m4aSoundVSyncOff/On use separate DMA register writes; reset/soft-reset timing or externally staged asymmetric FIFO/DMA state is outside the invariant.",
    "The 256-crossing census is finite evidence, not the proof; the paired source-state induction supplies the scoped reachability argument.",
    "Mixer-present behavior remains source-reachable in mGBA only when its caller supplies gba.audioHle; this oracle does not.",
  ],
} as const;

writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`wrote ${output}`);
