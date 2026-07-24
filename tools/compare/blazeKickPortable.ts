import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  blazeKickAnimationAtAge,
} from "../../src/engine/blazeKick.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly firstFramePresentationAge: number };
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

interface ProbeSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly tileNum: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: { readonly x2: number; readonly invisible: boolean };
  readonly opponentSprite: { readonly x2: number; readonly invisible: boolean };
  readonly basicHitsplatSprites: readonly ProbeSprite[];
  readonly spinningHandOrFootSprites: readonly ProbeSprite[];
  readonly fireSpreadSprites: readonly ProbeSprite[];
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
  const app = blazeKickAnimationAtAge(age, fixture.targetCenter);
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
  const matches =
    target.invisible === app.targetOnMonBg
    && target.x2 === app.targetX2
    && (record.bldalpha === 0x080c) === (app.alpha !== null)
    && (record.basicHitsplatSprites.length > 0) === app.hitsplatVisible
    && (record.spinningHandOrFootSprites.length > 0) === app.spinningFootVisible
    && JSON.stringify(oracleSpread) === JSON.stringify(appSpread);
  if (matches) matching += 1;
  else if (mismatches.length < 12) {
    mismatches.push(
      `${frame}/age${age}: target=${target.invisible}/${target.x2},`
      + ` alpha=${record.bldalpha.toString(16)}, hit=${record.basicHitsplatSprites.length},`
      + ` foot=${record.spinningHandOrFootSprites.length},`
      + ` spread=${JSON.stringify(oracleSpread)} expected=${JSON.stringify(appSpread)}`,
    );
  }
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `${matching}/${total} dense BLAZE KICK shared-component frames matched `
  + "(monbg/alpha/ShakeMon2/hitsplat/foot lifetime/FireSpread geometry)",
);
if (mismatches.length) console.log(mismatches.join("\n"));
process.exit(matching === total ? 0 : 1);
