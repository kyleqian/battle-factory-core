import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnShadowBallView,
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
    readonly playerGender?: "male" | "female" | "none";
    readonly opponentGender?: "male" | "female" | "none";
  };
}
interface ProbeSprite {
  readonly slot: number; readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number; readonly matrixNum: number;
  readonly data: readonly number[];
}
interface ProbeFrame {
  readonly frame: number;
  readonly registers: { readonly BLDY: number };
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly battlerSprites: readonly ProbeSprite[];
  readonly shadowBalls: readonly ProbeSprite[];
  readonly hardwareOam: string;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-shadow-ball-compare-");
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
    readonly SoundTask_LoopSEAdjustPanning_Step: number;
    readonly AnimTask_ShakeMon2_Step: number;
  };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "SHADOW_BALL",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const u16hex = (hex: string, byteOffset: number): number => {
  const value = Number.parseInt(
    hex.slice(byteOffset * 2 + 2, byteOffset * 2 + 4)
      + hex.slice(byteOffset * 2, byteOffset * 2 + 2),
    16,
  );
  return value >= 0x8000 ? value - 0x10000 : value;
};
let componentMatches = 0;
let framebufferMatches = 0;
const componentDiffs: string[] = [];
const framebufferDiffLines: string[] = [];

for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnShadowBallView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);

  const ball = oracle.shadowBalls[0];
  const ballPresence = (view.sprite === null) === (ball === undefined);
  let ballMatches = ballPresence;
  if (view.sprite && ball) {
    const matrixBase = ball.matrixNum * 4;
    const matrix = [
      u16hex(oracle.hardwareOam, matrixBase * 8 + 6),
      u16hex(oracle.hardwareOam, (matrixBase + 1) * 8 + 6),
      u16hex(oracle.hardwareOam, (matrixBase + 2) * 8 + 6),
      u16hex(oracle.hardwareOam, (matrixBase + 3) * 8 + 6),
    ];
    ballMatches =
      ball.x === view.sprite.x
      && ball.y === view.sprite.y
      && ball.data[0] === (
        view.sprite.localAge === 15
        || view.sprite.localAge === 31
        || view.sprite.localAge === 39
          ? view.sprite.phase + 1
          : view.sprite.phase
      )
      && matrix[0] === view.sprite.pa
      && matrix[1] === view.sprite.pb
      && matrix[2] === view.sprite.pc
      && matrix[3] === view.sprite.pd;
  }

  const soundTask = oracle.tasks.find((task) =>
    task.func === probe.symbols.SoundTask_LoopSEAdjustPanning_Step);
  const soundMatches = view.loopSound === null
    ? soundTask === undefined
    : soundTask !== undefined
      && soundTask.data[4] === view.loopSound.remainingPlays
      && soundTask.data[10] === view.loopSound.panCounter
      && soundTask.data[11] === view.loopSound.pan
      && soundTask.data[12] === view.loopSound.delayCounter;
  const shakeTask = oracle.tasks.find((task) =>
    task.func === probe.symbols.AnimTask_ShakeMon2_Step);
  const shakeExpected = age >= 96 && age <= 109;
  const targetIndex = fixture.target.geometry.side === "player" ? 0 : 1;
  const shakeMatches =
    (shakeTask !== undefined) === shakeExpected
    && (!shakeExpected || (
      oracle.battlerSprites[targetIndex]!.x2 === view.targetOffset.x2
      && oracle.battlerSprites[targetIndex]!.y2 === view.targetOffset.y2
    ));
  const registerMatches = oracle.registers.BLDY === view.backgroundBldy;
  if (ballMatches && soundMatches && shakeMatches && registerMatches) {
    componentMatches += 1;
  } else {
    componentDiffs.push(
      `frame ${frame}/age ${age}: ball=${ballMatches}`
      + ` sound=${soundMatches} shake=${shakeMatches} bg=${registerMatches}`,
    );
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(
    join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
  );
  let exact = true;
  let count = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
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
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (exact) framebufferMatches += 1;
  else {
    framebufferDiffLines.push(
      `framebuffer diff at frame ${frame}/age ${age}: ${count}px`
      + ` bbox ${minX},${minY}-${maxX},${maxY}`,
    );
  }
}

const total =
  fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `SHADOW BALL component ${componentMatches}/${total};`
  + ` framebuffer ${framebufferMatches}/${total}`,
);
if (componentMatches !== total || framebufferMatches !== total) {
  if (framebufferDiffLines.length) {
    console.error(framebufferDiffLines.slice(0, 32).join("\n"));
    if (framebufferDiffLines.length > 32) {
      console.error(`...and ${framebufferDiffLines.length - 32} more framebuffer diff frames`);
    }
  }
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 20).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
