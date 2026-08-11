import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnFireSpinView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
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
  readonly slot: number;
  readonly callback: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animNum: number;
  readonly animCmdIndex: number;
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly sourceActive: boolean;
  readonly currentMove: number;
  readonly battlerSprites: readonly ProbeSprite[];
  readonly fireSpinSprites: readonly ProbeSprite[];
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-fire-spin-compare-");
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output, rgbDir,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly symbols: {
    readonly AnimParticleInVortex_Step: number;
    readonly AnimTask_ShakeMon_Step: number;
  };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "FIRE_SPIN",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const key = (values: readonly number[]) => values.join(",");
const targetIndex = fixture.target.geometry.side === "player" ? 0 : 1;
let componentMatches = 0;
let framebufferMatches = 0;
const componentDiffs: string[] = [];
const framebufferDiffs: string[] = [];

for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnFireSpinView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expectedFire = view.fireSpin.map((sprite) => key([
    sprite.x, sprite.y, sprite.x2, sprite.y2, sprite.remaining,
    sprite.angle, sprite.animationFrame,
  ])).sort();
  const actualFire = oracle.fireSpinSprites.map((sprite) => key([
    sprite.x, sprite.y, sprite.x2, sprite.y2, sprite.data[0]!,
    sprite.data[5]!, sprite.animCmdIndex,
  ])).sort();
  const target = oracle.battlerSprites[targetIndex]!;
  const expectedTargetX2 = fixture.target.geometry.side === "opponent" && age < 4 ? 1 : 0;
  const expectedTask = age >= 4 && age < 96;
  const task = oracle.tasks.find((entry) =>
    entry.func === probe.symbols.AnimTask_ShakeMon_Step);
  const componentExact =
    oracle.currentMove === 83
    && oracle.sourceActive === (age < 103)
    && JSON.stringify(expectedFire) === JSON.stringify(actualFire)
    && target.x2 === expectedTargetX2
    && target.y2 === view.targetOffset.y2
    && (task !== undefined) === expectedTask
    && oracle.fireSpinSprites.every((sprite) =>
      sprite.callback === probe.symbols.AnimParticleInVortex_Step);
  if (componentExact) componentMatches += 1;
  else componentDiffs.push(
    `frame ${frame}/age ${age}: source=${oracle.sourceActive}`
    + ` fire=${JSON.stringify(expectedFire) === JSON.stringify(actualFire)}`
    + ` target=${target.x2},${target.y2} expected=${expectedTargetX2},${view.targetOffset.y2}`
    + ` task=${task !== undefined}/${expectedTask}`,
  );

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const app = render(engine);
  const rgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let different = 0;
  let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] === rgb[pixel * 3]
      && app[pixel * 4 + 1] === rgb[pixel * 3 + 1]
      && app[pixel * 4 + 2] === rgb[pixel * 3 + 2]) continue;
    different += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (different === 0) framebufferMatches += 1;
  else framebufferDiffs.push(
    `frame ${frame}/age ${age}: ${different}px bbox=${minX},${minY}..${maxX},${maxY}`,
  );
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`FIRE SPIN component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (componentMatches !== total || framebufferMatches !== total) {
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 20).join("\n"));
  if (framebufferDiffs.length) console.error(framebufferDiffs.slice(0, 40).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
