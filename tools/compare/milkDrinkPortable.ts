import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnMilkDrinkView,
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

interface ProbeSprite {
  readonly kind: "bottle" | "ring" | "star";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animCmdIndex: number;
  readonly invisible: boolean;
  readonly matrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly effectSprites: readonly ProbeSprite[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-milk-drink-compare-"));
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
  move: "MILK_DRINK",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0;
let framebufferMatches = 0;
const mismatches: string[] = [];
const framebufferDiffLines: string[] = [];

const predictedKey = (sprite: ReturnType<typeof sceneOnMilkDrinkView>["sprites"][number]) => {
  if (sprite.kind === "bottle") {
    return [
      sprite.kind, sprite.x, sprite.y,
      sprite.xScale, sprite.rotB, sprite.rotC, sprite.yScale,
      sprite.eva, sprite.evb, Number(sprite.invisible),
    ].join(":");
  }
  if (sprite.kind === "ring") {
    return [sprite.kind, sprite.x, sprite.y, sprite.xScale, 0, 0, sprite.yScale].join(":");
  }
  return [sprite.kind, sprite.x, sprite.y, sprite.frame, 256, 256].join(":");
};

const actualKey = (sprite: ProbeSprite) => {
  if (sprite.kind === "bottle") {
    return [
      sprite.kind, sprite.x + sprite.x2, sprite.y + sprite.y2,
      sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
      sprite.data[6], sprite.data[7], Number(sprite.invisible),
    ].join(":");
  }
  if (sprite.kind === "ring") {
    return [
      sprite.kind, sprite.x + sprite.x2, sprite.y + sprite.y2,
      sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
    ].join(":");
  }
  return [
    sprite.kind,
    sprite.x + sprite.x2,
    sprite.y + sprite.y2,
    sprite.animCmdIndex === 7 ? 0 : sprite.animCmdIndex,
    256,
    256,
  ].join(":");
};

for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = sceneOnMilkDrinkView(state).sprites.map(predictedKey).sort();
  const actual = oracle.effectSprites.map(actualKey).sort();
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
  else {
    framebufferDiffLines.push(`framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
  }
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`MILK_DRINK component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (mismatches.length || framebufferMatches !== total) {
  if (framebufferDiffLines.length) {
    console.error(framebufferDiffLines.slice(0, 32).join("\n"));
    if (framebufferDiffLines.length > 32) {
      console.error(`...and ${framebufferDiffLines.length - 32} more framebuffer diff frames`);
    }
  }
  if (mismatches.length) console.error(mismatches.slice(0, 8).join("\n"));
  process.exit(1);
}
