// DRAGON_RAGE rung 5 remainder (ANIMATION_PROGRESS.md 2026-07-25): bisect
// per-mechanism capture lag against real oracle pixels, one window rerun,
// mirroring dragonBreath.ts's own DRAGON_BREATH_FRAMEBUFFER_OAM_AGE_LAG /
// DRAGON_BREATH_FRAMEBUFFER_PALETTE_AGE_LAG split. Runs the RGB probe ONCE
// (player-attacker fixture) and tries several lag values against the same
// cached frames/RGB, restricted to a per-mechanism pixel box + tick window
// isolated from every other concurrent mechanism (checked against the
// decoded schedule in dragonRage.ts).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDragonRageView,
} from "../../../src/engine/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../../src/engine/core.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const fixture = JSON.parse(
  readFileSync(resolve(root, "tools/compare/fixtures/dragon-rage-player-charmeleon-opponent-onix.json"), "utf8"),
) as {
  scenario: string;
  probe: string;
  denseWindow: { startFrame: number; endFrame: number };
  attacker: any;
  target: any;
  fieldProfile: any;
};

const scratch = mkdtempSync(join(tmpdir(), "pokebench-dragonrage-lag-"));
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

const probe = JSON.parse(readFileSync(output, "utf8")) as { frames: any[] };
const framesByNum = new Map(probe.frames.map((f) => [f.frame, f]));

function oracleRgbAt(frame: number): Buffer {
  return readFileSync(join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
}

const stage = createSceneOnMovePresentation({
  move: "DRAGON_RAGE",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});

function appRgbaAtAge(age: number): Uint8Array {
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  return render(engine);
}

interface Box { x0: number; y0: number; x1: number; y1: number }

function boxDiff(oracle: Buffer, app: Uint8Array, box: Box): number {
  let diff = 0;
  for (let y = box.y0; y < box.y1; y += 1) {
    for (let x = box.x0; x < box.x1; x += 1) {
      const o = (y * 240 + x) * 3;
      const a = (y * 240 + x) * 4;
      if (
        oracle[o] !== app[a]
        || oracle[o + 1] !== app[a + 1]
        || oracle[o + 2] !== app[a + 2]
      ) diff += 1;
    }
  }
  return diff;
}

// Bounding boxes generous enough to cover the sprite plus a few px of slop
// for shake/slide displacement, tight enough to stay clear of neighboring
// mechanisms (checked against dragonRage.ts's own schedule: attackerShake=
// 89, slideToOffset=168, fireSpit=174, targetShake/plumes=186,
// slideToOriginalPos=235, for this fixture's t0=0).
const ATTACKER_BOX: Box = { x0: 30, y0: 45, x1: 75, y1: 115 };
// ONIX front sprite corner (145,10); plumes surround it on every side by
// design (confirmed via dragonRageFirePlumeStateAtAge - every spawn's own
// drawn box overlaps the target's), so a plume-free target-only crop is not
// spatially achievable - this box is informational/contaminated, not a
// clean isolation.
const TARGET_BOX: Box = { x0: 140, y0: 5, x1: 215, y1: 80 };
// Fire-spit's own path spans x 102->176, y 112->52 (player-side geometry) -
// wide enough to hold the whole accumulator ramp with sprite-half margin.
const FIRE_SPIT_BOX: Box = { x0: 85, y0: 35, x1: 195, y1: 130 };
const SLIDE_OFFSET_BOX: Box = { x0: 30, y0: 45, x1: 90, y1: 115 };
const SLIDE_ORIGINAL_BOX: Box = { x0: 30, y0: 45, x1: 90, y1: 115 };

const MECHANISMS: { name: string; start: number; end: number; box: Box }[] = [
  // Pure attacker-shake: after creation (89), comfortably before slide (168).
  { name: "attacker-shake", start: 90, end: 166, box: ATTACKER_BOX },
  { name: "slide-to-offset", start: 168, end: 172, box: SLIDE_OFFSET_BOX },
  // Fire spit alone: attacker+target both static in this span.
  { name: "fire-spit", start: 174, end: 184, box: FIRE_SPIT_BOX },
  // Contaminated (plumes always co-active) - informational only.
  { name: "target-shake+plumes(contaminated)", start: 188, end: 233, box: TARGET_BOX },
  { name: "slide-to-original-pos", start: 236, end: 238, box: SLIDE_ORIGINAL_BOX },
];

const LAGS = [-1, 0, 1, 2, 3];
for (const mech of MECHANISMS) {
  const results: string[] = [];
  for (const lag of LAGS) {
    let matches = 0;
    let total = 0;
    let sumDiff = 0;
    for (let frame = mech.start; frame <= mech.end; frame += 1) {
      const record = framesByNum.get(frame);
      if (!record) continue;
      const age = (frame - fixture.denseWindow.startFrame) - lag;
      const app = appRgbaAtAge(age);
      const oracle = oracleRgbAt(frame);
      const diff = boxDiff(oracle, app, mech.box);
      total += 1;
      sumDiff += diff;
      if (diff === 0) matches += 1;
    }
    results.push(`lag${lag}=${matches}/${total}(avgDiff=${(sumDiff / total).toFixed(1)})`);
  }
  console.log(`${mech.name}: ${results.join(" ")}`);
}
