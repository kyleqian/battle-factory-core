import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnAromatherapyView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
  };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

interface ProbeSprite {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animCmdIndex: number;
  readonly matrix: readonly number[];
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly {
    readonly func: { readonly symbol: string | null };
    readonly data: readonly number[];
  }[];
  readonly registers: { readonly bldalpha: number };
  readonly bg1: { readonly y: number };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(
  readFileSync(resolve(process.argv[2]!), "utf8"),
) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-aromatherapy-compare-"));
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"),
  output,
  "--",
  join(vendor, "mgba-venv/bin/python"),
  resolve(root, fixture.probe),
  resolve(root, fixture.scenario),
  output,
  rgbDir,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly schema: string;
  readonly frames: readonly ProbeFrame[];
};
const evidenceSha256 = createHash("sha256")
  .update(readFileSync(output))
  .digest("hex");
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "AROMATHERAPY",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});

const entitySymbols = new Set([
  "gAromatherapySmallFlowerSpriteTemplate",
  "gAromatherapyBigFlowerSpriteTemplate",
  "gSparklingStarsSpriteTemplate",
  "gBlendThinRingExpandingSpriteTemplate",
]);
const actualKey = (sprite: ProbeSprite): string => [
  sprite.template.symbol,
  sprite.slot,
  sprite.x + sprite.x2,
  sprite.y + sprite.y2,
  sprite.template.symbol === "gSparklingStarsSpriteTemplate"
    ? sprite.animCmdIndex : "",
  sprite.template.symbol === "gAromatherapySmallFlowerSpriteTemplate"
    ? "256,0,0,256" : sprite.matrix.join(","),
  sprite.template.symbol?.includes("Flower") ? sprite.data.join(",") : "",
].join(":");

let componentMatches = 0;
let framebufferMatches = 0;
const componentDiffs: string[] = [];
const framebufferDiffs: string[] = [];
const framebufferMismatchFrames: number[] = [];
let firstFramebufferDiff: string | null = null;
const rawRgbHash = createHash("sha256");
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnAromatherapyView(state);
  const priorView = sceneOnAromatherapyView({ ...state, age: age - 1 });
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = [
    ...view.flowers.map((flower) => [
      flower.kind === "smallFlower"
        ? "gAromatherapySmallFlowerSpriteTemplate"
        : "gAromatherapyBigFlowerSpriteTemplate",
      flower.slot,
      flower.x + flower.x2,
      flower.y + flower.y2,
      "",
      flower.matrix.join(","),
      flower.data.join(","),
    ].join(":")),
    ...view.stars.map((star) => [
      "gSparklingStarsSpriteTemplate", star.slot, star.x, star.y,
      star.frame, "256,0,0,256", "",
    ].join(":")),
    ...(view.ring ? [[
      "gBlendThinRingExpandingSpriteTemplate",
      view.ring.slot,
      view.ring.x,
      view.ring.y,
      "",
      [
        view.ring.matrixScale, 0, 0, view.ring.matrixScale,
      ].join(","),
      "",
    ].join(":")] : []),
  ].sort();
  const actual = oracle.sprites
    .filter((sprite) => entitySymbols.has(sprite.template.symbol ?? ""))
    .map(actualKey)
    .sort();
  const statusTasks = oracle.tasks.filter(
    (task) => task.func.symbol === "AnimTask_StatusClearedEffect"
      || task.func.symbol === "UpdateMonScrollingBgMask",
  );
  const maskShape = statusTasks.length === (view.mask.active ? 1 : 0)
    && (!view.mask.active || (
      oracle.registers.bldalpha
        === (priorView.mask.evb << 8 | priorView.mask.eva)
      && (priorView.mask.eva === 0 || oracle.bg1.y === view.mask.scrollY)
    ));
  if (JSON.stringify(predicted) === JSON.stringify(actual) && maskShape) {
    componentMatches += 1;
  } else {
    componentDiffs.push(
      `frame ${frame}: predicted=${predicted} actual=${actual}`
      + ` mask=${view.mask.active}/${statusTasks.length}`
      + ` alpha=${oracle.registers.bldalpha} scroll=${oracle.bg1.y}`,
    );
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const app = render(engine);
  const rgb = readFileSync(
    join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
  );
  rawRgbHash.update(rgb);
  let count = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgba = pixel * 4, raw = pixel * 3;
    if (
      app[rgba] === rgb[raw]
      && app[rgba + 1] === rgb[raw + 1]
      && app[rgba + 2] === rgb[raw + 2]
    ) continue;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (count === 0) framebufferMatches += 1;
  else {
    const description =
      `frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
    framebufferMismatchFrames.push(frame);
    framebufferDiffs.push(description);
    if (firstFramebufferDiff !== null) continue;
    firstFramebufferDiff = `first framebuffer diff at ${description}`;
    const appRgb = Buffer.alloc(240 * 160 * 3);
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      appRgb[pixel * 3] = app[pixel * 4]!;
      appRgb[pixel * 3 + 1] = app[pixel * 4 + 1]!;
      appRgb[pixel * 3 + 2] = app[pixel * 4 + 2]!;
    }
    writeFileSync(join(scratch, "first-app.rgb"), appRgb);
  }
}
const total = fixture.denseWindow.endFrame
  - fixture.denseWindow.startFrame + 1;
const rawRgbSha256 = rawRgbHash.digest("hex");
const receiptMatches =
  probe.schema === fixture.evidenceSchema
  && evidenceSha256 === fixture.evidenceSha256
  && rawRgbSha256 === fixture.rawRgbSha256;
console.log(
  `AROMATHERAPY component/hardware ${componentMatches}/${total};`
  + ` framebuffer ${framebufferMatches}/${total};`
  + ` receipt ${receiptMatches ? "exact" : "mismatch"}`,
);
if (componentMatches !== total || framebufferMatches !== total || !receiptMatches) {
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 6).join("\n"));
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (!receiptMatches) {
    console.error(
      `receipt schema=${probe.schema} evidence=${evidenceSha256}`
      + ` rawRgb=${rawRgbSha256}`,
    );
  }
  if (framebufferDiffs.length) {
    console.error(`framebuffer samples: ${framebufferDiffs.slice(0, 12).join("; ")}`);
    console.error(`framebuffer tail: ${framebufferDiffs.slice(-12).join("; ")}`);
    const ranges: string[] = [];
    let start = framebufferMismatchFrames[0]!, end = start;
    for (const frame of framebufferMismatchFrames.slice(1)) {
      if (frame === end + 1) {
        end = frame;
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = frame;
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    console.error(`framebuffer mismatch ranges: ${ranges.join(", ")}`);
  }
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
