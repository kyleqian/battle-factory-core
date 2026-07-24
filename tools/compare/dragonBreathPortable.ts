import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDragonBreathView,
  type SceneOnPresentationBattler,
} from "../../src/engine/sceneOnPresentation.ts";
import type { DragonBreathFireGeometry } from "../../src/engine/dragonBreath.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: DragonBreathFireGeometry;
}

interface ProbeSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly subpriority: number;
  readonly tileNum: number;
  readonly animNum: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly dragonBreathFireSprites: readonly ProbeSprite[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(
  readFileSync(resolve(process.argv[2]!), "utf8"),
) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-dragon-breath-compare-"));
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
  move: "DRAGON_BREATH",
  attacker: fixture.attacker,
  target: fixture.target,
  animationProfile: fixture.animationProfile,
});

function normalizedOracle(sprites: readonly ProbeSprite[]): string[] {
  return sprites.map((sprite) => JSON.stringify({
    centerX: sprite.x + sprite.x2,
    centerY: sprite.y + sprite.y2,
    sheetFrame: (sprite.tileNum - 537) / 16,
    pa: sprite.a,
    pb: sprite.b,
    pc: sprite.c,
    pd: sprite.d,
    subpriority: sprite.subpriority,
    hFlip: sprite.animNum === 1,
    vFlip: sprite.animNum === 1,
    targetOnMonBg: true,
  })).sort();
}

let matching = 0;
const mismatches: string[] = [];
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
  const app = sceneOnDragonBreathView({ ...stage, age }).fireSprites
    .map(({ spawnIndex: _spawnIndex, age: _age, ...sprite }) =>
      JSON.stringify(sprite)
    )
    .sort();
  const oracle = normalizedOracle(record.dragonBreathFireSprites);
  if (JSON.stringify(app) === JSON.stringify(oracle)) matching += 1;
  else if (mismatches.length < 8) {
    mismatches.push(`${frame}: oracle=${oracle.join("|")} app=${app.join("|")}`);
  }
}

const total =
  fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `${matching}/${total} dense DRAGON_BREATH OAM/component frames matched`,
);
if (mismatches.length) console.log(mismatches.join("\n"));
process.exit(matching === total ? 0 : 1);
