import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  hyperFangEffectAtAge,
} from "../../src/animation/hyperFang.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHyperFangView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly probeMoveId: number;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attackerSide: "player" | "opponent";
  readonly targetSide: "player" | "opponent";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}
interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: { readonly x2: number; readonly y2: number };
  readonly opponentSprite: { readonly x2: number; readonly y2: number };
  readonly sprites: readonly {
    readonly template: number; readonly attr2: number;
    readonly x: number; readonly y: number; readonly matrix: { readonly a: number; readonly d: number };
  }[];
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly se1: {
    readonly songHeader: number; readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly bldy: number;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-hyper-fang-portable-");
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output, rgbDir, String(fixture.probeMoveId),
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly templates: Readonly<Record<"gFangSpriteTemplate", number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<"SE_M_BITE" | "SE_M_LEER", number>>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "HYPER_FANG",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let matches = 0;
let framebufferMatches = 0;
const mismatches: string[] = [];
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = hyperFangEffectAtAge(
    age, fixture.targetSide, fixture.target.geometry.animationCenter,
  );
  const seam = sceneOnHyperFangView({ ...stage, age });
  const fang = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gFangSpriteTemplate,
  );
  const softwareExpected = hyperFangEffectAtAge(
    age === 58 ? 57 : age <= 26 ? age : age - 1,
    fixture.targetSide,
    fixture.target.geometry.animationCenter,
  ).sprites[0];
  const fangShape = age < 26 || age > 58
    ? fang.length === 0
    : fang.length === 1 && !!softwareExpected
      && fang[0]!.x === softwareExpected.x && fang[0]!.y === softwareExpected.y
      && fang[0]!.matrix.a === softwareExpected.xScale
      && fang[0]!.matrix.d === softwareExpected.yScale;
  const fade = oracle.tasks.filter(
    (task) => task.func === probe.taskFuncs.Task_FadeToBg,
  );
  const expectedBgId = fixture.targetSide === "player" ? 5 : 4;
  const fadeShape = age < 7 || age > 105
    ? fade.length === 0
    : age <= 44
      ? fade.length === 1 && fade[0]!.data[0] === expectedBgId
      : age < 68
        ? fade.length === 0
        : fade.length === 1 && fade[0]!.data[0] === -1;
  const shake = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_ShakeMon
    || task.func === probe.taskFuncs.AnimTask_ShakeMon_Step
  );
  const shakeShape = age < 46 || age > 63
    ? shake.length === 0
    : shake.length === 1
      && shake[0]!.data[4] === 0 && shake[0]!.data[5] === 10;
  const soundBoundary = age === 0 || age === 46;
  const expectedSong = age === 0
    ? probe.songHeaders.SE_M_BITE : probe.songHeaders.SE_M_LEER;
  const expectedPan = fixture.targetSide === "player" ? -63 : 63;
  const soundShape = !soundBoundary || (
    oracle.se1.songHeader === expectedSong
    && oracle.se1.status === 0
    && oracle.se1.tracks[0]?.flags === 131
    && oracle.se1.tracks[0]?.panX === expectedPan
  );
  const componentShape = predicted.contest === false
    && predicted.targetPlayerSide === (fixture.targetSide === "player")
    && predicted.background.variant === fixture.targetSide
    && oracle.bldy === predicted.background.bldy
    && seam.background.variant === predicted.background.variant
    && seam.background.impact === predicted.background.impact
    && fangShape && fadeShape && shakeShape && soundShape;
  if (componentShape) matches += 1;
  else mismatches.push(`frame ${frame}/age ${age}: fang=${fangShape} fade=${fadeShape} shake=${shakeShape} sound=${soundShape} bldy=${oracle.bldy}/${predicted.background.bldy}`);

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const rgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== rgb[pixel * 3]
      || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) {
      exact = false; break;
    }
  }
  if (exact) framebufferMatches += 1;
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`HYPER_FANG source components ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (matches !== total || framebufferMatches !== total) {
  console.error(mismatches.slice(0, 16).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
