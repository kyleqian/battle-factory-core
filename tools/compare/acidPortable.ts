import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnAcidView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string; readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly projectileOrigin: Readonly<{ x: number; y: number }>;
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
  readonly slot: number; readonly template: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly matrix: { readonly a: number; readonly d: number };
}
interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: { readonly x2: number; readonly y2: number };
  readonly opponentSprite: { readonly x2: number; readonly y2: number };
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly fadedPalette: readonly number[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-acid-compare-"));
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
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
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "ACID", attacker: fixture.attacker, target: fixture.target,
  projectileOrigin: fixture.projectileOrigin, fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0, framebufferMatches = 0;
const mismatches: string[] = [];
const framebufferMismatches: string[] = [];
let firstFramebufferDiff: string | null = null;
const key = (sprite: {
  readonly kind: string; readonly oamSlot: number; readonly x: number; readonly y: number;
  readonly xScale: number; readonly yScale: number;
}) => [sprite.kind, sprite.oamSlot, sprite.x, sprite.y, sprite.xScale, sprite.yScale].join(":");

for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnAcidView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = view.sprites.map(key).sort();
  const actual = oracle.sprites.map((sprite) => key({
    kind: sprite.template === probe.templates.gAcidPoisonBubbleSpriteTemplate
      ? "bubble" : "droplet",
    oamSlot: sprite.slot, x: sprite.x + sprite.x2, y: sprite.y + sprite.y2,
    xScale: sprite.matrix.a, yScale: sprite.matrix.d,
  })).sort();
  const target = fixture.target.geometry.side === "player"
    ? oracle.playerSprite : oracle.opponentSprite;
  const baselineTargetX2 = fixture.target.geometry.side === "opponent" ? 1 : 0;
  const predictedTargetX2 = age < 31 ? baselineTargetX2 : view.targetOffset.x2;
  const shakeTasks = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_ShakeMon2
    || task.func === probe.taskFuncs.AnimTask_ShakeMon2_Step
  );
  const blendTasks = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_BlendColorCycle
    || task.func === probe.taskFuncs.AnimTask_BlendColorCycleLoop
  );
  const taskShape = age < 31 || age > 89
    ? shakeTasks.length === 0 && blendTasks.length === 0
    : (age <= 48 ? shakeTasks.length === 1 : shakeTasks.length === 0)
      && blendTasks.length === 1
      && blendTasks[0]!.data[0] === 20
      && blendTasks[0]!.data[1] === 2
      && blendTasks[0]!.data[3] === 0
      && blendTasks[0]!.data[4] === 12
      && blendTasks[0]!.data[5] === 31774;
  if (JSON.stringify(predicted) === JSON.stringify(actual)
    && predictedTargetX2 === target.x2 && view.targetOffset.y2 === target.y2
    && taskShape) {
    componentMatches += 1;
  } else {
    mismatches.push(`frame ${frame}: sprites predicted=${predicted} actual=${actual}; target predicted=${predictedTargetX2},${view.targetOffset.y2} actual=${target.x2},${target.y2}; tasks shake=${shakeTasks.length} blend=${blendTasks.length}`);
  }

  const engine: EngineState = {
    ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true, count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3, rgba = pixel * 4;
    if (app[rgba] === oracleRgb[rgb] && app[rgba + 1] === oracleRgb[rgb + 1]
      && app[rgba + 2] === oracleRgb[rgb + 2]) continue;
    exact = false; count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (exact) framebufferMatches += 1;
  else if (firstFramebufferDiff === null) {
    firstFramebufferDiff = `first framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
  }
  if (!exact) framebufferMismatches.push(`${frame}:${count}:${minX},${minY}-${maxX},${maxY}`);
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`ACID component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (mismatches.length || framebufferMatches !== total) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (framebufferMismatches.length) console.error(`framebuffer mismatches ${framebufferMismatches.join(" ")}`);
  if (mismatches.length) console.error(mismatches.slice(0, 8).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
