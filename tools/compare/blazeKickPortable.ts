import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnBlazeKickView,
  type SceneOnPresentationBattler,
} from "../../src/engine/sceneOnPresentation.ts";
import type { BlazeKickGeometry } from "../../src/engine/blazeKick.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: BlazeKickGeometry;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly opponentHp: number;
    readonly playerStatus: "none" | "burn";
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

interface ProbeSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly tileNum: number;
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: { readonly x2: number; readonly invisible: boolean };
  readonly opponentSprite: { readonly x2: number; readonly invisible: boolean };
  readonly basicHitsplatSprites: readonly ProbeSprite[];
  readonly spinningHandOrFootSprites: readonly ProbeSprite[];
  readonly fireSpreadSprites: readonly ProbeSprite[];
  readonly bgPalette2Faded: readonly number[];
  readonly spriteOrder: readonly number[];
  readonly bldalpha: number;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-blaze-kick-compare-"));
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
const targetIsPlayer = fixture.targetCenter.x < 120;
const stage = createSceneOnMovePresentation({
  move: "BLAZE_KICK",
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
let matching = 0;
let framebufferMatching = 0;
const framebufferMismatches: string[] = [];
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
  const view = sceneOnBlazeKickView({ ...stage, age });
  const app = view.animation;
  const target = targetIsPlayer ? record.playerSprite : record.opponentSprite;
  const oracleSpread = record.fireSpreadSprites.map((sprite) => ({
    centerX: sprite.x + sprite.x2,
    centerY: sprite.y + sprite.y2,
    sheetFrame: ((sprite.tileNum - 601) / 16) as 1 | 2 | 3,
  })).sort((a, b) =>
    a.centerX - b.centerX || a.centerY - b.centerY || a.sheetFrame - b.sheetFrame
  );
  const appSpread = app.fireSpread.map(({ index: _index, ...sprite }) => sprite)
    .sort((a, b) =>
      a.centerX - b.centerX || a.centerY - b.centerY || a.sheetFrame - b.sheetFrame
    );
  const oracleVisibleSlots = record.spriteOrder.filter((slot) =>
    [
      ...record.spinningHandOrFootSprites,
      ...record.basicHitsplatSprites,
      ...record.fireSpreadSprites,
    ].some((sprite) => sprite.slot === slot)
  ).reverse();
  const foot = view.sprites.find((sprite) => sprite.kind === "foot");
  const oracleFoot = record.spinningHandOrFootSprites[0];
  const footMatches =
    (foot === undefined && oracleFoot === undefined)
    || (
      foot?.kind === "foot"
      && oracleFoot !== undefined
      && foot.slot === oracleFoot.slot
      && foot.matrix.pa === oracleFoot.a
      && foot.matrix.pb === oracleFoot.b
      && foot.matrix.pc === oracleFoot.c
      && foot.matrix.pd === oracleFoot.d
    );
  const matches =
    target.invisible === app.targetOnMonBg
    && target.x2 === app.targetX2
    && (record.bldalpha === 0x080c) === (app.alpha !== null)
    && (record.basicHitsplatSprites.length > 0) === app.hitsplatVisible
    && (record.spinningHandOrFootSprites.length > 0) === app.spinningFootVisible
    && JSON.stringify(oracleSpread) === JSON.stringify(appSpread)
    && footMatches
    && JSON.stringify(oracleVisibleSlots)
      === JSON.stringify(view.sprites.map((sprite) => sprite.slot));
  if (matches) matching += 1;
  else if (mismatches.length < 12) {
    mismatches.push(
      `${frame}/age${age}: target=${target.invisible}/${target.x2},`
      + ` alpha=${record.bldalpha.toString(16)}, hit=${record.basicHitsplatSprites.length},`
      + ` foot=${record.spinningHandOrFootSprites.length},`
      + ` spread=${JSON.stringify(oracleSpread)} expected=${JSON.stringify(appSpread)},`
      + ` order=${oracleVisibleSlots.join(",")}/`
      + `${view.sprites.map((sprite) => sprite.slot).join(",")}`,
    );
  }
  const oracleRgb = readFileSync(
    join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`),
  );
  const rgba = render(engine);
  let framebufferDiff = 0;
  let minDiffX = 240;
  let minDiffY = 160;
  let maxDiffX = -1;
  let maxDiffY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      oracleRgb[pixel * 3] !== rgba[pixel * 4]
      || oracleRgb[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
      || oracleRgb[pixel * 3 + 2] !== rgba[pixel * 4 + 2]
    ) {
      framebufferDiff += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minDiffX = Math.min(minDiffX, x);
      minDiffY = Math.min(minDiffY, y);
      maxDiffX = Math.max(maxDiffX, x);
      maxDiffY = Math.max(maxDiffY, y);
    }
  }
  if (framebufferDiff === 0) framebufferMatching += 1;
  else if (framebufferMismatches.length < 16) {
    framebufferMismatches.push(
      `${frame}/age${age}:${framebufferDiff}px@`
      + `${minDiffX},${minDiffY}-${maxDiffX},${maxDiffY}`,
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

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `${matching}/${total} dense BLAZE KICK component/OAM-order frames matched`,
);
console.log(`${framebufferMatching}/${total} dense BLAZE KICK framebuffer frames matched`);
if (framebufferMismatches.length) {
  console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
}
if (mismatches.length) console.log(mismatches.join("\n"));
process.exit(matching === total && framebufferMatching === total ? 0 : 1);
