// Same as dragonrage-lag-bisect.ts but reuses an already-populated scratch
// dir (arg 1) instead of re-invoking the oracle - fast iteration on box
// geometry only.
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import {
  createSceneOnMovePresentation,
} from "../../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../../src/engine/core.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const fixture = JSON.parse(
  readFileSync(resolve(root, "tools/compare/fixtures/dragon-rage-player-charmeleon-opponent-onix.json"), "utf8"),
) as { denseWindow: { startFrame: number; endFrame: number }; attacker: any; target: any; fieldProfile: any };

const scratch = process.argv[2]!;
const probe = JSON.parse(readFileSync(join(scratch, "probe.json"), "utf8")) as { frames: any[] };
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

function boxDiffSamples(oracle: Buffer, app: Uint8Array, box: Box, limit: number): string[] {
  const samples: string[] = [];
  for (let y = box.y0; y < box.y1 && samples.length < limit; y += 1) {
    for (let x = box.x0; x < box.x1 && samples.length < limit; x += 1) {
      const o = (y * 240 + x) * 3;
      const a = (y * 240 + x) * 4;
      if (
        oracle[o] !== app[a]
        || oracle[o + 1] !== app[a + 1]
        || oracle[o + 2] !== app[a + 2]
      ) {
        samples.push(
          `${x},${y}: oracle=${oracle[o]}/${oracle[o + 1]}/${oracle[o + 2]} app=${app[a]}/${app[a + 1]}/${app[a + 2]}`,
        );
      }
    }
  }
  return samples;
}

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

// Narrow early-path box, clear of the target's own sprite silhouette.
const FIRE_SPIT_EARLY_BOX: Box = { x0: 85, y0: 60, x1: 145, y1: 130 };
const WINDOW = { start: 174, end: 178 };
const LAGS = [-1, 0, 1, 2, 3];
for (const lag of LAGS) {
  let matches = 0;
  let total = 0;
  let sumDiff = 0;
  for (let frame = WINDOW.start; frame <= WINDOW.end; frame += 1) {
    const record = framesByNum.get(frame);
    if (!record) continue;
    const age = (frame - fixture.denseWindow.startFrame) - lag;
    const app = appRgbaAtAge(age);
    const oracle = oracleRgbAt(frame);
    const diff = boxDiff(oracle, app, FIRE_SPIT_EARLY_BOX);
    total += 1;
    sumDiff += diff;
    if (diff === 0) matches += 1;
  }
  console.log(`fire-spit-early lag${lag}: ${matches}/${total} avgDiff=${(sumDiff / total).toFixed(1)}`);
}

// Dump mismatch samples at the best-guess lags for frame 176 to see what's
// actually differing (position shift vs missing sprite vs color).
for (const lag of [0, 1]) {
  const frame = 176;
  const age = (frame - fixture.denseWindow.startFrame) - lag;
  const app = appRgbaAtAge(age);
  const oracle = oracleRgbAt(frame);
  const samples = boxDiffSamples(oracle, app, FIRE_SPIT_EARLY_BOX, 8);
  console.log(`frame176 lag${lag} samples:`, samples);
}
