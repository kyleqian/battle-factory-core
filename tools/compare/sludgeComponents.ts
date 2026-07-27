import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { sludgeEffectAtAge } from "../../src/animation/sludge.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly projectileOrigin: Readonly<{ x: number; y: number }>;
  readonly attackerSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly targetSide: "player" | "opponent";
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
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-sludge-components-"));
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
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const key = (sprite: {
  readonly kind: string; readonly oamSlot: number; readonly x: number; readonly y: number;
  readonly xScale: number; readonly yScale: number;
}) => [sprite.kind, sprite.oamSlot, sprite.x, sprite.y, sprite.xScale, sprite.yScale].join(":");
let matches = 0;
const mismatches: string[] = [];
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const predicted = sludgeEffectAtAge(
    age, fixture.attackerSide, fixture.projectileOrigin, fixture.targetCenter,
  );
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expectedSprites = predicted.sprites.map(key).sort();
  const actualSprites = oracle.sprites.map((sprite) => key({
    kind: sprite.template === probe.templates.gSludgeProjectileSpriteTemplate
      ? "projectile" : "poisonBubble",
    oamSlot: sprite.slot,
    x: sprite.x + sprite.x2,
    y: sprite.y + sprite.y2,
    xScale: sprite.matrix.a,
    yScale: sprite.matrix.d,
  })).sort();
  const target = fixture.targetSide === "player" ? oracle.playerSprite : oracle.opponentSprite;
  const baselineTargetX2 = fixture.targetSide === "opponent" ? 1 : 0;
  const predictedTargetX2 = age < 41 ? baselineTargetX2 : predicted.targetOffset.x2;
  const shake = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_ShakeMon
    || task.func === probe.taskFuncs.AnimTask_ShakeMon_Step
  );
  const blend = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_BlendColorCycle
    || task.func === probe.taskFuncs.AnimTask_BlendColorCycleLoop
  );
  const shakeShape = age < 41 || age > 48
    ? shake.length === 0
    : shake.length === 1
      && shake[0]!.data[2] === 1 && shake[0]!.data[4] === 3
      && shake[0]!.data[5] === 0;
  const blendShape = age < 41 || age > 87
    ? blend.length === 0
    : blend.length === 1
      && blend[0]!.data[0] === 4 && blend[0]!.data[1] === 1
      && blend[0]!.data[4] === 12 && blend[0]!.data[5] === 31774;
  if (JSON.stringify(expectedSprites) === JSON.stringify(actualSprites)
      && predictedTargetX2 === target.x2
      && predicted.targetOffset.y2 === target.y2
      && shakeShape && blendShape) {
    matches += 1;
  } else {
    mismatches.push(`frame ${frame}: sprites predicted=${expectedSprites} actual=${actualSprites}; target predicted=${predictedTargetX2},${predicted.targetOffset.y2} actual=${target.x2},${target.y2}; tasks shake=${shake.length} blend=${blend.length}`);
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`SLUDGE source components ${matches}/${total}`);
if (matches !== total) {
  console.error(mismatches.slice(0, 12).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
