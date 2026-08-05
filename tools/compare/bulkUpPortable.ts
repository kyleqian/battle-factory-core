import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBulkUpView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { bulkUpAtAge } from "../../src/animation/bulkUp.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly breathOrigin: Readonly<{ x: number; y: number }>;
  readonly battlerHeight: number;
  readonly fieldProfile: SceneOnDragonRageFieldProfile;
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: "partial" | "exact"; readonly framebufferMatching?: number };
}
interface ProbeFrame {
  readonly frame: number;
  readonly gAnimScriptActive: boolean;
  readonly battlers: unknown;
  readonly sprites: readonly {
    readonly template: { readonly symbol: string };
    readonly slot: number;
    readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
    readonly matrix: readonly number[];
  }[];
  readonly tasks: readonly ({ readonly func: { readonly symbol: string }; readonly data: readonly number[] } | null)[];
  readonly se1: { readonly songHeader: number; readonly status: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
  readonly scriptOffset: number | null;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-bulk-up-compare-");
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

const bytes = readFileSync(output);
const probe = JSON.parse(bytes.toString("utf8")) as {
  readonly schema: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly sourceSymbols: { readonly SE_M_SWAGGER: number };
  readonly frames: readonly ProbeFrame[];
};
const evidenceHash = createHash("sha256").update(bytes).digest("hex");
const rgbHash = createHash("sha256");
for (const frame of probe.frames) {
  rgbHash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
}
const errors: string[] = [];
if (probe.schema !== fixture.evidenceSchema) errors.push("probe schema drifted");
if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) errors.push("source window drifted");
if (probe.frames.length !== fixture.denseWindow.frameCount) errors.push("dense frame count drifted");
if (evidenceHash !== fixture.evidenceSha256) errors.push(`evidence hash ${evidenceHash}`);
if (evidenceHash !== fixture.secondFreshEvidenceSha256) errors.push("second-fresh evidence pin differs");
const actualRgbHash = rgbHash.digest("hex");
if (actualRgbHash !== fixture.rawRgbSha256) errors.push(`RGB hash ${actualRgbHash}`);
if (!probe.frames[0]?.gAnimScriptActive || probe.frames.at(-1)?.gAnimScriptActive) errors.push("active/cleanup boundary drifted");
if (JSON.stringify(probe.frames[0]?.battlers) !== JSON.stringify(probe.frames.at(-1)?.battlers)) errors.push("gameplay fields changed inside animation body");
const taskNames = new Set(probe.frames.flatMap((frame) => frame.tasks.flatMap((task) => task ? [task.func.symbol] : [])));
for (const symbol of ["AnimTask_GrowAndShrink_Step", "Task_LoopAndPlaySE"]) {
  if (!taskNames.has(symbol)) errors.push(`missing task lifecycle ${symbol}`);
}
if (!taskNames.has("DestroyAnimVisualTask") && !probe.frames.some((frame) => frame.tasks.length === 0)) {
  errors.push("missing grow/audio teardown");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`${probe.frames.length}/${fixture.denseWindow.frameCount} dense semantic/RGB evidence frames reproduced`);
console.log(`evidence ${evidenceHash}; RGB ${actualRgbHash}`);

const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "BULK_UP",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
  breathOrigin: fixture.breathOrigin,
  battlerHeight: fixture.battlerHeight,
});
let matches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferMismatches: number[] = [];
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = bulkUpAtAge(
    age, fixture.attacker.geometry.side, fixture.breathOrigin, fixture.battlerHeight,
  );
  const growTasks = oracle.tasks.filter(
    (task) => task?.func.symbol === "AnimTask_GrowAndShrink_Step",
  );
  const growSprite = growTasks[0]
    ? oracle.sprites.find((sprite) => sprite.slot === growTasks[0]!.data[15])
    : undefined;
  const growShape = age <= 47
    ? growTasks.length === 1
      && growSprite?.matrix[0] === predicted.attackerScale.x
      && growSprite?.matrix[3] === predicted.attackerScale.y
    : growTasks.length === 0
      && (growSprite === undefined || (growSprite.matrix[0] === 256 && growSprite.matrix[3] === 256));
  const breath = oracle.sprites.filter(
    (sprite) => sprite.template.symbol === "gBreathPuffSpriteTemplate",
  );
  const breathShape = predicted.breath
    ? breath.length === 1
      && breath[0]!.x + breath[0]!.x2 === predicted.breath.x
      && breath[0]!.y + breath[0]!.y2 === predicted.breath.y
    : breath.length === 0;
  const soundBoundary = age === 0 || age === 49 || age === 53;
  const soundShape = !soundBoundary || (
    oracle.se1.songHeader === probe.sourceSymbols.SE_M_SWAGGER
    && oracle.se1.status === 0
    && oracle.se1.tracks[0]?.flags === 131
    && Math.abs((oracle.se1.tracks[0]?.panX ?? 0) - (fixture.attacker.geometry.side === "player" ? -64 : 64)) <= 1
  );
  const seam = sceneOnBulkUpView({ ...stage, age });
  const seamShape = seam.attackerScale.x === predicted.attackerScale.x
    && seam.attackerScale.y === predicted.attackerScale.y
    && seam.attackerY2 === predicted.attackerY2
    && JSON.stringify(seam.breath) === JSON.stringify(predicted.breath);
  const componentShape = growShape && breathShape && soundShape && seamShape;
  if (componentShape) matches += 1;
  else componentMismatches.push(
    `frame ${frame}/age ${age}: grow=${growShape} breath=${breathShape} sound=${soundShape} seam=${seamShape}`,
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
console.log(`BULK_UP source components ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (matches !== total || framebufferMatches !== total) {
  console.error(componentMismatches.slice(0, 20).join("\n"));
  console.error(`framebuffer mismatch ages: ${framebufferMismatches.join(",")}`);
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
if (fixture.acceptance.status === "exact"
  && framebufferMatches !== fixture.denseWindow.frameCount) process.exit(1);
