import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDragonRageView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
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
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly animCmdIndex: number;
  readonly matrixA: number;
  readonly matrixB: number;
  readonly matrixC: number;
  readonly matrixD: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly attacker: ProbeSprite;
  readonly target: ProbeSprite;
  readonly fireSpitSprites: readonly ProbeSprite[];
  readonly firePlumeSprites: readonly ProbeSprite[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(
  readFileSync(resolve(process.argv[2]!), "utf8"),
) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-dragonrage-compare-"));
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
  move: "DRAGON_RAGE",
  attacker: fixture.attacker,
  target: fixture.target,
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

let componentMatching = 0;
let framebufferMatching = 0;
const framebufferMismatches: string[] = [];
const componentMismatches: string[] = [];

// ONIX's own sprite (either side) can carry a constant baseline x2 residual
// unrelated to any DRAGON_RAGE mechanism (the same species-specific OAM
// quirk this file's `spriteCorner`s already bake in, e.g. opponent-side
// {x:145} instead of the generic {x:144}) - self-calibrate it from the
// dense window's own first frame rather than hardcoding a species constant
// here, since the exact residual is per-species/per-orientation.
const baselineFrame = frames.get(fixture.denseWindow.startFrame)!;
const attackerBaseline = { x2: baselineFrame.attacker.x2, y2: baselineFrame.attacker.y2 };
const targetBaseline = { x2: baselineFrame.target.x2, y2: baselineFrame.target.y2 };

function plumeKey(p: { x: number; y: number; subpriority: number; sheetFrame: number }): string {
  return JSON.stringify({ x: p.x, y: p.y, subpriority: p.subpriority, sheetFrame: p.sheetFrame });
}

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
  const view = sceneOnDragonRageView({ ...stage, age });

  const appFireSpit = view.fireSpit
    ? JSON.stringify({
      x: view.fireSpit.x + view.fireSpit.x2,
      y: view.fireSpit.y + view.fireSpit.y2,
      frame: view.fireSpit.sheetFrame,
      matrix: view.fireSpit.matrix,
    })
    : null;
  const oracleFireSpit = record.fireSpitSprites[0]
    ? JSON.stringify({
      x: record.fireSpitSprites[0].x + record.fireSpitSprites[0].x2,
      y: record.fireSpitSprites[0].y + record.fireSpitSprites[0].y2,
      frame: record.fireSpitSprites[0].animCmdIndex,
      matrix: {
        pa: record.fireSpitSprites[0].matrixA,
        pb: record.fireSpitSprites[0].matrixB,
        pc: record.fireSpitSprites[0].matrixC,
        pd: record.fireSpitSprites[0].matrixD,
      },
    })
    : null;

  const appPlumes = view.firePlumes
    .map((p) => plumeKey({ x: p.x, y: p.y, subpriority: p.subpriority, sheetFrame: p.sheetFrame }))
    .sort();
  const oraclePlumes = record.firePlumeSprites
    .map((p) => plumeKey({ x: p.x, y: p.y, subpriority: p.subpriority, sheetFrame: p.animCmdIndex }))
    .sort();

  const app = JSON.stringify({
    attackerOffset: view.attackerOffset,
    targetOffset: view.targetOffset,
    fireSpit: appFireSpit,
    firePlumes: appPlumes,
  });
  const oracle = JSON.stringify({
    attackerOffset: {
      x2: record.attacker.x2 - attackerBaseline.x2,
      y2: record.attacker.y2 - attackerBaseline.y2,
    },
    targetOffset: {
      x2: record.target.x2 - targetBaseline.x2,
      y2: record.target.y2 - targetBaseline.y2,
    },
    fireSpit: oracleFireSpit,
    firePlumes: oraclePlumes,
  });
  if (app === oracle) componentMatching += 1;
  else if (componentMismatches.length < 8) {
    componentMismatches.push(`${frame}: oracle=${oracle} app=${app}`);
  }

  const oracleRgb = readFileSync(
    join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`),
  );
  const rgba = render(engine);
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
  if (framebufferExact) framebufferMatching += 1;
  else if (framebufferMismatches.length < 12) {
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
  `${componentMatching}/${total} dense DRAGON_RAGE component frames matched`,
);
console.log(`${framebufferMatching}/${total} dense DRAGON_RAGE framebuffer frames matched`);
if (componentMismatches.length) console.log(componentMismatches.join("\n"));
if (framebufferMismatches.length) {
  console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
}
process.exit(
  componentMatching === total && framebufferMatching === total ? 0 : 1,
);
