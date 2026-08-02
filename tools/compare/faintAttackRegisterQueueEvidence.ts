import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  applyAnimationDisplayIntervalWorkload,
  produceAnimationDisplayIntervalWorkload,
  type AnimationGpuRegisterState,
} from "../../src/animation/gpuRegisterQueue.ts";
import { createScratchDir } from "../lib/scratch.ts";

const BLDALPHA = 0x52;
const BEFORE_WRITE = 0x0e02;
const AFTER_WRITE = 0x0d03;

interface ProbeSnapshot {
  readonly frame: number;
  readonly age: number;
  readonly kind: string;
  readonly vcount: number;
  readonly bufferedBldalpha: number;
  readonly hardwareBldalpha: number;
  readonly waitingIndex: number | null;
  readonly audio: Readonly<{
    readonly pcmDmaCounter: number;
    readonly vblankPcmDmaCounter: number;
    readonly c15: number;
    readonly pcmDmaPeriod: number;
    readonly maxLines: number;
    readonly activeChannelFlags: readonly number[];
  }>;
  readonly before?: Readonly<{
    readonly bufferedBldalpha: number;
  }>;
}

interface ProbeRun {
  readonly label: "canonical" | "delayed30";
  readonly audioAnchor: ProbeSnapshot["audio"];
  readonly events: readonly ProbeSnapshot[];
}

interface ProbeOutput {
  readonly schema: string;
  readonly runs: readonly ProbeRun[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const scratch = createScratchDir("pokebench-faint-register-evidence-");
const output = join(scratch, "register-queue.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const mgbaPython = join(vendor, "mgba-venv/bin/python");
const wrapper = join(root, "tools/run-mgba-probe.py");
const probe = join(root, "tools/compare/faintAttackRegisterQueueProbe.py");
const result = spawnSync(
  "python3",
  [wrapper, output, "--", mgbaPython, probe, output],
  { cwd: root, encoding: "utf8" },
);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);

const evidence = JSON.parse(readFileSync(output, "utf8")) as ProbeOutput;
if (evidence.schema !== "faint-attack-register-queue-probe/v1") {
  throw new Error(`unsupported evidence schema ${evidence.schema}`);
}

for (const run of evidence.runs) {
  const previousSample = run.events.find(
    (event) => event.kind === "frame-end" && event.age === 149,
  );
  const currentSample = run.events.find(
    (event) => event.kind === "frame-end" && event.age === 150,
  );
  const write = run.events.find(
    (event) =>
      event.before?.bufferedBldalpha === BEFORE_WRITE
      && event.bufferedBldalpha === AFTER_WRITE,
  );
  if (!previousSample || !currentSample || !write) {
    throw new Error(`${run.label}: incomplete age-149/150 register evidence`);
  }

  const beforeInterval: AnimationGpuRegisterState = {
    buffered: { [BLDALPHA]: previousSample.bufferedBldalpha },
    hardware: { [BLDALPHA]: previousSample.hardwareBldalpha },
    waitingOffsets:
      previousSample.waitingIndex === null ? [] : [BLDALPHA],
  };
  const modeled = applyAnimationDisplayIntervalWorkload(beforeInterval, {
    ...produceAnimationDisplayIntervalWorkload({
      vblanksSinceAudioAnchor: previousSample.frame,
      pcmDma: {
        counterAtAnchor: run.audioAnchor.vblankPcmDmaCounter,
        period: run.audioAnchor.pcmDmaPeriod,
        cgbCounterAtAnchor: run.audioAnchor.c15,
        cgbPeriod: 15,
        mixerOverrunCgbPhases: [3],
      },
      gpuWrites: [{ offset: BLDALPHA, value: AFTER_WRITE }],
    }),
  });
  const producedRunTasks = produceAnimationDisplayIntervalWorkload({
    vblanksSinceAudioAnchor: previousSample.frame,
    pcmDma: {
      counterAtAnchor: run.audioAnchor.vblankPcmDmaCounter,
      period: run.audioAnchor.pcmDmaPeriod,
      cgbCounterAtAnchor: run.audioAnchor.c15,
      cgbPeriod: 15,
      mixerOverrunCgbPhases: [3],
    },
    gpuWrites: [{ offset: BLDALPHA, value: AFTER_WRITE }],
  }).steps[1];
  if (
    producedRunTasks?.kind !== "run-tasks"
    || producedRunTasks.vcount !== write.vcount
  ) {
    throw new Error(
      `${run.label}: audio workload produced VCOUNT `
      + `${producedRunTasks?.vcount}, observed ${write.vcount}`,
    );
  }
  if (
    modeled.buffered[BLDALPHA] !== currentSample.bufferedBldalpha
    || modeled.hardware[BLDALPHA] !== currentSample.hardwareBldalpha
    || (modeled.waitingOffsets.length > 0) !==
      (currentSample.waitingIndex !== null)
  ) {
    throw new Error(
      `${run.label}: modeled ${JSON.stringify(modeled)} does not match `
      + `buffer=${currentSample.bufferedBldalpha} `
      + `hardware=${currentSample.hardwareBldalpha} `
      + `waiting=${currentSample.waitingIndex}`,
    );
  }
  console.log(
    `${run.label}: RunTasks VCOUNT ${write.vcount}; `
    + `sampled BLDALPHA 0x${currentSample.hardwareBldalpha.toString(16).padStart(4, "0")}`,
  );
}

console.log("2/2 cycle-derived display intervals matched the reusable register scheduler");
