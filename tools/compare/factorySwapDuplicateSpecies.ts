import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { Trace } from "./oracleClient.ts";
import { renderAppTrace } from "./appTrace.ts";
import { PNG } from "pngjs";

interface Fixture {
  readonly probe: string;
  readonly sourceTrace: string;
  readonly sourceSegmentCount: number;
  readonly stage: { readonly id: string; readonly frame: number };
  readonly relativeWindow: { readonly start: number; readonly end: number };
  readonly segments: Trace["segments"];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, "tools/compare/fixtures/factory-swap-duplicate-species-off.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
const source = JSON.parse(
  readFileSync(resolve(dirname(fixturePath), fixture.sourceTrace), "utf8"),
) as Trace;
const start = fixture.stage.frame + fixture.relativeWindow.start;
const end = fixture.stage.frame + fixture.relativeWindow.end;
const trace: Trace = {
  oracleProfile: "battle-scene-off",
  segments: [
    ...source.segments.slice(0, fixture.sourceSegmentCount),
    ...fixture.segments,
  ],
  captureFrames: Array.from({ length: end - start + 1 }, (_, i) => start + i),
  appStage: fixture.stage,
};

const scratch = mkdtempSync(join(tmpdir(), "pokebench-swap-duplicate-"));
const rgbDir = join(scratch, "rgb");
mkdirSync(rgbDir);
const probeOutput = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync(
  "python3",
  [
    join(root, "tools/run-mgba-probe.py"),
    probeOutput,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    probeOutput,
  ],
  {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, FACTORY_SWAP_DUPLICATE_RGB_DIR: rgbDir },
  },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const app = await renderAppTrace(trace);
const mismatches: Array<{ relative: number; pixels: number }> = [];
let aggregate = 0;
const diagnosticFrames = new Set([0, 23, 40, 51]);
for (const capture of app) {
  const relative = capture.frame - fixture.stage.frame;
  const oracle = readFileSync(join(rgbDir, `${String(relative).padStart(3, "0")}.rgb`));
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const oi = pixel * 3;
    const ai = pixel * 4;
    if (
      oracle[oi] !== capture.rgba[ai] ||
      oracle[oi + 1] !== capture.rgba[ai + 1] ||
      oracle[oi + 2] !== capture.rgba[ai + 2]
    ) pixels += 1;
  }
  aggregate += pixels;
  if (pixels) {
    mismatches.push({ relative, pixels });
    if (diagnosticFrames.has(relative)) {
      const oracleRgba = Buffer.alloc(240 * 160 * 4);
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        oracle.copy(oracleRgba, pixel * 4, pixel * 3, pixel * 3 + 3);
        oracleRgba[pixel * 4 + 3] = 255;
      }
      writeFileSync(join(scratch, `oracle-${relative}.png`), PNG.sync.write({ width: 240, height: 160, data: oracleRgba }));
      writeFileSync(join(scratch, `app-${relative}.png`), PNG.sync.write({ width: 240, height: 160, data: capture.rgba }));
    }
  }
}
console.log(`${app.length - mismatches.length}/${app.length} frames matched; ${aggregate} aggregate differing pixels`);
if (mismatches.length) {
  console.log(`mismatches: ${mismatches.map(({ relative, pixels }) => `+${relative}:${pixels}`).join(", ")}`);
  console.log(`first diagnostic PNGs: ${scratch}`);
}
process.exit(mismatches.length ? 1 : 0);
