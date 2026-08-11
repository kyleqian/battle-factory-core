/**
 * Strict live Scene-ON verifier for the Metal Sound acceptance unit.
 * The source probe is fresh for every invocation; no oracle screenshot or
 * baked frame lookup participates in either the component or RGB gate.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnMetalSoundView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir, keepScratchDir } from "../lib/scratch.ts";
import { PNG } from "pngjs";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

interface ProbeFrame {
  readonly frame: number;
  readonly sprites: readonly {
    readonly active: boolean;
    readonly template: { readonly symbol?: string | null };
    readonly x: number;
    readonly y: number;
    readonly x2: number;
    readonly y2: number;
    readonly matrix: readonly number[];
  }[];
  readonly battlers: {
    readonly player: { readonly x2: number; readonly y2: number };
    readonly opponent: { readonly x2: number; readonly y2: number };
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-metal-sound-compare-");
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const probeRun = spawnSync(
  "python3",
  [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ],
  {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: join(vendor, "libmgba-py") },
  },
);
if (probeRun.stdout) process.stdout.write(probeRun.stdout);
if (probeRun.stderr) process.stderr.write(probeRun.stderr);
if (probeRun.status !== 0) process.exit(probeRun.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as { readonly frames: readonly ProbeFrame[] };
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "METAL_SOUND", attacker: fixture.attacker, target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const waveKey = (wave: { readonly x: number; readonly y: number; readonly xScale: number; readonly yScale: number }): string =>
  [wave.x, wave.y, wave.xScale, wave.yScale].join(":");
let componentMatches = 0;
let framebufferMatches = 0;
const failures: string[] = [];
const framebufferFailures: string[] = [];
const start = fixture.denseWindow.startFrame;
const end = fixture.denseWindow.endFrame;
const attackerKey = fixture.attacker.geometry.side;

for (let frame = start; frame <= end; frame += 1) {
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const age = fixture.appStage.presentationAge + frame - start;
  const state = { ...stage, age };
  const view = sceneOnMetalSoundView(state);
  const actualWaves = oracle.sprites
    .filter((sprite) => sprite.active && sprite.template.symbol === "gMetalSoundSpriteTemplate")
    .map((sprite) => ({
      x: sprite.x + sprite.x2, y: sprite.y + sprite.y2,
      xScale: sprite.matrix[0] ?? 0, yScale: sprite.matrix[3] ?? 0,
    }));
  const predictedWaves = view.waves.map((wave) => ({
    x: wave.x + wave.x2, y: wave.y + wave.y2,
    xScale: wave.xScale, yScale: wave.yScale,
  }));
  const actualAttacker = oracle.battlers[attackerKey];
  const componentsMatch =
    JSON.stringify(actualWaves.map(waveKey).sort()) === JSON.stringify(predictedWaves.map(waveKey).sort())
    && view.attackerOffset.x2 === actualAttacker.x2
    && view.attackerOffset.y2 === actualAttacker.y2;
  if (componentsMatch) componentMatches += 1;
  else if (failures.length < 8) failures.push(
    `component frame ${frame}: predicted=${JSON.stringify(predictedWaves.map(waveKey).sort())}`
    + ` actual=${JSON.stringify(actualWaves.map(waveKey).sort())}`
    + ` shake=${view.attackerOffset.x2},${view.attackerOffset.y2}/${actualAttacker.x2},${actualAttacker.y2}`,
  );

  const engine: EngineState = {
    ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true;
  let diffPixels = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3;
    const rgba = pixel * 4;
    if (app[rgba] !== oracleRgb[rgb] || app[rgba + 1] !== oracleRgb[rgb + 1] || app[rgba + 2] !== oracleRgb[rgb + 2]) {
      exact = false;
      diffPixels += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (exact) framebufferMatches += 1;
  else if (framebufferFailures.length < 8) framebufferFailures.push(
    `framebuffer frame ${frame}: ${diffPixels}px ${minX},${minY}-${maxX},${maxY}`,
  );
  if (!exact && framebufferMatches === 0 && frame === start) {
    const appPng = new PNG({ width: 240, height: 160 });
    appPng.data.set(app);
    const oraclePng = new PNG({ width: 240, height: 160 });
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      oraclePng.data[pixel * 4] = oracleRgb[pixel * 3]!;
      oraclePng.data[pixel * 4 + 1] = oracleRgb[pixel * 3 + 1]!;
      oraclePng.data[pixel * 4 + 2] = oracleRgb[pixel * 3 + 2]!;
      oraclePng.data[pixel * 4 + 3] = 255;
    }
    writeFileSync(join(scratch, "app.png"), PNG.sync.write(appPng));
    writeFileSync(join(scratch, "oracle.png"), PNG.sync.write(oraclePng));
    keepScratchDir(scratch);
    console.error(`debug images: ${scratch}`);
  }
}

const total = end - start + 1;
console.log(`METAL_SOUND component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (failures.length) console.error(failures.join("\n"));
if (framebufferFailures.length) console.error(framebufferFailures.join("\n"));
if (componentMatches !== total || framebufferMatches !== total) process.exit(1);
