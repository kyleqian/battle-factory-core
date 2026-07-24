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
  readonly stage: { readonly id: string; readonly frame: number };
  readonly relativeWindow: { readonly start: number; readonly end: number };
  readonly segments: Trace["segments"];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, "tools/compare/fixtures/factory-terminal-loss-off.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
const sourcePath = resolve(dirname(fixturePath), fixture.sourceTrace);
const source = JSON.parse(readFileSync(sourcePath, "utf8")) as Trace;
const absoluteStart = fixture.stage.frame + fixture.relativeWindow.start;
const absoluteEnd = fixture.stage.frame + fixture.relativeWindow.end;
const trace: Trace = {
  oracleProfile: "battle-scene-off",
  segments: [...source.segments, ...fixture.segments],
  captureFrames: Array.from(
    { length: absoluteEnd - absoluteStart + 1 },
    (_, index) => absoluteStart + index,
  ),
  appStage: fixture.stage,
};

const scratch = mkdtempSync(join(tmpdir(), "pokebench-factory-loss-compare-"));
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
    env: { ...process.env, FACTORY_LOSS_RGB_DIR: rgbDir },
  },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const app = await renderAppTrace(trace);
let matching = 0;
let aggregateDiff = 0;
const mismatches: Array<{ relative: number; pixels: number }> = [];
let wroteDiagnostic = false;
for (const capture of app) {
  const relative = capture.frame - fixture.stage.frame;
  const oracle = readFileSync(
    join(rgbDir, `${String(relative).padStart(3, "0")}.rgb`),
  );
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const oi = pixel * 3;
    const ai = pixel * 4;
    if (
      oracle[oi] !== capture.rgba[ai] ||
      oracle[oi + 1] !== capture.rgba[ai + 1] ||
      oracle[oi + 2] !== capture.rgba[ai + 2]
    ) {
      pixels += 1;
    }
  }
  if (pixels === 0) matching += 1;
  else {
    mismatches.push({ relative, pixels });
    if (!wroteDiagnostic) {
      const oracleRgba = Buffer.alloc(240 * 160 * 4);
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        oracle.copy(oracleRgba, pixel * 4, pixel * 3, pixel * 3 + 3);
        oracleRgba[pixel * 4 + 3] = 255;
      }
      writeFileSync(
        join(scratch, `oracle-${relative}.png`),
        PNG.sync.write({ width: 240, height: 160, data: oracleRgba }),
      );
      writeFileSync(
        join(scratch, `app-${relative}.png`),
        PNG.sync.write({ width: 240, height: 160, data: capture.rgba }),
      );
      wroteDiagnostic = true;
    }
  }
  aggregateDiff += pixels;
}
const total = fixture.relativeWindow.end - fixture.relativeWindow.start + 1;
console.log(
  `${matching}/${total} frames matched; ${aggregateDiff} aggregate differing pixels`,
);
if (mismatches.length > 0) {
  console.log(
    `first mismatches: ${mismatches.slice(0, 24).map(({ relative, pixels }) =>
      `+${relative}:${pixels}`
    ).join(", ")}`,
  );
  console.log(`first diagnostic PNGs: ${scratch}`);
}
process.exit(matching === total ? 0 : 1);
