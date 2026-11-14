// iss216: dense ROM-vs-engine compare of the rental-select same-species refusal.
// The ROM side is tools/probe/stage-draft-same-species-off.py (pokes mons[5].monId); the engine side is
// the iss216-dup-draft-off app stage. Usage: node --experimental-strip-types tools/compare/draftSameSpecies.ts
// [--rgb-dir DIR (reuse a previous probe run)] [--summary]
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Trace } from "./oracleClient.ts";
import { renderAppTrace } from "./appTrace.ts";
import { PNG } from "pngjs";
import { writeFileSync } from "node:fs";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
const rgbArg = args.indexOf("--rgb-dir");
const pngArg = args.indexOf("--png");
const pngFrames = new Set(pngArg >= 0 ? args[pngArg + 1]!.split(",").map(Number) : []);
const trace = JSON.parse(readFileSync(join(root, "tools/compare/traces/iss216-same-species-off.json"), "utf8")) as Trace;
const total = trace.segments.reduce((sum, s) => sum + s.frames, 0);
trace.captureFrames = Array.from({ length: total + 1 }, (_, i) => i);

let rgbDir: string;
if (rgbArg >= 0) rgbDir = resolve(args[rgbArg + 1]!);
else {
  const scratch = createScratchDir("pokebench-iss216-");
  rgbDir = join(scratch, "rgb");
  mkdirSync(rgbDir);
  const out = join(scratch, "probe.json");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync(
    "python3",
    [join(root, "tools/run-mgba-probe.py"), out, "--", join(vendor, "mgba-venv/bin/python"),
      join(root, "tools/probe/stage-draft-same-species-off.py"), out],
    { cwd: root, encoding: "utf8", env: { ...process.env, ISS216_RGB_DIR: rgbDir } },
  );
  if (run.status !== 0) {
    process.stderr.write(`${run.stdout ?? ""}${run.stderr ?? ""}`);
    process.exit(run.status ?? 1);
  }
}

const app = await renderAppTrace(trace);
const bad: Array<{ frame: number; pixels: number }> = [];
for (const capture of app) {
  const oracle = readFileSync(join(rgbDir, `${String(capture.frame).padStart(3, "0")}.rgb`));
  let pixels = 0;
  for (let p = 0; p < 240 * 160; p += 1) {
    if (oracle[p * 3] !== capture.rgba[p * 4] || oracle[p * 3 + 1] !== capture.rgba[p * 4 + 1] || oracle[p * 3 + 2] !== capture.rgba[p * 4 + 2]) pixels += 1;
  }
  if (pixels) bad.push({ frame: capture.frame, pixels });
  if (pngFrames.has(capture.frame)) {
    const o = Buffer.alloc(240 * 160 * 4);
    for (let p = 0; p < 240 * 160; p += 1) { oracle.copy(o, p * 4, p * 3, p * 3 + 3); o[p * 4 + 3] = 255; }
    const both = Buffer.alloc(480 * 160 * 4);
    for (let y = 0; y < 160; y += 1) {
      o.copy(both, y * 480 * 4, y * 240 * 4, (y + 1) * 240 * 4);
      Buffer.from(capture.rgba).copy(both, (y * 480 + 240) * 4, y * 240 * 4, (y + 1) * 240 * 4);
    }
    writeFileSync(`/tmp/iss216-f${capture.frame}.png`, PNG.sync.write({ width: 480, height: 160, data: both }));
  }
}
console.log(`iss216-same-species-off: ${app.length - bad.length}/${app.length} frames matched`);
if (bad.length) console.log(`mismatches: ${bad.map((b) => `${b.frame}:${b.pixels}px`).join(" ")}`);
console.log(`rgb dir: ${rgbDir}`);
process.exit(bad.length ? 1 : 0);
