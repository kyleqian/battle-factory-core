import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnBindView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import type { BindAnimationProfile } from "../../src/animation/bind.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: BindAnimationProfile;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly opponentHp: number;
    readonly playerStatus: "none" | "burn";
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

interface ProbeBattler {
  readonly x2: number;
  readonly y2: number;
  readonly affineMode: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: ProbeBattler;
  readonly opponentSprite: ProbeBattler;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = resolve(process.argv[2]!);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-bind-compare-"));
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
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
    rgbDir,
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
  move: "BIND",
  attacker: fixture.attacker,
  target: fixture.target,
  animationProfile: fixture.animationProfile,
  fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0;
let framebufferMatches = 0;
const mismatches: string[] = [];
const framebufferDiffLines: string[] = [];

for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age =
    fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  const view = sceneOnBindView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const attackerSprite = fixture.attacker.geometry.side === "player"
    ? oracle.playerSprite
    : oracle.opponentSprite;
  const targetSprite = fixture.target.geometry.side === "player"
    ? oracle.playerSprite
    : oracle.opponentSprite;
  const componentExact =
    view.attackerX2 === attackerSprite.x2
    && view.attackerY2 === attackerSprite.y2
    && (
      view.targetAffine.active
        ? targetSprite.affineMode === 3
          && view.targetAffine.xScale === targetSprite.matrix.a
          && view.targetAffine.yScale === targetSprite.matrix.d
          && targetSprite.matrix.b === 0
          && targetSprite.matrix.c === 0
        : targetSprite.matrix.a === 256
          && targetSprite.matrix.d === 256
    );
  if (componentExact) componentMatches += 1;
  else mismatches.push(`frame ${frame}: component`);

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const appRgba = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      appRgba[pixel * 4] !== oracleRgb[pixel * 3]
      || appRgba[pixel * 4 + 1] !== oracleRgb[pixel * 3 + 1]
      || appRgba[pixel * 4 + 2] !== oracleRgb[pixel * 3 + 2]
    ) {
      exact = false;
      break;
    }
  }
  if (exact) framebufferMatches += 1;
  else {
    mismatches.push(`frame ${frame}: framebuffer`);
    {
      let count = 0;
      let minX = 240;
      let minY = 160;
      let maxX = -1;
      let maxY = -1;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        const offset = pixel * 3;
        if (
          appRgba[pixel * 4] === oracleRgb[offset]
          && appRgba[pixel * 4 + 1] === oracleRgb[offset + 1]
          && appRgba[pixel * 4 + 2] === oracleRgb[offset + 2]
        ) continue;
        count += 1;
        const x = pixel % 240;
        const y = Math.floor(pixel / 240);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      framebufferDiffLines.push(`framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
    }
  }
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `BIND component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`,
);
if (mismatches.length) {
  if (framebufferDiffLines.length) {
    console.error(framebufferDiffLines.slice(0, 32).join("\n"));
    if (framebufferDiffLines.length > 32) {
      console.error(`...and ${framebufferDiffLines.length - 32} more framebuffer diff frames`);
    }
  }
  console.error(mismatches.join("\n"));
  process.exit(1);
}
