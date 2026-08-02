import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  swaggerAtAge,
} from "../../src/animation/swagger.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSwaggerView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
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
  readonly breathOrigin: Readonly<{ x: number; y: number }>;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}
interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: { readonly matrix: { readonly a: number; readonly d: number } };
  readonly opponentSprite: { readonly matrix: { readonly a: number; readonly d: number } };
  readonly sprites: readonly {
    readonly template: number; readonly x: number; readonly y: number;
    readonly x2: number; readonly y2: number;
    readonly attr2: number;
    readonly matrix: { readonly a: number; readonly d: number };
    readonly hardwareMatrix: { readonly a: number; readonly d: number };
  }[];
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly se1: {
    readonly songHeader: number; readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ?? "tools/compare/fixtures/swagger-player-rattata-opponent-onix.json";
const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-swagger-portable-");
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
  readonly templates: Readonly<Record<
    "gBreathPuffSpriteTemplate" | "gAngerMarkSpriteTemplate", number
  >>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<"SE_M_SWAGGER" | "SE_M_SWAGGER2", number>>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "SWAGGER",
  attacker: fixture.attacker,
  target: fixture.target,
  breathOrigin: fixture.breathOrigin,
  fieldProfile: fixture.fieldProfile,
});
let matches = 0;
let framebufferMatches = 0;
const framebufferMismatches: number[] = [];
const mismatches: string[] = [];
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = swaggerAtAge(
    age, fixture.attackerSide, fixture.breathOrigin,
    fixture.targetSide, fixture.target.geometry.animationCenter,
  );
  const seam = sceneOnSwaggerView({ ...stage, age });
  const attacker = fixture.attackerSide === "player"
    ? oracle.playerSprite : oracle.opponentSprite;
  const growTasks = oracle.tasks.filter(
    (task) => task.func === probe.taskFuncs.AnimTask_GrowAndShrink_Step,
  );
  const growShape = age <= 47
    ? growTasks.length === 1
      && attacker.matrix.a === predicted.attackerScale.x
      && attacker.matrix.d === predicted.attackerScale.y
    : growTasks.length === 0 && attacker.matrix.a === 256 && attacker.matrix.d === 256;
  const breath = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gBreathPuffSpriteTemplate,
  );
  const breathShape = predicted.breath
    ? breath.length === 1
      && breath[0]!.x + breath[0]!.x2 === predicted.breath.x
      && breath[0]!.y + breath[0]!.y2 === predicted.breath.y
    : breath.length === 0;
  const anger = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gAngerMarkSpriteTemplate,
  );
  const angerShape = anger.length === predicted.angerMarks.length
    && anger.every((sprite, index) => {
      const expected = predicted.angerMarks[index]!;
      return sprite.x === expected.x && sprite.y === expected.y
        && sprite.matrix.a === Math.trunc(0x10000 / expected.xScale)
        && sprite.matrix.d === Math.trunc(0x10000 / expected.yScale);
    });
  const soundBoundary = age === 0 || age === 49 || age === 53
    || age === 129 || age === 143;
  const expectedSong = age >= 129
    ? probe.songHeaders.SE_M_SWAGGER2 : probe.songHeaders.SE_M_SWAGGER;
  const expectedPan = (age >= 129 ? fixture.targetSide : fixture.attackerSide)
    === "player" ? -63 : 63;
  const soundShape = !soundBoundary || (
    oracle.se1.songHeader === expectedSong
    && oracle.se1.status === 0
    && oracle.se1.tracks[0]?.flags === 131
    && Math.abs((oracle.se1.tracks[0]?.panX ?? 0) - expectedPan) <= 1
  );
  const componentShape = growShape && breathShape && angerShape && soundShape
    && seam.breath?.x === predicted.breath?.x
    && seam.angerMarks.length === predicted.angerMarks.length;
  if (componentShape) matches += 1;
  else mismatches.push(
    `frame ${frame}/age ${age}: grow=${growShape} breath=${breathShape} anger=${angerShape} sound=${soundShape}`,
  );

  const engine: EngineState = {
    ...createInitialState(), rngMode: "frontierBattle",
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
  else framebufferMismatches.push(age);
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`SWAGGER source components ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (matches !== total || framebufferMatches !== total) {
  console.error(mismatches.slice(0, 20).join("\n"));
  console.error(`framebuffer mismatch ages: ${framebufferMismatches.join(",")}`);
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
