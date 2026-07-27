import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import {
  createSceneOnMovePresentation,
  sceneOnThunderPunchView,
  type SceneOnFaintAttackFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: SceneOnFaintAttackFieldProfile;
}

interface ProbeSprite {
  readonly x: number;
  readonly y: number;
  readonly tileNum: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: { readonly invisible: boolean; readonly y2: number };
  readonly opponentSprite: { readonly invisible: boolean; readonly y2: number };
  readonly lightningSprites: readonly ProbeSprite[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-thunder-punch-compare-"));
const output = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"),
  output,
  "--",
  join(vendor, "mgba-venv/bin/python"),
  resolve(root, fixture.probe),
  resolve(root, fixture.scenario),
  output,
  join(scratch, "rgb"),
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "THUNDER_PUNCH",
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
const componentMismatches: string[] = [];
const framebufferMismatches: string[] = [];
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const record = frames.get(frame);
  if (!record) throw new Error(`probe omitted dense frame ${frame}`);
  const view = sceneOnThunderPunchView(engine.sceneOnPresentation!);
  const targetRecord = fixture.target.geometry.side === "player"
    ? record.playerSprite
    : record.opponentSprite;
  const oracleLightning = record.lightningSprites.map((sprite) => ({
    centerX: sprite.x,
    centerY: sprite.y,
    frame: (sprite.tileNum - 601) / 16,
  })).sort((a, b) => a.centerY - b.centerY);
  const appLightning = view.lightning.map(({ sourceSlot: _slot, ...sprite }) => sprite)
    .sort((a, b) => a.centerY - b.centerY);
  const componentsMatch =
    targetRecord.invisible === view.targetOnMonBg
    && targetRecord.y2 === view.targetY2
    && JSON.stringify(oracleLightning) === JSON.stringify(appLightning);
  if (componentsMatch) componentMatching += 1;
  else if (componentMismatches.length < 12) {
    componentMismatches.push(
      `${frame}/age${view.age}: target=${targetRecord.invisible}/${targetRecord.y2}`
      + ` expected=${view.targetOnMonBg}/${view.targetY2}`
      + ` lightning=${JSON.stringify(oracleLightning)}/${JSON.stringify(appLightning)}`,
    );
  }
  const oracleRgb = readFileSync(
    join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`),
  );
  const rgba = render(engine);
  let diff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      oracleRgb[pixel * 3] !== rgba[pixel * 4]
      || oracleRgb[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
      || oracleRgb[pixel * 3 + 2] !== rgba[pixel * 4 + 2]
    ) diff += 1;
  }
  if (diff === 0) framebufferMatching += 1;
  else if (framebufferMismatches.length < 16) {
    framebufferMismatches.push(`${frame}/age${view.age}:${diff}px`);
  }
  engine = {
    ...engine,
    sceneOnPresentation: {
      ...engine.sceneOnPresentation!,
      age: engine.sceneOnPresentation!.age + 1,
    },
  };
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`${componentMatching}/${total} THUNDER PUNCH component frames matched`);
console.log(`${framebufferMatching}/${total} THUNDER PUNCH framebuffer frames matched`);
if (componentMismatches.length) console.log(componentMismatches.join("\n"));
if (framebufferMismatches.length) console.log(framebufferMismatches.join(", "));
process.exit(
  componentMatching === total && framebufferMatching === total ? 0 : 1,
);
