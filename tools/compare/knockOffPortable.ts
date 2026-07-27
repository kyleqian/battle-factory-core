import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnKnockOffView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender: "male" | "female";
    readonly opponentGender: "male" | "female";
  };
}
interface Sprite {
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly tileNum: number; readonly a: number; readonly b: number;
  readonly c: number; readonly d: number;
}
interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly knockOffStrikeSprites: readonly Sprite[];
  readonly basicHitsplatSprites: readonly Sprite[];
  readonly playerSpritePalette?: never;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-knock-off-compare-"));
const output = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output, join(scratch, "rgb"),
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "KNOCK_OFF",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let engine: EngineState = {
  ...createInitialState(),
  rngMode: "frontierBattle",
  sceneOnPresentation: { ...stage, age: fixture.appStage.firstFramePresentationAge },
};
let componentMatching = 0;
let framebufferMatching = 0;
const mismatches: string[] = [];
const framebufferMismatches: string[] = [];

for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const record = frames.get(frame);
  if (!record) throw new Error(`probe omitted dense frame ${frame}`);
  const age = fixture.appStage.firstFramePresentationAge
    + frame - fixture.denseWindow.startFrame;
  const view = sceneOnKnockOffView({ ...stage, age });
  const strike = record.knockOffStrikeSprites[0];
  const expectedStrike = view.strike && (() => {
    const x2 = (GBA_SINE_TABLE_256[(view.strike.angle + 64) & 0xff]! * 20) >> 8;
    const y2 = (GBA_SINE_TABLE_256[view.strike.angle]! * 20) >> 8;
    const radians = (-4 * (age - 6)) * 2 * Math.PI / 256;
    const a = Math.trunc(256 * Math.cos(radians));
    const c = Math.trunc(256 * Math.sin(radians));
    return { x2, y2, a, b: -c, c, d: a };
  })();
  const strikeMatches = (!strike && !expectedStrike) || (
    strike !== undefined && expectedStrike !== null
    && strike.x2 === expectedStrike.x2 && strike.y2 === expectedStrike.y2
    && strike.a === expectedStrike.a && strike.b === expectedStrike.b
    && strike.c === expectedStrike.c && strike.d === expectedStrike.d
  );
  const targetIdle = age < 17 ? 1 : 0;
  const componentMatches =
    record.playerSprite.x2 === view.attackerOffset.x2
    && record.playerSprite.y2 === view.attackerOffset.y2
    && record.opponentSprite.x2 === view.targetOffset.x2 + targetIdle
    && record.opponentSprite.y2 === view.targetOffset.y2
    && (record.basicHitsplatSprites.length > 0) === view.hitsplatVisible
    && strikeMatches;
  if (componentMatches) componentMatching += 1;
  else if (mismatches.length < 12) {
    mismatches.push(`${frame}/age${age}: attacker=${record.playerSprite.x2},${record.playerSprite.y2}`
      + `/${view.attackerOffset.x2},${view.attackerOffset.y2}`
      + ` target=${record.opponentSprite.x2},${record.opponentSprite.y2}`
      + `/${view.targetOffset.x2 + targetIdle},${view.targetOffset.y2}`
      + ` strike=${strikeMatches} hit=${record.basicHitsplatSprites.length}/${view.hitsplatVisible}`);
  }
  const oracleRgb = readFileSync(join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
  const rgba = render(engine);
  let diff = 0;
  let fieldDiff = 0, messageDiff = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (oracleRgb[pixel * 3] !== rgba[pixel * 4]
      || oracleRgb[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
      || oracleRgb[pixel * 3 + 2] !== rgba[pixel * 4 + 2]) {
      diff += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      if (y >= 112) messageDiff += 1;
      else fieldDiff += 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (diff === 0) framebufferMatching += 1;
  else if (framebufferMismatches.length < 20) {
    framebufferMismatches.push(`${frame}/age${age}:${diff}px(field=${fieldDiff},msg=${messageDiff})@${minX},${minY}-${maxX},${maxY}`);
  }
  engine = { ...engine, sceneOnPresentation: { ...engine.sceneOnPresentation!, age: age + 1 } };
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`${componentMatching}/${total} dense KNOCK OFF component frames matched`);
console.log(`${framebufferMatching}/${total} dense KNOCK OFF framebuffer frames matched`);
if (mismatches.length) console.log(mismatches.join("\n"));
if (framebufferMismatches.length) {
  console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
}
process.exit(componentMatching === total && framebufferMatching === total ? 0 : 1);
