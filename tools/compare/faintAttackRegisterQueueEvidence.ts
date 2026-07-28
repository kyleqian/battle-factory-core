import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  applyAnimationDisplayIntervalWorkload,
  type AnimationGpuRegisterState,
} from "../../src/animation/gpuRegisterQueue.ts";

const BLDALPHA = 0x52;
const BEFORE_WRITE = 0x0e02;
const AFTER_WRITE = 0x0d03;

interface ProbeSnapshot {
  readonly age: number;
  readonly kind: string;
  readonly vcount: number;
  readonly bufferedBldalpha: number;
  readonly hardwareBldalpha: number;
  readonly waitingIndex: number | null;
  readonly before?: Readonly<{
    readonly bufferedBldalpha: number;
  }>;
}

interface ProbeRun {
  readonly label: "canonical" | "delayed30";
  readonly events: readonly ProbeSnapshot[];
}

interface ProbeOutput {
  readonly schema: string;
  readonly runs: readonly ProbeRun[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const scratch = mkdtempSync(join(tmpdir(), "pokebench-faint-register-evidence-"));
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
    steps: [
      { kind: "copy-buffered-registers", vcount: 166 },
      {
        kind: "run-tasks",
        vcount: write.vcount,
        gpuWrites: [{ offset: BLDALPHA, value: AFTER_WRITE }],
      },
    ],
  });
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
