import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnEarthquakeView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string; readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly initialBattlerX2: Readonly<{ player: number; opponent: number }>;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}
interface Task { readonly func: number; readonly data: readonly number[] }
interface ProbeFrame {
  readonly frame: number; readonly bg3X: number;
  readonly playerSprite: { readonly x2: number; readonly y2: number };
  readonly opponentSprite: { readonly x2: number; readonly y2: number };
  readonly tasks: readonly Task[];
  readonly paletteSprite: { readonly data: readonly number[] } | null;
  readonly bgPalette: readonly number[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-earthquake-compare-"));
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
  readonly taskFuncs: { readonly platforms: number; readonly battlers: number };
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const first = frames.get(fixture.denseWindow.startFrame);
if (!first) throw new Error("probe omitted dense-window start");
const basePalette = first.bgPalette;
const stage = createSceneOnMovePresentation({
  move: "EARTHQUAKE", attacker: fixture.attacker, target: fixture.target,
  fieldProfile: fixture.fieldProfile, initialBattlerX2: fixture.initialBattlerX2,
});
let componentMatches = 0, framebufferMatches = 0;
const mismatches: string[] = [];
const framebufferDiffLines: string[] = [];
const blend15 = (packed: number, target: number, coefficient: number): number => {
  const r = packed & 31, g = (packed >>> 5) & 31, b = (packed >>> 10) & 31;
  const tr = target & 31, tg = (target >>> 5) & 31, tb = (target >>> 10) & 31;
  return (r + (((tr - r) * coefficient) >> 4))
    | ((g + (((tg - g) * coefficient) >> 4)) << 5)
    | ((b + (((tb - b) * coefficient) >> 4)) << 10);
};

for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age }, view = sceneOnEarthquakeView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const platform = oracle.tasks.find((task) => task.func === probe.taskFuncs.platforms);
  const battlers = oracle.tasks.find((task) => task.func === probe.taskFuncs.battlers);
  const taskDataMatches = !view.shake.active
    ? oracle.tasks.length === 0
    : !!platform && !!battlers
      && [platform, battlers].every((task) =>
        task.data[0] === view.shake.taskState
        && task.data[1] === view.shake.delay
        && task.data[2] === view.shake.timer
        && task.data[3] === 50
        && task.data[14] === view.shake.horizontalOffset
        && task.data[15] === 13)
      && platform.data[13] === 0 && battlers.data[13] === 2;
  const playerX2 = view.playerBattlerX2, opponentX2 = view.opponentBattlerX2;
  const paletteTaskMatches = !view.palette.active
    ? oracle.paletteSprite === null
    : oracle.paletteSprite?.data[0] === view.palette.timer
      && oracle.paletteSprite.data[1] === (view.palette.color === "white" ? 259 : 3)
      && oracle.paletteSprite.data[2] === view.palette.remainingBlends
      && oracle.paletteSprite.data[3] === 0
      && oracle.paletteSprite.data[4] === 14
      && oracle.paletteSprite.data[5] === 32767
      && oracle.paletteSprite.data[6] === 14
      && oracle.paletteSprite.data[7] === 1;
  const target15 = view.palette.color === "white" ? 32767 : 0;
  const expectedPalette = basePalette.map((value, index) =>
    view.palette.active && index >= 16 && index < 64
      ? blend15(value, target15, 14) : value);
  const paletteMatches = JSON.stringify(expectedPalette) === JSON.stringify(oracle.bgPalette);
  if (taskDataMatches && paletteTaskMatches && paletteMatches
    && oracle.bg3X === view.shake.platformX
    && oracle.playerSprite.x2 === playerX2
    && oracle.opponentSprite.x2 === opponentX2) {
    componentMatches += 1;
  } else {
    mismatches.push(`frame ${frame}/age ${age}: task=${taskDataMatches} paletteTask=${paletteTaskMatches} palette=${paletteMatches}; bg predicted=${view.shake.platformX} actual=${oracle.bg3X}; x2 predicted=${playerX2},${opponentX2} actual=${oracle.playerSprite.x2},${oracle.opponentSprite.x2}`);
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
  else {
    framebufferDiffLines.push(`framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`EARTHQUAKE component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (mismatches.length || framebufferMatches !== total) {
  if (framebufferDiffLines.length) {
    console.error(framebufferDiffLines.slice(0, 32).join("\n"));
    if (framebufferDiffLines.length > 32) {
      console.error(`...and ${framebufferDiffLines.length - 32} more framebuffer diff frames`);
    }
  }
  if (mismatches.length) console.error(mismatches.slice(0, 10).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
