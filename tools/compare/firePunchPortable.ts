import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import {
  createSceneOnMovePresentation,
  ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
  ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
} from "../../src/engine/sceneOnPresentation.ts";

interface PortableFixture {
  readonly probe: string;
  readonly appStage: {
    readonly oracleFrame: number;
    readonly presentationAge: number;
  };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, "tools/compare/fixtures/fire-punch-onix-grovyle.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as PortableFixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-fire-punch-compare-"));
const rgbDir = join(scratch, "rgb");
mkdirSync(rgbDir);
const probeOutput = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const mgbaPython = join(vendor, "mgba-venv/bin/python");
const probe = resolve(root, fixture.probe);
const wrapper = join(root, "tools/run-mgba-probe.py");
const run = spawnSync(
  "python3",
  [wrapper, probeOutput, "--", mgbaPython, probe, probeOutput, rgbDir],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

let state: EngineState = {
  ...createInitialState(),
  rngMode: "frontierBattle",
  sceneOnPresentation: createSceneOnMovePresentation({
    move: "FIRE_PUNCH",
    ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
    resolutionProfile: ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
  }),
};
for (let age = 0; age < fixture.appStage.presentationAge; age += 1) {
  state = {
    ...state,
    sceneOnPresentation: {
      ...state.sceneOnPresentation!,
      age: state.sceneOnPresentation!.age + 1,
    },
  };
}

let matching = 0;
let diffPixels = 0;
const mismatches: Array<{ frame: number; pixels: number }> = [];
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const oracle = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  const rgba = render(state);
  let frameDiff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const oi = pixel * 3;
    const ai = pixel * 4;
    if (
      oracle[oi] !== rgba[ai]
      || oracle[oi + 1] !== rgba[ai + 1]
      || oracle[oi + 2] !== rgba[ai + 2]
    ) {
      frameDiff += 1;
    }
  }
  diffPixels += frameDiff;
  if (frameDiff === 0) matching += 1;
  else mismatches.push({ frame, pixels: frameDiff });
  state = {
    ...state,
    sceneOnPresentation: {
      ...state.sceneOnPresentation!,
      age: state.sceneOnPresentation!.age + 1,
    },
  };
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
const digest = createHash("sha256")
  .update(readFileSync(probeOutput))
  .digest("hex")
  .slice(0, 16);
console.log(
  `${matching}/${total} frames matched; ${diffPixels} aggregate differing pixels; oracle probe ${digest}`,
);
if (mismatches.length) {
  const compact = mismatches.slice(0, 12)
    .map(({ frame, pixels }) => `${frame}:${pixels}`)
    .join(", ");
  console.log(`first mismatches: ${compact}`);
}
process.exit(matching === total ? 0 : 1);
