import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnEmberView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import type { EmberGeometry } from "../../src/animation/ember.ts";
import { PNG } from "pngjs";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: EmberGeometry;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly opponentHp: number;
    readonly playerStatus: "none" | "burn";
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

interface ProbeSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly tileNum: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly emberSprites: readonly ProbeSprite[];
  readonly emberFlareSprites: readonly ProbeSprite[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(
  readFileSync(resolve(process.argv[2]!), "utf8"),
) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-ember-compare-"));
const output = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync(
  "python3",
  [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    join(scratch, "rgb"),
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "EMBER",
  attacker: fixture.attacker,
  target: fixture.target,
  animationProfile: fixture.animationProfile,
  fieldProfile: fixture.fieldProfile,
});
let engine: EngineState = {
  ...createInitialState(),
  rngMode: "frontierBattle",
  sceneOnPresentation: {
    ...stage,
    age: fixture.appStage.firstFramePresentationAge,
  },
};

function normalizedOracle(sprites: readonly ProbeSprite[]): string[] {
  return sprites.map((sprite) => JSON.stringify({
    centerX: sprite.x + sprite.x2,
    centerY: sprite.y + sprite.y2,
    sheetFrame: (sprite.tileNum - 537) / 16,
    subpriority: sprite.subpriority,
  })).sort();
}

let matching = 0;
let framebufferMatching = 0;
const framebufferExactFrames: number[] = [];
const framebufferMismatches: string[] = [];
const mismatches: string[] = [];
const diagnosticFrame = process.env.POKEBENCH_DIAGNOSTIC_FRAME === undefined
  ? null
  : Number(process.env.POKEBENCH_DIAGNOSTIC_FRAME);
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const record = frames.get(frame);
  if (!record) throw new Error(`probe omitted dense frame ${frame}`);
  const age =
    fixture.appStage.firstFramePresentationAge
    + frame - fixture.denseWindow.startFrame;
  const app = sceneOnEmberView({ ...stage, age }).sprites
    .map((sprite) => JSON.stringify({
      centerX: sprite.centerX,
      centerY: sprite.centerY,
      sheetFrame: sprite.sheetFrame,
      subpriority: fixture.animationProfile.targetSubpriority - 2,
    }))
    .sort();
  const oracle = normalizedOracle([
    ...record.emberSprites,
    ...record.emberFlareSprites,
  ]);
  if (JSON.stringify(app) === JSON.stringify(oracle)) matching += 1;
  else if (mismatches.length < 8) {
    mismatches.push(`${frame}: oracle=${oracle.join("|")} app=${app.join("|")}`);
  }
  const oracleRgb = readFileSync(
    join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`),
  );
  const rgba = render(engine);
  if (frame === diagnosticFrame) {
    const oraclePng = new PNG({ width: 240, height: 160 });
    const appPng = new PNG({ width: 240, height: 160 });
    const diffPng = new PNG({ width: 240, height: 160 });
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const oracleOffset = pixel * 3;
      const rgbaOffset = pixel * 4;
      const differs =
        oracleRgb[oracleOffset] !== rgba[rgbaOffset]
        || oracleRgb[oracleOffset + 1] !== rgba[rgbaOffset + 1]
        || oracleRgb[oracleOffset + 2] !== rgba[rgbaOffset + 2];
      oraclePng.data.set([
        oracleRgb[oracleOffset]!,
        oracleRgb[oracleOffset + 1]!,
        oracleRgb[oracleOffset + 2]!,
        255,
      ], rgbaOffset);
      appPng.data.set(rgba.subarray(rgbaOffset, rgbaOffset + 4), rgbaOffset);
      diffPng.data.set(differs ? [255, 0, 255, 255] : [0, 0, 0, 255], rgbaOffset);
    }
    writeFileSync(join(scratch, `oracle-${frame}.png`), PNG.sync.write(oraclePng));
    writeFileSync(join(scratch, `app-${frame}.png`), PNG.sync.write(appPng));
    writeFileSync(join(scratch, `diff-${frame}.png`), PNG.sync.write(diffPng));
    console.log(`diagnostic PNGs: ${scratch}`);
  }
  let framebufferExact = true;
  let framebufferDiff = 0;
  let minDiffX = 240;
  let minDiffY = 160;
  let maxDiffX = -1;
  let maxDiffY = -1;
  const diffSamples: string[] = [];
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      oracleRgb[pixel * 3] !== rgba[pixel * 4]
      || oracleRgb[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
      || oracleRgb[pixel * 3 + 2] !== rgba[pixel * 4 + 2]
    ) {
      framebufferExact = false;
      framebufferDiff += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minDiffX = Math.min(minDiffX, x);
      minDiffY = Math.min(minDiffY, y);
      maxDiffX = Math.max(maxDiffX, x);
      maxDiffY = Math.max(maxDiffY, y);
      if (diffSamples.length < 4) {
        diffSamples.push(
          `${x},${y}:`
          + `${oracleRgb[pixel * 3]}/${oracleRgb[pixel * 3 + 1]}/${oracleRgb[pixel * 3 + 2]}`
          + `!=${rgba[pixel * 4]}/${rgba[pixel * 4 + 1]}/${rgba[pixel * 4 + 2]}`,
        );
      }
    }
  }
  if (framebufferExact) {
    framebufferMatching += 1;
    framebufferExactFrames.push(frame);
  } else if (framebufferMismatches.length < 12) {
    framebufferMismatches.push(
      `${frame}:${framebufferDiff}px@${minDiffX},${minDiffY}-${maxDiffX},${maxDiffY}`
      + `[${diffSamples.join(";")}]`,
    );
  }
  engine = {
    ...engine,
    sceneOnPresentation: {
      ...engine.sceneOnPresentation!,
      age: engine.sceneOnPresentation!.age + 1,
    },
  };
}

const total =
  fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `${matching}/${total} dense EMBER projectile/flare component frames matched`,
);
console.log(`${framebufferMatching}/${total} dense EMBER framebuffer frames matched`);
console.log(`exact framebuffer frames: ${framebufferExactFrames.join(",") || "none"}`);
if (framebufferMismatches.length) {
  console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
}
if (mismatches.length) console.log(mismatches.join("\n"));
process.exit(
  matching === total && framebufferMatching === total ? 0 : 1,
);
