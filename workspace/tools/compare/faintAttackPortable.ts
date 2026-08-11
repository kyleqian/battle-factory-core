import { mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { FAINT_ATTACK_ANIMATION_PROFILE } from "../../src/animation/faintAttack.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnFaintAttackConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface PortableFixture {
  readonly probe: string;
  readonly probeArguments: readonly string[];
  readonly geometry: {
    readonly attacker: PortableBattler;
    readonly target: PortableBattler;
  };
  readonly presentation: {
    readonly moveTextStartAge: number;
  };
  readonly fieldProfile: SceneOnFaintAttackConfig["fieldProfile"];
  readonly appStage: {
    readonly oracleFrame: number;
    readonly presentationAge: number;
  };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
  };
}

interface PortableBattler {
  readonly species: "ONIX" | "GROVYLE";
  readonly side: "player" | "opponent";
  readonly spriteCorner: Readonly<{ x: number; y: number }>;
  readonly animationCenter: Readonly<{ x: number; y: number }>;
  readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
}

function presentationBattler(battler: PortableBattler) {
  return {
    species: battler.species,
    geometry: {
      side: battler.side,
      spriteCorner: battler.spriteCorner,
      animationCenter: battler.animationCenter,
      battlePositionCenter: battler.battlePositionCenter,
    },
  } as const;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, "tools/compare/fixtures/faint-attack-onix-grovyle.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as PortableFixture;
const scratch = createScratchDir("pokebench-faint-attack-compare-");
const rgbDir = join(scratch, "rgb");
mkdirSync(rgbDir);
const probeOutput = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const mgbaPython = join(vendor, "mgba-venv/bin/python");
const probe = resolve(root, fixture.probe);
const wrapper = join(root, "tools/run-mgba-probe.py");
const run = spawnSync(
  "python3",
  [
    wrapper,
    probeOutput,
    "--",
    mgbaPython,
    probe,
    probeOutput,
    rgbDir,
    ...fixture.probeArguments,
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

let state: EngineState = {
  ...createInitialState(),
  rngMode: "frontierBattle",
  sceneOnPresentation: createSceneOnMovePresentation({
    move: "FAINT_ATTACK",
    attacker: presentationBattler(fixture.geometry.attacker),
    target: presentationBattler(fixture.geometry.target),
    animationProfile: FAINT_ATTACK_ANIMATION_PROFILE,
    fieldProfile: fixture.fieldProfile,
    ...fixture.presentation,
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
const mismatches: Array<{
  frame: number;
  pixels: number;
  bbox: readonly [number, number, number, number] | null;
}> = [];
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const oracle = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  const rgba = render(state);
  let frameDiff = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const oi = pixel * 3;
    const ai = pixel * 4;
    if (
      oracle[oi] !== rgba[ai]
      || oracle[oi + 1] !== rgba[ai + 1]
      || oracle[oi + 2] !== rgba[ai + 2]
    ) {
      frameDiff += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  diffPixels += frameDiff;
  if (frameDiff === 0) {
    matching += 1;
  } else {
    mismatches.push({
      frame,
      pixels: frameDiff,
      bbox: maxX < 0 ? null : [minX, minY, maxX, maxY],
    });
  }
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
  const compact = mismatches.slice(0, 16)
    .map(({ frame, pixels, bbox }) => `${frame}:${pixels}@${bbox?.join(",")}`)
    .join("; ");
  console.log(`first mismatches: ${compact}`);
}
process.exit(matching === total ? 0 : 1);
