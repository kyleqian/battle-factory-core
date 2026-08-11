// Narrow, fresh-oracle verifier for the seven formerly excluded visible
// opening FLY-up frames.  It intentionally asks for only 17781-17787: this
// is a live engine-vs-oracle comparison, not a stored-frame assertion.
//
// Usage:
//   node --experimental-strip-types tools/probe/verify-turn14-flyup-opening.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "../compare/appTrace.ts";
import { diffPngs } from "../compare/diff.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const trace = JSON.parse(
  readFileSync("tools/compare/traces/turn14-fly-miss.json", "utf8"),
) as Trace;
const frames = [17781, 17782, 17783, 17784, 17785, 17786, 17787];
trace.captureFrames = frames;

function appPng(rgba: Buffer | Uint8Array): Buffer {
  const png = new PNG({ width: 240, height: 160 });
  rgba.forEach((v, i) => (png.data[i] = v));
  return PNG.sync.write(png);
}

function diffBounds(a: Buffer, b: Buffer): string {
  let left = 240;
  let top = 160;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    const i = (y * 240 + x) * 4;
    if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return right < 0 ? "none" : `${left},${top}-${right},${bottom}`;
}

const [oracle, app] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
const appByFrame = new Map(app.map((capture) => [capture.frame, capture]));
let failures = 0;
for (const capture of oracle.captures) {
  const rendered = appByFrame.get(capture.frame);
  if (!rendered) throw new Error(`app omitted capture ${capture.frame}`);
  const actual = appPng(rendered.rgba);
  const diff = diffPngs(capture.png, actual);
  const verdict = diff.diffPixels === 0 ? "PASS" : "FAIL";
  console.log(`${verdict} ${capture.frame}: ${diff.diffPixels}px ${diffBounds(PNG.sync.read(capture.png).data, PNG.sync.read(actual).data)}`);
  if (diff.diffPixels !== 0) {
    const oracleRgba = PNG.sync.read(capture.png).data;
    const appRgba = PNG.sync.read(actual).data;
    const samples: string[] = [];
    for (let y = 0; y < 160 && samples.length < 8; y += 1) {
      for (let x = 0; x < 240 && samples.length < 8; x += 1) {
        const i = (y * 240 + x) * 4;
        if (
          oracleRgba[i] === appRgba[i]
          && oracleRgba[i + 1] === appRgba[i + 1]
          && oracleRgba[i + 2] === appRgba[i + 2]
        ) continue;
        samples.push(
          `${x},${y}:`
          + `${oracleRgba[i]},${oracleRgba[i + 1]},${oracleRgba[i + 2]}/`
          + `${appRgba[i]},${appRgba[i + 1]},${appRgba[i + 2]}`,
        );
      }
    }
    console.log(`  samples ${samples.join(" ")}`);
  }
  if (diff.diffPixels !== 0) failures += 1;
}
console.log(`${oracle.captures.length - failures}/${frames.length} opening FLY-up frames exact`);
process.exit(failures === 0 ? 0 : 1);
