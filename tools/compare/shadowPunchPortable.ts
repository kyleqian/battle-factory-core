import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnShadowPunchView,
  type SceneOnPresentationBattler,
} from "../../src/engine/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerSpriteId: number;
  readonly attackerMoveSpeed: number;
  readonly attackerSubpriority: number;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly opponentHp: number;
    readonly playerStatus: "none";
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

interface ProbeSprite {
  readonly slot: number;
  readonly x2: number;
  readonly y2: number;
  readonly invisible: boolean;
}

interface ProbeFrame {
  readonly frame: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: number;
  readonly attackerSlot: number;
  readonly attacker: ProbeSprite;
  readonly target: ProbeSprite;
  readonly traceSprites: readonly ProbeSprite[];
  readonly fistSprite: ProbeSprite | null;
  readonly hitsplatSprites: readonly ProbeSprite[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(
  readFileSync(resolve(process.argv[2]!), "utf8"),
) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-shadowpunch-compare-"));
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
  move: "SHADOW_PUNCH",
  attacker: fixture.attacker,
  target: fixture.target,
  attackerSpriteId: fixture.attackerSpriteId,
  attackerMoveSpeed: fixture.attackerMoveSpeed,
  attackerSubpriority: fixture.attackerSubpriority,
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
  const view = sceneOnShadowPunchView({ ...stage, age });

  const app = {
    attackerVisible: view.attackerVisible,
    attackerX2: view.attackerX2,
    clones: [...view.clones.map((c) => c.x2)].sort((a, b) => a - b),
    bldy: view.backgroundBldy,
    fist: view.fistVisible,
    hitsplat: view.hitsplatVisible,
    targetShakeX2: view.targetShakeX2,
  };
  const oracle = {
    attackerVisible: !record.attacker.invisible,
    attackerX2: record.attacker.x2,
    clones: record.traceSprites.map((s) => s.x2).sort((a, b) => a - b),
    bldy: record.bldy,
    fist: record.fistSprite !== null,
    hitsplat: record.hitsplatSprites.length > 0,
    targetShakeX2: record.target.x2,
  };
  if (JSON.stringify(app) === JSON.stringify(oracle)) componentMatching += 1;
  else if (componentMismatches.length < 12) {
    componentMismatches.push(`${frame}: oracle=${JSON.stringify(oracle)} app=${JSON.stringify(app)}`);
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
  `${componentMatching}/${total} dense SHADOW_PUNCH component frames matched`,
);
console.log(`${framebufferMatching}/${total} dense SHADOW_PUNCH framebuffer frames matched`);
if (componentMismatches.length) console.log(componentMismatches.join("\n"));
if (framebufferMismatches.length) {
  console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
}
process.exit(
  componentMatching === total && framebufferMatching === total ? 0 : 1,
);
