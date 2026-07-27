import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnRecoverView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

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

interface ProbeEffectSprite {
  readonly kind: "orb" | "star";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animCmdIndex: number;
  readonly matrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
}

interface ProbeFrame {
  readonly frame: number;
  readonly effectSprites: readonly ProbeEffectSprite[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-recover-compare-"));
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"),
  output,
  "--",
  join(vendor, "mgba-venv/bin/python"),
  resolve(root, fixture.probe),
  resolve(root, fixture.scenario),
  output,
  rgbDir,
  String(fixture.denseWindow.startFrame),
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "RECOVER",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0;
let framebufferMatches = 0;
const mismatches: string[] = [];
let firstFramebufferDiff: string | null = null;

const key = (sprite: {
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
}) => [
  sprite.kind,
  sprite.x,
  sprite.y,
  sprite.frame,
  sprite.xScale,
  sprite.yScale,
].join(":");

for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnRecoverView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = view.sprites.map(key).sort();
  const actual = oracle.effectSprites.map((sprite) => key({
    kind: sprite.kind,
    x: sprite.x + sprite.x2,
    y: sprite.y + sprite.y2,
    frame: sprite.kind === "orb"
      ? 8
      : (sprite.animCmdIndex === 7 ? 0 : sprite.animCmdIndex),
    xScale: sprite.kind === "orb" ? sprite.matrix.a : 256,
    yScale: sprite.kind === "orb" ? sprite.matrix.d : 256,
  })).sort();
  if (JSON.stringify(predicted) === JSON.stringify(actual)) {
    componentMatches += 1;
  } else {
    mismatches.push(`frame ${frame}: component predicted=${predicted} actual=${actual}`);
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true;
  let count = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3;
    const rgba = pixel * 4;
    if (
      app[rgba] === oracleRgb[rgb]
      && app[rgba + 1] === oracleRgb[rgb + 1]
      && app[rgba + 2] === oracleRgb[rgb + 2]
    ) continue;
    exact = false;
    count += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (exact) framebufferMatches += 1;
  else if (firstFramebufferDiff === null) {
    firstFramebufferDiff =
      `first framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
  }
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`RECOVER component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (mismatches.length || framebufferMatches !== total) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (mismatches.length) console.error(mismatches.slice(0, 8).join("\n"));
  process.exit(1);
}
