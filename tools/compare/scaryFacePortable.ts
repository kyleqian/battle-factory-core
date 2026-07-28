import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { scaryFaceAtAge } from "../../src/animation/scaryFace.ts";
import {
  createSceneOnMovePresentation,
  sceneOnScaryFaceView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

interface Fixture {
  scenario: string; probe: string; attackerSide: "player" | "opponent";
  denseWindow: { startFrame: number; endFrame: number };
  attackerEyeCenter: { x: number; y: number };
  attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler;
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
  };
}
interface Sprite {
  template: number; callback: string; x: number; y: number;
  x2: number; y2: number; animFrame: number;
}
interface Task { func: string; data: readonly number[] }
interface Frame {
  frame: number; sprites: readonly Sprite[]; tasks: readonly Task[];
  player: Sprite; opponent: Sprite; se1: number; se2: number;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ?? "tools/compare/fixtures/scary-face-player-rhyhorn-opponent-shuckle.json";
const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-scary-face-portable-"));
const output = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  templates: { eye: number; blend: number };
  songHeaders: Record<string, number>;
  frames: readonly Frame[];
};
const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "SCARY_FACE",
  attacker: fixture.attacker,
  target: fixture.target,
  attackerEyeCenter: fixture.attackerEyeCenter,
  fieldProfile: fixture.fieldProfile,
});
const failures: string[] = [];
let matches = 0;
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = frame - fixture.denseWindow.startFrame;
  const oracle = byFrame.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expected = scaryFaceAtAge(
    age, fixture.attackerSide, fixture.target.geometry.side,
    fixture.attackerEyeCenter,
  );
  const seam = sceneOnScaryFaceView({ ...stage, age });
  const blendActual = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.blend,
  );
  const blend = blendActual.length === (expected.paletteBlend ? 1 : 0)
    && blendActual.every((sprite) =>
      sprite.callback === "AnimSimplePaletteBlend_Step");
  const eyesActual = oracle.sprites
    .filter((sprite) => sprite.template === probe.templates.eye)
    .map((sprite) => [sprite.x, sprite.y, sprite.animFrame]);
  const eyes = JSON.stringify(eyesActual) === JSON.stringify(
    expected.eyes.map((eye) => [eye.x, eye.y, eye.frame]),
  );
  const bgTask = oracle.tasks.find((task) => task.func.startsWith("AnimTask_ScaryFace"));
  const task = expected.background === null ? bgTask === undefined
    : bgTask?.func === expected.background.task.function
      && bgTask.data[10] === expected.background.task.counter
      && bgTask.data[11] === expected.background.task.blendCounter
      && bgTask.data[12] === expected.background.task.phase;
  const shake = oracle.tasks.find(
    (item) => item.func === "AnimTask_ShakeTargetInPattern",
  );
  const target = fixture.target.geometry.side === "player"
    ? oracle.player : oracle.opponent;
  const shakeMatch = expected.shakeTask === null
    ? shake === undefined && target.x2 === 0 && target.y2 === 0
    : shake?.data[0] === expected.shakeTask.shakeNum
      && JSON.stringify(shake.data.slice(1, 5)) === JSON.stringify([20, 1, 0, 16])
      && target.x2 === expected.targetOffset.x2 && target.y2 === 0;
  const sound = expected.soundRestart === null
    || oracle.se1 === probe.songHeaders[expected.soundRestart];
  const seamShape = JSON.stringify({
    ...seam, age: undefined, attacker: undefined, target: undefined,
  }) === JSON.stringify(expected);
  if (blend && eyes && task && shakeMatch && sound && seamShape) matches += 1;
  else failures.push(
    `frame ${frame}/age ${age}: blend=${blend} eyes=${eyes} task=${task} `
    + `shake=${shakeMatch} sound=${sound} seam=${seamShape}`,
  );
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`SCARY_FACE source/software/typed seam ${matches}/${total}`);
if (matches !== total) {
  console.error(failures.slice(0, 30).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
