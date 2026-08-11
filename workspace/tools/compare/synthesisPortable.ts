import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnSynthesisView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { synthesisBlendTaskActiveAtAge } from "../../src/animation/synthesis.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string; readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}
interface ProbeSprite {
  readonly kind: "grantingStar" | "star";
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly animCmdIndex: number;
}
interface ProbeBattler { readonly paletteFaded: readonly number[] }
interface ProbeFrame {
  readonly frame: number; readonly effectSprites: readonly ProbeSprite[];
  readonly playerSprite: ProbeBattler; readonly opponentSprite: ProbeBattler;
  readonly blendTasks: readonly { readonly data: readonly number[] }[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-synthesis-compare-");
const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output, rgbDir,
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
  move: "SYNTHESIS", attacker: fixture.attacker, target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const key = (sprite: {
  readonly kind: string; readonly x: number; readonly y: number; readonly frame: number;
}) => [sprite.kind, sprite.x, sprite.y, sprite.frame].join(":");
const blend = (source: number, target: number, y: number): number => {
  let result = 0;
  for (let shift = 0; shift < 15; shift += 5) {
    const a = (source >> shift) & 31, b = (target >> shift) & 31;
    result |= Math.trunc((a * (16 - y) + b * y) / 16) << shift;
  }
  return result;
};
let componentMatches = 0, framebufferMatches = 0;
const componentDiffs: string[] = [], framebufferDiffs: string[] = [];
const tail = frames.get(fixture.denseWindow.startFrame + 81)!;
const basePalette = (fixture.attacker.geometry.side === "player"
  ? tail.playerSprite : tail.opponentSprite).paletteFaded;
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame++) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age }, view = sceneOnSynthesisView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = view.sprites.map(key).sort();
  const actual = oracle.effectSprites.map((sprite) => key({
    kind: sprite.kind, x: sprite.x + sprite.x2, y: sprite.y + sprite.y2,
    frame: sprite.kind === "star" && sprite.animCmdIndex === 7
      ? 0 : sprite.animCmdIndex,
  })).sort();
  const attacker = fixture.attacker.geometry.side === "player"
    ? oracle.playerSprite : oracle.opponentSprite;
  const palette = basePalette.map((color) => blend(color, 19451, view.attackerObjY));
  const taskActive = synthesisBlendTaskActiveAtAge(age);
  const taskShape = oracle.blendTasks.length === (taskActive ? 1 : 0)
    && (!taskActive || (
      oracle.blendTasks[0]!.data[0] === 2
      && oracle.blendTasks[0]!.data[1] === 2
      && oracle.blendTasks[0]!.data[3] === 0
      && oracle.blendTasks[0]!.data[4] === 16
      && oracle.blendTasks[0]!.data[5] === 19451
    ));
  if (JSON.stringify(predicted) === JSON.stringify(actual)
    && JSON.stringify(palette) === JSON.stringify(attacker.paletteFaded)
    && taskShape) componentMatches++;
  else componentDiffs.push(`frame ${frame}: sprites ${predicted} != ${actual}; paletteY=${view.attackerObjY}; tasks=${oracle.blendTasks.length}`);

  const engine: EngineState = {
    ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state,
  };
  const app = render(engine);
  const rgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel++) {
    const a = pixel * 4, b = pixel * 3;
    if (app[a] !== rgb[b] || app[a + 1] !== rgb[b + 1] || app[a + 2] !== rgb[b + 2]) {
      count++;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (count === 0) framebufferMatches++;
  else {
    framebufferDiffs.push(`${frame}:${count}:${minX},${minY}-${maxX},${maxY}`);
    if (framebufferDiffs.length === 1) {
      const appRgb = Buffer.alloc(240 * 160 * 3);
      for (let pixel = 0; pixel < 240 * 160; pixel++) {
        appRgb[pixel * 3] = app[pixel * 4]!;
        appRgb[pixel * 3 + 1] = app[pixel * 4 + 1]!;
        appRgb[pixel * 3 + 2] = app[pixel * 4 + 2]!;
      }
      writeFileSync(join(scratch, "first-app.rgb"), appRgb);
    }
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`SYNTHESIS component/task/palette ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (componentMatches !== total || framebufferMatches !== total) {
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 8).join("\n"));
  if (framebufferDiffs.length) console.error(`framebuffer ${framebufferDiffs.slice(0, 20).join(" ")}`);
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
